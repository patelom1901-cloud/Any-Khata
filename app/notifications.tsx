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

const COLORS = {
  primary: '#1f108e',
  primaryFixed: '#e2dfff',
  surface: '#ffffff',
  background: '#f8f9fa',
  textPrimary: '#191c1d',
  textSecondary: '#464553',
  outline: '#777584',
  divider: '#e7e8e9',
  secondary: '#006c49',
};

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
  ) => (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: disabled ? COLORS.divider : COLORS.primaryFixed }]}>
          <MaterialIcons
            name={icon as any}
            size={20}
            color={disabled ? COLORS.outline : COLORS.primary}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, disabled && styles.textDisabled]}>{label}</Text>
          <Text style={[styles.rowDesc, disabled && styles.textDisabled]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={prefs[prefKey]}
        onValueChange={(val) => updatePref(prefKey, val)}
        disabled={disabled}
        trackColor={{ false: COLORS.divider, true: COLORS.primary }}
        thumbColor={Platform.OS === 'android' ? COLORS.surface : undefined}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(`Notifications`)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* MASTER TOGGLE */}
        <View style={styles.masterCard}>
          <View style={styles.masterLeft}>
            <MaterialIcons name="notifications" size={28} color={COLORS.primary} />
            <View style={styles.masterText}>
              <Text style={styles.masterLabel}>{t(`Push Notifications`)}</Text>
              <Text style={styles.masterDesc}>
                {prefs.pushEnabled ? 'Notifications are enabled' : 'All notifications are off'}
              </Text>
            </View>
          </View>
          <Switch
            value={prefs.pushEnabled}
            onValueChange={(val) => updatePref('pushEnabled', val)}
            trackColor={{ false: COLORS.divider, true: COLORS.primary }}
            thumbColor={Platform.OS === 'android' ? COLORS.surface : undefined}
          />
        </View>

        {/* NOTIFICATION TYPES */}
        <Text style={styles.groupLabel}>{t(`Notification Types`)}</Text>
        <View style={styles.card}>
          {renderRow(
            'add-circle-outline',
            'New Entry',
            'When a new transaction is added to your khata',
            'newEntry',
            !prefs.pushEnabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            'payments',
            'Payment Received',
            'When a customer makes a payment',
            'paymentReceived',
            !prefs.pushEnabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            'alarm',
            'Balance Reminders',
            'Periodic reminders for outstanding balances',
            'balanceReminder',
            !prefs.pushEnabled,
          )}
          <View style={styles.divider} />
          {renderRow(
            'system-update',
            'App Updates',
            'News about new features and improvements',
            'appUpdates',
            !prefs.pushEnabled,
          )}
        </View>

        <Text style={styles.footerNote}>
          Notification preferences are saved locally on this device. To manage system-level notification permissions, go to your device Settings → Any Khata → Notifications.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  masterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 28,
  },
  masterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterText: {
    marginLeft: 16,
    flex: 1,
  },
  masterLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  masterDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowDisabled: {
    opacity: 0.45,
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
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rowDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  textDisabled: {
    color: COLORS.outline,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 54,
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.outline,
    lineHeight: 18,
    marginTop: 24,
    textAlign: 'center',
  },
});
