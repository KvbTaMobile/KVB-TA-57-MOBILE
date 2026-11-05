import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Modal,
  LayoutAnimation,
  UIManager,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getCustomColors } from '../../styles/CustomColors';
import {
  verticalScale,
  horizontalScale,
  moderateScale,
} from '../../styles/Metrics';
import { Fonts } from '../../styles/Fonts';
import ToastMessage from '../../TaComponents/toast/ToastMessage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  useLazyGetTourGradeDetailsQuery,
  useLazyGetDeputationSummaryQuery,
  useLazyGetDeputationCityListQuery,
  useGetDeputationEligibleMutation,
  useLocalDeputationCreateMutation,
  useDeleteDeputationMutation,
  useApproveDeputationMutation,
} from '../../redux/rtk_query/apiSlice';
import * as styless from '../../styles/StyleSheet';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Date Helpers
// ---------------------------------------------------------------------------
const formatDateToDDMMYYYY = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${monthNames[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
};

const formatDateToYYYYMMDD = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${dateObj.getFullYear()}-${month}-${day}`;
};

const parseDateStrToObj = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'string' && dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
    const parts = dateStr.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = monthMap[parts[1]] ?? 0;
      const y = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// ---------------------------------------------------------------------------
// Empty Item Model
// ---------------------------------------------------------------------------
const emptyDeputationItem = (tourId) => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  tourgid: tourId,
  expense_id: 8,
  city: '',
  startdate: '',
  enddate: '',
  sysdays: '',
  no_of_days: '',
  leave: '0',
  eligibleamount: '',
  claimedamount: '',
  approvedamount: '',
  requestercomment: '',
});

// ---------------------------------------------------------------------------
// Reusable Editable Row Component with Proper Input Fields for All Values
// ---------------------------------------------------------------------------
const EditableRow = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  placeholder = '',
  isDatePicker = false,
  onPressDatePicker = null,
  isPicker = false,
  onPressPicker = null,
  isRequired = false,
  rightAccessory = null,
  editable = true,
  styles,
  CustomColors,
}) => (
  <View style={styles.detailItemContainer}>
    <View style={styles.labelContainer}>
      <Text allowFontScaling={false} style={styles.detailLabel}>{label}:</Text>
      {isRequired && <Text allowFontScaling={false} style={{ color: CustomColors.red, marginLeft: 2 }}>*</Text>}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        {isDatePicker ? (
          <TouchableOpacity onPress={onPressDatePicker} style={styles.editableTextInput} activeOpacity={0.8}>
            <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !value && styles.placeholderText]}>
              {value && value !== 'N/A' ? value : placeholder || 'Select Date'}
            </Text>
            <MaterialIcons name="event" size={moderateScale(20)} color={CustomColors.textMuted} />
          </TouchableOpacity>
        ) : isPicker ? (
          <TouchableOpacity onPress={onPressPicker} style={styles.editableTextInput} activeOpacity={0.8}>
            <Text allowFontScaling={false} style={[styles.actionSheetTriggerButtonText, !value && styles.placeholderText]}>
              {value || placeholder || 'Select Option'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={moderateScale(22)} color={CustomColors.textMuted} />
          </TouchableOpacity>
        ) : (
          <TextInput
            allowFontScaling={false}
            style={[
              styles.editableTextInput,
              multiline && styles.multilineInput,
              !editable && styles.readOnlyInput,
            ]}
            value={value !== null && value !== undefined ? String(value) : ''}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            multiline={multiline}
            placeholder={placeholder}
            placeholderTextColor={CustomColors.textMuted}
            editable={editable}
          />
        )}
      </View>
      {rightAccessory}
    </View>
  </View>
);

// ---------------------------------------------------------------------------
// Main LocalDeputationAllowance Component
// ---------------------------------------------------------------------------
const LocalDeputationAllowance = ({ route }) => {
  const navigation = useNavigation();
  const isDark = useSelector((state) => state.theme?.isDark || false);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);

  const expenseFromRoute = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || 'Maker';

  const tourId =
    Number(
      route?.params?.tourId ||
      expenseFromRoute?.tourid ||
      expenseFromRoute?.tour_id ||
      claimdata?.tourid ||
      claimdata?.tour_id ||
      claimdata?.id ||
      claimdata?.data?.[0]?.tourid
    ) || 4796;

  const tourReqNo =
    route?.params?.tourNo ||
    expenseFromRoute?.requestno ||
    claimdata?.requestno ||
    claimdata?.data?.[0]?.requestno ||
    'T2606000021';

  const [items, setItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const isEditable = from !== 'Checker';

  // Tour Meta Info  
  const [tourDetails, setTourDetails] = useState({
    employeeCode: claimdata?.maker_data?.code || claimdata?.employee_code || expenseFromRoute?.employee_code || '',
    employeeName: claimdata?.maker_data?.full_name || claimdata?.employee_name || expenseFromRoute?.employee_name || 'abishok',
    designation: claimdata?.maker_data?.designation || claimdata?.designation || expenseFromRoute?.designation || 'Manager-Branch Head',
    employeeGrade: claimdata?.maker_data?.grade || claimdata?.employee_grade || expenseFromRoute?.employee_grade || 'S4',
    requestNo: tourReqNo,
    onBehalf: Boolean(claimdata?.onbehalfof || expenseFromRoute?.onbehalfof),
    onBehalfEmpName: '',
  });

  // Tour Date Limits
  const minTourDate = claimdata?.startdate || expenseFromRoute?.startdate || null;
  const maxTourDate = claimdata?.enddate || expenseFromRoute?.enddate || null;

  // City Search Modal State
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityActiveItemId, setCityActiveItemId] = useState(null);
  const [citySearchText, setCitySearchText] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [cityPage, setCityPage] = useState(1);
  const [cityHasNext, setCityHasNext] = useState(false);
  const cityDebounceRef = useRef(null);

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState('startdate');
  const [datePickerValue, setDatePickerValue] = useState(new Date().toISOString());
  const [dateActiveItemId, setDateActiveItemId] = useState(null);

  // RTK Query Hooks
  const [triggerTourGradeDetails] = useLazyGetTourGradeDetailsQuery();
  const [triggerDeputationSummary] = useLazyGetDeputationSummaryQuery();
  const [triggerCityList, { isFetching: isSearchingCity }] = useLazyGetDeputationCityListQuery();
  const [triggerDeputationEligible, { isLoading: isCalculatingEligible }] = useGetDeputationEligibleMutation();
  const [triggerDeputationCreate, { isLoading: isSubmitting }] = useLocalDeputationCreateMutation();
  const [triggerDeleteDeputation] = useDeleteDeputationMutation();
  const [triggerApproveDeputation, { isLoading: isApproving }] = useApproveDeputationMutation();

  const [isLoadingScreen, setIsLoadingScreen] = useState(true);
  const [apiTourReason, setApiTourReason] = useState('');
  const [isDisallowedReason, setIsDisallowedReason] = useState(false);

  // Resolve Tour Reason from all available route & API sources
  const resolvedTourReason = useMemo(() => {
    return (
      apiTourReason ||
      route?.params?.tourReason ||
      route?.params?.reason ||
      claimdata?.tour_reason ||
      claimdata?.reason ||
      claimdata?.reason_data?.name ||
      claimdata?.tourreason ||
      claimdata?.data?.[0]?.reason ||
      claimdata?.data?.[0]?.tour_reason ||
      expenseFromRoute?.tour_reason ||
      expenseFromRoute?.reason ||
      expenseFromRoute?.reason_data?.name ||
      ''
    );
  }, [apiTourReason, route?.params, claimdata, expenseFromRoute]);

  // Check if tour reason allows Local Deputation
  useEffect(() => {
    if (resolvedTourReason) {
      const lower = String(resolvedTourReason).toLowerCase().trim();
      const isAllowed = lower.includes('deputation');
      if (!isAllowed) {
        setIsDisallowedReason(true);
      }
    }
  }, [resolvedTourReason]);

  // Screen Navigation Header
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
            { fontSize: moderateScale(18), fontWeight: '600', color: CustomColors.white },
          ]}
        >
          eClaim Local Deputation Expense
        </Text>
      ),
    });
  }, [navigation, CustomColors, globalStyles]);

  // Load Existing Tour Deputation Data
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoadingScreen(true);

        // 1. Fetch Tour Grade & Details
        if (tourId) {
          try {
            const gradeRes = await triggerTourGradeDetails(tourId).unwrap();
            if (gradeRes && isMounted) {
              setTourDetails((prev) => ({
                ...prev,
                employeeCode: gradeRes.employee_code || prev.employeeCode,
                employeeName: gradeRes.employee_name || prev.employeeName,
                designation: gradeRes.gradelevel || gradeRes.designation || prev.designation,
                employeeGrade: gradeRes.employee_grade || gradeRes.empgrade || prev.employeeGrade,
                requestNo: gradeRes.request_no || prev.requestNo,
              }));
              const fetchedReason =
                gradeRes.reason ||
                gradeRes.tour_reason ||
                gradeRes.tourreason ||
                gradeRes.reason_name ||
                gradeRes.reason_data?.name ||
                '';
              if (fetchedReason) {
                setApiTourReason(fetchedReason);
              }
            }
          } catch (err) {
            console.log('Error fetching tour grade details:', err);
          }

          // 2. Fetch Existing Deputation Summary
          try {
            const summaryRes = await triggerDeputationSummary({ tourId }).unwrap();
            const fetchedList = summaryRes?.data || [];

            if (fetchedList.length > 0 && isMounted) {
              const mapped = fetchedList.map((item) => {
                const sDate = item.startdate ? formatDateToDDMMYYYY(parseDateStrToObj(item.startdate)) : '';
                const eDate = item.enddate ? formatDateToDDMMYYYY(parseDateStrToObj(item.enddate)) : '';

                return {
                  id: item.id,
                  tourgid: item.tourgid || tourId,
                  expense_id: 8,
                  city: item.city || '',
                  startdate: sDate,
                  enddate: eDate,
                  sysdays: String(item.sysdays ?? item.systemdays ?? ''),
                  no_of_days: String(item.no_of_days ?? item.noofdays ?? ''),
                  leave: String(item.isleave ?? item.leave ?? '0'),
                  eligibleamount: String(item.eligibleamount ?? ''),
                  claimedamount: String(item.claimedamount ?? item.claimamount ?? ''),
                  approvedamount: String(item.approvedamount ?? ''),
                  requestercomment: item.requestercomment || '',
                };
              });

              setItems(mapped);
              const initExp = {};
              mapped.forEach((it) => { initExp[it.id] = true; });
              setExpandedItems(initExp);
            } else if (isMounted) {
              const fresh = emptyDeputationItem(tourId);
              setItems([fresh]);
              setExpandedItems({ [fresh.id]: true });
            }
          } catch (sumErr) {
            console.log('Error fetching deputation summary:', sumErr);
            if (isMounted) {
              const fresh = emptyDeputationItem(tourId);
              setItems([fresh]);
              setExpandedItems({ [fresh.id]: true });
            }
          }
        }
      } catch (e) {
        ToastMessage('Failed to initialize local deputation data');
      } finally {
        if (isMounted) setIsLoadingScreen(false);
      }
    })();

    return () => { isMounted = false; };
  }, [tourId, triggerTourGradeDetails, triggerDeputationSummary]);

  // Update item field helper
  const updateItemField = useCallback((itemId, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return { ...it, [field]: value };
      })
    );
  }, []);

  // Calculate Eligible Amount via POST /taserv/localdeputation/logic
  const handleCalculateEligible = useCallback(async (itemId) => {
    const item = items.find((it) => it.id === itemId);
    if (!item) return;

    if (!item.city) {
      ToastMessage('Please enter/select City first');
      return;
    }
    if (!item.startdate) {
      ToastMessage('Please select From Date first');
      return;
    }
    if (!item.enddate) {
      ToastMessage('Please select To Date first');
      return;
    }

    try {
      const sObj = parseDateStrToObj(item.startdate);
      const eObj = parseDateStrToObj(item.enddate);

      const payload = {
        leave: Number(item.leave || 0),
        tourgid: Number(tourId),
        startdate: formatDateToYYYYMMDD(sObj),
        enddate: formatDateToYYYYMMDD(eObj),
        city: item.city,
        expense_id: 8,
        no_of_days: Number(item.no_of_days || 0),
      };

      const res = await triggerDeputationEligible(payload).unwrap();
      if (res) {
        const elig = res.Eligible_amount !== undefined ? String(res.Eligible_amount) : '';
        const sDays = res.noofdays !== undefined ? String(res.noofdays) : '';

        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== itemId) return it;
            return {
              ...it,
              eligibleamount: elig || it.eligibleamount,
              sysdays: sDays || it.sysdays,
              no_of_days: it.no_of_days ? it.no_of_days : (sDays || it.no_of_days),
            };
          })
        );
        ToastMessage('Eligible amount calculated successfully!');
      }
    } catch (err) {
      console.log('Error calculating deputation eligible amount:', err);
      ToastMessage(err?.data?.description || 'Could not calculate eligible amount');
    }
  }, [items, tourId, triggerDeputationEligible]);

  // Card Expand / Add / Delete
  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAddExpenseItem = useCallback(() => {
    if (!isEditable) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newItem = emptyDeputationItem(tourId);
    setItems((prev) => [...prev, newItem]);
    setExpandedItems((prev) => ({ ...prev, [newItem.id]: true }));
    ToastMessage('New deputation row added.');
  }, [isEditable, tourId]);

  const handleDeleteItem = useCallback((itemId) => {
    if (!isEditable) return;
    const targetItem = items.find((it) => it.id === itemId);

    Alert.alert('Confirm Delete', 'Are you sure you want to delete this row?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (targetItem && !String(targetItem.id).startsWith('temp-')) {
            try {
              const res = await triggerDeleteDeputation(targetItem.id).unwrap();
              if (res?.code === 'UNEXPECTED_ERROR') {
                ToastMessage(res?.description || 'Failed to delete');
                return;
              }
              ToastMessage('Deleted successfully');
            } catch (delErr) {
              ToastMessage('Delete operation failed');
              return;
            }
          }
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setItems((prev) => prev.filter((it) => it.id !== itemId));
        },
      },
    ]);
  }, [isEditable, items, triggerDeleteDeputation]);

  // Date Pickers
  const openDatePickerForItem = (itemId, field) => {
    setDateActiveItemId(itemId);
    setDatePickerField(field);

    const it = items.find((i) => i.id === itemId);
    const curVal = it ? it[field] : null;
    const initialDate = parseDateStrToObj(curVal);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        onChange: (e, date) => {
          if (date) {
            const formatted = formatDateToDDMMYYYY(date);
            updateItemField(itemId, field, formatted);
          }
        },
        mode: 'date',
      });
    } else {
      setDatePickerValue(initialDate.toISOString());
      setShowDatePicker(true);
    }
  };

  // City Search Modal
  const openCityModal = (itemId) => {
    setCityActiveItemId(itemId);
    const currentItem = items.find((i) => i.id === itemId);
    setCitySearchText(currentItem?.city || '');
    setCityPage(1);
    setCityModalVisible(true);
    fetchCities(currentItem?.city || '', 1);
  };

  const fetchCities = async (queryText = '', pageNum = 1) => {
    try {
      const res = await triggerCityList({
        city: queryText,
        employeeGrade: tourDetails.employeeGrade,
        page: pageNum,
      }).unwrap();

      const list = res?.data || [];
      if (pageNum === 1) {
        setCityResults(list);
      } else {
        setCityResults((prev) => [...prev, ...list]);
      }
      setCityHasNext(Boolean(res?.pagination?.has_next));
      setCityPage(pageNum);
    } catch (e) {
      console.log('Error fetching cities:', e);
    }
  };

  const onCitySearchChange = (txt) => {
    setCitySearchText(txt);
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    cityDebounceRef.current = setTimeout(() => {
      fetchCities(txt, 1);
    }, 400);
  };

  const handleCitySelect = (cityName) => {
    if (cityActiveItemId) {
      updateItemField(cityActiveItemId, 'city', cityName);
    }
    setCityModalVisible(false);
  };

  // Submit Handler
  const handleSubmit = useCallback(async () => {
    if (isDisallowedReason) {
      Alert.alert(
        'Expense Not Allowed',
        `Local Deputation Allowance cannot be claimed for tour reason "${resolvedTourReason || 'this tour'}". Policy strictly requires the tour reason to be "Local Deputation".`,
        [
          { text: 'Go Back', onPress: () => navigation.goBack() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (!items || items.length === 0) {
      ToastMessage('Please add at least one deputation item.');
      return;
    }

    const payloadData = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const rowNum = i + 1;

      if (!it.city || !it.city.trim()) {
        ToastMessage(`Please Enter City for item #${rowNum}`);
        return;
      }
      if (!it.startdate) {
        ToastMessage(`Please Choose From Date for item #${rowNum}`);
        return;
      }
      if (!it.enddate) {
        ToastMessage(`Please Choose To Date for item #${rowNum}`);
        return;
      }

      const noDays = parseFloat(it.no_of_days) || 0;
      const leaveDays = parseFloat(it.leave) || 0;
      const sysD = parseFloat(it.sysdays) || 0;

      if (noDays <= 0) {
        ToastMessage(`Please Enter No of Days for item #${rowNum}`);
        return;
      }

      if (sysD > 0 && noDays > sysD) {
        ToastMessage(`Number of Days should be less than Total Tour Days for item #${rowNum}`);
        return;
      }

      if (sysD > 0 && leaveDays > sysD) {
        ToastMessage(`Number of Leave Days should be less than Total Tour Days for item #${rowNum}`);
        return;
      }

      const eligAmt = parseFloat(it.eligibleamount) || 0;
      if (eligAmt <= 0) {
        ToastMessage(`Eligible Amount is 0 for item #${rowNum}. Please Calculate.`);
        return;
      }

      const claimed = parseFloat(it.claimedamount);
      if (isNaN(claimed) || claimed <= 0) {
        ToastMessage(`Please Enter Claimed Amount for item #${rowNum}`);
        return;
      }

      const sObj = parseDateStrToObj(it.startdate);
      const eObj = parseDateStrToObj(it.enddate);

      const rowObj = {
        tourgid: Number(tourId),
        tour_id: Number(tourId),
        tourid: Number(tourId),
        expense_id: 8,
        expensegid: 8,
        expenseid: 8,
        city: it.city.trim(),
        startdate: formatDateToYYYYMMDD(sObj),
        enddate: formatDateToYYYYMMDD(eObj),
        sysdays: Number(it.sysdays || 0),
        no_of_days: noDays,
        leave: leaveDays,
        eligibleamount: eligAmt,
        claimedamount: claimed,
        claimamount: claimed,
        approvedamount: parseFloat(it.approvedamount) || claimed,
        requestercomment: it.requestercomment || '',
        remarks: it.requestercomment || '',
      };

      if (it.id && !String(it.id).startsWith('temp-')) {
        rowObj.id = it.id;
      }

      payloadData.push(rowObj);
    }

    try {
      const res = await triggerDeputationCreate({ data: payloadData }).unwrap();
      if (res?.status === 'success' || res?.message?.includes('Successfully')) {
        ToastMessage('Local Deputation Created Successfully');
        navigation.goBack();
      } else {
        ToastMessage(res?.description || res?.message || 'Submission failed');
      }
    } catch (err) {
      console.log('Deputation submit error:', err);
      const errorDesc =
        err?.data?.description ||
        err?.data?.message ||
        err?.description ||
        err?.message ||
        '';

      if (
        typeof errorDesc === 'string' &&
        (errorDesc.toUpperCase().includes('LOCAL DEPUTATION NOT ALLOWED') ||
         errorDesc.toUpperCase().includes('TOUR REASON'))
      ) {
        setIsDisallowedReason(true);
        Alert.alert(
          'Policy Restriction',
          'Local Deputation Allowance cannot be claimed for this tour because the tour reason is not "Local Deputation".\n\nPlease go back and choose an authorized expense type.',
          [
            { text: 'Go Back to Expenses', onPress: () => navigation.goBack() },
            { text: 'Dismiss', style: 'cancel' }
          ]
        );
        return;
      }

      ToastMessage(errorDesc || 'Submission failed');
    }
  }, [items, tourId, triggerDeputationCreate, navigation, isDisallowedReason, resolvedTourReason]);

  // Approver Action (Checker Level)
  const handleApprove = useCallback(async () => {
    const approverArray = items.map((it) => ({
      id: it.id,
      amount: parseFloat(it.approvedamount || it.claimedamount || 0),
    }));

    try {
      const res = await triggerApproveDeputation({ tourId, payload: approverArray }).unwrap();
      if (res?.status === 'success' || res?.message?.includes('Successfully')) {
        ToastMessage('Success....');
        navigation.goBack();
      } else {
        ToastMessage(res?.description || 'Approval failed');
      }
    } catch (err) {
      ToastMessage(err?.data?.description || err?.data?.message || 'Approval failed');
    }
  }, [items, tourId, triggerApproveDeputation, navigation]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: CustomColors.appScreenColor },
    flatListContent: { padding: moderateScale(16), paddingBottom: verticalScale(100) },
    sectionCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(12),
      padding: moderateScale(16),
      marginBottom: verticalScale(16),
      borderLeftWidth: moderateScale(5),
      borderLeftColor: CustomColors.appThemeColor,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.semibold,
      color: CustomColors.textDark,
      marginBottom: verticalScale(12),
    },
    headerInputsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(10),
    },
    headerInputCol: { flex: 1, marginHorizontal: horizontalScale(4) },
    headerInputLabel: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.medium,
      color: CustomColors.textMuted,
      marginBottom: verticalScale(4),
    },
    headerTextInput: {
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(10),
      paddingVertical: verticalScale(8),
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
      backgroundColor: CustomColors.white,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(14),
    },
    mainHeading: {
      fontSize: moderateScale(17),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.appThemeColor,
      paddingHorizontal: horizontalScale(14),
      paddingVertical: verticalScale(8),
      borderRadius: moderateScale(20),
      elevation: 2,
    },
    addButtonText: {
      color: '#fff',
      fontSize: moderateScale(13),
      fontFamily: Fonts.medium,
      marginLeft: horizontalScale(4),
    },
    itemCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      overflow: 'hidden',
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: moderateScale(14),
      paddingVertical: verticalScale(12),
      backgroundColor: CustomColors.lightCardHeader || '#f8fafc',
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderLight,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    sNoBadge: {
      backgroundColor: CustomColors.appThemeColor,
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(3),
      borderRadius: moderateScale(12),
      marginRight: horizontalScale(8),
    },
    sNoText: { color: '#fff', fontSize: moderateScale(12), fontFamily: Fonts.bold },
    cardTitle: { fontSize: moderateScale(14), fontFamily: Fonts.semibold, color: CustomColors.textDark },
    cardBody: { padding: moderateScale(14) },
    detailItemContainer: { marginBottom: verticalScale(12) },
    labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(4) },
    detailLabel: { fontSize: moderateScale(13), fontFamily: Fonts.medium, color: CustomColors.textDark },
    editableTextInput: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(9),
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
      backgroundColor: CustomColors.white,
    },
    placeholderText: { color: CustomColors.textMuted },
    readOnlyInput: { backgroundColor: '#f1f5f9' },
    multilineInput: { minHeight: verticalScale(60), textAlignVertical: 'top' },
    actionSheetTriggerButtonText: { fontSize: moderateScale(13), fontFamily: Fonts.regular, color: CustomColors.textDark },
    calcEligibleBtn: {
      backgroundColor: CustomColors.appThemeColor,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: verticalScale(10),
      borderRadius: moderateScale(8),
      marginVertical: verticalScale(10),
    },
    calcEligibleBtnText: { color: '#fff', fontSize: moderateScale(13), fontFamily: Fonts.semibold },
    bottomActionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: CustomColors.cardBackground,
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(12),
      borderTopWidth: 1,
      borderTopColor: CustomColors.borderLight,
      elevation: 8,
    },
    bottomButton: {
      flex: 1,
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: horizontalScale(6),
    },
    backButton: { backgroundColor: CustomColors.borderLight || '#94a3b8' },
    submitButton: { backgroundColor: CustomColors.appThemeColor },
    bottomButtonText: { color: '#fff', fontSize: moderateScale(14), fontFamily: Fonts.bold },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: CustomColors.cardBackground,
      borderTopLeftRadius: moderateScale(16),
      borderTopRightRadius: moderateScale(16),
      padding: moderateScale(16),
      maxHeight: '75%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(12),
    },
    modalTitle: { fontSize: moderateScale(16), fontFamily: Fonts.bold, color: CustomColors.textDark },
    modalSearchInput: {
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(8),
      marginBottom: verticalScale(12),
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
      backgroundColor: CustomColors.white,
    },
    cityRow: {
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cityRowText: { fontSize: moderateScale(14), fontFamily: Fonts.regular, color: CustomColors.textDark },
    noDataText: {
      textAlign: 'center',
      color: CustomColors.textMuted,
      fontSize: moderateScale(14),
      fontFamily: Fonts.regular,
      marginVertical: verticalScale(20),
    },
    policyWarningCard: {
      backgroundColor: '#fef2f2',
      borderWidth: 1.5,
      borderColor: '#fca5a5',
      borderRadius: moderateScale(10),
      padding: moderateScale(14),
      marginBottom: verticalScale(14),
    },
    policyWarningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(6),
    },
    policyWarningTitle: {
      fontSize: moderateScale(15),
      fontFamily: Fonts.bold,
      color: '#b91c1c',
      marginLeft: horizontalScale(8),
    },
    policyWarningDesc: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: '#7f1d1d',
      lineHeight: moderateScale(18),
      marginBottom: verticalScale(12),
    },
    policyGoBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#dc2626',
      paddingVertical: verticalScale(8),
      paddingHorizontal: horizontalScale(14),
      borderRadius: moderateScale(6),
    },
    policyGoBackBtnText: {
      color: '#fff',
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      marginLeft: horizontalScale(6),
    },
  });

  // Render individual deputation card
  const renderItem = useCallback(({ item, index }) => {
    const isExpanded = expandedItems[item.id] !== false;
    const itemNumber = index + 1;

    return (
      <View style={styles.itemCard}>
        {/* Card Header Bar */}
        <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.cardHeader} activeOpacity={0.7}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.sNoBadge}><Text allowFontScaling={false} style={styles.sNoText}>#{itemNumber}</Text></View>
            <Text allowFontScaling={false} style={styles.cardTitle} numberOfLines={1}>
              {item.city ? `${item.city} - ` : ''}{item.claimedamount ? `Claim: ₹${item.claimedamount}` : `Item ${itemNumber}`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isEditable && (
              <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={{ marginRight: 10 }}>
                <MaterialIcons name="delete-outline" size={moderateScale(22)} color={CustomColors.red} />
              </TouchableOpacity>
            )}
            <MaterialIcons name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={moderateScale(24)} color={CustomColors.textDark} />
          </View>
        </TouchableOpacity>

        {/* Card Body */}
        {isExpanded && (
          <View style={styles.cardBody}>
            {/* 1. City (Searchable / Pickable) */}
            <EditableRow
              label="City"
              value={item.city}
              isPicker
              isRequired
              onPressPicker={() => openCityModal(item.id)}
              placeholder="Select / Search City"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 2. From Date */}
            <EditableRow
              label="From Date"
              value={item.startdate}
              isDatePicker
              isRequired
              onPressDatePicker={() => openDatePickerForItem(item.id, 'startdate')}
              placeholder="DD-MMM-YYYY"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 3. To Date */}
            <EditableRow
              label="To Date"
              value={item.enddate}
              isDatePicker
              isRequired
              onPressDatePicker={() => openDatePickerForItem(item.id, 'enddate')}
              placeholder="DD-MMM-YYYY"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 4. Calculate Eligible Button */}
            {isEditable && (
              <TouchableOpacity
                style={styles.calcEligibleBtn}
                onPress={() => handleCalculateEligible(item.id)}
                disabled={isCalculatingEligible}
                activeOpacity={0.8}
              >
                {isCalculatingEligible ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="calculate" size={moderateScale(18)} color="#fff" style={{ marginRight: 6 }} />
                    <Text allowFontScaling={false} style={styles.calcEligibleBtnText}>Calculate Eligible Amount</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* 5. System Calculated No of Days (Editable input field as requested) */}
            <EditableRow
              label="System No of Days"
              value={item.sysdays}
              onChangeText={(txt) => updateItemField(item.id, 'sysdays', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="System Days"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 6. No of Days */}
            <EditableRow
              label="No of Days"
              value={item.no_of_days}
              onChangeText={(txt) => updateItemField(item.id, 'no_of_days', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter No of Days"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 7. No of Leave Days */}
            <EditableRow
              label="No of Leave Days"
              value={item.leave}
              onChangeText={(txt) => updateItemField(item.id, 'leave', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Enter Leave Days (default 0)"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 8. Eligible Amount (Editable input field as requested) */}
            <EditableRow
              label="Eligible Amount"
              value={item.eligibleamount}
              onChangeText={(txt) => updateItemField(item.id, 'eligibleamount', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Eligible Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 9. Claim Amount */}
            <EditableRow
              label="Claim Amount"
              value={item.claimedamount}
              onChangeText={(txt) => updateItemField(item.id, 'claimedamount', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Claim Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 10. Requester Comments */}
            <EditableRow
              label="Remarks / Comments"
              value={item.requestercomment}
              onChangeText={(txt) => updateItemField(item.id, 'requestercomment', txt)}
              placeholder="Enter comments (optional)"
              multiline
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 11. Approve Amount (Checker Mode) */}
            {from === 'Checker' && (
              <EditableRow
                label="Approve Amount"
                value={item.approvedamount}
                onChangeText={(txt) => updateItemField(item.id, 'approvedamount', txt.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholder="Enter Approved Amount"
                styles={styles}
                CustomColors={CustomColors}
              />
            )}
          </View>
        )}
      </View>
    );
  }, [
    expandedItems,
    isEditable,
    from,
    isCalculatingEligible,
    toggleExpand,
    handleDeleteItem,
    handleCalculateEligible,
    updateItemField,
    styles,
    CustomColors,
  ]);

  if (isLoadingScreen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CustomColors.appScreenColor }}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={{ marginTop: 10, color: CustomColors.textDark, fontFamily: Fonts.medium }}>
          Loading Local Deputation Data...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.flatListContent}
        ListHeaderComponent={
          <>
            {/* Policy Disallowed Warning Banner */}
            {isDisallowedReason && (
              <View style={styles.policyWarningCard}>
                <View style={styles.policyWarningHeader}>
                  <MaterialIcons name="warning" size={moderateScale(22)} color="#dc2626" />
                  <Text allowFontScaling={false} style={styles.policyWarningTitle}>
                    Expense Not Allowed For This Tour
                  </Text>
                </View>
                <Text allowFontScaling={false} style={styles.policyWarningDesc}>
                  {resolvedTourReason ? `Tour registered reason: "${resolvedTourReason}".\n` : ''}
                  Bank policy strictly allows Local Deputation Allowance only for tours created with the reason "Local Deputation". This claim cannot be submitted for this tour.
                </Text>
                <TouchableOpacity
                  style={styles.policyGoBackBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="arrow-back" size={moderateScale(16)} color="#fff" />
                  <Text allowFontScaling={false} style={styles.policyGoBackBtnText}>
                    Go Back to Expenses
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tour Details Card with Input Fields for All Values */}
            <View style={styles.sectionCard}>
              <Text allowFontScaling={false} style={styles.sectionTitle}>Tour Details</Text>
              <View style={styles.headerInputsRow}>
                <View style={styles.headerInputCol}>
                  <Text allowFontScaling={false} style={styles.headerInputLabel}>Tour No</Text>
                  <TextInput
                    allowFontScaling={false}
                    style={styles.headerTextInput}
                    value={tourDetails.requestNo}
                    onChangeText={(t) => setTourDetails((prev) => ({ ...prev, requestNo: t }))}
                    placeholder="Tour No"
                    placeholderTextColor={CustomColors.textMuted}
                  />
                </View>
                <View style={styles.headerInputCol}>
                  <Text allowFontScaling={false} style={styles.headerInputLabel}>Employee Name</Text>
                  <TextInput
                    allowFontScaling={false}
                    style={styles.headerTextInput}
                    value={tourDetails.employeeName}
                    onChangeText={(t) => setTourDetails((prev) => ({ ...prev, employeeName: t }))}
                    placeholder="Employee Name"
                    placeholderTextColor={CustomColors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.headerInputsRow}>
                <View style={styles.headerInputCol}>
                  <Text allowFontScaling={false} style={styles.headerInputLabel}>Designation</Text>
                  <TextInput
                    allowFontScaling={false}
                    style={styles.headerTextInput}
                    value={tourDetails.designation}
                    onChangeText={(t) => setTourDetails((prev) => ({ ...prev, designation: t }))}
                    placeholder="Designation"
                    placeholderTextColor={CustomColors.textMuted}
                  />
                </View>
                <View style={styles.headerInputCol}>
                  <Text allowFontScaling={false} style={styles.headerInputLabel}>Employee Grade</Text>
                  <TextInput
                    allowFontScaling={false}
                    style={styles.headerTextInput}
                    value={tourDetails.employeeGrade}
                    onChangeText={(t) => setTourDetails((prev) => ({ ...prev, employeeGrade: t }))}
                    placeholder="Grade"
                    placeholderTextColor={CustomColors.textMuted}
                  />
                </View>
              </View>

              {tourDetails.onBehalf && (
                <Text allowFontScaling={false} style={{ color: CustomColors.appThemeColor, fontFamily: Fonts.medium, marginTop: 4 }}>
                  On Behalf Employee: {tourDetails.onBehalfEmpName || tourDetails.employeeName}
                </Text>
              )}
            </View>

            {/* Section Heading & Add Row Button */}
            <View style={styles.headerRow}>
              <Text allowFontScaling={false} style={styles.mainHeading}>Deputation Items</Text>
              {isEditable && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddExpenseItem} activeOpacity={0.8}>
                  <MaterialIcons name="add" size={moderateScale(18)} color="#fff" />
                  <Text allowFontScaling={false} style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {items.length === 0 && (
              <Text allowFontScaling={false} style={styles.noDataText}>No deputation expense items found.</Text>
            )}
          </>
        }
      />

      {/* Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={[styles.bottomButton, styles.backButton]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text allowFontScaling={false} style={styles.bottomButtonText}>Back</Text>
        </TouchableOpacity>

        {isEditable && (
          <TouchableOpacity
            style={[
              styles.bottomButton,
              styles.submitButton,
              (isSubmitting || isDisallowedReason) && {
                opacity: isDisallowedReason ? 0.6 : 0.6,
                backgroundColor: isDisallowedReason ? '#ef4444' : CustomColors.appThemeColor,
              },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text allowFontScaling={false} style={styles.bottomButtonText}>
                {isDisallowedReason ? 'Not Allowed' : 'Submit'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {from === 'Checker' && (
          <TouchableOpacity
            style={[styles.bottomButton, { backgroundColor: '#10b981' }, isApproving && { opacity: 0.6 }]}
            onPress={handleApprove}
            disabled={isApproving}
            activeOpacity={0.8}
          >
            {isApproving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text allowFontScaling={false} style={styles.bottomButtonText}>Approve</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={new Date(datePickerValue)}
          mode="date"
          display="spinner"
          onChange={(e, date) => {
            setShowDatePicker(false);
            if (date) {
              const formatted = formatDateToDDMMYYYY(date);
              updateItemField(dateActiveItemId, datePickerField, formatted);
            }
          }}
        />
      )}

      {/* City Search Modal */}
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCityModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text allowFontScaling={false} style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <MaterialIcons name="close" size={moderateScale(24)} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>

            <TextInput
              allowFontScaling={false}
              style={styles.modalSearchInput}
              placeholder="Search or Enter City name..."
              placeholderTextColor={CustomColors.textMuted}
              value={citySearchText}
              onChangeText={onCitySearchChange}
              autoFocus
            />

            {/* Quick manual select button */}
            {citySearchText.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.cityRow, { backgroundColor: CustomColors.appThemeColor + '15' }]}
                onPress={() => handleCitySelect(citySearchText.trim())}
              >
                <Text allowFontScaling={false} style={[styles.cityRowText, { color: CustomColors.appThemeColor, fontFamily: Fonts.semibold }]}>
                  Use "{citySearchText.trim()}"
                </Text>
                <MaterialIcons name="check" size={moderateScale(20)} color={CustomColors.appThemeColor} />
              </TouchableOpacity>
            )}

            {isSearchingCity && (
              <ActivityIndicator size="small" color={CustomColors.appThemeColor} style={{ marginVertical: 10 }} />
            )}

            <FlatList
              data={cityResults}
              keyExtractor={(item, idx) => `${item.id || item.city || idx}`}
              renderItem={({ item: cItem }) => {
                const cityName = cItem.city || cItem.name || String(cItem);
                return (
                  <TouchableOpacity
                    style={styles.cityRow}
                    onPress={() => handleCitySelect(cityName)}
                  >
                    <Text allowFontScaling={false} style={styles.cityRowText}>{cityName}</Text>
                    <MaterialIcons name="chevron-right" size={moderateScale(20)} color={CustomColors.textMuted} />
                  </TouchableOpacity>
                );
              }}
              onEndReached={() => {
                if (cityHasNext && !isSearchingCity) {
                  fetchCities(citySearchText, cityPage + 1);
                }
              }}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                !isSearchingCity && (
                  <Text allowFontScaling={false} style={styles.noDataText}>No matching cities found.</Text>
                )
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default LocalDeputationAllowance;