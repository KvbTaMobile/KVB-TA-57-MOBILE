import React, { useEffect, useState, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  FlatList,
} from 'react-native';
import {
  useLazyGetDailyReimbursementQuery,
  useDailydeimCreateMutation,
  useLazyCommonDropDownGetQuery, // Used for fetching common dropdown data
  useLazyInsertCityQuery, // New: Import the hook for insertCity
  useDailydeimLogicMutation
} from '../../redux/rtk_query/apiSlice';
import { useDispatch, useSelector } from 'react-redux';
import {
  setDailyReimbursementDetails,
  clearDailyReimbursementDetails,
  setDailyDiemDropdown,
  setYnDropdown,
  setCityDropdown,
} from '../../redux/slices/ExpenseSlice';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { getCustomColors } from '../../styles/CustomColors';
import {
  verticalScale,
  horizontalScale,
  moderateScale,
} from '../../styles/Metrics';
import { Fonts } from '../../styles/Fonts';
import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';
import ToastMessage from '../../TaComponents/toast/ToastMessage';
import moment from 'moment';
import * as styless from "../../styles/StyleSheet";
import DateTimePicker from "@react-native-community/datetimepicker";
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}



const EditableRow = ({
  label,
  value,
  onChangeText,
  isEditing,
  keyboardType = 'default',
  multiline = false,
  placeholder = '',
  isDisabled = false,
  isDatePicker = false,
  onPressDatePicker = null,
  isPicker = false,
  onPressPicker = null,
  pickerOptions = [],
  isRequired = false,
  styles,
  CustomColors
}) => (
  <View style={styles.detailItemContainer}>
    <View style={styles.labelContainer}>
      <Text allowFontScaling={false} style={styles.detailLabel}>{label}:</Text>
      {isRequired && <Text allowFontScaling={false} style={{ color: CustomColors.textRed }}>*</Text>}
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
      ) : isPicker ? (
        <TouchableOpacity
          onPress={onPressPicker}
          disabled={isDisabled}
          style={[styles.editableTextInput, isDisabled && styles.disabledInput]}
        >
          <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !value && styles.placeholderText, isDisabled && styles.disabledText]}>
            {value || placeholder}
          </Text>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={moderateScale(20)}
            color={CustomColors.textDarkGray}
          />
        </TouchableOpacity>
      ) : (
        <TextInput allowFontScaling={false}
          style={[styles.editableTextInput, multiline && styles.multilineInput, isDisabled && styles.disabledInput]}
          value={value ? String(value) : ''}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholder={placeholder}
          placeholderTextColor={CustomColors.textLightGray}
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

const DailyReimbursement = ({ route }) => {
  const expense = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || {}
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark)
  const globalStyles = styless.styles(isDark);
  //jjj
  //console.log("claimdata",expense.expenseid)
  //console.log("claimdata",expense.requestercomment)
  const expenseid = expense.expenseid
  const requestercomment = expense.requestercomment
  const navigation = useNavigation();

  const tourId = expense?.tourid || claimdata?.id;
  const employeeCode = expense?.employee_code || claimdata?.employee_code;
  const employeeName = expense?.employee_name || claimdata?.employee_name;
  const travelNo = expense?.crn_no || claimdata?.id;

  const tourFromDate = expense?.startdate || claimdata?.startdate;
  const tourToDate = expense?.enddate || claimdata?.enddate;
  const tourFromDateMS = expense?.startdate_ms || claimdata?.startdate_ms;

  const tourToDateMS = expense?.enddate_ms || claimdata?.enddate_ms;
  //console.log("==============>",tourFromDateMS,tourToDateMS)
  const [isEditable, setIsEditable] = useState(true);
  const claimStatus = route?.params?.claimStatus;
  const expenseHeaderData = route?.params?.expense;
  const [claimStatusId, setClaimStatusId] = useState(null);
  const dispatch = useDispatch();
  const dailyReimbursementDetails = useSelector(
    state => state.expense.details
  );
  const dailyDiemDropdownOptions = useSelector(state => state.expense.dailyDiemDropdown);
  const ynDropdownOptions = useSelector(state => state.expense.ynDropdown);
  const cityDropdownOptions = useSelector(state => state.expense.cityDropdown);

  const [editedItemData, setEditedItemData] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [localAddedItems, setLocalAddedItems] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setError] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'from' or 'to'
  const [activeItemId, setActiveItemId] = useState(null);
  const [timePickerValue, setTimePickerValue] = useState(new Date());

  const [showBoardingPicker, setShowBoardingPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [activePickerItemId, setActivePickerItemId] = useState(null);
  const [triggerGetDailyReimbursement] = useLazyGetDailyReimbursementQuery();
  const [triggerGetEligibleAmount, { isLoading: isEligibleLoading, isError: isEligibleError }] = useDailydeimLogicMutation();

  const [
    triggerDailyReimbursement,
    { isLoading: isSubmitting, isSuccess: submitSuccess, isError: submitError, error: submitErrorData }
  ] = useDailydeimCreateMutation();
  const [triggerDailyDiemDropdown] = useLazyCommonDropDownGetQuery();
  const [triggerYnDropdown] = useLazyCommonDropDownGetQuery();
  // New: Use the insertCity query directly
  const [triggerGetCities, { data: citiesResponse, isLoading: isCitiesLoading, isError: isCitiesError }] = useLazyInsertCityQuery();


  const [submitButtonOpacity] = useState(new Animated.Value(1));

  const styles = StyleSheet.create({
    keyboardAvoidingContainer: {
      flex: 1,
    },
    flatListOverallContent: {
      flexGrow: 1,
      padding: moderateScale(16),
      backgroundColor: CustomColors.appScreenColor,
      paddingBottom: verticalScale(100),
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
    dailyItemsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(20),
      paddingHorizontal: horizontalScale(10),
    },
    mainHeading: {
      fontSize: moderateScale(20),
      fontWeight: 'bold',
      color: CustomColors.appThemeColor,
      marginVertical: verticalScale(15),
      fontFamily: Fonts.bold,
      flex: 1,
    },
    plusicon: {
      padding: moderateScale(5),
    },
    itemCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(12),
      elevation: 3,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      marginBottom: verticalScale(15),
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(16),
      backgroundColor: CustomColors.secondaryBlue + '10',
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.lightGray,
    },
    cardTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.semiBold,
      color: CustomColors.appThemeColor,
      flex: 1,
    },
    cardDetails: {
      padding: moderateScale(16),
      paddingTop: verticalScale(10),
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: verticalScale(12),
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    boldText: {
      fontWeight: '600',
      color: CustomColors.textDark,
      fontSize: moderateScale(15),
      marginRight: horizontalScale(10),
      minWidth: horizontalScale(120),
      fontFamily: Fonts.semiBold,
    },
    detailValueText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDarkGray,
      lineHeight: moderateScale(22),
      fontFamily: Fonts.regular,
      paddingHorizontal: horizontalScale(5),
    },
    noDataText: {
      textAlign: 'center',
      marginTop: moderateScale(30),
      fontSize: moderateScale(16),
      color: CustomColors.textDark,
      padding: moderateScale(20),
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(8),
      marginHorizontal: horizontalScale(16),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.appScreenColor,
    },
    loadingText: {
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
      marginTop: verticalScale(10),
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.appScreenColor,
      padding: moderateScale(20),
    },
    errorText: {
      fontSize: moderateScale(16),
      color: CustomColors.dangerRed,
      marginBottom: verticalScale(10),
      textAlign: 'center',
      fontFamily: Fonts.regular,
    },
    retryButton: {
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      borderRadius: moderateScale(8),
      marginTop: verticalScale(10),
    },
    retryButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
    },
    bottomActionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: CustomColors.cardBackground,
      padding: moderateScale(16),
      borderTopWidth: 1,
      borderTopColor: CustomColors.lightGray,
      alignItems: 'center',
      elevation: 10,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    fullWidthButton: {
      width: '100%',
      paddingVertical: verticalScale(15),
      borderRadius: moderateScale(10),
      alignItems: 'center',
    },
    fullWidthButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(18),
      fontFamily: Fonts.bold,
    },
    detailItemContainer: {
      marginBottom: verticalScale(12),
    },
    detailLabel: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
      marginBottom: verticalScale(4),
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
      paddingTop: verticalScale(10),
    },
    disabledInput: {
      backgroundColor: CustomColors.disableInput,
      color: CustomColors.textGray,
    },
    disabledText: {
      color: CustomColors.disableText,
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
    actionSheetItem: {
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(20),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.lightGray,
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
    },
    keyboardAvoidingContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,

      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },

      headerTintColor: CustomColors.white,

      // ✅ allowFontScaling applied
      headerTitle: () => (
        <Text
          allowFontScaling={false}
          style={{
            ...globalStyles.headerTitle,
            fontSize: moderateScale(20),
            fontWeight: "600",
            color: CustomColors.white,
          }}
        >
          Daily Reimbursement
        </Text>
      ),
    });

    return () => {
      dispatch(clearDailyReimbursementDetails());
    };
  }, [navigation, isDark]);




  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        // Fetch common dropdowns
        const [dailydiemRes, ynRes] = await Promise.all([
          triggerDailyDiemDropdown('dailydiem').unwrap(),
          triggerYnDropdown('yn').unwrap(),
        ]);

        // Fetch cities using insertCity endpoint
        const cityRes = await triggerGetCities({ city_name: '', page: 1 }).unwrap();

        const mappedDailyDiemOptions = (dailydiemRes || []).map(item => ({
          ...item,
          label: item.name,
        }));

        const mappedYnOptions = (ynRes || []).map(item => ({
          ...item,
          label: item.name,
        }));

        // Corrected mapping for city options: Access cityRes.data
        const mappedCityOptions = (cityRes.data || []).map(item => ({
          ...item,
          label: item.name || item.city_name,
          value: item.name?.toString(),
        }));


        dispatch(setDailyDiemDropdown(mappedDailyDiemOptions));
        dispatch(setYnDropdown(mappedYnOptions));
        dispatch(setCityDropdown(mappedCityOptions));
      } catch (err) {
        console.error("Failed to fetch dropdown data:", err);
      }
    };

    fetchDropdownData();
  }, [triggerDailyDiemDropdown, triggerYnDropdown, triggerGetCities, dispatch]);

  useEffect(() => {
    const fetchData = async () => {
      if (!tourId) return;
      try {
        setIsLoading(true);
        setError(null);

        const result = await triggerGetDailyReimbursement(tourId).unwrap();
        // //console.log("result?.data?",result?.data)
        const mappedData = result?.data?.map(item => ({
          id: item.id,
          travel_no: item.tour_id?.toString() || '',
          empcode: employeeCode || '',
          empname: employeeName || '',
          boarding_by_organizer: item.boardingbyorganiser || '',
          sub_category: item.citytype || '',
          city: item.visitcity || '',
          from_datetime: item.fromdate
            ? moment(item.fromdate, "YYYY-MMM-DD HH:mm").format("DD-MMM-YYYY, HH:mm")
            : '',

          to_datetime: item.todate
            ? moment(item.todate, "YYYY-MMM-DD HH:mm").format("DD-MMM-YYYY, HH:mm")
            : '',

          no_of_hours: item.noofhours?.toString() || '',
          food_allowance: item.foodallowance?.toString() || '',
          medical_expenses: item.medicalexpense?.toString() || '',
          bill_no: item.billno || '',
          remarks: item.remarks || '',
          claim_amount: item.claimedamount?.toString() || '',
        })) || [];

        if (mappedData.length === 0 && tourFromDate && tourToDate) {
          const generatedItems = [];
          let currentDate = moment(tourFromDate, "DD-MMM-YYYY");
          const endDate = moment(tourToDate, "DD-MMM-YYYY");

          let tempIdCounter = 0;
          while (currentDate.isSameOrBefore(endDate, 'day')) {
            const dateString = currentDate.format('DD-MMM-YYYY');

            generatedItems.push({
              id: `temp-${tempIdCounter++}-${currentDate.format('YYYYMMDD')}`,
              travel_no: tourId?.toString() || '',
              empcode: employeeCode || '',
              empname: employeeName || '',
              boarding_by_organizer: '',
              sub_category: '',
              city: '',
              from_datetime: `${dateString}, 00:00`,  // Correct → "15-Jul-2025, 00:00"
              to_datetime: `${dateString}, 10:00`,

              no_of_hours: '',
              food_allowance: '',
              medical_expenses: '',
              bill_no: '',
              remarks: '',
              claim_amount: '',
              isNew: true,
            });
            currentDate.add(1, 'days');
          }

          dispatch(setDailyReimbursementDetails(generatedItems));
          const initialEditedData = {};
          generatedItems.forEach(item => {
            initialEditedData[item.id] = { ...item };
          });
          setEditedItemData(initialEditedData);
          setHasUnsavedChanges(true);
        } else {
          dispatch(setDailyReimbursementDetails(mappedData));
          const initialEditedData = {};
          mappedData.forEach(item => {
            initialEditedData[item.id] = { ...item };
          });
          setEditedItemData(initialEditedData);
          setHasUnsavedChanges(false);
        }
      } catch (err) {
        console.error('Fetch failed:', err);
        setError(err?.data?.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      dispatch(clearDailyReimbursementDetails());
    };
  }, [tourId, triggerGetDailyReimbursement, dispatch, employeeCode, employeeName, tourFromDate, tourToDate]);


  useEffect(() => {
    const currentStatusId = Number(claimdata?.claim_status_id); // ✅ Fix: cast to number
    //console.log("claimStatusId ==> ", currentStatusId);

    setClaimStatusId(currentStatusId);

    const editableStatuses = [-1, 1, 5];
    const shouldBeEditable = editableStatuses.includes(currentStatusId);

    setIsEditable(shouldBeEditable);
    //console.log("isEditable:", isEditable, "hasUnsavedChanges:", hasUnsavedChanges, "isSubmitting:", isSubmitting);

  }, [claimdata]);



  useEffect(() => {
    const changesPresent = Object.keys(editedItemData).some(itemId => {
      const originalItem = dailyReimbursementDetails?.find(e => e.id?.toString() === itemId);
      const editedItem = editedItemData[itemId];

      if (itemId.toString().startsWith('temp-')) return true;

      return JSON.stringify(originalItem) !== JSON.stringify(editedItem);
    }) || localAddedItems.length > 0;

    setHasUnsavedChanges(changesPresent);
  }, [editedItemData, localAddedItems, dailyReimbursementDetails]);

  useEffect(() => {
    if (submitSuccess) {
      ToastMessage('Daily reimbursement submitted successfully!');
      setHasUnsavedChanges(false);
      triggerGetDailyReimbursement(tourId);
    }
  }, [submitSuccess, triggerGetDailyReimbursement, tourId]);

  useEffect(() => {
    if (submitError) {
      // console.error('Submission failed:', submitErrorData);
      ToastMessage('Failed to submit daily reimbursement.');
    }
  }, [submitError, submitErrorData]);
  const getEligibleAmount = useCallback(async (item, itemIndex) => {
    try {
      if (!item.from_datetime || !item.to_datetime) {
        ToastMessage("From and To date/time are required", "error");
        return false;
      }

      const fromMoment = moment(item.from_datetime, "DD-MMM-YYYY, HH:mm");
      const toMoment = moment(item.to_datetime, "DD-MMM-YYYY, HH:mm");

      if (!fromMoment.isValid() || !toMoment.isValid()) {
        ToastMessage("Invalid date/time format", "error");
        return false;
      }

      const payload = {
        citytype: item.sub_category || "",
        boardingbyorganiser: item.boarding_by_organizer === "YES" ? "YES" : "NO",
        fromdate: fromMoment.format("YYYY-MM-DD HH:mm:ss"),
        todate: toMoment.format("YYYY-MM-DD HH:mm:ss"),
        tourgid: item.travel_no,
        expensegid: expenseid,
      };

      const response = await triggerGetEligibleAmount(payload).unwrap();

      const eligible = response?.Eligible_amount;
      const sys_hours = response?.noofhours;
      const days = response?.noofdays;

      const updatedDetails = dailyReimbursementDetails.map((row, idx) => {
        if (idx === itemIndex) {
          return {
            ...row,
            eligibleamount: eligible,
            no_of_hours: sys_hours,
            noofdays: days,
          };
        }
        return row;
      });

      dispatch(setDailyReimbursementDetails(updatedDetails));

      if (sys_hours < 9) {
        ToastMessage("Minimum 9 Hours Required For Eligible", "error");
      }

      return true;
    } catch (err) {
      console.error("Eligible Amount Error:", err);
      ToastMessage(err?.data?.message || "Failed to get eligible amount", "error");
      return false;
    }
  }, [dailyReimbursementDetails, dispatch, triggerGetEligibleAmount]);


  const DropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected = selected === options.value;
    return (
      <TouchableOpacity
        style={[
          styles.actionSheetItem,
          isSelected && styles.actionSheetItemSelected,
        ]}
        onPress={() => {
          onPress(options.value);
          setPickerStatus(false);
        }}
      >
        <Text allowFontScaling={false}
          style={[
            styles.actionSheetItemText,
            isSelected && styles.actionSheetItemSelectedText,
          ]}
        >
          {options.label}
        </Text>
      </TouchableOpacity>
    );
  };
  const handleInputChange = useCallback((value, itemId, field) => {
    setEditedItemData(prevData => {
      const newData = { ...prevData };
      newData[itemId] = {
        ...(newData[itemId] || {}),
        [field]: value,
      };
      return newData;
    });
    setHasUnsavedChanges(true);
  }, []);

  const validateNumericInput = (value, fieldName) => {
    if (
      fieldName.includes('allowance') ||
      fieldName.includes('expenses') ||
      fieldName.includes('amount') ||
      fieldName.includes('no_of_hours')
    ) {
      if (value === '') return true;
      return !isNaN(value) && parseFloat(value) >= 0;
    }
    return true;
  };

  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const handleDeleteItem = useCallback(itemId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this expense item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
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
          },
        },
      ]
    );
  }, []);

  const allDailyReimbursementItems = useMemo(() => {
    const existingItems = dailyReimbursementDetails.map(item => ({
      ...item,
      food_allowance: String(item.food_allowance || ''),
      medical_expenses: String(item.medical_expenses || ''),
      claim_amount: String(item.claim_amount || ''),
      travel_no: String(item.travel_no || ''),
      no_of_hours: String(item.no_of_hours || ''),
    }));
    return [...existingItems, ...localAddedItems];
  }, [dailyReimbursementDetails, localAddedItems]);



  const handleSubmit = async () => {
    if (!hasUnsavedChanges || !isEditable || isSubmitting) return;

    const itemsToSubmit = Object.values(editedItemData).filter(item => {
      const originalItem = dailyReimbursementDetails.find(e => e.id === item.id);
      return item.id.toString().startsWith('temp-') || JSON.stringify(originalItem) !== JSON.stringify(item);
    });

    if (itemsToSubmit.length === 0) {
      ToastMessage("There are no unsaved changes to submit.");
      return;
    }

    const allValidationErrors = [];
    const mandatoryFields = ['boarding_by_organizer', 'sub_category', 'city', 'food_allowance', 'medical_expenses', 'claim_amount'];

    for (const item of itemsToSubmit) {
      const itemErrors = [];

      for (const field of mandatoryFields) {
        if (!item[field] || String(item[field]).trim() === '') {
          itemErrors.push(`"${field}" is mandatory.`);
        }
      }

      const numericFields = ['food_allowance', 'medical_expenses', 'claim_amount', 'no_of_hours'];
      for (const numField of numericFields) {
        if (item[numField] && isNaN(parseFloat(item[numField]))) {
          itemErrors.push(`"${numField}" must be a valid number.`);
        }
      }

      if (itemErrors.length > 0) allValidationErrors.push(...itemErrors);
    }

    if (allValidationErrors.length > 0) {
      ToastMessage("Please fill all mandatory fields.");
      return;
    }

    try {
      for (let i = 0; i < itemsToSubmit.length; i++) {
        const item = itemsToSubmit[i];
        const success = await getEligibleAmount(item, i);
        if (!success) return;
      }

      const updatedItems = itemsToSubmit.map(item => {
        const reduxItem = dailyReimbursementDetails.find(e => e.id === item.id || e.temp_id === item.id);

        const fromMoment = moment(item.from_datetime, "DD-MMM-YYYY, HH:mm");
        const toMoment = moment(item.to_datetime, "DD-MMM-YYYY, HH:mm");

        return {
          tour_id: item.travel_no,
          claimedamount: parseFloat(item.claim_amount) || 0,
          requestercomment: requestercomment || "",
          city: null,

          fromdate: fromMoment.isValid() ? fromMoment.format("YYYY-MM-DD HH:mm:ss") : null,
          fromtime: fromMoment.isValid() ? fromMoment.format("HH:mm") : null,
          todate: toMoment.isValid() ? toMoment.format("YYYY-MM-DD HH:mm:ss") : null,
          totime: toMoment.isValid() ? toMoment.format("HH:mm") : null,

          syshours: parseFloat(reduxItem?.no_of_hours) || 0,
          expensegid: expenseid,
          eligibleamount: parseFloat(reduxItem?.eligibleamount) || 0,

          boardingbyorganiser: item.boarding_by_organizer === "YES" ? "YES" : "NO",
          billno: item.bill_no || null,
          remarks: item.remarks || null,
          visitcity: item.city || "",
          citytype: item.sub_category || "",
          foodallowance: parseFloat(item.food_allowance) || 0,
          medicalexpense: parseFloat(item.medical_expenses) || 0
        };
      });

      const payload = { data: updatedItems };
      const response = await triggerDailyReimbursement(payload).unwrap();

      setHasUnsavedChanges(false);
      ToastMessage(response?.message || "Submission Successful!");

      navigation.goBack();
    } catch (err) {
      // const errorMessage = err?.data?.message || "An error occurred during submission. Please try again.";
      // ToastMessage(`Submission Failed: ${errorMessage}`);
    }
  };



  const renderDailyReimbursementItem = useCallback(({ item }) => {
    const isExpanded = expandedItems[item.id];
    const currentItemData = editedItemData[item.id] || item;
    const isTempItem = item.id?.toString().startsWith('temp-');
    const isItemEditable = isEditable || isTempItem;

    const handleNumericInputValidate = (text, key, itemId, stateKey) => {
      const updatedValue = text.replace(/[^0-9.]/g, ''); // remove non-numeric input

      setEditedItemData(prev => {
        const updatedItem = {
          ...prev[itemId],
          [key]: updatedValue
        };

        // Auto calculate claim_amount only if food/medical updated
        if (key === 'food_allowance' || key === 'medical_expenses') {
          const food = parseFloat(updatedItem.food_allowance) || 0;
          const medical = parseFloat(updatedItem.medical_expenses) || 0;
          updatedItem.claim_amount = (food + medical).toFixed(2);
        }

        return {
          ...prev,
          [itemId]: updatedItem
        };
      });
    };


    return (
      <View key={item.id} style={styles.itemCard}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          onLongPress={() => isItemEditable && handleDeleteItem(item.id)}
          style={styles.cardHeader}
          activeOpacity={0.7}
        >
          <Text allowFontScaling={false} style={styles.cardTitle}>
            {currentItemData.city || 'New Item'} ({currentItemData.from_datetime || 'Date'})
          </Text>
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={28}
            color={CustomColors.appThemeColor}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardDetails}>
            <EditableRow
              label="Boarding by Organizer"
              value={currentItemData.boarding_by_organizer}
              isPicker={true}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setShowBoardingPicker(true);
              }}
              placeholder="Select Boarding Option"
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Sub Category"
              value={currentItemData.sub_category}
              isPicker={true}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setShowSubCategoryPicker(true);
              }}
              placeholder="Select Sub Category"
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="City"
              value={currentItemData.city}
              isPicker={true}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setShowCityPicker(true);
              }}
              placeholder="Select City"
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="From Date and Time"
              value={moment(currentItemData.from_datetime, "DD-MMM-YYYY, HH:mm").format("DD-MMM-YYYY, HH:mm")}
              isDatePicker={true}
              isEditing={isItemEditable}
              onPressDatePicker={() => {
                setActiveField('from'); // or 'to'
                setActiveItemId(item.id);
                const initial = moment(item.from_datetime, "DD-MMM-YYYY, HH:mm").toDate();
                setTimePickerValue(initial);
                setShowTimePicker(true);
              }}
              placeholder="HH:mm"
              isDisabled={!isItemEditable}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />

            <EditableRow
              label="To Date and Time"
              value={moment(currentItemData.to_datetime, "DD-MMM-YYYY, HH:mm").format("DD-MMM-YYYY, HH:mm")}
              isDatePicker={true}
              isEditing={isItemEditable}
              onPressDatePicker={() => {
                setActiveField('to');
                setActiveItemId(item.id);
                const initial = moment(item.to_datetime, "DD-MMM-YYYY, HH:mm").toDate();
                setTimePickerValue(initial);
                setShowTimePicker(true);
              }}
              placeholder="HH:mm"
              isDisabled={!isItemEditable}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />

            <EditableRow
              label="No of Hours"
              value={currentItemData.no_of_hours}
              onChangeText={text => handleNumericInputValidate(text, 'no_of_hours', item.id, 'no_of_hours')}
              isEditing={isItemEditable}
              keyboardType="numeric"
              isDisabled={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Food Allowance"
              value={currentItemData.food_allowance}
              onChangeText={text => handleNumericInputValidate(text, 'food_allowance', item.id, 'food_allowance')}
              isEditing={isItemEditable}
              keyboardType="numeric"
              isDisabled={!isItemEditable}
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Medical Expenses"
              value={currentItemData.medical_expenses}
              isRequired={true}
              onChangeText={text => handleNumericInputValidate(text, 'medical_expenses', item.id, 'medical_expenses')}
              isEditing={isItemEditable}
              keyboardType="numeric"
              isDisabled={!isItemEditable}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Bill Number"
              value={currentItemData.bill_no}
              onChangeText={text => handleInputChange(text, item.id, 'bill_no')}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Remarks"
              value={currentItemData.remarks}
              onChangeText={text => handleInputChange(text, item.id, 'remarks')}
              isEditing={isItemEditable}
              multiline={true}
              isDisabled={!isItemEditable}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            {/* <EditableRow
              label="Claim Amount (INR)"
              value={currentItemData.claim_amount}
              onChangeText={text => handleNumericInputValidate(text, 'claim_amount', item.id, 'claim_amount')}
              isEditing={isItemEditable}
              keyboardType="numeric"
              isDisabled={!isItemEditable}
              isRequired={true}

            /> */}
            <EditableRow
              label="Claim Amount (INR)"
              value={currentItemData.claim_amount}
              isEditing={false} // Prevents editing
              isDisabled={true} // Also disables touch
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />

          </View>
        )}
      </View>
    );
  }, [editedItemData, expandedItems, isEditable, toggleExpand, handleDeleteItem, handleInputChange, validateNumericInput]);

  const ListHeader = useCallback(() => (
    <>
      <View style={styles.sectionCard}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>Travel Overview</Text>
        <View style={styles.detailRow}>
          <Text allowFontScaling={false} style={styles.boldText}>Tour No:</Text>
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

      <View style={styles.dailyItemsHeader}>
        <Text allowFontScaling={false} style={styles.mainHeading}>Daily Reimbursement Items</Text>
      </View>

      {allDailyReimbursementItems.length === 0 && (
        <Text allowFontScaling={false} style={styles.noDataText}>No daily reimbursement items found for the selected tour dates.</Text>
      )}
    </>
  ), [travelNo, employeeCode, employeeName, allDailyReimbursementItems.length]);

  const ListFooter = useCallback(() => (
    <View style={{ height: verticalScale(100) }} />
  ), []);


  if (isLoading || isCitiesLoading) { // Also check for city data loading
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={styles.loadingText}>Please Wait...</Text>
      </View>
    );
  }



  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <FlatList
        data={allDailyReimbursementItems}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderDailyReimbursementItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.flatListOverallContent}
        keyboardShouldPersistTaps="handled"
      />

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
            onPress={handleSubmit}
            disabled={!hasUnsavedChanges || isSubmitting || !isEditable}
          >
            <Text allowFontScaling={false} style={styles.fullWidthButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}



      {activePickerItemId && (
        <CustomActionSheetPicker
          pickerStatus={showBoardingPicker}
          setPickerStatus={setShowBoardingPicker}
          title="Select Boarding Option"
          optionsData={ynDropdownOptions}
          RenderItem={DropdownItem}
          onPress={(value) => {
            handleInputChange(value, activePickerItemId, 'boarding_by_organizer');
          }}
          selected={editedItemData[activePickerItemId]?.boarding_by_organizer}
        />
      )}

      {activePickerItemId && (
        <CustomActionSheetPicker
          pickerStatus={showSubCategoryPicker}
          setPickerStatus={setShowSubCategoryPicker}
          title="Select Sub Category"
          optionsData={dailyDiemDropdownOptions}
          RenderItem={DropdownItem}
          onPress={(value) => {
            handleInputChange(value, activePickerItemId, 'sub_category');
          }}
          selected={editedItemData[activePickerItemId]?.sub_category}
        />
      )}

      {activePickerItemId && (
        <CustomActionSheetPicker
          pickerStatus={showCityPicker}
          setPickerStatus={setShowCityPicker}
          title="Select City"
          optionsData={cityDropdownOptions}
          RenderItem={DropdownItem}
          onPress={(value) => {
            handleInputChange(value, activePickerItemId, 'city');
          }}
          selected={editedItemData[activePickerItemId]?.city}
        />

      )}
      {/* Time Picker Modal for From Time */}
      {showTimePicker && (
        <DateTimePicker
          value={timePickerValue}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            if (event.type === 'dismissed') {
              setShowTimePicker(false);
              return;
            }

            setShowTimePicker(false);

            const selected = moment(selectedTime || timePickerValue);

            setEditedItemData(prev => {
              const updated = { ...prev };
              const item = updated[activeItemId];
              if (!item) return prev;

              const existingDateStr =
                activeField === 'from' ? item.from_datetime : item.to_datetime;

              // Extract existing date part and combine with new time
              const existingMoment = moment(existingDateStr, "DD-MMM-YYYY, HH:mm");
              const updatedDateTime = moment(existingMoment)
                .set({
                  hour: selected.hour(),
                  minute: selected.minute(),
                  second: 0,
                })
                .format("DD-MMM-YYYY, HH:mm");

              if (activeField === 'from') {
                item.from_datetime = updatedDateTime;
              } else {
                item.to_datetime = updatedDateTime;
              }

              return updated;
            });
          }}
        />
      )}


    </KeyboardAvoidingView>
  );
};

export default DailyReimbursement;