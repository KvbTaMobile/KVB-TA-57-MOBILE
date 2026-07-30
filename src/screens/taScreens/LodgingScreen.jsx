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
  useLazyGetLodgingQuery,
  useLodgingCreateMutation,
  useLazyCommonDropDownGetQuery,
  useLazyInsertCityQuery,
  useLodgingEligibleAmtMutation
} from '../../redux/rtk_query/apiSlice';
import { useDispatch, useSelector } from 'react-redux';
import {
  setLodgingDetails,
  clearLodgingDetails,
  setCityDropdown,
  setLodgingSubCategoryDropdown,
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as styless from "../../styles/StyleSheet";
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
  CustomColors,
}) => (
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

const LodgingReimbursement = ({ route }) => {
  const expense = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || {}
  const navigation = useNavigation();

  const tourId = expense?.tourid || claimdata?.id;
  const employeeCode = expense?.employee_code || claimdata?.employee_code;
  const employeeName = expense?.employee_name || claimdata?.employee_name;
  const travelNo = expense?.crn_no || claimdata?.id;

  const expenseid = expense.expenseid;
  const requestercomments = expense.requestercomment;

  const minDate = useMemo(() => moment(claimdata?.startdate, "DD-MMM-YYYY").startOf('day').toDate(), [claimdata?.startdate]);
  const maxDate = useMemo(() => moment(claimdata?.enddate, "DD-MMM-YYYY").endOf('day').toDate(), [claimdata?.enddate]);

  const [isEditable, setIsEditable] = useState(true);
  const [claimStatusId, setClaimStatusId] = useState(null);

  const dispatch = useDispatch();
  const lodgingDetails = useSelector(state => state.expense.lodgingDetails);
  const cityDropdownOptions = useSelector(state => state.expense.cityDropdown);
  const lodgingSubCategoryDropdownOptions = useSelector(state => state.expense.lodgingSubCategoryDropdown);

  const [editedItemData, setEditedItemData] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  //console.log("expandedItems",expandedItems)
  const [localAddedItems, setLocalAddedItems] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setError] = useState(null);
  const [dateMin, setDateMin] = useState(null);
  const [dateMax, setDateMax] = useState(null);
  const [isSubmit, setIsSubmitting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [activePickerItemId, setActivePickerItemId] = useState(null);
  const [deletedItemIds, setDeletedItemIds] = useState([]);

  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [cityPage, setCityPage] = useState(1);
  const [cityHasNext, setCityHasNext] = useState(true);
  const [isFetchingMoreCities, setIsFetchingMoreCities] = useState(false);
  const [allCities, setAllCities] = useState([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark)
  const globalStyles = styless.styles(isDark);
  const DropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected = selected === options.label; // Changed to compare with options.label
    return (
      <TouchableOpacity
        style={[
          styles.actionSheetItem,
          isSelected && styles.actionSheetItemSelected,
        ]}
        onPress={() => {
          onPress(options.label);
          setPickerStatus(false);
        }}
      >
        <Text allowFontScaling={false}
          style={[
            styles.actionSheetItemText,
            isSelected && styles.actionSheetItemSelectedText,
          ]}
        >
          {options.label} {/* Changed to display options.label */}
        </Text>
      </TouchableOpacity>
    );
  };



  const [triggerGetLodging] = useLazyGetLodgingQuery();
  const [
    triggerLodgingSubmission,
    { isLoading: isSubmitting, isSuccess: submitSuccess, isError: submitError, error: submitErrorData }
  ] = useLodgingCreateMutation();
  const [triggerGetCities, { isLoading: isCitiesLoading, isError: isCitiesError }] = useLazyInsertCityQuery();
  const [triggerCommonDropdown, { isLoading: isSubCategoryLoading, isError: isSubCategoryError }] = useLazyCommonDropDownGetQuery();
  const [triggerLodgingEligibleAmt] = useLodgingEligibleAmtMutation();

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
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: verticalScale(12),
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    boldText: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
    },
    detailValueText: {
      fontFamily: Fonts.regular,
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      flexShrink: 1,
      marginLeft: horizontalScale(10),
      textAlign: 'right',
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
      backgroundColor: CustomColors.backgroundGray2,
      marginHorizontal: horizontalScale(15),
      marginBottom: verticalScale(10),
      borderRadius: 8,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: CustomColors.appliteThemecolor,
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(15),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.lightGray,
    },
    cardTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor,
      flex: 1,
    },
    cardDetails: {
      padding: moderateScale(15),
    },
    detailItemContainer: {
      marginBottom: verticalScale(10),
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(5),
    },
    detailLabel: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.bold,
      color: CustomColors.textDarkGray,
    },
    editableTextInput: {
      borderWidth: 1,
      borderColor: CustomColors.lightGray,
      borderRadius: 5,
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
      backgroundColor: CustomColors.lightGray,
      color: CustomColors.textGray,
    },
    disabledText: {
      color: CustomColors.textLightGray,
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
      fontFamily: Fonts.bold,
      color: CustomColors.primaryBlue,
    },
    bottomActionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: CustomColors.backgroundWhite,
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(15),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CustomColors.lightGray,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 8,
    },
    fullWidthButton: {
      width: '100%',
      paddingVertical: verticalScale(15),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidthButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
    },
    noDataText: {
      textAlign: 'center',
      marginTop: verticalScale(20),
      fontSize: moderateScale(15),
      color: CustomColors.textGray,
      fontFamily: Fonts.regular,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.backgroundGray2,
    },
    loadingText: {
      marginTop: verticalScale(10),
      fontSize: moderateScale(16),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.backgroundGray2,
      padding: horizontalScale(20),
    },
    errorText: {
      textAlign: 'center',
      fontSize: moderateScale(16),
      fontFamily: Fonts.regular,
      color: CustomColors.errorRed,
      marginBottom: verticalScale(10),
    },
    retryButton: {
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      borderRadius: 8,
      marginTop: verticalScale(10),
    },
    retryButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(15),
      fontFamily: Fonts.bold,
    },
  });


  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,

      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },

      headerTintColor: CustomColors.white,

      // ✅ Custom header title with allowFontScaling
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
          Lodging/Homestay Expense
        </Text>
      ),
    });

    return () => {
      dispatch(clearLodgingDetails());
    };
  }, [navigation, dispatch, isDark]);



  const handleCitySearch = (text) => {
    setCitySearchTerm(text);
    setCityPage(1); // restart search
  };

  const handleLoadMoreCities = () => {
    if (cityHasNext && !isFetchingMoreCities) {
      setCityPage(prev => prev + 1);
    }
  };


  // Fetch dropdown data (Cities, Sub Categories)
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        if (cityPage === 1);
        const cityRes = await triggerGetCities({ city_name: citySearchTerm, page: cityPage }).unwrap();
        const subCategoryRes = await triggerCommonDropdown('lodge_homestay').unwrap();

        const mappedCityOptions = (cityRes.data || []).map(item => ({
          ...item,
          label: item.name || item.city_name,
          value: item.name?.toString(),
        }));

        setAllCities(prev =>
          cityPage === 1 ? mappedCityOptions : [...prev, ...mappedCityOptions]
        );

        setCityHasNext(cityRes.pagination?.has_next ?? false);

        const mappedSubCategoryOptions = (subCategoryRes || []).map(item => ({
          ...item,
          label: item.name,
          value: item.value || item.id?.toString(),
        }));


        dispatch(setCityDropdown(mappedCityOptions));
        dispatch(setLodgingSubCategoryDropdown(mappedSubCategoryOptions));

        if (showCityPicker) {
          fetchCities();
        }
      } catch (err) {
        // console.error('Fetch dropdown data failed:', err); // Log error for debugging
      }
    };
    fetchDropdownData();
  }, [triggerGetCities, triggerCommonDropdown, dispatch, cityPage, citySearchTerm, showCityPicker]);

  // Wrapped fetchData in useCallback to prevent infinite re-renders
  const fetchData = useCallback(async () => {
    if (!tourId) return;
    try {
      setIsLoading(true);
      setError(null);

      const result = await triggerGetLodging(tourId).unwrap();
      const mappedData = result?.data?.map(item => ({
        id: item.id,
        travel_no: item.tour_id?.toString() || '',
        empcode: employeeCode || '',
        empname: employeeName || '',
        sub_category: item.Lodge_Homestay || '',
        city: item.city || '',
        checkin_datetime: item.fromdate
          ? moment(item.fromdate, "YYYY-MMM-DD HH:mm").format("DD-MMM-YYYY, HH:mm")
          : '',
        checkout_datetime: item.todate
          ? moment(item.todate, "YYYY-MMM-DD HH:mm").format("DD-MMM-YYYY, HH:mm")
          : '',
        bill_no: item.billno || '',
        total_bill_amount: item.Billamountexculdingtax?.toString() || '',
        claim_amount: item.claimedamount?.toString() || '',
        tax_only: item.taxonly?.toString() || '',
        remarks: item.remarks || '',
        vendor_name: item.vendorname || '',
        eligible_amount: item.eligibleamount?.toString() || '',
        approved_amount: item.approvedamount?.toString() || '',
        lodge_type: item.Lodge_Homestay || '',
        metro_nonmetro: item.metro_nonmetro || '',
      })) || [];

      dispatch(setLodgingDetails(mappedData));
      const initialEditedData = {};
      mappedData.forEach(item => {
        initialEditedData[item.id] = { ...item };
      });
      setEditedItemData(initialEditedData);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Fetch lodging data failed:', err); // Log error for debugging
      setError(err?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [tourId, employeeCode, employeeName, triggerGetLodging, dispatch]);

  // Call fetchData when its dependencies change
  useEffect(() => {
    fetchData();
    // Cleanup function for Redux state (important for component unmount)
    return () => {
      dispatch(clearLodgingDetails());
    };
  }, [fetchData, dispatch]); // fetchData is now a stable dependency

  // Set editability based on claim status
  useEffect(() => {
    const currentStatusId = Number(claimdata?.claim_status_id);
    setClaimStatusId(currentStatusId);
    const editableStatuses = [-1, 1, 5];
    const shouldBeEditable = editableStatuses.includes(currentStatusId);
    setIsEditable(shouldBeEditable);
  }, [claimdata]);

  // Track unsaved changes
  useEffect(() => {
    const changesPresent = Object.keys(editedItemData).some(itemId => {
      const originalItem = lodgingDetails?.find(e => e.id?.toString() === itemId);
      const editedItem = editedItemData[itemId];

      if (itemId.toString().startsWith('temp-')) return true;

      if (originalItem && !deletedItemIds.includes(itemId)) {
        return JSON.stringify(originalItem) !== JSON.stringify(editedItem);
      }
      return false;
    }) || localAddedItems.length > 0 || deletedItemIds.length > 0;

    setHasUnsavedChanges(changesPresent);
  }, [editedItemData, localAddedItems, lodgingDetails, deletedItemIds]);

  // Toast messages for submission success/error
  useEffect(() => {
    if (submitSuccess) {
      ToastMessage('Lodging expense submitted successfully!');
      setHasUnsavedChanges(false);
      setLocalAddedItems([]);
      setDeletedItemIds([]);
      fetchData(); // Re-fetch all data to get latest from backend
    }
  }, [submitSuccess, fetchData]);

  useEffect(() => {
    if (submitError) {
      ToastMessage(submitErrorData?.data?.description || submitErrorData?.message || 'Failed to submit lodging expense.');
    }
  }, [submitError, submitErrorData]);

  // Handle input changes for editedItemData
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

  // Wrap handleClaimAmountChange in useCallback
  const handleClaimAmountChange = useCallback(async (text, itemId) => {
    handleInputChange(text, itemId, 'claim_amount');
    const item = {
      ...lodgingDetails.find(i => i.id === itemId), // Get original item
      ...editedItemData[itemId], // Overlay with current edits
      claim_amount: text, // Apply the specific change
    };

    if (!item.checkin_datetime || !item.checkout_datetime || !item.city || !item.sub_category) {
      return;
    }

    const checkinMoment = moment(item.checkin_datetime, "DD-MMM-YYYY, HH:mm");
    const checkoutMoment = moment(item.checkout_datetime, "DD-MMM-YYYY, HH:mm");

    if (!checkinMoment.isValid() || !checkoutMoment.isValid()) return;

    const payload = {
      Lodge_Homestay: item.sub_category,
      fromdate: checkinMoment.format("YYYY-MM-DD HH:mm:ss"),
      todate: checkoutMoment.format("YYYY-MM-DD HH:mm:ss"),
      city: item.city,
      expensegid: expenseid,
    };
    try {
      const res = await triggerLodgingEligibleAmt(payload).unwrap();
      const eligibleAmount = parseFloat(res?.Eligible_amount || 0);
      handleInputChange(eligibleAmount.toString(), itemId, 'eligible_amount'); // Ensure eligible_amount is string
      const claim = parseFloat(text || 0);
      if (claim > eligibleAmount) {
        ToastMessage("Claim amount exceeds eligible amount. Please provide justification in Remarks.");
      }
    } catch (err) {
      ToastMessage("Failed to fetch eligible amount.");
    }
  }, [handleInputChange, lodgingDetails, editedItemData, expenseid, triggerLodgingEligibleAmt]);


  // Numeric input validation (total bill, claim amount, tax) - unchanged
  const validateNumericInput = (value, fieldName) => {
    if (
      fieldName.includes('amount') ||
      fieldName.includes('tax')
    ) {
      if (value === '') return true;
      return !isNaN(value) && parseFloat(value) >= 0;
    }
    return true;
  };

  // Toggle item expansion
  // const toggleExpand = useCallback((id) => {
  //   LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  //   setExpandedItems(prev => ({
  //     ...prev,
  //     [id]: !prev[id]
  //   }));
  // }, [expandedItems]);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };


  const parseCustomDate = (value) => {
    const parsed = moment(value, "DD-MMM-YYYY, HH:mm", true);
    return parsed.isValid() ? parsed.toDate() : new Date();
  };

  const showDatepicker = (itemId, field, minDate, maxDate) => {
    if (!isEditable && !itemId?.toString().startsWith('temp-')) return;
    setActiveItemId(itemId);
    setActiveDateField(field);
    setDateMin(minDate);
    setDateMax(maxDate);
    const currentVal = parseCustomDate(editedItemData[itemId]?.[field]) || new Date();
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
            onChange: (event2, selectedTime) => {
              if (event2.type === "dismissed" || !selectedTime) return;
              const combined = new Date(selectedDate);
              combined.setHours(selectedTime.getHours());
              combined.setMinutes(selectedTime.getMinutes());
              const formatted = moment(combined).format("DD-MMM-YYYY, HH:mm");
              handleInputChange(formatted, itemId, field);
            }
          });
        }
      });
    } else {
      setDatePickerValue(currentVal);
      setShowDatePicker(true);
    }
  };

  // Delete item
  const handleDeleteItem = useCallback(itemId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this lodging expense item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // If it's an existing item, add its ID to deletedItemIds
            if (!itemId.toString().startsWith('temp-')) {
              setDeletedItemIds(prev => [...prev, itemId]);
            }
            // Remove from editedItemData and localAddedItems
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



  // Combine existing and locally added items for display
  const allLodgingItems = useMemo(() => {
    const existingItems = lodgingDetails
      .filter(item => !deletedItemIds.includes(item.id)) // Filter out deleted existing items
      .map(item => ({
        ...item,
        // Overlay with any edits from editedItemData
        ...(editedItemData[item.id] || {}),
        total_bill_amount: String(editedItemData[item.id]?.total_bill_amount || item.total_bill_amount || ''),
        claim_amount: String(editedItemData[item.id]?.claim_amount || item.claim_amount || ''),
        tax_only: String(editedItemData[item.id]?.tax_only || item.tax_only || ''),
      }));

    const newItems = localAddedItems.map(item => ({
      ...item,
      // Overlay with any edits from editedItemData for new items
      ...(editedItemData[item.id] || {}),
      total_bill_amount: String(editedItemData[item.id]?.total_bill_amount || item.total_bill_amount || ''),
      claim_amount: String(editedItemData[item.id]?.claim_amount || item.claim_amount || ''),
      tax_only: String(editedItemData[item.id]?.tax_only || item.tax_only || ''),
    }));

    return [...existingItems, ...newItems];
  }, [lodgingDetails, localAddedItems, deletedItemIds, editedItemData]);


  const handleAddNewItem = useCallback(() => {
    const tempId = `temp-${Date.now()}`;
    const newItem = {
      id: tempId,
      travel_no: tourId?.toString() || '',
      empcode: employeeCode || '',
      empname: employeeName || '',
      sub_category: '',
      city: '',
      checkin_datetime: '',
      checkout_datetime: '',
      bill_no: '',
      total_bill_amount: '',
      claim_amount: '',
      tax_only: '',
      remarks: '',
      vendor_name: '',
      isNew: true,
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
    setHasUnsavedChanges(true);
  }, [tourId, employeeCode, employeeName]);


  const handleSubmit = async () => {
    //console.log("🚀 handleSubmit triggered");
    // if (!isEditable || isSubmitting) {
    //   //console.log("⛔ Early return — isEditable:", isEditable, "isSubmitting:", isSubmitting);
    //   return;
    // }

    if (allLodgingItems.length === 0 && deletedItemIds.length === 0) {
      ToastMessage("No changes to submit.");
      return;
    }

    const allValidationErrors = [];

    // Validate all items that will be sent in the payload (i.e., allLodgingItems)
    try {
      for (const item of allLodgingItems) {
        const itemErrors = [];
        const requiredFields = [
          { key: 'sub_category', label: 'Sub Category' },
          { key: 'city', label: 'City' },
          { key: 'checkin_datetime', label: 'Check-in DateTime' },
          { key: 'checkout_datetime', label: 'Checkout DateTime' },
          { key: 'total_bill_amount', label: 'Total Bill Amount' },
          { key: 'claim_amount', label: 'Claim Amount' },
          { key: 'vendor_name', label: 'Vendor Name' },
        ];

        for (const { key, label } of requiredFields) {
          const val = item[key];
          if (!val || String(val).trim() === '') {
            itemErrors.push(`Please fill ${label}`);
          }
        }

        const checkin = moment(item.checkin_datetime, "DD-MMM-YYYY, HH:mm");
        const checkout = moment(item.checkout_datetime, "DD-MMM-YYYY, HH:mm");

        if (!checkin.isValid()) itemErrors.push("Invalid Check-in DateTime");
        if (!checkout.isValid()) itemErrors.push("Invalid Checkout DateTime");
        if (checkin.isValid() && checkout.isValid() && checkout.isSameOrBefore(checkin)) {
          itemErrors.push("Checkout must be after Check-in.");
        }

        const claim = parseFloat(item.claim_amount || 0);
        const eligible = parseFloat(item.eligible_amount || 0);
        if (claim > eligible && (!item.remarks || item.remarks.trim() === '')) {
          itemErrors.push("Remarks required if claim exceeds eligible amount.");
        }

        if (itemErrors.length > 0) {
          allValidationErrors.push(`Vendor (${item.vendor_name || 'New'}): ${itemErrors.join(', ')}`);
        }
      }

      if (allValidationErrors.length > 0) {
        ToastMessage(`Please fix the following:\n${allValidationErrors.join('\n')}`);
        return;
      }

      setIsSubmitting(true);

      const finalPayloadData = allLodgingItems.map(item => { // Use allLodgingItems for the payload
        const checkin = moment(item.checkin_datetime, "DD-MMM-YYYY, HH:mm");
        const checkout = moment(item.checkout_datetime, "DD-MMM-YYYY, HH:mm");

        const baseItem = {
          tour_id: Number(tourId),
          fromdate: checkin.format("YYYY-MM-DD HH:mm:ss"),
          todate: checkout.format("YYYY-MM-DD HH:mm:ss"),
          fromtime: checkin.format("HH:mm"),
          totime: checkout.format("HH:mm"),
          expensegid: Number(expenseid),
          city: item.city?.trim(),
          Lodge_Homestay: item.sub_category,
          metro_nonmetro: item.metro_nonmetro || 'METRO',
          placeofactualstay: null,
          accbybank: "0",
          acrefno: 0,
          billno: item.bill_no?.toString().trim() || `INV-${Date.now()}`,
          remarks: item.remarks || '',
          Billamountexculdingtax: Number(item.total_bill_amount) || 0,
          taxonly: Number(item.tax_only) || 0,
          hsncode: item.hsncode || '',
          vendorname: item.vendor_name || '',
          claimedamount: Number(item.claim_amount) || 0,
          eligibleamount: Number(item.eligible_amount) || 0,
          approvedamount: Number(item.approved_amount) || 0,
          requestercomment: requestercomments || '',
        };

        // Conditionally add 'id' based on whether it's a new item (temp- ID) or an existing one
        if (!item.id?.toString().startsWith('temp-')) {
          // It's an existing item, so include its actual ID
          baseItem.id = item.id;
        }
        // If it's a new item, 'id' will not be added to baseItem, which matches the backend requirement.

        return baseItem;
      });

      const payload = {
        data: finalPayloadData, // This will now contain all active items
        deleted_ids: deletedItemIds,
      };

      //console.log("📤 PAYLOAD:", JSON.stringify(payload, null, 2));

      const response = await triggerLodgingSubmission(payload).unwrap();
      ToastMessage(response?.message || "Lodging submitted successfully!");
      navigation.goBack();
      // The `useEffect` for `submitSuccess` will now handle fetching data and resetting states
    } catch (error) {
      console.error("❌ Lodging Submit Error", error);
      ToastMessage(error?.data?.description || error?.message || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLodgingItem = useCallback(({ item }) => {
    const isExpanded = expandedItems[item.id];
    const currentItemData = allLodgingItems.find(i => i.id === item.id) || item; // Get data from allLodgingItems
    const isTempItem = item.id?.toString().startsWith('temp-');
    const isItemEditable = isEditable || isTempItem;

    if (deletedItemIds.includes(item.id)) {
      return null;
    }

    return (
      <View key={item.id} style={styles.itemCard}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          onLongPress={() => isItemEditable && handleDeleteItem(item.id)}
          style={styles.cardHeader}
          activeOpacity={0.7}
        >
          <Text allowFontScaling={false} style={styles.cardTitle}>
            {currentItemData.vendor_name || 'New Lodging'} ({currentItemData.city || 'City'})
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
              label="Sub Category"
              value={currentItemData.sub_category}
              isPicker={true}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onPressPicker={() => {
                //console.log('Sub Category picker pressed!');
                setActivePickerItemId(item.id);
                setShowSubCategoryPicker(true);
                //console.log('setShowSubCategoryPicker set to true');
              }}
              placeholder="Select Sub Category"
              placeholderTextColor={CustomColors.textGray}
              isRequired={true}
              styles={styles}
              CustomColors={CustomColors}
            />
            <EditableRow
              label="City"
              value={currentItemData.city}
              isPicker={true}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onPressPicker={() => {
                //console.log('City picker pressed!');
                setActivePickerItemId(item.id);
                setShowCityPicker(true);
                //console.log('setShowCityPicker set to true');
              }}
              placeholder="Select City"
              placeholderTextColor={CustomColors.textGray}
              isRequired={true}
              styles={styles}
              CustomColors={CustomColors}
            />
            <EditableRow
              label="Check-in Date and Time"
              value={currentItemData.checkin_datetime}
              isDatePicker={true}
              isEditing={isItemEditable}
              onPressDatePicker={() => {
                showDatepicker(
                  item.id,
                  'checkin_datetime',
                  minDate,
                  maxDate
                );
              }}
              styles={styles}
              CustomColors={CustomColors}
            />

            <EditableRow
              label="Checkout Date and Time"
              value={currentItemData.checkout_datetime}
              isDatePicker={true}
              isEditing={isItemEditable}
              onPressDatePicker={() => {
                showDatepicker(
                  item.id,
                  'checkout_datetime',
                  minDate,
                  maxDate
                );
              }}
              styles={styles}
              CustomColors={CustomColors}
            />

            <EditableRow
              label="Bill Number"
              value={currentItemData.bill_no}
              onChangeText={text => handleInputChange(text, item.id, 'bill_no')}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              styles={styles}
              CustomColors={CustomColors}
            />

            <EditableRow
              label="Total Bill Amount (Excluding Tax)"
              value={currentItemData.total_bill_amount}
              onChangeText={text => handleInputChange(text, item.id, 'total_bill_amount')}
              isEditing={isItemEditable}
              keyboardType="numeric"
              isDisabled={!isItemEditable}
              isRequired={true}
              styles={styles}
              CustomColors={CustomColors}
            />
            <EditableRow
              label="Claim Amount (INR) (Including Tax)"
              value={currentItemData.claim_amount}
              onChangeText={text => handleClaimAmountChange(text, item.id)}
              isEditing={isItemEditable}
              keyboardType="numeric"
              isDisabled={!isItemEditable}
              isRequired={true}
              styles={styles}
              CustomColors={CustomColors}
            />

            <EditableRow
              label="Tax Only (Luxury & Service)"
              value={currentItemData.tax_only}
              onChangeText={text => handleInputChange(text, item.id, 'tax_only')}
              isEditing={isItemEditable}
              keyboardType="numeric"
              isDisabled={!isItemEditable}
              styles={styles}
              CustomColors={CustomColors}
            />
            <EditableRow
              label="Remarks"
              value={currentItemData.remarks}
              onChangeText={text => handleInputChange(text, item.id, 'remarks')}
              isEditing={isItemEditable}
              multiline={true}
              isDisabled={!isItemEditable}
              styles={styles}
              CustomColors={CustomColors}
            />
            <EditableRow
              label="Vendor Name"
              value={currentItemData.vendor_name}
              onChangeText={text => handleInputChange(text, item.id, 'vendor_name')}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              isRequired={true}
              styles={styles}
              CustomColors={CustomColors}
            />
          </View>
        )}
      </View>
    );
  }, [editedItemData, expandedItems, isEditable, toggleExpand, handleDeleteItem, handleInputChange, handleClaimAmountChange, deletedItemIds, minDate, maxDate]);

  const ListHeader = useCallback(() => (
    <>
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
      </View>

      <View style={styles.dailyItemsHeader}>
        <Text allowFontScaling={false} style={styles.mainHeading}>Lodging/Homestay Expense Items</Text>
        {isEditable && (
          <TouchableOpacity onPress={handleAddNewItem} style={styles.plusicon}>
            <MaterialIcons
              name="add-circle"
              size={moderateScale(35)}
              color={CustomColors.appThemeColor}
            />
          </TouchableOpacity>
        )}
      </View>

      {allLodgingItems.length === 0 && (
        <Text allowFontScaling={false} style={styles.noDataText}>No lodging/homestay expense items found.</Text>
      )}
    </>
  ), [travelNo, employeeCode, employeeName, allLodgingItems.length, isEditable, handleAddNewItem]);

  const ListFooter = useCallback(() => (
    <View style={{ height: verticalScale(100) }} />
  ), []);

  if (isLoading || isCitiesLoading || isSubCategoryLoading) {
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
        data={allLodgingItems}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderLodgingItem}
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
                    : CustomColors.textGray
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

      {/* Action Sheet Pickers */}
      {activePickerItemId && (showSubCategoryPicker || showCityPicker) && (
        <CustomActionSheetPicker
          pickerStatus={showSubCategoryPicker || showCityPicker}
          setPickerStatus={showSubCategoryPicker ? setShowSubCategoryPicker : setShowCityPicker}
          title={showSubCategoryPicker ? "Select Sub Category" : "Select City"}
          optionsData={showSubCategoryPicker ? lodgingSubCategoryDropdownOptions : allCities}
          RenderItem={DropdownItem}
          onPress={(value) => {
            if (showSubCategoryPicker) {
              handleInputChange(value, activePickerItemId, 'sub_category');
            } else {
              handleInputChange(value, activePickerItemId, 'city');
            }
          }}
          selected={editedItemData[activePickerItemId]?.[showSubCategoryPicker ? 'sub_category' : 'city']}
          onSearch={showCityPicker ? handleCitySearch : undefined}
          onEndReached={showCityPicker ? handleLoadMoreCities : () => { }}
          isLoading={isLoadingCities}
          isFetchingMore={isFetchingMoreCities}
          hasMoreData={cityHasNext}
        />
      )}


      {/* Date Picker Modal for Check-in/Checkout Date & Time */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerValue || new Date()}
          mode="datetime"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={dateMin}
          maximumDate={dateMax}
          onChange={(event, selectedDateTime) => {
            if (event.type === 'dismissed') {
              setShowDatePicker(false);
              return;
            }
            setShowDatePicker(false);
            const selected = moment(selectedDateTime || datePickerValue);
            const formattedDateTime = selected.format("DD-MMM-YYYY, HH:mm");
            handleInputChange(formattedDateTime, activeItemId, activeDateField);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default LodgingReimbursement;
