/**
 * pipeline.ts — glues everything together
 *
 * Takes the raw file buffers, runs them through Gemini, maps answers
 * to questions, grades them, and returns a clean result object.
 */

import { v4 as uuidv4 } from 'uuid'
import { extractQuestions, extractAnswers, gradeAnswers } from './gemini'
import type {
  Question,
  RawExtractedAnswer,
  MappedAnswer,
  ProcessingResult,
  AnswerRegion,
} from '@/types'

// how many pages we tell Gemini the document has
// (we count this from the PDF metadata separately via client)
async function estimatePageCount(buffer: Buffer, mimeType: string): Promise<number> {
  if (!mimeType.includes('pdf')) return 1

  // quick and dirty: count "Page" markers in the PDF byte stream
  // not 100% accurate but good enough for our purposes
  const text = buffer.toString('latin1')
  const matches = text.match(/\/Type\s*\/Page\b/g)
  return matches ? matches.length : 1
}

/**
 * The fun part — matching raw extracted answers to questions.
 *
 * This handles:
 * - Out-of-order answers (student answered Q3 before Q1)
 * - Multi-page answers (same question answered across pages)
 * - Unanswered questions
 * - Unmatched answers (can't figure out which question they belong to)
 */
function mapAnswersToQuestions(
  questions: Question[],
  rawAnswers: RawExtractedAnswer[]
): MappedAnswer[] {
  const mapped: MappedAnswer[] = []
  const usedQuestions = new Set<string>()

  // group raw answers by questionNumber first
  // (one question might have multiple extracted regions)
  const grouped = new Map<string, RawExtractedAnswer[]>()
  for (const ans of rawAnswers) {
    const key = ans.questionNumber.trim()
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(ans)
  }

  // try to match each group to a question in our list
  for (const [qNum, answers] of grouped) {
    if (qNum === 'unmatched') continue

    // find the question — try a few matching strategies
    const question = findQuestion(questions, qNum)

    if (!question) {
      // couldn't match this answer to any question
      mapped.push({
        questionId: `unmatched_${qNum}`,
        rawText: answers.map((a) => a.text).join('\n\n'),
        regions: answers.map((a) => ({
          page: a.page,
          bbox: a.bbox,
        })),
        status: 'unmatched',
      })
      continue
    }

    usedQuestions.add(question.id)

    const regions: AnswerRegion[] = answers.map((a) => ({
      page: a.page,
      bbox: a.bbox,
    }))

    mapped.push({
      questionId: question.id,
      rawText: answers.map((a) => a.text).join('\n\n'),
      regions,
      status: 'answered',
    })
  }

  // handle unmatched entries
  const unmatchedRaw = grouped.get('unmatched') ?? []
  if (unmatchedRaw.length > 0) {
    mapped.push({
      questionId: 'unmatched_misc',
      rawText: unmatchedRaw.map((a) => a.text).join('\n\n'),
      regions: unmatchedRaw.map((a) => ({ page: a.page, bbox: a.bbox })),
      status: 'unmatched',
    })
  }

  // fill in unanswered questions — anything in the question list with no match
  for (const q of questions) {
    if (!usedQuestions.has(q.id)) {
      mapped.push({
        questionId: q.id,
        rawText: '',
        regions: [],
        status: 'unanswered',
      })
    }
  }

  return mapped
}

/**
 * Tries to find a question given a raw question number string from the answer sheet.
 * Students write things like "Q1", "1.", "2a", "Ans 3 (b)" — we handle all of these.
 */
function findQuestion(questions: Question[], rawNum: string): Question | undefined {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '').trim()

  const target = normalize(rawNum)

  // exact match first
  let match = questions.find((q) => normalize(q.number) === target)
  if (match) return match

  // try stripping leading 'q', 'ans', 'question' prefixes
  const stripped = target.replace(/^(question|q|ans|answer)/, '')
  match = questions.find((q) => normalize(q.number) === stripped)
  if (match) return match

  // try fuzzy: does the question number contain what the student wrote?
  match = questions.find(
    (q) => normalize(q.number).includes(stripped) || stripped.includes(normalize(q.number))
  )
  return match
}

// ──────────────────────────────────────────────────────────────────────────────
// Main pipeline entry point
// ──────────────────────────────────────────────────────────────────────────────

export interface PipelineInput {
  questionPaperBuffer: Buffer
  questionPaperMime: string
  questionPaperName: string
  answerSheetBuffer: Buffer
  answerSheetMime: string
  answerSheetName: string
}

export async function runPipeline(input: PipelineInput): Promise<ProcessingResult> {
  const {
    questionPaperBuffer,
    questionPaperMime,
    questionPaperName,
    answerSheetBuffer,
    answerSheetMime,
    answerSheetName,
  } = input

  console.log(`[pipeline] starting — Q paper: ${questionPaperName}, Answer sheet: ${answerSheetName}`)

  // step 1: extract questions from the question paper
  console.log('[pipeline] extracting questions...')
  const questions = await extractQuestions(
    questionPaperBuffer,
    questionPaperMime,
    questionPaperName
  )
  console.log(`[pipeline] got ${questions.length} questions`)

  // step 2: extract answers from the answer sheet (with bounding boxes)
  console.log('[pipeline] extracting answers...')
  const rawAnswers = await extractAnswers(
    answerSheetBuffer,
    answerSheetMime,
    answerSheetName
  )
  console.log(`[pipeline] got ${rawAnswers.length} answer regions`)

  // step 3: map answers to questions
  console.log('[pipeline] mapping answers to questions...')
  const mappedAnswers = mapAnswersToQuestions(questions, rawAnswers)

  // step 4: grade everything
  console.log('[pipeline] grading...')
  const gradingResults = await gradeAnswers(questions, mappedAnswers)

  // tally up the score
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)
  const obtainedMarks = gradingResults.reduce((sum, r) => sum + r.marksAwarded, 0)

  // count pages for the answer sheet
  const answerSheetPageCount = await estimatePageCount(answerSheetBuffer, answerSheetMime)

  console.log(`[pipeline] done! Score: ${obtainedMarks}/${totalMarks}`)

  return {
    sessionId: uuidv4(),
    questions,
    mappedAnswers,
    grading: gradingResults,
    totalMarks,
    obtainedMarks,
    answerSheetFile: {
      data: answerSheetBuffer.toString('base64'),
      mimeType: answerSheetMime,
      pageCount: answerSheetPageCount,
    },
  }
}
