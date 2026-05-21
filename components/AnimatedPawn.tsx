import React, {
  useEffect,
  useRef,
  memo,
} from 'react';

import {
  Image,
  TouchableOpacity,
  View,
} from 'react-native';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

const AnimatedTouchable =
  Animated.createAnimatedComponent(
    TouchableOpacity,
  );

const AnimatedPawn = ({
  pawn,
  left,
  top,
  image,
  isTouchable,
  onPress,
  styles,
  customStyle
}: any) => {

  // ✅ MUST be inside component
  const scale =
    useSharedValue(1);

  const pulse =
    useSharedValue(1);

  const x =
    useSharedValue(0);

  const y =
    useSharedValue(0);

  const initialized =
    useRef(false);

  // ✅ Pawn touch glow + pulse animation
  const animatedStyle =
    useAnimatedStyle(() => {
      return {
        position: 'absolute',

        shadowColor:
          isTouchable
            ? '#00e5ff'
            : '#000',

        shadowOpacity:
          isTouchable
            ? 0.9
            : 0,

        shadowRadius:
          isTouchable
            ? 12
            : 0,

        elevation:
          isTouchable
            ? 10
            : 0,

        transform: [
          {
            translateX:
              x.value,
          },
          {
            translateY:
              y.value,
          },
          {
            scale:
              scale.value *
              pulse.value,
          },
        ],
      };
    });

  // ✅ Pulsing animation
 // ✅ TAK TAK TAK movement
useEffect(() => {

  // first render
  if (!initialized.current) {

    x.value = left;
    y.value = top;

    initialized.current = true;

    return;
  }

  const startX = x.value;
  const startY = y.value;

  const dx = left - startX;
  const dy = top - startY;

  // estimate box count
  const distance =
    Math.max(
      Math.abs(dx),
      Math.abs(dy),
    );

  const steps =
    Math.max(
      1,
      Math.round(distance / 24),
    );

  for (
    let i = 1;
    i <= steps;
    i++
  ) {

    const nextX =
      startX +
      (dx / steps) * i;

    const nextY =
      startY +
      (dy / steps) * i;

    setTimeout(() => {

      // move one step
      x.value = withTiming(
        nextX,
        {
          duration: 60,
        },
      );

      y.value = withTiming(
        nextY,
        {
          duration: 60,
        },
      );

      // TAK bounce effect
      scale.value =
        withSequence(
          withTiming(0.78, {
            duration: 30,
          }),

          withTiming(1, {
            duration: 35,
          }),
        );

    }, i * 75);
  }

}, [left, top]);

  return (
    <AnimatedTouchable
      activeOpacity={
        isTouchable
          ? 0.8
          : 1
      }
      disabled={!isTouchable}
      onPress={onPress}
      style={[
  styles.boardPawn,

  customStyle,

  {
    left: 0,
    top: 0,
  },

  animatedStyle,
]}
    >
      <View
        style={
          styles.pawnBackplate
        }
      >
        <Image
          source={image}
          style={
            styles.boardPawnImage
          }
          fadeDuration={0}
        />
      </View>
    </AnimatedTouchable>
  );
};

export default memo(
  AnimatedPawn,
);