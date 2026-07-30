// Updated TravelMakerSummaryCard with all 9 improvements
import { StyleSheet, Text, View, TouchableOpacity, Animated } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  FontAwesome5,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSelector } from "react-redux";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../styles/Metrics";
import { getCustomColors } from "../../styles/CustomColors";

import { Fonts } from "../../styles/Fonts";


// Helper for status color

const TravelMakerSummaryCard = ({ data, onPress }) => {
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const getStatusColor = (status) => {
    if (!status) return CustomColors.textGray;
    const lower = status.toLowerCase();
    if (lower.includes("approved") || lower === "booked") return CustomColors.statusGreen;
    if (lower.includes("rejected") || lower.includes("cancelled")) return CustomColors.statusRed;
    if (lower.includes("pending") || lower.includes("not booked") || lower.includes("submitted")) return CustomColors.statusOrange;
    return CustomColors.statusBlue;
  };

  const DetailRow = ({ label, value, highlighted, icon }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelWrapper}>
        {icon && <View style={styles.detailIcon}>{icon}</View>}
        <Text allowFontScaling={false} style={styles.detailLabel}>{label}</Text>
      </View>
      <Text
        allowFontScaling={false} style={highlighted ? styles.highlightedDetailValue : styles.detailValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );

  const TravelModeCount = ({ label, countData, icon }) => {
    const hasCounts = Object.values(countData || {}).some(
      (count) => typeof count === "number" && count > 0
    );
    if (!hasCounts) return null;

    return (
      <View style={styles.travelModeRow}>
        {icon && <View style={styles.travelModeIcon}>{icon}</View>}
        <Text allowFontScaling={false} style={styles.travelModeLabel}>{label}</Text>
        <View style={styles.travelModeCountsContainer}>
          {Object.entries(countData || {}).map(([status, count]) => (
            count > 0 && (
              <View key={status} style={styles.statusChip}>
                <Text allowFontScaling={false} style={styles.travelModeValue}>{count}</Text>
                <Text allowFontScaling={false} style={{ color: getStatusColor(status), fontSize: moderateScale(13) }}> ({status})</Text>
              </View>
            )
          ))}
        </View>
      </View>
    );
  };

  const displayPersonName =
    data.from === "MAKER" || data.from === "CANCEL_MAKER"
      ? `(${data.approver_data?.code}) ${data.approver_data?.name}`
      : data.from === "CANCEL_CHECKER" || data.from === "CHECKER"
        ? `(${data.approver_code}) ${data.approvedby}`
        : null;

  const displayMakerName = `(${data.employee_code}) ${data.employee_name}`;

  const copyTourNoToClipboard = async (tourNo) => {
    if (tourNo) {
      await Clipboard.setStringAsync(tourNo.toString());
      // TODO: Replace with Toast or Snackbar if available
      // alert("Tour number copied to clipboard");
    }
  };

  const styles = StyleSheet.create({
    // --- Card Container ---
    cardContainer: {
      marginHorizontal: horizontalScale(18),
      marginVertical: verticalScale(12),
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(16),
      padding: moderateScale(20),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(6) },
      shadowOpacity: 0.08,
      shadowRadius: moderateScale(12),
      elevation: 8,
    },

    // --- Header Section ---
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: moderateScale(1.5),
      borderBottomColor: CustomColors.dividerGray,
      paddingBottom: verticalScale(12),
      marginBottom: verticalScale(16),
    },
    tourNoContainer: {
      flex: 1,
    },
    labelText: {
      fontFamily: Fonts.regular,
      fontSize: moderateScale(13),
      color: CustomColors.textGray,
    },
    tourNoText: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(20),
      color: CustomColors.appThemeColor,
      marginRight: horizontalScale(4),
    },
    statusText: {
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(13),
      color: CustomColors.backgroundWhite,
      backgroundColor: CustomColors.primary,
      paddingVertical: verticalScale(7),
      paddingHorizontal: horizontalScale(16),
      borderRadius: moderateScale(20),
      overflow: "hidden",
      maxWidth: horizontalScale(200),
      textAlign: "center",
      letterSpacing: 0.5,
    },

    // --- Details Section ---
    detailsSection: {
      marginTop: verticalScale(4),
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: verticalScale(12),
    },
    detailLabelWrapper: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    detailIcon: {
      marginRight: horizontalScale(6),
    },
    detailLabel: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(12),
      color: CustomColors.textGray,
    },
    detailValue: {
      fontFamily: Fonts.regular,
      fontSize: moderateScale(14),
      color: CustomColors.textBlack,
      textAlign: "right",
      flex: 2,
    },
    highlightedDetailValue: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(15),
      color: CustomColors.textBlack,
      textAlign: "right",
      flex: 2,
    },

    // --- Travel Modes Section ---
    travelModesSection: {
      marginTop: verticalScale(20),
      paddingTop: verticalScale(16),
      borderTopWidth: moderateScale(1.5),
      borderTopColor: CustomColors.dividerGray,
    },
    travelModeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(10),
    },
    travelModeIcon: {
      marginRight: horizontalScale(10),
    },
    travelModeLabel: {
      fontFamily: Fonts.regular,
      fontSize: moderateScale(12),
      color: CustomColors.textBlack,
      flex: 1,
    },
    travelModeCountsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      flex: 1.5,
    },
    travelModeValue: {
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(14),
      color: CustomColors.primaryText,
    },

    // --- Status Chip ---
    statusChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CustomColors.lightGrayBackground,
      borderRadius: moderateScale(12),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(4),
      marginLeft: horizontalScale(6),
      marginBottom: verticalScale(6),
    },

    // --- Reason Section ---
    reasonSection: {
      marginTop: verticalScale(20),
      paddingTop: verticalScale(16),
      paddingHorizontal: horizontalScale(10),
      borderTopWidth: moderateScale(1.5),
      borderTopColor: CustomColors.dividerGray,
      backgroundColor: CustomColors.backgroundGray2,
      borderRadius: moderateScale(10),
    },
    reasonText: {
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(15),
      color: CustomColors.textBlack,
      marginTop: verticalScale(8),
      lineHeight: moderateScale(24),
    },
  });

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.9}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.tourNoContainer}>
          <Text allowFontScaling={false} style={styles.labelText}>Tour No.</Text>
          <TouchableOpacity onPress={() => copyTourNoToClipboard(data.from === "CHECKER" || data.from === "ADMIN" ? data.tourid : data.id)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text allowFontScaling={false} style={styles.tourNoText}>{data.from === "CHECKER" || data.from === "ADMIN" ? data.tourid : data.id}</Text>
              <MaterialIcons name="content-copy" size={16} color={CustomColors.textGray} />
            </View>
          </TouchableOpacity>
        </View>
        {data.tour_status_text ? (
          <Text allowFontScaling={false} style={[styles.statusText, { backgroundColor: getStatusColor(data.tour_status_text), alignSelf: "flex-end" }]}>
            {data.tour_status_text}
          </Text>
        ) : null}
      </View>

      {/* Main Details */}
      <View style={styles.detailsSection}>
        {displayMakerName && (
          <DetailRow
            label="Maker"
            value={displayMakerName}
            highlighted
            icon={<MaterialIcons name="person" size={16} color={CustomColors.textGray} />}
          />
        )}
        {displayPersonName && (
          <DetailRow
            label="Approver"
            value={displayPersonName}
            highlighted
            icon={<MaterialIcons name="verified-user" size={16} color={CustomColors.textGray} />}
          />
        )}
        {data.startdate && (
          <DetailRow
            label="Start Date"
            value={data.startdate}
            icon={<MaterialIcons name="calendar-today" size={16} color={CustomColors.textGray} />}
          />
        )}
        {data.enddate && (
          <DetailRow
            label="End Date"
            value={data.enddate}
            icon={<MaterialIcons name="event" size={16} color={CustomColors.textGray} />}
          />
        )}
        {data.requestdate && (
          <DetailRow
            label="Requested Date"
            value={data.requestdate}
            icon={<MaterialIcons name="date-range" size={16} color={CustomColors.textGray} />}
          />
        )}
      </View>

      {/* Travel Modes */}
      <View style={styles.travelModesSection}>
        <TravelModeCount
          label="Accommodation"
          countData={data.accommodation_count}
          icon={<MaterialIcons name="hotel" size={18} color={CustomColors.primaryBlue} />}
        />
        <TravelModeCount
          label="Bus"
          countData={data.bus_count}
          icon={<MaterialCommunityIcons name="bus" size={18} color={CustomColors.primaryBlue} />}
        />
        <TravelModeCount
          label="Train"
          countData={data.train_count}
          icon={<MaterialCommunityIcons name="train" size={18} color={CustomColors.primaryBlue} />}
        />
        <TravelModeCount
          label="Air"
          countData={data.air_count}
          icon={<FontAwesome5 name="plane" size={18} color={CustomColors.primaryBlue} />}
        />
        <TravelModeCount
          label="Cab"
          countData={data.cab_count}
          icon={<MaterialIcons name="local-taxi" size={18} color={CustomColors.primaryBlue} />}
        />
      </View>

      {/* Reason */}
      {data.reason && data.reason.trim() && data.reason !== "--" ? (
        <View style={styles.reasonSection}>
          <Text allowFontScaling={false} style={styles.detailLabel}>Reason</Text>
          <Text allowFontScaling={false} style={styles.reasonText}>{data.reason}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

export default TravelMakerSummaryCard;
