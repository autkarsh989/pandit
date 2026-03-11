import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

type SpecialOffer = {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  effect_type: 'badge' | 'flash' | 'glow' | 'pulse';
  effect_color: string;
};

type Props = {
  offer: SpecialOffer;
  style?: any;
};

export default function SpecialOfferBadge({ offer, style }: Props) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (offer.effect_type === 'flash') {
      // Flash effect
      const flashAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      );
      flashAnimation.start();
      return () => flashAnimation.stop();
    } else if (offer.effect_type === 'pulse') {
      // Pulse effect
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else if (offer.effect_type === 'glow') {
      // Glow effect
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      glowAnimation.start();
      return () => glowAnimation.stop();
    }
  }, [offer.effect_type]);

  const formatDiscount = () => {
    if (offer.discount_percentage) {
      return `${offer.discount_percentage}% OFF`;
    }
    if (offer.discount_amount) {
      return `Rs ${offer.discount_amount} OFF`;
    }
    return offer.title;
  };

  const getAnimatedStyle = () => {
    const baseStyle = {
      backgroundColor: offer.effect_color,
      transform: [{ scale: scaleValue }],
    };

    if (offer.effect_type === 'flash') {
      return {
        ...baseStyle,
        opacity: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        }),
      };
    } else if (offer.effect_type === 'glow') {
      return {
        ...baseStyle,
        shadowOpacity: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 0.8],
        }),
        shadowRadius: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [4, 12],
        }),
      };
    }

    return baseStyle;
  };

  return (
    <Animated.View style={[styles.container, getAnimatedStyle(), style]}>
      <Text style={styles.text}>{formatDiscount()}</Text>
      {offer.description && (
        <Text style={styles.description}>{offer.description}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 2,
  },
});