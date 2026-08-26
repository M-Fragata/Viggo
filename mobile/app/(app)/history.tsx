import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { api, CheckInItem } from '../../services/api';
import {
  getOfflineQueue,
  syncOfflineQueue,
  OfflineCheckIn,
} from '../../services/offlineQueue';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Clock,
  MapPin,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Filter,
} from 'lucide-react-native';

type FilterType = 'ALL' | 'ENTRY' | 'EXIT' | 'INTERVAL';

export default function HistoryScreen() {
  const [checkIns, setCheckIns] = useState<CheckInItem[]>([]);
  const [offlineItems, setOfflineItems] = useState<OfflineCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [syncing, setSyncing] = useState(false);

  const PAGE_LIMIT = 20;

  async function loadData(pageNumber = 1, isRefresh = false) {
    try {
      const [apiRes, queue] = await Promise.all([
        api.getMyCheckIns(pageNumber, PAGE_LIMIT),
        getOfflineQueue(),
      ]);

      setOfflineItems(queue);

      if (pageNumber === 1) {
        setCheckIns(apiRes.checkIns || []);
      } else {
        setCheckIns((prev) => [...prev, ...(apiRes.checkIns || [])]);
      }

      setHasMore((apiRes.checkIns || []).length === PAGE_LIMIT);
      setPage(pageNumber);
    } catch (err) {
      console.warn('Erro ao carregar histórico', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadData(1);
  }, []);

  function onRefresh() {
    setRefreshing(true);
    loadData(1, true);
  }

  function handleLoadMore() {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      loadData(page + 1);
    }
  }

  async function handleSyncOffline() {
    setSyncing(true);
    try {
      const res = await syncOfflineQueue();
      if (res.synced.length > 0) {
        Alert.alert(
          'Sucesso',
          `${res.synced.length} ponto(s) offline sincronizado(s) com sucesso!`
        );
      }
      await loadData(1, true);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao sincronizar pontos offline.');
    } finally {
      setSyncing(false);
    }
  }

  function getBadgeDetails(type: string) {
    switch (type) {
      case 'ENTRY':
        return { label: 'Entrada', color: Colors.primary, bg: Colors.successBg };
      case 'EXIT':
        return { label: 'Saída', color: Colors.error, bg: Colors.errorBg };
      case 'INTERVAL_ENTRY':
        return { label: 'Volta Intervalo', color: Colors.tag, bg: 'rgba(55, 114, 207, 0.15)' };
      case 'INTERVAL_EXIT':
        return { label: 'Saída Intervalo', color: Colors.warn, bg: Colors.warnBg };
      default:
        return { label: 'Ponto', color: Colors.primary, bg: Colors.successBg };
    }
  }

  const filteredCheckIns = checkIns.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'ENTRY') return item.type === 'ENTRY';
    if (filter === 'EXIT') return item.type === 'EXIT';
    if (filter === 'INTERVAL') {
      return item.type === 'INTERVAL_ENTRY' || item.type === 'INTERVAL_EXIT';
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Marcações</Text>
        <Text style={styles.subtitle}>Espelho dos seus registros de ponto</Text>
      </View>

      {/* Offline Pending Section */}
      {offlineItems.length > 0 && (
        <View style={styles.offlineCard}>
          <View style={styles.offlineHeader}>
            <View style={styles.offlineTitleRow}>
              <CloudOff size={16} color={Colors.warn} />
              <Text style={styles.offlineTitle}>
                {offlineItems.length} registro(s) offline aguardando sincronização
              </Text>
            </View>

            <TouchableOpacity
              style={styles.offlineSyncBtn}
              onPress={handleSyncOffline}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={Colors.warn} />
              ) : (
                <>
                  <RefreshCw size={12} color={Colors.warn} />
                  <Text style={styles.offlineSyncBtnText}>Sincronizar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text
            style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}
          >
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'ENTRY' && styles.filterTabActive]}
          onPress={() => setFilter('ENTRY')}
        >
          <Text
            style={[styles.filterTabText, filter === 'ENTRY' && styles.filterTabTextActive]}
          >
            Entradas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'INTERVAL' && styles.filterTabActive]}
          onPress={() => setFilter('INTERVAL')}
        >
          <Text
            style={[styles.filterTabText, filter === 'INTERVAL' && styles.filterTabTextActive]}
          >
            Intervalos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'EXIT' && styles.filterTabActive]}
          onPress={() => setFilter('EXIT')}
        >
          <Text
            style={[styles.filterTabText, filter === 'EXIT' && styles.filterTabTextActive]}
          >
            Saídas
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredCheckIns.length === 0 ? (
        <View style={styles.centerContainer}>
          <Clock size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Nenhuma batida encontrada para este filtro.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCheckIns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const badge = getBadgeDetails(item.type);
            const date = new Date(item.createdAt);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>{format(date, 'HH:mm:ss')}</Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.dateText}>
                    {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Text>

                  <View style={styles.footerRow}>
                    <View style={styles.nsrBadge}>
                      <Text style={styles.nsrText}>NSR: {item.nsr || '—'}</Text>
                    </View>

                    {item.address ? (
                      <View style={styles.locationRow}>
                        <MapPin size={12} color={Colors.textMuted} />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {item.address}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.locationRow}>
                        <CheckCircle2 size={12} color={Colors.primary} />
                        <Text style={styles.validatedText}>Autenticado Digitalmente</Text>
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
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  offlineCard: {
    backgroundColor: Colors.warnBg,
    borderWidth: 1,
    borderColor: Colors.warn,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  offlineTitle: {
    color: Colors.warn,
    fontSize: 12,
    fontWeight: '600',
  },
  offlineSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(195, 125, 13, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  offlineSyncBtnText: {
    color: Colors.warn,
    fontSize: 11,
    fontWeight: '700',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  list: {
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
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
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  cardBody: {
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  nsrBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nsrText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  locationText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  validatedText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  footerLoader: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
