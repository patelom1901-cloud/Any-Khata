import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatRelativeDate, isEditAllowed } from '../../utils/dateUtils';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import type { DayLog } from '../../types';
import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  dayLog: DayLog;
  onAddEntry?: () => void;
  onPress?: () => void;
}

export const DayLogCard = ({ dayLog, onAddEntry, onPress }: Props) => {
    const { t } = useTranslation();
  const editable = isEditAllowed(dayLog.date) && !dayLog.isLocked;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <Text style={styles.date}>{formatRelativeDate(dayLog.date)}</Text>
          {dayLog.isLocked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="lock" size={16} color={Colors.textMuted} />
              <Text style={{ fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' }}>{t('daylog.past_locked')}</Text>
            </View>
          ) : isEditAllowed(dayLog.date) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryPale, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 }}>
              <MaterialCommunityIcons name="pencil" size={12} color={Colors.primary} />
              <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: 'bold' }}>{t('daylog.live')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.total}>{formatCurrency(dayLog.dayTotal)}</Text>
      </View>

      <View style={styles.divider} />

      {dayLog.entries.map((entry) => (
        <View key={entry.id} style={styles.entryContainer}>
          <View style={styles.entryRow}>
            <MaterialCommunityIcons 
              name={entry.type === 'got' ? "arrow-down-circle" : "arrow-up-circle"} 
              size={16} 
              color={entry.type === 'got' ? Colors.success : Colors.primary} 
              style={styles.entryIcon}
            />
            <Text style={styles.description} numberOfLines={1}>{entry.description}</Text>
            <Text style={[
              styles.amount, 
              entry.type === 'got' && styles.gotAmount
            ]}>
              {entry.type === 'got' ? '-' : ''}{formatCurrency(entry.amount)}
            </Text>
            <Text style={styles.time}>{entry.time}</Text>
          </View>
          {entry.note ? (
            <Text style={styles.note}>{t('daylog.note')}: {entry.note}</Text>
          ) : null}
        </View>
      ))}

      {editable && onAddEntry && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.addEntryButton} onPress={onAddEntry} activeOpacity={0.7}>
            <MaterialCommunityIcons name="plus" size={18} color={Colors.primary} />
            <Text style={styles.addEntryText}>{t('daylog.add_entry')}</Text>
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  date: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  total: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.amountTotal,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  entryContainer: {
    paddingVertical: Spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIcon: {
    marginRight: Spacing.sm,
  },
  description: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  amount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  gotAmount: {
    color: Colors.success,
  },
  note: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingLeft: 24, // width of icon + marginRight
    marginTop: 2,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
    minWidth: 40,
    textAlign: 'right',
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  addEntryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
