// import { useEffect, useState } from "react";
// import { View, Text, Button } from "react-native";
// import * as Notifications from "expo-notifications";
// import { registerPushAfterLogin } from "./pushRegister";

// export default function PushNotification() {
//   const [expoPushToken, setExpoPushToken] = useState("");
//   const [notification, setNotification] = useState(null);

//   useEffect(() => {
//     registerPushAfterLogin().then(setExpoPushToken);

//     const sub1 = Notifications.addNotificationReceivedListener(setNotification);
//     const sub2 =
//       Notifications.addNotificationResponseReceivedListener((res) => {
//         console.log("Notification tapped:", res);
//       });

//     return () => {
//       sub1.remove();
//       sub2.remove();
//     };
//   }, []);
// }
