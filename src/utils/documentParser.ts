import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Safe worker initialization
try {
  if (typeof window !== 'undefined') {
    // If worker cannot load from CDN in sandboxed iframe, pdfjs can fallback or we use inline data
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn('PDF worker init warning:', e);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 50); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      if (pageText.trim()) {
        fullText += `[Page ${pageNum}]\n${pageText}\n\n`;
      }
    }

    return fullText.trim();
  } catch (err) {
    console.warn('Browser PDF text extraction fallback:', err);
    return '';
  }
}

export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  } catch (err) {
    console.warn('DOCX parse error:', err);
    return '';
  }
}

export interface ParsedDocumentResult {
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedText: string;
  base64Data?: string;
  isPdf: boolean;
}

export async function parseUploadedDocument(file: File): Promise<ParsedDocumentResult> {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
  let extractedText = '';
  let base64Data: string | undefined;

  if (isPdf) {
    base64Data = await fileToBase64(file);
    extractedText = await extractTextFromPdf(file);
    if (!extractedText) {
      extractedText = `[PDF Document: ${file.name} (${Math.round(file.size / 1024)} KB) - attached for direct AI evaluation]`;
    }
  } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
    extractedText = await extractTextFromDocx(file);
    if (!extractedText) {
      // Fallback try raw text
      extractedText = await file.text();
    }
  } else {
    extractedText = await file.text();
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || (isPdf ? 'application/pdf' : 'text/plain'),
    extractedText: extractedText.trim(),
    base64Data,
    isPdf,
  };
}

// Backward compatibility helper
export async function extractDocumentText(file: File): Promise<string> {
  const result = await parseUploadedDocument(file);
  return result.extractedText;
}
