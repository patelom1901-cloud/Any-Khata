import { useEffect, useRef } from 'react';
import { CONFIG } from '@/constants/config';

let InterstitialAd: any = null;
let AdEventType: any = null;

try {
  const ads = require('react-native-google-mobile-ads');
  InterstitialAd = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
} catch (e) {
  // Native module not available in Expo Go
}

export function useInterstitialAd() {
  const interstitialRef = useRef<any>(null);

  useEffect(() => {
    if (!InterstitialAd || !AdEventType) return;
    
    try {
      const interstitial = InterstitialAd.createForAdRequest(
        CONFIG.ADMOB_INTERSTITIAL_ID,
        { requestNonPersonalizedAdsOnly: true }
      );
      interstitialRef.current = interstitial;
      
      const unsubscribe = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {}
      );
      interstitial.load();
      return unsubscribe;
    } catch (e) {
      // Silently fail if native module unavailable
    }
  }, []);

  const showAd = () => {
    try {
      if (interstitialRef.current?.loaded) {
        interstitialRef.current.show();
      }
    } catch (e) {
      // Silently fail
    }
  };

  return { showAd };
}
