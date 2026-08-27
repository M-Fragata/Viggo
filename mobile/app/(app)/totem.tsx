import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import {
  api,
  ApiError,
  getStoredTotemToken,
  removeStoredTotemToken,
  TotemVerifyResponse,
} from '../../services/api';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import {
  Tablet,
  KeyRound,
  CheckCircle2,
  LogIn,
  Utensils,
  Coffee,
  LogOut,
  ArrowLeft,
  Camera,
  ShieldAlert,
  Clock,
  UserCheck,
  User,
  Lock,
  RefreshCw,
  Power,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const { width } = Dimensions.get('window');

type CheckinType = 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT';

const CHECKIN_OPTIONS: { label: string; type: CheckinType; icon: any; color: string }[] = [
  { label: 'Entrada', type: 'ENTRY', icon: LogIn, color: Colors.primary },
  { label: 'Início Almoço', type: 'LUNCH_START', icon: Utensils, color: Colors.warn },
  { label: 'Retorno Almoço', type: 'LUNCH_END', icon: Coffee, color: Colors.tag },
  { label: 'Saída', type: 'EXIT', icon: LogOut, color: Colors.error },
];

type TotemScreenState =
  | { name: 'activation' }
  | { name: 'idle' }
  | { name: 'employee-auth'; type: CheckinType }
  | { name: 'camera'; type: CheckinType; faceToken: string; userId: string; userName: string }
  | { name: 'success'; comprovante: string; userName: string }
  | { name: 'exit' }
  | { name: 'recover' };

export default function TotemScreen() {
  const [screenState, setScreenState] = useState<TotemScreenState>({ name: 'activation' });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Activation PIN
  const [activationPin, setActivationPin] = useState('');
  const [loadingActivation, setLoadingActivation] = useState(false);

  // Employee Auth
  const [emailOrCpf, setEmailOrCpf] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Exit / Recover
  const [exitPin, setExitPin] = useState('');
  const [loadingExit, setLoadingExit] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverPassword, setRecoverPassword] = useState('');
  const [loadingRecover, setLoadingRecover] = useState(false);

  // Camera & Checkin
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const cameraRef = useRef<any>(null);

  // Success countdown
  const [countdown, setCountdown] = useState(8);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Verificar se já possui totemToken ativo
  useEffect(() => {
    async function checkToken() {
      const token = await getStoredTotemToken();
      if (token) {
        setScreenState({ name: 'idle' });
      } else {
        setScreenState({ name: 'activation' });
      }
    }
    checkToken();
  }, []);

  // Countdown do comprovante de sucesso
  useEffect(() => {
    if (screenState.name === 'success') {
      setCountdown(8);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setScreenState({ name: 'idle' });
            return 8;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [screenState.name]);

  // 1. Ativar Totem
  async function handleActivate() {
    if (activationPin.length < 4) {
      Alert.alert('PIN Inválido', 'O PIN corporativo deve ter entre 4 e 6 dígitos numéricos.');
      return;
    }

    setLoadingActivation(true);
    try {
      await api.totem.activate(activationPin);
      setActivationPin('');
      setScreenState({ name: 'idle' });
    } catch (err: any) {
      Alert.alert('Erro ao ativar Totem', err.message || 'Verifique as permissões de administrador.');
    } finally {
      setLoadingActivation(false);
    }
  }

  // 2. Iniciar Batida no Totem
  function handleSelectType(type: CheckinType) {
    setEmailOrCpf('');
    setPassword('');
    setScreenState({ name: 'employee-auth', type });
  }

  // 3. Autenticar Colaborador
  async function handleEmployeeAuth(type: CheckinType) {
    if (!emailOrCpf.trim() || !password) {
      Alert.alert('Atenção', 'Informe seu e-mail corporativo ou CPF e sua senha.');
      return;
    }

    setLoadingAuth(true);
    try {
      const data: TotemVerifyResponse = await api.totem.verify(emailOrCpf, password);

      if (data.totemAuthMode === 'CREDENTIALS_ONLY') {
        let coords = { latitude: 0, longitude: 0 };
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        } catch {
          console.warn('GPS não disponível no Totem');
        }

        const response = await api.totem.checkin({
          userId: data.userId,
          type,
          latitude: coords.latitude,
          longitude: coords.longitude,
          faceToken: data.faceToken,
        });

        setScreenState({
          name: 'success',
          comprovante: response.comprovante,
          userName: data.userName,
        });
        return;
      }
      
      // Solicitar permissão de câmera se não concedida
      if (!cameraPermission?.granted) {
        const { granted } = await requestCameraPermission();
        if (!granted) {
          Alert.alert('Câmera Necessária', 'É preciso permitir o uso da câmera para bater ponto.');
          setLoadingAuth(false);
          return;
        }
      }

      setScreenState({
        name: 'camera',
        type,
        faceToken: data.faceToken,
        userId: data.userId,
        userName: data.userName,
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'FACE_NOT_REGISTERED') {
        Alert.alert(
          'Biometria Pendente',
          'Seu cadastro facial ainda não foi realizado. Procure seu gestor ou acesse o aplicativo individual para cadastrar sua face.'
        );
      } else {
        Alert.alert('Falha na Identificação', err.message || 'Credenciais inválidas.');
      }
    } finally {
      setLoadingAuth(false);
    }
  }

  // 4. Confirmar Ponto com Câmera
  async function handleConfirmPunch(state: {
    type: CheckinType;
    faceToken: string;
    userId: string;
    userName: string;
  }) {
    setSubmittingCheckin(true);

    try {
      // Obter GPS
      let coords = { latitude: 0, longitude: 0 };
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
      } catch {
        console.warn('GPS não disponível no Totem');
      }

      // Enviar registro de ponto
      const response = await api.totem.checkin({
        userId: state.userId,
        type: state.type,
        latitude: coords.latitude,
        longitude: coords.longitude,
        faceToken: state.faceToken,
      });

      setScreenState({
        name: 'success',
        comprovante: response.comprovante,
        userName: state.userName,
      });
    } catch (err: any) {
      Alert.alert('Erro ao Registrar Ponto', err.message || 'Não foi possível confirmar o ponto.');
      setScreenState({ name: 'idle' });
    } finally {
      setSubmittingCheckin(false);
    }
  }

  // 5. Desativar Totem
  async function handleDeactivate() {
    if (!exitPin) {
      Alert.alert('Atenção', 'Digite o PIN para desativar.');
      return;
    }

    setLoadingExit(true);
    try {
      await api.totem.deactivate(exitPin);
      setExitPin('');
      setScreenState({ name: 'activation' });
    } catch (err: any) {
      Alert.alert('Erro ao desativar', err.message || 'PIN incorreto.');
    } finally {
      setLoadingExit(false);
    }
  }

  // 6. Recuperar Modo Totem (Admin Master)
  async function handleRecover() {
    if (!recoverEmail || !recoverPassword) {
      Alert.alert('Atenção', 'Informe o e-mail e senha de administrador.');
      return;
    }

    setLoadingRecover(true);
    try {
      await api.totem.recover(recoverEmail, recoverPassword);
      setRecoverEmail('');
      setRecoverPassword('');
      setScreenState({ name: 'activation' });
    } catch (err: any) {
      Alert.alert('Erro na Recuperação', err.message || 'Credenciais de administrador inválidas.');
    } finally {
      setLoadingRecover(false);
    }
  }

  // ===================== RENDER SCREENS =====================

  // TELA 1: ATIVAÇÃO POR PIN
  if (screenState.name === 'activation') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Tablet size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Ativar Modo Totem</Text>
          <Text style={styles.subtitle}>
            Transforme este dispositivo em um terminal de ponto coletivo corporativo para sua equipe.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>PIN de Segurança do Totem</Text>
          <View style={styles.inputContainer}>
            <KeyRound size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Digite o PIN (4-6 dígitos)"
              placeholderTextColor={Colors.textMuted}
              value={activationPin}
              onChangeText={setActivationPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loadingActivation && { opacity: 0.7 }]}
            onPress={handleActivate}
            disabled={loadingActivation}
          >
            {loadingActivation ? (
              <ActivityIndicator color={Colors.textDark} />
            ) : (
              <Text style={styles.primaryButtonText}>Ativar Totem Corporativo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // TELA 2: IDLE (SELEÇÃO DE TIPO DE PONTO)
  if (screenState.name === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.idleTopBar}>
          <View style={styles.idleBadge}>
            <Tablet size={14} color={Colors.primary} />
            <Text style={styles.idleBadgeText}>Modo Totem Ativo</Text>
          </View>

          <TouchableOpacity
            style={styles.exitIconBtn}
            onPress={() => setScreenState({ name: 'exit' })}
          >
            <Power size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Relógio Grande */}
        <View style={styles.idleClockContainer}>
          <Text style={styles.idleDateText}>
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </Text>
          <Text style={styles.idleTimeText}>{format(currentTime, 'HH:mm:ss')}</Text>
          <Text style={styles.idlePrompt}>Selecione o tipo de registro para bater ponto</Text>
        </View>

        {/* Grid de Opções de Ponto */}
        <View style={styles.optionsGrid}>
          {CHECKIN_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <TouchableOpacity
                key={opt.type}
                style={styles.optionCard}
                onPress={() => handleSelectType(opt.type)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIconBox, { backgroundColor: `${opt.color}15` }]}>
                  <Icon size={28} color={opt.color} />
                </View>
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // TELA 3: IDENTIFICAÇÃO DO COLABORADOR
  if (screenState.name === 'employee-auth') {
    const currentType = screenState.type;
    const option = CHECKIN_OPTIONS.find((o) => o.type === currentType);

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreenState({ name: 'idle' })}
        >
          <ArrowLeft size={18} color={Colors.textMuted} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.authHeader}>
          <View
            style={[
              styles.selectedTypeBadge,
              { backgroundColor: `${option?.color || Colors.primary}20` },
            ]}
          >
            <Text style={[styles.selectedTypeText, { color: option?.color || Colors.primary }]}>
              {option?.label || 'Marcação de Ponto'}
            </Text>
          </View>
          <Text style={styles.title}>Identificação</Text>
          <Text style={styles.subtitle}>Digite suas credenciais corporativas para continuar</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>E-mail ou CPF</Text>
          <View style={styles.inputContainer}>
            <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputLeft}
              placeholder="seu.email@empresa.com ou CPF"
              placeholderTextColor={Colors.textMuted}
              value={emailOrCpf}
              onChangeText={setEmailOrCpf}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputContainer}>
            <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputLeft}
              placeholder="Sua senha de acesso"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loadingAuth && { opacity: 0.7 }]}
            onPress={() => handleEmployeeAuth(currentType)}
            disabled={loadingAuth}
          >
            {loadingAuth ? (
              <ActivityIndicator color={Colors.textDark} />
            ) : (
              <Text style={styles.primaryButtonText}>Avançar para Foto</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // TELA 4: CÂMERA FACIAL
  if (screenState.name === 'camera') {
    const currentState = screenState;

    return (
      <View style={styles.container}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreenState({ name: 'idle' })}
          >
            <ArrowLeft size={18} color={Colors.textMuted} />
            <Text style={styles.backButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <Text style={styles.cameraUserName}>Olá, {currentState.userName}</Text>
        </View>

        <View style={styles.cameraFrame}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front">
            <View style={styles.faceTarget}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </CameraView>
        </View>

        <Text style={styles.cameraInstructions}>Posicione seu rosto dentro da moldura</Text>

        <TouchableOpacity
          style={[styles.primaryButton, submittingCheckin && { opacity: 0.7 }]}
          onPress={() => handleConfirmPunch(currentState)}
          disabled={submittingCheckin}
        >
          {submittingCheckin ? (
            <ActivityIndicator color={Colors.textDark} />
          ) : (
            <Text style={styles.primaryButtonText}>Confirmar e Bater Ponto</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // TELA 5: SUCESSO & COMPROVANTE
  if (screenState.name === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <CheckCircle2 size={56} color={Colors.primary} />
          <Text style={styles.successTitle}>Ponto Registrado!</Text>
          <Text style={styles.successSubtitle}>
            Obrigado, <Text style={{ color: Colors.text, fontWeight: '700' }}>{screenState.userName}</Text>
          </Text>

          {screenState.comprovante ? (
            <View style={styles.comprovanteBox}>
              <Text style={styles.comprovanteTitle}>Comprovante de Registro</Text>
              <Text style={styles.comprovanteText} numberOfLines={8}>
                {screenState.comprovante}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setScreenState({ name: 'idle' })}
          >
            <Text style={styles.doneButtonText}>Concluir ({countdown}s)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // TELA 6: SAÍDA DO TOTEM (PIN)
  if (screenState.name === 'exit') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreenState({ name: 'idle' })}
        >
          <ArrowLeft size={18} color={Colors.textMuted} />
          <Text style={styles.backButtonText}>Voltar ao Totem</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <ShieldAlert size={36} color={Colors.warn} />
          <Text style={styles.title}>Desativar Totem</Text>
          <Text style={styles.subtitle}>Digite o PIN de administrador para sair do modo Totem.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>PIN de Saída</Text>
          <View style={styles.inputContainer}>
            <KeyRound size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Digite o PIN"
              placeholderTextColor={Colors.textMuted}
              value={exitPin}
              onChangeText={setExitPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loadingExit && { opacity: 0.7 }]}
            onPress={handleDeactivate}
            disabled={loadingExit}
          >
            {loadingExit ? (
              <ActivityIndicator color={Colors.textDark} />
            ) : (
              <Text style={styles.primaryButtonText}>Confirmar Desativação</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recoverLink}
            onPress={() => setScreenState({ name: 'recover' })}
          >
            <Text style={styles.recoverLinkText}>Esqueci o PIN (Recuperar por Administrador)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // TELA 7: RECUPERAÇÃO ADMINISTRATIVA
  if (screenState.name === 'recover') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreenState({ name: 'exit' })}
        >
          <ArrowLeft size={18} color={Colors.textMuted} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <KeyRound size={36} color={Colors.primary} />
          <Text style={styles.title}>Recuperação Admin</Text>
          <Text style={styles.subtitle}>
            Informe o e-mail e senha de um Administrador ou Master para forçar a desativação.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>E-mail de Administrador</Text>
          <View style={styles.inputContainer}>
            <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputLeft}
              placeholder="admin@empresa.com"
              placeholderTextColor={Colors.textMuted}
              value={recoverEmail}
              onChangeText={setRecoverEmail}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputContainer}>
            <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputLeft}
              placeholder="Sua senha"
              placeholderTextColor={Colors.textMuted}
              value={recoverPassword}
              onChangeText={setRecoverPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loadingRecover && { opacity: 0.7 }]}
            onPress={handleRecover}
            disabled={loadingRecover}
          >
            {loadingRecover ? (
              <ActivityIndicator color={Colors.textDark} />
            ) : (
              <Text style={styles.primaryButtonText}>Forçar Desativação</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: Colors.canvas,
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.md,
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
  inputLeft: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 14,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  backButtonText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  idleTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  idleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  idleBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  exitIconBtn: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  idleClockContainer: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  idleDateText: {
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  idleTimeText: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 2,
    marginVertical: 4,
  },
  idlePrompt: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  optionCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  selectedTypeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  selectedTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cameraUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  cameraFrame: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  camera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceTarget: {
    width: width * 0.52,
    height: width * 0.65,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 164, 0.4)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Colors.primary,
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
  cameraInstructions: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  successCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  comprovanteBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  comprovanteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  comprovanteText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
  },
  doneButtonText: {
    color: Colors.textDark,
    fontSize: 14,
    fontWeight: '700',
  },
  recoverLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  recoverLinkText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
