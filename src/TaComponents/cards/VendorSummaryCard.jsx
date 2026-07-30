import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { horizontalScale, verticalScale, moderateScale } from "../../globalstyles/Metrics";
import { getCustomColors } from "../../styles/CustomColors";
import { useSelector } from "react-redux";

const VendorSummaryCard = ({ data, onPress }) => {
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  // Dynamic Status Color Logic
  const statusStyle = useMemo(() => {
    const status = data?.vendor_status_name?.toLowerCase() || '';
    if (status.includes('approved')) {
      return { bg: CustomColors.statusGreenLite, text: CustomColors.statusDarkGreen, icon: 'check-circle' };
    }
    if (status.includes('pending')) {
      return { bg: CustomColors.liteyellow, text: CustomColors.statusAmber, icon: 'pending' };
    }
    if (status.includes('draft')) {
      return { bg: CustomColors.primaryLight, text: CustomColors.statusBlue, icon: 'edit' };
    }
    return { bg: CustomColors.backgroundGray, text: CustomColors.textGray, icon: 'info' };
  }, [data.vendor_status_name, CustomColors]);

  return (
    <View style={{ backgroundColor: CustomColors.appScreenColor }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(data)}
        style={[
          styles.cardContainer,
          {
            backgroundColor: CustomColors.backgroundCard,
            borderColor: CustomColors.dividerGray,
          }
        ]}
      >
        {/* --- HEADER SECTION --- */}
        <View style={styles.header}>
          <View style={styles.titleArea}>
            <Text numberOfLines={1} allowFontScaling={false} style={[styles.vendorName, { color: CustomColors.textBlack }]}>
              {data.name || 'Unknown Vendor'}
            </Text>
            <Text allowFontScaling={false} style={[styles.vendorCode, { color: CustomColors.appThemeColor }]}>
              #{data.code || '---'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <MaterialIcons name={statusStyle.icon} size={14} color={statusStyle.text} />
            <Text allowFontScaling={false} style={[styles.statusText, { color: statusStyle.text }]}>
              {data.vendor_status_name || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: CustomColors.dividerGray }]} />

        {/* --- INFO GRID --- */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <FontAwesome5 name="id-card" size={14} color={CustomColors.textGray} />
            <View style={styles.infoTextWrapper}>
              <Text allowFontScaling={false} style={[styles.miniLabel, { color: CustomColors.textLightGray }]}>PAN NO.</Text>
              <Text allowFontScaling={false} style={[styles.infoValue, { color: CustomColors.textDark }]}>{data.panno || '-'}</Text>
            </View>
          </View>

          <View style={styles.gridItem}>
            <MaterialIcons name="category" size={16} color={CustomColors.textGray} />
            <View style={styles.infoTextWrapper}>
              <Text allowFontScaling={false} style={[styles.miniLabel, { color: CustomColors.textLightGray }]}>CLASSIFICATION</Text>
              <Text allowFontScaling={false} style={[styles.infoValue, { color: CustomColors.textDark }]}>{data.type?.text || '-'}</Text>
            </View>
          </View>

          <View style={styles.gridItem}>
            <Ionicons name="calendar-outline" size={15} color={CustomColors.textGray} />
            <View style={styles.infoTextWrapper}>
              <Text allowFontScaling={false} style={[styles.miniLabel, { color: CustomColors.textLightGray }]}>RENEWAL DATE</Text>
              <Text allowFontScaling={false} style={[styles.infoValue, { color: CustomColors.textDark }]}>{data.renewal_date || 'None'}</Text>
            </View>
          </View>

          <View style={styles.gridItem}>
            <MaterialCommunityIcons name="file-document-outline" size={16} color={CustomColors.textGray} />
            <View style={styles.infoTextWrapper}>
              <Text allowFontScaling={false} style={[styles.miniLabel, { color: CustomColors.textLightGray }]}>REQUEST TYPE</Text>
              <Text allowFontScaling={false} style={[styles.infoValue, { color: CustomColors.textDark }]}>{data.requeststatus_name || '-'}</Text>
            </View>
          </View>
        </View>

        {/* --- FOOTER --- */}
        <View style={[styles.footer, { borderTopColor: CustomColors.dividerGray }]}>
          <Text allowFontScaling={false} style={[styles.gstText, { color: CustomColors.textGray2 }]}>
            GST Category: <Text allowFontScaling={false} style={{ fontWeight: 'bold' }}>{data.composite || 'N/A'}</Text>
          </Text>
          <MaterialIcons name="chevron-right" size={24} color={CustomColors.textGray} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginVertical: verticalScale(8),
    marginHorizontal: horizontalScale(16),
    borderWidth: 1,
    elevation: 3,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleArea: {
    flex: 1,
    paddingRight: horizontalScale(10),
  },
  vendorName: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    marginBottom: verticalScale(2),
  },
  vendorCode: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(4),
    paddingHorizontal: horizontalScale(10),
    borderRadius: moderateScale(6),
  },
  statusText: {
    fontWeight: '700',
    fontSize: moderateScale(11),
    marginLeft: horizontalScale(4),
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginVertical: verticalScale(12),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  infoTextWrapper: {
    marginLeft: horizontalScale(8),
  },
  miniLabel: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    marginTop: 1,
  },
  footer: {
    marginTop: verticalScale(4),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gstText: {
    fontSize: moderateScale(12),
  },
});

export default VendorSummaryCard;