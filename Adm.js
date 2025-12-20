// ========================================================================
// === VARIAVEIS GLOBAIS E INICIALIZAÇÃO
// ========================================================================

// Array global de produtos
let products = [];
// Armazena arquivos para upload
let productFiles = [];
// ID do produto em edição
let editingProductId = null;

// Variáveis de paginação e filtro
let currentPage = 1;
let itemsPerPage = 25;
let currentSearchTerm = '';
let currentCategoryFilter = 'all';
let currentSortBy = 'newest';
let currentView = 'grid';

// Elementos do DOM
const loadingOverlay = document.getElementById('loading-overlay');
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminEmailSpan = document.getElementById('admin-user-email');

// Modal de Confirmação
const confirmModal = document.getElementById('confirm-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
let confirmAction = null;

// Formulário
const productForm = document.getElementById('product-form');
const formTitle = document.getElementById('form-title');
const saveProductBtn = document.getElementById('save-product-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const clearFormBtn = document.getElementById('clear-form-btn');
const previewContainer = document.getElementById('image-preview');

// Elementos de segurança
const passwordStrength = document.getElementById('password-strength');
const adminPasswordInput = document.getElementById('admin-password');

// Carregar tudo
document.addEventListener('DOMContentLoaded', initializeAdmin);

async function initializeAdmin() {
    showLoading();
    
    // Verificar se o FirebaseService foi carregado
    if (typeof firebaseService === 'undefined') {
        console.error('FirebaseService não foi carregado corretamente');
        hideLoading();
        alert('Erro ao carregar o sistema. Verifique o console para mais detalhes.');
        return;
    }

    try {
        console.log('Inicializando Firebase...');
        
        // Configurar validações
        setupPasswordValidation();
        setupRealTimeValidation();
        updateCategoryOptions();
        
        // Checar se o usuário já está logado
        firebaseService.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('Usuário logado:', user.email);
                adminEmailSpan.textContent = user.email;
                loginContainer.style.display = 'none';
                dashboardContainer.style.display = 'block';
                await loadDashboardData();
                
                // Mostrar status de segurança
                showSecurityStatus();
            } else {
                console.log('Nenhum usuário logado');
                loginContainer.style.display = 'block';
                dashboardContainer.style.display = 'none';
                hideLoading();
                
                // Verificar se há bloqueio
                checkAccountLock();
            }
        });
        
        // Configurar listeners de login/logout
        loginBtn.addEventListener('click', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);
        
        // Configurar listeners de gerenciamento
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        hideLoading();
        alert('Erro ao inicializar o sistema: ' + error.message);
    }
}

// ========================================================================
// === SISTEMA DE SEGURANÇA
// ========================================================================

function setupPasswordValidation() {
    if (!adminPasswordInput) return;
    
    adminPasswordInput.addEventListener('input', function() {
        const password = this.value;
        updatePasswordStrength(password);
    });
    
    adminPasswordInput.addEventListener('focus', function() {
        showPasswordTips();
    });
}

function updatePasswordStrength(password) {
    if (!passwordStrength) return;
    
    if (password.length === 0) {
        passwordStrength.innerHTML = '';
        passwordStrength.className = 'password-strength';
        return;
    }
    
    const validation = firebaseService.validatePassword(password);
    const strengthMessage = firebaseService.getPasswordStrengthMessage(password);
    
    let strengthClass = 'weak';
    let strengthText = 'Senha fraca';
    
    if (validation.isStrong) {
        strengthClass = 'strong';
        strengthText = 'Senha forte ✓';
    } else if (password.length >= 6 && (validation.upperCase || validation.lowerCase || validation.numbers)) {
        strengthClass = 'medium';
        strengthText = 'Senha média';
    }
    
    passwordStrength.innerHTML = `
        <div class="strength-bar ${strengthClass}">
            <div class="strength-fill"></div>
        </div>
        <span class="strength-text ${strengthClass}">${strengthText}</span>
        <div class="strength-details">${strengthMessage}</div>
    `;
    passwordStrength.className = `password-strength ${strengthClass}`;
}

function showPasswordTips() {
    // Criar tooltip de dicas de senha se não existir
    if (!document.getElementById('password-tips')) {
        const tips = document.createElement('div');
        tips.id = 'password-tips';
        tips.className = 'password-tips';
        tips.innerHTML = `
            <h4>💡 Dicas para senha segura:</h4>
            <ul>
                <li>✓ Mínimo 8 caracteres</li>
                <li>✓ Letras maiúsculas e minúsculas</li>
                <li>✓ Números (0-9)</li>
                <li>✓ Símbolos (!@#$% etc.)</li>
                <li>✓ Não use informações pessoais</li>
                <li>✓ Evite sequências comuns</li>
            </ul>
            <p><strong>Exemplo:</strong> C3c0n1@2025!S3gur0</p>
        `;
        
        const passwordGroup = adminPasswordInput.closest('.form-group');
        passwordGroup.appendChild(tips);
        
        // Remover tooltip após 10 segundos
        setTimeout(() => {
            if (tips.parentNode) {
                tips.remove();
            }
        }, 10000);
    }
}

function checkAccountLock() {
    const securityStatus = firebaseService.getSecurityStatus();
    
    if (securityStatus.isLocked) {
        const lockTime = localStorage.getItem('admin_lockout_time');
        const lockUntil = new Date(parseInt(lockTime));
        const now = new Date();
        const minutesLeft = Math.ceil((lockUntil - now) / (60 * 1000));
        
        showMessage(
            '🔒 Conta Temporariamente Bloqueada',
            `Muitas tentativas de login falhas. Tente novamente em ${minutesLeft} minutos.`,
            'error'
        );
        
        // Desabilitar formulário de login
        if (loginBtn) loginBtn.disabled = true;
        if (adminPasswordInput) adminPasswordInput.disabled = true;
        
        // Reativar após o tempo de bloqueio
        setTimeout(() => {
            if (loginBtn) loginBtn.disabled = false;
            if (adminPasswordInput) adminPasswordInput.disabled = false;
            hideMessage();
        }, securityStatus.lockoutTime);
    }
}

function showSecurityStatus() {
    const securityStatus = firebaseService.getSecurityStatus();
    
    console.log('🔐 Status de Segurança:', {
        tentativasFalhas: securityStatus.failedAttempts,
        ultimoLogin: securityStatus.lastLogin,
        contaBloqueada: securityStatus.isLocked
    });
    
    // Mostrar último login no dashboard
    if (securityStatus.lastLogin) {
        const lastLoginElement = document.getElementById('last-login-info');
        if (!lastLoginElement) {
            const userInfo = document.querySelector('.admin-user');
            if (userInfo) {
                const loginInfo = document.createElement('div');
                loginInfo.id = 'last-login-info';
                loginInfo.className = 'last-login';
                loginInfo.innerHTML = `Último login: ${securityStatus.lastLogin.toLocaleString()}`;
                userInfo.appendChild(loginInfo);
            }
        }
    }
}

// ========================================================================
// === VALIDAÇÕES DE PRODUTO
// ========================================================================

function validateProductForm(productData) {
    const errors = [];
    
    // Validação do nome
    if (!productData.name || productData.name.trim().length < 2) {
        errors.push('O nome do produto deve ter pelo menos 2 caracteres');
    }
    
    if (productData.name && productData.name.trim().length > 100) {
        errors.push('O nome do produto deve ter no máximo 100 caracteres');
    }
    
    // Validação da descrição
    if (!productData.description || productData.description.trim().length < 10) {
        errors.push('A descrição deve ter pelo menos 10 caracteres');
    }
    
    if (productData.description && productData.description.trim().length > 1000) {
        errors.push('A descrição deve ter no máximo 1000 caracteres');
    }
    
    // Validação do preço
    if (!productData.price || isNaN(productData.price)) {
        errors.push('O preço deve ser um número válido');
    } else if (productData.price < 0) {
        errors.push('O preço não pode ser negativo');
    } else if (productData.price > 100000) {
        errors.push('O preço não pode ser superior a R$ 100.000,00');
    } else if (productData.price.toString().split('.')[1]?.length > 2) {
        errors.push('O preço deve ter no máximo 2 casas decimais');
    }
    
    // Validação da categoria
    const validCategories = ['decoracao', 'utilitarios', 'prototipos', 'joias', 'brinquedos', 'ferramentas', 'automotivo', 'medico', 'arquitetura', 'educacao', 'moda', 'esportes', 'personalizado'];
    if (!productData.category || !validCategories.includes(productData.category)) {
        errors.push('Selecione uma categoria válida');
    }
    
    // Validação das dimensões
    if (productData.dimensions && productData.dimensions.length > 50) {
        errors.push('As dimensões devem ter no máximo 50 caracteres');
    }
    
    // Validação do material
    if (productData.material && productData.material.length > 100) {
        errors.push('O material deve ter no máximo 100 caracteres');
    }
    
    // Validação do peso
    if (productData.weight && (isNaN(productData.weight) || productData.weight < 0)) {
        errors.push('O peso deve ser um número positivo');
    } else if (productData.weight && productData.weight > 10000) {
        errors.push('O peso não pode ser superior a 10.000g');
    }
    
    // Validação do tempo de impressão
    if (productData.printTime && productData.printTime.length > 50) {
        errors.push('O tempo de impressão deve ter no máximo 50 caracteres');
    }
    
    // Validação das especificações técnicas
    if (productData.specifications && productData.specifications.length > 2000) {
        errors.push('As especificações técnicas devem ter no máximo 2000 caracteres');
    }
    
    // Validação das imagens
    if (productFiles.length > 10) {
        errors.push('Máximo de 10 imagens permitidas por produto');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ========================================================================
// === VALIDAÇÕES EM TEMPO REAL NOS CAMPOS
// ========================================================================

function setupRealTimeValidation() {
    // Validação do preço em tempo real
    const priceInput = document.getElementById('product-price');
    if (priceInput) {
        priceInput.addEventListener('input', function(e) {
            let value = e.target.value;
            
            // Remove caracteres não numéricos, exceto ponto decimal
            value = value.replace(/[^\d.]/g, '');
            
            // Garante que há apenas um ponto decimal
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            
            // Limita a 2 casas decimais
            if (parts.length === 2 && parts[1].length > 2) {
                value = parts[0] + '.' + parts[1].substring(0, 2);
            }
            
            e.target.value = value;
            
            // Validação visual
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue) && numericValue < 0) {
                e.target.style.borderColor = 'var(--danger)';
                showFieldError('product-price', 'O preço não pode ser negativo');
            } else if (!isNaN(numericValue) && numericValue > 100000) {
                e.target.style.borderColor = 'var(--danger)';
                showFieldError('product-price', 'Preço máximo: R$ 100.000,00');
            } else {
                e.target.style.borderColor = '';
                hideFieldError('product-price');
            }
        });
    }
    
    // Validação do peso em tempo real
    const weightInput = document.getElementById('product-weight');
    if (weightInput) {
        weightInput.addEventListener('input', function(e) {
            let value = e.target.value;
            
            // Remove caracteres não numéricos, exceto ponto decimal
            value = value.replace(/[^\d.]/g, '');
            
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue) && numericValue < 0) {
                e.target.style.borderColor = 'var(--danger)';
                showFieldError('product-weight', 'O peso não pode ser negativo');
            } else if (!isNaN(numericValue) && numericValue > 10000) {
                e.target.style.borderColor = 'var(--danger)';
                showFieldError('product-weight', 'Peso máximo: 10.000g');
            } else {
                e.target.style.borderColor = '';
                hideFieldError('product-weight');
            }
        });
    }
    
    // Validação de comprimento máximo para campos de texto
    const textInputs = [
        { id: 'product-name', max: 100 },
        { id: 'product-dimensions', max: 50 },
        { id: 'product-material', max: 100 },
        { id: 'product-print-time', max: 50 }
    ];
    
    textInputs.forEach(inputConfig => {
        const input = document.getElementById(inputConfig.id);
        if (input) {
            input.addEventListener('input', function(e) {
                if (e.target.value.length > inputConfig.max) {
                    e.target.style.borderColor = 'var(--danger)';
                    showFieldError(inputConfig.id, `Máximo de ${inputConfig.max} caracteres`);
                } else {
                    e.target.style.borderColor = '';
                    hideFieldError(inputConfig.id);
                }
                
                // Atualizar contador de caracteres
                updateCharacterCounter(inputConfig.id, e.target.value.length, inputConfig.max);
            });
        }
    });
    
    // Validação especial para descrição
    const descriptionInput = document.getElementById('product-description');
    if (descriptionInput) {
        descriptionInput.addEventListener('input', function(e) {
            if (e.target.value.length < 10 && e.target.value.length > 0) {
                e.target.style.borderColor = 'var(--warning)';
                showFieldError('product-description', 'Mínimo 10 caracteres');
            } else if (e.target.value.length > 1000) {
                e.target.style.borderColor = 'var(--danger)';
                showFieldError('product-description', 'Máximo 1000 caracteres');
            } else {
                e.target.style.borderColor = '';
                hideFieldError('product-description');
            }
            
            updateCharacterCounter('product-description', e.target.value.length, 1000);
        });
    }
    
    // Validação para especificações técnicas
    const specsInput = document.getElementById('product-specifications');
    if (specsInput) {
        specsInput.addEventListener('input', function(e) {
            if (e.target.value.length > 2000) {
                e.target.style.borderColor = 'var(--danger)';
                showFieldError('product-specifications', 'Máximo 2000 caracteres');
            } else {
                e.target.style.borderColor = '';
                hideFieldError('product-specifications');
            }
            
            updateCharacterCounter('product-specifications', e.target.value.length, 2000);
        });
    }
}

// Funções auxiliares para mostrar/ocultar erros
function showFieldError(fieldId, message) {
    let errorElement = document.getElementById(`${fieldId}-error`);
    if (!errorElement) {
        const field = document.getElementById(fieldId);
        errorElement = document.createElement('div');
        errorElement.id = `${fieldId}-error`;
        errorElement.className = 'field-error';
        errorElement.style.color = 'var(--danger)';
        errorElement.style.fontSize = '0.8rem';
        errorElement.style.marginTop = '5px';
        field.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideFieldError(fieldId) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function updateCharacterCounter(fieldId, currentLength, maxLength) {
    let counterElement = document.getElementById(`${fieldId}-counter`);
    if (!counterElement) {
        const field = document.getElementById(fieldId);
        counterElement = document.createElement('div');
        counterElement.id = `${fieldId}-counter`;
        counterElement.className = 'character-counter';
        counterElement.style.fontSize = '0.8rem';
        counterElement.style.textAlign = 'right';
        counterElement.style.marginTop = '5px';
        field.parentNode.appendChild(counterElement);
    }
    
    counterElement.textContent = `${currentLength}/${maxLength} caracteres`;
    counterElement.style.color = currentLength > maxLength ? 'var(--danger)' : 
                                currentLength > maxLength * 0.8 ? 'var(--warning)' : 'var(--gray)';
}

// ========================================================================
// === ATUALIZAR CATEGORIAS
// ========================================================================

function updateCategoryOptions() {
    const categories = [
        { value: 'decoracao', label: 'Decoração' },
        { value: 'utilitarios', label: 'Utilitários' },
        { value: 'prototipos', label: 'Protótipos' },
        { value: 'joias', label: 'Jóias e Acessórios' },
        { value: 'brinquedos', label: 'Brinquedos' },
        { value: 'ferramentas', label: 'Ferramentas' },
        { value: 'automotivo', label: 'Automotivo' },
        { value: 'medico', label: 'Médico e Odontológico' },
        { value: 'arquitetura', label: 'Arquitetura e Maquetes' },
        { value: 'educacao', label: 'Educação' },
        { value: 'moda', label: 'Moda' },
        { value: 'esportes', label: 'Esportes' },
        { value: 'personalizado', label: 'Personalizado' }
    ];
    
    // Os selects já estão atualizados no HTML
}

function getCategoryName(category) {
    const categories = {
        'decoracao': 'Decoração',
        'utilitarios': 'Utilitários',
        'prototipos': 'Protótipos',
        'joias': 'Jóias e Acessórios',
        'brinquedos': 'Brinquedos',
        'ferramentas': 'Ferramentas',
        'automotivo': 'Automotivo',
        'medico': 'Médico e Odontológico',
        'arquitetura': 'Arquitetura e Maquetes',
        'educacao': 'Educação',
        'moda': 'Moda',
        'esportes': 'Esportes',
        'personalizado': 'Personalizado'
    };
    return categories[category] || 'Outros';
}

// ========================================================================
// === AUTENTICAÇÃO E LOADING
// ========================================================================

function showLoading(message = 'Carregando...') {
    if (loadingOverlay) {
        loadingOverlay.querySelector('p').textContent = message;
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showMessage(title, message, type = 'info') {
    // Criar elemento de mensagem se não existir
    let messageElement = document.getElementById('security-message');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'security-message';
        messageElement.className = `security-message ${type}`;
        document.body.appendChild(messageElement);
    }
    
    messageElement.innerHTML = `
        <div class="message-content">
            <h4>${title}</h4>
            <p>${message}</p>
            <button onclick="hideMessage()" class="btn-close-message">&times;</button>
        </div>
    `;
    messageElement.style.display = 'block';
    
    // Auto-esconder após 10 segundos para mensagens de info
    if (type === 'info') {
        setTimeout(hideMessage, 10000);
    }
}

function hideMessage() {
    const messageElement = document.getElementById('security-message');
    if (messageElement) {
        messageElement.style.display = 'none';
    }
}

function showFormValidationMessage(message, type = 'error') {
    const messageElement = document.getElementById('form-validation-message');
    if (messageElement) {
        messageElement.innerHTML = message;
        messageElement.className = `validation-message ${type}`;
        messageElement.style.display = 'block';
        
        // Scroll para a mensagem
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function hideFormValidationMessage() {
    const messageElement = document.getElementById('form-validation-message');
    if (messageElement) {
        messageElement.style.display = 'none';
    }
}

async function handleLogin() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (!email || !password) {
        showMessage('Campos Obrigatórios', 'Por favor, preencha e-mail e senha.', 'error');
        return;
    }
    
    // Validar força da senha antes de enviar
    const passwordValidation = firebaseService.validatePassword(password);
    if (!passwordValidation.isStrong) {
        showMessage(
            'Senha Fraca', 
            firebaseService.getPasswordStrengthMessage(password),
            'error'
        );
        return;
    }
    
    showLoading('Autenticando...');
    try {
        const result = await firebaseService.loginAdmin(email, password);
        
        if (!result.success) {
            showMessage('Falha no Login', result.error, 'error');
            
            // Mostrar tentativas restantes
            if (result.attemptsLeft !== undefined && result.attemptsLeft > 0) {
                showMessage(
                    'Tentativas Restantes',
                    `Você tem ${result.attemptsLeft} tentativas antes do bloqueio.`,
                    'warning'
                );
            }
        }
        // O `onAuthStateChanged` cuidará de redirecionar
    } catch (error) {
        console.error('Erro no login:', error);
        showMessage('Erro no Sistema', 'Ocorreu um erro inesperado. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    showLoading('Saindo...');
    try {
        await firebaseService.logout();
        showMessage('Logout Realizado', 'Você saiu do sistema com sucesso.', 'info');
        // O `onAuthStateChanged` cuidará de redirecionar
    } catch (error) {
        console.error('Erro no logout:', error);
        showMessage('Erro no Logout', 'Ocorreu um erro ao sair do sistema.', 'error');
    } finally {
        hideLoading();
    }
}

// ========================================================================
// === MODAL DE CONFIRMAÇÃO
// ========================================================================

function showConfirmModal(title, message, onConfirm) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmAction = onConfirm;
    confirmModal.style.display = 'flex';
}

modalCancel.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    confirmAction = null;
});

modalConfirm.addEventListener('click', () => {
    if (confirmAction) {
        confirmAction();
    }
    confirmModal.style.display = 'none';
    confirmAction = null;
});

// ========================================================================
// === GERENCIAMENTO DE PRODUTOS (FORMULÁRIO E UPLOAD)
// ========================================================================

// Configura todos os listeners de filtros, formulário, etc.
function setupEventListeners() {
    // Formulário
    productForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', resetProductForm);
    clearFormBtn.addEventListener('click', resetProductForm);
    
    // Upload de Imagem
    setupImageUpload();

    // Controles de Filtro e Busca
    document.getElementById('admin-product-search').addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        currentPage = 1;
        renderAdminProducts();
    });
    
    document.getElementById('admin-category-filter').addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        currentPage = 1;
        renderAdminProducts();
    });
    
    document.getElementById('admin-sort-by').addEventListener('change', (e) => {
        currentSortBy = e.target.value;
        renderAdminProducts();
    });
    
    document.getElementById('admin-items-per-page').addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderAdminProducts();
    });
    
    // Botão de visualização
    document.getElementById('grid-view-btn').addEventListener('click', () => {
        currentView = 'grid';
        document.getElementById('grid-view-btn').classList.add('active');
        renderAdminProducts();
    });
    
    // Delegação de eventos para botões Editar/Excluir
    document.getElementById('admin-products-container').addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete')) {
            const id = e.target.closest('.btn-delete').getAttribute('data-id');
            handleDeleteProduct(id);
        }
        if (e.target.closest('.btn-edit')) {
            const id = e.target.closest('.btn-edit').getAttribute('data-id');
            handleEditProduct(id);
        }
    });
}

// Lida com o submit do formulário (Criar ou Atualizar)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (typeof firebaseService === 'undefined') {
        showMessage('Sistema Não Inicializado', 'Recarregue a página e tente novamente.', 'error');
        return;
    }

    // 1. Coletar dados do formulário
    const productData = {
        name: document.getElementById('product-name').value.trim(),
        description: document.getElementById('product-description').value.trim(),
        price: parseFloat(document.getElementById('product-price').value),
        category: document.getElementById('product-category').value,
        dimensions: document.getElementById('product-dimensions').value.trim(),
        material: document.getElementById('product-material').value.trim(),
        weight: document.getElementById('product-weight').value ? 
                parseFloat(document.getElementById('product-weight').value) : null,
        printTime: document.getElementById('product-print-time').value.trim(),
        specifications: document.getElementById('product-specifications').value.trim(),
        images: []
    };

    // 2. Validar dados
    const validation = validateProductForm(productData);
    if (!validation.isValid) {
        showFormValidationMessage(validation.errors.join('<br>'), 'error');
        return;
    }

    // 3. Ocultar mensagens de validação anteriores
    hideFormValidationMessage();

    const actionText = editingProductId ? 'Atualizando...' : 'Salvando...';
    showLoading(actionText);
    
    try {
        // 4. Coletar imagens existentes (que não são data:base64)
        const imagePreviews = document.querySelectorAll('#image-preview .preview-item img');
        let existingImageUrls = Array.from(imagePreviews)
            .map(img => img.src)
            .filter(src => !src.startsWith('data:'));
        
        // 5. Se estiver editando, adicione o ID
        if (editingProductId) {
            productData.id = editingProductId;
        }

        let newImageUrls = [];
        
        // 6. Fazer upload das NOVAS imagens primeiro (se houver)
        if (productFiles.length > 0) {
            showLoading(`Enviando ${productFiles.length} imagens...`);
            
            // Para novos produtos, usar um ID temporário baseado no timestamp
            const tempProductId = editingProductId || 'new_' + Date.now();
            
            const uploadPromises = productFiles.map(file => 
                firebaseService.uploadImage(file, tempProductId)
            );
            const uploadResults = await Promise.all(uploadPromises);
            
            newImageUrls = uploadResults.map(res => {
                if (!res.success) throw new Error(`Falha no upload: ${res.error}`);
                return res.url;
            });
        }
        
        // 7. Juntar URLs novas e existentes
        productData.images = [...existingImageUrls, ...newImageUrls];

        // 8. Salvar produto no Firestore
        showLoading('Salvando produto...');
        const saveResult = await firebaseService.saveProduct(productData);
        if (!saveResult.success) {
            throw new Error(`Erro ao salvar produto: ${saveResult.error}`);
        }
        
        showMessage(
            'Sucesso!', 
            editingProductId ? 'Produto atualizado com sucesso!' : 'Produto adicionado com sucesso!',
            'success'
        );
        
        // 9. Recarregar tudo
        await loadDashboardData();
        resetProductForm();

    } catch (error) {
        console.error("Erro no processo de salvar:", error);
        showMessage('Erro ao Salvar', "Ocorreu um erro: " + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Reseta o formulário para o estado inicial
function resetProductForm() {
    productForm.reset();
    previewContainer.innerHTML = '';
    productFiles = [];
    editingProductId = null;
    
    // Resetar contadores
    document.querySelectorAll('.character-counter').forEach(counter => {
        counter.textContent = '0/0 caracteres';
        counter.style.color = 'var(--gray)';
    });
    
    // Resetar bordas dos campos
    document.querySelectorAll('.form-control').forEach(field => {
        field.style.borderColor = '';
    });
    
    // Ocultar mensagens de erro
    document.querySelectorAll('.field-error').forEach(error => {
        error.style.display = 'none';
    });
    
    hideFormValidationMessage();
    
    formTitle.textContent = 'Adicionar Novo Produto';
    saveProductBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
    cancelEditBtn.style.display = 'none';
    
    // Rolar para o topo do formulário
    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========================================================================
// === GERENCIAMENTO DE PRODUTOS (CRUD)
// ========================================================================

// Preenche o formulário para edição
function handleEditProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    // Limpar arquivos pendentes de upload
    productFiles = [];
    
    // Preencher formulário
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-dimensions').value = product.dimensions || '';
    document.getElementById('product-material').value = product.material || '';
    document.getElementById('product-weight').value = product.weight || '';
    document.getElementById('product-print-time').value = product.printTime || '';
    document.getElementById('product-specifications').value = product.specifications || '';
    
    // Atualizar contadores
    updateCharacterCounter('product-name', product.name.length, 100);
    updateCharacterCounter('product-description', product.description.length, 1000);
    updateCharacterCounter('product-dimensions', (product.dimensions || '').length, 50);
    updateCharacterCounter('product-material', (product.material || '').length, 100);
    updateCharacterCounter('product-print-time', (product.printTime || '').length, 50);
    updateCharacterCounter('product-specifications', (product.specifications || '').length, 2000);
    
    // Limpar e preencher preview de imagens
    previewContainer.innerHTML = '';
    if (product.images && product.images.length > 0) {
        product.images.forEach(imageSrc => {
            const previewItem = createPreviewItem(imageSrc, imageSrc);
            previewContainer.appendChild(previewItem);
            
            // Adicionar evento para remover imagem (EXISTENTE)
            previewItem.querySelector('.remove-image').addEventListener('click', () => {
                previewItem.remove(); 
            });
        });
    }
    
    // Configurar modo edição
    editingProductId = id;
    formTitle.textContent = 'Editando Produto';
    saveProductBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Produto';
    cancelEditBtn.style.display = 'inline-flex';
    
    // Rolar para o formulário
    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Lida com a exclusão de um produto
function handleDeleteProduct(id) {
    const productToDelete = products.find(p => p.id === id);
    if (!productToDelete) return;
    
    showConfirmModal(
        'Excluir Produto',
        `Tem certeza que deseja excluir "${productToDelete.name}"? Todas as imagens associadas serão removidas permanentemente.`,
        async () => {
            showLoading(`Excluindo ${productToDelete.name}...`);
            try {
                // 1. Excluir imagens do Storage (se houver)
                if (productToDelete.images && productToDelete.images.length > 0) {
                    const deleteImagePromises = productToDelete.images.map(url => 
                        firebaseService.deleteImage(url)
                    );
                    await Promise.allSettled(deleteImagePromises); 
                }
                
                // 2. Excluir documento do Firestore
                await firebaseService.deleteProduct(id);
                
                // 3. Atualizar estado local e UI
                showMessage('Produto Excluído', 'Produto excluído com sucesso.', 'success');
                await loadDashboardData();
            } catch (error) {
                console.error("Erro ao excluir produto:", error);
                showMessage('Erro ao Excluir', "Erro ao excluir produto: " + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

// ========================================================================
// === RENDERIZAÇÃO DA LISTA DE PRODUTOS ADMIN
// ========================================================================

// Renderiza a lista de produtos no painel admin
function renderAdminProducts() {
    const container = document.getElementById('admin-products-container');
    const paginationContainer = document.getElementById('pagination-container');
    const productsCountElement = document.getElementById('products-count');
    
    if (!container || !paginationContainer || !productsCountElement) return;

    // Aplicar filtros e ordenação
    let filteredProducts = filterAndSortProducts();
    
    // Atualizar contador
    productsCountElement.textContent = `${filteredProducts.length} produtos encontrados`;
    
    // Calcular paginação
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    currentPage = Math.min(currentPage, totalPages || 1);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    
    // Limpar container
    container.innerHTML = '';
    
    // Aplicar classe de visualização
    container.className = `admin-products-container ${currentView}-view`;
    
    if (paginatedProducts.length === 0) {
        container.innerHTML = '<p class="no-products">Nenhum produto encontrado com os filtros atuais.</p>';
    } else {
        paginatedProducts.forEach(product => {
            const productCard = createAdminProductCard(product);
            container.appendChild(productCard);
        });
    }
    
    // Renderizar paginação
    renderPagination(totalPages, paginationContainer);
}

// Função para filtrar e ordenar produtos
function filterAndSortProducts() {
    let filteredProducts = [...products];
    
    // Aplicar filtro de busca
    if (currentSearchTerm) {
        const searchTerm = currentSearchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Aplicar filtro de categoria
    if (currentCategoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.category === currentCategoryFilter
        );
    }
    
    // Aplicar ordenação
    filteredProducts.sort((a, b) => {
        switch(currentSortBy) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            case 'newest':
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            case 'oldest':
                return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
            default:
                return 0;
        }
    });
    
    return filteredProducts;
}

// Função para criar o card do produto na área administrativa
function createAdminProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = 'admin-product-card';
    
    if (currentSearchTerm && product.name.toLowerCase().includes(currentSearchTerm.toLowerCase())) {
        productCard.classList.add('highlight');
    }
    
    let imagesHTML = '';
    if (product.images && product.images.length > 0) {
        imagesHTML = `
            <div class="admin-product-images">
                ${product.images.map(img => `<img src="${img}" alt="${product.name}" class="admin-product-image">`).join('')}
            </div>
        `;
    }
    
    let specsHTML = `
        <div class="product-specs">
            ${product.dimensions ? `<div class="spec-item"><span class="spec-label">Dimensões:</span><span class="spec-value">${product.dimensions}</span></div>` : ''}
            ${product.material ? `<div class="spec-item"><span class="spec-label">Material:</span><span class="spec-value">${product.material}</span></div>` : ''}
            ${product.weight ? `<div class="spec-item"><span class="spec-label">Peso:</span><span class="spec-value">${product.weight}g</span></div>` : ''}
            ${product.printTime ? `<div class="spec-item"><span class="spec-label">Tempo:</span><span class="spec-value">${product.printTime}</span></div>` : ''}
        </div>
    `;
    
    productCard.innerHTML = `
        <div class="admin-product-header">
            <div>
                <h4>${product.name}</h4>
                <p>R$ ${product.price.toFixed(2)} | ${getCategoryName(product.category)}</p>
            </div>
            <div class="product-actions">
                <button class="btn-edit" data-id="${product.id}"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-delete" data-id="${product.id}"><i class="fas fa-trash"></i> Excluir</button>
            </div>
        </div>
        ${imagesHTML}
        <p>${product.description}</p>
        ${specsHTML}
        ${product.specifications ? `<p><strong>Técnico:</strong> ${product.specifications}</p>` : ''}
    `;
    
    return productCard;
}

// Função para renderizar a paginação
function renderPagination(totalPages, container) {
    if (!container) return;
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Botão anterior
    container.appendChild(createPaginationButton(
        '<i class="fas fa-chevron-left"></i>', 
        currentPage - 1, 
        currentPage === 1
    ));
    
    // Números das páginas
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createPaginationButton(i, i, false, i === currentPage));
    }
    
    // Botão próximo
    container.appendChild(createPaginationButton(
        '<i class="fas fa-chevron-right"></i>', 
        currentPage + 1, 
        currentPage === totalPages
    ));
}

// Auxiliar para criar botão de paginação
function createPaginationButton(text, page, isDisabled = false, isActive = false) {
    const pageButton = document.createElement('button');
    pageButton.className = 'pagination-btn';
    pageButton.innerHTML = text;
    if (isDisabled) pageButton.classList.add('disabled');
    if (isActive) pageButton.classList.add('active');
    
    pageButton.addEventListener('click', () => {
        if (!isDisabled) {
            currentPage = page;
            renderAdminProducts();
        }
    });
    return pageButton;
}

// ========================================================================
// === FUNÇÕES AUXILIARES (Upload de Imagem, Nomes)
// ========================================================================

// Configurar upload de imagens
function setupImageUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('product-images');
    const selectBtn = document.getElementById('select-images-btn');
    
    if (!uploadArea) return;

    // Limpar array de arquivos
    productFiles = [];
    
    uploadArea.addEventListener('click', () => fileInput.click());
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    ['dragover', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') {
                uploadArea.style.backgroundColor = 'rgba(200, 166, 154, 0.15)';
            }
        });
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = 'rgba(200, 166, 154, 0.05)';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        uploadArea.style.backgroundColor = 'rgba(200, 166, 154, 0.05)';
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });
    
    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.match('image.*')) {
                showMessage('Tipo de Arquivo Inválido', 'Por favor, selecione apenas imagens.', 'error');
                return;
            }
            
            // Verificar tamanho do arquivo (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showMessage('Arquivo Muito Grande', 'A imagem deve ter no máximo 5MB.', 'error');
                return;
            }
            
            // Verificar limite de 10 imagens
            if (productFiles.length >= 10) {
                showMessage('Limite de Imagens', 'Máximo de 10 imagens permitidas por produto.', 'error');
                return;
            }
            
            // Armazenar o arquivo real
            productFiles.push(file);
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const previewItem = createPreviewItem(e.target.result, file.name);
                previewContainer.appendChild(previewItem);
                
                // Remover imagem (NOVA) ao clicar no botão
                previewItem.querySelector('.remove-image').addEventListener('click', () => {
                    const filename = previewItem.getAttribute('data-filename');
                    productFiles = productFiles.filter(f => f.name !== filename);
                    previewItem.remove();
                });
            };
            
            reader.readAsDataURL(file);
        });
    }
}

// Cria o item de preview da imagem
function createPreviewItem(src, filename) {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.setAttribute('data-filename', filename);
    previewItem.innerHTML = `
        <img src="${src}" alt="Preview">
        <button type="button" class="remove-image">&times;</button>
    `;
    return previewItem;
}

// Carrega dados do dashboard (produtos e estatísticas)
async function loadDashboardData() {
    showLoading();
    try {
        const [stats, prods] = await Promise.all([
            firebaseService.getDashboardStats(),
            firebaseService.getProducts()
        ]);
        
        products = prods;
        console.log('Produtos carregados:', products.length);
        
        // Renderizar estatísticas (apenas produtos totais e categorias)
        if (stats) {
            document.getElementById('stat-total-products').textContent = stats.totalProducts;
            document.getElementById('stat-total-categories').textContent = stats.totalCategories;
        }
        
        // Renderizar produtos
        renderAdminProducts();
    } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        showMessage('Erro ao Carregar Dados', "Erro ao carregar dados: " + error.message, 'error');
    }
    hideLoading();
}