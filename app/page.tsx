'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './landing.module.css';

const APP_URL = 'https://tinyurl.com/SMFCmobv2';

export default function Home() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Array<{
    id: number; left: string; size: string; duration: string; delay: string; opacity: string;
  }>>([]);

  // Custom cursor
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX - 5}px, ${e.clientY - 5}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 16}px)`;
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  // Particles
  useEffect(() => {
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 4 + 2}px`,
      duration: `${Math.random() * 15 + 10}s`,
      delay: `${Math.random() * 10}s`,
      opacity: `${Math.random() * 0.4 + 0.1}`,
    }));
    setParticles(p);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add(styles.visible);
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(`.${styles.reveal}`).forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.landingPage}>
      {/* Cursor */}
      <div ref={cursorRef} className={styles.cursor} />
      <div ref={ringRef} className={styles.cursorRing} />

      {/* Particles */}
      <div className={styles.particles}>
        {particles.map(p => (
          <div key={p.id} className={styles.particle} style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: `rgba(253, 128, 46, ${p.opacity})`,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }} />
        ))}
      </div>

      {/* ═══ NAVIGATION ═══ */}
      <nav className={styles.nav}>
        <a href="#hero" className={styles.navLogo}>SMFC<span> MANAGER</span></a>
        <ul className={styles.navLinks}>
          <li><a href="#features">Features</a></li>
          <li><a href="#fantasy">Fantasy</a></li>
          <li><a href="#analytics">Analytics</a></li>
          <li><a href="#roadmap">Roadmap</a></li>
        </ul>
        <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={styles.navCta}>Open App</a>
      </nav>

      {/* ═══ HERO ═══ */}
      <section id="hero" className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Football Management Platform</p>
          <h1 className={styles.heroTitle}>
            Your Club.<br />
            <span className={styles.highlight}>Your Rules.</span>
            <span className={styles.sub}>SMFC Manager Pro — Multi-Club Edition</span>
          </h1>
          <p className={styles.heroTagline}>
            Create or join any club. Build teams, discuss tactics live, predict scores,
            and compete in your own fantasy league — all from one powerful mobile app.
          </p>
          <div className={styles.heroCtas}>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
              Download Free App
            </a>
            <a href="#features" className={styles.btnSecondary}>Explore Features</a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatNum}>5+</div>
              <div className={styles.heroStatLabel}>App Screens</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatNum}>Live</div>
              <div className={styles.heroStatLabel}>Real-Time Sync</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatNum}>∞</div>
              <div className={styles.heroStatLabel}>Clubs Supported</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatNum}>7pts</div>
              <div className={styles.heroStatLabel}>Max Fantasy Score</div>
            </div>
          </div>
        </div>
        <div className={styles.scrollHint}>
          <span>Scroll</span>
          <div className={styles.scrollLine} />
        </div>
      </section>

      {/* ═══ TICKER ═══ */}
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {['Match Lobby', 'Live Team Sync', 'Tactical Board', 'Team Chat', 'Score Predictions', 'Fantasy League', 'AI Scout', 'Hall of Fame', 'Player Stats', 'Multi-Club Support',
            'Match Lobby', 'Live Team Sync', 'Tactical Board', 'Team Chat', 'Score Predictions', 'Fantasy League', 'AI Scout', 'Hall of Fame', 'Player Stats', 'Multi-Club Support'].map((item, i) => (
              <span key={i} className={styles.tickerItem}>{item}</span>
            ))}
        </div>
      </div>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className={`${styles.section} ${styles.howItWorks}`}>
        <div className={styles.sectionInner}>
          <p className={`${styles.sectionLabel} ${styles.reveal}`}>How It Works</p>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`}>Four Steps to<br /><span className={styles.highlight}>Match Day</span></h2>
          <p className={`${styles.sectionSub} ${styles.reveal}`}>
            From signing in to celebrating your win — SMFC Manager Pro handles every step of your football journey.
          </p>
          <div className={styles.stepsGrid}>
            {[
              { num: '01', icon: '🔐', title: 'Login with Google', desc: 'Sign in securely with your Google account. No passwords, no friction — just tap and play.' },
              { num: '02', icon: '🏟️', title: 'Join or Create a Club', desc: 'Search for existing clubs to join, or create your own club with custom name and settings.' },
              { num: '03', icon: '⚽', title: 'Build Your Teams', desc: 'Select players, generate balanced squads, set formations, and publish lineups live to all members.' },
              { num: '04', icon: '🏆', title: 'Play & Compete', desc: 'Predict scores, track stats, chat with teammates, and climb the fantasy league leaderboard.' },
            ].map((step, i) => (
              <div key={i} className={`${styles.step} ${styles.reveal}`}>
                <span className={styles.stepNum}>{step.num}</span>
                <span className={styles.stepIcon}>{step.icon}</span>
                <div className={styles.stepTitle}>{step.title}</div>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURE: MATCH LOBBY ═══ */}
      <section id="features" className={`${styles.section} ${styles.featureSection}`}>
        <div className={styles.featureInner}>
          <div className={`${styles.featureContent} ${styles.reveal}`}>
            <p className={styles.sectionLabel}>Match Lobby</p>
            <h2 className={styles.sectionTitle}>Squad Generation<br /><span className={styles.highlight}>in Seconds</span></h2>
            <p className={styles.sectionSub}>
              Select players from your club roster, paste a WhatsApp attendance list, add guests, and let the AI engine generate perfectly balanced teams.
            </p>
            <ul className={styles.featureList}>
              <li>Smart squad balancing by position (FWD / MID / DEF)</li>
              <li>WhatsApp attendance paste — auto-matches club members</li>
              <li>Add guest players with a single tap</li>
              <li>Live publish to all club members instantly via Supabase</li>
              <li>Player transfer window — swap players between teams</li>
              <li>Copy team list to clipboard for sharing</li>
            </ul>
          </div>
          <div className={`${styles.phoneMockup} ${styles.reveal}`}>
            <div className={styles.phoneGlowWrap}>
              <div className={styles.phoneGlow} />
              <div className={styles.phoneFrame}>
                <div className={styles.phoneNotch} />
                <div className={styles.phoneScreen}>
                  <div className={styles.phoneHeader}>
                    <span className={styles.phoneTitle}>MATCH LOBBY</span>
                    <div className={styles.phoneAvatar} />
                  </div>
                  <div className={styles.phoneRow}>
                    <div className={styles.phoneTile}>
                      <div className={styles.phoneTileLabel}>SMFC Players</div>
                      <div className={styles.phoneTileVal}>14</div>
                    </div>
                    <div className={styles.phoneTile}>
                      <div className={styles.phoneTileLabel}>Guests</div>
                      <div className={styles.phoneTileVal}>2</div>
                    </div>
                  </div>
                  {[
                    { name: 'Akhil', pos: 'FWD', team: '#FD802E' },
                    { name: 'Rasith', pos: 'MID', team: '#FD802E' },
                    { name: 'Jibin', pos: 'DEF', team: '#233D4C' },
                    { name: 'Isa', pos: 'FWD', team: '#233D4C' },
                    { name: 'Sooraj', pos: 'MID', team: '#FD802E' },
                  ].map((p, i) => (
                    <div key={i} className={styles.phonePlayerRow}>
                      <div className={styles.phonePlayerDot} style={{ background: p.team }} />
                      <span className={styles.phonePlayerName}>{p.name}</span>
                      <span className={styles.phonePlayerPos}>{p.pos}</span>
                    </div>
                  ))}
                  <div style={{ background: '#FD802E', borderRadius: 4, padding: '0.4rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#0D1B22', letterSpacing: 1 }}>⚡ GENERATE SQUAD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE: TACTICAL BOARD ═══ */}
      <section className={`${styles.section} ${styles.featureSection}`}>
        <div className={`${styles.featureInner} ${styles.reverse}`}>
          <div className={`${styles.featureContent} ${styles.reveal}`}>
            <p className={styles.sectionLabel}>Tactical Board</p>
            <h2 className={styles.sectionTitle}>See Your Team<br /><span className={styles.highlight}>On The Pitch</span></h2>
            <p className={styles.sectionSub}>
              A live tactical board that renders your squad on a real football pitch with formation presets — just like a pro manager.
            </p>
            <ul className={styles.featureList}>
              <li>Real pitch visualization with penalty boxes, center circle, goals</li>
              <li>Formation presets: 5v5, 7v7, 9v9, 11v11</li>
              <li>Red & Blue team markers positioned by formation</li>
              <li>Substitutes bench displayed on-pitch</li>
              <li>AI Match Simulation with live commentary</li>
              <li>Copy formatted team list for WhatsApp sharing</li>
            </ul>
          </div>
          <div className={`${styles.phoneMockup} ${styles.reveal}`}>
            <div className={styles.phoneGlowWrap}>
              <div className={styles.phoneGlow} />
              <div className={styles.phoneFrame}>
                <div className={styles.phoneNotch} />
                <div className={styles.phoneScreen}>
                  <div className={styles.phoneHeader}>
                    <span className={styles.phoneTitle}>TACTICAL</span>
                    <span style={{ fontSize: '0.6rem', color: '#FD802E', fontWeight: 700 }}>9v9</span>
                  </div>
                  <div className={styles.phonePitch}>
                    {/* Half line */}
                    <div className={styles.phonePitchLine} style={{ left: 0, right: 0, top: '50%', height: 1 }} />
                    {/* Center circle */}
                    <div style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, border: '1px solid rgba(255,255,255,0.3)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                    {/* Red players */}
                    {[[15, 45], [30, 20], [30, 70], [45, 45]].map(([t, l], i) => (
                      <div key={`r${i}`} className={styles.phonePitchDot} style={{ top: `${t}%`, left: `${l}%`, background: '#ff4b4b', width: 7, height: 7 }} />
                    ))}
                    {/* Blue players */}
                    {[[65, 45], [80, 20], [80, 70], [90, 45]].map(([t, l], i) => (
                      <div key={`b${i}`} className={styles.phonePitchDot} style={{ top: `${t}%`, left: `${l}%`, background: '#1c83e1', width: 7, height: 7 }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ flex: 1, background: 'rgba(255,75,75,0.1)', border: '1px solid rgba(255,75,75,0.3)', borderRadius: 4, padding: '0.4rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.5rem', color: '#ff4b4b', fontWeight: 900 }}>🔴 RED</div>
                      <div style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 700 }}>OVR 78</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(28,131,225,0.1)', border: '1px solid rgba(28,131,225,0.3)', borderRadius: 4, padding: '0.4rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.5rem', color: '#1c83e1', fontWeight: 900 }}>🔵 BLUE</div>
                      <div style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 700 }}>OVR 76</div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(253,128,46,0.1)', border: '1px solid rgba(253,128,46,0.3)', borderRadius: 4, padding: '0.4rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.55rem', color: '#FD802E', fontWeight: 900 }}>🔮 SIMULATE MATCH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE: TEAM CHAT ═══ */}
      <section className={`${styles.section} ${styles.featureSection}`}>
        <div className={styles.featureInner}>
          <div className={`${styles.featureContent} ${styles.reveal}`}>
            <p className={styles.sectionLabel}>Team Chat</p>
            <h2 className={styles.sectionTitle}>Discuss Tactics<br /><span className={styles.highlight}>In Real Time</span></h2>
            <p className={styles.sectionSub}>
              A built-in team chat powered by Supabase real-time — no WhatsApp needed. Keep all match discussions in one place.
            </p>
            <ul className={styles.featureList}>
              <li>Real-time messaging with instant delivery</li>
              <li>All club members in one shared channel</li>
              <li>Messages auto-clear every 7 days to keep it fresh</li>
              <li>Sender identity tied to your club profile</li>
              <li>Works offline-first with optimistic updates</li>
            </ul>
          </div>
          <div className={`${styles.phoneMockup} ${styles.reveal}`}>
            <div className={styles.phoneGlowWrap}>
              <div className={styles.phoneGlow} />
              <div className={styles.phoneFrame}>
                <div className={styles.phoneNotch} />
                <div className={styles.phoneScreen}>
                  <div className={styles.phoneHeader}>
                    <span className={styles.phoneTitle}>TEAM CHAT 💬</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { name: 'Rasith', msg: 'Bro I can play today 🔥', me: false },
                      { name: 'Akhil', msg: 'Same! What time kickoff?', me: false },
                      { name: 'You', msg: '6:30 PM at Greenfield', me: true },
                      { name: 'Jibin', msg: 'Put me in midfield this time 😤', me: false },
                      { name: 'You', msg: 'Teams are live, check lobby!', me: true },
                    ].map((m, i) => (
                      <div key={i}>
                        {!m.me && <div className={styles.phoneChatName}>{m.name}</div>}
                        <div className={`${styles.phoneChatBubble} ${m.me ? styles.me : styles.other}`}>
                          <div className={styles.phoneChatText}>{m.msg}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '0.4rem 0.6rem' }}>
                      <span style={{ fontSize: '0.55rem', color: 'rgba(232,244,248,0.3)' }}>Type a message...</span>
                    </div>
                    <div style={{ width: 24, height: 24, borderRadius: 12, background: '#FD802E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.6rem' }}>➤</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE: ALL FEATURES GRID ═══ */}
      <section className={`${styles.section} ${styles.featureSection}`}>
        <div className={styles.sectionInner}>
          <p className={`${styles.sectionLabel} ${styles.reveal}`}>Everything You Need</p>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`}>Built for the<br /><span className={styles.highlight}>Serious Player</span></h2>
          <div className={styles.featureCardsGrid}>
            {[
              { icon: '⚡', title: 'Live Match Status', desc: 'Draft → Published → Locked → Live → Completed. Every match has a real-time status visible to all club members.' },
              { icon: '🎯', title: 'Score Predictions', desc: 'Predict the exact score before kickoff. Earn points for correct results and scorelines.' },
              { icon: '📊', title: 'Player Statistics', desc: 'Track goals, assists, saves, win rate, and form across every match in your club history.' },
              { icon: '🃏', title: 'Futbol Cards', desc: 'Every player has a FIFA-style card with their stats, position, and performance rating.' },
              { icon: '🤖', title: 'AI Scout — Kaarthumbi', desc: 'A local AI scout with 5 distinct personalities gives you match analysis in a mix of English and Malayalam.' },
              { icon: '📋', title: 'Match Database', desc: 'Full match history with scores, team rosters, and analytics. Log new matches with a simple paste.' },
            ].map((card, i) => (
              <div key={i} className={`${styles.featureCard} ${styles.reveal}`}>
                <span className={styles.featureCardIcon}>{card.icon}</span>
                <div className={styles.featureCardTitle}>{card.title}</div>
                <p className={styles.featureCardDesc}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FANTASY LEAGUE ═══ */}
      <section id="fantasy" className={`${styles.section} ${styles.fantasySection}`}>
        <div className={styles.sectionInner}>
          <div className={styles.featureInner}>
            <div className={`${styles.featureContent} ${styles.reveal}`}>
              <p className={styles.sectionLabel}>Fantasy League</p>
              <h2 className={styles.sectionTitle}>Predict. Score.<br /><span className={styles.highlight}>Dominate.</span></h2>
              <p className={styles.sectionSub}>
                A built-in fantasy league where every prediction earns you points. Compete with your entire club across every match of the season.
              </p>
              <div className={styles.pointsSystem}>
                <div className={styles.pointCard}>
                  <div className={styles.pointNum}>3</div>
                  <div className={styles.pointLabel}>Correct Result</div>
                </div>
                <div className={styles.pointCard}>
                  <div className={styles.pointNum}>2</div>
                  <div className={styles.pointLabel}>Correct Red Score</div>
                </div>
                <div className={styles.pointCard}>
                  <div className={styles.pointNum}>2</div>
                  <div className={styles.pointLabel}>Correct Blue Score</div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Max 7 points per match for an exact score prediction. Leaderboard updates live after each match.
              </p>
            </div>
            <div className={`${styles.reveal}`}>
              <div className={styles.leaderboardPreview}>
                <div className={styles.leaderboardHeader}>
                  <span>#</span>
                  <span>Player</span>
                  <span style={{ textAlign: 'right' }}>Points</span>
                  <span style={{ textAlign: 'right' }}>Played</span>
                </div>
                {[
                  { rank: '1', name: 'Rasith', pts: 42, played: 8, rankClass: styles['gold'] },
                  { rank: '2', name: 'Akhil', pts: 35, played: 7, rankClass: styles['silver'] },
                  { rank: '3', name: 'Jibin', pts: 28, played: 8, rankClass: styles['bronze'] },
                  { rank: '4', name: 'Sooraj', pts: 21, played: 6, rankClass: '' },
                  { rank: '5', name: 'Isa', pts: 14, played: 5, rankClass: '' },
                ].map((row, i) => (
                  <div key={i} className={styles.leaderboardRow}>
                    <span className={`${styles.leaderboardRank} ${row.rankClass}`}>{row.rank}</span>
                    <span className={styles.leaderboardName}>{row.name}</span>
                    <span className={styles.leaderboardPts}>{row.pts}</span>
                    <span className={styles.leaderboardPlayed}>{row.played}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ANALYTICS & AI SCOUT ═══ */}
      <section id="analytics" className={`${styles.section} ${styles.analyticsSection}`}>
        <div className={styles.analyticsInner}>
          <div className={`${styles.reveal}`}>
            <div className={styles.aiScoutCard}>
              <div className={styles.aiScoutHeader}>
                <div className={styles.aiScoutAvatar}>🦜</div>
                <div>
                  <div className={styles.aiScoutName}>Kaarthumbi</div>
                  <div className={styles.aiScoutRole}>AI Scout • Analytics Expert</div>
                </div>
              </div>
              <div className={styles.aiScoutMessages}>
                <div className={styles.aiMsgUser}>Who performed best this season?</div>
                <div className={styles.aiMsg}>
                  "Machane, Rasith is absolutely on fire this season! 78% win rate and top of the fantasy table. Avan oru beast aanu! 🔥"
                </div>
                <div className={styles.aiMsgUser}>What formation should we use?</div>
                <div className={styles.aiMsg}>
                  "With your current squad depth, 9v9 with a 3-2-3 setup will maximize your midfield control. Trust the data, da!"
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles.featureContent} ${styles.reveal}`}>
            <p className={styles.sectionLabel}>Analytics & AI Scout</p>
            <h2 className={styles.sectionTitle}>Data-Driven<br /><span className={styles.highlight}>Insights</span></h2>
            <p className={styles.sectionSub}>
              Deep analytics for every player and match, powered by an AI scout with a unique personality — part analyst, part comedian.
            </p>
            <ul className={styles.featureList}>
              <li>Player leaderboard ranked by win percentage</li>
              <li>Form tracker — last 5 match results per player</li>
              <li>Commitment Award, Star Player, and Loss Leader badges</li>
              <li>Kaarthumbi AI with 5 distinct character personalities</li>
              <li>80% English, 20% Malayalam commentary style</li>
              <li>Recent match history with full team rosters</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ HALL OF FAME ═══ */}
      <section id="halloffame" className={`${styles.section} ${styles.hofSection}`}>
        <div className={styles.sectionInner}>
          <p className={`${styles.sectionLabel} ${styles.reveal}`}>Hall of Fame</p>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`}>Club Legends.<br /><span className={styles.highlight}>Eternal Glory.</span></h2>
          <p className={`${styles.sectionSub} ${styles.reveal}`}>
            The best players across all seasons are immortalized in the Hall of Fame — a permanent record of your club's greatest moments.
          </p>
          <div className={styles.hofPodium}>
            {[
              { rank: 'second', medal: '🥈', name: 'Akhil', stat: '71%', label: 'Win Rate' },
              { rank: 'first', medal: '🥇', name: 'Rasith', stat: '78%', label: 'Win Rate' },
              { rank: 'third', medal: '🥉', name: 'Sooraj', stat: '65%', label: 'Win Rate' },
            ].map((p, i) => (
              <div key={i} className={`${styles.hofPodiumCard} ${styles[p.rank as keyof typeof styles]} ${styles.reveal}`}>
                <span className={styles.hofMedal}>{p.medal}</span>
                <div className={styles.hofPlayerName}>{p.name}</div>
                <div className={styles.hofPlayerStat}>{p.stat}</div>
                <div className={styles.hofPlayerStatLabel}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROADMAP / MULTI-CLUB VISION ═══ */}
      <section id="roadmap" className={`${styles.section} ${styles.roadmapSection}`}>
        <div className={styles.sectionInner}>
          <p className={`${styles.sectionLabel} ${styles.reveal}`}>Platform Roadmap</p>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`}>Built Today.<br /><span className={styles.highlight}>Expanding Tomorrow.</span></h2>
          <p className={`${styles.sectionSub} ${styles.reveal}`}>
            SMFC Manager Pro started as a single-club tool. The vision is a global platform where any group of friends can create their own football universe.
          </p>
          <div className={styles.roadmapGrid}>
            {[
              { badge: 'live', label: '✅ Live Now', icon: '⚽', title: 'Single Club Management', desc: 'Full match lobby, tactical board, team chat, predictions, fantasy league, and analytics — all live and working.' },
              { badge: 'live', label: '✅ Live Now', icon: '💬', title: 'Real-Time Team Chat', desc: 'Supabase-powered live messaging for all club members. Discuss tactics, share results, celebrate wins.' },
              { badge: 'live', label: '✅ Live Now', icon: '🏆', title: 'Fantasy League & HOF', desc: 'Season-long fantasy points system with leaderboard and Hall of Fame for top performers.' },
              { badge: 'soon', label: '🔜 Coming Soon', icon: '🔐', title: 'Google Login', desc: 'Secure OAuth login so any player can join the platform without a PIN or manual setup.' },
              { badge: 'soon', label: '🔜 Coming Soon', icon: '🌍', title: 'Multi-Club Support', desc: 'Search for clubs by name, request to join, or create your own club with a custom badge and colors.' },
              { badge: 'future', label: '🔮 Future', icon: '🤝', title: 'Cross-Club Tournaments', desc: 'Challenge other clubs to friendly matches, run mini-tournaments, and compete for the ultimate trophy.' },
            ].map((card, i) => (
              <div key={i} className={`${styles.roadmapCard} ${styles.reveal}`}>
                <span className={`${styles.roadmapBadge} ${styles[card.badge as keyof typeof styles]}`}>{card.label}</span>
                <span className={styles.roadmapIcon}>{card.icon}</span>
                <div className={styles.roadmapTitle}>{card.title}</div>
                <p className={styles.roadmapDesc}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className={`${styles.section} ${styles.ctaSection}`}>
        <div className={styles.ctaInner}>
          <h2 className={`${styles.ctaTitle} ${styles.reveal}`}>
            Ready to<br />Run Your Club?
          </h2>
          <p className={`${styles.ctaSub} ${styles.reveal}`}>
            Download SMFC Manager Pro and take control of every match, every player, every season.
            Free to use. No account needed to get started.
          </p>
          <div className={`${styles.ctaBtnGroup} ${styles.reveal}`}>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={styles.btnCtaPrimary}>
              Download Free App
            </a>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={styles.btnCtaSecondary}>
              Start Matchday Flow
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>SMFC<span> MANAGER PRO</span></div>
        <div className={styles.footerLinks}>
          <a href="#features">Features</a>
          <a href="#fantasy">Fantasy</a>
          <a href="#roadmap">Roadmap</a>
          <a href={APP_URL} target="_blank" rel="noopener noreferrer">Open App</a>
        </div>
        <p className={styles.footerCopy}>© 2025 SMFC Manager Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
