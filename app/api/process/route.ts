import { NextRequest, NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline'

// tell vercel this can run for up to 120s (AI calls take a while)
export const maxDuration = 120
export const runtime = 'nodejs'

// accepted file types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const qpFile = formData.get('questionPaper') as File | null
    const asFile = formData.get('answerSheet') as File | null

    if (!qpFile || !asFile) {
      return NextResponse.json(
        { error: 'Both question paper and answer sheet are required' },
        { status: 400 }
      )
    }

    // validate file types
    if (!ALLOWED_TYPES.includes(qpFile.type)) {
      return NextResponse.json(
        { error: `Unsupported file type for question paper: ${qpFile.type}` },
        { status: 400 }
      )
    }
    if (!ALLOWED_TYPES.includes(asFile.type)) {
      return NextResponse.json(
        { error: `Unsupported file type for answer sheet: ${asFile.type}` },
        { status: 400 }
      )
    }

    // convert File objects to Buffers
    const [qpBuffer, asBuffer] = await Promise.all([
      qpFile.arrayBuffer().then(Buffer.from),
      asFile.arrayBuffer().then(Buffer.from),
    ])

    // run the full pipeline
    const result = await runPipeline({
      questionPaperBuffer: qpBuffer,
      questionPaperMime: qpFile.type,
      questionPaperName: qpFile.name,
      answerSheetBuffer: asBuffer,
      answerSheetMime: asFile.type,
      answerSheetName: asFile.name,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    console.error('[/api/process] error:', message)

    // give the user a helpful error message, not a stack trace
    return NextResponse.json(
      {
        error: message.includes('API_KEY')
          ? 'Gemini API key is missing or invalid. Check your .env.local file.'
          : message,
      },
      { status: 500 }
    )
  }
}
