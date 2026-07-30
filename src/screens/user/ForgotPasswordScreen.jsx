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
  Pressable,
  Keyboard,
  SafeAreaView as RNSafeAreaView,
} from "react-native";
import { SafeAreaView as ContextSafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import CryptoJS from "crypto-js";

import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";

import { useForgotPasswordMutation } from "../../redux/rtk_query/apiSlice";
import Toaster from "../../TaComponents/toast/ToastMessage";
import { getCustomColors } from "../../styles/CustomColors";
import { Environment } from "../../environment/Environment";

const SafeArea = Platform.OS === "ios" ? RNSafeAreaView : ContextSafeAreaView;

const buildStyles = (CustomColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: CustomColors.appThemeColor },
    gradient: { flex: 1 },
    header: { height: verticalScale(160), justifyContent: "center", alignItems: 'center' },
    headerImage: { height: verticalScale(80), width: horizontalScale(180) },
    container: { paddingHorizontal: horizontalScale(20) },
    card: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(28),
      padding: moderateScale(24),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      marginTop: verticalScale(-20),
      marginBottom: verticalScale(20),
    },
    headerBox: { alignItems: "center", marginBottom: verticalScale(20) },
    welcome: { fontSize: moderateScale(22), fontWeight: "800", color: CustomColors.textBlack },
    subtitle: { fontSize: moderateScale(14), color: CustomColors.loginSubTitleColor, textAlign: "center", marginTop: 4 },
    fieldLabel: { fontSize: moderateScale(13), fontWeight: "700", color: CustomColors.textBlack, marginBottom: 8, marginLeft: 4 },
    input: {
      height: verticalScale(54),
      borderWidth: 1.5,
      borderColor: CustomColors.inputBoxOutline,
      borderRadius: moderateScale(16),
      paddingHorizontal: horizontalScale(16),
      marginBottom: verticalScale(14),
      color: CustomColors.textBlack,
    },
    // --- Strength Meter Styles ---
    strengthContainer: { marginBottom: verticalScale(18), paddingHorizontal: 4 },
    strengthBarBackground: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
    strengthBarFill: { height: '100%', borderRadius: 3 },
    strengthText: { fontSize: moderateScale(11), fontWeight: '700', textTransform: 'uppercase' },
    // ----------------------------
    passwordBox: { position: "relative" },
    eyeButton: { position: "absolute", right: horizontalScale(14), top: verticalScale(14) },
    matchRow: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(15), marginLeft: 4 },
    matchText: { fontSize: moderateScale(12), marginLeft: 5, fontWeight: '600' },
    loginButton: { height: verticalScale(56), borderRadius: moderateScale(16), overflow: 'hidden', marginTop: 10 },
    buttonGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loginText: { color: "#FFF", fontWeight: "800", fontSize: moderateScale(16) },
    backButton: { paddingVertical: verticalScale(15), alignItems: "center" },
    backText: { color: CustomColors.iconGray, fontWeight: "600" },
  });

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const styles = React.useMemo(() => buildStyles(CustomColors), [isDark]);

  const [userCode, setUserCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  // --- Password Strength Logic ---
  const getStrength = (pw) => {
    if (!pw) return { score: 0, label: "", color: "#E5E7EB" };
    let score = 0;
    if (pw.length > 6) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    switch (score) {
      case 1: return { score: 25, label: "Weak", color: "#ef4444" };
      case 2: return { score: 50, label: "Fair", color: "#f59e0b" };
      case 3: return { score: 75, label: "Good", color: "#3b82f6" };
      case 4: return { score: 100, label: "Strong", color: "#10b981" };
      default: return { score: 10, label: "Too Short", color: "#94a3b8" };
    }
  };

  const strength = getStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleReset = async () => {
    if (!userCode.trim()) return Toaster("Enter user code", "");
    // if (strength.score < 50) return Toaster("Password is too weak", "");
    if (!passwordsMatch) return Toaster("Passwords do not match", "");

    try {
      const encryptedPassword = CryptoJS.SHA256(newPassword).toString(CryptoJS.enc.Hex);
      await forgotPassword({ code: userCode.trim(), password: encryptedPassword }).unwrap();
      Toaster("Success!", "");
      navigation.goBack();
    } catch (err) {
      Toaster(err?.data?.message || "Error resetting password", "");
    }
  };

  return (
    <SafeArea style={styles.safeArea}>
       <LinearGradient colors={[CustomColors.backgroundWhite, CustomColors.backgroundWhite]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <ImageBackground source={require("../../assets/images/logo1.png")} style={styles.headerImage} resizeMode="contain" />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.container}>
              <View style={styles.card}>
                <View style={styles.headerBox}>
                  <Text allowFontScaling={false} style={styles.welcome}>Reset Password</Text>
                  <Text allowFontScaling={false} style={styles.subtitle}>Enter your details to secure your account</Text>
                </View>

                <Text allowFontScaling={false} style={styles.fieldLabel}>User Code</Text>
                <TextInput allowFontScaling={false}
                  style={styles.input} 
                  value={userCode} 
                  onChangeText={setUserCode} 
                  placeholder="User Code" 
                  autoCapitalize="none"
                />

                <Text allowFontScaling={false} style={styles.fieldLabel}>New Password</Text>
                <View style={styles.passwordBox}>
                  <TextInput allowFontScaling={false}
                    style={[styles.input, { paddingRight: 50 }]}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter Password"
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons name={showNewPassword ? "eye" : "eye-off"} size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Password Strength Meter UI */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text allowFontScaling={false} style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
                      <Text allowFontScaling={false} style={[styles.strengthText, { color: '#94a3b8' }]}>{strength.score}%</Text>
                    </View>
                    <View style={styles.strengthBarBackground}>
                      <Animated.View style={[styles.strengthBarFill, { width: `${strength.score}%`, backgroundColor: strength.color }]} />
                    </View>
                  </View>
                )}

                <Text allowFontScaling={false} style={styles.fieldLabel}>Confirm Password</Text>
                <View style={styles.passwordBox}>
                  <TextInput allowFontScaling={false}
                    style={[styles.input, { paddingRight: 50 }]}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Enter Confirm Password"
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {confirmPassword.length > 0 && (
                  <View style={styles.matchRow}>
                    <Ionicons name={passwordsMatch ? "checkmark-circle" : "close-circle"} size={16} color={passwordsMatch ? "#10b981" : "#ef4444"} />
                    <Text allowFontScaling={false} style={[styles.matchText, { color: passwordsMatch ? "#10b981" : "#ef4444" }]}>
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </Text>
                  </View>
                )}

                <TouchableOpacity style={styles.loginButton} disabled={isLoading} onPress={handleReset}>
                  <LinearGradient colors={[CustomColors.appThemeColor, CustomColors.appThemeColor]} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {isLoading ? <ActivityIndicator color={CustomColors.white} /> : <Text allowFontScaling={false} style={styles.loginText}>Update Password</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Text allowFontScaling={false} style={styles.backText}>Back to Login</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeArea>
  );
};

export default ForgotPasswordScreen;