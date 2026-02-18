import { Text, Html } from '@react-three/drei'

export function MatchView() {
    return (
        <group position={[0, 1.5, 0]}>
            <ScoreBoard />
            <Html position={[0, -2, 0]} center transform>
                <div className="match-stats-panel">
                    <h3>Latest Match Analysis</h3>
                    <div className="stat-grid">
                        <div className="stat-item">
                            <span className="label">Possession</span>
                            <div className="bar-container">
                                <div className="bar red" style={{ width: '45%' }}></div>
                                <div className="bar blue" style={{ width: '55%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </Html>
        </group>
    )
}

function ScoreBoard() {
    return (
        <group>
            {/* Board Background */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[6, 3, 0.2]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
            </mesh>

            <Text position={[-1.5, 0.5, 0.11]} fontSize={1.2} color="#ff4f71" font="/fonts/Inter-Bold.woff" anchorX="center">
                2
            </Text>
            <Text position={[1.5, 0.5, 0.11]} fontSize={1.2} color="#59a6ff" font="/fonts/Inter-Bold.woff" anchorX="center">
                3
            </Text>
            <Text position={[0, 0.5, 0.11]} fontSize={0.6} color="white" anchorX="center">
                -
            </Text>

            <Text position={[-1.5, -0.8, 0.11]} fontSize={0.3} color="#94a3b8" anchorX="center">
                RED TEAM
            </Text>
            <Text position={[1.5, -0.8, 0.11]} fontSize={0.3} color="#94a3b8" anchorX="center">
                BLUE TEAM
            </Text>
        </group>
    )
}
