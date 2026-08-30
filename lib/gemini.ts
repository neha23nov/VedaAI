

import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { Question, RawExtractedAnswer, GradingResult, MappedAnswer } from '@/types'


let _genAI: GoogleGenerativeAI | null = null
let _fileManager: GoogleAIFileManager | null = null

function initClients() {
  const key = process.env.GEMINI_API_KEY



  if (!key) {
    throw new Error(
      'Missing GEMINI_API_KEY — add it to .env.local and restart'
    )
  }

  if (!_genAI) _genAI = new GoogleGenerativeAI(key)
  if (!_fileManager) _fileManager = new GoogleAIFileManager(key)
}
function getModel() {
  initClients()
  // tried 1.5-pro for better accuracy but flash is faster and good enough here
  return _genAI!.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1, // low temp = more deterministic output
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Turns a buffer into a Gemini Part.
 * PDFs get uploaded to the Files API; images are inlined as base64.
 */
async function bufferToPart(buffer: Buffer, mimeType: string, name: string): Promise<Part> {
  if (mimeType === 'application/pdf') {
    return await uploadPdfAndGetPart(buffer, name)
  }
  // for images just inline the base64 — much simpler
  return {
    inlineData: { mimeType, data: buffer.toString('base64') },
  }
}

/**
 * Uploads a PDF to Gemini's File API.
 * Has to go via disk because the SDK expects a file path (not a buffer).
 * Uses /tmp which is writable even on Vercel serverless.
 */
async function uploadPdfAndGetPart(buffer: Buffer, name: string): Promise<Part> {
  initClients()
  try { mkdirSync('/tmp', { recursive: true }) } catch { /* already exists, fine */ }

  const tmpPath = join('/tmp', `${randomUUID()}_${name}`)
  writeFileSync(tmpPath, buffer)

  try {
    const upload = await _fileManager!.uploadFile(tmpPath, {
      mimeType: 'application/pdf',
      displayName: name,
    })

    // poll until Gemini finishes processing the PDF
    let file = await _fileManager!.getFile(upload.file.name)
    let attempts = 0
    while (file.state === FileState.PROCESSING && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000))
      file = await _fileManager!.getFile(upload.file.name)
      attempts++
    }

    if (file.state !== FileState.ACTIVE) {
      throw new Error(`Gemini couldn't process the PDF (state: ${file.state})`)
    }

    return {
      fileData: { mimeType: 'application/pdf', fileUri: file.uri },
    }
  } finally {
    // always clean up the tmp file even if something threw
    try { unlinkSync(tmpPath) } catch { /* meh, it's /tmp */ }
  }
}

/**
 * Strip markdown code fences if Gemini wraps its JSON in them.
 * Happens sometimes even with responseMimeType: 'application/json'.
 */
function parseJSON(raw: string): unknown {
  const cleaned = raw
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim()
  return JSON.parse(cleaned)
}

// ──────────────────────────────────────────────────────────────────────────────
// Question Extraction
// ──────────────────────────────────────────────────────────────────────────────

export async function extractQuestions(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<Question[]> {
  const filePart = await bufferToPart(buffer, mimeType, filename)
  const model = getModel()

  const prompt = `You are analyzing a question paper (exam paper).

Extract ALL questions in the EXACT ORDER they appear on the paper.

Rules you must follow:
- If a question has sub-parts (like "2 (a)" and "2 (b)"), treat EACH sub-part as a completely separate entry
- Keep the original question number exactly as printed — don't add or remove anything
- If marks are shown (e.g. [5 marks], (3), [10]), capture them as a number
- If no marks are shown for a question, estimate based on context or use 5 as default
- Include the FULL question text, not a summary
- Do NOT skip any question even if it seems minor

Return ONLY valid JSON, no explanation:
{
  "questions": [
    {
      "id": "q1",
      "number": "1",
      "text": "Define photosynthesis and explain its significance.",
      "marks": 5
    },
    {
      "id": "q2a",
      "number": "2 (a)",
      "text": "State Newton's first law of motion.",
      "marks": 3
    }
  ]
}`

  const result = await model.generateContent([prompt, filePart])
  const raw = result.response.text()

  try {
    const parsed = parseJSON(raw) as { questions: Question[] }
    return parsed.questions
  } catch (e) {
    console.error('Failed to parse question extraction response:', raw.slice(0, 500))
    throw new Error('Could not parse questions from the question paper')
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Answer Extraction
// ──────────────────────────────────────────────────────────────────────────────

export async function extractAnswers(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<RawExtractedAnswer[]> {
  const filePart = await bufferToPart(buffer, mimeType, filename)
  const model = getModel()

  const prompt = `You are analyzing a student's handwritten answer sheet.

For EACH answer written on this document:
1. Figure out which question number it's answering (look for "Q1", "Ans 1", "1.", "Answer to Q2 (a)", etc.)
2. Transcribe the answer text as accurately as possible
3. Mark the EXACT bounding box of this answer on its page
4. Note which page it's on (0 = first page, 1 = second page, etc.)

Bounding box format — use PERCENTAGE of the full page area:
- x: how far from the LEFT edge (0 to 100)
- y: how far from the TOP edge (0 to 100)
- w: width of the answer region (0 to 100)
- h: height of the answer region (0 to 100)

Critical rules:
- Be GENEROUS with bounding boxes — include a bit of padding, don't clip tightly
- If an answer continues on the next page, return TWO entries with the SAME questionNumber
- If you see handwriting you can't match to any question number, use questionNumber "unmatched"
- Don't skip anything — even a single line might matter

Return ONLY valid JSON:
{
  "answers": [
    {
      "questionNumber": "1",
      "text": "Photosynthesis is the process by which plants...",
      "page": 0,
      "bbox": { "x": 5, "y": 22, "w": 88, "h": 14 }
    },
    {
      "questionNumber": "2 (a)",
      "text": "Newton's first law states that an object at rest...",
      "page": 0,
      "bbox": { "x": 5, "y": 40, "w": 88, "h": 10 }
    }
  ]
}`

  const result = await model.generateContent([prompt, filePart])
  const raw = result.response.text()

  try {
    const parsed = parseJSON(raw) as { answers: RawExtractedAnswer[] }
    return parsed.answers
  } catch (e) {
    console.error('Answer extraction parse error:', raw.slice(0, 500))
    throw new Error('Could not parse answers from the answer sheet')
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Grading
// ──────────────────────────────────────────────────────────────────────────────

export async function gradeAnswers(
  questions: Question[],
  mappedAnswers: MappedAnswer[]
): Promise<GradingResult[]> {
  const model = getModel()

  // build one big prompt with all Q&A pairs — one API call instead of N
  const pairs = questions.map((q) => {
    const ans = mappedAnswers.find((a) => a.questionId === q.id)
    const answerText =
      ans?.status === 'unanswered' || !ans
        ? '[NOT ATTEMPTED — student left this blank]'
        : ans.rawText || '[Answer extracted but text unclear]'

    return `---
QUESTION ${q.number} [${q.marks} marks]
${q.text}

STUDENT ANSWER:
${answerText}
---`
  })

  const prompt = `You are an experienced teacher grading student exam answers.

Grade each of the following question-answer pairs fairly and constructively.

${pairs.join('\n\n')}

For each question return:
- marksAwarded: how many marks the student earned (0 to the max for that question)
- isCorrect: true if full marks, false if partial or wrong, null if not attempted
- feedback: 1-2 sentences of specific, helpful feedback (what they got right, what they missed)

For unattempted questions: marksAwarded = 0, isCorrect = null, feedback = "Not attempted."

Return ONLY valid JSON, results in THE SAME ORDER as the questions above:
{
  "results": [
    {
      "questionId": "q1",
      "marksAwarded": 4,
      "isCorrect": false,
      "feedback": "Good definition but the ecological significance was not discussed."
    }
  ]
}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text()

  try {
    const parsed = parseJSON(raw) as {
      results: Array<{
        questionId: string
        marksAwarded: number
        isCorrect: boolean | null
        feedback: string
      }>
    }

    // map question IDs correctly — gemini sometimes gets confused on this
    return parsed.results.map((r, i) => ({
      questionId: questions[i]?.id ?? r.questionId,
      marksAwarded: r.marksAwarded,
      marksTotal: questions[i]?.marks ?? 0,
      isCorrect: r.isCorrect,
      feedback: r.feedback,
    }))
  } catch (e) {
    console.error('Grading parse error:', raw.slice(0, 500))
    throw new Error('Could not parse grading results')
  }
}
