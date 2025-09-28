"use client"

import { useState,useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import {
  FileText,
  Download,
  Share,
  Printer,
  Mail,
  BarChart3,
  Shield,
  AlertTriangle,
  TrendingUp,
  Clock,
  Eye,
} from "lucide-react"
import { AuditReport } from "../components/audit-report"
import { VisualAnalytics } from "../components/visual-analytics"
import { ShareableReport } from "../components/shareable-report"

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

interface ResultsReportingProps {
  analysisData: AnalysisData | null;
  contractName: string; // Added contractName prop
  analysisTime: string; // Add analysisTime prop
}

export function ResultsReporting({ analysisData, contractName, analysisTime }: ResultsReportingProps) {
  const [activeTab, setActiveTab] = useState("report")
   const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
   useEffect(() => {
    if (typeof window !== "undefined") {
      const storedResult = sessionStorage.getItem("analysisResult");
      const storedContractName = sessionStorage.getItem("contractName");
      const storedAnalysisTime = sessionStorage.getItem("analysisTime");

      let parsedResult = null;
      if (storedResult) {
        try {
          parsedResult = JSON.parse(storedResult);
        } catch (e) {
          console.error("Error parsing session storage data:", e);
        }
      }

      setSessionData({
        result: parsedResult,
        contractName: storedContractName || "",
        analysisTime: storedAnalysisTime || "",
      });
    }
  }, []);

const handleDownloadPDF = async () => {
  setLoading(true);
  const storedResult = sessionStorage.getItem("analysisResult");
  const storedContractName = sessionStorage.getItem("contractName");
  const storedAnalysisTime = sessionStorage.getItem("analysisTime");
 console.log("1");
  if (!storedResult || !storedContractName || !storedAnalysisTime) {
    console.error("Missing required session data");
    return;
  } 
 console.log("2");
  const payload = {
    result: JSON.parse(storedResult),
    contractName: storedContractName,
    analysisTime: storedAnalysisTime
  };
   console.log("3");
  try {
    // Step 1: Format JSON via API
    const resFormat = await fetch("http://localhost:8000/api/format-audit-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
     console.log("4");
    if (!resFormat.ok) {
      const text = await resFormat.text();
      throw new Error(`Format API error ${resFormat.status}: ${text}`);
    }
     console.log("4");
    const formattedData = await resFormat.json();
    console.log("Formatted JSON:", formattedData);

    // Step 2: Send formatted JSON to generate PDF
    const resPDF = await fetch("http://localhost:8000/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedData)
    });
     console.log("5");
    if (!resPDF.ok) {
      const text = await resPDF.text();
      throw new Error(`PDF API error ${resPDF.status}: ${text}`);
    }
     console.log("6");
    // Step 3: Get PDF blob and trigger download
    const pdfBlob = await resPDF.blob();
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${storedContractName}_Audit_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
     console.log("7");
    console.log("PDF download triggered successfully.");
  } catch (err) {
    console.error("Error generating/downloading PDF:", err);
  }finally {
      setLoading(false); // stop loading
    }
};



  const getScoreGrade = (score: number) => {
    if (score >= 90) return "A+"
    if (score >= 80) return "A"
    if (score >= 70) return "B"
    if (score >= 60) return "C"
    if (score >= 50) return "D"
    return "F"
  }

  // New calculateSecurityScore function based on user's provided logic
  const calculateSecurityScore = (high: number, medium: number, low: number): number => {
    const impactWeight: Record<"High" | "Medium" | "Low" , number> = {
      High: 10,
      Medium: 5,
      Low: 2,
    };

    const deductions = (high * impactWeight['High']) + (medium * impactWeight['Medium']) + (low * impactWeight['Low'])
    let score = 100 - deductions
    return Math.max(0, score) // Score can't go below 0

  };

  // Derive display data from analysisData
  const summary = analysisData?.summary;
  const auditData: AuditReportDisplayData = {
    contractName: contractName, // Use the prop directly
    analysisDate: new Date().toLocaleDateString(),
    securityScore: calculateSecurityScore(summary?.High || 0, summary?.Medium || 0, summary?.Low || 0),
    totalIssues: summary?.total || 0,
    highRisk: summary?.High || 0,
    mediumRisk: summary?.Medium || 0,
    lowRisk: summary?.Low || 0,
    gasEfficiency: Math.max(0, 100 - (summary?.total || 0) * 2), // New calculation
    codeQuality: summary ? Math.max(0, 100 - (summary.total * 1.5)) : 0, // Existing heuristic
    analysisTime: analysisTime, // Use the prop directly
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-balance">Audit Results & Reports</h1>
          <p className="text-muted-foreground">Comprehensive security analysis report for {auditData.contractName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
           <Button size="sm" onClick={handleDownloadPDF} disabled={loading}>
      {loading ? (
        <>
          <span className="spinner mr-2"></span> Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </>
      )}
    </Button> 
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{auditData.securityScore}</div>
              <div className="text-sm text-muted-foreground">Grade: {getScoreGrade(auditData.securityScore)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Total Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{auditData.totalIssues}</div>
              <div className="text-sm text-muted-foreground">Found</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Gas Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{auditData.gasEfficiency}%</div>
              <div className="text-sm text-muted-foreground">Optimized</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Analysis Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{auditData.analysisTime}</div>
              <div className="text-sm text-muted-foreground"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="report">Audit Report</TabsTrigger>
          <TabsTrigger value="analytics">Visual Analytics</TabsTrigger>
        
        </TabsList>

        <TabsContent value="report">
          <AuditReport data={auditData} issues={analysisData?.issues} /> {/* Pass auditData and analysisData.issues */}
        </TabsContent>

        <TabsContent value="analytics">
          <VisualAnalytics data={analysisData} /> {/* Pass analysisData directly */}
        </TabsContent>

      
      </Tabs>
    </div>
  )
}