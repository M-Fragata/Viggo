import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { gsap } from "gsap";
import { AnimatedList } from "./AnimatedList";
import { TextSplitter } from "../utils/textSplitter";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "O Viggo é homologado pelo Ministério do Trabalho (Portaria 671)?",
    answer: "Sim! O Viggo é um sistema REP-P (Registrador Eletrônico de Ponto em Programa) totalmente alinhado às exigências da Portaria 671/2021 do MTE. Ele gera comprovantes fiscais com assinatura digital inviolável, emite arquivos AFD/AFDT e protege sua empresa contra qualquer passivo trabalhista formal."
  },
  {
    question: "Posso migrar os dados e o saldo de banco de horas do meu sistema antigo?",
    answer: "Sim, com total facilidade! Você pode importar colaboradores em lote por planilha ou nos acionar para fazermos a migração assistida sem nenhum custo adicional. Também é possível lançar os saldos vigentes de banco de horas para continuar a gestão sem perder histórico."
  },
  {
    question: "Preciso comprar aparelhos de ponto caros ou pagar manutenção mecânica?",
    answer: "Não! Você elimina custos com manutenção de relógios físicos caros e bobinas térmicas. O Viggo funciona em qualquer smartphone (Android e iOS) ou em um tablet/computador fixado na recepção em 'Modo Totem' com reconhecimento facial."
  },
  {
    question: "Que tipo de suporte e treinamento minha empresa recebe?",
    answer: "Você conta com suporte humanizado e ágil direto pelo WhatsApp e canais digitais. Auxiliamos sua equipe na configuração inicial de jornadas, dúvidas de fechamento e disponibilizamos material e orientações para os colaboradores."
  },
  {
    question: "E se o colaborador estiver sem sinal de internet no momento do registro?",
    answer: "O aplicativo possui sincronização inteligente e modo offline. O ponto é coletado com segurança, registrando o horário criptografado do dispositivo e as coordenadas GPS. Assim que o aparelho recuperar a conexão, os dados são enviados e auditados automaticamente."
  },
  {
    question: "Como funciona a integração com a contabilidade e fechamento de folha?",
    answer: "Ao final do mês, você pode exportar relatórios prontos em 1 clique no formato padrão exigido pelos principais softwares de folha de pagamento (Domínio, TOTVS, Alterdata, Senior, Fortes, Questor, etc.), reduzindo o tempo do seu RH em até 80%."
  },
  {
    question: "A biometria facial dos funcionários está segura perante a LGPD?",
    answer: "Sim, total conformidade com a LGPD. As imagens dos funcionários passam por um algoritmo que gera descritores vetoriais matemáticos criptografados de mão única, impedindo qualquer vazamento ou uso indevido de fotos dos seus colaboradores."
  },
  {
    question: "Existe carência, fidelidade ou multa de cancelamento?",
    answer: "Não há nenhuma fidelidade ou multa. Você tem total liberdade para usar o plano mensal e cancelar a qualquer momento sem taxas surpresas diretamente no painel de controle."
  },
  {
    question: "Como funciona o período de teste gratuito de 30 dias?",
    answer: "Você pode criar a conta da sua empresa agora mesmo, sem cadastrar cartão de crédito. Durante 30 dias, você e sua equipe têm acesso ilimitado a todas as ferramentas de IA, relatórios e aplicativo móvel para comprovar a eficiência na prática."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });

            if (badgeRef.current) {
              tl.fromTo(
                badgeRef.current,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, clearProps: "transform" }
              );
            }

            if (titleRef.current) {
              tl.fromTo(
                titleRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 }
              );

              const titleSplitter = new TextSplitter(titleRef.current, {
                type: "chars",
                charsClass: "char"
              });
              const titleChars = titleSplitter.getElements();

              tl.fromTo(
                titleChars,
                { opacity: 0, y: 20, rotateX: -30 },
                {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  stagger: 0.015,
                  duration: 0.5,
                  clearProps: "transform"
                },
                "-=0.2"
              );
            }

            if (paragraphRef.current) {
              tl.fromTo(
                paragraphRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.01 }
              );

              const paraSplitter = new TextSplitter(paragraphRef.current, {
                type: "words",
                wordsClass: "word"
              });
              const paraWords = paraSplitter.getElements();

              tl.fromTo(
                paraWords,
                { opacity: 0, y: 15 },
                {
                  opacity: 1,
                  y: 0,
                  stagger: 0.02,
                  duration: 0.4,
                  clearProps: "transform"
                },
                "-=0.2"
              );
            }

            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section ref={sectionRef} className="py-20 lg:py-28 bg-slate-50 dark:bg-canvas-dark relative border-t border-slate-200 dark:border-white/5 transition-colors duration-200" id="faq">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <span 
            ref={badgeRef}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-on-dark-muted mb-4 opacity-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-brand-green" />
            Tire suas dúvidas
          </span>
          <h2 
            ref={titleRef}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-on-dark leading-tight opacity-0"
          >
            Perguntas Frequentes de Empresários e RH
          </h2>
          <p 
            ref={paragraphRef}
            className="mt-4 text-base sm:text-lg text-slate-600 dark:text-on-dark-muted opacity-0"
          >
            Tudo o que você precisa saber sobre a segurança jurídica e operacional do Viggo.
          </p>
        </div>

        <AnimatedList<FAQItem>
          items={FAQS}
          displayScrollbar={false}
          showGradients={false}
          enableArrowNavigation={true}
          onItemSelect={(_, index) => toggle(index)}
          renderItem={(faq, index, isHoveredOrActive) => {
            const isOpen = openIndex === index;
            return (
              <div
                className={`rounded-2xl transition-all duration-200 border ${
                  isOpen
                    ? "bg-white dark:bg-white/[0.05] border-brand-green/50 shadow-md shadow-brand-green/5"
                    : isHoveredOrActive
                    ? "bg-white dark:bg-white/[0.03] border-slate-300 dark:border-white/20"
                    : "bg-white/80 dark:bg-white/[0.015] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div
                  className="w-full py-5 px-6 flex items-center justify-between text-left focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-on-dark pr-4">
                    {faq.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-on-dark transition-transform duration-300 shrink-0 ${
                      isOpen ? "rotate-180 bg-brand-green text-black dark:text-black" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-slate-600 dark:text-on-dark-muted leading-relaxed border-t border-slate-100 dark:border-white/5">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }}
        />
      </div>
    </section>
  );
}

export default FAQ;
