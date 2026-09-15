# Full Deployment Guide: Firebase Hosting (Frontend) & Render (Backend)

This guide explains step-by-step how to export your code, deploy the **Backend on Render**, and deploy the **Frontend on Firebase Hosting** as a static application.

---

## Architecture Overview

```
 ┌──────────────────────────────────────┐             ┌─────────────────────────────────────┐
 │    Frontend (Static Web App)         │             │      Backend API (Node.js/Express)  │
 │    Deployed on Firebase Hosting      │ ──────────> │      Deployed on Render             │
 │    https://your-app.web.app          │   POST /api │      https://your-backend.onrender  │
 └──────────────────────────────────────┘             └─────────────────────────────────────┘
                                                                     │
                                                                     ▼
                                                      Google Gemini 2.5 Flash
                                                      (AIzaSyB7kOwOp2hbSSPKG4Vq6sJIKWl1xWWf_Hs)
```

---

## Step 1: Deploy Backend to Render

1. Create a free account on [Render.com](https://render.com).
2. Push your project to GitHub (or export ZIP and push to GitHub).
3. On your Render Dashboard, click **New +** -> **Web Service**.
4. Select your GitHub repository.
5. Configure the service settings:
   - **Name**: `marking-scheme-generator-backend`
   - **Root Directory**: `backend`
   - **Environment / Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. In **Environment Variables**, ensure you have:
   - `GEMINI_API_KEY` = `AIzaSyB7kOwOp2hbSSPKG4Vq6sJIKWl1xWWf_Hs`
   - `PORT` = `10000` (Render provides this automatically)
7. Click **Deploy Web Service**.
8. Once deployment finishes, Render will show your public service URL, for example:
   `https://marking-scheme-generator-backend.onrender.com`
9. Test your backend in your browser:
   Visit `https://marking-scheme-generator-backend.onrender.com/` — it should return:
   ```json
   {"status":"online","service":"Marking Scheme Generator Backend API","version":"1.0.0"}
   ```

---

## Step 2: Configure Frontend with Your Render URL

Before building the frontend for Firebase Hosting, link it to your Render backend:

### Option A: Via `.env.production` (Recommended)
Create a file named `.env.production` in the project root:
```env
VITE_API_URL=https://marking-scheme-generator-backend.onrender.com
```
*(Replace with your actual Render URL from Step 1)*

### Option B: Directly in `src/config.ts`
Open `src/config.ts` and set:
```ts
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://marking-scheme-generator-backend.onrender.com';
```

---

## Step 3: Deploy Frontend to Firebase Hosting

1. Install the Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```
2. Log into Firebase:
   ```bash
   firebase login
   ```
3. Build the static production bundle:
   ```bash
   npm run build
   ```
   *(This compiles optimized static assets into the `dist/` directory)*
4. Deploy the static assets to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```
5. Firebase will provide your live URL:
   `https://ai-studio-b80735e4-6cd7-4d23-86cb-6f8e4f749336.web.app` (or your custom domain).

---

## File Structure Reference

```
├── backend/                      <-- Standalone Backend (deploy this to Render)
│   ├── package.json              <-- Lightweight dependencies (Express, GenAI, dotenv)
│   ├── server.js                 <-- Server code with CORS and Gemini 2.5 Flash
│   ├── render.yaml               <-- Render Blueprint config
│   ├── .env.example              <-- Environment template with your API key
│   └── README.md                 <-- Backend deployment quick reference
│
├── src/                          <-- Frontend React 19 + TypeScript + Tailwind
│   ├── config.ts                 <-- API URL configuration (switches to Render in prod)
│   ├── App.tsx                   <-- Main UI & Marking Scheme Engine
│   └── ...
├── firebase.json                 <-- Firebase Hosting SPA static configuration
├── .firebaserc                   <-- Firebase project mapping
├── package.json                  <-- Main workspace package
└── DEPLOYMENT.md                 <-- This guide
```
