import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import {
  moderateScale,
  horizontalScale,
  verticalScale,
} from "../../styles/Metrics"; // Assuming this is for responsive sizing

import { getCustomColors } from "../../styles/CustomColors";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { useSelector } from "react-redux";
import { useAdminReservMutation, useReqRejectMutation } from "../../redux/rtk_query/apiSlice";

const REQUIREMENT_TYPES = {
  1: "Accommodation",
  2: "Cab",
  3: "Bus",
  4: "Train",
  5: "Air",
};

// New Booking Status Map


const RequirementDetailModal = ({
  visible,
  onClose,
  requirement,
  isEditable,
  onSave,
  openCommonDropDownPicker,
  index,
  setFieldValue,
  minDate,
  maxDate,
  isAdmin, // New prop for admin access
  navigation
}) => {

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const authRedux = useSelector((state) => state.auth);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const [
    triggerAdminReserv,
    { data: AdReservdata, isLoading: isLoadingAdReserv, error: adReservError },
  ] = useAdminReservMutation();

  const [
    triggerReqReject,
    { data: ReqRejectdata, isLoading: isLoadingReqReject, error: reqRejectError },
  ] = useReqRejectMutation();

  useEffect(() => {
    if (
      requirement?.booking_needed === 1 &&
      requirement?.checkin_time &&
      requirement?.checkout_time &&
      index
    ) {
      const checkinDate = parseCustomDate(requirement.checkin_time);
      const checkoutDate = parseCustomDate(requirement.checkout_time);
      const diffMs = checkoutDate - checkinDate;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const nights = diffDays > 0 ? diffDays : 0;

      setFieldValue(
        `details[${index.detailIndex}].requirement[${index.requirementIndex}].no_of_nights`,
        nights
      );
    }
  }, [visible]);
  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: CustomColors.overlayBlack,
    },
    modalView: {
      backgroundColor: CustomColors.modal_background,
      borderRadius: moderateScale(8),
      padding: horizontalScale(20),
      width: horizontalScale(340),
      maxHeight: verticalScale(690),
      shadowColor: CustomColors.textBlack,
      shadowOffset: {
        width: 0,
        height: verticalScale(2),
      },
      shadowOpacity: 0.2,
      shadowRadius: moderateScale(4),
      elevation: 5,
      borderWidth: 1,
      borderColor: CustomColors.lightGray,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: verticalScale(15),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.mediumGray,
      paddingBottom: verticalScale(10),
    },
    modalTitle: {
      fontSize: moderateScale(22),
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      fontWeight: "normal",
      color: CustomColors.appThemeColor,
    },
    closeButton: {
      padding: moderateScale(5),
    },
    modalBody: {
      maxHeight: verticalScale(650),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(8),
      paddingVertical: verticalScale(3),
    },
    detailLabel: {
      fontSize: moderateScale(14),
      fontWeight: "bold",
      color: CustomColors.textBlack,
      marginRight: horizontalScale(8),
      fontFamily: Platform.OS === "ios" ? "Lato-Regular" : "sans-serif",
    },
    detailValue: {
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
      flexShrink: 1,
      fontFamily: Platform.OS === "ios" ? "Lato-Regular" : "sans-serif",
    },
    statusBadge: {
      fontWeight: "bold",
      paddingHorizontal: horizontalScale(7),
      paddingVertical: verticalScale(3),
      borderRadius: moderateScale(4),
      overflow: "hidden",
      textTransform: "uppercase",
      fontSize: moderateScale(12),
    },
    inputContainer: {
      marginBottom: verticalScale(12),
    },
    label: {
      fontSize: moderateScale(14),
      color: CustomColors.textBlack,
      marginBottom: verticalScale(6),
      fontWeight: "bold",
      fontFamily: Platform.OS === "ios" ? "Lato-Bold" : "sans-serif-medium",
    },
    mandatory: {
      color: CustomColors.error,
      fontWeight: "bold",
    },
    input: {
      borderWidth: 1,
      borderColor: CustomColors.mediumGray,
      borderRadius: moderateScale(4),
      padding: moderateScale(10),
      fontSize: moderateScale(15),
      color: CustomColors.textBlack,
      backgroundColor: CustomColors.backgroundWhite,
      fontFamily: Platform.OS === "ios" ? "Lato-Regular" : "sans-serif",
    },
    pickerInput: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: CustomColors.mediumGray,
      borderRadius: moderateScale(4),
      padding: moderateScale(10),
      backgroundColor: CustomColors.backgroundWhite,
    },
    pickerInputText: {
      fontSize: moderateScale(15),
      color: CustomColors.textBlack,
      flex: 1,
      fontFamily: Platform.OS === "ios" ? "Lato-Regular" : "sans-serif",
    },
    pickerIcon: {
      color: CustomColors.darkGray,
      marginLeft: horizontalScale(8),
    },
    errorBorder: {
      borderColor: CustomColors.error,
      borderWidth: 1.5,
    },
    modalActions: {
      flexDirection: "row",
      flexWrap: "wrap", // Allow buttons to wrap to the next line
      justifyContent: "space-around",
      marginTop: verticalScale(20),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CustomColors.mediumGray,
      paddingTop: verticalScale(15),
    },
    actionButton: {
      // New style for common action button properties
      flexDirection: "row",
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(18),
      borderRadius: moderateScale(5),
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: horizontalScale(5), // Add some spacing between buttons
      marginBottom: verticalScale(10), // Add spacing for wrapped buttons
      shadowOffset: { width: 0, height: verticalScale(1) },
      shadowOpacity: 0.15,
      shadowRadius: moderateScale(2),
      elevation: 2,
    },
    saveButton: {
      backgroundColor: CustomColors.appThemeColor,
      shadowColor: CustomColors.appThemeColor,
    },
    cancelButton: {
      backgroundColor: CustomColors.darkGray,
      shadowColor: CustomColors.darkGray,
    },
    inprogressButton: {
      backgroundColor: CustomColors.statusBlue, // Use CustomColors.statusBlue for "In Progress"
      shadowColor: CustomColors.statusBlue,
    },
    rejectButton: {
      backgroundColor: CustomColors.statusRed, // Use CustomColors.statusRed for "Reject"
      shadowColor: CustomColors.statusRed,
    },
    viewButton: {
      backgroundColor: CustomColors.statusGreen, // You can define a color for "View" or use an existing one
      shadowColor: CustomColors.statusGreen,
    },
    bookButton: {
      backgroundColor: CustomColors.statusGreen,
      shadowColor: CustomColors.statusGreen,
    },
    buttonText: {
      color: CustomColors.textWhite,
      marginLeft: horizontalScale(6),
      fontWeight: "600",
      fontSize: moderateScale(12),
      fontFamily: Platform.OS === "ios" ? "Lato-Bold" : "sans-serif-medium",
      textTransform: "uppercase",
    },
  });
  const BOOKING_STATUS_MAP = {
    0: { text: "Not Booked", color: CustomColors.statusOrange },
    "-1": { text: "In Progress", color: CustomColors.statusBlue },
    1: { text: "Submitted", color: CustomColors.textBlue },
    2: { text: "Cancel Requested", color: CustomColors.statusYellow },
    3: { text: "Booked", color: CustomColors.statusGreen },
    4: { text: "Canceled", color: CustomColors.statusRed },
    5: { text: "Rejected", color: CustomColors.statusRed },
  };
  const handleInputChange = (field, value) => {
    setFieldValue(
      `details[${index.detailIndex}].requirement[${index.requirementIndex}].${field}`,
      value
    );

    if (
      requirement.booking_needed === 1 &&
      (field === "checkin_time" || field === "checkout_time")
    ) {
      const checkinStr = field === "checkin_time" ? value : requirement.checkin_time;
      const checkoutStr = field === "checkout_time" ? value : requirement.checkout_time;

      if (checkinStr && checkoutStr) {
        const checkinDate = parseCustomDate(checkinStr);
        const checkoutDate = parseCustomDate(checkoutStr);

        const diffMs = checkoutDate - checkinDate;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const nights = diffDays > 0 ? diffDays : 0;

        setFieldValue(
          `details[${index.detailIndex}].requirement[${index.requirementIndex}].no_of_nights`,
          nights
        );
      }
    }
  };

  if (!requirement) {
    return null;
  }


  // Helper to format date into a consistent string for storage/display
  const formatDateToCustomString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Helper to parse the custom date string back into a Date object
  const parseCustomDate = (dateStr) => {
    if (!dateStr) return new Date();

    // Case 1: Format like 2025-Jul-14 18:35:33
    const matchAbbr = dateStr.match(/^(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (matchAbbr) {
      const [_, year, monStr, day, hour, min, sec] = matchAbbr;
      const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      const month = monthMap[monStr];
      if (month === undefined) return new Date();
      return new Date(Number(year), month, Number(day), Number(hour), Number(min), Number(sec));
    }

    // Case 2: Format like 2025-07-15 11:33:06
    const matchNumeric = dateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (matchNumeric) {
      const [_, year, month, day, hour, min, sec] = matchNumeric;
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min), Number(sec));
    }

    return new Date(); // Fallback if format not matched
  };

  const renderBookingStatus = (status, bookedBy) => {
    const statusText = BOOKING_STATUS_MAP[status]?.text || "New";
    const statusColor =
      BOOKING_STATUS_MAP[status]?.color || CustomColors.mediumGray;

    let bookedWith = "";

    if (String(status) === "-1" && bookedBy) {
      const { full_name, code, designation } = bookedBy;
      if (full_name || code || designation) {
        bookedWith = ` (with ${full_name || "Unknown"}${designation ? ` - ${designation}` : ""
          })`;
      }
    }

    return (
      <View style={styles.detailRow}>
        <Text allowFontScaling={false} style={styles.detailLabel}>Booking Status:</Text>
        <Text allowFontScaling={false}
          style={[
            styles.detailValue,
            { color: statusColor },
            styles.statusBadge,
          ]}
        >
          {statusText}
          {bookedWith}
        </Text>
      </View>
    );
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    if (currentDateField) {
      handleInputChange(
        currentDateField,
        formatDateToCustomString(selectedDate)
      );
    }
  };

  const showDatepicker = (field) => {
    setCurrentDateField(field);
    const currentVal = parseCustomDate(requirement[field]);

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: currentVal,
        mode: "date",
        is24Hour: true,
        display: "default",
        minimumDate: field === "checkout_time" ? parseCustomDate(requirement["checkin_time"]) : minDate,
        maximumDate: maxDate,
        onChange: (event, selectedDate) => {
          if (event.type === "dismissed" || !selectedDate) return;

          DateTimePickerAndroid.open({
            value: selectedDate,
            mode: "time",
            is24Hour: true,
            display: "default",
            onChange: (event2, selectedTime) => {
              if (event2.type === "dismissed" || !selectedTime) return;

              const combined = new Date(selectedDate);
              combined.setHours(selectedTime.getHours());
              combined.setMinutes(selectedTime.getMinutes());
              combined.setSeconds(0);

              handleInputChange(field, formatDateToCustomString(combined));
            },
          });
        },
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const handleSave = () => {
    const { detailIndex, requirementIndex } = index;
    const clonedRequirement = { ...requirement };
    if (!validateFields()) {
      ToastMessage("Please fill all mandatory fields marked with *.");
      return;
    }

    onSave(clonedRequirement, detailIndex, requirementIndex);
    onClose();
  };

  const validateFields = () => {
    const requiredFields = [];

    if (requirement.booking_needed === 1) {
      requiredFields.push(
        "place_of_stay",
        "room_type",
        "checkin_time",
        "checkout_time"
      );
    } else if (requirement.booking_needed === 2) {
      requiredFields.push(
        "cab_segment",
        "travel_type_cab_value",
        "from_time",
        "from_place",
        "to_place"
      );
    } else if ([3, 4, 5].includes(requirement.booking_needed)) {
      requiredFields.push("from_place", "to_place", "from_time");
    }

    requiredFields.push("comments");

    const missingFields = requiredFields.filter((field) => {
      if (
        typeof requirement[field] === "object" &&
        requirement[field] !== null
      ) {
        return !requirement[field].name;
      }
      return !requirement[field];
    });

    if (missingFields.length > 0) {
      setShowErrors(true);
      return false;
    }
    return true;
  };

  const renderDetailRow = (label, value, isStatus = false) => (
    <View style={styles.detailRow}>
      <Text allowFontScaling={false} style={styles.detailLabel}>{label}:</Text>
      {isStatus ? (
        <Text allowFontScaling={false}
          style={[
            styles.detailValue,
            {
              color:
                BOOKING_STATUS_MAP[value]?.color || CustomColors.mediumGray,
            },
            styles.statusBadge,
          ]}
        >
          {BOOKING_STATUS_MAP[value]?.text || "New"}
        </Text>
      ) : (
        <Text allowFontScaling={false} style={styles.detailValue}>{value || "N/A"}</Text>
      )}
    </View>
  );

  const renderEditableInput = (
    label,
    field,
    placeholder,
    type = "text",
    pickerKey = null,
    required = false
  ) => {
    const isEmpty =
      typeof requirement[field] === "object" && requirement[field] !== null
        ? !requirement[field].name
        : !requirement[field];
    const showError = required && showErrors && isEmpty;
    const errorStyle = showError ? styles.errorBorder : {};

    return (
      <View style={styles.inputContainer}>
        <Text allowFontScaling={false} style={styles.label}>
          {label}
          {required && <Text allowFontScaling={false} style={styles.mandatory}> *</Text>}
        </Text>
        {type === "text" && (
          <TextInput allowFontScaling={false}
            style={[styles.input, errorStyle]}
            placeholder={placeholder}
            value={requirement[field] || ""}
            onChangeText={(text) => handleInputChange(field, text)}
            editable={isEditable}
            placeholderTextColor={CustomColors.lightGray}
          />
        )}
        {type === "number" && (
          <TextInput allowFontScaling={false}
            style={[styles.input, errorStyle]}
            placeholder={placeholder}
            value={String(requirement[field] || "")}
            onChangeText={(text) => handleInputChange(field, Number(text))}
            keyboardType="numeric"
            editable={isEditable}
            placeholderTextColor={CustomColors.lightGray}
          />
        )}
        {type === "picker" && (
          <TouchableOpacity
            onPress={() => {
              if (openCommonDropDownPicker && pickerKey) {
                openCommonDropDownPicker(
                  "requirement",
                  index.detailIndex,
                  label,
                  pickerKey,
                  index.requirementIndex,
                  field
                );
              }
            }}
            disabled={!isEditable}
            style={[styles.pickerInput, errorStyle]}
          >
            <Text allowFontScaling={false}
              style={[
                styles.pickerInputText,
                isEmpty && { color: CustomColors.lightGray },
              ]}
            >
              {(typeof requirement[field] === "object"
                ? requirement[field]?.name
                : requirement[field]) || placeholder}
            </Text>
            <Ionicons
              name="chevron-down"
              size={moderateScale(19)}
              style={styles.pickerIcon}
            />
          </TouchableOpacity>
        )}
        {type === "datetime" && (
          <TouchableOpacity
            onPress={() => isEditable && showDatepicker(field)}
            disabled={!isEditable}
            style={[styles.pickerInput, errorStyle]}
          >
            <Text allowFontScaling={false}
              style={[
                styles.pickerInputText,
                isEmpty && { color: CustomColors.lightGray },
              ]}
            >
              {requirement[field]
                ? formatDateWithTime(requirement[field])
                : placeholder}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={moderateScale(19)}
              color={CustomColors.mediumGray}
              style={styles.pickerIcon}
            />
          </TouchableOpacity>
        )}
        {type === "date-only" && (
          <TouchableOpacity
            onPress={() => isEditable && showDatepicker(field)}
            disabled={!isEditable}
            style={[styles.pickerInput, errorStyle]}
          >
            <Text allowFontScaling={false}
              style={[
                styles.pickerInputText,
                isEmpty && { color: CustomColors.lightGray },
              ]}
            >
              {requirement[field]
                ? formatDate(requirement[field])
                : placeholder}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={moderateScale(19)}
              color={CustomColors.mediumGray}
              style={styles.pickerIcon}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const formatDate = (dateStringOrTimestamp) => {
    if (!dateStringOrTimestamp) return "N/A";
    const date = parseCustomDate(dateStringOrTimestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateWithTime = (dateTimeStr) => {
    if (!dateTimeStr) return "N/A";

    const date = parseCustomDate(dateTimeStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderAdminButtons = () => {
    const status = String(requirement.booking_status);
    const { detailIndex, requirementIndex } = index;
    console.log("status == 3 && !isAdmin", status == "3" && !isAdmin)

    const handleAction = async (actionType) => {
      if (actionType === "inprogress" || actionType === "not_booked") {
        const response = await triggerAdminReserv({
          data: {
            requirement_type: requirement.booking_needed,
            reserv_status: actionType === "inprogress" ? 1 : 0,
            requirement_id: requirement.id,
          },
        });
        //console.log(response);
        if (
          response?.data?.status === "success" ||
          response?.data?.message === "Success"
        ) {
          setFieldValue(
            `details[${index.detailIndex}].requirement[${index.requirementIndex}].booking_status`,
            actionType === "inprogress" ? -1 : 0
          );
          setFieldValue(
            `details[${index.detailIndex}].requirement[${index.requirementIndex}].booked_by.id`,
            authRedux?.user?.employee_id
          );
          ToastMessage(response.data.message || "Set to Inprogress");
        } else {
          ToastMessage(
            response?.data?.description ||
            response?.data?.message ||
            "Error on setting Inprogress"
          );
        }
      }
      else if (actionType === 'book' || actionType === 'view') {
        navigation.navigate('BookingScreen', {
          requirementType: requirement.booking_needed,
          requirementData: requirement,
          minDate: minDate.toISOString(), maxDate: maxDate.toISOString(),
          key: actionType === 'view' ? 'VIEW' : 'BOOK',
          setFieldValue: setFieldValue,
          index: index,
        });
      }
      else if (actionType === "reject") {
        const response = await triggerReqReject({
          data: {
            requirement_id: requirement.id,
            requirement_type: requirement.booking_needed
          },
        });

        if (
          response?.data?.status === "success" ||
          response?.data?.message === "Success"
        ) {
          setFieldValue(
            `details[${index.detailIndex}].requirement[${index.requirementIndex}].booking_status`,
            5 // Rejected
          );
          ToastMessage(response.data.message || "Rejected successfully");
        } else {
          ToastMessage(
            response?.data?.description ||
            response?.data?.message ||
            "Error rejecting the requirement"
          );
        }
      }

    };

    let buttons = [];

    if (status == "3" && !isAdmin) {
      buttons.push(
        <TouchableOpacity
          key="view"
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleAction("view")}
        >
          <Ionicons name="eye-outline" size={moderateScale(20)} color={CustomColors.iconWhite} />
          <Text allowFontScaling={false} style={styles.buttonText}>View</Text>
        </TouchableOpacity>
      );
      return <>{buttons}</>;
    }

    if (!isAdmin) {
      return null;
    }


    switch (status) {
      case "0": // Not Booked
        buttons.push(
          <TouchableOpacity
            key="book"
            style={[styles.actionButton, styles.bookButton]}
            onPress={() => handleAction("book")}
          >
            <Ionicons
              name="ticket-outline"
              size={moderateScale(20)}
              color={CustomColors.iconWhite}
            />
            <Text allowFontScaling={false} style={styles.buttonText}>Book</Text>
          </TouchableOpacity>,
          <TouchableOpacity
            key="inprogress"
            style={[styles.actionButton, styles.inprogressButton]}
            onPress={() => handleAction("inprogress")}
          >
            <Ionicons
              name="hourglass-outline"
              size={moderateScale(20)}
              color={CustomColors.iconWhite}
            />
            <Text allowFontScaling={false} style={styles.buttonText}>In Progress</Text>
          </TouchableOpacity>,
          <TouchableOpacity
            key="reject"
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleAction("reject")}
          >
            <Ionicons
              name="ban-outline"
              size={moderateScale(20)}
              color={CustomColors.iconWhite}
            />
            <Text allowFontScaling={false} style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        );
        break;
      case "-1": // In Progress
        if (requirement.booked_by?.id === authRedux?.user?.employee_id) {
          // Only show for "In Progress with whom"
          buttons.push(
            <TouchableOpacity
              key="book"
              style={[styles.actionButton, styles.bookButton]}
              onPress={() => handleAction("book")}
            >
              <Ionicons
                name="ticket-outline"
                size={moderateScale(20)}
                color={CustomColors.iconWhite}
              />
              <Text allowFontScaling={false} style={styles.buttonText}>Book</Text>
            </TouchableOpacity>,
            <TouchableOpacity
              key="not_booked"
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleAction("not_booked")}
            >
              <Ionicons
                name="remove-circle-outline"
                size={moderateScale(20)}
                color={CustomColors.iconWhite}
              />
              <Text allowFontScaling={false} style={styles.buttonText}>Not Booked</Text>
            </TouchableOpacity>,
            <TouchableOpacity
              key="reject"
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleAction("reject")}
            >
              <Ionicons
                name="ban-outline"
                size={moderateScale(20)}
                color={CustomColors.iconWhite}
              />
              <Text allowFontScaling={false} style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          );
        }
        break;
      case "3": // Booked
        buttons.push(
          <TouchableOpacity
            key="cancel_booking"
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleAction("cancel_booking")}
          >
            <Ionicons name="close-circle-outline" size={moderateScale(20)} color={CustomColors.iconWhite} />
            <Text allowFontScaling={false} style={styles.buttonText}>Cancel Booking</Text>
          </TouchableOpacity>,
          <TouchableOpacity
            key="view"
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleAction("view")}
          >
            <Ionicons name="eye-outline" size={moderateScale(20)} color={CustomColors.iconWhite} />
            <Text allowFontScaling={false} style={styles.buttonText}>View</Text>
          </TouchableOpacity>
        );
        break;
      case "2": // Cancel Requested
        buttons.push(
          <TouchableOpacity
            key="cancel_booking"
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleAction("cancel_booking")}
          >
            <Ionicons
              name="close-circle-outline"
              size={moderateScale(20)}
              color={CustomColors.iconWhite}
            />
            <Text allowFontScaling={false} style={styles.buttonText}>Cancel Booking</Text>
          </TouchableOpacity>,
          <TouchableOpacity
            key="view"
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleAction("view")}
          >
            <Ionicons
              name="eye-outline"
              size={moderateScale(20)}
              color={CustomColors.iconWhite}
            />
            <Text allowFontScaling={false} style={styles.buttonText}>View</Text>
          </TouchableOpacity>,
          <TouchableOpacity
            key="reject"
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleAction("reject")}
          >
            <Ionicons
              name="ban-outline"
              size={moderateScale(20)}
              color={CustomColors.iconWhite}
            />
            <Text allowFontScaling={false} style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        );
        break;
      case "4": // Canceled
      case "5": // Rejected
        // No buttons for these statuses
        break;
      default:
        break;
    }
    return <>{buttons}</>;
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text allowFontScaling={false} style={styles.modalTitle}>
              {REQUIREMENT_TYPES[requirement.booking_needed] || "Requirement"}{" "}
              Details
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close-circle-outline" // Changed to outline for a softer look
                size={moderateScale(28)}
                color={CustomColors.darkGray} // Softer close button color
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.modalBody}
          >
            {renderDetailRow("Requirement Code", requirement.requirement_code)}
            {/* Render editable fields based on booking_needed */}
            {requirement.booking_needed === 1 && ( // Accommodation
              <>
                {renderEditableInput(
                  "Place of Stay",
                  "place_of_stay",
                  "e.g., Hotel Name",
                  "text",
                  null,
                  true
                )}
                {renderEditableInput(
                  "Room Type",
                  "room_type",
                  "Select Room Type",
                  "picker",
                  "accommondation_type",
                  true
                )}
                {renderEditableInput(
                  "Check-in Date & Time",
                  "checkin_time",
                  "Select Check-in Date",
                  "datetime",
                  null,
                  true
                )}
                {renderEditableInput(
                  "Checkout Date & Time",
                  "checkout_time",
                  "Select Checkout Date",
                  "datetime",
                  null,
                  true
                )}
                {renderDetailRow("No. of Nights", requirement.no_of_nights?.toString())}
              </>
            )}

            {requirement.booking_needed === 2 && ( // Cab
              <>
                {renderEditableInput(
                  "Cab Segment",
                  "cab_segment",
                  "Select Cab Segment",
                  "picker",
                  "cab_dropdown",
                  true
                )}
                {renderEditableInput(
                  "Cab Type",
                  "travel_type_cab_value",
                  "Select Cab Type",
                  "picker",
                  "cab_type",
                  true
                )}
                {renderEditableInput(
                  "From Date & Time",
                  "from_time",
                  "Select Date & Time",
                  "datetime",
                  null,
                  true
                )}
                {renderEditableInput(
                  "From Place",
                  "from_place",
                  "e.g., Airport, Home",
                  "text",
                  null,
                  true
                )}
                {renderEditableInput(
                  "To Place",
                  "to_place",
                  "e.g., Hotel, Destination",
                  "text",
                  null,
                  true
                )}
                {renderEditableInput(
                  "Instructions",
                  "instructions",
                  "Any specific instructions",
                  "text"
                )}
              </>
            )}

            {(requirement.booking_needed === 3 ||
              requirement.booking_needed === 4 ||
              requirement.booking_needed === 5) && (
                // Bus, Train, Air
                <>
                  {renderEditableInput(
                    "From Place",
                    "from_place",
                    "e.g., Origin City",
                    "text",
                    null,
                    true
                  )}
                  {renderEditableInput(
                    "To Place",
                    "to_place",
                    "e.g., Destination City",
                    "text",
                    null,
                    true
                  )}
                  {renderEditableInput(
                    "Departure Time",
                    "from_time",
                    "Select Departure Date & Time",
                    "datetime",
                    null,
                    true
                  )}
                  {requirement.to_time &&
                    renderEditableInput(
                      "Arrival Time",
                      "to_time",
                      "Select Arrival Date & Time",
                      "datetime",
                      null,
                      true
                    )}
                </>
              )}
            {renderEditableInput(
              "Comments",
              "comments",
              "Add comments here",
              "text"
            )}

            {/* {renderDetailRow(
              "Booking Needed (Type)",
              REQUIREMENT_TYPES[requirement.booking_needed] || "Unknown"
            )} */}
            {renderBookingStatus(
              requirement.booking_status,
              requirement.booked_by
            )}
          </ScrollView>

          {( // Show action buttons if editable or admin
            <View style={styles.modalActions}>
              {isEditable && (
                <>
                  <TouchableOpacity
                    style={[styles.saveButton, styles.actionButton]}
                    onPress={handleSave}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={moderateScale(20)}
                      color={CustomColors.iconWhite}
                    />
                    <Text allowFontScaling={false} style={styles.buttonText}>Save Changes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelButton, styles.actionButton]}
                    onPress={onClose}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={moderateScale(20)}
                      color={CustomColors.iconWhite}
                    />
                    <Text allowFontScaling={false} style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
              {renderAdminButtons()}
            </View>
          )}

          {Platform.OS === "ios" && showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={
                currentDateField && requirement[currentDateField]
                  ? parseCustomDate(requirement[currentDateField])
                  : new Date()
              }
              mode="datetime"
              is24Hour={true}
              display="default"
              minimumDate={minDate}
              maximumDate={maxDate}
              onChange={handleDateChange}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};



export default RequirementDetailModal;
