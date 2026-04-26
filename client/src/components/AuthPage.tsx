import React, { useState } from 'react';
import './AuthPage.css';

interface AuthPageProps {
  initialMode: 'signin' | 'signup';
  onAuthComplete: () => void;
  onClose: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialMode, onAuthComplete, onClose }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [role, setRole] = useState<string>('');
  const [showRoles, setShowRoles] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth
    onAuthComplete();
  };

  return (
    <div className="auth-root">
      {/* Navbar with back/close */}
      <nav className="auth-navbar">
        <div className="auth-logo" onClick={onClose} style={{ cursor: 'pointer' }}>
          <span className="auth-logo-text">AETHERLOG</span>
        </div>
      </nav>

      {/* Auth Card */}
      <div className="auth-card">
        <h1 className="auth-title">
          {mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'signin' 
            ? 'Enter your details to access your fleet control center.' 
            : 'Join AetherLog to manage your logistics network.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className="auth-form-row">
                <div className="auth-input-group">
                  <input type="text" className="auth-input" placeholder="Full Name" required />
                </div>
                <div className="auth-input-group">
                  <input type="text" className="auth-input" placeholder="Company (optional)" />
                </div>
              </div>

              <div className="auth-input-group auth-custom-select-container">
                <div 
                  className={`auth-input auth-custom-select ${showRoles ? 'active' : ''}`}
                  onClick={() => setShowRoles(!showRoles)}
                >
                  <span className={role ? 'selected' : 'placeholder'}>
                    {role ? role : 'Select Role'}
                  </span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                {showRoles && (
                  <div className="auth-dropdown-list">
                    {['Fleet Manager', 'Dispatch Officer', 'System Admin'].map((r) => (
                      <div 
                        key={r} 
                        className="auth-dropdown-item"
                        onClick={() => { setRole(r); setShowRoles(false); }}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="auth-input-group">
            <input 
              type="text" 
              className="auth-input" 
              placeholder="Email Address" 
              required 
            />
          </div>

          <div className="auth-input-group">
            <input type="password" className="auth-input" placeholder="Password" required />
          </div>

          <button type="submit" className="auth-submit-btn">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button className="auth-google-btn">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {mode === 'signin' ? 'Login with Google' : 'Sign up with Google'}
        </button>

        <div className="auth-footer">
          {mode === 'signin' ? (
            <>
              Don't have an account? 
              <span className="auth-footer-link" onClick={() => setMode('signup')}>Sign up</span>
            </>
          ) : (
            <>
              Already have an account? 
              <span className="auth-footer-link" onClick={() => setMode('signin')}>Sign in</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
