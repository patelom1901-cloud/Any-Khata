import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface ParticleProps {
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
}

const Particle = ({ x, y, color, size, delay }: ParticleProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const randomAngle = Math.random() * Math.PI * 2;
    const randomDistance = 80 + Math.random() * 200;
    
    translateX.value = withDelay(delay, withTiming(Math.cos(randomAngle) * randomDistance, {
      duration: 1000,
      easing: Easing.out(Easing.exp),
    }));
    
    translateY.value = withDelay(delay, withTiming(Math.sin(randomAngle) * randomDistance, {
      duration: 1000,
      easing: Easing.out(Easing.exp),
    }));
    
    opacity.value = withDelay(delay, withTiming(0, {
      duration: 1000,
      easing: Easing.in(Easing.quad),
    }));
    
    scale.value = withDelay(delay, withTiming(0, {
      duration: 1000,
    }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: x,
          top: y,
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const ParticleEffect = ({ 
  layout, 
  color, 
  onComplete 
}: { 
  layout: { x: number, y: number, width: number, height: number }, 
  color: string,
  onComplete?: () => void 
}) => {
  const particles = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    x: layout.x + Math.random() * layout.width,
    y: layout.y + Math.random() * layout.height,
    size: 3 + Math.random() * 8,
    delay: Math.random() * 300,
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => (
        <Particle 
          key={p.id}
          x={p.x}
          y={p.y}
          color={color}
          size={p.size}
          delay={p.delay}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    zIndex: 9999,
  },
});
