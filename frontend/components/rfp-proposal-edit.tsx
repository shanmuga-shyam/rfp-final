"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Sparkles, FileText, Download, Eye, Maximize2, Minimize2 } from "lucide-react"

interface RFPProposalEditProps {
  rfpId: number
  token: string
  pdfUrl: string
  filename: string
  onFinal: (result: string) => void
  generatedResponse?: any
}

function splitSections(text: string): { title: string; content: string }[] {
  const sectionRegex = /(^#+ .+|^\d+\..+|^\*\*.+\*\*.*$)/gm
  const matches = [...text.matchAll(sectionRegex)]
  if (!matches.length) return [{ title: "Full Text", content: text }]
  const sections = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!
    const end = matches[i + 1]?.index ?? text.length
    const title = matches[i][0]
      .replace(/^#+\s*/, "")
      .replace(/^\*\*|\*\*$/g, "")
      .trim()
    const content = text.slice(start, end).trim()
    sections.push({ title, content })
  }
  return sections
}

const RFPProposalEdit: React.FC<RFPProposalEditProps> = ({
  rfpId,
  token,
  pdfUrl,
  filename,
  onFinal,
  generatedResponse,
}) => {
  const [mode, setMode] = useState<"generated" | "extracted" | null>(null)
  const [sections, setSections] = useState<{ title: string; content: string }[]>([])
  const [originalSections, setOriginalSections] = useState<{ title: string; content: string }[]>([])
  const [sectionEdits, setSectionEdits] = useState<string[]>([])
  const [llmLoading, setLlmLoading] = useState(false)
  const [llmError, setLlmError] = useState<string | null>(null)
  const [llmResult, setLlmResult] = useState<string | null>(null)
  const [finalLoading, setFinalLoading] = useState(false)
  const [finalError, setFinalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState<string>("")
  const [downloadUrls, setDownloadUrls] = useState<{ pdf?: string; docx?: string }>({})
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        if (generatedResponse) {
          const split = splitSections(generatedResponse)
          setSections(split)
          setOriginalSections(split)
          setSectionEdits(split.map((s) => s.content))
          setMode("generated")
          setLoading(false)
          return
        }
        const genRes = await fetch(`http://localhost:8000/api/employee/rfps/${rfpId}/response`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (genRes.ok) {
          const data = await genRes.json()
          if (data.response) {
            const split = splitSections(data.response)
            setSections(split)
            setOriginalSections(split)
            setSectionEdits(split.map((s) => s.content))
            setMode("generated")
            setLoading(false)
            return
          }
        }
        const extRes = await fetch(`http://localhost:8000/api/employee/rfps/${rfpId}/extract-file-text`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!extRes.ok) {
          const data = await extRes.json().catch(() => ({}))
          throw new Error(data.detail || "Failed to extract file text")
        }
        const data = await extRes.json()
        const split = splitSections(data.text || "")
        setSections(split)
        setOriginalSections(split)
        setSectionEdits(split.map((s) => s.content))
        setMode("extracted")
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [rfpId, token, generatedResponse])

  const handleSectionEdit = (idx: number, value: string) => {
    setSectionEdits((edits) => edits.map((e, i) => (i === idx ? value : e)))
  }

  const handleSave = () => {
    setSections(sections.map((s, i) => ({ ...s, content: sectionEdits[i] })))
    setLlmResult(null)
  }

  const handleLLM = async () => {
    setLlmLoading(true)
    setLlmError(null)
    setLlmResult(null)

    try {
      const combined = sections.map((s, i) => sectionEdits[i]).join("\n\n")
      const promptToSend = customPrompt || "Refine and improve the following text for clarity and conciseness."

      const formData = new FormData()
      formData.append("text", combined)
      formData.append("changes", promptToSend)

      const res = await fetch(`http://localhost:8000/api/employee/final_rfp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to get LLM response")
      }

      const data = await res.json()
      const llmText = (data && (data.prompt || data.result)) || JSON.stringify(data) || "No response"
      setLlmResult(llmText)
      if (llmText && llmText !== "No response") {
        const split = splitSections(llmText)
        setSections(split)
        setSectionEdits(split.map((s) => s.content))
      }
    } catch (err: any) {
      setLlmError(err.message)
    } finally {
      setLlmLoading(false)
    }
  }

  const handleFinalProcess = async () => {
    setFinalLoading(true)
    setFinalError(null)
    try {
      const proposal = llmResult || sections.map((s, i) => sectionEdits[i]).join("\n\n")
      const formData = new FormData()

      formData.append("text", proposal)
      formData.append("rfp_id", rfpId.toString())

      const res = await fetch(`http://localhost:8000/api/employee/ok`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to generate final proposal")
      }
      const data = await res.json()
      setDownloadUrls({ pdf: data.pdf_url, docx: data.docx_url })
      onFinal({ ...data, rfp_id: rfpId })
    } catch (err: any) {
      setFinalError(err.message)
    } finally {
      setFinalLoading(false)
    }
  }

  const handleViewPDF = () => {
    if (downloadUrls.pdf) {
      window.open(downloadUrls.pdf, "_blank")
    }
  }

  const handleDownloadDocx = () => {
    if (downloadUrls.docx) {
      const link = document.createElement("a")
      link.href = downloadUrls.docx
      link.download = `${rfpId}_proposal.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
          <p className="text-lg font-semibold text-slate-700">Loading proposal...</p>
        </div>
      </div>
    )
  }

  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-95 flex flex-col">
        {/* Fullscreen Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Proposal Content - Fullscreen Edit</h2>
          <button
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
            <span>Exit Fullscreen</span>
          </button>
        </div>

        {/* Fullscreen Editor */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <textarea
            className="flex-1 w-full border border-slate-600 rounded-lg p-6 text-sm bg-slate-800 text-white focus:bg-slate-750 focus:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none"
            value={sectionEdits.join("\n\n")}
            onChange={(e) => setSectionEdits([e.target.value])}
            placeholder="Your proposal content will appear here..."
          />
        </div>

        {/* Fullscreen Footer */}
        <div className="bg-slate-800 border-t border-slate-700 px-8 py-4 flex justify-between items-center">
          <p className="text-sm text-slate-400">Character count: {sectionEdits.join("\n\n").length}</p>
          <button
            onClick={() => setIsFullscreen(false)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {mode === "generated" ? "Edit Generated Response" : "Edit Extracted RFP Text"}
          </h1>
          <p className="text-slate-600">Refine and optimize your proposal content</p>
        </div>

        {pdfUrl && (
          <div className="mb-8 bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200">
            <div className="bg-slate-100 px-6 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-700">RFP Document Preview</h3>
            </div>
            <iframe src={pdfUrl} title="RFP PDF Preview" width="100%" height="500px" style={{ border: "none" }} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Response Data */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200 flex flex-col">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Proposal Content
                  </span>
                </label>
                <p className="text-xs text-slate-500 mb-3">Edit your proposal text below</p>
              </div>
              {/* Fullscreen Toggle Button */}
              <button
                onClick={() => setIsFullscreen(true)}
                className="ml-4 p-2 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors flex-shrink-0"
                title="Expand to fullscreen"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
            <textarea
              className="flex-1 w-full border border-slate-300 rounded-lg p-4 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none resize-none"
              value={sectionEdits.join("\n\n")}
              onChange={(e) => setSectionEdits([e.target.value])}
              placeholder="Your proposal content will appear here..."
            />
          </div>

          {/* Prompt Input */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200 flex flex-col">
            <div className="mb-4">
              <label htmlFor="prompt-box" className="block text-sm font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  AI Enhancement Prompt
                </span>
              </label>
              <p className="text-xs text-slate-500 mb-3">Describe how you want AI to refine your content</p>
            </div>
            <Input
              id="prompt-box"
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Make it more concise, improve clarity, add technical details..."
              className="flex-1 mb-4 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm h-12"
              disabled={llmLoading}
            />
            {/* <p className="text-xs text-slate-500">{customPrompt.length} characters</p> */}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* LLM Button */}
          <button
            onClick={handleLLM}
            disabled={llmLoading || !customPrompt}
            className={`relative overflow-hidden group rounded-xl p-6 transition-all duration-300 ${
              llmLoading || !customPrompt
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-lg hover:shadow-amber-200 hover:scale-105"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3">
                {llmLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              </div>
              <h3 className="font-bold text-sm mb-1">Enhance with AI</h3>
              <p className="text-xs opacity-90">Refine your content</p>
            </div>
          </button>

          {/* Update Button */}
          <button
            onClick={handleFinalProcess}
            disabled={finalLoading}
            className={`relative overflow-hidden group rounded-xl p-6 transition-all duration-300 ${
              finalLoading
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-200 hover:scale-105"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3">
                {finalLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
              </div>
              <h3 className="font-bold text-sm mb-1">Generate Files</h3>
              <p className="text-xs opacity-90">Create PDF & Word</p>
            </div>
          </button>

          {/* View PDF Button */}
          <button
            onClick={handleViewPDF}
            disabled={!downloadUrls.pdf}
            className={`relative overflow-hidden group rounded-xl p-6 transition-all duration-300 ${
              downloadUrls.pdf
                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-200 hover:scale-105"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm mb-1">View PDF</h3>
              <p className="text-xs opacity-90">Preview document</p>
            </div>
          </button>

          {/* Download Word Button */}
          <button
            onClick={handleDownloadDocx}
            disabled={!downloadUrls.docx}
            className={`relative overflow-hidden group rounded-xl p-6 transition-all duration-300 ${
              downloadUrls.docx
                ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-200 hover:scale-105"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm mb-1">Download Word</h3>
              <p className="text-xs opacity-90">Export as .docx</p>
            </div>
          </button>
        </div>

        {llmError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800">Error enhancing content</p>
            <p className="text-sm text-red-600 mt-1">{llmError}</p>
          </div>
        )}

        {finalError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800">Error generating files</p>
            <p className="text-sm text-red-600 mt-1">{finalError}</p>
          </div>
        )}

        {(llmResult || downloadUrls.pdf || downloadUrls.docx) && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-800">✓ Ready to download</p>
            <p className="text-sm text-green-600 mt-1">Your proposal files have been generated successfully</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RFPProposalEdit
