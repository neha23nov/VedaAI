// core types used across the app

export interface Question {
  id: string         // unique id we generate, e.g. "q1", "q2a", "q2b"
  number: string     // exactly as printed: "1", "2 (a)", "Q3", etc.
  text: string
  marks: number
}

// bounding box as percentages (0–100) of the page dimensions
export interface BBox {
  x: number  // left edge from page left
  y: number  // top edge from page top
  w: number  // width
  h: number  // height
}

export interface AnswerRegion {
  page: number  // 0-indexed page number in the answer sheet
  bbox: BBox
}

export type AnswerStatus = 'answered' | 'unanswered' | 'unmatched'

export interface MappedAnswer {
  questionId: string
  rawText: string        // best-effort OCR of the student's handwriting
  regions: AnswerRegion[] // can span multiple pages
  status: AnswerStatus
}

export interface GradingResult {
  questionId: string
  marksAwarded: number
  marksTotal: number
  isCorrect: boolean | null  // null means not attempted
  feedback: string
}

// what the raw Gemini answer extraction returns before we map it
export interface RawExtractedAnswer {
  questionNumber: string
  text: string
  page: number
  bbox: BBox
}

export interface ProcessingResult {
  sessionId: string
  questions: Question[]
  mappedAnswers: MappedAnswer[]
  grading: GradingResult[]
  totalMarks: number
  obtainedMarks: number
  // the raw answer sheet file so the browser can render it
  answerSheetFile: {
    data: string      // base64
    mimeType: string
    pageCount: number
  }
}
