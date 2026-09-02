import { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  enqueueTotemOfflineCheckIn,
  syncTotemOfflineQueue,
  getTotemOfflineQueue,
  CheckinType,
} from '../../services/offlineQueue';
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
  ShieldAlert,
  User,
  Lock,
  Power,
  WifiOff,
  Radio,
  ScanFace,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const { width } = Dimensions.get('window');

const CHECKIN_OPTIONS: { label: string; type: CheckinType; icon: any; color: string }[] = [
  { label: 'Entrada', type: 'ENTRY', icon: LogIn, color: Colors.primary },
  { label: 'Início Almoço', type: 'LUNCH_START', icon: Utensils, color: Colors.warn },
  { label: 'Retorno Almoço', type: 'LUNCH_END', icon: Coffee, color: Colors.tag },
  { label: 'Saída', type: 'EXIT', icon: LogOut, color: Colors.error },
];

type TotemScreenState =
  | { name: 'activation' }
  | { name: 'idle' }
  | { name: 'employee-auth' }
  | {
      name: 'select-type';
      userId: string;
      userName: string;
      faceToken: string;
      totemAuthMode?: 'CREDENTIALS_ONLY' | 'FRONTAL_ONLY' | 'FULL_LIVENESS';
      checkinsToday: Array<{ id: string; type: CheckinType; createdAt: string }>;
    }
  | { name: 'camera'; type: CheckinType; faceToken: string; userId: string; userName: string }
  | {
      name: 'success';
      comprovante?: string;
      userName: string;
      isOffline?: boolean;
      offlineType?: CheckinType;
      offlineTime?: string;
    }
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

  // Auto-sincronização de marcações pendentes do Totem
  const trySyncTotemOffline = useCallback(async () => {
    try {
      const queue = await getTotemOfflineQueue();
      if (queue.length > 0) {
        await syncTotemOfflineQueue();
      }
    } catch {
      // Ignora falhas silenciosamente enquanto estiver sem conexão
    }
  }, []);

  useEffect(() => {
    trySyncTotemOffline();
    const interval = setInterval(trySyncTotemOffline, 30000);
    return () => clearInterval(interval);
  }, [trySyncTotemOffline]);

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

  // 2. Iniciar Batida no Totem (Vai para Autenticação)
  function handleStartPunch() {
    setEmailOrCpf('');
    setPassword('');
    setScreenState({ name: 'employee-auth' });
  }

  // 3. Autenticar Colaborador
  async function handleEmployeeAuth() {
    if (!emailOrCpf.trim() || !password) {
      Alert.alert('Atenção', 'Informe seu e-mail corporativo ou CPF e sua senha.');
      return;
    }

    setLoadingAuth(true);
    try {
      const data: TotemVerifyResponse = await api.totem.verify(emailOrCpf, password);

      setScreenState({
        name: 'select-type',
        userId: data.userId,
        userName: data.userName,
        faceToken: data.faceToken,
        totemAuthMode: data.totemAuthMode,
        checkinsToday: data.checkinsToday || [],
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

  // 4. Selecionar Tipo de Ponto (com validação prévia)
  async function handleSelectType(
    state: {
      userId: string;
      userName: string;
      faceToken: string;
      totemAuthMode?: 'CREDENTIALS_ONLY' | 'FRONTAL_ONLY' | 'FULL_LIVENESS';
      checkinsToday: Array<{ id: string; type: CheckinType; createdAt: string }>;
    },
    type: CheckinType
  ) {
    // Se o modo for CREDENTIALS_ONLY, faz o registro direto
    if (state.totemAuthMode === 'CREDENTIALS_ONLY') {
      setSubmittingCheckin(true);
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

      try {
        const response = await api.totem.checkin({
          userId: state.userId,
          type,
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
        const isNetworkError =
          (err instanceof ApiError && (err.code === 'NETWORK_ERROR' || err.status === 0)) ||
          err.message?.includes('Network') ||
          err.message?.includes('fetch');

        if (isNetworkError) {
          await enqueueTotemOfflineCheckIn({
            userId: state.userId,
            userName: state.userName,
            type,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });

          setScreenState({
            name: 'success',
            userName: state.userName,
            isOffline: true,
            offlineType: type,
            offlineTime: format(new Date(), 'HH:mm:ss'),
          });
        } else {
          Alert.alert('Erro ao Registrar Ponto', err.message || 'Não foi possível registrar o ponto.');
          setScreenState({ name: 'idle' });
        }
      } finally {
        setSubmittingCheckin(false);
      }
      return;
    }

    // Solicitar permissão de câmera se necessário
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Câmera Necessária', 'É preciso permitir o uso da câmera para bater ponto.');
        return;
      }
    }

    setScreenState({
      name: 'camera',
      type,
      faceToken: state.faceToken,
      userId: state.userId,
      userName: state.userName,
    });
  }

  // 5. Confirmar Ponto com Câmera
  async function handleConfirmPunch(state: {
    type: CheckinType;
    faceToken: string;
    userId: string;
    userName: string;
  }) {
    setSubmittingCheckin(true);

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

    try {
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
      const isNetworkError =
        (err instanceof ApiError && (err.code === 'NETWORK_ERROR' || err.status === 0)) ||
        err.message?.includes('Network') ||
        err.message?.includes('fetch');

      if (isNetworkError) {
        try {
          await enqueueTotemOfflineCheckIn({
            userId: state.userId,
            userName: state.userName,
            type: state.type,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });

          setScreenState({
            name: 'success',
            userName: state.userName,
            isOffline: true,
            offlineType: state.type,
            offlineTime: format(new Date(), 'HH:mm:ss'),
          });
          return;
        } catch (offlineErr) {
          console.error('Erro ao salvar ponto offline no totem:', offlineErr);
        }
      }

      Alert.alert('Erro ao Registrar Ponto', err.message || 'Não foi possível confirmar o ponto.');
      setScreenState({ name: 'idle' });
    } finally {
      setSubmittingCheckin(false);
    }
  }

  // 6. Desativar Totem
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

  // 7. Recuperar Modo Totem (Admin Master)
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

  // TELA 1: ATIVAÇÃO
  if (screenState.name === 'activation') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Tablet size={48} color={Colors.primary} />
          <Text style={styles.title}>Ativar Modo Totem</Text>
          <Text style={styles.subtitle}>
            Transforme este dispositivo em um terminal corporativo de ponto eletrônico.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>PIN Corporativo de Ativação</Text>
          <View style={styles.inputContainer}>
            <KeyRound size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Digite o PIN (4 a 6 dígitos)"
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

  // TELA 2: IDLE (TELA INICIAL DO TOTEM)
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
          <Text style={styles.idlePrompt}>Reconhecimento facial com vivacidade</Text>
        </View>

        {/* Botão Principal de Entrada */}
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={handleStartPunch}
          activeOpacity={0.85}
        >
          <View style={styles.primaryActionIconBox}>
            <ScanFace size={36} color={Colors.textDark} />
          </View>
          <Text style={styles.primaryActionButtonText}>Bater Ponto</Text>
          <Text style={styles.primaryActionButtonSub}>Toque aqui para se identificar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // TELA 3: IDENTIFICAÇÃO DO COLABORADOR
  if (screenState.name === 'employee-auth') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreenState({ name: 'idle' })}
        >
          <ArrowLeft size={18} color={Colors.textMuted} />
          <Text style={styles.backButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <View style={styles.authHeader}>
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
            onPress={handleEmployeeAuth}
            disabled={loadingAuth}
          >
            {loadingAuth ? (
              <ActivityIndicator color={Colors.textDark} />
            ) : (
              <Text style={styles.primaryButtonText}>Avançar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // TELA 4: SELEÇÃO DE TIPO DE PONTO (COM BLOQUEIO DE PONTOS JÁ BATIDOS)
  if (screenState.name === 'select-type') {
    const currentState = screenState;

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreenState({ name: 'idle' })}
        >
          <ArrowLeft size={18} color={Colors.textMuted} />
          <Text style={styles.backButtonText}>Trocar Colaborador</Text>
        </TouchableOpacity>

        <View style={styles.selectTypeHeader}>
          <Text style={styles.greetingTitle}>Olá, {currentState.userName.split(' ')[0]}!</Text>
          <Text style={styles.subtitle}>Selecione o tipo de registro que deseja realizar</Text>
        </View>

        <View style={styles.optionsGrid}>
          {CHECKIN_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const existing = currentState.checkinsToday.find((c) => c.type === opt.type);
            const hasRegistered = Boolean(existing);
            const checkinTime = existing ? format(new Date(existing.createdAt), 'HH:mm') : null;

            return (
              <TouchableOpacity
                key={opt.type}
                style={[
                  styles.optionCard,
                  hasRegistered && styles.optionCardDisabled,
                ]}
                onPress={() => !hasRegistered && handleSelectType(currentState, opt.type)}
                disabled={hasRegistered || submittingCheckin}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.optionIconBox,
                    {
                      backgroundColor: hasRegistered
                        ? 'rgba(255,255,255,0.05)'
                        : `${opt.color}15`,
                    },
                  ]}
                >
                  <Icon size={28} color={hasRegistered ? Colors.textMuted : opt.color} />
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    hasRegistered && { color: Colors.textMuted },
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.optionStatusText,
                    hasRegistered
                      ? { color: Colors.textMuted }
                      : { color: Colors.primary },
                  ]}
                >
                  {hasRegistered ? `✅ Registrado às ${checkinTime}` : 'Toque para registrar'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // TELA 5: CÂMERA FACIAL
  if (screenState.name === 'camera') {
    const currentState = screenState;

    return (
      <View style={styles.container}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              setScreenState({
                name: 'select-type',
                userId: currentState.userId,
                userName: currentState.userName,
                faceToken: currentState.faceToken,
                checkinsToday: [],
              })
            }
          >
            <ArrowLeft size={18} color={Colors.textMuted} />
            <Text style={styles.backButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <Text style={styles.cameraUserName}>Olá, {currentState.userName.split(' ')[0]}</Text>
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

  // TELA 6: SUCESSO & COMPROVANTE (ONLINE OU OFFLINE)
  if (screenState.name === 'success') {
    const isOffline = screenState.isOffline;

    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          {isOffline ? (
            <View style={styles.offlineIconBox}>
              <Radio size={48} color={Colors.warn} />
            </View>
          ) : (
            <CheckCircle2 size={56} color={Colors.primary} />
          )}

          <Text style={[styles.successTitle, isOffline && { color: Colors.warn }]}>
            {isOffline ? 'Ponto Registrado Offline!' : 'Ponto Registrado com Sucesso!'}
          </Text>

          <Text style={styles.successSubtitle}>
            Obrigado, <Text style={{ color: Colors.text, fontWeight: '700' }}>{screenState.userName}</Text>
          </Text>

          {isOffline ? (
            <View style={styles.offlineDetailsCard}>
              <View style={styles.offlineDetailRow}>
                <Text style={styles.offlineDetailLabel}>Tipo:</Text>
                <Text style={styles.offlineDetailValue}>
                  {screenState.offlineType === 'ENTRY'
                    ? 'Entrada'
                    : screenState.offlineType === 'LUNCH_START'
                    ? 'Início Almoço'
                    : screenState.offlineType === 'LUNCH_END'
                    ? 'Retorno Almoço'
                    : 'Saída'}
                </Text>
              </View>

              <View style={styles.offlineDetailRow}>
                <Text style={styles.offlineDetailLabel}>Horário Gravado:</Text>
                <Text style={styles.offlineDetailValue}>{screenState.offlineTime}</Text>
              </View>

              <View style={styles.offlineNoticeBox}>
                <WifiOff size={16} color={Colors.warn} style={{ marginTop: 2 }} />
                <Text style={styles.offlineNoticeText}>
                  O comprovante fiscal definitivo com o número de registro (NSR) será gerado e disponibilizado para consulta assim que o totem se reconectar à internet.
                </Text>
              </View>
            </View>
          ) : screenState.comprovante ? (
            <View style={styles.comprovanteBox}>
              <Text style={styles.comprovanteTitle}>Comprovante de Registro</Text>
              <Text style={styles.comprovanteText} numberOfLines={8}>
                {screenState.comprovante}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.doneButton, isOffline && { backgroundColor: Colors.warn }]}
            onPress={() => setScreenState({ name: 'idle' })}
          >
            <Text style={[styles.doneButtonText, isOffline && { color: Colors.textDark }]}>
              {isOffline ? `Entendido (${countdown}s)` : `Concluir (${countdown}s)`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // TELA 7: SAÍDA DO TOTEM (PIN)
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

  // TELA 8: RECUPERAÇÃO ADMINISTRATIVA
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
  selectTypeHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '700',
  },
  inputLeft: {
    flex: 1,
    height: 48,
    color: Colors.text,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: Spacing.xl,
  },
  primaryActionIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  primaryActionButtonText: {
    color: Colors.textDark,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  primaryActionButtonSub: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  recoverLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  recoverLinkText: {
    color: Colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
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
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionCardDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  optionStatusText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  cameraInstructions: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  offlineIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  comprovanteBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  comprovanteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comprovanteText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.textMuted,
    lineHeight: 14,
  },
  offlineDetailsCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  offlineDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  offlineDetailLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  offlineDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  offlineNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 11,
    color: Colors.warn,
    lineHeight: 15,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
});
