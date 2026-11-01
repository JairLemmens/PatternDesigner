import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import "@xyflow/react/dist/style.css";
import React, { useState, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import {Row, btnStyle } from "./components/ui";
import Field from "./components/field"
import getMaterialRange from "./utils/getMaterialRange";

const editableKeys = ["construction"];

function applyViewMode(scene: THREE.Group, materials: THREE.MeshStandardMaterial[], key: string = 'privacy_gradient') {
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.userData[key] >= 0) {
        mesh.material = materials[mesh.userData[key]];
      }
    }
  });
}

function restoreOriginalMaterial(scene: THREE.Group) {
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.material = mesh.userData.originalMaterial;
    }
  });
}

const highlightMaterial = new THREE.MeshStandardMaterial({
  color: '#f59e0b',
  side: THREE.DoubleSide,
  opacity: 0.8,
  transparent: true,
});

function Toolbar({activeMode, setActiveMode }: {
  activeMode: "Default" | "Gradient";
  setActiveMode: (mode: "Default" | "Gradient") => void;
}) {
  return (
    <div style={{ display: "flex" }}>
      {(["Default", "Gradient"] as const).map((mode, i) => (
        <button
          key={mode}
          onClick={() => setActiveMode(mode)}
          style={{
            height: 32, padding: "0 12px", background: "#6366f1",color: "#ffffff" ,border:'none', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 
          }}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

type FaceMeta = {
  meshName: string;
  materialName: string;
  faceIndex: number;
  extras: Record<string, unknown>;
};

function Model({ path, onFaceClick, onLoad }: {
  path: string;
  onFaceClick: (meta: FaceMeta) => void;
  onLoad: (scene: THREE.Group) => void;
}) {
  const { scene } = useGLTF(path);
  const previousRef = useRef<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] } | null>(null);

  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(m => { m.side = THREE.DoubleSide; return m; })
          : (mesh.material.side = THREE.DoubleSide, mesh.material);
        if (!mesh.userData.originalMaterial) {
          mesh.userData.originalMaterial = mesh.material;
        }
      }
    });
    onLoad(scene);
  }, [scene]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    const face = e.face;
    const faceIndex = e.faceIndex;
    if (!face || faceIndex == null || !mesh.geometry) return;

    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

    if (previousRef.current) {
      previousRef.current.mesh.material = previousRef.current.material;
    }
    if (previousRef.current?.mesh === mesh) {
      previousRef.current = null;
      return;
    }
    previousRef.current = { mesh, material: mesh.material };
    mesh.material = highlightMaterial;

    onFaceClick({
      meshName: mesh.name || "(unnamed)",
      materialName: (material as THREE.MeshStandardMaterial)?.name || "(unnamed)",
      faceIndex,
      extras: mesh.userData ?? {},
    });
  }, [onFaceClick]);

  return <primitive object={scene} onClick={handleClick} />;
}

export function Viewer() {
  const [meta, setMeta] = useState<FaceMeta | null>(null);
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [privacyMaterials, setPrivacyMaterials] = useState<THREE.MeshStandardMaterial[]>([]);
  const [activeMode, setActiveMode] = useState<"Default" | "Gradient">("Default");
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});


  const handleLoad = useCallback((loadedScene: THREE.Group) => {
    let min_pg = Infinity;
    let max_pg = -Infinity;

    loadedScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.userData.privacy_gradient != null) {
          min_pg = Math.min(min_pg, mesh.userData.privacy_gradient);
          max_pg = Math.max(max_pg, mesh.userData.privacy_gradient);
        }
      }
    });

    setScene(loadedScene);
    if (max_pg >= min_pg && isFinite(min_pg)) {
      setPrivacyMaterials(getMaterialRange(max_pg - min_pg + 1));
    }
  }, []);

  useEffect(() => {
    if (!scene) return;
    if (activeMode === "Gradient") applyViewMode(scene, privacyMaterials);
    else restoreOriginalMaterial(scene);
  }, [activeMode, scene, privacyMaterials]);

  return (
    <div style={{ display: "flex", width: "97vw", height: "95vh" }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          zIndex: 10,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(6px)",
          borderBottom: "1px solid #e5e7eb",
        }}>
          <Toolbar activeMode={activeMode} setActiveMode={setActiveMode} />
        </div>

        <Canvas camera={{ position: [50, 50, 50], fov: 45 }}>
          <ambientLight intensity={1} />
          <directionalLight position={[6, 10, 5]} intensity={0.9} castShadow />
          <Model path="/model.glb" onFaceClick={setMeta} onLoad={handleLoad} />
          <OrbitControls makeDefault />
        </Canvas>
      </div>

      <aside style={{ width: 280, borderLeft: "1px solid #e5e7eb", padding: 16, overflowY: "auto", background: "#fafafa" }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Inspector
        </div>

        {!meta ? (
    <div style={{ fontSize: 12, color: "#aaa", fontFamily: "monospace" }}>
      Click a face to inspect
    </div>
  ) : (
    <React.Fragment key={meta.meshName + meta.faceIndex}>
      {Object.entries(meta.extras)
        .filter(([key]) => !["originalMaterial", "name"].includes(key))
        .map(([key, value]) => {
          const isEditable = editableKeys.includes(key);
          const displayValue = typeof value === "object"
            ? JSON.stringify(value, null, 2)
            : String(value);
          const meshOverrides = overrides[meta.meshName] ?? {};

          if (isEditable) {
            return (
              <Field key={key} label={key}>
                <input
                  className="field"
                  defaultValue={meshOverrides[key] ?? displayValue}
                  onChange={(e) => {
                    const meshKey = meta.meshName;
                    setOverrides((prev) => ({
                      ...prev,
                      [meshKey]: { ...prev[meshKey], [key]: e.target.value }
                    }));
                    meta.extras[key] = e.target.value;
                  }}
                />
              </Field>
            );
          }
          return <Row key={key} label={key} value={meshOverrides[key] ?? displayValue} />;
        })
      }
    </React.Fragment>
  )}
      
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