import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../styles/Metrics";
import { getCustomColors } from "../../styles/CustomColors";
import { Fonts } from "../../styles/Fonts";
import ToastMessage from "../../TaComponents/toast/ToastMessage";

const TravelMakerSummaryCard = ({ data, onPress }) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  // Exact Angular-equivalent tour_status_id string labels
  const getStatusText = (statusId) => {
    switch (Number(statusId)) {
      case 1:
      case 2:
        return "Tour Request Submitted To Approver";
      case 3:
        return "Tour Request Approved";
      case 4:
        return "Tour Request Rejected";
      case 5:
        return "Tour Request Returned From Approver";
      case 6:
        return "Tour Request Forwarded";
      case 7:
        return "Tour Cancel Requested";
      case 8:
        return "Tour Cancel Approved";
      default:
        return data.tour_status_text || data.status_text || "Submitted";
    }
  };

  // Exact Angular status colors
  const getStatusColor = (statusId) => {
    switch (Number(statusId)) {
      case 3:
      case 8:
        return CustomColors.statusGreen;
      case 4:
        return CustomColors.statusRed;
      case 5:
        return CustomColors.statusOrange;
      case 1:
      case 2:
      case 7:
        return CustomColors.statusYellow || CustomColors.statusOrange;
      case 6:
        return CustomColors.primaryBlue;
      default:
        return CustomColors.statusBlue;
    }
  };

  const DetailRow = ({ label, value, highlighted, icon }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelWrapper}>
        {icon && <View style={styles.detailIcon}>{icon}</View>}
        <Text allowFontScaling={false} style={styles.detailLabel}>
          {label}
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        style={highlighted ? styles.highlightedDetailValue : styles.detailValue}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );

  const displayApproverName = data.approver_data?.name
    ? `(${data.approver_data?.code || ""}) ${data.approver_data?.name}`
    : data.approvedby
    ? `(${data.approver_code || ""}) ${data.approvedby}`
    : null;

  const displayBranchName = data.branch_name
    ? `(${data.branch_code || ""}) ${data.branch_name}`
    : null;

  const tourNumberDisplay = data.requestno || data.id || "NEW";
  const statusId = data.tour_status_id || data.status;

  const copyTourNoToClipboard = async (tourNo) => {
    if (tourNo) {
      await Clipboard.setStringAsync(tourNo.toString());
      ToastMessage(`Copied "${tourNo}" to clipboard`);
    }
  };

  const styles = StyleSheet.create({
    cardContainer: {
      marginHorizontal: horizontalScale(16),
      marginVertical: verticalScale(8),
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(14),
      padding: moderateScale(16),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(3) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(6),
      elevation: 4,
      borderWidth: 1,
      borderColor: CustomColors.borderColor || "transparent",
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottomWidth: moderateScale(1),
      borderBottomColor: CustomColors.dividerGray || "#E5E7EB",
      paddingBottom: verticalScale(10),
      marginBottom: verticalScale(12),
    },
    tourNoContainer: {
      flex: 1,
      marginRight: horizontalScale(8),
    },
    labelText: {
      fontFamily: Fonts.regular,
      fontSize: moderateScale(12),
      color: CustomColors.textGray,
      marginBottom: verticalScale(2),
    },
    tourNoCopyButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
    },
    tourNoText: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(17),
      color: CustomColors.appThemeColor,
      marginRight: horizontalScale(-1),
      
      
    },
    statusText: {
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(11),
      color: CustomColors.backgroundWhite,
      paddingVertical: verticalScale(5),
      paddingHorizontal: horizontalScale(10),
      borderRadius: moderateScale(12),
      overflow: "hidden",
      maxWidth: horizontalScale(180),
      textAlign: "center",
      flexShrink: 1,
    },
    detailsSection: {
      marginTop: verticalScale(2),
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: verticalScale(10),
    },
    detailLabelWrapper: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingRight: horizontalScale(4),
    },
    detailIcon: {
      marginRight: horizontalScale(6),
    },
    detailLabel: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(13),
      color: CustomColors.textGray,
    },
    detailValue: {
      fontFamily: Fonts.regular,
      fontSize: moderateScale(13),
      color: CustomColors.textBlack,
      textAlign: "right",
      flex: 1.5,
    },
    highlightedDetailValue: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(13),
      color: CustomColors.textBlack,
      textAlign: "right",
      flex: 1.5,
    },
  });

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.tourNoContainer}>
          <Text allowFontScaling={false} style={styles.labelText}>
            Tour No
          </Text>
          <TouchableOpacity
            style={styles.tourNoCopyButton}
            onPress={() => copyTourNoToClipboard(tourNumberDisplay)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text allowFontScaling={false} style={styles.tourNoText}>
              {tourNumberDisplay}
            </Text>
            <MaterialIcons
              name="content-copy"
              size={moderateScale(16)}
              color={CustomColors.appThemeColor}
            />
          </TouchableOpacity>
        </View>

        <Text
          allowFontScaling={false}
          style={[
            styles.statusText,
            { backgroundColor: getStatusColor(statusId) },
          ]}
          numberOfLines={2}
        >
          {getStatusText(statusId)}
        </Text>
      </View>

      {/* Table Details */}
      <View style={styles.detailsSection}>
        {data.requestdate ? (
          <DetailRow
            label="Tour Requested Date"
            value={data.requestdate}
            icon={
              <MaterialIcons
                name="date-range"
                size={16}
                color={CustomColors.textGray}
              />
            }
          />
        ) : null}
        {data.startdate ? (
          <DetailRow
            label="From Date"
            value={data.startdate}
            icon={
              <MaterialIcons
                name="calendar-today"
                size={16}
                color={CustomColors.textGray}
              />
            }
          />
        ) : null}
        {data.enddate ? (
          <DetailRow
            label="To Date"
            value={data.enddate}
            icon={
              <MaterialIcons
                name="event"
                size={16}
                color={CustomColors.textGray}
              />
            }
          />
        ) : null}
        {data.reason ? (
          <DetailRow
            label="Reason"
            value={data.reason}
            icon={
              <MaterialIcons
                name="chat-bubble-outline"
                size={16}
                color={CustomColors.textGray}
              />
            }
          />
        ) : null}
        {displayBranchName ? (
          <DetailRow
            label="Branch"
            value={displayBranchName}
            icon={
              <MaterialIcons
                name="location-city"
                size={16}
                color={CustomColors.textGray}
              />
            }
          />
        ) : null}
        {displayApproverName ? (
          <DetailRow
            label="Approver"
            value={displayApproverName}
            highlighted
            icon={
              <MaterialIcons
                name="verified-user"
                size={16}
                color={CustomColors.textGray}
              />
            }
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default TravelMakerSummaryCard;