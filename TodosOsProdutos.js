// Variáveis globais
let allProducts = [];
let currentPage = 1;
const productsPerPage = 10;
let currentSearchTerm = '';
let currentCategoryFilter = 'all';
let currentSortBy = 'name-asc';

// Mapa de cores para converter nomes em Hex (Copie isso para index.js e TodosOsProdutos.js)
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

// Função para obter nome da categoria
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
    return categories[category] || category;
}

// Carregar dados quando a página estiver pronta
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 Iniciando carregamento - Todos os Produtos');
    
    // Aguardar o FirebaseService carregar
    const waitForFirebase = setInterval(() => {
        if (typeof firebaseService !== 'undefined') {
            clearInterval(waitForFirebase);
            console.log('✅ FirebaseService carregado, iniciando carga...');
            loadProducts();
        }
    }, 500);

    // Timeout de segurança
    setTimeout(() => {
        if (typeof firebaseService === 'undefined') {
            clearInterval(waitForFirebase);
            console.error('❌ FirebaseService não carregado após timeout');
            showNoProductsMessage();
        }
    }, 10000);
});

// Carregar produtos do Firebase
async function loadProducts() {
    console.log('🔄 Carregando produtos para página Todos os Produtos...');
    try {
        allProducts = await firebaseService.getProducts();
        console.log(`✅ ${allProducts.length} produtos carregados`);
        
        if (allProducts && allProducts.length > 0) {
            renderProducts();
        } else {
            console.warn('⚠️ Nenhum produto encontrado');
            showNoProductsMessage();
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        showNoProductsMessage();
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Busca em tempo real
    document.getElementById('products-search').addEventListener('input', function() {
        currentSearchTerm = this.value;
        currentPage = 1;
        renderProducts();
    });
    
    // Filtro por categoria
    document.getElementById('category-filter').addEventListener('change', function() {
        currentCategoryFilter = this.value;
        currentPage = 1;
        renderProducts();
    });
    
    // Ordenação
    document.getElementById('sort-by').addEventListener('change', function() {
        currentSortBy = this.value;
        renderProducts();
    });
}

// Configurar menu mobile
function setupMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenu) {
        mobileMenu.addEventListener('click', function() {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        });
    }
    
    // Fechar menu ao clicar em um link (mobile)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                navLinks.style.display = 'none';
            }
        });
    });
    
    // Ajustar menu na redimensionamento da tela
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            navLinks.style.display = 'flex';
        } else {
            navLinks.style.display = 'none';
        }
    });
}

// Renderizar produtos
function renderProducts() {
    const container = document.getElementById('products-grid');
    const paginationContainer = document.getElementById('pagination-container');
    const productsCountElement = document.getElementById('products-count');
    const noProductsElement = document.getElementById('no-products');
    
    // Aplicar filtros e ordenação
    let filteredProducts = filterAndSortProducts();
    
    // Atualizar contador
    productsCountElement.textContent = `${filteredProducts.length} produtos encontrados`;
    
    // Calcular paginação
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);
    
    // Limpar container
    container.innerHTML = '';
    
    // Mostrar/ocultar mensagem de nenhum produto
    if (paginatedProducts.length === 0) {
        container.style.display = 'none';
        noProductsElement.style.display = 'block';
    } else {
        container.style.display = 'grid';
        noProductsElement.style.display = 'none';
        
        // Renderizar produtos
        paginatedProducts.forEach(product => {
            const productCard = createProductCard(product);
            container.appendChild(productCard);
        });
    }
    
    // Renderizar paginação
    renderPagination(totalPages, paginationContainer, filteredProducts.length);
}

// Filtrar e ordenar produtos
function filterAndSortProducts() {
    let filteredProducts = [...allProducts];
    
    // Aplicar filtro de busca
    if (currentSearchTerm) {
        const searchTerm = currentSearchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            (product.material && product.material.toLowerCase().includes(searchTerm))
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
                // Usar createdAt do Firebase
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            default:
                // a.id e b.id podem não ser números, então mudamos para createdAt
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        }
    });
    
    return filteredProducts;
}

// Criar card do produto
function createProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    
    // Verificar se tem múltiplas imagens
    const hasMultipleImages = product.images && product.images.length > 1;
    const mainImage = product.images && product.images.length > 0 
        ? product.images[0] 
        : 'https://via.placeholder.com/300x200?text=Sem+Imagem';
    
    // Gerar HTML para navegação de imagens
    let navHTML = '';
    let counterHTML = '';
    let arrowsHTML = '';
    
    if (hasMultipleImages) {
        counterHTML = `<div class="multi-image-indicator">${product.images.length}</div>`;
        
        arrowsHTML = `
            <button class="nav-arrow prev" onclick="navImage(this, -1, '${product.id}')">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="nav-arrow next" onclick="navImage(this, 1, '${product.id}')">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        navHTML = `<div class="product-image-nav">`;
        product.images.forEach((_, index) => {
            navHTML += `<button class="nav-dot ${index === 0 ? 'active' : ''}" 
                        onclick="goToImage(this, ${index}, '${product.id}')"></button>`;
        });
        navHTML += `</div>`;
    }
    
    // Gerar especificações
    let specsHTML = '';
    if (product.dimensions || product.material) {
        specsHTML = `
            <div class="product-specs">
                ${product.category ? `<p><small><strong>Categoria:</strong> ${product.category}</small></p>` : ''}
                ${product.dimensions ? `<p><small><strong>Dimensões:</strong> ${product.dimensions}</small></p>` : ''}
                ${product.material ? `<p><small><strong>Material:</strong> ${product.material}</small></p>` : ''}
                ${product.printTime ? `<p><small><strong>Tempo de Impressão:</strong> ${product.printTime}</small></p>` : ''}
            </div>
        `;
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
            <h3><a href="Produto.html?id=${product.id}">${product.name}</a></h3>
            ${specsHTML}

            ${colorsHTML}

            <div class="product-price">R$ ${product.price.toFixed(2)}</div>
            <div class="product-actions">
                <a href="Produto.html?id=${product.id}" class="btn btn-outline">
                    <i class="fas fa-eye"></i> Ver Detalhes
                </a>
                <a href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o ${encodeURIComponent(product.name)}" 
                   class="btn btn-whatsapp" target="_blank">
                    <i class="fab fa-whatsapp"></i> Orçamento
                </a>
            </div>
        </div>
    `;
    
    return productCard;
}

// Funções de navegação da galeria
function navImage(button, direction, productId) {
    const productImage = button.closest('.product-image');
    const imgElement = productImage.querySelector('img');
    const dots = productImage.querySelectorAll('.nav-dot');
    const product = allProducts.find(p => p.id === productId);
    
    if (!product || !product.images) return;
    
    let currentIndex = parseInt(imgElement.getAttribute('data-current-index'));
    const totalImages = product.images.length;
    
    // Calcular novo índice
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = totalImages - 1;
    if (newIndex >= totalImages) newIndex = 0;
    
    // Atualizar imagem
    imgElement.src = product.images[newIndex];
    imgElement.setAttribute('data-current-index', newIndex);
    
    // Atualizar dots de navegação
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === newIndex);
    });
}

function goToImage(button, index, productId) {
    const productImage = button.closest('.product-image');
    const imgElement = productImage.querySelector('img');
    const dots = productImage.querySelectorAll('.nav-dot');
    const product = allProducts.find(p => p.id === productId);
    
    if (!product || !product.images || !product.images[index]) return;
    
    // Atualizar imagem
    imgElement.src = product.images[index];
    imgElement.setAttribute('data-current-index', index);
    
    // Atualizar dots de navegação
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// Renderizar paginação
function renderPagination(totalPages, container, totalProducts) {
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Informação da página atual
    const startItem = ((currentPage - 1) * productsPerPage) + 1;
    const endItem = Math.min(currentPage * productsPerPage, totalProducts);
    const pageInfo = document.createElement('div');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalProducts}`;
    container.appendChild(pageInfo);
    
    // Botão anterior
    const prevButton = document.createElement('button');
    prevButton.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> Anterior';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    container.appendChild(prevButton);
    
    // Números das páginas
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            renderProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        container.appendChild(pageButton);
    }
    
    // Botão próximo
    const nextButton = document.createElement('button');
    nextButton.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextButton.innerHTML = 'Próximo <i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    container.appendChild(nextButton);
}

// Mostrar mensagem quando não há produtos
function showNoProductsMessage() {
    const container = document.getElementById('products-grid');
    const noProductsElement = document.getElementById('no-products');
    
    container.style.display = 'none';
    noProductsElement.style.display = 'block';
    
    document.getElementById('products-count').textContent = '0 produtos encontrados';
    document.getElementById('pagination-container').innerHTML = '';
}

// Suporte a navegação por teclado
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
        const focusedElement = document.activeElement;
        if (focusedElement.closest('.product-image')) {
            const productImage = focusedElement.closest('.product-image');
            const productId = productImage.getAttribute('data-product-id');
            const prevButton = productImage.querySelector('.nav-arrow.prev');
            if (prevButton) navImage(prevButton, -1, productId);
        }
    } else if (e.key === 'ArrowRight') {
        const focusedElement = document.activeElement;
        if (focusedElement.closest('.product-image')) {
            const productImage = focusedElement.closest('.product-image');
            const productId = productImage.getAttribute('data-product-id');
            const nextButton = productImage.querySelector('.nav-arrow.next');
            if (nextButton) navImage(nextButton, 1, productId);
        }
    }
});
