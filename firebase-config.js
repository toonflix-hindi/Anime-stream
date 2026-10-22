/* ============================================================
   Firebase initialization — Realtime Database
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyBHCaQPCzEJ0QTPZaXgx0xuk4f6eb_OuRU",
  authDomain: "anistreamx-903a3.firebaseapp.com",
  databaseURL: "https://anistreamx-903a3-default-rtdb.firebaseio.com",
  projectId: "anistreamx-903a3",
  storageBucket: "anistreamx-903a3.firebasestorage.app",
  messagingSenderId: "670816164518",
  appId: "1:670816164518:web:6a3222731f6b22696d3267",
  measurementId: "G-DW23SVGE6W"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const animeRef = db.ref('anime');
