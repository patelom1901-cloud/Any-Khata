import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCustomer, getCustomerDayLogs, addGotEntryToDayLog, recalcAndUpdateCustomerBalance } from '../../../../../lib/database';
import { BalanceSummary } from '../../../../../components/business/BalanceSummary';
import { DayLogCard } from '../../../../../components/business/DayLogCard';
import { LoadingSpinner } from '../../../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Colors, FontSize, FontWeight, Spacing } from '../../../../../constants/colors';
// businessStore not needed here — business_id is read from the fetched customer object
import { getTodayString } from '../../../../../utils/dateUtils';
import type { Customer, DayLog } from '../../../../../types';
import { useTranslation } from "../../../../../hooks/useTranslation";
import { isValidAmount } from '../../../../../utils/currencyUtils';

export default function CustomerDetailScreen() {
  const { t } = useTranslation();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [dayLogs, setDayLogs] = useState<DayLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Got Entry Modal State
  const [isGotModalVisible, setIsGotModalVisible] = useState(false);
  const [gotAmount, setGotAmount] = useState('');
  const [gotNote, setGotNote] = useState('');
  const [savingGot, setSavingGot] = useState(false);

  const fetchData = useCallback(async () => {
    if (!customerId) return;
    try {
      const [cust, rawLogs] = await Promise.all([
        getCustomer(customerId),
        getCustomerDayLogs(customerId),
      ]);
      setCustomer(cust);
      // Parse entries JSON string → array for each day_log
      const parsedLogs = (rawLogs || []).map((doc: any) => ({
        dayLogId: doc.$id,
        businessId: doc.business_id,
        customerId: doc.customer_id,
        date: doc.date,
        dayTotal: typeof doc.day_total === 'number' && !isNaN(doc.day_total) ? doc.day_total : 0,
        isLocked: doc.is_locked || false,
        createdAt: doc.created_at,
        entries: (() => {
          try {
            const raw = doc.entries;
            return Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
          } catch {
            return [];
          }
        })(),
      }));
      setDayLogs(parsedLogs);
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to load customer`));
    } finally {
      setLoading(false);
    }
  }, [customerId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecordGot = async () => {
    const amount = parseFloat(gotAmount);
    if (!isValidAmount(amount)) {
      Alert.alert(t(`Error`), t(`Enter a valid amount`));
      return;
    }
    // Use business_id from the fetched customer (always available by this point)
    const business_id = customer?.businessId;
    if (!business_id || !customerId || !amount) {
      Alert.alert(t(`Error`), t(`Missing required data`));
      return;
    }

    setSavingGot(true);
    try {
      await addGotEntryToDayLog(customerId, business_id, amount, gotNote.trim());
      await recalcAndUpdateCustomerBalance(customerId);
      Alert.alert(t(`Success`), t(`Payment recorded successfully!`));
      setIsGotModalVisible(false);
      setGotAmount('');
      setGotNote('');
      fetchData(); // Refresh ledger
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to record payment`));
    } finally {
      setSavingGot(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer) return <EmptyState message="Customer not found" icon="👤" />;

  let totalGave = 0;
  let totalGot = 0;
  dayLogs.forEach((log) => {
    (log.entries || []).forEach((entry: any) => {
      const amt = Number(entry.amount) || 0;
      // Handle both new 'gave'/'got' and legacy 'debit'/'credit'
      if (entry.type === 'gave' || entry.type === 'debit') {
        totalGave += amt;
      } else if (entry.type === 'got' || entry.type === 'credit') {
        totalGot += amt;
      }
    });
  });

  const totalDue = totalGave - totalGot;
  
  const todayString = getTodayString();
  const todayLog = dayLogs.find(l => l.date === todayString);
  const isTodayLocked = todayLog?.isLocked;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{customer.name}</Text>
          <Text style={styles.phone}>{customer.phone}</Text>
          {customer.linkCode && (
            <Text style={[styles.phone, { color: Colors.primary, marginTop: 2, fontWeight: '600' }]}>
              Link code: {customer.linkCode}
            </Text>
          )}
        </View>
      </View>

      {/* Balance Summary */}
      <BalanceSummary 
        totalBilled={totalGave} 
        totalPaid={totalGot} 
        totalDue={totalDue} 
      />

      {/* Action Buttons */}
      {!isTodayLocked && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.entryButton]}
            onPress={() =>
              router.push(`/(tabs)/business/customers/${customerId}/add-entry`)
            }
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>{t(`Add Entry`)} (Gave)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.paymentButton]}
            onPress={() => setIsGotModalVisible(true)}
          >
            <MaterialCommunityIcons name="cash-check" size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>{t(`Record Payment`)} (Got)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Day Logs */}
      <ScrollView style={styles.logsList} showsVerticalScrollIndicator={false}>
        {dayLogs.length === 0 ? (
          <EmptyState message="No entries yet" description="Tap 'Add Entry' to record today's transactions" icon="📝" />
        ) : (
          dayLogs.map((log) => (
            <DayLogCard
              key={log.dayLogId}
              dayLog={log}
              onAddEntry={() =>
                router.push(`/(tabs)/business/customers/${customerId}/add-entry`)
              }
            />
          ))
        )}
      </ScrollView>

      {/* Got Entry Modal */}
      <Modal
        visible={isGotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t(`Record Payment`)} (Got)</Text>
            <Text style={styles.modalSubtitle}>{t(`Enter the amount received from customer.`)}</Text>
            
            <Input
              label={t(`Amount (₹)`)}
              value={gotAmount}
              onChangeText={setGotAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              autoFocus
            />
            
            <Input
              label={t(`Note (Optional)`)}
              value={gotNote}
              onChangeText={setGotNote}
              placeholder={t(`e.g. Received via GPay`)}
            />

            <View style={styles.modalActions}>
              <Button
                title={t(`Cancel`)}
                onPress={() => setIsGotModalVisible(false)}
                variant="ghost"
                style={{ flex: 1 }}
              />
              <Button
                title={t(`Save`)}
                onPress={handleRecordGot}
                loading={savingGot}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  phone: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  entryButton: {
    backgroundColor: Colors.primary,
  },
  paymentButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  logsList: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
