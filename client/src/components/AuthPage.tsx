import { useState } from 'react';
import bgTexture from '../assets/bg-texture2.jpg';

export default function AuthPage({ onBack, onLoginSuccess }: { onBack: () => void, onLoginSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0D0F18', display: 'flex', flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", overflow: 'hidden', position: 'relative',
      color: '#fff', alignItems: 'center', justifyContent: 'center'
    }}>
      
      {/* Background Texture & Gradient */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0,
          backgroundImage: `url(${bgTexture})`,
          backgroundSize: '150px 150px', backgroundRepeat: 'repeat',
          opacity: 0.15, mixBlendMode: 'luminosity', filter: 'contrast(1.5) brightness(1.2)'
        }}/>
        <div style={{ position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 229, 160, 0.05), transparent 60%)',
          mixBlendMode: 'screen'
        }}/>
        {/* Subtle grid bg */}
        <div style={{ position:'absolute', inset:0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px' }}/>
      </div>

      {/* Header / Back button */}
      <div style={{ position: 'absolute', top: 30, left: 40, zIndex: 10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={onBack}>
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
      </div>

      {/* Auth Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        background: 'rgba(13,15,24,0.65)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '40px', width: '100%', maxWidth: 460,
        backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        animation: 'fadeInUp 0.4s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ 
            fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px',
            color: '#00E5A0', textShadow: '0 0 20px rgba(0, 229, 160, 0.6)'
          }}>
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            {isLogin ? 'Enter your details to access your fleet control center.' : 'Join AetherLog to manage your logistics network.'}
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onLoginSuccess(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isLogin && (
            <>
              <div style={{ display: 'flex', gap: 12 }}>
                <input required type="text" placeholder="Full Name" style={inputStyle} />
                <input type="text" placeholder="Company (optional)" style={inputStyle} />
              </div>
              <select required style={{ ...inputStyle, appearance: 'none', color: '#fff', cursor: 'pointer' }}>
                <option value="" disabled selected hidden>Select Role</option>
                <option value="shipper" style={{ color: '#000' }}>Shipper</option>
                <option value="driver" style={{ color: '#000' }}>Driver</option>
                <option value="warehouse" style={{ color: '#000' }}>Warehouse Manager</option>
                <option value="admin" style={{ color: '#000' }}>Admin</option>
              </select>
            </>
          )}

          <input required type="email" placeholder="Email Address" style={inputStyle} />
          <input required type="password" placeholder="Password" style={inputStyle} />

          <button type="submit" style={{
            background: '#00E5A0', color: '#0D0F18', border: 'none', borderRadius: 8,
            padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'all .25s', boxShadow: '0 0 16px rgba(0,229,160,0.35)', marginTop: 8
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#00ffb0'; e.currentTarget.style.boxShadow = '0 0 25px rgba(0,229,160,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#00E5A0'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,229,160,0.35)'; }}
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button style={outlineBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLogin ? 'Login with Google' : 'Sign up with Google'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#94a3b8' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => setIsLogin(!isLogin)}
            style={{ color: '#00E5A0', fontWeight: 600, cursor: 'pointer' }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff',
  fontSize: 14, outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit'
};

const outlineBtnStyle = {
  width: '100%', padding: '12px 16px', background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
};
