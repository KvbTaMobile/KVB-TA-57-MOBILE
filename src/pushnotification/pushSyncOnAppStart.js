// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";
// import { Platform } from "react-native";

// export async function syncPushTokenOnAppStart(registerPushDevice) {
//   try {
//     if (!Device.isDevice) return;

//     const userId = await AsyncStorage.getItem("userid");
//     if (!userId) return;

//     const permission = await Notifications.getPermissionsAsync();
//     if (permission.status !== "granted") return;

//     const token = (await Notifications.getExpoPushTokenAsync()).data;
//     const storedToken = await AsyncStorage.getItem("PUSH_TOKEN");

//     if (storedToken !== token) {
//       await registerPushDevice({
//         userId: Number(userId),
//         deviceId: userId, 
//         pushToken: token,
//         platform: Platform.OS,
//       }).unwrap();

//       await AsyncStorage.setItem("PUSH_TOKEN", token);
//       console.log("🔄 Push token refreshed & synced");
//     }
//   } catch (e) {
//     console.log("Push sync ignored:", e);
//   }
// }
