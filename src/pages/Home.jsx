import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Features from '../components/Features'
import Sites from '../components/Sites'
import WhyDharohar from '../components/WhyDharohar'
import CTA from '../components/CTA'
import Footer from '../components/Footer'
import { getAndroidDownloadUrl } from '../config/appConfig'

export default function Home({ onNavigate }) {
  const [showScanBanner, setShowScanBanner] = useState(false)
  const downloadUrl = getAndroidDownloadUrl()

  useEffect(() => {
    // 1. Check if user arrived from a QR node redirect
    try {
      if (sessionStorage.getItem('humsafar_scanned_node_redirect') === 'true') {
        setShowScanBanner(true)
      }
    } catch {}

    // 2. Handle scroll position
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }

    // 3. Setup IntersectionObserver for reveal animations on fresh mount
    const revealEls = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

    revealEls.forEach((el) => io.observe(el))

    // 4. Trigger initial scroll & resize events so Hero and HowItWorks calculate properly
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('scroll'))
    }, 50)

    return () => {
      clearTimeout(timer)
      io.disconnect()
    }
  }, [])

  return (
    <>
      {/* Top Banner when redirected from a QR scan */}
      {showScanBanner && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 110,
          width: 'calc(100% - 32px)',
          maxWidth: '560px',
          background: 'linear-gradient(135deg, #9C4A2C 0%, #82381F 100%)',
          color: '#FAF6EF',
          padding: '12px 18px',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(156,74,44,0.36), 0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '13.5px',
          animation: 'fadeInDown 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <span><strong>Waypoint Scanned:</strong> Download the Humsafar app below to unlock this monument guide!</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#FAF6EF',
                color: '#9C4A2C',
                padding: '6px 12px',
                borderRadius: '100px',
                fontWeight: 600,
                fontSize: '12px',
                textDecoration: 'none'
              }}
            >
              Get App
            </a>
            <button
              type="button"
              onClick={() => {
                setShowScanBanner(false)
                try { sessionStorage.removeItem('humsafar_scanned_node_redirect') } catch {}
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FAF6EF',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px',
                lineHeight: 1
              }}
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Navbar onNavigate={onNavigate} />
      <main id="top">
        <Hero onNavigate={onNavigate} />
        <HowItWorks />
        <Features />
        <Sites />
        <WhyDharohar />
        <CTA onNavigate={onNavigate} />
      </main>
      <Footer onNavigate={onNavigate} />
    </>
  )
}
