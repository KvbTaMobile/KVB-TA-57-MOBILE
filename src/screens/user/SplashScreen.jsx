import React, { useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";
import { usePushNotificationMutation } from "../../redux/rtk_query/apiSlice";
import { syncPushTokenOnAppStart } from "../../pushnotification/pushSyncOnAppStart";
import { horizontalScale, moderateScale, verticalScale } from "../../globalstyles/Metrics";

SplashScreen.preventAutoHideAsync();

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Brand colors pulled from the KVB mark
const KVB_YELLOW = "#FFDE17";
const KVB_GREEN = "#00A651";

const RING_SIZE = horizontalScale(160);
const RING_RADIUS = RING_SIZE / 2 - 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function SplashScreenAnimated({ onFinish }) {
  const ringProgress = useSharedValue(0);
  const ringOpacity = useSharedValue(0);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);

  const nameOpacity = useSharedValue(0);
  const nameTranslate = useSharedValue(14);

  const taglineOpacity = useSharedValue(0);
  const taglineTranslate = useSharedValue(10);

  const [registerPushDevice] = usePushNotificationMutation();

  // useEffect(() => {
  //   syncPushTokenOnAppStart(registerPushDevice);
  // }, []);

  useEffect(() => {
    const start = async () => {
      await SplashScreen.hideAsync();

      // Ring draws itself in first — echoes the logo's circular mark
      ringOpacity.value = withTiming(1, { duration: 300 });
      ringProgress.value = withTiming(1, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });

      // Logo fades/scales in once the ring is mostly drawn
      logoOpacity.value = withDelay(500, withTiming(1, { duration: 700 }));
      logoScale.value = withDelay(
        500,
        withTiming(1, { duration: 700, easing: Easing.out(Easing.exp) })
      );

      // Full bank name settles in below the logo
      nameOpacity.value = withDelay(1300, withTiming(1, { duration: 700 }));
      nameTranslate.value = withDelay(
        1300,
        withTiming(0, { duration: 700, easing: Easing.out(Easing.exp) })
      );

      // Tagline follows
      taglineOpacity.value = withDelay(1900, withTiming(1, { duration: 600 }));
      taglineTranslate.value = withDelay(1900, withTiming(0, { duration: 600 }));

      setTimeout(onFinish, 4200);
    };

    start();
  }, []);

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  const ringWrapStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const logoWrapStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameTranslate.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslate.value }],
  }));

  return (
    <View style={styles.container}>
      {/* RING + LOGO */}
      <View style={styles.ringStack}>
        <Animated.View style={[styles.ringSvgWrap, ringWrapStyle]}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={KVB_YELLOW}
              strokeWidth={6}
              fill="none"
              opacity={0.35}
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={KVB_GREEN}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              animatedProps={ringAnimatedProps}
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.logoWrap, logoWrapStyle]}>
          <Image
            source={require("../../assets/images/logo1.png")}
            style={styles.logo}
          />
        </Animated.View>
      </View>

      {/* FULL BANK NAME */}
      <Animated.Text style={[styles.name, nameStyle]}>
        KARUR VYSYA BANK
      </Animated.Text>

      <Animated.View style={[styles.divider, nameStyle]} />

      <Animated.Text style={[styles.tagline, taglineStyle]}>
        Smart way to bank
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  ringStack: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(18),
  },

  ringSvgWrap: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
  },

  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: horizontalScale(90),
    height: verticalScale(90),
    resizeMode: "contain",
  },

  name: {
    color: "#1A1A1A",
    fontSize: moderateScale(20),
    fontWeight: "700",
    letterSpacing: moderateScale(2.5),
    textAlign: "center",
  },

  divider: {
    width: horizontalScale(46),
    height: 3,
    borderRadius: 2,
    backgroundColor: KVB_GREEN,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(10),
  },

  tagline: {
    color: KVB_GREEN,
    fontSize: moderateScale(12),
    fontWeight: "500",
    letterSpacing: moderateScale(2),
    textTransform: "uppercase",
    textAlign: "center",
  },
});
