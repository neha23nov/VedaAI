'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  X,
  ChevronRight,
  Bell,
  User,
  Loader2,
  Sparkles,
} from 'lucide-react'

type FileInfo = {
  file: File
  preview?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// ──────────────────────────────────────────────────────────────────────────────
// Upload Card
// ──────────────────────────────────────────────────────────────────────────────

interface UploadCardProps {
  title: string
  subtitle: string
  value: FileInfo | null
  onChange: (f: FileInfo | null) => void
  disabled?: boolean
  accent?: boolean
}

function UploadCard({ title, subtitle, value, onChange, disabled, accent }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setError(null)
    if (!ACCEPTED.includes(file.type)) {
      setError('Only PDF and image files are accepted')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Max file size is 50 MB')
      return
    }
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => onChange({ file, preview: e.target?.result as string })
      reader.readAsDataURL(file)
    } else {
      onChange({ file })
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (!disabled) handleFile(e.dataTransfer.files[0])
    },
    [disabled]
  )

  return (
    <div className="flex flex-col gap-1.5">
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !disabled && !value && inputRef.current?.click()}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-200 bg-white
          ${isDragging ? 'border-orange-400 bg-orange-50/40' : 'border-gray-200'}
          ${value ? 'border-solid border-gray-200 cursor-default' : 'cursor-pointer hover:border-gray-300'}
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
        style={{ minHeight: 160 }}
      >
        {!value ? (
          <div className="flex flex-col items-center justify-center h-full p-8 gap-3 text-center" style={{ minHeight: 160 }}>
            {/* upload icon circle */}
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center
              ${accent ? 'border-orange-400 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}>
              <Upload className={`w-5 h-5 ${accent ? 'text-orange-500' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${accent ? 'text-orange-500' : 'text-gray-600'}`}>
                {title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 flex items-center gap-3">
            {/* file icon */}
            <div className="w-12 h-14 rounded-lg bg-red-50 border border-red-100 flex flex-col items-center justify-center gap-1 flex-shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
              <span className="text-[9px] font-bold text-red-500 uppercase">
                {value.file.type.includes('pdf') ? 'PDF' : 'IMG'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{value.file.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{formatSize(value.file.size)}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium uppercase">
                  {value.file.type.includes('pdf') ? 'PDF' : value.file.type.split('/')[1]}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 px-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="sr-only"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Loading / Extracting Overlay
// ──────────────────────────────────────────────────────────────────────────────

function ExtractingOverlay() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center gap-5">
      <div className="relative">
        {/* sparkle effects */}
        <div className="absolute -top-6 -right-4 text-orange-400 animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="absolute -bottom-4 -left-6 text-pink-400 animate-pulse">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="absolute -top-3 -left-8 text-orange-300 animate-bounce" style={{ animationDelay: '0.3s' }}>
          <Sparkles className="w-5 h-5" />
        </div>

        {/* logo */}
        <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center shadow-xl">
          <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6L12 2z"
              fill="#F97316" opacity="0.9" />
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900">Extracting...</p>
        <p className="text-sm text-gray-400 mt-1">This may take a while</p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Upload Page
// ──────────────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const [questionPaper, setQuestionPaper] = useState<FileInfo | null>(null)
  const [answerSheet, setAnswerSheet] = useState<FileInfo | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canProcess = questionPaper !== null && answerSheet !== null && !processing

  const handleProcess = async () => {
    if (!canProcess) return
    setError(null)
    setProcessing(true)

    try {
      const formData = new FormData()
      formData.append('questionPaper', questionPaper.file)
      formData.append('answerSheet', answerSheet.file)

      const res = await fetch('/api/process', { method: 'POST', body: formData })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? 'Processing failed')
      }

      const result = await res.json()
      sessionStorage.setItem(`result_${result.sessionId}`, JSON.stringify(result))
      router.push(`/results/${result.sessionId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setProcessing(false)
    }
  }

  if (processing) return <ExtractingOverlay />

  return (
    <>
      {/* Top bar */}
      <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
        <nav className="text-sm text-gray-400 flex items-center gap-1">
          <span>Exams</span>
          <span>/</span>
          <span className="text-gray-700 font-medium">Upload</span>
        </nav>
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex items-start justify-center py-12 px-6">
        <div className="w-full max-w-2xl">
          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Upload{' '}
              <span className="text-orange-500">Question Paper &amp; Answer Sheets</span>
            </h1>
            <p className="text-sm text-gray-400 mt-2">Upload both files to get started</p>
          </div>

          {/* Upload cards */}
          <div className="grid grid-cols-2 gap-4">
            <UploadCard
              title="Upload Question Paper"
              subtitle="PDF or image"
              value={questionPaper}
              onChange={setQuestionPaper}
              disabled={processing}
              accent
            />
            <UploadCard
              title="Upload Answer Sheet"
              subtitle="PDF or image"
              value={answerSheet}
              onChange={setAnswerSheet}
              disabled={processing}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Bottom row */}
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              Once you upload both files, you can start the extraction and grading process.
            </p>
            <button
              onClick={handleProcess}
              disabled={!canProcess}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${canProcess
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              Start Processing
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
