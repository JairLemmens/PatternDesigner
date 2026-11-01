import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";

function diameterFromArea(area: number) {
  return Math.max(56, Math.min(170, Math.sqrt(Math.max(1, area)) * 18));
}


export function RoomNode({ data, selected }: NodeProps) {
  const color = String((data as any).color ?? "#ffffff");
  const area = Number((data as any).area ?? 15);
  const privacy = Number((data as any).privacy ?? 1);
  const daylight = Boolean((data as any).daylight ?? true);
  const facade = String((data as any).facade ?? 'Default');
  const roomheight = Number((data as any).roomheight ?? 3.00);
  const d = diameterFromArea(area);
  const RING = 12;
  const outer = d + RING * 2;
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
          r={outer / 2 - 1}
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
          background: selected ? "var(--accent)": color,
          border: `2px solid ${daylight?"var(--background)":"var(--muted-foreground)"}`,
          boxShadow:  "0 0 3px var(--muted-foreground)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
          pointerEvents: "auto",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500,textShadow:" 0.0px 0.0px 5px var(--background)", color: "var(--foreground)" }}>
          {String((data as any).label ?? "")}
        </div>
        <div style={{ fontSize: 10, color: "var(--background)",textShadow:"  0.0px 0.0px 5px var(--foreground)", fontFamily: "monospace" }}>
          {area} m²
        </div>
      </div>
    </div>
  );
}