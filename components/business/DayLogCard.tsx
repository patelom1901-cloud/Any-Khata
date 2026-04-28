import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/colors';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatRelativeDate, isEditAllowed } from '@/utils/dateUtils';
import type { DayLog, DayEntry } from '@/types';
import { useTranslation } from "@/hooks/useTranslation";
import { DraggableDeletionWrapper } from '@/components/DraggableDeletionWrapper';

interface DayLogCardProps {
  dayLog: DayLog;
  onAddEntry?: () => void;
  onPress?: () => void;
  onEditEntry?: (entry: DayEntry, dayLogId: string) => void;
  onDeleteEntry?: (entry: DayEntry, dayLogId: string) => void;
  onDeleteDayLog?: (dayLogId: string) => void;
  dustbinLayout?: { x: number, y: number, width: number, height: number } | null;
  onActivateDeletion?: (layout: { x: number, y: number, width: number, height: number }) => void;
  onDeactivateDeletion?: () => void;
}

export const DayLogCard = ({ 
  dayLog, 
  onAddEntry, 
  onPress,
  onEditEntry, 
  onDeleteEntry,
  onDeleteDayLog,
  dustbinLayout,
  onActivateDeletion,
  onDeactivateDeletion,
}: DayLogCardProps) => {
  const { t } = useTranslation();
  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return dateString === today;
  }

  const editable = isToday(dayLog.date);


  // Filter out deleted entries
  const activeEntries = (dayLog.entries || []).filter(e => !e.is_deleted);

  if (activeEntries.length === 0 && !editable) return null;

  const cardContent = (
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
        <View style={styles.totalContainer}>
           <Text style={styles.totalLabel}>Total: </Text>
           <Text style={styles.totalAmount}>{formatCurrency(dayLog.dayTotal)}</Text>
        </View>
      </View>

      <View style={styles.entriesList}>
        {activeEntries.map((entry) => {
          const entryContent = (
            <View style={styles.entryRow}>
              <View style={styles.entryMain}>
                <Text style={styles.entryDescription}>{entry.description}</Text>
                {entry.quantity && entry.quantity > 0 && (
                  <Text style={styles.entryQty}>Qty: {entry.quantity}</Text>
                )}
              </View>
              <View style={styles.entryRight}>
                <Text style={[
                  styles.entryAmount,
                  entry.type === 'got' || entry.type === 'credit' ? styles.gotAmount : styles.gaveAmount
                ]}>
                  {entry.type === 'got' || entry.type === 'credit' ? '-' : ''}
                  ₹{entry.amount.toLocaleString('en-IN')}
                </Text>
                {editable && onEditEntry && (
                  <TouchableOpacity 
                    onPress={() => onEditEntry(entry, dayLog.dayLogId)}
                    style={styles.editButton}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );

          if (editable && onDeleteEntry && onActivateDeletion && onDeactivateDeletion) {
            return (
              <DraggableDeletionWrapper
                key={entry.id}
                dustbinLayout={dustbinLayout}
                onActivate={onActivateDeletion}
                onDeactivate={onDeactivateDeletion}
                onDelete={() => onDeleteEntry(entry, dayLog.dayLogId)}
              >
                {entryContent}
              </DraggableDeletionWrapper>
            );
          }

          return <View key={entry.id}>{entryContent}</View>;
        })}
      </View>

      {editable && onAddEntry && (
        <TouchableOpacity style={styles.addButton} onPress={onAddEntry}>
          <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
          <Text style={styles.addButtonText}>{t(`Add Item`)}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // If the WHOLE card is draggable (only for live days)
  if (editable && onDeleteDayLog && onActivateDeletion && onDeactivateDeletion) {
    return (
      <DraggableDeletionWrapper
        dustbinLayout={dustbinLayout}
        onActivate={onActivateDeletion}
        onDeactivate={onDeactivateDeletion}
        onDelete={() => onDeleteDayLog(dayLog.dayLogId)}
      >
        {cardContent}
      </DraggableDeletionWrapper>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  date: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  totalAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  entriesList: {
    gap: Spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  entryMain: {
    flex: 1,
  },
  entryDescription: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  entryQty: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  entryAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  gaveAmount: {
    color: Colors.danger,
  },
  gotAmount: {
    color: Colors.success,
  },
  editButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
