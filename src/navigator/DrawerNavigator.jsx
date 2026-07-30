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

export default function DrawerNavigator() {
  const [isHome, setIsHome] = useState(true);
  const drawerProgress = useSharedValue(0);
  const navigation = useNavigation();
  const user = useSelector((state) => state.auth.user);
  const modules = useSelector((state) => state.userModules.modules);
  const [selectedModule, setSelectedModule] = useState(
    modules ? modules[0] : null
  );
  const dispatch = useDispatch();
  const [logoutDialogStatus, setLogoutDialogStatus] = useState(false);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const normalizedModules = modules?.map((m) => {
    if (m.name === "Leave Request" || m.name === "Task Management") {
      return { ...m, displayName: "HRMS" };
    }
    if (m.name === "Task") {
      return { ...m, displayName: "CRM" };
    }
    return { ...m, displayName: m.name };
  }) || [];


  const isCRMSelected =
    selectedModule?.name === "Task" || selectedModule?.name === "CRM";

  const isHRMSSelected =
    selectedModule?.name === "HRMS" ||
    selectedModule?.name === "Leave Request" ||
    selectedModule?.name === "Task Management";

  const uniqueModules = Array.from(
    new Map(normalizedModules.map((m) => [m.displayName, m])).values()
  );

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
      CRM: "view-dashboard-outline",
      ECF: "file-document-outline",
      "TA e-Claim": "airplane-check",
      "H+": "plus-circle-outline",
      "Profile Screen": "account-outline",
      Vendor: "store-outline",
      HRMS: "account-group-outline",
      PRPO: "archive-outline",
      "Stock and Inventory": "package-variant-closed"
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
        {/* {selectedModule?.name === "Task" && selectedModule?.flag_crm === 1 && (
          <BottomTabNavigator openDrawer={openDrawer} />
        )} */}

        {selectedModule?.name === "TA e-Claim" && (
          <TAStackNavigator openDrawer={openDrawer} />
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
              {/* <Text style={styles.sectionLabel}>Active Modules</Text> */}

              {/* {uniqueModules.map((module) => (
                <TouchableOpacity
                  key={module.name}
                  style={[
                    styles.item,
                    (module.name === "HRMS"
                      ? isHRMSSelected
                      : selectedModule?.name === module.name) &&
                    styles.activeItem,
                  ]}
                  onPress={() => {
                    setSelectedModule(module);
                    closeDrawer();
                  }}
                >
                  <View style={styles.itemRow}>
                    <MaterialCommunityIcons
                      name={getIcon(module.name)}
                      size={22}
                      color={
                        (
                          module.name === "HRMS"
                            ? isHRMSSelected
                            : selectedModule?.name === module.name
                        )
                          ? CustomColors.backgroundWhite
                          : CustomColors.textDarkGray
                      }
                      style={{ marginRight: 15 }}
                    />
                    <Text allowFontScaling={false}
                      style={[
                        styles.itemText,
                        (module.name === "HRMS"
                          ? isHRMSSelected
                          : selectedModule?.name === module.name) &&
                        styles.activeItemText,
                      ]}
                    >
                      {module.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))} */}

              {uniqueModules.map((module) => {
                const isActive =
                  module.displayName === "HRMS"
                    ? isHRMSSelected
                    : module.displayName === "CRM"
                      ? isCRMSelected
                      : selectedModule?.name === module.name;

                return (
                  <TouchableOpacity
                    key={module.displayName}
                    style={[styles.item, isActive && styles.activeItem]}
                    onPress={() => {
                      setSelectedModule(module); // stores original name e.g. "Task"
                      closeDrawer();
                    }}
                  >
                    <View style={styles.itemRow}>
                      <MaterialCommunityIcons
                        name={getIcon(module.displayName)}
                        size={22}
                        color={isActive ? CustomColors.backgroundWhite : CustomColors.textDarkGray}
                        style={{ marginRight: 15 }}
                      />
                      <Text
                        allowFontScaling={false}
                        style={[styles.itemText, isActive && styles.activeItemText]}
                      >
                        {module.displayName}  {/* Show "CRM" not "Task" */}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer Items */}
            <View  style={styles.footerLogout1}>

            </View>
            {/* <TouchableOpacity
              style={styles.footerLogout1}
              onPress={() => {
                navigation.navigate("routemap");
                closeDrawer();
              }}
            >
              <MaterialIcons
                name="location-searching"
                size={28}
                color={CustomColors.darkGray}
              />
              <Text allowFontScaling={false} style={styles.footerText}>Location History</Text>
            </TouchableOpacity> */}

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

const DrawerItem = ({ label, icon, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.item}>
    <View style={styles.itemRow}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={CustomColors.textDarkGray}
        style={{ marginRight: 15 }}
      />
      <Text allowFontScaling={false} style={styles.itemText}>{label}</Text>
    </View>
  </TouchableOpacity>
);

