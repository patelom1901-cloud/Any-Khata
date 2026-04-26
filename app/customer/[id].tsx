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
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '../../store/authStore';
import {
  getCustomer,
  getBusiness,
  getCustomerDayLogs,
  upsertTodayDayLog,
  recalcAndUpdateCustomerBalance,
  deleteCustomer,
} from '../../lib/database';
import { formatRelativeDate } from '../../utils/dateUtils';
import { useTranslation } from "../../hooks/useTranslation";

// ─── Design tokens (unchanged) ─────────────────────────────────────────────────
const COLORS = {
  primary: '#1f108e',
  primaryFixed: '#e2dfff',
  primaryDark: '#3730a3',
  error: '#ba1a1a',
  errorLight: '#ffdad6',
  secondary: '#006c49',
  secondaryLight: '#d1fae5',
  background: '#f8f9fa',
  surface: '#ffffff',
  textPrimary: '#191c1d',
  textSecondary: '#464553',
  outline: '#777584',
  outlineLight: '#c8c4d5',
  containerLow: '#f3f4f5',
  containerHigh: '#e7e8e9',
};

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
  // UI name kept as-is; mapped to DB 'credit'|'debit' on save
  const [entryType, setEntryType] = useState<'credit' | 'payment'>('credit');

  // ── Fetch day_logs ────────────────────────────────────────────────────────
  const fetchDayLogs = useCallback(async (customerId: string) => {
    console.log('[CustomerLedger] fetchDayLogs — customerId (Appwrite $id):', customerId);
    const logs = await getCustomerDayLogs(customerId);
    // Parse entries JSON string → array for each log
    const parsed = logs.map((doc: any) => ({
      ...doc,
      parsedEntries: (() => {
        try {
          return JSON.parse(doc.entries || '[]');
        } catch {
          return [];
        }
      })(),
    }));
    setDayLogs(parsed);
  }, []);

  // ── Initial data load ─────────────────────────────────────────────────────
  const loadScreen = useCallback(async () => {
    if (!id || !user) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch customer document by $id from router params
      console.log('[CustomerLedger] loadScreen — route param id (should be Appwrite $id):', id);
      const customerDoc = await getCustomer(id);
      if (!customerDoc) {
        setError(t(`Customer not found.`));
        return;
      }
      setCustomer(customerDoc);

      // 2. Access control
      //    linked_user_id === current user → read-only (customer viewing own khata)
      //    owner_id === current user       → full edit access (business owner)
      //    Fallback: check businesses collection to confirm ownership
      const linkedUserId: string = (customerDoc as any).linked_user_id ?? '';
      const ownerId: string = (customerDoc as any).owner_id ?? '';

      if (user.userId === linkedUserId) {
        setIsReadOnly(true);
        setIsOwner(false);
      } else if (user.userId === ownerId) {
        setIsReadOnly(false);
        setIsOwner(true);
      } else {
        // Belt-and-suspenders: confirm via businesses collection
        const business = await getBusiness((customerDoc as any).business_id ?? '');
        const bizOwnerId: string = (business as any)?.owner_id ?? '';
        const ownerConfirmed = user.userId === bizOwnerId;
        setIsReadOnly(!ownerConfirmed);
        setIsOwner(ownerConfirmed);
      }

      // 3. Fetch day_logs
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

  // ── Save entry ────────────────────────────────────────────────────────────
  const handleSaveEntry = async () => {
    const parsedAmount = parseFloat(addEntryAmount);
    if (!addEntryAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t(`Enter Amount`), t(`Please enter a valid amount.`));
      return;
    }
    if (!customer) return;

    setSaving(true);
    try {
      // Map UI toggle to DB type:
      //   "Gave (Credit)" [entryType:'credit'] = business extended credit = customer OWES = DB 'debit'
      //   "Got (Payment)" [entryType:'payment'] = business received cash   = customer PAID = DB 'credit'
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

      // Recalculate and persist customer balance
      await recalcAndUpdateCustomerBalance(customer.$id);

      // Re-fetch customer (updated balance) and day_logs
      const refreshed = await getCustomer(customer.$id);
      if (refreshed) setCustomer(refreshed);
      await fetchDayLogs(customer.$id);

      // Reset form
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

  // ── Delete customer ───────────────────────────────────────────────────────
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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerView}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>{t(`← Go Back`)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────
  const customerName: string = customer?.name ?? '';
  const customerPhone: string = customer?.phone ?? '';
  const customerBalance: number = (customer as any)?.balance ?? 0;
  const customerInitials: string = getInitials(customerName);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* A. TOP APP BAR */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
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
          {isReadOnly && (
            <View style={styles.viewOnlyBadge}>
              <Text style={styles.viewOnlyText}>{t(`View Only`)}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => customerPhone ? Linking.openURL('tel:' + customerPhone) : null}
            style={styles.callButton}
          >
            <MaterialIcons name="call" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={styles.iconButton}
            >
              <MaterialIcons name="more-vert" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* B. HERO BALANCE CARD */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={['#1f108e', '#3730a3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Text style={styles.balanceLabel}>{t(`Total Net Balance`)}</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.balanceAmount}>
                {customerBalance.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.recordPaymentBtn}
                onPress={() =>
                  Alert.alert('Record Payment', 'Payment recording coming soon!', [{ text: 'OK' }])
                }
              >
                <MaterialIcons name="payments" size={18} color={COLORS.primary} />
                <Text style={styles.recordPaymentText}>{t(`Record Payment`)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() =>
                  Share.share({
                    message: `${customerName} owes ₹${customerBalance.toLocaleString('en-IN')}`,
                  })
                }
              >
                <MaterialIcons name="share" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* C. LEDGER ENTRIES */}
        <View style={styles.ledgerHeader}>
          {dayLogs.length === 0 ? (
            /* Empty state */
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={52} color={COLORS.outlineLight} />
              <Text style={styles.emptyStateText}>{t(`No entries yet`)}</Text>
              {!isReadOnly && (
                <Text style={styles.emptyStateSubText}>
                  {t(`Tap + to record the first entry`)}</Text>
              )}
            </View>
          ) : (
            dayLogs.map((group: any) => (
              <View key={group.$id} style={styles.dayGroup}>
                {/* DATE HEADER */}
                <View style={styles.dateHeaderRow}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateTabText}>
                      {formatRelativeDate(group.date)}
                    </Text>
                  </View>
                </View>

                {/* ENTRY CARDS */}
                {group.parsedEntries.map((entry: any) => (
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
                            ? { backgroundColor: COLORS.containerHigh }
                            : entry.type === 'gave'
                            ? { backgroundColor: COLORS.errorLight }
                            : { backgroundColor: COLORS.secondaryLight },
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
                          size={18}
                          color={
                            group.is_locked
                              ? COLORS.outline
                              : entry.type === 'gave'
                              ? COLORS.error
                              : COLORS.secondary
                          }
                        />
                      </View>
                      <View style={styles.entryTextCol}>
                        <Text
                          style={[
                            styles.descriptionText,
                            group.is_locked && { color: COLORS.outline },
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
                            ? { color: COLORS.outline }
                            : entry.type === 'gave'
                            ? { color: COLORS.error }
                            : { color: COLORS.secondary },
                        ]}
                      >
                        ₹{Number(entry.amount).toLocaleString('en-IN')}
                      </Text>
                      {!group.is_locked && !isReadOnly && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() =>
                            Alert.alert('Edit Entry', 'Entry editing coming soon!', [
                              { text: 'OK' },
                            ])
                          }
                        >
                          <MaterialIcons name="edit" size={18} color={COLORS.outline} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                {/* DAY TOTAL ROW */}
                <View style={styles.dayTotalRow}>
                  <Text style={styles.dayTotalLabel}>{t(`Day Total:`)}</Text>
                  <Text
                    style={[
                      styles.dayTotalAmount,
                      group.total < 0
                        ? { color: COLORS.error }
                        : { color: COLORS.textSecondary },
                    ]}
                  >
                    ₹{Math.abs(group.total).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* E. FAB — hidden in read-only mode */}
      {!isReadOnly && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddEntry(true)}
        >
          <MaterialIcons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* C. OWNER ACTION SHEET */}
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
              <MaterialIcons name="person-remove" size={22} color={COLORS.error} />
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

      {/* D. ADD ENTRY BOTTOM SHEET (Modal) */}
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
              {/* DRAG HANDLE */}
              <View style={styles.dragHandle} />

              {/* SHEET HEADER */}
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{t(`Add Entry for`)}{customerName}</Text>
                <TouchableOpacity onPress={() => setShowAddEntry(false)}>
                  <MaterialIcons name="close" size={22} color={COLORS.outline} />
                </TouchableOpacity>
              </View>

              {/* AMOUNT INPUT */}
              <View style={styles.amountInputSection}>
                <Text style={styles.amountLabel}>{t(`AMOUNT TO RECORD`)}</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.sheetCurrencySymbol}>₹</Text>
                  <TextInput
                    value={addEntryAmount}
                    onChangeText={setAddEntryAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.primaryFixed}
                    style={styles.amountInput}
                    textAlign="center"
                  />
                </View>
              </View>

              {/* DESCRIPTION INPUT */}
              <View style={styles.descInputContainer}>
                <MaterialIcons name="description" size={20} color={COLORS.outline} />
                <TextInput
                  value={addEntryDesc}
                  onChangeText={setAddEntryDesc}
                  placeholder={t(`e.g., 6 cups chai`)}
                  placeholderTextColor={COLORS.outline}
                  style={styles.descInput}
                />
              </View>

              {/* ENTRY TYPE TOGGLE */}
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
                    color={entryType === 'credit' ? '#ffffff' : COLORS.textPrimary}
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
                    color={entryType === 'payment' ? '#ffffff' : COLORS.textPrimary}
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

              {/* SAVE BUTTON */}
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                onPress={handleSaveEntry}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#ffffff" />
                    <Text style={styles.saveButtonText}>{t(`Save Entry`)}</Text>
                  </>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles (unchanged from original) ─────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  backLink: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backLinkText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
  },
  emptyStateText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.outline,
  },
  emptyStateSubText: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.outlineLight,
  },
  viewOnlyBadge: {
    backgroundColor: COLORS.primaryFixed,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
    justifyContent: 'center',
  },
  viewOnlyText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  topAppBar: {
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconButton: {
    padding: 4,
  },
  customerMiniInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  customerNameCol: {
    marginLeft: 12,
  },
  customerNameText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  customerPhoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.outline,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: 24,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  currencySymbol: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  recordPaymentBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordPaymentText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  shareBtn: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerHeader: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  dayGroup: {
    marginBottom: 0,
  },
  dateHeaderRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateBadge: {
    backgroundColor: COLORS.containerHigh,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dateTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 10,
    borderRadius: 20,
  },
  entryCardActive: {
    backgroundColor: COLORS.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  entryCardLocked: {
    backgroundColor: COLORS.containerLow,
    opacity: 0.75,
    borderWidth: 1,
    borderColor: COLORS.outlineLight,
    borderStyle: 'dashed',
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTextCol: {
    marginLeft: 0,
    flex: 1,
  },
  descriptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 2,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountText: {
    fontSize: 17,
    fontWeight: '800',
  },
  editButton: {
    padding: 6,
  },
  dayTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  dayTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayTotalAmount: {
    fontSize: 11,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31,16,142,0.2)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 48,
    height: 6,
    backgroundColor: COLORS.outlineLight,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  amountInputSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sheetCurrencySymbol: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    opacity: 0.5,
  },
  amountInput: {
    width: 180,
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
    backgroundColor: 'transparent',
    padding: 0,
  },
  descInputContainer: {
    backgroundColor: COLORS.containerLow,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  descInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.containerLow,
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 12,
  },
  toggleActiveCredit: {
    backgroundColor: COLORS.error,
  },
  toggleActivePayment: {
    backgroundColor: COLORS.secondary,
  },
  toggleText: {
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  actionSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineLight,
  },
  actionSheetItemTextDanger: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
  },
  actionSheetCancel: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 4,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
});
