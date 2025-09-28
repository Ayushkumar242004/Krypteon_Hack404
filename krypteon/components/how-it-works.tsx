import { Card, CardContent } from "../components/ui/card"
import { Upload, Search, FileText } from "lucide-react"

const steps = [
  {
    icon: Upload,
    title: "Upload Contract",
    description: "Upload your .sol files or paste code directly into our editor with syntax highlighting.",
  },
  {
    icon: Search,
    title: "AI Analysis",
    description: "Our advanced AI scans for vulnerabilities, gas inefficiencies, and security best practices.",
  },
  {
    icon: FileText,
    title: "Get Report",
    description: "Receive a comprehensive audit report with security scores and actionable recommendations.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Get professional-grade smart contract audits in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="text-center border-border/50">
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border transform -translate-y-1/2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}