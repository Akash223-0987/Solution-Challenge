import { useState } from 'react';
import './HeroSection.css';
import { AetherLogLogo } from './AetherLogLogo';

interface HeroSectionProps {
  onAuth: (mode: 'signin' | 'signup') => void;
}

export default function HeroSection({ onAuth }: HeroSectionProps) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="hero-root">
      <div className="hero-scanline" />

      {/* ── Navbar ── */}
      <nav className="hero-navbar">
        <div className="hero-brand">
          <AetherLogLogo size={44} className="hero-logo-icon" glow />
          <div className="hero-brand-text">
            <div className="hero-logo-name">AETHER<span className="hero-logo-main">LOG</span></div>
            <div className="hero-logo-tag">INDIA FLEET MONITORING</div>
          </div>
        </div>
        <div className="hero-navbar-right">
          <button className="hero-navbar-ghost" onClick={() => onAuth('signin')}>Sign In</button>
          <button className="hero-navbar-cta" onClick={() => onAuth('signup')}>
            Create Account
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </nav>

        {/* MAIN HERO CONTENT (Only show if not in About Dashboard) */}
        {!showAbout ? (
          <div className="hero-layout">
            <div className="hero-left">
              <h1 className="hero-headline">
                See Every Truck.<br />
                <span className="hero-headline-green">Predict Every Delay.</span>
              </h1>

              <p className="hero-subtext">
                Operationalizing the PM Gati Shakti vision, AetherLog detects disruptions early and seamlessly shifts freight across India's integrated road and rail networks to slash logistics costs and accelerate delivery.
              </p>

              <div className="hero-cta-group">
                <button className="hero-btn-primary" onClick={() => onAuth('signup')}>
                  Get Started
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button className="hero-btn-secondary" onClick={() => setShowAbout(true)}>
                  About
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>

            <div className="hero-right">
              <img src="/hero_truck.png" alt="AetherLog delivery person with truck" className="hero-main-img" />
              <div className="hero-img-fade-left" />

              <div className="hero-speech-bubble">
                <p className="bubble-hi">GATI SHAKTI INTEGRATED</p>
                <p className="bubble-tagline">
                  Unifying <span className="bubble-green">India.</span><br />
                  Decarbonizing <span className="bubble-green">Transit.</span>
                </p>
                <ul className="bubble-list">
                  <li><span className="bubble-check">✓</span> Real-time Fleet Visibility</li>
                  <li><span className="bubble-check">✓</span> AI-Powered Risk Prediction</li>
                  <li><span className="bubble-check">✓</span> Autonomous Multimodal Shifts</li>
                  <li><span className="bubble-check">✓</span> Integrated Rail & Road Networks</li>
                  <li><span className="bubble-check">✓</span> Automated ESG & CO₂ Tracking</li>
                  <li><span className="bubble-check">✓</span> Drastic Cost Reductions</li>
                </ul>
                <p className="bubble-footer">AetherLog – The OS for India's<br />Next-Gen Supply Chain.</p>
              </div>
            </div>
          </div>
        ) : (
          /* ── ABOUT VENTURE DASHBOARD ── */
          <div className="hero-about-dashboard">
            <div className="about-map-bg">
              <img src="/india_map_bg.png" alt="India Map Outline" className="about-map-img" />
            </div>

            <div className="about-content">
              <div className="about-header">
                <div className="hero-badge">PM GATI SHAKTI ALIGNED</div>
                <h2 className="about-hero-title">Revolutionizing India's <br /><span className="hero-headline-green">Supply Chain Intelligence</span></h2>
              </div>

              <div className="about-grid">
                <div className="about-card">
                  <h3>The Vision</h3>
                  <p>
                    AetherLog is a next-generation <strong>Logistics OS</strong> designed to eliminate 
                    blind spots in freight movement. Aligning with the PM Gati Shakti Master Plan, 
                    we provide the unified infrastructure visibility necessary for India's rapidly growing economy.
                  </p>
                </div>
                <div className="about-card">
                  <h3>Our Technology</h3>
                  <p>
                    We combine high-precision tracking with Dual-Model AI predictive analytics. 
                    Our system detects disruptions in real-time and autonomously calculates 
                    multimodal reroutes—seamlessly shifting freight from congested highways to high-speed rail corridors.
                  </p>
                </div>
                <div className="about-card">
                  <h3>Economic & ESG Impact</h3>
                  <p>
                    By optimizing national routes and executing intelligent modal shifts, we help 
                    the logistics sector reduce transit costs by up to 20% while massively lowering 
                    carbon footprints (CO₂) through smarter, sustainable asset utilization.
                  </p>
                </div>
              </div>

              <button className="about-close-btn" onClick={() => setShowAbout(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to Command Center
              </button>
            </div>
          </div>
        )}
      </div>
    );
}
