# Standalone Vanilla HTML, CSS & JavaScript Frontend

This folder (`frontend-html-css-js/`) contains the complete frontend designed purely with **HTML, CSS, and vanilla JavaScript**—requiring **NO npm build, NO TypeScript, and NO bundler**.

## What's Included
1. **`index.html`**: Clean semantic HTML structure with exam inputs, level pickers, file upload, bold visible answer viewer, and Firebase Auth/EcoCash modals.
2. **`style.css`**: Complete responsive dark theme with high contrast, badge styling, loading animations, and full `@media print` examination formatting.
3. **`app.js`**: Pure JavaScript application controller handling:
   - Dynamic connection to your Render backend (`POST /api/generate-marking-scheme`)
   - Output formatting with bold "Possible Answer" badges
   - Strict alphanumeric checking (letters & numbers only)
   - Copy, TXT export, Word (.doc) export, and Print
   - Firebase Auth (Email/Password & Google Sign In)
   - Cloud saving to Firestore (`papers` collection)
4. **`firebase-config.js`**: Pre-configured with your exact Firebase project credentials:
   - Project ID: `gen-lang-client-0831390119`
   - Firestore Database ID: `ai-studio-b80735e4-6cd7-4d23-86cb-6f8e4f749336`

---

## How to Deploy to Firebase Hosting in 2 Steps

### Step 1: Update your `firebase.json`
In your project root, open `firebase.json` and set `"public"` to `"frontend-html-css-js"`:

```json
{
  "hosting": {
    "public": "frontend-html-css-js",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Step 2: Deploy
In your terminal, run:
```bash
firebase deploy --only hosting
```

That's it! Firebase will immediately upload `index.html`, `style.css`, and `app.js`. 
You do **not** need to run `npm run build` or worry about module MIME type errors.
