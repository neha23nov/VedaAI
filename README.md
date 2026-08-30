# VedaAI — AI Assessment Extraction & Answer Mapping



> Automate exam grading with AI. Upload a question paper + handwritten answer sheet → AI extracts questions, maps answers, grades responses, and highlights answer locations.

**VedaAI** leverages Google Gemini 3.6 Flash's vision capabilities to intelligently process educational assessments. Perfect for educators, schools, and testing organizations.

---

##  Features

- 📄 **Multi-Format Support** — PDF and image formats (JPEG, PNG, WebP) for both question papers and answer sheets
- 🤖 **Intelligent Extraction** — Gemini 2.0 Flash vision model extracts all questions and answers with high accuracy
- 🔗 **Smart Answer Mapping** — Automatically matches answers to questions, handling:
  - Out-of-order answers
  - Multi-part questions (2a, 2b, etc.)
  - Continuation across pages
  - Unmatched/unidentified answers
- ⭐ **Automated Grading** — AI-powered evaluation with marks and constructive feedback
- 🎯 **Visual Highlighting** — Click any question to see the exact handwritten answer region highlighted
- ⚡ **Real-Time Processing** — Up to 120-second processing window for complex documents
- 📱 **Responsive UI** — Modern, intuitive interface built with React and Tailwind CSS
- 🎨 **Dark Mode Ready** — Professional design system with accessibility in mind

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.0.0
- **pnpm** ≥ 9.0.0 (or npm/yarn)
- **Google Gemini API Key** (free at https://aistudio.google.com)

### Installation

```bash
# 1. Clone and navigate to project
git clone <repository-url>
cd ai-assessment-mapper

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and add your Gemini API key:
# GEMINI_API_KEY=your_actual_key_here

# 4. Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Configuration

### Environment Variables

Create `.env.local` in the project root:

```env
# Required: Google Gemini API Key
# Get one free at https://aistudio.google.com
GEMINI_API_KEY=your_api_key_here
```

**Important Security Notes:**
- Never commit `.env.local` to version control
- `.env.local` is already in `.gitignore`
- Treat the API key as sensitive as a password
- Rotate keys periodically

---

## 📖 How It Works

### Processing Pipeline

```
1. Upload
   ├─ Question Paper (PDF/Image)
   └─ Answer Sheet (PDF/Image)
        ↓
2. Extract & Analyze
   ├─ Question Extraction (Gemini Vision)
   ├─ Answer Extraction (Gemini Vision)
   └─ Bounding Box Detection
        ↓
3. Map & Match
   ├─ Answer-to-Question Matching
   ├─ Handle Multi-part Questions
   └─ Track Unanswered Questions
        ↓
4. Grade & Evaluate
   ├─ Award Marks
   ├─ Generate Feedback
   └─ Compile Results
        ↓
5. Display Results
   ├─ Show Grades & Feedback
   ├─ Highlight Answer Regions
   └─ Session Storage
```

### Key Algorithms

**Question Extraction:**
- Parses document structure to identify all questions
- Captures question numbers, text, and associated marks
- Handles sub-parts (e.g., "2a", "2b", "2 (i)", "2 (ii)")

**Answer Extraction:**
- Detects handwritten text regions
- Generates precise bounding boxes (x, y, width, height in percentages)
- Handles multi-page answers automatically

**Answer-to-Question Matching:**
- Normalizes student-written question numbers
- Supports various notations (Q1, 1., Ans 1, Answer to Q2(a), etc.)
- Fallback fuzzy matching for ambiguous cases

---

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js (App Router) | 14.2.5 |
| **Language** | TypeScript | ^5 |
| **UI Library** | React | ^18 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **AI/ML** | Google Generative AI | 0.21.0 |
| **PDF Handling** | pdfjs-dist | 4.4.168 |
| **Icons** | Lucide React | 0.445.0 |
| **Animation** | Framer Motion | 11.9.0 |
| **State Management** | React Hooks | Built-in |
| **Type Checking** | TypeScript | 5+ |
| **Package Manager** | pnpm | 9.0.0 |

---

## 📁 Project Structure

```
ai-assessment-mapper/
├── app/
│   ├── api/
│   │   └── process/
│   │       └── route.ts           # API endpoint for processing
│   ├── results/
│   │   └── [sessionId]/
│   │       └── page.tsx           # Results display page
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home page
├── components/
│   └── Sidebar.tsx                # Navigation sidebar
├── lib/
│   ├── gemini.ts                  # Gemini API integration
│   ├── pipeline.ts                # Processing pipeline
│   ├── session-store.ts           # Session management
│   └── utils.ts                   # Utility functions
├── types/
│   └── index.ts                   # TypeScript type definitions
├── public/                        # Static assets
├── .env.local                     # Environment variables (local)
├── next.config.js                 # Next.js configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies
└── README.md                      # This file
```

---

## 🔌 API Documentation

### POST `/api/process`

Upload and process question paper + answer sheet.

**Request:**
```typescript
Content-Type: multipart/form-data

- questionPaper: File (PDF, JPEG, PNG, WebP) — Max 50 MB
- answerSheet: File (PDF, JPEG, PNG, WebP) — Max 50 MB
```

**Response Success (200):**
```json
{
  "sessionId": "uuid-string",
  "status": "processing",
  "totalQuestions": 10,
  "answeredQuestions": 9,
  "unansweredQuestions": 1,
  "totalMarks": 100,
  "marksObtained": 87,
  "results": [
    {
      "questionId": "q1",
      "questionNumber": "1",
      "questionText": "...",
      "marks": 5,
      "answerText": "...",
      "marksAwarded": 5,
      "isCorrect": true,
      "feedback": "Excellent answer.",
      "answerRegions": [{ "page": 0, "bbox": {...} }]
    }
  ]
}
```

**Response Error (400/500):**
```json
{
  "error": "Error message describing the issue"
}
```

**Supported File Types:**
- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`

**Constraints:**
- File size: ≤ 50 MB per file
- Processing time: ≤ 120 seconds
- Request timeout: 120 seconds

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variable
vercel env add GEMINI_API_KEY
# Paste your API key when prompted

# Deploy to production
vercel --prod
```

### Deploy to Other Platforms

#### Docker
```bash
# Build image
docker build -t ai-assessment-mapper .

# Run container
docker run -e GEMINI_API_KEY=your_key -p 3000:3000 ai-assessment-mapper
```

#### Self-Hosted
```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

---

## 🔒 Security

### API Key Management

- Store `GEMINI_API_KEY` only in `.env.local` (never commit)
- Use Vercel environment variables for production
- Rotate keys periodically
- Use separate keys for development, staging, and production

### Rate Limiting

- Implement rate limiting in production (recommended: 5 requests/hour per IP)
- Monitor API usage and set billing alerts
- Use API key scopes to limit permissions

### Input Validation

- File type validation (server-side)
- File size limits (50 MB per file)
- MIME type verification
- Filename sanitization

### Data Privacy

- Files are processed by Gemini API (Google Cloud)
- Review Google's privacy policy: https://policies.google.com/privacy
- Session data stored in memory (resets on deployment)
- For persistence: use Upstash Redis or Vercel KV

---

## 📊 Available Scripts

```bash
# Development
pnpm dev              # Start dev server at http://localhost:3000

# Production
pnpm build            # Build for production
pnpm start            # Start production server

# Quality
pnpm lint             # Run ESLint

# Utilities
pnpm type-check       # TypeScript type checking (if configured)
```

---

## 🐛 Troubleshooting

### Issue: "GEMINI_API_KEY is missing"

**Solution:**
```bash
# 1. Create .env.local
echo "GEMINI_API_KEY=your_key_here" > .env.local

# 2. Get free key at https://aistudio.google.com
# 3. Restart dev server
pnpm dev
```

### Issue: File Upload Fails

**Check:**
- File size < 50 MB
- File format is PDF or image (JPEG, PNG, WebP)
- Both question paper AND answer sheet are provided
- Network connection is stable

### Issue: Processing Takes Too Long

**Reason:** Complex documents or large files
**Solution:**
- Try smaller documents first
- Ensure question paper and answer sheet are clear
- Check internet connection speed

### Issue: Inaccurate Grading

**Improve accuracy:**
- Use clear, legible handwriting
- Ensure answer sheet has clear question numbers
- Provide complete answer text (avoid abbreviations)
- Review feedback and adjust manually if needed

---

## 📝 Example Usage

### Step 1: Prepare Documents

Scan or export:
- **Question Paper** (PDF/Image) — Clear exam questions
- **Answer Sheet** (PDF/Image) — Handwritten student answers

### Step 2: Upload

1. Open http://localhost:3000
2. Drop or select question paper
3. Drop or select answer sheet
4. Click "Grade Assessment"

### Step 3: Review Results

- View extracted questions and answers
- See marks and feedback
- Click any question to highlight the answer region
- Export or save results

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---



