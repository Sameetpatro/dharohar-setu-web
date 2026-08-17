import { useState } from 'react'

const PASSCODE = 'DS2026'
const STORAGE_KEY = 'dharohar_site_passcode_unlocked'

export function isSiteUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export default function SiteLockScreen({ onUnlock }) {
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [error, setError] = useState(null)
  const [shaking, setShaking] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (code.trim().toUpperCase() === PASSCODE) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true')
      } catch (err) {
        console.error('Storage error:', err)
      }
      onUnlock()
    } else {
      setError('Incorrect passcode. Access denied.')
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #FAF6EF 0%, #EFE8DA 100%)',
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E3D9C9',
        boxShadow: '0 16px 40px rgba(36, 26, 18, 0.08), 0 4px 12px rgba(156, 74, 44, 0.04)',
        padding: '36px 32px',
        textAlign: 'center',
        boxSizing: 'border-box',
        transform: shaking ? 'translateX(6px)' : 'none',
        transition: 'transform 0.1s ease',
        animation: shaking ? 'lockShake 0.4s ease' : 'none'
      }}>
        {/* Brand Emblem */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '24px'
        }}>
          <img
            src="/favicon.png"
            alt="Dharohar Setu"
            style={{ width: '42px', height: '42px', objectFit: 'contain' }}
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '20px',
              fontWeight: 700,
              color: '#241A12',
              lineHeight: '1.2'
            }}>
              Dharohar Setu
            </div>
            <div style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#9C4A2C',
              fontWeight: 600
            }}>
              National Heritage Portal
            </div>
          </div>
        </div>

        {/* Lock Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(156, 74, 44, 0.1)',
          color: '#9C4A2C',
          fontSize: '26px',
          marginBottom: '16px'
        }}>
          🔒
        </div>

        <h1 style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: '22px',
          color: '#241A12',
          margin: '0 0 8px',
          fontWeight: 700
        }}>
          Site Access Protected
        </h1>

        <p style={{
          fontSize: '13.5px',
          color: '#6B5E51',
          lineHeight: '1.5',
          margin: '0 0 24px'
        }}>
          Please enter the authorized authorization passcode to unlock and explore the Dharohar Setu platform.
        </p>

        {error && (
          <div style={{
            background: 'rgba(180, 40, 40, 0.08)',
            border: '1px solid rgba(180, 40, 40, 0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#B42828',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#241A12',
              marginBottom: '6px'
            }}>
              Enter Passcode
            </label>
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter passcode..."
                autoFocus
                required
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #D5C9B7',
                  background: '#FFFDF9',
                  color: '#241A12',
                  fontSize: '15px',
                  letterSpacing: showCode ? 'normal' : '0.15em',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                title={showCode ? 'Hide passcode' : 'Show passcode'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: '#8C7B6B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showCode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#9C4A2C',
              color: '#FFFFFF',
              fontSize: '14.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(156, 74, 44, 0.25)',
              transition: 'background 0.15s ease'
            }}
          >
            Unlock Platform →
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #EFE8DA',
          fontSize: '12px',
          color: '#8C7B6B'
        }}>
          Protected Environment • Dharohar Spatial Tour System
        </div>
      </div>

      <style>{`
        @keyframes lockShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  )
}
