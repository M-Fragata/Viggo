import { useNavigate } from "react-router";

const VERSAO = "1.0";
const DATA_VIGENCIA = "23 de julho de 2026";
const EMAIL_DPO = "dpo@viggo.com.br";

export function PoliticaPrivacidade() {
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
            Política de Privacidade
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Versão {VERSAO} &mdash; Vigência: {DATA_VIGENCIA}
          </p>
        </header>

        <article className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed space-y-6">
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">1. Controlador dos Dados</h2>
            <p>
              A empresa que utiliza o Viggo (empregadora) é a <strong>Controladora</strong> dos
              dados pessoais de seus funcionários. O Viggo atua como <strong>Operador</strong>,
              processando dados em nome da Controladora, conforme Art. 39 da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">2. Dados Coletados</h2>
            <p>O Viggo coleta e trata os seguintes dados pessoais:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados cadastrais:</strong> nome, e-mail, CPF, CNPJ da empresa;</li>
              <li><strong>Dados biométricos:</strong> vetor matemático facial (128 floats) — nenhuma imagem é armazenada;</li>
              <li><strong>Geolocalização:</strong> latitude e longitude no exato momento da marcação de ponto;</li>
              <li><strong>Registros de jornada:</strong> entrada, saída, intervalos, com data/hora e NSR;</li>
              <li><strong>Métricas anônimas da landing (painel master):</strong> visualizações de página (<code>/page</code>), cliques em CTAs e views de cadastro — identificadas apenas por <code>visitorId</code> anônimo (cookie <code>vid</code> first-party, <code>SameSite=Lax</code>, 1 ano, ou hash <code>sha256(ip + salt + user-agent)</code> sem armazenamento de IP cru), <code>utm_source/medium/campaign</code> e <code>referrer</code>. Não há fingerprint cross-site. Após a criação da empresa, o evento <code>signup_success</code> linka <code>visitorId → companyId</code> apenas para cálculo de tempo até conversão.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">3. Finalidade do Tratamento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Registro de ponto eletrônico (obrigação legal — CLT Art. 74);</li>
              <li>Validação de identidade do trabalhador no ato da marcação;</li>
              <li>Geração de AFD e comprovantes conforme Portaria MTE 671/2021;</li>
              <li>Cumprimento de obrigações trabalhistas e previdenciárias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">4. Base Legal</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Consentimento específico e destacado</strong> (Art. 11, I da LGPD) — cadastro do vetor facial (dado sensível) e autenticação a cada marcação;</li>
              <li><strong>Prevenção à fraude e garantia da segurança</strong> (Art. 11, II, "g" da LGPD) — verificação de identidade no ato do ponto para impedir marcação por terceiro (LIA documentada no RIPD);</li>
              <li><strong>Obrigação legal</strong> (Art. 11, II, "a" da LGPD) — cumprimento de obrigação trabalhista (CLT Art. 74, registro de jornada);</li>
              <li><strong>Execução de contrato</strong> (Art. 7º, V da LGPD) — relação de trabalho.</li>
            </ul>
            <p className="text-sm text-slate-500 mt-2">
              O tratamento do vetor facial para <em>validação diária</em> apoia-se no consentimento (Art. 11, I) cumulado com legítimo interesse de prevenção à fraude (Art. 11, II, "g"), conforme Relatório de Impacto (RIPD) — nunca em tutela da saúde (Art. 11, II, "f"), inaplicável ao ponto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">5. Compartilhamento de Dados</h2>
            <p>
              Os dados são compartilhados apenas com: (a) a empresa empregadora (Controladora);
              (b) órgãos públicos quando exigido por lei (eSocial, MTE); (c) provedores de
              infraestrutura (hosting) sob contrato de operador (Art. 39 da LGPD). Não há
              compartilhamento com terceiros para fins comerciais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">6. Armazenamento e Segurança</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dados armazenados em servidor PostgreSQL com criptografia em trânsito (TLS);</li>
              <li>Vetor biométrico armazenado como JSON, irreversível para imagem;</li>
              <li>Acesso restrito por multi-tenancy (isolamento por empresa);</li>
              <li>Registros de auditoria (AuditLog) para todas as operações sensíveis;</li>
              <li>Rate limiting para prevenção de abuso (incluindo <code>/metrics/track</code> 60/min por IP, bypass em TEST);</li>
              <li>Métricas anônimas: cookie <code>vid</code> first-party, sem IP cru persistido; hash com <code>salt</code> derivado de chave de criptografia e <code>user-agent</code>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">7. Retenção de Dados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Registros de ponto:</strong> 5 anos (CLT Art. 74, §4º);</li>
              <li><strong>Descriptor facial:</strong> enquanto vínculo empregatício ativo + 30 dias após desligamento;</li>
              <li><strong>Logs de auditoria:</strong> 5 anos;</li>
              <li><strong>Dados cadastrais:</strong> enquanto conta estiver ativa;</li>
              <li><strong>Métricas anônimas da landing (PageView / AnalyticsEvent):</strong> 90 dias — limpeza diária automática às 02:00 via <code>runRetentionCleanup</code> (cron <code>0 2 * * *</code>), sem dados pessoais identificáveis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">8. Direitos do Titular (Art. 18 LGPD)</h2>
            <p>O funcionário titular dos dados pode:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento;</li>
              <li>Acessar seus dados pessoais;</li>
              <li>Corrigir dados incompletos ou desatualizados;</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Solicitar a portabilidade dos dados;</li>
              <li>Revogar o consentimento para tratamento de dados biométricos;</li>
              <li>Solicitar a eliminação dos dados tratados com base no consentimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">9. Dados Sensíveis (Biometria Facial)</h2>
            <p>
              A biometria facial é classificada como <strong>dado pessoal sensível</strong> pela
              LGPD (Art. 5º, II). O tratamento ocorre com <strong>consentimento específico e
              destacado</strong> do titular (Art. 11, I) cumulado com <strong>prevenção à fraude e garantia da segurança</strong> (Art. 11, II, "g" — LIA no RIPD). O vetor matemático (128 floats) é
              irreversível — não é possível reconstruir a imagem facial a partir dele. A base de <em>tutela da saúde</em> (Art. 11, II, "f") não se aplica ao registro de ponto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">10. Incidentes de Segurança</h2>
            <p>
              Em caso de incidente de segurança que possa acarretar risco aos titulares, o Viggo
              notificará a Controladora em até 24h. A Controladora é responsável por comunicar
              a ANPD em até 72h (Art. 48 da LGPD) e os titulares afetados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">11. Encarregado de Dados (DPO)</h2>
            <p>
              O encarregado de proteção de dados (DPO) pode ser contactado em:
            </p>
            <p className="font-medium text-slate-800">
              E-mail: {EMAIL_DPO}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">12. Alterações nesta Política</h2>
            <p>
              Esta Política pode ser atualizada a qualquer momento. Alterações relevantes serão
              comunicadas aos usuários com antecedência mínima de 30 dias. O uso continuado
              do sistema após as alterações constitui aceitação.
            </p>
          </section>
        </article>

        <footer className="mt-8 pt-6 border-t border-slate-200 text-center space-y-3">
          <p className="text-sm text-slate-500">
            Encarregado de Proteção de Dados (DPO):{" "}
            <a href={`mailto:${EMAIL_DPO}`} className="text-emerald-600 hover:text-emerald-700 font-medium">
              {EMAIL_DPO}
            </a>
          </p>
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

export default PoliticaPrivacidade;
