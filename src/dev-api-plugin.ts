import { Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

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

export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          return res.end();
        }

        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const getBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => {
              data += chunk;
            });
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        const sendJson = (status: number, obj: any) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(obj));
        };

        // Official Exam Marking Scheme Route
        if (req.url === '/api/generate-marking-scheme' && req.method === 'POST') {
          try {
            const body = await getBody();
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
            } = body;

            // Allow either uploaded document (pdfBase64) or pasted/extracted text
            if ((!extractedExamText || !extractedExamText.trim()) && !pdfBase64) {
              return sendJson(400, { error: 'Please paste questions or upload an exam document to evaluate.' });
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

            return sendJson(200, {
              success: true,
              markingScheme: cleanedOutput,
            });
          } catch (err: any) {
            console.error('Generation error:', err);
            const userMsg = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand')
              ? 'The assessment network is briefly experiencing peak demand. Please click Generate again in a few seconds.'
              : err.message || 'Marking scheme generation failed';
            return sendJson(500, { error: userMsg });
          }
        }

        // Transactions Mock & Webhooks API
        if (req.url === '/api/transactions' && req.method === 'GET') {
          return sendJson(200, { transactions: [] });
        }

        next();
      });
    },
  };
}
