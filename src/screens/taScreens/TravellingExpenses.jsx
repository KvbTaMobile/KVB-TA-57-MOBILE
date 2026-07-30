import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  Alert, // Import Alert for notifications
} from 'react-native';
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import DateTimePicker from "@react-native-community/datetimepicker"; // Import DateTimePicker
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker"; // Import for Android specific methods
import { useDispatch, useSelector } from "react-redux";
import {
  FontAwesome5,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  useLazyGetTravelExpenseQuery,
  useTravelSubmitMutation,
  useLazyCommonDropDownGetQuery,
} from '../../redux/rtk_query/apiSlice';
import { useNavigation } from '@react-navigation/native';

import { getCustomColors } from '../../styles/CustomColors';
import { horizontalScale, verticalScale, moderateScale } from '../../styles/Metrics';
import * as styless from "../../styles/StyleSheet";
import { Fonts } from '../../styles/Fonts';
import { setTravelExpenseDetails, clearTravelExpenseDetails } from '../../redux/slices/travelExpenseDetailsSlice';
import ToastMessage from '../../TaComponents/toast/ToastMessage';
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString.replace(/-/g, '/')); // Attempt to parse various formats
    if (isNaN(date.getTime())) {
      // Fallback for formats not directly parsed by new Date() with replace
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      // Try parsing 'YYYY-Mon-DD HH:MM'
      const match = dateString.match(/^(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2})$/);
      if (match) {
        const [, year, monthAbbr, day, hours, minutes] = match;
        const monthNum = monthMap[monthAbbr];
        if (monthNum !== undefined) {
          const parsedDate = new Date(year, monthNum, day, hours, minutes);
          if (!isNaN(parsedDate.getTime())) {
            return `${String(parsedDate.getDate()).padStart(2, '0')}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${parsedDate.getFullYear()} ${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;
          }
        }
      }
      return dateString; // Return as is if cannot parse
    }
    // If successfully parsed by new Date(), format it to DD-MM-YYYY HH:MM
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (error) {
    console.warn("Error formatting date:", dateString, error);
    return dateString;
  }
};
const formatTime = (date) => {
  if (!date || !(date instanceof Date)) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Helper function to parse a date string into a Date object, handling multiple formats
const parseCustomDate = (dateString) => {
  if (!dateString || dateString === 'N/A') return new Date(); // Default to now if invalid

  // Format: DD-MM-YYYY HH:MM
  let match = dateString.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
  if (match) {
    const [, day, month, year, hours, minutes] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  }

  // Format: YYYY-MM-DD HH:MM:SS (or HH:MM)
  match = dateString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    const [, year, month, day, hours, minutes] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  }

  // Format: YYYY-MMM-DD HH:MM
  const monthMap = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  match = dateString.match(/^(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2})$/);
  if (match) {
    const [, year, monthAbbr, day, hours, minutes] = match;
    const monthNum = monthMap[monthAbbr];
    if (monthNum !== undefined) {
      return new Date(Number(year), monthNum, Number(day), Number(hours), Number(minutes));
    }
  }

  // Fallback: try native parsing
  try {
    const fallback = new Date(dateString.replace(/-/g, '/')); // Some platforms are picky
    if (!isNaN(fallback.getTime())) return fallback;
  } catch { }

  console.error("Could not parse date string:", dateString);
  return new Date(); // Default fallback
};


// Helper function to format a Date object into "DD-MM-YYYY HH:MM"
const formatDateToCustomString = (date) => {
  if (!date) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = '00'; // hardcoded if seconds not needed
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};


// Helper to parse date strings for min/max dates, ensuring correct time components
const parseDateForMinMaxRange = (dateString, isEndDate = false) => {
  if (!dateString) return null;
  try {
    // Attempt to parse with new Date() first, which often handles "DD-Mon-YYYY"
    let date = new Date(dateString.replace(/-/g, '/'));

    if (isNaN(date.getTime())) {
      // Fallback for "DD-Mon-YYYY" if new Date() fails
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const parts = dateString.match(/^(\d{2})-(\w{3})-(\d{4})$/);
      if (parts) {
        const [, day, monthAbbr, year] = parts;
        const monthNum = monthMap[monthAbbr];
        if (monthNum !== undefined) {
          date = new Date(Number(year), monthNum, Number(day));
        } else {
          console.warn("Could not map month abbreviation:", monthAbbr);
          return null; // Cannot parse
        }
      } else {
        console.warn("Date string does not match expected DD-Mon-YYYY format:", dateString);
        return null; // Cannot parse
      }
    }

    if (isNaN(date.getTime())) {
      return null; // Ensure date is valid after all parsing attempts
    }

    // Set time to start or end of day for proper min/max range
    if (isEndDate) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  } catch (error) {
    console.warn("Error parsing date for min/max range:", dateString, error);
    return null;
  }
};


const EditableRow = ({ label, value, onChangeText, isEditing, keyboardType = 'default', multiline = false, placeholder = '', isDisabled = false, isDatePicker = false, onPressDatePicker = null, isRequired = false, styles, CustomColors }) => (
  <View style={styles.detailItemContainer}>
    <View style={styles.labelContainer}>
      <Text allowFontScaling={false} style={styles.detailLabel}>{label}:</Text>
      {isRequired && <Text allowFontScaling={false} style={{ color: CustomColors.dangerRed }}>*</Text>}
    </View>
    {isEditing ? (
      isDatePicker ? ( // If it's a date picker field
        <TouchableOpacity
          onPress={onPressDatePicker}
          disabled={isDisabled}
          style={[styles.editableTextInput, isDisabled && styles.disabledInput]} // Apply same visual styles
        >
          <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !value && styles.placeholderText, isDisabled && styles.disabledText]}>
            {value && value !== 'N/A' ? value : placeholder}
          </Text>
        </TouchableOpacity>
      ) : ( // Regular text input
        <TextInput allowFontScaling={false}
          style={[styles.editableTextInput, multiline && styles.multilineInput, isDisabled && styles.disabledInput]}
          value={value ? String(value) : ''}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholder={placeholder}
          placeholderTextColor={CustomColors.textLightGray}
          editable={!isDisabled} // Set editable based on isDisabled
        />
      )
    ) : ( // Not editing, display as plain text
      <Text allowFontScaling={false} style={[styles.detailValueText, isDisabled && styles.disabledText]}>
        {value || 'N/A'}
      </Text>
    )}
  </View>
);


const TravelDetailsScreen = ({ route }) => {
  const expense = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || {}
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark)
  const globalStyles = styless.styles(isDark)
  const navigation = useNavigation();
  const tourId = expense?.tourid || claimdata?.id;
  const employeeCode = expense?.employee_code || claimdata?.employee_code;
  const employeeName = expense?.employee_name || claimdata?.employee_name;
  const travelNo = expense?.crn_no || claimdata?.id;  // fallback to claimdata.id if crn_no not available
  const claimStatus = claimdata?.claim_status_id;



  const expenseid = expense.expenseid ?? null;
  const requestercomment = expense.requestercomment ?? null;
  const [getTravelExpense, { data, error, isLoading, isFetching }] = useLazyGetTravelExpenseQuery();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const submitButtonOpacity = useRef(new Animated.Value(1)).current;
  const [activePickerId, setActivePickerId] = useState(null);

  const [triggerTravelType] = useLazyCommonDropDownGetQuery();
  const [triggerActualMode] = useLazyCommonDropDownGetQuery();
  const [triggerYn] = useLazyCommonDropDownGetQuery();

  const [triggerTravelTrain, { data: travelTrainData, isLoading: isLoadingTravelTrain }] = useLazyCommonDropDownGetQuery();
  const [triggerTravelAir, { data: travelAirData, isLoading: isLoadingTravelAir }] = useLazyCommonDropDownGetQuery();
  const [travelTypeOptions, setTravelTypeOptions] = useState([]);
  const [actualModeOptions, setActualModeOptions] = useState([]);
  const [ynOptions, setYnOptions] = useState([]);
  const [claimStatusId, setClaimStatusId] = useState(null);

  // Date Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);
  const [currentItemIdForDate, setCurrentItemIdForDate] = useState(null);

  const [localAddedItems, setLocalAddedItems] = useState([]);
  const [editedItemData, setEditedItemData] = useState({});
  const [expandedItems, setExpandedItems] = useState({});

  const dispatch = useDispatch();
  const travelExpenseDetails = useSelector(state => state.travelExpenseDetails.details);

  const minDate = useMemo(() => {
    if (claimdata?.startdate) {
      const parsedStartDate = parseDateForMinMaxRange(claimdata.startdate, false);
      // Fallback to a very old date if parsing fails or claimdata.startdate is invalid
      return parsedStartDate || new Date(2000, 0, 1, 0, 0, 0);
    }
    // Default min date if claimdata.startdate is not available
    return new Date(2000, 0, 1, 0, 0, 0);
  }, [claimdata?.startdate]);

  const maxDate = useMemo(() => {
    if (claimdata?.enddate) {
      const parsedEndDate = parseDateForMinMaxRange(claimdata.enddate, true);
      // Fallback to a very future date if parsing fails or claimdata.enddate is invalid
      return parsedEndDate || new Date(2050, 11, 31, 23, 59, 59);
    }
    // Default max date if claimdata.enddate is not available
    return new Date(2050, 11, 31, 23, 59, 59);
  }, [claimdata?.enddate]);


  useEffect(() => {
    const fetchInitialDropdowns = async () => {

      try {
        const [travelTypeRes, actualModeRes, ynRes] = await Promise.all([
          triggerTravelType('traveltype').unwrap(),
          triggerActualMode('actualmode').unwrap(),
          triggerYn('yn').unwrap(),
        ]);
        setTravelTypeOptions(travelTypeRes || []);
        setActualModeOptions(actualModeRes || []);
        setYnOptions(ynRes || []);

      } catch (err) {
      }
    };
    fetchInitialDropdowns();
  }, [triggerTravelType, triggerActualMode, triggerYn]);
  const [travelTypeSearchTerm, setTravelTypeSearchTerm] = useState('');
  const [travelTypePage, setTravelTypePage] = useState(1);
  const [triggerSearchedTravelType, { data: searchedTravelTypeData, isLoading: isTravelTypeSearching, isFetching: isTravelTypeFetchingMore }] =
    useLazyCommonDropDownGetQuery();
  const travelTypeDisplayOptions = useMemo(() => {
    if (travelTypeSearchTerm) {
      return searchedTravelTypeData?.data || [];
    }
    return travelTypeOptions;
  }, [travelTypeOptions, searchedTravelTypeData, travelTypeSearchTerm]);
  const debounceTimeoutRef = useRef(null);
  const handleTravelTypeSearch = useCallback((text) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setTravelTypeSearchTerm(text);
      setTravelTypePage(1);
      if (text) {
        triggerSearchedTravelType({ type: 'traveltype', search: text, page: 1 });
      } else {
      }
    }, 500);
  }, [triggerSearchedTravelType]);
  const handleTravelTypeLoadMore = useCallback(() => {
    if (!isTravelTypeFetchingMore && hasMoreTravelTypeData) {
      setTravelTypePage(prev => {
        const nextPage = prev + 1;
        triggerSearchedTravelType({ type: 'traveltype', search: travelTypeSearchTerm, page: nextPage });
        return nextPage;
      });
    }
  }, [isTravelTypeFetchingMore, hasMoreTravelTypeData, travelTypeSearchTerm, triggerSearchedTravelType]);

  const hasMoreTravelTypeData = useMemo(() => {
    const currentData = travelTypeSearchTerm ? (searchedTravelTypeData?.data || []) : travelTypeOptions;
    return currentData.length > 0 && (currentData.length % 20 === 0);
  }, [travelTypeDisplayOptions, travelTypeSearchTerm, searchedTravelTypeData, travelTypeOptions]);

  const styles = StyleSheet.create({
    fullScreenContainer: {
      flex: 1,
      backgroundColor: CustomColors.appScreenColor,
    },
    scrollViewContent: {
      padding: moderateScale(16),
      paddingBottom: verticalScale(100),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.appScreenColor,
    },
    loadingText: {
      marginTop: verticalScale(10),
      fontSize: moderateScale(16),
      color: CustomColors.textGray,
      fontFamily: Fonts.regular,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: moderateScale(20),
      backgroundColor: CustomColors.backgroundRed,
      borderRadius: moderateScale(8),
      margin: moderateScale(20),
      borderColor: CustomColors.statusRed,
      borderWidth: 1,
    },
    errorText: {
      fontSize: moderateScale(18),
      fontWeight: 'bold',
      color: CustomColors.dangerRed,
      textAlign: 'center',
      marginBottom: verticalScale(8),
      fontFamily: Fonts.bold,
    },
    errorDetailText: {
      fontSize: moderateScale(14),
      color: CustomColors.dangerRed,
      textAlign: 'center',
      marginBottom: verticalScale(12),
      fontFamily: Fonts.regular,
    },
    errorTipText: {
      fontSize: moderateScale(12),
      color: CustomColors.dangerRed,
      textAlign: 'center',
      fontStyle: 'italic',
      fontFamily: Fonts.Italic,
    },
    sectionCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(15),
      padding: moderateScale(25),
      marginBottom: verticalScale(25),
      shadowColor: CustomColors.iconBlack,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateScale(8),
      elevation: 5,
      borderLeftWidth: moderateScale(8),
      borderLeftColor: CustomColors.appThemeColor,
      margin: horizontalScale(10)
    },
    sectionTitle: {
      fontSize: moderateScale(22),
      fontWeight: '700',
      marginBottom: verticalScale(15),
      color: CustomColors.appThemeColor,
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.lightGray,
      paddingBottom: verticalScale(10),
      fontFamily: Fonts.bold,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: verticalScale(12),
      justifyContent: 'space-between',
      flexWrap: 'wrap',

    },
    plusicon: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: verticalScale(12),
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      left: verticalScale(-25)

    },
    boldText: {
      fontWeight: '600',
      color: CustomColors.textDark,
      fontSize: moderateScale(15),
      marginRight: horizontalScale(10),
      minWidth: horizontalScale(120),
      fontFamily: Fonts.semiBold,
    },
    mainHeading: {
      fontSize: moderateScale(20),
      fontWeight: 'bold',
      color: CustomColors.appThemeColor,
      marginVertical: verticalScale(15),
      marginHorizontal: verticalScale(20),
      fontFamily: Fonts.bold,
      // flex: 1,
    },
    expenseItemCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(15),
      shadowColor: CustomColors.iconBlack,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.05,
      shadowRadius: moderateScale(6),
      elevation: 3,
      overflow: 'hidden',
      borderColor: CustomColors.lightGray,
      borderWidth: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(18),
      paddingHorizontal: horizontalScale(20),
      backgroundColor: CustomColors.backgroundGray2,
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.lightGray,
    },
    cardTitle: {
      fontSize: moderateScale(17),
      fontWeight: '600',
      color: CustomColors.textDark,
      flex: 1,
      paddingRight: horizontalScale(10),
      fontFamily: Fonts.semiBold,
    },
    toggleIcon: {
      fontSize: moderateScale(22),
      color: CustomColors.appThemeColor,
      fontWeight: 'bold',
    },
    cardContent: {
      padding: moderateScale(20),
      paddingLeft: horizontalScale(25),
      borderLeftWidth: moderateScale(5),
      borderLeftColor: CustomColors.lightGray,
    },
    detailItemContainer: {
      marginBottom: verticalScale(12),
    },
    detailLabel: {
      fontWeight: '600',
      color: CustomColors.textDark,
      fontSize: moderateScale(15),
      marginBottom: verticalScale(4),
      fontFamily: Fonts.semiBold,
    },
    detailValueText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDarkGray,
      lineHeight: moderateScale(22),
      fontFamily: Fonts.regular,
      paddingHorizontal: horizontalScale(5),
    },
    editableTextInput: {
      borderWidth: 1,
      borderColor: CustomColors.lightGray,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(10),
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    multilineInput: {
      minHeight: verticalScale(80),
      textAlignVertical: 'top',
      paddingTop: verticalScale(10),
      paddingBottom: verticalScale(10),
    },
    noItemsText: {
      fontSize: moderateScale(16),
      color: CustomColors.textGray,
      textAlign: 'center',
      marginTop: verticalScale(20),
      fontStyle: 'italic',
      fontFamily: Fonts.Italic,
    },
    bottomActionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: CustomColors.bottomNavBarColor,
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(16),
      borderTopWidth: 1,
      borderTopColor: CustomColors.lightGray,
      shadowColor: CustomColors.iconBlack,
      shadowOffset: { width: 0, height: verticalScale(-3) },
      shadowOpacity: 0.05,
      shadowRadius: moderateScale(5),
      elevation: 8,
      alignItems: 'center',
      justifyContent: 'center',

      height: verticalScale(80),
    },
    fullWidthButton: {
      width: '100%',
      paddingVertical: verticalScale(14),
      borderRadius: moderateScale(10),
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    fullWidthButtonText: {
      color: CustomColors.textWhite,
      fontWeight: '700',
      fontSize: moderateScale(17),
      fontFamily: Fonts.bold,
    },
    dropdownLabel: {
      fontWeight: '600',
      color: CustomColors.textDark,
      fontSize: moderateScale(15),
      marginBottom: verticalScale(4),
      fontFamily: Fonts.semiBold,
    },
    actionSheetTriggerButton: {
      borderWidth: 1,
      borderColor: CustomColors.lightGray,
      // backgroundColor: CustomColors.primaryLight,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(12),
      minHeight: verticalScale(45),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(12),
    },
    actionSheetTriggerButtonText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDark,
      flex: 1,
      fontFamily: Fonts.regular,
    },
    placeholderText: {
      color: CustomColors.textLightGray,
    },
    dropdownArrow: {
      fontSize: moderateScale(16),
      color: CustomColors.textDarkGray,
    },
    actionSheetItem: {
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(20),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.backgroundGray,
    },
    actionSheetItemSelected: {
      backgroundColor: CustomColors.primaryBlue + '15',
    },
    actionSheetItemText: {
      fontSize: moderateScale(16),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
    },
    actionSheetItemSelectedText: {
      fontWeight: 'bold',
      color: CustomColors.primaryBlue,
      fontFamily: Fonts.bold,
    },
    disabledText: {
      color: CustomColors.disableText,
    },
    disabledInput: {
      backgroundColor: CustomColors.disableInput, // A lighter background for disabled input
    },
    labelContainer: {
      flexDirection: 'row', // Align label and asterisk horizontally
      alignItems: 'center', // Vertically center them
      marginBottom: verticalScale(4),
    },
  });
useEffect(() => {
  navigation.setOptions({
    headerShown: true,

    headerStyle: {
      backgroundColor: CustomColors.appThemeColor,
    },

    headerTintColor: CustomColors.white,

    // ✅ CUSTOM TITLE WITH allowFontScaling
    headerTitle: () => (
      <Text
        allowFontScaling={false}
        style={[
          globalStyles.headerTitle,
          {
            fontSize: moderateScale(20),
            fontWeight: "600",
            color: CustomColors.white,
          },
        ]}
      >
        Travelling Expenses
      </Text>
    ),
  });

  return () => {
    dispatch(clearTravelExpenseDetails());
  };
}, [navigation, isDark]);

  const [isEditable, setIsEditable] = useState(true);
  useEffect(() => {
    if (tourId) {
      getTravelExpense(tourId);
    }
  }, [tourId, getTravelExpense]);
  useEffect(() => {
    const currentStatusId = claimdata?.claim_status_id;


    setClaimStatusId(currentStatusId);

    const editableStatuses = [-1, 1, 5];
    const shouldBeEditable = editableStatuses.includes(currentStatusId);

    setIsEditable(shouldBeEditable);
  }, [claimdata]);

  const [
    travelSubmit,
    { isLoading: isSubmitting, isSuccess: submitSuccess, isError: submitError, error: submitErrorData }
  ] = useTravelSubmitMutation();
  useEffect(() => {
    if (!isFetching && !isLoading && data) {
      const initialEditedData = {};
      data.data.forEach(item => {
        initialEditedData[item.id] = {
          ...item,
          traveltype: item.traveltype || null,
          actualmode: item.actualmode || null,
          prior_permission: item.prior_permission || null,
          travelclass: item.travelclass || null,
          claimedamount: String(item.claimedamount || ''),
          billno: item.billno || '',
          remarks: item.remarks || '',
          highermodereason: item.highermodereason || '',
          whohasoptedhighermode: item.whohasoptedhighermode || '',
          vendorname: item.vendorname || '',
          // Ensure fromdate and todate are stored as they come from backend
          fromdate: item.fromdate || '',
          todate: item.todate || '',
          fromplace: item.fromplace || '',
          toplace: item.toplace || '',
        };

        if (item.actualmode) {
          switch (item.actualmode) {
            case 'Train':
              triggerTravelTrain('travel_Train');
              break;
            case 'Air':
              triggerTravelAir('travel_Air');
              break;
            default:
              break;
          }
        }
      });
      setEditedItemData(initialEditedData);
      setHasUnsavedChanges(false);
      dispatch(setTravelExpenseDetails(data.data));

    }
  }, [isFetching, isLoading, data, triggerTravelTrain, triggerTravelAir]);
  const toggleExpand = (itemToToggle) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems(prev => ({
      ...prev,
      [itemToToggle.id]: !prev[itemToToggle.id]
    }));
  };
  const ActionSheetPickerItem = React.memo(({ options, onPress, setPickerStatus, selected, isDisabled = false }) => (
    <TouchableOpacity
      style={[styles.actionSheetItem, selected === options.value && styles.actionSheetItemSelected]}
      onPress={() => {
        if (!isDisabled) {
          onPress(options);
          setPickerStatus(false);
        }
      }}
      disabled={isDisabled}
    >
      <Text allowFontScaling={false} style={[styles.actionSheetItemText, selected === options.value && styles.actionSheetItemSelectedText, isDisabled && styles.disabledText]}>
        {options.name}
      </Text>
    </TouchableOpacity>
  ));
  const handleChange = (itemId, field, value) => {
    setEditedItemData(prev => {
      const newEditedItemData = {
        ...prev,
        [itemId]: {
          ...(prev[itemId] || {}),
          [field]: value
        }
      };

      // --- Start of new validation logic for fromdate/todate ---
      if (field === 'fromdate' || field === 'todate') {
        const currentFromDateStr = newEditedItemData[itemId].fromdate;
        const currentToDateStr = newEditedItemData[itemId].todate;

        const fromDateObj = parseCustomDate(currentFromDateStr);
        const toDateObj = parseCustomDate(currentToDateStr);

        // Check if both dates are valid and present for comparison
        if (!isNaN(fromDateObj.getTime()) && !isNaN(toDateObj.getTime())) {
          if (field === 'fromdate' && fromDateObj.getTime() > toDateObj.getTime()) {
            // If fromdate is set after todate, adjust todate to be same as fromdate
            newEditedItemData[itemId].todate = formatDateToCustomString(fromDateObj);
            Alert.alert(
              "Date Adjustment",
              "Arrival Date/Time has been adjusted to be same as Departure Date/Time, as it cannot be before it."
            );
          } else if (field === 'todate' && toDateObj.getTime() < fromDateObj.getTime()) {
            // If todate is set before fromdate, adjust fromdate to be same as todate
            newEditedItemData[itemId].fromdate = formatDateToCustomString(toDateObj);
            Alert.alert(
              "Date Adjustment",
              "Departure Date/Time has been adjusted to be same as Arrival Date/Time, as it cannot be after it."
            );
          }
        }
      }
      // --- End of new validation logic ---

      return newEditedItemData;
    });
    setHasUnsavedChanges(true);

    if (field === 'actualmode') {
      setEditedItemData(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          travelclass: null
        }
      }));
      switch (value) {
        case 'Train':
          triggerTravelTrain('travel_Train');
          break;
        case 'Air':
          triggerTravelAir('travel_Air');
          break;
        default:
          break;
      }
    }
  };

  const showDatepicker = (itemId, field, minDate, maxDate) => {

    const isTempItem = itemId?.toString().startsWith('temp-');
    if (!isEditable && !isTempItem) return;

    setCurrentItemIdForDate(itemId);
    setCurrentDateField(field);
    // Use parseCustomDate on the raw data from editedItemData
    const currentVal = parseCustomDate(editedItemData[itemId]?.[field]);
    if (Platform.OS === "android") {
      // First show date picker
      DateTimePickerAndroid.open({
        value: currentVal,
        mode: "date",
        is24Hour: true,
        display: "default",
        minimumDate: minDate,
        maximumDate: maxDate,
        onChange: (event, selectedDate) => {
          if (event.type === "dismissed" || !selectedDate) return;
          // Now show time picker after date is picked
          DateTimePickerAndroid.open({
            value: selectedDate,
            mode: "time",
            is24Hour: true,
            display: "default",
            minimumDate: minDate,
            maximumDate: maxDate,
            onChange: (event2, selectedTime) => {
              if (event2.type === "dismissed" || !selectedTime) return;
              // Combine date and time
              const combined = new Date(selectedDate);
              combined.setHours(selectedTime.getHours());
              combined.setMinutes(selectedTime.getMinutes());
              handleChange(itemId, field, formatDateToCustomString(combined));
            },
          });
        },
      });
    } else {
      // iOS shows both at once
      setShowDatePicker(true);
    }
  };



  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || parseCustomDate(editedItemData[currentItemIdForDate]?.[currentDateField]);
    setShowDatePicker(Platform.OS === 'ios'); // Keep picker open on iOS until confirmed/cancelled, or close on Android
    if (event.type === "set") { // Only update if "set" button is pressed on iOS
      handleChange(currentItemIdForDate, currentDateField, formatDateToCustomString(currentDate));
    }
  };

  const handleSubmitAllChanges = async () => {
    try {
      const invalidItems = [];
      const expensesToSubmit = Object.values(editedItemData).map((item, index) => {
        if (
          !item.fromdate ||
          !item.fromplace?.trim() ||
          !item.todate ||
          !item.toplace?.trim() ||
          !item.actualmode ||
          // Conditional validation for travelclass:
          ((item.actualmode === 'Train' || item.actualmode === 'Air') && !item.travelclass) ||
          isNaN(parseFloat(item.claimedamount)) || parseFloat(item.claimedamount) <= 0
        ) {
          invalidItems.push(index + 1);


        }

        const fromDate = parseCustomDate(item.fromdate);
        const toDate = parseCustomDate(item.todate);

        return {
          requestercomment: requestercomment ?? null,
          expensegid: expenseid ?? 1,
          tour_id: item.tour_id || tourId,
          fromdate: item.fromdate ? formatDateToCustomString(fromDate) : null,
          fromtime: item.fromdate ? formatTime(fromDate) : null,
          fromplace: item.fromplace ?? null,

          todate: item.todate ? formatDateToCustomString(toDate) : null,
          totime: item.todate ? formatTime(toDate) : null,
          toplace: item.toplace ??
            null,
          totaltkttamt: parseFloat(item.claimedamount) ||
            0,
          traveltype: item.traveltype ??
            'Domestic',
          actualmode: item.actualmode ??
            null,
          eligiblemodeoftravel: item.eligiblemodeoftravel ??
            "something",
          remarks: item.remarks ??
            null,
          billno: item.billno ??
            null,
          highermodereason: item.highermodereason ??
            "NO",
          prior_permission: item.prior_permission ??
            "NO",
          highermodeopted: item.highermodeopted ||
            "0",
          // Convert empty string back to null for API payload if not applicable
          travelclass: item.travelclass === '' ? null : item.travelclass ?? null,
          vendorname: item.vendorname ??
            '',
        };
      });
      if (invalidItems.length > 0) {
        ToastMessage(`Please fill all required fields for Expense Item(s): ${invalidItems.join(', ')}`);
        return;
      }

      if (!expensesToSubmit.length) {
        ToastMessage("No valid travel expense items to submit.");
        return;
      }

      const apiPayload = {
        data: expensesToSubmit
      };


      const result = await travelSubmit(apiPayload).unwrap();
      if (!result || result?.code === 'UNEXPECTED_ERROR') {
        throw new Error(result?.description || 'Server rejected the request.');
      }

      setHasUnsavedChanges(false);
      ToastMessage('Travel expenses submitted successfully!');
      getTravelExpense(tourId);
      navigation.goBack();

    } catch (err) {
      console.error("Submit error", err);
      ToastMessage(err.message || 'Submission failed. Please try again.');
    }
  };





  const handleAddItem = () => {
    const tempId = `temp-${Date.now()}`;

    const newItem = {
      id: tempId,
      traveltype: '',
      fromplace: '',
      toplace: '',
      fromdate: '',
      todate: '',
      actualmode: '',
      travelclass: '',
      billno: '',
      claimedamount: '',
      remarks: '',
      highermodereason: '',
      prior_permission: '',
      whohasoptedhighermode: '',
      vendorname: '',
    };

    // ✅ 1. Add to localAddedItems
    setLocalAddedItems(prev => [...prev, newItem]);

    // ✅ 2. Expand it by default
    setExpandedItems(prev => ({
      ...prev,
      [tempId]: true
    }));

    // ✅ 3. Initialize editable version
    setEditedItemData(prev => ({
      ...prev,
      [tempId]: newItem
    }));
  };

  const handleDeleteItem = (itemId) => {
    // Optional: confirm before deleting
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this expense item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Remove from edited data
            setEditedItemData(prev => {
              const updated = { ...prev };
              delete updated[itemId];
              return updated;
            });

            // Remove from expanded items
            setExpandedItems(prev => {
              const updated = { ...prev };
              delete updated[itemId];
              return updated;
            });

            // If it's a new (temp) item, remove from localAddedItems
            setLocalAddedItems(prev => prev.filter(item => item.id !== itemId));

            // If it's an existing item (not temp), hide it from UI but keep it in redux
            // Or if you want to remove it from travelExpenseDetails, dispatch a new filtered array to redux here

            setHasUnsavedChanges(true);
          }
        }
      ]
    );
  };
  useEffect(() => {
    const hasChanges = Object.keys(editedItemData).some(itemId => {
      const originalItem = travelExpenseDetails?.find(e => e.id === itemId);
      const editedItem = editedItemData[itemId];

      return JSON.stringify(originalItem) !== JSON.stringify(editedItem);
    });

    setHasUnsavedChanges(hasChanges || localAddedItems.length > 0);
  }, [editedItemData, localAddedItems]);

  useLayoutEffect(() => {
    const hasChanges = Object.keys(editedItemData).some(itemId => {
      const originalItem = travelExpenseDetails?.find(e => e.id === itemId);
      const editedItem = editedItemData[itemId];

      // If it's a temp item, consider it a new change
      if (itemId.toString().startsWith('temp-')) return true;

      return JSON.stringify(originalItem) !== JSON.stringify(editedItem);
    });

    setHasUnsavedChanges(hasChanges || localAddedItems.length > 0);
  }, [editedItemData, localAddedItems, travelExpenseDetails]);


  if (isLoading || isFetching) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={globalStyles.loadingText}>Please wait...</Text>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      style={styles.fullScreenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : verticalScale(110)}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: verticalScale(100), paddingHorizontal: horizontalScale(16) }}
        keyboardShouldPersistTaps="handled">
        <View style={styles.sectionCard}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>Travel Overview</Text>
          <View style={styles.detailRow}>
            <Text allowFontScaling={false} style={styles.boldText}>Travel No:</Text>
            <Text allowFontScaling={false} style={styles.detailValueText}>{travelNo || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text allowFontScaling={false} style={styles.boldText}>Employee Code:</Text>
            <Text allowFontScaling={false} style={styles.detailValueText}>{employeeCode || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text allowFontScaling={false} style={styles.boldText}>Employee Name:</Text>
            <Text allowFontScaling={false} style={styles.detailValueText}>{employeeName || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text allowFontScaling={false} style={styles.mainHeading}>Travelling Expense Items</Text>
          {isEditable && (
            <TouchableOpacity
              onPress={handleAddItem}
              style={styles.plusicon}
            >
              <MaterialIcons name="add-circle" size={28} color={CustomColors.appThemeColor} />
            </TouchableOpacity>
          )}

        </View>
        {(travelExpenseDetails?.length || 0) + localAddedItems.length === 0 ? (
          <Text allowFontScaling={false} style={styles.noItemsText}>Tap "+" to add a new travel expense item.</Text>

        ) : (
          [...travelExpenseDetails, ...localAddedItems].map((item, index) => {

            const itemDataForDisplay = editedItemData[item.id] || item;
            const isCurrentlyEditing = expandedItems[item.id];
            const isTempItem = item.id?.toString().startsWith('temp-');
            const isItemEditable = isEditable || isTempItem;
            let travelClassOptions = [];
            let isTravelClassLoading = false;
            switch (itemDataForDisplay.actualmode) {
              case 'Train':
                travelClassOptions = travelTrainData || [];
                isTravelClassLoading = isLoadingTravelTrain;
                break;
              case 'Air':
                travelClassOptions = travelAirData || [];
                isTravelClassLoading = isLoadingTravelAir;
                break;
              default:
                travelClassOptions = [];
                isTravelClassLoading = false;
                break;
            }

            return (
              <View key={item.id || index} style={styles.expenseItemCard}>
                <TouchableOpacity
                  onPress={() => toggleExpand(item)}
                  onLongPress={() => handleDeleteItem(item.id)}
                  style={styles.cardHeader}
                  activeOpacity={0.8}
                >

                  <Text allowFontScaling={false} style={styles.cardTitle}>
                    Expense Item {index + 1}
                  </Text>

                  <Text allowFontScaling={false} style={styles.toggleIcon}>
                    {expandedItems[item.id] ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {expandedItems[item.id] && (
                  <View style={styles.cardContent}>
                    <Text allowFontScaling={false} style={styles.dropdownLabel}>Travel Type:</Text>
                    <TouchableOpacity
                      style={styles.actionSheetTriggerButton}
                      onPress={() => setActivePickerId(`${item.id}-traveltype`)}
                      disabled={!isItemEditable}
                    >
                      <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !itemDataForDisplay.traveltype && styles.placeholderText, !isItemEditable && styles.disabledText]}>
                        {travelTypeOptions?.find(opt => opt.value === itemDataForDisplay.traveltype)?.name || "Select Travel Type"}
                      </Text>
                      <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomActionSheetPicker
                      pickerStatus={activePickerId === `${item.id}-traveltype`}
                      setPickerStatus={() => setActivePickerId(null)}
                      title="Select Travel Type"
                      optionsData={travelTypeDisplayOptions}
                      RenderItem={ActionSheetPickerItem}
                      onPress={(selectedItem) => handleChange(item.id, 'traveltype', selectedItem.value)}
                      selected={itemDataForDisplay.traveltype}
                      // onSearch={handleTravelTypeSearch} 
                      isLoading={isTravelTypeSearching}
                      isFetchingMore={isTravelTypeFetchingMore}
                      onEndReached={handleTravelTypeLoadMore}
                      isDisabled={!isItemEditable}

                    />

                    <EditableRow
                      label="Departure Date and Time"
                      value={formatDateTime(itemDataForDisplay.fromdate)}
                      onChangeText={(text) => handleChange(item.id, 'fromdate', text)} // This will not be directly used for picker
                      isEditing={true}
                      placeholder='DD-MM-YYYY HH:MM'
                      isDatePicker={true} // Mark as date picker field
                      onPressDatePicker={isItemEditable ? () => showDatepicker(item.id, 'fromdate', minDate, maxDate) : null}
                      // Pass the handler
                      isDisabled={false}
                      isRequired={true}

                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    <EditableRow
                      label="Departure Place"
                      value={itemDataForDisplay.fromplace}
                      onChangeText={(text) => handleChange(item.id, 'fromplace', text)}
                      isEditing={true}
                      isDisabled={!isItemEditable}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />
                    <EditableRow
                      label="Arrival Date and Time"
                      value={formatDateTime(itemDataForDisplay.todate)}
                      onChangeText={(text) => handleChange(item.id, 'todate', text)} // This will not be directly used for picker
                      isEditing={true}
                      placeholder='DD-MM-YYYY HH:MM'
                      isDatePicker={true} // Mark as date picker field
                      onPressDatePicker={isItemEditable ? () => showDatepicker(item.id, 'todate', parseCustomDate(itemDataForDisplay.fromdate), maxDate) : null}
                      isDisabled={false}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />
                    <EditableRow
                      label="Arrival Place"
                      value={itemDataForDisplay.toplace}
                      onChangeText={(text) => handleChange(item.id, 'toplace', text)}
                      isEditing={true}
                      isDisabled={!isItemEditable}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    <Text allowFontScaling={false} style={styles.dropdownLabel}>Actual Mode of Travel:{true && <Text allowFontScaling={false} style={{ color: CustomColors.dangerRed }}>*</Text>} </Text>
                    <TouchableOpacity
                      style={styles.actionSheetTriggerButton}
                      onPress={() => setActivePickerId(`${item.id}-actualmode`)}
                      disabled={!isItemEditable}

                    >
                      <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !itemDataForDisplay.actualmode && styles.placeholderText, !isItemEditable && styles.disabledText]}>
                        {actualModeOptions?.find(opt => opt.value === itemDataForDisplay.actualmode)?.name || "Select Mode"}
                      </Text>
                      <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomActionSheetPicker
                      pickerStatus={activePickerId === `${item.id}-actualmode`}
                      setPickerStatus={() => setActivePickerId(null)}
                      title="Select Mode of Travel"
                      optionsData={actualModeOptions}
                      RenderItem={ActionSheetPickerItem}
                      onPress={(selectedItem) => handleChange(item.id, 'actualmode', selectedItem.value)}
                      selected={itemDataForDisplay.actualmode}
                      isDisabled={!isItemEditable}

                    />

                    {itemDataForDisplay.actualmode && (
                      <>
                        <Text allowFontScaling={false} style={styles.dropdownLabel}>Class Of Travel:{true && <Text allowFontScaling={false} style={{ color: CustomColors.dangerRed }}>*</Text>} </Text>
                        <TouchableOpacity
                          style={styles.actionSheetTriggerButton}
                          onPress={() => setActivePickerId(`${item.id}-travelclass`)}
                          disabled={!isItemEditable}
                        >
                          {/* {isTravelClassLoading ? (
                            <ActivityIndicator size="small" color={CustomColors.primaryBlue} />
                          ) : ( */}
                          <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !itemDataForDisplay.travelclass && styles.placeholderText, !isItemEditable && styles.disabledText]}>
                            {travelClassOptions?.find(opt => opt.value === itemDataForDisplay.travelclass)?.name || "Select Class"
                            }
                          </Text>
                          {/* )} */}
                          <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>

                        <CustomActionSheetPicker
                          pickerStatus={activePickerId === `${item.id}-travelclass`}
                          setPickerStatus={() => setActivePickerId(null)}
                          title="Select Class Of Travel"
                          optionsData={travelClassOptions}
                          RenderItem={ActionSheetPickerItem}
                          onPress={(selectedItem) => handleChange(item.id, 'travelclass', selectedItem.value)}
                          selected={itemDataForDisplay.travelclass}
                          isLoading={isTravelClassLoading}
                          isDisabled={!isItemEditable}

                        />
                      </>
                    )}

                    <EditableRow
                      label="Bill Number"
                      value={itemDataForDisplay.billno}
                      onChangeText={(text) => handleChange(item.id, 'billno', text)}
                      isEditing={true}
                      isDisabled={!isItemEditable}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}

                    />
                    <EditableRow
                      label="Claim Amount (INR)"
                      value={itemDataForDisplay.claimedamount}
                      onChangeText={(text) => handleChange(item.id, 'claimedamount', text)}
                      isEditing={true}
                      keyboardType='numeric'
                      isDisabled={!isItemEditable}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />
                    <EditableRow
                      label="Remarks"
                      value={itemDataForDisplay.remarks}
                      onChangeText={(text) => handleChange(item.id, 'remarks', text)}
                      isEditing={true}
                      multiline={true}
                      isDisabled={!isItemEditable}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}

                    />
                    <Text allowFontScaling={false} style={styles.dropdownLabel}>Higher Mode Opted Due To Personal Reason of Exigencies:</Text>
                    <TouchableOpacity
                      style={styles.actionSheetTriggerButton}
                      onPress={() => setActivePickerId(`${item.id}-highermodereason`)}
                      disabled={!isItemEditable}
                    >
                      <Text allowFontScaling={false} style={[
                        styles.actionSheetTriggerButtonText,
                        !itemDataForDisplay.highermodereason && styles.placeholderText,
                        !isItemEditable && styles.disabledText
                      ]}>
                        {ynOptions?.find(opt => opt.value === itemDataForDisplay.highermodereason)?.name || "Select Yes/No"}
                      </Text>
                      <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomActionSheetPicker
                      pickerStatus={activePickerId === `${item.id}-highermodereason`}
                      setPickerStatus={() => setActivePickerId(null)}
                      title="Select Yes/No"
                      optionsData={ynOptions}
                      RenderItem={ActionSheetPickerItem}
                      onPress={(selectedItem) => handleChange(item.id, 'highermodereason', selectedItem.value)}
                      selected={itemDataForDisplay.highermodereason}
                      isDisabled={!isItemEditable}
                    />


                    <Text allowFontScaling={false} style={styles.dropdownLabel}>Prior Permission Taken For Higher Mode of Travel:</Text>
                    <TouchableOpacity
                      style={styles.actionSheetTriggerButton}
                      onPress={() => setActivePickerId(`${item.id}-prior_permission`)}
                      disabled={!isItemEditable}
                    >
                      <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !itemDataForDisplay.prior_permission && styles.placeholderText, !isItemEditable && styles.disabledText]}>
                        {ynOptions?.find(opt => opt.value === itemDataForDisplay.prior_permission)?.name || "Select Yes/No"}
                      </Text>
                      <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomActionSheetPicker
                      pickerStatus={activePickerId === `${item.id}-prior_permission`}
                      setPickerStatus={() => setActivePickerId(null)}
                      title="Prior Permission"
                      optionsData={ynOptions}
                      RenderItem={ActionSheetPickerItem}
                      onPress={(selectedItem) => handleChange(item.id, 'prior_permission', selectedItem.value)}
                      selected={itemDataForDisplay.prior_permission}
                      isDisabled={!isItemEditable}

                    />

                    <EditableRow
                      label="Who Has Opted Higher Mode"
                      value={itemDataForDisplay.whohasoptedhighermode}
                      onChangeText={(text) => handleChange(item.id, 'whohasoptedhighermode', text)}
                      isEditing={true}
                      isDisabled={!isItemEditable}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}

                    />
                    <EditableRow
                      label="Vendor Name"
                      value={itemDataForDisplay.vendorname}
                      onChangeText={(text) => handleChange(item.id, 'vendorname', text)}
                      isEditing={true}
                      isDisabled={!isItemEditable}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />
                  </View>
                )}
              </View>
            );
          })
        )}
        {Platform.OS === "ios" && showDatePicker && currentItemIdForDate && (
          <DateTimePicker
            testID="dateTimePicker"
            value={
              parseCustomDate(editedItemData[currentItemIdForDate]?.[currentDateField]) || new Date()
            }
            mode="datetime"
            is24Hour={true}
            display="default"
            minimumDate={minDate}
            maximumDate={maxDate}
            onChange={handleDateChange}
          />
        )}

      </ScrollView>
      {from !== 'Checker' && (
        <Animated.View style={[styles.bottomActionBar, { opacity: submitButtonOpacity }]}>
          <TouchableOpacity
            style={[
              styles.fullWidthButton,
              {
                backgroundColor:
                  hasUnsavedChanges && !isSubmitting && isEditable
                    ? CustomColors.appThemeColor
                    : CustomColors.mediumGray
              }
            ]}
            onPress={handleSubmitAllChanges}
            disabled={!hasUnsavedChanges || isSubmitting || !isEditable}
          >
            <Text allowFontScaling={false} style={styles.fullWidthButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </KeyboardAvoidingView>

    // </KeyboardAvoidingView>
  );
};

export default TravelDetailsScreen;