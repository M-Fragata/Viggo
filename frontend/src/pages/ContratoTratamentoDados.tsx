import { useNavigate } from "react-router";

const VERSAO = "1.0";
const DATA_VIGENCIA = "23 de julho de 2026";

export function ContratoTratamentoDados() {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-black py-12 px-4 transition-colors duration-200">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#121214] border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg dark:shadow-2xl p-8 md:p-12">
        <header className="mb-8 border-b border-slate-200 dark:border-white/10 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-brand-green hover:text-brand-green-deep text-sm font-semibold mb-4 inline-block cursor-pointer"
          >
            &larr; Voltar
          </button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Contrato de Tratamento de Dados Pessoais
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Data Processing Agreement (DPA) &mdash; Versão {VERSAO} &mdash; Vigência: {DATA_VIGENCIA}
          </p>
        </header>

        <article className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed space-y-6">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Partes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Controladora</p>
                <p className="text-sm text-slate-900 dark:text-slate-200 font-medium">Empresa contratante do Ponto Fragata</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Dados preenchidos no cadastro</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Operadora</p>
                <p className="text-sm text-slate-900 dark:text-slate-200 font-medium">Ponto Fragata Tecnologia em Ponto Eletrônico Ltda.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">DPO: dpo@fragata.me</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">2. Finalidade do Tratamento</h2>
            <p>
              O Operador realizará o tratamento de dados pessoais exclusivamente para:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Registro de jornada de trabalho (ponto eletrônico) conforme CLT Art. 74 e Portaria MTE nº 671/2021;</li>
              <li>Autenticação biométrica dos trabalhadores para validação de identidade;</li>
              <li>Geração de relatórios obrigatórios (AFD, Relatório Mensal MTE);</li>
              <li>Cumprimento de obrigações legais relacionadas ao controle de ponto eletrônico.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">3. Categorias de Dados</h2>
            <div className="overflow-x-auto not-prose">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Tipos de Dados</th>
                    <th className="p-3">Finalidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-semibold">Identificação</td>
                    <td className="p-3">Nome, e-mail, CPF, cargo</td>
                    <td className="p-3">Identificação do trabalhador</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Empresariais</td>
                    <td className="p-3">Razão social, CNPJ</td>
                    <td className="p-3">Identificação do empregador</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Biométricos</td>
                    <td className="p-3">Vetor matemático facial (128 dimensões)</td>
                    <td className="p-3">Autenticação de identidade</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Geolocalização</td>
                    <td className="p-3">Latitude, longitude</td>
                    <td className="p-3">Validação de localização</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Jornada</td>
                    <td className="p-3">Horários de entrada, saída, intervalos, NSR</td>
                    <td className="p-3">Registro de ponto</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">4. Base Legal</h2>
            <div className="overflow-x-auto not-prose">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-3">Base Legal</th>
                    <th className="p-3">Art. 7º LGPD</th>
                    <th className="p-3">Aplicação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-semibold">Consentimento</td>
                    <td className="p-3">Art. 7º, I</td>
                    <td className="p-3">Dados biométricos (cadastro facial)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Obrigação legal</td>
                    <td className="p-3">Art. 7º, II</td>
                    <td className="p-3">Registro de ponto (CLT Art. 74)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Execução de contrato</td>
                    <td className="p-3">Art. 7º, V</td>
                    <td className="p-3">Gestão da relação contratual</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Legítimo interesse</td>
                    <td className="p-3">Art. 7º, IX</td>
                    <td className="p-3">Logs de auditoria e segurança</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">5. Obrigações do Operador (Ponto Fragata)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Implementar medidas técnicas e organizacionais adequadas ao risco;</li>
              <li>Utilizar criptografia para proteção de dados em repouso e em trânsito;</li>
              <li>Manter registro de operações de tratamento (Art. 37 LGPD);</li>
              <li>Comunicar incidentes de segurança em até 72 horas à ANPD;</li>
              <li>Fornecer informações para atender requisições de titulares (Art. 18 LGPD);</li>
              <li>Não subcontractar tratamento sem autorização prévia do Controlador.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">6. Obrigações do Controlador (Empresa)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Obter consentimento válido dos titulares para tratamento de dados;</li>
              <li>Garantir que consentimentos sejam específicos e destacados para dados sensíveis;</li>
              <li>Utilizar dados exclusivamente para as finalidades informadas;</li>
              <li>Atender às solicitações dos titulares no exercício de seus direitos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">7. Retenção e Eliminação</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dados mantidos durante a vigência do contrato;</li>
              <li>Após término, eliminação em até 90 dias, salvo obrigação legal;</li>
              <li>Dados de ponto retidos por 5 anos conforme Decreto nº 9.524/2018;</li>
              <li>Comprovação de eliminação fornecida ao Controlador.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">8. Medidas Técnicas</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criptografia AES-256 para dados em repouso;</li>
              <li>TLS 1.3 para dados em trânsito;</li>
              <li>Controle de acesso baseado em função (RBAC);</li>
              <li>Logs de auditoria com imutabilidade garantida;</li>
              <li>Backup criptografado com retenção de 30 dias;</li>
              <li>Plano de resposta a incidentes de segurança.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">9. Vigência e Denúncia</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Contrato com vigência indeterminada, a partir da aceitação;</li>
              <li>Denúncia por qualquer das partes com notificação prévia de 30 dias;</li>
              <li>Denúncia não exclui obrigações de retenção e eliminação.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">10. Foro</h2>
            <p>
              Fica eleito o foro da Comarca de São Paulo/SP para dirimir questões oriundas
              deste Contrato, com renúncia a qualquer outro por mais privilegiado que seja.
            </p>
          </section>
        </article>

        <footer className="mt-8 pt-6 border-t border-slate-200 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
          >
            &larr; Voltar
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ContratoTratamentoDados;
