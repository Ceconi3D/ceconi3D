// firebase-service.js - VERSÃO MODERNA (SDK 9.22.2)
class FirebaseService {
    constructor(auth, db, storage) {
        this.auth = auth;
        this.db = db;
        this.storage = storage;
        this.failedAttempts = 0;
        this.MAX_ATTEMPTS = 5;
        this.LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos
        
        console.log('✅ FirebaseService inicializado com SDK moderno');
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
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js');
            
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

            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            
            // Login bem-sucedido - resetar tentativas
            this.failedAttempts = 0;
            localStorage.removeItem('admin_lockout_time');
            localStorage.setItem('admin_last_login', Date.now().toString());
            
            console.log('✅ Login bem-sucedido:', userCredential.user.email);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('❌ Erro no login:', error);
            
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
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js');
            await signOut(this.auth);
            localStorage.removeItem('admin_last_login');
            console.log('✅ Logout realizado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao fazer logout:', error);
        }
    }

    checkAuth() {
        return new Promise((resolve) => {
            import('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js').then(module => {
                module.onAuthStateChanged(this.auth, (user) => {
                    resolve(!!user);
                });
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
            const { collection, orderBy, query, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
            
            console.log('🔍 Buscando produtos do Firestore...');
            const q = query(collection(this.db, 'products'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            
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
            const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
            
            const docRef = doc(this.db, 'products', id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('❌ Erro ao buscar produto:', error);
            return null;
        }
    }

    async saveProduct(productData) {
        try {
            const { collection, doc, setDoc, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
            
            const product = {
                ...productData,
                createdAt: productData.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            if (productData.id) {
                // Atualizar produto existente
                const docRef = doc(this.db, 'products', productData.id);
                await setDoc(docRef, product, { merge: true });
                console.log('✅ Produto atualizado:', productData.id);
                return { success: true, id: productData.id };
            } else {
                // Adicionar novo produto
                const docRef = await addDoc(collection(this.db, 'products'), product);
                console.log('✅ Novo produto criado:', docRef.id);
                return { success: true, id: docRef.id };
            }
        } catch (error) {
            console.error('❌ Erro ao salvar produto:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteProduct(productId) {
        try {
            const { collection, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
            
            await deleteDoc(doc(this.db, 'products', productId));
            console.log('✅ Produto excluído:', productId);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao excluir produto:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== UPLOAD DE IMAGENS ==========
    async uploadImage(file, productId) {
        try {
            const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js');
            
            const fileName = `products/${productId}/${Date.now()}_${file.name}`;
            const storageRef = ref(this.storage, fileName);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            console.log('✅ Imagem salva:', downloadURL);
            return { success: true, url: downloadURL };
        } catch (error) {
            console.error('❌ Erro ao fazer upload da imagem:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteImage(imageUrl) {
        try {
            const { ref, deleteObject } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js');
            
            const imageRef = ref(this.storage, imageUrl);
            await deleteObject(imageRef);
            
            console.log('✅ Imagem excluída');
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao excluir imagem:', error);
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
            console.error('❌ Erro ao buscar estatísticas:', error);
            return null;
        }
    }

    async calculateStorageSize(products) {
        const dataString = JSON.stringify(products);
        return new Blob([dataString]).size;
    }
}

// Exportar a classe para uso como módulo
export { FirebaseService };