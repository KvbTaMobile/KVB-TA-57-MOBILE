import React, { useEffect, useState, useCallback } from "react";
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
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// Metrics
import { horizontalScale, verticalScale, moderateScale } from "../../globalstyles/Metrics";
// import { CustomColors } from "../../styles/CustomColors";
import { getCustomColors } from "../../styles/CustomColors";

// Icon libraries
import { FontAwesome5, Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";


const getIconComponent = (lib) => {
  switch (lib) {
    case "FontAwesome5": return FontAwesome5;
    case "Ionicons": return Ionicons;
    case "MaterialIcons": return MaterialIcons;
    case "MaterialCommunityIcons": return MaterialCommunityIcons;
    default: return MaterialIcons;
  }
};

export default function DashboardScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [menuData, setMenuData] = useState([]);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const { openDrawer } = route.params;
  const modules = useSelector((state) => state.userModules.modules);
  const user = useSelector((state) => state.auth.user);
  const isFocused = useIsFocused();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  };

  const getFilteredMenuItems = () => {
    const uniqueModules = modules ? Array.from(new Map(modules.map(m => [m.name, m])).values()) : [];
    // console.log('uniqueModules', uniqueModules)
    const defaultMenus = [{ label: "Message Screen", iconLib: "Ionicons", iconName: "chatbubble-ellipses-outline", gradient: ["#FDC830", "#e9daacff"], route: "Message" }];

    // if (selectedModule !== "Admin TA") return menuItems_ECF;

    const taModule = uniqueModules.find((mod) => mod.name === "TA e-Claim");
    if (!taModule) return defaultMenus;

    const submodules = taModule.submodule || [];
    const allowedLabels = new Set();

    submodules.forEach((sub) => {
      const roleNames = sub.role.map((r) => r.name);
      console.log("Submodule:", sub.name);
console.log("Roles:", sub.role);
console.log("Role Names:", roleNames);
      if (sub.name === "Tour") {
        if (roleNames.includes("Maker")) { allowedLabels.add("Travel Maker"); allowedLabels.add("Fuel Allowance Maker"); }
        if (roleNames.includes("Checker")) { allowedLabels.add("Travel Checker"); allowedLabels.add("Date Relaxation"); allowedLabels.add("Fuel Allowance Checker"); }
        if (roleNames.includes("Admin")) allowedLabels.add("Admin");
      }
      if (sub.name === "Expense") {
        if (roleNames.includes("Maker")) allowedLabels.add("Expense Maker");
        if (roleNames.includes("Checker")) allowedLabels.add("Expense Approver");
      }
    });

    allowedLabels.add("Message Screen");
    return menuItems_TA.filter((item) => allowedLabels.has(item.label));
  };

  // useFocusEffect(
  //   useCallback(() => {
  //     // console.log('modules', modules[4].submodule[0].role)
  //     setMenuData(getFilteredMenuItems());
  //   }, [modules])
  // );

  useEffect(() => {
    if (isFocused) {
      setMenuData(getFilteredMenuItems());
    }
  }, [isFocused, modules]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.backgroundWhite, // Keep strict to CustomColors
    },
    headerWrapper: {
      marginBottom: verticalScale(50), // Increased to make room for floating card
      zIndex: 1,
    },
    headerBackground: {
      height: verticalScale(200),
      borderBottomRightRadius: moderateScale(30),
      borderBottomLeftRadius: moderateScale(30),
      paddingTop: verticalScale(40),
      paddingHorizontal: horizontalScale(20),
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(20),
    },
    iconButton: {
      width: moderateScale(40),
      height: moderateScale(40),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.menucolor,
      borderRadius: moderateScale(12),
    },
    welcomeContainer: {
      paddingLeft: horizontalScale(5),
    },
    greetingText: {
      color: CustomColors.headerWelcomeText,
      fontSize: moderateScale(14),
      fontWeight: "400",
      opacity: 0.9,
      marginBottom: verticalScale(4),
    },
    userNameText: {
      color: CustomColors.headerUserName,
      fontSize: moderateScale(24),
      fontWeight: "700",
      letterSpacing: 0.5,
    },

    // Floating Card Styles
    quickStats: {
      position: 'absolute',
      bottom: verticalScale(-35),
      left: horizontalScale(20),
      right: horizontalScale(20),
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(20),
      paddingVertical: verticalScale(20),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      // Soft Shadow
      shadowColor: CustomColors.appThemeColor, // Using theme color for shadow tint
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 15,
      elevation: 8,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      color: CustomColors.appThemeColor,
      fontSize: moderateScale(20),
      fontWeight: "800",
    },
    statLabel: {
      color: CustomColors.textDarkGray,
      fontSize: moderateScale(12),
      fontWeight: "500",
      marginTop: verticalScale(4),
      opacity: 0.7,
    },
    verticalDivider: {
      width: 1,
      height: '60%',
      backgroundColor: CustomColors.primaryLight,
      opacity: 0.3,
    },

    // Grid Content
    contentContainer: {
      flex: 1,
      paddingHorizontal: horizontalScale(15),
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(15),
      paddingHorizontal: horizontalScale(5),
    },
    sectionTitle: {
      fontSize: moderateScale(18),
      fontWeight: "700",
      color: CustomColors.sectionTitle,
    },
    gridContainer: {
      paddingBottom: verticalScale(40),
    },
    columnWrapper: {
      justifyContent: 'space-between', // Ensures cards are spread evenly
    },
    card: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(18),
      padding: moderateScale(12),
      margin: moderateScale(6),
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: verticalScale(110),
      elevation: 3,
      shadowColor: CustomColors.backgroundBlack,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    iconCircle: {
      height: moderateScale(54),
      width: moderateScale(54),
      borderRadius: moderateScale(20),
      justifyContent: "center",
      alignItems: "center",
      marginBottom: verticalScale(12),
      // Inner shadow simulation via margin
      borderWidth: 0,
    },
    cardLabel: {
      color: CustomColors.sectionTitle,
      fontSize: moderateScale(12),
      fontWeight: "600",
      textAlign: "center",
      lineHeight: moderateScale(16),
      marginBottom: verticalScale(8),
    },
    actionArrow: {
      marginTop: 'auto', // Pushes to bottom
      opacity: 0.5,
    }
  });
  // Data Configuration (Unchanged)
  const menuItems_TA = [
    { label: "Travel Maker", iconLib: "MaterialCommunityIcons", iconName: "send", gradient: [CustomColors.SkyBlue, CustomColors.mediumliteGray], route: "travel_maker_summary" },
    { label: "Travel Checker", iconLib: "MaterialIcons", iconName: "check-circle-outline", gradient: [CustomColors.liteRed, CustomColors.mediumliteRed], route: "travel_approver_summary" },
    { label: "Admin", iconLib: "MaterialCommunityIcons", iconName: "shield-check", gradient: [CustomColors.litemediumRed, CustomColors.Redlite], route: "admin_summary" },
    { label: "Expense Maker", iconLib: "Ionicons", iconName: "wallet", gradient: [CustomColors.darkYelllow, CustomColors.mediumliteYellow], route: "ExpenseMaker" },
    { label: "Expense Approver", iconLib: "Ionicons", iconName: "wallet", gradient: [CustomColors.darkpurple, CustomColors.mudiumlitepurple], route: "ExpenseApproval" },
    { label: "Fuel Allowance Maker", iconLib: "FontAwesome5", iconName: "gas-pump", gradient: [CustomColors.mediumeblue, CustomColors.mediumgreen], route: "fuel_allowance_maker_summary" },
    { label: "Date Relaxation", iconLib: "MaterialCommunityIcons", iconName: "calendar-clock", gradient: [CustomColors.darkgreen, CustomColors.litegreenMedium], route: "date_relaxation" },
    { label: "Fuel Allowance Checker", iconLib: "MaterialCommunityIcons", iconName: "clipboard-check-outline", gradient: [CustomColors.pinkDark, CustomColors.liteMediumpink], route: "fuellistall" },
    { label: "Message Screen", iconLib: "Ionicons", iconName: "chatbubble-ellipses-outline", gradient: [CustomColors.YellowDark, CustomColors.liteMediumYellow], route: "Message" },
  ];

  // const menuItems_ECF = [
  //   { label: "ECF", iconLib: "FontAwesome5", iconName: "file-invoice-dollar", gradient: [CustomColors.darkgreen, CustomColors.litegreenMedium], route: "ECF" },
  // ];

  const renderCard = ({ item }) => {
    const IconComponent = getIconComponent(item.iconLib);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate(item.route)}
      >
        <LinearGradient colors={item.gradient} style={styles.iconCircle}>
          <IconComponent name={item.iconName} size={moderateScale(24)} color={CustomColors.textDark} />
        </LinearGradient>
        <Text allowFontScaling={false} style={styles.cardLabel}>{item.label}</Text>
      </TouchableOpacity>
    );
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={CustomColors.appThemeColor} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>

        {/* Header Section */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={[CustomColors.appThemeColor, CustomColors.appThemeColor]}
            style={styles.headerBackground}
          >
            {/* Top Navigation Row */}
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={() => openDrawer()} style={styles.iconButton}>
                <Ionicons name="menu" size={moderateScale(28)} color={CustomColors.White} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton}>
                {/* Placeholder for notification or profile */}
                <Ionicons name="notifications-outline" size={moderateScale(24)} color={CustomColors.White} />
              </TouchableOpacity>
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeContainer}>
              <Text allowFontScaling={false} style={styles.greetingText}>{getGreeting()}</Text>
              <Text allowFontScaling={false} style={styles.userNameText} numberOfLines={1}>{user?.name || "Traveler"}</Text>
            </View>
          </LinearGradient>

          {/* Floating Info Card (Overlapping) */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text allowFontScaling={false} style={styles.statValue}>{menuData.length}</Text>
              <Text allowFontScaling={false} style={styles.statLabel}>Active Modules</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text allowFontScaling={false} style={styles.statValue}>TA</Text>
              <Text allowFontScaling={false} style={styles.statLabel}>Current Mode</Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.sectionHeader}>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Quick Actions</Text>
            <Ionicons name="grid-outline" size={moderateScale(18)} color={CustomColors.primaryLight} />
          </View>

          <FlatList
            key={isLandscape ? 'landscape' : 'portrait'}
            data={menuData}
            keyExtractor={(item) => item.label}
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
