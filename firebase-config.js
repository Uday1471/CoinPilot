
const firebaseConfig = {
  apiKey: "AIzaSyCNXuQDGoCdxCqhn9fP7HPo-kd_BVyJJGc",
  authDomain: "personal-finance-tracker-b96bf.firebaseapp.com",
  projectId: "personal-finance-tracker-b96bf",
  storageBucket: "personal-finance-tracker-b96bf.firebasestorage.app",
  messagingSenderId: "229773200863",
  appId: "1:229773200863:web:3337382d85d7250b6d886a",
  measurementId: "G-MWPE179L4D",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
console.log("Firebase initialized"); // Debug log
