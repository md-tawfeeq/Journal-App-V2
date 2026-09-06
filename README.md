# Gemini Reflect & Journal

A secure, user-authenticated personal reflection and journaling application built with **React**, **Express**, **Firebase Authentication (Google Sign-In)**, **Cloud Firestore**, and **Gemini 3.6 Flash**.

All user reflections and conversational interactions with Gemini are isolated strictly to each authenticated user's private document path in Firestore.

---

## Architecture Overview

- **User Identity**: Firebase Authentication with Google Sign-In (`signInWithPopup`). Does not store raw passwords or emails in local application tables.
- **Backend Database**: Cloud Firestore using owner-bound paths (`/users/{userId}/interactions/{interactionId}`).
- **AI Engine**: Gemini 3.6 Flash with automated fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`).
- **Server Layer**: Full-stack Node.js / Express proxy that keeps `GEMINI_API_KEY` hidden from the client browser.
- **Security & Hygiene**: Undefined-value payload stripping and strict security rules preventing cross-tenant access.

---

## 1. Environment & Prerequisites

1. **Google Cloud SDK**: Install and configure the [`gcloud`](https://cloud.google.com/sdk/docs/install) CLI.
2. **Node.js**: Ensure Node.js 20+ is installed.
3. **Enable Required Google Cloud APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     identitytoolkit.googleapis.com
   ```

---

## 2. Secret Management Setup

Store your Gemini API key securely in Google Cloud Secret Manager, avoiding hardcoded secrets:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the Cloud Run compute service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Deploy the owner-bound security rules to ensure user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Local Development

```bash
# Install dependencies
npm install

# Start development server with live TypeScript execution
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 5. Cloud Run Deployment Flow

Deploy the container directly to Google Cloud Run with the Secret Manager secret mounted:

```bash
# Build and deploy service
gcloud run deploy gemini-reflect-journal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

---

## 6. Required Campaign Verification Labeling

To register the service for automated challenge verification, apply the mandatory resource label:

```bash
gcloud run services update gemini-reflect-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## Threat Model & Security Controls

| Threat Zone | Identified Vector | Implemented Mitigation |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection in journal entries | Schema validation, 20k character limit, null-safe payload parsing. |
| **Planning & Reasoning** | Indirect prompt injection via entry text | User input encapsulated strictly as passive data inside system instructions. |
| **Tool Execution** | Client-side API key compromise | API calls routed through Express backend with lazy SDK initialization. |
| **Memory & State** | Cross-user data leaks in Firestore | Path-bound Firestore security rules (`request.auth.uid == userId`). |
| **Inter-System Comm.** | Unauthorized database write crashes | Strict recursive undefined-stripping prior to SDK persistence. |
