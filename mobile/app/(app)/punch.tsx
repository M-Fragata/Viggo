import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../services/api';
import { enqueueOfflineCheckIn, getOfflineQueue, syncOfflineQueue } from '../../services/offlineQueue';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { LogOut, MapPin, CheckCircle2, AlertCircle, CloudOff, RefreshCw } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function PunchScreen() {
  const { user, logout } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  const cameraRef = useRef<any>(null);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Verificar itens na fila offline
  async function checkOfflineQueue() {
    const queue = await getOfflineQueue();
    setOfflinePendingCount(queue.length);
  }

  useEffect(() => {
    checkOfflineQueue();
  }, []);

  // Solicitar permissões de localização
  useEffect(() => {
    async function requestLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
    }

    requestLocation();
  }, []);

  async function handleSyncOffline() {
    setSyncingOffline(true);
    try {
      const res = await syncOfflineQueue();
      if (res.syncedCount > 0) {
        Alert.alert(
          'Sincronização Concluída',
          `${res.syncedCount} ponto(s) offline foram sincronizados com sucesso!`
        );
      } else if (res.failedCount > 0) {
        Alert.alert('Atenção', 'Não foi possível sincronizar todos os pontos. Verifique sua conexão.');
      }
      await checkOfflineQueue();
    } catch (err: any) {
      Alert.alert('Erro ao sincronizar', err.message || 'Tente novamente mais tarde.');
    } finally {
      setSyncingOffline(false);
    }
  }

  async function handlePunch() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Câmera Necessária', 'É obrigatório permitir o acesso à câmera para registrar o ponto.');
        return;
      }
    }

    try {
      setSubmitting(true);

      // Obter localização mais recente
      let coords: { latitude?: number; longitude?: number; accuracy?: number } = {};
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
        };
      } catch {
        console.warn('Não foi possível obter GPS em tempo real');
      }

      // Captura da foto
      let photoBase64: string | undefined = undefined;
      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.4,
            base64: true,
          });
          photoBase64 = photo.base64;
        } catch (camErr) {
          console.warn('Erro ao capturar frame da câmera', camErr);
        }
      }

      // Chamada à API com fallback para fila offline
      try {
        await api.registerCheckIn({
          ...coords,
          photoBase64,
        });

        setSuccessInfo(`Ponto registrado com sucesso às ${format(new Date(), 'HH:mm:ss')}!`);
        setTimeout(() => setSuccessInfo(null), 5000);

        // Se tínhamos itens offline, tentar sincronizar em background
        if (offlinePendingCount > 0) {
          syncOfflineQueue().then(checkOfflineQueue).catch(() => {});
        }
      } catch (apiErr: any) {
        // Se for erro de rede / offline, enfileirar localmente
        if (apiErr instanceof ApiError && apiErr.code === 'NETWORK_ERROR') {
          await enqueueOfflineCheckIn({
            type: 'ENTRY',
            ...coords,
            photoBase64,
            userId: user?.id,
            userName: user?.name,
          });
          await checkOfflineQueue();
          setSuccessInfo('Sem conexão! Ponto salvo offline e será sincronizado em breve.');
          setTimeout(() => setSuccessInfo(null), 6000);
        } else {
          throw apiErr;
        }
      }
    } catch (err: any) {
      Alert.alert(
        'Erro no Registro',
        err.message || 'Não foi possível registrar o ponto. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Colaborador'}</Text>
          <Text style={styles.companyName}>{user?.companyName || 'Viggo'}</Text>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <LogOut size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Offline Pending Banner */}
      {offlinePendingCount > 0 && (
        <View style={styles.offlineBanner}>
          <View style={styles.offlineBannerLeft}>
            <CloudOff size={16} color={Colors.warn} />
            <Text style={styles.offlineBannerText}>
              {offlinePendingCount} ponto(s) offline pendente(s)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncOffline}
            disabled={syncingOffline}
          >
            {syncingOffline ? (
              <ActivityIndicator size="small" color={Colors.warn} />
            ) : (
              <>
                <RefreshCw size={12} color={Colors.warn} />
                <Text style={styles.syncButtonText}>Sincronizar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Relógio Digital */}
      <View style={styles.clockCard}>
        <Text style={styles.dateText}>
          {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </Text>
        <Text style={styles.timeText}>{format(currentTime, 'HH:mm:ss')}</Text>

        <View style={styles.gpsStatus}>
          <MapPin size={14} color={locationPermission ? Colors.primary : Colors.warn} />
          <Text
            style={[
              styles.gpsText,
              { color: locationPermission ? Colors.primary : Colors.warn },
            ]}
          >
            {locationPermission ? 'GPS Ativo e Pronto' : 'Aguardando permissão de GPS'}
          </Text>
        </View>
      </View>

      {/* Camera Facial Frame */}
      <View style={styles.cameraContainer}>
        {cameraPermission?.granted ? (
          <CameraView ref={cameraRef} style={styles.camera} facing="front">
            <View style={styles.faceTarget}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </CameraView>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <AlertCircle size={36} color={Colors.textMuted} />
            <Text style={styles.placeholderText}>Câmera não autorizada</Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestCameraPermission}
            >
              <Text style={styles.permissionButtonText}>Permitir Acesso</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Success Notification */}
      {successInfo && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={18} color={Colors.primary} />
          <Text style={styles.successBannerText}>{successInfo}</Text>
        </View>
      )}

      {/* Bottom Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.punchButton, submitting && { opacity: 0.7 }]}
          onPress={handlePunch}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.textDark} />
          ) : (
            <Text style={styles.punchButtonText}>Bater Ponto Agora</Text>
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
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  companyName: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.warnBg,
    borderWidth: 1,
    borderColor: Colors.warn,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  offlineBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineBannerText: {
    color: Colors.warn,
    fontSize: 12,
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(195, 125, 13, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  syncButtonText: {
    color: Colors.warn,
    fontSize: 11,
    fontWeight: '700',
  },
  clockCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
    marginVertical: 2,
  },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    position: 'relative',
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
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  permissionButtonText: {
    color: Colors.textDark,
    fontSize: 13,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  successBannerText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  bottomSection: {
    paddingBottom: Spacing.md,
  },
  punchButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  punchButtonText: {
    color: Colors.textDark,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
