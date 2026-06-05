import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { Colors as ThemeColors, Fonts, Radius } from '../constants/theme';

interface ConfirmModalProps {
  /** Whether the modal is shown */
  visible: boolean;
  /** Bold title at the top of the modal card */
  title: string;
  /** Descriptive body text */
  message: string;
  /** Label for the confirm / action button */
  confirmText: string;
  /** Called when the user taps the confirm button */
  onConfirm: () => void;
  /** Called when the user taps Cancel or the overlay */
  onCancel: () => void;
  /**
   * When true the confirm button is filled red.
   * When false it is filled brandDark (dark brown).
   */
  dangerous?: boolean;
}

/**
 * ConfirmModal — shared styled confirmation dialog used for:
 *   - Delete Business
 *   - Delete Ad
 *   - Remove Customer
 *
 * Matches the existing Delete Account / Sign Out dialog style in profile.tsx.
 * Uses a semi-transparent dark overlay + white/cream rounded card.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  dangerous = true,
}: ConfirmModalProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Tapping the backdrop dismisses */}
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onCancel} />

      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, dangerous ? styles.dangerBtn : styles.darkBtn]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...RNStyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  card: {
    width: '85%',
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.xl,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    fontFamily: Fonts.extrabold,
    fontSize: 20,
    color: ThemeColors.textPrimary,
    marginBottom: 10,
  },
  message: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: ThemeColors.textSecondary,
    lineHeight: 21,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: Radius.lg,
    backgroundColor: ThemeColors.creamBase,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
  },
  cancelText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: ThemeColors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: Radius.lg,
  },
  dangerBtn: {
    backgroundColor: ThemeColors.creditRed,
  },
  darkBtn: {
    backgroundColor: ThemeColors.brandDark,
  },
  confirmText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#FFF',
  },
});
