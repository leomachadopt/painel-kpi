import { useState } from 'react'
import { toast } from '@/hooks/use-toast'

export default function DataDeletion() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !email) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha nome e email.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      // Simular envio - em produção você pode enviar para um endpoint ou email
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: 'Solicitação enviada',
        description: 'Sua solicitação de exclusão de dados foi recebida. Entraremos em contato em até 30 dias.',
      })

      setName('')
      setEmail('')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar solicitação. Tente novamente ou entre em contato por email.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Exclusão de Dados do Usuário</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Seus Direitos</h2>
            <p className="leading-relaxed">
              De acordo com a Lei Geral de Proteção de Dados (LGPD) e as políticas do Facebook/Meta,
              você tem o direito de solicitar a exclusão completa dos seus dados da nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Dados Coletados pelo Dental KPI</h2>
            <p className="leading-relaxed mb-2">
              Nossa plataforma coleta e armazena os seguintes dados do Instagram Business e Facebook:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Métricas de posts (curtidas, comentários, compartilhamentos, alcance, impressões)</li>
              <li>Métricas de stories (impressões, alcance, interações, saídas, avanços)</li>
              <li>Dados de audiência do perfil Instagram Business (seguidores, idade, gênero, localização)</li>
              <li>ID do Instagram Business Account e Facebook Page conectados</li>
              <li>Tokens de acesso para comunicação com a API do Meta</li>
            </ul>
            <p className="leading-relaxed mt-3">
              <strong>Importante:</strong> Não armazenamos mensagens privadas, senhas ou informações
              pessoais de identificação além do email cadastrado na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Como Solicitar a Exclusão</h2>
            <p className="leading-relaxed mb-3">
              Você pode solicitar a exclusão dos seus dados de duas formas:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mb-3">
              <li>Preenchendo o formulário abaixo</li>
              <li>Enviando um email para: <strong>leomachadoptfb@gmail.com</strong></li>
            </ul>

            {/* Formulário de Solicitação */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Formulário de Solicitação</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors"
                >
                  {submitting ? 'Enviando...' : 'Solicitar Exclusão'}
                </button>
              </form>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Prazo para Exclusão</h2>
            <p className="leading-relaxed">
              Após recebermos sua solicitação, processaremos a exclusão completa dos seus dados em até
              <strong> 30 (trinta) dias úteis</strong>.
            </p>
            <p className="leading-relaxed mt-2">
              Você receberá uma confirmação por email quando a exclusão for concluída.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">O Que Acontece Após a Exclusão</h2>
            <p className="leading-relaxed mb-2">
              Quando processarmos sua solicitação:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Todos os dados de métricas associados ao seu Instagram Business e Facebook Page serão permanentemente removidos</li>
              <li>Os tokens de acesso à API do Meta serão revogados e deletados</li>
              <li>Informações de cadastro e configurações da clínica relacionadas ao marketing serão apagadas</li>
              <li>A integração com Instagram/Facebook será desconectada</li>
            </ul>
            <p className="leading-relaxed mt-3">
              <strong>Nota:</strong> Algumas informações podem ser mantidas se houver obrigação legal
              de retenção por período específico.
            </p>
          </section>

          <section className="border-t pt-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Contato</h2>
            <p className="leading-relaxed">
              Para dúvidas ou questões relacionadas à exclusão de dados, entre em contato:
            </p>
            <p className="mt-2 text-gray-600">
              <strong>Email:</strong> leomachadoptfb@gmail.com
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8 pt-6 border-t">
            <strong>Última atualização:</strong> Abril de 2026
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            ← Voltar para a plataforma
          </a>
        </div>
      </div>
    </div>
  )
}
