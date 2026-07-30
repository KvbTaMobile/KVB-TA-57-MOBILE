import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { moderateScale, verticalScale, horizontalScale } from '../../styles/Metrics';
import { useSelector } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";
const REQUIREMENT_TYPES = {
  1: 'Accommodation',
  2: 'Cab',
  3: 'Bus',
  4: 'Train',
  5: 'Air',
};

const REQUIREMENT_ICONS = {
  1: 'bed-outline',
  2: 'car',
  3: 'bus',
  4: 'train',
  5: 'airplane',
};



// Convert "2025-Mar-31 10:00:00" → Date object
const parseCustomDate = (str) => {
  if (!str) return null;

  // Case 1: yyyy-mm-dd hh:mm:ss  ✅ (YOUR CURRENT DATA)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
    return new Date(str.replace(" ", "T"));
  }

  // Case 2: yyyy-MMM-dd hh:mm:ss
  const months = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };

  const regex = /^(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  const match = str.match(regex);
  if (!match) return null;

  const [, year, monthStr, day, hour, min, sec] = match;
  return new Date(`${year}-${months[monthStr]}-${day}T${hour}:${min}:${sec}`);
};


const formatDateTime = (value) => {
  const date = parseCustomDate(value);
  if (!date || isNaN(date)) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const RequirementSummaryCard = ({ requirement, onPress, index, onDelete, disableDelete = false }) => {
  console.log("check", requirement)
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const type = requirement.booking_needed;
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const styles = StyleSheet.create({
    card: {
      borderRadius: moderateScale(10),
      padding: moderateScale(12),
      marginBottom: verticalScale(10),
      borderWidth: 1,
      borderColor: CustomColors.backgroundGray,
      shadowColor: CustomColors.textBlack,
      shadowOpacity: 0.05,
      shadowRadius: moderateScale(5),
      shadowOffset: { width: 0, height: verticalScale(2) },
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    title: {
      fontSize: moderateScale(15),
      fontWeight: 'bold',
      color: CustomColors.textBlack,
    },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(4),
    },
    label: {
      fontSize: moderateScale(13),
      fontWeight: '600',
      color: CustomColors.textDarkGray,
    },
    value: {
      fontSize: moderateScale(13),
      color: CustomColors.textGray,
      textAlign: 'right',
      maxWidth: '60%',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(2),
    },
    badgeText: {
      fontSize: moderateScale(12),
      fontWeight: '600',
    },
    popupOverlay: {
      flex: 1,
      backgroundColor: CustomColors.backgroundtransparent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    popupContainer: {
      width: '80%',
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(10),
      padding: moderateScale(16),
      elevation: 5,
    },
    popupTitle: {
      fontSize: moderateScale(16),
      fontWeight: 'bold',
      marginBottom: verticalScale(12),
      textAlign: 'center',
    },
    popupActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    popupButton: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      backgroundColor: CustomColors.backgroundRed,
      borderRadius: moderateScale(5),
    },
    popupButtonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(14),
    },
  });

  const StatusStyles = {
    0: { text: 'Not Booked', textColor: CustomColors.PrincetonOrange, bgColor: CustomColors.liteBanana, icon: 'calendar-remove', cardBgColor: CustomColors.Cornsilk }, // Light Gray
    [-1]: { text: 'In Progress', textColor: CustomColors.Sapphire, bgColor: CustomColors.paleblue, icon: 'progress-clock', cardBgColor: CustomColors.AliceBlue }, // Light Blue
    1: { text: 'Submitted', textColor: CustomColors.PrincetonOrange, bgColor: CustomColors.warmpastelyellow, icon: 'send', cardBgColor: CustomColors.statusAmberLite }, // Light Orange
    2: { text: 'Cancel Requested', textColor: CustomColors.OrangeDarken, bgColor: CustomColors.simplylightorange, icon: 'cancel', cardBgColor: CustomColors.paleorange }, // Lighter Orange
    3: { text: 'Booked', textColor: CustomColors.Paradise, bgColor: CustomColors.DeltaMint, icon: 'check-circle-outline', cardBgColor: CustomColors.Green }, // Light Green
    4: { text: 'Canceled', textColor: CustomColors.SindoorRed, bgColor: CustomColors.PaleRed, icon: 'close-circle-outline', cardBgColor: CustomColors.LavenderBlush }, // Light Red
    5: { text: 'Rejected', textColor: CustomColors.RedInferno, bgColor: CustomColors.RedLighten, icon: 'close-octagon-outline', cardBgColor: CustomColors.Linen }, // Lighter Red
  };
  const statusInfo = StatusStyles[requirement.booking_status] || {
    text: 'New',
    textColor: CustomColors.textBlack,
    bgColor: CustomColors.backgroundGray2,
    icon: 'star-plus-outline',
    cardBgColor: CustomColors.backgroundWhite // Default white for unknown status
  };
  const renderDetailRow = (label, value) => (
    <View style={styles.row}>
      <Text allowFontScaling={false} style={styles.label}>{label}</Text>
      <Text allowFontScaling={false} style={styles.value}>{value || '-'}</Text>
    </View>
  );

  const renderDetails = () => {
    switch (type) {
      case 1:
        return (
          <>
            {renderDetailRow('Place of Stay', requirement.place_of_stay)}
            {renderDetailRow('Check-In', formatDateTime(requirement.checkin_time))}
            {renderDetailRow('Check-Out', formatDateTime(requirement.checkout_time))}
            {renderDetailRow('Room Type', typeof requirement.room_type === 'object' ? requirement.room_type?.name : requirement.room_type)}
          </>
        );
      case 2:
        return (
          <>
            {renderDetailRow('From', requirement.from_place)}
            {renderDetailRow('To', requirement.to_place)}
            {renderDetailRow('Cab Type', typeof requirement.cab_segment === 'object' ? requirement.cab_segment?.name : requirement.cab_segment)}
            {renderDetailRow('Travel Type', typeof requirement.travel_type_cab_value === 'object' ? requirement.travel_type_cab_value?.name : requirement.travel_type_cab_value)}
            {renderDetailRow('From Time', formatDateTime(requirement.from_time))}
          </>
        );
      case 3:
      case 4:
      case 5:
        return (
          <>
            {renderDetailRow('From', requirement.from_place)}
            {renderDetailRow('To', requirement.to_place)}
            {renderDetailRow('Date & Time', formatDateTime(requirement.from_time))}
          </>
        );
      default:
        return renderDetailRow('Requirement Code', requirement.requirement_code);
    }
  };

  const StatusBadge = ({ status }) => {
    const style = StatusStyles[status] || {
      text: 'New',
      textColor: CustomColors.textBlack,
      bgColor: CustomColors.backgroundGray2,
      icon: 'star-plus-outline'
    };
    return (
      <View style={[styles.badge, { backgroundColor: style.bgColor }]}>
        <MaterialCommunityIcons
          name={style.icon}
          size={14}
          color={style.textColor}
          style={{ marginRight: 4 }}
        />
        <Text allowFontScaling={false} style={[styles.badgeText, { color: style.textColor }]}>{style.text}</Text>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => onPress(requirement, index)}
        onLongPress={disableDelete ? undefined : () => setShowDeletePopup(true)}
        style={[styles.card, { backgroundColor: statusInfo.cardBgColor }]} // Apply dynamic background color
      >
        <View style={styles.header}>
          <View style={styles.typeRow}>
            <MaterialCommunityIcons
              name={REQUIREMENT_ICONS[requirement.booking_needed] || 'file-document'}
              size={18}
              color={CustomColors.textBlack}
              style={{ marginRight: 6 }}
            />
            <Text allowFontScaling={false} style={styles.title}>
              {REQUIREMENT_TYPES[requirement.booking_needed] || 'Unknown'}
            </Text>
          </View>
          <StatusBadge status={requirement.booking_status} />
        </View>
        {renderDetailRow('Requirement Code', requirement.requirement_code)}
        {renderDetails()}
      </TouchableOpacity>

      <Modal transparent visible={showDeletePopup} animationType="fade" onRequestClose={() => setShowDeletePopup(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Text allowFontScaling={false} style={styles.popupTitle}>Delete {REQUIREMENT_TYPES[requirement.booking_needed]} requirement?</Text>
            <View style={styles.popupActions}>
              <TouchableOpacity
                style={styles.popupButton}
                onPress={() => {
                  setShowDeletePopup(false);
                  onDelete(requirement, index.requirementIndex ?? index);
                }}
              >
                <Text allowFontScaling={false} style={styles.popupButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.popupButton, { backgroundColor: CustomColors.lightGrayBackground }]}
                onPress={() => setShowDeletePopup(false)}
              >
                <Text allowFontScaling={false} style={[styles.popupButtonText, { color: CustomColors.darkText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};



export default RequirementSummaryCard;