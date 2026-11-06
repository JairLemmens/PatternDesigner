import type { Edge, Node } from "@xyflow/react";
import { getGroupBounds, groupLabelOffset } from "../components/roomNodeGroup";

type GraphFile = { nodes: Node[]; edges: Edge[] };

/** Parse and normalize graph files at the import boundary. */
export async function readGraph(source: File | string): Promise<GraphFile> {
  const content = source instanceof File
    ? await source.text()
    : await fetch(source).then((response) => {
        if (!response.ok) throw new Error(`Could not read graph from ${source}: ${response.statusText}`);
        return response.text();
      });

  const parsed: unknown = JSON.parse(content);
  if (!isGraphFile(parsed)) throw new Error("Invalid graph file: expected nodes and edges arrays");

  const nodes: Node[] = parsed.nodes.map((node) => ({
    ...node,
    type: node.type === "group" ? "group" : node.type === "groupLabel" ? "groupLabel" : "room",
  }));

  // Older exports omitted label nodes; rebuild them from their group records.
  for (const group of nodes.filter((node) => node.type === "group")) {
    const groupData = group.data as Record<string, unknown>;
    const hasLabel = nodes.some((node) => node.type === "groupLabel"
      && (node.data as Record<string, unknown>).groupId === group.id);
    if (hasLabel) continue;

    const memberIds = Array.isArray(groupData.memberIds) ? groupData.memberIds as string[] : [];
    const members = nodes.filter((node) => memberIds.includes(node.id));
    const bounds = getGroupBounds(group, nodes);
    nodes.push({
      id: `group-label-${group.id}`,
      type: "groupLabel",
      position: bounds
        ? { x: bounds.x, y: bounds.y - groupLabelOffset(members) }
        : { x: group.position.x, y: group.position.y - groupLabelOffset(members) },
      zIndex: 3,
      draggable: true,
      data: { groupId: group.id },
    });
  }

  return { nodes, edges: parsed.edges.map((edge) => ({ ...edge, type: "floating" })) };
}

function isGraphFile(value: unknown): value is GraphFile {
  return typeof value === "object" && value !== null
    && Array.isArray((value as { nodes?: unknown }).nodes)
    && Array.isArray((value as { edges?: unknown }).edges);
}

export function downloadGraph(graph: GraphFile) {
  const blob = new Blob([JSON.stringify(graph, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "graph.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
