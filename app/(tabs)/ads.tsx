import React, { useState, useCallback, useMemo } from 'react';
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
  Linking,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useAds } from '../../hooks/useAds';
import AdCarousel from '../../components/ads/AdCarousel';
import type { Ad } from '../../types';
import Animated, { FadeInDown, FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';
import { WavyHeader } from '../../components/ui/WavyHeader';
import { Colors as ThemeColors, Fonts, Radius } from '../../constants/theme';
import { Colors } from '../../constants/colors';
import { getOptimizedImageUrl } from '../../utils/cloudinaryUtils';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 48 - CARD_GAP) / 2;

import { BusinessModal } from '../../components/ads/BusinessModal';

// ─── Business Card ────────────────────────────────────────────

interface BusinessCardProps {
  ad: Ad;
  index: number;
  onPress: (ad: Ad) => void;
}

function BusinessCard({ ad, index, onPress }: BusinessCardProps) {
  const { t } = useTranslation();
  return (
    <Animated.View 
      entering={FadeInRight.delay(index * 40).springify()}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        style={styles.businessCard}
        activeOpacity={0.88}
        onPress={() => onPress(ad)}
      >
        {ad.image_url ? (
          <Image
            source={getOptimizedImageUrl(ad.image_url, 400) ?? undefined}
            cachePolicy="disk"
            transition={200}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <MaterialIcons name="storefront" size={24} color={ThemeColors.brandMid} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: ThemeColors.textPrimary }} numberOfLines={1}>
            {ad.business_name}
          </Text>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 10, color: ThemeColors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {ad.owner_name}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ThemeColors.brandLight]}
            tintColor={ThemeColors.brandLight}
          />
        }
      >
        {/* 1. WAVY HEADER */}
        <WavyHeader>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontFamily: Fonts.extrabold, fontSize: 18, color: ThemeColors.textOnDark }}>
                {t('ads.title')}
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 10.5, color: ThemeColors.textMuted, marginTop: 2 }}>
                {t('Discover local businesses')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/ad-submit' as any)}
              activeOpacity={0.75}
            >
              <MaterialIcons name="add-business" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </WavyHeader>

        {isLoading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ThemeColors.brandLight} />
            <Text style={{ fontFamily: Fonts.semibold, fontSize: 14, color: ThemeColors.textSecondary, marginTop: 16 }}>
              {t('ads.loading_offers')}
            </Text>
          </View>
        ) : (
          <>
            {/* 2. MODERN CAROUSEL */}
            <AdCarousel ads={ads} onAdPress={setSelectedAd} />

            {/* 3. SECTION TITLE */}
            <Animated.Text 
              entering={FadeInDown.delay(300).springify()}
              style={styles.sectionTitle}
            >
              {t('ads.featured_businesses')}
            </Animated.Text>

            {/* 4. GRID */}
            {ads.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialIcons name="store" size={48} color={ThemeColors.creamBorder} />
                </View>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 16, color: ThemeColors.textPrimary }}>
                  {t('ads.no_featured')}
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/ad-submit' as any)}
                >
                  <Text style={{ fontFamily: Fonts.bold, fontSize: 14, color: '#FFFFFF' }}>{t('ads.first_ad_btn')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.grid}>
                {ads.map((ad, index) => (
                  <BusinessCard key={ad.adId} ad={ad} index={index} onPress={setSelectedAd} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* BUSINESS DETAIL MODAL */}
      <BusinessModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  centered: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ThemeColors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: ThemeColors.brandLight,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.extrabold,
    color: ThemeColors.textPrimary,
    marginTop: 32,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: CARD_GAP,
  },
  businessCard: {
    width: CARD_WIDTH,
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 3,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1.1,
  },
  cardImagePlaceholder: {
    backgroundColor: ThemeColors.creamBase,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1.1,
  },
  cardInfo: {
    padding: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201,136,58,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: ThemeColors.brandDark,
    borderRadius: Radius.pill,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 8, 3, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: ThemeColors.creamBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modalImage: {
    width: '100%',
    height: 240,
  },
  modalImagePlaceholder: {
    backgroundColor: ThemeColors.creamBase,
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
  },
  modalBody: {
    padding: 32,
  },
  rowList: {
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: ThemeColors.creamCard,
  },
  rowDivider: {
    height: 1,
    backgroundColor: ThemeColors.creamBorder,
    marginLeft: 56,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ThemeColors.creamBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconBoxActive: {
    backgroundColor: 'rgba(201,136,58,0.1)',
  },
  rowTextBox: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: ThemeColors.brandMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: ThemeColors.textPrimary,
    marginTop: 1,
  },
  rowValueLink: {
    color: ThemeColors.brandLight,
    fontFamily: Fonts.bold,
  },
});
