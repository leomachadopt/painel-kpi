#!/usr/bin/env tsx
/**
 * Script para testar configuração OAuth do Google e Meta
 *
 * Uso: npx tsx server/test-oauth-config.ts
 */

import 'dotenv/config'

interface OAuthConfig {
  provider: string
  configured: boolean
  details: {
    clientId: { value: string | undefined; status: string }
    clientSecret: { value: string | undefined; status: string }
    redirectUri: { value: string | undefined; status: string }
  }
}

function maskSecret(value: string | undefined): string {
  if (!value) return '❌ Não configurado'
  if (value.length <= 8) return '***'
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function checkOAuthConfig(
  provider: string,
  clientIdKey: string,
  clientSecretKey: string,
  redirectUriKey: string
): OAuthConfig {
  const clientId = process.env[clientIdKey]
  const clientSecret = process.env[clientSecretKey]
  const redirectUri = process.env[redirectUriKey]

  const allConfigured = !!(clientId && clientSecret && redirectUri)

  return {
    provider,
    configured: allConfigured,
    details: {
      clientId: {
        value: clientId,
        status: clientId ? `✅ ${maskSecret(clientId)}` : '❌ Não configurado',
      },
      clientSecret: {
        value: clientSecret,
        status: clientSecret ? `✅ ${maskSecret(clientSecret)}` : '❌ Não configurado',
      },
      redirectUri: {
        value: redirectUri,
        status: redirectUri ? `✅ ${redirectUri}` : '❌ Não configurado',
      },
    },
  }
}

console.log('\n=================================================')
console.log('    TESTE DE CONFIGURAÇÃO OAUTH')
console.log('=================================================\n')

// Google OAuth
const googleConfig = checkOAuthConfig(
  'Google (Google My Business)',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI'
)

console.log(`📊 ${googleConfig.provider}`)
console.log(`   Status: ${googleConfig.configured ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`)
console.log(`   Client ID: ${googleConfig.details.clientId.status}`)
console.log(`   Client Secret: ${googleConfig.details.clientSecret.status}`)
console.log(`   Redirect URI: ${googleConfig.details.redirectUri.status}`)
console.log('')

// Meta OAuth
const metaConfig = checkOAuthConfig('Meta (Facebook/Instagram)', 'META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI')

console.log(`📱 ${metaConfig.provider}`)
console.log(`   Status: ${metaConfig.configured ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`)
console.log(`   App ID: ${metaConfig.details.clientId.status}`)
console.log(`   App Secret: ${metaConfig.details.clientSecret.status}`)
console.log(`   Redirect URI: ${metaConfig.details.redirectUri.status}`)
console.log('')

// Configurações opcionais
console.log('⚙️  Configurações Opcionais')
console.log(`   META_API_VERSION: ${process.env.META_API_VERSION || 'v21.0 (padrão)'}`)
console.log(`   META_SCOPES: ${process.env.META_SCOPES || 'padrão'}`)
console.log('')

// Resumo
console.log('=================================================')
console.log('    RESUMO')
console.log('=================================================')
console.log(`Google OAuth: ${googleConfig.configured ? '✅ PRONTO' : '❌ INCOMPLETO'}`)
console.log(`Meta OAuth: ${metaConfig.configured ? '✅ PRONTO' : '❌ INCOMPLETO'}`)
console.log('')

if (googleConfig.configured && metaConfig.configured) {
  console.log('🎉 Todas as integrações estão configuradas!')
} else if (googleConfig.configured || metaConfig.configured) {
  console.log('⚠️  Algumas integrações estão pendentes.')
} else {
  console.log('❌ Nenhuma integração foi configurada ainda.')
}

console.log('')
console.log('💡 Para testar a integração:')
console.log('   1. Inicie o servidor: npm run dev')
console.log('   2. Acesse: http://localhost:8080/configuracoes')
console.log('   3. Clique em "Conectar com Google" ou "Conectar com Meta"')
console.log('')
