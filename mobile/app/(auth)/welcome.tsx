import { View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { UserCheck, Building2, ChevronRight, MessageCircle, HelpCircle } from 'lucide-react-native';

const WHATSAPP_URL = 'https://wa.me/5521966921215?text=Ol%C3%A1!%20Estou%20no%20app%20do%20Ponto%20Fragata%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.';

export default function WelcomeScreen() {
  function handleOpenWhatsApp() {
    Linking.openURL(WHATSAPP_URL).catch(() => {});
  }

  return (
    <ScrollView contentContainerStyle={styles.container} bounces={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>
          Ponto Fragata<Text style={{ color: Colors.primary }}>.</Text>
        </Text>
        <Text style={styles.welcomeTitle}>Bem-vindo ao Ponto Fragata</Text>
        <Text style={styles.subtitle}>
          Selecione como deseja acessar a plataforma
        </Text>
      </View>

      {/* Cards de Segmentação */}
      <View style={styles.cardsContainer}>
        {/* Card Colaborador */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 212, 164, 0.12)' }]}>
            <UserCheck size={26} color={Colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Sou Colaborador</Text>
            <Text style={styles.cardDescription}>
              Registrar ponto diário, consultar comprovantes e histórico
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Card Empresa */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(auth)/login-company')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, { backgroundColor: 'rgba(55, 114, 207, 0.12)' }]}>
            <Building2 size={26} color="#4f8ff7" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Sou Empresa</Text>
            <Text style={styles.cardDescription}>
              Acessar painel do gestor ou criar conta grátis para sua empresa
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Rodapé: Suporte & FAQ */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.faqButton}
          onPress={() => router.push('/(auth)/faq')}
          activeOpacity={0.7}
        >
          <HelpCircle size={17} color={Colors.textMuted} />
          <Text style={styles.faqButtonText}>Dúvidas Frequentes (FAQ)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={handleOpenWhatsApp}
          activeOpacity={0.8}
        >
          <MessageCircle size={18} color="#25D366" />
          <Text style={styles.whatsappButtonText}>
            Dúvidas ou Suporte? <Text style={{ fontWeight: '700', color: '#25D366' }}>Fale no WhatsApp</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.canvas,
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  brandTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1.5,
    marginBottom: Spacing.xs,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  cardsContainer: {
    gap: Spacing.md,
    marginVertical: 'auto',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
  },
  faqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  faqButtonText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  whatsappButtonText: {
    fontSize: 13,
    color: Colors.text,
  },
});
