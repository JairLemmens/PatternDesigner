import {
  Handle,
  Position,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import type { InspectorSchema } from "@/shared/components/inspectorFields";
import type { RoomNodeData } from "../model/graphTypes";

export const RoomNodeInspector: InspectorSchema = {
  title: "Room",
  fields: [
    { key: "label", label: "Name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "color", label: "Color", type: "color" },
    { key: "type", label: "Type", type: "select", options: ["Interior Space", "Exterior Space"] },
    { key: "area", label: "Area (m²)", type: "number", defaultValue: 0 },
    { key: "privacy", label: "Privacy", type: "number", defaultValue: 0 },
    { key: "facade", label: "Facade", type: "select", options: ["Default", "Sliding doors", "Private"], allowCustom: true, placeholder: "Custom facade" },
    { key: "daylight", label: "Daylight", type: "checkbox", defaultValue: true },
    { key: "roomheight", label: "Room height (m)", type: "number", step: 0.01, min: 0, defaultValue: 3 },
  ],
};

function diameterFromArea(area: number) {
  // Map scale is calibrated so this original-sized circle still covers area m².
  return Math.sqrt(Math.max(0, area)) * 18;
}

export function roomNodeDiameter(node: Node) {
  const area = Number((node.data as RoomNodeData).area ?? 15);
  return diameterFromArea(area);
}

export function RoomNode({ data, selected }: NodeProps) {
  const roomData = data as RoomNodeData;
  const groupSelected = Boolean(roomData.groupSelected);
  const groupSelectionGroupId = String(roomData.groupSelectionGroupId ?? "");
  const color = String(roomData.color ?? "#ffffff");
  const area = Number(roomData.area ?? 15);
  const daylight = Boolean(roomData.daylight ?? true);
  const d = diameterFromArea(area);
  const outer = d;
  return (
    <div
      style={{
        width: outer,
        height: outer,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {groupSelectionGroupId && (
        <svg
          aria-hidden="true"
          className="group-select-hit-layer"
          data-group-id={groupSelectionGroupId}
          style={{ position: "absolute", width: "160%", height: "160%", overflow: "visible", pointerEvents: "none", zIndex: 1 }}
        >
          <circle
            className="group-select-hit"
            cx="50%"
            cy="50%"
            r="50%"
            fill="transparent"
            pointerEvents="all"
          />
        </svg>
      )}

      <Handle
        type="source"
        position={Position.Top}
        style={{
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          transform: "none",
          background: "transparent",
          border: "none",
          borderRadius: "50%",
          pointerEvents: "all",
          zIndex: 3,
        }}
      />

      {/* The node body stays clickable above the connection handle. The exposed
          outer band remains available for starting a connection. */}
      <div
        className="room-node-select-hit"
        style={{
          position: "absolute",
          width: "84%",
          height: "84%",
          left: "8%",
          top: "8%",
          borderRadius: "50%",
          background: "transparent",
          pointerEvents: "all",
          zIndex: 4,
        }}
      />

      {/* Visible dashed ring showing the connectable perimeter */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: outer,
          height: outer,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={Math.max(0, outer / 2 - 0.5)}
          fill="none"
          stroke={selected ? "var(--accent)" : "var(--primary)"}
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.45}
        />
      </svg>

      <div
        style={{
          width: d,
          height: d,
          borderRadius: "50%",
          background: selected || groupSelected ? "var(--accent)": color,
          border: `2px solid ${daylight?"var(--background)":"var(--muted-foreground)"}`,
          boxShadow: `0 0 ${d * 0.04}px var(--muted-foreground)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 0,
          pointerEvents: "auto",
        }}
      >
        <div style={{ fontSize: d * 0.12, fontWeight: 500, textAlign: "center", textShadow: "0 0 0.12em var(--background)", color: "var(--foreground)", lineHeight: 1.15, maxWidth: "90%", overflowWrap: "anywhere" }}>
          {String(roomData.label ?? "")}
        </div>
        <div style={{ fontSize: d * 0.15, color: "var(--background)",textShadow:"0 0 0.12em var(--foreground)", fontFamily: "monospace" }}>
          {area} m²
        </div>
      </div>
    </div>
  );
}


