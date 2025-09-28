import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Badge } from "../components/ui/badge"
import { Clock, Zap } from "lucide-react"

interface AnalysisState {
  isAnalyzing: boolean
  progress: number
  currentStep: string
  completed: boolean
}

interface AnalysisProgressProps {
  analysisState: AnalysisState
}

export function AnalysisProgress({ analysisState }: AnalysisProgressProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-balance mb-4">Analyzing Smart Contract</h1>
        <p className="text-muted-foreground">Our AI is performing comprehensive security analysis on your contract</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Analysis in Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{analysisState.currentStep}</span>
              <span className="text-sm text-muted-foreground">{Math.round(analysisState.progress)}%</span>
            </div>
            <Progress value={analysisState.progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium">Estimated Time</div>
              <div className="text-xs text-muted-foreground">15-30 seconds</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-sm font-medium">AI Models</div>
              <div className="text-xs text-muted-foreground">Security + Gas + Quality</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Analysis Steps:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Contract structure parsing
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Security vulnerability detection
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                Gas efficiency analysis
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                Code quality assessment
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                Report generation
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Badge variant="secondary" className="text-xs">
          Powered by Advanced AI Security Models
        </Badge>
      </div>
    </div>
  )
}
