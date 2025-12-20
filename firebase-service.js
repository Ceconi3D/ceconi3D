// firebase-service.js - VERSÃO CORRIGIDA COM SEGURANÇA
class FirebaseService {
    constructor() {
        // Inicializar Firebase diretamente aqui
        this.initializeFirebase();
        this.failedAttempts = 0;
        this.MAX_ATTEMPTS = 5;
        this.LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos
    }

    initializeFirebase() {
        // Configuração do Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyAV8cgruzRw_WHAtVBjBm2FYRqSp4Ps60A",
            authDomain: "teste-site-b58d5.firebaseapp.com",
            projectId: "teste-site-b58d5",
            storageBucket: "teste-site-b58d5.firebasestorage.app",
            messagingSenderId: "90201089059",
            appId: "1:90201089059:web:78eddc1ed353099f71bd96",
            measurementId: "G-4Q7QBDJDCS"
        };

        // Inicializar Firebase
        this.app = firebase.initializeApp(firebaseConfig);
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.auth = firebase.auth();
        
        console.log('✅ Firebase inicializado no Service');
    }

    // ========== VALIDAÇÃO DE SEGURANÇA ==========
    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const requirements = {
            length: password.length >= minLength,
            upperCase: hasUpperCase,
            lowerCase: hasLowerCase,
            numbers: hasNumbers,
            specialChar: hasSpecialChar,
            isStrong: password.length >= minLength && 
                     hasUpperCase && 
                     hasLowerCase && 
                     hasNumbers && 
                     hasSpecialChar
        };
        
        return requirements;
    }

    getPasswordStrengthMessage(password) {
        const validation = this.validatePassword(password);
        const messages = [];
        
        if (!validation.length) messages.push('mínimo 8 caracteres');
        if (!validation.upperCase) messages.push('letra maiúscula');
        if (!validation.lowerCase) messages.push('letra minúscula');
        if (!validation.numbers) messages.push('número');
        if (!validation.specialChar) messages.push('símbolo especial');
        
        return messages.length > 0 ? 
            `Senha fraca. Adicione: ${messages.join(', ')}` : 
            'Senha forte ✓';
    }

    isAccountLocked() {
        const lockTime = localStorage.getItem('admin_lockout_time');
        if (lockTime) {
            const lockUntil = parseInt(lockTime);
            if (Date.now() < lockUntil) {
                const minutesLeft = Math.ceil((lockUntil - Date.now()) / (60 * 1000));
                return `Conta temporariamente bloqueada. Tente novamente em ${minutesLeft} minutos.`;
            } else {
                localStorage.removeItem('admin_lockout_time');
                this.failedAttempts = 0;
            }
        }
        return null;
    }

    // ========== AUTENTICAÇÃO SEGURA ==========
    async loginAdmin(email, password) {
        try {
            // Verificar se a conta está bloqueada
            const lockError = this.isAccountLocked();
            if (lockError) {
                return { success: false, error: lockError };
            }

            // Validar força da senha
            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.isStrong) {
                return { 
                    success: false, 
                    error: this.getPasswordStrengthMessage(password)
                };
            }

            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            // Login bem-sucedido - resetar tentativas
            this.failedAttempts = 0;
            localStorage.removeItem('admin_lockout_time');
            localStorage.setItem('admin_last_login', Date.now().toString());
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Erro no login:', error);
            
            // Incrementar tentativas falhas
            this.failedAttempts++;
            
            // Bloquear conta após muitas tentativas
            if (this.failedAttempts >= this.MAX_ATTEMPTS) {
                const lockoutTime = Date.now() + this.LOCKOUT_TIME;
                localStorage.setItem('admin_lockout_time', lockoutTime.toString());
                return { 
                    success: false, 
                    error: `Muitas tentativas falhas. Conta bloqueada por 15 minutos.` 
                };
            }
            
            const attemptsLeft = this.MAX_ATTEMPTS - this.failedAttempts;
            let errorMessage = error.message;
            
            // Mensagens de erro mais amigáveis
            if (error.code === 'auth/wrong-password') {
                errorMessage = `Senha incorreta. ${attemptsLeft > 0 ? `${attemptsLeft} tentativas restantes.` : 'Conta será bloqueada.'}`;
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'Usuário não encontrado.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'E-mail inválido.';
            }
            
            return { 
                success: false, 
                error: errorMessage,
                attemptsLeft: attemptsLeft
            };
        }
    }

    async logout() {
        await this.auth.signOut();
        localStorage.removeItem('admin_last_login');
    }

    checkAuth() {
        return new Promise((resolve) => {
            this.auth.onAuthStateChanged((user) => {
                resolve(!!user);
            });
        });
    }

    getSecurityStatus() {
        const lastLogin = localStorage.getItem('admin_last_login');
        const lockTime = localStorage.getItem('admin_lockout_time');
        
        return {
            isLocked: lockTime && Date.now() < parseInt(lockTime),
            failedAttempts: this.failedAttempts,
            lastLogin: lastLogin ? new Date(parseInt(lastLogin)) : null,
            attemptsLeft: this.MAX_ATTEMPTS - this.failedAttempts
        };
    }

    // ========== PRODUTOS ==========
    async getProducts() {
        try {
            console.log('🔍 Buscando produtos do Firestore...');
            const snapshot = await this.db.collection('products')
                .orderBy('createdAt', 'desc')
                .get();
            
            const products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ ${products.length} produtos encontrados`);
            return products;
        } catch (error) {
            console.error('❌ Erro ao buscar produtos:', error);
            return [];
        }
    }

    async getProductById(id) {
        try {
            const doc = await this.db.collection('products').doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            return null;
        }
    }

    async saveProduct(productData) {
        try {
            const product = {
                ...productData,
                createdAt: productData.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (productData.id) {
                // Atualizar produto existente
                await this.db.collection('products').doc(productData.id).update(product);
                return { success: true, id: productData.id };
            } else {
                // Adicionar novo produto
                const docRef = await this.db.collection('products').add(product);
                return { success: true, id: docRef.id };
            }
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteProduct(productId) {
        try {
            await this.db.collection('products').doc(productId).delete();
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== UPLOAD DE IMAGENS ==========
    async uploadImage(file, productId) {
        try {
            const fileName = `products/${productId}/${Date.now()}_${file.name}`;
            const storageRef = this.storage.ref().child(fileName);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            return { success: true, url: downloadURL };
        } catch (error) {
            console.error('Erro ao fazer upload da imagem:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteImage(imageUrl) {
        try {
            const imageRef = this.storage.refFromURL(imageUrl);
            await imageRef.delete();
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir imagem:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== ESTATÍSTICAS ==========
    async getDashboardStats() {
        try {
            const products = await this.getProducts();
            const categories = [...new Set(products.map(p => p.category))];
            return {
                totalProducts: products.length,
                totalCategories: categories.length,
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return null;
        }
    }

    async calculateStorageSize(products) {
        const dataString = JSON.stringify(products);
        return new Blob([dataString]).size;
    }
}

// Instância global do serviço
const firebaseService = new FirebaseService();
window.firebaseService = firebaseService;