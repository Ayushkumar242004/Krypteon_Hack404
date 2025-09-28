import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Zap, FileText, Calendar, Clock } from "lucide-react"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { useState } from 'react'
import ReactMarkdown from "react-markdown";

interface AnalysisData {
  issues: any[];
  summary: {
    High: number;
    Medium: number;
    Low: number;
    total: number;
  };
}

interface AuditReportDisplayData {
  contractName: string;
  analysisDate: string;
  securityScore: number;
  totalIssues: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  gasEfficiency: number;
  codeQuality: number;
  analysisTime: string;
}

interface AuditReportProps {
  data: AuditReportDisplayData | null;
  issues?: any[]; // Add issues prop to AuditReportProps
}

export function AuditReport({ data, issues }: AuditReportProps) {
  const [showPatchedCode, setShowPatchedCode] = useState<{ [key: number]: boolean }>({});
  const [patchedCode, setPatchedCode] = useState<{ [key: number]: string }>({});
  const [loadingFix, setLoadingFix] = useState<{ [key: number]: boolean }>({});
  const toggleShowPatchedCode = (index: number) => {
    setShowPatchedCode(prev => ({ ...prev, [index]: !prev[index] }));
  };
    const fetchFixSuggestion = async (index: number, snippet: string) => {
    try {
      setLoadingFix(prev => ({ ...prev, [index]: true }));
      const res = await fetch("http://localhost:8000/api/fix-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeSnippet: snippet }),
      });
      console.log("response fix", res);

      if (!res.ok) {
        throw new Error("Failed to fetch fix suggestion");
      }

      const data = await res.json();
      setPatchedCode(prev => ({ ...prev, [index]: data.fixedCode || "No fix returned." }));
      setShowPatchedCode(prev => ({ ...prev, [index]: true }));
    } catch (err) {
      console.error("Error fetching fix suggestion:", err);
    } finally {
      setLoadingFix(prev => ({ ...prev, [index]: false }));
    }
  };

  // Add these states near your existing states
const [explanations, setExplanations] = useState<{[key: number]: string}>({});
const [loadingExplanation, setLoadingExplanation] = useState<{[key: number]: boolean}>({});

// Learn More function
const fetchExplanation = async (index: number, snippet: string) => {
  setLoadingExplanation(prev => ({ ...prev, [index]: true }));
  try {
    const response = await fetch('http://localhost:8000/api/explain-issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codeSnippet: snippet }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch explanation');
    }

    const data = await response.json();

    // Store Markdown string in state
    setExplanations(prev => ({ 
      ...prev, 
      [index]: data.explanation 
    }));
  } catch (error) {
    console.error('Error fetching explanation:', error);
    setExplanations(prev => ({ 
      ...prev, 
      [index]: 'Failed to load explanation. Please try again.' 
    }));
  } finally {
    setLoadingExplanation(prev => ({ ...prev, [index]: false }));
  }
};

  // No longer deriving displayData locally, use data prop directly
  return (
    <div className="space-y-6">
     <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Executive Summary
          </CardTitle>
          <CardDescription>Comprehensive security audit report for {data?.contractName || "N/A"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Analysis Date: {data?.analysisDate || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Analysis Duration: {data?.analysisTime || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Contract: {data?.contractName || "N/A"}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-1">{data?.codeQuality || 0}%</div>
                <div className="text-sm text-muted-foreground">Overall Code Quality</div>
              </div>
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              This audit report presents a comprehensive security analysis of the {data?.contractName || "N/A"} smart contract.
              Our AI-powered analysis identified {data?.totalIssues || 0} total issues across various severity levels, with a
              focus on security vulnerabilities, gas optimization opportunities, and code quality improvements.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The contract demonstrates a security score of {data?.securityScore || 0}/100, indicating good security practices
              with room for improvement. Critical attention should be given to the {data?.highRisk || 0} high-risk
              vulnerabilities identified, which require immediate remediation to ensure contract safety.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* --- Vulnerability Breakdown --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Vulnerability Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <div className="text-2xl font-bold text-destructive mb-1">{data?.highRisk || 0}</div>
              <div className="text-sm text-muted-foreground">High Risk Issues</div>
            </div>
            <div className="text-center p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600 mb-1">{data?.mediumRisk || 0}</div>
              <div className="text-sm text-muted-foreground">Medium Risk Issues</div>
            </div>
            <div className="text-center p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600 mb-1">{data?.lowRisk || 0}</div>
              <div className="text-sm text-muted-foreground">Low Risk Issues</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Issues List --- */}
    {/* --- Issues List --- */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <TrendingUp className="w-5 h-5" />
      Key Findings & Recommendations
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {issues?.map((issue, index) => {
      const isPatched = showPatchedCode[index];
      const codeToShow = isPatched ? patchedCode[index] : issue.snippet;
      const hasExplanation = explanations[index];
      
      const borderColorClass = issue.severity === "High" ? "border-destructive"
        : issue.severity === "Medium" ? "border-yellow-500"
          : "border-blue-500"
      const titleColorClass = issue.severity === "High" ? "text-destructive"
        : issue.severity === "Medium" ? "text-yellow-600"
          : "text-blue-600"
      const iconComponent = issue.severity === "High" ? <XCircle className="w-5 h-5 text-destructive" />
        : issue.severity === "Medium" ? <AlertTriangle className="w-5 h-5 text-yellow-500" />
          : <CheckCircle className="w-5 h-5 text-blue-500" />
      return (
        <Card key={index} className={`border-l-4 ${borderColorClass}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {iconComponent}
                <CardTitle className={`text-lg ${titleColorClass}`}>
                  {issue.analysis?.title || issue.kb_hits?.[0]?.title || issue.suggestion?.natural_language?.split('\n')[0] || "Unknown Vulnerability"}
                </CardTitle>
              </div>
              <Badge 
                className={issue.severity === "Low" ? "bg-blue-500 text-white" : ""}
                variant={issue.severity === "High" ? "destructive" : "outline"}
              >
                {issue.severity} Risk
              </Badge>

            </div>
            <CardDescription className="flex items-center gap-2 mt-1">
              Line {issue.function_line} <span className="mx-2">•</span> {issue.kb_hits?.[0]?.title || "General"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h5 className="font-medium mb-1">Code Snippet</h5>
              <pre className="mt-2 p-4 bg-gray-800 text-white rounded-lg overflow-x-auto text-xs">
                <code>{codeToShow}</code>
              </pre>
            </div>
            
            {/* Explanation Section */}
            {hasExplanation && (
              <div className="p-4 bg-slate-50/60 rounded-lg border border-blue-200">
                <h5 className="font-bold text-500 mb-2 text-[#1E2939]">Recommendations</h5>
                <div className="text-sm text-[#1E2939]">
                  <ReactMarkdown>{explanations[index]}</ReactMarkdown>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchExplanation(index, issue.snippet)}
                disabled={loadingExplanation[index]}
              >
                {loadingExplanation[index] ? "Loading..." : "Learn More"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  isPatched
                    ? setShowPatchedCode(prev => ({ ...prev, [index]: false }))
                    : fetchFixSuggestion(index, issue.snippet)
                }
                disabled={loadingFix[index]}
              >
                {loadingFix[index] ? "Loading..." : isPatched ? "View Vulnerable Code" : "View Fix Suggestion"}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    })}
  </CardContent>
</Card>
    </div>
  )
}