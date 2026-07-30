import React, { useLayoutEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Fonts } from "../../styles/Fonts";
import WarningDialog from "../../TaComponents/dialogs/WarningDialog";
// import { CustomColors } from "../../styles/CustomColors";
import { logout } from "../../redux/slices/AuthSlice";
import { clearTokenAsyncData } from "../../redux/store/AsyncStore";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "../../styles/Metrics";
import { getCustomColors } from "../../styles/CustomColors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEmployeeDetailsUpdateQuery } from "../../redux/rtk_query/apiSlice";
import { SafeAreaView } from "react-native-safe-area-context";

const ProfileScreen = ({ route }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const authRedux = useSelector((state) => state.auth);
  const [logoutDialogStatus, setLogoutDialogStatus] = useState(false);
  const { openDrawer } = route.params || {};
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const {
    data: empData,
    isLoading,
  } = useEmployeeDetailsUpdateQuery(authRedux?.user?.employee_id, {
    skip: !authRedux?.user?.employee_id,
  });

  const profile = empData || {};
  const address = profile.address || {};
  const contact = profile.contact || {};

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: CustomColors.appScreenColor,
    },
    headerWrapper: {
      paddingHorizontal: horizontalScale(20),
      paddingTop: verticalScale(20),
    },
    headerRowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.backgroundGray,
      padding: moderateScale(15),
      borderRadius: moderateScale(20),
      elevation: 4,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    scrollArea: {
      flex: 1, // This allows middle section to expand and scroll
    },
    scrollContent: {
      paddingHorizontal: horizontalScale(20),
      paddingBottom: verticalScale(20),
      paddingTop: verticalScale(15),
    },
    headerTextContainer: {
      flex: 1,
      marginLeft: horizontalScale(15),
    },
    userNameText: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(18),
      color: CustomColors.textBlack,
    },
    codeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.backgroundGray,
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(2),
      borderRadius: moderateScale(6),
      marginTop: verticalScale(4),
      alignSelf: 'flex-start',
    },
    userCodeText: {
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(11),
      color: CustomColors.appThemeColor,
      marginLeft: 4,
    },
    designationText: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(12),
      color: CustomColors.textGray,
      marginTop: verticalScale(2),
    },
    imageShadow: {
      borderRadius: moderateScale(35),
      elevation: 5,
      backgroundColor: CustomColors.iconTextColor,
      alignItems: "center",
      justifyContent: "center",
    },

    imageOuterContainer: {
      width: moderateScale(70),
      height: moderateScale(70),
      borderRadius: moderateScale(35),
      borderWidth: 2,
      borderColor: CustomColors.appThemeColor,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },

    imageInnerContainer: {
      width: moderateScale(40),   // 🔥 IMPORTANT (not 100%)
      height: moderateScale(40),
      tintColor: CustomColors.appThemeColor, // ✅ ICON COLOR
    },

    listContainer: {
      backgroundColor: CustomColors.backgroundGray2,
      padding: moderateScale(18),
      borderRadius: moderateScale(15),
      elevation: 3,
    },
    sectionTitle: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(13),
      color: CustomColors.appThemeColor,
      marginBottom: verticalScale(15),
      paddingBottom: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: CustomColors.errorBorderColorRed,
      textTransform: 'uppercase',
    },
    listItemContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: verticalScale(15),
    },
    labelGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    labelText: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(13),
      color: CustomColors.textGray,
    },
    valueText: {
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(13),
      color: CustomColors.textBlack,
      textAlign: "right",
      flex: 1,
    },
    addressBox: {
      flexDirection: 'row',
      backgroundColor: CustomColors.backgroundGray2,
      padding: 10,
      borderRadius: 10,
    },
    addressText: {
      fontFamily: Fonts.regular,
      fontSize: moderateScale(12),
      color: CustomColors.textDark,
      lineHeight: 18,
    },
    copyrightContainer: {
      alignItems: "center",
      paddingBottom: verticalScale(20),
      paddingTop: verticalScale(10),
      backgroundColor: CustomColors.backgroundGray2,
      borderTopWidth: 1,
      borderTopColor: CustomColors.backgroundGray,
    },
    poweredByText: {
      fontSize: moderateScale(10),
      color: CustomColors.textGray,
      fontFamily: Fonts.regular,
      marginBottom: 5,
    },
    copyrightRowContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 15,
    },
    verticalDivider: {
      width: 1,
      height: 15,
      backgroundColor: CustomColors.adsGreyText,
    },
    copyrightImageContainer: {
      width: horizontalScale(80),
      height: verticalScale(25),
      color: CustomColors.adsGreyText
    },
    copyrightImageContainer: {
      width: horizontalScale(80),
      height: verticalScale(25),
      color: CustomColors.adsGreyText
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logOutIcon: { marginRight: 15 },
    pressed: { opacity: 0.7 },

  });
  useLayoutEffect(() => {
    navigation.setOptions({
      title: " Profile",
      headerShown: true,
      headerTitleAlign: "center",
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
        elevation: 0,
        shadowColor: "transparent",
      },
      headerTitleStyle: { color: CustomColors.white, fontFamily: Fonts.medium, fontSize: moderateScale(18), },
      headerTintColor: CustomColors.white,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            navigation.goBack();
            if (openDrawer) {
              setTimeout(() => { openDrawer(); }, 150);
            }
          }}
          style={{ marginLeft: 15 }}
        >
          <Ionicons name="menu" size={28} color={CustomColors.white} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <Pressable
          style={({ pressed }) => [styles.logOutIcon, pressed && styles.pressed]}
          onPress={() => setLogoutDialogStatus(true)}
        >
          <MaterialCommunityIcons name="logout" size={moderateScale(24)} color="white" />
        </Pressable>
      ),
    });
  }, [navigation, openDrawer]);
  const SkeletonItem = ({ width, height, borderRadius = 4, marginTop = 0, style }) => (
    <View style={[{
      width,
      height,
      backgroundColor: CustomColors.backgroundGray,
      borderRadius,
      marginTop,
      overflow: 'hidden',
    }, style]} />
  );

  const handleLogout = async () => {
    await clearTokenAsyncData();
    dispatch(logout());
    setLogoutDialogStatus(false);
    navigation.reset({ index: 0, routes: [{ name: "login" }] });
  };

  const ProfileItem = ({ icon, label, value }) => (
    <View style={styles.listItemContainer}>
      <View style={styles.labelGroup}>
        <MaterialCommunityIcons name={icon} size={20} color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={styles.labelText}>{label}</Text>
      </View>
      <Text allowFontScaling={false} style={styles.valueText}>{value || "- -"}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.screenContainer}>
        {/* Skeleton Header */}
        <View style={styles.headerWrapper}>
          <View style={styles.headerRowContainer}>
            <SkeletonItem width={moderateScale(70)} height={moderateScale(70)} borderRadius={35} />
            <View style={styles.headerTextContainer}>
              <SkeletonItem width="80%" height={20} />
              <SkeletonItem width="40%" height={15} marginTop={8} />
              <SkeletonItem width="60%" height={12} marginTop={8} />
            </View>
          </View>
        </View>

        {/* Skeleton Content */}
        <View style={styles.scrollContent}>
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={[styles.listContainer, { marginTop: index === 0 ? 0 : 15 }]}>
              <SkeletonItem width="50%" height={18} style={{ marginBottom: 20 }} />
              {[1, 2, 3, 4].map((_, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                  <SkeletonItem width="30%" height={14} />
                  <SkeletonItem width="40%" height={14} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screenContainer} edges={['bottom']}>
      {/* 1. FIXED HEADER ROW */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerRowContainer}>
          <View style={styles.imageShadow}>
            <View style={styles.imageOuterContainer}>
              <Ionicons
                name="person"
                size={48}
                color={CustomColors.appThemeColor} // ✅ CONTROL COLOR
              />
            </View>
          </View>


          <View style={styles.headerTextContainer}>
            <Text allowFontScaling={false} style={styles.userNameText} numberOfLines={2}>
              {profile.name || authRedux?.user?.name || "User"}
            </Text>
            <View style={styles.codeBadge}>
              {/* <MaterialCommunityIcons name="identifier" size={20} color={CustomColors.appThemeColor} /> */}
              <Text allowFontScaling={false} style={styles.userCodeText}>
                {profile.code || authRedux?.user?.code || "Code"}
              </Text>
            </View>
            <Text allowFontScaling={false} style={styles.designationText}>
              {profile.designation_name || "Employee"}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Work Information Card */}
        <View style={styles.listContainer}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>Work Information</Text>
          <ProfileItem icon="domain" label="Entity" value={authRedux?.user?.entity_name} />
          <ProfileItem icon="briefcase-outline" label="Designation" value={profile.designation_name} />
          <ProfileItem icon="calendar-import" label="Joining Date" value={profile.doj} />
          <ProfileItem icon="laptop" label="Work Mode" value={profile.workmode === 1 ? "Office" : "Remote"} />
        </View>

        {/* Contact Details Card */}
        <View style={[styles.listContainer, { marginTop: verticalScale(15) }]}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>Contact Details</Text>
          <ProfileItem icon="phone-outline" label="Mobile" value={profile.phone_no} />
          <ProfileItem icon="email-outline" label="Official Email" value={contact.email} />
          <ProfileItem icon="phone-classic" label="Landline" value={contact.landline} />
        </View>

        {/* Office Address Card */}
        <View style={[styles.listContainer, { marginTop: verticalScale(15) }]}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>Office Address</Text>
          <View style={styles.addressBox}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={CustomColors.appThemeColor} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text allowFontScaling={false} style={styles.addressText}>
                {address.line1}, {address.line2}{"\n"}
                {address.city_name}, {address.state_name} - {address.pincode_no}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 3. FIXED FOOTER */}
      <View style={styles.copyrightContainer}>
        <Text allowFontScaling={false} style={styles.poweredByText}>Powered by</Text>
        <View style={styles.copyrightRowContainer}>
          <Image
            source={require("../../assets/images/logo1.png")}
            style={styles.copyrightImageContainer}
            resizeMode="contain"
          />
          <View style={styles.verticalDivider} />
          <Image
            source={
              isDark
                ? require("../../assets/images/vsolv_logo_dark.png")
                : require("../../assets/images/vsolv_logo_1.png")
            }
            style={styles.copyrightImageContainer}
            resizeMode="contain"
          />

        </View>
      </View>

      {logoutDialogStatus && (
        <WarningDialog
          dialogStatus={logoutDialogStatus}
          setDialogStatus={setLogoutDialogStatus}
          tittle="Warning!"
          subTittle="Are you sure want to logout?"
          onPressEvent={handleLogout}
        />
      )}
    </SafeAreaView>
  );
};

export default ProfileScreen;
