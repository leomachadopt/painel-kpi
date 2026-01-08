// Polyfill simples para stream no navegador
// Necessário para xlsx-js-style funcionar no navegador
// Este módulo substitui o módulo 'stream' do Node.js que não está disponível no navegador

export const Readable = class Readable {
  constructor() {
    // Implementação vazia para navegador
    // xlsx-js-style não usa realmente o stream no navegador, apenas verifica sua existência
  }
}

// Exportar como default para compatibilidade
export default {
  Readable,
}

