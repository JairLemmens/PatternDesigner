import {
  ViewportPortal,
  useNodes,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { roomNodeDiameter } from "./roomNode";
import type { InspectorSchema } from "@/shared/components/inspectorFields";
import type { GroupNodeData } from "../model/graphTypes";

export const RoomNodeGroupInspector: InspectorSchema = {
  title: "Node group",
  fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "color", label: "Color", type: "color" },
    { key: "calculatedArea", label: "Calculated area", type: "readonly", suffix: " m²" },
  ],
};

export function groupPadding(members: Node[]) {
  const rooms = members.filter((node) => node.type === "room");
  if (!rooms.length) return 0;
  const averageDiameter = rooms.reduce((sum, node) => sum + roomNodeDiameter(node), 0) / rooms.length;
  return averageDiameter * 0.4;
}

export function groupLabelOffset(members: Node[]) {
  return groupPadding(members) * 1.4;
}

export function getGroupShapeLayout(members: Node[]) {
  const rooms = members.filter((node) => node.type === "room");
  if (!rooms.length) return null;

  const shapes = rooms.map((node) => {
    const diameter = roomNodeDiameter(node);
    return {
      centerX: node.position.x + diameter / 2,
      centerY: node.position.y + diameter / 2,
      radius: diameter * 0.73 * (1 + 0.45),
    };
  });
  const left = Math.min(...shapes.map((shape) => shape.centerX - shape.radius));
  const top = Math.min(...shapes.map((shape) => shape.centerY - shape.radius));
  const right = Math.max(...shapes.map((shape) => shape.centerX + shape.radius));
  const bottom = Math.max(...shapes.map((shape) => shape.centerY + shape.radius));

  return {
    position: { x: left, y: top },
    width: right - left,
    height: bottom - top,
    memberShapes: shapes.map((shape) => ({
      x: shape.centerX - left,
      y: shape.centerY - top,
      radius: shape.radius,
    })),
  };
}


export function RoomNodeGroup({ data }: NodeProps) {
  const group = data as Record<string, unknown>;
  const width = Number(group.width ?? 240);
  const height = Number(group.height ?? 180);
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
    </div>
  );
}

/** Draw group metaballs in the same viewport coordinate layer as graph edges. */
export function GroupMetaballLayer({ selectedGroupId }: { selectedGroupId: string | null }) {
  const nodes = useNodes();
  const groups = nodes.filter((node) => node.type === "group");

  return (
    <ViewportPortal>
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
      >
        {groups.map((group) => {
          const data = group.data as Record<string, unknown>;
          const memberIds = (data.memberIds ?? []) as string[];
          const members = nodes.filter((node) => node.type === "room" && memberIds.includes(node.id));
          if (!members.length) return null;
          const shapes = members.map((node) => {
            const diameter = roomNodeDiameter(node);
            return {
              x: node.position.x + diameter / 2,
              y: node.position.y + diameter / 2,
              radius: diameter * 0.73,
            };
          });
          const blur = (shapes.reduce((sum, shape) => sum + shape.radius, 0) / shapes.length) * 0.315;
          const filterId = `group-overlay-goo-${group.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
          const isSelected = selectedGroupId === group.id;
          const color = isSelected ? "var(--accent)" : String(data.color ?? "#6366f1");
          return (
            <g key={group.id}>
              <defs>
                <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
                  <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
                  <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8" result="goo" />
                </filter>
              </defs>
              <g filter={`url(#${filterId})`} opacity={isSelected ? 0.78 : 0.38}>
                {shapes.map((shape, index) => <circle key={index} cx={shape.x} cy={shape.y} r={shape.radius} fill={color} />)}
              </g>
            </g>
          );
        })}
      </svg>
    </ViewportPortal>
  );
}

export function GroupLabel({ data, selected }: NodeProps) {
  const label = data as Record<string, unknown>;
  const color = selected ? "var(--accent)" : String(label.color ?? "#6366f1");
  const memberCount = Math.max(1, Number(label.memberCount ?? 1));
  const averageRoomDiameter = Math.sqrt(Math.max(0, Number(label.calculatedArea ?? 0)) / memberCount) * 18;
  const labelUnit = Math.max(1, averageRoomDiameter);
  return (
    <div style={{ maxWidth: Math.min(300, labelUnit * 3.8), padding: `${labelUnit * 0.077}px ${labelUnit * 0.115}px`, border: `${labelUnit * 0.013}px solid ${color}`, borderRadius: labelUnit * 0.077, background: selected ? color : `color-mix(in srgb, ${color} 16%, white)`, color: selected ? "white" : "var(--foreground)", boxShadow: `0 ${labelUnit * 0.013}px ${labelUnit * 0.05}px #0002`, cursor: "grab", userSelect: "none", textAlign: "left" }}>
      <div style={{ fontSize: labelUnit * 0.18, fontWeight: 700 }}>{String(label.name ?? "Node group")}</div>
      {Boolean(label.description) && <div style={{ marginTop: labelUnit * 0.026, fontSize: labelUnit * 0.14, lineHeight: 1.3 }}>{String(label.description)}</div>}
      <div style={{ marginTop: labelUnit * 0.038, fontSize: labelUnit * 0.128, fontFamily: "monospace" }}>{Number(label.calculatedArea ?? 0)} m² total</div>
    </div>
  );
}

export function getGroupBounds(group: Node, nodes: Node[], excludeId?: string) {
  const memberIds = ((group.data as GroupNodeData).memberIds ?? []);
  const members = nodes.filter((node) => node.id !== excludeId && memberIds.includes(node.id));
  const layout = getGroupShapeLayout(members);
  if (!layout) return null;
  return { x: layout.position.x, y: layout.position.y, width: layout.width, height: layout.height };
}

export function isPointInGroupMetaball(
  group: Node,
  nodes: Node[],
  point: { x: number; y: number },
  excludeId?: string,
) {
  const memberIds = ((group.data as GroupNodeData).memberIds ?? []);
  return nodes
    .filter((node) => node.type === "room" && node.id !== excludeId && memberIds.includes(node.id))
    .some((node) => {
      const diameter = roomNodeDiameter(node);
      const centerX = node.position.x + diameter / 2;
      const centerY = node.position.y + diameter / 2;
      const radius = 0.7 * diameter;
      return (point.x - centerX) ** 2 + (point.y - centerY) ** 2 <= radius ** 2;
    });
}


