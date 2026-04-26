import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useBusinessStore } from '../../store/businessStore';
import { checkBusinessSubscriptionStatus, createBusinessSubscription, getActiveSubscription, getBusinessByOwner, getAdsByUserId } from '../../lib/database';
import { clearCachedUser } from '../../lib/auth';
import { deleteUserAccount } from '../../lib/functions';
import { FEATURES } from '../../constants/config';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import type { Locale } from '../../constants/i18n';
import { useTranslation } from "../../hooks/useTranslation";
import { Ad } from '../../types';

const COLORS = {
  primary:      Colors.primary,
  primaryFixed: Colors.primaryPale,
  secondary:    Colors.success,
  surface:      Colors.surface,
  background:   Colors.background,
  textPrimary:  Colors.textPrimary,
  textSecondary:Colors.textSecondary,
  containerHigh:Colors.border,
  error:        Colors.danger,
  errorLight:   Colors.dangerLight,
  outline:      Colors.textMuted,
};

const LANGUAGE_OPTIONS: { locale: Locale; label: string; nativeName: string }[] = [
  { locale: 'en', label: 'English', nativeName: 'English' },
  { locale: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી' },
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
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [subDates, setSubDates] = useState<{ started: string; expires: string } | null>(null);
  const [activeAds, setActiveAds] = useState<Ad[]>([]);

  const SETTINGS_ITEMS = [
    {
      id: '1',
      label: t('profile.settings.notifications'),
      icon: 'notifications-none',
      onPress: () => router.push('/notifications' as any),
    },
    {
      id: '2',
      label: t('profile.settings.language'),
      icon: 'language',
      onPress: () => setShowLanguageModal(true),
    },
    {
      id: '3',
      label: t('profile.settings.help_support'),
      icon: 'help-outline',
      onPress: () =>
        Alert.alert(
          t('profile.settings.help_support'),
          t('profile.support_email_msg'),
          [{ text: t('common.ok') }],
        ),
    },
    {
      id: '4',
      label: t('profile.settings.privacy_policy'),
      icon: 'security',
      onPress: () => router.push('/privacy' as any),
    },
    {
      id: '5',
      label: t('profile.settings.terms_of_service'),
      icon: 'description',
      onPress: () => router.push('/terms' as any),
    },
  ];

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.delete_account'),
      t('profile.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          style: 'destructive',
          onPress: () => setShowDeleteDialog(true),
        },
      ]
    );
  };

  const performDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    setShowDeleteDialog(false);
    setDeleteConfirmText('');

    try {
      // deleteUserAccount calls the Appwrite Cloud Function `delete-user-account`
      // which uses the server-side SDK + API key to:
      //   1. Delete business, customers, day_logs, subscriptions, users docs
      //   2. Call users.delete(userId) — only possible server-side
      await deleteUserAccount(user.userId);
      await clearCachedUser();
      storeLogout();
      router.replace('/(auth)/login');
    } catch (err: any) {
      setDeletingAccount(false);
      Alert.alert(t('common.error'), t('profile.delete_error'));
    }
  };

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
        const userPhone = user.phone || '';
        
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
          
          setSubDates({
            started: startDate.toISOString(),
            expires: expiryDate.toISOString()
          });
        } else {
          setSubDates(null);
        }
        
        if (fetchedBusiness) {
          setBusiness(fetchedBusiness);
        }
        
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
      const payload = {
        link_id: orderId,
        link_amount: 11,
        link_currency: "INR",
        link_purpose: "Become a Business Owner",
        customer_details: {
          customer_phone: user?.phone || "9999999999"
        },
        link_meta: {
          return_url: redirectUri + `?order_id={link_id}&type=business${business?.businessId ? `&reference_id=${business.businessId}` : ''}`
        }
      };

      const res = await fetch('https://sandbox.cashfree.com/pg/links', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-client-id': process.env.EXPO_PUBLIC_CASHFREE_APP_ID,
          'x-client-secret': process.env.EXPO_PUBLIC_CASHFREE_SECRET,
          'x-api-version': '2023-08-01'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.link_url) {
        throw new Error(data.message || 'Failed to create payment link');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.link_url, redirectUri);
      
      if (result.type === 'success') {
        await createBusinessSubscription({
          userId: user!.userId,
          cashfreeOrderId: orderId
        });
        setIsSubscribed(true);
        Alert.alert(t('common.success'), t('profile.payment_success'));
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), t('profile.payment_failed'));
    } finally {
      setPaying(false);
    }
  };

  const handleLanguageSelect = (locale: Locale) => {
    setSelectedLanguage(locale);
    setShowLanguageModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.cardContainer}>
          <View style={[styles.identityCard, styles.primaryCard]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user?.name?.slice(0, 2).toUpperCase() || 'U'}</Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.cardContainer}>
          {loadingSub ? (
            <View style={[styles.whiteCard, { alignItems: 'center', padding: 30 }]}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : business ? (
            <View style={styles.whiteCard}>
              <View style={styles.cardRow}>
                <View style={styles.businessLeft}>
                  {business?.storePhotoUrl ? (
                    <Image source={{ uri: business.storePhotoUrl }} style={{ width: 48, height: 48, borderRadius: 14, resizeMode: 'cover' }} />
                  ) : (
                    <View style={[styles.iconBox, { backgroundColor: COLORS.primaryFixed }]}>
                      <MaterialIcons name="store" size={24} color={COLORS.primary} />
                    </View>
                  )}
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{business.businessName || t('profile.my_business')}</Text>
                    <Text style={styles.businessLocation}>{business.ownerName || user?.name}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={isSubscribed ? styles.activeBadge : styles.expiredBadge}>
                    <Text style={isSubscribed ? styles.activeBadgeText : styles.expiredBadgeText}>
                      {isSubscribed ? t('profile.active_plan_11') : t('profile.expired')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.editButton, { marginTop: 4, width: 32, height: 32 }]}
                    onPress={() => router.push('/(tabs)/business/edit-business' as any)}
                  >
                    <MaterialIcons name="edit" size={20} color={COLORS.outline} />
                  </TouchableOpacity>
                </View>
              </View>

              {!isSubscribed ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 13, color: COLORS.error, fontWeight: '600', marginBottom: 12 }}>
                    {t('profile.subscription_ended_msg')}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.primaryCard, { justifyContent: 'center', paddingVertical: 12, borderRadius: 12, elevation: 0 }]}
                    onPress={handlePayment}
                    disabled={paying}
                  >
                    {paying ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={{ color: Colors.white, fontSize: 14, fontWeight: '800', textAlign: 'center' }}>
                        {t('profile.pay_reactivate_btn')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : subDates && (() => {
                const daysLeft = getDaysRemaining(subDates.expires);
                return (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.dateText, daysLeft <= 5 && { color: COLORS.error }]}>
                      {t('profile.expires_in')} {daysLeft} {t('common.days')}
                    </Text>
                  </View>
                );
              })()}
            </View>
          ) : isSubscribed && !hasBusiness ? (
            <TouchableOpacity 
              style={[styles.whiteCard, { alignItems: 'center', paddingVertical: 24, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed' }]}
              onPress={() => router.push('/(onboarding)/register-business')}
            >
              <MaterialIcons name="add-business" size={32} color={COLORS.primary} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>{t('profile.register_business')}</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>{t('profile.setup_profile_desc')}</Text>
            </TouchableOpacity>
          ) : FEATURES.ENABLE_PAYMENTS ? (
            <View style={[styles.whiteCard, { paddingVertical: 20 }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary }}>{t('profile.start_khata')}</Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 16 }}>{t('profile.manage_customers')}</Text>
              <TouchableOpacity 
                style={[styles.primaryCard, { justifyContent: 'center', paddingVertical: 14, borderRadius: 12, elevation: 0 }]}
                onPress={handlePayment}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                    {t('profile.pay_plan_11')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Ad Subscription Cards */}
        <View style={styles.cardContainer}>
          {loadingSub ? null : (
            <>
              {activeAds.map((ad, index) => {
                const isAdActive = ad.subscription_status === 'active';
                const daysLeft = getDaysRemaining(ad.subscription_expiry);
                const isLast = index === activeAds.length - 1;
                
                return (
                  <View key={ad.adId} style={[styles.whiteCard, { marginBottom: 16 }]}>
                    <View style={styles.cardRow}>
                      <View style={styles.businessLeft}>
                        {ad.image_url ? (
                          <Image source={{ uri: ad.image_url }} style={{ width: 48, height: 48, borderRadius: 14, resizeMode: 'cover' }} />
                        ) : (
                          <View style={[styles.iconBox, { backgroundColor: COLORS.primaryFixed }]}>
                            <MaterialIcons name="image" size={24} color={COLORS.primary} />
                          </View>
                        )}
                        <View style={styles.businessInfo}>
                          <Text style={styles.businessName}>{ad.business_name}</Text>
                          <Text style={styles.businessLocation}>{ad.owner_name}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={isAdActive ? styles.activeBadge : styles.expiredBadge}>
                          <Text style={isAdActive ? styles.activeBadgeText : styles.expiredBadgeText}>
                            {isAdActive ? t('profile.active_plan_100') : t('profile.expired')}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                          <TouchableOpacity
                            style={[styles.editButton, { width: 32, height: 32 }]}
                            onPress={() => router.push(`/ad-edit/${ad.adId}` as any)}
                          >
                            <MaterialIcons name="edit" size={20} color={COLORS.outline} />
                          </TouchableOpacity>
                          {isLast && isAdActive && (
                            <TouchableOpacity
                              style={[styles.editButton, { width: 32, height: 32, marginLeft: 8 }]}
                              onPress={() => router.push('/ad-submit' as any)}
                            >
                              <MaterialIcons name="add" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    {isAdActive ? (
                      <View style={{ marginTop: 8 }}>
                        <Text style={[styles.dateText, daysLeft <= 5 && { color: COLORS.error }]}>
                          {t(`Expires in`)} {daysLeft} {t(`days`)}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.primaryCard, { justifyContent: 'center', paddingVertical: 10, borderRadius: 12, elevation: 0, marginTop: 12 }]}
                        onPress={() => router.push({ pathname: '/ad-submit', params: { adId: ad.adId } } as any)}
                      >
                        <Text style={{ color: Colors.white, fontSize: 14, fontWeight: '800', textAlign: 'center' }}>
                          {t('profile.renew_ad_btn')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              {FEATURES.ENABLE_PAYMENTS && activeAds.length === 0 && (
                <View style={[styles.whiteCard, { paddingVertical: 20 }]}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary }}>
                    {t('profile.advertise_business')}
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 16 }}>
                    {t('profile.reach_local_msg')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryCard, { justifyContent: 'center', paddingVertical: 14, borderRadius: 12, elevation: 0 }]}
                    onPress={() => router.push('/ad-submit' as any)}
                  >
                    <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                      {t('profile.pay_ad_btn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>



        <View style={styles.settingsContainer}>
          {SETTINGS_ITEMS.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity style={styles.settingsRow} onPress={item.onPress}>
                <View style={styles.settingsLeft}>
                  <MaterialIcons name={item.icon as any} size={22} color={COLORS.textSecondary} />
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.outline} />
              </TouchableOpacity>
              {index < SETTINGS_ITEMS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.signOutContainer}>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={logout}
          >
            <Text style={styles.signOutText}>{t('profile.sign_out')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.deleteAccountContainer}>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? (
              <ActivityIndicator color={COLORS.error} size="small" />
            ) : (
              <Text style={styles.deleteAccountText}>{t('profile.delete_account')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>{t('Version 1.0.42')}</Text>
      </ScrollView>

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
                onPress={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText('');
                }}
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

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.languageModalContent}>
            <View style={styles.languageModalHeader}>
              <Text style={styles.languageModalTitle}>{t('profile.select_language')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {LANGUAGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.locale}
                style={styles.languageOption}
                onPress={() => handleLanguageSelect(option.locale)}
              >
                <View style={styles.languageOptionLeft}>
                  <Text style={styles.languageLabel}>{option.nativeName}</Text>
                  <Text style={styles.languageSubLabel}>{option.label}</Text>
                </View>
                {selectedLanguage === option.locale && (
                  <MaterialIcons name="check" size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    height: 64,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cardContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  primaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  identityCard: {
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  identityInfo: {
    marginLeft: 20,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.primaryFixed,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.primaryFixed,
  },
  whiteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
    marginTop: 4,
  },
  activeBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  activeBadgeText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  expiredBadge: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  expiredBadgeText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  renewText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  businessLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInfo: {
    marginLeft: 16,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  businessLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContainer: {
    backgroundColor: COLORS.surface,
    marginTop: 32,
    marginHorizontal: 0,
    paddingHorizontal: 24,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.background,
    marginLeft: 38,
  },
  signOutContainer: {
    paddingHorizontal: 24,
    marginTop: 40,
  },
  signOutButton: {
    backgroundColor: COLORS.errorLight,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '800',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 32,
  },
  deleteAccountContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  deleteAccountText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  dialogBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    width: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  dialogMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  dialogInput: {
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
    letterSpacing: 2,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.containerHigh,
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  dialogConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
  },
  dialogConfirmBtnDisabled: {
    backgroundColor: COLORS.errorLight,
  },
  dialogConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  languageModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  languageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  languageOptionLeft: {
    flexDirection: 'column',
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  languageSubLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
