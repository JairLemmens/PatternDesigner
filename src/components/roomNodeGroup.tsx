import {
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { roomNodeDiameter } from "./roomNode";
import type { InspectorSchema } from "./inspectorFields";

export const RoomNodeGroupInspector: InspectorSchema = {
  title: "Node group",
  fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "color", label: "Color", type: "color" },
    { key: "calculatedArea", label: "Calculated area", type: "readonly", suffix: " m²" },
  ],
};


export function RoomNodeGroup({ id, data, selected }: NodeProps) {
  const group = data as Record<string, unknown>;
  const color = selected ? "var(--accent)" : String(group.color ?? "#6366f1");
  const width = Number(group.width ?? 240);
  const height = Number(group.height ?? 180);
  const memberShapes = (group.memberShapes ?? []) as Array<{ x: number; y: number; radius: number }>;
  const filterId = `group-goo-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        position: "relative",
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
        <defs>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8" result="goo" />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`} opacity={selected ? 0.78 : 0.38}>
          {memberShapes.map((shape, index) => (
            <circle key={index} cx={shape.x} cy={shape.y} r={shape.radius} fill={color} />
          ))}
        </g>
        <g>
          {memberShapes.map((shape, index) => (
            <circle key={`hit-${index}`} cx={shape.x} cy={shape.y} r={shape.radius} fill="transparent" pointerEvents="all" />
          ))}
        </g>
      </svg>
    </div>
  );
}

export function GroupLabel({ data, selected }: NodeProps) {
  const label = data as Record<string, unknown>;
  const color = selected ? "var(--accent)" : String(label.color ?? "#6366f1");
  return (
    <div style={{ maxWidth: 300, padding: "6px 9px", border: `1px solid ${color}`, borderRadius: 6, background: selected ? color : `color-mix(in srgb, ${color} 16%, white)`, color: selected ? "white" : "var(--foreground)", boxShadow: "0 1px 4px #0002", cursor: "grab", userSelect: "none", textAlign: "left" }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{String(label.name ?? "Node group")}</div>
      {Boolean(label.description) && <div style={{ marginTop: 2, fontSize: 11, lineHeight: 1.3 }}>{String(label.description)}</div>}
      <div style={{ marginTop: 3, fontSize: 10, fontFamily: "monospace" }}>{Number(label.calculatedArea ?? 0)} m² total</div>
    </div>
  );
}

export function getGroupBounds(group: Node, nodes: Node[], excludeId?: string) {
  const memberIds = ((group.data as Record<string, any>).memberIds ?? []) as string[];
  const members = nodes.filter((node) => node.id !== excludeId && memberIds.includes(node.id));
  if (!members.length) return null;
  const padding = 32;
  const minX = Math.min(...members.map((node) => node.position.x));
  const minY = Math.min(...members.map((node) => node.position.y));
  const maxX = Math.max(...members.map((node) => node.position.x + roomNodeDiameter(node)));
  const maxY = Math.max(...members.map((node) => node.position.y + roomNodeDiameter(node)));
  return { x: minX - padding, y: minY - padding, width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 };
}

export function isPointInGroupMetaball(
  group: Node,
  nodes: Node[],
  point: { x: number; y: number },
  excludeId?: string,
) {
  const memberIds = ((group.data as Record<string, any>).memberIds ?? []) as string[];
  return nodes
    .filter((node) => node.type === "room" && node.id !== excludeId && memberIds.includes(node.id))
    .some((node) => {
      const diameter = roomNodeDiameter(node);
      const centerX = node.position.x + diameter / 2;
      const centerY = node.position.y + diameter / 2;
      const radius = diameter / 2 + 18;
      return (point.x - centerX) ** 2 + (point.y - centerY) ** 2 <= radius ** 2;
    });
}
