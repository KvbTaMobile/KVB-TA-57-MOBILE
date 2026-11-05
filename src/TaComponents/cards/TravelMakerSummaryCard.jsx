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

// 🔑 Separate Helper Functions
const getTourStatusText = (statusId, tourStatusStr) => {
  if (typeof tourStatusStr === "string" && tourStatusStr.trim() !== "") {
    const upper = tourStatusStr.toUpperCase();
    if (upper === "APPROVED") return "Tour Request Approved";
    if (upper === "REJECTED") return "Tour Request Rejected";
    if (upper === "RETURNED" || upper === "RETURN") return "Tour Request Returned From Approver";
    if (upper === "FORWARDED") return "Tour Request Forwarded";
    if (upper === "PENDING") return "Tour Request Submitted To Approver";
  }

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
      return "Submitted";
  }
};

const getAdvanceStatusText = (advanceStatusId, advanceStatusStr) => {
  if (typeof advanceStatusStr === "string" && advanceStatusStr.trim() !== "") {
    const upper = advanceStatusStr.toUpperCase();
    if (upper === "PENDING") return "Tour Advance Pending";
    if (upper === "APPROVED") return "Tour Advance Approved";
    if (upper === "REJECTED") return "Tour Advance Rejected";
    if (upper === "RETURNED" || upper === "RETURN") return "Tour Advance Returned";
    if (upper === "DEFAULT") return "Tour Advance Pending";
  }

  switch (Number(advanceStatusId)) {
    case 1:
      return "Tour Advance Submitted";
    case 2:
      return "Tour Advance Pending";
    case 3:
      return "Tour Advance Approved";
    case 4:
      return "Tour Advance Rejected";
    case 5:
      return "Tour Advance Returned";
    case 15:
    case 17:
      return "Tour Advance Cancel Submitted";
    default:
      return "Tour Advance Pending";
  }
};

const TravelMakerSummaryCard = ({ data, onPress, isAdvance }) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  // Check if item is from Advance module
  const isAdvanceType =
    isAdvance ||
    data?.from === "ADVANCE_CHECKER" ||
    data?.from === "ADVANCE_MAKER" ||
    (data?.advance_status !== undefined && data?.advance_status !== "DEFAULT");

  const hasAdvanceStatus =
    (data?.advance_status !== undefined && data?.advance_status !== null && data?.advance_status !== "DEFAULT") ||
    data?.advance_status_id !== undefined;

  // 🔑 Call Separate Functions
  const displayStatusText =
    data?.tour_cancel_status ||
    data?.advance_cancel_status ||
    (hasAdvanceStatus || (isAdvanceType && !data?.tour_status && !data?.tour_status_id)
      ? getAdvanceStatusText(data?.advance_status_id ?? data?.status, data?.advance_status || data?.status_name)
      : getTourStatusText(data?.tour_status_id ?? data?.status, data?.tour_status || data?.status_name));

  // Color Mapping
  const getStatusColor = () => {
    const textUpper = String(displayStatusText).toUpperCase();

    if (textUpper.includes("APPROVED")) return CustomColors.statusGreen;
    if (textUpper.includes("REJECTED")) return CustomColors.statusRed;
    if (textUpper.includes("RETURN")) return CustomColors.statusOrange;
    if (textUpper.includes("PENDING") || textUpper.includes("SUBMITTED")) {
      return CustomColors.statusYellow || CustomColors.statusOrange;
    }
    if (textUpper.includes("FORWARDED")) return CustomColors.primaryBlue;
    return CustomColors.statusBlue;
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

  const approverName =
    data.approver_data?.name ||
    data.approver_data?.full_name ||
    data.approvedby ||
    data.approved_by ||
    data.approvername ||
    data.approver_name;
  const approverCode =
    data.approver_data?.code ||
    data.approver_code ||
    data.approvercode;
  const displayApproverName = approverName
    ? approverCode
      ? `(${approverCode}) ${approverName}`
      : approverName
    : null;

  const branchName =
    data.branch_name ||
    data.branch ||
    data.branchname ||
    data.approver_branch_data?.branch_name ||
    data.approver_branch_data?.name;
  const branchCode =
    data.branch_code ||
    data.branchcode ||
    data.approver_branch_data?.branch_code ||
    data.approver_branch_data?.code;
  const displayBranchName = branchName
    ? branchCode
      ? `(${branchCode}) ${branchName}`
      : branchName
    : null;

  const tourNumberDisplay =
    data.tour_no ||
    data.tourno ||
    data.requestno ||
    data.request_no ||
    data.reqno ||
    data.tourgid ||
    data.tour_id ||
    data.tourid ||
    data.id ||
    "NEW";

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
      marginRight: horizontalScale(4),
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
            { backgroundColor: getStatusColor() },
          ]}
          numberOfLines={2}
        >
          {displayStatusText}
        </Text>
      </View>

      {/* Table Details */}
      <View style={styles.detailsSection}>
        {(() => {
          const empName =
            data.employee_name ||
            data.full_name ||
            data.emp_name ||
            data.empname ||
            data.name;
          const empCode =
            data.employee_code ||
            data.emp_code ||
            data.empcode ||
            data.code;
          const displayEmployee = empName
            ? empCode
              ? `${empName} (${empCode})`
              : empName
            : null;

          const empGrade =
            data.empgrade ||
            data.grade ||
            data.emp_grade;

          const reqDate =
            data.requestdate ||
            data.request_date ||
            data.requestDate ||
            data.req_date;

          const startDate =
            data.startdate ||
            data.start_date ||
            data.startDate ||
            data.from_date ||
            data.fromdate;

          const endDate =
            data.enddate ||
            data.end_date ||
            data.endDate ||
            data.enddatee ||
            data.to_date ||
            data.todate;

          const reasonText =
            data.reason ||
            data.tourreason ||
            data.travel_reason;

          const advAmount =
            data.requested_amount ??
            data.reqamount ??
            data.req_amount ??
            data.advanceamount ??
            data.advance_amount ??
            data.sanctioned_amount ??
            data.amount;

          return (
            <>
              {displayEmployee ? (
                <DetailRow
                  label="Employee"
                  value={displayEmployee}
                  icon={
                    <MaterialIcons
                      name="person"
                      size={16}
                      color={CustomColors.textGray}
                    />
                  }
                />
              ) : null}

              {empGrade ? (
                <DetailRow
                  label="Grade"
                  value={empGrade}
                  icon={
                    <MaterialIcons
                      name="military-tech"
                      size={16}
                      color={CustomColors.textGray}
                    />
                  }
                />
              ) : null}

              {reqDate ? (
                <DetailRow
                  label="Requested Date"
                  value={reqDate}
                  icon={
                    <MaterialIcons
                      name="date-range"
                      size={16}
                      color={CustomColors.textGray}
                    />
                  }
                />
              ) : null}

              {startDate ? (
                <DetailRow
                  label="From Date"
                  value={startDate}
                  icon={
                    <MaterialIcons
                      name="calendar-today"
                      size={16}
                      color={CustomColors.textGray}
                    />
                  }
                />
              ) : null}

              {endDate ? (
                <DetailRow
                  label="To Date"
                  value={endDate}
                  icon={
                    <MaterialIcons
                      name="event"
                      size={16}
                      color={CustomColors.textGray}
                    />
                  }
                />
              ) : null}

              {reasonText ? (
                <DetailRow
                  label="Reason"
                  value={reasonText}
                  icon={
                    <MaterialIcons
                      name="chat-bubble-outline"
                      size={16}
                      color={CustomColors.textGray}
                    />
                  }
                />
              ) : null}

              {(isAdvanceType || (advAmount !== undefined && advAmount !== null && advAmount !== "")) &&
              advAmount !== undefined &&
              advAmount !== null &&
              advAmount !== "" ? (
                <DetailRow
                  label="Requested Amount"
                  value={`₹${Number(advAmount ?? 0).toLocaleString()}`}
                  highlighted
                  icon={
                    <MaterialIcons
                      name="attach-money"
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
            </>
          );
        })()}
      </View>
    </TouchableOpacity>
  );
};

export default TravelMakerSummaryCard;