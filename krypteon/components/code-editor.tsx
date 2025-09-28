"use client"

import type React from "react"

import { useEffect, useRef } from "react"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  height?: string
}

export function CodeEditor({ value, onChange, language = "solidity", height = "400px" }: CodeEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.height = height
    }
  }, [height])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newValue = value.substring(0, start) + "  " + value.substring(end)
      onChange(newValue)

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={editorRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    // Your Solidity code here
}"
        className="w-full p-4 font-mono text-sm bg-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        style={{ height, minHeight: "200px" }}
      />
      <div className="absolute top-2 right-2">
        <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">Solidity</div>
      </div>
    </div>
  )
}
