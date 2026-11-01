import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState} from "react";
import * as THREE from "three";
import Model from './components/model';
import MeshInspector from "./components/meshInspector"
import ToggleGroup from "./components/toggleGroup";
import PaintLayer from "./components/paintLayer";
import ExpandingButton from "./components/expandingButton";

const PALETTE = [
  "#f97316", "#3b82f6", "#10b981", "#a855f7",
  "#ef4444", "#eab308", "#06b6d4", "#ec4899",
];

export function Viewer() {
  const [activeFace, setActiveFace] = useState<THREE.Mesh | null>(null);
  const [viewMode, setViewMode] = useState<"Default" | "Privacy" | "Facade">("Default");
  const [brushOn, setBrushOn] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState(PALETTE[0]);

  return (
    <div style={{flexDirection:'column'}}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <ToggleGroup options={["Default", "Privacy", "Facade"]} value={viewMode} onChange={(v) => setViewMode(v as "Default" | "Privacy" | "Facade")}/>
        <ExpandingButton width={600} onOpenChange={(open)=>{setBrushOn(open)}}>
          <button   style={{
              border: "none",
              height: "100%",
              width: 50,
              fontSize: 14,
              whiteSpace: "nowrap",
              background: eraseMode ? "var(--accent)" : "var(--primary)",
              color: "white",
              transition: "background 0.2s ease",
            }}
            onClick={() => setEraseMode(v => !v)}>{eraseMode ? "Erase" : "Draw"}
          </button>
          <input type="range" min={.5} max={5} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} />
          {/* {PALETTE.map(c => (
            <button key={c} onClick={() => {setBrushColor(c); setEraseMode(false)}} style={{ background: c,minHeight:30, border: brushColor === c ? "2px solid black" : "none" }} />
          ))} */}
          <select className="field" value ={brushColor} style={{background: brushColor}} onChange={(e) => setBrushColor(e.target.value)}>
                <option style={{background:0}} value="#ffdc4a">Livingroom</option>
                <option style={{opacity:0}} value= "#bd0a0a">Kitchen</option>
                <option style={{opacity:0}} value="closed">Bedroom</option>
                <option style={{opacity:0}} value="closed">Bedroom</option>
          </select>
        </ExpandingButton>
      </div>
      <div style={{ display: "flex",overflow:"hidden"}}>
        <Canvas style={{ display: "inline-flex", flex: 1 , width: "100vw", height: "100vh" }} camera={{ position: [50, 50, 50], fov: 45 }}>
          <ambientLight intensity={1} />
          <directionalLight position={[6, 10, 5]} intensity={0.9} castShadow />
          <Model path="/model.glb" onFaceClick={setActiveFace} viewMode={viewMode} clickable={!brushOn}/>
          <PaintLayer active={brushOn} eraseMode={eraseMode} brushSize={brushSize} color={brushColor} />
          <OrbitControls makeDefault enabled={!brushOn} />
        </Canvas>
        <MeshInspector mesh={activeFace} />
      </div>
    </div>  
  )
}

