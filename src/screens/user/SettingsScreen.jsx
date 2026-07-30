import React, { useLayoutEffect, useEffect, useReducer } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  StyleSheet,
  Text,
  Switch,
  TouchableOpacity,
  Platform,
  Appearance,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Styling & Utilities
import { moderateScale, verticalScale, horizontalScale } from "../../styles/Metrics";
import { Fonts } from "../../styles/Fonts";
import {getCustomColors } from "../../styles/CustomColors";
import { getAsyncData, storeAsyncData } from "../../redux/store/AsyncStore";
import { enableSpeech, disableSpeech, speak } from "../../utilities/SpeechHelper";

// Redux
import { useSelector, useDispatch } from "react-redux";
import { setTheme, saveTheme } from "../../redux/slices/themeSlice";

const settingsReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, ...action.fields };
    default:
      return state;
  }
};

export default function SettingsScreen({ route }) {
  const navigation = useNavigation();
  const { openDrawer } = route.params || {};

  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const themeMode = useSelector((state) => state.theme.mode); // "light" | "dark" | "auto"
  const colors = getCustomColors(isDark);

  const [state, localDispatch] = useReducer(settingsReducer, {
    isSpeechEnabled: false,
    isLoading: true,
  });

  const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: horizontalScale(20),
    paddingTop: verticalScale(20),
  },
  sectionLabel: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.bold,
    marginBottom: verticalScale(10),
    marginLeft: horizontalScale(4),
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  containerCard: {
    borderRadius: moderateScale(16),
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.textBlack,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: moderateScale(16),
  },
  iconLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(14),
  },
  iconContainer: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(12),
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.medium,
  },
  subtitle: {
    fontSize: moderateScale(13),
    marginTop: verticalScale(2),
  },
  divider: {
    height: 1,
    marginHorizontal: horizontalScale(16),
    opacity: 0.6,
  },
  themeSection: {
    padding: moderateScale(16),
  },
  themeTextContent: {
    marginBottom: verticalScale(14),
  },
  segmentedWrapper: {
    flexDirection: "row",
    borderRadius: moderateScale(12),
    padding: moderateScale(4),
  },
  segmentButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    alignItems: "center",
    borderRadius: moderateScale(10),
  },
  segmentText: {
    fontSize: moderateScale(13),
    textTransform: "capitalize",
  },
  activeShadow: {
    ...Platform.select({
      ios: {
        shadowColor: colors.textBlack,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerButton: {
    paddingHorizontal: horizontalScale(12),
  },
  footerNote: {
    textAlign: "center",
    fontSize: moderateScale(12),
    marginTop: verticalScale(30),
  },
});

  // 1. Load Initial Settings
  useEffect(() => {
    const loadSettings = async () => {
      const speechStatus = await getAsyncData("speechEnabled");
      const enabled = speechStatus === "true" || speechStatus === true;

      localDispatch({
        type: "SET_FIELD",
        fields: { isSpeechEnabled: enabled, isLoading: false },
      });

      if (enabled) enableSpeech();
      else disableSpeech();
    };
    loadSettings();
  }, []);

  // 2. Handle Android 12+ System Theme Changes
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === "auto") {
        // Force a re-render or sync with Redux if system theme flips
        dispatch(setTheme("auto"));
      }
    });
    return () => listener.remove();
  }, [dispatch, themeMode]);

  // 3. Header Setup
  useLayoutEffect(() => {
  navigation.setOptions({
    headerShown: true,
    headerTitleAlign: "center",
    headerStyle: {
      backgroundColor: colors.appThemeColor,
      elevation: 0,
      shadowOpacity: 0,
    },

    headerTitle: () => (
      <Text
        allowFontScaling={false}
        style={{
          fontSize: moderateScale(20),
          fontFamily: Fonts.bold,
          color: colors.textWhite,
        }}
      >
        Settings
      </Text>
    ),

    headerLeft: () => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          navigation.goBack();
          if (openDrawer) setTimeout(() => openDrawer(), 150);
        }}
        style={styles.headerButton}
      >
        <Ionicons name="arrow-back" size={moderateScale(26)} color={colors.textWhite} />
      </TouchableOpacity>
    ),
  });
}, [navigation, colors, openDrawer]);

  if (state.isLoading) return null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.appScreenColor }]}>

      {/* SECTION: PREFERENCES */}
      <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textGray }]}>PREFERENCES</Text>

      <View style={[styles.containerCard, { backgroundColor: colors.cardBackground, borderColor: colors.dividerColor }]}>

        {/* Voice Feedback Row */}
        <View style={styles.row}>
          <View style={styles.iconLabelGroup}>
            <View style={[styles.iconContainer, {
              backgroundColor: state.isSpeechEnabled ? colors.primaryGreen + "15" : (isDark ? colors.settingDark : colors.settinglight)
            }]}>
              <MaterialCommunityIcons
                name={state.isSpeechEnabled ? "volume-high" : "volume-off"}
                size={moderateScale(22)}
                color={state.isSpeechEnabled ? colors.primaryGreen : colors.textGray}
              />
            </View>
            <View>
              <Text allowFontScaling={false} style={[styles.title, { color: colors.textBlack }]}>Voice Feedback</Text>
              <Text allowFontScaling={false} style={[styles.subtitle, { color: colors.textGray }]}>Spoken hints and updates</Text>
            </View>
          </View>

          <Switch
            value={state.isSpeechEnabled}
            thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
            trackColor={{
              false: "#D1D1D1",
              true: colors.primaryGreen,
            }}
            onValueChange={async (value) => {
              localDispatch({ type: "SET_FIELD", fields: { isSpeechEnabled: value } });
              await storeAsyncData("speechEnabled", value ? "true" : "false");
              if (value) {
                enableSpeech();
                speak("Voice feedback enabled");
              } else {
                disableSpeech();
              }
            }}
          />
        </View>

        {/* Subtle Divider */}
        <View style={[styles.divider, { backgroundColor: colors.dividerColor || "#E0E0E0" }]} />

        {/* Theme Settings Section */}
        <View style={styles.themeSection}>
          <View style={styles.themeTextContent}>
            <Text allowFontScaling={false} style={[styles.title, { color: colors.textBlack }]}>App Theme</Text>
            <Text allowFontScaling={false} style={[styles.subtitle, { color: colors.textGray }]}>Light, Dark, or System Sync</Text>
          </View>

          {/* Segmented Control UI */}
          <View style={[styles.segmentedWrapper, { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0" }]}>
            {["light", "dark", "auto"].map((mode) => {
              const isActive = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  activeOpacity={0.8}
                  onPress={() => dispatch(saveTheme(mode))}
                  style={[
                    styles.segmentButton,
                    isActive && {
                      backgroundColor: colors.cardBackground,
                      ...styles.activeShadow
                    }
                  ]}
                >
                  <Text allowFontScaling={false} style={[
                    styles.segmentText,
                    {
                      color: isActive ? colors.appThemeColor : colors.textGray,
                      fontFamily: isActive ? Fonts.bold : Fonts.medium
                    }
                  ]}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <Text allowFontScaling={false} style={[styles.footerNote, { color: colors.textGray }]}>
        Version 1.0.4 • Made with ♥
      </Text>
    </View>
  );
}

