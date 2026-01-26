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

// Lista completa de cores disponíveis (com nomes e códigos hex)
const AVAILABLE_COLORS = [
    { name: "Branco", hex: "#FFFFFF" },
    { name: "Preto", hex: "#000000" },
    { name: "Cinza", hex: "#808080" },
    { name: "Prata", hex: "#C0C0C0" },
    { name: "Vermelho", hex: "#FF0000" },
    { name: "Vermelho Escuro", hex: "#8B0000" },
    { name: "Vermelho Claro", hex: "#FF6B6B" },
    { name: "Azul", hex: "#0000FF" },
    { name: "Azul Marinho", hex: "#000080" },
    { name: "Azul Claro", hex: "#ADD8E6" },
    { name: "Azul Turquesa", hex: "#40E0D0" },
    { name: "Verde", hex: "#008000" },
    { name: "Verde Limão", hex: "#32CD32" },
    { name: "Verde Claro", hex: "#90EE90" },
    { name: "Verde Escuro", hex: "#006400" },
    { name: "Amarelo", hex: "#FFFF00" },
    { name: "Amarelo Ouro", hex: "#FFD700" },
    { name: "Laranja", hex: "#FFA500" },
    { name: "Rosa", hex: "#FFC0CB" },
    { name: "Rosa Choque", hex: "#FF1493" },
    { name: "Roxo", hex: "#800080" },
    { name: "Roxo Claro", hex: "#9370DB" },
    { name: "Violeta", hex: "#EE82EE" },
    { name: "Marrom", hex: "#8B4513" },
    { name: "Marrom Claro", hex: "#D2691E" },
    { name: "Bege", hex: "#F5F5DC" },
    { name: "Dourado", hex: "#FFD700" },
    { name: "Prata Metálico", hex: "#A6A6A6" },
    { name: "Bronze", hex: "#CD7F32" },
    { name: "Cobre", hex: "#B87333" },
    { name: "Transparente", hex: "#FFFFFF", opacity: 0.3 },
    { name: "Fosco Branco", hex: "#F5F5F5" },
    { name: "Fosco Preto", hex: "#1A1A1A" },
    { name: "Neon Rosa", hex: "#FF6EC7" },
    { name: "Neon Verde", hex: "#39FF14" },
    { name: "Neon Azul", hex: "#00FFFF" },
    { name: "Neon Amarelo", hex: "#FFFF33" }
];

// Array para armazenar cores selecionadas
let selectedColors = [];

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
        
        // NOVO: Inicializar seletor de cores
        initializeColorSelector();
        
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
// === SISTEMA DE SELEÇÃO DE CORES
// ========================================================================

// Função para inicializar o seletor de cores
function initializeColorSelector() {
    const colorsGrid = document.getElementById('colors-grid');
    const selectedColorsChips = document.getElementById('selected-colors-chips');
    const selectAllBtn = document.getElementById('select-all-colors');
    const deselectAllBtn = document.getElementById('deselect-all-colors');
    
    if (!colorsGrid) return;
    
    // Limpar grid
    colorsGrid.innerHTML = '';
    
    // Criar opção para cada cor
    AVAILABLE_COLORS.forEach(color => {
        const colorOption = document.createElement('div');
        colorOption.className = 'color-option';
        colorOption.dataset.colorName = color.name;
        colorOption.dataset.colorHex = color.hex;
        
        const opacityStyle = color.opacity ? `opacity: ${color.opacity};` : '';
        
        colorOption.innerHTML = `
            <input type="checkbox" class="color-checkbox" id="color-${color.name}" value="${color.name}">
            <div class="color-preview" style="background-color: ${color.hex}; ${opacityStyle}"></div>
            <span class="color-label">${color.name}</span>
        `;
        
        // Evento de clique para selecionar/deselecionar
        colorOption.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox') return;
            
            const checkbox = this.querySelector('.color-checkbox');
            checkbox.checked = !checkbox.checked;
            
            if (checkbox.checked) {
                this.classList.add('selected');
                addSelectedColor(color.name, color.hex);
            } else {
                this.classList.remove('selected');
                removeSelectedColor(color.name);
            }
            
            updateSelectedColorsPreview();
        });
        
        colorsGrid.appendChild(colorOption);
    });
    
    // Botão para selecionar todas as cores
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            selectedColors = [...AVAILABLE_COLORS];
            updateColorSelectionUI();
        });
    }
    
    // Botão para limpar seleção
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
            selectedColors = [];
            updateColorSelectionUI();
        });
    }
}

// Função para adicionar cor à lista de selecionadas
function addSelectedColor(name, hex) {
    if (!selectedColors.some(c => c.name === name)) {
        selectedColors.push({ name, hex });
    }
}

// Função para remover cor da lista de selecionadas
function removeSelectedColor(name) {
    selectedColors = selectedColors.filter(c => c.name !== name);
}

// Atualizar a UI de seleção de cores
function updateColorSelectionUI() {
    // Atualizar checkboxes
    document.querySelectorAll('.color-option').forEach(option => {
        const colorName = option.dataset.colorName;
        const checkbox = option.querySelector('.color-checkbox');
        const isSelected = selectedColors.some(c => c.name === colorName);
        
        checkbox.checked = isSelected;
        if (isSelected) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    updateSelectedColorsPreview();
}

// Atualizar preview das cores selecionadas
function updateSelectedColorsPreview() {
    const selectedColorsChips = document.getElementById('selected-colors-chips');
    const noColorsText = document.querySelector('.no-colors-selected');
    
    if (!selectedColorsChips) return;
    
    // Limpar preview
    selectedColorsChips.innerHTML = '';
    
    if (selectedColors.length === 0) {
        if (noColorsText) noColorsText.style.display = 'block';
        return;
    }
    
    if (noColorsText) noColorsText.style.display = 'none';
    
    // Adicionar chips para cada cor selecionada
    selectedColors.forEach(color => {
        const chip = document.createElement('span');
        chip.className = 'selected-color-chip';
        chip.innerHTML = `
            <div class="color-chip-preview" style="background-color: ${color.hex}"></div>
            ${color.name}
        `;
        selectedColorsChips.appendChild(chip);
    });
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
// === VALIDAÇÕES DE PRODUTO - COMPLETA
// ========================================================================

function validateProductForm(productData) {
    const errors = [];
    
    // 1. VALIDAÇÃO DO NOME (OBRIGATÓRIO)
    if (!productData.name || productData.name.trim().length === 0) {
        errors.push('O nome do produto é obrigatório');
    } else if (productData.name.trim().length < 3) {
        errors.push('O nome deve ter pelo menos 3 caracteres');
    } else if (productData.name.trim().length > 100) {
        errors.push('O nome deve ter no máximo 100 caracteres');
    } else if (/^\d+$/.test(productData.name.trim())) {
        errors.push('O nome não pode conter apenas números');
    }
    
    // 2. VALIDAÇÃO DA DESCRIÇÃO (OBRIGATÓRIA)
    if (!productData.description || productData.description.trim().length === 0) {
        errors.push('A descrição do produto é obrigatória');
    } else if (productData.description.trim().length < 10) {
        errors.push('A descrição deve ter pelo menos 10 caracteres');
    } else if (productData.description.trim().length > 1000) {
        errors.push('A descrição deve ter no máximo 1000 caracteres');
    }
    
    // 3. VALIDAÇÃO DO PREÇO (OBRIGATÓRIO)
    if (!productData.price && productData.price !== 0) {
        errors.push('O preço do produto é obrigatório');
    } else if (isNaN(productData.price)) {
        errors.push('O preço deve ser um número válido');
    } else if (productData.price <= 0) {
        errors.push('O preço deve ser maior que zero');
    } else if (productData.price > 100000) {
        errors.push('O preço máximo é R$ 100.000,00');
    } else if (productData.price.toString().split('.')[1]?.length > 2) {
        errors.push('O preço deve ter no máximo 2 casas decimais');
    }
    
    // 4. VALIDAÇÃO DA CATEGORIA (OBRIGATÓRIA)
    const validCategories = ['decoracao', 'utilitarios', 'prototipos', 'joias', 'brinquedos', 
                            'ferramentas', 'automotivo', 'medico', 'arquitetura', 'educacao', 
                            'moda', 'esportes', 'personalizado'];
    if (!productData.category || productData.category.trim().length === 0) {
        errors.push('A categoria do produto é obrigatória');
    } else if (!validCategories.includes(productData.category)) {
        errors.push('Selecione uma categoria válida');
    }
    
    // 5. VALIDAÇÃO DAS DIMENSÕES (OPCIONAL)
    if (productData.dimensions && productData.dimensions.trim().length > 0) {
        const dimensionsValidation = validateDimensions(productData.dimensions);
        
        if (!dimensionsValidation.isValid) {
            errors.push(dimensionsValidation.error);
        } else if (productData.dimensions.trim().length > 50) {
            errors.push('As dimensões devem ter no máximo 50 caracteres');
        }
    }
    
    // 6. VALIDAÇÃO DO MATERIAL (OBRIGATÓRIO)
    if (!productData.material || productData.material.trim().length === 0) {
        errors.push('O material do produto é obrigatório');
    } else if (productData.material.trim().length > 100) {
        errors.push('O material deve ter no máximo 100 caracteres');
    }
    
    // 7. VALIDAÇÃO DAS CORES DISPONÍVEIS (OBRIGATÓRIO)
    if (!productData.colors || productData.colors.length === 0) {
        errors.push('Selecione pelo menos uma cor disponível');
    }
    
    // 8. VALIDAÇÃO DO PESO (OBRIGATÓRIO)
    if (productData.weight === null || productData.weight === undefined || productData.weight === '') {
        errors.push('O peso do produto é obrigatório');
    } else {
        const weight = parseFloat(productData.weight);
        if (isNaN(weight)) {
            errors.push('O peso deve ser um número válido');
        } else if (weight <= 0) {
            errors.push('O peso deve ser maior que zero');
        } else if (weight > 10000) {
            errors.push('O peso máximo é 10.000g (10kg)');
        } else if (weight % 1 !== 0 && weight.toString().split('.')[1]?.length > 1) {
            errors.push('O peso deve ter no máximo 1 casa decimal');
        }
    }
    
    // 9. VALIDAÇÃO DO TEMPO DE IMPRESSÃO (OBRIGATÓRIO)
    if (!productData.printTime || productData.printTime.trim().length === 0) {
        errors.push('O tempo de impressão é obrigatório');
    } else if (productData.printTime.trim().length > 50) {
        errors.push('O tempo de impressão deve ter no máximo 50 caracteres');
    }
    
    // 10. VALIDAÇÃO DAS ESPECIFICAÇÕES TÉCNICAS (OPCIONAL)
    if (productData.specifications && productData.specifications.trim().length > 0) {
        if (productData.specifications.trim().length > 2000) {
            errors.push('As especificações técnicas devem ter no máximo 2000 caracteres');
        }
    }
    
    // 11. VALIDAÇÃO DAS IMAGENS
    if (productFiles.length > 10) {
        errors.push('Máximo de 10 imagens por produto');
    }
    
    // Validar cada arquivo individualmente
    productFiles.forEach((file, index) => {
        if (file.size > 5 * 1024 * 1024) { // 5MB
            errors.push(`Imagem ${index + 1} excede 5MB: ${file.name}`);
        }
        if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
            errors.push(`Formato inválido para imagem ${index + 1}: ${file.name}. Use JPG, PNG ou GIF`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ========================================================================
// === VALIDAÇÕES EM TEMPO REAL NOS CAMPOS - MELHORADA
// ========================================================================

function setupRealTimeValidation() {
    // 1. VALIDAÇÃO DO NOME
    const nameInput = document.getElementById('product-name');
    if (nameInput) {
        nameInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            let error = '';
            
            if (value.length === 0) {
                error = 'O nome é obrigatório';
            } else if (value.length < 3) {
                error = 'Mínimo 3 caracteres';
            } else if (value.length > 100) {
                error = 'Máximo 100 caracteres';
            } else if (/^\d+$/.test(value)) {
                error = 'Não pode conter apenas números';
            }
            
            updateFieldValidation('product-name', value, error);
            updateCharacterCounter('product-name', value.length, 100);
        });
        
        nameInput.addEventListener('blur', function() {
            if (this.value.trim().length < 3 && this.value.trim().length > 0) {
                showFieldError('product-name', 'Nome muito curto. Mínimo 3 caracteres.');
            }
        });
    }
    
    // 2. VALIDAÇÃO DA DESCRIÇÃO
    const descriptionInput = document.getElementById('product-description');
    if (descriptionInput) {
        descriptionInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            let error = '';
            
            if (value.length === 0) {
                error = 'A descrição é obrigatória';
            } else if (value.length < 10) {
                error = 'Mínimo 10 caracteres';
            } else if (value.length > 1000) {
                error = 'Máximo 1000 caracteres';
            }
            
            updateFieldValidation('product-description', value, error);
            updateCharacterCounter('product-description', value.length, 1000);
        });
    }
    
    // 3. VALIDAÇÃO DO PREÇO
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
            
            // Validação
            const numericValue = parseFloat(value);
            let error = '';
            
            if (value.length === 0) {
                error = 'O preço é obrigatório';
            } else if (isNaN(numericValue)) {
                error = 'Digite um número válido';
            } else if (numericValue <= 0) {
                error = 'O preço deve ser maior que zero';
            } else if (numericValue > 100000) {
                error = 'Preço máximo: R$ 100.000,00';
            } else if (parts.length === 2 && parts[1].length > 2) {
                error = 'Máximo 2 casas decimais';
            }
            
            updateFieldValidation('product-price', value, error);
            
            // Formatar visualmente
            if (!isNaN(numericValue) && value.length > 0) {
                const formattedValue = numericValue.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                // Mostrar valor formatado em tempo real (opcional)
                showPricePreview(numericValue);
            }
        });
        
        // Formatar ao perder o foco
        priceInput.addEventListener('blur', function() {
            const value = parseFloat(this.value);
            if (!isNaN(value)) {
                this.value = value.toFixed(2);
            }
        });
    }
    
    // 4. VALIDAÇÃO DA CATEGORIA
    const categoryInput = document.getElementById('product-category');
    if (categoryInput) {
        categoryInput.addEventListener('change', function(e) {
            const value = e.target.value;
            const error = value === '' ? 'Selecione uma categoria' : '';
            updateFieldValidation('product-category', value, error);
        });
    }
    
    // 5. VALIDAÇÃO DAS DIMENSÕES
    const dimensionsInput = document.getElementById('product-dimensions');
    if (dimensionsInput) {
        // Adicionar placeholder explicativo
        dimensionsInput.placeholder = "Ex: 10x15x5 cm (largura x altura x profundidade)";
        
        dimensionsInput.addEventListener('input', function(e) {
            let value = e.target.value.trim();
            
            // Formatação automática enquanto digita
            value = formatDimensionsWhileTyping(value);
            
            // Atualizar o valor formatado
            e.target.value = value;
            
            // Validação
            let error = '';
            const validation = validateDimensions(value);
            
            if (value.length === 0) {
                // Campo vazio é válido (opcional)
                e.target.classList.remove('invalid');
                e.target.classList.remove('valid');
            } else if (!validation.isValid) {
                error = validation.error;
                e.target.classList.add('invalid');
                e.target.classList.remove('valid');
            } else {
                // Formato válido
                e.target.classList.remove('invalid');
                e.target.classList.add('valid');
                
                // Mostrar dimensões formatadas como preview
                showDimensionsPreview(validation.formatted);
            }
            
            // Atualizar mensagem de erro
            updateFieldValidation('product-dimensions', value, error);
            updateCharacterCounter('product-dimensions', value.length, 50);
        });
        
        // Formatação final ao perder o foco
        dimensionsInput.addEventListener('blur', function() {
            let value = this.value.trim();
            
            if (value.length > 0) {
                const validation = validateDimensions(value);
                
                if (validation.isValid) {
                    // Aplicar formatação final
                    this.value = validation.formatted;
                    
                    // Mostrar preview bonito
                    showDimensionsPreview(validation.formatted);
                } else {
                    // Mostrar exemplo de formato correto
                    showFieldError('product-dimensions', 
                        'Formato inválido. Use: 10x15x5 cm ou 10 x 15 x 5 cm');
                }
            } else {
                // Limpar preview se campo estiver vazio
                hideDimensionsPreview();
            }
        });
        
        // Mostrar dicas ao focar no campo
        dimensionsInput.addEventListener('focus', function() {
            showDimensionsTips();
        });
    }
    
    // 6. VALIDAÇÃO DO MATERIAL
    const materialInput = document.getElementById('product-material');
    if (materialInput) {
        materialInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            const error = value.length > 100 ? 'Máximo 100 caracteres' : '';
            updateFieldValidation('product-material', value, error);
            updateCharacterCounter('product-material', value.length, 100);
        });
    }
    
    // 7. VALIDAÇÃO DO PESO
    const weightInput = document.getElementById('product-weight');
    if (weightInput) {
        weightInput.addEventListener('input', function(e) {
            let value = e.target.value.trim();
            
            let error = '';
            
            if (value.length > 0) {
                // Permite números e letras (para KG, G, etc)
                if (!/^[\d\s.,a-zA-Záàâãäåèéêëìíîïòóôõöùúûüýÿçñ]+$/.test(value)) {
                    error = 'Use apenas números, letras e pontos/vírgulas';
                } else {
                    // Verificar se tem AMBOS números e letras
                    const hasNumbers = /\d/.test(value);
                    const hasLetters = /[a-zA-Záàâãäåèéêëìíîïòóôõöùúûüýÿçñ]/i.test(value);
                    
                    if (!hasNumbers || !hasLetters) {
                        error = 'Use combinação de número e letra (ex: 500g, 1.5kg)';
                    }
                }
            } else {
                error = 'O peso é obrigatório';
            }
            
            updateFieldValidation('product-weight', value, error);
        });
    }
    
    // 8. VALIDAÇÃO DO TEMPO DE IMPRESSÃO
    const printTimeInput = document.getElementById('product-print-time');
    if (printTimeInput) {
        printTimeInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            const error = value.length > 50 ? 'Máximo 50 caracteres' : '';
            updateFieldValidation('product-print-time', value, error);
            updateCharacterCounter('product-print-time', value.length, 50);
        });
    }
    
    // 9. VALIDAÇÃO DAS ESPECIFICAÇÕES TÉCNICAS
    const specificationsInput = document.getElementById('product-specifications');
    if (specificationsInput) {
        specificationsInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            const error = value.length > 2000 ? 'Máximo 2000 caracteres' : '';
            updateFieldValidation('product-specifications', value, error);
            updateCharacterCounter('product-specifications', value.length, 2000);
        });
    }
}

// Função para validar dimensões
function validateDimensions(dimensions) {
    // Se estiver vazio, é válido (campo opcional)
    if (!dimensions || dimensions.trim().length === 0) {
        return { isValid: true, formatted: '' };
    }
    
    // Padrões aceitos:
    // 1. 10x15x5
    // 2. 10x15x5 cm
    // 3. 10 x 15 x 5
    // 4. 10 x 15 x 5 cm
    // 5. 10,15,5
    // 6. 10,15,5 cm
    const patterns = [
        /^(\d+(?:\.\d+)?)\s*[xX×,]\s*(\d+(?:\.\d+)?)\s*[xX×,]\s*(\d+(?:\.\d+)?)(?:\s*(cm|mm|m|in|"|''))?$/i,
        /^(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)(?:\s*(cm|mm|m|in|"|''))?$/i
    ];
    
    let match = null;
    for (const pattern of patterns) {
        match = dimensions.match(pattern);
        if (match) break;
    }
    
    if (!match) {
        return {
            isValid: false,
            error: 'Formato inválido. Use: Largura x Altura x Profundidade (ex: 10x15x5 cm)'
        };
    }
    
    // Extrair valores
    const width = parseFloat(match[1]);
    const height = parseFloat(match[2]);
    const depth = parseFloat(match[3]);
    const unit = match[4] || 'cm'; // Padrão é cm se não especificado
    
    // Validar valores numéricos
    if (isNaN(width) || isNaN(height) || isNaN(depth)) {
        return {
            isValid: false,
            error: 'Valores devem ser números (ex: 10.5x15.2x5)'
        };
    }
    
    // Validar se valores são positivos
    if (width <= 0 || height <= 0 || depth <= 0) {
        return {
            isValid: false,
            error: 'As dimensões devem ser valores positivos maiores que zero'
        };
    }
    
    // Validar tamanho máximo razoável (10 metros)
    if (width > 1000 || height > 1000 || depth > 1000) {
        return {
            isValid: false,
            error: 'As dimensões são muito grandes. Máximo: 1000cm (10m)'
        };
    }
    
    // Formatar para saída padronizada
    const formatted = `${width} × ${height} × ${depth} ${unit}`;
    
    return {
        isValid: true,
        formatted: formatted,
        width: width,
        height: height,
        depth: depth,
        unit: unit
    };
}

// Função para formatar enquanto digita
function formatDimensionsWhileTyping(input) {
    // Remove múltiplos espaços
    let formatted = input.replace(/\s+/g, ' ');
    
    // Garante que há espaços ao redor do "x" para melhor legibilidade
    formatted = formatted.replace(/(\d)\s*[xX×,]\s*(\d)/g, '$1 × $2');
    
    // Garante espaço antes da unidade
    formatted = formatted.replace(/(\d)(cm|mm|m|in|"|'')/gi, '$1 $2');
    
    return formatted;
}

// Função para mostrar preview das dimensões
function showDimensionsPreview(formattedDimensions) {
    const dimensionsInputElement = document.getElementById('product-dimensions');
    if (!dimensionsInputElement) return;
    
    let previewElement = document.getElementById('dimensions-preview');
    if (!previewElement) {
        previewElement = document.createElement('div');
        previewElement.id = 'dimensions-preview';
        previewElement.className = 'dimensions-preview';
        dimensionsInputElement.parentNode.appendChild(previewElement);
    }
    
    // Parse das dimensões para mostrar bonito
    const parts = formattedDimensions.split(' × ');
    if (parts.length === 3) {
        const [width, heightDepth] = parts;
        const [height, depthUnit] = heightDepth.split(' ');
        const [depth, unit] = depthUnit ? [depthUnit.replace(/[^\d.]/g, ''), depthUnit.replace(/[\d.]/g, '')] : ['', ''];
        
        previewElement.innerHTML = `
            <div class="dimensions-preview-content">
                <strong>Dimensões formatadas:</strong>
                <div class="dimensions-visual">
                    <div class="dimension-item">
                        <span class="dimension-label">Largura:</span>
                        <span class="dimension-value">${width} ${unit || 'cm'}</span>
                    </div>
                    <div class="dimension-item">
                        <span class="dimension-label">Altura:</span>
                        <span class="dimension-value">${height} ${unit || 'cm'}</span>
                    </div>
                    <div class="dimension-item">
                        <span class="dimension-label">Profundidade:</span>
                        <span class="dimension-value">${depth} ${unit || 'cm'}</span>
                    </div>
                </div>
                <small class="dimensions-help">Largura × Altura × Profundidade</small>
            </div>
        `;
        previewElement.style.display = 'block';
    } else {
        previewElement.innerHTML = `<strong>Formato reconhecido:</strong> ${formattedDimensions}`;
        previewElement.style.display = 'block';
    }
}

// Função para esconder o preview
function hideDimensionsPreview() {
    const previewElement = document.getElementById('dimensions-preview');
    if (previewElement) {
        previewElement.style.display = 'none';
    }
}

// Função para mostrar dicas de formato
function showDimensionsTips() {
    const dimensionsInputElement = document.getElementById('product-dimensions');
    if (!dimensionsInputElement) return;
    
    // Criar tooltip de dicas se não existir
    if (!document.getElementById('dimensions-tips')) {
        const tips = document.createElement('div');
        tips.id = 'dimensions-tips';
        tips.className = 'dimensions-tips';
        tips.innerHTML = `
            <h4>📏 Formato das Dimensões</h4>
            <p><strong>Como preencher:</strong></p>
            <ul>
                <li>✓ Use o formato: <code>Largura × Altura × Profundidade</code></li>
                <li>✓ Separe com "x", "×" ou ","</li>
                <li>✓ Pode usar ou não espaços</li>
                <li>✓ A unidade (cm, mm, m) é opcional</li>
                <li>✓ Pode usar números decimais (ex: 10.5)</li>
            </ul>
            <p><strong>Exemplos válidos:</strong></p>
            <div class="dimensions-examples">
                <code>10x15x5</code>
                <code>10 x 15 x 5</code>
                <code>10.5×15.2×5.3</code>
                <code>10,15,5 cm</code>
                <code>10x15x5 mm</code>
                <code>0.5×0.3×0.2 m</code>
            </div>
            <p><small>O sistema formatará automaticamente para: <strong>10 × 15 × 5 cm</strong></small></p>
        `;
        
        const dimensionsGroup = dimensionsInputElement.closest('.form-group');
        dimensionsGroup.appendChild(tips);
        
        // Remover tooltip após 15 segundos ou ao clicar fora
        setTimeout(() => {
            if (tips.parentNode) {
                tips.remove();
            }
        }, 15000);
        
        // Remover ao clicar em qualquer lugar
        document.addEventListener('click', function removeTips(e) {
            if (!dimensionsGroup.contains(e.target)) {
                if (tips.parentNode) {
                    tips.remove();
                }
                document.removeEventListener('click', removeTips);
            }
        });
    }
}

// Função para atualizar a validação visual do campo
function updateFieldValidation(fieldId, value, errorMessage = '') {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    if (field) {
        if (errorMessage) {
            field.classList.add('invalid');
            field.classList.remove('valid');
            
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = 'block';
            } else {
                // Criar elemento de erro se não existir
                const newErrorElement = document.createElement('div');
                newErrorElement.id = `${fieldId}-error`;
                newErrorElement.className = 'field-error';
                newErrorElement.textContent = errorMessage;
                field.parentNode.appendChild(newErrorElement);
            }
        } else {
            field.classList.remove('invalid');
            if (value.length > 0) {
                field.classList.add('valid');
            }
            
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
    }
}

// Função para mostrar preview do preço formatado
function showPricePreview(value) {
    const priceInputElement = document.getElementById('product-price');
    if (!priceInputElement) return;
    
    let previewElement = document.getElementById('price-preview');
    if (!previewElement) {
        previewElement = document.createElement('div');
        previewElement.id = 'price-preview';
        previewElement.className = 'price-preview';
        priceInputElement.parentNode.appendChild(previewElement);
    }
    
    if (!isNaN(value) && value > 0) {
        const formatted = value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        previewElement.textContent = `Valor: ${formatted}`;
        previewElement.style.display = 'block';
    } else {
        previewElement.style.display = 'none';
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
    document.getElementById(fieldId).classList.add('invalid');
}

function hideFieldError(fieldId) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    document.getElementById(fieldId).classList.remove('invalid');
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
        // NOVO: Coletar cores selecionadas
        colors: selectedColors.map(c => c.name), // Apenas os nomes
        weight: document.getElementById('product-weight').value.trim() || null,
        printTime: document.getElementById('product-print-time').value.trim(),
        specifications: document.getElementById('product-specifications').value.trim(),
        images: []
    };

    // 2. Validar dados COMPLETAMENTE
    const validation = validateProductForm(productData);
    if (!validation.isValid) {
        showFormValidationMessage(validation.errors.join('<br>'), 'error');
        
        // Destacar campos inválidos
        validation.errors.forEach(error => {
            // Extrair o campo do erro para destaque visual
            if (error.includes('nome')) {
                document.getElementById('product-name').classList.add('invalid');
            } else if (error.includes('descrição')) {
                document.getElementById('product-description').classList.add('invalid');
            } else if (error.includes('preço')) {
                document.getElementById('product-price').classList.add('invalid');
            } else if (error.includes('categoria')) {
                document.getElementById('product-category').classList.add('invalid');
            } else if (error.includes('material')) {
                document.getElementById('product-material').classList.add('invalid');
            } else if (error.includes('cor')) {
                document.getElementById('colors-selector-container').classList.add('invalid');
            } else if (error.includes('peso')) {
                document.getElementById('product-weight').classList.add('invalid');
            } else if (error.includes('tempo')) {
                document.getElementById('product-print-time').classList.add('invalid');
            }
        });
        
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
    
    // NOVO: Limpar seleção de cores
    selectedColors = [];
    updateColorSelectionUI();
    
    // Resetar contadores
    document.querySelectorAll('.character-counter').forEach(counter => {
        counter.textContent = '0/0 caracteres';
        counter.style.color = 'var(--gray)';
    });
    
    // Resetar classes de validação
    document.querySelectorAll('.form-control').forEach(field => {
        field.classList.remove('invalid', 'valid');
        field.style.borderColor = '';
    });
    
    // Resetar validação do seletor de cores
    const colorsContainer = document.getElementById('colors-selector-container');
    if (colorsContainer) {
        colorsContainer.classList.remove('invalid');
    }
    
    // Ocultar mensagens de erro
    document.querySelectorAll('.field-error').forEach(error => {
        error.style.display = 'none';
    });
    
    // Remover preview do preço
    const pricePreview = document.getElementById('price-preview');
    if (pricePreview) pricePreview.style.display = 'none';
    
    // Remover preview das dimensões
    hideDimensionsPreview();
    
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
    
    // NOVO: Carregar cores selecionadas
    if (product.colors && Array.isArray(product.colors)) {
        selectedColors = product.colors.map(colorName => {
            const colorInfo = AVAILABLE_COLORS.find(c => c.name === colorName);
            return colorInfo || { name: colorName, hex: '#e0e0e0' };
        });
        updateColorSelectionUI();
    } else {
        selectedColors = [];
        updateColorSelectionUI();
    }
    
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
    
    // Adicionar cores ao card
    let colorsHTML = '';
    if (product.colors && product.colors.length > 0) {
        colorsHTML = `
            <div class="admin-product-colors">
                <strong>Cores:</strong> 
                <div class="admin-colors-chips">
                    ${product.colors.slice(0, 5).map(color => `
                        <span class="admin-color-chip" style="background-color: ${getColorHexFromName(color)}" title="${color}"></span>
                    `).join('')}
                    ${product.colors.length > 5 ? `<span class="more-colors">+${product.colors.length - 5}</span>` : ''}
                </div>
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
        ${colorsHTML}
        ${specsHTML}
        ${product.specifications ? `<p><strong>Técnico:</strong> ${product.specifications}</p>` : ''}
    `;
    
    return productCard;
}

// Função auxiliar para obter cor hexadecimal pelo nome
function getColorHexFromName(colorName) {
    const color = AVAILABLE_COLORS.find(c => c.name === colorName);
    return color ? color.hex : '#e0e0e0';
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
            
            // Verificar formato válido
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showMessage('Formato Inválido', 'Use apenas JPG, PNG, GIF ou WebP.', 'error');
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
