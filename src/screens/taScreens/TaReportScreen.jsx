import React, { useState, useLayoutEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";

import TourReportScreen from "./TourReportScreen";
import BranchwisePendingReportScreen from "./BranchwisePendingReportScreen";
import EmployeeTourReportScreen from "./EmployeeTourReportScreen";
import EclaimBillConsolidateScreen from "./EclaimBillConsolidateScreen";
import GstReportScreen from "./GstReportScreen";

import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../styles/Metrics";
import { Fonts } from "../../styles/Fonts";

// Report tab list matching Angular report.component.ts & report.component.html
const REPORT_TABS = [
  {
    index: 1,
    name: "Tour Report",
    shortName: "Tour",
    icon: "file-chart-outline",
    iconLib: "MaterialCommunityIcons",
  },
  {
    index: 2,
    name: "Branch Wise Pending",
    shortName: "Branch Pending",
    icon: "source-branch",
    iconLib: "MaterialCommunityIcons",
  },
  {
    index: 3,
    name: "Employee Report",
    shortName: "Employee",
    icon: "account-box-outline",
    iconLib: "MaterialCommunityIcons",
  },
  {
    index: 4,
    name: "TA Consolidate",
    shortName: "Consolidate",
    icon: "layers-outline",
    iconLib: "MaterialCommunityIcons",
  },
  {
    index: 5,
    name: "GST Report",
    shortName: "GST",
    icon: "file-percent-outline",
    iconLib: "MaterialCommunityIcons",
  },
];

const TaReportScreen = ({ navigation, route }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  // Initial tab support (from route params if passed e.g. initialIndex, tab, index, or tabName)
  const initialIndex = useMemo(() => {
    if (route?.params?.initialIndex) return Number(route.params.initialIndex);
    if (route?.params?.index) return Number(route.params.index);
    if (route?.params?.tab) return Number(route.params.tab);
    if (route?.params?.tabName) {
      const match = REPORT_TABS.find(
        (t) =>
          t.name.toLowerCase() === String(route.params.tabName).toLowerCase() ||
          t.shortName.toLowerCase() === String(route.params.tabName).toLowerCase()
      );
      if (match) return match.index;
    }
    return 1;
  }, [route?.params]);

  const [activeTab, setActiveTab] = useState(initialIndex);

  React.useEffect(() => {
    if (initialIndex) {
      setActiveTab(initialIndex);
    }
  }, [initialIndex]);

  // Set Navigation Header
  useLayoutEffect(() => {
    const currentTabObj = REPORT_TABS.find((t) => t.index === activeTab) || REPORT_TABS[0];
    navigation.setOptions({
      title: currentTabObj.name || "TA Reports",
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },
      headerTintColor: CustomColors.textWhite || "#FFFFFF",
      headerTitleStyle: {
        fontFamily: Fonts.Bold,
        fontSize: moderateScale(18),
        color: CustomColors.textWhite || "#FFFFFF",
      },
    });
  }, [navigation, CustomColors, activeTab]);

  const renderActiveReport = () => {
    switch (activeTab) {
      case 1:
        return <TourReportScreen navigation={navigation} isEmbedded={true} />;
      case 2:
        return <BranchwisePendingReportScreen navigation={navigation} isEmbedded={true} />;
      case 3:
        return <EmployeeTourReportScreen navigation={navigation} isEmbedded={true} />;
      case 4:
        return <EclaimBillConsolidateScreen navigation={navigation} isEmbedded={true} />;
      case 5:
        return <GstReportScreen navigation={navigation} isEmbedded={true} />;
      default:
        return <TourReportScreen navigation={navigation} isEmbedded={true} />;
    }
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        componentStyles.container,
        { backgroundColor: isDark ? "#0f172a" : (CustomColors.backgroundLightGray || "#F5F5F5") },
      ]}
    >
      {/* Top Horizontal Tab Navigator Bar */}
      <View
        style={[
          componentStyles.tabBarContainer,
          {
            backgroundColor: isDark ? "#1e293b" : CustomColors.white,
            borderBottomColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={componentStyles.tabScrollContent}
        >
          {REPORT_TABS.map((tab) => {
            const isActive = activeTab === tab.index;

            return (
              <TouchableOpacity
                key={tab.index}
                onPress={() => setActiveTab(tab.index)}
                activeOpacity={0.8}
                style={[
                  componentStyles.tabButton,
                  isActive
                    ? [
                        componentStyles.tabButtonActive,
                        { backgroundColor: CustomColors.appThemeColor },
                      ]
                    : [
                        componentStyles.tabButtonInactive,
                        {
                          backgroundColor: isDark ? "#334155" : "#F4F6F9",
                          borderColor: isDark ? "#475569" : (CustomColors.overlayLightGray || "#E0E0E0"),
                        },
                      ],
                ]}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={16}
                  color={isActive ? "#FFFFFF" : (isDark ? "#94a3b8" : (CustomColors.textGray || "#666666"))}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    componentStyles.tabText,
                    isActive
                      ? [componentStyles.tabTextActive, { color: "#FFFFFF" }]
                      : [
                          componentStyles.tabTextInactive,
                          { color: isDark ? "#cbd5e1" : (CustomColors.textBlack || "#333333") },
                        ],
                  ]}
                >
                  {tab.name}
                </Text>

                {isActive && <View style={componentStyles.activeIndicatorDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Tab Screen Content */}
      <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#F5F5F5" }}>{renderActiveReport()}</View>
    </SafeAreaView>
  );
};

export default TaReportScreen;

const componentStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    paddingVertical: verticalScale(8),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabScrollContent: {
    paddingHorizontal: horizontalScale(12),
    alignItems: "center",
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(8),
    borderRadius: 20,
  },
  tabButtonActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  tabButtonInactive: {
    borderWidth: 1,
  },
  tabText: {
    fontSize: moderateScale(12),
  },
  tabTextActive: {
    fontFamily: Fonts.Bold,
  },
  tabTextInactive: {
    fontFamily: Fonts.Medium,
  },
  activeIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
    marginLeft: 6,
  },
});
