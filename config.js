// ========================================================================
// === CONFIGURAÇÕES GLOBAIS DO SITE
// ========================================================================

const CONFIG = {
  // Configurações do WhatsApp
  whatsapp: {
    phone: '5519994083609',
    messages: {
      main: 'Olá! Gostaria de solicitar um orçamento para impressão 3D personalizada.',
      product: (productName) => `Olá! Gostaria de um orçamento para o produto: ${productName}`
    },
    // Gerar link completo do WhatsApp
    getLink: (message) => `https://wa.me/${CONFIG.whatsapp.phone}?text=${encodeURIComponent(message)}`
  }
};
