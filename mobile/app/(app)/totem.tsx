import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Tablet, KeyRound, CheckCircle2 } from 'lucide-react-native';

export default function TotemScreen() {
  const [pin, setPin] = useState('');
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleActivateTotem() {
    if (pin.length < 4) {
      Alert.alert('PIN Inválido', 'O PIN corporativo deve ter pelo menos 4 dígitos.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setActive(true);
    }, 1000);
  }

  if (active) {
    return (
      <View style={styles.container}>
        <View style={styles.activeCard}>
          <CheckCircle2 size={48} color={Colors.primary} />
          <Text style={styles.activeTitle}>Totem Ativo e Pronto</Text>
          <Text style={styles.activeSubtitle}>
            Posicione este dispositivo na entrada da sua empresa para marcação de ponto coletiva.
          </Text>

          <TouchableOpacity
            style={styles.deactivateButton}
            onPress={() => setActive(false)}
          >
            <Text style={styles.deactivateButtonText}>Desativar Modo Totem</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Tablet size={32} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Modo Totem Empresarial</Text>
        <Text style={styles.subtitle}>
          Transforme este aparelho em um terminal de registro de ponto coletivo para seus funcionários.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>PIN de Ativação do Totem</Text>
        <View style={styles.inputContainer}>
          <KeyRound size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Digite o PIN da empresa"
            placeholderTextColor={Colors.textMuted}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={8}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleActivateTotem}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textDark} />
          ) : (
            <Text style={styles.buttonText}>Ativar Totem</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
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
    marginBottom: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
  activeCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  activeSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    lineHeight: 18,
  },
  deactivateButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deactivateButtonText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
