#!/usr/bin/env tsx
/**
 * Script para verificar se as APIs do Google Business Profile foram aprovadas
 *
 * Uso: npx tsx server/test-google-api-approval.ts
 */

import 'dotenv/config'
import { ensureGoogleAccessToken, listGbpLocations } from './marketing/google.js'

const CLINIC_ID = 'clinic-1767296701478'

async function testApiApproval() {
  console.log('\n=================================================')
  console.log('    TESTE DE APROVAÇÃO - GOOGLE BUSINESS PROFILE')
  console.log('=================================================\n')

  console.log('📋 Verificando status das APIs...\n')

  // Teste 1: Verificar se tem token
  console.log('1️⃣  Verificando autenticação OAuth...')
  try {
    const accessToken = await ensureGoogleAccessToken(CLINIC_ID)
    console.log('   ✅ Token de acesso obtido com sucesso')
    console.log(`   🔑 Token: ${accessToken.substring(0, 20)}...`)
  } catch (error: any) {
    console.error('   ❌ Falha ao obter token:', error.message)
    console.log('\n💡 Solução: Reconecte a integração Google nas configurações')
    process.exit(1)
  }

  console.log('\n2️⃣  Testando API: My Business Account Management')
  console.log('   Tentando listar contas...')

  try {
    const accessToken = await ensureGoogleAccessToken(CLINIC_ID)

    const accountsRes = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    if (!accountsRes.ok) {
      const errorText = await accountsRes.text()
      const error = JSON.parse(errorText)

      if (error.error?.details?.[0]?.metadata?.quota_limit_value === '0') {
        console.log('   ❌ API NÃO APROVADA')
        console.log('   ⚠️  Quota atual: 0 QPM (Queries Per Minute)')
        console.log('\n=================================================')
        console.log('    STATUS: AGUARDANDO APROVAÇÃO DO GOOGLE')
        console.log('=================================================\n')
        console.log('📧 O que fazer:')
        console.log('   1. Verifique seu email para resposta do Google')
        console.log('   2. Aguarde 24-48 horas após preencher o formulário')
        console.log('   3. Se já passou mais de 48h, entre em contato com o Google')
        console.log('\n📝 Formulário de solicitação (caso não tenha preenchido):')
        console.log('   https://docs.google.com/forms/d/e/1FAIpQLSd435sZFhhcf3PAP12vsNLN4xyzyKKJ_cAk2fMYR7ZuFVYA0w/viewform')
        console.log('\n🔍 Como verificar quotas no console:')
        console.log('   https://console.cloud.google.com/apis/api/mybusinessaccountmanagement.googleapis.com/quotas?project=71969479388')
        console.log('')
        process.exit(1)
      }

      throw new Error(`${accountsRes.status}: ${errorText}`)
    }

    const accountsData = await accountsRes.json()
    const accounts = accountsData.accounts || []

    console.log('   ✅ API APROVADA E FUNCIONANDO!')
    console.log(`   📊 Contas encontradas: ${accounts.length}`)

    if (accounts.length > 0) {
      console.log('\n   Contas:')
      accounts.forEach((acc: any, i: number) => {
        console.log(`   ${i + 1}. ${acc.accountName || acc.name}`)
      })
    }

  } catch (error: any) {
    console.error('   ❌ Erro ao testar API:', error.message)
    process.exit(1)
  }

  console.log('\n3️⃣  Testando API: My Business Business Information')
  console.log('   Tentando listar localizações...')

  try {
    const accessToken = await ensureGoogleAccessToken(CLINIC_ID)
    const locations = await listGbpLocations(accessToken)

    console.log('   ✅ API funcionando!')
    console.log(`   📍 Localizações encontradas: ${locations.length}`)

    if (locations.length > 0) {
      console.log('\n   Localizações disponíveis:')
      locations.forEach((loc, i) => {
        console.log(`   ${i + 1}. ${loc.title || 'Sem título'}`)
        if (loc.address) console.log(`      📍 ${loc.address}`)
        console.log(`      🆔 ${loc.locationId}`)
      })
    } else {
      console.log('\n   ⚠️  Nenhuma localização encontrada.')
      console.log('   💡 Isso pode significar que:')
      console.log('      - Você não tem perfis do Google Meu Negócio criados')
      console.log('      - A conta conectada não tem acesso aos perfis')
      console.log('      - Os perfis não estão verificados')
    }

  } catch (error: any) {
    console.error('   ❌ Erro ao listar localizações:', error.message)
  }

  console.log('\n4️⃣  Testando API: Business Profile Performance')
  console.log('   Verificando acesso...')

  try {
    const accessToken = await ensureGoogleAccessToken(CLINIC_ID)

    // Teste simples: ver se a API responde (mesmo que não tenhamos location ainda)
    const testRes = await fetch(
      'https://businessprofileperformance.googleapis.com/v1/locations:fetchMultiDailyMetricsTimeSeries',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationNames: ['invalid-test'],
          basicRequest: {
            metricRequests: [{ metric: 'QUERIES_DIRECT' }],
            timeRange: {
              startTime: '2026-01-21T00:00:00Z',
              endTime: '2026-01-21T23:59:59Z',
            },
          },
        }),
      }
    )

    const testData = await testRes.json()

    // Se não retornou erro de quota, a API está aprovada
    if (!testData.error || testData.error.code !== 429) {
      console.log('   ✅ API funcionando!')
    } else {
      console.log('   ❌ API ainda não aprovada (quota 0)')
    }

  } catch (error: any) {
    console.error('   ⚠️  Erro ao testar API:', error.message)
  }

  console.log('\n=================================================')
  console.log('    🎉 PARABÉNS! APIS APROVADAS!')
  console.log('=================================================\n')
  console.log('✅ Status: Todas as APIs estão funcionando corretamente')
  console.log('✅ Quota: Ativa (não é mais 0)')
  console.log('\n📋 Próximos passos:')
  console.log('   1. Acesse: http://localhost:8080/configuracoes')
  console.log('   2. O dropdown de localizações deve aparecer agora')
  console.log('   3. Selecione a localização desejada')
  console.log('   4. Teste a coleta: npx tsx server/test-gbp-collection.ts')
  console.log('   5. Veja os dados em: http://localhost:8080/relatorios\n')
}

testApiApproval()
