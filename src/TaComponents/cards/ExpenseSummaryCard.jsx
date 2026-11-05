// components/ExpenseSummaryCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import * as Clipboard from "expo-clipboard";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { horizontalScale, verticalScale, moderateScale } from '../../styles/Metrics';
import { getCustomColors } from '../../styles/CustomColors';
import { Fonts } from '../../styles/Fonts';

// Helper for general status color


const ExpenseSummaryCard = ({ expense, onPress }) => {
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const styles = StyleSheet.create({
    cardContainer: {
      marginHorizontal: horizontalScale(0),
      marginVertical: verticalScale(6),
      backgroundColor: isDark ? CustomColors.cardBackground : '#ffffff',
      borderRadius: moderateScale(14),
      padding: moderateScale(14),
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.05,
      shadowRadius: moderateScale(6),
      elevation: 2,
      width: '100%',
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#f1f5f9',
      paddingBottom: verticalScale(8),
      marginBottom: verticalScale(10),
    },
    crNoContainer: {
      flex: 1,
    },
    labelText: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(10),
      color: CustomColors.textMuted || CustomColors.textLightGray,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: verticalScale(1),
    },
    crNoText: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(16),
      color: CustomColors.primaryBlue || CustomColors.appThemeColor,
      marginRight: horizontalScale(6),
    },
    statusText: {
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(11),
      color: CustomColors.white,
      paddingVertical: verticalScale(4),
      paddingHorizontal: horizontalScale(10),
      borderRadius: moderateScale(12),
      overflow: "hidden",
      maxWidth: horizontalScale(200),
      textAlign: "center",
      letterSpacing: 0.3,
    },
    detailsSection: {
      marginTop: verticalScale(2),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(7),
    },
    detailLabelWrapper: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    detailIcon: {
      marginRight: horizontalScale(8),
    },
    detailLabel: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(12),
      color: CustomColors.textMuted || CustomColors.textDarkGray,
    },
    detailValue: {
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(12),
      color: CustomColors.textDark || CustomColors.textBlack,
      textAlign: "right",
      flex: 1.8,
      flexShrink: 1,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingTop: verticalScale(8),
      marginTop: verticalScale(4),
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#f1f5f9',
    },
    cardFooterText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.semiBold,
      color: CustomColors.appThemeColor,
      marginRight: horizontalScale(2),
    },
    amountSection: {
      marginTop: verticalScale(16),
      paddingTop: verticalScale(12),
      borderTopWidth: moderateScale(1),
      borderTopColor: CustomColors.borderColor,
      alignItems: 'flex-end',
    },
    amountLabel: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(12),
      color: CustomColors.textLightGray,
      marginBottom: verticalScale(4),
    },
    amountText: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(18),
      color: CustomColors.accentGreen,
    },
  }); const getStatusColor = (statusText) => {
    if (!statusText) return CustomColors.textGray;
    const lower = statusText.toLowerCase();

    if (lower.includes("approved")) return CustomColors.statusGreen;
    if (lower.includes("rejected")) return CustomColors.statusRed;
    if (lower.includes("submitted") || lower.includes("returned")) return CustomColors.statusOrange;
    if (lower.includes("created")) return CustomColors.statusGray;
    if (lower.includes("default")) return CustomColors.statusBlue; // New: Explicitly for "Default Status"
    return CustomColors.statusBlue; // General fallback for other recognized statuses
  };

  const getClaimStatusDetails = (claimStatusId, maxAppLevel) => {
    const id = Number(claimStatusId);
    const level = Number(maxAppLevel);

    let statusText = "Unknown Status";
    let statusColor = CustomColors.statusGray;

    switch (id) {
      case -1:
        statusText = "New";
        break;
      case 1:
        statusText = "Claim Created";
        break;
      case 2:
        if (level === 1) statusText = "Travel Claim Submitted To RM";
        else if (level === 2) statusText = "Travel Claim Submitted To FM";
        else if (level === 3) statusText = "Travel Claim Submitted To Admin";
        else statusText = "Submitted";
        break;
      case 3:
        if (level === 1) statusText = "Travel Claim Approved By RM";
        else if (level === 2) statusText = "Travel Claim Approved By FM";
        else if (level === 3) statusText = "Travel Claim Approved By Admin";
        else statusText = "Approved";
        break;
      case 4:
        if (level === 1) statusText = "Travel Claim Rejected By RM";
        else if (level === 2) statusText = "Travel Claim Rejected By FM";
        else if (level === 3) statusText = "Travel Claim Rejected By Admin";
        else statusText = "Rejected";
        break;
      case 5:
        if (level === 1) statusText = "Travel Claim Returned By RM";
        else if (level === 2) statusText = "Travel Claim Returned By FM";
        else if (level === 3) statusText = "Travel Claim Returned By Admin";
        else statusText = "Returned";
        break;
      default:
        statusText = `Unknown Status (${id})`;
        break;
    }

    statusColor = getStatusColor(statusText);
    return { statusText, statusColor };
  };
  const copyCrNoToClipboard = async (id) => {
    if (id) {
      await Clipboard.setStringAsync(id.toString());
      //console.log(`CR No. ${id} copied to clipboard`);
    }
  };

  const { statusText, statusColor } = getClaimStatusDetails(
    expense.claim_status_id,
    expense.applevel ? expense.applevel : expense.max_applevel
  );




  // Reusable DetailRow component
  const DetailRow = ({ label, value, icon, valueColor }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelWrapper}>
        {icon && <View style={styles.detailIcon}>{icon}</View>}
        <Text allowFontScaling={false} style={styles.detailLabel}>{label}</Text>
      </View>
      <Text allowFontScaling={false}
        style={[styles.detailValue, valueColor && { color: valueColor }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.9}>

      <View style={styles.headerRow}>
        <View style={styles.crNoContainer}>
          <Text allowFontScaling={false} style={styles.labelText}>Travel No.</Text>
          <TouchableOpacity onPress={() => copyCrNoToClipboard(expense?.requestno || expense?.tour_id || 'N/A')} activeOpacity={0.7}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text allowFontScaling={false} style={styles.crNoText}>{expense?.requestno || expense?.tour_id || 'N/A'}</Text>
              <MaterialIcons name="content-copy" size={moderateScale(14)} color={CustomColors.textGray} />
            </View>
          </TouchableOpacity>
        </View>

        {statusText ? (
          <Text allowFontScaling={false} style={[styles.statusText, { backgroundColor: statusColor }]}>
            {statusText}
          </Text>
        ) : null}
      </View>

      <View style={styles.detailsSection}>
        {expense.employee_name && (
          <DetailRow
            label="Maker"
            value={`(${expense.employee_code || 'N/A'}) ${expense.employee_name}`}
            icon={<MaterialIcons name="person" size={moderateScale(16)} color={CustomColors.textGray} />}
            valueColor={CustomColors.textBlack}
          />
        )}
        {expense.approvedby && (
          <DetailRow
            label="Approver"
            value={`(${expense.approver_code || 'N/A'}) ${expense.approvedby}`}
            icon={<MaterialIcons name="verified-user" size={moderateScale(16)} color={CustomColors.textGray} />}
            valueColor={CustomColors.textBlack}
          />
        )}
        {expense.requestdate && (
          <DetailRow
            label="Travel Requested Date"
            value={expense.requestdate}
            icon={<MaterialIcons name="event" size={moderateScale(16)} color={CustomColors.textGray} />}
          />
        )}
        {expense.startdate && (
          <DetailRow
            label="From Date"
            value={expense.startdate}
            icon={<MaterialIcons name="calendar-today" size={moderateScale(16)} color={CustomColors.textGray} />}
          />
        )}
        {expense.enddate && (
          <DetailRow
            label="To Date"
            value={expense.enddate}
            icon={<MaterialIcons name="date-range" size={moderateScale(16)} color={CustomColors.textGray} />}
          />
        )}

        {/* {expense.tour_no && (
          <DetailRow
            label="Travel No."
            value={expense.tour_no}
            icon={<MaterialIcons name="airplane-ticket" size={moderateScale(16)} color={CustomColors.textGray} />}
          />
        )} */}
        {expense.branch_name && (
          <DetailRow
            label="Maker Branch"
            value={expense.branch_name}
            icon={<MaterialCommunityIcons name="office-building" size={moderateScale(16)} color={CustomColors.textGray} />}
          />
        )}
        {expense.reason && (
          <DetailRow
            label="Travel Reason"
            value={expense.reason}
            icon={<MaterialIcons name="description" size={moderateScale(16)} color={CustomColors.textGray} />}
          />
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text allowFontScaling={false} style={styles.cardFooterText}>
          View Expense Details
        </Text>
        <MaterialIcons
          name="chevron-right"
          size={moderateScale(18)}
          color={CustomColors.appThemeColor}
        />
      </View>
    </TouchableOpacity>
  );
};



ExpenseSummaryCard.propTypes = {
  expense: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    claim_status_id: PropTypes.number.isRequired,
    max_applevel: PropTypes.number.isRequired,
    tour_no: PropTypes.string,
    requestdate: PropTypes.string,
    startdate: PropTypes.string,
    enddate: PropTypes.string,
    reason: PropTypes.string,
    branch_name: PropTypes.string,
    employee_name: PropTypes.string,
    employee_code: PropTypes.string,
    approvedby: PropTypes.string,
    approver_code: PropTypes.string,
    tour_status: PropTypes.string,
    app_amount: PropTypes.number,
    tour_status_id: PropTypes.number,
  }).isRequired,
  onPress: PropTypes.func,
};

export default ExpenseSummaryCard;