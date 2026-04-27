import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getDayLogsForCustomer, getCustomer } from '../../../../lib/database';
import { DayLogCard } from '../../../../components/business/DayLogCard';
import { BalanceSummary } from '../../../../components/business/BalanceSummary';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Spacing } from '../../../../constants/colors';
import type { DayLog, Customer } from '../../../../types';
import { useTranslation } from "../../../../hooks/useTranslation";

/**
 * Customer's ledger view for a specific business
 * READ ONLY — customer can view but not edit
 */
export default function CustomerLedgerScreen() {
    const { t } = useTranslation();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  // TODO: Get current customer's customerId from auth store
  const customerId = '';

  const [dayLogs, setDayLogs] = useState<DayLog[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId || !customerId) return;

    const fetchData = async () => {
      try {
        const [logs, cust] = await Promise.all([
          getDayLogsForCustomer(businessId, customerId),
          getCustomer(customerId),
        ]);
        setDayLogs(logs);
        setCustomer(cust);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [businessId, customerId]);

  if (loading) return <LoadingSpinner />;

  
  
  let totalBilled = 0;
  let totalPaid = 0;
  dayLogs.forEach(log => {
    log.entries.forEach(entry => {
      if (entry.type === 'gave') totalBilled += entry.amount;
      if (entry.type === 'got') totalPaid += entry.amount;
    });
  });
  const totalDue = totalBilled - totalPaid;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t(`My Khata`)}</Text>
      </View>

      {/* Balance Summary */}
      <BalanceSummary totalBilled={totalBilled} totalPaid={totalPaid} totalDue={Math.max(0, totalDue)} />

      {/* Day Logs */}
      <ScrollView style={styles.logsList} showsVerticalScrollIndicator={false}>
        {dayLogs.length === 0 ? (
          <EmptyState message="No entries yet" description="Your transactions will appear here" icon="📒" />
        ) : (
          dayLogs.map((log) => (
            <DayLogCard key={log.dayLogId} dayLog={log} onAddEntry={() => {}} />
          ))
        )}
      </ScrollView>
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
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  logsList: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
});
