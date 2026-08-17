import { useEffect, useRef, useState, useCallback } from 'react';

const STEPS = [
  {
    n: 1,
    period: 'STEP 01 · ARRIVAL',
    mode: 'AUTOMATIC',
    location: 'HERITAGE GATE',
    title: 'Arrive at a heritage site',
    subtitle: 'Automatic site detection at the entrance',
    tags: ['LOCATION-AWARE', 'AUTOMATIC', 'HERITAGE GATE'],
    body: 'Walk up to any supported fort, monument, or campus with the app open. Dharohar Setu automatically recognises the site and prepares your tour without any searching.',
  },
  {
    n: 2,
    period: 'STEP 02 · DISCOVERY',
    mode: 'EXPLORE',
    location: 'SITE OVERVIEW',
    title: 'Plan your visit at a glance',
    subtitle: 'History, 7-day weather forecast & ticket booking',
    tags: ['INTERACTIVE MAP', 'WEATHER FORECAST', 'TICKETS'],
    body: 'Explore photos, check the live weather forecast, choose your ticket tier, and watch an introductory video before taking your first step into the monument.',
  },
  {
    n: 3,
    period: 'STEP 03 · ENTRY SCAN',
    mode: 'QR SCAN',
    location: 'MAIN ENTRANCE',
    title: 'Scan the entrance King node',
    subtitle: 'Start your tour and unlock the walking route',
    tags: ['QUICK SCAN', 'START TRIP', 'GUIDED ROUTE'],
    body: 'Scan the primary QR marker at the main gate to begin your visit. The app unlocks the optimal walking route through the monuments and courtyards.',
  },
  {
    n: 4,
    period: 'STEP 04 · NAVIGATION',
    mode: 'LIVE MAP',
    location: 'ACTIVE WALK',
    title: 'Track each stop as you move',
    subtitle: 'Color-coded route map showing your progress',
    tags: ['LIVE MAP', 'TOUR PROGRESS', 'STEP BY STEP'],
    body: 'As you walk from spot to spot, the live map tracks where you are and highlights upcoming stops so you never miss a hidden courtyard or monument.',
  },
  {
    n: 5,
    period: 'STEP 05 · AI GUIDE "SHREE"',
    mode: 'VOICE & CHAT',
    location: 'ANY SPOT',
    title: 'Ask SHREE — Text & Voice AI Guide',
    subtitle: 'Conversational companion in English, Hindi, or Hinglish',
    tags: ['VOICE ASSISTANT', 'TEXT CHAT', 'MULTILINGUAL'],
    body: 'Ask questions about any carving, inscription, or historic event. SHREE AI gives you deep historical insights through voice or text in your preferred language.',
  },
  {
    n: 6,
    period: 'STEP 06 · DEPARTURE',
    mode: 'DISCOVER MORE',
    location: 'NEARBY GEMS',
    title: 'Trip summary & local recommendations',
    subtitle: 'Personalised nearby spots and travel memories',
    tags: ['TRIP SUMMARY', 'LOCAL GEMS', 'SAVED VISITS'],
    body: 'Complete your visit with a trip summary, save your memories, and receive curated recommendations for nearby monuments, local restaurants, and hotels.',
  },
];

export default function HowItWorks() {
  const trailRef = useRef(null);
  const svgRef = useRef(null);
  const rowRefs = useRef([]);
  const cardRefs = useRef([]);
  const topAnchorRefs = useRef([]);
  const segmentFillRefs = useRef([]);
  const segmentLengths = useRef([]);
  const rafId = useRef(null);

  const [segments, setSegments] = useState([]);

  rowRefs.current = [];
  cardRefs.current = [];
  topAnchorRefs.current = [];
  segmentFillRefs.current = [];

  const setRowRef = (el, i) => { if (el) rowRefs.current[i] = el; };
  const setCardRef = (el, i) => { if (el) cardRefs.current[i] = el; };
  const setTopAnchorRef = (el, i) => { if (el) topAnchorRefs.current[i] = el; };

  // Calculate organic sweeping curved paths between consecutive cards
  const rebuildPaths = useCallback(() => {
    const trail = trailRef.current;
    const svg = svgRef.current;
    if (!trail || !svg) return;

    const trailRect = trail.getBoundingClientRect();
    const width = trailRect.width;
    const height = trailRect.height;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);

    const isDesktop = width > 860;
    const newSegments = [];
    const count = STEPS.length;

    for (let i = 0; i < count - 1; i++) {
      const cardCurr = cardRefs.current[i];
      const cardNext = cardRefs.current[i + 1];

      if (!cardCurr || !cardNext) continue;

      const cardCurrRect = cardCurr.getBoundingClientRect();
      const cardNextRect = cardNext.getBoundingClientRect();

      const currIsRight = i % 2 === 0;

      let startX, startY, endX, endY, cp1X, cp1Y, cp2X, cp2Y;

      if (isDesktop) {
        if (currIsRight) {
          // Card i is on the Right, Card i+1 is on the Left
          startX = cardCurrRect.left - trailRect.left;
          startY = cardCurrRect.top + cardCurrRect.height * 0.60 - trailRect.top;

          endX = cardNextRect.left + cardNextRect.width / 2 - trailRect.left;
          endY = cardNextRect.top - trailRect.top;

          const deltaX = endX - startX;
          const deltaY = endY - startY;

          cp1X = startX + deltaX * 0.55;
          cp1Y = startY + deltaY * 0.15;
          cp2X = endX;
          cp2Y = endY - deltaY * 0.45;
        } else {
          // Card i is on the Left, Card i+1 is on the Right
          startX = cardCurrRect.right - trailRect.left;
          startY = cardCurrRect.top + cardCurrRect.height * 0.60 - trailRect.top;

          endX = cardNextRect.left + cardNextRect.width / 2 - trailRect.left;
          endY = cardNextRect.top - trailRect.top;

          const deltaX = endX - startX;
          const deltaY = endY - startY;

          cp1X = startX + deltaX * 0.55;
          cp1Y = startY + deltaY * 0.15;
          cp2X = endX;
          cp2Y = endY - deltaY * 0.45;
        }
      } else {
        // Mobile single-column stacked view
        startX = cardCurrRect.left + cardCurrRect.width / 2 - trailRect.left;
        startY = cardCurrRect.bottom - trailRect.top;

        endX = cardNextRect.left + cardNextRect.width / 2 - trailRect.left;
        endY = cardNextRect.top - trailRect.top;

        const deltaY = endY - startY;
        cp1X = startX;
        cp1Y = startY + deltaY * 0.5;
        cp2X = endX;
        cp2Y = endY - deltaY * 0.5;
      }

      const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      newSegments.push({ id: i, d, startY, endY });
    }

    setSegments(newSegments);
  }, []);

  // Smooth, paced scroll progression and dynamic card scaling
  const updateProgress = useCallback(() => {
    rafId.current = null;
    const vh = window.innerHeight;

    // Card reveal and scroll scaling triggers
    cardRefs.current.forEach((cardEl, idx) => {
      if (!cardEl) return;
      const cardRect = cardEl.getBoundingClientRect();

      // Card enters view
      const isPast = cardRect.top < vh * 0.82;
      cardEl.classList.toggle('in', isPast);

      // Card scales up smoothly when scrolled into focal view
      const isFocused = cardRect.top < vh * 0.68 && cardRect.bottom > vh * 0.32;
      cardEl.classList.toggle('is-focused', isFocused);

      const topDot = topAnchorRefs.current[idx];
      if (topDot) {
        topDot.classList.toggle('active', cardRect.top < vh * 0.65);
      }
    });

    // Paced, graceful segment fill
    segmentFillRefs.current.forEach((fillEl, idx) => {
      if (!fillEl) return;

      const cardCurr = cardRefs.current[idx];
      const cardNext = cardRefs.current[idx + 1];
      if (!cardCurr || !cardNext) return;

      const cardCurrRect = cardCurr.getBoundingClientRect();
      const cardNextRect = cardNext.getBoundingClientRect();

      const startVp = cardCurrRect.top + cardCurrRect.height * 0.5;
      const endVp = cardNextRect.top;

      const trigger = vh * 0.60;

      let progress = 0;
      if (trigger <= startVp) {
        progress = 0;
      } else if (trigger >= endVp) {
        progress = 1;
      } else {
        const totalDistance = endVp - startVp;
        const currentDistance = trigger - startVp;
        progress = Math.min(1, Math.max(0, currentDistance / (totalDistance || 1)));
      }

      let len = segmentLengths.current[idx];
      if (!len) {
        try {
          len = fillEl.getTotalLength() || 600;
          segmentLengths.current[idx] = len;
          fillEl.style.strokeDasharray = `${len}`;
        } catch (e) {
          len = 600;
        }
      }

      fillEl.style.strokeDashoffset = `${len * (1 - progress)}`;
    });
  }, []);

  const onScroll = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(updateProgress);
  }, [updateProgress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      rebuildPaths();
    }, 60);

    const ro = new ResizeObserver(() => {
      rebuildPaths();
      updateProgress();
    });

    if (trailRef.current) ro.observe(trailRef.current);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', rebuildPaths);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', rebuildPaths);
      ro.disconnect();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [rebuildPaths, updateProgress, onScroll]);

  useEffect(() => {
    segmentFillRefs.current.forEach((fillEl, idx) => {
      if (fillEl) {
        try {
          const len = fillEl.getTotalLength() || 600;
          segmentLengths.current[idx] = len;
          fillEl.style.strokeDasharray = `${len}`;
          fillEl.style.strokeDashoffset = `${len}`;
        } catch (e) {
          // not mounted yet
        }
      }
    });
    updateProgress();
  }, [segments, updateProgress]);

  return (
    <section className="trail-section" id="how">
      <div className="wrap">
        <div className="trail-head reveal in">
          <div className="eyebrow">How Dharohar Setu works</div>
          <h2>One visit, guided from the gate to the final stop.</h2>
          <p>
            Dharohar Setu follows the site as it unfolds: it recognises your entry, unlocks the tour route, and provides conversational AI guidance at every step.
          </p>
        </div>

        <div className="timeline-container" ref={trailRef}>
          {/* Dynamic SVG Bezier Connecting Segments */}
          <svg className="timeline-svg" ref={svgRef} aria-hidden="true">
            {segments.map((seg) => (
              <g key={seg.id} className="timeline-segment-group">
                {/* Greyish background track */}
                <path className="timeline-line-bg" d={seg.d} />
                {/* Smooth yellow scroll-progress foreground line */}
                <path
                  className="timeline-line-fill"
                  ref={(el) => { if (el) segmentFillRefs.current[seg.id] = el; }}
                  d={seg.d}
                />
              </g>
            ))}
          </svg>

          {/* Staggered Timeline Cards */}
          <div className="timeline-cards-wrapper">
            {STEPS.map((step, i) => {
              const side = i % 2 === 0 ? 'right' : 'left';

              return (
                <div
                  key={step.n}
                  ref={(el) => setRowRef(el, i)}
                  className={`timeline-row timeline-row-${side}`}
                >
                  <div
                    ref={(el) => setCardRef(el, i)}
                    className="timeline-card reveal-card"
                  >
                    {/* Top center anchor dot pinned to card border */}
                    <div
                      className="timeline-anchor-top"
                      ref={(el) => setTopAnchorRef(el, i)}
                      aria-hidden="true"
                    >
                      <span className="timeline-anchor-dot" />
                    </div>

                    {/* Metadata Header Badges */}
                    <div className="timeline-badges">
                      <span className="timeline-badge timeline-badge-date">
                        <svg className="badge-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {step.period}
                      </span>
                      <span className="timeline-badge timeline-badge-mode">
                        <svg className="badge-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        {step.mode}
                      </span>
                      <span className="timeline-badge timeline-badge-loc">
                        <svg className="badge-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        {step.location}
                      </span>
                    </div>

                    {/* Card Title & Subtitle */}
                    <h3 className="timeline-card-title">{step.title}</h3>
                    {step.subtitle && (
                      <div className="timeline-card-subtitle">{step.subtitle}</div>
                    )}

                    {/* Clean Feature Tags */}
                    {step.tags && step.tags.length > 0 && (
                      <div className="timeline-card-tags">
                        {step.tags.join(' · ')}
                      </div>
                    )}

                    {/* Description Copy */}
                    <p className="timeline-card-body">{step.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}