"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Badge } from "../components/ui/badge"
import { Switch } from "../components/ui/switch"
import { Upload, FileCode, Globe, Settings, Play, AlertCircle, Link, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { CodeEditor } from "../components/code-editor"
import axios from "axios"
import { useToast } from "../components/ui/use-toast"
import { Github } from 'lucide-react';

export function UploadInterface() {
  const [uploadMethod, setUploadMethod] = useState<"file" | "editor" | "address" | "github">("file")
  const [files, setFiles] = useState<File[]>([])
  const [code, setCode] = useState("")
  const [contractName, setContractName] = useState("")
  const [contractVersion, setContractVersion] = useState("")
  const [contractAddress, setContractAddress] = useState("")
  const [network, setNetwork] = useState<"ethereum" | "solana">("ethereum")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 🔹 New states for address fetching
  const [addressInput, setAddressInput] = useState("")
  const [addressNetwork, setAddressNetwork] = useState("mainnet")
  const [loadingAddressFetch, setLoadingAddressFetch] = useState(false)
  const [fetchResult, setFetchResult] = useState<{ ok: boolean; foundOn?: string; error?: string } | null>(null)
  const [fetchedSource, setFetchedSource] = useState("")
  const [sourceCode, setSourceCode] = useState("")
  
  // GitHub states
  const [githubUrl, setGithubUrl] = useState('');
  const [repoFiles, setRepoFiles] = useState<Array<{name: string, path: string, content: string}>>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const solFiles = acceptedFiles.filter((file) => file.name.endsWith(".sol"))
    setFiles((prev) => [...prev, ...solFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".sol"],
    },
    multiple: true,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 🔹 Fetch contract source
  const handleFetchSource = async () => {
    if (!addressInput) return alert("Please enter a contract address")
    setLoadingAddressFetch(true)
    setFetchResult(null)
    setFetchedSource("")
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress: addressInput, network: addressNetwork }),
      })
      const data = await response.json()
      setLoadingAddressFetch(false)
      if (data.ok) {
        setSourceCode(data.payload.source || "") 
        setFetchedSource(data.payload.source || "")
        setFetchResult({ ok: true, foundOn: data.payload.foundOn })
      } else {
        setFetchResult({ ok: false, error: data.error })
        setFetchedSource("")
      }
    } catch (err: any) {
      setLoadingAddressFetch(false)
      setFetchResult({ ok: false, error: err.message || "Unknown error" })
      setFetchedSource("")
    }
  }

  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [analysisEndTime, setAnalysisEndTime] = useState<number | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "in-progress" | "completed">("idle");
  const [currentStep, setCurrentStep] = useState("Idle");

  const fetchGithubRepo = async () => {
    if (!githubUrl) return;
    
    setLoadingRepo(true);
    try {
      console.log("1");
      const response = await fetch('http://localhost:8000/api-github-repo-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl: githubUrl }),
      });
      console.log("response",response);
      if (!response.ok) {
        throw new Error('Failed to fetch repository');
      }

      const data = await response.json();
      console.log("data",data);
      setRepoFiles(data.files);
    } catch (error) {
      console.error('Error fetching repository:', error);
      alert('Failed to fetch repository. Please check the URL and try again.');
    } finally {
      setLoadingRepo(false);
    }
  };

  // Function to handle file selection
  const handleFileSelect = async (filePath: string) => {
    const file = repoFiles.find(f => f.path === filePath);
    if (file && file.content) {
      setCode(file.content);
      setSelectedFile(filePath);
      setUploadMethod('editor'); // Switch to editor tab with the selected file
    }
  };

  const { toast } = useToast()

  const handleAnalyze = useCallback(async () => {
    console.log("1");
    setIsAnalyzing(true)
    
    // Check if we have content to analyze based on the current tab
    let hasContent = false;
    switch (uploadMethod) {
      case "file":
        hasContent = files.length > 0;
        break;
      case "editor":
        hasContent = code.trim().length > 0;
        break;
      case "address":
        hasContent = fetchedSource.trim().length > 0;
        break;
      case "github":
        // For github tab, we need to have a file selected and code loaded
        hasContent = code.trim().length > 0;
        break;
    }

    if (!hasContent) {
      toast({
        title: "No content to analyze",
        description: `Please provide Solidity code in the ${uploadMethod} tab.`,
        variant: "destructive",
      })
      setIsAnalyzing(false);
      return;
    }

    console.log("2");
    setAnalysisStatus("in-progress")
    setAnalysisProgress(0)
    setCurrentStep("Preparing analysis...")
   
    const startTime = Date.now();
    console.log("3");
    const formData = new FormData()
    
    if (uploadMethod === "file" && files.length > 0) {
      formData.append("file", files[0])
      console.log("4");
    } else if (uploadMethod === "editor" || uploadMethod === "github") {
      // Both editor and github tabs use the code state
      if (!code.trim()) {
        toast({
          title: "No code to analyze",
          description: "Please enter Solidity code in the editor.",
          variant: "destructive",
        })
        setAnalysisStatus("idle")
        setIsAnalyzing(false);
        return
      }
      const blob = new Blob([code], { type: "text/plain" })
      formData.append("file", blob, "contract.sol")
    } else if (uploadMethod === "address") {
      if (!fetchedSource.trim()) {
        toast({
          title: "No source code fetched",
          description: "Please fetch a contract's source code first.",
          variant: "destructive",
        })
        setAnalysisStatus("idle")
        setIsAnalyzing(false);
        return
      }
      const blob = new Blob([fetchedSource], { type: "text/plain" })
      formData.append("file", blob, "contract.sol")
    }
    console.log("5");
  
    try {
      console.log("6");
      const response = await axios.post("http://localhost:8000/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setAnalysisProgress(percentCompleted)
            setCurrentStep(`Uploading file: ${percentCompleted}%...`)
          }
        },
      })
      console.log("Analysis response:", response.data);
      const analysisEndTime = Date.now()
      const elapsedTimeSeconds = Math.round((analysisEndTime - startTime) / 1000)
      const elapsedTimeMinutes = Math.floor(elapsedTimeSeconds / 60)
      const elapsedTimeDisplay =
        elapsedTimeMinutes > 0
          ? `${elapsedTimeMinutes} min ${elapsedTimeSeconds % 60}s`
          : `${elapsedTimeSeconds} sec`
  
      // Store data in sessionStorage and navigate
      sessionStorage.setItem("analysisResult", JSON.stringify(response.data))
      sessionStorage.setItem(
        "contractName",
        uploadMethod === "file" && files.length > 0 ? files[0].name : "contract.sol"
      )
      sessionStorage.setItem("analysisTime", elapsedTimeDisplay)
      console.log("6");
      window.location.href = "/results"
    } catch (error) {
      console.log("7");
      console.error("Analysis failed:", error)
      toast({
        title: "Analysis Failed",
        description: "There was an error during analysis. Please try again.",
        variant: "destructive",
      })
      setAnalysisStatus("idle")
      setAnalysisProgress(0)
      setCurrentStep("Idle")
    } finally {
      setIsAnalyzing(false)
    }
  }, [files, uploadMethod, code, fetchedSource, toast])
  
  const canAnalyze =
    (uploadMethod === "file" && files.length > 0) ||
    (uploadMethod === "editor" && code.trim().length > 0) ||
    (uploadMethod === "address" && fetchedSource.trim().length > 0) ||
    (uploadMethod === "github" && code.trim().length > 0)

  return (
    <div className="space-y-6">
      <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="github" className="flex items-center gap-2">
            <Github className="w-4 h-4" /> 
            Connect via GitHub
          </TabsTrigger>
           <TabsTrigger value="address" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Connect via Contract
          </TabsTrigger>
          <TabsTrigger value="file" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            Code Editor
          </TabsTrigger>
         
          
        </TabsList>

        {/* File Upload Tab */}
        <TabsContent value="file" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Solidity Files
              </CardTitle>
              <CardDescription>Drag and drop your .sol files or click to browse. Multiple files supported.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-lg mb-2">Drag & drop Solidity files here</p>
                    <p className="text-muted-foreground">or click to select files</p>
                  </div>
                )}
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Label className="text-sm font-medium">Uploaded Files:</Label>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {(file.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Editor Tab */}
        <TabsContent value="editor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Solidity Code Editor
              </CardTitle>
              <CardDescription>Paste your Solidity code directly with syntax highlighting and error detection.</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeEditor value={code} onChange={setCode} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Fetch Contract Source
              </CardTitle>
              <CardDescription>Enter a deployed contract address to fetch its verified source code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Contract Address" value={addressInput} onChange={(e) => setAddressInput(e.target.value)} />
              <select
                value={addressNetwork}
                onChange={(e) => setAddressNetwork(e.target.value)}
                className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="mainnet">Mainnet</option>
                <option value="goerli">Goerli</option>
                <option value="sepolia">Sepolia</option>
              </select>
              <Button onClick={handleFetchSource} disabled={loadingAddressFetch} className="w-full">
                {loadingAddressFetch ? "Fetching..." : "Fetch Source"}
              </Button>

              {fetchResult && (
                <div className="p-3 rounded-lg border border-border bg-muted">
                  {fetchResult.ok ? (
                    <p>
                      ✅ Source found on: <strong>{fetchResult.foundOn}</strong>
                    </p>
                  ) : (
                    <p className="text-red-400">❌ {fetchResult.error}</p>
                  )}
                </div>
              )}

              <textarea
                placeholder="Fetched Solidity source will appear here..."
                value={fetchedSource}
                readOnly
                className="w-full p-3 rounded-lg border border-border bg-muted text-sm font-mono"
                rows={12}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GitHub Tab */}
        <TabsContent value="github" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connect via GitHub Repository</CardTitle>
              <CardDescription>
                Enter a GitHub repository URL to analyze all Solidity files. Click on any file to load it into the editor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub Repository URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="github-url"
                    placeholder="https://github.com/username/repository"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={fetchGithubRepo} 
                    disabled={loadingRepo || !githubUrl}
                  >
                    {loadingRepo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Fetch Repository'
                    )}
                  </Button>
                </div>
              </div>

              {repoFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Solidity Files Found ({repoFiles.length})</h3>
                    {selectedFile && (
                      <Badge variant="secondary">
                        Selected: {repoFiles.find(f => f.path === selectedFile)?.name}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid gap-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                    {repoFiles.map((file, index) => (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFile === file.path 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleFileSelect(file.path)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{file.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {file.path.split('/').length - 1 > 0 ? 'Nested' : 'Root'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          Path: {file.path}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setRepoFiles([]);
                      setSelectedFile('');
                      setGithubUrl('');
                    }}
                    className="w-full"
                  >
                    Clear Repository
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Ready to analyze</p>
                <p className="text-xs text-muted-foreground">
                  Analysis typically takes 15-30 seconds depending on contract complexity
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={!canAnalyze || isAnalyzing}
              className="w-full sm:w-auto"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}