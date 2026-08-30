'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Bell,
  Home,
  XCircle,
} from 'lucide-react'
import type { ProcessingResult, MappedAnswer, GradingResult, Question } from '@/types'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function marksBadgeStyle(marksAwarded: number, marksTotal: number) {
  const pct = marksTotal > 0 ? marksAwarded / marksTotal : 0
  if (pct >= 1) return 'bg-green-100 text-green-700'
  if (pct >= 0.5) return 'bg-yellow-100 text-yellow-700'
  if (pct > 0) return 'bg-orange-100 text-orange-700'
  return 'bg-red-50 text-red-500'
}

function questionCircleStyle(status: string, isSelected: boolean, isCorrect: boolean | null) {
  if (isSelected) return 'bg-orange-500 text-white'
  if (status === 'unanswered') return 'bg-gray-200 text-gray-500'
  if (isCorrect === true) return 'bg-green-500 text-white'
  if (isCorrect === false) return 'bg-red-400 text-white'
  return 'bg-gray-300 text-gray-600'
}

// ──────────────────────────────────────────────────────────────────────────────
// Question List Panel (left)
// ──────────────────────────────────────────────────────────────────────────────

interface QuestionPanelProps {
  result: ProcessingResult
  selectedId: string | null
  onSelect: (id: string) => void
}

function QuestionPanel({ result, selectedId, onSelect }: QuestionPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const answerMap = new Map(result.mappedAnswers.map((a) => [a.questionId, a]))
  const gradingMap = new Map(result.grading.map((g) => [g.questionId, g]))

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expandAll() {
    setExpandedIds(new Set(result.questions.map((q) => q.id)))
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-semibold text-gray-700 leading-tight">
          Extracted Questions
          <span className="block text-gray-400 font-normal">(from question paper)</span>
        </h2>
        <button
          onClick={expandAll}
          className="text-xs text-orange-500 hover:text-orange-600 font-medium flex-shrink-0"
        >
          Expand All
        </button>
      </div>

      {/* Score bar */}
      <div className="px-4 py-2.5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-500">Total Score</span>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${marksBadgeStyle(result.obtainedMarks, result.totalMarks)}`}>
          {result.obtainedMarks}/{result.totalMarks}
        </div>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto">
        {result.questions.map((q, idx) => {
          const ans = answerMap.get(q.id)
          const grade = gradingMap.get(q.id)
          const isSelected = selectedId === q.id
          const isExpanded = expandedIds.has(q.id)
          const status = ans?.status ?? 'unanswered'

          return (
            <div
              key={q.id}
              className={`
                border-b border-gray-50 transition-colors
                ${isSelected ? 'bg-orange-50 border-l-2 border-l-orange-400' : 'border-l-2 border-l-transparent'}
              `}
            >
              {/* Question row */}
              <div
                onClick={() => { onSelect(q.id); toggleExpand(q.id) }}
                className="flex items-start gap-2.5 px-4 py-3 cursor-pointer"
              >
                {/* numbered circle */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5
                  ${questionCircleStyle(status, isSelected, grade?.isCorrect ?? null)}
                `}>
                  {idx + 1}
                </div>

                {/* question text */}
                <p className={`flex-1 text-xs leading-relaxed line-clamp-2 ${isSelected ? 'text-gray-800' : 'text-gray-600'}`}>
                  {q.text}
                </p>

                {/* right side: marks + chevron */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {grade && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${marksBadgeStyle(grade.marksAwarded, grade.marksTotal)}`}>
                      {grade.marksAwarded}/{grade.marksTotal}
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronUp className="w-3 h-3 text-gray-400" />
                    : <ChevronDown className="w-3 h-3 text-gray-400" />
                  }
                </div>
              </div>

              {/* Expanded: AI Feedback */}
              {isExpanded && grade?.feedback && (
                <div className="mx-4 mb-3 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-orange-700 mb-1">AI Feedback</p>
                  <p className="text-[11px] text-orange-800 leading-relaxed">{grade.feedback}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Answer Sheet Viewer (right)
// ──────────────────────────────────────────────────────────────────────────────

interface AnswerViewerProps {
  answerSheetFile: ProcessingResult['answerSheetFile']
  selectedAnswer: MappedAnswer | null
  allAnswers: MappedAnswer[]
  questions: Question[]
  selectedQuestion: Question | null
}

function AnswerViewer({
  answerSheetFile,
  selectedAnswer,
  allAnswers,
  questions,
  selectedQuestion,
}: AnswerViewerProps) {
  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => { renderSheet() }, [answerSheetFile])

  useEffect(() => {
    if (selectedAnswer?.regions[0]) {
      setCurrentPage(selectedAnswer.regions[0].page)
    }
  }, [selectedAnswer])

  async function renderSheet() {
    setLoading(true)
    try {
      const { data, mimeType } = answerSheetFile
      if (mimeType.startsWith('image/')) {
        setPages([`data:${mimeType};base64,${data}`])
        setLoading(false)
        return
      }

      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs'

      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
      const pdf = await pdfjs.getDocument({ data: bytes }).promise
      const rendered: string[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const vp = page.getViewport({ scale: 1.8 })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width
        canvas.height = vp.height
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
        rendered.push(canvas.toDataURL('image/jpeg', 0.92))
      }

      setPages(rendered)
    } catch {
      const { data, mimeType } = answerSheetFile
      setPages([`data:${mimeType};base64,${data}`])
    }
    setLoading(false)
  }

  const pageImage = pages[currentPage]

  // all answered questions on the current page (not just selected)
  const allPageHighlights = allAnswers
    .filter((a) => a.status === 'answered')
    .flatMap((a) =>
      a.regions
        .filter((r) => r.page === currentPage)
        .map((r) => ({ region: r, answerId: a.questionId }))
    )

  // selected answer regions on this page
  const selectedRegions = selectedAnswer?.regions.filter((r) => r.page === currentPage) ?? []

  // helper to get question number from id
  function getQNum(qId: string) {
    const q = questions.find((q) => q.id === qId)
    return q?.number ?? '?'
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Viewer header */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-semibold text-gray-700">Answer Sheet</span>

        <div className="flex items-center gap-2">
          {/* zoom */}
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-500 w-9 text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* page nav */}
          {pages.length > 1 && (
            <div className="flex items-center gap-1 ml-2 border-l border-gray-100 pl-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">
                Page {currentPage + 1} of {pages.length}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                disabled={currentPage === pages.length - 1}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image area */}
      <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-24 text-gray-400">
            <div className="flex gap-1">
              {[0, 0.15, 0.3].map((d, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-gray-300 bounce-dot"
                  style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
            <p className="text-sm">Rendering answer sheet...</p>
          </div>
        ) : pageImage ? (
          <div className="relative inline-block shadow-lg rounded-lg overflow-hidden" style={{ lineHeight: 0 }}>
            <img
              src={pageImage}
              alt={`Answer sheet page ${currentPage + 1}`}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'block' }}
              className="max-w-none"
            />

            {/* All answered question highlights (green, dimmer) */}
            {allPageHighlights
              .filter((h) => h.answerId !== selectedAnswer?.questionId)
              .map((h, i) => (
                <div
                  key={`bg-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${h.region.bbox.x}%`,
                    top: `${h.region.bbox.y}%`,
                    width: `${h.region.bbox.w}%`,
                    height: `${h.region.bbox.h}%`,
                  }}
                >
                  {/* Q label */}
                  <div className="absolute -left-7 top-0">
                    <span className="text-[10px] font-bold bg-green-500 text-white px-1 py-0.5 rounded">
                      Q{getQNum(h.answerId)}
                    </span>
                  </div>
                  {/* box */}
                  <div className="w-full h-full border-2 border-green-400 bg-green-400/10 rounded" />
                </div>
              ))}

            {/* Selected answer highlight (orange, prominent) */}
            {selectedRegions.map((region, i) => (
              <div
                key={`sel-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${region.bbox.x}%`,
                  top: `${region.bbox.y}%`,
                  width: `${region.bbox.w}%`,
                  height: `${region.bbox.h}%`,
                }}
              >
                {/* Q label */}
                <div className="absolute -left-7 top-0">
                  <span className="text-[10px] font-bold bg-orange-500 text-white px-1 py-0.5 rounded">
                    Q{selectedQuestion?.number ?? '?'}
                  </span>
                </div>
                {/* box */}
                <div className="w-full h-full border-2 border-orange-400 bg-orange-400/15 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-16">No page to display</p>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Results Page
// ──────────────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // mobile tab state
  const [mobileTab, setMobileTab] = useState<'questions' | 'sheet'>('questions')

  useEffect(() => {
    const stored = sessionStorage.getItem(`result_${sessionId}`)
    if (!stored) { setError('Result not found. Go back and process the files again.'); return }
    try {
      const parsed = JSON.parse(stored) as ProcessingResult
      setResult(parsed)
      if (parsed.questions.length > 0) setSelectedId(parsed.questions[0].id)
    } catch {
      setError('Failed to load results.')
    }
  }, [sessionId])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
            <Home className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 0.15, 0.3].map((d, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-orange-400 bounce-dot"
              style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    )
  }

  const selectedAnswer = result.mappedAnswers.find((a) => a.questionId === selectedId) ?? null
  const selectedQuestion = result.questions.find((q) => q.id === selectedId) ?? null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Top bar */}
      <header className="h-11 bg-white border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Exams</span>
        </button>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
        </div>
      </header>

      {/* Mobile tab switcher */}
      <div className="md:hidden bg-white border-b border-gray-100 flex px-4 py-2 gap-2 flex-shrink-0">
        {(['questions', 'sheet'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize
              ${mobileTab === tab
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
          >
            {tab === 'questions' ? 'Questions' : 'Answer Sheet'}
          </button>
        ))}
      </div>

      {/* Main split panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: questions */}
        <div className={`
          w-full md:w-[380px] md:flex-shrink-0 flex flex-col overflow-hidden
          ${mobileTab === 'sheet' ? 'hidden md:flex' : 'flex'}
        `}>
          <QuestionPanel
            result={result}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); setMobileTab('sheet') }}
          />
        </div>

        {/* Right: answer sheet */}
        <div className={`
          flex-1 flex flex-col overflow-hidden
          ${mobileTab === 'questions' ? 'hidden md:flex' : 'flex'}
        `}>
          <AnswerViewer
            answerSheetFile={result.answerSheetFile}
            selectedAnswer={selectedAnswer}
            allAnswers={result.mappedAnswers}
            questions={result.questions}
            selectedQuestion={selectedQuestion}
          />
        </div>
      </div>
    </div>
  )
}
