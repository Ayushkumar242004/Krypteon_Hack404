import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Shield, TrendingUp, TrendingDown } from "lucide-react"

interface SecurityScoreProps {
  score: number
}

export function SecurityScore({ score }: SecurityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-destructive"
  }

  const getScoreGrade = (score: number) => {
    if (score >= 90) return "A+"
    if (score >= 80) return "A"
    if (score >= 70) return "B"
    if (score >= 60) return "C"
    if (score >= 50) return "D"
    return "F"
  }

  const getScoreDescription = (score: number) => {
    if (score >= 80) return "Excellent security posture"
    if (score >= 60) return "Good with room for improvement"
    return "Needs significant security improvements"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(score)} mb-2`}>{score}</div>
          <div className="text-2xl font-semibold text-muted-foreground mb-1">{getScoreGrade(score)}</div>
          <p className="text-sm text-muted-foreground">{getScoreDescription(score)}</p>
        </div>

        <Progress value={score} className="h-3" />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Security Patterns</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-medium">85%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Vulnerability Risk</span>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="font-medium">High</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Code Quality</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-medium">92%</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">Score based on 50+ security metrics</div>
        </div>
      </CardContent>
    </Card>
  )
}
