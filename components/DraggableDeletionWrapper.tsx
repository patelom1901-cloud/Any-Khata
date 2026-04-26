import React, { useState } from 'react';
import { StyleSheet, View, Platform, Vibration } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface DraggableDeletionWrapperProps {
  children: React.ReactNode;
  onDelete: () => void;
  onActivate: (layout: { x: number, y: number, width: number, height: number }) => void;
  onDeactivate: () => void;
  dustbinLayout?: { x: number, y: number, width: number, height: number } | null;
}

export const DraggableDeletionWrapper = ({
  children,
  onDelete,
  onActivate,
  onDeactivate,
  dustbinLayout,
}: DraggableDeletionWrapperProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isActive = useSharedValue(false);
  const [localLayout, setLocalLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const triggerVibration = () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(1000)
    .onStart((event) => {
      isActive.value = true;
      scale.value = withSpring(1.05);
      runOnJS(triggerVibration)();
      runOnJS(onActivate)({ 
        x: event.absoluteX - event.x, 
        y: event.absoluteY - event.y, 
        width: localLayout.width, 
        height: localLayout.height 
      });
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      
      if (dustbinLayout) {
        const dustbinCenterX = dustbinLayout.x + dustbinLayout.width / 2;
        const dustbinCenterY = dustbinLayout.y + dustbinLayout.height / 2;
        
        const dist = Math.sqrt(
          Math.pow(event.absoluteX - dustbinCenterX, 2) +
          Math.pow(event.absoluteY - dustbinCenterY, 2)
        );

        if (dist < 80) {
          scale.value = withSpring(0.4);
        } else {
          scale.value = withSpring(1.05);
        }
      }
    })
    .onEnd((event) => {
      let droppedInDustbin = false;
      if (dustbinLayout) {
        const dustbinCenterX = dustbinLayout.x + dustbinLayout.width / 2;
        const dustbinCenterY = dustbinLayout.y + dustbinLayout.height / 2;
        
        const dist = Math.sqrt(
          Math.pow(event.absoluteX - dustbinCenterX, 2) +
          Math.pow(event.absoluteY - dustbinCenterY, 2)
        );

        if (dist < 80) {
          droppedInDustbin = true;
        }
      }

      if (droppedInDustbin) {
        runOnJS(onDelete)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        isActive.value = false;
        runOnJS(onDeactivate)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: isActive.value ? 9999 : 1,
    shadowOpacity: interpolate(scale.value, [1, 1.05], [0, 0.2], Extrapolate.CLAMP),
    shadowRadius: interpolate(scale.value, [1, 1.05], [0, 10], Extrapolate.CLAMP),
    elevation: interpolate(scale.value, [1, 1.05], [0, 10], Extrapolate.CLAMP),
  }));

  return (
    <View 
      onLayout={(e) => setLocalLayout(e.nativeEvent.layout)}
      style={styles.container}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
});
