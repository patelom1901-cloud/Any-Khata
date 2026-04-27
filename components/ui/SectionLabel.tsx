import { Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

export const SectionLabel = ({ children }: { children: string }) => (
  <Text style={styles.label}>{children}</Text>
);

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
});
