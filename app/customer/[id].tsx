import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Linking,
  Share,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';

import { useAuthStore } from '../../store/authStore';
import {
  getCustomer,
  getBusiness,
  getDayLogsForCustomer,
  upsertTodayDayLog,
  recalcAndUpdateCustomerBalance,
  deleteCustomer,
} from '../../lib/database';
import { formatRelativeDate } from '../../utils/dateUtils';
import { useTranslation } from "../../hooks/useTranslation";
import { WavyHeader } from '../../components/ui/WavyHeader';
import { Colors as ThemeColors, Fonts, Radius } from '../../constants/theme';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function CustomerLedgerScreen() {
    const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  // ── Data state ────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<any>(null);
  const [dayLogs, setDayLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // ── Modal / form state ────────────────────────────────────────────────────
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [addEntryAmount, setAddEntryAmount] = useState('');
  const [addEntryDesc, setAddEntryDesc] = useState('');
  const [entryType, setEntryType] = useState<'credit' | 'payment'>('credit');

  // ── Fetch day_logs ────────────────────────────────────────────────────────
  const fetchDayLogs = useCallback(async (customerId: string) => {
    const logs = await getDayLogsForCustomer(undefined, customerId);
    setDayLogs(logs);
  }, []);

  // ── Initial data load ─────────────────────────────────────────────────────
  const loadScreen = useCallback(async () => {
    if (!id || !user) return;
    try {
      setLoading(true);
      setError(null);

      const customerDoc = await getCustomer(id);
      if (!customerDoc) {
        setError(t(`Customer not found.`));
        return;
      }
      setCustomer(customerDoc);

      const linkedUserId: string = (customerDoc as any).linked_user_id ?? '';
      const ownerId: string = (customerDoc as any).owner_id ?? '';

      if (user.userId === linkedUserId) {
        setIsReadOnly(true);
        setIsOwner(false);
      } else if (user.userId === ownerId) {
        setIsReadOnly(false);
        setIsOwner(true);
      } else {
        const business = await getBusiness((customerDoc as any).business_id ?? '');
        const bizOwnerId: string = (business as any)?.owner_id ?? '';
        const ownerConfirmed = user.userId === bizOwnerId;
        setIsReadOnly(!ownerConfirmed);
        setIsOwner(ownerConfirmed);
      }

      await fetchDayLogs(id);
    } catch (err: any) {
      setError(err?.message ?? t(`Failed to load customer data.`));
    } finally {
      setLoading(false);
    }
  }, [id, user, fetchDayLogs]);

  useEffect(() => {
    loadScreen();
  }, [loadScreen]);

  const handleSaveEntry = async () => {
    const parsedAmount = parseFloat(addEntryAmount);
    if (!addEntryAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t(`Enter Amount`), t(`Please enter a valid amount.`));
      return;
    }
    if (!customer) return;

    setSaving(true);
    try {
      const dbType: 'got' | 'gave' = entryType === 'payment' ? 'got' : 'gave';

      await upsertTodayDayLog(
        customer.$id,
        (customer as any).business_id ?? '',
        {
          description: addEntryDesc.trim() || 'Entry',
          amount: parsedAmount,
          type: dbType,
        }
      );

      await recalcAndUpdateCustomerBalance(customer.$id);

      const refreshed = await getCustomer(customer.$id);
      if (refreshed) setCustomer(refreshed);
      await fetchDayLogs(customer.$id);

      setShowAddEntry(false);
      setAddEntryAmount('');
      setAddEntryDesc('');
      setEntryType('credit');
    } catch (err: any) {
      Alert.alert(t(`Error`), err?.message ?? t(`Failed to save entry. Please try again.`));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = () => {
    setShowMenu(false);
    Alert.alert(
      t(`Remove Customer`),
      t(`This will permanently remove this customer and all their entries. This cannot be undone.`),
      [
        { text: t(`Cancel`), style: 'cancel' },
        {
          text: t(`Remove`),
          style: 'destructive',
          onPress: async () => {
            if (!customer) return;
            setSaving(true);
            try {
              await deleteCustomer(customer.$id);
              router.replace('/(tabs)/khata');
            } catch (err: any) {
              Alert.alert(t(`Error`), err?.message ?? t(`Failed to remove customer. Please try again.`));
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color={ThemeColors.brandLight} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerView}>
          <MaterialIcons name="error-outline" size={48} color={ThemeColors.creditRed} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>{t(`← Go Back`)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const customerName: string = customer?.name ?? '';
  const customerPhone: string = customer?.phone ?? '';
  const customerBalance: number = (customer as any)?.balance ?? 0;
  const customerInitials: string = getInitials(customerName);

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
      <Stack.Screen options={{ headerShown: false }} />

      <WavyHeader>
        <View style={styles.headerContent}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <MaterialIcons name="arrow-back" size={24} color={ThemeColors.textOnDark} />
            </TouchableOpacity>

            <View style={styles.customerMiniInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{customerInitials}</Text>
              </View>
              <View style={styles.customerNameCol}>
                <Text style={styles.customerNameText}>{customerName}</Text>
                <Text style={styles.customerPhoneText}>{customerPhone}</Text>
              </View>
            </View>
          </View>

          <View style={styles.appBarRight}>
            <TouchableOpacity
              onPress={() => customerPhone ? Linking.openURL('tel:' + customerPhone) : null}
              style={styles.callButton}
            >
              <MaterialIcons name="call" size={22} color={ThemeColors.textOnDark} />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                onPress={() => setShowMenu(true)}
                style={styles.iconButton}
              >
                <MaterialIcons name="more-vert" size={24} color={ThemeColors.textOnDark} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </WavyHeader>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroContainer}>
          <View style={styles.heroGradient}>
            <Text style={styles.balanceLabel}>{t(`Total Net Balance`)}</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.balanceAmount}>
                {customerBalance.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.buttonRow}>
              {!isReadOnly && (
                <TouchableOpacity
                  style={styles.recordPaymentBtn}
                  onPress={() => setShowAddEntry(true)}
                >
                  <MaterialIcons name="add-circle" size={18} color={ThemeColors.brandDark} />
                  <Text style={styles.recordPaymentText}>{t(`Add New Entry`)}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.shareBtn, isReadOnly && { flex: 1, height: 54 }]}
                onPress={() =>
                  Share.share({
                    message: `${customerName} balance at our shop is ₹${customerBalance.toLocaleString('en-IN')}. Please check details in Any Khata app.`,
                  })
                }
              >
                <MaterialIcons name="share" size={20} color="#ffffff" />
                {isReadOnly && <Text style={{ color: '#fff', marginLeft: 8, fontFamily: Fonts.bold }}>{t(`Share Statement`)}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <View style={styles.ledgerHeader}>
          {dayLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={52} color={ThemeColors.creamBorder} />
              <Text style={styles.emptyStateText}>{t(`No entries yet`)}</Text>
              {!isReadOnly && (
                <Text style={styles.emptyStateSubText}>
                  {t(`Tap + to record the first entry`)}</Text>
              )}
            </View>
          ) : (
            dayLogs.map((group: any, gIdx: number) => (
              <Animated.View 
                key={group.dayLogId} 
                entering={FadeInDown.delay(200 + gIdx * 100).duration(500)}
                style={styles.dayGroup}
              >
                <View style={styles.dateHeaderRow}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateTabText}>
                      {formatRelativeDate(group.date)}
                    </Text>
                  </View>
                </View>

                {group.entries.map((entry: any) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.entryCard,
                      group.is_locked ? styles.entryCardLocked : styles.entryCardActive,
                    ]}
                  >
                    <View style={styles.entryLeft}>
                      <View
                        style={[
                          styles.iconCircle,
                          group.is_locked
                            ? { backgroundColor: ThemeColors.creamBorder }
                            : entry.type === 'gave'
                            ? { backgroundColor: 'rgba(186,26,26,0.1)' }
                            : { backgroundColor: 'rgba(0,108,73,0.1)' },
                        ]}
                      >
                        <MaterialIcons
                          name={
                            group.is_locked
                              ? 'lock'
                              : entry.type === 'gave'
                              ? 'call-made'
                              : 'call-received'
                          }
                          size={16}
                          color={
                            group.is_locked
                              ? ThemeColors.textMuted
                              : entry.type === 'gave'
                              ? ThemeColors.creditRed
                              : ThemeColors.paymentGreen
                          }
                        />
                      </View>
                      <View style={styles.entryTextCol}>
                        <Text
                          style={[
                            styles.descriptionText,
                            group.is_locked && { color: ThemeColors.textMuted },
                          ]}
                        >
                          {entry.description}
                        </Text>
                        <Text style={styles.timeText}>{entry.time}</Text>
                      </View>
                    </View>

                    <View style={styles.entryRight}>
                      <Text
                        style={[
                          styles.amountText,
                          group.is_locked
                            ? { color: ThemeColors.textMuted }
                            : entry.type === 'gave'
                            ? { color: ThemeColors.creditRed }
                            : { color: ThemeColors.paymentGreen },
                        ]}
                      >
                        ₹{Number(entry.amount).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={styles.dayTotalRow}>
                  <Text style={styles.dayTotalLabel}>{t(`Day Total:`)}</Text>
                  <Text
                    style={[
                      styles.dayTotalAmount,
                      group.dayTotal < 0
                        ? { color: ThemeColors.creditRed }
                        : { color: ThemeColors.textSecondary },
                    ]}
                  >
                    ₹{Math.abs(group.dayTotal).toLocaleString('en-IN')}
                  </Text>
                </View>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {!isReadOnly && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddEntry(true)}
        >
          <MaterialIcons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      <Modal
        visible={showMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.dragHandle} />
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={handleDeleteCustomer}
            >
              <MaterialIcons name="person-remove" size={22} color={ThemeColors.creditRed} />
              <Text style={styles.actionSheetItemTextDanger}>{t(`Remove Customer`)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetItem, styles.actionSheetCancel]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.actionSheetCancelText}>{t(`Cancel`)}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showAddEntry}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddEntry(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddEntry(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.sheetContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.dragHandle} />

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{t(`New Entry`)}</Text>
                <TouchableOpacity onPress={() => setShowAddEntry(false)}>
                  <MaterialIcons name="close" size={22} color={ThemeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.amountInputSection}>
                <Text style={styles.amountLabel}>{t(`AMOUNT`)}</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.sheetCurrencySymbol}>₹</Text>
                  <TextInput
                    value={addEntryAmount}
                    onChangeText={setAddEntryAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={ThemeColors.creamBorder}
                    style={styles.amountInput}
                    textAlign="center"
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.descInputContainer}>
                <MaterialIcons name="description" size={20} color={ThemeColors.brandMid} />
                <TextInput
                  value={addEntryDesc}
                  onChangeText={setAddEntryDesc}
                  placeholder={t(`What is this for? (e.g. 2kg Sugar)`)}
                  placeholderTextColor={ThemeColors.textMuted}
                  style={styles.descInput}
                />
              </View>

              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    entryType === 'credit' ? styles.toggleActiveCredit : null,
                  ]}
                  onPress={() => setEntryType('credit')}
                >
                  <MaterialIcons
                    name="call-made"
                    size={16}
                    color={entryType === 'credit' ? '#ffffff' : ThemeColors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      entryType === 'credit' ? { color: '#ffffff' } : null,
                    ]}
                  >
                    {t(`Gave (Credit)`)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    entryType === 'payment' ? styles.toggleActivePayment : null,
                  ]}
                  onPress={() => setEntryType('payment')}
                >
                  <MaterialIcons
                    name="call-received"
                    size={16}
                    color={entryType === 'payment' ? '#ffffff' : ThemeColors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      entryType === 'payment' ? { color: '#ffffff' } : null,
                    ]}
                  >
                    {t(`Got (Payment)`)}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                onPress={handleSaveEntry}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                    <Text style={styles.saveButtonText}>{t(`Save Transaction`)}</Text>
                  </>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  centerView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: ThemeColors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 24,
  },
  backLinkText: {
    color: ThemeColors.brandLight,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerMiniInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: ThemeColors.textOnDark,
  },
  customerNameCol: {
    marginLeft: 12,
  },
  customerNameText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: ThemeColors.textOnDark,
  },
  customerPhoneText: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: ThemeColors.textMuted,
    letterSpacing: 0.5,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroContainer: {
    marginHorizontal: 20,
    marginTop: -14,
    borderRadius: 24,
    backgroundColor: ThemeColors.brandDark,
    overflow: 'hidden',
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  heroGradient: {
    padding: 24,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  currencySymbol: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginRight: 4,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 42,
    fontFamily: Fonts.display,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  recordPaymentBtn: {
    flex: 1,
    height: 54,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordPaymentText: {
    color: ThemeColors.brandDark,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  shareBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ledgerHeader: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: ThemeColors.textSecondary,
  },
  emptyStateSubText: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: ThemeColors.textMuted,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dateHeaderRow: {
    marginBottom: 12,
  },
  dateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(201,136,58,0.08)',
  },
  dateTabText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: ThemeColors.brandMid,
    textTransform: 'uppercase',
  },
  entryCard: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
  },
  entryCardActive: {
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  entryCardLocked: {
    opacity: 0.7,
    backgroundColor: ThemeColors.creamBase,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: ThemeColors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  dayTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingRight: 4,
  },
  dayTotalLabel: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: ThemeColors.textMuted,
    marginRight: 6,
  },
  dayTotalAmount: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ThemeColors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 8, 3, 0.6)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: ThemeColors.creamBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  actionSheetItemTextDanger: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: ThemeColors.creditRed,
  },
  actionSheetCancel: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: ThemeColors.creamBorder,
    paddingTop: 24,
    justifyContent: 'center',
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: ThemeColors.textSecondary,
  },
  keyboardView: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: Fonts.extrabold,
    color: ThemeColors.brandDark,
  },
  amountInputSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  amountLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: ThemeColors.brandMid,
    letterSpacing: 1,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCurrencySymbol: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: ThemeColors.brandDark,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 56,
    fontFamily: Fonts.display,
    color: ThemeColors.textPrimary,
    minWidth: 120,
  },
  descInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.creamBase,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
  },
  descInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: ThemeColors.textPrimary,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  toggleButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    backgroundColor: ThemeColors.creamCard,
  },
  toggleActiveCredit: {
    backgroundColor: ThemeColors.creditRed,
    borderColor: ThemeColors.creditRed,
  },
  toggleActivePayment: {
    backgroundColor: ThemeColors.paymentGreen,
    borderColor: ThemeColors.paymentGreen,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: ThemeColors.textPrimary,
  },
  saveButton: {
    height: 60,
    backgroundColor: ThemeColors.brandDark,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
