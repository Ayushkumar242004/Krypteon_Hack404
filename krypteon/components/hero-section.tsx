"use client"

import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { ArrowRight, Upload, Shield, Zap } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background min-h-screen flex items-center">
      {/* Central static logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/logo.png"
          alt="Krypteon Logo"
          width={200} // Set a fixed width
          height={200} // Set a fixed height
          className="opacity-60 drop-shadow-lg"
          priority
        />
      </div>

      {/* Content with better visibility */}
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 z-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge 
            variant="secondary" 
            className="mb-6 text-sm font-medium bg-primary/10 border-primary/20 text-foreground backdrop-blur-sm"
          >
            <Zap className="w-3 h-3 mr-1" />
            AI-Powered Security Analysis
          </Badge>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-balance mb-6 text-foreground drop-shadow-sm">
            Upload & Audit Your{" "}
            <span className="text-primary relative">
              Smart Contracts
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary/30" />
            </span>{" "}
            with AI
          </h1>

          {/* Description */}
          <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto leading-relaxed backdrop-blur-sm bg-background/30 rounded-lg px-4 py-2">
            Advanced AI detection for vulnerabilities, inefficiencies, and best practices. 
            Secure your Web3 projects with comprehensive smart contract analysis.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/upload">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 h-auto bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-300 shadow-lg backdrop-blur-sm border-none"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Contract & Scan
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 h-auto bg-background/70 backdrop-blur-sm border-border hover:bg-accent hover:border-primary text-foreground"
            >
              <Shield className="w-5 h-5 mr-2" />
              View Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto backdrop-blur-sm bg-background/30 rounded-2xl p-6">
            {[{
                 value: "99.9%", label: "Vulnerability Detection"
               },
               { value: "<30s", label: "Analysis Time" },
               { value: "10K+", label: "Contracts Audited" }
             ].map((stat, index) => (
               <div key={index} className="text-center group">
                 <div className="text-3xl font-bold text-primary mb-2 transition-transform duration-300">
                   {stat.value}
                 </div>
                 <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </section>
  )
}