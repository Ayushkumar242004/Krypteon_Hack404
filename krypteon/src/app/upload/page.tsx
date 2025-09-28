import { Navigation } from "../../../components/navigation"
import { UploadInterface } from "../../../components/upload-interface"

export default function UploadPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-balance mb-4">Upload Smart Contract</h1>
            <p className="text-xl text-muted-foreground text-balance">
              Upload your Solidity files or paste code directly for AI-powered security analysis
            </p>
          </div>
          <UploadInterface />
        </div>
      </div>
    </main>
  )
}
