// ========================================================================
// === 1. MAPA DE CORES (NOVO)
// ========================================================================
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

// Espera a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Iniciando carregamento - Página do Produto');
    
    // Aguardar o FirebaseService carregar
    const waitForFirebase = setInterval(() => {
        if (typeof firebaseService !== 'undefined') {
            clearInterval(waitForFirebase);
            console.log('✅ FirebaseService carregado, iniciando carga...');
            loadProduct();
            setupMobileMenu();
        }
    }, 500);

    // Timeout de segurança
    setTimeout(() => {
        if (typeof firebaseService === 'undefined') {
            clearInterval(waitForFirebase);
            console.error('❌ FirebaseService não carregado após timeout');
            showMessage('Erro ao carregar o sistema. Recarregue a página.');
        }
    }, 10000);
});

// Elementos do DOM
const productLayout = document.getElementById('product-layout');
const productMessage = document.getElementById('product-message');

// Mostra o spinner de carregamento
function showLoading(message = 'Carregando produto...') {
    if (productLayout) productLayout.style.display = 'none';
    if (productMessage) {
        productMessage.style.display = 'block';
        productMessage.innerHTML = `
            <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary);"></i>
            <p style="margin-top: 15px;">${message}</p>`;
    }
}

// Mostra mensagem de erro
function showMessage(message) {
    if (productLayout) productLayout.style.display = 'none';
    if (productMessage) {
        productMessage.style.display = 'block';
        productMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--gray);"></i>
            <p style="margin-top: 15px;">${message}</p>`;
    }
}

// Função principal para carregar o produto
async function loadProduct() {
    showLoading();
    
    // 1. Pegar o ID da URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    
    if (!productId) {
        showMessage('Produto não encontrado. Verifique o link e tente novamente.');
        return;
    }

    try {
        // 2. Buscar o produto específico e todos os produtos (para relacionados)
        const product = await firebaseService.getProductById(productId);
        const allProducts = await firebaseService.getProducts();

        if (!product) {
            showMessage('Produto não encontrado. Ele pode ter sido removido.');
            return;
        }

        // 3. Renderizar tudo
        renderProductDetails(product);
        renderRelatedProducts(product, allProducts);

        // 4. Mostrar o conteúdo
        productLayout.style.display = 'grid';
        productMessage.style.display = 'none';

    } catch (error) {
        console.error("Erro ao carregar produto:", error);
        showMessage('Ocorreu um erro ao carregar o produto.');
    }
}

// Renderiza os detalhes do produto principal
function renderProductDetails(product) {
    // Breadcrumb
    document.getElementById('breadcrumb-product-name').textContent = product.name;

    // Galeria
    const mainImage = document.getElementById('main-image');
    const thumbnailsContainer = document.getElementById('image-thumbnails');
    thumbnailsContainer.innerHTML = ''; // Limpar miniaturas

    if (product.images && product.images.length > 0) {
        mainImage.src = product.images[0];
        mainImage.alt = product.name;

        product.images.forEach((imgSrc, index) => {
            const thumb = document.createElement('div');
            thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumb.innerHTML = `<img src="${imgSrc}" alt="Miniatura ${index + 1}">`;
            
            thumb.addEventListener('click', () => {
                mainImage.src = imgSrc;
                // Atualizar classe 'active'
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            
            thumbnailsContainer.appendChild(thumb);
        });
    } else {
        mainImage.src = 'https://via.placeholder.com/500x500?text=Sem+Imagem';
        mainImage.alt = product.name;
    }

    // Informações
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-price').textContent = `R$ ${product.price.toFixed(2)}`;
    document.getElementById('product-description').textContent = product.description;

    // Meta-info
    const metaContainer = document.getElementById('product-meta');
    metaContainer.innerHTML = `
        <div class="meta-item">
            <i class="fas fa-tag"></i>
            <span>Categoria: <strong>${getCategoryName(product.category)}</strong></span>
        </div>
    `;

    // --- CORES DISPONÍVEIS (NOVO) ---
    // Procura o container de cores no HTML e insere as bolinhas
    const colorsContainer = document.getElementById('product-colors-container');
    if (colorsContainer) {
        colorsContainer.innerHTML = generateColorsHTML(product.colors);
    }

    // Especificações
    const specsContainer = document.getElementById('specs-grid');
    specsContainer.innerHTML = ''; // Limpar
    
    if (product.material) specsContainer.innerHTML += createSpecItem('Material', product.material);
    if (product.dimensions) specsContainer.innerHTML += createSpecItem('Dimensões', product.dimensions);
    if (product.weight) specsContainer.innerHTML += createSpecItem('Peso', `${product.weight}g`);
    if (product.printTime) specsContainer.innerHTML += createSpecItem('Tempo de Impressão', product.printTime);
    if (product.specifications) specsContainer.innerHTML += createSpecItem('Detalhes', product.specifications, true);

    // Botão WhatsApp
    const whatsappLink = CONFIG.whatsapp.getLink(CONFIG.whatsapp.messages.product(product.name));
    document.getElementById('whatsapp-button').href = whatsappLink;
}

// Função auxiliar para criar item de especificação
function createSpecItem(label, value, fullWidth = false) {
    if (fullWidth) {
        return `<div class="spec-item" style="flex-direction: column; align-items: flex-start; grid-column: 1 / -1;">
                    <span class="spec-label">${label}</span>
                    <span class="spec-value" style="text-align: left; margin-top: 5px;">${value}</span>
                </div>`;
    }
    return `<div class="spec-item">
                <span class="spec-label">${label}</span>
                <span class="spec-value">${value}</span>
            </div>`;
}

// Renderiza os produtos relacionados
function renderRelatedProducts(currentProduct, allProducts) {
    const relatedContainer = document.getElementById('related-grid');
    relatedContainer.innerHTML = '';

    const related = allProducts
        .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id) // Mesma categoria, ID diferente
        .slice(0, 4); // Limitar a 4 produtos

    if (related.length === 0) {
        relatedContainer.innerHTML = '<p style="color: var(--gray);">Nenhum produto relacionado encontrado.</p>';
        return;
    }

    related.forEach(product => {
        const mainImage = product.images && product.images.length > 0 
            ? product.images[0] 
            : 'https://via.placeholder.com/300x200?text=Sem+Imagem';
        
        const card = document.createElement('a');
        card.href = `Produto.html?id=${product.id}`;
        card.className = 'related-card';
        card.innerHTML = `
            <div class="related-image">
                <img src="${mainImage}" alt="${product.name}">
            </div>
            <div class="related-info">
                <h3>${product.name}</h3>
                <div class="related-price">R$ ${product.price.toFixed(2)}</div>
            </div>
        `;
        relatedContainer.appendChild(card);
    });
}

// --- Funções Auxiliares (copiadas de outros JS) ---

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
    return categories[category] || category; // Modificado para retornar a própria categoria se não achar no mapa
}

// Nova função para gerar o HTML das cores
function generateColorsHTML(colors) {
    if (!colors || !Array.isArray(colors) || colors.length === 0) {
        return '';
    }

    let html = '<div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 20px;">';
    html += '<strong style="color: var(--dark); margin-right: 5px;">Cores:</strong> ';
    
    colors.forEach(colorName => {
        const hex = COLOR_MAP[colorName] || '#cccccc';
        html += `<span title="${colorName}" style="
            width: 25px; 
            height: 25px; 
            border-radius: 50%; 
            background-color: ${hex}; 
            display: inline-block; 
            border: 1px solid rgba(0,0,0,0.2);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            cursor: help;
        "></span>`;
    });

    html += '</div>';
    return html;
}

function setupMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenu) {
        mobileMenu.addEventListener('click', function() {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        });
    }
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                navLinks.style.display = 'none';
            }
        });
    });
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            navLinks.style.display = 'flex';
        } else {
            navLinks.style.display = 'none';
        }
    });
}
