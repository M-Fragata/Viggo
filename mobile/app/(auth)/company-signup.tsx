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
  Switch,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Building2,
  Lock,
  Sparkles,
  ShieldCheck,
  Cpu,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react-native';
import { formatCpf, formatCnpj, validateCpf, validateCnpj } from '../../utils/validators';
import { lookupCnpj } from '../../utils/cnpjLookup';

const WHATSAPP_URL = 'https://wa.me/5521966921215?text=Ol%C3%A1!%20Estou%20criando%20a%20conta%20da%20minha%20empresa%20no%20Viggo%20e%20gostaria%20de%20ajuda.';

export default function CompanySignupScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [cnpjFoundName, setCnpjFoundName] = useState<string | null>(null);

  const { companySignup } = useAuth();

  function handleOpenWhatsApp() {
    Linking.openURL(WHATSAPP_URL).catch(() => {});
  }

  function handleCpfChange(text: string) {
    setCpf(formatCpf(text));
  }

  async function handleCnpjChange(text: string) {
    const formatted = formatCnpj(text);
    setCnpj(formatted);
    setCnpjFoundName(null);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 14 && validateCnpj(clean)) {
      setSearchingCnpj(true);
      try {
        const result = await lookupCnpj(clean);
        if (result) {
          const found = result.nomeFantasia || result.razaoSocial;
          setCompanyName(found);
          setCnpjFoundName(result.razaoSocial || found);
        }
      } catch {
        // Ignora e permite digitação manual
      } finally {
        setSearchingCnpj(false);
      }
    }
  }

  function validateStep1(): boolean {
    if (!name.trim() || name.trim().length < 3) {
      Alert.alert('Atenção', 'Informe seu nome completo (mínimo 3 caracteres).');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Atenção', 'Informe um e-mail corporativo válido.');
      return false;
    }
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11 || !validateCpf(cleanCpf)) {
      Alert.alert('Atenção', 'Por favor, informe um CPF válido.');
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14 || !validateCnpj(cleanCnpj)) {
      Alert.alert('Atenção', 'Por favor, informe um CNPJ válido.');
      return false;
    }
    if (!companyName.trim() || companyName.trim().length < 2) {
      Alert.alert('Atenção', 'Informe o nome da empresa ou razão social.');
      return false;
    }
    return true;
  }

  function validateStep3(): boolean {
    if (!password || password.length < 8) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 8 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Atenção', 'A confirmação de senha não confere com a senha digitada.');
      return false;
    }
    if (!acceptedTerms) {
      Alert.alert('Atenção', 'É necessário aceitar os Termos de Uso e Política de Privacidade para continuar.');
      return false;
    }
    return true;
  }

  function handleNext() {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    } else {
      router.back();
    }
  }

  async function handleSubmit() {
    if (!validateStep3()) return;

    try {
      setLoading(true);
      await companySignup({
        name: name.trim(),
        email: email.trim(),
        cpf,
        cnpj,
        companyName: companyName.trim(),
        password,
        confirmPassword,
        aceiteContratos: true,
      });
    } catch (err: any) {
      Alert.alert(
        'Erro ao Criar Conta',
        err.message || 'Ocorreu uma falha ao cadastrar a empresa. Verifique os dados ou fale conosco.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top Navigation & Step Indicator */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <Text style={styles.stepCounterText}>Passo {step} de 3</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.faqLink}
            onPress={() => router.push('/(auth)/faq')}
            activeOpacity={0.7}
          >
            <HelpCircle size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* STEP 1: Responsável */}
        {step === 1 && (
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Dados do Responsável</Text>
              <Text style={styles.subtitle}>
                Informações do administrador da conta da empresa
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Completo</Text>
                <View style={styles.inputContainer}>
                  <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome e sobrenome"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail Corporativo</Text>
                <View style={styles.inputContainer}>
                  <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="seuemail@empresa.com"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CPF do Administrador</Text>
                <View style={styles.inputContainer}>
                  <FileText size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="000.000.000-00"
                    placeholderTextColor={Colors.textMuted}
                    value={cpf}
                    onChangeText={handleCpfChange}
                    keyboardType="numeric"
                    maxLength={14}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.nextButtonText}>Continuar</Text>
                <ArrowRight size={18} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            {/* Benefit Card Step 1 */}
            <View style={styles.benefitCard}>
              <View style={styles.benefitHeader}>
                <Sparkles size={18} color={Colors.primary} />
                <Text style={styles.benefitTitle}>Teste 30 Dias Grátis</Text>
              </View>
              <Text style={styles.benefitDescription}>
                Acesso completo a todas as ferramentas, relatórios e aplicativo sem cobranças e sem cartão de crédito.
              </Text>
              <TouchableOpacity
                style={styles.benefitLearnMore}
                onPress={() => router.push('/(auth)/faq')}
                activeOpacity={0.7}
              >
                <Text style={styles.benefitLearnMoreText}>Saiba mais sobre o teste gratuito →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 2: Empresa */}
        {step === 2 && (
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Dados da Empresa</Text>
              <Text style={styles.subtitle}>
                Informações para emissão dos comprovantes fiscais
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.label}>CNPJ</Text>
                  {searchingCnpj && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={{ fontSize: 11, color: Colors.primary }}>Consultando Receita...</Text>
                    </View>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <Building2 size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="00.000.000/0000-00"
                    placeholderTextColor={Colors.textMuted}
                    value={cnpj}
                    onChangeText={handleCnpjChange}
                    keyboardType="numeric"
                    maxLength={18}
                  />
                </View>
                {cnpjFoundName && (
                  <View style={styles.foundBadge}>
                    <CheckCircle2 size={14} color={Colors.primary} />
                    <Text style={styles.foundBadgeText} numberOfLines={1}>
                      {cnpjFoundName}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome da Empresa / Fantasia</Text>
                <View style={styles.inputContainer}>
                  <Building2 size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nome comercial da empresa"
                    placeholderTextColor={Colors.textMuted}
                    value={companyName}
                    onChangeText={setCompanyName}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.nextButtonText}>Continuar para Segurança</Text>
                <ArrowRight size={18} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            {/* Benefit Card Step 2 */}
            <View style={styles.benefitCard}>
              <View style={styles.benefitHeader}>
                <ShieldCheck size={18} color={Colors.primary} />
                <Text style={styles.benefitTitle}>100% Homologado MTE</Text>
              </View>
              <Text style={styles.benefitDescription}>
                Conformidade total com a Portaria 671/2021 (REP-P). Comprovantes digitais com assinatura inviolável e arquivos AFD/AFDT.
              </Text>
              <TouchableOpacity
                style={styles.benefitLearnMore}
                onPress={() => router.push('/(auth)/faq')}
                activeOpacity={0.7}
              >
                <Text style={styles.benefitLearnMoreText}>Ver detalhes da conformidade legal →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Segurança */}
        {step === 3 && (
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Segurança & Ativação</Text>
              <Text style={styles.subtitle}>
                Crie sua senha de acesso para gerenciar a plataforma
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha de Acesso</Text>
                <View style={styles.inputContainer}>
                  <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar Senha</Text>
                <View style={styles.inputContainer}>
                  <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Repita sua senha"
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Termos e Condições */}
              <View style={styles.termsContainer}>
                <Switch
                  value={acceptedTerms}
                  onValueChange={setAcceptedTerms}
                  trackColor={{ false: Colors.border, true: Colors.primaryDeep }}
                  thumbColor={acceptedTerms ? Colors.primary : '#888'}
                />
                <Text style={styles.termsText}>
                  Li e concordo com os <Text style={{ color: Colors.primary }}>Termos de Uso</Text> e a{' '}
                  <Text style={{ color: Colors.primary }}>Política de Privacidade</Text>.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.nextButton, loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textDark} />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>Criar Conta e Começar</Text>
                    <CheckCircle2 size={18} color={Colors.textDark} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Benefit Card Step 3 */}
            <View style={styles.benefitCard}>
              <View style={styles.benefitHeader}>
                <Cpu size={18} color={Colors.primary} />
                <Text style={styles.benefitTitle}>IA Facial Anti-Fraude</Text>
              </View>
              <Text style={styles.benefitDescription}>
                Reconhecimento biométrico em milissegundos com liveness detection e proteção rigorosa perante a LGPD.
              </Text>
            </View>
          </View>
        )}

        {/* Botão Fixo de Suporte WhatsApp (Proximidade com o Usuário) */}
        <View style={styles.whatsappStickyFooter}>
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleOpenWhatsApp}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color="#25D366" />
            <View>
              <Text style={styles.whatsappButtonTitle}>Dúvidas no cadastro?</Text>
              <Text style={styles.whatsappButtonSubtitle}>Fale diretamente conosco no WhatsApp</Text>
            </View>
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
    paddingBottom: Spacing.xxl,
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
  progressContainer: {
    alignItems: 'center',
    gap: 6,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBar: {
    width: 100,
    height: 4,
    backgroundColor: Colors.surfaceHover,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  faqLink: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
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
  foundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  foundBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    marginTop: Spacing.xs,
  },
  nextButtonText: {
    color: Colors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
  benefitCard: {
    backgroundColor: 'rgba(0, 212, 164, 0.06)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 164, 0.18)',
    marginTop: Spacing.lg,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  benefitDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  benefitLearnMore: {
    marginTop: 6,
  },
  benefitLearnMoreText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  whatsappStickyFooter: {
    marginTop: Spacing.xxl,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  whatsappButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#25D366',
  },
  whatsappButtonSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
