import { useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { HallPlayer } from '../lib/smfcData'

interface CardDraftProps {
    player: HallPlayer
    isActive: boolean
}

export function CardDraft({ player, isActive }: CardDraftProps) {
    const groupRef = useRef<THREE.Group>(null)
    const [team, setTeam] = useState<'NEUTRAL' | 'RED' | 'BLUE'>('NEUTRAL')

    // Dynamic colors based on team selection
    const accentColor = useMemo(() => {
        if (team === 'RED') return '#ff4f71'
        if (team === 'BLUE') return '#59a6ff'
        return '#a1a1aa' // Neutral Silver
    }, [team])

    const texture = useMemo(() => createDraftCardTexture(player, team), [player, team])

    useFrame((state, delta) => {
        if (!groupRef.current) return

        // Smooth floating animation
        const float = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
        groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, float, 2, delta)

        // Selection rotation
        if (isActive) {
            groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, 0, 4, delta)
        }
    })

    return (
        <group ref={groupRef}>
            {/* The Card Mesh */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[3.2, 4.6, 0.2]} />
                <meshStandardMaterial
                    color="#1e293b"
                    metalness={0.8}
                    roughness={0.2}
                    emissive={accentColor}
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Front Face Texture */}
            <mesh position={[0, 0, 0.11]}>
                <planeGeometry args={[2.9, 4.3]} />
                <meshBasicMaterial map={texture} />
            </mesh>

            {/* HTML UI for Team Selection (Floating buttons) */}
            {isActive && (
                <Html position={[0, -2.8, 0]} transform center>
                    <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
                        <button
                            onClick={() => setTeam('RED')}
                            style={{
                                background: '#ff4f71',
                                border: team === 'RED' ? '2px solid white' : 'none',
                                padding: '8px 24px',
                                borderRadius: '20px',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: team === 'BLUE' ? 0.5 : 1
                            }}
                        >
                            RED
                        </button>
                        <button
                            onClick={() => setTeam('BLUE')}
                            style={{
                                background: '#59a6ff',
                                border: team === 'BLUE' ? '2px solid white' : 'none',
                                padding: '8px 24px',
                                borderRadius: '20px',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: team === 'RED' ? 0.5 : 1
                            }}
                        >
                            BLUE
                        </button>
                    </div>
                </Html>
            )}
        </group>
    )
}

function createDraftCardTexture(entry: HallPlayer, team: 'NEUTRAL' | 'RED' | 'BLUE'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 760
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.CanvasTexture(canvas)

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, 760)
    gradient.addColorStop(0, '#0f172a')
    gradient.addColorStop(1, '#020617')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 760)

    // Team Accent
    let accent = '#94a3b8'
    if (team === 'RED') accent = '#ff4f71'
    if (team === 'BLUE') accent = '#59a6ff'

    ctx.strokeStyle = accent
    ctx.lineWidth = 8
    ctx.strokeRect(20, 20, 472, 720)

    // Text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 60px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(entry.name.toUpperCase(), 256, 120)

    ctx.font = '40px Arial'
    ctx.fillStyle = accent
    ctx.fillText(team === 'NEUTRAL' ? 'FREE AGENT' : `TEAM ${team}`, 256, 180)

    ctx.font = 'bold 120px Arial'
    ctx.fillStyle = 'white'
    ctx.fillText(entry.ovr.toString(), 256, 400)

    ctx.font = '30px Arial'
    ctx.fillStyle = '#64748b'
    ctx.fillText('OVERALL RATING', 256, 440)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
}
