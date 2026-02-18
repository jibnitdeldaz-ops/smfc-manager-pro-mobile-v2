import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

type ViewState = 'LOBBY' | 'DRAFT' | 'LEADERBOARD' | 'MATCH'

interface SceneManagerProps {
    viewState: ViewState
}

export function SceneManager({ viewState }: SceneManagerProps) {
    const targetPosition = useRef(new THREE.Vector3(0, 2, 10))
    const targetLookAt = useRef(new THREE.Vector3(0, 1.5, 0))

    useEffect(() => {
        // Define camera views based on state
        switch (viewState) {
            case 'LOBBY':
                // Wide shot of the arena
                gsap.to(targetPosition.current, { x: 0, y: 4, z: 12, duration: 1.5, ease: 'power2.inOut' })
                gsap.to(targetLookAt.current, { x: 0, y: 1, z: 0, duration: 1.5, ease: 'power2.inOut' })
                break
            case 'DRAFT':
                // Close up on the player card podium
                gsap.to(targetPosition.current, { x: 0, y: 2, z: 5, duration: 1.2, ease: 'power2.inOut' })
                gsap.to(targetLookAt.current, { x: 0, y: 2, z: 0, duration: 1.2, ease: 'power2.inOut' })
                break
            case 'LEADERBOARD':
                // Angled view of the data pillars
                gsap.to(targetPosition.current, { x: 4, y: 3, z: 8, duration: 1.5, ease: 'power2.inOut' })
                gsap.to(targetLookAt.current, { x: 0, y: 1.5, z: -2, duration: 1.5, ease: 'power2.inOut' })
                break
            case 'MATCH':
                // Overhead/Tactical view
                gsap.to(targetPosition.current, { x: 0, y: 8, z: 4, duration: 1.5, ease: 'power2.inOut' })
                gsap.to(targetLookAt.current, { x: 0, y: 0, z: -4, duration: 1.5, ease: 'power2.inOut' })
                break
        }
    }, [viewState])

    useFrame((state, delta) => {
        // Smoothly interpolate camera position and lookAt
        state.camera.position.lerp(targetPosition.current, delta * 2)
        state.camera.lookAt(targetLookAt.current)
    })

    return null
}
