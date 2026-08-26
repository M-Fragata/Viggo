import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { api, CheckInItem } from '../../services/api';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, CheckCircle2 } from 'lucide-react-native';

export default function HistoryScreen() {
  const [checkIns, setCheckIns] = useState<CheckInItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadHistory() {
    try {
      const data = await api.getMyCheckIns();
      setCheckIns(data.checkIns || []);
    } catch (err) {
      console.warn('Erro ao carregar histórico', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function onRefresh() {
    setRefreshing(true);
    loadHistory();
  }

  function getBadgeDetails(type: string) {
    switch (type) {
      case 'ENTRY':
        return { label: 'Entrada', color: Colors.primary, bg: Colors.successBg };
      case 'EXIT':
        return { label: 'Saída', color: Colors.error, bg: Colors.errorBg };
      case 'INTERVAL_ENTRY':
        return { label: 'Volta Intervalo', color: Colors.tag, bg: 'rgba(55, 114, 207, 0.1)' };
      case 'INTERVAL_EXIT':
        return { label: 'Saída Intervalo', color: Colors.warn, bg: Colors.warnBg };
      default:
        return { label: 'Ponto', color: Colors.primary, bg: Colors.successBg };
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Marcações</Text>
        <Text style={styles.subtitle}>Espelho de ponto dos últimos registros</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : checkIns.length === 0 ? (
        <View style={styles.centerContainer}>
          <Clock size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Nenhuma batida de ponto registrada ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={checkIns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => {
            const badge = getBadgeDetails(item.type);
            const date = new Date(item.createdAt);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.timeText}>{format(date, 'HH:mm:ss')}</Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.dateText}>
                    {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Text>

                  <View style={styles.footerRow}>
                    <View style={styles.nsrBadge}>
                      <CheckCircle2 size={12} color={Colors.textMuted} />
                      <Text style={styles.nsrText}>NSR: {item.nsr}/{item.ano}</Text>
                    </View>

                    {item.address && (
                      <View style={styles.locationBadge}>
                        <MapPin size={12} color={Colors.textMuted} />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {item.address}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  list: {
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  cardBody: {
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  nsrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nsrText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  locationBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
