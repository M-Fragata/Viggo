import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { router } from 'expo-router';
import { ArrowLeft, Lock, Mail, Info, MessageCircle, HelpCircle } from 'lucide-react-native';

const WHATSAPP_URL = 'https://wa.me/5521966921215?text=Ol%C3%A1!%20Sou%20colaborador%20e%20preciso%20de%20ajuda%20para%20acessar%20minha%20conta%20no%20Ponto%20Fragata.';

export default function EmployeeLoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      Alert.alert('Campos Obrigatórios', 'Por favor, informe seu e-mail/CPF e sua senha.');
      return;
    }

    try {
      setLoading(true);
      await login(identifier.trim(), password);
    } catch (err: any) {
      Alert.alert(
        'Falha no Acesso',
        err.message || 'Credenciais inválidas. Verifique os dados digitados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenWhatsApp() {
    Linking.openURL(WHATSAPP_URL).catch(() => {});
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top Navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.faqLink}
            onPress={() => router.push('/(auth)/faq')}
            activeOpacity={0.7}
          >
            <HelpCircle size={18} color={Colors.textMuted} />
            <Text style={styles.faqLinkText}>Ajuda</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Acesso do Colaborador</Text>
          <Text style={styles.subtitle}>
            Informe suas credenciais para acessar o registro de ponto
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail ou CPF</Text>
            <View style={styles.inputContainer}>
              <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="nome@empresa.com ou CPF"
                placeholderTextColor={Colors.textMuted}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Sua senha de acesso"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textDark} />
            ) : (
              <Text style={styles.loginButtonText}>Entrar no Ponto Fragata</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Card Informativo de Primeiro Acesso */}
        <View style={styles.infoCard}>
          <Info size={20} color={Colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Primeiro acesso?</Text>
            <Text style={styles.infoText}>
              Solicite o link de criação de conta para sua empresa ou sua conta com senha provisória.
            </Text>
          </View>
        </View>

        {/* Suporte no Rodapé */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleOpenWhatsApp}
            activeOpacity={0.8}
          >
            <MessageCircle size={16} color="#25D366" />
            <Text style={styles.whatsappButtonText}>
              Precisa de ajuda com seu acesso? <Text style={{ fontWeight: '700', color: '#25D366' }}>Fale no WhatsApp</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.canvas,
    padding: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    justifyContent: 'space-between',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
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
  faqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
  },
  faqLinkText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
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
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 14,
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  loginButtonText: {
    color: Colors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 212, 164, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 164, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    opacity: 0.9,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  whatsappButtonText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
