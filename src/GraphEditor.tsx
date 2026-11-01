import { useCallback, useEffect, useMemo, useState } from "react";

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
import Field from "./components/field";
import {RoomNode} from './components/roomNode';
import {RoomNodeEdge} from './components/roomNodeEdge';

const PROJECT_ID = "demo";

const ROOM_TYPES = ["Entry", "Livingroom", "Kitchen", "Bedroom", "Bath", "Office", "Storage"];
const FACADE_TYPES = ["Default","Sliding doors","Private"];
const NODE_TYPES = ["Interior Space", "Exterior Space"];


function Toolbar({
  nodes,
  selected,
  onAddNode,
  onDelete,
  onExport,
  onImport
  }: {
    nodes: Node[];
    selected: { type: "node" | "edge"; id: string } | null;
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
  const [selected, setSelected] = useState<{ type: "node" | "edge"; id: string } | null>(null);

  const nodeTypes = useMemo(() => ({ room: RoomNode }), []);
  const edgeTypes = useMemo(() => ({ floating: RoomNodeEdge }), []);

  useEffect(() => {
    const t = setTimeout(() => updateGraph(PROJECT_ID, { nodes, edges }), 250);
    return () => clearTimeout(t);
  }, [nodes, edges, updateGraph]);

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
    const type = ROOM_TYPES[nodes.length % ROOM_TYPES.length];
    setNodes((n) => [...n, { id, type: "room", position: pos, data: { label: type, description: "", area: 15, privacy:1, facade:"Default", daylight:true,roomheight:3.00} }]);
  };
 

  const deleteSelected = () => {
    if (!selected) return;
    if (selected.type === "node") {
      setNodes((n) => n.filter((x) => x.id !== selected.id));
      setEdges((e) => e.filter((x) => x.source !== selected.id && x.target !== selected.id));
    } else {
      setEdges((e) => e.filter((x) => x.id !== selected.id));
    }
    setSelected(null);
  };

  const selectedNode = selected?.type === "node" ? nodes.find((n) => n.id === selected.id) : null;
  const selectedEdge = selected?.type === "edge" ? edges.find((e) => e.id === selected.id) : null;

  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id ? { ...n, data: { ...n.data, [key]: value } } : n,
      ),
    );
  };

  const updateEdgeData = (key: string, value: any) => {
    if (!selectedEdge) return;
    setEdges((eds) =>
      eds.map((e) =>
        e.id === selectedEdge.id ? { ...e, data: { ...(e.data ?? {}), [key]: value } } : e,
      ),
    );
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

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.nodes && parsed.edges) {
            setNodes(parsed.nodes.map((n: any) => ({ ...n, type: "room" })));
            setEdges(parsed.edges.map((e: any) => ({ ...e, type: "floating" })));
          } else {
            console.error("Invalid graph file: missing nodes or edges");
          }
        } catch {
          console.error("Failed to parse graph file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };



  if (!project) return null;

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelected({ type: "node", id: n.id })}
          onEdgeClick={(_, e) => setSelected({ type: "edge", id: e.id })}
          onPaneClick={() => setSelected(null)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Toolbar
          nodes={nodes}
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
            Select a node or edge to edit. Drag from the dashed ring to connect rooms.
          </p>
        )}

        {selectedNode && (
          <div style={{ marginTop: 12 }}>
            <strong style={{ fontSize: 13 }}>Room</strong>
            <Field label="Name">
              <input className="field" value={String(selectedNode.data.label ?? "")} onChange={(e) => updateNodeData("label", e.target.value)} />
            </Field>
            <Field label="Description">
              <textarea
                className="field"
                style={{ height: 80, padding: 8, resize: "vertical" }}
                value={String(selectedNode.data.description ?? "")}
                onChange={(e) => updateNodeData("description", e.target.value)}
              />
            </Field>
            <Field label="Color">
              <input type="color" className="field" value={String(selectedNode.data.color ?? "#ffffff")} onChange={(e) => updateNodeData("color", e.target.value)}/>
            </Field>
            <Field label="Type">
              <select className="field" value={String(selectedNode.data.type ?? "")} onChange={(e) => updateNodeData("type", e.target.value)}>
                {NODE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Area (m²)">
              <input className="field" type="number" value={Number(selectedNode.data.area ?? 0)} onChange={(e) => updateNodeData("area", Number(e.target.value))} />
            </Field>
            <Field label="Privacy">
              <input className="field" type="number" value={Number(selectedNode.data.privacy ?? 0)} onChange={(e) => updateNodeData("privacy", Number(e.target.value))} />
            </Field>
            <Field label="Facade">
              <select className="field" value={FACADE_TYPES.includes(String(selectedNode.data.facade ?? "")) ? String(selectedNode.data.facade ?? "") : "other"}
                onChange={(e) => updateNodeData("facade", e.target.value === "other" ? "" : e.target.value)}>
                {FACADE_TYPES.map((t) => <option key={t}>{t}</option>)}
                <option value="other">Other...</option>
              </select>
              {!FACADE_TYPES.includes(String(selectedNode.data.facade ?? "")) && (
                <input
                  className="field"
                  style={{ marginTop: 4 }}
                  placeholder="Custom facade"
                  value={String(selectedNode.data.facade ?? "")}
                  onChange={(e) => updateNodeData("facade", e.target.value)}
                />
              )}
            </Field>
            <Field label="Daylight">
              <input type="checkbox" checked={Boolean(selectedNode.data.daylight ?? true)} onChange={(e) => updateNodeData("daylight", e.target.checked)}/>
            </Field>
            <Field label="Room height (m)">
              <input className="field" type="number" step={0.01} min={0} value={Number(selectedNode.data.roomheight ?? 3.0)} onChange={(e) => updateNodeData("roomheight", Number(e.target.value))} />
            </Field>
          </div>
        )}

        {selectedEdge && (
          <div style={{ marginTop: 12 }}>
            <strong style={{ fontSize: 13 }}>Connection</strong>
            <Field label="Kind">
              <select className="field" value={String(selectedEdge.data?.kind ?? "connected")} onChange={(e) => updateEdgeData("kind", e.target.value)}>
                <option value="connected">adjacent</option>
                <option value="visual">visual</option>
              </select>
            </Field>
            <Field label="Boundary style">
              <select className="field" value={String(selectedEdge.data?.boundarystyle ?? "connected")} onChange={(e) => updateEdgeData("boundarystyle", e.target.value)}>
                <option value="door">door</option>
                <option value="open">open</option>
                <option value="closed">closed</option>
              </select>
            </Field>
          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e5e7eb", fontSize: 11, fontFamily: "monospace", color: "#aaa" }}>
          {nodes.length} nodes · {edges.length} edges
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
      `}</style>
    </div>
  );
}



