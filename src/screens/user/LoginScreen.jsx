import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";
import forge from "node-forge";
import { StatusBar } from "expo-status-bar";
import { getCustomColors } from "../../styles/CustomColors";

import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";

import {
  useLoginMutation,
  // useGetEntityQuery,
  usePushNotificationMutation,
  useLazyUserModulesQuery,
  useGetPublicKeyMutation, // POST endpoint — see apiSlice note below
  // useGetCaptachaQuery,
} from "../../redux/rtk_query/apiSlice";
import {
  storeAsyncData,
} from "../../redux/store/AsyncStore";
import { setUser } from "../../redux/slices/AuthSlice";
import { setEntities, setSelectedEntity } from "../../redux/slices/EntitySlice";
import ModalDropdown from "../../TaComponents/pickers/StylishDropdown";
import Toaster from "../../TaComponents/toast/ToastMessage";
import AnimatedText from "../../TaComponents/buttons/AnimatedText";
import { Environment } from "../../environment/Environment";
import { getDeviceId } from "../../services/deviceId";
import { registerPushAfterLogin } from "../../pushnotification/pushRegister";
import { setUserModules } from "../../redux/slices/UserModulesSlice";
import { apiSlice } from "../../redux/rtk_query/apiSlice";
import { getColors } from "../../globalstyles/Colors";

const SafeArea =
  Platform.OS === "ios"
    ? require("react-native").SafeAreaView
    : require("react-native-safe-area-context").SafeAreaView;

// ── Password encryption — mirrors Angular web's encryptPassword_new ─────────
const cleanPublicKey = (pem) => {
  return pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\r?\n|\r/g, "")
    .trim();
};

const encryptPasswordNew = (password, publicKeyPem) => {
  if (!publicKeyPem) {
    console.error("Public key missing for encryption");
    return "";
  }

  let cleanKey, aesKeyBase, aesKeyHash;
  try {
    cleanKey = cleanPublicKey(publicKeyPem);
    aesKeyBase = cleanKey.slice(0, 6);
    aesKeyHash = CryptoJS.SHA256(aesKeyBase);
  } catch (e) {
    console.error("encryptPasswordNew failed at AES key derivation:", e);
    throw e;
  }

  let aesEncryptedHex;
  try {
    const encrypted = CryptoJS.AES.encrypt(
      password,
      CryptoJS.enc.Hex.parse(aesKeyHash.toString()),
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      }
    );
    aesEncryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  } catch (e) {
    console.error("encryptPasswordNew failed at AES encrypt:", e);
    throw e;
  }

  let rsaPublicKey;
  try {
    rsaPublicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  } catch (e) {
    console.error("encryptPasswordNew failed parsing PEM (forge.pki.publicKeyFromPem):", e);
    throw e;
  }

  try {
    const aesEncryptedBytes = forge.util.hexToBytes(aesEncryptedHex);
    const rsaEncryptedBytes = rsaPublicKey.encrypt(aesEncryptedBytes, "RSA-OAEP");
    return forge.util.bytesToHex(rsaEncryptedBytes);
  } catch (e) {
    console.error("encryptPasswordNew failed at RSA-OAEP encrypt (likely missing crypto.getRandomValues polyfill):", e);
    throw e;
  }
};
// ──────────────────────────────────────────────────────────────────────────

const LoginScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const showCaptcha = Environment.showCaptcha;
  const [form, setForm] = useState({
    username: "sudhakark",
    password: "VS2313",
    // entity_id: 1,
    // captcha: "",
  });

  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Public key — mutation-style endpoint, so it must be triggered manually on mount
  const [getPublicKey, { data: publicKeyData, isLoading: isPublicKeyLoading }] =
    useGetPublicKeyMutation();
  const publicKey = publicKeyData?.public_key;

  useEffect(() => {
    getPublicKey();
  }, []);

  const [login, { isLoading }] = useLoginMutation();
  // const { data: entityData } = useGetEntityQuery();
  const [registerPushDevice] = usePushNotificationMutation();
  const [getUserModule, { isLoading: isUserModulesDataLoading, data: userModulesData }] =
    useLazyUserModulesQuery();

  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);

  const entities = useSelector((state) => state.entity.list);
  const selectedEntity = useSelector((state) => state.entity.selected);
  const modules = useSelector((state) => state.userModules.modules);

  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(40)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (userModulesData?.data?.length > 0) {
      const filtered = userModulesData.data.filter(
        (m) => m.name === "TA e-Claim"
      );
      dispatch(setUserModules(filtered));

      const hasPermission = filtered.length > 0;
      if (hasPermission) {
        navigation.replace("main");
        Toaster("Login successful", "");
      } else {
        Toaster("You don't have permission");
      }
    }
  }, [userModulesData]);

  const registerPushSafely = async (userId) => {
    try {
      const deviceId = await getDeviceId();
      await registerPushAfterLogin({
        userId,
        deviceId,
        registerPushDevice,
      });
    } catch (e) {
      console.log("Push error ignored");
    }
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    const username = form.username?.trim();
    const password = form.password?.trim();

    if (!username || !password) {
      return Toaster("Enter username & password", "");
    }

    if (!publicKey) {
      return Toaster("Public key not loaded yet. Please try again.", "");
    }

    let encryptedPassword;
    try {
      encryptedPassword = encryptPasswordNew(password, publicKey);
    } catch (e) {
      console.error("Password encryption failed:", e);
      return Toaster("Encryption error. Please try again.", "");
    }

    if (!encryptedPassword) {
      return Toaster("Encryption failed. Please try again.", "");
    }

    try {
      const response = await login({
        username,
        password: encryptedPassword,
      }).unwrap();

      await storeAsyncData("token", response.token);
      await storeAsyncData("user", response);
      await storeAsyncData("userid", String(response.user_id));

      dispatch(setUser(response));
      dispatch(apiSlice.util.resetApiState());
      // registerPushSafely(response.user_id);
      getUserModule();
    } catch (err) {
      Toaster("Invalid credentials", "");
    }
  };

  const styles = StyleSheet.create({
    header: {
      height: verticalScale(200),
      justifyContent: "center",
    },
    headerImage: {
      height: verticalScale(80),
    },
    container: {
      paddingHorizontal: horizontalScale(16),
    },
    card: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(22),
      padding: moderateScale(22),
      width: "100%",
      shadowColor: CustomColors.backgroundBlack,
      shadowOffset: { width: 0, height: verticalScale(8) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(10),
      elevation: 4,
      marginBottom: verticalScale(20),
    },
    headerBox: {
      alignItems: "center",
      marginBottom: verticalScale(20),
    },
    welcome: {
      fontSize: moderateScale(22),
      fontWeight: "800",
      color: CustomColors.textBlack,
      textAlign: "center",
    },
    subtitle: {
      fontSize: moderateScale(14),
      color: CustomColors.loginSubTitleColor,
      marginTop: verticalScale(4),
      textAlign: "center",
    },
    trustRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: verticalScale(18),
      paddingRight: horizontalScale(6),
    },
    trustItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: horizontalScale(4),
    },
    trustText: {
      fontSize: moderateScale(11),
      color: CustomColors.loginTrustText,
      fontWeight: "600",
      marginLeft: horizontalScale(4),
    },
    input: {
      height: verticalScale(52),
      borderWidth: 1,
      borderColor: CustomColors.inputBoxOutline,
      borderRadius: moderateScale(14),
      paddingHorizontal: horizontalScale(14),
      marginBottom: verticalScale(14),
      justifyContent: "center",
      backgroundColor: CustomColors.backgroundWhite,
      color: CustomColors.textBlack,
    },
    passwordBox: {
      position: "relative",
      marginBottom: verticalScale(14),
    },
    eyeButton: {
      position: "absolute",
      right: horizontalScale(12),
      top: verticalScale(14),
    },
    loginButton: {
      paddingVertical: verticalScale(16),
      borderRadius: moderateScale(18),
      alignItems: "center",
      marginTop: verticalScale(10),
    },
    loginButtonDisabled: {
      opacity: 0.5,
    },
    loginText: {
      color: CustomColors.backgroundWhite,
      fontWeight: "800",
      fontSize: moderateScale(16),
    },
    forgotRow: {
      alignItems: "flex-end",
      marginTop: verticalScale(6),
      marginBottom: verticalScale(4),
    },
    forgotTouchable: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: verticalScale(6),
      paddingHorizontal: horizontalScale(10),
      borderRadius: moderateScale(20),
      backgroundColor: `${CustomColors.appThemeColor}14`,
      gap: horizontalScale(4),
    },
    forgotText: {
      fontSize: moderateScale(13),
      fontWeight: "700",
      color: CustomColors.appThemeColor,
    },
    quoteBox: {
      marginTop: verticalScale(16),
      paddingHorizontal: horizontalScale(10),
    },
    quoteText: {
      fontSize: moderateScale(12),
      color: CustomColors.loginTrustText,
      fontStyle: "italic",
      textAlign: "center",
    },
    versionText: {
      textAlign: "center",
      marginTop: verticalScale(14),
      color: CustomColors.iconGray,
      fontSize: moderateScale(12),
    },
  });

  const loginDisabled = isLoading || isPublicKeyLoading || !publicKey;

  return (
    <SafeArea style={{ flex: 1, backgroundColor: CustomColors.appThemeColor }}>
      <LinearGradient
        colors={[CustomColors.backgroundWhite, CustomColors.backgroundWhite]}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <ImageBackground
            source={require("../../assets/images/logo1.png")}
            style={styles.headerImage}
            resizeMode="contain"
          />
        </View>

        {/* KEYBOARD HANDLER */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.container}>
                {/* LOGIN CARD */}
                <Animated.View
                  style={[
                    styles.card,
                    {
                      transform: [{ translateY: cardAnim }],
                      opacity: logoAnim,
                    },
                  ]}
                >
                  {/* Header */}
                  <View style={styles.headerBox}>
                    <Text allowFontScaling={false} style={styles.welcome}>Welcome Back</Text>
                    <Text allowFontScaling={false} style={styles.subtitle}>
                      Sign in to access your secure KVB workspace
                    </Text>
                  </View>

                  {/* Trust Row */}
                  <View style={styles.trustRow}>
                    <View style={styles.trustItem}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={CustomColors.appThemeColor}
                      />
                      <Text allowFontScaling={false} style={styles.trustText}>Secure Login</Text>
                    </View>
                    <View style={styles.trustItem}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color={CustomColors.appThemeColor}
                      />
                      <Text allowFontScaling={false} style={styles.trustText}>Encrypted Data</Text>
                    </View>
                    <View style={styles.trustItem}>
                      <Ionicons
                        name="business-outline"
                        size={18}
                        color={CustomColors.appThemeColor}
                      />
                      <Text allowFontScaling={false} style={styles.trustText}>Enterprise Ready</Text>
                    </View>
                  </View>

                  {/* USERNAME */}
                  <TextInput allowFontScaling={false}
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor={CustomColors.iconGray}
                    value={form.username}
                    onChangeText={(t) => setForm({ ...form, username: t })}
                  />

                  {/* PASSWORD */}
                  <View style={styles.passwordBox}>
                    <TextInput allowFontScaling={false}
                      style={[styles.input, { paddingRight: 45 }]}
                      placeholder="Password"
                      placeholderTextColor={CustomColors.iconGray}
                      secureTextEntry={!showPassword}
                      value={form.password}
                      onChangeText={(t) => setForm({ ...form, password: t })}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye" : "eye-off"}
                        size={22}
                        color={CustomColors.backgroundBlack}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* LOGIN BUTTON */}
                  <TouchableOpacity disabled={loginDisabled} onPress={handleLogin}>
                    <Animated.View
                      style={{
                        transform: [
                          {
                            scale: buttonAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.9, 1],
                            }),
                          },
                        ],
                      }}
                    >
                      <LinearGradient
                        colors={[
                          CustomColors.appThemeColor,
                          CustomColors.appThemeColor,
                        ]}
                        style={[
                          styles.loginButton,
                          loginDisabled && styles.loginButtonDisabled,
                        ]}
                      >
                        {isLoading || isUserModulesDataLoading || isPublicKeyLoading ? (
                          <ActivityIndicator
                            color={CustomColors.backgroundWhite}
                          />
                        ) : (
                          <Text allowFontScaling={false} style={styles.loginText}>Login Securely</Text>
                        )}
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Forgot Password */}
                  {/* <View style={styles.forgotRow}>
                    <TouchableOpacity
                      style={styles.forgotTouchable}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate("ForgotPassword")}
                    >
                      <Ionicons
                        name="key-outline"
                        size={14}
                        color={CustomColors.appThemeColor}
                      />
                      <Text allowFontScaling={false} style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View> */}

                  {/* Quote */}
                  <View style={styles.quoteBox}>
                    <Text allowFontScaling={false} style={styles.quoteText}>
                      "Security is not a product, but a process."
                    </Text>
                  </View>
                </Animated.View>

                <Text allowFontScaling={false} style={styles.versionText}>
                  {`${Environment.appVersion} | ${Environment.releaseDate}`}
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ENTITY DROPDOWN */}
        <ModalDropdown
          visible={open}
          data={entities}
          selectedValue={selectedEntity}
          onClose={() => setOpen(false)}
          onSelect={(item) => dispatch(setSelectedEntity(item))}
          label="Select Entity"
        />

        {/* Floating Animated Text */}
        <View style={{ alignItems: "flex-end", marginRight: 16 }}>
          <AnimatedText />
        </View>
      </LinearGradient>
    </SafeArea>
  );
};

export default LoginScreen;