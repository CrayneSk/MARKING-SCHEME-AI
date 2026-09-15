import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  Download,
  Copy,
  Check,
  FileText,
  Printer,
  ChevronRight,
  BookmarkPlus,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { PlanType, ExamGenerationRecord } from '../types';

interface MarkingSchemeViewerProps {
  content: string;
  subject: string;
  level: string;
  paperNumber: string;
  planName: PlanType;
  history?: ExamGenerationRecord[];
  onSelectHistory?: (item: ExamGenerationRecord) => void;
  onManualSave?: () => Promise<boolean>;
  isSavedInHistory?: boolean;
}

// STRICT ALPHANUMERIC ONLY SANITIZER: ZERO symbols, ZERO special characters
export function sanitizeText(raw: string): string {
  if (!raw) return '';
  // Purge any character that is NOT a letter (a-z, A-Z), number (0-9), space, or newline
  const cleaned = raw.replace(/[^a-zA-Z0-9 \n]/g, ' ');
  const lines = cleaned.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());

  return lines
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const MarkingSchemeViewer: React.FC<MarkingSchemeViewerProps> = ({
  content,
  subject,
  level,
  paperNumber,
  planName,
  history = [],
  onSelectHistory,
  onManualSave,
  isSavedInHistory = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'scheme' | 'history'>('scheme');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cleaned text representation strictly containing letters and numbers only
  const cleanContent = useMemo(() => sanitizeText(content), [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([cleanContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Official_${subject.replace(/\s+/g, '_')}_${paperNumber}_Marking_Scheme.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Download Word doc format (.doc)
  const handleDownloadDoc = () => {
    const formattedHtml = cleanContent
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    const header = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Official Examination Marking Scheme</title><style>
      body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #111; margin: 20mm; }
      h1 { font-size: 16pt; color: #0f2b5c; text-align: center; margin-bottom: 4px; font-weight: bold; }
      h2 { font-size: 12pt; color: #b8860b; text-align: center; margin-top: 0; font-weight: bold; }
      .meta { text-align: center; font-size: 10pt; color: #444; margin-bottom: 20px; border-bottom: 2px solid #b8860b; padding-bottom: 10px; }
      .content { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-weight: bold; }
      .footer { text-align: center; font-size: 9pt; color: #777; margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; }
    </style></head><body>
      <h1>OFFICIAL CURRICULUM EXAMINATION ASSESSMENT</h1>
      <h2>MARKING SCHEME AND ASSESSMENT GUIDE</h2>
      <div class="meta">
        <strong>Subject:</strong> ${subject} | <strong>Level:</strong> ${level} | <strong>Paper:</strong> ${paperNumber}
      </div>
      <div class="content">${formattedHtml}</div>
      <div class="footer">Official Examination Assessment Standard Confidential Marking Guide</div>
    </body></html>`;

    const blob = new Blob(['\ufeff' + header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Official_${subject.replace(/\s+/g, '_')}_${paperNumber}_Marking_Scheme.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('OFFICIAL CURRICULUM EXAMINATION ASSESSMENT', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text('EXAMINATION MARKING SCHEME AND ASSESSMENT GUIDE', 105, 24, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Subject: ${subject} Level: ${level} Paper: ${paperNumber}`, 105, 30, { align: 'center' });
    doc.setLineWidth(0.4);
    doc.line(20, 33, 190, 33);

    doc.setFontSize(9);
    const splitText = doc.splitTextToSize(cleanContent, 170);
    let y = 41;
    const pageHeight = doc.internal.pageSize.height;

    for (let i = 0; i < splitText.length; i++) {
      if (y > pageHeight - 18) {
        doc.setFontSize(8);
        doc.text('Official Examination Assessment Standard Confidential', 105, pageHeight - 10, { align: 'center' });
        doc.addPage();
        y = 20;
        doc.setFontSize(9);
      }
      const line = splitText[i];
      if (line.includes('Possible Answer') || line.startsWith('Question ') || line.startsWith('Examiner Note')) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(line, 20, y);
      y += 4.8;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Official Examination Assessment Standard Confidential', 105, pageHeight - 10, { align: 'center' });
    doc.save(`Official_${subject.replace(/\s+/g, '_')}_Marking_Scheme.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTriggerSave = async () => {
    if (!onManualSave) return;
    setIsSaving(true);
    try {
      const ok = await onManualSave();
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Render text with bold typography, no symbols, and distinct "Possible Answer" indicator
  const renderFormattedContent = () => {
    const rawLines = cleanContent.split('\n');

    return (
      <div className="space-y-2">
        {rawLines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }

          // Question header (e.g. Question 1, Question 2)
          if (/^Question\s+\d+/i.test(line)) {
            return (
              <div key={idx} className="pt-6 pb-2 border-b border-amber-500/30 first:pt-0">
                <h3 className="text-lg md:text-xl font-black text-amber-400 font-display tracking-wider uppercase">
                  {line}
                </h3>
              </div>
            );
          }

          // Sub-question prompt (e.g. Part a State four functions...)
          if (/^Part\s+[a-z0-9]+/i.test(line)) {
            return (
              <div key={idx} className="pt-3 pb-1 font-black text-white text-sm md:text-base">
                <span>{line}</span>
              </div>
            );
          }

          // Bold "Possible Answer" block
          if (/^Possible Answer/i.test(line)) {
            return (
              <div
                key={idx}
                className="my-3 px-4 py-2.5 bg-amber-500/20 border-l-4 border-amber-400 rounded-r-xl shadow-sm"
              >
                <strong className="text-amber-300 font-black text-base md:text-lg tracking-wider uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                  {line}
                </strong>
              </div>
            );
          }

          // Examiner Note section
          if (/^Examiner\s+Note/i.test(line)) {
            return (
              <div key={idx} className="mt-4 pt-3 border-t border-slate-800 text-xs md:text-sm">
                <strong className="text-amber-400 font-black uppercase tracking-wider block mb-1">
                  {line}
                </strong>
              </div>
            );
          }

          // Total Marks line
          if (/^Total\s+(\d+\s+)?marks?/i.test(line)) {
            return (
              <div key={idx} className="py-2 font-black text-amber-400 text-sm md:text-base">
                <strong>{line}</strong>
              </div>
            );
          }

          // Chief Examiner Notes / Grade Boundary
          if (/^(Chief Examiner|Grade Boundary|Common Student Traps|Misconceptions)/i.test(line)) {
            return (
              <div key={idx} className="mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <strong className="text-amber-300 font-black block mb-1">
                  {line}
                </strong>
              </div>
            );
          }

          // Standard answer line: BOLD, high contrast, clean letters and numbers
          return (
            <p key={idx} className="text-slate-100 font-bold text-sm md:text-base py-1 leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      id="marking-scheme-viewer"
      className="bg-[#0F172A] rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Top Bar with Navigation Tabs */}
      <div className="bg-slate-950 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            id="tab-btn-scheme"
            onClick={() => setActiveTab('scheme')}
            className={`text-xs font-bold font-display uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all ${
              activeTab === 'scheme'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Marking Scheme
          </button>

          <button
            type="button"
            id="tab-btn-history"
            onClick={() => setActiveTab('history')}
            className={`text-xs font-bold font-display uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Saved Paper History
            {history.length > 0 && (
              <span className="bg-slate-800 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'scheme' && (
          <div className="flex flex-wrap items-center gap-2">
            {onManualSave && (
              <button
                id="btn-save-to-vault"
                type="button"
                disabled={isSaving}
                onClick={handleTriggerSave}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all font-display ${
                  saveSuccess || isSavedInHistory
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                }`}
                title="Save generated scheme to Paper Vault History"
              >
                {saveSuccess || isSavedInHistory ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved in History</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isSaving ? 'Saving...' : 'Save to History'}</span>
                  </>
                )}
              </button>
            )}

            <button
              id="btn-copy-scheme"
              type="button"
              onClick={handleCopy}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            {/* Word .doc Download */}
            <button
              id="btn-download-word"
              type="button"
              onClick={handleDownloadDoc}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-blue-300 hover:text-blue-200 text-xs font-semibold rounded-lg border border-slate-800 flex items-center gap-1.5 transition-colors"
              title="Download Microsoft Word .doc file"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
              <span>Word (.doc)</span>
            </button>

            {/* PDF Download */}
            <button
              id="btn-download-pdf"
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors font-display"
              title="Download ready-to-print PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {/* Plain text */}
            <button
              id="btn-download-txt"
              type="button"
              onClick={handleDownloadTxt}
              className="hidden sm:flex px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 items-center gap-1.5 transition-colors"
              title="Download clean text file"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>TXT</span>
            </button>

            <button
              id="btn-print-scheme"
              type="button"
              onClick={handlePrint}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-colors"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main View Area */}
      {activeTab === 'scheme' ? (
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[720px] bg-[#090D16] text-slate-200 font-sans leading-relaxed text-sm">
          <div className="max-w-3xl mx-auto bg-[#0F172A] p-6 md:p-10 rounded-2xl shadow-xl border border-slate-800/80 printable-area">
            {/* Assessment Banner */}
            <div className="text-center pb-6 mb-6 border-b-2 border-amber-500/40">
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase font-display block mb-1">
                Official Curriculum Assessment Standard
              </span>
              <h1 className="text-lg md:text-2xl font-black font-display uppercase tracking-wide text-white">
                EXAMINATION MARKING SCHEME AND ASSESSMENT GUIDE
              </h1>
              <h2 className="text-xs md:text-sm font-bold uppercase tracking-widest text-amber-300 mt-1">
                Evaluation Criteria And Mark Allocation Breakdown
              </h2>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-300">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold">LEVEL {level}</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold">SUBJECT {subject}</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold">PAPER {paperNumber}</span>
              </div>
            </div>

            {/* Rendered Scheme Text: BOLD, letters and numbers only */}
            <div className="py-2">
              {renderFormattedContent()}
            </div>
          </div>
        </div>
      ) : (
        /* Saved History View */
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[720px] bg-[#090D16] space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-white font-display uppercase tracking-wider">
                Saved Marking Scheme History
              </h3>
              <p className="text-xs text-slate-400 font-light">
                All previous generated marking schemes stored securely in your vault.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {history.length} Saved Papers
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-300 font-semibold text-sm">No Saved Papers in History Yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-light">
                Generated marking schemes are automatically saved here for instant retrieval.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onSelectHistory) onSelectHistory(item);
                    setActiveTab('scheme');
                  }}
                  className="group p-4 bg-slate-900/80 hover:bg-slate-800/90 rounded-xl border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 font-display">
                        {item.subject}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {item.level}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {item.paperNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate max-w-xl">
                      {item.originalExamText?.slice(0, 120) || 'Official examination assessment questions'}...
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono pt-1">
                      <span>{new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span className="text-amber-400/80">{item.totalMarks} Marks</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-2 text-slate-400 group-hover:text-amber-300 rounded-lg group-hover:bg-slate-700/50 transition-colors shrink-0"
                    title="Load this scheme"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clean Assessment Footer */}
      <div
        id="viewer-clean-footer"
        className="bg-slate-950 text-slate-400 px-4 sm:px-6 py-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs"
      >
        <span className="font-display font-medium text-slate-400">
          Official Examination Marking Scheme System
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-slate-300 font-bold font-display uppercase tracking-wider text-[11px]">
            Letters And Numbers Only Standard
          </span>
        </div>
      </div>
    </div>
  );
};
