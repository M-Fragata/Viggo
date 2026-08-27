import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { ArrowLeft, ChevronDown, ChevronUp, MessageCircle, HelpCircle } from 'lucide-react-native';

const WHATSAPP_URL = 'https://wa.me/5521966921215?text=Ol%C3%A1!%20Estava%20lendo%20as%20d%C3%BAvidas%20no%20app%20do%20Viggo%20e%20gostaria%20de%20falar%20com%20um%20especialista.';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: 1,
    question: 'Como funciona o período de teste gratuito de 30 dias?',
    answer:
      'Você pode criar a conta da sua empresa agora mesmo, sem cadastrar cartão de crédito. Durante 30 dias, você e sua equipe têm acesso liberado a todas as ferramentas de IA, relatórios e aplicativo móvel para comprovar a eficiência na prática.',
  },
  {
    id: 2,
    question: 'O Viggo é homologado pelo Ministério do Trabalho (Portaria 671)?',
    answer:
      'Sim! O Viggo é um sistema REP-P (Registrador Eletrônico de Ponto em Programa) totalmente alinhado às exigências da Portaria 671/2021 do MTE. Ele gera comprovantes fiscais com assinatura digital inviolável, emite arquivos AFD/AFDT e protege sua empresa contra qualquer passivo trabalhista formal.',
  },
  {
    id: 3,
    question: 'E se o colaborador estiver sem sinal de internet no momento do ponto?',
    answer:
      'O aplicativo possui sincronização inteligente e modo offline. O ponto é coletado com segurança, registrando o horário criptografado do dispositivo e as coordenadas GPS. Assim que o aparelho recuperar a conexão, os dados são enviados e auditados automaticamente.',
  },
  {
    id: 4,
    question: 'A biometria facial dos colaboradores está segura perante a LGPD?',
    answer:
      'Sim, total conformidade com a LGPD. As imagens dos funcionários passam por um algoritmo que gera descritores vetoriais matemáticos criptografados de mão única, impedindo qualquer vazamento ou uso indevido de fotos dos seus colaboradores.',
  },
  {
    id: 5,
    question: 'Preciso comprar aparelhos de ponto caros ou pagar manutenção?',
    answer:
      'Não! Você elimina custos com manutenção de relógios físicos caros e bobinas térmicas. O Viggo funciona em qualquer smartphone (Android e iOS) ou em um tablet/computador fixado na recepção em "Modo Totem" com reconhecimento facial contínuo.',
  },
  {
    id: 6,
    question: 'Posso migrar os dados e banco de horas do meu sistema antigo?',
    answer:
      'Sim, com total facilidade! Você pode importar colaboradores em lote ou nos acionar no WhatsApp para fazermos a migração assistida sem nenhum custo adicional. Também é possível lançar os saldos vigentes de banco de horas para continuar a gestão sem perder histórico.',
  },
  {
    id: 7,
    question: 'Como funciona a integração com a folha de pagamento?',
    answer:
      'Ao final do mês, você pode exportar relatórios prontos em 1 clique no formato padrão exigido pelos principais softwares de folha de pagamento (Domínio, TOTVS, Alterdata, Senior, Fortes, Questor, etc.), reduzindo o tempo do seu RH em até 80%.',
  },
  {
    id: 8,
    question: 'Existe carência, fidelidade ou multa de cancelamento?',
    answer:
      'Não há nenhuma fidelidade ou multa. Você tem total liberdade para usar o plano mensal e cancelar a qualquer momento sem taxas surpresas.',
  },
];

export default function FAQScreen() {
  const [openId, setOpenId] = useState<number | null>(1);

  function toggleFAQ(id: number) {
    setOpenId(openId === id ? null : id);
  }

  function handleOpenWhatsApp() {
    Linking.openURL(WHATSAPP_URL).catch(() => {});
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Top Nav */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.badge}>
            <HelpCircle size={14} color={Colors.primary} />
            <Text style={styles.badgeText}>Central de Ajuda</Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dúvidas Frequentes</Text>
          <Text style={styles.subtitle}>
            Tudo o que você precisa saber sobre o funcionamento e segurança do Viggo
          </Text>
        </View>

        {/* FAQ Accordion List */}
        <View style={styles.faqList}>
          {FAQS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.faqCard, isOpen && styles.faqCardOpen]}
                onPress={() => toggleFAQ(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQuestion, isOpen && { color: Colors.primary }]}>
                    {item.question}
                  </Text>
                  {isOpen ? (
                    <ChevronUp size={20} color={Colors.primary} />
                  ) : (
                    <ChevronDown size={20} color={Colors.textMuted} />
                  )}
                </View>

                {isOpen && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating / Fixed WhatsApp Button */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={handleOpenWhatsApp}
          activeOpacity={0.85}
        >
          <MessageCircle size={20} color="#ffffff" />
          <Text style={styles.whatsappButtonText}>Ainda com dúvidas? Falar no WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  container: {
    flexGrow: 1,
    padding: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 100,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 212, 164, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 164, 0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  faqList: {
    gap: Spacing.sm,
  },
  faqCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  faqCardOpen: {
    borderColor: 'rgba(0, 212, 164, 0.3)',
    backgroundColor: Colors.surface,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    lineHeight: 21,
  },
  faqBody: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 21,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.lg,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  whatsappButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
