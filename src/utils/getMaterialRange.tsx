import * as THREE from "three";


export function getMaterialRange(n: number): THREE.MeshStandardMaterial[] {
  return Array.from({ length: n }, (_, i) =>
    new THREE.MeshStandardMaterial({
      color: `hsl(${Math.round((1 - i / (n - 1)) * 240)}, 70%, 55%)`,
      side: THREE.DoubleSide,
      opacity: 0.8,
      transparent: true,
    })
  );
}

export default getMaterialRange;