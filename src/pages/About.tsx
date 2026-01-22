export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 md:p-12">
        <div className="flex items-center justify-center mb-8">
          <img
            src="/logo_kpi_horizontal.png"
            alt="Dental KPI"
            className="h-20 w-auto"
          />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          Sobre a Plataforma
        </h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Nossa Missão</h2>
            <p className="leading-relaxed">
              A Dental KPI nasceu com o objetivo de transformar a gestão de clínicas através de
              dados e indicadores de performance. Acreditamos que decisões estratégicas devem ser
              baseadas em informações reais, não em intuições.
            </p>
            <p className="leading-relaxed mt-2">
              Nossa missão é fornecer aos gestores de clínicas uma visão completa e integrada de
              suas operações, permitindo identificar oportunidades, otimizar processos e aumentar
              a rentabilidade.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">O que Oferecemos</h2>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  📊 Painel de Indicadores
                </h3>
                <p className="text-sm leading-relaxed">
                  Visualize KPIs essenciais da sua clínica em tempo real, incluindo métricas
                  financeiras, operacionais e de marketing.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  💰 Gestão Financeira
                </h3>
                <p className="text-sm leading-relaxed">
                  Controle completo de receitas, despesas, metas e projeções financeiras da
                  sua clínica.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  🔗 Integrações Inteligentes
                </h3>
                <p className="text-sm leading-relaxed">
                  Conecte-se com Google Business Profile e outras plataformas para centralizar
                  todas as suas métricas em um só lugar.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  📈 Relatórios e Análises
                </h3>
                <p className="text-sm leading-relaxed">
                  Gere relatórios personalizados e obtenha insights valiosos sobre o desempenho
                  da sua clínica.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Segurança e Privacidade</h2>
            <p className="leading-relaxed">
              Levamos a segurança dos seus dados muito a sério. Toda a nossa infraestrutura é
              projetada seguindo as melhores práticas de segurança da informação:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Autenticação segura via OAuth 2.0 para integrações externas</li>
              <li>Conformidade com a LGPD (Lei Geral de Proteção de Dados)</li>
              <li>Backups automáticos e redundância de dados</li>
              <li>Controle granular de permissões de acesso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Transparência nas Integrações
            </h2>
            <p className="leading-relaxed">
              Nossa plataforma oferece integrações com serviços externos como Google Business Profile
              para enriquecer suas análises. É importante destacar que:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>
                <strong>Todas as integrações são opcionais</strong> - você decide quais serviços
                deseja conectar
              </li>
              <li>
                <strong>Acesso mediante autorização explícita</strong> - utilizamos OAuth 2.0,
                garantindo que você tem total controle
              </li>
              <li>
                <strong>Revogação a qualquer momento</strong> - você pode desconectar qualquer
                integração quando desejar
              </li>
              <li>
                <strong>Uso exclusivo para análise</strong> - os dados são utilizados apenas para
                gerar insights e relatórios para você
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Desenvolvimento Contínuo</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="leading-relaxed">
                A plataforma está em constante evolução. Trabalhamos continuamente para adicionar
                novas funcionalidades, melhorar a experiência do usuário e atender às necessidades
                específicas dos gestores de clínicas.
              </p>
              <p className="leading-relaxed mt-2">
                Seu feedback é fundamental para nosso crescimento. Entre em contato conosco para
                sugestões, dúvidas ou reportar problemas.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Nossa Equipe</h2>
            <p className="leading-relaxed">
              Somos uma equipe de desenvolvedores, analistas de dados e especialistas em gestão
              de clínicas, unidos pela paixão de criar soluções que realmente fazem a diferença
              no dia a dia dos profissionais da saúde.
            </p>
          </section>

          <section className="border-t pt-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Entre em Contato</h2>
            <p className="leading-relaxed">
              Tem dúvidas, sugestões ou precisa de suporte? Estamos aqui para ajudar.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-gray-600">
                <strong>Suporte:</strong> suporte@kpi-clinics.com
              </p>
              <p className="text-gray-600">
                <strong>Comercial:</strong> contato@kpi-clinics.com
              </p>
              <p className="text-gray-600">
                <strong>Privacidade:</strong> privacidade@kpi-clinics.com
              </p>
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <a
            href="/privacy"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Política de Privacidade
          </a>
          <span className="text-gray-400">•</span>
          <a
            href="/terms"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Termos de Serviço
          </a>
          <span className="text-gray-400">•</span>
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Voltar para a plataforma
          </a>
        </div>
      </div>
    </div>
  )
}
