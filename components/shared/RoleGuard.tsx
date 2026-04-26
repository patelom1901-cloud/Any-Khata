import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, Spacing } from '../../constants/colors';

interface Props {
  requiredRole: 'owner' | 'customer';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard = ({ requiredRole, children, fallback }: Props) => {
  const hasRole = useAuthStore((state) => state.hasRole);

  if (!hasRole(requiredRole)) {
    return fallback ? <>{fallback}</> : (
      <View style={styles.container}>
        <Text style={styles.text}>
          {requiredRole === 'owner'
            ? 'You need an active business to access this.'
            : 'You are not a customer of any business yet.'}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  text: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
