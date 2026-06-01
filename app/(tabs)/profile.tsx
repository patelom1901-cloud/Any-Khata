import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Stack, router } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useBusinessStore } from '../../store/businessStore';
import { checkBusinessSubscriptionStatus, createBusinessSubscription, getActiveSubscription, getBusinessByOwner, getAdsByUserId } from '../../lib/database';
import { clearCachedUser } from '../../lib/auth';
import { deleteUserAccount, createCashfreeOrder, verifyCashfreePayment } from '../../lib/functions';
import { getFailedEntries, resetEntryForRetry, discardFailedEntry, PendingEntry } from '../../lib/offlineQueue';
import { runSync } from '../../lib/syncWorker';
import { FEATURES, CONFIG } from '../../constants/config';
import type { Locale } from '../../constants/i18n/index';
import { useTranslation } from "../../hooks/useTranslation";
import { Ad } from '../../types';
import { WavyHeader } from '../../components/ui/WavyHeader';
import { Colors as ThemeColors, Fonts, Radius } from '../../constants/theme';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const LANGUAGE_OPTIONS: { locale: Locale; label: string; nativeName: string }[] = [
  { locale: 'en', label: 'English', nativeName: 'English' },
  { locale: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી' },
  { locale: 'hi', label: 'Hindi', nativeName: 'हिंदी' },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, isSubscribed, setIsSubscribed, logout: storeLogout, selectedLanguage, setSelectedLanguage } = useAuthStore();
  const hasBusiness = useAuthStore(state => state.hasBusiness);
  const { business, setBusiness } = useBusinessStore();
  const { logout } = useAuth(); 
  const [loadingSub, setLoadingSub] = useState(true);
  const [paying, setPaying] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSyncIssuesModal, setShowSyncIssuesModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [subDates, setSubDates] = useState<{ started: string; expires: string } | null>(null);
  const [activeAds, setActiveAds] = useState<Ad[]>([]);
  const [failedEntries, setFailedEntries] = useState<PendingEntry[]>([]);

  // Avatar Logic
  const avatarUrl = useMemo(() => {
    const name = user?.name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C9883A&color=fff&size=128&bold=true`;
  }, [user]);

  const handleShowSyncIssues = async () => {
    const entries = await getFailedEntries();
    setFailedEntries(entries);
    setShowSyncIssuesModal(true);
  };

  const SETTINGS_ITEMS = [
    { id: '1', label: t('profile.settings.notifications'), icon: 'notifications-none', onPress: () => router.push('/notifications' as any) },
    { id: '2', label: t('profile.settings.language'), icon: 'language', onPress: () => setShowLanguageModal(true) },
    { id: 'sync', label: t('sync.syncIssues') || 'Sync Issues', icon: 'sync-problem', onPress: handleShowSyncIssues },
    { id: '3', label: t('profile.settings.help_support'), icon: 'help-outline', onPress: () => Alert.alert(t('profile.settings.help_support'), t('profile.support_email_msg'), [{ text: t('common.ok') }]) },
    { id: '4', label: t('profile.settings.privacy_policy'), icon: 'security', onPress: () => router.push('/privacy' as any) },
    { id: '5', label: t('profile.settings.terms_of_service'), icon: 'description', onPress: () => router.push('/terms' as any) },
  ];

  const getDaysRemaining = (expiryDateStr: string): number => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    if (!user) return;
    const fetchSub = async () => {
      try {
        const userId = user.userId || (user as any).$id;
        const [active, activeSub, fetchedBusiness, adsResult] = await Promise.all([
          checkBusinessSubscriptionStatus(userId),
          getActiveSubscription(userId),
          getBusinessByOwner(userId),
          getAdsByUserId(userId)
        ]);

        setIsSubscribed(active);
        if (active && activeSub) {
          const startDate = new Date(activeSub.$createdAt);
          const expiryDate = new Date(startDate);
          expiryDate.setDate(startDate.getDate() + 30);
          setSubDates({ started: startDate.toISOString(), expires: expiryDate.toISOString() });
        } else {
          setSubDates(null);
        }
        if (fetchedBusiness) setBusiness(fetchedBusiness);
        setActiveAds(Array.isArray(adsResult) ? adsResult : []);
      } catch (err: any) {
        setIsSubscribed(false);
        setActiveAds([]);
      } finally {
        setLoadingSub(false);
      }
    };
    fetchSub();
  }, [user]);

  const handlePayment = async () => {
    try {
      setPaying(true);
      const orderId = 'order_' + Date.now();
      const redirectUri = makeRedirectUri({ path: 'payment-callback' });
      
      const { link_url } = await createCashfreeOrder({
        amount: 11,
        orderId,
        customerPhone: user?.phone || "9999999999",
        customerName: user?.name || "User",
        type: 'business',
        referenceId: business?.businessId,
        redirectUri,
        userId: user!.userId
      });

      const result = await WebBrowser.openAuthSessionAsync(link_url, redirectUri);
      if (result.type === 'success') {
        const verifyRes = await verifyCashfreePayment({ orderId });
        if (verifyRes.success) {
          setIsSubscribed(true);
          Alert.alert(t('common.success'), t('profile.payment_success'));
        } else {
          Alert.alert(t('common.error'), t('profile.payment_failed'));
        }
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('profile.payment_failed'));
    } finally {
      setPaying(false);
    }
  };

  const performDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    setShowDeleteDialog(false);
    try {
      await deleteUserAccount(user.userId);
      await clearCachedUser();
      storeLogout();
      router.replace('/(auth)/login');
    } catch (err: any) {
      setDeletingAccount(false);
      Alert.alert(t('common.error'), t('profile.delete_error'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
      <Stack.Screen options={{ headerShown: false }} />

      <WavyHeader>
        <View style={styles.headerInner}>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        </View>
      </WavyHeader>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Identity Card */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.cardContainer}>
          <View style={styles.identityCard}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              {CONFIG.PAYMENTS_ENABLED && isSubscribed && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={16} color={ThemeColors.brandLight} />
                </View>
              )}
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
            </View>
          </View>
        </Animated.View>

        {/* 2. Business Management */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>{t('Business Account')}</Text>
          {loadingSub ? (
            <View style={[styles.whiteCard, { alignItems: 'center', padding: 30 }]}>
              <ActivityIndicator color={ThemeColors.brandLight} />
            </View>
          ) : business ? (
            <View style={styles.whiteCard}>
              <View style={styles.cardRow}>
                <View style={styles.businessLeft}>
                  {business?.storePhotoUrl ? (
                    <Image source={{ uri: business.storePhotoUrl }} style={styles.businessImg} />
                  ) : (
                    <View style={styles.iconBox}>
                      <MaterialIcons name="store" size={24} color={ThemeColors.brandMid} />
                    </View>
                  )}
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{business.businessName || t('profile.my_business')}</Text>
                    <Text style={styles.businessLocation}>{business.ownerName || user?.name}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {CONFIG.PAYMENTS_ENABLED && (
                    <View style={isSubscribed ? styles.activeBadge : styles.expiredBadge}>
                      <Text style={isSubscribed ? styles.activeBadgeText : styles.expiredBadgeText}>
                        {isSubscribed ? t('profile.active_plan_11') : t('profile.expired')}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push('/(tabs)/business/edit-business' as any)}
                  >
                    <MaterialIcons name="edit" size={20} color={ThemeColors.brandMid} />
                  </TouchableOpacity>
                </View>
              </View>

              {CONFIG.PAYMENTS_ENABLED && (
                !isSubscribed ? (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.statusErrorMsg}>
                      {t('profile.subscription_ended_msg')}
                    </Text>
                    <TouchableOpacity 
                      style={styles.primaryActionBtn}
                      onPress={handlePayment}
                      disabled={paying}
                    >
                      {paying ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.primaryActionText}>{t('profile.pay_reactivate_btn')}</Text>}
                    </TouchableOpacity>
                  </View>
                ) : subDates && (
                  <View style={styles.expiryRow}>
                    <Ionicons name="time-outline" size={14} color={ThemeColors.textSecondary} />
                    <Text style={[styles.dateText, getDaysRemaining(subDates.expires) <= 5 && { color: ThemeColors.creditRed }]}>
                      {t('profile.expires_in')} {getDaysRemaining(subDates.expires)} {t('common.days')}
                    </Text>
                  </View>
                )
              )}
            </View>
          ) : (!CONFIG.PAYMENTS_ENABLED || isSubscribed) && !hasBusiness ? (
            <TouchableOpacity 
              style={styles.emptyCard}
              onPress={() => router.push('/(onboarding)/register-business')}
            >
              <MaterialIcons name="add-business" size={32} color={ThemeColors.brandMid} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyCardTitle}>{t('profile.register_business')}</Text>
              <Text style={styles.emptyCardSubtitle}>{t('profile.setup_profile_desc')}</Text>
            </TouchableOpacity>
          ) : CONFIG.PAYMENTS_ENABLED && FEATURES.ENABLE_PAYMENTS ? (
            <View style={styles.whiteCard}>
              <Text style={styles.cardTitle}>{t('profile.start_khata')}</Text>
              <Text style={styles.cardSubtitle}>{t('profile.manage_customers')}</Text>
              <TouchableOpacity 
                style={styles.primaryActionBtn}
                onPress={handlePayment}
                disabled={paying}
              >
                {paying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryActionText}>{t('profile.pay_plan_11')}</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* 3. Ad Subscription Cards */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>{t('Advertisements')}</Text>
          {loadingSub ? null : (
            <>
              {activeAds.map((ad, index) => {
                const isAdActive = ad.subscriptionStatus === 'active';
                const daysLeft = getDaysRemaining(ad.subscription_expiry);
                const isLast = index === activeAds.length - 1;
                
                return (
                  <Animated.View key={ad.adId} entering={FadeInUp.delay(index * 100)} style={[styles.whiteCard, { marginBottom: 16 }]}>
                    <View style={styles.cardRow}>
                      <View style={styles.businessLeft}>
                        {ad.image_url ? (
                          <ExpoImage 
                            source={ad.image_url} 
                            cachePolicy="disk"
                            transition={200}
                            style={styles.adImg} 
                          />
                        ) : (
                          <View style={styles.iconBox}>
                            <MaterialIcons name="image" size={24} color={ThemeColors.brandMid} />
                          </View>
                        )}
                        <View style={styles.businessInfo}>
                          <Text style={styles.businessName}>{ad.business_name}</Text>
                          <Text style={styles.businessLocation}>{ad.owner_name}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {CONFIG.PAYMENTS_ENABLED && (
                          <View style={isAdActive ? styles.activeBadge : styles.expiredBadge}>
                            <Text style={isAdActive ? styles.activeBadgeText : styles.expiredBadgeText}>
                              {isAdActive ? t('profile.active_plan_100') : t('profile.expired')}
                            </Text>
                          </View>
                        )}
                        <View style={styles.adActionRow}>
                          <TouchableOpacity
                            style={styles.adEditBtn}
                            onPress={() => router.push(`/ad-edit/${ad.adId}` as any)}
                          >
                            <MaterialIcons name="edit" size={18} color={ThemeColors.brandMid} />
                          </TouchableOpacity>
                          {isLast && isAdActive && (
                            <TouchableOpacity
                              style={[styles.adEditBtn, { marginLeft: 8 }]}
                              onPress={() => router.push('/ad-submit' as any)}
                            >
                              <MaterialIcons name="add" size={20} color={ThemeColors.brandLight} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    {CONFIG.PAYMENTS_ENABLED && (
                      isAdActive ? (
                        <View style={styles.expiryRow}>
                          <Ionicons name="time-outline" size={14} color={ThemeColors.textSecondary} />
                          <Text style={[styles.dateText, daysLeft <= 5 && { color: ThemeColors.creditRed }]}>
                            {t(`Expires in`)} {daysLeft} {t(`days`)}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={[styles.primaryActionBtn, { marginTop: 12, paddingVertical: 10 }]}
                          onPress={() => router.push({ pathname: '/ad-submit', params: { adId: ad.adId } } as any)}
                        >
                          <Text style={styles.primaryActionText}>{t('profile.renew_ad_btn')}</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </Animated.View>
                );
              })}
              {(!CONFIG.PAYMENTS_ENABLED || FEATURES.ENABLE_PAYMENTS) && activeAds.length === 0 && (
                <View style={styles.whiteCard}>
                  <Text style={styles.cardTitle}>{t('profile.advertise_business')}</Text>
                  <Text style={styles.cardSubtitle}>{t('profile.reach_local_msg')}</Text>
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => router.push('/ad-submit' as any)}
                  >
                    <Text style={styles.primaryActionText}>{!CONFIG.PAYMENTS_ENABLED ? 'Submit Ad' : t('profile.pay_ad_btn')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* 4. Settings List */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('Preferences')}</Text>
          <View style={styles.settingsGroup}>
            {SETTINGS_ITEMS.map((item, index) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity style={styles.settingsRow} onPress={item.onPress}>
                  <View style={styles.settingsLeft}>
                    <View style={styles.settingIconCircle}>
                      <MaterialIcons name={item.icon as any} size={20} color={ThemeColors.brandMid} />
                    </View>
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={ThemeColors.creamBorder} />
                </TouchableOpacity>
                {index < SETTINGS_ITEMS.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* 5. Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
            <Text style={styles.signOutText}>{t('profile.sign_out')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowDeleteDialog(true)} style={{ marginTop: 20 }}>
            <Text style={styles.deleteAccountText}>{t('profile.delete_account')}</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>{t('Version 1.0.42')}</Text>
        </View>
      </ScrollView>

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>{t('common.app_name')}</Text>
            <Text style={styles.dialogMessage}>
              {t('profile.delete_confirm')} {t('profile.delete_undo_msg')}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowDeleteDialog(false)}
              >
                <Text style={styles.dialogCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={performDeleteAccount}
              >
                <Text style={styles.dialogConfirmText}>{t('profile.delete_account')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('profile.select_language')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <MaterialIcons name="close" size={24} color={ThemeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            {LANGUAGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.locale}
                style={[styles.langOption, selectedLanguage === option.locale && styles.langOptionActive]}
                onPress={() => { setSelectedLanguage(option.locale); setShowLanguageModal(false); }}
              >
                <View>
                  <Text style={styles.langNative}>{option.nativeName}</Text>
                  <Text style={styles.langLabel}>{option.label}</Text>
                </View>
                {selectedLanguage === option.locale && (
                  <MaterialIcons name="check-circle" size={24} color={ThemeColors.brandLight} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Sync Issues Modal */}
      <Modal visible={showSyncIssuesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContent, { maxHeight: '80%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('sync.syncIssues') || 'Sync Issues'}</Text>
              <TouchableOpacity onPress={() => setShowSyncIssuesModal(false)}>
                <MaterialIcons name="close" size={24} color={ThemeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 20 }}>
              {failedEntries.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 20, color: ThemeColors.textSecondary }}>
                  {t('sync.noSyncIssues') || 'No sync issues. All entries are up to date.'}
                </Text>
              ) : (
                failedEntries.map(entry => (
                  <View key={entry.id} style={{ padding: 16, backgroundColor: '#FFF5F4', borderRadius: 12, marginBottom: 12 }}>
                    <Text style={{ fontFamily: Fonts.bold, color: ThemeColors.textPrimary }}>
                      {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={{ fontFamily: Fonts.regular, color: entry.type === 'gave' ? ThemeColors.creditRed : ThemeColors.paymentGreen, marginVertical: 4 }}>
                      ₹{entry.amount} - {entry.type === 'gave' ? 'Gave' : 'Got'}
                    </Text>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: ThemeColors.creditRed }}>
                      {entry.error_message?.substring(0, 60)}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 12 }}>
                      <TouchableOpacity onPress={async () => {
                        await discardFailedEntry(entry.id);
                        handleShowSyncIssues();
                      }}>
                        <Text style={{ color: ThemeColors.textSecondary, fontFamily: Fonts.semibold }}>{t('sync.discardSyncEntry') || 'Discard'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={async () => {
                        await resetEntryForRetry(entry.id);
                        runSync();
                        handleShowSyncIssues();
                      }}>
                        <Text style={{ color: ThemeColors.brandLight, fontFamily: Fonts.semibold }}>{t('sync.retrySyncEntry') || 'Retry'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  headerInner: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    color: '#FFF',
  },
  scrollContent: {
    paddingTop: 3,
    paddingBottom: 40,
  },
  cardContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: ThemeColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  identityCard: {
    backgroundColor: ThemeColors.brandDark,
    borderRadius: Radius.xl,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ThemeColors.brandMid,
    borderWidth: 2,
    borderColor: ThemeColors.brandLight,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 2,
  },
  identityInfo: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontFamily: Fonts.extrabold,
    fontSize: 20,
    color: '#FFF',
  },
  userEmail: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  userPhone: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: ThemeColors.textMuted,
  },
  whiteCard: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 18,
    color: ThemeColors.textPrimary,
  },
  cardSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: ThemeColors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessImg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  adImg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(201,136,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInfo: {
    marginLeft: 16,
    flex: 1,
  },
  businessName: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: ThemeColors.textPrimary,
  },
  businessLocation: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: ThemeColors.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 168, 83, 0.2)',
  },
  activeBadgeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  expiredBadge: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
  },
  expiredBadgeText: {
    color: '#C62828',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ThemeColors.creamBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  adActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  adEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ThemeColors.creamBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusErrorMsg: {
    fontSize: 13,
    color: ThemeColors.creditRed,
    fontFamily: Fonts.semibold,
    marginBottom: 12,
  },
  primaryActionBtn: {
    backgroundColor: ThemeColors.brandDark,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dateText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: ThemeColors.textSecondary,
  },
  emptyCard: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.xl,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: ThemeColors.brandLight,
    borderStyle: 'dashed',
  },
  emptyCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: ThemeColors.textPrimary,
  },
  emptyCardSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: ThemeColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  settingsSection: {
    marginTop: 10,
    paddingHorizontal: 24,
  },
  settingsGroup: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201,136,58,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingsLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: ThemeColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: ThemeColors.creamBorder,
    marginLeft: 68,
  },
  footer: {
    paddingHorizontal: 24,
    marginTop: 40,
    alignItems: 'center',
  },
  signOutBtn: {
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.1)',
  },
  signOutText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: ThemeColors.creditRed,
  },
  deleteAccountText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: ThemeColors.textSecondary,
    textDecorationLine: 'underline',
  },
  versionText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: ThemeColors.creamBorder,
    marginTop: 32,
  },
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  dialogBox: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: Radius.xl,
    padding: 24,
  },
  dialogTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 20,
    color: ThemeColors.textPrimary,
    marginBottom: 10,
  },
  dialogMessage: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: ThemeColors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.lg,
    backgroundColor: ThemeColors.creamBase,
  },
  dialogCancelText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: ThemeColors.textSecondary,
  },
  dialogConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.lg,
    backgroundColor: ThemeColors.creditRed,
  },
  dialogConfirmText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  sheetTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 20,
    color: ThemeColors.textPrimary,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: ThemeColors.creamBase,
    borderRadius: 16,
    marginBottom: 12,
  },
  langOptionActive: {
    backgroundColor: 'rgba(201,136,58,0.08)',
    borderWidth: 1,
    borderColor: ThemeColors.brandLight,
  },
  langNative: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: ThemeColors.textPrimary,
  },
  langLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: ThemeColors.textSecondary,
    marginTop: 2,
  },
});
