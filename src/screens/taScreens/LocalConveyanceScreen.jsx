import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import {
  useGetLocalConvQuery,
  useLocalConvCreateMutation, useLazyCommonDropDownGetQuery, useLocalConvEligibleAmtMutation
} from '../../redux/rtk_query/apiSlice';
import {
  setLocalConveyanceExpenses,
  updateLocalConveyanceEditedItemField,
  updateLocalConveyanceNumericItemField,
  addLocalConveyanceExpenseItem,
  deleteLocalConveyanceExpenseItem,
  toggleLocalConveyanceItemExpansion,
  setLocalConveyanceShowDatePicker,
  setLocalConveyanceActiveDateField,
  setLocalConveyanceDatePickerValue,
  setLocalConveyanceShowSubCategoryPicker,
  setLocalConveyanceActivePickerItemId,
  setLocalConveyanceHasUnsavedChanges,
  resetLocalConveyanceState,
} from '../../redux/slices/ExpenseSlice';
import * as styless from "../../styles/StyleSheet";
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
const LocalConveyanceExpenseScreen = ({ route }) => {
  const navigation = useNavigation();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark)
  const globalStyles = styless.styles(isDark);
  const dispatch = useDispatch();
  const {
    expenses,
    editedItemData,
    hasUnsavedChanges,
    expandedItems,
    showSubCategoryPicker,
    showDatePicker,
    activePickerItemId,
    activeDateField,
    datePickerValue,
  } = useSelector(state => state.expense.localConveyance);
  const [claimStatusId, setClaimStatusId] = useState(null);
  const [isEditable, setIsEditable] = useState(true);
  const expenseFromRoute = route?.params?.expense ?? {};
  const expense = route.params || {};
  const expenseid = expenseFromRoute.expenseid;
  const requestercomment = expenseFromRoute.requestercomment;
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || {}
  //console.log('hhhhhhiii',from)
  const tourId = expense?.tourid || claimdata?.id;
  const employeeCode = expenseFromRoute?.employee_code || claimdata?.employee_code;
  const employeeName = expenseFromRoute?.employee_name || claimdata?.employee_name;
  const travelNo = expenseFromRoute?.tourid || claimdata?.id;
  const [
    triggerGetModeOfTravel,
    { data: modeOfTravelData, isLoading: isLoadingModeOfTravel, isError: isModeOfTravelError }
  ] = useLazyCommonDropDownGetQuery();
  const [
    triggerEligibleAmountCalculation,
    { isLoading: isEligibleAmountCalculating, error: eligibleAmountError },
  ] = useLocalConvEligibleAmtMutation();
  const localConveyanceList = useSelector(
    state => state.expense.localConveyance.expenses
  );
  const deletedItemIds = useSelector(
    state => state.expense.localConveyance.deletedItemIds || []
  );

  const {
    data: fetchedConveyanceData,
    isLoading: isFetchingConveyance,
    isSuccess: isConveyanceSuccess,
    isError: isConveyanceError,
    error: conveyanceError,
    refetch: refetchConveyanceData,
  } = useGetLocalConvQuery(travelNo, {
    skip: !travelNo,
  });
  const [
    localConvCreate,
    {
      isLoading: isCreatingConveyance,
    }
  ] = useLocalConvCreateMutation();
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
      color: CustomColors.appThemeColor,
    },
    fullWidthButtonText: {
      color: CustomColors.textWhite,
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
      color: CustomColors.textWhite,
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
  });
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,

      headerStyle: { backgroundColor: CustomColors.appThemeColor },

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
          Local Conveyance Expense
        </Text>
      ),
    });
  }, [navigation, isDark]);

  useEffect(() => {
    if (isConveyanceSuccess && fetchedConveyanceData) {
      const fetchedList = fetchedConveyanceData?.data || [];
      //console.log('fetchedList',fetchedList)
      dispatch(setLocalConveyanceExpenses(fetchedList));
      fetchedList.forEach(item => {
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'subCategory', value: item.modeoftravel || '' }));
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'date', value: item.fromdate || '' }));
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'fromPlace', value: item.fromplace || '' }));
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'toPlace', value: item.toplace || '' }));
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'distance', value: String(item.distance || '') }));
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'billNumber', value: item.billno || '' }));
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'remarks', value: item.remarks || '' }));
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'claimAmount', value: String(item.claimedamount || '') }));
        dispatch(updateLocalConveyanceEditedItemField({ itemId: item.id, field: 'eligibleamount', value: item.eligibleamount || null }));
      });
      const currentStatusId = Number(claimdata?.claim_status_id);
      setClaimStatusId(currentStatusId);
      const editableStatuses = [-1, 1, 5];
      setIsEditable(editableStatuses.includes(currentStatusId));
    }
  }, [fetchedConveyanceData]);
  useEffect(() => {
    triggerGetModeOfTravel('mode_of_travel');
  }, [triggerGetModeOfTravel]);
  const subCategoryDropdownOptions = useMemo(() => {
    if (modeOfTravelData && Array.isArray(modeOfTravelData)) {
      return modeOfTravelData.map(item => ({
        label: item.name,
        value: item.value,
      }));
    }
    return [];
  }, [modeOfTravelData]);
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
    dispatch(updateLocalConveyanceEditedItemField({ value, itemId, field }));
  }, [dispatch]);
  const handleNumericInputValidate = useCallback(async (text, key, itemId) => {
    const cleanedValue = text.replace(/[^0-9.]/g, '');
    dispatch(updateLocalConveyanceNumericItemField({ text: cleanedValue, key, itemId }));
    const currentItem = editedItemData[itemId] || {};
    const mode = currentItem.subCategory;
    if (key === 'distance') {
      const distance = parseFloat(cleanedValue);
      const shouldCalculate = mode && !['Cab', 'Auto'].includes(mode) && !isNaN(distance) && distance >= 0;
      if (shouldCalculate) {
        try {
          const res = await triggerEligibleAmountCalculation({
            modeoftravel: mode,
            expensegid: expenseid,
            distance,
          }).unwrap();
          if (res?.Eligible_amount !== undefined) {
            dispatch(updateLocalConveyanceEditedItemField({
              itemId,
              field: 'eligibleamount',
              value: res.Eligible_amount,
            }));
          }
        } catch (error) {
          ToastMessage({
            type: 'error',
            text1: 'Eligible Amount Error',
            text2: error?.data?.description || 'Could not calculate eligible amount.',
          });
          if (currentItem?.eligibleamount !== null) {
            dispatch(updateLocalConveyanceEditedItemField({
              itemId,
              field: 'eligibleamount',
              value: null,
            }));
          }
        }
      } else {
        if (currentItem?.eligibleamount !== null) {
          dispatch(updateLocalConveyanceEditedItemField({
            itemId,
            field: 'eligibleamount',
            value: null,
          }));
        }
      }
    }
    if (key === 'claimAmount') {
      const eligible = parseFloat(currentItem.eligibleamount || 0);
      const claimed = parseFloat(cleanedValue || 0);
      const remarks = currentItem.remarks;
      if (
        claimed > eligible &&
        (!remarks || String(remarks).trim() === '') &&
        mode !== 'Cab' &&
        mode !== 'Auto'
      ) {
        ToastMessage('Please Enter Remarks for Limit Exceeding');
      }
    }
  }, [dispatch, editedItemData, triggerEligibleAmountCalculation]);
  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    dispatch(toggleLocalConveyanceItemExpansion(id));
  }, [dispatch]);
  const handleDeleteItem = useCallback((itemId) => {
    if (!isEditable) {
      ToastMessage('This claim cannot be modified in its current status.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this expense item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteLocalConveyanceExpenseItem(itemId));
            ToastMessage('Expense item deleted.');
          },
        },
      ]
    );
  }, [isEditable, dispatch]);

  const handleAddExpenseItem = useCallback(() => {
    if (!isEditable) {
      ToastMessage('This claim cannot be modified in its current status.');
      return;
    }
    dispatch(addLocalConveyanceExpenseItem());
    ToastMessage('New expense item added. Please fill details.');
  }, [isEditable, dispatch]);
  const formatDateToYYYYMMDD = (dateObj) => {
    if (!dateObj) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getCleanItemForCompare = (sourceItem) => ({
    subCategory: sourceItem.subCategory || sourceItem.modeoftravel || '',
    date: sourceItem.date || sourceItem.fromdate || '',
    fromPlace: sourceItem.fromPlace || sourceItem.fromplace || '',
    toPlace: sourceItem.toPlace || sourceItem.toplace || '',
    distance: String(sourceItem.distance || ''),
    billNumber: sourceItem.billNumber || sourceItem.billno || '',
    remarks: sourceItem.remarks || '',
    claimAmount: String(sourceItem.claimAmount || sourceItem.claimedamount || ''),
  });
  const handleSubmit = useCallback(async () => {
    if (!hasUnsavedChanges || !isEditable || isCreatingConveyance) {
      if (!isEditable) {
        ToastMessage("This claim cannot be submitted in its current status.");
      } else if (!hasUnsavedChanges) {
        ToastMessage("There are no unsaved changes to submit.");
      } else if (isCreatingConveyance) {
        ToastMessage("Submission in progress...");
      }
      return;
    }

    const itemsToSubmit = allLocalConveyanceItems.filter(
      item => !deletedItemIds.includes(item.id)
    );



    if (itemsToSubmit.length === 0) {
      ToastMessage("There are no unsaved changes to submit.");
      return;
    }

    const mandatoryFields = [
      'subCategory', 'date', 'fromPlace',
      'toPlace', 'distance', 'claimAmount'
    ];
    const allValidationErrors = [];

    for (const item of itemsToSubmit) {
      const itemErrors = [];

      mandatoryFields.forEach(field => {
        if (!item[field] || String(item[field]).trim() === '') {
          itemErrors.push(`"${field}" is mandatory.`);
        }
      });

      ['distance', 'claimAmount'].forEach(field => {
        if (item[field] && isNaN(parseFloat(item[field]))) {
          itemErrors.push(`"${field}" must be a valid number.`);
        }
      });

      if (itemErrors.length > 0) {
        allValidationErrors.push(
          `Item (Date: ${item.date || 'N/A'}): ${itemErrors.join(', ')}`
        );
      }
    }

    if (allValidationErrors.length > 0) {
      ToastMessage("Please fill in all mandatory fields before proceeding.");
      return;
    }

    const payloadData = itemsToSubmit.map(item => {
      const baseItem = {
        tour_id: tourId,
        expensegid: expenseid,
        eligibleamount: item.eligibleamount ?? null,
        claimedamount: parseFloat(item.claimAmount || 0),
        requestercomment: requestercomment || '',
        modeoftravel: item.subCategory || '',
        billno: item.billNumber || '',
        remarks: item.remarks || '',
        fromplace: item.fromPlace || '',
        toplace: item.toPlace || '',
        fromdate: formatDateToYYYYMMDD(parseDDMMYYYYToDate(item.date)),
        distance: String(parseFloat(item.distance || 0)),
      };

      // Include ID only for existing items
      if (!item.id.toString().startsWith('temp-')) {
        baseItem.id = item.id;
      }

      return baseItem;
    });

    try {
      await localConvCreate({ data: payloadData }).unwrap();
      ToastMessage('Local Conveyance submitted successfully!');
      dispatch(setLocalConveyanceHasUnsavedChanges(false));
      dispatch(resetLocalConveyanceState());
      refetchConveyanceData();
      navigation.goBack();
    } catch (err) {
      ToastMessage(
        err?.data?.message || err?.message || "An error occurred during submission. Please try again.",
        "error"
      );
    }
  }, [
    hasUnsavedChanges,
    isEditable,
    isCreatingConveyance,
    editedItemData,
    expenses,
    allLocalConveyanceItems,
    tourId,
    expenseid,
    requestercomment,
    dispatch,
    refetchConveyanceData,
    localConvCreate
  ]);

  const handleModeOfTravelChange = useCallback(async (newValue, itemId) => {
    const currentItem = editedItemData[itemId] || {};
    dispatch(updateLocalConveyanceEditedItemField({
      itemId,
      field: 'subCategory',
      value: newValue
    }));
    const distanceStr = currentItem?.distance ?? '';
    const distance = parseFloat(distanceStr);
    const shouldCalculate = newValue && !['Cab', 'Auto'].includes(newValue) && !isNaN(distance) && distance >= 0;
    if (shouldCalculate) {
      try {
        const res = await triggerEligibleAmountCalculation({
          modeoftravel: newValue,
          expensegid: 4,
          distance,
        }).unwrap();
        if (res?.Eligible_amount !== undefined) {
          dispatch(updateLocalConveyanceEditedItemField({
            itemId,
            field: 'eligibleamount',
            value: res.Eligible_amount,
          }));
        }
      } catch (error) {
        ToastMessage({
          type: 'error',
          text1: 'Eligible Amount Error',
          text2: error?.data?.description || 'Could not calculate eligible amount.',
        });
        if (currentItem?.eligibleamount !== null) {
          dispatch(updateLocalConveyanceEditedItemField({
            itemId,
            field: 'eligibleamount',
            value: null,
          }));
        }
      }
    } else {
      if (currentItem?.eligibleamount !== null) {
        dispatch(updateLocalConveyanceEditedItemField({
          itemId,
          field: 'eligibleamount',
          value: null,
        }));
      }
      if (!['Cab', 'Auto'].includes(newValue) && (isNaN(distance) || distance < 0)) {
        ToastMessage({
          type: 'info',
          text1: 'Distance Missing/Invalid',
          text2: 'Enter a valid distance to calculate eligible amount.',
        });
      }
    }
  }, [dispatch, editedItemData, triggerEligibleAmountCalculation]);
  const allLocalConveyanceItems = useMemo(() => {
    return expenses
      .filter(item => !deletedItemIds.includes(item.id)) // ← remove deleted
      .map(item => ({
        ...item,
        ...(editedItemData[item.id] || {}),
        id: item.id,
        distance: String(editedItemData[item.id]?.distance || item.distance || ''),
        claimAmount: String(editedItemData[item.id]?.claimAmount || item.claimAmount || ''),
      }));
  }, [expenses, editedItemData, deletedItemIds]);
  //console.log('allLocalConveyanceItems',allLocalConveyanceItems)
  const renderLocalConveyanceItem = useCallback(({ item }) => {
    const isExpanded = expandedItems[item.id];
    const currentItemData = editedItemData[item.id] || item;
    const isTempItem = item.id?.toString().startsWith('temp-');
    const isItemEditable = isEditable || isTempItem;
    const handleDatePickerPress = () => {
      if (!isItemEditable) return;
      dispatch(setLocalConveyanceActiveDateField('date'));
      dispatch(setLocalConveyanceActivePickerItemId(item.id));
      const initialDate = parseDDMMYYYYToDate(currentItemData.date);
      const tourStartDateString = claimdata?.startdate;
      const tourEndDateString = claimdata?.enddate;
      //console.log(tourStartDateString,tourEndDateString)
      const minLimitDate = tourStartDateString ? parseDDMMYYYYToDate(tourStartDateString) : new Date(1900, 0, 1);
      const maxLimitDate = tourEndDateString ? parseDDMMYYYYToDate(tourEndDateString) : new Date(2100, 11, 31);
      //console.log(minLimitDate,maxLimitDate)
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: initialDate,
          onChange: (event, selectedDate) => {
            if (event.type === 'dismissed') {
              return;
            }
            if (selectedDate) {
              dispatch(updateLocalConveyanceEditedItemField({
                value: formatDateToDDMMYYYY(selectedDate),
                itemId: item.id,
                field: 'date'
              }));
            }
          },
          mode: 'date',
          display: 'default',
          minimumDate: minLimitDate,
          maximumDate: maxLimitDate,
        });
      } else {
        dispatch(setLocalConveyanceDatePickerValue(initialDate.toISOString()));
        dispatch(setLocalConveyanceShowDatePicker(true));
      }
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
            {currentItemData.subCategory || 'New Item'} ({currentItemData.date || 'Date'})
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
                dispatch(setLocalConveyanceActivePickerItemId(item.id));
                dispatch(setLocalConveyanceShowSubCategoryPicker(true));
              }}
              placeholder="Select Sub Category"
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Date"
              value={currentItemData.date}
              isDatePicker={true}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onPressDatePicker={handleDatePickerPress}
              placeholder="DD-MMM-YYYY"
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="From Place"
              value={currentItemData.fromPlace}
              onChangeText={text => handleInputChange(text, item.id, 'fromPlace')}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="To Place"
              value={currentItemData.toPlace}
              onChangeText={text => handleInputChange(text, item.id, 'toPlace')}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Distance (KM)"
              value={currentItemData.distance}
              onChangeText={text => handleNumericInputValidate(text, 'distance', item.id)}
              isEditing={isItemEditable}
              keyboardType="numeric"
              isDisabled={!isItemEditable}
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
            <EditableRow
              label="Bill Number"
              value={currentItemData.billNumber}
              onChangeText={text => handleInputChange(text, item.id, 'billNumber')}
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
            <EditableRow
              label="Claim Amount (INR)"
              value={currentItemData.claimAmount}
              isEditing={isItemEditable}
              isDisabled={!isItemEditable}
              onChangeText={text => handleNumericInputValidate(text, 'claimAmount', item.id)}
              keyboardType="numeric"
              isRequired={true}
              placeholderTextColor={CustomColors.textGray}
              CustomColors={CustomColors}
              styles={styles}
            />
          </View>
        )}
      </View>
    );
  }, [editedItemData, expandedItems, isEditable, toggleExpand, handleDeleteItem, handleInputChange, handleNumericInputValidate, dispatch, claimdata]);
  const ListHeader = useCallback(() => (
    <>
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
      <View style={styles.dailyItemsHeader}>
        <Text allowFontScaling={false} style={styles.mainHeading}>Local Conveyance Items</Text>
        {isEditable && (
          <TouchableOpacity onPress={handleAddExpenseItem} style={styles.plusicon}>
            <MaterialIcons name="add-circle" size={moderateScale(32)} color={CustomColors.appThemeColor} />
          </TouchableOpacity>
        )}
      </View>
      {allLocalConveyanceItems.length === 0 && !isFetchingConveyance && (
        <Text allowFontScaling={false} style={styles.noDataText}>No local conveyance items found.</Text>
      )}
    </>
  ), [travelNo, employeeCode, employeeName, claimStatusId, allLocalConveyanceItems.length, isEditable, handleAddExpenseItem, isFetchingConveyance]);
  const ListFooter = useCallback(() => (
    <View style={{ height: verticalScale(100) }} />
  ), []);
  if (isFetchingConveyance) {
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
        data={allLocalConveyanceItems}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderLocalConveyanceItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.flatListOverallContent}
        keyboardShouldPersistTaps="handled"
      />
      <View style={styles.bottomActionBar}>
        {from !== 'Checker' && (
          <TouchableOpacity
            style={[styles.fullWidthButton, {
              backgroundColor: hasUnsavedChanges && !isCreatingConveyance && isEditable
                ? CustomColors.appThemeColor
                : CustomColors.mediumGray,
            }]}
            onPress={handleSubmit}
            disabled={!hasUnsavedChanges || isCreatingConveyance || !isEditable}
          >
            <Text allowFontScaling={false} style={styles.fullWidthButtonText}>
              {isCreatingConveyance ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={new Date(datePickerValue)}
          mode="date"
          display="spinner"
          onChange={(event, selectedDate) => {
            if (event.type === 'dismissed') {
              dispatch(setLocalConveyanceShowDatePicker(false));
              return;
            }
            dispatch(setLocalConveyanceShowDatePicker(false));
            const selected = selectedDate || parseDDMMYYYYToDate(datePickerValue);
            dispatch(updateLocalConveyanceEditedItemField({
              value: formatDateToDDMMYYYY(selected),
              itemId: activePickerItemId,
              field: 'date'
            }));
          }}
          minimumDate={
            claimdata?.tour_startdate
              ? parseDDMMYYYYToDate(claimdata.tour_startdate)
              : new Date(1900, 0, 1)
          }
          maximumDate={
            claimdata?.tour_enddate
              ? parseDDMMYYYYToDate(claimdata.tour_enddate)
              : new Date(2100, 11, 31)
          }
        />
      )}
      {activePickerItemId && (
        <CustomActionSheetPicker
          pickerStatus={showSubCategoryPicker}
          setPickerStatus={(status) => dispatch(setLocalConveyanceShowSubCategoryPicker(status))}
          title="Select Sub Category"
          optionsData={subCategoryDropdownOptions}
          RenderItem={DropdownItem}
          onPress={(value) => {
            handleModeOfTravelChange(value, activePickerItemId);
            dispatch(setLocalConveyanceShowSubCategoryPicker(false));
          }}
          selected={editedItemData[activePickerItemId]?.subCategory}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default LocalConveyanceExpenseScreen;