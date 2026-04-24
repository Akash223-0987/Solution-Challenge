import { useEffect, useState } from 'react';
import bgTexture from '../assets/bg-texture2.jpg';

/* ── City nodes ────────────────────────────────────────────────── */
const CITIES = [
  { id: 'del', x: 490, y:  88, label: 'Delhi',      ax: 'middle', ay: -10 },
  { id: 'jai', x: 382, y: 152, label: 'Jaipur',     ax: 'end',    ay:   4 },
  { id: 'lkw', x: 618, y: 128, label: 'Lucknow',    ax: 'start',  ay:   4 },
  { id: 'ahm', x: 318, y: 272, label: 'Ahmedabad',  ax: 'end',    ay:   4 },
  { id: 'sur', x: 298, y: 338, label: 'Surat',      ax: 'end',    ay:   4 },
  { id: 'mum', x: 268, y: 408, label: 'Mumbai',     ax: 'end',    ay:   4 },
  { id: 'pun', x: 292, y: 460, label: 'Pune',       ax: 'end',    ay:   4 },
  { id: 'nag', x: 478, y: 352, label: 'Nagpur',     ax: 'middle', ay: -10 },
  { id: 'kol', x: 748, y: 212, label: 'Kolkata',    ax: 'start',  ay:   4 },
  { id: 'hyd', x: 462, y: 515, label: 'Hyderabad',  ax: 'middle', ay: -10 },
  { id: 'vij', x: 555, y: 550, label: 'Vijayawada', ax: 'start',  ay:   4 },
  { id: 'che', x: 580, y: 635, label: 'Chennai',    ax: 'start',  ay:   4 },
  { id: 'ben', x: 432, y: 648, label: 'Bengaluru',  ax: 'end',    ay:   4 },
];

/* ── Routes ────────────────────────────────────────────────────── */
const ROUTES = [
  { id:'r1', color:'#00E5A0', status:'on-track',  dur:'15s', begin:'0s',
    d:'M 268,408 Q 282,372 298,338 Q 308,305 318,272 Q 348,210 382,152 Q 434,118 490,88' },
  { id:'r2', color:'#00E5A0', status:'on-track',  dur:'18s', begin:'3s',
    d:'M 490,88 Q 554,108 618,128 Q 684,168 748,212' },
  { id:'r3', color:'#F59E0B', status:'at-risk',   dur:'20s', begin:'6s',
    d:'M 318,272 Q 398,312 478,352 Q 470,432 462,515' },
  { id:'r4', color:'#00E5A0', status:'on-track',  dur:'22s', begin:'9s',
    d:'M 292,460 Q 376,488 462,515 Q 506,532 555,550 Q 568,592 580,635' },
  { id:'r5', color:'#00E5A0', status:'on-track',  dur:'10s', begin:'2s',
    d:'M 580,635 Q 510,645 432,648' },
  { id:'r6', color:'#EF4444', status:'critical',  dur:'14s', begin:'4s',
    d:'M 490,88 Q 485,220 478,352' },
];

/* ── Stats ─────────────────────────────────────────────────────── */
const STATS = [
  { val: 2847, suffix: '',    color: '#fff',     label: 'ACTIVE SHIPMENTS', sub: 'Across India right now' },
  { val: 143,  suffix: '',    color: '#F59E0B',  label: 'AT RISK',          sub: 'Delay probability >60%' },
  { val: 38,   suffix: ' min',color: '#fff',     label: 'AVG DELAY',        sub: 'vs 2.4h industry avg' },
  { val: 94,   suffix: '.2%', color: '#00E5A0',  label: 'ROUTE COVERAGE',   sub: 'NH + state highways' },
];

/* ── CountUp ───────────────────────────────────────────────────── */
function CountUp({ target, suffix = '', color = '#fff' }: { target: number; suffix?: string; color?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let n = 0; const step = target / 80;
    const id = setInterval(() => {
      n += step;
      if (n >= target) { setV(target); clearInterval(id); } else setV(Math.floor(n));
    }, 12);
    return () => clearInterval(id);
  }, [target]);
  return <span style={{ color }}>{v.toLocaleString()}{suffix}</span>;
}

/* ── Schematic SVG Map ─────────────────────────────────────────── */
function SchematicMap() {
  const glowId = (s: string) => s === 'on-track' ? 'gg' : s === 'at-risk' ? 'ga' : 'gr';
  return (
    <svg viewBox="0 0 900 700" style={{ width:'100%', height:'100%', overflow:'visible' }}>
      <defs>
        {(['gg','ga','gr'] as const).map(id => (
          <filter key={id} id={id} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        ))}
        {/* Path defs for animateMotion */}
        {ROUTES.map(r => <path key={'def-'+r.id} id={r.id} d={r.d} fill="none"/>)}
      </defs>

      {/* Glow underlays */}
      {ROUTES.map(r => (
        <path key={'g'+r.id} d={r.d} fill="none" stroke={r.color}
          strokeWidth={10} opacity={0.18} filter={`url(#${glowId(r.status)})`}/>
      ))}

      {/* Route lines */}
      {ROUTES.map(r => (
        <path key={'l'+r.id} d={r.d} fill="none" stroke={r.color}
          strokeWidth={1.8} opacity={0.8}
          strokeDasharray={r.status === 'critical' ? '6 4' : undefined}/>
      ))}

      {/* City dots */}
      {CITIES.map(c => (
        <g key={c.id}>
          <circle cx={c.x} cy={c.y} r={5} fill="#0D0F18" stroke="#2d3748" strokeWidth={1.5}/>
          <circle cx={c.x} cy={c.y} r={2.5} fill="#4a5568"/>
          <text x={c.x + (c.ax === 'end' ? -10 : c.ax === 'start' ? 10 : 0)}
            y={c.y + c.ay} textAnchor={c.ax as string}
            fill="#4a5568" fontSize={10} fontFamily="'Plus Jakarta Sans',system-ui">
            {c.label}
          </text>
        </g>
      ))}

      {/* Animated trucks */}
      {ROUTES.map(r => (
        <g key={'t'+r.id} filter={`url(#${glowId(r.status)})`}>
          <circle r={5} fill={r.color} opacity={0.9}>
            <animateMotion dur={r.dur} repeatCount="indefinite" begin={r.begin}>
              <mpath href={`#${r.id}`}/>
            </animateMotion>
          </circle>
          <circle r={9} fill={r.color} opacity={0.15}>
            <animateMotion dur={r.dur} repeatCount="indefinite" begin={r.begin}>
              <mpath href={`#${r.id}`}/>
            </animateMotion>
          </circle>
        </g>
      ))}
    </svg>
  );
}

/* ── Glass Card ────────────────────────────────────────────────── */
function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(13,15,24,0.85)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
      padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Main Hero ─────────────────────────────────────────────────── */
export default function HeroSection({ onEnterDashboard, onOpenAuth }: { onEnterDashboard: () => void, onOpenAuth: () => void }) {
  const [entered, setEntered] = useState(false);
  const [mapHovered, setMapHovered] = useState(false);

  useEffect(() => { const t = setTimeout(() => setEntered(true), 80); return () => clearTimeout(t); }, []);

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: entered ? 1 : 0,
    transform: entered ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0D0F18', display: 'flex', flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", overflow: 'hidden', position: 'relative',
      color: '#fff' }}>

      {/* Uploaded Texture bg with custom colorization */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0,
          backgroundImage: `url(${bgTexture})`,
          backgroundSize: '150px 150px', /* Scale the repeating texture */
          backgroundRepeat: 'repeat',
          opacity: 0.15,
          mixBlendMode: 'luminosity', /* Keep the pattern, drop its original color */
          filter: 'contrast(1.5) brightness(1.2)'
        }}/>
        {/* Subtle radial glow to tint the texture */}
        <div style={{ position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 30% 50%, rgba(0, 229, 160, 0.05), transparent 60%), radial-gradient(circle at 70% 30%, rgba(0, 229, 160, 0.03), transparent 50%)',
          mixBlendMode: 'screen'
        }}/>
      </div>

      {/* Subtle grid bg */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px' }}/>

      {/* ── Navbar ── */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 40px', zIndex:30, borderBottom:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(13,15,24,0.8)', backdropFilter:'blur(12px)', position:'relative' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ background:'#00E5A0', padding:6, borderRadius:8, display:'flex', boxShadow: '0 0 16px rgba(0, 229, 160, 0.4)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D0F18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <circle cx="17.5" cy="17.5" r="1.5" fill="#0D0F18" />
            </svg>
          </div>
          <span style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5, textShadow: '0 0 12px rgba(255,255,255,0.2)' }}>
            Aether<span style={{ color:'#00E5A0', textShadow: '0 0 16px rgba(0, 229, 160, 0.6)' }}>Log</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          {['Platform','Enterprise','Docs','Pricing'].map(l => (
            <span key={l} style={{ color:'#64748b', fontSize:13.5, fontWeight:500, cursor:'pointer', transition:'color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.color='#cbd5e1')}
              onMouseLeave={e => (e.currentTarget.style.color='#64748b')}>{l}</span>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#00E5A0', animation:'pulseD 2s infinite' }}/>
            <span style={{ color:'#64748b', fontSize:11, fontWeight:600, letterSpacing:0.5, textTransform:'uppercase' }}>Live System</span>
          </div>
          <span 
            onClick={onOpenAuth}
            style={{ color:'#94a3b8', fontSize:13.5, fontWeight:500, cursor:'pointer', transition:'color .2s' }}
            onMouseEnter={e=>(e.currentTarget.style.color='#fff')}
            onMouseLeave={e=>(e.currentTarget.style.color='#94a3b8')}>Sign In</span>
          <button onClick={onOpenAuth}
            style={{ background:'#00E5A0', color:'#0D0F18', border:'none', borderRadius:7,
              padding:'8px 18px', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s',
              boxShadow:'0 0 12px rgba(0,229,160,0.3)' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#00ffb0';e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 0 20px rgba(0,229,160,0.5)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#00E5A0';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 0 12px rgba(0,229,160,0.3)';}}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero Body ── */}
      <div style={{ flex:1, display:'flex', alignItems:'stretch', overflow:'hidden', minHeight:0 }}>

        {/* LEFT: Text (40%) */}
        <div style={{ width:'40%', flexShrink:0, display:'flex', flexDirection:'column',
          justifyContent:'center', padding:'0 0 0 40px', zIndex:10 }}>

          {/* Badge */}
          <div style={{ ...fadeUp(0.1), display:'inline-flex', alignItems:'center', gap:7,
            background:'rgba(0,229,160,0.08)', border:'1px solid rgba(0,229,160,0.2)',
            borderRadius:999, padding:'4px 13px', marginBottom:18, alignSelf:'flex-start' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#00E5A0', animation:'pulseD 2s infinite' }}/>
            <span style={{ color:'#00E5A0', fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>
              AI Fleet Intelligence · India
            </span>
          </div>

          {/* Problem statement */}
          <p style={{ ...fadeUp(0.2), color:'#8ba99b', fontSize:13.5, lineHeight:1.6,
            borderLeft:'2px solid rgba(16, 185, 129, 0.4)', paddingLeft:12, marginBottom:20, maxWidth:380,
            textShadow: '0 0 14px rgba(16, 185, 129, 0.35)' }}>
            Delays, blind spots, and unpredictable routes cost logistics teams daily.
          </p>

          {/* Headline */}
          <div style={fadeUp(0.3)}>
            <div style={{ fontSize:'clamp(32px,3.2vw,52px)', fontWeight:800,
              lineHeight:1.05, letterSpacing:'-1.5px', color:'#fff', marginBottom:4 }}>
              See Every Truck.
            </div>
            <div style={{ fontSize:'clamp(32px,3.2vw,52px)', fontWeight:800,
              lineHeight:1.05, letterSpacing:'-1.5px', marginBottom:22,
              background:'linear-gradient(90deg,#00E5A0,#00c47a)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Predict Every Delay.
            </div>
          </div>

          {/* Subtext */}
          <p style={{ ...fadeUp(0.4), color:'#475569', fontSize:14.5, lineHeight:1.7,
            marginBottom:32, maxWidth:380 }}>
            Track your fleet in real-time, detect disruptions early, and automatically reroute across India's complex logistics network.
          </p>

          {/* CTAs */}
          <div style={{ ...fadeUp(0.5), display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
            <button onClick={onEnterDashboard}
              style={{ background:'#00E5A0', color:'#0D0F18', border:'none',
                borderRadius:8, padding:'11px 22px', fontSize:13.5, fontWeight:700,
                cursor:'pointer', transition:'all .25s',
                boxShadow:'0 0 16px rgba(0,229,160,0.35)' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#00ffb0';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 0 25px rgba(0,229,160,0.5)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='#00E5A0';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 0 16px rgba(0,229,160,0.35)';}}>
              Start Tracking Your Fleet — Free
            </button>
            <button onClick={onEnterDashboard}
              style={{ background:'transparent', color:'#64748b', border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:8, padding:'11px 20px', fontSize:13.5, fontWeight:500,
                cursor:'pointer', transition:'all .25s',
                boxShadow:'0 0 12px rgba(255,255,255,0.05)' }}
              onMouseEnter={e=>{e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='rgba(255,255,255,0.2)';e.currentTarget.style.boxShadow='0 0 18px rgba(255,255,255,0.12)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='#64748b';e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';e.currentTarget.style.boxShadow='0 0 12px rgba(255,255,255,0.05)';}}>
              View Live Dashboard →
            </button>
          </div>
          <p style={{ ...fadeUp(0.6), color:'#2d3748', fontSize:12 }}>
            No signup required &nbsp;·&nbsp; Explore live system
          </p>
        </div>

        {/* RIGHT: Schematic map (60%) */}
        <div 
          onMouseEnter={() => setMapHovered(true)}
          onMouseLeave={() => setMapHovered(false)}
          style={{ flex:1, position:'relative', minHeight:0,
          opacity: entered ? 1 : 0, transform: entered ? 'scale(1)' : 'scale(1.04)',
          transition:'opacity 1s ease 0.3s, transform 1s ease 0.3s' }}>

          <SchematicMap />

          {/* Map Hover Legend */}
          {mapHovered && (
            <div style={{ position:'absolute', top:'6%', left:'8%',
              background:'rgba(13,15,24,0.85)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:8, padding:'12px 16px', minWidth:160, backdropFilter:'blur(16px)', zIndex:100,
              boxShadow:'0 8px 32px rgba(0,0,0,0.5)', animation: 'fadeInLegend 0.2s ease-out forwards' }}>
              <div style={{ fontSize:10, color:'#475569', fontWeight:700, marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>Route Legend</div>
              {[['#00E5A0','On Track'],['#F59E0B','Delay Risk'],['#EF4444','Critical']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:24, height:2, background:c, borderRadius:2 }}/>
                  <span style={{ color:'#94a3b8', fontSize:12, fontWeight:500 }}>{l}</span>
                </div>
              ))}
            </div>
          )}

          {/* Floating card — Weather Disruption */}
          <GlassCard style={{ position:'absolute', top:'6%', right:'4%', minWidth:220,
            opacity: entered ? 1 : 0, transform: entered ? 'translateY(0)' : 'translateY(12px)',
            transition:'opacity 0.6s ease 1s, transform 0.6s ease 1s',
            animation: entered ? 'floatY 4s ease-in-out infinite' : undefined }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#F59E0B', flexShrink:0 }}/>
              <span style={{ fontWeight:700, fontSize:12.5, color:'#fff' }}>Weather Disruption</span>
            </div>
            <table style={{ fontSize:11, borderCollapse:'collapse', width:'100%' }}>
              <tbody>
                {[['Location','Vijayawada','#F59E0B'],['Cause','Heavy Monsoon Rain','#94a3b8'],['Delay Risk','HIGH','#EF4444']].map(([k,v,c])=>(
                  <tr key={k}>
                    <td style={{ color:'#475569', paddingBottom:4, paddingRight:16, fontFamily:'monospace' }}>{k}</td>
                    <td style={{ color:c, fontWeight:700, paddingBottom:4, textAlign:'right' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop:6, color:'#00E5A0', fontSize:11, fontWeight:600 }}>→ Auto rerouting triggered</div>
          </GlassCard>

          {/* Floating card — Truck Status */}
          <GlassCard style={{ position:'absolute', bottom:'12%', right:'4%', minWidth:220,
            opacity: entered ? 1 : 0, transform: entered ? 'translateY(0)' : 'translateY(12px)',
            transition:'opacity 0.6s ease 1.2s, transform 0.6s ease 1.2s',
            animation: entered ? 'floatY 4s ease-in-out 2s infinite' : undefined }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#00E5A0', animation:'pulseD 2s infinite', flexShrink:0 }}/>
              <span style={{ fontWeight:700, fontSize:12.5, color:'#fff', fontFamily:'monospace' }}>MH12AB1234</span>
            </div>
            <table style={{ fontSize:11, borderCollapse:'collapse', width:'100%' }}>
              <tbody>
                {[['Route','Mumbai → Delhi','#fff'],['ETA','14h 22m','#94a3b8'],['Status','On Track','#00E5A0']].map(([k,v,c])=>(
                  <tr key={k}>
                    <td style={{ color:'#475569', paddingBottom:4, paddingRight:16, fontFamily:'monospace' }}>{k}</td>
                    <td style={{ color:c, fontWeight:700, paddingBottom:4, textAlign:'right' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          {/* Left edge fade */}
          <div style={{ position:'absolute', top:0, left:0, bottom:0, width:80, pointerEvents:'none',
            background:'linear-gradient(to right, #0D0F18, transparent)' }}/>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ display:'flex', borderTop:'1px solid rgba(255,255,255,0.06)',
        opacity: entered ? 1 : 0, transform: entered ? 'translateY(0)' : 'translateY(16px)',
        transition:'opacity 0.8s ease 1.4s, transform 0.8s ease 1.4s' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ flex:1, padding:'22px 40px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ fontSize:'clamp(24px,2.2vw,36px)', fontWeight:800, letterSpacing:'-1px', lineHeight:1, marginBottom:6 }}>
              {entered ? <CountUp target={s.val} suffix={s.suffix} color={s.color}/> : '—'}
            </div>
            <div style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>{s.label}</div>
            <div style={{ color:'#2d3748', fontSize:11 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes pulseD { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fadeInLegend { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
