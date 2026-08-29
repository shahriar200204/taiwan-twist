import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  onIdTokenChanged,
  getIdToken,
  getIdTokenResult,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// Default config from environment or embedded applet config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC05WQiiaoLOa41oF3sv8zTBgjt2l4B5CU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "witty-valor-9dtd0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "witty-valor-9dtd0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "witty-valor-9dtd0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "762843238753",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:762843238753:web:e00d670eb57482e0d77520",
  firestoreDatabaseId: "ai-studio-3d05ccdf-be37-4adc-85ce-7bc170b76904"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if supported, fallback to default
let firestoreDb;
try {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn("Falling back to default Firestore database", e);
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  onIdTokenChanged,
  getIdToken,
  getIdTokenResult
};
export type { FirebaseUser };
