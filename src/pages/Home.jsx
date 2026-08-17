import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Features from '../components/Features'
import Sites from '../components/Sites'
import WhyDharohar from '../components/WhyDharohar'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

export default function Home({ onNavigate }) {
  return (
    <>
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
