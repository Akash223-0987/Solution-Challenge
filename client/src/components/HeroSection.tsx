import { useEffect, useRef, useState, useCallback } from 'react';
import './HeroSection.css';

// ─── India city nodes (SVG viewport coords) ──────────────────
const CITIES: Record<string, { x: number; y: number; label: string }> = {
  delhi:     { x: 310, y: 165, label: 'Delhi' },
  mumbai:    { x: 215, y: 340, label: 'Mumbai' },
  chennai:   { x: 345, y: 490, label: 'Chennai' },
  kolkata:   { x: 475, y: 275, label: 'Kolkata' },
  bangalore: { x: 305, y: 470, label: 'Bengaluru' },
  hyderabad: { x: 320, y: 400, label: 'Hyderabad' },
  pune:      { x: 235, y: 360, label: 'Pune' },
  ahmedabad: { x: 215, y: 255, label: 'Ahmedabad' },
  nagpur:    { x: 335, y: 305, label: 'Nagpur' },
  jaipur:    { x: 270, y: 195, label: 'Jaipur' },
  lucknow:   { x: 370, y: 195, label: 'Lucknow' },
  patna:     { x: 420, y: 215, label: 'Patna' },
};

// ─── Route definitions ────────────────────────────────────────
interface Route {
  id: string;
  from: string;
  to: string;
  via?: string[];
  status: 'green' | 'amber' | 'red';
  label: string;
}

const ROUTES: Route[] = [
  { id: 'r1', from: 'delhi',    to: 'mumbai',    via: ['jaipur','ahmedabad'], status: 'green', label: 'Delhi–Mumbai NH48' },
  { id: 'r2', from: 'mumbai',   to: 'chennai',   via: ['pune','bangalore'],   status: 'amber', label: 'Mumbai–Chennai Corridor' },
  { id: 'r3', from: 'delhi',    to: 'kolkata',   via: ['lucknow','patna'],    status: 'green', label: 'Delhi–Kolkata NH19' },
  { id: 'r4', from: 'chennai',  to: 'hyderabad', status: 'red',   label: 'Chennai–Hyderabad NH65' },
  { id: 'r5', from: 'mumbai',   to: 'nagpur',    status: 'green', label: 'Mumbai–Nagpur Expressway' },
  { id: 'r6', from: 'hyderabad',to: 'bangalore', status: 'amber', label: 'Hyderabad–Bengaluru NH44' },
  { id: 'r7', from: 'nagpur',   to: 'kolkata',   status: 'green', label: 'Nagpur–Kolkata NH53' },
];

// ─── Truck definitions ────────────────────────────────────────
interface TruckData {
  id: string;
  truckId: string;
  routeId: string;
  status: 'On Track' | 'At Risk' | 'Critical';
  progress: number; // 0–1
  speed: number;    // px per frame multiplier
}

const TRUCKS_INIT: TruckData[] = [
  { id: 't1', truckId: 'MH12AB1234', routeId: 'r1', status: 'On Track',  progress: 0.12, speed: 1.0 },
  { id: 't2', truckId: 'DL9CX4521',  routeId: 'r2', status: 'At Risk',   progress: 0.45, speed: 0.7 },
  { id: 't3', truckId: 'TN38KZ8810', routeId: 'r4', status: 'Critical',  progress: 0.6,  speed: 0.4 },
  { id: 't4', truckId: 'WB17JK2233', routeId: 'r3', status: 'On Track',  progress: 0.3,  speed: 1.2 },
  { id: 't5', truckId: 'MH14LR5566', routeId: 'r5', status: 'On Track',  progress: 0.7,  speed: 0.9 },
  { id: 't6', truckId: 'AP09MM3377', routeId: 'r6', status: 'At Risk',   progress: 0.55, speed: 0.65 },
];

// ─── Stat counter hook ────────────────────────────────────────
function useCountUp(target: number, duration = 1400, delay = 1500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return val;
}

// ─── Build SVG path string between two cities ─────────────────
function buildPath(route: Route): string {
  const pts = [route.from, ...(route.via || []), route.to].map(k => CITIES[k]);
  if (pts.length === 2) {
    const [a, b] = pts;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - 40;
    return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
  }
  // Multi-point — smooth polyline
  const d = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    const cpy = (prev.y + curr.y) / 2;
    d.push(`Q ${cpx} ${cpy - 20} ${curr.x} ${curr.y}`);
  }
  return d.join(' ');
}

// ─── Get point at fraction along an SVG path ─────────────────
function getPointAtFraction(pathEl: SVGPathElement | null, t: number): { x: number; y: number } {
  if (!pathEl) return { x: 0, y: 0 };
  const len = pathEl.getTotalLength();
  const pt = pathEl.getPointAtLength(len * t);
  return { x: pt.x, y: pt.y };
}

// ─── Status colour map ────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  'On Track': '#00E5A0',
  'At Risk':  '#F59E0B',
  'Critical': '#EF4444',
};

// ─── Main Component ───────────────────────────────────────────
interface HeroSectionProps {
  onEnter: () => void;
  onAuth: (mode: 'signin' | 'signup') => void;
}

export default function HeroSection({ onEnter, onAuth }: HeroSectionProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const rafRef   = useRef<number>(0);

  const [trucks, setTrucks] = useState<TruckData[]>(TRUCKS_INIT);
  const [truckPos, setTruckPos] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredTruck, setHoveredTruck] = useState<string | null>(null);
  const [clickedTruck, setClickedTruck] = useState<string | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mapHovered, setMapHovered] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Stats count-up
  const activeShipments = useCountUp(247, 1200, 1500);
  const atRisk          = useCountUp(18,  900,  1600);
  const avgDelay        = useCountUp(34,  1000, 1700);
  const routeCoverage   = useCountUp(94,  1300, 1800);

  // ── Truck animation loop ──────────────────────────────────
  const animate = useCallback(() => {
    setTrucks(prev =>
      prev.map(t => ({
        ...t,
        progress: (t.progress + 0.0008 * t.speed) % 1,
      }))
    );
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  // ── Update truck SVG positions each frame ─────────────────
  useEffect(() => {
    const newPos: Record<string, { x: number; y: number }> = {};
    trucks.forEach(t => {
      const route = ROUTES.find(r => r.id === t.routeId);
      if (!route) return;
      const pathEl = pathRefs.current[route.id];
      newPos[t.id] = getPointAtFraction(pathEl, t.progress);
    });
    setTruckPos(newPos);
  }, [trucks]);

  // ── Parallax on mouse move ────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const r = heroRef.current.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width  - 0.5; // -0.5 → 0.5
      const ny = (e.clientY - r.top)  / r.height - 0.5;
      setMousePos({ x: nx, y: ny });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // ── Close popup on outside click ──────────────────────────
  useEffect(() => {
    const handler = () => setClickedTruck(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const clickedTruckData = TRUCKS_INIT.find(t => t.id === clickedTruck);
  const clickedRoute = clickedTruckData
    ? ROUTES.find(r => r.id === clickedTruckData.routeId)
    : null;

  const textParallax = {
    transform: `translate(${mousePos.x * 8}px, ${mousePos.y * 6}px)`,
    transition: 'transform 0.12s linear',
  };
  const mapParallax = {
    transform: `translate(${-mousePos.x * 12}px, ${-mousePos.y * 8}px) scale(1.04)`,
    transition: 'transform 0.12s linear',
  };

  return (
    <div className="hero-root" ref={heroRef}>
      {/* Ambient glows */}
      <div className="hero-glow-left" />
      <div className="hero-glow-right" />

      {/* ── Top navbar / Logo ── */}
      <nav className="hero-navbar">
        <div className="hero-logo">

          {/* Wordmark */}
          <div className="hero-logo-text">
            <div className="hero-logo-name">
              <span className="hero-logo-main">AETHERLOG</span>
            </div>
            <span className="hero-logo-tag">INDIA FLEET MONITORING</span>
          </div>
        </div>
        {/* Right side — Auth CTAs */}
        <div className="hero-navbar-right" style={{ gap: '1rem' }}>
          <button className="hero-navbar-ghost" onClick={() => onAuth('signin')}>
            Sign In
          </button>
          <button className="hero-navbar-cta" onClick={() => onAuth('signup')}>
            Create Account
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </nav>

      <div className="hero-layout">
        {/* ════════════ LEFT PANEL ════════════ */}
        <div className="hero-left hero-parallax-text" style={textParallax}>
          {/* Problem statement */}
          <p className="hero-problem">
            Delays, blind spots, and unpredictable routes cost<br />
            logistics teams thousands of rupees — daily.
          </p>

          {/* Eyebrow */}
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI-Powered Fleet Intelligence · India
          </div>

          {/* Headline */}
          <h1 className="hero-headline">
            See Every Truck.
            <span className="hero-headline-green">Predict Every Delay.</span>
          </h1>

          {/* Subtext */}
          <p className="hero-subtext">
            Track your fleet in real-time, detect disruptions early,
            and automatically reroute across India's complex logistics
            network — from Delhi highways to coastal corridors.
          </p>

          {/* CTAs */}
          <div className="hero-cta-group">
            <button className="hero-btn-primary" onClick={() => onAuth('signin')}>
              Enter Logistics Command
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="hero-btn-secondary" onClick={onEnter}>
              View Live Dashboard
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <p className="hero-cta-note">No signup required · Explore live system</p>


        </div>

        {/* ════════════ RIGHT PANEL (MAP) ════════════ */}
        <div
          className="hero-right"
          onMouseEnter={() => setMapHovered(true)}
          onMouseLeave={() => setMapHovered(false)}
        >
          <div className="hero-map-grid" />
          <div className="hero-scanline" />

          {/* ── SVG Map ── */}
          <div style={{ width: '100%', height: '100%', ...mapParallax }}>
            <svg
              ref={svgRef}
              className="hero-map-svg"
              viewBox="0 0 600 620"
              preserveAspectRatio="xMidYMid slice"
              style={{ position: 'absolute', inset: 0 }}
            >
              <defs>
                {/* Route glow filters */}
                <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow-truck">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                {/* Truck gradient */}
                <radialGradient id="truck-grad-green" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00E5A0" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#00b37a" stopOpacity="0.6"/>
                </radialGradient>
                <radialGradient id="truck-grad-amber" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.6"/>
                </radialGradient>
                <radialGradient id="truck-grad-red" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.6"/>
                </radialGradient>
              </defs>

              {/* India map silhouette (simplified polygon) */}
              <polygon
                points="
                  195,80  225,68  258,72  290,62  325,70
                  360,75  395,82  420,95  445,115 460,140
                  480,165 492,190 500,215 505,245 500,275
                  490,305 480,330 465,355 450,375 430,398
                  410,418 385,440 360,462 340,478 320,495
                  305,510 295,525 285,515 270,498 250,478
                  230,455 212,430 198,405 188,378 182,350
                  178,322 175,295 172,268 170,240 168,215
                  170,190 175,165 182,140 188,118
                "
                fill="rgba(0,229,160,0.03)"
                stroke="rgba(0,229,160,0.12)"
                strokeWidth="1.5"
              />

              {/* ── Route base lines (dim) ── */}
              {ROUTES.map(r => {
                const pathD = buildPath(r);
                const colorMap = { green: '#00E5A0', amber: '#F59E0B', red: '#EF4444' };
                const color = colorMap[r.status];
                return (
                  <g key={r.id}>
                    {/* Ghost track */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      strokeOpacity="0.12"
                    />
                    {/* Glowing route */}
                    <path
                      ref={el => { pathRefs.current[r.id] = el; }}
                      d={pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth={r.status === 'red' ? 2 : 1.5}
                      strokeOpacity={r.status === 'red' ? 0.7 : 0.5}
                      strokeDasharray="8 5"
                      strokeLinecap="round"
                      filter={`url(#glow-${r.status})`}
                      className="hero-route-pulse"
                      style={{
                        animationDuration: r.status === 'red' ? '1.2s' : r.status === 'amber' ? '1.8s' : '2.4s'
                      }}
                    />
                  </g>
                );
              })}

              {/* ── City nodes ── */}
              {Object.entries(CITIES).map(([key, city]) => (
                <g key={key}>
                  {/* Ping ring */}
                  <circle
                    cx={city.x} cy={city.y}
                    r="6"
                    fill="none"
                    stroke="rgba(0,229,160,0.4)"
                    strokeWidth="1"
                    className="hero-city-ring"
                    style={{
                      animationDuration: `${2 + Math.random() * 1.5}s`,
                      animationDelay: `${Math.random() * 2}s`
                    }}
                  />
                  {/* Core dot */}
                  <circle cx={city.x} cy={city.y} r="3.5" fill="#00E5A0" opacity="0.85" />
                  <circle cx={city.x} cy={city.y} r="1.5" fill="#fff" opacity="0.9" />
                  {/* Label */}
                  <text
                    x={city.x + 7} y={city.y + 4}
                    fill="rgba(255,255,255,0.55)"
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="500"
                    pointerEvents="none"
                  >
                    {city.label}
                  </text>
                </g>
              ))}

              {/* ── Trucks ── */}
              {trucks.map(t => {
                const pos = truckPos[t.id] || { x: 0, y: 0 };
                const colorKey = t.status === 'On Track' ? 'green' : t.status === 'At Risk' ? 'amber' : 'red';
                const color = STATUS_COLOR[t.status];
                const isHovered = hoveredTruck === t.id;
                const isClicked = clickedTruck === t.id;
                if (!pos.x && !pos.y) return null;
                return (
                  <g
                    key={t.id}
                    className="hero-truck"
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={e => { e.stopPropagation(); setClickedTruck(isClicked ? null : t.id); }}
                    onMouseEnter={() => setHoveredTruck(t.id)}
                    onMouseLeave={() => setHoveredTruck(null)}
                    filter="url(#glow-truck)"
                  >
                    {/* Outer pulse ring */}
                    <circle
                      r={isHovered ? 14 : 10}
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      strokeOpacity={isHovered ? 0.5 : 0.25}
                      style={{ transition: 'r 0.2s, stroke-opacity 0.2s' }}
                    />
                    {/* Body */}
                    <circle
                      className="hero-truck-body"
                      r={isHovered ? 7 : 5.5}
                      fill={`url(#truck-grad-${colorKey})`}
                      stroke={color}
                      strokeWidth="1.2"
                      style={{ transition: 'r 0.2s' }}
                    />
                    {/* Inner dot */}
                    <circle r="2" fill="#fff" opacity="0.9" />
                    {/* Truck ID on hover */}
                    {isHovered && (
                      <text
                        y={-14}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize="7"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="600"
                        pointerEvents="none"
                        opacity="0.9"
                      >
                        {t.truckId}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ── Truck click popup (rendered inside SVG as foreignObject) ── */}
              {clickedTruck && clickedTruckData && clickedRoute && (() => {
                const pos = truckPos[clickedTruck] || { x: 300, y: 300 };
                const color = STATUS_COLOR[clickedTruckData.status];
                const fromCity = CITIES[clickedRoute.from];
                const toCity   = CITIES[clickedRoute.to];
                const popW = 170, popH = 90;
                const px = Math.min(pos.x - popW / 2, 420);
                const py = pos.y - popH - 16;
                return (
                  <g key="truck-popup">
                    <rect
                      x={px} y={py} width={popW} height={popH}
                      rx="8"
                      fill="rgba(10,15,30,0.92)"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="1"
                    />
                    <text x={px+10} y={py+18} fill="rgba(255,255,255,0.5)" fontSize="7.5" fontFamily="JetBrains Mono, monospace">TRUCK ID</text>
                    <text x={px+10} y={py+30} fill="#fff" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">{clickedTruckData.truckId}</text>

                    <text x={px+10} y={py+46} fill="rgba(255,255,255,0.5)" fontSize="7.5" fontFamily="JetBrains Mono, monospace">ROUTE</text>
                    <text x={px+10} y={py+57} fill="rgba(255,255,255,0.8)" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                      {fromCity?.label ?? clickedRoute.from} → {toCity?.label ?? clickedRoute.to}
                    </text>

                    <text x={px+10} y={py+72} fill="rgba(255,255,255,0.5)" fontSize="7.5" fontFamily="JetBrains Mono, monospace">STATUS</text>
                    <text x={px+10} y={py+83} fill={color} fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                      ● {clickedTruckData.status}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* ── Floating Alert Card ── */}
          <div className="hero-card hero-card-alert hero-card-float">
            <div className="hero-card-header">
              <span className="hero-card-icon">⚠️</span>
              <span className="hero-card-title">Disruption Alert</span>
            </div>
            <div className="hero-card-value">Heavy Rain — Vijayawada</div>
            <div className="hero-card-sub">NH65 · Andhra Pradesh</div>
            <div className="hero-badge-risk high">
              <span className="hero-badge-risk-dot"/>DELAY RISK: HIGH
            </div>
            <div className="hero-reroute-text">→ Auto rerouting triggered</div>
          </div>

          {/* ── Floating Truck Status Card ── */}
          <div className="hero-card hero-card-truck hero-card-float-slow">
            <div className="hero-card-header">
              <span className="hero-card-icon">🚛</span>
              <span className="hero-card-title">Live Truck</span>
            </div>
            <div className="hero-card-value">MH12AB1234</div>
            <div className="hero-card-sub">Mumbai → Delhi · NH48</div>
            <div className="hero-badge-risk ok">
              <span className="hero-badge-risk-dot"/>ON TRACK
            </div>
          </div>

          {/* ── Map Legend (appears on hover) ── */}
          <div className={`hero-map-legend ${mapHovered ? 'hero-map-legend--visible' : ''}`}>
            <div className="hero-legend-title">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" stroke="#00E5A0" strokeWidth="1"/>
                <circle cx="5" cy="5" r="1.5" fill="#00E5A0"/>
              </svg>
              MAP LEGEND
            </div>

            <div className="hero-legend-section">ROUTE STATUS</div>
            <div className="hero-legend-row">
              <span className="hero-legend-line" style={{ background: '#00E5A0', boxShadow: '0 0 6px rgba(0,229,160,0.7)' }} />
              <span className="hero-legend-label">On Track</span>
              <span className="hero-legend-desc">Normal flow</span>
            </div>
            <div className="hero-legend-row">
              <span className="hero-legend-line" style={{ background: '#F59E0B', boxShadow: '0 0 6px rgba(245,158,11,0.7)' }} />
              <span className="hero-legend-label">At Risk</span>
              <span className="hero-legend-desc">Delay likely</span>
            </div>
            <div className="hero-legend-row">
              <span className="hero-legend-line" style={{ background: '#EF4444', boxShadow: '0 0 6px rgba(239,68,68,0.7)' }} />
              <span className="hero-legend-label">Critical</span>
              <span className="hero-legend-desc">Active disruption</span>
            </div>

            <div className="hero-legend-divider" />

            <div className="hero-legend-section">MARKERS</div>
            <div className="hero-legend-row">
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" fill="none" stroke="rgba(0,229,160,0.4)" strokeWidth="1"/>
                <circle cx="7" cy="7" r="3" fill="#00E5A0" opacity="0.85"/>
                <circle cx="7" cy="7" r="1.2" fill="#fff"/>
              </svg>
              <span className="hero-legend-label">City Hub</span>
              <span className="hero-legend-desc">Logistics node</span>
            </div>
            <div className="hero-legend-row">
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                <defs>
                  <radialGradient id="lg-green" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#00E5A0" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#00b37a" stopOpacity="0.6"/>
                  </radialGradient>
                </defs>
                <circle cx="7" cy="7" r="6" fill="none" stroke="#00E5A0" strokeWidth="1" strokeOpacity="0.3"/>
                <circle cx="7" cy="7" r="4" fill="url(#lg-green)" stroke="#00E5A0" strokeWidth="1"/>
                <circle cx="7" cy="7" r="1.5" fill="#fff" opacity="0.9"/>
              </svg>
              <span className="hero-legend-label">Live Truck</span>
              <span className="hero-legend-desc">Click for details</span>
            </div>

            <div className="hero-legend-divider" />

            <div className="hero-legend-section">INTERACTIONS</div>
            <div className="hero-legend-hint">🖱 Hover truck → highlight</div>
            <div className="hero-legend-hint">🖱 Click truck → status popup</div>
          </div>

        </div>
      </div>

      {/* ── Stats Bar — full-width, pinned to bottom ── */}
      <div className="hero-stats-bar">
        <div className="hero-stat-item">
          <span className="hero-stat-value green">{activeShipments}</span>
          <div className="hero-stat-label-block">
            <span className="hero-stat-label">ACTIVE</span>
            <span className="hero-stat-label">SHIPMENTS</span>
            <span className="hero-stat-sub">Across 18 states</span>
          </div>
        </div>
        <div className="hero-stat-item">
          <span className="hero-stat-value amber">{atRisk}</span>
          <div className="hero-stat-label-block">
            <span className="hero-stat-label">AT RISK</span>
            <span className="hero-stat-sub">Weather + congestion</span>
          </div>
        </div>
        <div className="hero-stat-item">
          <span className="hero-stat-value red">{avgDelay} min</span>
          <div className="hero-stat-label-block">
            <span className="hero-stat-label">AVG DELAY</span>
            <span className="hero-stat-sub">Last 24 hours</span>
          </div>
        </div>
        <div className="hero-stat-item">
          <span className="hero-stat-value green">{routeCoverage}%</span>
          <div className="hero-stat-label-block">
            <span className="hero-stat-label">ROUTE</span>
            <span className="hero-stat-label">COVERAGE</span>
            <span className="hero-stat-sub">National highways</span>
          </div>
        </div>
      </div>
    </div>
  );
}
