"use client"

import { Navigation } from "../../../components/navigation"
import { ResultsReporting } from "../../../components/results-reporting"
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ResultsPage() {
  const searchParams = useSearchParams()
  // const resultParam = searchParams.get('result') // No longer needed
  const [analysisData, setAnalysisData] = useState(null)
  const [contractName, setContractName] = useState("N/A") // Added state for contract name
  const [analysisTime, setAnalysisTime] = useState("N/A"); // Add state for analysis time

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedResult = sessionStorage.getItem('analysisResult')
      const storedContractName = sessionStorage.getItem('contractName') // Retrieve contract name
      const storedAnalysisTime = sessionStorage.getItem('analysisTime'); // Retrieve analysis time
      if (storedResult) {
        try {
          const parsedData = JSON.parse(storedResult)
          setAnalysisData(parsedData)
          console.log("Parsed Analysis Data from Session Storage:", parsedData)
        } catch (error) {
          console.error("Error parsing analysis data from session storage:", error)
        }
      }
      if (storedContractName) {
        setContractName(storedContractName) // Set contract name state
      }
      if (storedAnalysisTime) {
        setAnalysisTime(storedAnalysisTime); // Set analysis time state
      }
    }
  }, [])

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ResultsReporting analysisData={analysisData} contractName={contractName} analysisTime={analysisTime} /> {/* Pass analysisTime */}
      </div>
    </main>
  )
}
