import { View, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@/constants/theme';

const W = Dimensions.get('window').width;

export const WavyHeader = ({ children }: { children: React.ReactNode }) => {
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 420,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    opacity.value = withTiming(1, {
      duration: 380,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <View style={{ backgroundColor: Colors.brandDark, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 }}>
        {children}
      </View>
      <Svg width={W} height={38} viewBox={`0 0 ${W} 38`} style={{ marginTop: -1 }}>
        <Path
          d={`M0,0 C${W*0.15},28 ${W*0.35},38 ${W*0.5},34 C${W*0.65},30 ${W*0.85},16 ${W},28 L${W},0 Z`}
          fill={Colors.brandDark}
        />
      </Svg>
    </Animated.View>
  );
};
