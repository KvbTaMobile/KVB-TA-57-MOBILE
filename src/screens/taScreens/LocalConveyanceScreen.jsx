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

import {
  useGetLocalConvQuery,
  useLocalConvCreateMutation,
  useLazyCommonDropDownGetQuery,
  useLocalConvEligibleAmtMutation,
  useDeleteLocalConvMutation,
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
import * as styless from '../../styles/StyleSheet';

// Date Helpers
const formatDateToDDMMYYYY = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];


  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
};

const parseDDMMYYYYToDate = (dateString) => {
  if (!dateString) return new Date();
  const parts = dateString.split('-');
  if (parts.length !== 3) return new Date();
  const day = parseInt(parts[0], 10);
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthIndex = monthNames.findIndex(
    (m) => m.toLowerCase() === parts[1].toLowerCase()
  );
  const year = parseInt(parts[2], 10);
  if (
    monthIndex === -1 ||
    isNaN(day) ||
    isNaN(year)
  )
    return new Date();
  const date = new Date(year, monthIndex, day);
  if (
    isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== monthIndex ||
    date.getFullYear() !== year
  ) {
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

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Reusable Editable Row Component
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
  isRequired = false,
  styles,
  CustomColors,
}) => (
  <View style={styles.detailItemContainer}>
    <View style={styles.labelContainer}>
      <Text allowFontScaling={false} style={styles.detailLabel}>
        {label}:
      </Text>
      {isRequired && (
        <Text
          allowFontScaling={false}
          style={{ color: CustomColors.dangerRed, marginLeft: 2 }}
        >
          *
        </Text>
      )}
    </View>
    {isEditing ? (
      isDatePicker ? (
        <TouchableOpacity
          onPress={onPressDatePicker}
          disabled={isDisabled}
          style={[styles.editableTextInput, isDisabled && styles.disabledInput]}
        >
          <Text
            allowFontScaling={false}
            style={[
              styles.actionSheetTriggerButtonText,
              !value && styles.placeholderText,
              isDisabled && styles.disabledText,
            ]}
          >
            {value && value !== 'N/A' ? value : placeholder}
          </Text>
        </TouchableOpacity>
      ) : isPicker ? (
        <TouchableOpacity
          onPress={onPressPicker}
          disabled={isDisabled}
          style={[styles.editableTextInput, isDisabled && styles.disabledInput]}
        >
          <Text
            allowFontScaling={false}
            style={[
              styles.actionSheetTriggerButtonText,
              !value && styles.placeholderText,
              isDisabled && styles.disabledText,
            ]}
          >
            {value || placeholder}
          </Text>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={moderateScale(20)}
            color={isDisabled ? CustomColors.textLightGray : CustomColors.textDarkGray}
          />
        </TouchableOpacity>
      ) : (
        <TextInput
          allowFontScaling={false}
          style={[
            styles.editableTextInput,
            multiline && styles.multilineInput,
            isDisabled && styles.disabledInput,
          ]}
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
      <Text
        allowFontScaling={false}
        style={[styles.detailValueText, isDisabled && styles.disabledText]}
      >
        {value || 'N/A'}
      </Text>
    )}
  </View>
);

const LocalConveyanceExpenseScreen = ({ route }) => {
  const navigation = useNavigation();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  const dispatch = useDispatch();

  const localConvState = useSelector(
    (state) => (state.expense && state.expense.localConveyance) || {}
  );
  const {
    expenses = [],
    editedItemData = {},
    hasUnsavedChanges = false,
    expandedItems = {},
    showDatePicker = false,
    activePickerItemId = null,
    datePickerValue = '',
  } = localConvState;

  // Picker modal controls
  const [activePickerField, setActivePickerField] = useState(null); // 'modeOfTravel' | 'subCategory' | 'center' | 'onwardReturn'
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  const [claimStatusId, setClaimStatusId] = useState(null);
  const [isEditable, setIsEditable] = useState(true);

  const expenseFromRoute = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || {};

  const expenseid =
    Number(
      expenseFromRoute?.expenseid ||
      expenseFromRoute?.expense_id ||
      expenseFromRoute?.expensegid ||
      route?.params?.expenseid ||
      route?.params?.expense_id ||
      route?.params?.expensegid ||
      4
    ) || 4;

  const requestercomment = expenseFromRoute.requestercomment;

  const tourId =
    route?.params?.tourId ||
    expenseFromRoute?.tourid ||
    expenseFromRoute?.tour_id ||
    claimdata?.tourid ||
    claimdata?.id ||
    route?.params?.tour_id ||
    route?.params?.tourgid ||
    4796;
  const employeeCode = expenseFromRoute?.employee_code || claimdata?.employee_code;
  const employeeName = expenseFromRoute?.employee_name || claimdata?.employee_name;
  const employeeGrade =
    claimdata?.empgrade ||
    claimdata?.emp_grade ||
    expenseFromRoute?.empgrade ||
    expenseFromRoute?.emp_grade ||
    claimdata?.grade ||
    expenseFromRoute?.grade ||
    '';
  const employeeDesignation =
    claimdata?.designation ||
    claimdata?.empdesignation ||
    expenseFromRoute?.designation ||
    expenseFromRoute?.empdesignation ||
    '';
  const travelNo =
    route?.params?.tourId ||
    expenseFromRoute?.tourid ||
    expenseFromRoute?.tour_id ||
    claimdata?.tourid ||
    claimdata?.id ||
    tourId;

  const [triggerDropdownGet] = useLazyCommonDropDownGetQuery();
  const [
    triggerEligibleAmountCalculation,
    { isLoading: isEligibleAmountCalculating },
  ] = useLocalConvEligibleAmtMutation();

  const deletedItemIds = useSelector(
    (state) => state.expense?.localConveyance?.deletedItemIds || []
  );

  const {
    data: fetchedConveyanceData,
    isLoading: isFetchingConveyance,
    isSuccess: isConveyanceSuccess,
    refetch: refetchConveyanceData,
  } = useGetLocalConvQuery(travelNo, {
    skip: !travelNo,
  });

  const [localConvCreate, { isLoading: isCreatingConveyance }] =
    useLocalConvCreateMutation();
  const [deleteLocalConv] = useDeleteLocalConvMutation();


  const [modeOfTravelOptions, setModeOfTravelOptions] = useState([]);
  const [onwardReturnOptions, setOnwardReturnOptions] = useState([]);
  const [trainSubCategoryOptions, setTrainSubCategoryOptions] = useState([]);
  const [roadSubCategoryOptions, setRoadSubCategoryOptions] = useState([]);
  const [centerOptions, setCenterOptions] = useState([]);

  const subCategoryMap = {
    Train: trainSubCategoryOptions,
    Road: roadSubCategoryOptions,
  };

  const styles = StyleSheet.create({
    keyboardAvoidingContainer: {
      flex: 1,
    },
    flatListOverallContent: {
      flexGrow: 1,
      padding: moderateScale(16),
      backgroundColor: CustomColors.appScreenColor,
      paddingBottom: verticalScale(120),
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
      margin: horizontalScale(10),
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
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sNoBadge: {
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(12),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(2),
      marginRight: horizontalScale(10),
    },
    sNoText: {
      color: CustomColors.white,
      fontSize: moderateScale(12),
      fontFamily: Fonts.bold,
    },
    cardTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.semiBold,
      color: CustomColors.appThemeColor,
      flex: 1,
    },
    cardHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deleteIconBtn: {
      padding: moderateScale(4),
      marginRight: horizontalScale(8),
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
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(16),
      borderTopWidth: 1,
      borderTopColor: CustomColors.lightGray,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bottomButton: {
      flex: 1,
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: horizontalScale(5),
    },
    backButton: {
      backgroundColor: CustomColors.mediumGray,
    },
    submitButton: {
      backgroundColor: CustomColors.appThemeColor,
    },
    bottomButtonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(15),
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
      headerTitle: () => (
        <Text
          allowFontScaling={false}
          style={[
            globalStyles.headerTitle,
            {
              fontSize: moderateScale(20),
              fontWeight: '600',
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
      dispatch(setLocalConveyanceExpenses(fetchedList));
      fetchedList.forEach((item) => {
        const mode =
          typeof item.modeoftravel === 'object'
            ? item.modeoftravel?.value
            : item.modeoftravel || '';

        const sub =
          typeof item.subcatogory === 'object'
            ? item.subcatogory?.value
            : item.subcatogory ||
              (typeof item.subcategory === 'object'
                ? item.subcategory?.value
                : item.subcategory || '');

        const cntr =
          typeof item.center === 'object'
            ? item.center?.value
            : item.center || '';

        const onw =
          typeof item.onwardreturn === 'object'
            ? String(item.onwardreturn?.value)
            : item.onwardreturn !== null && item.onwardreturn !== undefined
            ? String(item.onwardreturn)
            : '1';

        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'modeOfTravel',
            value: mode,
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'subCategory',
            value: sub,
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'center',
            value: cntr,
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'date',
            value: item.fromdate || '',
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'fromPlace',
            value: item.fromplace || '',
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'toPlace',
            value: item.toplace || '',
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'onwardReturn',
            value: onw,
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'distance',
            value:
              item.distance !== null && item.distance !== undefined
                ? String(item.distance)
                : '',
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'billNumber',
            value: item.billno || '',
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'remarks',
            value: item.remarks || '',
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'claimAmount',
            value: String(item.claimedamount || ''),
          })
        );
        dispatch(
          updateLocalConveyanceEditedItemField({
            itemId: item.id,
            field: 'eligibleamount',
            value: String(item.eligibleamount ?? ''),
          })
        );
      });
      const currentStatusId = Number(
        claimdata?.claim_status_id ??
        claimdata?.status_id ??
        expenseFromRoute?.claim_status_id ??
        expenseFromRoute?.status_id
      );
      setClaimStatusId(currentStatusId);
      const editableStatuses = [-1, 1, 5];
      setIsEditable(
        !isNaN(currentStatusId) && currentStatusId !== 0
          ? editableStatuses.includes(currentStatusId)
          : true
      );
    }
  }, [fetchedConveyanceData, isConveyanceSuccess, dispatch, claimdata, expenseFromRoute]);

  // Load every dropdown's options from the backend on mount — no hardcoding.
  useEffect(() => {
    const toOptions = (list) =>
      (list || []).map((o) => ({ label: o.name, value: o.value }));

    const loadDropdown = async (code, setter, label) => {
      try {
        const res = await triggerDropdownGet(code).unwrap();
        setter(toOptions(res));
      } catch (e) {
        ToastMessage({
          type: 'error',
          text1: 'Error',
          text2: `Could not load ${label} options.`,
        });
      }
    };

    loadDropdown('conv_travelmode', setModeOfTravelOptions, 'Mode of Travel');
    loadDropdown('conv_train', setTrainSubCategoryOptions, 'Train Subcategory');
    loadDropdown('conv_road', setRoadSubCategoryOptions, 'Road Subcategory');
    loadDropdown('conv_onward', setOnwardReturnOptions, 'Onward/Return');
    loadDropdown('conv_center', setCenterOptions, 'Center');
  }, [triggerDropdownGet]);

  // Calculate Eligible Amount API handler
  const fetchEligibleAmount = useCallback(
    async (itemId, selectedCenter, selectedSubCat) => {
      try {
        const item = editedItemData[itemId] || {};
        const centerToUse = selectedCenter || item.center;
        const subCatToUse = selectedSubCat || item.subCategory;
        if (!centerToUse) return;

        const res = await triggerEligibleAmountCalculation({
          center: centerToUse,
          subcatogory: subCatToUse,
          subcategory: subCatToUse,
          distance:
            item.distance !== '' &&
            item.distance !== null &&
            !isNaN(parseFloat(item.distance))
              ? parseFloat(item.distance)
              : null,
          expense_id: Number(expenseid) || 4,
          expenseid: Number(expenseid) || 4,
          expensegid: Number(expenseid) || 4,
          tourgid: Number(tourId),
          tour_id: Number(tourId),
          tourid: Number(tourId),
        }).unwrap();

        if (res?.Eligible_amount !== undefined) {
          dispatch(
            updateLocalConveyanceEditedItemField({
              itemId,
              field: 'eligibleamount',
              value: String(res.Eligible_amount),
            })
          );
        }
      } catch (error) {
        // Silently catch or handle
      }
    },
    [dispatch, expenseid, tourId, triggerEligibleAmountCalculation, editedItemData]
  );

  const DropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected = String(selected ?? '') === String(options.value ?? '');
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
        <Text
          allowFontScaling={false}
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

  const handleInputChange = useCallback(
    (value, itemId, field) => {
      dispatch(updateLocalConveyanceEditedItemField({ value, itemId, field }));
    },
    [dispatch]
  );

  const handleNumericInputValidate = useCallback(
    async (text, key, itemId) => {
      const cleanedValue = text.replace(/[^0-9.]/g, '');
      dispatch(
        updateLocalConveyanceNumericItemField({ text: cleanedValue, key, itemId })
      );

      const currentItem = editedItemData[itemId] || {};
      if (key === 'claimAmount') {
        const eligible = parseFloat(currentItem.eligibleamount || 0);
        const claimed = parseFloat(cleanedValue || 0);
        const remarks = currentItem.remarks;
        if (
          claimed > eligible &&
          (!remarks || String(remarks).trim() === '')
        ) {
          ToastMessage('Please Enter Remarks for Limit Exceeding');
        }
      }
    },
    [dispatch, editedItemData]
  );

  const toggleExpand = useCallback(
    (id) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      dispatch(toggleLocalConveyanceItemExpansion(id));
    },
    [dispatch]
  );

  const handleDeleteItem = useCallback(
    (itemId) => {
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
            onPress: async () => {
              if (itemId && !String(itemId).startsWith('temp-')) {
                try {
                  await deleteLocalConv(itemId).unwrap();
                } catch (e) {
                  // ignored or handled
                }
              }
              dispatch(deleteLocalConveyanceExpenseItem(itemId));
              ToastMessage('Expense item deleted.');
            },
          },
        ]
      );
    },
    [isEditable, dispatch, deleteLocalConv]
  );

  const handleAddExpenseItem = useCallback(() => {
    if (!isEditable) {
      ToastMessage('This claim cannot be modified in its current status.');
      return;
    }
    dispatch(addLocalConveyanceExpenseItem());
    ToastMessage('New expense item added. Please fill details.');
  }, [isEditable, dispatch]);

  const allLocalConveyanceItems = useMemo(() => {
    return expenses
      .filter((item) => !deletedItemIds.includes(item.id))
      .map((item) => ({
        ...item,
        ...(editedItemData[item.id] || {}),
        id: item.id,
        distance: String(
          editedItemData[item.id]?.distance || item.distance || ''
        ),
        claimAmount: String(
          editedItemData[item.id]?.claimAmount || item.claimAmount || ''
        ),
        eligibleamount: String(
          editedItemData[item.id]?.eligibleamount ?? item.eligibleamount ?? ''
        ),
      }));
  }, [expenses, editedItemData, deletedItemIds]);

  const handleSubmit = useCallback(async () => {
    if (!hasUnsavedChanges || !isEditable || isCreatingConveyance) {
      if (!isEditable) {
        ToastMessage('This claim cannot be submitted in its current status.');
      } else if (!hasUnsavedChanges) {
        ToastMessage('There are no unsaved changes to submit.');
      } else if (isCreatingConveyance) {
        ToastMessage('Submission in progress...');
      }
      return;
    }

    const itemsToSubmit = allLocalConveyanceItems.filter(
      (item) => !deletedItemIds.includes(item.id)
    );

    if (itemsToSubmit.length === 0) {
      ToastMessage('There are no unsaved changes to submit.');
      return;
    }

    const mandatoryFields = [
      { key: 'modeOfTravel', label: 'Mode of Travel' },
      { key: 'subCategory', label: 'Subcategory' },
      { key: 'center', label: 'Center' },
      { key: 'fromPlace', label: 'From Place' },
      { key: 'toPlace', label: 'To Place' },
      { key: 'onwardReturn', label: 'Onward/Return' },
      { key: 'claimAmount', label: 'Claim Amount' },
      { key: 'remarks', label: 'Remarks' },
    ];

    for (let i = 0; i < itemsToSubmit.length; i++) {
      const item = itemsToSubmit[i];
      const sNo = i + 1;

      for (const field of mandatoryFields) {
        const val = item[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          ToastMessage(`Item #${sNo}: Please select or enter ${field.label}.`);
          return;
        }
      }

      const claimVal = parseFloat(item.claimAmount || 0);
      if (isNaN(claimVal) || claimVal <= 0) {
        ToastMessage(`Item #${sNo}: Please enter a valid Claim Amount.`);
        return;
      }
    }

    const payloadData = itemsToSubmit.map((item) => {
      const modeVal =
        typeof item.modeOfTravel === 'object'
          ? item.modeOfTravel?.value
          : item.modeOfTravel || '';

      const subCatVal =
        typeof item.subCategory === 'object'
          ? item.subCategory?.value
          : item.subCategory ||
            (typeof item.subcatogory === 'object'
              ? item.subcatogory?.value
              : item.subcatogory || '');

      const centerVal =
        typeof item.center === 'object'
          ? item.center?.value
          : item.center || '';

      const onwardVal =
        item.onwardReturn !== undefined &&
        item.onwardReturn !== null &&
        item.onwardReturn !== ''
          ? Number(item.onwardReturn)
          : typeof item.onwardreturn === 'object'
          ? Number(item.onwardreturn?.value ?? 1)
          : Number(item.onwardreturn ?? 1);

      const claimVal = parseFloat(item.claimAmount || item.claimedamount || 0);
      const eligVal = parseFloat(item.eligibleamount || 0);
      const distVal =
        item.distance !== '' &&
        item.distance !== null &&
        item.distance !== undefined &&
        !isNaN(parseFloat(item.distance))
          ? parseFloat(item.distance)
          : null;

      const baseItem = {
        tourgid: Number(tourId),
        tour_id: Number(tourId),
        tourid: Number(tourId),
        expense_id: Number(expenseid) || 4,
        expensegid: Number(expenseid) || 4,
        expenseid: Number(expenseid) || 4,
        center: centerVal,
        modeoftravel: modeVal,
        subcatogory: subCatVal, // REQUIRED: Backend expects subcatogory
        subcategory: subCatVal, // BACKWARD COMPATIBILITY
        fromplace: item.fromPlace || item.fromplace || '',
        toplace: item.toPlace || item.toplace || '',
        onwardreturn: isNaN(onwardVal) ? 1 : onwardVal, // 1: Onward, 0: Return
        distance: distVal,
        claimedamount: claimVal,
        eligibleamount: eligVal,
        remarks: item.remarks || '',
        requestercomment: requestercomment || '',
        gstno: item.gstno || '',
        invoicedate: item.invoicedate || null,
        invoiceno: item.invoiceno || null,
        total_eligibleamt: eligVal,
      };

      if (item.id && !String(item.id).startsWith('temp-')) {
        baseItem.id = item.id;
      }

      return baseItem;
    });

    try {
      const res = await localConvCreate({ data: payloadData }).unwrap();
      if (
        res?.message === 'Successfully Created' ||
        res?.message === 'Successfully Updated' ||
        res?.status === 'success' ||
        (res?.message && String(res?.message).toLowerCase().includes('success'))
      ) {
        ToastMessage('Local Conveyance submitted successfully!');
        dispatch(setLocalConveyanceHasUnsavedChanges(false));
        dispatch(resetLocalConveyanceState());
        refetchConveyanceData();
        navigation.goBack();
      } else {
        const errorDesc =
          res?.description || res?.message || 'An error occurred during submission.';
        ToastMessage(String(errorDesc), 'error');
      }
    } catch (err) {
      ToastMessage(
        err?.data?.description ||
          err?.data?.message ||
          err?.message ||
          'An error occurred during submission. Please try again.',
        'error'
      );
    }
  }, [
    hasUnsavedChanges,
    isEditable,
    isCreatingConveyance,
    allLocalConveyanceItems,
    deletedItemIds,
    tourId,
    expenseid,
    requestercomment,
    dispatch,
    refetchConveyanceData,
    localConvCreate,
    navigation,
  ]);

  const renderLocalConveyanceItem = useCallback(
    ({ item, index }) => {
      const isExpanded = expandedItems[item.id];
      const currentItemData = editedItemData[item.id] || item;
      const isTempItem = item.id?.toString().startsWith('temp-');
      const isItemEditable = isEditable || isTempItem;

      const isCenterEnabled =
        isItemEditable &&
        Boolean(currentItemData.modeOfTravel) &&
        Boolean(currentItemData.subCategory);
      return (
        <View key={item.id} style={styles.itemCard}>
          <TouchableOpacity
            onPress={() => toggleExpand(item.id)}
            style={styles.cardHeader}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeaderLeft}>
              <View style={styles.sNoBadge}>
                <Text allowFontScaling={false} style={styles.sNoText}>
                  S.No {index + 1}
                </Text>
              </View>
              <Text allowFontScaling={false} style={styles.cardTitle}>
                {currentItemData.subCategory || 'New Item'}
              </Text>
            </View>

            <View style={styles.cardHeaderActions}>
              {isItemEditable && (
                <TouchableOpacity
                  onPress={() => handleDeleteItem(item.id)}
                  style={styles.deleteIconBtn}
                >
                  <MaterialIcons
                    name="delete"
                    size={moderateScale(24)}
                    color={CustomColors.dangerRed || 'red'}
                  />
                </TouchableOpacity>
              )}
              <MaterialIcons
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={moderateScale(28)}
                color={CustomColors.appThemeColor}
              />
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.cardDetails}>
              {/* Mode of Travel* */}
              <EditableRow
                label="Mode of Travel"
                value={currentItemData.modeOfTravel}
                isPicker={true}
                isEditing={isItemEditable}
                isDisabled={!isItemEditable}
                onPressPicker={() => {
                  dispatch(setLocalConveyanceActivePickerItemId(item.id));
                  setActivePickerField('modeOfTravel');
                  setPickerModalVisible(true);
                }}
                placeholder="Select Mode of Travel"
                isRequired={true}
                CustomColors={CustomColors}
                styles={styles}
              />

              {/* Subcategory* */}
              <EditableRow
                label="Subcategory"
                value={currentItemData.subCategory}
                isPicker={true}
                isEditing={isItemEditable}
                isDisabled={!isItemEditable}
                onPressPicker={() => {
                  dispatch(setLocalConveyanceActivePickerItemId(item.id));
                  setActivePickerField('subCategory');
                  setPickerModalVisible(true);
                }}
                placeholder="Select Subcategory"
                isRequired={true}
                CustomColors={CustomColors}
                styles={styles}
              />

              {/* Center */}
              <EditableRow
                label="Center"
                value={currentItemData.center}
                placeholder="Select Center"
                isPicker={true}
                isDisabled={!isCenterEnabled}
                isEditing={isItemEditable}
                onPressPicker={() => {
                  if (!isCenterEnabled) return;
                  dispatch(setLocalConveyanceActivePickerItemId(item.id));
                  setActivePickerField('center');
                  setPickerModalVisible(true);
                }}
                isRequired={true}
                CustomColors={CustomColors}
                styles={styles}
              />


              {/* From Place */}
              <EditableRow
                label="From Place"
                value={currentItemData.fromPlace}
                onChangeText={(text) =>
                  handleInputChange(text, item.id, 'fromPlace')
                }
                isEditing={isItemEditable}
                isDisabled={!isItemEditable}
                isRequired={true}
                CustomColors={CustomColors}
                styles={styles}
              />

              {/* To Place* */}
              <EditableRow
                label="To Place"
                value={currentItemData.toPlace}
                onChangeText={(text) =>
                  handleInputChange(text, item.id, 'toPlace')
                }
                isEditing={isItemEditable}
                isDisabled={!isItemEditable}
                isRequired={true}
                CustomColors={CustomColors}
                styles={styles}
              />

              {/* Onward/Return */}
              <EditableRow
                label="Onward/Return"
                value={
                  onwardReturnOptions.find(
                    (o) => String(o.value) === String(currentItemData.onwardReturn)
                  )?.label ||
                  (String(currentItemData.onwardReturn) === '0'
                    ? 'Return'
                    : String(currentItemData.onwardReturn) === '1'
                    ? 'Onward'
                    : '')
                }
                isPicker={true}
                isEditing={isItemEditable}
                isDisabled={!isItemEditable}
                isRequired={true}
                onPressPicker={() => {
                  dispatch(setLocalConveyanceActivePickerItemId(item.id));
                  setActivePickerField('onwardReturn');
                  setPickerModalVisible(true);
                }}
                placeholder="Select Onward/Return"
                CustomColors={CustomColors}
                styles={styles}
              />

              {/* Distance (KM) */}
              <EditableRow
                label="Distance (KM)"
                value={currentItemData.distance}
                onChangeText={(text) =>
                  handleNumericInputValidate(text, 'distance', item.id)
                }
                isEditing={isItemEditable}
                keyboardType="numeric"
                isDisabled={!isItemEditable}
                CustomColors={CustomColors}
                styles={styles}
              />

              {/* Eligible Amount Input Field */}
              <EditableRow
                label="Eligible Amount"
                value={currentItemData.eligibleamount}
                isEditing={isItemEditable}
                isDisabled={!isItemEditable}
                onChangeText={(text) =>
                  handleNumericInputValidate(text, 'eligibleamount', item.id)
                }
                keyboardType="numeric"
                placeholder="Enter Eligible Amount"
                CustomColors={CustomColors}
                styles={styles}
              />

              {/* Claim Amount* */}
              <EditableRow
                label="Claim Amount (INR)"
                value={currentItemData.claimAmount}
                isEditing={isItemEditable}
                isDisabled={!isItemEditable}
                onChangeText={(text) =>
                  handleNumericInputValidate(text, 'claimAmount', item.id)
                }
                keyboardType="numeric"
                isRequired={true}
                CustomColors={CustomColors}
                styles={styles}
              />

              {/* Bill Number */}
              {/* <EditableRow
                label="Bill Number"
                value={currentItemData.billNumber}
                onChangeText={(text) =>
                  handleInputChange(text, item.id, 'billNumber')
                }
                isEditing={isItemEditable}
                isDisabled={!isItemEditable}
                CustomColors={CustomColors}
                styles={styles}
              /> */}

              {/* Remarks* */}
              <EditableRow
                label="Remarks"
                value={currentItemData.remarks}
                onChangeText={(text) =>
                  handleInputChange(text, item.id, 'remarks')
                }
                isEditing={isItemEditable}
                multiline={true}
                isDisabled={!isItemEditable}
                isRequired={true}
                CustomColors={CustomColors}
                styles={styles}
              />
            </View>
          )}
        </View>
      );
    },
    [
      editedItemData,
      expandedItems,
      isEditable,
      toggleExpand,
      handleDeleteItem,
      handleInputChange,
      handleNumericInputValidate,
      dispatch,
      claimdata,
      styles,
      CustomColors,
      onwardReturnOptions,
    ]
  );

  const ListHeader = useCallback(
    () => (
      <>
        <View style={styles.sectionCard}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>
            Tour Details
          </Text>
          <View style={styles.detailRow}>
            <Text allowFontScaling={false} style={styles.boldText}>
              Tour No:
            </Text>
            <Text allowFontScaling={false} style={styles.detailValueText}>
              {travelNo || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text allowFontScaling={false} style={styles.boldText}>
              Employee Code:
            </Text>
            <Text allowFontScaling={false} style={styles.detailValueText}>
              {employeeCode || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text allowFontScaling={false} style={styles.boldText}>
              Employee Name:
            </Text>
            <Text allowFontScaling={false} style={styles.detailValueText}>
              {employeeName || 'N/A'}
            </Text>
          </View>
          {employeeDesignation ? (
            <View style={styles.detailRow}>
              <Text allowFontScaling={false} style={styles.boldText}>
                Designation:
              </Text>
              <Text allowFontScaling={false} style={styles.detailValueText}>
                {employeeDesignation}
              </Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text allowFontScaling={false} style={styles.boldText}>
              Employee Grade:
            </Text>
            <Text allowFontScaling={false} style={styles.detailValueText}>
              {employeeGrade || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.dailyItemsHeader}>
          <Text allowFontScaling={false} style={styles.mainHeading}>
            Local Conveyance Items
          </Text>
          {isEditable && (
            <TouchableOpacity
              onPress={handleAddExpenseItem}
              style={styles.plusicon}
            >
              <MaterialIcons
                name="add-circle"
                size={moderateScale(32)}
                color={CustomColors.appThemeColor}
              />
            </TouchableOpacity>
          )}
        </View>

        {allLocalConveyanceItems.length === 0 && !isFetchingConveyance && (
          <Text allowFontScaling={false} style={styles.noDataText}>
            No local conveyance items found.
          </Text>
        )}
      </>
    ),
    [
      travelNo,
      employeeCode,
      employeeName,
      employeeDesignation,
      employeeGrade,
      allLocalConveyanceItems.length,
      isEditable,
      handleAddExpenseItem,
      isFetchingConveyance,
      styles,
      CustomColors,
    ]
  );

  const ListFooter = useCallback(
    () => <View style={{ height: verticalScale(100) }} />,
    []
  );

  // Dynamic Options for ActionSheet
  const currentActiveItem = activePickerItemId
    ? editedItemData[activePickerItemId] || {}
    : {};
  const currentMode = currentActiveItem.modeOfTravel || '';

  let currentPickerOptions = [];
  if (activePickerField === 'modeOfTravel') {
    currentPickerOptions = modeOfTravelOptions;
  } else if (activePickerField === 'subCategory') {
    currentPickerOptions =
      subCategoryMap[currentMode] || subCategoryMap['Road'];
  } else if (activePickerField === 'center') {
    currentPickerOptions = centerOptions;
  } else if (activePickerField === 'onwardReturn') {
    currentPickerOptions = onwardReturnOptions;
  }

  const handlePickerSelect = (val) => {
    if (!activePickerItemId) return;

    if (activePickerField === 'modeOfTravel') {
      dispatch(
        updateLocalConveyanceEditedItemField({
          itemId: activePickerItemId,
          field: 'modeOfTravel',
          value: val,
        })
      );
      const defaultSub = subCategoryMap[val]?.[0]?.value || val;
      dispatch(
        updateLocalConveyanceEditedItemField({
          itemId: activePickerItemId,
          field: 'subCategory',
          value: defaultSub,
        })
      );
      dispatch(
        updateLocalConveyanceEditedItemField({
          itemId: activePickerItemId,
          field: 'center',
          value: '',
        })
      );
    } else if (activePickerField === 'subCategory') {
      dispatch(
        updateLocalConveyanceEditedItemField({
          itemId: activePickerItemId,
          field: 'subCategory',
          value: val,
        })
      );
      const item = editedItemData[activePickerItemId] || {};
      if (item.center) {
        fetchEligibleAmount(activePickerItemId, item.center, val);
      }
    } else if (activePickerField === 'center') {
      dispatch(
        updateLocalConveyanceEditedItemField({
          itemId: activePickerItemId,
          field: 'center',
          value: val,
        })
      );
      fetchEligibleAmount(activePickerItemId, val);
    } else if (activePickerField === 'onwardReturn') {
      dispatch(
        updateLocalConveyanceEditedItemField({
          itemId: activePickerItemId,
          field: 'onwardReturn',
          value: String(val),
        })
      );
    }
  };

  if (isFetchingConveyance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={styles.loadingText}>
          Please Wait...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={allLocalConveyanceItems}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderLocalConveyanceItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.flatListOverallContent}
        keyboardShouldPersistTaps="handled"
      />

      {/* Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={[styles.bottomButton, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Text allowFontScaling={false} style={styles.bottomButtonText}>
            Back
          </Text>
        </TouchableOpacity>

        {from !== 'Checker' && (
          <TouchableOpacity
            style={[
              styles.bottomButton,
              styles.submitButton,
              {
                backgroundColor:
                  hasUnsavedChanges && !isCreatingConveyance && isEditable
                    ? CustomColors.appThemeColor
                    : CustomColors.mediumGray,
              },
            ]}
            onPress={handleSubmit}
            disabled={!hasUnsavedChanges || isCreatingConveyance || !isEditable}
          >
            <Text allowFontScaling={false} style={styles.bottomButtonText}>
              {isCreatingConveyance ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>


      {/* Dynamic Action Sheet Picker */}
      {activePickerItemId && (
        <CustomActionSheetPicker
          pickerStatus={pickerModalVisible}
          setPickerStatus={(status) => setPickerModalVisible(status)}
          title={`Select ${activePickerField === 'modeOfTravel'
            ? 'Mode of Travel'
            : activePickerField === 'subCategory'
              ? 'Subcategory'
              : activePickerField === 'center'
                ? 'Center'
                : 'Onward/Return'
            }`}
          optionsData={currentPickerOptions}
          RenderItem={DropdownItem}
          onPress={(value) => {
            handlePickerSelect(value);
            setPickerModalVisible(false);
          }}
          selected={currentActiveItem[activePickerField]}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default LocalConveyanceExpenseScreen;