// config.js - Configuração simplificada para Firebase v8
console.log('⚙️  Carregando configuração Firebase v8...');

// Esta configuração é apenas para referência
// O Firebase já será inicializado pelo firebase-service.js
const firebaseConfig = {
    apiKey: "AIzaSyDtkenwPEZaPFs6BWUZbzkljorWSZGoTgc",
    authDomain: "sitececoni3d.firebaseapp.com",
    projectId: "sitececoni3d",
    storageBucket: "sitececoni3d.firebasestorage.app",
    messagingSenderId: "221241165805",
    appId: "1:221241165805:web:a93d990d14d67476c289e4",
    measurementId: "G-QTHFTLC63T"
};

console.log('✅ Configuração Firebase carregada para projeto:', firebaseConfig.projectId);

// Adicionar funções de debug global
window.debugFirebase = function() {
    console.log('=== DEBUG FIREBASE ===');
    console.log('Firebase global:', typeof firebase);
    console.log('Versão Firebase:', firebase?.SDK_VERSION);
    console.log('Apps Firebase:', firebase?.apps?.length || 0);
    console.log('FirebaseService:', window.firebaseService ? 'Carregado' : 'Não carregado');
    
    if (window.firebaseService) {
        console.log('Firestore:', !!firebaseService.db);
        console.log('Auth:', !!firebaseService.auth);
        console.log('Storage:', !!firebaseService.storage);
        console.log('Usuário atual:', firebaseService.auth?.currentUser?.email || 'Não logado');
    }
    
    // Testar conexão
    if (window.firebaseService) {
        firebaseService.testFirestoreConnection();
    }
};