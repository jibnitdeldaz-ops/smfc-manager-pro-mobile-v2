import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getFallbackHallData,
  getHallOfFameData,
  type HallLeaderboardEntry,
  type HallOfFameData,
  type HallPlayer,
} from './lib/smfcData'

const TICKER_ITEMS = [
  'Match Lobby',
  'Auto Squad Draft',
  'Tactical Board',
  'Live Predictions',
  'Fantasy Leaderboard',
  'Realtime Chat',
  'Hall of Fame',
  'Supabase Sync',
]

const FEATURES = [
  {
    icon: '⚽',
    title: 'Match Lobby + Draft Engine',
    body: 'Select players, add guests, and instantly generate balanced Red vs Blue squads just like your mobile Match Lobby flow.',
  },
  {
    icon: '🧠',
    title: 'Tactical Board Presets',
    body: 'Use 5v5, 6v6, 7v7, and 9v9 presets with clear on-pitch coordinates, substitutions, and quick transfer swaps.',
  },
  {
    icon: '📈',
    title: 'Fantasy Prediction Scoring',
    body: 'Built around your real scoring system: +3 winner, +2 red score, +2 blue score. Max 7 points per match.',
  },
  {
    icon: '💬',
    title: 'Locker Room Realtime Chat',
    body: 'Keep team communication active through live chat while match updates and player context remain in sync.',
  },
  {
    icon: '🏆',
    title: 'Hall Of Fame Experience',
    body: 'Turn season leaders into permanent legends with spotlight cards, podium moments, and a living club archive.',
  },
]

const RADAR_KEYS: Array<{ key: keyof HallPlayer['attributes']; label: string }> = [
  { key: 'pac', label: 'Pace' },
  { key: 'sho', label: 'Shooting' },
  { key: 'pas', label: 'Passing' },
  { key: 'dri', label: 'Dribbling' },
  { key: 'def', label: 'Defending' },
  { key: 'phy', label: 'Physicality' },
]

const PARTICLE_COLORS = ['#00FF87', '#00C9FF', '#FFD700']

function App() {
  const shellRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [hallData, setHallData] = useState<HallOfFameData>(() => getFallbackHallData())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    getHallOfFameData(controller.signal)
      .then((nextData) => {
        if (isMounted) {
          setHallData(nextData)
        }
      })
      .catch(() => {
        // Fallback data is already loaded.
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) {
      return
    }

    const cursor = cursorRef.current
    const ring = ringRef.current
    if (!cursor || !ring) {
      return
    }

    let mouseX = 0
    let mouseY = 0
    let ringX = 0
    let ringY = 0
    let rafId = 0

    const onMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX
      mouseY = event.clientY
      cursor.style.transform = `translate(${mouseX - 6}px, ${mouseY - 6}px)`
    }

    const onPointerOver = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('a, button, .player-card, .feature-card, .hof-card, .btn-primary, .btn-secondary, .btn-dark')) {
        cursor.classList.add('cursor-active')
        ring.classList.add('cursor-active')
      }
    }

    const onPointerOut = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('a, button, .player-card, .feature-card, .hof-card, .btn-primary, .btn-secondary, .btn-dark')) {
        cursor.classList.remove('cursor-active')
        ring.classList.remove('cursor-active')
      }
    }

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.12
      ringY += (mouseY - ringY) * 0.12
      ring.style.transform = `translate(${ringX - 18}px, ${ringY - 18}px)`
      rafId = window.requestAnimationFrame(animateRing)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('pointerout', onPointerOut)
    rafId = window.requestAnimationFrame(animateRing)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerout', onPointerOut)
      window.cancelAnimationFrame(rafId)
    }
  }, [])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) {
      return
    }

    const reveals = Array.from(shell.querySelectorAll<HTMLElement>('.reveal'))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.16 },
    )

    reveals.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
    }
  }, [])

  const leaders = useMemo(() => hallData.leaderboard.slice(0, 3), [hallData.leaderboard])
  const playerMap = useMemo(() => new Map(hallData.players.map((player) => [player.name, player])), [hallData.players])
  const spotlightPlayers = useMemo(() => hallData.players.slice(0, 3), [hallData.players])
  const radarPlayer = spotlightPlayers[0] ?? hallData.players[0]

  const radarStats = useMemo(
    () => RADAR_KEYS.map((item) => ({ label: item.label, value: radarPlayer ? radarPlayer.attributes[item.key] : 75 })),
    [radarPlayer],
  )

  const radarPoints = useMemo(() => buildRadarPolygon(radarStats.map((item) => item.value)), [radarStats])
  const radarPointString = useMemo(() => radarPoints.map((point) => `${point.x},${point.y}`).join(' '), [radarPoints])
  const radarLabelPoints = useMemo(() => buildRadarLabelPoints(), [])
  const tickerTrack = useMemo(() => [...TICKER_ITEMS, ...TICKER_ITEMS], [])
  const particles = useMemo(() => buildParticles(26), [])

  const podium = useMemo(() => {
    const [first, second, third] = leaders
    return [second, first, third].filter((entry): entry is HallLeaderboardEntry => Boolean(entry))
  }, [leaders])

  const averageOvr = spotlightPlayers.length > 0
    ? Math.round(spotlightPlayers.reduce((total, player) => total + player.ovr, 0) / spotlightPlayers.length)
    : 0

  return (
    <div ref={shellRef}>
      <div ref={cursorRef} className="cursor" />
      <div ref={ringRef} className="cursor-ring" />
      <div className="pitch-bg" />

      <nav>
        <a href="#hero" className="nav-logo">
          SMFC<span> Manager Pro</span>
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#players">Players</a></li>
          <li><a href="#halloffame">Hall of Fame</a></li>
          <li><a href="#analytics">Analytics</a></li>
        </ul>
        <a href="https://tinyurl.com/SMFCmobv2" target="_blank" rel="noopener noreferrer" className="nav-cta">Open Mobile App</a>
      </nav>

      <section id="hero">
        <div className="hero-bg" />
        <div className="hero-pitch">
          <div className="pitch-line v" />
          <div className="pitch-line v" />
          <div className="pitch-line v" />
          <div className="pitch-line v" />
          <div className="pitch-line v" />
          <div className="pitch-line h" />
          <div className="pitch-line h" />
          <div className="pitch-line h" />
        </div>

        <div className="particles" aria-hidden>
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="particle"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.left}%`,
                opacity: particle.opacity,
                background: particle.color,
                animationDuration: `${particle.duration}s`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="hero-content">
          <p className="hero-eyebrow">SMFC Manager Pro · Mobile Matchday Suite</p>
          <h1 className="hero-title">
            <span className="highlight">Control</span><br />
            Every Matchday
            <span className="sub">Built From Your Actual SMFC Mobile Workflow</span>
          </h1>
          <p className="hero-tagline">
            Match lobby, tactical presets, fantasy predictions, realtime chat, and hall-of-fame moments.
            One connected system for SMFC players and admins.
          </p>
          <div className="hero-ctas">
            <a href="https://tinyurl.com/SMFCmobv2" target="_blank" rel="noopener noreferrer" className="btn-primary">Launch App Flow</a>
            <a href="#features" className="btn-secondary">See Features</a>
          </div>
          <div className="hero-metrics">
            <span>{loading ? 'Syncing roster...' : `${hallData.players.length} Players in Current Roster`}</span>
            <span>Prediction Scoring: 3 + 2 + 2</span>
            <span>Formats: 5v5 / 6v6 / 7v7 / 9v9</span>
          </div>
          <div className="source-pill">
            {loading ? 'Loading data...' : hallData.source === 'live-sheet' ? 'Live roster from SMFC Sheet1' : 'Offline fallback roster'}
          </div>
        </div>

        <div className="scroll-hint">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-track">
          {tickerTrack.map((item, index) => (
            <span key={`${item}-${index}`} className="ticker-item">{item}</span>
          ))}
        </div>
      </div>

      <section id="features">
        <div className="features-inner">
          <div className="features-left reveal">
            <p className="section-label">Core Features</p>
            <h2 className="section-title">Made For SMFC Matchdays</h2>
            <p className="section-copy">
              This landing mirrors your real mobile app stack: identity-based login, squad generation, match publishing,
              live predictions, fantasy scoring, chat, and performance analytics.
            </p>

            <div className="phone-mockup">
              <div className="phone-glow phone-glow-1" />
              <div className="phone-glow phone-glow-2" />
              <div className="phone-frame">
                <div className="phone-notch" />
                <div className="phone-screen">
                  <div className="phone-header">
                    <div className="phone-header-title">SMFC PRO</div>
                    <div className="phone-avatar" />
                  </div>
                  <div className="stat-row">
                    <div className="stat-tile"><div className="num">{hallData.players.length}</div><div className="lbl">Roster</div></div>
                    <div className="stat-tile"><div className="num">{leaders.length > 0 ? leaders[0].points : 0}</div><div className="lbl">Top Points</div></div>
                    <div className="stat-tile"><div className="num">7</div><div className="lbl">Max Match Pts</div></div>
                    <div className="stat-tile"><div className="num">{averageOvr}</div><div className="lbl">Avg Top OVR</div></div>
                  </div>
                  <div className="mini-chart">
                    <div className="chart-area" />
                    <div className="chart-line" />
                  </div>
                  {spotlightPlayers.slice(0, 2).map((player) => (
                    <div key={player.id} className="player-mini">
                      <div className="player-mini-num">{player.ovr}</div>
                      <div className="player-mini-info">
                        <div className="player-mini-name">{player.name.toUpperCase()}</div>
                        <div className="player-mini-pos">{player.position} · {player.team}</div>
                      </div>
                      <div className="player-mini-bar">
                        <div className="bar-fill" style={{ width: `${Math.max(20, player.ovr)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="features-right">
            {FEATURES.map((feature, index) => (
              <div key={feature.title} className="feature-card reveal" style={{ transitionDelay: `${0.1 + index * 0.09}s` }}>
                <div className="feature-icon">{feature.icon}</div>
                <div className="feature-text">
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="players">
        <div className="players-inner">
          <div className="players-header reveal">
            <p className="section-label section-label-centered">Player Spotlight</p>
            <h2 className="section-title">SMFC <span className="green">Impact Players</span></h2>
            <p className="section-copy section-copy-center">
              Pulled from your active roster feed and styled for quick decision-making before kickoff.
            </p>
          </div>
          <div className="players-grid">
            {spotlightPlayers.map((player, index) => {
              const rank = hallData.leaderboard.find((entry) => entry.name === player.name)?.rank ?? index + 1
              const statTriplet = getSpotlightStats(player)

              return (
                <div key={player.id} className="player-card reveal" style={{ transitionDelay: `${0.12 + index * 0.09}s` }}>
                  <div className="player-aura" />
                  <div className="player-badge">{rank}</div>
                  <div className="player-pos-badge">{player.position}</div>
                  <div className="player-avatar">{getPlayerIcon(player.position)}</div>
                  <div className="player-name">{player.name}</div>
                  <div className="player-club">SMFC · {player.team} Squad</div>
                  <div className="player-stats">
                    {statTriplet.map((stat) => (
                      <div key={`${player.id}-${stat.label}`} className="pstat">
                        <div className="pstat-num">{stat.value}</div>
                        <div className="pstat-lbl">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rating-bar"><div className="rating-fill" style={{ width: `${player.ovr}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="halloffame">
        <div className="hof-inner">
          <div className="hof-header reveal">
            <p className="section-label section-label-centered section-label-gold">Legacy & Legends</p>
            <h2 className="section-title"><span className="gold-shimmer">Hall of Fame</span></h2>
            <p className="section-copy section-copy-center hall-copy">
              Directly aligned with your fantasy leaderboard logic so top performers stay visible across seasons.
            </p>
          </div>

          <div className="hof-grid reveal">
            {podium.map((entry) => {
              const isChampion = entry.rank === 1
              const linkedPlayer = playerMap.get(entry.name)

              return (
                <article key={entry.name} className={`hof-card${isChampion ? ' first' : ''}`}>
                  <div className="hof-rank">{entry.rank.toString().padStart(2, '0')}</div>
                  {isChampion ? <div className="hof-trophy">🏆</div> : null}
                  <div className="hof-avatar">{getPodiumIcon(entry.rank, linkedPlayer?.position)}</div>
                  <div className="hof-name">{entry.name}</div>
                  <div className="hof-season">{linkedPlayer ? `${linkedPlayer.team} Team · OVR ${linkedPlayer.ovr}` : 'SMFC Leaderboard'}</div>
                  <div className="hof-achievement">{getAchievementText(entry.rank)}</div>
                  <div className="hof-stat">
                    {entry.points} <span className="hof-stat-label">points</span>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="analytics">
        <div className="analytics-inner">
          <div className="radar-container reveal">
            <div className="radar-wrap">
              <div className="radar-glow" />
              <svg className="radar" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Top player attribute radar">
                <g stroke="rgba(255,255,255,0.06)" fill="none" strokeWidth="1">
                  <polygon points="160,45 258,102 258,218 160,275 62,218 62,102" />
                  <polygon points="160,78 230,120 230,200 160,242 90,200 90,120" />
                  <polygon points="160,110 210,136 210,184 160,210 110,184 110,136" />
                  <polygon points="160,136 188,152 188,168 160,184 132,168 132,152" />
                </g>
                <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
                  {radarLabelPoints.map((point, index) => (
                    <line key={`spoke-${RADAR_KEYS[index].key}`} x1="160" y1="160" x2={point.x} y2={point.y} />
                  ))}
                </g>
                <polygon points={radarPointString} fill="rgba(0,255,135,0.12)" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
                {radarPoints.map((point, index) => (
                  <circle key={`point-${RADAR_KEYS[index].key}`} cx={point.x} cy={point.y} r="5" fill="var(--green)" />
                ))}
                {radarLabelPoints.map((point, index) => (
                  <text
                    key={`label-${RADAR_KEYS[index].key}`}
                    x={point.x}
                    y={point.y}
                    textAnchor={point.x > 200 ? 'start' : point.x < 120 ? 'end' : 'middle'}
                    fill="rgba(245,245,240,0.55)"
                    fontFamily="Barlow Condensed"
                    fontSize="11"
                    letterSpacing="1"
                  >
                    {RADAR_KEYS[index].label.toUpperCase()}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          <div>
            <p className="section-label reveal">Deep Analytics</p>
            <h2 className="section-title reveal">Top Player Attribute Map</h2>
            <p className="section-copy reveal">
              {radarPlayer
                ? `${radarPlayer.name} currently leads the SMFC showcase. Use this visual to compare strengths before setting your next lineup.`
                : 'Analytics data updates once roster sync completes.'}
            </p>

            <div className="stats-list">
              {radarStats.map((stat, index) => (
                <div key={stat.label} className="stat-item reveal" style={{ transitionDelay: `${0.1 + index * 0.08}s` }}>
                  <div className="stat-header">
                    <span className="stat-name">{stat.label}</span>
                    <span className="stat-val">{stat.value}</span>
                  </div>
                  <div className="stat-track">
                    <div className="stat-progress" style={{ width: `${stat.value}%` }}>
                      <div className="stat-dot" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="cta">
        <div className="cta-inner">
          <h2 className="cta-title">Your Team.<br />Your Decisions.</h2>
          <p className="cta-sub">
            Run your next SMFC match with the same mobile-first workflow: choose players, draft squads,
            set tactics, predict results, and track legends.
          </p>
          <a href="https://tinyurl.com/SMFCmobv2" target="_blank" rel="noopener noreferrer" className="btn-dark">Start Matchday Flow</a>
        </div>
      </section>

      <footer>
        <div className="footer-logo">SMFC<span> Manager Pro</span></div>
        <div className="footer-copy">
          © {new Date().getFullYear()} SMFC Manager Pro · Fantasy, Tactical Board, Match Lobby, and Hall of Fame
        </div>
      </footer>
    </div>
  )
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function buildParticles(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const size = 1 + seeded(index * 2.31 + 0.13) * 4
    const left = seeded(index * 4.89 + 0.77) * 100
    const opacity = 0.12 + seeded(index * 3.47 + 1.12) * 0.48
    const duration = 10 + seeded(index * 5.11 + 1.97) * 16
    const delay = seeded(index * 6.73 + 2.29) * 10
    const colorIndex = Math.floor(seeded(index * 7.09 + 2.81) * PARTICLE_COLORS.length) % PARTICLE_COLORS.length

    return {
      id: index,
      size,
      left,
      opacity,
      duration,
      delay,
      color: PARTICLE_COLORS[colorIndex],
    }
  })
}

function buildRadarPolygon(values: number[]) {
  return values.map((value, index) => {
    const angle = ((-90 + index * 60) * Math.PI) / 180
    const radius = (Math.max(0, Math.min(100, value)) / 100) * 115
    return {
      x: 160 + Math.cos(angle) * radius,
      y: 160 + Math.sin(angle) * radius,
    }
  })
}

function buildRadarLabelPoints() {
  return RADAR_KEYS.map((_, index) => {
    const angle = ((-90 + index * 60) * Math.PI) / 180
    const radius = 136
    return {
      x: 160 + Math.cos(angle) * radius,
      y: 160 + Math.sin(angle) * radius,
    }
  })
}

function getPlayerIcon(position: HallPlayer['position']) {
  if (position === 'FWD') {
    return '⚡'
  }
  if (position === 'DEF') {
    return '🛡️'
  }
  return '🎯'
}

function getPodiumIcon(rank: number, position?: HallPlayer['position']) {
  if (rank === 1) {
    return '👑'
  }
  if (rank === 2) {
    return '🥈'
  }
  if (rank === 3) {
    return '🥉'
  }
  return getPlayerIcon(position ?? 'MID')
}

function getAchievementText(rank: number) {
  if (rank === 1) {
    return 'Most complete match predictions and strongest weekly impact.'
  }
  if (rank === 2) {
    return 'Elite consistency in winner calls and scoreline accuracy.'
  }
  if (rank === 3) {
    return 'Reliable tactical reads across recent completed fixtures.'
  }
  return 'Season contributor'
}

function getSpotlightStats(player: HallPlayer) {
  if (player.position === 'FWD') {
    return [
      { label: 'SHO', value: player.attributes.sho },
      { label: 'PAC', value: player.attributes.pac },
      { label: 'DRI', value: player.attributes.dri },
    ]
  }

  if (player.position === 'DEF') {
    return [
      { label: 'DEF', value: player.attributes.def },
      { label: 'PHY', value: player.attributes.phy },
      { label: 'PAS', value: player.attributes.pas },
    ]
  }

  return [
    { label: 'PAS', value: player.attributes.pas },
    { label: 'DRI', value: player.attributes.dri },
    { label: 'PAC', value: player.attributes.pac },
  ]
}

export default App
