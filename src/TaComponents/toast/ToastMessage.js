import React from "react";
import Toast from "react-native-root-toast";
import { Platform, ToastAndroid, Alert } from "react-native";
import { logout as clearAuth } from "../../redux/slices/AuthSlice"; // ✅ correct import
import { speak, isSpeechEnabled } from "../../utilities/SpeechHelper";

export default function ToastMessage(message, logout = false, dispatch) {
  // Normalize message to string if an object was passed
  if (typeof message === "object" && message !== null) {
    message = message.text2 || message.text1 || message.message || message.description || JSON.stringify(message);
  }
  message = String(message ?? "");

  // 🔊 Speak message only if speech is enabled globally
  if (isSpeechEnabled() && message) {
    speak(message);
  }

  if (Platform.OS === "ios") {
    if (logout && dispatch) {
      Alert.alert("Authentication Failed!", message, [
        {
          text: "Sign out",
          onPress: () => {
            dispatch(clearAuth());
          },
          style: "default",
        },
      ]);
    } else {
      let toast = Toast.show(message, {
        duration: Toast.durations.LONG,
        position: 70,
        shadow: true,
        animation: true,
        hideOnPress: true,
        delay: 0,
      });

      setTimeout(() => {
        Toast.hide(toast);
      }, 2000);
    }
  } else {
    if (logout && dispatch) {
      Alert.alert("Authentication Failed!", message, [
        {
          text: "Sign out",
          onPress: () => {
            dispatch(clearAuth());
          },
          style: "default",
        },
      ]);
    } else {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
  }
}

ToastMessage.show = function (options, logout = false, dispatch) {
  return ToastMessage(options, logout, dispatch);
};
