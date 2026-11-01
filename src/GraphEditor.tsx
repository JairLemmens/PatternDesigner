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
import { useStore } from "@/lib/store";
import {btnStyle } from "./components/ui";
import { InspectorFields } from "./components/inspectorFields";
import type { InspectorSchema } from "./components/inspectorFields";
import { RoomNode, RoomNodeInspector, roomNodeDiameter } from './components/roomNode';
import { RoomNodeEdge, RoomNodeEdgeInspector } from './components/roomNodeEdge';
import { RoomNodeGroup, RoomNodeGroupInspector, GroupLabel, getGroupBounds, isPointInGroupMetaball } from './components/roomNodeGroup';

const PROJECT_ID = "demo";

const ROOM_TYPES = ["Entry", "Livingroom", "Kitchen", "Bedroom", "Bath", "Office", "Storage"];

type GraphSelection = {
  type: "node" | "edge";
  id: string;
  inspector: InspectorSchema;
};


export async function readGraph(source: File | string): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const content = source instanceof File
    ? await source.text()
    : await fetch(source).then((response) => {
        if (!response.ok) throw new Error(`Could not read graph from ${source}: ${response.statusText}`);
        return response.text();
      });

  const parsed: unknown = JSON.parse(content);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { nodes?: unknown }).nodes) ||
    !Array.isArray((parsed as { edges?: unknown }).edges)
  ) {
    throw new Error("Invalid graph file: expected nodes and edges arrays");
  }

  const graph = parsed as { nodes: Node[]; edges: Edge[] };
  const loadedNodes = graph.nodes.map((node) => ({
    ...node,
    type: node.type === "group" ? "group" : node.type === "groupLabel" ? "groupLabel" : "room",
  }));
  for (const group of loadedNodes.filter((node) => node.type === "group")) {
    const hasLabel = loadedNodes.some((node) => node.type === "groupLabel"
      && (node.data as Record<string, any>).groupId === group.id);
    if (hasLabel) continue;
    const bounds = getGroupBounds(group, loadedNodes);
    const position = bounds
      ? { x: bounds.x, y: bounds.y - 44 }
      : { x: group.position.x, y: group.position.y - 44 };
    loadedNodes.push({
      id: `group-label-${group.id}`,
      type: "groupLabel",
      position,
      zIndex: 3,
      draggable: true,
      data: { groupId: group.id },
    });
  }
  return {
    nodes: loadedNodes,
    edges: graph.edges.map((edge) => ({ ...edge, type: "floating" })),
  };
}


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
  } | null>(null);
  const roomDragStart = useRef<{ id: string; position: { x: number; y: number } } | null>(null);

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
    const renderedNodes = nodes.map((node) => {
    if (node.type === "groupLabel") return { ...node, zIndex: 3, draggable: true };
    if (node.type !== "group") {
      const selectedGroup = selected?.type === "node"
        ? nodes.find((candidate) => candidate.id === selected.id && candidate.type === "group")
        : undefined;
      const memberIds = (selectedGroup?.data as Record<string, any> | undefined)?.memberIds as string[] | undefined;
      return memberIds?.includes(node.id)
        ? { ...node, zIndex: 2, data: { ...node.data, groupSelected: true } }
        : { ...node, zIndex: 2 };
    }
    const data = node.data as Record<string, any>;
    const frozenLayout = shiftHeld ? frozenGroupLayouts.current.get(node.id) : undefined;
    if (frozenLayout) {
      return {
        ...node,
        position: frozenLayout.position,
        style: { width: frozenLayout.width, height: frozenLayout.height, pointerEvents: "none" as const },
        zIndex: 0,
        draggable: true,
        selected: selected?.type === "node" && selected.id === node.id,
        data: { ...data, width: frozenLayout.width, height: frozenLayout.height, calculatedArea: frozenLayout.calculatedArea, memberShapes: frozenLayout.memberShapes },
      };
    }
    const members = nodes.filter((candidate) => data.memberIds?.includes(candidate.id));
    const bounds = members.reduce((result, member) => {
      const memberData = member.data as Record<string, any>;
      const diameter = Math.max(56, Math.min(170, Math.sqrt(Math.max(1, Number(memberData.area ?? 15))) * 18)) + 24;
      return {
        minX: Math.min(result.minX, member.position.x),
        minY: Math.min(result.minY, member.position.y),
        maxX: Math.max(result.maxX, member.position.x + diameter),
        maxY: Math.max(result.maxY, member.position.y + diameter),
        area: result.area + Number(memberData.area ?? 0),
      };
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, area: 0 });
    if (!members.length) return node;
    const padding = 32;
    const width = bounds.maxX - bounds.minX + padding * 2;
    const height = bounds.maxY - bounds.minY + padding * 2;
    const left = bounds.minX - padding;
    const top = bounds.minY - padding;
    const memberShapes = members.map((member) => {
      const diameter = roomNodeDiameter(member);
      return {
        x: member.position.x - left + diameter / 2,
        y: member.position.y - top + diameter / 2,
        radius: diameter / 2 + 18,
      };
    });
    const layout = {
      position: { x: left, y: top },
      width,
      height,
      calculatedArea: bounds.area,
      memberShapes,
    };
    frozenGroupLayouts.current.set(node.id, layout);
    return {
      ...node,
      position: layout.position,
      style: { width, height, pointerEvents: "none" as const },
      zIndex: 0,
      draggable: true,
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
        zIndex: 3,
        draggable: true,
        selected: isSelected,
        data: {
          ...(labelNode.data as Record<string, any>),
          name: groupData.name,
          description: groupData.description,
          color: groupData.color,
          calculatedArea: groupData.calculatedArea,
        },
      }];
    });
    return [...renderedNodes, ...labels];
  }, [nodes, shiftHeld, selected]);
  const displayEdges = useMemo(() => edges.map((edge) => ({ ...edge, zIndex: 1 })), [edges]);

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
      roomDragStart.current = { id: draggedNode.id, position: { ...draggedNode.position } };
      return;
    }
    const memberIds = ((draggedNode.data as Record<string, any>).memberIds ?? []) as string[];
    groupDragStart.current = {
      id: draggedNode.id,
      position: { ...draggedNode.position },
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
        position: bounds ? { x: bounds.x, y: bounds.y - 44 } : { x: group.position.x, y: group.position.y - 44 },
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
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.json";
    a.click();
    URL.revokeObjectURL(url);
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
          multiSelectionKeyCode="Control"
          onNodesChange={onNodesChange}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => {
            const id = n.type === "groupLabel" ? String((n.data as Record<string, any>).groupId) : n.id;
            const selectedNodeType = nodes.find((node) => node.id === id)?.type;
            setSelected({ type: "node", id, inspector: selectedNodeType === "group" ? RoomNodeGroupInspector : RoomNodeInspector });
          }}
          onEdgeClick={(_, e) => setSelected({ type: "edge", id: e.id, inspector: RoomNodeEdgeInspector })}
          onPaneClick={() => setSelected(null)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
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



