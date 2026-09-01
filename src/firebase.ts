import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Silence Firestore warnings like "Could not reach Cloud Firestore backend..." that are triggered during long polling fallback
setLogLevel('error');

// Initialize Firebase services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
