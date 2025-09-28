import { Navigation } from "../../components/navigation"
import { HeroSection } from "../../components/hero-section"
import { FeaturesSection } from "../../components/features-section"
import { HowItWorks } from "../../components/how-it-works"
import { TrustIndicators } from "../../components/trust-indicators"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <TrustIndicators />
      <FeaturesSection />
      <HowItWorks />
    </main>
  )
}