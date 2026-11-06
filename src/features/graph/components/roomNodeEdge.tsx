
import {
  BaseEdge,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import type { InspectorSchema } from "@/shared/components/inspectorFields";

export const RoomNodeEdgeInspector: InspectorSchema = {
  title: "Connection",
  fields: [
    { key: "kind", label: "Kind", type: "select", options: ["connected", "visual"], defaultValue: "connected", optionLabels: { connected: "adjacent", visual: "visual" } },
    { key: "boundarystyle", label: "Boundary style", type: "select", options: ["door", "open", "closed"], defaultValue: "connected" },
  ],
};

export function RoomNodeEdge({ id, source, target, style, data, selected }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const sourcePrivacy = Number((s?.data as any)?.privacy ?? 0);
  const targetPrivacy = Number((t?.data as any)?.privacy ?? 0);
  const privacyDiff = Math.abs(sourcePrivacy - targetPrivacy);
  const edgeColor = privacyDiff === 0?"var(--primary)": "red";
  const sw = s.measured?.width ?? 80;
  const sh = s.measured?.height ?? 80;
  const tw = t.measured?.width ?? 80;
  const th = t.measured?.height ?? 80;
  const sx = (s.internals.positionAbsolute?.x ?? 0) + sw / 2;
  const sy = (s.internals.positionAbsolute?.y ?? 0) + sh / 2;
  const tx = (t.internals.positionAbsolute?.x ?? 0) + tw / 2;
  const ty = (t.internals.positionAbsolute?.y ?? 0) + th / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy) || 1;
  const sr = sw / 2;
  const tr = tw / 2;
  const sxp = sx + (dx / dist) * sr;
  const syp = sy + (dy / dist) * sr;
  const txp = tx - (dx / dist) * tr;
  const typ = ty - (dy / dist) * tr;
  const [path] = getStraightPath({ sourceX: sxp, sourceY: syp, targetX: txp, targetY: typ });
  return (
    <BaseEdge
      id={id}
      path={path}
      interactionWidth={18}
      style={{
        stroke: selected ? "var(--accent)" : edgeColor,
        strokeWidth: (data?.boundarystyle === "open" ? 3 : 1),
        ...style,
      }}
    />
  );
}

