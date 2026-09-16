// Vanilla JavaScript Application Controller
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Use firestoreDatabaseId if configured in the project
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// State Variables
let currentUser = null;
let currentSchemeText = "";
let uploadedBase64 = null;
let uploadedMimeType = null;

// Backend API URL (stored in localStorage so it persists across sessions)
const DEFAULT_BACKEND_URL = "https://marking-scheme-generator-backend.onrender.com";
let currentBackendUrl = localStorage.getItem("render_backend_url") || DEFAULT_BACKEND_URL;

// DOM Elements
const backendUrlInput = document.getElementById("backend-url-input");
const btnSaveBackend = document.getElementById("btn-save-backend");
const backendStatus = document.getElementById("backend-status");

const examLevelSelect = document.getElementById("exam-level");
const subjectSelect = document.getElementById("subject-select");
const paperNumberInput = document.getElementById("paper-number");
const totalMarksInput = document.getElementById("total-marks");
const examSessionInput = document.getElementById("exam-session");
const instructionsInput = document.getElementById("instructions");
const examQuestionsTextarea = document.getElementById("exam-questions");

const fileInput = document.getElementById("file-input");
const fileDropZone = document.getElementById("file-drop-zone");
const fileNameDisplay = document.getElementById("file-name-display");

const btnLoadSample = document.getElementById("btn-load-sample");
const btnGenerate = document.getElementById("btn-generate");
const btnText = document.getElementById("btn-text");
const btnSpinner = document.getElementById("btn-spinner");

const outputBox = document.getElementById("output-box");
const actionToolbar = document.getElementById("action-toolbar");
const btnCopy = document.getElementById("btn-copy");
const btnDownloadTxt = document.getElementById("btn-download-txt");
const btnDownloadDoc = document.getElementById("btn-download-doc");
const btnPrint = document.getElementById("btn-print");
const btnSaveHistory = document.getElementById("btn-save-history");

// Auth Elements
const authStatusArea = document.getElementById("auth-status-area");
const btnOpenAuth = document.getElementById("btn-open-auth");
const authModal = document.getElementById("auth-modal");
const authClose = document.getElementById("auth-close");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const btnGoogleAuth = document.getElementById("btn-google-auth");
const authToggle = document.getElementById("auth-toggle");
const authTitle = document.getElementById("auth-title");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authError = document.getElementById("auth-error");

// Pricing / EcoCash Elements
const btnPricing = document.getElementById("btn-pricing");
const pricingModal = document.getElementById("pricing-modal");
const pricingClose = document.getElementById("pricing-close");

let isSignUpMode = false;

// Initialize Backend URL Input
if (backendUrlInput) {
  backendUrlInput.value = currentBackendUrl;
}

// Test Backend Connection
async function checkBackendHealth() {
  if (!backendStatus) return;
  backendStatus.textContent = "Checking Render Backend...";
  backendStatus.className = "badge badge-gold";

  try {
    const res = await fetch(`${currentBackendUrl}/health`, { method: "GET" });
    if (res.ok) {
      backendStatus.textContent = "Backend Online (Render)";
      backendStatus.className = "badge badge-render";
    } else {
      backendStatus.textContent = "Backend Responded: " + res.status;
      backendStatus.className = "badge badge-gold";
    }
  } catch (err) {
    backendStatus.textContent = "Backend Unreachable (Check Render URL)";
    backendStatus.className = "badge";
    backendStatus.style.background = "#450a0a";
    backendStatus.style.color = "#fca5a5";
  }
}

// Save Backend URL
if (btnSaveBackend) {
  btnSaveBackend.addEventListener("click", () => {
    const val = (backendUrlInput.value || "").trim().replace(/\/+$/, "");
    if (val) {
      currentBackendUrl = val;
      localStorage.setItem("render_backend_url", currentBackendUrl);
      checkBackendHealth();
    }
  });
}

// Check connection on load
checkBackendHealth();

// Sample Exam Content
const SAMPLE_EXAM = `ZIMBABWE SCHOOL EXAMINATIONS COUNCIL
General Certificate of Education Ordinary Level
COMBINED SCIENCE 4003/2
PAPER 2 Theory

SECTION A
Question 1
(a) Define the term respiration. (2 marks)
(b) State three differences between aerobic and anaerobic respiration. (3 marks)
(c) Name the organ in humans responsible for gaseous exchange. (1 mark)

Question 2
(a) State Ohm's law. (2 marks)
(b) Calculate the current flowing through a 10 ohm resistor connected to a 12 volt supply. (2 marks)

SECTION B
Question 3
(a) Describe the industrial manufacture of ammonia by the Haber process. (4 marks)
(b) State two conditions required for the Haber process. (2 marks)`;

if (btnLoadSample) {
  btnLoadSample.addEventListener("click", () => {
    examLevelSelect.value = "O-Level (Form 3 - 4)";
    subjectSelect.value = "Combined Science";
    paperNumberInput.value = "Paper 2 (Theory & Structured)";
    totalMarksInput.value = "100";
    examSessionInput.value = "November Session";
    examQuestionsTextarea.value = SAMPLE_EXAM;
  });
}

// File Upload Handler
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileNameDisplay.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileNameDisplay.style.display = "block";

    const reader = new FileReader();
    if (file.type === "application/pdf") {
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        uploadedBase64 = base64;
        uploadedMimeType = "application/pdf";
      };
      reader.readAsDataURL(file);
    } else {
      // Plain text or word text
      reader.onload = () => {
        const text = reader.result;
        if (typeof text === "string") {
          examQuestionsTextarea.value = text;
        }
      };
      reader.readAsText(file);
    }
  });
}

if (fileDropZone) {
  fileDropZone.addEventListener("click", () => fileInput.click());
  fileDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileDropZone.style.borderColor = "#2563eb";
  });
  fileDropZone.addEventListener("dragleave", () => {
    fileDropZone.style.borderColor = "";
  });
  fileDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDropZone.style.borderColor = "";
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event("change"));
    }
  });
}

// Generate Marking Scheme
if (btnGenerate) {
  btnGenerate.addEventListener("click", async () => {
    const questions = examQuestionsTextarea.value.trim();
    if (!questions && !uploadedBase64) {
      alert("Please paste exam questions or select a file first.");
      return;
    }

    btnGenerate.disabled = true;
    btnText.textContent = "Generating in < 1s...";
    btnSpinner.style.display = "inline-block";

    outputBox.innerHTML = `
      <div class="output-placeholder">
        <div class="spinner" style="width: 36px; height: 36px; margin-bottom: 1rem;"></div>
        <p style="color: #60a5fa; font-weight: 600;">Generating Official Marking Scheme...</p>
        <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">Ultra-fast Assessment Engine active</p>
      </div>
    `;

    try {
      const response = await fetch(`${currentBackendUrl}/api/generate-marking-scheme`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: subjectSelect.value,
          level: examLevelSelect.value,
          paperNumber: paperNumberInput.value,
          totalMarks: totalMarksInput.value,
          examYearOrSession: examSessionInput.value,
          instructions: instructionsInput.value,
          extractedExamText: questions,
          pdfBase64: uploadedBase64,
          mimeType: uploadedMimeType,
          planName: "Full"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate marking scheme.");
      }

      currentSchemeText = data.markingScheme;
      renderMarkingScheme(currentSchemeText);
      actionToolbar.style.display = "flex";
    } catch (err) {
      console.error(err);
      outputBox.innerHTML = `
        <div class="output-placeholder" style="color: #ef4444;">
          <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0.5rem;">Generation Error</p>
          <p style="font-size: 0.9rem; max-width: 450px;">${err.message}</p>
          <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 1rem;">
            Make sure your Render backend service is awake and the Backend URL above is correct.
          </p>
        </div>
      `;
    } finally {
      btnGenerate.disabled = false;
      btnText.textContent = "Generate Official Marking Scheme";
      btnSpinner.style.display = "none";
    }
  });
}

// Render Formatted Marking Scheme with Bold Visible Answers
function renderMarkingScheme(rawText) {
  if (!rawText) return;

  const lines = rawText.split("\n");
  let html = `<div class="scheme-rendered">`;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      html += `<div style="height: 0.5rem;"></div>`;
      return;
    }

    // Question header line
    if (/^Question\s+\d+/i.test(trimmed) || /^SECTION/i.test(trimmed)) {
      html += `<div class="question-header">${escapeHtml(trimmed)}</div>`;
    } 
    // Possible Answer banner
    else if (/^Possible\s+Answer/i.test(trimmed)) {
      html += `<div><span class="possible-answer-banner">Possible Answer</span></div>`;
    }
    // Answer points with mark allocation
    else if (/\b\d+\s+marks?\b/i.test(trimmed)) {
      const markMatch = trimmed.match(/\b(\d+\s+marks?)\b/i);
      const markText = markMatch ? markMatch[1] : "";
      const textWithoutMark = trimmed.replace(/\b\d+\s+marks?\b/i, "").trim();

      html += `
        <div class="answer-point">
          <span><strong>${escapeHtml(textWithoutMark)}</strong></span>
          <span class="mark-tag">${escapeHtml(markText)}</span>
        </div>
      `;
    }
    // Total / Note lines
    else if (/^Total/i.test(trimmed) || /^Examiner\s+Note/i.test(trimmed)) {
      html += `<div style="margin-top: 0.5rem; color: #fbbf24; font-weight: 700; font-size: 0.9rem;">${escapeHtml(trimmed)}</div>`;
    }
    // Standard line
    else {
      html += `<div style="color: #e2e8f0;">${escapeHtml(trimmed)}</div>`;
    }
  });

  html += `</div>`;
  outputBox.innerHTML = html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Actions: Copy, Download, Print
if (btnCopy) {
  btnCopy.addEventListener("click", () => {
    if (!currentSchemeText) return;
    navigator.clipboard.writeText(currentSchemeText).then(() => {
      const prev = btnCopy.textContent;
      btnCopy.textContent = "Copied!";
      setTimeout(() => (btnCopy.textContent = prev), 2000);
    });
  });
}

if (btnDownloadTxt) {
  btnDownloadTxt.addEventListener("click", () => {
    if (!currentSchemeText) return;
    const blob = new Blob([currentSchemeText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${subjectSelect.value}_Marking_Scheme.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

if (btnDownloadDoc) {
  btnDownloadDoc.addEventListener("click", () => {
    if (!currentSchemeText) return;
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Marking Scheme</title><meta charset='utf-8'></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #1e3a8a;">${subjectSelect.value} — ${paperNumberInput.value}</h2>
        <p><strong>Level:</strong> ${examLevelSelect.value} | <strong>Session:</strong> ${examSessionInput.value}</p>
        <hr/>
        <pre style="font-family: inherit; font-size: 11pt; white-space: pre-wrap;">${currentSchemeText}</pre>
      </body>
      </html>
    `;
    const blob = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${subjectSelect.value}_Marking_Scheme.doc`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

if (btnPrint) {
  btnPrint.addEventListener("click", () => {
    window.print();
  });
}

// Save to Firebase Firestore
if (btnSaveHistory) {
  btnSaveHistory.addEventListener("click", async () => {
    if (!currentUser) {
      alert("Please Sign In first to save your marking scheme to your account.");
      openAuthModal();
      return;
    }
    if (!currentSchemeText) return;

    try {
      btnSaveHistory.textContent = "Saving...";
      await addDoc(collection(db, "papers"), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        subject: subjectSelect.value,
        level: examLevelSelect.value,
        paperNumber: paperNumberInput.value,
        markingScheme: currentSchemeText,
        createdAt: serverTimestamp()
      });
      btnSaveHistory.textContent = "Saved to Cloud!";
      setTimeout(() => (btnSaveHistory.textContent = "Save to History"), 2000);
    } catch (err) {
      console.error(err);
      alert("Error saving: " + err.message);
      btnSaveHistory.textContent = "Save to History";
    }
  });
}

// Firebase Auth UI Management
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    authStatusArea.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 0.8rem; color: #94a3b8;">${user.email || "Educator"}</span>
        <button id="btn-logout" class="btn-sm" style="background: #374151;">Log Out</button>
      </div>
    `;
    document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));
  } else {
    authStatusArea.innerHTML = `
      <button id="btn-open-auth" class="btn-sm" style="background: #2563eb; border: none;">Sign In</button>
    `;
    document.getElementById("btn-open-auth").addEventListener("click", openAuthModal);
  }
});

function openAuthModal() {
  authModal.classList.add("active");
}

function closeAuthModal() {
  authModal.classList.remove("active");
  authError.style.display = "none";
}

if (authClose) authClose.addEventListener("click", closeAuthModal);

if (authToggle) {
  authToggle.addEventListener("click", (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    authTitle.textContent = isSignUpMode ? "Create Educator Account" : "Sign In to Educator Vault";
    authSubmitBtn.textContent = isSignUpMode ? "Create Account" : "Sign In";
    authToggle.textContent = isSignUpMode 
      ? "Already have an account? Sign In" 
      : "Need an account? Sign Up";
  });
}

if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    authError.style.display = "none";

    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      closeAuthModal();
    } catch (err) {
      authError.textContent = err.message;
      authError.style.display = "block";
    }
  });
}

if (btnGoogleAuth) {
  btnGoogleAuth.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      closeAuthModal();
    } catch (err) {
      authError.textContent = err.message;
      authError.style.display = "block";
    }
  });
}

// Pricing / EcoCash Modal
if (btnPricing) {
  btnPricing.addEventListener("click", () => {
    pricingModal.classList.add("active");
  });
}

if (pricingClose) {
  pricingClose.addEventListener("click", () => {
    pricingModal.classList.remove("active");
  });
}
