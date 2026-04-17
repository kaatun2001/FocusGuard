import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 SETUP REQUIRED
// 1. Go to https://console.firebase.google.com
// 2. Create a project → Add a Web app → copy the config below
// 3. Enable Authentication → Sign-in methods: Google + Email/Password
// 4. Enable Firestore Database (start in production mode, add rules below)
// 5. For Google Sign-In in the extension: Authentication → Settings →
//    Authorized domains → add  chrome-extension://YOUR_EXTENSION_ID
//
// Firestore security rules (Firestore → Rules):
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{uid}/{document=**} {
//         allow read, write: if request.auth != null && request.auth.uid == uid;
//       }
//     }
//   }
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAMiX_x4akS1BHXijt0J5lVIfOXEy8Dmj4",
  authDomain: "focusguard-a57fd.firebaseapp.com",
  projectId: "focusguard-a57fd",
  storageBucket: "focusguard-a57fd.firebasestorage.app",
  messagingSenderId: "76948792389",
  appId: "1:76948792389:web:467de77f60b12d5efdef2c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const isConfigured = true;

// Google OAuth Client ID — needed for Chrome extension Google Sign-In.
// Find it in: Firebase Console → Authentication → Sign-in method →
// Google → Web SDK configuration → Web client ID
// It looks like: 76948792389-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
//
// Also add this redirect URI to Google Cloud Console → APIs & Services →
// Credentials → your Web client → Authorized redirect URIs:
//   https://<YOUR_EXTENSION_ID>.chromiumapp.org/
export const GOOGLE_CLIENT_ID =
  "76948792389-u2hheeudu7m2sdkr16951s47kirt7413.apps.googleusercontent.com";
