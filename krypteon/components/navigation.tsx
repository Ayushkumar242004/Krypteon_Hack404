"use client"

import { Button } from "../components/ui/button"
import { Shield, Menu, X } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-1">
            <img src="/logo.png" alt="Krypteon" className="h-12 w-12" />
            <span className="text-xl font-bold text-foreground">Krypteon</span>
          </Link>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </Link>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#docs" className="text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </a>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-border">
              <Link href="/#features" className="block px-3 py-2 text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link href="/#how-it-works" className="block px-3 py-2 text-muted-foreground hover:text-foreground">
                How it Works
              </Link>
              <a href="#pricing" className="block px-3 py-2 text-muted-foreground hover:text-foreground">
                Pricing
              </a>
              <a href="#docs" className="block px-3 py-2 text-muted-foreground hover:text-foreground">
                Docs
              </a>
              <div className="flex flex-col space-y-2 px-3 pt-4">
                <Link href="/auth">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
