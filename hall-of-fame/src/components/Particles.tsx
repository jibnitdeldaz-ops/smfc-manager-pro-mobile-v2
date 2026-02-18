import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleProps {
  count?: number
}

interface ParticleState {
  x: number
  y: number
  z: number
  speed: number
  color: string
}

export function Particles({ count = 200 }: ParticleProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo<ParticleState[]>(() => {
    const result: ParticleState[] = []
    for (let index = 0; index < count; index += 1) {
      const randomA = seeded(index * 13.17 + 1.3)
      const randomB = seeded(index * 9.41 + 2.8)
      const randomC = seeded(index * 7.27 + 3.2)
      const randomD = seeded(index * 5.03 + 4.1)
      const randomE = seeded(index * 3.61 + 5.7)

      result.push({
        x: (randomA - 0.5) * 15,
        y: (randomB - 0.5) * 15,
        z: (randomC - 0.5) * 15,
        speed: 0.5 + randomD,
        color: randomE > 0.66 ? '#F97316' : randomE > 0.33 ? '#ef4444' : '#3b82f6',
      })
    }
    return result
  }, [count])

  const colors = useMemo(() => {
    const data = new Float32Array(count * 3)
    particles.forEach((particle, index) => {
      const color = new THREE.Color(particle.color)
      color.toArray(data, index * 3)
    })
    return data
  }, [count, particles])

  useFrame((state) => {
    if (!meshRef.current) {
      return
    }

    particles.forEach((particle, index) => {
      const t = state.clock.getElapsedTime() * particle.speed
      dummy.position.set(
        particle.x + Math.sin(t * 0.5),
        particle.y + Math.cos(t * 0.3),
        particle.z + Math.sin(t * 0.2),
      )
      dummy.rotation.set(t * 0.2, t * 0.4, t)
      dummy.scale.setScalar(0.05)
      dummy.updateMatrix()
      meshRef.current?.setMatrixAt(index, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  )
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}
