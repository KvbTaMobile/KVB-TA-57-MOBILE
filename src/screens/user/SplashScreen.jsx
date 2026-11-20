import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { Environment } from "../../environment/Environment";

SplashScreen.preventAutoHideAsync();

const CustomSplashScreen = ({ onFinish }) => {

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn("Error hiding splash:", e);
      }

      onFinish();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>

      <Image
        source={require("../../assets/images/splashScreen.gif")}
        style={styles.backgroundImage}
        contentFit="cover"
        autoplay
      />

      <View style={styles.overlay}>

        <View style={styles.footer}>
          <Text
            allowFontScaling={false}
            style={styles.footerText}
          >
            {`V ${Environment.buildVersion} | ${Environment.buildDate}`}
          </Text>

          <Text
            allowFontScaling={false}
            style={styles.footerText}
          >
            © 2026 KVB · All Rights Reserved
          </Text>
        </View>

      </View>
    </View>
  );
};

export default CustomSplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  footer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  footerText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    marginVertical: 3,
  },
});