import { useNavigate } from "react-router";

const VERSAO = "1.0";
const DATA_VIGENCIA = "23 de julho de 2026";

export function ConsentimentoBiometria() {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mb-4 inline-block cursor-pointer"
          >
            &larr; Voltar
          </button>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Consentimento para Tratamento de Dados Biométricos
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Versão {VERSAO} &mdash; Vigência: {DATA_VIGENCIA}
          </p>
        </header>

        <article className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-6">
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">1. Dados Coletados</h2>
            <p>
              O sistema <strong>Viggo</strong> coleta e armazena exclusivamente o{" "}
              <strong>vetor matemático facial</strong> (descriptor de 128 dimensões numéricas),
              que é gerado a partir da imagem capturada pela câmera do dispositivo no momento
              do cadastro biométrico.
            </p>
            <p>
              <strong>Não é armazenada nenhuma imagem facial.</strong> O vetor matemático é
              irreversível, ou seja, não permite a reconstrução da imagem original do rosto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">2. Finalidade</h2>
            <p>
              O dado biométrico é utilizado <strong>exclusivamente</strong> para:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Validação de identidade do trabalhador no momento da marcação de ponto eletrônico;</li>
              <li>Prevenção contra fraudes (ponto britânico, marcação por terceiros);</li>
              <li>Garantia de autenticidade da marcação conforme Art. 78 da Portaria MTE nº 671/2021.</li>
            </ul>
            <p>
              O dado biométrico <strong>não será utilizado</strong> para qualquer outra finalidade,
              nem compartilhado com terceiros, salvo obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">3. Base Legal</h2>
            <p>
              O tratamento de dados biométricos é realizado com fundamento em:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Consentimento específico e destacado</strong> (Art. 11, I da LGPD) —
                obtido mediante assinatura deste documento;
              </li>
              <li>
                <strong>Tutela da saúde</strong> (Art. 11, II, f da LGPD) — prevenção à fraude
                e garantia de autenticidade nas marcações de ponto.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">4. Segurança dos Dados</h2>
            <p>
              O vetor matemático facial é protegido por meio de:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criptografia <strong>AES-256-GCM</strong> com nonce aleatório em repouso;</li>
              <li>Transmissão exclusivamente via <strong>HTTPS/TLS 1.3</strong>;</li>
              <li>Token descartável com tempo de expiração de 30 segundos para validação;</li>
              <li>Acesso restrito a servidores autenticados via JWT;</li>
              <li>Logs de auditoria com rastreabilidade completa.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">5. Retenção e Eliminação</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                O dado biométrico é mantido durante toda a vigência do vínculo empregatício;
              </li>
              <li>
                Usuários inativos há mais de 30 dias têm o vetor facial eliminado automaticamente;
              </li>
              <li>
                Revalidação biométrica periódica a cada <strong>24 meses</strong> para
                manter a precisão e conformidade;
              </li>
              <li>
                O titular pode solicitar a exclusão do dado biométrico a qualquer momento
                pelo Portal LGPD ("Meus Dados").
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">6. Direitos do Titular</h2>
            <p>Conforme Art. 18 da LGPD, o titular tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento de dados biométricos;</li>
              <li>Acessar os dados biométricos tratados;</li>
              <li>Solicitar a correção de dados incompletos ou desatualizados;</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Revogar o consentimento a qualquer momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">7. Transferência a Terceiros</h2>
            <p>
              Os dados biométricos <strong>não são transferidos</strong> a terceiros. O único
              tratamento realizado é a comparação vetorial no servidor do Viggo para validação
              de identidade no momento da marcação de ponto.
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

export default ConsentimentoBiometria;
