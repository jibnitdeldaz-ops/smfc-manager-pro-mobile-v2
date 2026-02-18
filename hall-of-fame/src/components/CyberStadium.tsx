import { useRef } from 'react'
import { Grid, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

export function CyberStadium() {
    const lightRef = useRef<THREE.SpotLight>(null!)
    // useHelper(lightRef, THREE.SpotLightHelper)

    return (
        <group>
            {/* Primary Floor Grid */}
            <Grid
                args={[100, 100]}
                cellSize={1}
                cellColor="#334155"
                sectionColor="#6366f1"
                fadeDistance={40}
                position={[0, -0.01, 0]}
            />

            {/* Glossy Floor Surface for Reflections */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial
                    color="#020617"
                    metalness={0.9}
                    roughness={0.15}
                    envMapIntensity={0.5}
                />
            </mesh>

            {/* Stadium Pillars/Structure in the Distance */}
            <group position={[0, 0, -25]}>
                {Array.from({ length: 12 }).map((_, i) => (
                    <mesh key={i} position={[(i - 5.5) * 8, 10, -5]}>
                        <boxGeometry args={[0.5, 25, 0.5]} />
                        <meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.2} />
                    </mesh>
                ))}
                {/* Top Beam */}
                <mesh position={[0, 20, -5]}>
                    <boxGeometry args={[100, 1, 1]} />
                    <meshStandardMaterial color="#0f172a" />
                </mesh>
            </group>

            {/* Volumetric Spotlights */}
            <group>
                <spotLight
                    ref={lightRef}
                    position={[0, 20, -10]}
                    angle={0.4}
                    penumbra={1}
                    intensity={500}
                    color="#ffffff"
                    castShadow
                    shadow-bias={-0.0001}
                />
                {/* Stadium "Floodlights" */}
                <group position={[0, 22, -12]}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <mesh key={i} position={[(i - 3.5) * 4, 0, 0]}>
                            <boxGeometry args={[2, 1, 0.5]} />
                            <meshBasicMaterial color="#ffffff" toneMapped={false} />
                        </mesh>
                    ))}
                </group>
            </group>

            <ContactShadows
                position={[0, 0, 0]}
                opacity={0.4}
                scale={40}
                blur={2}
                far={10}
                resolution={1024}
                color="#000000"
            />
        </group>
    )
}
