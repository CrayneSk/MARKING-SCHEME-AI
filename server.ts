import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));

// Full CORS support allowing cross-origin requests from Firebase Hosting
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyB7kOwOp2hbSSPKG4Vq6sJIKWl1xWWf_Hs';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

// Ultra-fast model priority with zero thinking budget for instant response
const FAST_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest'];

async function generateWithRetry(contents: any): Promise<string> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const modelName of FAST_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          temperature: 0.1,
          thinkingConfig: {
            thinkingBudget: 0,
          },
          maxOutputTokens: 2500,
        },
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${modelName} error:`, err?.message || err);
      lastError = err;
      if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand')) {
        continue;
      }
    }
  }

  throw lastError || new Error('Assessment engine is temporarily busy. Please retry in a few seconds.');
}

// STRICT ALPHANUMERIC ONLY SANITIZER: ZERO symbols, ZERO special characters
export function cleanRawMarkdown(text: string): string {
  if (!text) return '';
  // Purge any character that is NOT a letter (a-z, A-Z), number (0-9), space, or newline
  const cleaned = text.replace(/[^a-zA-Z0-9 \n]/g, ' ');

  // Format line by line cleanly with no trailing or multiple spaces
  const lines = cleaned.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());

  return lines
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Official Exam Marking Scheme Generation Route
app.post('/api/generate-marking-scheme', async (req, res) => {
  try {
    const {
      subject,
      level,
      paperNumber,
      totalMarks,
      examYearOrSession,
      instructions,
      extractedExamText,
      pdfBase64,
      mimeType,
      planName,
    } = req.body;

    if ((!extractedExamText || !extractedExamText.trim()) && !pdfBase64) {
      return res.status(400).json({ error: 'Please paste questions or upload an exam document to evaluate.' });
    }

    const prompt = `
You are an ultra-fast Senior Examination Assessment Specialist.
Generate an official marking scheme for the following exam questions.

CRITICAL MANDATORY INSTRUCTIONS:
1. STRICTLY LETTERS AND NUMBERS ONLY.
2. ABSOLUTELY ZERO SPECIAL CHARACTERS OR SYMBOLS OR NON-ALPHANUMERIC CHARACTERS.
3. DO NOT output any punctuation, asterisks, hashtags, slashes, brackets, parentheses, hyphens, dashes, bullets, quotes, colons, dots, commas, or any non-alphanumeric characters whatsoever.
4. Output must be extremely fast, direct, concise, and easy to read.
5. In every question and part, clearly state:
Possible Answer
6. Every mark awarded must simply say:
1 mark or 2 marks or 4 marks
7. Format clearly line by line using ONLY letters and numbers:

Question 1
Part a State four functions of leaves in a plant 4 marks
Possible Answer
Photosynthesis manufacture of food 1 mark
Transpiration loss of water vapour 1 mark
Gaseous exchange carbon dioxide intake and oxygen release 1 mark
Storage of food or water 1 mark

Part b Describe the process of osmosis 2 marks
Possible Answer
Movement of water molecules from region of high concentration to low concentration 1 mark
Through a semi permeable membrane 1 mark

Total 6 marks

Examiner Note Accept any other correct answers

EXAM DETAILS:
Level: ${level || 'O Level'}
Subject: ${subject || 'General'}
Paper: ${paperNumber || 'Paper 1'}
Target Marks: ${totalMarks || 'As specified in paper'}
Instructions: ${instructions || 'None'}

EXAM QUESTIONS:
${extractedExamText && extractedExamText.trim() ? extractedExamText : 'Please examine the uploaded document attached.'}
`;

    const contents: any[] = [];
    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: pdfBase64,
        },
      });
    }
    contents.push(prompt);

    const rawOutput = await generateWithRetry(contents);
    const cleanedOutput = cleanRawMarkdown(rawOutput);

    return res.json({
      success: true,
      markingScheme: cleanedOutput,
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    const userMsg = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand')
      ? 'The assessment network is briefly experiencing peak demand. Please click Generate again in a few seconds.'
      : error.message || 'An error occurred while generating the marking scheme.';
    return res.status(500).json({ error: userMsg });
  }
});

// Serve static in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
