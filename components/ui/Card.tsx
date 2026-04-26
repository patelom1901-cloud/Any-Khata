import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { Colors, Spacing } from '../../constants/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: keyof typeof Spacing;
}

export const Card = ({ children, padding = 'lg', style, ...rest }: CardProps) => {
  return (
    <View style={[styles.card, { padding: Spacing[padding] }, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});
