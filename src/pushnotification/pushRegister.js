// import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";
// import { Platform } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import Constants from "expo-constants";

// export async function registerPushAfterLogin({
//   userId,
//   deviceId,
//   registerPushDevice,
// }) {
//   try {
//     if (!Device.isDevice) return;

//     const { status: existingStatus } =
//       await Notifications.getPermissionsAsync();

//     let finalStatus = existingStatus;

//     if (existingStatus !== "granted") {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }

//     if (finalStatus !== "granted") {
//       console.log("Push permission denied");
//       return;
//     }

//     const projectId =
//       Constants.expoConfig?.extra?.eas?.projectId ??
//       Constants.easConfig?.projectId;

//     if (!projectId) {
//       console.log("Project ID not found");
//       return;
//     }

//     const token = (
//       await Notifications.getExpoPushTokenAsync({ projectId })
//     ).data;

//     console.log("Expo Push Token:", token);

//     const storedToken = await AsyncStorage.getItem("PUSH_TOKEN");
//     if (storedToken === token) {
//       console.log("Push token unchanged");
//       return;
//     }

//     await registerPushDevice({
//       userId,
//       deviceId,
//       pushToken: token,
//       platform: Platform.OS,
//     }).unwrap();

//     await AsyncStorage.setItem("PUSH_TOKEN", token);
//     console.log("✅ Push token registered");

//     if (Platform.OS === "android") {
//       await Notifications.setNotificationChannelAsync("default", {
//         name: "default",
//         importance: Notifications.AndroidImportance.MAX,
//       });
//     }
//   } catch (e) {
//     console.log("Push registration failed (ignored):", e);
//   }
// }
