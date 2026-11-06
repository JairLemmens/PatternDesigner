import {type ThreeEvent } from "@react-three/fiber";
import {useGLTF} from "@react-three/drei";
import {useCallback, useRef, useEffect} from "react";
import * as THREE from "three";
import getMaterialRange from "./getMaterialRange";

const highlightMaterial = new THREE.MeshStandardMaterial({
  color: '#f59e0b',
  side: THREE.DoubleSide,
  opacity: 0.8,
  transparent: true,
});

function Model({ path, onFaceClick, viewMode="Default", clickable=true}: {path: string; onFaceClick: (mesh: THREE.Mesh|null) => void; viewMode?: "Default" | "Privacy" | "Facade"; clickable?: boolean;}) {
    const { scene } = useGLTF(path);
    const previousRef = useRef<{ mesh: THREE.Mesh} | null>(null);

    //handle clicks on mesh
    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (!clickable) return;
        e.stopPropagation();
        const mesh = e.object as THREE.Mesh
        //Change highlight material
        if (previousRef.current) {
            let prev = previousRef.current.mesh;
            switch (viewMode) {
                case "Privacy":
                    prev.material = prev.userData.privacyMaterial;
                    break;
                case "Facade":
                    prev.material = prev.userData.facadeMaterial;
                    break;
                default:
                    prev.material = prev.userData.defaultMaterial;
            }
        }
        if (previousRef.current?.mesh === mesh) {
            previousRef.current = null;
            onFaceClick(null);
            return;
        }
        previousRef.current = {mesh};
        mesh.material = highlightMaterial;
        //return mesh to be set as current mesh to populate inspector
        onFaceClick(mesh);
        },[viewMode,clickable])
    
    //update viewmode
    useEffect(() => {
        let min_pg = 0   
        let max_pg = 0
        let facadeMaterials: Record<string, THREE.MeshStandardMaterial> = {};
        scene.traverse((obj)=>{
            let mesh = obj as THREE.Mesh
            if (!mesh.userData.defaultMaterial) {
                mesh.userData.defaultMaterial = mesh.material;
            }
            min_pg = Math.min(min_pg, mesh.userData.privacy_gradient ?? 0);
            max_pg = Math.max(max_pg, mesh.userData.privacy_gradient ?? 0);
            if (mesh.userData.construction) {
                facadeMaterials[mesh.userData.construction] ??= new THREE.MeshStandardMaterial({
                    color: `hsl(${Math.round(Math.random() * 360)}, 70%, 55%)`,
                    side: THREE.DoubleSide,
                    opacity: 0.8,
                    transparent: true,
                });
            }
        })
        
        const privacyMaterials = getMaterialRange(max_pg - min_pg + 1)
        scene.traverse((obj)=>{
            let mesh = obj as THREE.Mesh
            mesh.userData.privacyMaterial = privacyMaterials[mesh.userData.privacy_gradient] ?? mesh.userData.defaultMaterial
            mesh.userData.facadeMaterial =  facadeMaterials[mesh.userData.construction] ?? mesh.userData.defaultMaterial
            switch (viewMode) {
                case "Privacy":
                    mesh.material = mesh.userData.privacyMaterial;
                    break;
                case "Facade":
                    mesh.material = mesh.userData.facadeMaterial;
                    break;
                default:
                    mesh.material = mesh.userData.defaultMaterial;
            }
        })
    }, [viewMode, scene]);

    return <primitive object={scene}  onClick={handleClick}/>
}   

export default Model;
