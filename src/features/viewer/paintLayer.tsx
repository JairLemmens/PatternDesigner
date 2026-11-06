import {useRef, useEffect,useState} from "react";
import * as THREE from "three";
import {type ThreeEvent } from "@react-three/fiber";

const FLOOR = 100; // match your model's world size
const TEX = 512;

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  color: string;
}

// Inside Canvas
export function PaintLayer({ active, eraseMode, brushSize, color }: {
    active: boolean;
    eraseMode: boolean;
    brushSize: number;
    color: string;
    }) {
    const layerRef = useRef<Layer | null>(null);
    const paintingRef = useRef(false);
    const [, tick] = useState(0);
    const [preview, setPreview] = useState<{ x: number; z: number } | null>(null);

    useEffect(() => {
        const canvas = document.createElement("canvas");
        canvas.width = TEX;
        canvas.height = TEX;
        const ctx = canvas.getContext("2d")!;
        const texture = new THREE.CanvasTexture(canvas);
        layerRef.current = { canvas, ctx, texture, color };
        tick(n => n + 1);
        return () => texture.dispose();
    }, []);

    useEffect(() => {
        if (layerRef.current) layerRef.current.color = color;
    }, [color]);

    const handleMove = (e: ThreeEvent<PointerEvent>) => {
        if (!active) return;
        if (paintingRef.current) {
            paintAt(e.point.x, e.point.z);
            if (!eraseMode) {setPreview(null) }{ setPreview({ x: e.point.x, z: e.point.z })};
        } else {
            setPreview({ x: e.point.x, z: e.point.z });
        }
    };

    const paintAt = (x: number, z: number) => {
        const layer = layerRef.current;
        if (!layer) return;
        const u = (x + FLOOR / 2) / FLOOR;
        const v = (z + FLOOR / 2) / FLOOR;
        if (u < 0 || u > 1 || v < 0 || v > 1) return;
        const px = u * TEX;
        const py = v * TEX;
        const r = (brushSize / FLOOR) * TEX * 0.5;
        layer.ctx.save();
        if (eraseMode) {
        layer.ctx.globalCompositeOperation = "destination-out";
        layer.ctx.globalAlpha = 1;
        } else {
        layer.ctx.globalCompositeOperation = "source-over";
        layer.ctx.fillStyle = layer.color;
        layer.ctx.globalAlpha = 1;
        }
        layer.ctx.beginPath();
        layer.ctx.arc(px, py, r, 0, Math.PI * 2);
        layer.ctx.fill();
        layer.ctx.restore();
        layer.texture.needsUpdate = true;
    };

    const texture = layerRef.current?.texture;

  return (
    <>
      {/* invisible hit plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        visible={active}
        onPointerDown={(e) => { if (!active) return; e.stopPropagation(); paintingRef.current = true; paintAt(e.point.x, e.point.z); }}
        onPointerMove={(e) => {handleMove(e)}}
        onPointerUp={() => { paintingRef.current = false; }}
        onPointerLeave={() => { paintingRef.current = false; setPreview(null)}}
        >
        <planeGeometry args={[FLOOR, FLOOR]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* visible paint layer */}
      {texture && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={1}>
          <planeGeometry args={[FLOOR, FLOOR]} />
          <meshBasicMaterial map={texture} transparent={true} opacity={.4} depthWrite={false} />
        </mesh>
      )}
      {preview && active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[preview.x, 0.03, preview.z]}>
            <circleGeometry args={[brushSize * 0.5, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false}/>
        </mesh>
        )}
    </>
  );
}

export default PaintLayer