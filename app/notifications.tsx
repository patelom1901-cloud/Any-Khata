import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from "../hooks/useTranslation";
import { Colors as ThemeColors, Fonts, Radius } from '@/constants/theme';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/colors';
import { WavyHeader } from '@/components/ui/WavyHeader';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';

const STORAGE_KEY = '@anykhata_notifications';

interface NotificationPrefs {
  pushEnabled: boolean;
  newEntry: boolean;
  paymentReceived: boolean;
  balanceReminder: boolean;
  appUpdates: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  pushEnabled: true,
  newEntry: true,
  paymentReceived: true,
  balanceReminder: false,
  appUpdates: true,
};

export default function NotificationsScreen() {
    const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPrefs(JSON.parse(stored));
        }
      } catch (e) {
        // use defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    // If master toggle is turned off, disable all sub-preferences
    if (key === 'pushEnabled' && !value) {
      updated.newEntry = false;
      updated.paymentReceived = false;
      updated.balanceReminder = false;
      updated.appUpdates = false;
    }
    setPrefs(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      // silently fail
    }
  };

  const renderRow = (
    icon: string,
    label: string,
    description: string,
    prefKey: keyof NotificationPrefs,
    disabled = false,
    index = 0
  ) => (
    <Animated.View 
      entering={FadeInRight.delay(300 + index * 50).duration(400)}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: disabled ? ThemeColors.creamBorder : 'rgba(201,136,58,0.1)' }]}>
          <MaterialIcons
            name={icon as any}
            size={20}
            color={disabled ? ThemeColors.textMuted : ThemeColors.brandLight}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, disabled && styles.textDisabled]}>{t(label)}</Text>
          <Text style={[styles.rowDesc, disabled && styles.textDisabled]}>{t(description)}</Text>
        </View>
      </View>
      <Switch
        value={prefs[prefKey]}
        onValueChange={(val) => updatePref(prefKey, val)}
        disabled={disabled}
        trackColor={{ false: ThemeColors.creamBorder, true: ThemeColors.brandLight }}
        thumbColor={Platform.OS === 'android' ? ThemeColors.creamCard : undefined}
      />
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
      <Stack.Screen options={{ headerShown: false }} />

      <WavyHeader>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={ThemeColors.textOnDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t(`Notifications`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </WavyHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* MASTER TOGGLE */}
        <Animated.View 
          entering={FadeInUp.delay(100).duration(500)}
          style={styles.masterCard}
        >
          <View style={styles.masterLeft}>
            <View style={styles.masterIconCircle}>
              <MaterialIcons name="notifications-active" size={28} color={ThemeColors.brandLight} />
            </View>
            <View style={styles.masterText}>
              <Text style={styles.masterLabel}>{t(`Push Notifications`)}</Text>
              <Text style={styles.masterDesc}>
                {prefs.pushEnabled ? t('Notifications are enabled') : t('All notifications are off')}
              </Text>
            </View>
          </View>
          <Switch
            value={prefs.pushEnabled}
            onValueChange={(val) => updatePref('pushEnabled', val)}
            trackColor={{ false: ThemeColors.creamBorder, true: ThemeColors.brandLight }}
            thumbColor={Platform.OS === 'android' ? ThemeColors.creamCard : undefined}
          />
        </Animated.View>

        {/* NOTIFICATION TYPES */}
        <Animated.Text 
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.groupLabel}
        >
          {t(`Notification Types`)}
        </Animated.Text>
        
        <Animated.View 
          entering={FadeInDown.delay(250).duration(500)}
          style={styles.card}
        >
          {renderRow(
            'add-circle-outline',
            'New Entry',
            'When a new transaction is added to your khata',
            'newEntry',
            !prefs.pushEnabled,
            0
          )}
          <View style={styles.divider} />
          {renderRow(
            'payments',
            'Payment Received',
            'When a customer makes a payment',
            'paymentReceived',
            !prefs.pushEnabled,
            1
          )}
          <View style={styles.divider} />
          {renderRow(
            'alarm',
            'Balance Reminders',
            'Periodic reminders for outstanding balances',
            'balanceReminder',
            !prefs.pushEnabled,
            2
          )}
          <View style={styles.divider} />
          {renderRow(
            'system-update',
            'App Updates',
            'News about new features and improvements',
            'appUpdates',
            !prefs.pushEnabled,
            3
          )}
        </Animated.View>

        <Animated.Text 
          entering={FadeInUp.delay(600).duration(400)}
          style={styles.footerNote}
        >
          {t('Notification preferences are saved locally on this device. To manage system-level notification permissions, go to your device Settings → Any Khata → Notifications.')}
        </Animated.Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: ThemeColors.textOnDark,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  masterCard: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 24,
  },
  masterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201,136,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterText: {
    marginLeft: 16,
    flex: 1,
  },
  masterLabel: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: ThemeColors.textPrimary,
  },
  masterDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: ThemeColors.textSecondary,
    marginTop: 2,
  },
  groupLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: ThemeColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    marginLeft: 14,
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: ThemeColors.textPrimary,
  },
  rowDesc: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: ThemeColors.textSecondary,
    marginTop: 2,
  },
  textDisabled: {
    color: ThemeColors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: ThemeColors.creamBorder,
    marginLeft: 54,
  },
  footerNote: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: ThemeColors.textSecondary,
    lineHeight: 18,
    marginTop: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
