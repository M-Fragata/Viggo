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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { router } from 'expo-router';
import { ShieldCheck, Lock, Mail, Tablet } from 'lucide-react-native';

export default function LoginScreen() {
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
      Alert.alert('Falha no Acesso', err.message || 'Credenciais inválidas. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header / Logo */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <ShieldCheck size={20} color={Colors.primary} />
            <Text style={styles.badgeText}>Ponto Eletrônico Homologado</Text>
          </View>

          <Text style={styles.title}>
            Viggo<Text style={{ color: Colors.primary }}>.</Text>
          </Text>
          <Text style={styles.subtitle}>Acesso seguro ao registro de ponto</Text>
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
              <Text style={styles.loginButtonText}>Entrar no Viggo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer: Modo Totem */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.totemButton}
            onPress={() => router.push('/(app)/totem')}
            activeOpacity={0.7}
          >
            <Tablet size={18} color={Colors.primary} />
            <Text style={styles.totemButtonText}>Acessar Modo Totem (Empresa)</Text>
          </TouchableOpacity>

          <Text style={styles.complianceText}>
            Conforme Portaria 671/2021 MTE • REP-P
          </Text>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: 6,
  },
  badgeText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
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
  footer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  totemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
  },
  totemButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  complianceText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: Spacing.lg,
  },
});
