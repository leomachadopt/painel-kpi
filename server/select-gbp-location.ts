#!/usr/bin/env tsx
/**
 * Script para listar e selecionar uma localização do Google Business Profile
 *
 * Uso: npx tsx server/select-gbp-location.ts
 */

import 'dotenv/config'
import { ensureGoogleAccessToken, listGbpLocations, selectGbpLocation } from './marketing/google.js'

const CLINIC_ID = 'clinic-1767296701478' // ID da sua clínica

async function main() {
  console.log('\n=================================================')
  console.log('    SELEÇÃO DE LOCALIZAÇÃO - GOOGLE BUSINESS PROFILE')
  console.log('=================================================\n')

  try {
    console.log('🔑 Obtendo token de acesso...')
    const accessToken = await ensureGoogleAccessToken(CLINIC_ID)
    console.log('✅ Token obtido com sucesso\n')

    console.log('📍 Buscando localizações disponíveis...')
    const locations = await listGbpLocations(accessToken)

    if (locations.length === 0) {
      console.log('\n❌ Nenhuma localização encontrada.')
      console.log('\n💡 Possíveis causas:')
      console.log('   1. Sua conta Google não tem acesso a nenhum perfil do Google Meu Negócio')
      console.log('   2. As permissões do OAuth não incluem acesso ao Google Business Profile')
      console.log('\n🔧 Solução:')
      console.log('   1. Crie um perfil no Google Meu Negócio: https://business.google.com/')
      console.log('   2. Reconecte a integração nas configurações do sistema')
      process.exit(1)
    }

    console.log(`\n✅ ${locations.length} localização(ões) encontrada(s):\n`)

    locations.forEach((loc, index) => {
      console.log(`${index + 1}. ${loc.title || 'Sem título'}`)
      console.log(`   Account ID: ${loc.accountId}`)
      console.log(`   Location ID: ${loc.locationId}`)
      if (loc.address) console.log(`   Endereço: ${loc.address}`)
      if (loc.storeCode) console.log(`   Código: ${loc.storeCode}`)
      console.log('')
    })

    // Seleciona automaticamente a primeira localização
    if (locations.length === 1) {
      console.log('🎯 Selecionando automaticamente a única localização disponível...')
      const location = locations[0]
      await selectGbpLocation({
        clinicId: CLINIC_ID,
        accountId: location.accountId,
        locationId: location.locationId,
      })

      console.log('\n=================================================')
      console.log('    LOCALIZAÇÃO SELECIONADA COM SUCESSO!')
      console.log('=================================================\n')
      console.log(`✅ Localização: ${location.title || 'Sem título'}`)
      console.log(`📍 Endereço: ${location.address || 'N/A'}`)
      console.log('\n💡 Próximos passos:')
      console.log('   1. Execute: npx tsx server/test-gbp-collection.ts')
      console.log('   2. Ou acesse o painel e clique em "Atualizar agora" na seção de Marketing\n')
    } else {
      console.log('⚠️  Múltiplas localizações encontradas.')
      console.log('\n💡 Para selecionar uma localização:')
      console.log('   1. Acesse: http://localhost:8080/configuracoes')
      console.log('   2. Na seção "Integrações", escolha a localização desejada')
      console.log('   3. Ou modifique este script para selecionar automaticamente\n')
    }
  } catch (error: any) {
    console.error('\n=================================================')
    console.error('    ERRO')
    console.error('=================================================\n')
    console.error('❌ Erro:', error.message)

    if (error.message.includes('GBP integration not configured')) {
      console.error('\n💡 Solução:')
      console.error('   1. Acesse: http://localhost:8080/configuracoes')
      console.error('   2. Clique em "Conectar com Google"')
      console.error('   3. Autorize o acesso ao Google Business Profile')
      console.error('   4. Tente novamente\n')
    }

    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }

    process.exit(1)
  }
}

main()
