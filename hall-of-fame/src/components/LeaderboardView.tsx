import { Text } from '@react-three/drei'
import type { HallLeaderboardEntry } from '../lib/smfcData'

interface LeaderboardViewProps {
    leaders: HallLeaderboardEntry[]
}

export function LeaderboardView({ leaders }: LeaderboardViewProps) {
    return (
        <group position={[4, 0, 4]}>
            {leaders.slice(0, 5).map((leader, index) => (
                <LeaderPillar key={leader.name} leader={leader} index={index} />
            ))}
        </group>
    )
}

function LeaderPillar({ leader, index }: { leader: HallLeaderboardEntry, index: number }) {
    const height = 2 + (leader.points / 50) // Scale height by points
    const color = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#3b82f6'

    return (
        <group position={[index * 1.5, 0, 0]}>
            {/* Base */}
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.5, 0.6, 0.2, 32]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>

            {/* Pillar */}
            <mesh position={[0, height / 2 + 0.2, 0]} castShadow>
                <boxGeometry args={[0.8, height, 0.8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.9} />
            </mesh>

            {/* Rank Text */}
            <Text position={[0, height + 0.8, 0]} fontSize={0.4} color="white" anchorY="bottom">
                #{leader.rank}
            </Text>

            <Text position={[0, 0.5, 0.51]} fontSize={0.15} color="white" anchorY="bottom">
                {leader.name}
            </Text>
        </group>
    )
}
