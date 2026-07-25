import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { LandingNavbar } from './components/LandingNavbar'
import { Hero } from './components/Hero'
import { BenefitsSection } from './components/BenefitsSection'
import { FeaturesSection } from './components/FeaturesSection'
import { TechStackSection } from './components/TechStackSection'
import { LandingFooter } from './components/LandingFooter'

export default function Landing() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <LandingNavbar />
      <main>
        <Hero />
        <BenefitsSection />
        <FeaturesSection />
        <TechStackSection />
      </main>
      <LandingFooter />
    </div>
  )
}
