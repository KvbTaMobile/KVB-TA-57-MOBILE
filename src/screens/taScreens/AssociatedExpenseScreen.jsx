import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
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
  ScrollView,
  Modal,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { getCustomColors } from '../../styles/CustomColors';
import {
  verticalScale,
  horizontalScale,
  moderateScale,
} from '../../styles/Metrics';
import { Fonts } from '../../styles/Fonts';
import ToastMessage from '../../TaComponents/toast/ToastMessage';
import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';
import {
  useLazyGetCommonDropdownQuery,
  useLazyGetIbaSummaryQuery,
  useIbaCreateMutation,
  useIbaEligibleAmtMutation,
  useDeleteIbaTripMutation,
  useIbaApproveMutation,
  useIbaSubmitApUserMutation,
} from '../../redux/rtk_query/apiSlice';
import * as styless from '../../styles/StyleSheet';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


/* ============================================================================
 * CONSTANTS & OPTIONS
 * NOTE: these are only *fallbacks* used until the real dropdown data arrives
 * from /taserv/common_dropdown_get/... . Their `value`s must match what the
 * backend actually returns, or a row created before the dropdowns load will
 * carry a value the backend rejects on submit.
 * ========================================================================== */

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const DEFAULT_TRAVEL_MODES = [
  { label: 'ROAD', value: 'ROAD' },
];

const DEFAULT_SUBCATEGORIES = [
  { label: 'Four Wheeler - Engine capacity of above 1000 CC', value: 'Above 1000 CC' },
  { label: 'Four Wheeler - Engine capacity of below 1000 CC', value: 'Below 1000 CC' },
  { label: 'Motor Cycle / Scooter', value: 'Motor Cycle / Sc' },
  { label: 'Mopeds', value: 'Mopeds' },
];

const ONWARD_RETURN_OPTIONS = [
  { label: 'Onward', value: '1' },
  { label: 'Return', value: '0' },
];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CURRENT_YEAR = new Date().getFullYear();
const ALL_YEARS = Array.from(
  { length: CURRENT_YEAR - 1950 + 5 },
  (_, i) => CURRENT_YEAR + 2 - i
);

/* ============================================================================
 * DATE HELPERS
 * ========================================================================== */

const formatDateToYYYYMMDD = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${dateObj.getFullYear()}-${month}-${day}`;
};

const parseDateStrToObj = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const day = parseInt(parts[0], 10);
    let monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === parts[1].toLowerCase());
    if (monthIndex === -1) monthIndex = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(year) && monthIndex >= 0) {
      return new Date(year, monthIndex, day);
    }
  }
  return new Date();
};

/* ============================================================================
 * PICKER ITEM STYLES & DROPDOWN ITEM COMPONENT
 * ========================================================================== */

const pickerStyles = StyleSheet.create({
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(14),
    paddingHorizontal: horizontalScale(16),
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: moderateScale(15),
  },
});

const DropdownItem = React.memo(({ options, onPress, setPickerStatus, selected }) => {
  const isDark = useSelector((state) => state.theme?.isDark || false);
  const CustomColors = getCustomColors(isDark);
  const optionValue = options?.value !== undefined ? options.value : (options?.id !== undefined ? options.id : options?.label);
  const optionLabel = options?.label || options?.name || String(optionValue || '');
  const isSelected = String(selected) === String(optionValue);

  return (
    <TouchableOpacity
      style={[
        pickerStyles.optionItem,
        {
          borderBottomColor: CustomColors.borderLight,
          backgroundColor: isSelected ? CustomColors.primaryLight : 'transparent',
          borderRadius: isSelected ? moderateScale(8) : 0,
        },
      ]}
      onPress={() => {
        onPress(optionValue, optionLabel);
        setPickerStatus(false);
      }}
      activeOpacity={0.7}
    >
      <Text
        allowFontScaling={false}
        style={[
          pickerStyles.optionText,
          {
            color: isSelected ? CustomColors.appThemeColor : CustomColors.textDark,
            fontFamily: isSelected ? Fonts.bold : Fonts.regular,
          },
        ]}
      >
        {optionLabel}
      </Text>
      {isSelected && (
        <MaterialIcons
          name="check-circle"
          size={moderateScale(20)}
          color={CustomColors.appThemeColor}
        />
      )}
    </TouchableOpacity>
  );
});

/* ============================================================================
 * MODERN PROFESSIONAL EDITABLE ROW
 * ========================================================================== */

const EditableRow = React.memo(
  ({
    label,
    value,
    onChangeText,
    isEditing = true,
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
    styles,
    suffixText = null,
    prefixText = null,
  }) => {
    return (
      <View style={styles.detailItemContainer}>
        <View style={styles.labelRow}>
          <Text allowFontScaling={false} style={styles.detailLabel}>
            {label}
          </Text>
          {isRequired && (
            <Text allowFontScaling={false} style={styles.requiredAsterisk}>
              *
            </Text>
          )}
        </View>

        {isPicker ? (
          <TouchableOpacity
            style={[
              styles.inputBox,
              isDisabled ? styles.disabledInputBox : styles.editableInputBox,
            ]}
            onPress={isDisabled ? undefined : onPressPicker}
            activeOpacity={0.7}
            disabled={isDisabled}
          >
            {prefixText ? (
              <Text allowFontScaling={false} style={styles.prefixText}>
                {prefixText}
              </Text>
            ) : null}
            <Text
              allowFontScaling={false}
              style={[
                styles.inputValueText,
                !value && styles.placeholderText,
                isDisabled && styles.disabledValueText,
              ]}
              numberOfLines={2}
            >
              {value || placeholder || 'Select'}
            </Text>
            {!isDisabled && (
              <MaterialIcons
                name="keyboard-arrow-down"
                size={moderateScale(22)}
                color={CustomColors.textGray}
              />
            )}
          </TouchableOpacity>
        ) : isDatePicker ? (
          <TouchableOpacity
            style={[
              styles.inputBox,
              isDisabled ? styles.disabledInputBox : styles.editableInputBox,
            ]}
            onPress={isDisabled ? undefined : onPressDatePicker}
            activeOpacity={0.7}
            disabled={isDisabled}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.inputValueText,
                !value && styles.placeholderText,
                isDisabled && styles.disabledValueText,
              ]}
            >
              {value || placeholder || 'Select Date'}
            </Text>
            <MaterialIcons
              name="calendar-today"
              size={moderateScale(18)}
              color={CustomColors.appThemeColor}
            />
          </TouchableOpacity>
        ) : isEditing && !isDisabled ? (
          <View
            style={[
              styles.inputBox,
              styles.editableInputBox,
              multiline && styles.multilineInputBox,
            ]}
          >
            {prefixText ? (
              <Text allowFontScaling={false} style={styles.prefixText}>
                {prefixText}
              </Text>
            ) : null}
            <TextInput
              allowFontScaling={false}
              style={[
                styles.editableTextInput,
                multiline && styles.multilineTextInput,
              ]}
              value={value !== null && value !== undefined ? String(value) : ''}
              onChangeText={onChangeText}
              keyboardType={keyboardType}
              multiline={multiline}
              placeholder={placeholder}
              placeholderTextColor={CustomColors.textLightGray || '#94A3B8'}
            />
            {suffixText ? (
              <Text allowFontScaling={false} style={styles.suffixText}>
                {suffixText}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.inputBox, styles.disabledInputBox]}>
            {prefixText ? (
              <Text allowFontScaling={false} style={styles.disabledPrefixText}>
                {prefixText}
              </Text>
            ) : null}
            <Text
              allowFontScaling={false}
              style={[styles.inputValueText, styles.disabledValueText]}
              numberOfLines={2}
            >
              {value !== null && value !== undefined && value !== '' ? String(value) : 'N/A'}
            </Text>
            {suffixText && value ? (
              <Text allowFontScaling={false} style={styles.suffixText}>
                {suffixText}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    );
  }
);

/* ============================================================================
 * MAIN COMPONENT: AssociatedExpenseScreen (eClaim Own Vehicle On Duty IBA)
 * ========================================================================== */

const AssociatedExpenseScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isDark = useSelector((state) => state.theme?.isDark || false);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);

  // Navigation route params
  const { expense, claimdata, from } = route.params || {};

  const tourId =
    Number(
      route?.params?.tourId ||
      route?.params?.tour_id ||
      route?.params?.tourid ||
      route?.params?.tourNo ||
      route?.params?.tour_no ||
      expense?.tourid ||
      expense?.tour_id ||
      expense?.tourgid ||
      claimdata?.tourid ||
      claimdata?.tour_id ||
      claimdata?.tourgid ||
      claimdata?.id ||
      claimdata?.tour_no ||
      claimdata?.tourno ||
      claimdata?.data?.[0]?.tourid ||
      claimdata?.data?.[0]?.tour_id ||
      claimdata?.data?.[0]?.id
    ) || 0;

  const tourreq_no =
    claimdata?.requestno ||
    expense?.requestno ||
    route?.params?.requestno ||
    String(tourId || '');

  const employeeCode =
    claimdata?.employee_code ||
    expense?.employee_code ||
    '';

  const employeeName =
    claimdata?.employee_name ||
    expense?.employee_name ||
    '';

  const employeeDesignation =
    claimdata?.designation ||
    claimdata?.empdesignation ||
    expense?.designation ||
    expense?.empdesignation ||
    '';

  const employeeGrade =
    claimdata?.empgrade ||
    claimdata?.emp_grade ||
    expense?.empgrade ||
    expense?.emp_grade ||
    '';

  const gender =
    claimdata?.gender ||
    expense?.gender ||
    '';

  const requestercomment =
    expense?.requestercomment ||
    claimdata?.requestercomment ||
    '';

  const onbehalf = Boolean(claimdata?.onbehalfof || expense?.onbehalfof);
  const onbehalf_empName = `(${employeeCode}) ${employeeName}`;

  // Role flags matching Angular
  const applevel = claimdata?.applevel !== undefined ? claimdata.applevel : (expense?.applevel !== undefined ? expense.applevel : 0);
  const statusid = claimdata?.claim_status_id !== undefined ? claimdata.claim_status_id : (expense?.claim_status_id !== undefined ? expense.claim_status_id : 1);
  const enb_all_exbdetails = Boolean(route?.params?.enb_all_exbdetails);

  const isApprover =
    applevel === 1 ||
    applevel === 2 ||
    statusid === 2 ||
    statusid === 3 ||
    statusid === 4;

  const isMaker = !isApprover && !enb_all_exbdetails;
  const canApprove = applevel === 2 && statusid === 2;

  // Local State for Trip rows
  const [tripItems, setTripItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Dropdown states
  const [travelModeOptions, setTravelModeOptions] = useState(DEFAULT_TRAVEL_MODES);
  const [subCategoryOptions, setSubCategoryOptions] = useState(DEFAULT_SUBCATEGORIES);
  const [onwardReturnOptions, setOnwardReturnOptions] = useState(ONWARD_RETURN_OPTIONS);

  // Active Picker Modal States
  const [activePickerField, setActivePickerField] = useState(null);
  const [activePickerIndex, setActivePickerIndex] = useState(null);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // Custom Date Picker Modal State
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerIndex, setDatePickerIndex] = useState(null);
  const [datePickerField, setDatePickerField] = useState('invoicedate');
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [dateViewMode, setDateViewMode] = useState('calendar');
  const [dateSelectedYear, setDateSelectedYear] = useState(CURRENT_YEAR);
  const [dateSelectedMonth, setDateSelectedMonth] = useState(new Date().getMonth());

  // RTK Query Hooks
  const [triggerGetIbaSummary] = useLazyGetIbaSummaryQuery();
  const [triggerDropdownGet] = useLazyGetCommonDropdownQuery();
  const [createIbaExpense, { isLoading: isSubmitting }] = useIbaCreateMutation();
  const [calculateEligibleAmt, { isLoading: isCalculatingEligible }] = useIbaEligibleAmtMutation();
  const [deleteTripMutation] = useDeleteIbaTripMutation();
  const [approveIbaExpense, { isLoading: isApproving }] = useIbaApproveMutation();
  const [submitApUserMutation, { isLoading: isSubmittingAp }] = useIbaSubmitApUserMutation();

  /* ============================================================================
   * NAVIGATION HEADER
   * ========================================================================== */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'eClaim Own Vehicle On Duty(IBA) Expense',
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontFamily: Fonts.bold,
        fontSize: moderateScale(17),
        color: '#FFFFFF',
      },
    });
  }, [navigation, CustomColors]);

  /* ============================================================================
   * LOAD DROPDOWNS & SUMMARY
   * ========================================================================== */

  const loadDropdownData = useCallback(async () => {
    try {
      // 1. Travel Mode
      try {
        const modeRes = await triggerDropdownGet('iba_travelmode').unwrap();
        if (Array.isArray(modeRes) && modeRes.length > 0) {
          setTravelModeOptions(
            modeRes.map((m) => ({
              label: (m.name || m.label || m.value || '').toString(),
              value: m.value || m.name || m.label,
            }))
          );
        }
      } catch (e) {
        // Fallback to default
      }

      // 2. IBA Road subcategories
      try {
        const roadRes = await triggerDropdownGet('iba_road').unwrap();
        if (Array.isArray(roadRes) && roadRes.length > 0) {
          setSubCategoryOptions(
            roadRes.map((r) => ({
              label: r.name || r.label || r.value,
              value: r.value || r.id || r.name,
            }))
          );
        }
      } catch (e) {
        try {
          const roadRes2 = await triggerDropdownGet('conv_road').unwrap();
          if (Array.isArray(roadRes2) && roadRes2.length > 0) {
            setSubCategoryOptions(
              roadRes2.map((r) => ({
                label: r.name || r.label || r.value,
                value: r.value || r.id || r.name,
              }))
            );
          }
        } catch (err) {
          // Fallback to default
        }
      }

      // 3. Onward / Return
      try {
        const onwardRes = await triggerDropdownGet('conv_onward').unwrap();
        if (Array.isArray(onwardRes) && onwardRes.length > 0) {
          setOnwardReturnOptions(
            onwardRes.map((o) => ({
              label: o.name || o.label || o.value,
              value: String(o.value !== undefined ? o.value : (o.id !== undefined ? o.id : '')),
            }))
          );
        }
      } catch (e) {
        // Fallback to default
      }
    } catch (err) {
      console.log('Error loading dropdowns:', err);
    }
  }, [triggerDropdownGet]);

  // Initial factory for a blank trip row.
  // FIX: default subcatogory/modeoftravel/onwardreturn are pulled from
  // whatever dropdown options are *currently loaded* (real backend values),
  // never from a hardcoded guess -- so a freshly-added row can never carry a
  // value the backend doesn't recognise.
  const createBlankTrip = useCallback(
    (index = 0) => ({
      id: `new_${Date.now()}_${index}`,
      tourgid: tourId,
      expense_id: 9,
      modeoftravel: travelModeOptions[0]?.value || '',
      subcatogory: subCategoryOptions[0]?.value || '',
      fromplace: '',
      toplace: '',
      distance: '',
      onwardreturn: onwardReturnOptions[0]?.value || '1',
      eligibleamount: '0',
      claimedamount: '',
      remarks: '',
      gstno: '',
      invoicedate: '',
      invoiceno: '',
      approvedamount: '',
      isNew: true,
    }),
    [tourId, travelModeOptions, subCategoryOptions, onwardReturnOptions]
  );

  const fetchSummaryData = useCallback(async () => {
    if (!tourId) {
      setTripItems([createBlankTrip(0)]);
      setExpandedItems({ [0]: true });
      setIsDataLoading(false);
      return;
    }

    try {
      setIsDataLoading(true);
      const res = await triggerGetIbaSummary(tourId).unwrap();
      const rawList = res?.data || [];

      if (Array.isArray(rawList) && rawList.length > 0) {
        const mapped = rawList.map((item, idx) => ({
          id: item.id || `fetched_${Date.now()}_${idx}`,
          tourgid: item.tourgid || tourId,
          expense_id: 9,
          modeoftravel:
            item.modeoftravel?.value ||
            item.modeoftravel?.name ||
            item.modeoftravel ||
            'ROAD',
          subcatogory:
            item.subcatogory?.value ||
            item.subcatogory?.name ||
            item.subcatogory ||
            item.expense ||
            '',
          fromplace: item.fromplace || item.from_place || '',
          toplace: item.toplace || item.to_place || '',
          distance:
            item.distance !== undefined && item.distance !== null
              ? String(item.distance)
              : '',
          onwardreturn:
            item.onwardreturn?.value !== undefined
              ? String(item.onwardreturn.value)
              : item.onwardreturn
                ? String(item.onwardreturn)
                : '1',
          eligibleamount:
            item.eligibleamount !== undefined && item.eligibleamount !== null
              ? String(item.eligibleamount)
              : '0',
          claimedamount:
            item.claimedamount !== undefined && item.claimedamount !== null
              ? String(item.claimedamount)
              : '',
          remarks: item.remarks || '',
          gstno: item.gstno || '',
          invoicedate: item.invoicedate || '',
          invoiceno: item.invoiceno || '',
          approvedamount:
            item.approvedamount !== undefined && item.approvedamount !== null
              ? String(item.approvedamount)
              : '',
          isNew: false,
        }));

        setTripItems(mapped);
        const exp = {};
        mapped.forEach((_, i) => {
          exp[i] = true;
        });
        setExpandedItems(exp);
      } else {
        setTripItems([createBlankTrip(0)]);
        setExpandedItems({ [0]: true });
      }
    } catch (err) {
      console.log('Error fetching IBA summary:', err);
      setTripItems([createBlankTrip(0)]);
      setExpandedItems({ [0]: true });
    } finally {
      setIsDataLoading(false);
    }
  }, [tourId, triggerGetIbaSummary, createBlankTrip]);

  useEffect(() => {
    loadDropdownData();
    fetchSummaryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================================
   * KEEP TRIP ROWS IN SYNC WITH LIVE DROPDOWN VALUES
   * ----------------------------------------------------------------------------
   * loadDropdownData() and fetchSummaryData() run concurrently. A blank row can
   * be created with the *fallback* option values before the real dropdown data
   * comes back from the backend. Once the real options load, patch any row
   * whose modeoftravel/subcatogory value isn't actually present in the live
   * list so we never submit a value the backend doesn't recognise. This was
   * the likely cause of "Something went wrong, please try again" on submit.
   * ========================================================================== */
  useEffect(() => {
    if (!travelModeOptions.length && !subCategoryOptions.length) return;

    setTripItems((prev) => {
      let changed = false;
      const updated = prev.map((item) => {
        let next = item;

        if (
          travelModeOptions.length &&
          !travelModeOptions.some((o) => o.value === item.modeoftravel)
        ) {
          next = { ...next, modeoftravel: travelModeOptions[0].value };
          changed = true;
        }

        if (
          subCategoryOptions.length &&
          !subCategoryOptions.some((o) => o.value === item.subcatogory)
        ) {
          next = { ...next, subcatogory: subCategoryOptions[0].value };
          changed = true;
        }

        return next;
      });
      return changed ? updated : prev;
    });
  }, [travelModeOptions, subCategoryOptions]);

  /* ============================================================================
   * AUTO-CALCULATE ELIGIBLE AMOUNT
   * ========================================================================== */

  const calculateEligible = useCallback(
    async (index, distanceVal, subcatVal) => {
      const dist = parseFloat(distanceVal);
      if (isNaN(dist) || dist <= 0 || !subcatVal || !tourId) {
        return;
      }

      try {
        const payload = {
          tour_id: tourId,
          distance: dist,
          // send both spellings -- the create/submit payload does the same,
          // since different backend endpoints have been seen expecting
          // either "subcatogory" or "subcategory".
          subcatogory: subcatVal,
          subcategory: subcatVal,
          expense_id: 9,
        };
        const res = await calculateEligibleAmt(payload).unwrap();

        const calculated =
          res?.eligible_amount !== undefined
            ? res.eligible_amount
            : res?.Eligible_amount !== undefined
              ? res.Eligible_amount
              : null;

        if (calculated !== null) {
          setTripItems((prev) => {
            const updated = [...prev];
            if (updated[index]) {
              updated[index] = {
                ...updated[index],
                eligibleamount: String(calculated),
              };
            }
            return updated;
          });
        }
      } catch (error) {
        console.log('Eligible amount calculation failed:', error);
      }
    },
    [tourId, calculateEligibleAmt]
  );

  /* ============================================================================
   * TRIP ITEM MUTATIONS (ADD, REMOVE, UPDATE)
   * ========================================================================== */

  const handleAddTrip = useCallback(() => {
    if (!isMaker) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTripItems((prev) => {
      const nextIndex = prev.length;
      setExpandedItems((exp) => ({ ...exp, [nextIndex]: true }));
      return [...prev, createBlankTrip(nextIndex)];
    });
  }, [isMaker, createBlankTrip]);

  const handleDeleteTrip = useCallback(
    (index) => {
      if (!isMaker) return;
      const itemToDelete = tripItems[index];

      Alert.alert(
        'Delete Trip',
        'Are you sure you want to delete this trip record?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (itemToDelete?.id && !String(itemToDelete.id).startsWith('new_')) {
                try {
                  await deleteTripMutation(itemToDelete.id).unwrap();
                  ToastMessage('Trip deleted successfully');
                } catch (err) {
                  ToastMessage(err?.data?.description || 'Failed to delete on server');
                }
              }
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setTripItems((prev) => prev.filter((_, i) => i !== index));
            },
          },
        ]
      );
    },
    [isMaker, tripItems, deleteTripMutation]
  );

  const updateField = useCallback(
    (index, field, value) => {
      setTripItems((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], [field]: value };
        }
        return updated;
      });

      // Auto-calculate eligible amount when distance or subcategory updates
      if (field === 'distance' || field === 'subcatogory') {
        const target = tripItems[index];
        const dist = field === 'distance' ? value : target?.distance;
        const subcat = field === 'subcatogory' ? value : target?.subcatogory;
        calculateEligible(index, dist, subcat);
      }
    },
    [tripItems, calculateEligible]
  );

  const toggleExpand = useCallback((index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  /* ============================================================================
   * PICKER HANDLERS
   * ========================================================================== */

  const openPicker = (field, index) => {
    setActivePickerField(field);
    setActivePickerIndex(index);
    setPickerModalVisible(true);
  };

  const onSelectPickerOption = (value) => {
    const val =
      value && typeof value === 'object'
        ? value.value !== undefined
          ? value.value
          : value.id !== undefined
            ? value.id
            : value.label
        : value;
    if (activePickerIndex !== null && activePickerField) {
      updateField(activePickerIndex, activePickerField, val);
    }
    setPickerModalVisible(false);
  };

  const getPickerOptions = () => {
    switch (activePickerField) {
      case 'modeoftravel':
        return travelModeOptions;
      case 'subcatogory':
        return subCategoryOptions;
      case 'onwardreturn':
        return onwardReturnOptions;
      default:
        return [];
    }
  };

  const getPickerTitle = () => {
    switch (activePickerField) {
      case 'modeoftravel':
        return 'Select Mode of Travel';
      case 'subcatogory':
        return 'Select Subcategory';
      case 'onwardreturn':
        return 'Select Onward / Return';
      default:
        return 'Select Option';
    }
  };

  /* ============================================================================
   * CUSTOM DATE PICKER MODAL
   * ========================================================================== */

  const openDatePicker = (index, field) => {
    const item = tripItems[index];
    const initialDate = parseDateStrToObj(item?.[field]);
    setDatePickerIndex(index);
    setDatePickerField(field);
    setDatePickerValue(initialDate);
    setDateSelectedYear(initialDate.getFullYear());
    setDateSelectedMonth(initialDate.getMonth());
    setDateViewMode('calendar');
    setDatePickerVisible(true);
  };

  const onConfirmDate = (dateObj) => {
    if (datePickerIndex !== null && datePickerField) {
      const formatted = formatDateToYYYYMMDD(dateObj);
      updateField(datePickerIndex, datePickerField, formatted);
    }
    setDatePickerVisible(false);
  };

  /* ============================================================================
   * TOTALS
   * ========================================================================== */

  const totals = useMemo(() => {
    let claimSum = 0;
    let eligibleSum = 0;
    tripItems.forEach((t) => {
      const c = parseFloat(t.claimedamount);
      const e = parseFloat(t.eligibleamount);
      if (!isNaN(c)) claimSum += c;
      if (!isNaN(e)) eligibleSum += e;
    });
    return {
      totalClaimed: claimSum.toFixed(2),
      totalEligible: eligibleSum.toFixed(2),
    };
  }, [tripItems]);

  /* ============================================================================
   * SUBMISSION (MAKER / AP USER / APPROVER)
   * ========================================================================== */

  const handleSubmit = async () => {
    if (tripItems.length === 0) {
      ToastMessage('Please add at least one trip.');
      return;
    }

    // Validations
    for (let i = 0; i < tripItems.length; i++) {
      const item = tripItems[i];
      const rowNum = i + 1;

      if (!item.modeoftravel) {
        ToastMessage(`Trip #${rowNum}: Please select Mode of Travel`);
        return;
      }
      // FIX: also verify the subcategory value actually exists in the
      // currently loaded dropdown -- catches any stale/mismatched default
      // before it reaches the backend and gets rejected.
      if (!item.subcatogory || !subCategoryOptions.some((o) => o.value === item.subcatogory)) {
        ToastMessage(`Trip #${rowNum}: Please select a valid Subcategory`);
        return;
      }
      if (!item.fromplace?.trim()) {
        ToastMessage(`Trip #${rowNum}: Please enter From Place`);
        return;
      }
      if (!item.toplace?.trim()) {
        ToastMessage(`Trip #${rowNum}: Please enter To Place`);
        return;
      }
      if (!item.distance || isNaN(parseFloat(item.distance))) {
        ToastMessage(`Trip #${rowNum}: Please enter valid Distance`);
        return;
      }
      if (!item.onwardreturn) {
        ToastMessage(`Trip #${rowNum}: Please select Onward/Return`);
        return;
      }
      if (!item.claimedamount || isNaN(parseFloat(item.claimedamount))) {
        ToastMessage(`Trip #${rowNum}: Please enter valid Claim Amount`);
        return;
      }
      if (!item.remarks?.trim()) {
        ToastMessage(`Trip #${rowNum}: Please enter Remarks`);
        return;
      }

      if (item.gstno?.trim()) {
        if (!GST_REGEX.test(item.gstno.trim())) {
          ToastMessage(`Trip #${rowNum}: Invalid GST No format`);
          return;
        }
      }
    }

    // 1. AP User Submit
    if (enb_all_exbdetails) {
      try {
        const apDataList = tripItems.map((item) => ({
          id: !String(item.id).startsWith('new_') ? item.id : null,
          tourid: tourId,
          gstno: item.gstno || '',
          expenseid: 9,
          invoice_date: item.invoicedate || null,
          invoice_no: item.invoiceno || '',
        }));

        await submitApUserMutation({ data: apDataList }).unwrap();
        ToastMessage('Details updated successfully');
        navigation.goBack();
      } catch (err) {
        console.log('AP submit error (full):', JSON.stringify(err));
        ToastMessage(err?.data?.description || err?.data?.message || 'Failed to submit AP details');
      }
      return;
    }

    // 2. Maker Submit
    if (!tourId) {
      ToastMessage('Tour ID not found. Please re-open the expense.');
      return;
    }

    try {
      const payloadData = tripItems.map((item) => {
        const base = {
          tourgid: Number(tourId),
          tour_id: Number(tourId),
          expense_id: 9,
          modeoftravel: item.modeoftravel || 'ROAD',
          subcatogory: item.subcatogory || '',
          subcategory: item.subcatogory || '',
          fromplace: String(item.fromplace || '').trim(),
          toplace: String(item.toplace || '').trim(),
          distance: parseFloat(item.distance) || 0,
          onwardreturn:
            item.onwardreturn !== undefined && item.onwardreturn !== null
              ? String(item.onwardreturn)
              : '1',
          eligibleamount: parseFloat(item.eligibleamount) || 0,
          claimedamount: parseFloat(item.claimedamount) || 0,
          claimamount: parseFloat(item.claimedamount) || 0,
          remarks: String(item.remarks || '').trim(),
          requestercomment:
            requestercomment ||
            claimdata?.requestercomment ||
            expense?.requestercomment ||
            'Own Vehicle On Duty',
          gstno: item.gstno ? String(item.gstno).trim().toUpperCase() : '',
          gst_no: item.gstno ? String(item.gstno).trim().toUpperCase() : '',
          invoicedate: item.invoicedate || null,
          invoice_date: item.invoicedate || null,
          invoiceno: item.invoiceno ? String(item.invoiceno).trim() : null,
          invoice_no: item.invoiceno ? String(item.invoiceno).trim() : null,
        };

        if (
          item.id &&
          !String(item.id).startsWith('new_') &&
          !String(item.id).startsWith('fetched_')
        ) {
          base.id = Number(item.id) || item.id;
        }

        return base;
      });

      console.log('IBA submit payload:', JSON.stringify({ data: payloadData }));

      const res = await createIbaExpense({ data: payloadData }).unwrap();
      console.log('IBA submit response:', JSON.stringify(res));

      if (
        (res?.message === 'Successfully Created' && res?.status === 'success') ||
        (res?.message === 'Successfully Updated' && res?.status === 'success') ||
        res?.status === 'success' ||
        res?.message?.includes('Successfully')
      ) {
        ToastMessage('Expense saved successfully');
        navigation.goBack();
      } else if (res?.code === 'UNEXPECTED_ERROR') {
        ToastMessage(res?.description || 'Failed to save expense');
      } else {
        ToastMessage(res?.description || res?.message || 'Saved successfully');
        navigation.goBack();
      }
    } catch (err) {
      // FIX: log the FULL error object so the real backend reason is visible
      // in Metro/console instead of only ever seeing a generic toast.
      console.log('IBA submit catch error (full):', JSON.stringify(err, null, 2));
      let errMsg = 'Failed to submit expense';
      if (err?.data?.description) {
        errMsg = err.data.description;
      } else if (err?.data?.message) {
        errMsg = err.data.message;
      } else if (err?.data?.detail) {
        errMsg = err.data.detail;
      } else if (typeof err?.data === 'string') {
        errMsg = err.data;
      } else if (typeof err?.data === 'object' && err?.data !== null) {
        const firstKey = Object.keys(err.data)[0];
        const val = err.data[firstKey];
        if (Array.isArray(val)) {
          errMsg = `${firstKey}: ${val.join(', ')}`;
        } else if (typeof val === 'string') {
          errMsg = `${firstKey}: ${val}`;
        }
      } else if (err?.error) {
        // RTK Query fetch/network-level failures (timeout, CORS, bad JSON)
        // land here instead of under `err.data`.
        errMsg = typeof err.error === 'string' ? err.error : 'Network error while submitting expense';
      } else if (err?.message) {
        errMsg = err.message;
      }
      ToastMessage(errMsg);
    }
  };

  // 3. Approver Submit
  const handleApprove = async () => {
    if (tripItems.length === 0) {
      ToastMessage('No expense items to approve.');
      return;
    }

    for (let i = 0; i < tripItems.length; i++) {
      const item = tripItems[i];
      if (item.approvedamount === '' || item.approvedamount === null || isNaN(parseFloat(item.approvedamount))) {
        ToastMessage(`Trip #${i + 1}: Please enter valid Approved Amount`);
        return;
      }
    }

    try {
      const approvePayload = tripItems.map((item) => ({
        id: item.id,
        amount: parseFloat(item.approvedamount),
      }));

      await approveIbaExpense({ tourId, payload: approvePayload }).unwrap();
      ToastMessage('Approved successfully');
      navigation.goBack();
    } catch (err) {
      ToastMessage(err?.data?.description || 'Failed to approve');
    }
  };

  /* ============================================================================
   * RENDER
   * ========================================================================== */

  const styles = useMemo(() => createScreenStyles(CustomColors), [CustomColors]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ON BEHALF BANNER */}
        {onbehalf && (
          <View style={styles.onBehalfCard}>
            <View style={styles.onBehalfIconWrap}>
              <MaterialIcons
                name="person"
                size={moderateScale(18)}
                color={CustomColors.appThemeColor}
              />
            </View>
            <View style={styles.onBehalfContent}>
              <Text allowFontScaling={false} style={styles.onBehalfTitle}>
                On Behalf Of
              </Text>
              <Text allowFontScaling={false} style={styles.onBehalfText} numberOfLines={1}>
                {onbehalf_empName}
              </Text>
            </View>
          </View>
        )}

        {/* TOUR DETAILS CARD */}
        <View style={styles.tourDetailsCard}>
          <View style={styles.tourDetailsHeaderRow}>
            <View style={styles.tourHeaderLeft}>
              <View style={styles.tourIconWrap}>
                <MaterialIcons
                  name="business-center"
                  size={moderateScale(18)}
                  color={CustomColors.appThemeColor}
                />
              </View>
              <Text allowFontScaling={false} style={styles.tourDetailsHeading}>
                Tour Details
              </Text>
            </View>
            {tourreq_no ? (
              <View style={styles.tourReqBadge}>
                <Text allowFontScaling={false} style={styles.tourReqBadgeText}>
                  Req #{tourreq_no}
                </Text>
              </View>
            ) : null}
          </View>

          {/* TOUR DETAILS GRID */}
          <View style={styles.tourFieldsGrid}>
            {/* Tour No */}
            <View style={styles.tourFieldBlock}>
              <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                Tour No
              </Text>
              <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                {tourreq_no || 'N/A'}
              </Text>
            </View>

            {/* Employee Name */}
            <View style={styles.tourFieldBlock}>
              <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                Employee
              </Text>
              <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                ({employeeCode || 'N/A'}) {employeeName || 'N/A'}
              </Text>
            </View>

            {/* Designation */}
            <View style={styles.tourFieldBlock}>
              <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                Designation
              </Text>
              <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                {employeeDesignation || 'N/A'}
              </Text>
            </View>

            {/* Employee Grade */}
            <View style={styles.tourFieldBlock}>
              <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                Grade
              </Text>
              <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                {employeeGrade || 'N/A'}
              </Text>
            </View>

            {/* Gender */}
            {gender ? (
              <View style={styles.tourFieldBlock}>
                <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                  Gender
                </Text>
                <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                  {gender}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* LOADING INDICATOR */}
        {isDataLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
            <Text allowFontScaling={false} style={styles.loaderText}>
              Loading trip details...
            </Text>
          </View>
        ) : (
          <>
            {/* SECTION HEADER ROW */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderTitleWrap}>
                <MaterialIcons
                  name="directions-car"
                  size={moderateScale(20)}
                  color={CustomColors.appThemeColor}
                  style={{ marginRight: horizontalScale(6) }}
                />
                <Text allowFontScaling={false} style={styles.sectionHeaderTitle}>
                  Trip Expenses
                </Text>
                <View style={styles.countBadge}>
                  <Text allowFontScaling={false} style={styles.countBadgeText}>
                    {tripItems.length}
                  </Text>
                </View>
              </View>
              {isMaker && (
                <TouchableOpacity
                  style={styles.addTripHeaderBtn}
                  onPress={handleAddTrip}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="add" size={moderateScale(18)} color="#FFFFFF" />
                  <Text allowFontScaling={false} style={styles.addTripHeaderBtnText}>
                    Add Trip
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* LIST OF TRIPS */}
            {tripItems.length === 0 ? (
              <View style={styles.emptyTripsContainer}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons
                    name="directions-car"
                    size={moderateScale(38)}
                    color={CustomColors.appThemeColor}
                  />
                </View>
                <Text allowFontScaling={false} style={styles.emptyTripsTitle}>
                  No Trips Added Yet
                </Text>
                <Text allowFontScaling={false} style={styles.emptyTripsText}>
                  Add travel records to calculate and submit vehicle expenses.
                </Text>
                {isMaker && (
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={handleAddTrip}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add" size={moderateScale(20)} color="#FFFFFF" />
                    <Text allowFontScaling={false} style={styles.emptyAddBtnText}>
                      Add First Trip
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              tripItems.map((item, index) => {
                const isExpanded = expandedItems[index] !== false;
                const subcatLabel =
                  subCategoryOptions.find((o) => o.value === item.subcatogory)?.label ||
                  item.subcatogory;
                const onwardLabel =
                  onwardReturnOptions.find((o) => o.value === item.onwardreturn)?.label ||
                  (item.onwardreturn === '1' ? 'Onward' : item.onwardreturn === '0' ? 'Return' : item.onwardreturn);

                return (
                  <View key={item.id || index} style={styles.tripCard}>
                    {/* CARD HEADER */}
                    <View style={styles.tripCardHeader}>
                      <TouchableOpacity
                        style={styles.cardHeaderTitleWrap}
                        onPress={() => toggleExpand(index)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sNoBadge}>
                          <Text allowFontScaling={false} style={styles.sNoText}>
                            #{index + 1}
                          </Text>
                        </View>
                        <Text allowFontScaling={false} style={styles.tripCardTitle} numberOfLines={1}>
                          {item.fromplace && item.toplace
                            ? `${item.fromplace} ➔ ${item.toplace}`
                            : `Trip #${index + 1}`}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.cardHeaderRight}>
                        {item.claimedamount ? (
                          <View style={styles.tripCardAmountBadge}>
                            <Text allowFontScaling={false} style={styles.tripCardAmountText}>
                              ₹{item.claimedamount}
                            </Text>
                          </View>
                        ) : null}
                        {isMaker && tripItems.length > 1 && (
                          <TouchableOpacity
                            style={styles.deleteTripBtn}
                            onPress={() => handleDeleteTrip(index)}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons
                              name="delete-outline"
                              size={moderateScale(22)}
                              color={CustomColors.dangerRed || '#EF4444'}
                            />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => toggleExpand(index)}
                          style={styles.expandBtn}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name={isExpanded ? 'expand-less' : 'expand-more'}
                            size={moderateScale(24)}
                            color={CustomColors.appThemeColor}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* CARD BODY */}
                    {isExpanded && (
                      <View style={styles.tripCardBody}>
                        {/* Mode of Travel */}
                        <EditableRow
                          label="Mode of Travel"
                          value={item.modeoftravel || 'ROAD'}
                          isPicker={true}
                          isDisabled={!isMaker}
                          isRequired={true}
                          placeholder="Select Mode of Travel"
                          onPressPicker={() => openPicker('modeoftravel', index)}
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* Subcategory */}
                        <EditableRow
                          label="Subcategory"
                          value={subcatLabel}
                          isPicker={true}
                          isDisabled={!isMaker}
                          isRequired={true}
                          placeholder="Select Subcategory"
                          onPressPicker={() => openPicker('subcatogory', index)}
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* From Place */}
                        <EditableRow
                          label="From Place"
                          value={item.fromplace}
                          onChangeText={(txt) => updateField(index, 'fromplace', txt)}
                          isDisabled={!isMaker}
                          isRequired={true}
                          placeholder="Enter From Place"
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* To Place */}
                        <EditableRow
                          label="To Place"
                          value={item.toplace}
                          onChangeText={(txt) => updateField(index, 'toplace', txt)}
                          isDisabled={!isMaker}
                          isRequired={true}
                          placeholder="Enter To Place"
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* Distance (KM) */}
                        <EditableRow
                          label="Distance (KM)"
                          value={item.distance}
                          onChangeText={(txt) => {
                            const clean = txt.replace(/[^0-9.]/g, '');
                            updateField(index, 'distance', clean);
                          }}
                          keyboardType="numeric"
                          isDisabled={!isMaker}
                          isRequired={true}
                          placeholder="Enter Distance in KM"
                          suffixText="KM"
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* Onward / Return */}
                        <EditableRow
                          label="Onward/Return"
                          value={onwardLabel}
                          isPicker={true}
                          isDisabled={!isMaker}
                          isRequired={true}
                          placeholder="Select Onward/Return"
                          onPressPicker={() => openPicker('onwardreturn', index)}
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* Eligible Amount (Readonly) */}
                        <EditableRow
                          label="Eligible Amount"
                          value={item.eligibleamount || '0'}
                          prefixText="₹"
                          isDisabled={true}
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* Claim Amount */}
                        <EditableRow
                          label="Claim Amount"
                          value={item.claimedamount}
                          prefixText="₹"
                          onChangeText={(txt) => {
                            const clean = txt.replace(/[^0-9.]/g, '');
                            updateField(index, 'claimedamount', clean);
                          }}
                          keyboardType="numeric"
                          isDisabled={!isMaker}
                          isRequired={true}
                          placeholder="Enter Claim Amount"
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* Remarks */}
                        <EditableRow
                          label="Remarks"
                          value={item.remarks}
                          onChangeText={(txt) => updateField(index, 'remarks', txt)}
                          multiline={true}
                          isDisabled={!isMaker}
                          isRequired={true}
                          placeholder="Enter remarks or justification"
                          CustomColors={CustomColors}
                          styles={styles}
                        />

                        {/* GST No */}
                        {/* <EditableRow
                          label="GST No"
                          value={item.gstno}
                          onChangeText={(txt) => updateField(index, 'gstno', txt.toUpperCase())}
                          isDisabled={!isMaker && !enb_all_exbdetails}
                          placeholder="Enter 15-digit GSTIN"
                          CustomColors={CustomColors}
                          styles={styles}
                        /> */}

                        {/* Invoice Date */}
                        {/* <EditableRow
                          label="Invoice Date"
                          value={item.invoicedate}
                          isDatePicker={true}
                          onPressDatePicker={() => openDatePicker(index, 'invoicedate')}
                          isDisabled={!isMaker && !enb_all_exbdetails}
                          placeholder="Select Invoice Date"
                          CustomColors={CustomColors}
                          styles={styles}
                        /> */}

                        {/* Invoice Number */}
                        {/* <EditableRow
                          label="Invoice Number"
                          value={item.invoiceno}
                          onChangeText={(txt) => updateField(index, 'invoiceno', txt)}
                          isDisabled={!isMaker && !enb_all_exbdetails}
                          placeholder="Enter Invoice Number"
                          CustomColors={CustomColors}
                          styles={styles}
                        /> */}

                        {/* Approver Amount */}
                        {isApprover && applevel === 2 && (
                          <View style={styles.approverContainer}>
                            <EditableRow
                              label="Approved Amount"
                              value={item.approvedamount}
                              prefixText="₹"
                              onChangeText={(txt) => {
                                const clean = txt.replace(/[^0-9.]/g, '');
                                updateField(index, 'approvedamount', clean);
                              }}
                              keyboardType="numeric"
                              isDisabled={statusid > 2}
                              isRequired={true}
                              placeholder="Enter Approved Amount"
                              CustomColors={CustomColors}
                              styles={styles}
                            />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* TOTALS SUMMARY CARD */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <View style={styles.summaryHeaderLeft}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={moderateScale(20)}
                    color={CustomColors.appThemeColor}
                    style={{ marginRight: horizontalScale(6) }}
                  />
                  <Text allowFontScaling={false} style={styles.summaryHeading}>
                    Expense Summary
                  </Text>
                </View>
                <View style={styles.summaryTripBadge}>
                  <Text allowFontScaling={false} style={styles.summaryTripBadgeText}>
                    {tripItems.length} {tripItems.length === 1 ? 'Trip' : 'Trips'}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={[styles.summaryStatBox, styles.summaryStatBoxEligible]}>
                  <Text allowFontScaling={false} style={styles.summaryStatLabel}>
                    Total Eligible
                  </Text>
                  <Text allowFontScaling={false} style={styles.summaryStatValue}>
                    ₹ {totals.totalEligible}
                  </Text>
                </View>

                <View style={[styles.summaryStatBox, styles.summaryStatBoxClaimed]}>
                  <Text allowFontScaling={false} style={styles.summaryStatLabel}>
                    Total Claimed
                  </Text>
                  <Text allowFontScaling={false} style={styles.summaryStatValueHighlight}>
                    ₹ {totals.totalClaimed}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* FIXED BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomBtn, styles.backBtn]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="arrow-back"
            size={moderateScale(18)}
            color={isDark ? '#F3F4F6' : '#334155'}
          />
          <Text allowFontScaling={false} style={styles.backBtnText}>
            Back
          </Text>
        </TouchableOpacity>

        {isMaker && (
          <TouchableOpacity
            style={[styles.bottomBtn, styles.submitBtn]}
            onPress={handleSubmit}
            disabled={isSubmitting || tripItems.length === 0}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={moderateScale(18)} color="#FFFFFF" />
                <Text allowFontScaling={false} style={styles.bottomBtnText}>
                  Submit
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {enb_all_exbdetails && (
          <TouchableOpacity
            style={[styles.bottomBtn, styles.submitBtn]}
            onPress={handleSubmit}
            disabled={isSubmittingAp}
            activeOpacity={0.8}
          >
            {isSubmittingAp ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="save" size={moderateScale(18)} color="#FFFFFF" />
                <Text allowFontScaling={false} style={styles.bottomBtnText}>
                  Update Details
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canApprove && (
          <TouchableOpacity
            style={[styles.bottomBtn, styles.approveBtn]}
            onPress={handleApprove}
            disabled={isApproving}
            activeOpacity={0.8}
          >
            {isApproving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="done-all" size={moderateScale(18)} color="#FFFFFF" />
                <Text allowFontScaling={false} style={styles.bottomBtnText}>
                  Approve
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* DROPDOWN PICKER MODAL */}
      <CustomActionSheetPicker
        pickerStatus={pickerModalVisible}
        setPickerStatus={setPickerModalVisible}
        title={getPickerTitle()}
        optionsData={getPickerOptions()}
        RenderItem={DropdownItem}
        onPress={onSelectPickerOption}
        selected={tripItems[activePickerIndex]?.[activePickerField]}
      />

      {/* CUSTOM DATE PICKER MODAL (ALL YEARS SUPPORTED) */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            {/* Header */}
            <View style={styles.datePickerHeader}>
              <Text allowFontScaling={false} style={styles.datePickerTitle}>
                Select Date
              </Text>
              <TouchableOpacity
                onPress={() => setDatePickerVisible(false)}
                style={{ padding: moderateScale(4) }}
              >
                <MaterialIcons name="close" size={moderateScale(22)} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>

            {/* Toggle Year / Month / Calendar */}
            <View style={styles.dateNavBar}>
              <TouchableOpacity
                onPress={() => setDateViewMode(dateViewMode === 'year' ? 'calendar' : 'year')}
                style={[
                  styles.dateToggleBtn,
                  dateViewMode === 'year' && { backgroundColor: CustomColors.primaryLight },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[styles.dateToggleText, { color: CustomColors.appThemeColor }]}
                >
                  Year: {dateSelectedYear} ▾
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDateViewMode(dateViewMode === 'month' ? 'calendar' : 'month')}
                style={[
                  styles.dateToggleBtn,
                  dateViewMode === 'month' && { backgroundColor: CustomColors.primaryLight },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[styles.dateToggleText, { color: CustomColors.appThemeColor }]}
                >
                  Month: {MONTH_NAMES[dateSelectedMonth]} ▾
                </Text>
              </TouchableOpacity>
            </View>

            {/* VIEW 1: YEAR GRID */}
            {dateViewMode === 'year' && (
              <ScrollView style={styles.yearScroll} showsVerticalScrollIndicator>
                <View style={styles.gridWrap}>
                  {ALL_YEARS.map((y) => {
                    const isCurr = y === dateSelectedYear;
                    return (
                      <TouchableOpacity
                        key={y}
                        style={[
                          styles.yearBtn,
                          isCurr && { backgroundColor: CustomColors.appThemeColor },
                        ]}
                        onPress={() => {
                          setDateSelectedYear(y);
                          setDateViewMode('calendar');
                        }}
                      >
                        <Text
                          allowFontScaling={false}
                          style={[
                            styles.gridBtnText,
                            { color: isCurr ? '#FFF' : CustomColors.textDark },
                            isCurr && { fontFamily: Fonts.bold },
                          ]}
                        >
                          {y}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* VIEW 2: MONTH GRID */}
            {dateViewMode === 'month' && (
              <View style={styles.gridWrap}>
                {MONTH_NAMES.map((m, idx) => {
                  const isCurr = idx === dateSelectedMonth;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.monthBtn,
                        isCurr && { backgroundColor: CustomColors.appThemeColor },
                      ]}
                      onPress={() => {
                        setDateSelectedMonth(idx);
                        setDateViewMode('calendar');
                      }}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.gridBtnText,
                          { color: isCurr ? '#FFF' : CustomColors.textDark },
                          isCurr && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* VIEW 3: CALENDAR DAYS */}
            {dateViewMode === 'calendar' && (
              <View style={styles.calendarWrap}>
                {/* Weekdays */}
                <View style={styles.weekdaysRow}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                    <Text key={i} allowFontScaling={false} style={styles.weekdayText}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Days */}
                <View style={styles.daysGrid}>
                  {(() => {
                    const firstDayIndex = new Date(dateSelectedYear, dateSelectedMonth, 1).getDay();
                    const daysInMonth = new Date(
                      dateSelectedYear,
                      dateSelectedMonth + 1,
                      0
                    ).getDate();

                    const blanks = Array.from({ length: firstDayIndex }, (_, i) => (
                      <View key={`b-${i}`} style={styles.dayCell} />
                    ));

                    const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1;
                      const isSelected =
                        datePickerValue.getDate() === d &&
                        datePickerValue.getMonth() === dateSelectedMonth &&
                        datePickerValue.getFullYear() === dateSelectedYear;

                      return (
                        <TouchableOpacity
                          key={`d-${d}`}
                          style={[
                            styles.dayCell,
                            isSelected && {
                              backgroundColor: CustomColors.appThemeColor,
                              borderRadius: moderateScale(18),
                            },
                          ]}
                          onPress={() => {
                            const newDate = new Date(dateSelectedYear, dateSelectedMonth, d);
                            onConfirmDate(newDate);
                          }}
                        >
                          <Text
                            allowFontScaling={false}
                            style={[
                              styles.dayText,
                              { color: isSelected ? '#FFF' : CustomColors.textDark },
                              isSelected && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      );
                    });

                    return [...blanks, ...dayCells];
                  })()}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

/* ============================================================================
 * STYLES
 * ========================================================================== */

const createScreenStyles = (CustomColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.appScreenColor,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: horizontalScale(14),
      paddingTop: verticalScale(14),
      paddingBottom: verticalScale(90),
    },

    /* On Behalf Banner */
    onBehalfCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.primaryLight,
      padding: moderateScale(12),
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(14),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
    },
    onBehalfIconWrap: {
      width: moderateScale(34),
      height: moderateScale(34),
      borderRadius: moderateScale(17),
      backgroundColor: CustomColors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: horizontalScale(10),
    },
    onBehalfContent: {
      flex: 1,
    },
    onBehalfTitle: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.medium,
      color: CustomColors.textGray,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    onBehalfText: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor,
      marginTop: verticalScale(2),
    },

    /* Tour Details Card */
    tourDetailsCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(14),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      padding: moderateScale(14),
      marginBottom: verticalScale(16),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    tourDetailsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: verticalScale(12),
      paddingBottom: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderLight,
    },
    tourHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tourIconWrap: {
      width: moderateScale(32),
      height: moderateScale(32),
      borderRadius: moderateScale(8),
      backgroundColor: CustomColors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: horizontalScale(8),
    },
    tourDetailsHeading: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
    },
    tourReqBadge: {
      backgroundColor: CustomColors.primaryLight,
      paddingHorizontal: horizontalScale(10),
      paddingVertical: verticalScale(4),
      borderRadius: moderateScale(12),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
    },
    tourReqBadgeText: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.semiBold,
      color: CustomColors.appThemeColor,
    },

    /* Tour Fields Grid */
    tourFieldsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: verticalScale(8),
    },
    tourFieldBlock: {
      width: '48%',
      backgroundColor: CustomColors.appScreenColor,
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(10),
      paddingVertical: verticalScale(8),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
    },
    tourFieldLabel: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.medium,
      color: CustomColors.textGray,
      marginBottom: verticalScale(2),
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tourFieldValueText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
    },

    /* Loader */
    loaderWrap: {
      paddingVertical: verticalScale(40),
      alignItems: 'center',
      justifyContent: 'center',
    },
    loaderText: {
      marginTop: verticalScale(10),
      fontSize: moderateScale(14),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
    },

    /* Section Header Row */
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: verticalScale(12),
      paddingHorizontal: horizontalScale(2),
    },
    sectionHeaderTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionHeaderTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
    },
    countBadge: {
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(10),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(2),
      marginLeft: horizontalScale(8),
    },
    countBadgeText: {
      color: '#FFFFFF',
      fontSize: moderateScale(11),
      fontFamily: Fonts.bold,
    },
    addTripHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.appThemeColor,
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(7),
      borderRadius: moderateScale(8),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    addTripHeaderBtnText: {
      color: '#FFFFFF',
      fontSize: moderateScale(13),
      fontFamily: Fonts.bold,
      marginLeft: horizontalScale(4),
    },

    /* Empty Trips Container */
    emptyTripsContainer: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(14),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      paddingVertical: verticalScale(36),
      paddingHorizontal: horizontalScale(20),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: verticalScale(16),
    },
    emptyIconWrap: {
      width: moderateScale(64),
      height: moderateScale(64),
      borderRadius: moderateScale(32),
      backgroundColor: CustomColors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: verticalScale(12),
    },
    emptyTripsTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
      marginBottom: verticalScale(4),
    },
    emptyTripsText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: CustomColors.textGray,
      textAlign: 'center',
      marginBottom: verticalScale(16),
    },
    emptyAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.appThemeColor,
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(9),
      borderRadius: moderateScale(8),
      elevation: 2,
    },
    emptyAddBtnText: {
      color: '#FFFFFF',
      fontSize: moderateScale(14),
      fontFamily: Fonts.bold,
      marginLeft: horizontalScale(6),
    },

    /* Trip Card */
    tripCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(14),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      marginBottom: verticalScale(14),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      overflow: 'hidden',
    },
    tripCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(14),
      backgroundColor: CustomColors.primaryLight,
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderLight,
    },
    cardHeaderTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sNoBadge: {
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(10),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(3),
      marginRight: horizontalScale(8),
    },
    sNoText: {
      color: '#FFFFFF',
      fontSize: moderateScale(12),
      fontFamily: Fonts.bold,
    },
    tripCardTitle: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
      flex: 1,
    },
    tripCardAmountBadge: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(3),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      marginRight: horizontalScale(6),
    },
    tripCardAmountText: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor,
    },
    cardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deleteTripBtn: {
      padding: moderateScale(5),
      marginRight: horizontalScale(2),
    },
    expandBtn: {
      padding: moderateScale(4),
    },
    tripCardBody: {
      padding: moderateScale(14),
    },
    cardSectionDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: verticalScale(4),
      marginBottom: verticalScale(12),
      paddingBottom: verticalScale(6),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderLight,
    },
    cardSectionTitle: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor,
      marginLeft: horizontalScale(6),
    },
    taxCardWrapper: {
      backgroundColor: CustomColors.appScreenColor,
      borderRadius: moderateScale(12),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      padding: moderateScale(12),
      marginTop: verticalScale(8),
      marginBottom: verticalScale(6),
    },
    approverContainer: {
      backgroundColor: CustomColors.primaryLight,
      borderRadius: moderateScale(12),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      padding: moderateScale(12),
      marginTop: verticalScale(8),
    },

    /* Detail Item / Form Inputs */
    detailItemContainer: {
      marginBottom: verticalScale(14),
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(6),
    },
    detailLabel: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.medium,
      color: CustomColors.textDark,
    },
    requiredAsterisk: {
      color: CustomColors.dangerRed || '#EF4444',
      fontSize: moderateScale(14),
      fontFamily: Fonts.bold,
      marginLeft: horizontalScale(3),
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: moderateScale(10),
      borderWidth: 1,
      minHeight: verticalScale(46),
      paddingHorizontal: horizontalScale(12),
    },
    editableInputBox: {
      borderColor: CustomColors.borderLight || '#E2E8F0',
      backgroundColor: CustomColors.cardBackground || '#FFFFFF',
    },
    disabledInputBox: {
      borderColor: CustomColors.borderLight || '#E2E8F0',
      backgroundColor: CustomColors.primaryLight || '#F8FAFC',
    },
    multilineInputBox: {
      minHeight: verticalScale(74),
      alignItems: 'flex-start',
      paddingVertical: verticalScale(8),
    },
    editableTextInput: {
      flex: 1,
      fontSize: moderateScale(14),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
      padding: 0,
      margin: 0,
    },
    multilineTextInput: {
      textAlignVertical: 'top',
      minHeight: verticalScale(58),
    },
    inputValueText: {
      flex: 1,
      fontSize: moderateScale(14),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
    },
    disabledValueText: {
      color: CustomColors.textGray || '#64748B',
    },
    placeholderText: {
      color: CustomColors.textLightGray || '#94A3B8',
    },
    prefixText: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.semiBold,
      color: CustomColors.appThemeColor,
      marginRight: horizontalScale(6),
    },
    disabledPrefixText: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textGray || '#64748B',
      marginRight: horizontalScale(6),
    },
    suffixText: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textGray,
      marginLeft: horizontalScale(6),
    },

    /* Summary Card */
    summaryCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(14),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      padding: moderateScale(14),
      marginBottom: verticalScale(20),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    summaryHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: verticalScale(12),
      paddingBottom: verticalScale(8),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderLight,
    },
    summaryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryHeading: {
      fontSize: moderateScale(15),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
    },
    summaryTripBadge: {
      backgroundColor: CustomColors.primaryLight,
      borderRadius: moderateScale(12),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(2),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
    },
    summaryTripBadgeText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.semiBold,
      color: CustomColors.appThemeColor,
    },
    summaryGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: horizontalScale(10),
    },
    summaryStatBox: {
      flex: 1,
      borderRadius: moderateScale(10),
      padding: moderateScale(12),
      borderWidth: 1,
    },
    summaryStatBoxEligible: {
      backgroundColor: CustomColors.appScreenColor,
      borderColor: CustomColors.borderLight,
    },
    summaryStatBoxClaimed: {
      backgroundColor: CustomColors.primaryLight,
      borderColor: CustomColors.appThemeColor,
    },
    summaryStatLabel: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.medium,
      color: CustomColors.textGray,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: verticalScale(4),
    },
    summaryStatValue: {
      fontSize: moderateScale(17),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
    },
    summaryStatValueHighlight: {
      fontSize: moderateScale(18),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor,
    },

    /* Fixed Bottom Action Bar */
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      backgroundColor: CustomColors.cardBackground,
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(16),
      borderTopWidth: 1,
      borderTopColor: CustomColors.borderLight,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      gap: horizontalScale(10),
    },
    bottomBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(10),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    backBtn: {
      backgroundColor: CustomColors.appScreenColor,
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
    },
    backBtnText: {
      color: CustomColors.textDark,
      fontSize: moderateScale(14),
      fontFamily: Fonts.bold,
      marginLeft: horizontalScale(6),
    },
    submitBtn: {
      backgroundColor: CustomColors.appThemeColor,
    },
    approveBtn: {
      backgroundColor: '#1E7E34',
    },
    bottomBtnText: {
      color: '#FFFFFF',
      fontSize: moderateScale(14),
      fontFamily: Fonts.bold,
      marginLeft: horizontalScale(6),
    },

    /* Custom Date Picker Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: moderateScale(16),
    },
    datePickerContainer: {
      width: '100%',
      maxWidth: horizontalScale(360),
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(16),
      padding: moderateScale(16),
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(12),
      paddingBottom: verticalScale(8),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderLight,
    },
    datePickerTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
    },
    dateNavBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(12),
      gap: horizontalScale(8),
    },
    dateToggleBtn: {
      flex: 1,
      paddingVertical: verticalScale(8),
      paddingHorizontal: horizontalScale(8),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      backgroundColor: CustomColors.appScreenColor,
    },
    dateToggleText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
    },
    yearScroll: {
      maxHeight: verticalScale(240),
    },
    gridWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    yearBtn: {
      width: '31%',
      paddingVertical: verticalScale(10),
      alignItems: 'center',
      borderRadius: moderateScale(8),
      marginBottom: verticalScale(8),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      backgroundColor: CustomColors.cardBackground,
    },
    monthBtn: {
      width: '31%',
      paddingVertical: verticalScale(12),
      alignItems: 'center',
      borderRadius: moderateScale(8),
      marginBottom: verticalScale(8),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      backgroundColor: CustomColors.cardBackground,
    },
    gridBtnText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
    },
    calendarWrap: {
      marginTop: verticalScale(4),
    },
    weekdaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: verticalScale(8),
    },
    weekdayText: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.bold,
      color: CustomColors.textGray,
      width: horizontalScale(36),
      textAlign: 'center',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    dayCell: {
      width: '14.28%',
      height: verticalScale(36),
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: verticalScale(2),
    },
    dayText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
    },
  });

export default AssociatedExpenseScreen;