import React from 'react';
import { Text, StyleSheet, type TextProps } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';

interface BadgeProps extends TextProps {
  text: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

export const Badge = ({ text, variant = 'default', style }: BadgeProps) => {
  return (
    <Text style={[styles.badge, styles[variant], style]}>
      {text}
    </Text>
  );
};

const styles = StyleSheet.create({
  badge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  default: {
    backgroundColor: Colors.primaryPale,
    color: Colors.primary,
  },
  success: {
    backgroundColor: Colors.successLight,
    color: Colors.success,
  },
  danger: {
    backgroundColor: Colors.dangerLight,
    color: Colors.danger,
  },
  warning: {
    backgroundColor: Colors.warningLight,
    color: Colors.warning,
  },
});
