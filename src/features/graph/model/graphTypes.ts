import type { Edge, Node } from "@xyflow/react";

export interface RoomNodeData extends Record<string, unknown> {
  label?: string;
  description?: string;
  color?: string;
  area?: number;
  privacy?: number;
  daylight?: boolean;
}

export interface GroupNodeData extends Record<string, unknown> {
  name?: string;
  description?: string;
  color?: string;
  memberIds?: string[];
}

export interface GroupLabelData extends Record<string, unknown> {
  groupId: string;
}

export type ProjectGraph = { nodes: Node[]; edges: Edge[] };
