import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal, // Import Modal
  Alert, // Import Alert for a simpler confirmation, or use custom modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from '../../styles/Metrics';

const bookingNeededMap = {
  1: 'Accommodation',
  2: 'Cab',
  3: 'Bus',
  4: 'Train',
  5: 'Air',
};

const bookingIcons = {
  1: 'bed-outline',
  2: 'car-outline',
  3: 'bus',
  4: 'train',
  5: 'airplane',
};



const ExpandableSection = ({
  title,
  children,
  summaryData,
  initiallyExpanded = false,
  isEditable = true,
  showHeaderAddButton = false,
  onAddPress,
  onDeletePress,
  disableLongPress = false,
  expanded,            // 🔑 Add this (controlled by parent)
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false); // New state for modal visibility
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const handleDeleteConfirmation = () => {
    // Option 2: Use a custom Modal component (more flexible for complex UIs)
    setIsDeleteModalVisible(true); // Uncomment this line if using the custom Modal below
  };
  const styles = StyleSheet.create({
    container: {
      marginVertical: verticalScale(12),
      borderRadius: moderateScale(10),
      backgroundColor: CustomColors.white,
      shadowColor: CustomColors.darkGray,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.15,
      shadowRadius: moderateScale(8),
      elevation: 4,
      overflow: 'hidden',
    },
    header: {
      justifyContent: 'center',
      paddingVertical: verticalScale(16),
      paddingHorizontal: horizontalScale(18),
      backgroundColor: CustomColors.backgroundGray2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.borderGray,
      borderTopLeftRadius: moderateScale(10),
      borderTopRightRadius: moderateScale(10),
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontWeight: '700',
      fontSize: moderateScale(19),
      color: CustomColors.appThemeColor,
      flexShrink: 1,
      marginRight: horizontalScale(10),
    },
    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addButton: {
      marginRight: horizontalScale(16),
    },
    summaryContentWrapper: {
      marginTop: verticalScale(10),
      paddingTop: verticalScale(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CustomColors.mediumGray,
    },
    content: {
      paddingHorizontal: horizontalScale(18),
      paddingVertical: verticalScale(16),
      backgroundColor: CustomColors.backgroundGray2,
      borderBottomLeftRadius: moderateScale(10),
      borderBottomRightRadius: moderateScale(10),
    },
    summaryLine: {
      fontSize: moderateScale(14.5),
      color: CustomColors.textPrimary,
      marginBottom: verticalScale(6),
    },
    bold: {
      fontWeight: '600',
      color: CustomColors.textDark,
    },
    requirementsSection: {
      marginTop: verticalScale(12),
      paddingTop: verticalScale(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CustomColors.mediumGray,
    },
    requirementsHeader: {
      fontWeight: '700',
      fontSize: moderateScale(15),
      color: CustomColors.appThemeColor,
      marginBottom: verticalScale(8),
    },
    summaryItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    summaryIcon: {
      marginRight: horizontalScale(10),
    },
    summaryItemText: {
      fontWeight: '500',
      fontSize: moderateScale(14),
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.backgroundtransparent,
    },
    modalView: {
      margin: moderateScale(20),
      backgroundColor: CustomColors.white,
      borderRadius: moderateScale(20),
      padding: moderateScale(35),
      alignItems: 'center',
      shadowColor: CustomColors.overlayBlack,
      shadowOffset: {
        width: 0,
        height: verticalScale(2),
      },
      shadowOpacity: 0.25,
      shadowRadius: moderateScale(4),
      elevation: 5,
    },
    modalTitle: {
      marginBottom: verticalScale(15),
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: moderateScale(18),
      color: CustomColors.textDark,
    },
    modalText: {
      marginBottom: verticalScale(20),
      textAlign: 'center',
      fontSize: moderateScale(15),
      color: CustomColors.textPrimary,
    },
    modalButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
    },
    modalButton: {
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      elevation: 2,
      minWidth: horizontalScale(80),
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonCancel: {
      backgroundColor: CustomColors.mediumGray,
    },
    buttonDelete: {
      backgroundColor: CustomColors.statusRed,
      marginLeft: horizontalScale(10),
    },
    textStyle: {
      color: CustomColors.white,
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: moderateScale(15),
    },
  });
  const bookingStatusMap = {
    0: { text: 'Not Booked', color: CustomColors.statusOrange },
    [-1]: { text: 'In Progress', color: CustomColors.statusOrange },
    1: { text: 'Submitted', color: CustomColors.textBlue },
    2: { text: 'Cancel Requested', color: CustomColors.statusYellow },
    3: { text: 'Booked', color: CustomColors.statusGreen },
    4: { text: 'Canceled', color: CustomColors.statusRed },
    5: { text: 'Rejected', color: CustomColors.statusRed },
  };
  const renderSummaryContent = () => {
    if (!summaryData) return null;
    const {
      startingpoint,
      placeofvisit,
      detailStartDate,
      detailEndDate,
      purposeofvisit,
      client,
      typeOfTravel,
      requirement,
    } = summaryData;

    const formatDate = (date) => {
      if (!date) return "—";
      return new Date(date).toLocaleDateString();
    };


    console.log("sum", summaryData)
    return (
      <View style={styles.summaryContentWrapper}>
        {/* Travel Info */}
        <Text allowFontScaling={false} style={styles.summaryLine}>
          <Text allowFontScaling={false} style={styles.bold}>From:{" "}</Text>
          <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}>  {startingpoint?.name || startingpoint || "—"}{" "}</Text>
          <Text allowFontScaling={false} style={styles.bold}>To:</Text>
          <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}> {" "}
            {placeofvisit?.name || placeofvisit || "—"}</Text>
        </Text>
        <Text allowFontScaling={false} style={styles.summaryLine}>
          <Text allowFontScaling={false} style={styles.bold}>Dates:</Text>
          <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}> {" "}
            {formatDate(detailStartDate)} → {formatDate(detailEndDate)}</Text>
        </Text>


        <Text allowFontScaling={false} style={styles.summaryLine}>
          <Text allowFontScaling={false} style={styles.bold}>Purpose:</Text>
          <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}> {" "}
            {purposeofvisit?.name || purposeofvisit || "—"}</Text>
        </Text>
        {client?.client_name && (
          <Text allowFontScaling={false} style={styles.summaryLine}>
            <Text allowFontScaling={false} style={styles.bold}>Client:</Text>
            <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}> {client.client_name}</Text>
          </Text>
        )}
        {typeOfTravel?.name && (
          <Text allowFontScaling={false} style={styles.summaryLine}>
            <Text allowFontScaling={false} style={styles.bold}>Travel Type:</Text>
            <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}> {typeOfTravel.name}</Text>
          </Text>
        )}

        {/* Requirements */}
        {requirement && requirement.length > 0 && (
          <View style={styles.requirementsSection}>
            <Text allowFontScaling={false} style={styles.requirementsHeader}>Requirements:</Text>
            {requirement.map((req, idx) => {
              console.log("REQ ITEM", req);

              const type = bookingNeededMap[req.booking_needed];
              const icon = bookingIcons[req.booking_needed];
              const status =
                bookingStatusMap[req.booking_status] || {
                  text: 'New', // Assuming 'New' is a valid status here, otherwise map to unknown
                  color: CustomColors.primaryBlue,
                };

              return (
                <View key={idx} style={styles.summaryItemRow}>
                  <MaterialCommunityIcons
                    name={icon}
                    size={moderateScale(18)}
                    color={status.color}
                    style={styles.summaryIcon}
                  />
                  <Text allowFontScaling={false} style={[styles.summaryItemText, { color: status.color }]}>
                    {type} - {status.text}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        // Call the confirmation handler on long press
        onLongPress={
          !disableLongPress && isEditable ? handleDeleteConfirmation : undefined
        }
        accessibilityLabel={`Toggle ${title} section`}
        activeOpacity={0.8}
      >
        {/* Top row of the header: Title and Icons */}
        <View style={styles.headerTopRow}>
          <Text allowFontScaling={false} style={styles.title}>{title}</Text>
          <View style={styles.headerIcons}>
            {showHeaderAddButton && isEditable && (
              <TouchableOpacity onPress={onAddPress} style={styles.addButton} activeOpacity={0.7}>
                <Ionicons
                  name="add-circle"
                  size={moderateScale(24)}
                  color={CustomColors.primaryBlue}
                />
              </TouchableOpacity>
            )}
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={moderateScale(24)}
              color={CustomColors.appThemeColor}
            />
          </View>
        </View>

        {/* Summary Content - appears only when not expanded */}
        {!expanded && renderSummaryContent()}
      </TouchableOpacity>

      {/* Main content - appears only when expanded */}
      {expanded && (
        <View style={styles.content}>{children}</View>
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text allowFontScaling={false} style={styles.modalTitle}>Confirm Deletion</Text>
            <Text allowFontScaling={false} style={styles.modalText}>
              Are you sure you want to delete "{title}"?
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonCancel]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text allowFontScaling={false} style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonDelete]}
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  if (onDeletePress) {
                    onDeletePress();
                  }
                }}
              >
                <Text allowFontScaling={false} style={styles.textStyle}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExpandableSection;

