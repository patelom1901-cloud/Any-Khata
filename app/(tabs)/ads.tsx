import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Image,
  Linking,
  Pressable,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from '../../hooks/useTranslation';
import { useAds } from '../../hooks/useAds';
import AdCarousel from '../../components/ads/AdCarousel';
import type { Ad } from '../../types';

const { width } = Dimensions.get('window');
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (width - Spacing['2xl'] * 2 - CARD_GAP) / 2;

// ─── Business Detail Modal ────────────────────────────────────

interface BusinessModalProps {
  ad: Ad | null;
  onClose: () => void;
}

function BusinessModal({ ad, onClose }: BusinessModalProps) {
  const { t } = useTranslation();
  if (!ad) return null;

  const rows: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; onPress?: () => void }[] = [];

  if (ad.phone) {
    rows.push({
      icon: 'chat',
      label: t('ads.whatsapp'),
      value: ad.phone,
      onPress: () => Linking.openURL(`https://wa.me/91${ad.phone}`),
    });
  }
  if (ad.website_url) {
    rows.push({
      icon: 'language',
      label: t('ads.website'),
      value: ad.website_url,
      onPress: () => Linking.openURL(ad.website_url!),
    });
  }
  if (ad.maps_url) {
    rows.push({
      icon: 'location-on',
      label: t('ads.location'),
      value: t('ads.view_on_maps'),
      onPress: () => Linking.openURL(ad.maps_url!),
    });
  }
  if (ad.gstin) {
    rows.push({
      icon: 'receipt',
      label: t('ads.gstin'),
      value: ad.gstin,
    });
  }

  return (
    <Modal
      visible={!!ad}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Close button */}
          <TouchableOpacity style={styles.modalClose} onPress={onClose} hitSlop={12}>
            <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Store image */}
          {ad.image_url ? (
            <Image
              source={{ uri: ad.image_url }}
              style={styles.modalImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
              <MaterialIcons name="storefront" size={48} color={Colors.primary} />
            </View>
          )}

          {/* Business info */}
          <View style={styles.modalBody}>
            <Text style={styles.modalBusinessName} numberOfLines={2}>
              {ad.business_name}
            </Text>
            <Text style={styles.modalOwnerName}>{ad.owner_name}</Text>

            {rows.length > 0 && (
              <View style={styles.rowList}>
                {rows.map((row, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <TouchableOpacity
                      style={styles.infoRow}
                      onPress={row.onPress}
                      disabled={!row.onPress}
                      activeOpacity={row.onPress ? 0.65 : 1}
                    >
                      <View style={[styles.rowIconBox, row.onPress && styles.rowIconBoxActive]}>
                        <MaterialIcons
                          name={row.icon}
                          size={20}
                          color={row.onPress ? Colors.primary : Colors.textSecondary}
                        />
                      </View>
                      <View style={styles.rowTextBox}>
                        <Text style={styles.rowLabel}>{row.label}</Text>
                        <Text
                          style={[styles.rowValue, row.onPress && styles.rowValueLink]}
                          numberOfLines={1}
                        >
                          {row.value}
                        </Text>
                      </View>
                      {row.onPress && (
                        <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Business Card ────────────────────────────────────────────

interface BusinessCardProps {
  ad: Ad;
  onPress: (ad: Ad) => void;
}

function BusinessCard({ ad, onPress }: BusinessCardProps) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={styles.businessCard}
      activeOpacity={0.88}
      onPress={() => onPress(ad)}
    >
      {ad.image_url ? (
        <Image
          source={{ uri: ad.image_url }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <MaterialIcons name="storefront" size={28} color={Colors.primary} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardBusinessName} numberOfLines={1}>
          {ad.business_name}
        </Text>
        <Text style={styles.cardOwnerName} numberOfLines={1}>
          {ad.owner_name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function AdsScreen() {
  const { t } = useTranslation();
  const { ads, isLoading, fetchAds } = useAds();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAds();
    setRefreshing(false);
  }, [fetchAds]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="campaign" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>{t('ads.title')}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/ad-submit' as any)}
          activeOpacity={0.75}
        >
          <MaterialIcons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('ads.loading_offers')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          {/* CAROUSEL */}
          <AdCarousel ads={ads} onAdPress={setSelectedAd} />

          {/* SECTION TITLE */}
          <Text style={styles.sectionTitle}>{t('ads.featured_businesses')}</Text>

          {/* GRID */}
          {ads.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="store" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{t('ads.no_featured')}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/ad-submit' as any)}
              >
                <Text style={styles.emptyButtonText}>{t('ads.first_ad_btn')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              {ads.map((ad) => (
                <BusinessCard key={ad.adId} ad={ad} onPress={setSelectedAd} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* BUSINESS DETAIL MODAL */}
      <BusinessModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    height: 64,
    paddingHorizontal: Spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollContent: {
    paddingBottom: 48,
  },

  // Section
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.heavy,
    color: Colors.textPrimary,
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing['2xl'],
    gap: CARD_GAP,
  },

  // Business card
  businessCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: Spacing.md,
  },
  cardBusinessName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  cardOwnerName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  emptyButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  emptyButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.lg,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: 200,
  },
  modalImagePlaceholder: {
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: Spacing['2xl'],
  },
  modalBusinessName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  modalOwnerName: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.xl,
  },

  // Info rows
  rowList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 56,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconBoxActive: {
    backgroundColor: Colors.primaryPale,
  },
  rowTextBox: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
    marginTop: 1,
  },
  rowValueLink: {
    color: Colors.primary,
  },
});
