import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import type { Ad } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 180;

interface AdCarouselProps {
  ads: Ad[];
  onAdPress: (ad: Ad) => void;
}

export default function AdCarousel({ ads, onAdPress }: AdCarouselProps) {
  const { t } = useTranslation();
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll carousel every 5s (only when there are ads)
  useEffect(() => {
    if (ads.length < 2) return;
    const interval = setInterval(() => {
      setActiveAdIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % ads.length;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 5000); // 5 seconds
    return () => clearInterval(interval);
  }, [ads.length]);

  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeAdIndex) setActiveAdIndex(roundIndex);
  };

  if (ads.length === 0) {
    return (
      <View style={styles.emptyCarousel}>
        <MaterialIcons name="campaign" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>{t('ads.empty')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.carouselContainer, { height: CAROUSEL_HEIGHT + 30 }]}>
      <FlatList
        ref={flatListRef}
        data={ads}
        keyExtractor={(item) => item.adId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.adSlide} 
            activeOpacity={0.9} 
            onPress={() => onAdPress(item)}
          >
            <View style={styles.adBox}>
              <Image 
                source={{ uri: item.image_url }} 
                style={styles.adImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.overlay}
              >
                <Text style={styles.adBusinessName}>{item.business_name}</Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        )}
      />
      {ads.length > 1 && (
        <View style={styles.dotsContainer}>
          {ads.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeAdIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginTop: Spacing.lg,
  },
  adSlide: {
    width,
    paddingHorizontal: Spacing['2xl'],
  },
  adBox: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
    backgroundColor: Colors.primaryPale,
    borderRadius: 16,
    overflow: 'hidden',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  adBusinessName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.heavy,
    color: Colors.white,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 16,
    backgroundColor: Colors.primary,
  },
  inactiveDot: {
    backgroundColor: Colors.textMuted,
    opacity: 0.4,
  },
  emptyCarousel: {
    marginTop: Spacing['2xl'],
    marginHorizontal: Spacing['2xl'],
    height: CAROUSEL_HEIGHT,
    backgroundColor: Colors.primaryPale,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
