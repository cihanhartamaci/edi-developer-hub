// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDeVEDCwkdwjsn6HXF_sMZNQR9VlS-T15I",
    authDomain: "edi-analytics-d33dd.firebaseapp.com",
    projectId: "edi-analytics-d33dd",
    storageBucket: "edi-analytics-d33dd.firebasestorage.app",
    messagingSenderId: "449890207748",
    appId: "1:449890207748:web:9c3418efd47ff2f9cc0d51",
    measurementId: "G-E4R0T2E9PG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth, collection, addDoc, getDocs, onSnapshot, query, orderBy, limit, serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged };
