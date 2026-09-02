import { useState, useEffect, useRef } from 'react';
import { getAndroidDownloadUrl } from '../config/appConfig';

const MOMENTS = [
  { label: 'At the gate', detail: 'Site recognised · Your first story is ready', image: '/assets/app-preview-1.jpg' },
  { label: 'At a node', detail: 'Scan the marker · Hear what happened here', image: '/assets/app-preview-2.jpg' },
  { label: 'Keep walking', detail: 'Nearby moments appear as the site unfolds', image: '/assets/app-preview-3.jpg' },
];

const WELCOME_STORY_LEFT = [
  {
    title: 'Bridge to Living History',
    desc: 'Transforms ancient stone ruins into vivid stories of the people, culture, and dynasties who lived there.',
  },
  {
    title: 'Step-by-Step Exploration',
    desc: 'Guides your walk through gates, courtyards, and corridors so you never feel lost or miss a hidden story.',
  },
];

const WELCOME_STORY_RIGHT = [
  {
    title: 'Conversational Companion',
    desc: 'Ask any question in real time and hear engaging historical answers just like walking with a local expert.',
  },
  {
    title: 'Rooted in Indian Heritage',
    desc: 'Understands regional folklore and architectural nuances, conversing naturally in English, Hindi, or Hinglish.',
  },
];

export default function Hero() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [moment, setMoment] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const trackRef = useRef(null);
  const targetProgress = useRef(0);
  const currentProgress = useRef(0);
  const animFrameId = useRef(null);

  // Check mobile viewport to provide clean sequential flow on small screens
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 960);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Smooth LERP animation loop on desktop / tablet
  useEffect(() => {
    if (isMobile) return;

    const handleScroll = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const totalScroll = rect.height - window.innerHeight;
      if (totalScroll <= 0) return;

      const p = Math.min(1, Math.max(0, -rect.top / totalScroll));
      targetProgress.current = p;
    };

    let isRunning = true;
    const loop = () => {
      if (!isRunning) return;
      const diff = targetProgress.current - currentProgress.current;
      if (Math.abs(diff) > 0.0005) {
        currentProgress.current += diff * 0.14;
        setScrollProgress(currentProgress.current);
      } else if (currentProgress.current !== targetProgress.current) {
        currentProgress.current = targetProgress.current;
        setScrollProgress(currentProgress.current);
      }
      animFrameId.current = requestAnimationFrame(loop);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();
    loop();

    return () => {
      isRunning = false;
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isMobile]);

  // Mobile View: Natural non-sticky layout
  if (isMobile) {
    return (
      <div className="mobile-hero-container">
        {/* Mobile Page 1: Welcome Section */}
        <section className="mobile-welcome-section">
          <div className="wrap">
            <div className="eyebrow welcome-eyebrow">A Cultural Field Companion</div>
            <h1 className="welcome-title">Dharohar Setu</h1>
            <p className="welcome-desc">
              Dharohar Setu is an interactive heritage companion built to bring India's historical monuments to life. It accompanies your footsteps on-site, sharing the living history behind every archway, carving, and courtyard.
            </p>

            {/* Mobile Story Highlights Grid */}
            <div className="mobile-welcome-features-grid">
              {[...WELCOME_STORY_LEFT, ...WELCOME_STORY_RIGHT].map((item) => (
                <div key={item.title} className="mobile-feat-card">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mobile-phone-stage">
              <div className="phone">
                <div className="notch"></div>
                <div className="screen">
                  <img
                    src="/assets/splash-screen.jpg"
                    alt="Dharohar Setu Splash Screen"
                    className="mobile-splash-img"
                  />
                </div>
              </div>
            </div>

            <div className="mobile-scroll-cue">
              <a href="#hero-main" className="mobile-cue-link">
                <span>Explore Journey Details</span>
                <span className="cue-arrow">↓</span>
              </a>
            </div>
          </div>
        </section>

        {/* Mobile Page 2: Main Hero Section */}
        <section className="mobile-hero-section" id="hero-main">
          <div className="wrap">
            <div className="eyebrow">Dharohar Setu · a field companion</div>
            <h2 className="hero-title">
              <span className="hero-initial">W</span>alk in.<br />
              Let the place <em>speak.</em>
            </h2>
            <p className="lead">
              Open Dharohar Setu at the gate. It recognises the site, leads you to the next node, and keeps each story close as you move.
            </p>
            <div className="hero-context" aria-label="Explore the Dharohar journey">
              <div className="hero-context-tabs">
                {MOMENTS.map((item, index) => (
                  <button
                    key={item.label}
                    className={moment === index ? 'is-selected' : ''}
                    onClick={() => setMoment(index)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p>
                <span className="context-dot"></span>
                {MOMENTS[moment].detail}
              </p>
            </div>
            <div className="hero-ctas">
              <a href="#how" className="btn btn-primary">Explore Dharohar Setu</a>
              <a
                href={getAndroidDownloadUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                Download App
              </a>
            </div>
            <div className="hero-tags">
              <span>Location-aware</span>
              <span>Made for walking</span>
              <span>Listen in your language</span>
            </div>

            <div className="phone-stage mobile-stage-wrap">
              <div className="radar r1"></div>
              <div className="radar r2"></div>
              <div className="phone">
                <div className="notch"></div>
                <div className="screen">
                  <img
                    src={MOMENTS[moment].image}
                    alt="Dharohar app interface"
                    className="app-screen-img"
                  />
                </div>
              </div>
              <div className="floaty floaty-1"><span className="ico">📍</span>Node detected</div>
              <div className="floaty floaty-2"><span className="ico">🎧</span>Guide ready</div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Desktop / Tablet: Smooth Cinematic Scroll Runway
  return (
    <div className="hero-scroll-track" ref={trackRef}>
      <div className="hero-sticky-frame">
        {/* Phase 1: Welcome Intro Header */}
        <div
          className="hero-welcome-overlay"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 3.0),
            transform: `translate3d(0, -${scrollProgress * 36}px, 0)`,
            pointerEvents: scrollProgress > 0.2 ? 'none' : 'auto',
          }}
        >
          <div className="eyebrow welcome-eyebrow">A Cultural Field Companion</div>
          <h1 className="welcome-title">Dharohar Setu</h1>
          <p className="welcome-desc">
            Dharohar Setu is an interactive heritage companion built to bring India's historical monuments to life. It accompanies your footsteps on-site, sharing the living history behind every archway, carving, and courtyard.
          </p>
        </div>

        {/* Flanking Story Cards Left */}
        <div
          className="welcome-flanking-left"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 2.8),
            transform: `translate3d(-${scrollProgress * 40}px, 0, 0)`,
            pointerEvents: scrollProgress > 0.2 ? 'none' : 'auto',
          }}
        >
          {WELCOME_STORY_LEFT.map((item) => (
            <div key={item.title} className="welcome-feature-card">
              <h3 className="welcome-card-title">{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Flanking Story Cards Right */}
        <div
          className="welcome-flanking-right"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 2.8),
            transform: `translate3d(${scrollProgress * 40}px, 0, 0)`,
            pointerEvents: scrollProgress > 0.2 ? 'none' : 'auto',
          }}
        >
          {WELCOME_STORY_RIGHT.map((item) => (
            <div key={item.title} className="welcome-feature-card">
              <h3 className="welcome-card-title">{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Phase 2: Main Hero Section Content */}
        <div
          className="hero-main-container"
          style={{
            opacity: Math.min(1, Math.max(0, (scrollProgress - 0.22) * 1.8)),
            transform: `translate3d(0, ${(1 - Math.min(1, Math.max(0, (scrollProgress - 0.22) * 1.8))) * 24}px, 0)`,
            pointerEvents: scrollProgress < 0.35 ? 'none' : 'auto',
          }}
        >
          <div className="wrap hero-grid">
            <div className="hero-left-col">
              <div className="eyebrow">Dharohar Setu · a field companion</div>
              <h2 className="hero-title">
                <span className="hero-initial">W</span>alk in.<br />
                Let the place <em>speak.</em>
              </h2>
              <p className="lead">
                Open Dharohar Setu at the gate. It recognises the site, leads you to the next node, and keeps each story close as you move.
              </p>
              <div className="hero-context" aria-label="Explore the Dharohar journey">
                <div className="hero-context-tabs">
                  {MOMENTS.map((item, index) => (
                    <button
                      key={item.label}
                      className={moment === index ? 'is-selected' : ''}
                      onClick={() => setMoment(index)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p>
                  <span className="context-dot"></span>
                  {MOMENTS[moment].detail}
                </p>
              </div>
              <div className="hero-ctas">
                <a href="#how" className="btn btn-primary">Explore Dharohar Setu</a>
                <a
                  href={getAndroidDownloadUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  Download App
                </a>
              </div>
              <div className="hero-tags">
                <span>Location-aware</span>
                <span>Made for walking</span>
                <span>Listen in your language</span>
              </div>
            </div>

            {/* Target right column placeholder */}
            <div className="hero-right-col-placeholder" />
          </div>
        </div>

        {/* Animated Flying Phone Stage */}
        <div
          className="hero-animated-phone-stage"
          style={{
            '--p': scrollProgress,
          }}
        >
          {/* Ambient Radar Rings */}
          <div
            className="radar-wrapper"
            style={{ opacity: Math.max(0.3, 1 - scrollProgress * 0.4) }}
          >
            <div className="radar r1"></div>
            <div className="radar r2"></div>
            <div className="radar r3"></div>
          </div>

          {/* iPhone Mockup Frame */}
          <div className="phone">
            <div className="notch"></div>
            <div className="screen">
              {/* Splash Screen Image */}
              <div
                className="splash-screen-view"
                style={{
                  opacity: Math.max(0, 1 - scrollProgress * 2.2),
                }}
              >
                <img
                  src="/assets/splash-screen.jpg"
                  alt="Dharohar Setu Splash Screen"
                  className="splash-logo-img"
                />
              </div>

              {/* App UI Screen */}
              <img
                src={MOMENTS[moment].image}
                alt="Dharohar app interface"
                className="app-screen-img"
                style={{
                  opacity: Math.min(1, Math.max(0, (scrollProgress - 0.22) * 2)),
                }}
              />
            </div>
          </div>

          {/* Floating Telemetry Chips */}
          <div
            className="floaty floaty-1"
            style={{
              opacity: Math.max(0, (scrollProgress - 0.45) * 2),
              transform: `translate3d(0, ${(1 - Math.min(1, (scrollProgress - 0.45) * 2)) * 14}px, 0)`,
            }}
          >
            <span className="ico">📍</span>Node detected
          </div>
          <div
            className="floaty floaty-2"
            style={{
              opacity: Math.max(0, (scrollProgress - 0.55) * 2),
              transform: `translate3d(0, ${(1 - Math.min(1, (scrollProgress - 0.55) * 2)) * 14}px, 0)`,
            }}
          >
            <span className="ico">🎧</span>Guide ready
          </div>
        </div>

        {/* Scroll Cue at Bottom */}
        <div
          className="welcome-scroll-cue-fixed"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 3.5),
            pointerEvents: scrollProgress > 0.15 ? 'none' : 'auto',
          }}
        >
          <span>Scroll to explore</span>
          <span className="cue-arrow">↓</span>
        </div>
      </div>
    </div>
  );
}
