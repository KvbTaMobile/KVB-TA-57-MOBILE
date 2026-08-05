import React, { useEffect } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  Extrapolate,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";

import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";

SplashScreen.preventAutoHideAsync();

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Brand Palette
const BRAND_GREEN = "#00853D";
const LIGHT_GREEN = "#10B981";
const ACCENT_YELLOW = "#FFC700";
const DARK_TEXT = "#111827";
const MUTED_TEXT = "#6B7280";

const RING_SIZE = horizontalScale(210);
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Easing presets
const MODERN_BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

export default function ProfessionalSplashScreen({ onFinish }) {
  /* -------------------------------------------------------------------------- */
  /*                                SHARED VALUES                               */
  /* -------------------------------------------------------------------------- */
  const ambientGlow = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const kvbOpacity = useSharedValue(0);
  const kvbScale = useSharedValue(0.8);

  const shinePosition = useSharedValue(-180);

  const word1 = useSharedValue(0);
  const word2 = useSharedValue(0);
  const word3 = useSharedValue(0);

  const dividerWidth = useSharedValue(0);
  const taglineOffset = useSharedValue(0);
  const finalPulse = useSharedValue(1);
  const masterFade = useSharedValue(1);

  /* -------------------------------------------------------------------------- */
  /*                            TIMELINE ORCHESTRATION                          */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function runTimeline() {
      await SplashScreen.hideAsync();

      // 1. 0 - 400ms: Ambient Yellow Backdrop Expansion
      ambientGlow.value = withTiming(1, {
        duration: 500,
        easing: MODERN_BEZIER,
      });

      // 2. 400 - 1200ms: Smooth Arc Stroke Reveal
      ringOpacity.value = withDelay(350, withTiming(1, { duration: 150 }));
      ringProgress.value = withDelay(
        350,
        withTiming(1, {
          duration: 900,
          easing: MODERN_BEZIER,
        })
      );

      // 3. 900 - 1600ms: KVB Center Brand Pop
      kvbOpacity.value = withDelay(850, withTiming(1, { duration: 400 }));
      kvbScale.value = withDelay(
        850,
        withSequence(
          withTiming(1.06, { duration: 400, easing: MODERN_BEZIER }),
          withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) })
        )
      );

      // 4. 1600 - 2300ms: Diagonal Sheen Sweep Across Circle
      shinePosition.value = withDelay(
        1550,
        withTiming(180, {
          duration: 750,
          easing: Easing.linear,
        })
      );

      // 5. 2300 - 2800ms: Vertical Staggered Text Cascades
      word1.value = withDelay(2200, withTiming(1, { duration: 300, easing: MODERN_BEZIER }));
      word2.value = withDelay(2350, withTiming(1, { duration: 300, easing: MODERN_BEZIER }));
      word3.value = withDelay(2500, withTiming(1, { duration: 300, easing: MODERN_BEZIER }));

      // 6. 2800 - 3200ms: Minimal Divider Expand
      dividerWidth.value = withDelay(2750, withTiming(1, { duration: 450, easing: MODERN_BEZIER }));

      // 7. 3200 - 3500ms: Tagline Reveal
      taglineOffset.value = withDelay(3150, withTiming(1, { duration: 400, easing: MODERN_BEZIER }));

      // 8. 3500 - 3800ms: Micro Brand Pulse
      finalPulse.value = withDelay(
        3500,
        withSequence(
          withTiming(1.025, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 250, easing: Easing.inOut(Easing.quad) })
        )
      );

      // 9. 3800 - 4200ms: Master Fade Transition Out
      masterFade.value = withDelay(
        3800,
        withTiming(0, {
          duration: 450,
          easing: Easing.out(Easing.quad),
        })
      );

      setTimeout(() => {
        onFinish?.();
      }, 4300);
    }

    runTimeline();

    return () => {
      cancelAnimation(ambientGlow);
      cancelAnimation(ringProgress);
      cancelAnimation(kvbScale);
      cancelAnimation(shinePosition);
      cancelAnimation(masterFade);
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                               ANIMATED STYLES                              */
  /* -------------------------------------------------------------------------- */
  const containerStyle = useAnimatedStyle(() => ({
    opacity: masterFade.value,
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - ringProgress.value * 0.88),
  }));

  const glowStyle = useAnimatedStyle(() => {
    const scale = interpolate(ambientGlow.value, [0, 1], [0.3, 1]);
    const opacity = interpolate(ambientGlow.value, [0, 1], [0, 0.45]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const centerBrandStyle = useAnimatedStyle(() => ({
    opacity: kvbOpacity.value,
    transform: [{ scale: kvbScale.value * finalPulse.value }],
  }));

  const ringContainerStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shinePosition.value }, { rotate: "-30deg" }],
    opacity: interpolate(
      shinePosition.value,
      [-180, 0, 180],
      [0, 0.9, 0],
      Extrapolate.CLAMP
    ),
  }));

  const makeWordStyle = (sharedVal) =>
    useAnimatedStyle(() => ({
      opacity: sharedVal.value,
      transform: [
        { translateY: interpolate(sharedVal.value, [0, 1], [14, 0]) },
      ],
    }));

  const word1Style = makeWordStyle(word1);
  const word2Style = makeWordStyle(word2);
  const word3Style = makeWordStyle(word3);

  const dividerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: dividerWidth.value }],
    opacity: dividerWidth.value,
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: taglineOffset.value,
    transform: [
      { translateY: interpolate(taglineOffset.value, [0, 1], [10, 0]) },
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Dynamic Ambient Yellow Glow */}
      <Animated.View style={[styles.ambientGlow, glowStyle]}>
        <Svg height={RING_SIZE * 2.2} width={RING_SIZE * 2.2}>
          <Defs>
            <RadialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={ACCENT_YELLOW} stopOpacity="0.8" />
              <Stop offset="60%" stopColor={ACCENT_YELLOW} stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle
            cx={RING_SIZE * 1.1}
            cy={RING_SIZE * 1.1}
            r={RING_SIZE * 1.1}
            fill="url(#bgGlow)"
          />
        </Svg>
      </Animated.View>

      {/* Center Ring + KVB Hero Section */}
      <View style={styles.heroWrapper}>
        {/* Vector Rings */}
        <Animated.View style={[styles.ringLayer, ringContainerStyle]}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Subtle Inner Accent Track */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS - 8}
              stroke={ACCENT_YELLOW}
              strokeWidth={2}
              opacity={0.4}
              fill="none"
            />
            {/* Main Background Track */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={BRAND_GREEN}
              strokeWidth={STROKE_WIDTH}
              opacity={0.12}
              fill="none"
            />
            {/* Dynamic Animated Crescent Arc */}
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={BRAND_GREEN}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={ringProps}
              rotation="-110"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
        </Animated.View>

        {/* Center KVB Monogram */}
        <Animated.View style={[styles.kvbCard, centerBrandStyle]}>
          <Text style={styles.centerKvbText}>KVB</Text>

          {/* Premium Sheen Sweep Effect */}
          <Animated.View
            pointerEvents="none"
            style={[styles.shineContainer, shineStyle]}
          >
            <Svg width={80} height={180}>
              <Defs>
                <LinearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect width="80" height="180" fill="url(#shineGrad)" />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Typography Layout */}
      <View style={styles.titleSection}>
        <Animated.Text style={[styles.brandTitle, styles.greenText, word1Style]}>
          KARUR
        </Animated.Text>
        <Animated.Text style={[styles.brandTitle, styles.mutedText, word2Style]}>
          VYSYA
        </Animated.Text>
        <Animated.Text style={[styles.brandTitle, styles.greenText, word3Style]}>
          BANK
        </Animated.Text>
      </View>

      {/* Accent Divider */}
      <Animated.View style={[styles.divider, dividerStyle]} />

      {/* Brand Tagline */}
      <Animated.Text style={[styles.tagline, tagStyle]}>
        Smart way to bank
      </Animated.Text>
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/*                               STYLESHEET                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  ambientGlow: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  heroWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(28),
  },
  ringLayer: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  kvbCard: {
    width: RING_SIZE - STROKE_WIDTH * 4,
    height: RING_SIZE - STROKE_WIDTH * 4,
    borderRadius: (RING_SIZE - STROKE_WIDTH * 4) / 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  centerKvbText: {
    fontSize: moderateScale(38),
    fontWeight: "900",
    color: DARK_TEXT,
    letterSpacing: 2,
    textAlign: "center",
  },
  shineContainer: {
    position: "absolute",
    width: horizontalScale(80),
    height: horizontalScale(180),
  },
  titleSection: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: verticalScale(8),
  },
  brandTitle: {
    fontSize: moderateScale(28),
    fontWeight: "800",
    letterSpacing: 2,
    lineHeight: moderateScale(34),
    textAlign: "center",
  },
  greenText: {
    color: BRAND_GREEN,
  },
  mutedText: {
    color: MUTED_TEXT,
  },
  divider: {
    width: horizontalScale(96),
    height: 3,
    borderRadius: 2,
    backgroundColor: BRAND_GREEN,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(14),
  },
  tagline: {
    fontSize: moderateScale(13),
    color: BRAND_GREEN,
    letterSpacing: 1.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});