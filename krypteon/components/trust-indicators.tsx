import { Badge } from "./ui/badge"

const clients = ["Ethereum Foundation", "Polygon", "Chainlink", "Uniswap", "Aave", "Compound"]

const stats = [
  { value: "10,000+", label: "Contracts Audited" },
  { value: "500+", label: "Vulnerabilities Found" },
  { value: "99.9%", label: "Accuracy Rate" },
  { value: "24/7", label: "Support Available" },
]

export function TrustIndicators() {
  return (
    <section className="py-16 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground mb-6">TRUSTED BY LEADING WEB3 PROJECTS</p>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {clients.map((client, index) => (
              <Badge key={index} variant="secondary" className="text-sm px-4 py-2">
                {client}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}