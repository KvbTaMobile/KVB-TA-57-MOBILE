import React, { useCallback, useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as Device from "expo-device";
import { useFonts } from "expo-font";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { PersistedStore, persistor } from "./src/redux/store/PersistedStore";
import { Alert, Platform, BackHandler, Appearance } from "react-native";
import Navigator from "./src/navigator/Navigator";
import SplashScreenAnimated from "./src/screens/user/SplashScreen";
// import {
//   startForegroundLocationTracking,
//   startBackgroundLocationTracking,
//   setupLocationSyncListener,
// } from "./src/services/LocationServices";
import "./src/pushnotification/notificationHandler";
// import PushNotification from "./src/pushnotification/pushNotification";
import { initSpeechSetting } from "./src/utilities/SpeechHelper";
import { useDispatch } from "react-redux";
import { loadTheme, updateSystemTheme } from "./src/redux/slices/themeSlice";
import { getAsyncData } from "./src/redux/store/AsyncStore";

SplashScreen.preventAutoHideAsync();
function AppContent() {
  const dispatch = useDispatch();
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Load theme from AsyncStorage on app start
  useEffect(() => {
    async function loadSavedTheme() {
      await dispatch(loadTheme()); // load theme from storage via thunk
      setThemeLoaded(true);
    }
    loadSavedTheme();
  }, [dispatch]);

  // Listen for system theme changes (auto mode)
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      dispatch(updateSystemTheme(colorScheme));
    });
    return () => listener.remove();
  }, [dispatch]);

  if (!themeLoaded) return null; // or a small loader

  return <Navigator />;
}
export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    light: require("./src/assets/fonts/OpenSans-Light.ttf"),
    regular: require("./src/assets/fonts/OpenSans-Regular.ttf"),
    medium: require("./src/assets/fonts/OpenSans-Medium.ttf"),
    semiBold: require("./src/assets/fonts/OpenSans-SemiBold.ttf"),
    bold: require("./src/assets/fonts/OpenSans-Bold.ttf"),
    extraBold: require("./src/assets/fonts/OpenSans-ExtraBold.ttf"),
  });

  // ✅ Init speech setting ONCE on app load
  useEffect(() => {
    initSpeechSetting();
  }, []);

  const checkRootedDevice = useCallback(async () => {
    const isRooted = await Device.isRootedExperimentalAsync();
    if (isRooted) {
      Alert.alert(
        "Security Violation",
        "For security reasons, this app cannot be used on rooted or jailbroken devices.",
        [{ text: "Exit", onPress: () => BackHandler.exitApp() }]
      );
    } else {
      await SplashScreen.hideAsync();
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      checkRootedDevice();
    }
  }, [fontsLoaded, fontError]);

  // useEffect(() => {
  //   startForegroundLocationTracking();
  //   startBackgroundLocationTracking();
  //   const unsubscribe = setupLocationSyncListener();
  //   return () => unsubscribe();
  // }, []);

  const handleAnimationFinish = () => {
    setShowSplash(false);
  };

  if (!fontsLoaded && !fontError) return null;
  return (
    <Provider store={PersistedStore}>
      <PersistGate loading={null} persistor={persistor}>
        {showSplash ? (
          <SplashScreenAnimated
            onFinish={handleAnimationFinish}
            onLayout={checkRootedDevice}
          />
        ) : (
          <>
            <AppContent />
            {/* <PushNotification /> */}
          </>
        )}
      </PersistGate>
    </Provider>
  );

}
