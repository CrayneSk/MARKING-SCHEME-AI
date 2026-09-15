# Marking Scheme Generator — Backend (Render)

This directory contains the standalone Node.js Express backend API for the Marking Scheme Generator, pre-configured for free deployment on **Render.com**.

## Features
- Ultra-fast marking scheme generation powered by `@google/genai` (`gemini-2.5-flash`).
- Embedded zero-thinking budget configuration for sub-second generation.
- Full CORS support to communicate with your Firebase Hosting frontend.
- Strict alphanumeric sanitizer (letters and numbers only).
- Multi-format payload support for PDF and Word documents.

---

## Deploy to Render in 3 Steps

### Option A: Via GitHub Repository
1. Push this code to your GitHub repository.
2. Log into [Render.com](https://render.com) and click **New +** -> **Web Service**.
3. Select your GitHub repository:
   - **Root Directory**: `backend` (if in a monorepo) or leave empty if this folder is its own repo.
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**:
     - `GEMINI_API_KEY`: `AIzaSyB7kOwOp2hbSSPKG4Vq6sJIKWl1xWWf_Hs` (or your own key)
4. Click **Create Web Service**.
5. Once deployed, Render will provide your public URL (e.g. `https://marking-scheme-backend.onrender.com`).
6. Copy that URL and paste it into `VITE_API_URL` on your frontend before deploying to Firebase Hosting!

### Option B: Local Testing
```bash
cd backend
npm install
npm start
```
The server will start on `http://localhost:3000`.
Test health endpoint:
```bash
curl http://localhost:3000/
```
