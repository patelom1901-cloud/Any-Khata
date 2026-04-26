import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { Colors, FontSize, Spacing } from '../../constants/colors';

interface EmptyStateProps {
  message: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export const EmptyState = ({ message, description, actionLabel, onAction, icon = '📋' }: EmptyStateProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  message: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    marginTop: Spacing.md,
  },
});
