import { useRef } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

interface DataPillarProps {
    position: [number, number, number]
    height: number
    color: string
    name: string
    score: number
    rank: number
}

export function DataPillar({ position, height, color, name, score, rank }: DataPillarProps) {
    const meshRef = useRef<THREE.Mesh>(null)

    const onPointerOver = () => {
        document.body.style.cursor = 'pointer'
        gsap.to(meshRef.current!.scale, { x: 1.1, z: 1.1, duration: 0.3 })
        gsap.to(meshRef.current!.material, { emissiveIntensity: 2, duration: 0.3 })
    }

    const onPointerOut = () => {
        document.body.style.cursor = 'auto'
        gsap.to(meshRef.current!.scale, { x: 1, z: 1, duration: 0.3 })
        gsap.to(meshRef.current!.material, { emissiveIntensity: 0.5, duration: 0.3 })
    }

    return (
        <group position={position}>
            {/* Pillar */}
            <mesh
                ref={meshRef}
                position={[0, height / 2, 0]}
                onPointerOver={onPointerOver}
                onPointerOut={onPointerOut}
            >
                <boxGeometry args={[1, height, 1]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.5}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>

            {/* Rank Number (Floating) */}
            <Text
                position={[0, height + 1, 0]}
                fontSize={0.8}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                #{rank}
            </Text>

            {/* Player Name (Base) */}
            <Text
                position={[0, 0.1, 1]}
                rotation={[-Math.PI / 4, 0, 0]}
                fontSize={0.4}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {name}
            </Text>

            {/* Score (Top) */}
            <Text
                position={[0, height + 0.4, 0]}
                fontSize={0.4}
                color={color}
                anchorX="center"
                anchorY="middle"
            >
                {score} PTS
            </Text>
        </group>
    )
}
