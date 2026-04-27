import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Text,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, Radius } from '@/constants/theme';

const { width: W } = Dimensions.get('window');
const ISLAND_WIDTH = W - 56;
const ISLAND_HEIGHT = 62;

interface TabProps {
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TabButton = ({ name, icon, label, isActive, onPress }: TabProps) => {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(isActive ? 1.08 : 1);
  const labelOpacity = useSharedValue(isActive ? 1 : 0);
  const bgOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    iconScale.value = withSpring(isActive ? 1.08 : 1);
    labelOpacity.value = withTiming(isActive ? 1 : 0, { duration: 200 });
    bgOpacity.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    maxWidth: labelOpacity.value === 0 ? 0 : 100, // Simple way to handle layout
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(201, 136, 58, ${bgOpacity.value * 0.15})`,
  }));

  const animatedWrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={styles.tabPressable}
    >
      <Animated.View style={[styles.tabContent, animatedBgStyle, animatedWrapperStyle]}>
        <Animated.View style={animatedIconStyle}>
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={isActive ? Colors.brandLight : 'rgba(250, 244, 238, 0.30)'}
          />
        </Animated.View>
        {isActive && (
          <Animated.View style={[styles.labelWrapper, animatedLabelStyle]}>
            <Text style={styles.labelText}>{label}</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
};

export const DynamicIsland = ({
  activeTab,
  onTabPress,
}: {
  activeTab: string;
  onTabPress: (tab: string) => void;
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.island}>
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={80}
          tint="dark"
        />
        <View style={styles.inner}>
          <TabButton
            name="home"
            icon="home"
            label="Home"
            isActive={activeTab === 'home'}
            onPress={() => onTabPress('home')}
          />
          <TabButton
            name="khata"
            icon="book-open-variant"
            label="Khata"
            isActive={activeTab === 'khata'}
            onPress={() => onTabPress('khata')}
          />
          <TabButton
            name="ads"
            icon="bullhorn"
            label="Discover"
            isActive={activeTab === 'ads'}
            onPress={() => onTabPress('ads')}
          />
          <TabButton
            name="profile"
            icon="account"
            label="Profile"
            isActive={activeTab === 'profile'}
            onPress={() => onTabPress('profile')}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    width: W,
    alignItems: 'center',
    zIndex: 1000,
  },
  island: {
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 6, 1, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    // Shadow for iOS
    shadowColor: Colors.brandDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    // Elevation for Android
    elevation: 10,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
  },
  labelWrapper: {
    marginLeft: 8,
    overflow: 'hidden',
  },
  labelText: {
    color: Colors.brandLight,
    fontFamily: Fonts.semibold,
    fontSize: 9,
  },
});
