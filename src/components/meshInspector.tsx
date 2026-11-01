import { useCallback, useState } from "react";
import * as THREE from "three";
import Field from "./field";
import "../app.css";

export function MeshInspector({ mesh }: { mesh: THREE.Mesh | null }) {
  const [, forceUpdate] = useState(0);

  const handleChange = useCallback(
    (key: string, value: string) => {
      if (!mesh) return;
      console.log(mesh.name)
      mesh.userData[key] = value;
      forceUpdate((n) => n + 1);
    },
    [mesh]
  );

  return (
    <div style={{ width: 280, borderLeft: "1px solid #e5e7eb", padding: 16, overflowY: "auto", background: "var(--inspector)" }}>

        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
          Inspector
        </div>

        {!mesh ? (
          <p style={{ marginTop: 12, fontSize: 12, color: "#888" }}>
            Select a face to view and edit properties.
          </p>
        ):(
            <>
            <Field label="Type: ">
                <>{mesh.userData.type}</>
            </Field>

            {mesh.userData.space && (
                <Field label="Space: ">
                    <>{mesh.userData.space}</>
                </Field>
            )}

            {mesh.userData.spaces && (
                <Field label="Spaces: ">
                    <>{mesh.userData.spaces}</>
                </Field>
            )}

            <Field label="Construction: ">
                <input className="field" value={mesh.userData.construction ?? ""} onChange={(e) => handleChange("construction", e.target.value)}></input>
            </Field>

            {mesh.userData.privacy_gradient != null && (
                <Field label="Privacy gradient: ">
                    <>{mesh.userData.privacy_gradient}</>
                </Field>
            )}

                
            </>
        )}
        <p style={{ position: "absolute", bottom: 12, fontSize: 12, color: "#888", margin: 0 }}>ID: {mesh?.userData.id}</p>   
    </div>
  );
}

export default MeshInspector;
