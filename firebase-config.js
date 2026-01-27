// firebase-config.js - CORRIGIDO
// Importar as funções necessárias do Firebase
import firebase from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js";
import "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js";
import "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage-compat.js";
import "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics-compat.js";

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDtkenwPEZaPFs6BWUZbzkljorWSZGoTgc",
  authDomain: "sitececoni3d.firebaseapp.com",
  projectId: "sitececoni3d",
  storageBucket: "sitececoni3d.firebasestorage.app",
  messagingSenderId: "221241165805",
  appId: "1:221241165805:web:a93d990d14d67476c289e4",
  measurementId: "G-QTHFTLC63T"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);

// Exportar as instâncias para uso em outros arquivos
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const analytics = firebase.analytics();

// Tornar disponível globalmente (para compatibilidade)
window.firebase = firebase; // Essencial para o firebase-service.js funcionar
window.firebaseApp = app;
console.log('✅ Firebase configurado corretamente');