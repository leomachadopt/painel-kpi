export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Política de Privacidade</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Coleta de Dados</h2>
            <p className="leading-relaxed">
              Coletamos dados fornecidos por você durante o uso da plataforma, incluindo informações de
              cadastro, dados operacionais de clínicas, informações de pacientes (quando aplicável) e
              métricas de desempenho.
            </p>
            <p className="leading-relaxed mt-2">
              Os dados coletados são utilizados exclusivamente para fornecer os serviços contratados,
              gerar relatórios, análises e permitir a gestão eficiente das operações da sua clínica.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Uso da API do Google</h2>
            <p className="leading-relaxed">
              Nossa plataforma utiliza a <strong>API do Google Business Profile</strong> para coletar
              métricas de performance do seu perfil no Google, incluindo:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Visualizações do perfil no Google Maps e Busca</li>
              <li>Cliques no site, ligações telefônicas e solicitações de rota</li>
              <li>Impressões e interações com o perfil</li>
            </ul>
            <p className="leading-relaxed mt-2">
              Ao conectar sua conta Google, você autoriza explicitamente a coleta desses dados através
              do processo de autenticação OAuth do Google.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. Proteção e Armazenamento</h2>
            <p className="leading-relaxed">
              Seus dados são armazenados de forma segura em servidores protegidos com criptografia.
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações
              contra acesso não autorizado, perda, destruição ou alteração.
            </p>
            <p className="leading-relaxed mt-2">
              Tokens de acesso às APIs são criptografados e renovados automaticamente para garantir
              segurança contínua.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Não Vendemos Seus Dados</h2>
            <p className="leading-relaxed">
              <strong>Garantimos que nunca vendemos, alugamos ou compartilhamos seus dados com terceiros
              para fins comerciais ou de marketing.</strong>
            </p>
            <p className="leading-relaxed mt-2">
              Seus dados são de sua propriedade e são utilizados exclusivamente para os fins acordados
              na prestação dos nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Compartilhamento de Dados</h2>
            <p className="leading-relaxed">
              Seus dados podem ser compartilhados apenas nas seguintes situações:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Com provedores de serviços essenciais (hospedagem, banco de dados) sob contrato de confidencialidade</li>
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Com sua autorização explícita</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Seus Direitos</h2>
            <p className="leading-relaxed">Você tem direito a:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li><strong>Acesso:</strong> Solicitar uma cópia dos dados que mantemos sobre você</li>
              <li><strong>Correção:</strong> Solicitar a correção de dados incorretos ou desatualizados</li>
              <li><strong>Exclusão:</strong> Solicitar a remoção completa dos seus dados</li>
              <li><strong>Portabilidade:</strong> Solicitar a transferência dos seus dados</li>
              <li><strong>Revogação:</strong> Revogar autorizações de acesso às APIs (Google, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Remoção de Dados</h2>
            <p className="leading-relaxed">
              Para solicitar a remoção completa dos seus dados, entre em contato conosco através do
              email de suporte. Processaremos sua solicitação em até 30 dias úteis.
            </p>
            <p className="leading-relaxed mt-2">
              Após a remoção, seus dados serão permanentemente apagados dos nossos sistemas, exceto
              quando somos obrigados por lei a mantê-los por um período específico.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Cookies e Tecnologias Similares</h2>
            <p className="leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, manter sua sessão
              ativa e analisar o uso da plataforma. Você pode configurar seu navegador para recusar cookies,
              mas isso pode afetar algumas funcionalidades.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Conformidade com a LGPD</h2>
            <p className="leading-relaxed">
              Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              Respeitamos todos os direitos dos titulares de dados conforme previsto na legislação brasileira.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Alterações nesta Política</h2>
            <p className="leading-relaxed">
              Podemos atualizar esta política periodicamente para refletir mudanças nos nossos serviços ou
              requisitos legais. Notificaremos você sobre alterações significativas através da plataforma ou email.
            </p>
          </section>

          <section className="border-t pt-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Contato</h2>
            <p className="leading-relaxed">
              Para dúvidas, solicitações ou preocupações relacionadas à privacidade, entre em contato:
            </p>
            <p className="mt-2 text-gray-600">
              <strong>Email:</strong> privacidade@kpi-clinics.com
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8 pt-6 border-t">
            <strong>Última atualização:</strong> Janeiro de 2026
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
