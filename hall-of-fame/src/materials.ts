import * as THREE from 'three'


export function useGoldMaterial() {
    const material = new THREE.MeshStandardMaterial({
        color: '#FFD700', // Gold
        metalness: 1,
        roughness: 0.15,
        envMapIntensity: 1,
    })

    return material
}
