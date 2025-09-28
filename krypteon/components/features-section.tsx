import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Shield, Zap, Code, Globe, BarChart3, FileCheck } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "AI-Driven Security Analysis",
    description:
      "Advanced machine learning algorithms detect complex vulnerabilities and security flaws in your smart contracts.",
  },
  {
    icon: Globe,
    title: "Web3 Verification",
    description:
      "Verify deployed contracts on Ethereum, Georli and Solana networks.",
  },
  {
    icon: Zap,
    title: "Real-time Detection",
    description: "Get instant feedback on vulnerabilities with severity levels and actionable fix suggestions.",
  },
  {
    icon: Code,
    title: "Code Quality Analysis",
    description: "Comprehensive analysis of best practices, gas optimization, and code maintainability.",
  },
  {
    icon: BarChart3,
    title: "Detailed Reporting",
    description: "Professional audit reports with security scores, vulnerability breakdowns, and visual analytics.",
  },
  {
    icon: FileCheck,
    title: "Compliance Checking",
    description: "Ensure your contracts meet industry standards and regulatory requirements.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-4">Comprehensive Smart Contract Security</h2>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Our AI-powered platform provides enterprise-grade security analysis for smart contracts across multiple
            blockchain networks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}