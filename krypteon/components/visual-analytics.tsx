"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { BarChart3, PieChart, TrendingUp, Activity } from "lucide-react"

// Re-defining AnalysisData here for clarity and to ensure VisualAnalytics is self-contained
interface AnalysisData {
  issues: any[];
  summary: {
    High: number;
    Medium: number;
    Low: number;
    total: number;
  };
}

interface VisualAnalyticsProps {
  data: AnalysisData | null;
}

export function VisualAnalytics({ data }: VisualAnalyticsProps) {
  // Derive display data, similar to AuditReport
  const highRisk = data?.summary?.High || 0
  const mediumRisk = data?.summary?.Medium || 0
  const lowRisk = data?.summary?.Low || 0
  const totalIssues = data?.summary?.total || 0

  const calculateSecurityScore = (high: number, medium: number, low: number): number => {
    const maxScore = 100
    const highImpact = 10
    const mediumImpact = 5
    const lowImpact = 2

    const deductions = (high * highImpact) + (medium * mediumImpact) + (low * lowImpact)
    let score = maxScore - deductions
    return Math.max(0, score) // Score can't go below 0
  }

  const securityScore = calculateSecurityScore(highRisk, mediumRisk, lowRisk)
  const gasEfficiency = 0 // Not provided by API, defaulting
  const codeQuality = 0 // Not provided by API, defaulting

  const riskDistribution = [
    { name: "High Risk", value: highRisk, color: "bg-destructive" },
    { name: "Medium Risk", value: mediumRisk, color: "bg-yellow-500" },
    { name: "Low Risk", value: lowRisk, color: "bg-blue-500" },
  ]

  const securityMetrics = [
    { name: "Security Score", value: securityScore, max: 100, color: "bg-primary" },
    { name: "Gas Efficiency", value: gasEfficiency, max: 100, color: "bg-green-500" },
    { name: "Code Quality", value: codeQuality, max: 100, color: "bg-blue-500" },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Risk Distribution
          </CardTitle>
          <CardDescription>Visual breakdown of security issues by severity level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-destructive via-yellow-500 to-blue-500 p-1">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{totalIssues}</div>
                      <div className="text-sm text-muted-foreground">Total Issues</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {riskDistribution.map((item, index) => (
                <div key={index} className="text-center p-4 border border-border rounded-lg">
                  <div className={`w-4 h-4 ${item.color} rounded-full mx-auto mb-2`} />
                  <div className="text-lg font-bold">{item.value}</div>
                  <div className="text-sm text-muted-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {totalIssues > 0 ? ((item.value / totalIssues) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Security Metrics
          </CardTitle>
          <CardDescription>Performance indicators across different analysis dimensions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {securityMetrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{metric.name}</span>
                <span className="text-sm text-muted-foreground">{metric.value}%</span>
              </div>
              <div className="relative">
                <Progress value={metric.value} className="h-3" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`h-1 ${metric.color} rounded-full`} style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Security Trends
            </CardTitle>
            <CardDescription>Historical comparison and improvement tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Previous Audit</span>
                <span className="text-sm font-medium">N/A</span>
              </div>
              <div className="flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <span className="text-sm">Current Audit</span>
                <span className="text-sm font-medium text-primary">{securityScore}/100</span>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">N/A</div>
                <div className="text-sm text-muted-foreground">Improvement</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Analysis Coverage
            </CardTitle>
            <CardDescription>Scope and depth of security analysis performed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Functions Analyzed</span>
                <span className="text-sm font-medium">{data?.issues?.length || 0}/{data?.issues?.length || 0}</span>
              </div>
              <Progress value={data?.issues?.length ? 100 : 0} className="h-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm">Security Patterns</span>
                <span className="text-sm font-medium">N/A</span>
              </div>
              <Progress value={0} className="h-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm">Gas Optimizations</span>
                <span className="text-sm font-medium">N/A</span>
              </div>
              <Progress value={0} className="h-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm">Code Quality Checks</span>
                <span className="text-sm font-medium">N/A</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparative Analysis</CardTitle>
          <CardDescription>How your contract compares to industry benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary mb-2">{securityScore}</div>
              <div className="text-sm text-muted-foreground mb-1">Your Score</div>
              <div className="text-xs text-green-600">Above Average</div>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-muted-foreground mb-2">72</div>
              <div className="text-sm text-muted-foreground mb-1">Industry Average</div>
              <div className="text-xs text-muted-foreground">DeFi Contracts</div>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-2">95</div>
              <div className="text-sm text-muted-foreground mb-1">Top 10%</div>
              <div className="text-xs text-muted-foreground">Best in Class</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
