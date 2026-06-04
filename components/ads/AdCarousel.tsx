import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import type { Ad } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { getOptimizedImageUrl } from '../../utils/cloudinaryUtils';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate,
  Extrapolate,
  withSpring,
  useDerivedValue,
  SharedValue
} from 'react-native-reanimated';
import { Colors as ThemeColors, Fonts, Radius } from '../../constants/theme';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width * 0.85;
const SLIDE_SPACING = (width - SLIDE_WIDTH) / 2;
const CAROUSEL_HEIGHT = 200;

interface AdCarouselProps {
  ads: Ad[];
  onAdPress: (ad: Ad) => void;
}

export default function AdCarousel({ ads, onAdPress }: AdCarouselProps) {
  const { t } = useTranslation();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<Animated.FlatList<Ad>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-scroll logic
  useEffect(() => {
    if (ads.length < 2) return;
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % ads.length;
      flatListRef.current?.scrollToIndex({ 
        index: nextIndex, 
        animated: true,
        viewPosition: 0.5 
      });
      setActiveIndex(nextIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads.length, activeIndex]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  if (ads.length === 0) {
    return (
      <View style={styles.emptyCarousel}>
        <View style={styles.emptyIconContainer}>
          <MaterialIcons name="campaign" size={40} color={ThemeColors.brandMid} />
        </View>
        <Text style={{ fontFamily: Fonts.bold, fontSize: 15, color: ThemeColors.textSecondary }}>
          {t('ads.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={ads}
        keyExtractor={(item) => item.adId}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLIDE_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SLIDE_SPACING }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <CarouselItem 
            item={item} 
            index={index} 
            scrollX={scrollX} 
            onPress={() => onAdPress(item)} 
          />
        )}
      />

      {/* ANIMATED DOTS */}
      {ads.length > 1 && (
        <View style={styles.pagination}>
          {ads.map((_, i) => (
            <PaginationDot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>
      )}
    </View>
  );
}

function CarouselItem({ item, index, scrollX, onPress }: { item: Ad, index: number, scrollX: SharedValue<number>, onPress: () => void }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SLIDE_WIDTH,
      index * SLIDE_WIDTH,
      (index + 1) * SLIDE_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolate.CLAMP
    );

    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [25, 0, 25],
      Extrapolate.CLAMP
    );

    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [-15, 0, 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { perspective: 1000 },
        { scale },
        { rotateY: `${rotateY}deg` },
        { translateX }
      ],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.slideContainer, animatedStyle]}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={onPress}
        style={styles.slide}
      >
        <Image 
          source={getOptimizedImageUrl(item.image_url, 800) ?? undefined}
          cachePolicy="disk"
          transition={200}
          style={styles.image}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(26, 8, 3, 0.9)']}
          style={styles.overlay}
        >
          <Text style={styles.businessName} numberOfLines={1}>
            {item.business_name}
          </Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.owner_name}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PaginationDot({ index, scrollX }: { index: number, scrollX: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SLIDE_WIDTH,
      index * SLIDE_WIDTH,
      (index + 1) * SLIDE_WIDTH,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    return {
      width,
      opacity,
      backgroundColor: index % 2 === 0 ? ThemeColors.brandLight : ThemeColors.brandDark,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  slideContainer: {
    width: SLIDE_WIDTH,
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width: SLIDE_WIDTH - 10,
    height: CAROUSEL_HEIGHT,
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 8,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  businessName: {
    fontSize: 20,
    fontFamily: Fonts.extrabold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  tagText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  emptyCarousel: {
    marginTop: 20,
    marginHorizontal: 24,
    height: 180,
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ThemeColors.creamBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
