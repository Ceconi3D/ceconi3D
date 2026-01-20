// Array global de produtos
let products = [];

// Mapa de cores para converter nomes em Hex (Copie isso para Site.js e TodosOsProdutos.js)
const COLOR_MAP = {
    "Branco": "#FFFFFF", "Preto": "#000000", "Cinza": "#808080", "Prata": "#C0C0C0",
    "Vermelho": "#FF0000", "Vermelho Escuro": "#8B0000", "Vermelho Claro": "#FF6B6B",
    "Azul": "#0000FF", "Azul Marinho": "#000080", "Azul Claro": "#ADD8E6", "Azul Turquesa": "#40E0D0",
    "Verde": "#008000", "Verde Limão": "#32CD32", "Verde Claro": "#90EE90", "Verde Escuro": "#006400",
    "Amarelo": "#FFFF00", "Amarelo Ouro": "#FFD700", "Laranja": "#FFA500",
    "Rosa": "#FFC0CB", "Rosa Choque": "#FF1493", "Roxo": "#800080", "Roxo Claro": "#9370DB", "Violeta": "#EE82EE",
    "Marrom": "#8B4513", "Marrom Claro": "#D2691E", "Bege": "#F5F5DC",
    "Dourado": "#FFD700", "Prata Metálico": "#A6A6A6", "Bronze": "#CD7F32", "Cobre": "#B87333",
    "Transparente": "#F0F0F0", "Fosco Branco": "#F5F5F5", "Fosco Preto": "#1A1A1A",
    "Neon Rosa": "#FF6EC7", "Neon Verde": "#39FF14", "Neon Azul": "#00FFFF", "Neon Amarelo": "#FFFF33"
};

// Função auxiliar para gerar o HTML das cores
function generateColorsHTML(colors) {
    if (!colors || !Array.isArray(colors) || colors.length === 0) return '';

    let html = '<div class="product-colors">';
    
    // Mostra até 5 cores
    const displayColors = colors.slice(0, 5);
    
    displayColors.forEach(colorName => {
        // Pega o código HEX ou usa cinza se não encontrar
        const hex = COLOR_MAP[colorName] || '#cccccc'; 
        html += `<span class="color-chip" style="background-color: ${hex}" title="${colorName}"></span>`;
    });

    // Se tiver mais de 5, mostra o contador (+2)
    if (colors.length > 5) {
        html += `<span class="more-colors">+${colors.length - 5}</span>`;
    }

    html += '</div>';
    return html;
}

// Variáveis para o clique duplo administrativo
let adminClickCount = 0;
let adminClickTimer = null;

// Sistema de acesso administrativo secreto
function setupAdminAccess() {
    const adminIcon = document.getElementById('admin-icon');
    const secretDot = document.getElementById('secret-dot');
    
    if (!adminIcon) {
        console.warn('Ícone administrativo não encontrado');
        return;
    }
    
    // Sistema de clique duplo para o ícone de engrenagem
    adminIcon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        adminClickCount++;
        
        console.log(`Clique #${adminClickCount} no ícone administrativo`);
        
        // Limpar timer anterior
        if (adminClickTimer) {
            clearTimeout(adminClickTimer);
        }
        
        if (adminClickCount === 1) {
            // Primeiro clique - configurar timer
            adminClickTimer = setTimeout(function() {
                console.log('Timer expirado - resetando contagem');
                adminClickCount = 0;
                adminClickTimer = null;
            }, 500); // 500ms para o segundo clique
        } else if (adminClickCount === 2) {
            // Segundo clique dentro do tempo - abrir admin
            console.log('Clique duplo detectado - abrindo admin');
            clearTimeout(adminClickTimer);
            adminClickCount = 0;
            adminClickTimer = null;
            
            // Pedir confirmação
            if (confirm('Acessar painel administrativo?')) {
                window.open('Adm.html', '_blank');
            }
        }
    });
    
    // Sistema de clique triplo para o ponto secreto (opcional)
    if (secretDot) {
        let dotClickCount = 0;
        let dotClickTimer = null;
        
        secretDot.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            dotClickCount++;
            
            console.log(`Clique #${dotClickCount} no ponto secreto`);
            
            // Limpar timer anterior
            if (dotClickTimer) {
                clearTimeout(dotClickTimer);
            }
            
            if (dotClickCount === 3) {
                // Terceiro clique - abrir admin
                console.log('Clique triplo detectado - abrindo admin');
                clearTimeout(dotClickTimer);
                dotClickCount = 0;
                dotClickTimer = null;
                
                // Feedback visual
                secretDot.style.color = 'rgba(200, 166, 154, 0.5)';
                setTimeout(() => {
                    secretDot.style.color = 'rgba(255,255,255,0.05)';
                }, 1000);
                
                // Pedir confirmação
                if (confirm('Acessar área administrativa?')) {
                    window.open('Adm.html', '_blank');
                }
            } else {
                // Configurar timer para resetar
                dotClickTimer = setTimeout(function() {
                    console.log('Timer do ponto expirado - resetando');
                    dotClickCount = 0;
                    dotClickTimer = null;
                }, 1000);
            }
        });
    }
    
    // Código secreto por teclado (backup)
    let keySequence = '';
    const secretCode = 'admin333'; // Código secreto
    
    document.addEventListener('keydown', function(e) {
        // Ignorar teclas especiais
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        
        // Adiciona a tecla pressionada à sequência
        keySequence += e.key.toLowerCase();
        
        // Mantém apenas os últimos caracteres
        if (keySequence.length > secretCode.length) {
            keySequence = keySequence.substring(keySequence.length - secretCode.length);
        }
        
        console.log(`Sequência de teclas: ${keySequence}`);
        
        // Verifica se a sequência bate com o código
        if (keySequence === secretCode) {
            console.log('Código secreto detectado!');
            if (confirm('Código secreto aceito! Abrir painel administrativo?')) {
                window.open('Adm.html', '_blank');
            }
            keySequence = ''; // Reseta
        }
        
        // Reseta após 3 segundos de inatividade
        clearTimeout(window.keyboardTimer);
        window.keyboardTimer = setTimeout(function() {
            keySequence = '';
            console.log('Sequência de teclas resetada por inatividade');
        }, 3000);
    });
}

// Carregar produtos do Firebase
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando carregamento de produtos...');
    
    // Configurar acesso administrativo primeiro
    setupAdminAccess();
    
    // Aguardar o FirebaseService carregar
    const waitForFirebase = setInterval(() => {
        if (typeof firebaseService !== 'undefined') {
            clearInterval(waitForFirebase);
            console.log('✅ FirebaseService carregado, iniciando carga de produtos...');
            loadProducts();
        }
    }, 500);

    // Timeout de segurança
    setTimeout(() => {
        if (typeof firebaseService === 'undefined') {
            clearInterval(waitForFirebase);
            console.error('❌ FirebaseService não carregado após timeout');
            document.getElementById('products-container').innerHTML = 
                '<p style="color: white; text-align: center; padding: 40px;">Erro ao carregar o sistema. Recarregue a página.</p>';
        }
    }, 10000);
});

async function loadProducts() {
    try {
        console.log('📦 Buscando produtos...');
        products = await firebaseService.getProducts();
        console.log(`✅ ${products.length} produtos carregados`);
        
        if (products.length === 0) {
            console.warn('⚠️ Nenhum produto encontrado no Firestore');
            document.getElementById('products-container').innerHTML = 
                '<p style="color: white; text-align: center; padding: 40px;">Nenhum produto cadastrado ainda.</p>';
        } else {
            renderProducts(); // Renderiza a vitrine
        }
        
        setupEventListeners(); // Configura menu mobile, filtros, etc.
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        document.getElementById('products-container').innerHTML = 
            '<p style="color: white; text-align: center; padding: 40px;">Erro ao carregar produtos. Tente novamente mais tarde.</p>';
    }
}

// Renderizar produtos na página com galeria de imagens - LIMITADO A 6 PRODUTOS
function renderProducts(filter = 'all') {
    const container = document.getElementById('products-container');
    if (!container) return; 
    
    container.innerHTML = '';
    
    // Ordena por data de criação para pegar os mais novos
    const sortedProducts = [...products].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    const filteredProducts = filter === 'all' 
        ? sortedProducts.slice(0, 6) // LIMITE DE 6 PRODUTOS NA PÁGINA PRINCIPAL
        : sortedProducts.filter(product => product.category === filter).slice(0, 6); // LIMITE DE 6 PRODUTOS
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<p style="color: white; text-align: center;">Nenhum produto encontrado nesta categoria.</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-category', product.category);
        
        const hasMultipleImages = product.images && product.images.length > 1;
        const mainImage = product.images && product.images.length > 0 
            ? product.images[0] 
            : 'https://via.placeholder.com/300x200?text=Sem+Imagem';
        
        let navHTML = '';
        let counterHTML = '';
        let arrowsHTML = '';
        
        if (hasMultipleImages) {
            counterHTML = `<div class="multi-image-indicator">${product.images.length}</div>`;
            arrowsHTML = `
                <button class="nav-arrow prev" onclick="navImage(this, -1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="nav-arrow next" onclick="navImage(this, 1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
            navHTML = `<div class="product-image-nav">`;
            product.images.forEach((_, index) => {
                navHTML += `<button class="nav-dot ${index === 0 ? 'active' : ''}" 
                            onclick="goToImage(this, ${index})"></button>`;
            });
            navHTML += `</div>`;
        }
        
        const colorsHTML = generateColorsHTML(product.colors);
        
        productCard.innerHTML = `
            <div class="product-image" data-product-id="${product.id}">
                <img src="${mainImage}" alt="${product.name}" data-current-index="0">
                ${counterHTML}
                ${arrowsHTML}
                ${navHTML}
            </div>
            <div class="product-info">
                <h3><a href="Produto.html?id=${product.id}" style="text-decoration: none; color: inherit;">${product.name}</a></h3>
                ${product.category ? `<p><small><strong>Categoria:</strong> ${product.category}</small></p>` : ''}
                ${product.dimensions ? `<p><small><strong>Dimensões:</strong> ${product.dimensions}</small></p>` : ''}
                ${product.material ? `<p><small><strong>Material:</strong> ${product.material}</small></p>` : ''}
                ${product.printTime ? `<p><small><strong>Tempo de Impressão:</strong> ${product.printTime}</small></p>` : ''}

                ${colorsHTML}

                <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <a href="Produto.html?id=${product.id}" class="btn">
                        <i class="fas fa-eye"></i> Ver Detalhes
                    </a>
                    <a href="${CONFIG.whatsapp.getLink(`Olá! Gostaria de saber mais sobre o ${encodeURIComponent(product.name)`)}" class="btn btn-whatsapp" target="_blank">
                        <i class="fab fa-whatsapp"></i> Orçamento
                    </a>
                </div>
            </div>
        `;
        
        container.appendChild(productCard);
    });
}

// Funções de navegação da galeria
function navImage(button, direction) {
    const productImage = button.closest('.product-image');
    const imgElement = productImage.querySelector('img');
    const dots = productImage.querySelectorAll('.nav-dot');
    const productId = productImage.getAttribute('data-product-id');
    
    const product = products.find(p => p.id === productId);
    if (!product || !product.images) return;
    
    let currentIndex = parseInt(imgElement.getAttribute('data-current-index'));
    const totalImages = product.images.length;
    
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = totalImages - 1;
    if (newIndex >= totalImages) newIndex = 0;
    
    imgElement.src = product.images[newIndex];
    imgElement.setAttribute('data-current-index', newIndex);
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === newIndex);
    });
}

function goToImage(button, index) {
    const productImage = button.closest('.product-image');
    const imgElement = productImage.querySelector('img');
    const dots = productImage.querySelectorAll('.nav-dot');
    const productId = productImage.getAttribute('data-product-id');
    
    const product = products.find(p => p.id === productId);
    if (!product || !product.images || !product.images[index]) return;
    
    imgElement.src = product.images[index];
    imgElement.setAttribute('data-current-index', index);
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// Configurar event listeners (filtros, menu mobile, animações)
function setupEventListeners() {
    // Filtro de produtos (página principal)
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const filterValue = this.getAttribute('data-filter');
            renderProducts(filterValue);
        });
    });
    
    // Menu mobile
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    mobileMenu.addEventListener('click', function() {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    });
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                navLinks.style.display = 'none';
            }
        });
    });
    
    // Atualizar link ativo ao rolar
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-links a');
        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
    
    // Animação para serviços ao scrollar
    function checkServicesAnimation() {
        const servicesSection = document.querySelector('.services');
        const servicesGrid = document.querySelector('.services-grid');
        
        if (servicesSection && servicesGrid) {
            const sectionTop = servicesSection.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2;
            
            if (sectionTop < screenPosition) {
                servicesGrid.classList.add('animate');
                
                document.querySelectorAll('.service-card').forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('animate');
                    }, index * 200);
                });
                
                window.removeEventListener('scroll', checkServicesAnimation);
            }
        }
    }
    
    // Adicionar suporte a navegação por teclado e swipe
    function setupGalleryInteractions() {
        // Suporte a teclado
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                const focusedElement = document.activeElement;
                if (focusedElement && focusedElement.closest('.product-image')) {
                    const productImage = focusedElement.closest('.product-image');
                    const prevButton = productImage.querySelector('.nav-arrow.prev');
                    if (prevButton) navImage(prevButton, -1);
                }
            } else if (e.key === 'ArrowRight') {
                const focusedElement = document.activeElement;
                if (focusedElement && focusedElement.closest('.product-image')) {
                    const productImage = focusedElement.closest('.product-image');
                    const nextButton = productImage.querySelector('.nav-arrow.next');
                    if (nextButton) navImage(nextButton, 1);
                }
            }
        });
        
        // Suporte a swipe para mobile
        let touchStartX = 0, touchEndX = 0, touchStartY = 0, touchEndY = 0;
        
        document.addEventListener('touchstart', function(e) {
            if (e.target.closest('.product-image')) {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }
        }, { passive: true });
        
        document.addEventListener('touchend', function(e) {
            if (e.target.closest('.product-image')) {
                touchEndX = e.changedTouches[0].screenX;
                touchEndY = e.changedTouches[0].screenY;
                handleSwipe(e.target);
            }
        });
        
        function handleSwipe(targetElement) {
            const swipeThreshold = 50;
            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;
            
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
                const productImage = targetElement.closest('.product-image');
                if (productImage) {
                    if (diffX > 0) { // Swipe para a esquerda
                        const nextButton = productImage.querySelector('.nav-arrow.next');
                        if (nextButton) navImage(nextButton, 1);
                    } else { // Swipe para a direita
                        const prevButton = productImage.querySelector('.nav-arrow.prev');
                        if (prevButton) navImage(prevButton, -1);
                    }
                }
            }
        }
    }
    
    // Adicionar evento de scroll
    window.addEventListener('scroll', function() {
        updateActiveNavLink();
        checkServicesAnimation();
    });
    
    // Chamar uma vez ao carregar a página
    updateActiveNavLink();
    checkServicesAnimation();
    setupGalleryInteractions();
    
    // Ajustar menu na redimensionamento da tela
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            navLinks.style.display = 'flex';
        } else {
            navLinks.style.display = 'none';
        }
    });
}
