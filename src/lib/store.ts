import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";

interface Graph {
  nodes: Node[];
  edges: Edge[];
}

interface Project {
  id: string;
  name: string;
  graph: Graph;
}

interface Store {
  projects: Project[];
  updateGraph: (projectId: string, graph: Graph) => void;
}

export const useStore = create<Store>((set) => ({
  projects: [
    {
      id: "demo",
      name: "Demo Project",
      graph: { nodes: [], edges: [] },
    },
  ],
  updateGraph: (projectId, graph) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, graph } : p
      ),
    })),
}));
