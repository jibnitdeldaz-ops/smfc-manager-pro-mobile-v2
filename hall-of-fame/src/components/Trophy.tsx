import { useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGoldMaterial } from '../materials'
import gsap from 'gsap'

export function Trophy({ ...props }) {
    const groupRef = useRef<THREE.Group>(null)
    const cupRef = useRef<THREE.Group>(null)
    const material = useGoldMaterial()

    useLayoutEffect(() => {
        if (cupRef.current) {
            gsap.to(cupRef.current.position, {
                y: 0.2,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut"
            })

            gsap.to(cupRef.current.rotation, {
                z: 0.05,
                duration: 3,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut"
            })
        }
    }, [])

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.2
        }
    })

    return (
        <group ref={groupRef} {...props}>
            <group ref={cupRef}>
                {/* Base */}
                <mesh position={[0, -1.2, 0]} material={material} castShadow>
                    <cylinderGeometry args={[0.8, 1, 0.4, 64]} />
                </mesh>
                <mesh position={[0, -0.9, 0]} material={material} castShadow>
                    <cylinderGeometry args={[0.4, 0.4, 0.4, 64]} />
                </mesh>

                {/* Cup Body */}
                <mesh position={[0, 0.2, 0]} material={material} castShadow>
                    <cylinderGeometry args={[1, 0.5, 2, 64, 1, true]} />
                    <meshStandardMaterial color="#201a00" side={THREE.BackSide} metalness={1} roughness={0.2} />
                </mesh>

                {/* Handles */}
                <mesh position={[1, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]} material={material} castShadow>
                    <torusGeometry args={[0.6, 0.08, 16, 64, Math.PI]} />
                </mesh>
                <mesh position={[-1, 0.5, 0]} rotation={[0, 0, Math.PI + Math.PI / 4]} material={material} castShadow>
                    <torusGeometry args={[0.6, 0.08, 16, 64, Math.PI]} />
                </mesh>

                {/* SMFC Star / Jewel */}
                <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <dodecahedronGeometry args={[0.4, 0]} />
                    <meshStandardMaterial
                        color="#F97316"
                        emissive="#F97316"
                        emissiveIntensity={4}
                        metalness={1}
                        roughness={0}
                    />
                </mesh>
            </group>
        </group>
    )
}
