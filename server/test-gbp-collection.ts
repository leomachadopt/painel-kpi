#!/usr/bin/env tsx
/**
 * Script para testar a coleta de dados do Google Business Profile
 *
 * Uso: npx tsx server/test-gbp-collection.ts
 */

import 'dotenv/config'
import { runMarketingJobForClinic } from './marketing/run.js'

const CLINIC_ID = 'clinic-1767296701478' // ID da sua clínica

async function main() {
  console.log('\n=================================================')
  console.log('    TESTE DE COLETA - GOOGLE BUSINESS PROFILE')
  console.log('=================================================\n')

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  console.log(`📅 Data de hoje: ${today}`)
  console.log(`📅 Data de ontem: ${yesterday}`)
  console.log(`🏥 Clínica: ${CLINIC_ID}\n`)

  console.log('⚠️  IMPORTANTE:')
  console.log('   1. Certifique-se de que você conectou o Google OAuth')
  console.log('   2. Selecione uma localização do Google Meu Negócio nas configurações')
  console.log('   3. Aguarde... isso pode levar alguns segundos\n')

  console.log('🚀 Iniciando coleta...\n')

  try {
    // Tenta coletar dados de ontem (mais provável de ter dados)
    await runMarketingJobForClinic(CLINIC_ID, yesterday, 'real')

    console.log('\n=================================================')
    console.log('    COLETA CONCLUÍDA COM SUCESSO!')
    console.log('=================================================\n')
    console.log('✅ Dados coletados e armazenados no banco de dados')
    console.log('\n💡 Próximos passos:')
    console.log('   1. Acesse: http://localhost:8080/relatorios')
    console.log('   2. Selecione a clínica')
    console.log('   3. Escolha "Marketing" no menu')
    console.log('   4. Visualize as métricas do Google Business Profile\n')
  } catch (error: any) {
    console.error('\n=================================================')
    console.error('    ERRO NA COLETA')
    console.error('=================================================\n')
    console.error('❌ Erro:', error.message)
    console.error('\n🔍 Possíveis causas:')
    console.error('   1. Google OAuth não conectado')
    console.error('   2. Localização do Google Meu Negócio não selecionada')
    console.error('   3. Permissões insuficientes na API do Google')
    console.error('   4. Token expirado ou inválido')
    console.error('\n💡 Solução:')
    console.error('   1. Acesse: http://localhost:8080/configuracoes')
    console.error('   2. Conecte-se ao Google')
    console.error('   3. Selecione uma localização do Google Meu Negócio')
    console.error('   4. Tente novamente\n')

    if (error.stack) {
      console.error('Stack trace:')
      console.error(error.stack)
    }

    process.exit(1)
  }
}

main()
