import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import {
  ReactFlow,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  useReactFlow,
  Panel,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore } from "./model/projectStore";
import {btnStyle } from "@/shared/components/ui";
import { InspectorFields } from "@/shared/components/inspectorFields";
import type { InspectorSchema } from "@/shared/components/inspectorFields";
import { RoomNode, RoomNodeInspector, roomNodeDiameter } from './components/roomNode';
import { RoomNodeEdge, RoomNodeEdgeInspector } from './components/roomNodeEdge';
import { RoomNodeGroup, RoomNodeGroupInspector, GroupLabel, GroupMetaballLayer, getGroupBounds, getGroupShapeLayout, groupLabelOffset, isPointInGroupMetaball } from './components/roomNodeGroup';
import { OpenFreeMapViewer } from './components/openFreeMapViewer';
import { downloadGraph, readGraph } from "./model/graphIO";

const PROJECT_ID = "demo";

const ROOM_TYPES = ["Entry", "Livingroom", "Kitchen", "Bedroom", "Bath", "Office", "Storage"];

type GraphSelection = {
  type: "node" | "edge";
  id: string;
  inspector: InspectorSchema;
};


function Toolbar({
  selected,
  onAddNode,
  onDelete,
  onExport,
  onImport
  }: {
  selected: GraphSelection | null;
    onAddNode: (pos: { x: number; y: number }) => void;
    onDelete: () => void;
    onExport: () => void;
    onImport: () => void;
  }) {
    const { screenToFlowPosition } = useReactFlow();

    const handleAdd = () => {
      const pos = screenToFlowPosition({
        x: (window.innerWidth-280) / 2,
        y: window.innerHeight / 2,
      });
      onAddNode(pos);
      };

  return (
    <Panel position="top-left" style={{ display: "flex", gap: 8 }}>
      <button onClick={handleAdd} style={btnStyle("#6366f1", "#fff")}>
        + Add room
      </button>
      {selected && (
        <button onClick={onDelete} style={btnStyle("#fff", "#333", "1px solid #ddd")}>
          🗑 Delete
        </button>
      )}
      <button onClick={onExport} style={btnStyle("#6366f1", "#fff")}>Export JSON</button>
      <button onClick={onImport} style={btnStyle("#6366f1", "#fff")}>Import JSON</button>

    </Panel>
  );
}

export function GraphEditor() {
  const project = useStore((s) => s.projects.find((p) => p.id === PROJECT_ID));
  const updateGraph = useStore((s) => s.updateGraph);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(project?.graph.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(project?.graph.edges ?? []);
  const [selected, setSelected] = useState<GraphSelection | null>(null);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const frozenGroupLayouts = useRef(new Map<string, {
    position: { x: number; y: number };
    width: number;
    height: number;
    calculatedArea: number;
    memberShapes: Array<{ x: number; y: number; radius: number }>;
  }>());
  const groupDragStart = useRef<{
    id: string;
    position: { x: number; y: number };
    members: Array<{ id: string; position: { x: number; y: number } }>;
    fromMember?: boolean;
  } | null>(null);
  const roomDragStart = useRef<{ id: string; position: { x: number; y: number } } | null>(null);

  const clearFlowSelection = useCallback(() => {
    setNodes((currentNodes) => currentNodes.map((node) => node.selected ? { ...node, selected: false } : node));
    setEdges((currentEdges) => currentEdges.map((edge) => edge.selected ? { ...edge, selected: false } : edge));
  }, [setEdges, setNodes]);

  const nodeTypes = useMemo(() => ({ room: RoomNode, group: RoomNodeGroup, groupLabel: GroupLabel }), []);
  const edgeTypes = useMemo(() => ({ floating: RoomNodeEdge }), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") setShiftHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") setShiftHeld(false);
    };
    const onWindowBlur = () => setShiftHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  const displayNodes = useMemo(() => {
    const renderedNodes = nodes.filter((node) => node.type !== "groupLabel").map((node) => {
    if (node.type !== "group") {
      const containingGroup = nodes.find((candidate) => candidate.type === "group"
        && ((candidate.data as Record<string, any>).memberIds as string[] | undefined)?.includes(node.id));
      const selectedGroup = selected?.type === "node"
        ? nodes.find((candidate) => candidate.id === selected.id && candidate.type === "group")
        : undefined;
      const memberIds = (selectedGroup?.data as Record<string, any> | undefined)?.memberIds as string[] | undefined;
      const isSelected = selected?.type === "node" && selected.id === node.id;
      return memberIds?.includes(node.id)
        ? { ...node, draggable: true, dragHandle: ".room-node-select-hit, .group-select-hit", selected: Boolean(node.selected || isSelected), zIndex: 2, data: { ...node.data, groupSelected: true, groupSelectionGroupId: containingGroup?.id ?? "" } }
        : { ...node, draggable: true, dragHandle: ".room-node-select-hit, .group-select-hit", selected: Boolean(node.selected || isSelected), zIndex: 2, data: { ...node.data, groupSelectionGroupId: containingGroup?.id ?? "" } };
    }
    const data = node.data as Record<string, any>;
    const frozenLayout = shiftHeld ? frozenGroupLayouts.current.get(node.id) : undefined;
    if (frozenLayout) {
      return {
        ...node,
        position: frozenLayout.position,
        style: { width: frozenLayout.width, height: frozenLayout.height, pointerEvents: "none" as const },
        zIndex: 0,
        selectable: false,
        draggable: false,
        selected: selected?.type === "node" && selected.id === node.id,
        data: { ...data, width: frozenLayout.width, height: frozenLayout.height, calculatedArea: frozenLayout.calculatedArea, memberShapes: frozenLayout.memberShapes },
      };
    }
    const members = nodes.filter((candidate) => data.memberIds?.includes(candidate.id));
    const shapeLayout = getGroupShapeLayout(members);
    if (!shapeLayout) return node;
    const calculatedArea = members.reduce((sum, member) => sum + Number((member.data as Record<string, any>).area ?? 0), 0);
    const layout = {
      ...shapeLayout,
      calculatedArea,
    };
    frozenGroupLayouts.current.set(node.id, layout);
    return {
      ...node,
      position: layout.position,
      style: { width: layout.width, height: layout.height, pointerEvents: "none" as const },
      zIndex: 0,
      selectable: false,
      draggable: false,
      selected: selected?.type === "node" && selected.id === node.id,
      data: { ...data, ...layout },
    };
    });
    const labels = nodes.filter((node) => node.type === "groupLabel").flatMap((labelNode) => {
      const groupId = String((labelNode.data as Record<string, any>).groupId ?? "");
      const renderedGroup = renderedNodes.find((node) => node.id === groupId && node.type === "group");
      if (!renderedGroup) return [];
      const groupData = renderedGroup.data as Record<string, any>;
      const isSelected = selected?.type === "node" && selected.id === groupId;
      return [{
        ...labelNode,
        zIndex: 2,
        draggable: true,
        selected: Boolean(labelNode.selected || isSelected),
        data: {
          ...(labelNode.data as Record<string, any>),
          name: groupData.name,
          description: groupData.description,
          color: groupData.color,
          calculatedArea: groupData.calculatedArea,
          memberCount: ((groupData.memberIds as string[] | undefined) ?? []).length,
        },
      }];
    });
    return [...renderedNodes, ...labels];
  }, [nodes, shiftHeld, selected]);
  const displayEdges = useMemo(() => edges.map((edge) => ({
    ...edge,
    selected: Boolean(edge.selected || (selected?.type === "edge" && selected.id === edge.id)),
    zIndex: 3,
  })), [edges, selected]);

  useEffect(() => {
    readGraph('/Graph rochester.json')
      .then(({ nodes: initialNodes, edges: initialEdges }) => {
        setNodes(initialNodes);
        setEdges(initialEdges);
      })
      .catch((error: unknown) => {
        console.error("Failed to load initial graph", error);
      })
      .finally(() => setGraphLoaded(true));
  }, [setEdges, setNodes]);

  useEffect(() => {
    if (!graphLoaded) return;
    const t = setTimeout(() => updateGraph(PROJECT_ID, { nodes: displayNodes, edges: displayEdges }), 250);
    return () => clearTimeout(t);
  }, [displayNodes, displayEdges, updateGraph, graphLoaded]);

  const handleNodeDragStart = (_event: ReactMouseEvent, draggedNode: Node) => {
    if (draggedNode.type !== "group") {
      const groupHit = (_event.target as Element | null)?.closest?.(".group-select-hit");
      const groupId = groupHit?.closest(".group-select-hit-layer")?.getAttribute("data-group-id");
      if (groupId) {
        const group = nodes.find((node) => node.id === groupId && node.type === "group");
        if (group) {
          setNodes((currentNodes) => currentNodes.map((node) => node.id === draggedNode.id && node.selected
            ? { ...node, selected: false }
            : node));
          setSelected((current) => current?.type === "node" && current.id === draggedNode.id ? null : current);
          const memberIds = ((group.data as Record<string, any>).memberIds ?? []) as string[];
          groupDragStart.current = {
            id: draggedNode.id,
            position: { ...draggedNode.position },
            fromMember: true,
            members: nodes
              .filter((node) => memberIds.includes(node.id)
                || (node.type === "groupLabel" && (node.data as Record<string, any>).groupId === groupId))
              .map((node) => ({ id: node.id, position: { ...node.position } })),
          };
          roomDragStart.current = null;
          return;
        }
      }
      groupDragStart.current = null;
      roomDragStart.current = { id: draggedNode.id, position: { ...draggedNode.position } };
      return;
    }
    const memberIds = ((draggedNode.data as Record<string, any>).memberIds ?? []) as string[];
    groupDragStart.current = {
      id: draggedNode.id,
      position: { ...draggedNode.position },
      fromMember: false,
      members: nodes
        .filter((node) => memberIds.includes(node.id)
          || (node.type === "groupLabel" && (node.data as Record<string, any>).groupId === draggedNode.id))
        .map((node) => ({ id: node.id, position: { ...node.position } })),
    };
  };

  const handleNodeDrag = (_event: ReactMouseEvent, draggedNode: Node) => {
    const drag = groupDragStart.current;
    if (!drag || drag.id !== draggedNode.id) return;
    const dx = draggedNode.position.x - drag.position.x;
    const dy = draggedNode.position.y - drag.position.y;
    setNodes((currentNodes) => currentNodes.map((node) => {
      const original = drag.members.find((member) => member.id === node.id);
      return original
        ? { ...node, position: { x: original.position.x + dx, y: original.position.y + dy } }
        : node;
    }));
  };

  const handleNodeDragStop = (event: ReactMouseEvent, draggedNode: Node) => {
    if (groupDragStart.current?.fromMember && groupDragStart.current.id === draggedNode.id) {
      groupDragStart.current = null;
      roomDragStart.current = null;
      setNodes((currentNodes) => currentNodes.map((node) => node.id === draggedNode.id && node.selected
        ? { ...node, selected: false }
        : node));
      setSelected((current) => current?.type === "node" && current.id === draggedNode.id ? null : current);
      return;
    }
    if (draggedNode.type === "group") {
      groupDragStart.current = null;
      return;
    }
    if (draggedNode.type === "groupLabel") {
      roomDragStart.current = null;
      return;
    }
    const dragStart = roomDragStart.current;
    roomDragStart.current = null;
    if (!dragStart || dragStart.id !== draggedNode.id) return;

    if (!event.shiftKey) {
      if (!event.ctrlKey) return;

      const centerX = draggedNode.position.x + roomNodeDiameter(draggedNode) / 2;
      const centerY = draggedNode.position.y + roomNodeDiameter(draggedNode) / 2;
      setNodes((currentNodes) => {
        const movedNodes = currentNodes.map((node) => node.id === draggedNode.id
          ? { ...node, position: draggedNode.position }
          : node);
        return movedNodes.map((group) => {
          if (group.type !== "group") return group;
          const data = group.data as Record<string, any>;
          const memberIds = (data.memberIds ?? []) as string[];
          const isMember = memberIds.includes(draggedNode.id);
          const inside = isPointInGroupMetaball(
            group,
            movedNodes,
            { x: centerX, y: centerY },
            isMember ? draggedNode.id : undefined,
          );
          if (isMember === inside) return group;
          return {
            ...group,
            data: {
              ...data,
              memberIds: isMember
                ? memberIds.filter((memberId) => memberId !== draggedNode.id)
                : [...memberIds, draggedNode.id],
            },
          };
        });
      });
      return;
    }

    const duplicateId = crypto.randomUUID();
    const duplicate = {
      ...draggedNode,
      id: duplicateId,
      position: { ...draggedNode.position },
      selected: false,
      dragging: false,
    };
    const centerX = duplicate.position.x + roomNodeDiameter(duplicate) / 2;
    const centerY = duplicate.position.y + roomNodeDiameter(duplicate) / 2;
    setNodes((currentNodes) => {
      const restoredNodes = currentNodes.map((node) => node.id === draggedNode.id
        ? { ...node, position: dragStart.position }
        : node);
      return [
        ...restoredNodes.map((group) => {
          if (group.type !== "group") return group;
          const data = group.data as Record<string, any>;
          if (!isPointInGroupMetaball(group, restoredNodes, { x: centerX, y: centerY })) return group;
          const memberIds = (data.memberIds ?? []) as string[];
          return memberIds.includes(duplicateId)
            ? group
            : { ...group, data: { ...data, memberIds: [...memberIds, duplicateId] } };
        }),
        duplicate,
      ];
    });
  };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.key.toLowerCase() !== "g") return;
      event.preventDefault();

      if (event.shiftKey) {
        const selectedGroupIds = new Set(nodes
          .filter((node) => node.type === "group" && node.selected)
          .map((node) => node.id));
        if (selected?.type === "node" && nodes.some((node) => node.id === selected.id && node.type === "group")) {
          selectedGroupIds.add(selected.id);
        }

        if (selectedGroupIds.size) {
          setNodes((currentNodes) => currentNodes.filter((node) => !selectedGroupIds.has(node.id)
            && !(node.type === "groupLabel" && selectedGroupIds.has(String((node.data as Record<string, any>).groupId ?? "")))));
          if (selected?.type === "node" && selectedGroupIds.has(selected.id)) setSelected(null);
          return;
        }

        const selectedRoomIds = new Set(nodes
          .filter((node) => node.type === "room" && node.selected)
          .map((node) => node.id));
        if (selected?.type === "node" && nodes.some((node) => node.id === selected.id && node.type === "room")) {
          selectedRoomIds.add(selected.id);
        }
        if (selectedRoomIds.size) {
          setNodes((currentNodes) => currentNodes.map((node) => {
            if (node.type !== "group") return node;
            const data = node.data as Record<string, any>;
            return { ...node, data: { ...data, memberIds: (data.memberIds as string[] ?? []).filter((id) => !selectedRoomIds.has(id)) } };
          }));
        }
        return;
      }

      const selectedRoomIds = new Set(nodes
        .filter((node) => node.type === "room" && node.selected)
        .map((node) => node.id));
      if (selected?.type === "node" && nodes.some((node) => node.id === selected.id && node.type === "room")) {
        selectedRoomIds.add(selected.id);
      }
      const members = nodes.filter((node) => selectedRoomIds.has(node.id));
      if (members.length < 2) return;

      const id = crypto.randomUUID();
      const groupCount = nodes.filter((node) => node.type === "group").length + 1;
      const group: Node = {
        id,
        type: "group",
        position: { x: 0, y: 0 },
        zIndex: 0,
        draggable: true,
        data: {
          name: `Group ${groupCount}`,
          description: "",
          color: "#8b5cf6",
          memberIds: members.map((node) => node.id),
        },
      };
      const bounds = getGroupBounds(group, nodes);
      const groupLabel: Node = {
        id: `group-label-${id}`,
        type: "groupLabel",
        position: bounds
          ? { x: bounds.x, y: bounds.y - groupLabelOffset(members) }
          : { x: group.position.x, y: group.position.y - groupLabelOffset(members) },
        zIndex: 3,
        draggable: true,
        data: { groupId: id },
      };
      setNodes((currentNodes) => [...currentNodes.map((node) => ({ ...node, selected: false })), group, groupLabel]);
      setSelected({ type: "node", id, inspector: RoomNodeGroupInspector });
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [nodes, selected, setNodes]);

  const onConnect = useCallback(
    (c: Connection) => {
      setEdges((eds) => 
        eds.some(
          (e) =>
            (e.source === c.source && e.target === c.target) ||
            (e.source === c.target && e.target === c.source),
        )
          ? eds
          : addEdge({ ...c, type: "floating", data: {kind: "connected", boundarystyle: "door"} }, eds),
      )
    },
    [setEdges]
  );
  
  const addNode = (pos: { x: number; y: number }) => {
    const id = crypto.randomUUID();
    const roomCount = nodes.filter((node) => node.type === "room").length;
    const type = ROOM_TYPES[roomCount % ROOM_TYPES.length];
    setNodes((n) => [...n, { id, type: "room", position: pos, data: { label: type, description: "", area: 15, privacy:1, facade:"Default", daylight:true,roomheight:3.00} }]);
  };
 

  const deleteSelected = () => {
    if (!selected) return;
    if (selected.type === "node") {
      const deletedNode = nodes.find((node) => node.id === selected.id);
      setNodes((currentNodes) => currentNodes
        .filter((node) => node.id !== selected.id
          && !(deletedNode?.type === "group" && node.type === "groupLabel"
            && (node.data as Record<string, any>).groupId === selected.id))
        .map((node) => node.type === "group" && deletedNode?.type === "room"
          ? { ...node, data: { ...node.data, memberIds: ((node.data as Record<string, any>).memberIds as string[] ?? []).filter((id) => id !== selected.id) } }
          : node));
      setEdges((e) => e.filter((x) => x.source !== selected.id && x.target !== selected.id));
    } else {
      setEdges((e) => e.filter((x) => x.id !== selected.id));
    }
    setSelected(null);
  };

  const selectedInspectorData = selected
    ? ([...displayNodes, ...edges].find((item) => item.id === selected.id)?.data ?? {}) as Record<string, unknown>
    : {};

  const updateGraphItemData = (id: string, key: string, value: unknown) => {
    setNodes((currentNodes) => currentNodes.map((node) => node.id === id
      ? { ...node, data: { ...node.data, [key]: value } }
      : node));
    setEdges((currentEdges) => currentEdges.map((edge) => edge.id === id
      ? { ...edge, data: { ...(edge.data ?? {}), [key]: value } }
      : edge));
  };

  const updateSelectedInspectorData = (key: string, value: unknown) => {
    if (selected) updateGraphItemData(selected.id, key, value);
  };

  const exportGraph = () => {
    downloadGraph({ nodes, edges });
  };

  const importGraph = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      void readGraph(file).then(({ nodes: importedNodes, edges: importedEdges }) => {
        setNodes(importedNodes);
        setEdges(importedEdges);
      }).catch((error: unknown) => {
        console.error("Failed to read graph", error);
      });
    };
    input.click();
  };

  if (!project) return null;

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          elevateNodesOnSelect={false}
          connectionMode={ConnectionMode.Loose}
          multiSelectionKeyCode="Shift"
          onNodesChange={onNodesChange}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(event, n) => {
            if (n.type === "group") return;
            const groupHit = (event.target as Element | null)?.closest?.(".group-select-hit");
            if (groupHit) {
              const groupId = groupHit.closest(".group-select-hit-layer")?.getAttribute("data-group-id");
              if (groupId) {
                clearFlowSelection();
                setSelected({ type: "node", id: groupId, inspector: RoomNodeGroupInspector });
                return;
              }
            }
            const id = n.type === "groupLabel" ? String((n.data as Record<string, any>).groupId) : n.id;
            const selectedNodeType = nodes.find((node) => node.id === id)?.type;
            setSelected({ type: "node", id, inspector: selectedNodeType === "group" ? RoomNodeGroupInspector : RoomNodeInspector });
          }}
          onEdgeClick={(_, e) => setSelected({ type: "edge", id: e.id, inspector: RoomNodeEdgeInspector })}
          onPaneClick={() => {
            clearFlowSelection();
            setSelected(null);
          }}
          fitView
          nodeOrigin={[0, 0]}
          minZoom={0.000001}
          proOptions={{ hideAttribution: true }}
        >
          <OpenFreeMapViewer />
          <GroupMetaballLayer
            selectedGroupId={selected?.type === "node" && nodes.some((node) => node.id === selected.id && node.type === "group")
              ? selected.id
              : null}
          />
          <Toolbar
          selected={selected}
          onAddNode={addNode}
          onDelete={deleteSelected}
          onExport={exportGraph}
          onImport={importGraph}
          />
          {/* <Background gap={20} /> */}
          <Controls />
          <MiniMap pannable />
        </ReactFlow>
      </div>

      <aside style={{ width: 280, borderLeft: "1px solid #e5e7eb", padding: 16, overflowY: "auto", background: "#fafafa" }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
          Inspector
        </div>

        {!selected && (
          <p style={{ marginTop: 12, fontSize: 12, color: "#888" }}>
            Select a node or edge to edit. Ctrl-click rooms, then press Ctrl+G to group them; select a group and press Shift+Ctrl+G to ungroup. Drag a group to move its rooms and drag its tag to reposition the tag independently. Ctrl-drag a room into or out of a group to change membership; Shift-drag duplicates it. Drag from the dashed ring to connect rooms.
          </p>
        )}

        {selected && (
          <InspectorFields
            schema={selected.inspector}
            data={selectedInspectorData}
            onChange={updateSelectedInspectorData}
          />
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e5e7eb", fontSize: 11, fontFamily: "monospace", color: "#aaa" }}>
          {nodes.filter((node) => node.type === "room").length} rooms · {edges.length} edges
        </div>
      </aside>

      <style>{`
        :root {
          --primary: #6366f1;
          --accent: #f59e0b;
          --warning: #f50b0b;
          --card: #ffffff;
          --foreground: #111827;
          --muted-foreground: #6b7280;
          --input: #d1d5db;
          --background: #ffffff;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        * {cursor: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M0 0 L0 12 L3 9 L6 15 L8 14 L5 8 L9 8 Z" fill="black" stroke="white" stroke-width="1"/></svg>') 0 0, auto;}
        body { font-family: system-ui, sans-serif; }
        .field { height: 32px; width: 100%; padding: 0 8px; border: 1px solid #d1d5db; background: #fff; font-size: 13px; border-radius: 4px; }
        .field:focus { outline: none; border-color: #6366f1; }
        .react-flow__node-group, .react-flow__node-group.selected { background: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; }
      `}</style>
    </div>
  );
}





