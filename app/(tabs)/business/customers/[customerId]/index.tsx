import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  Dimensions,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { getCustomer, getDayLogsForCustomer, addGotEntryToDayLog, softDeleteDayLogEntry, softDeleteDayLog } from '@/lib/database';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEntryStore } from '@/store/entryStore';
import { getTodayString } from '@/utils/dateUtils';
import type { Customer, DayLog, DayEntry } from '@/types';
import { useTranslation } from "@/hooks/useTranslation";
import { isValidAmount } from '@/utils/currencyUtils';
import { ParticleEffect } from '@/components/ParticleEffect';
import Animated, { FadeInDown, FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';
import { Colors as ThemeColors, Fonts, Radius } from '@/constants/theme';
import { DraggableDeletionWrapper } from '@/components/DraggableDeletionWrapper';

const { width } = Dimensions.get('window');

export default function CustomerDetailScreen() {
  const { t } = useTranslation();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const setEditingEntry = useEntryStore(state => state.setEditingEntry);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [dayLogs, setDayLogs] = useState<DayLog[]>([]);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Deletion State
  const [isDeletingMode, setIsDeletingMode] = useState(false);
  const [dustbinLayout, setDustbinLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [shatteringCard, setShatteringCard] = useState<{ layout: { x: number, y: number, width: number, height: number }, color: string } | null>(null);
  const lastActiveLayout = useRef<{ x: number, y: number, width: number, height: number } | null>(null);

  const fetchData = useCallback(async () => {
    if (!customerId) return;
    try {
      const [cust, logs] = await Promise.all([
        getCustomer(customerId),
        getDayLogsForCustomer(undefined, customerId),
      ]);
      setCustomer(cust);
      setDayLogs(logs);
      if (logs.length > 0) {
        setLastCursor(logs[logs.length - 1].dayLogId);
        setHasMoreLogs(logs.length === 20);
      } else {
        setLastCursor(null);
        setHasMoreLogs(false);
      }
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to load customer`));
    } finally {
      setLoading(false);
    }
  }, [customerId, t]);

  const loadMoreLogs = async () => {
    if (!customerId || !hasMoreLogs || !lastCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const moreLogs = await getDayLogsForCustomer(undefined, customerId, lastCursor);
      if (moreLogs.length > 0) {
        setLastCursor(moreLogs[moreLogs.length - 1].dayLogId);
        setHasMoreLogs(moreLogs.length === 20);
        setDayLogs(prev => [...prev, ...moreLogs]);
      } else {
        setHasMoreLogs(false);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleEditEntry = (entry: DayEntry, dayLogId: string) => {
    setEditingEntry(entry, dayLogId);
    router.push(`/(tabs)/business/customers/${customerId}/add-entry`);
  };

  const handleDeleteEntry = async (entry: DayEntry, dayLogId: string) => {
    if (!customerId || !lastActiveLayout.current) return;

    setShatteringCard({
      layout: lastActiveLayout.current,
      color: ThemeColors.creditRed
    });
    setIsDeletingMode(false);

    try {
      await softDeleteDayLogEntry(dayLogId, entry.id);
      await fetchData();
    } catch (err: any) {
      Alert.alert(t('Error'), err.message || t('Failed to delete entry'));
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer) return <EmptyState message="Customer not found" icon="👤" />;

  const totalDue = (customer as any).balance || 0;
  const balanceColor = totalDue > 0 ? ThemeColors.creditRed : ThemeColors.paymentGreen;

  const isToday = (dateString: string) => dateString === getTodayString();

  const todayString = getTodayString();
  const todayLog = dayLogs.find(l => l.date === todayString);
  const isTodayLocked = todayLog?.isLocked;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* SHATTERING ANIMATION OVERLAY */}
      {shatteringCard && (
        <ParticleEffect
          layout={shatteringCard.layout}
          color={shatteringCard.color}
          onComplete={() => setShatteringCard(null)}
        />
      )}

      {/* FLOATING DUSTBIN */}
      {isDeletingMode && dustbinLayout && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={{
            position: 'absolute',
            left: dustbinLayout.x,
            top: dustbinLayout.y,
            width: dustbinLayout.width,
            height: dustbinLayout.height,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 30,
            backgroundColor: 'rgba(173, 40, 40, 0.15)',
            zIndex: 9999,
          }}
        >
          <MaterialIcons name="delete-sweep" size={32} color={ThemeColors.creditRed} />
        </Animated.View>
      )}

      {/* PREMIUM HEADER */}
      <Animated.View
        entering={FadeInUp.duration(400).springify()}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={ThemeColors.brandDark} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerPhone}>{customer.phone || t('No phone')}</Text>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 10, color: ThemeColors.textSecondary, marginTop: 2 }}>
            Code: {customer.linkCode || '------'}
          </Text>
        </View>

        {/* DARK BALANCE CARD */}
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceLabel}>{t('Balance')}</Text>
          <Text style={[styles.balanceAmount, { color: ThemeColors.textOnDark }]}>
            ₹{totalDue.toLocaleString('en-IN')}
          </Text>
        </View>
      </Animated.View>

      <FlatList
        data={dayLogs}
        keyExtractor={(item) => item.dayLogId}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        onEndReached={loadMoreLogs}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ThemeColors.brandDark]} />
        }
        ListHeaderComponent={
          <>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: ThemeColors.creditRed }]}
            onPress={() => router.push(`/(tabs)/business/customers/${customerId}/add-entry`)}
          >
            <MaterialIcons name="add-shopping-cart" size={24} color="#FFF" />
            <Text style={styles.actionText}>{t('GAVE')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: ThemeColors.paymentGreen }]}
            onPress={() => router.push(`/(tabs)/business/customers/${customerId}/add-payment`)}
          >
            <MaterialIcons name="account-balance-wallet" size={24} color="#FFF" />
            <Text style={styles.actionText}>{t('GOT')}</Text>
          </TouchableOpacity>
        </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={56} color={ThemeColors.creamBorder} />
            <Text style={styles.emptyText}>{t('No entries for this customer')}</Text>
          </View>
        }
        renderItem={({ item: log, index: logIdx }) => {
            const isLocked = log.isLocked;
            const logDate = new Date(log.date);
            const formattedDate = logDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            let dayTotalGave = 0;
            let dayTotalGot = 0;
            (log.entries || []).forEach((e: any) => {
              if (e.is_deleted) return;
              const amt = Number(e.amount) || 0;
              if (e.type === 'gave' || e.type === 'debit') dayTotalGave += amt;
              else dayTotalGot += amt;
            });
            const dayNet = dayTotalGave - dayTotalGot;

            return (
              <Animated.View
                key={log.dayLogId}
                entering={FadeInDown.delay(100 + logIdx * 100).springify()}
                style={[styles.logSection, isLocked && { opacity: 0.6 }]}
              >
                <View style={styles.dateHeader}>
                  <Text style={styles.dateText}>{formattedDate}</Text>
                  {isLocked && (
                    <View style={styles.lockBadge}>
                      <MaterialIcons name="lock" size={12} color="#666" />
                      <Text style={styles.lockText}>LOCKED</Text>
                    </View>
                  )}
                </View>

                {(log.entries || []).map((entry: any, entryIdx: number) => {
                  if (entry.is_deleted) return null;
                  const isGave = entry.type === 'gave' || entry.type === 'debit';
                  const amountColor = isGave ? ThemeColors.creditRed : ThemeColors.paymentGreen;

                  return (
                    <Animated.View
                      key={entry.id}
                      entering={FadeInRight.delay(200 + entryIdx * 50).springify()}
                      layout={Layout.springify()}
                    >
                      <DraggableDeletionWrapper
                        dustbinLayout={dustbinLayout}
                        onActivate={(layout) => {
                          if (isLocked) return;
                          setIsDeletingMode(true);
                          lastActiveLayout.current = layout;
                          setDustbinLayout({
                            x: width - 80,
                            y: layout.y,
                            width: 60,
                            height: 60
                          });
                        }}
                        onDeactivate={() => setIsDeletingMode(false)}
                        onDelete={() => handleDeleteEntry(entry, log.dayLogId)}
                        disabled={!isToday(log.date)}
                      >
                        <TouchableOpacity
                          style={styles.entryCard}
                          onPress={() => isToday(log.date) && handleEditEntry(entry, log.dayLogId)}
                          activeOpacity={isToday(log.date) ? 0.7 : 1}
                        >
                          <View style={[styles.entryIndicator, { backgroundColor: amountColor }]} />

                          <View style={styles.entryMain}>
                            <Text style={styles.entryDesc}>
                              {entry.description || (isGave ? t('Items given') : t('Payment received'))}
                            </Text>
                            <Text style={styles.entryTime}>
                              {entry.time || 'Entry'}
                            </Text>
                          </View>

                          <View style={styles.entryRight}>
                            <Text style={[styles.entryAmount, { color: amountColor }]}>
                              {isGave ? '' : '-'}₹{Number(entry.amount).toLocaleString('en-IN')}
                            </Text>
                            {isToday(log.date) && (
                              <MaterialIcons name="edit" size={14} color={ThemeColors.textMuted} style={{ marginTop: 4 }} />
                            )}
                          </View>
                        </TouchableOpacity>
                      </DraggableDeletionWrapper>
                    </Animated.View>
                  );
                })}

                <View style={styles.dayFooter}>
                  <Text style={styles.footerLabel}>{t('Day Net')}</Text>
                  <Text style={styles.footerValue}>₹{dayNet.toLocaleString('en-IN')}</Text>
                </View>
              </Animated.View>
            );
        }}
        ListFooterComponent={
          <>
        {hasMoreLogs && (
          <TouchableOpacity
            onPress={loadMoreLogs}
            disabled={loadingMore}
            style={{
              backgroundColor: ThemeColors.brandLight,
              padding: 12,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 8,
              marginBottom: 20
            }}
          >
            {loadingMore ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ fontFamily: Fonts.bold, color: '#FFFFFF' }}>{t('Load More')}</Text>
            )}
          </TouchableOpacity>
        )}
          </>
        }
      />

      {/* FAB FOR ADDING ENTRY */}
      {!isTodayLocked && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push(`/(tabs)/business/customers/${customerId}/add-entry`)}
          activeOpacity={0.9}
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.creamBorder,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: ThemeColors.brandDark,
  },
  customerPhone: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: ThemeColors.textSecondary,
    marginTop: 2,
  },
  balanceBadge: {
    backgroundColor: ThemeColors.brandDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  balanceAmount: {
    fontFamily: Fonts.display,
    fontSize: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  actionText: {
    color: '#FFF',
    fontFamily: Fonts.bold,
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 1,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: ThemeColors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  logSection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: ThemeColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.creamBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: '#666',
    marginLeft: 4,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.creamCard,
    padding: 16,
    borderRadius: Radius.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  entryIndicator: {
    width: 6,
    height: 32,
    borderRadius: 3,
  },
  entryMain: {
    flex: 1,
    marginLeft: 16,
  },
  entryDesc: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: ThemeColors.textPrimary,
  },
  entryTime: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  entryAmount: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  dayFooter: {
    backgroundColor: 'rgba(201,136,58,0.05)',
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: ThemeColors.brandMid,
  },
  footerValue: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: ThemeColors.textPrimary,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ThemeColors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
