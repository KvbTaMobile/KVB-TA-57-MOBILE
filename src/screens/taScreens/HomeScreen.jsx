import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  ScrollView,
  StatusBar,
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation, useRoute, useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// Metrics & Fonts
import { horizontalScale, verticalScale, moderateScale } from "../../globalstyles/Metrics";
import { getCustomColors } from "../../styles/CustomColors";
import { Fonts } from "../../styles/Fonts";

// Icon library: MaterialCommunityIcons
import { MaterialCommunityIcons } from "@expo/vector-icons";

const getInitials = (name) => {
  if (!name) return "TA";
  const clean = name.replace(/^Emp\s*ID:\s*/i, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

export default function DashboardScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [menuData, setMenuData] = useState([]);
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);

  const { openDrawer = () => {}, permittedList = [] } = route?.params || {};
  const user = useSelector((state) => state.auth?.user);
  const isFocused = useIsFocused();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  };

  // 🔑 All icons use MaterialCommunityIcons, supporting both index/id and label/name
  const menuItems_TA = [
    {
      id: 1,
      index: 1,
      label: "Tour ID Creation",
      name: "Tour ID Creation",
      iconLib: "MaterialCommunityIcons",
      iconName: "airplane-takeoff",
      gradient: ["#0284c7", "#38bdf8"],
      route: "travel_maker_summary",
    },
    {
      id: 2,
      index: 2,
      label: "Tour ID Approval",
      name: "Tour ID Approval",
      iconLib: "MaterialCommunityIcons",
      iconName: "clipboard-check-outline",
      gradient: ["#059669", "#34d399"],
      route: "travel_approver_summary",
    },
    {
      id: 3,
      index: 3,
      label: "Advance Request",
      name: "Advance Request",
      iconLib: "MaterialCommunityIcons",
      iconName: "cash-fast",
      gradient: ["#2563eb", "#60a5fa"],
      route: "advance_maker_summary",
    },
    {
      id: 4,
      index: 4,
      label: "Advance Approval",
      name: "Advance Approval",
      iconLib: "MaterialCommunityIcons",
      iconName: "cash-check",
      gradient: ["#0d9488", "#2dd4bf"],
      route: "advance_approver_summary",
    },
    {
      id: 5,
      index: 5,
      label: "Claim Submission",
      name: "Claim Submission",
      iconLib: "MaterialCommunityIcons",
      iconName: "wallet-outline",
      gradient: ["#d97706", "#fbbf24"],
      route: "ExpenseMaker",
    },
    {
      id: 6,
      index: 6,
      label: "Claim Approval",
      name: "Claim Approval",
      iconLib: "MaterialCommunityIcons",
      iconName: "wallet-membership",
      gradient: ["#7c3aed", "#a78bfa"],
      route: "ExpenseApproval",
    },
    {
      id: 7,
      index: 7,
      label: "Cancel Request",
      name: "Cancel Request",
      iconLib: "MaterialCommunityIcons",
      iconName: "close-circle-outline",
      gradient: ["#e11d48", "#fb7185"],
      route: "cancel_maker_summary",
    },
    {
      id: 8,
      index: 8,
      label: "Cancel Approval",
      name: "Cancel Approval",
      iconLib: "MaterialCommunityIcons",
      iconName: "cancel",
      gradient: ["#dc2626", "#f87171"],
      route: "cancel_approver_summary",
    },
    {
      id: 9,
      index: 9,
      label: "Assign Approver",
      name: "Assign Approver",
      iconLib: "MaterialCommunityIcons",
      iconName: "account-check-outline",
      gradient: ["#0891b2", "#22d3ee"],
      route: "assign_approver",
    },
    {
      id: 10,
      index: 10,
      label: "Advance Recovery",
      name: "Advance Recovery",
      iconLib: "MaterialCommunityIcons",
      iconName: "cash-refund",
      gradient: ["#4f46e5", "#818cf8"],
      route: "advance_recovery",
    },
    {
      id: 11,
      index: 11,
      label: "Settlement Approval",
      name: "Settlement Approval",
      iconLib: "MaterialCommunityIcons",
      iconName: "file-check-outline",
      gradient: ["#c2410c", "#fb923c"],
      route: "settlement_approval",
    },
    {
      id: 12,
      index: 12,
      label: "Tour Report",
      name: "Tour Report",
      iconLib: "MaterialCommunityIcons",
      iconName: "file-chart-outline",
      gradient: ["#15803d", "#4ade80"],
      route: "tour_report",
    },
  ];

  const getFilteredMenuItems = () => {
    if (!permittedList || permittedList.length === 0) return [];
    const permittedIndexes = new Set(
      permittedList
        .map((p) => (p.index !== undefined ? p.index : p.id))
        .filter((val) => val !== undefined && val !== null)
    );
    const permittedNames = new Set(
      permittedList
        .map((p) => (p.name || p.label)?.toLowerCase()?.trim())
        .filter(Boolean)
    );

    return menuItems_TA.filter(
      (item) =>
        permittedIndexes.has(item.index) ||
        permittedIndexes.has(item.id) ||
        permittedNames.has(item.label?.toLowerCase()?.trim()) ||
        permittedNames.has(item.name?.toLowerCase()?.trim())
    );
  };

  useEffect(() => {
    if (isFocused) {
      setMenuData(getFilteredMenuItems());
    }
  }, [isFocused, permittedList]);

  // Support employee name / full name / name / code across all user schemas
  const displayName =
    user?.name ||
    user?.employee_name ||
    user?.full_name ||
    (user?.code ? `Emp ID: ${user.code}` : "Traveler");

  const initials = getInitials(displayName);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
    },
    headerWrapper: {
      marginBottom: verticalScale(50),
      zIndex: 1,
    },
    headerBackground: {
      height: verticalScale(215),
      borderBottomRightRadius: moderateScale(28),
      borderBottomLeftRadius: moderateScale(28),
      paddingTop: verticalScale(42),
      paddingHorizontal: horizontalScale(20),
    },
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: verticalScale(16),
    },
    iconButton: {
      width: moderateScale(42),
      height: moderateScale(42),
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.16)",
      borderRadius: moderateScale(13),
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.22)",
    },
    userHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarCircle: {
      width: moderateScale(46),
      height: moderateScale(46),
      borderRadius: moderateScale(15),
      backgroundColor: "rgba(255, 255, 255, 0.22)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: horizontalScale(12),
      borderWidth: 1.5,
      borderColor: "rgba(255, 255, 255, 0.35)",
    },
    avatarText: {
      color: "#ffffff",
      fontSize: moderateScale(16),
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    welcomeContainer: {
      flex: 1,
    },
    greetingText: {
      color: "rgba(255, 255, 255, 0.85)",
      fontSize: moderateScale(13),
      fontWeight: "500",
      letterSpacing: 0.3,
      marginBottom: verticalScale(2),
    },
    userNameText: {
      color: "#ffffff",
      fontSize: moderateScale(20),
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    quickStats: {
      position: "absolute",
      bottom: verticalScale(-34),
      left: horizontalScale(18),
      right: horizontalScale(18),
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: moderateScale(18),
      paddingVertical: verticalScale(16),
      paddingHorizontal: horizontalScale(20),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.3 : 0.07,
      shadowRadius: 12,
      elevation: 5,
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    statIconWrap: {
      width: moderateScale(38),
      height: moderateScale(38),
      borderRadius: moderateScale(12),
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
      justifyContent: "center",
      alignItems: "center",
      marginRight: horizontalScale(10),
    },
    statValue: {
      color: isDark ? "#f8fafc" : "#0f172a",
      fontSize: moderateScale(18),
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    statLabel: {
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: moderateScale(11),
      fontWeight: "500",
      marginTop: verticalScale(1),
    },
    verticalDivider: {
      width: 1,
      height: "70%",
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      marginHorizontal: horizontalScale(12),
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: horizontalScale(14),
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: verticalScale(4),
      marginBottom: verticalScale(14),
      paddingHorizontal: horizontalScale(4),
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    sectionAccentBar: {
      width: moderateScale(4),
      height: moderateScale(16),
      borderRadius: moderateScale(2),
      backgroundColor: CustomColors.appThemeColor || "#4f806d",
      marginRight: horizontalScale(8),
    },
    sectionTitle: {
      fontSize: moderateScale(16.5),
      fontWeight: "700",
      letterSpacing: 0.3,
      color: isDark ? "#f1f5f9" : "#0f172a",
    },
    sectionBadge: {
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
      paddingHorizontal: horizontalScale(9),
      paddingVertical: verticalScale(4),
      borderRadius: moderateScale(10),
      flexDirection: "row",
      alignItems: "center",
    },
    sectionBadgeText: {
      fontSize: moderateScale(11),
      fontWeight: "600",
      color: isDark ? "#94a3b8" : "#475569",
      marginLeft: horizontalScale(4),
    },
    gridContainer: {
      paddingBottom: verticalScale(40),
    },
    columnWrapper: {
      justifyContent: "space-between",
    },
    card: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: moderateScale(16),
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(8),
      margin: moderateScale(5.5),
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: verticalScale(114),
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#f1f5f9",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 5,
    },
    iconCircle: {
      height: moderateScale(48),
      width: moderateScale(48),
      borderRadius: moderateScale(15),
      justifyContent: "center",
      alignItems: "center",
      marginBottom: verticalScale(9),
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 4,
    },
    cardLabel: {
      color: isDark ? "#e2e8f0" : "#1e293b",
      fontSize: moderateScale(11.5),
      fontWeight: "600",
      textAlign: "center",
      lineHeight: moderateScale(15),
      letterSpacing: 0.1,
    },
  });

  const renderCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.72}
        onPress={() => navigation.navigate(item.route)}
      >
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <MaterialCommunityIcons
            name={item.iconName}
            size={moderateScale(23)}
            color="#ffffff"
          />
        </LinearGradient>
        <Text allowFontScaling={false} style={styles.cardLabel} numberOfLines={2}>
          {item.label || item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={CustomColors.appThemeColor || "#4f806d"}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header Section */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={[
              CustomColors.appThemeColor || "#4f806d",
              "#365b4d",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.headerBackground}
          >
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                onPress={() => openDrawer()}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="menu"
                  size={moderateScale(26)}
                  color="#ffffff"
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={moderateScale(22)}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.userHeaderRow}>
              <View style={styles.avatarCircle}>
                <Text allowFontScaling={false} style={styles.avatarText}>
                  {initials}
                </Text>
              </View>
              <View style={styles.welcomeContainer}>
                <Text allowFontScaling={false} style={styles.greetingText}>
                  {getGreeting()}
                </Text>
                <Text allowFontScaling={false} style={styles.userNameText} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Executive Stats Card */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={moderateScale(20)}
                  color={CustomColors.appThemeColor || "#4f806d"}
                />
              </View>
              <View>
                <Text allowFontScaling={false} style={styles.statValue}>
                  {menuData.length}
                </Text>
                <Text allowFontScaling={false} style={styles.statLabel}>
                  Active Modules
                </Text>
              </View>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={moderateScale(20)}
                  color="#059669"
                />
              </View>
              <View>
                <Text allowFontScaling={false} style={styles.statValue}>
                  TA Portal
                </Text>
                <Text allowFontScaling={false} style={styles.statLabel}>
                  Authorized
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccentBar} />
              <Text allowFontScaling={false} style={styles.sectionTitle}>
                Quick Actions
              </Text>
            </View>
            <View style={styles.sectionBadge}>
              <MaterialCommunityIcons
                name="apps"
                size={moderateScale(14)}
                color={isDark ? "#94a3b8" : "#475569"}
              />
              <Text allowFontScaling={false} style={styles.sectionBadgeText}>
                {menuData.length} Actions
              </Text>
            </View>
          </View>

          <FlatList
            key={isLandscape ? "landscape" : "portrait"}
            data={menuData}
            keyExtractor={(item) => String(item.id ?? item.index ?? item.label ?? item.name)}
            renderItem={renderCard}
            numColumns={isLandscape ? 4 : 3}
            scrollEnabled={false}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.columnWrapper}
          />
        </View>
      </ScrollView>
    </View>
  );
}