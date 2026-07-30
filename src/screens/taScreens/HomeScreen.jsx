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

// Metrics
import { horizontalScale, verticalScale, moderateScale } from "../../globalstyles/Metrics";
import { getCustomColors } from "../../styles/CustomColors";

// Icon libraries
import { FontAwesome5, Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

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

  const { openDrawer, permittedList } = route.params;
  const user = useSelector((state) => state.auth.user);
  const isFocused = useIsFocused();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  };

  const menuItems_TA = [
    { index: 1, label: "Tour ID Creation", iconLib: "MaterialCommunityIcons", iconName: "send", gradient: [CustomColors.SkyBlue, CustomColors.mediumliteGray], route: "travel_maker_summary" },
    { index: 2, label: "Tour ID Approval", iconLib: "MaterialIcons", iconName: "check-circle-outline", gradient: [CustomColors.liteRed, CustomColors.mediumliteRed], route: "travel_approver_summary" },
    { index: 3, label: "Advance Request", iconLib: "MaterialCommunityIcons", iconName: "cash-fast", gradient: [CustomColors.mediumeblue, CustomColors.mediumgreen], route: "advance_maker_summary" },
    { index: 4, label: "Advance Approval", iconLib: "MaterialCommunityIcons", iconName: "cash-check", gradient: [CustomColors.darkgreen, CustomColors.litegreenMedium], route: "advance_approver_summary" },
    { index: 5, label: "Claim Submission", iconLib: "Ionicons", iconName: "wallet", gradient: [CustomColors.darkYelllow, CustomColors.mediumliteYellow], route: "ExpenseMaker" },
    { index: 6, label: "Claim Approval", iconLib: "Ionicons", iconName: "wallet", gradient: [CustomColors.darkpurple, CustomColors.mudiumlitepurple], route: "ExpenseApproval" },
    { index: 7, label: "Cancel Request", iconLib: "MaterialCommunityIcons", iconName: "close-circle-outline", gradient: [CustomColors.pinkDark, CustomColors.liteMediumpink], route: "cancel_maker_summary" },
    { index: 8, label: "Cancel Approval", iconLib: "MaterialCommunityIcons", iconName: "close-circle", gradient: [CustomColors.litemediumRed, CustomColors.Redlite], route: "cancel_approver_summary" },
    { index: 9, label: "Assign Approver", iconLib: "MaterialCommunityIcons", iconName: "account-check-outline", gradient: [CustomColors.SkyBlue, CustomColors.mediumliteGray], route: "assign_approver" },
    { index: 10, label: "Advance Recovery", iconLib: "MaterialCommunityIcons", iconName: "cash-refund", gradient: [CustomColors.mediumeblue, CustomColors.mediumgreen], route: "advance_recovery" },
    { index: 11, label: "Settlement Approval", iconLib: "MaterialCommunityIcons", iconName: "file-check-outline", gradient: [CustomColors.darkYelllow, CustomColors.mediumliteYellow], route: "settlement_approval" },
    { index: 12, label: "Tour Report", iconLib: "MaterialCommunityIcons", iconName: "file-chart-outline", gradient: [CustomColors.darkgreen, CustomColors.litegreenMedium], route: "tour_report" },
  ];

  const getFilteredMenuItems = () => {
    if (!permittedList || permittedList.length === 0) return [];
    const permittedIndexes = new Set(permittedList.map((p) => p.index));
    return menuItems_TA.filter((item) => permittedIndexes.has(item.index));
  };

  useEffect(() => {
    if (isFocused) {
      setMenuData(getFilteredMenuItems());
    }
  }, [isFocused, permittedList]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.backgroundWhite,
    },
    headerWrapper: {
      marginBottom: verticalScale(50),
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
      shadowColor: CustomColors.appThemeColor,
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
      justifyContent: 'space-between',
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
      marginTop: 'auto',
      opacity: 0.5,
    }
  });

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
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={() => openDrawer()} style={styles.iconButton}>
                <Ionicons name="menu" size={moderateScale(28)} color={CustomColors.White} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="notifications-outline" size={moderateScale(24)} color={CustomColors.White} />
              </TouchableOpacity>
            </View>

            <View style={styles.welcomeContainer}>
              <Text allowFontScaling={false} style={styles.greetingText}>{getGreeting()}</Text>
              <Text allowFontScaling={false} style={styles.userNameText} numberOfLines={1}>{user?.name || "Traveler"}</Text>
            </View>
          </LinearGradient>

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
            keyExtractor={(item) => String(item.index)}
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