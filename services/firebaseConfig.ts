import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLaOaW9TwZEMEoZOm8PA-1rM-sQSghpkM",
  authDomain: "voicesocial-56a00.firebaseapp.com",
  projectId: "voicesocial-56a00",
  storageBucket: "voicesocial-56a00.firebasestorage.app",
  messagingSenderId: "576952416734",
  appId: "1:576952416734:web:4895dc1abd06d7eb5a454f",
  measurementId: "G-K79J8XZH73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use the standard getAuth() to ensure a singleton instance is shared across the app.
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, app };
