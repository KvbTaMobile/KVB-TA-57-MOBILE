import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  StatusBar, Pressable
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../styles/Metrics";

import { getCustomColors } from "../styles/CustomColors";


// Navigators
import TAStackNavigator from "./TAStackNavigator";
// import StockStackNavigator from "./StockStackNavigator";
// import BottomTabNavigator from "./BottomTabNavigator";
// import VendorStackNavigator from "./VenodorStackNavigator";
// import VendorBottomTabNavigator from "./VendorBottomTabNavigator";
// import BranchIndentTabs from "./BranchIndentTabs";
// import LeaveStackNavigator from "./LeaveStackNavigator";
import WarningDialog from "../TaComponents/dialogs/WarningDialog";
import { useDispatch } from "react-redux";
import { logout } from "../redux/slices/AuthSlice";
import { clearTokenAsyncData } from "../redux/store/AsyncStore";
import { setUserModules } from "../redux/slices/UserModulesSlice";

const { width, height } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.75;

// 🔑 TA submodule tab list — mirrors Angular's taTransactionList
const TA_TRANSACTION_LIST = [
  { name: "Tour ID Creation", index: 1 },
  { name: "Tour ID Approval", index: 2 },
  { name: "Advance Request", index: 3 },
  { name: "Advance Approval", index: 4 },
  { name: "Claim Submission", index: 5 },
  { name: "Claim Approval", index: 6 },
  { name: "Cancel Request", index: 7 },
  { name: "Cancel Approval", index: 8 },
  { name: "Assign Approver", index: 9 },
  { name: "Advance Recovery", index: 10 },
  { name: "Settlement Approval", index: 11 },
  { name: "Tour Report", index: 12 },
];

// 🔑 Mirrors ta-transaction-summary.component.ts ngOnInit permission logic
function getTaPermissions(modules) {
  const taModule = modules?.find((m) => m.name === "TA e-Claim");
  const submodules = taModule?.submodule || [];

  let permissionlist = [];
  const flags = {
    isAdminApprove: false,
    recoveryChecker: false,
    recoveryMaker: false,
  };

  const getRole = (subName) =>
    submodules.find((s) => s.name?.toLowerCase() === subName)?.role || [];

  const hasRole = (roleArr, roleName) =>
    roleArr.some((r) => r.name?.toLowerCase() === roleName);

  // Tour
  const travelrole = getRole("tour");
  if (hasRole(travelrole, "maker")) permissionlist.push(1, 3, 5, 7);
  if (hasRole(travelrole, "checker")) permissionlist.push(2);

  // Expense
  const expenserole = getRole("expense");
  if (hasRole(expenserole, "checker")) permissionlist.push(6);

  // Advance
  const advancerole = getRole("advance");
  if (hasRole(advancerole, "checker")) permissionlist.push(4);

  // Cancel
  const cancelrole = getRole("cancel");
  if (hasRole(cancelrole, "checker")) permissionlist.push(8);

  // Recovery
  const recoveryrole = getRole("recovery");
  if (hasRole(recoveryrole, "checker")) {
    permissionlist.push(10);
    flags.recoveryChecker = true;
  }
  if (hasRole(recoveryrole, "maker")) {
    permissionlist.push(10);
    flags.recoveryMaker = true;
  }

  // Assign
  const assignrole = getRole("assign");
  if (hasRole(assignrole, "checker")) permissionlist.push(9);
  if (hasRole(assignrole, "admin")) flags.isAdminApprove = true;

  // Apuser
  const apuserrole = getRole("apuser");
  if (hasRole(apuserrole, "checker")) permissionlist.push(11);

  // Report
  const reportrole = getRole("report");
  if (hasRole(reportrole, "checker")) permissionlist.push(12);

  permissionlist = [...new Set(permissionlist)]; // dedupe

  const permittedList = TA_TRANSACTION_LIST.filter((item) =>
    permissionlist.includes(item.index)
  );

  return { permittedList, flags, permissionlist };
}

export default function DrawerNavigator() {
  const [isHome, setIsHome] = useState(true);
  const drawerProgress = useSharedValue(0);
  const navigation = useNavigation();
  const user = useSelector((state) => state.auth.user);
  const modules = useSelector((state) => state.userModules.modules);

  // 🔑 Only show "TA e-Claim" in the drawer's module list
  const uniqueModules = modules?.filter((m) => m.name === "TA e-Claim") || [];

  // 🔑 Default selected module to TA e-Claim specifically, not modules[0]
  const [selectedModule, setSelectedModule] = useState(
    uniqueModules.length > 0 ? uniqueModules[0] : null
  );

  const dispatch = useDispatch();
  const [logoutDialogStatus, setLogoutDialogStatus] = useState(false);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  // 🔑 TA submodule permission list, computed inline (no separate util file)
  const { permittedList: taPermittedList, flags: taFlags } = getTaPermissions(modules);

  const openDrawer = () => {
    drawerProgress.value = withTiming(1, { duration: 300 });
  };

  const closeDrawer = () => {
    drawerProgress.value = withTiming(0, { duration: 300 });
  };

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -DRAWER_WIDTH + drawerProgress.value * DRAWER_WIDTH },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: drawerProgress.value * 0.4,
    pointerEvents: drawerProgress.value > 0 ? "auto" : "none",
  }));
  const handleLogout = async () => {
    try {
      await clearTokenAsyncData();
      dispatch(setUserModules([]))
      dispatch(logout());
      closeDrawer();
      navigation.reset({ index: 0, routes: [{ name: "login" }] });
    } finally {
      setLogoutDialogStatus(false);
    }
  };

  const getIcon = (moduleName) => {
    const icons = {
      "TA e-Claim": "airplane-check",
    };
    return icons[moduleName] || "folder-outline";
  };
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.backgroundWhite,
    },
    mainContent: {
      flex: 1,
      backgroundColor: CustomColors.appThemeColor,
    },

    // Drawer Styling
    drawer: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: CustomColors.backgroundGray,
      zIndex: 20,
      elevation: 16,
      shadowColor: CustomColors.backgroundBlack,
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: CustomColors.backgroundBlack,
      zIndex: 15,
    },

    // Fixed Header Container
    headerContainer: {
      // This container keeps the header fixed at the top
    },

    // Drawer Header with SafeAreaView
    drawerHeaderGradient: {
      paddingBottom: verticalScale(20),
    },
    drawerHeaderSafeArea: {
      backgroundColor: CustomColors.appThemeColor,
    },
    drawerProfileCurve: {
      backgroundColor: CustomColors.appThemeColor,
      padding: moderateScale(20),
      paddingTop: moderateScale(15),
      paddingBottom: moderateScale(25),
      width: "100%",
      borderBottomRightRadius: moderateScale(50),
    },
    drawerProfileImage: {
      width: horizontalScale(70),
      height: verticalScale(70),
      borderRadius: moderateScale(35),
      borderWidth: 3,
      borderColor: CustomColors.textWhite,
      marginBottom: verticalScale(10),
    },
    drawerUserName: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(18),
      fontWeight: "bold",
      marginTop: verticalScale(5),
    },
    drawerUserRole: {
      color: CustomColors.textDarkGray,
      fontSize: moderateScale(12),
      opacity: 0.9,
      marginTop: verticalScale(3),
    },

    // Scrollable Container
    scrollContainer: {
      flex: 1,
      backgroundColor: CustomColors.backgroundGray,
    },

    // Scroll Content
    scrollContent: {
      flexGrow: 1,
      paddingBottom: verticalScale(10),
    },

    // Navigation Items
    drawerItemsContainer: {
      paddingHorizontal: horizontalScale(15),
      paddingTop: verticalScale(20),
    },
    sectionLabel: {
      fontSize: moderateScale(12),
      fontWeight: "bold",
      color: CustomColors.textLight,
      marginBottom: verticalScale(10),
      marginTop: verticalScale(5),
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    item: {
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(15),
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(6),
    },
    activeItem: {
      backgroundColor: CustomColors.appThemeColor,
      elevation: 2,
      shadowColor: CustomColors.appThemeColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    itemText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDark,
      fontWeight: "500",
    },
    activeItemText: {
      color: CustomColors.backgroundWhite,
      fontWeight: "bold",
    },

    // Footer
    footerLogout1: {
      marginTop: "auto",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: horizontalScale(25),
      paddingTop: verticalScale(18),
      borderTopWidth: 1,
      borderTopColor: CustomColors.darkGray,
    },
    footerLogout: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: horizontalScale(25),
      paddingVertical: verticalScale(18),
    },
    footerText: {
      marginLeft: horizontalScale(10),
      color: CustomColors.darkGray,
      fontWeight: "600",
      fontSize: moderateScale(14),
    },

  });
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={CustomColors.appThemeColor}
      />

      {/* Main Content Area with SafeAreaView */}
      <SafeAreaView
        style={styles.mainContent}
        edges={["top", "bottom"]}
      >
        {selectedModule?.name === "TA e-Claim" && (
          <TAStackNavigator
            openDrawer={openDrawer}
            permittedList={taPermittedList}
            taFlags={taFlags}
          />
        )}

        {/* {selectedModule?.name === "PRPO" && (
          <BranchIndentTabs openDrawer={openDrawer} />
        )}

        {selectedModule?.name === "Vendor" && (
          <VendorBottomTabNavigator
            openDrawer={openDrawer}
            selectedModule="Vendor"
          />
        )} 

        {selectedModule?.name === "Stock and Inventory" && (
          <StockStackNavigator openDrawer={openDrawer} />
        )}

        {(selectedModule?.name === "Leave Request" ||
          selectedModule?.name === "Task Management" ||
          selectedModule?.name === "HRMS") && (
            <LeaveStackNavigator
              openDrawer={openDrawer}
              selectedModule="Leave Request"
            />
          )}*/}
      </SafeAreaView>

      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer - Independent of SafeAreaView */}
      <Animated.View style={[styles.drawer, drawerStyle]}>
        {/* Fixed Header Section */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={[CustomColors.accentGreen, CustomColors.backgroundGray]}
            style={styles.drawerHeaderGradient}
          >
            <SafeAreaView
              edges={["top"]}
              style={styles.drawerHeaderSafeArea}
            >
              <View style={styles.drawerProfileCurve}>


                <Pressable
                  android_ripple={{ color: CustomColors.adsGreyText }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => navigation.navigate("Profile", { openDrawer })}
                >
                  <View style={styles.drawerProfileCurve}>
                    <Image
                      source={require("../assets/test/img.png")}
                      style={styles.drawerProfileImage}
                    />
                    <Text allowFontScaling={false} style={styles.drawerUserName}>
                      {user?.name}
                    </Text>
                    <Text allowFontScaling={false} style={styles.drawerUserRole}>
                      {user?.entity_name}
                    </Text>
                  </View>
                </Pressable>

              </View>
            </SafeAreaView>
          </LinearGradient>
        </View>

        {/* Scrollable Content Section */}
        <View style={styles.scrollContainer}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.drawerItemsContainer}>
              {uniqueModules.map((module) => {
                const isActive = selectedModule?.name === module.name;

                return (
                  <TouchableOpacity
                    key={module.name}
                    style={[styles.item, isActive && styles.activeItem]}
                    onPress={() => {
                      setSelectedModule(module);
                      closeDrawer();
                    }}
                  >
                    <View style={styles.itemRow}>
                      <MaterialCommunityIcons
                        name={getIcon(module.name)}
                        size={22}
                        color={isActive ? CustomColors.backgroundWhite : CustomColors.textDarkGray}
                        style={{ marginRight: 15 }}
                      />
                      <Text
                        allowFontScaling={false}
                        style={[styles.itemText, isActive && styles.activeItemText]}
                      >
                        {module.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer Items */}
            <View style={styles.footerLogout1}>

            </View>

            <TouchableOpacity
              style={styles.footerLogout}
              onPress={() => {
                navigation.navigate("settings", { openDrawer });
              }}
            >
              <MaterialIcons
                name="settings"
                size={28}
                color={CustomColors.darkGray}
              />
              <Text allowFontScaling={false} style={styles.footerText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.footerLogout}
              onPress={() => setLogoutDialogStatus(true)}
            >
              <MaterialIcons
                name="logout"
                size={28}
                color={CustomColors.dangerRed}
              />
              <Text allowFontScaling={false} style={[styles.footerText, { color: CustomColors.dangerRed }]}>
                Logout
              </Text>
            </TouchableOpacity>

            {/* Bottom spacing for SafeAreaView */}
            <SafeAreaView edges={["bottom"]}>
              <View style={{ height: 10 }} />
            </SafeAreaView>
          </ScrollView>
          {logoutDialogStatus && (
            <WarningDialog
              dialogStatus={logoutDialogStatus}
              setDialogStatus={setLogoutDialogStatus}
              tittle="Logout"
              subTittle="Are you sure you want to logout?"
              onPressEvent={handleLogout}
            />
          )}

        </View>
      </Animated.View>
    </View>
  );
}