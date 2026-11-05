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
  Alert,
} from 'react-native';
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import {
  MaterialIcons,
  Ionicons,
} from "@expo/vector-icons";
import {
  useLazyGetDailyReimbursementQuery,
  useDailydeimCreateMutation,
  useLazyCommonDropDownGetQuery,
  useLazyGetAllowanceQuery,
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
    const date = new Date(dateString.replace(/-/g, '/'));
    if (isNaN(date.getTime())) {
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
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
      return dateString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
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

const parseCustomDate = (dateString) => {
  if (!dateString || dateString === 'N/A') return new Date();

  if (dateString instanceof Date) return dateString;

  const trimmed = typeof dateString === 'string' ? dateString.trim() : '';

  let match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
  if (match) {
    const [, day, month, year, hours, minutes] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  }

  match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    const [, year, month, day, hours, minutes] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  }

  match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0);
  }

  match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0);
  }

  const monthMap = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  match = trimmed.match(/^(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2})$/);
  if (match) {
    const [, year, monthAbbr, day, hours, minutes] = match;
    const monthNum = monthMap[monthAbbr];
    if (monthNum !== undefined) {
      return new Date(Number(year), monthNum, Number(day), Number(hours), Number(minutes));
    }
  }

  try {
    const fallback = new Date(trimmed.replace(/-/g, '/'));
    if (!isNaN(fallback.getTime())) return fallback;
  } catch { }

  console.error("Could not parse date string:", dateString);
  return new Date();
};

const formatDateToCustomString = (date) => {
  if (!date) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = '00';
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const formatDateForApi = (dateString) => {
  if (!dateString) return '';
  const d = parseCustomDate(dateString);
  if (isNaN(d.getTime())) {
    const s = typeof dateString === 'string' ? dateString.trim() : '';
    return s ? `${s} ` : '';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day} `;
};

const formatTimeForApi = (timeString, fallbackDateString) => {
  if (timeString && typeof timeString === 'string') {
    const trimmed = timeString.trim();
    if (/am|pm/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
  }
  if (fallbackDateString) {
    const d = parseCustomDate(fallbackDateString);
    if (!isNaN(d.getTime())) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
  }
  return '';
};

const formatYesNoToBinary = (val) => {
  if (val === 'Yes' || val === '1' || val === 1 || val === true) return '1';
  return '0';
};

const parseDateForMinMaxRange = (dateString, isEndDate = false) => {
  if (!dateString) return null;
  try {
    let date = new Date(dateString.replace(/-/g, '/'));

    if (isNaN(date.getTime())) {
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
          return null;
        }
      } else {
        return null;
      }
    }

    if (isNaN(date.getTime())) {
      return null;
    }

    if (isEndDate) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  } catch (error) {
    return null;
  }
};

const calculateHoursDifference = (fromDateStr, toDateStr) => {
  if (!fromDateStr || !toDateStr) return '0.00';
  const start = parseCustomDate(fromDateStr);
  const end = parseCustomDate(toDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '0.00';
  const diffInMs = end.getTime() - start.getTime();
  if (diffInMs < 0) return '0.00';
  const hours = diffInMs / (1000 * 60 * 60);
  return hours.toFixed(2);
};

const EditableRow = ({ label, value, onChangeText, isEditing, keyboardType = 'default', multiline = false, placeholder = '', placeholderTextColor, isDisabled = false, isDatePicker = false, onPressDatePicker = null, isRequired = false, styles, CustomColors }) => (
  <View style={styles.detailItemContainer}>
    <View style={styles.labelContainer}>
      <Text allowFontScaling={false} style={styles.detailLabel}>{label}:</Text>
      {isRequired && <Text allowFontScaling={false} style={{ color: CustomColors.dangerRed }}>*</Text>}
    </View>
    {isEditing ? (
      isDatePicker ? (
        <TouchableOpacity
          onPress={onPressDatePicker}
          disabled={isDisabled}
          style={[styles.editableTextInput, isDisabled && styles.disabledInput]}
        >
          <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !value && styles.placeholderText, isDisabled && styles.disabledText]}>
            {value && value !== 'N/A' ? value : placeholder}
          </Text>
        </TouchableOpacity>
      ) : (
        <TextInput allowFontScaling={false}
          style={[styles.editableTextInput, multiline && styles.multilineInput, isDisabled && styles.disabledInput]}
          value={value !== undefined && value !== null ? String(value) : ''}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || CustomColors.textLightGray}
          editable={!isDisabled}
        />
      )
    ) : (
      <Text allowFontScaling={false} style={[styles.detailValueText, isDisabled && styles.disabledText]}>
        {value || 'N/A'}
      </Text>
    )}
  </View>
);

const DailyReimbursementScreen = ({ route }) => {
  const expense = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || {};
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  const navigation = useNavigation();
  const tourId = expense?.tourid || claimdata?.id || claimdata?.tourid || expense?.id || route?.params?.tourId;
  const employeeCode = expense?.employee_code || claimdata?.employee_code;
  const employeeName = expense?.employee_name || claimdata?.employee_name;
  const travelNo = expense?.crn_no || claimdata?.id;

  const initialEmployeeGrade =
    expense?.empgrade ||
    expense?.emp_grade ||
    expense?.employee_grade ||
    claimdata?.empgrade ||
    claimdata?.emp_grade ||
    claimdata?.employee_grade ||
    claimdata?.maker_data?.grade ||
    claimdata?.grade ||
    claimdata?.data?.[0]?.emp_grade ||
    claimdata?.data?.[0]?.empgrade ||
    route?.params?.employeeGrade ||
    route?.params?.empGrade ||
    '';
  const [employeeGrade, setEmployeeGrade] = useState(initialEmployeeGrade);

  const expenseid = expense.expenseid ?? null;
  const requestercomment = expense.requestercomment ?? null;
  const [getDailyReimbursement, { data, error, isLoading, isFetching }] = useLazyGetDailyReimbursementQuery();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const submitButtonOpacity = useRef(new Animated.Value(1)).current;
  const [activePickerId, setActivePickerId] = useState(null);

  const [triggerYn] = useLazyCommonDropDownGetQuery();
  const [ynOptions, setYnOptions] = useState([
    { name: 'Yes', value: 'Yes' },
    { name: 'No', value: 'No' },
  ]);

  const cityOptions = [
    { name: 'Joka', value: 'Joka' },
  ];

  const [claimStatusId, setClaimStatusId] = useState(null);

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
      return parsedStartDate || new Date(2000, 0, 1, 0, 0, 0);
    }
    return new Date(2000, 0, 1, 0, 0, 0);
  }, [claimdata?.startdate]);

  const maxDate = useMemo(() => {
    if (claimdata?.enddate) {
      const parsedEndDate = parseDateForMinMaxRange(claimdata.enddate, true);
      return parsedEndDate || new Date(2050, 11, 31, 23, 59, 59);
    }
    return new Date(2050, 11, 31, 23, 59, 59);
  }, [claimdata?.enddate]);

  const [triggerGetAllowance] = useLazyGetAllowanceQuery();
  const [eligibleDailyRate, setEligibleDailyRate] = useState('1500');

  useEffect(() => {
    const fetchAllowance = async () => {
      const grade = employeeGrade || initialEmployeeGrade || 'S4';
      try {
        const res = await triggerGetAllowance({
          city: '',
          employeegrade: grade,
          expensename: 'Daily Diem',
          page: 1,
        }).unwrap();
        const first = res?.data?.[0];
        if (first?.elgibleamount) {
          const rateStr = String(first.elgibleamount);
          setEligibleDailyRate(rateStr);
          setEditedItemData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(id => {
              if (!updated[id].eligibleAmount || updated[id].eligibleAmount === '750') {
                updated[id] = { ...updated[id], eligibleAmount: rateStr };
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.warn("Error fetching allowance:", err);
      }
    };
    fetchAllowance();
  }, [employeeGrade, initialEmployeeGrade, triggerGetAllowance]);

  useEffect(() => {
    const fetchInitialDropdowns = async () => {
      try {
        const ynRes = await triggerYn('yn').unwrap();
        if (ynRes && ynRes.length) {
          setYnOptions(ynRes);
        }
      } catch (err) { }
    };
    fetchInitialDropdowns();
  }, [triggerYn]);

  const styles = StyleSheet.create({
    fullScreenContainer: {
      flex: 1,
      backgroundColor: CustomColors.appScreenColor,
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
    headerRightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: horizontalScale(12),
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
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(16),
      borderTopWidth: 1,
      borderTopColor: CustomColors.lightGray,
      elevation: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: horizontalScale(12),
      height: verticalScale(75),
    },
    actionButton: {
      flex: 1,
      borderRadius: moderateScale(8),
      alignItems: 'center',
      justifyContent: 'center',
      height: verticalScale(48),
    },
    submitButton: {
      backgroundColor: CustomColors.appThemeColor,
    },
    backButton: {
      backgroundColor: CustomColors.mediumGray || '#8C9BA5',
    },
    actionButtonText: {
      color: CustomColors.textWhite,
      fontWeight: '700',
      fontSize: moderateScale(16),
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
      backgroundColor: CustomColors.disableInput,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
          Daily Reimbursement
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
      getDailyReimbursement(tourId);
    }
  }, [tourId, getDailyReimbursement]);

  useEffect(() => {
    const currentStatusId = claimdata?.claim_status_id;
    setClaimStatusId(currentStatusId);
    const editableStatuses = [-1, 1, 5];
    const shouldBeEditable = editableStatuses.includes(currentStatusId);
    setIsEditable(shouldBeEditable);
  }, [claimdata]);

  const [
    dailydeimCreate,
    { isLoading: isSubmitting }
  ] = useDailydeimCreateMutation();

  useEffect(() => {
    if (!isFetching && !isLoading && data) {
      if (
        data?.employee_grade ||
        data?.empgrade ||
        data?.emp_grade ||
        data?.grade
      ) {
        setEmployeeGrade(
          data.employee_grade ||
          data.empgrade ||
          data.emp_grade ||
          data.grade
        );
      }
      const initialEditedData = {};
      data.data.forEach(item => {
        const fromDateStr = item.fromdate || '';
        const toDateStr = item.todate || '';
        const calculatedHours = calculateHoursDifference(fromDateStr, toDateStr);
        const sysHours = item.syshours !== undefined && item.syshours !== null
          ? String(item.syshours)
          : (item.systemHours || calculatedHours);

        const parseBinaryToYesNo = (val) => {
          if (val === '1' || val === 1 || val === 'Yes') return 'Yes';
          return 'No';
        };

        initialEditedData[item.id] = {
          ...item,
          sno: item.sno || '',
          city: item.city || 'Joka',
          fromdate: fromDateStr,
          fromtime: item.fromtime ? formatTimeForApi(item.fromtime, fromDateStr) : '',
          todate: toDateStr,
          totime: item.totime ? formatTimeForApi(item.totime, toDateStr) : '',
          systemHours: sysHours,
          noOfHours: item.noofhours !== undefined && item.noofhours !== null
            ? String(item.noofhours)
            : (item.noOfHours !== undefined && item.noOfHours !== null
              ? String(item.noOfHours)
              : (item.no_of_hours !== undefined && item.no_of_hours !== null
                ? String(item.no_of_hours)
                : '')),
          accommodationProvided: parseBinaryToYesNo(item.accbybank ?? item.accommodationProvided),
          boardingProvided: parseBinaryToYesNo(item.boardingbybank ?? item.boardingProvided),
          boardingDeclaration: parseBinaryToYesNo(item.declaration ?? item.boardingDeclaration),
          noOfLeaveDays: item.isleave !== undefined && item.isleave !== null
            ? String(item.isleave)
            : (item.noOfLeaveDays !== undefined ? String(item.noOfLeaveDays) : '0'),
          eligibleAmount: item.eligibleamount !== undefined
            ? String(item.eligibleamount)
            : (item.eligibleAmount !== undefined ? String(item.eligibleAmount) : '750'),
          claimedamount: item.claimedamount !== undefined ? String(item.claimedamount) : '',
        };
      });
      setEditedItemData(initialEditedData);
      setHasUnsavedChanges(false);
      dispatch(setTravelExpenseDetails(data.data));
    }
  }, [isFetching, isLoading, data]);

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

      if (field === 'noOfHours') {
        const cleanVal = typeof value === 'string' ? value.replace(/[^0-9.]/g, '') : value;
        const currentSysHours = parseFloat(
          newEditedItemData[itemId].systemHours ||
          calculateHoursDifference(newEditedItemData[itemId].fromdate, newEditedItemData[itemId].todate)
        ) || 0;

        const enteredHours = parseFloat(cleanVal);

        if (!isNaN(enteredHours) && enteredHours > currentSysHours) {
          newEditedItemData[itemId].noOfHours = '';
          ToastMessage(`No of Hours cannot be greater than System Calculated No of Hours (${currentSysHours.toFixed(2)}).`);
        } else {
          newEditedItemData[itemId].noOfHours = cleanVal;
        }
      }

      if (field === 'fromdate' || field === 'todate') {
        const currentFromDateStr = newEditedItemData[itemId].fromdate;
        const currentToDateStr = newEditedItemData[itemId].todate;

        const fromDateObj = parseCustomDate(currentFromDateStr);
        const toDateObj = parseCustomDate(currentToDateStr);

        if (!isNaN(fromDateObj.getTime()) && !isNaN(toDateObj.getTime())) {
          if (field === 'fromdate' && fromDateObj.getTime() > toDateObj.getTime()) {
            newEditedItemData[itemId].todate = formatDateToCustomString(fromDateObj);
            Alert.alert(
              "Date Adjustment",
              "To Date/Time has been adjusted to match From Date/Time as it cannot be prior to it."
            );
          } else if (field === 'todate' && toDateObj.getTime() < fromDateObj.getTime()) {
            newEditedItemData[itemId].fromdate = formatDateToCustomString(toDateObj);
            Alert.alert(
              "Date Adjustment",
              "From Date/Time has been adjusted to match To Date/Time as it cannot be after it."
            );
          }
        }

        const calculated = calculateHoursDifference(
          newEditedItemData[itemId].fromdate,
          newEditedItemData[itemId].todate
        );
        newEditedItemData[itemId].systemHours = calculated;

        const sysHoursNum = parseFloat(calculated) || 0;
        const currentNoOfHoursNum = parseFloat(newEditedItemData[itemId].noOfHours);
        if (!isNaN(currentNoOfHoursNum) && currentNoOfHoursNum > sysHoursNum) {
          newEditedItemData[itemId].noOfHours = '';
          ToastMessage('No of Hours cleared as it exceeds new System Calculated No of Hours.');
        }

        if (field === 'fromdate' && !newEditedItemData[itemId].fromtime) {
          newEditedItemData[itemId].fromtime = formatTimeForApi(null, newEditedItemData[itemId].fromdate);
        }
        if (field === 'todate' && !newEditedItemData[itemId].totime) {
          newEditedItemData[itemId].totime = formatTimeForApi(null, newEditedItemData[itemId].todate);
        }
      }

      return newEditedItemData;
    });
    setHasUnsavedChanges(true);
  };

  const showDatepicker = (itemId, field, minDate, maxDate) => {
    const isTempItem = itemId?.toString().startsWith('temp-');
    if (!isEditable && !isTempItem) return;

    setCurrentItemIdForDate(itemId);
    setCurrentDateField(field);
    const currentVal = parseCustomDate(editedItemData[itemId]?.[field]);

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: currentVal,
        mode: "date",
        is24Hour: true,
        display: "default",
        minimumDate: minDate,
        maximumDate: maxDate,
        onChange: (event, selectedDate) => {
          if (event.type === "dismissed" || !selectedDate) return;
          DateTimePickerAndroid.open({
            value: selectedDate,
            mode: "time",
            is24Hour: true,
            display: "default",
            minimumDate: minDate,
            maximumDate: maxDate,
            onChange: (event2, selectedTime) => {
              if (event2.type === "dismissed" || !selectedTime) return;
              const combined = new Date(selectedDate);
              combined.setHours(selectedTime.getHours());
              combined.setMinutes(selectedTime.getMinutes());
              handleChange(itemId, field, formatDateToCustomString(combined));
              if (field === 'fromdate') {
                handleChange(itemId, 'fromtime', formatTimeForApi(null, combined));
              } else if (field === 'todate') {
                handleChange(itemId, 'totime', formatTimeForApi(null, combined));
              }
            },
          });
        },
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || parseCustomDate(editedItemData[currentItemIdForDate]?.[currentDateField]);
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === "set") {
      handleChange(currentItemIdForDate, currentDateField, formatDateToCustomString(currentDate));
      if (currentDateField === 'fromdate') {
        handleChange(currentItemIdForDate, 'fromtime', formatTimeForApi(null, currentDate));
      } else if (currentDateField === 'todate') {
        handleChange(currentItemIdForDate, 'totime', formatTimeForApi(null, currentDate));
      }
    }
  };

  const handleSubmitAllChanges = async () => {
    try {
      const invalidItems = [];
      const expensesToSubmit = Object.values(editedItemData).map((item, index) => {
        const sysHours = parseFloat(
          item.systemHours || calculateHoursDifference(item.fromdate, item.todate)
        ) || 0;
        const noOfHoursVal = parseFloat(item.noOfHours);

        if (
          !item.city ||
          !item.fromdate ||
          !item.todate ||
          item.noOfHours === undefined ||
          item.noOfHours === null ||
          String(item.noOfHours).trim() === '' ||
          isNaN(noOfHoursVal) ||
          noOfHoursVal <= 0 ||
          noOfHoursVal > sysHours ||
          item.noOfLeaveDays === undefined ||
          item.noOfLeaveDays === '' ||
          isNaN(parseFloat(item.claimedamount)) ||
          parseFloat(item.claimedamount) <= 0
        ) {
          invalidItems.push(index + 1);
        }

        const fromDateFormatted = formatDateForApi(item.fromdate);
        const toDateFormatted = formatDateForApi(item.todate);
        const fromTimeFormatted = formatTimeForApi(item.fromtime, item.fromdate);
        const toTimeFormatted = formatTimeForApi(item.totime, item.todate);

        const accbybank = formatYesNoToBinary(item.accommodationProvided ?? item.accbybank);
        const boardingbybank = formatYesNoToBinary(item.boardingProvided ?? item.boardingbybank);
        let declaration = formatYesNoToBinary(item.boardingDeclaration ?? item.declaration);
        if (accbybank === '1' && boardingbybank === '1') {
          declaration = '0';
        }

        const payloadItem = {
          tour_id: Number(item.tour_id || item.tourgid || item.tourid || tourId) || 0,
          tourid: Number(item.tour_id || item.tourgid || item.tourid || tourId) || 0,
          tourgid: Number(item.tour_id || item.tourgid || item.tourid || tourId) || 0,
          claimedamount: parseFloat(item.claimedamount) || 0,
          requestercomment: requestercomment || item.requestercomment || 'Daily Reimbursement',
          city: (item.city || 'JOKA').trim().toUpperCase(),
          fromdate: fromDateFormatted,
          fromtime: fromTimeFormatted,
          todate: toDateFormatted,
          totime: toTimeFormatted,
          syshours: sysHours,
          noofhours: String(item.noOfHours ?? ''),
          isleave: String(item.noOfLeaveDays ?? item.isleave ?? '0'),
          accbybank,
          boardingbybank,
          declaration,
          expenseid: expenseid ? Number(expenseid) : 2,
          eligibleamount: parseFloat(item.eligibleAmount ?? item.eligibleamount) || parseFloat(eligibleDailyRate) || 1500,
          gstno: item.gstno || '',
          invoicedate: item.invoicedate ?? null,
          invoiceno: item.invoiceno ?? null,
        };

        if (item.id && !String(item.id).startsWith('temp-')) {
          payloadItem.id = item.id;
        }

        return payloadItem;
      });

      if (invalidItems.length > 0) {
        ToastMessage(`Please fill all required fields for Daily Reimbursement Item(s): ${invalidItems.join(', ')}`);
        return;
      }

      if (!expensesToSubmit.length) {
        ToastMessage("No valid reimbursement items to submit.");
        return;
      }

      const apiPayload = {
        data: expensesToSubmit
      };
     console.log("Submitting payload:", apiPayload);
      const result = await dailydeimCreate(apiPayload).unwrap();
      if (!result || result?.code === 'UNEXPECTED_ERROR') {
        throw new Error(result?.description || result?.message || 'Server rejected the request.');
      }

      setHasUnsavedChanges(false);
      ToastMessage(result?.message || 'Daily reimbursement details submitted successfully!');
      if (tourId) {
        getDailyReimbursement(tourId);
      }
      navigation.goBack();

    } catch (err) {
      console.error("Submit error", err);
      ToastMessage(err?.data?.description || err?.data?.message || err?.message || 'Submission failed. Please try again.');
    }
  };

  const handleAddItem = () => {
    const tempId = `temp-${Date.now()}`;

    const newItem = {
      id: tempId,
      sno: localAddedItems.length + (travelExpenseDetails?.length || 0) + 1,
      city: 'Joka',
      fromdate: '',
      fromtime: '',
      todate: '',
      totime: '',
      systemHours: '0.00',
      noOfHours: '',
      accommodationProvided: 'No',
      boardingProvided: 'No',
      boardingDeclaration: 'No',
      noOfLeaveDays: '0',
      eligibleAmount: eligibleDailyRate || '1500',
      claimedamount: '',
    };

    setLocalAddedItems(prev => [...prev, newItem]);
    setExpandedItems(prev => ({
      ...prev,
      [tempId]: true
    }));
    setEditedItemData(prev => ({
      ...prev,
      [tempId]: newItem
    }));
  };

  const handleDeleteItem = (itemId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this daily reimbursement item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setEditedItemData(prev => {
              const updated = { ...prev };
              delete updated[itemId];
              return updated;
            });

            setExpandedItems(prev => {
              const updated = { ...prev };
              delete updated[itemId];
              return updated;
            });

            setLocalAddedItems(prev => prev.filter(item => item.id !== itemId));
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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: verticalScale(100), paddingHorizontal: horizontalScale(16) }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionCard}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>Travel Details</Text>
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
          <View style={styles.detailRow}>
            <Text allowFontScaling={false} style={styles.boldText}>Employee Grade:</Text>
            <Text allowFontScaling={false} style={styles.detailValueText}>{employeeGrade || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text allowFontScaling={false} style={styles.mainHeading}>Daily Reimbursement Items</Text>
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
          <Text allowFontScaling={false} style={styles.noItemsText}>Tap "+" to add a new daily reimbursement item.</Text>
        ) : (
          [...travelExpenseDetails, ...localAddedItems].map((item, index) => {
            const itemDataForDisplay = editedItemData[item.id] || item;
            const isTempItem = item.id?.toString().startsWith('temp-');
            const isItemEditable = isEditable || isTempItem;

            return (
              <View key={item.id || index} style={styles.expenseItemCard}>
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    onPress={() => toggleExpand(item)}
                    style={{ flex: 1 }}
                    activeOpacity={0.8}
                  >
                    <Text allowFontScaling={false} style={styles.cardTitle}>
                      Reimbursement Item {index + 1}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.headerRightContainer}>
                    {isItemEditable && (
                      <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                        <Ionicons name="trash-outline" size={22} color={CustomColors.dangerRed || '#D93025'} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => toggleExpand(item)}>
                      <Text allowFontScaling={false} style={styles.toggleIcon}>
                        {expandedItems[item.id] ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {expandedItems[item.id] && (
                  <View style={styles.cardContent}>
                    {/* S.No */}
                    <EditableRow
                      label="S.No"
                      value={itemDataForDisplay.sno || index + 1}
                      onChangeText={(text) => handleChange(item.id, 'sno', text)}
                      isEditing={true}
                      isDisabled={!isItemEditable}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* City Dropdown */}
                    <Text allowFontScaling={false} style={styles.dropdownLabel}>
                      City:{<Text allowFontScaling={false} style={{ color: CustomColors.dangerRed }}>*</Text>}
                    </Text>
                    <TouchableOpacity
                      style={styles.actionSheetTriggerButton}
                      onPress={() => setActivePickerId(`${item.id}-city`)}
                      disabled={!isItemEditable}
                    >
                      <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !itemDataForDisplay.city && styles.placeholderText, !isItemEditable && styles.disabledText]}>
                        {cityOptions.find(opt => opt.value === itemDataForDisplay.city)?.name || itemDataForDisplay.city || "Joka"}
                      </Text>
                      <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomActionSheetPicker
                      pickerStatus={activePickerId === `${item.id}-city`}
                      setPickerStatus={() => setActivePickerId(null)}
                      title="Select City"
                      optionsData={cityOptions}
                      RenderItem={ActionSheetPickerItem}
                      onPress={(selectedItem) => handleChange(item.id, 'city', selectedItem.value)}
                      selected={itemDataForDisplay.city || 'Joka'}
                      isDisabled={!isItemEditable}
                    />

                    {/* From Date */}
                    <EditableRow
                      label="From Date"
                      value={formatDateTime(itemDataForDisplay.fromdate)}
                      onChangeText={(text) => handleChange(item.id, 'fromdate', text)}
                      isEditing={true}
                      placeholder='DD-MM-YYYY HH:MM'
                      isDatePicker={true}
                      onPressDatePicker={isItemEditable ? () => showDatepicker(item.id, 'fromdate', minDate, maxDate) : null}
                      isDisabled={false}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* From Time */}
                    <EditableRow
                      label="From Time"
                      value={itemDataForDisplay.fromtime || (itemDataForDisplay.fromdate ? formatTimeForApi(null, itemDataForDisplay.fromdate) : '')}
                      onChangeText={(text) => handleChange(item.id, 'fromtime', text)}
                      isEditing={true}
                      placeholder="12:00 AM"
                      isDisabled={!isItemEditable}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* To Date */}
                    <EditableRow
                      label="To Date"
                      value={formatDateTime(itemDataForDisplay.todate)}
                      onChangeText={(text) => handleChange(item.id, 'todate', text)}
                      isEditing={true}
                      placeholder='DD-MM-YYYY HH:MM'
                      isDatePicker={true}
                      onPressDatePicker={isItemEditable ? () => showDatepicker(item.id, 'todate', parseCustomDate(itemDataForDisplay.fromdate), maxDate) : null}
                      isDisabled={false}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* To Time */}
                    <EditableRow
                      label="To Time"
                      value={itemDataForDisplay.totime || (itemDataForDisplay.todate ? formatTimeForApi(null, itemDataForDisplay.todate) : '')}
                      onChangeText={(text) => handleChange(item.id, 'totime', text)}
                      isEditing={true}
                      placeholder="06:47 AM"
                      isDisabled={!isItemEditable}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* System Calculated No of Hours */}
                    <EditableRow
                      label="System Calculated No of Hours"
                      value={itemDataForDisplay.systemHours || calculateHoursDifference(itemDataForDisplay.fromdate, itemDataForDisplay.todate)}
                      isEditing={true}
                      keyboardType="numeric"
                      isDisabled={true}
                      placeholder="0.00"
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* No of Hours */}
                    <EditableRow
                      label="No of Hours"
                      value={itemDataForDisplay.noOfHours}
                      onChangeText={(text) => handleChange(item.id, 'noOfHours', text)}
                      isEditing={true}
                      keyboardType="numeric"
                      placeholder="0.00"
                      isDisabled={!isItemEditable}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* Accommodation Provided By Bank */}
                    <Text allowFontScaling={false} style={styles.dropdownLabel}>Accommodation Provided By Bank:</Text>
                    <TouchableOpacity
                      style={styles.actionSheetTriggerButton}
                      onPress={() => setActivePickerId(`${item.id}-accommodationProvided`)}
                      disabled={!isItemEditable}
                    >
                      <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !isItemEditable && styles.disabledText]}>
                        {ynOptions.find(opt => opt.value === itemDataForDisplay.accommodationProvided)?.name || itemDataForDisplay.accommodationProvided || "No"}
                      </Text>
                      <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomActionSheetPicker
                      pickerStatus={activePickerId === `${item.id}-accommodationProvided`}
                      setPickerStatus={() => setActivePickerId(null)}
                      title="Accommodation Provided By Bank"
                      optionsData={ynOptions}
                      RenderItem={ActionSheetPickerItem}
                      onPress={(selectedItem) => handleChange(item.id, 'accommodationProvided', selectedItem.value)}
                      selected={itemDataForDisplay.accommodationProvided}
                      isDisabled={!isItemEditable}
                    />

                    {/* Boarding Provided By Bank */}
                    <Text allowFontScaling={false} style={styles.dropdownLabel}>Boarding Provided By Bank:</Text>
                    <TouchableOpacity
                      style={styles.actionSheetTriggerButton}
                      onPress={() => setActivePickerId(`${item.id}-boardingProvided`)}
                      disabled={!isItemEditable}
                    >
                      <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !isItemEditable && styles.disabledText]}>
                        {ynOptions.find(opt => opt.value === itemDataForDisplay.boardingProvided)?.name || itemDataForDisplay.boardingProvided || "No"}
                      </Text>
                      <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomActionSheetPicker
                      pickerStatus={activePickerId === `${item.id}-boardingProvided`}
                      setPickerStatus={() => setActivePickerId(null)}
                      title="Boarding Provided By Bank"
                      optionsData={ynOptions}
                      RenderItem={ActionSheetPickerItem}
                      onPress={(selectedItem) => handleChange(item.id, 'boardingProvided', selectedItem.value)}
                      selected={itemDataForDisplay.boardingProvided}
                      isDisabled={!isItemEditable}
                    />

                    {/* Declaration For Boarding Submitted */}
                    <Text allowFontScaling={false} style={styles.dropdownLabel}>Declaration For Boarding Submitted:</Text>
                    <TouchableOpacity
                      style={styles.actionSheetTriggerButton}
                      onPress={() => setActivePickerId(`${item.id}-boardingDeclaration`)}
                      disabled={!isItemEditable}
                    >
                      <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !isItemEditable && styles.disabledText]}>
                        {ynOptions.find(opt => opt.value === itemDataForDisplay.boardingDeclaration)?.name || itemDataForDisplay.boardingDeclaration || "No"}
                      </Text>
                      <Text allowFontScaling={false} style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomActionSheetPicker
                      pickerStatus={activePickerId === `${item.id}-boardingDeclaration`}
                      setPickerStatus={() => setActivePickerId(null)}
                      title="Declaration For Boarding Submitted"
                      optionsData={ynOptions}
                      RenderItem={ActionSheetPickerItem}
                      onPress={(selectedItem) => handleChange(item.id, 'boardingDeclaration', selectedItem.value)}
                      selected={itemDataForDisplay.boardingDeclaration}
                      isDisabled={!isItemEditable}
                    />

                    {/* No of Leave Days */}
                    <EditableRow
                      label="No of Leave Days"
                      value={itemDataForDisplay.noOfLeaveDays}
                      onChangeText={(text) => handleChange(item.id, 'noOfLeaveDays', text)}
                      isEditing={true}
                      keyboardType='numeric'
                      placeholder="0"
                      isDisabled={!isItemEditable}
                      isRequired={true}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* Eligible Amount */}
                    <EditableRow
                      label="Eligible Amount"
                      value={itemDataForDisplay.eligibleAmount || '750'}
                      onChangeText={(text) => handleChange(item.id, 'eligibleAmount', text)}
                      isEditing={true}
                      keyboardType='numeric'
                      placeholder="750"
                      isDisabled={!isItemEditable}
                      placeholderTextColor={CustomColors.textGray}
                      CustomColors={CustomColors}
                      styles={styles}
                    />

                    {/* Claim Amount */}
                    <EditableRow
                      label="Claim Amount"
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
              styles.actionButton,
              styles.submitButton,
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
            <Text allowFontScaling={false} style={styles.actionButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.backButton]}
            onPress={() => navigation.goBack()}
          >
            <Text allowFontScaling={false} style={styles.actionButtonText}>
              Back
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

export default DailyReimbursementScreen;