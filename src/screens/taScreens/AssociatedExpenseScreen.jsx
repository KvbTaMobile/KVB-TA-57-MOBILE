import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  FlatList,
  LayoutAnimation,
  UIManager,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';

import { getCustomColors } from '../../styles/CustomColors';
import {
  verticalScale,
  horizontalScale,
  moderateScale,
} from '../../styles/Metrics';
import { Fonts } from '../../styles/Fonts';
import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';
import ToastMessage from '../../TaComponents/toast/ToastMessage';

import DateTimePicker from '@react-native-community/datetimepicker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as styless from "../../styles/StyleSheet";
import {
  useLazyGetAssociatedExpenseQuery,
  useAssociateCreateMutation,
  useLazyCommonDropDownGetQuery,
} from '../../redux/rtk_query/apiSlice';

import {
  setAssociatedExpenses,
  addAssociatedExpenseItem,
  deleteAssociatedExpenseItem,
  updateAssociatedEditedItemField,
  setAssociateActivePickerItemId,
  setAssociateShowDate,
  clearAssociatedEditedItemData,
  setAllAssociatedEditedItemData,
  mergeAssociateSubmittedItems
} from '../../redux/slices/ExpenseSlice';
import moment from 'moment';

const formatDateToDDMMYYYY = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
};

const parseDDMMYYYYToDate = (dateString) => {
  if (!dateString) return new Date();
  const parts = dateString.split('-');
  if (parts.length !== 3) return new Date();
  const day = parseInt(parts[0], 10);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = monthNames.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
  const year = parseInt(parts[2], 10);
  if (monthIndex === -1 || isNaN(day) || isNaN(year)) return new Date();
  const date = new Date(year, monthIndex, day);
  if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== monthIndex || date.getFullYear() !== year) {
    return new Date();
  }
  return date;
};

const formatDateToYYYYMMDD = (dateObj) => {
  if (!dateObj) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}



const EditableRow = React.memo(({
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
  isRequired = false,
  CustomColors,
  styles
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
));

const AssociatedExpensesScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark)
  const globalStyles = styless.styles(isDark);
  const { expense, claimdata } = route.params || {};
  const from = route?.params?.from || {}
  const tourId = expense?.tourid || claimdata?.id;
  const tour_no = expense?.tourid || claimdata?.id;
  const employee_code = expense?.employee_code || claimdata?.employee_code;
  const employee_name = expense?.employee_name || claimdata?.employee_name;
  const claim_status_id = claimdata?.claim_status_id;
  const expense_id = expense?.expenseid
  const tourStartDateString = claimdata?.startdate;
  const tourEndDateString = claimdata?.enddate;
  const requestercomment = expense.requestercomment
  const minDate = useMemo(() => parseDDMMYYYYToDate(tourStartDateString), [tourStartDateString]);
  const maxDate = useMemo(() => parseDDMMYYYYToDate(tourEndDateString), [tourEndDateString]);
  const tourDurationDays = useMemo(() => {
    if (minDate && maxDate) {
      const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1; // +1 to include both start and end dates
    }
    return 0;
  }, [minDate, maxDate]);
  const hidelandry = useMemo(() => tourDurationDays < 5, [tourDurationDays]);

  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const activePickerItemId = useSelector(state => state.expense.associateActivePickerItemId);
  // const associatedExpenses = useSelector(state => state.expense.associatedExpenses);
  // const editedItemData = useSelector(state => state.expense.editedAssociatedItemData);

  const showDatePicker = useSelector(state => state.expense.associateShowDate);
  const associatedExpenses = useSelector(state => state.expense.associatedExpenses || []);
  const editedItemData = useSelector(state => state.expense.editedAssociatedItemData || {});
  const deletedItemIds = useSelector(state => state.expense.deletedItemIds || []);

  const [isEditable, setIsEditable] = useState(true);
  const [subcat, setSubcat] = useState(false);
  const [currentDateItemField, setCurrentDateItemField] = useState(null);
  const [totalClaimAmount, setTotalClaimAmount] = useState(0);
  const [expandedItems, setExpandedItems] = useState({});

  const [isFetchingAssociatedExpenses, setIsFetchingAssociatedExpenses] = useState(true);
  const [fetchAssociatedError, setFetchAssociatedError] = useState(null);

  // useRef to hold the item and field for the date picker callback
  const itemForDatePickerRef = useRef(null);
  const fieldForDatePickerRef = useRef(null);

  const [triggerGetAssociatedExpense] = useLazyGetAssociatedExpenseQuery();

  const [
    triggerGetAssociatedSubCategory,
    { data: associatedSubCategoryDropdownData, isLoading: isSubCategoryLoading, isError: isSubCategoryError, error: subCategoryFetchError }
  ] = useLazyCommonDropDownGetQuery();

  const [
    createAssociatedExpense, {
      isLoading: isCreatingExpense,
      isSuccess: isCreateSuccess,
      isError: isCreateError,
      error: createError,
      data: createResponse,
      reset: resetCreateMutation,
    },
  ] = useAssociateCreateMutation();

  const associatedSubCategoryDropdownOptions = useMemo(() => {
    if (associatedSubCategoryDropdownData && Array.isArray(associatedSubCategoryDropdownData)) {
      return associatedSubCategoryDropdownData.map(item => ({
        label: item.name,
        value: item.value,
      }));
    }
    return [];
  }, [associatedSubCategoryDropdownData]);
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
      backgroundColor: CustomColors.appliteThemecolor + '10',
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
      color: CustomColors.textDark,
      flex: 1,
      fontFamily: Fonts.regular,
    },
    detailItemContainer: {
      marginBottom: verticalScale(15),
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(5),
    },
    detailLabel: {
      fontSize: moderateScale(15),
      fontWeight: '600',
      color: CustomColors.textDark,
      fontFamily: Fonts.semiBold,
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
      color: CustomColors.primaryBlue,
      fontFamily: Fonts.semiBold,
    },
    bottomActionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: CustomColors.cardBackground,
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(20),
      borderTopWidth: 1,
      borderTopColor: CustomColors.lightGray,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidthButton: {
      width: '100%',
      paddingVertical: verticalScale(15),
      borderRadius: moderateScale(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidthButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(16),
      fontWeight: 'bold',
      fontFamily: Fonts.bold,
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
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
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
      color: CustomColors.red,
      textAlign: 'center',
      marginBottom: verticalScale(10),
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
      fontSize: moderateScale(15),
      fontFamily: Fonts.semiBold,
    },
    noDataText: {
      textAlign: 'center',
      marginTop: verticalScale(20),
      fontSize: moderateScale(15),
      color: CustomColors.textGray,
      fontFamily: Fonts.regular,
    },
    deleteButton: {
      padding: moderateScale(5),
    },
    totalClaimContainer: {
      backgroundColor: CustomColors.white,
      borderRadius: moderateScale(8),
      padding: moderateScale(15),
      marginTop: verticalScale(15),
      marginBottom: verticalScale(15),
      alignItems: 'flex-end',
      ...Platform.select({
        ios: {
          shadowColor: CustomColors.textBlack,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    totalClaimText: {
      fontSize: moderateScale(16),
      fontWeight: 'bold',
      color: CustomColors.appThemeColor,
      fontFamily: Fonts.bold,
    },
    warningText: {
      color: CustomColors.textRed,
      fontSize: moderateScale(15),
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: verticalScale(6),

    },

  });
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,

      headerStyle: { backgroundColor: CustomColors.appThemeColor },

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
          Associated Expenses
        </Text>
      ),
    });
  }, [navigation, isDark]);

  const DropdownItem = React.memo(({ options, onPress, setPickerStatus, selected }) => {
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
  });
  const fetchAssociatedData = useCallback(async () => {
    if (!tour_no) {
      setIsFetchingAssociatedExpenses(false);
      return;
    }
    try {
      setIsFetchingAssociatedExpenses(true);
      setFetchAssociatedError(null);

      const result = await triggerGetAssociatedExpense(tour_no).unwrap();

      const mappedData = result?.data?.map(item => ({
        id: item.id || `fetched-${Date.now()}-${Math.random()}`,
        expensegid: item.expensegid,
        subCategory: item.expense || '', // Use 'expense' field from API for subCategory
        date: item.fromdate ? moment(item.fromdate, "DD-MMM-YYYY").format("DD-MMM-YYYY") : '', // Use 'fromdate'
        billno: item.billno || '',
        remarks: item.remarks || '',
        claimedamount: item.claimedamount?.toString() || '',
      })) || [];

      let itemsToSet = mappedData;
      let initialEditedDataForRedux = {};

      if (mappedData.length === 0) {
        const newId = `new-${Date.now()}`;
        const newItem = {
          id: newId,
          subCategory: '',
          date: '',
          billno: '',
          remarks: '',
          claimedamount: '',
          isNew: true,
        };
        itemsToSet = [newItem];
        ToastMessage('Please fill in the details for the new expense item.');
      }

      dispatch(setAssociatedExpenses(itemsToSet));
      itemsToSet.forEach(item => {
        initialEditedDataForRedux[item.id] = { ...item };
      });
      dispatch(setAllAssociatedEditedItemData(initialEditedDataForRedux));

      const currentStatusId = Number(claim_status_id);
      const editableStatuses = [-1, 1, 5];
      setIsEditable(editableStatuses.includes(currentStatusId));
    } catch (err) {
      console.error('Fetch associated expenses failed:', err);
      setFetchAssociatedError(err?.data?.description || 'Something went wrong while fetching associated expenses.');
    } finally {
      setIsFetchingAssociatedExpenses(false);
    }
  }, [
    tour_no,
    triggerGetAssociatedExpense,
    dispatch,
    claim_status_id,
    setAllAssociatedEditedItemData,
  ]);

  useEffect(() => {
    fetchAssociatedData();
    return () => {
      dispatch(setAssociatedExpenses([]));
      dispatch(setAllAssociatedEditedItemData({}));
    };
  }, [fetchAssociatedData, dispatch]);

  useEffect(() => {
    triggerGetAssociatedSubCategory('ascte_exp');
  }, [triggerGetAssociatedSubCategory]);

  useEffect(() => {
    if (isCreateSuccess && createResponse) {
      ToastMessage('Expense saved successfully!');
      fetchAssociatedData();
      resetCreateMutation();
    }
    if (isCreateError) {
      console.error("AssociateCreate error:", createError);
      ToastMessage(createError?.data?.description);
    }
  }, [isCreateSuccess, isCreateError, createResponse, createError, fetchAssociatedData, resetCreateMutation]);

  useEffect(() => {
    const total = associatedExpenses.reduce((sum, item) => {
      const editedClaimAmount = editedItemData[item.id]?.claimedamount;
      const amount = Number(editedClaimAmount !== undefined ? editedClaimAmount : item.claimedamount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    setTotalClaimAmount(total);
  }, [associatedExpenses, editedItemData]);
  useEffect(() => {
    if (hidelandry && editedItemData[activePickerItemId]?.subCategory === 362) {
      dispatch(updateAssociatedEditedItemField({
        value: null,
        itemId: activePickerItemId,
        field: 'subCategory',
      }));
    }
  }, [hidelandry, activePickerItemId]);

  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleFieldChange = useCallback((value, itemId, field) => {
    //console.log("handleFieldChange: Dispatching update for Item ID:", itemId, "Field:", field, "Value:", value);
    LayoutAnimation.easeInEaseOut();
    dispatch(updateAssociatedEditedItemField({ itemId, field, value }));
  }, [dispatch]);


  const filteredSubCategoryOptions = hidelandry
    ? associatedSubCategoryDropdownOptions?.filter(
      opt => opt.label !== 'Lauary charges' && opt.value !== 'Lauary charges'
    ) || []
    : associatedSubCategoryDropdownOptions || [];




  const handleNumericFieldChange = useCallback((value, itemId, field) => {
    const cleanedValue = value.replace(/[^0-9.]/g, '');
    //console.log("handleNumericFieldChange: Dispatching update for Item ID:", itemId, "Field:", field, "Cleaned Value:", cleanedValue);
    dispatch(updateAssociatedEditedItemField({ itemId, field, value: cleanedValue }));
  }, [dispatch]);

  const handleDateChange = useCallback((event, selectedDate) => {
    dispatch(setAssociateShowDate(false));
    if (event.type === 'set' && selectedDate) {
      // Get itemId and field from useRef
      const itemId = itemForDatePickerRef.current;
      const field = fieldForDatePickerRef.current;
      const formattedDate = formatDateToDDMMYYYY(selectedDate);
      //console.log("handleDateChange: formattedDate", formattedDate, "itemId", itemId, "field", field);
      if (itemId && field) {
        handleFieldChange(formattedDate, itemId, field);
      } else {
        console.warn("handleDateChange: itemId or field was null from useRef.");
      }
    }
  }, [dispatch, handleFieldChange]);

  const showDatePickerAndroid = useCallback((currentDate, itemId, field) => {
    DateTimePickerAndroid.open({
      value: parseDDMMYYYYToDate(editedItemData[itemId]?.[field]) || currentDate,
      onChange: (event, date) => {
        handleDateChange(event, date);
      },
      mode: 'date',
      is24Hour: true,
      display: 'default',
      minimumDate: minDate || undefined, // Apply minimum date
      maximumDate: maxDate || undefined, // Apply maximum date
    });
  }, [handleDateChange, editedItemData, minDate, maxDate]);

  const openDatePicker = useCallback((itemId, field) => {
    if (!isEditable) {
      ToastMessage('This claim cannot be modified in its current status.');
      return;
    }
    dispatch(setAssociateActivePickerItemId(itemId));
    setCurrentDateItemField(field);

    // Store itemId and field in useRef for reliable access in handleDateChange
    itemForDatePickerRef.current = itemId;
    fieldForDatePickerRef.current = field;

    //console.log("openDatePicker: Setting activePickerItemId to", itemId, "and currentDateItemField to", field);

    if (Platform.OS === 'android') {
      const initialDate = parseDDMMYYYYToDate(editedItemData[itemId]?.[field]) || new Date();
      showDatePickerAndroid(initialDate, itemId, field);
    } else {
      dispatch(setAssociateShowDate(true));
      //console.log("openDatePicker (iOS): showDatePicker set to true. Current activePickerItemId:", itemId, "currentDateItemField:", field);
    }
  }, [dispatch, editedItemData, showDatePickerAndroid, isEditable]);

  const onAddExpense = useCallback(() => {
    if (!isEditable) {
      ToastMessage('This claim cannot be modified in its current status.');
      return;
    }
    LayoutAnimation.easeInEaseOut();
    const newId = `new-${Date.now()}`;
    const newItem = {
      id: newId,
      subCategory: '',
      date: formatDateToDDMMYYYY(new Date()),
      billno: '',
      remarks: '',
      claimedamount: '',
    };
    dispatch(addAssociatedExpenseItem(newItem));
    dispatch(updateAssociatedEditedItemField({
      itemId: newId,
      field: 'id',
      value: newId,
    }));
    dispatch(updateAssociatedEditedItemField({
      itemId: newId,
      field: 'subCategory',
      value: '',
    }));
    dispatch(updateAssociatedEditedItemField({
      itemId: newId,
      field: 'date',
      value: '',
    }));
    dispatch(updateAssociatedEditedItemField({
      itemId: newId,
      field: 'billno',
      value: '',
    }));
    dispatch(updateAssociatedEditedItemField({
      itemId: newId,
      field: 'remarks',
      value: '',
    }));
    dispatch(updateAssociatedEditedItemField({
      itemId: newId,
      field: 'claimedamount',
      value: '',
    }));
    ToastMessage('Please fill in the details for the new expense item.');
  }, [dispatch, isEditable]);
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
  // const onDeleteExpense = useCallback((itemId) => {
  //   if (!isEditable) {
  //     ToastMessage('This claim cannot be modified in its current status.');
  //     return;
  //   }
  //   LayoutAnimation.easeInEaseOut();
  //   Alert.alert(
  //     "Delete Item",
  //     "Are you sure you want to delete this expense item?",
  //     [
  //       { text: "Cancel", style: "cancel" },
  //       {
  //         text: "Delete",
  //         onPress: () => {
  //           dispatch(deleteAssociatedExpenseItem(itemId)); // ⬅️ Add to `deletedItemIds`
  //           dispatch(clearAssociatedEditedItemData(itemId));
  //           ToastMessage('Expense item deleted successfully.');
  //         },
  //         style: "destructive",
  //       },
  //     ],
  //     { cancelable: true }
  //   );
  // }, [dispatch, isEditable]);

  const onDeleteExpense = useCallback((itemId) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteAssociatedExpenseItem(itemId)); // redux action
            ToastMessage('Item deleted successfully');
          },
        },
      ]
    );
  }, [dispatch]);

  const onSaveExpenses = useCallback(async () => {
    if (!isEditable || isCreatingExpense) {
      ToastMessage(isEditable ? 'Submission in progress...' : 'This claim cannot be submitted in its current status.');
      return;
    }

    // ✅ STEP 1: Include all items except those marked deleted
    const itemsToSubmit = associatedExpenses.filter(
      item => !deletedItemIds.includes(item.id)
    );

    if (itemsToSubmit.length === 0) {
      ToastMessage("There are no items to submit.");
      return;
    }

    const allValidationErrors = [];
    const payloadData = [];
    const requiredFields = ['subCategory', 'date', 'billno', 'claimedamount'];

    for (const item of itemsToSubmit) {
      const edited = editedItemData[item.id] || {};
      const combined = { ...item, ...edited };
      const itemErrors = [];

      // 🛡️ Mandatory field validation
      for (const field of requiredFields) {
        if (!combined[field] || String(combined[field]).trim() === '') {
          itemErrors.push(`"${field}" is mandatory.`);
        }
      }


      if (combined.claimedamount && isNaN(parseFloat(combined.claimedamount))) {
        itemErrors.push(`"claimedamount" must be a valid number.`);
      }

      if (itemErrors.length > 0) {
        allValidationErrors.push(`Item (Bill No: ${combined.billno || 'N/A'}): ${itemErrors.join(', ')}`);
        continue;
      }

      // ✅ Add to final payload
      payloadData.push({
        tour_id: tour_no,
        expensegid: expense_id,
        expense: combined.subCategory || '',
        remarks: combined.remarks || '',
        fromdate: formatDateToYYYYMMDD(parseDDMMYYYYToDate(combined.date)),
        billno: combined.billno || '',
        claimedamount: parseFloat(combined.claimedamount),
        requestercomment: requestercomment || '',
      });
    }

    // ❌ Stop if any validation errors
    if (allValidationErrors.length > 0) {
      ToastMessage("Please correct the following errors:\n" + allValidationErrors.join('\n'));
      return;
    }

    // 🛰️ Submit to API
    try {
      //console.log("Submitting Payload:", JSON.stringify({ data: payloadData }, null, 2));
      await createAssociatedExpense({ data: payloadData }).unwrap();
      ToastMessage('Associated Expenses submitted successfully!');
      fetchAssociatedData(); // 🔄 Re-fetch from backend to sync everything
      navigation.goBack();
    } catch (err) {
      console.error("Submission failed:", err);
      ToastMessage(err?.data?.description || err?.message || "Submission failed.");
    }

  }, [
    isEditable,
    isCreatingExpense,
    associatedExpenses,
    deletedItemIds,
    editedItemData,
    tour_no,
    expense_id,
    createAssociatedExpense,
    fetchAssociatedData
  ]);






  const renderAssociatedItem = useCallback(({ item, index }) => {
    const currentItemData = { ...item, ...(editedItemData[item.id] || {}) };
    const isItemEditable = isEditable;
    const isExpanded = expandedItems[item.id];


    return (
      <View key={item.id} style={styles.itemCard}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          onLongPress={() => isItemEditable && onDeleteExpense(item.id)}
          style={styles.cardHeader}
          activeOpacity={0.7}>
          <Text allowFontScaling={false} style={styles.cardTitle}>
            {`Item ${index + 1}`}
          </Text>
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={moderateScale(28)}
            color={CustomColors.appThemeColor}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardDetails}>

            <EditableRow
              label="Sub Category"
              value={currentItemData.subCategory}
              isPicker={true}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onPressPicker={() => {
                dispatch(setAssociateActivePickerItemId(item.id));
                setShowSubCategoryPicker(true);
              }}
              placeholder="Select Sub Category"
              placeholderTextColor={CustomColors.textGray}
              isRequired={true}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Date"
              value={currentItemData.date}
              isDatePicker={true}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onPressDatePicker={() => openDatePicker(item.id, 'date')}
              placeholder="DD-MMM-YYYY"
              placeholderTextColor={CustomColors.textGray}
              isRequired={true}
              CustomColors={CustomColors}
              styles={styles}
            />

            <EditableRow
              label="Bill Number"
              value={currentItemData.billno}
              onChangeText={(text) => handleFieldChange(text, item.id, 'billno')}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              placeholder="Enter Bill Number"
              placeholderTextColor={CustomColors.textGray}
              isRequired={true}
              CustomColors={CustomColors}
              styles={styles}
            />

            <EditableRow
              label="Remarks"
              value={currentItemData.remarks}
              onChangeText={(text) => handleFieldChange(text, item.id, 'remarks')}
              isEditing={isItemEditable}
              multiline={true}
              isDisabled={!isItemEditable}
              placeholder="Enter Remarks (optional)"
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />

            <EditableRow
              label="Claim Amount (INR)"
              value={String(currentItemData.claimedamount !== undefined ? currentItemData.claimedamount : '')}
              onChangeText={(text) => handleNumericFieldChange(text, item.id, 'claimedamount')}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              keyboardType="numeric"
              placeholder="Enter Claim Amount"
              placeholderTextColor={CustomColors.textGray}
              isRequired={true}
              CustomColors={CustomColors}
              styles={styles}
            />
          </View>
        )}
      </View>
    );
  }, [isEditable, editedItemData, onDeleteExpense, handleFieldChange, handleNumericFieldChange, openDatePicker, dispatch, setShowSubCategoryPicker, expandedItems, toggleExpand]);

  const ListHeader = useCallback(() => (
    <>
      <View style={styles.sectionCard}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>Travel Overview</Text>
        <View style={styles.detailRow}>
          <Text allowFontScaling={false} style={styles.boldText}>Travel No:</Text>
          <Text allowFontScaling={false} style={styles.detailValueText}>{tour_no || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text allowFontScaling={false} style={styles.boldText}>Employee Code:</Text>
          <Text allowFontScaling={false} style={styles.detailValueText}>{employee_code || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text allowFontScaling={false} style={styles.boldText}>Employee Name:</Text>
          <Text allowFontScaling={false} style={styles.detailValueText}>{employee_name || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.dailyItemsHeader}>
        <Text allowFontScaling={false} style={styles.mainHeading}>Associated Expense Items</Text>
        {isEditable && (
          <TouchableOpacity onPress={onAddExpense} style={styles.plusicon}>
            <MaterialIcons name="add-circle" size={moderateScale(32)} color={CustomColors.appThemeColor} />
          </TouchableOpacity>
        )}
      </View>

      {associatedExpenses.length === 0 && !isFetchingAssociatedExpenses && (
        <Text allowFontScaling={false} style={styles.noDataText}>No associated expense items found.</Text>
      )}
      {hidelandry && (
        <Text allowFontScaling={false} style={styles.warningText}>
          Not Eligible For Laundry Expenses
        </Text>
      )}

    </>
  ), [tour_no, employee_code, employee_name, associatedExpenses.length, isEditable, onAddExpense, isFetchingAssociatedExpenses]);

  const ListFooter = useCallback(() => (
    <View style={{ height: verticalScale(100) }} />
  ), []);

  if (isFetchingAssociatedExpenses) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={styles.loadingText}>Please Wait...</Text>
      </View>
    );
  }



  // Calculate the initial date for the picker based on the currently edited item
  // Use current values of activePickerItemId (from Redux) and currentDateItemField (local state)
  const initialDatePickerDate = activePickerItemId && currentDateItemField
    ? parseDDMMYYYYToDate(editedItemData[activePickerItemId]?.[currentDateItemField]) || new Date()
    : new Date();


  return (
    <KeyboardAvoidingView style={styles.keyboardAvoidingContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} >
      <FlatList
        data={associatedExpenses}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderAssociatedItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.flatListOverallContent}
        keyboardShouldPersistTaps="handled"
      />
      <View style={styles.bottomActionBar}>
        {from !== 'Checker' && (
          <TouchableOpacity
            style={[styles.fullWidthButton, {
              backgroundColor: isEditable && !isCreatingExpense ? CustomColors.appThemeColor : CustomColors.mediumGray,
            }]}
            onPress={onSaveExpenses}
            disabled={!isEditable || isCreatingExpense}
          >
            <Text allowFontScaling={false} style={styles.fullWidthButtonText}>
              {isCreatingExpense ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={initialDatePickerDate}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
        />
      )}
      {activePickerItemId && (
        <CustomActionSheetPicker
          pickerStatus={showSubCategoryPicker}
          setPickerStatus={setShowSubCategoryPicker}
          title="Select Sub Category"
          optionsData={filteredSubCategoryOptions}
          RenderItem={DropdownItem}
          onPress={(value) => {
            dispatch(updateAssociatedEditedItemField({
              value: value,
              itemId: activePickerItemId,
              field: 'subCategory',
            }));
          }}
          selected={editedItemData[activePickerItemId]?.subCategory}
        />
      )}


    </KeyboardAvoidingView>
  );
};


export default AssociatedExpensesScreen;