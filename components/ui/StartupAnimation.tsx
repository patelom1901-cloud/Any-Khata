import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOGO_SIZE = 180;
const PARTICLE_COUNT = 45;

const Particle = ({ index, onComplete }: { index: number, onComplete?: () => void }) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  
  // Random start positions from edges
  const startSide = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  let startX = 0;
  let startY = 0;
  
  const margin = 50;
  if (startSide === 0) { startX = Math.random() * SCREEN_WIDTH; startY = -margin; }
  else if (startSide === 1) { startX = SCREEN_WIDTH + margin; startY = Math.random() * SCREEN_HEIGHT; }
  else if (startSide === 2) { startX = Math.random() * SCREEN_WIDTH; startY = SCREEN_HEIGHT + margin; }
  else { startX = -margin; startY = Math.random() * SCREEN_HEIGHT; }

  // Target a small area around the center
  const targetX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 40;
  const targetY = SCREEN_HEIGHT / 2 + (Math.random() - 0.5) * 40;

  useEffect(() => {
    progress.value = withDelay(
      index * 25,
      withTiming(1, {
        duration: 1500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }, (finished) => {
        if (finished) {
           opacity.value = withTiming(0, { duration: 400 });
           if (onComplete) {
             runOnJS(onComplete)();
           }
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const x = startX + (targetX - startX) * progress.value;
    const y = startY + (targetY - startY) * progress.value;
    const scale = 1.5 - progress.value * 0.8;
    
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: scale }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View 
      style={[
        styles.particle, 
        { backgroundColor: index % 3 === 0 ? Colors.brandLight : (index % 3 === 1 ? Colors.brandMid : Colors.brandDark) },
        animatedStyle
      ]} 
    />
  );
};

export default function StartupAnimation({ onFinish }: { onFinish: () => void }) {
  const [showLogo, setShowLogo] = useState(false);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);

  const handleParticlesComplete = () => {
    setShowLogo(true);
    logoScale.value = withTiming(1, { 
      duration: 1000, 
      easing: Easing.out(Easing.back(1.5)) 
    });
    logoOpacity.value = withTiming(1, { duration: 800 });
    
    // Final completion trigger
    setTimeout(() => {
      onFinish();
    }, 1200);
  };

  return (
    <View style={styles.container}>
      {!showLogo && Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle 
          key={i} 
          index={i} 
          onComplete={i === PARTICLE_COUNT - 1 ? handleParticlesComplete : undefined} 
        />
      ))}
      
      {showLogo && (
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Image 
            source={require('../../assets/Any Khata logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 0,
    left: 0,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
