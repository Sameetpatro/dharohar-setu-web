export default function Features() {
  return (
    <>
      <section className="features" id="features">
        <div className="wrap">
          <div className="features-head reveal">
            <div className="eyebrow">Features</div>
            <h2>Everything you need to explore a place properly.</h2>
            <p>
              Designed to keep your attention on the site, while the right story appears at the right moment.
            </p>
          </div>

          {/* Feature 1: Location & Discovery */}
          <div className="feature-row reveal">
            <div className="feature-copy">
              <div className="eyebrow">Location & Discovery</div>
              <h3>The app moves with you, automatically.</h3>
              <p>
                As soon as you step into a heritage site, Dharohar Setu recognises where you are and prepares the right story and route — no searching or typing needed.
              </p>
              <p className="feature-subtext">
                <strong>Nearby Sites Map:</strong> Discover historic monuments around you sorted by distance, complete with live directions.
              </p>
            </div>
            <div className="feature-visual">
              <div className="mini-phone">
                <div className="screen">
                  <img src="/assets/app-preview-3.jpg" alt="Interactive map showing nearby heritage sites" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: AI Guide - SHREE */}
          <div className="feature-row reverse reveal">
            <div className="feature-copy">
              <div className="eyebrow">AI Guide — SHREE</div>
              <h3>Ask it anything. It knows the story of every stone.</h3>
              <p>
                SHREE understands the exact spot where you are standing. Ask about dynasties, carvings, or hidden folklore and receive engaging answers tailored to that moment.
              </p>
              <p className="feature-subtext">
                <strong>Voice & Chat:</strong> Speak naturally or type your questions, and listen to clear audio responses in English, Hindi, or Hinglish.
              </p>
            </div>
            <div className="feature-visual">
              <div className="mini-phone">
                <div className="screen">
                  <img src="/assets/app-preview-2.jpg" alt="SHREE AI guide answering questions about monuments" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: QR-Based Trip System */}
          <div className="feature-row feature-row-text reveal">
            <div className="feature-copy">
              <div className="eyebrow">QR-Based Discovery</div>
              <h3>Scan a marker, unlock the next story.</h3>
              <p>
                Placed at key courtyards and monuments, simple QR scans confirm each stop along your route, playing narrations and moving your journey forward.
              </p>
              <p className="feature-subtext">
                <strong>Live Progress Tracker:</strong> Follow your route on a color-coded map and receive curated suggestions for nearby local food and stays when you finish.
              </p>
            </div>
            <div className="feature-visual">
              <div className="mini-phone">
                <div className="screen">
                  <img src="/assets/qr-discovery.svg" alt="Dharohar QR code scanner ready to scan" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: Heritage Exploration & Tickets */}
          <div className="feature-row reverse reveal">
            <div className="feature-copy">
              <div className="eyebrow">Plan Your Visit</div>
              <h3>Tickets, weather & videos — all in one place.</h3>
              <p>
                View photo galleries, watch introductory videos, and check the 7-day weather forecast before you take your first step.
              </p>
              <p className="feature-subtext">
                <strong>In-App Tickets:</strong> Select entry tiers for students, adults, or foreign visitors and access ticketing portals with a single tap.
              </p>
            </div>
            <div className="feature-visual">
              <div className="mini-phone">
                <div className="screen">
                  <img src="/assets/app-preview-5.jpg" alt="Ticket tiers, weather forecast, and video overview" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 5: Multilingual Voice & Text */}
          <div className="feature-row reveal">
            <div className="feature-copy">
              <div className="eyebrow">Your Language</div>
              <h3>English · हिन्दी · Hinglish</h3>
              <p>
                Built for how India naturally speaks and explores. Every audio guide, text narration, and AI response is available in standard English, natural Hindi, and casual Hinglish.
              </p>
            </div>
            <div className="feature-visual">
              <div className="mini-phone">
                <div className="screen">
                  <img src="/assets/app-preview-6.jpg" alt="Language and region settings supporting English, Hindi, and Hinglish" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 6: Visit History & Reviews */}
          <div className="feature-row visit-history reverse reveal">
            <div className="feature-copy">
              <div className="eyebrow">Your Visit, Remembered</div>
              <h3>Save your travel memories and share feedback.</h3>
              <p>
                Sign in with Google, email, or explore freely as a guest. Dharohar Setu keeps your completed tours and visited stops in one place.
              </p>
            </div>
            <div className="feature-visual">
              <div className="visit-record">
                <span className="record-dot"></span>
                <div>
                  <strong>Trip History</strong>
                  <small>Visits, progress, and memories</small>
                </div>
                <span className="record-arrow">→</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
