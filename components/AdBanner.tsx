import React from 'react';
import { View, Platform } from 'react-native';
import { CONFIG } from '@/constants/config';

let BannerAd: any = null;
let BannerAdSize: any = null;

try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
} catch (e) {
  // Native module not available in Expo Go
}

export default function AdBanner() {
  if (!CONFIG.ADMOB_ENABLED) return null;
  if (!BannerAd || !BannerAdSize) return null;

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <BannerAd
        unitId={CONFIG.ADMOB_BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
