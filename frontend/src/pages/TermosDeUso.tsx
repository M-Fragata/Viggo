import { useNavigate } from "react-router";

const VERSAO = "1.0";
const DATA_VIGENCIA = "23 de julho de 2026";

export function TermosDeUso() {
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
            Termos de Uso
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Versão {VERSAO} &mdash; Vigência: {DATA_VIGENCIA}
          </p>
        </header>

        <article className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed space-y-6">
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">1. Objeto</h2>
            <p>
              Estes Termos de Uso regulam o acesso e utilização do software <strong>Ponto Fragata</strong>,
              plataforma SaaS de registro de ponto eletrônico com reconhecimento facial, desenvolvido
              pela empresa desenvolvedora (doravante "Ponto Fragata").
            </p>
            <p>
              O Ponto Fragata é classificado como <strong>REP-P</strong> (Registrador Eletrônico de Ponto
              por Programa) conforme Portaria MTE nº 671/2021.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">2. Aceitação dos Termos</h2>
            <p>
              Ao cadastrar uma empresa ou utilizar o Ponto Fragata, o Usuário declara que leu, compreendeu
              e aceita integralmente estes Termos de Uso. O uso continuado do sistema após a
              publicação de alterações constitui aceitação das mudanças.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">3. Descrição do Serviço</h2>
            <p>O Ponto Fragata disponibiliza:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Registro de ponto eletrônico via reconhecimento facial;</li>
              <li>Geolocalização pontual no momento da marcação;</li>
              <li>Geração de AFD (Arquivo Fonte de Dados) conforme Anexo II da Portaria 671/2021;</li>
              <li>Geração de comprovante de marcação conforme Anexo III;</li>
              <li>Painel administrativo para gestão de funcionários e jornada;</li>
              <li>Relatórios periódicos de ponto.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">4. Obrigações do Usuário</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fornecer dados cadastrais verdadeiros e atualizados;</li>
              <li>Manter a confidencialidade de sua senha e credenciais;</li>
              <li>Utilizar o sistema em conformidade com a legislação trabalhista e a LGPD;</li>
              <li>Não tentar contornar medidas de segurança ou acesso não autorizado;</li>
              <li>Responsabilizar-se pelo uso dos convites gerados para seus funcionários.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">5. Propriedade Intelectual</h2>
            <p>
              Todo o código-fonte, design, marca e documentação do Ponto Fragata são de propriedade
              exclusiva do desenvolvedor. É vedada a reprodução, distribuição ou engenharia
              reversa sem autorização expressa por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">6. Disponibilidade e Suporte</h2>
            <p>
              O Ponto Fragata é fornecido "como está" (AS IS). O desenvolvedor empenha-se em manter
              disponibilidade de 99,5% mensal, mas não garante interrupções ininterrompidas.
              Manutenções programadas serão comunicadas com antecedência mínima de 48h.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">7. Limitação de Responsabilidade</h2>
            <p>
              O Ponto Fragata é ferramenta auxiliar ao controle de ponto. A responsabilidade pela
              conformidade trabalhista e envio ao eSocial é exclusiva da empresa empregadora.
              O desenvolvedor não se responsabiliza por multas decorrentes de uso inadequado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">8. Rescisão</h2>
            <p>
              O usuário pode solicitar a exclusão de sua conta a qualquer momento. O
              desenvolvedor reserva-se o direito de suspender contas que violem estes termos,
              mediante notificação prévia de 15 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">9. Foro</h2>
            <p>
              Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer questões
              oriundas destes Termos, com renúncia a qualquer outro por mais privilegiado que seja.
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

export default TermosDeUso;
