import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from "../../hooks/useTranslation";

export default function LoginScreen() {
    const { t } = useTranslation();
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>{t('common.emoji_notebook')}</Text>
        <Text style={styles.title}>{t('common.app_name')}</Text>
        <Text style={styles.tagline}>{t('login.tagline')}</Text>
      </View>

      <View style={styles.features}>
        <FeatureItem text={t('login.feature_track')} />
        <FeatureItem text={t('login.feature_daily')} />
        <FeatureItem text={t('login.feature_realtime')} />
      </View>

      <Button
        title={t('login.google_btn')}
        onPress={login}
        variant="primary"
        fullWidth
        style={styles.button}
      />

      <Text style={styles.footer}>
        {t('login.footer')}</Text>
    </View>
  );
}

const FeatureItem = ({ text }: { text: string }) => {
  const { t } = useTranslation();
  return (
  <View style={styles.featureRow}>
    <Text style={styles.featureCheck}>{t('common.check_mark')}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  logo: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  features: {
    marginBottom: Spacing['3xl'],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureCheck: {
    fontSize: FontSize.lg,
    color: Colors.success,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.md,
  },
  featureText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  button: {
    marginBottom: Spacing.lg,
  },
  footer: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
