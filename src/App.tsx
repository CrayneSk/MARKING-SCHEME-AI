import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { EXAM_SUBJECTS, PlanType, BillingCycle, ExamGenerationRecord } from './types';
import { AuthModal } from './components/AuthModal';
import { PricingModal } from './components/PricingModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MarkingSchemeViewer } from './components/MarkingSchemeViewer';
import { parseUploadedDocument, ParsedDocumentResult } from './utils/documentParser';
import { API_BASE_URL } from './config';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import {
  FileCheck2,
  Sparkles,
  Layers,
  Crown,
  FileText,
  AlertCircle,
  Clock,
  Shield,
  Zap,
  LogOut,
  GraduationCap,
  BookOpen,
  History,
  MessageCircle,
  FileUp,
  Loader2,
  XCircle,
  CheckCircle2
} from 'lucide-react';

const GUEST_TRIAL_KEY = 'exam_guest_generations_done';

export default function App() {
  const { user, profile, logout, recordGenerationUsage } = useAuth();

  // Navigation / Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [targetPricingPlan, setTargetPricingPlan] = useState<PlanType>('Flow');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Form State
  const [level, setLevel] = useState<'O-Level' | 'A-Level' | 'Grade 7'>('O-Level');
  const [subject, setSubject] = useState(EXAM_SUBJECTS[0]);
  const [paperNumber, setPaperNumber] = useState('Paper 1');
  const [totalMarks, setTotalMarks] = useState('100');
  const [examSession, setExamSession] = useState('November 2026');
  const [instructions, setInstructions] = useState('');
  const [examPaperText, setExamPaperText] = useState('');

  // File upload state with complete parsed document payload
  const [uploadedDoc, setUploadedDoc] = useState<ParsedDocumentResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isFileExtracting, setIsFileExtracting] = useState(false);

  // Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScheme, setGeneratedScheme] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userHistory, setUserHistory] = useState<ExamGenerationRecord[]>([]);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  // Guest trial tracking in localStorage: 1 free generation before sign up
  const [guestGenerationsUsed, setGuestGenerationsUsed] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(GUEST_TRIAL_KEY) || '0', 10);
    } catch {
      return 0;
    }
  });

  // Load user saved history from Firestore
  const loadUserHistory = async () => {
    if (!user) {
      setUserHistory([]);
      return;
    }
    try {
      const q = query(
        collection(db, 'generations'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const items: ExamGenerationRecord[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as ExamGenerationRecord);
      });
      // Sort by createdAt desc
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setUserHistory(items);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    loadUserHistory();
  }, [user]);

  const currentPlan: PlanType = profile?.plan || 'Focus';
  const freeGenerationsRemaining = user
    ? Math.max(0, (profile?.freeGenerationsLimit || 1) - (profile?.generationsUsed || 0))
    : Math.max(0, 1 - guestGenerationsUsed);
  const isPaidUser = Boolean(user && (currentPlan === 'Flow' || currentPlan === 'Full'));

  // Generation speed indicator based on package
  const getSpeedLabel = () => {
    if (currentPlan === 'Full') return { text: 'Lightning Priority (Full Plan)', color: 'text-amber-400' };
    if (currentPlan === 'Flow') return { text: 'High-Speed Queue (Flow Plan)', color: 'text-blue-400' };
    return { text: 'High-Speed Assessment (Focus Tier)', color: 'text-slate-400' };
  };

  // Sample Exam Paper
  const handleLoadSampleExam = () => {
    setLevel('O-Level');
    setSubject('Combined Science (4003)');
    setPaperNumber('Paper 2 (Theory & Structured)');
    setTotalMarks('100');
    setExamSession('November 2026 Session');
    setInstructions('Provide exact marking criteria with clear marks allocated for each point');
    setExamPaperText(
`NATIONAL EXAMINATIONS ASSESSMENT
General Certificate of Education Ordinary Level
COMBINED SCIENCE 4003/2
PAPER 2 Theory & Structured

Question 1
(a) State four functions of leaves in a plant. (4 marks)

(b) Describe the process of osmosis. (2 marks)

(c) State three advantages of crop rotation. (3 marks)

Question 2
(a) Define electric current and state its SI unit. (2 marks)
(b) A resistor of 5 ohms is connected across a 12 V battery. Calculate the current flowing through it. (3 marks)

Question 3
(a) Define an isotope. (2 marks)
(b) Explain why chlorine has a relative atomic mass of 35.5. (3 marks)`
    );
    setUploadedFileName(null);
    setUploadedDoc(null);
  };

  // Document File Upload (PDF, DOCX, DOC, TXT)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsFileExtracting(true);
    setUploadedFileName(file.name);

    try {
      const parsed = await parseUploadedDocument(file);
      setUploadedDoc(parsed);

      if (parsed.extractedText && parsed.extractedText.trim()) {
        setExamPaperText(parsed.extractedText);
      } else {
        setExamPaperText(`[Attached Document: ${parsed.fileName} (${Math.round(parsed.fileSize / 1024)} KB) - Ready for Instant AI Evaluation]`);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(`Could not process file "${file.name}": ${err.message || 'Unknown format'}`);
    } finally {
      setIsFileExtracting(false);
      e.target.value = '';
    }
  };

  const handleClearUploadedFile = () => {
    setUploadedDoc(null);
    setUploadedFileName(null);
    setExamPaperText('');
  };

  // Explicit Save to History Vault
  const handleSaveToVault = async (): Promise<boolean> => {
    if (!user) {
      setAuthModalMode('signup');
      setIsAuthModalOpen(true);
      return false;
    }

    if (!generatedScheme) return false;

    try {
      const docRef = await addDoc(collection(db, 'generations'), {
        userId: user.uid,
        userEmail: user.email,
        subject,
        level,
        paperNumber,
        totalMarks,
        originalExamText: examPaperText.slice(0, 2000),
        markingScheme: generatedScheme,
        planAtGeneration: currentPlan,
        createdAt: new Date().toISOString(),
      });
      setLastSavedId(docRef.id);
      await loadUserHistory();
      return true;
    } catch (err: any) {
      console.error('Manual save to history error:', err);
      setErrorMsg('Failed to save to history vault: ' + (err.message || 'Error'));
      return false;
    }
  };

  // Generation Handler
  const handleGenerateScheme = async () => {
    setErrorMsg(null);

    // Rule: New users get 1 free generation before being required to sign up
    if (!user) {
      if (guestGenerationsUsed >= 1) {
        setAuthModalMode('signup');
        setIsAuthModalOpen(true);
        setErrorMsg('You have used your 1 free guest trial generation. Please sign up or sign in to continue generating marking schemes.');
        return;
      }
    } else {
      if (!isPaidUser && freeGenerationsRemaining <= 0) {
        setTargetPricingPlan('Flow');
        setIsPricingModalOpen(true);
        setErrorMsg('You have reached your free generation limit. Upgrade to Flow or Full plan for unlimited access.');
        return;
      }
    }

    const hasInput = Boolean(examPaperText.trim()) || Boolean(uploadedDoc);
    if (!hasInput) {
      setErrorMsg('Please paste questions or upload an exam document to evaluate.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-marking-scheme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          level,
          paperNumber,
          totalMarks,
          examYearOrSession: examSession,
          instructions,
          extractedExamText: examPaperText,
          pdfBase64: uploadedDoc?.base64Data,
          mimeType: uploadedDoc?.mimeType,
          planName: currentPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate marking scheme.');
      }

      setGeneratedScheme(data.markingScheme);
      setLastSavedId(null);

      // Deduct usage
      if (user) {
        if (typeof recordGenerationUsage === 'function') {
          await recordGenerationUsage();
        }
        // Auto-save to vault for logged in users
        try {
          const docRef = await addDoc(collection(db, 'generations'), {
            userId: user.uid,
            userEmail: user.email,
            subject,
            level,
            paperNumber,
            totalMarks,
            originalExamText: examPaperText.slice(0, 2000),
            markingScheme: data.markingScheme,
            planAtGeneration: currentPlan,
            createdAt: new Date().toISOString(),
          });
          setLastSavedId(docRef.id);
          loadUserHistory();
        } catch (saveErr) {
          console.warn('Could not auto-persist to history collection:', saveErr);
        }
      } else {
        const nextCount = guestGenerationsUsed + 1;
        setGuestGenerationsUsed(nextCount);
        try {
          localStorage.setItem(GUEST_TRIAL_KEY, nextCount.toString());
        } catch (e) {
          // ignore storage error
        }
      }

      setTimeout(() => {
        document.getElementById('marking-scheme-viewer')?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while generating the marking scheme.');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasContentReady = Boolean(examPaperText.trim()) || Boolean(uploadedDoc);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* Gold Top Accent Bar */}
      <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.6)]"></div>

      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <FileCheck2 className="w-6 h-6 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold font-display tracking-tight text-white uppercase">
                  Marking Scheme Generator
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-widest font-mono">
                  Official Standard
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 font-display tracking-wider">
                Comprehensive Assessment Intelligence
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Plan Indicator */}
                <button
                  type="button"
                  id="header-user-plan-badge"
                  onClick={() => {
                    setTargetPricingPlan('Flow');
                    setIsPricingModalOpen(true);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    currentPlan === 'Full'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                      : currentPlan === 'Flow'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-400/50'
                  }`}
                >
                  {currentPlan === 'Full' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  {currentPlan === 'Flow' && <Zap className="w-3.5 h-3.5 text-blue-400" />}
                  <span>{currentPlan} Plan</span>
                  {!isPaidUser && (
                    <span className="text-[10px] font-mono text-amber-400 ml-0.5">
                      ({freeGenerationsRemaining} left)
                    </span>
                  )}
                </button>

                {/* WhatsApp Support Direct Button */}
                <a
                  href="https://wa.me/263788849965?text=Hi%20CRAIN%20TINOMUDA%20SAKALA,%20I%20need%20assistance%20with%20the%20Marking%20Scheme%20Generator"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                  title="Contact CRAIN TINOMUDA SAKALA on WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>0788849965</span>
                </a>

                {/* Admin Button for super admin */}
                {(profile?.role === 'admin' || user.email === 'czytechnology00@gmail.com') && (
                  <button
                    id="btn-open-admin-dashboard"
                    onClick={() => setIsAdminOpen(true)}
                    className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors font-display"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400" /> Admin
                  </button>
                )}

                {/* User email & Logout */}
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[160px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-[160px]">
                    {user.email}
                  </span>
                </div>

                <button
                  id="btn-user-logout"
                  onClick={() => logout()}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300/90 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 mr-1">
                  <span>1 Free Trial Generation Available</span>
                </div>
                <button
                  id="btn-nav-login"
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors font-display"
                >
                  Sign In
                </button>
                <button
                  id="btn-nav-apply-focus"
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-lg shadow-md shadow-amber-500/20 uppercase tracking-wider transition-all font-display"
                >
                  Sign Up (Free)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
        
        {/* Banner */}
        <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-r from-slate-950 via-[#10192E] to-slate-950 border border-amber-500/30 shadow-2xl overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-display uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Official Examination Assessment Intelligence
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white font-display tracking-tight leading-tight">
              Official Exam Marking Scheme Generator
            </h2>
            <p className="text-slate-300 text-xs md:text-sm mt-2 max-w-2xl font-light leading-relaxed">
              Generate structured, authentic marking schemes adhering strictly to 
              <strong> national curriculum assessment standards</strong> with letters and numbers only, bold visible answers, 
              and clear mark allocations.
            </p>

            {/* Quick Actions Strip */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                id="banner-load-sample-btn"
                onClick={handleLoadSampleExam}
                className="px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                Load Sample Exam Paper
              </button>

              <button
                type="button"
                id="banner-upgrade-btn"
                onClick={() => {
                  setTargetPricingPlan('Flow');
                  setIsPricingModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 uppercase tracking-wider transition-all font-display"
              >
                <Zap className="w-4 h-4" />
                Curriculum Tiers & EcoCash
              </button>

              {userHistory.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono pl-2">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>{userHistory.length} saved schemes in your vault</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Banner if any */}
        {errorMsg && (
          <div
            id="app-error-banner"
            className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:underline font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Form & Document Upload (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0F172A] rounded-2xl border border-amber-500/30 p-6 shadow-xl space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider font-display">
                    Exam Specifications
                  </h3>
                </div>
                {/* Generation speed banner */}
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className={getSpeedLabel().color}>{getSpeedLabel().text}</span>
                </div>
              </div>

              {/* Education Level Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-display">
                  Curriculum Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['O-Level', 'A-Level', 'Grade 7'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all text-center font-display ${
                        level === lvl
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-sm shadow-amber-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-display">
                  Examination Subject
                </label>
                <select
                  id="select-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                >
                  {EXAM_SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paper & Total Marks Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-display">
                    Paper Code / Type
                  </label>
                  <input
                    type="text"
                    value={paperNumber}
                    onChange={(e) => setPaperNumber(e.target.value)}
                    placeholder="e.g. Paper 1, Paper 2"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-display">
                    Total Marks Target
                  </label>
                  <input
                    type="text"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    placeholder="e.g. 100, 50, 80"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Exam Session / Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-display">
                  Academic Session / Term
                </label>
                <input
                  type="text"
                  value={examSession}
                  onChange={(e) => setExamSession(e.target.value)}
                  placeholder="e.g. November 2026 / Mid-Year Term 2"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* Exam Paper Input Area & Multi-format Document Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-display">
                    Exam Questions / Upload Paper
                  </label>
                  
                  {/* Document Upload Button supporting PDF, DOCX, DOC, TXT */}
                  <label className="cursor-pointer text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all font-semibold">
                    {isFileExtracting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Reading file...</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Upload PDF / Word / TXT</span>
                      </>
                    )}
                    <input
                      type="file"
                      id="input-document-upload"
                      accept=".pdf,.docx,.doc,.txt,.md,.text"
                      disabled={isFileExtracting}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadedFileName && (
                  <div className="mb-2 p-2.5 bg-slate-900/90 rounded-xl border border-amber-500/30 flex items-center justify-between text-xs text-slate-200 shadow-sm">
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate font-medium">{uploadedFileName}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready for AI
                      </span>
                      <button
                        type="button"
                        onClick={handleClearUploadedFile}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                        title="Remove uploaded document"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  id="textarea-exam-paper"
                  rows={9}
                  value={examPaperText}
                  onChange={(e) => setExamPaperText(e.target.value)}
                  placeholder="Paste questions here or upload your PDF / Word (.docx, .doc) / text document. The AI reads uploaded files directly with high speed..."
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-400 font-mono leading-relaxed"
                />
              </div>

              {/* Custom Guidance */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-display">
                  Special Teacher Notes / Rubric Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Include alternative acceptable answers [owtte] and common pitfalls"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              {/* Generate Button */}
              <button
                id="btn-generate-scheme"
                type="button"
                disabled={isGenerating || isFileExtracting || !hasContentReady}
                onClick={handleGenerateScheme}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-display"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Compiling Official Marking Scheme...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Official Marking Scheme</span>
                  </>
                )}
              </button>

              {/* Teacher Plan & Quota Status Footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Active: <strong className="text-white">{user ? currentPlan : 'Guest (1 Free Trial)'}</strong>
                </span>
                {!isPaidUser ? (
                  <span className="text-amber-400 font-mono">
                    {freeGenerationsRemaining} of 1 free generation left
                  </span>
                ) : (
                  <span className="text-emerald-400 font-mono flex items-center gap-1">
                    Unlimited Active ({currentPlan})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Output Viewer or Empty State (7 cols) */}
          <div className="lg:col-span-7">
            {generatedScheme ? (
              <MarkingSchemeViewer
                content={generatedScheme}
                subject={subject}
                level={level}
                paperNumber={paperNumber}
                planName={currentPlan}
                history={userHistory}
                onManualSave={handleSaveToVault}
                isSavedInHistory={Boolean(lastSavedId)}
                onSelectHistory={(item) => {
                  setGeneratedScheme(item.markingScheme);
                  setSubject(item.subject);
                  setLevel(item.level);
                  setPaperNumber(item.paperNumber);
                  setLastSavedId(item.id);
                }}
              />
            ) : (
              <div className="h-full min-h-[500px] bg-[#0F172A] rounded-2xl border border-slate-800/80 p-8 flex flex-col items-center justify-center text-center shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold font-display text-white mb-2">
                  No Marking Scheme Generated Yet
                </h3>
                <p className="text-slate-400 text-xs max-w-md mb-6 leading-relaxed font-light">
                  Upload your <strong>PDF, Word (.docx, .doc), or text paper</strong>, or paste questions on the left to generate an authentic curriculum marking scheme.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left">
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                    <p className="text-xs font-semibold text-amber-300 font-display flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Authentic Marking Scheme
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Clear sub-question breakdowns, mark allocations, and bold visible possible answers.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                    <p className="text-xs font-semibold text-amber-300 font-display flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      EcoCash *151# & WhatsApp
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Send to 0788849965 (CRAIN TINOMUDA SAKALA) with instant WhatsApp confirmation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Global Clean Footer */}
      <footer
        id="app-global-footer"
        className="mt-12 bg-slate-950 border-t border-slate-800/80 py-5 text-center text-xs text-slate-400 shrink-0"
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-400 text-xs">
            © {new Date().getFullYear()} Marking Scheme Generator • Professional Examination Assessment Standard
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-semibold text-slate-300 font-display tracking-wider uppercase text-[11px]">
              Confidential Marking System
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        targetPlan={targetPricingPlan}
      />

      {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
}
