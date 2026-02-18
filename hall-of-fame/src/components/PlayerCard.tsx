import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createPlaceholderTexture } from '../lib/textures'
import gsap from 'gsap'

interface PlayerCardProps {
  name: string
  position: [number, number, number]
  rotation?: [number, number, number]
  color?: string
}

export function PlayerCard({ name, position, rotation = [0, 0, 0], color = '#1a1a1a' }: PlayerCardProps) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const [hovered, setHovered] = useState(false)

  const texture = useMemo(() => createPlaceholderTexture(name, color), [name, color])

  useEffect(() => {
    return () => {
      texture.dispose()
      document.body.style.cursor = 'auto'
    }
  }, [texture])

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return
    }

    const targetScale = hovered ? 1.1 : 1
    const scale = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 5, delta)
    groupRef.current.scale.setScalar(scale)

    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, hovered ? 0.08 : 0, 6, delta)
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.3 + position[2]) * 0.05

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = hovered ? 0.45 : 0.22
    }
  })

  const onPointerOver = () => {
    setHovered(true)
    document.body.style.cursor = 'pointer'

    if (groupRef.current) {
      gsap.to(groupRef.current.position, {
        z: position[2] + 0.24,
        duration: 0.3,
        ease: 'power2.out',
      })
    }
  }

  const onPointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'auto'

    if (groupRef.current) {
      gsap.to(groupRef.current.position, {
        z: position[2],
        duration: 0.32,
        ease: 'power2.out',
      })
    }
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <mesh castShadow>
        <boxGeometry args={[2, 3, 0.1]} />
        <meshPhysicalMaterial
          ref={materialRef}
          map={texture}
          roughness={0.16}
          metalness={0.42}
          clearcoat={1}
          clearcoatRoughness={0.12}
          emissive={color}
          emissiveIntensity={0.22}
        />
      </mesh>

      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[1.88, 2.82]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  )
}
