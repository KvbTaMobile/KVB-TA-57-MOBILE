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
  ScrollView,
  LayoutAnimation,
  UIManager,
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
import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';
import ToastMessage from '../../TaComponents/toast/ToastMessage';
import {
  useGetMiscTourExpenseQuery,
  useMiscCreateMutation,
  useMiscDeleteMutation,
  useMiscLogicMutation,
  useMiscApproveMutation,
  useGetMiscResDropdownQuery,
  useGetMiscReasonDropdownQuery,
  useGetConvCenterDropdownQuery,
} from '../../redux/rtk_query/apiSlice';
import * as styless from '../../styles/StyleSheet';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

let rowIdCounter = 0;
const nextRowId = () => `row_${Date.now()}_${rowIdCounter++}`;

const DEFAULT_MISC_REASONS = [
  { id: 39, name: 'Breakage Charges', label: 'Breakage Charges', value: 'breakage' },
  { id: 40, name: 'Ticket cancel Charges', label: 'Ticket cancel Charges', value: 'tktcancel' },
  { id: 41, name: 'Others', label: 'Others', value: 'others' },
];

const REASON_VALUE_MAP = {
  'breakage charges': 'breakage',
  'breakage': 'breakage',
  'ticket cancel charges': 'tktcancel',
  'ticket cancellation charges': 'tktcancel',
  'tktcancel': 'tktcancel',
  'others': 'others',
  'other': 'others',
};

const createEmptyItem = (tourId = 0, requestercomment = '') => ({
  localId: nextRowId(),
  id: null,
  tourgid: tourId,
  expense_id: 6,
  description: '',
  expreason: '',
  expreasonLabel: '',
  eligibleamount: '',
  claimedamount: '',
  approvedamount: '',
  requestercomment: requestercomment || '',
});

// ---------------------------------------------------------------------------
// Main MiscExpenseScreen Component
// ---------------------------------------------------------------------------
export default function MiscExpenseScreen({ route }) {
  const navigation = useNavigation();
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const isDark = useSelector((state) => state.theme?.isDark || false);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  const authUser = useSelector((state) => state.auth?.user || state.auth?.userData || state.auth);

  const expenseFromRoute = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || 'Maker';

  // ---------------- Navigation Header Configuration ----------------
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
          Miscellaneous Charges
        </Text>
      ),
    });
  }, [navigation, CustomColors, globalStyles]);

  // Resolved Tour ID
  const tourId =
    Number(
      route?.params?.tourId ||
      route?.params?.tour_id ||
      route?.params?.tourid ||
      expenseFromRoute?.tourid ||
      expenseFromRoute?.tour_id ||
      expenseFromRoute?.tourgid ||
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

  // On Behalf Employee Detection
  const isonbehalf = Boolean(
    claimdata?.onbehalfof ||
    expenseFromRoute?.onbehalfof ||
    claimdata?.onbehalf ||
    expenseFromRoute?.onbehalf
  );

  const onbehalf_empName = useMemo(() => {
    const code =
      claimdata?.employee_code ||
      claimdata?.emp_code ||
      expenseFromRoute?.employee_code ||
      expenseFromRoute?.emp_code;
    const name =
      claimdata?.employee_name ||
      expenseFromRoute?.employee_name;
    if (code && name) return `(${code}) ${name}`;
    return name || code || '';
  }, [claimdata, expenseFromRoute]);

  // App Level & Approver/Checker Role Resolution
  const fromUpper = String(from || '').toUpperCase();
  const applevel = Number(
    claimdata?.applevel ??
    expenseFromRoute?.applevel ??
    (fromUpper === 'CHECKER' ? 2 : 0)
  );

  const claimStatusId = Number(
    claimdata?.claim_status_id ??
    expenseFromRoute?.claim_status_id ??
    claimdata?.statusid ??
    -1
  );

  const isChecker = fromUpper === 'CHECKER' || applevel === 2;
  const isApproverEligible = claimStatusId === 2 && applevel === 2;
  const isMakerAction = !isChecker;

  // ---------------- Tour Details (Read-only Professional Summary) ----------------
  const tourreq_no =
    route?.params?.tourNo ||
    route?.params?.tour_no ||
    route?.params?.requestno ||
    route?.params?.request_no ||
    expenseFromRoute?.requestno ||
    expenseFromRoute?.request_no ||
    expenseFromRoute?.tour_no ||
    expenseFromRoute?.tourno ||
    claimdata?.requestno ||
    claimdata?.request_no ||
    claimdata?.tour_no ||
    claimdata?.tourno ||
    claimdata?.data?.[0]?.requestno ||
    (tourId ? String(tourId) : 'N/A');

  const employeeCode = useMemo(() => {
    return (
      claimdata?.employee_code ||
      claimdata?.emp_code ||
      claimdata?.data?.[0]?.employee_code ||
      expenseFromRoute?.employee_code ||
      expenseFromRoute?.emp_code ||
      authUser?.code ||
      authUser?.employee_code ||
      ''
    );
  }, [claimdata, expenseFromRoute, authUser]);

  const employeeName = useMemo(() => {
    if (claimdata?.maker_data?.full_name) {
      return claimdata.maker_data.full_name;
    }
    if (claimdata?.data?.[0]?.employee_name) {
      return claimdata.data[0].employee_name;
    }
    if (expenseFromRoute?.employee_name) {
      return expenseFromRoute.employee_name;
    }
    if (claimdata?.employee_name) {
      return claimdata.employee_name;
    }
    return authUser?.name || authUser?.full_name || authUser?.employee_name || route?.params?.employeeName || 'N/A';
  }, [claimdata, expenseFromRoute, authUser, route?.params?.employeeName]);

  const designation = useMemo(() => {
    return (
      route?.params?.designation ||
      expenseFromRoute?.designation ||
      expenseFromRoute?.empdesignation ||
      claimdata?.maker_data?.designation ||
      claimdata?.designation ||
      claimdata?.data?.[0]?.designation ||
      authUser?.designation ||
      'Manager-Branch Head'
    );
  }, [route?.params?.designation, expenseFromRoute, claimdata, authUser]);

  const employeeGrade = useMemo(() => {
    return (
      route?.params?.employeeGrade ||
      expenseFromRoute?.employee_grade ||
      expenseFromRoute?.empgrade ||
      expenseFromRoute?.emp_grade ||
      claimdata?.maker_data?.grade ||
      claimdata?.employee_grade ||
      claimdata?.emp_grade ||
      claimdata?.data?.[0]?.emp_grade ||
      authUser?.grade ||
      'S4'
    );
  }, [route?.params?.employeeGrade, expenseFromRoute, claimdata, authUser]);

  // ---------------- Expense Items State ----------------
  const [items, setItems] = useState([createEmptyItem(tourId, expenseFromRoute?.requestercomment)]);
  const [expandedItems, setExpandedItems] = useState({});

  // ---------------- Dropdown API Queries ----------------
  const { data: rawMiscResData, isLoading: reasonLoading } = useGetMiscResDropdownQuery();

  // Normalize reason options with backend-supported values
  const reasonOptions = useMemo(() => {
    const list = Array.isArray(rawMiscResData) ? rawMiscResData : rawMiscResData?.data || [];
    if (!list || list.length === 0) return DEFAULT_MISC_REASONS;
    const filtered = list
      .filter((item) => String(item.value || '').toLowerCase() !== 'shifting')
      .map((item, idx) => ({
        id: item.id ?? item.value ?? idx,
        name: item.name ?? item.label ?? String(item.value || ''),
        label: item.name ?? item.label ?? String(item.value || ''),
        value: item.value ?? item.name,
      }));
    return filtered.length > 0 ? filtered : DEFAULT_MISC_REASONS;
  }, [rawMiscResData]);

  // ---------------- Existing Tour Expense Summary API ----------------
  const {
    data: existingDataResponse,
    isLoading: isFetchingSummary,
    refetch: refetchSummary,
  } = useGetMiscTourExpenseQuery(tourId, { skip: !tourId });

  // ---------------- Mutations ----------------
  const [miscCreate, { isLoading: isSubmitting }] = useMiscCreateMutation();
  const [miscDelete] = useMiscDeleteMutation();
  const [miscLogic, { isLoading: isCalculatingLogic }] = useMiscLogicMutation();
  const [miscApprove, { isLoading: isApproving }] = useMiscApproveMutation();

  // ---------------- Map Existing Server Items ----------------
  useEffect(() => {
    if (existingDataResponse) {
      const serverList = Array.isArray(existingDataResponse)
        ? existingDataResponse
        : existingDataResponse?.data || [];

      if (serverList.length > 0) {
        const mapped = serverList.map((r) => {
          const rawReason = r.expreason;
          const reasonVal = typeof rawReason === 'object' && rawReason !== null
            ? rawReason.value || rawReason.name || ''
            : String(rawReason || '');
          const reasonLbl = typeof rawReason === 'object' && rawReason !== null
            ? rawReason.name || rawReason.label || reasonVal
            : reasonVal;

          return {
            localId: nextRowId(),
            id: r.id,
            tourgid: r.tourgid || tourId,
            expense_id: r.exp_id || r.expense_id || 6,
            description: r.description ?? '',
            expreason: reasonVal,
            expreasonLabel: reasonLbl,
            eligibleamount: r.eligibleamount != null ? String(r.eligibleamount) : '',
            claimedamount: r.claimedamount != null ? String(r.claimedamount) : '',
            approvedamount: r.approvedamount != null ? String(r.approvedamount) : '',
            requestercomment: r.requestercomment || existingDataResponse?.requestercomment || '',
          };
        });

        setItems(mapped);

        // Expand all loaded items by default
        const initExpanded = {};
        mapped.forEach((it) => {
          initExpanded[it.localId] = true;
        });
        setExpandedItems(initExpanded);
      } else {
        const single = createEmptyItem(tourId, expenseFromRoute?.requestercomment);
        setItems([single]);
        setExpandedItems({ [single.localId]: true });
      }
    }
  }, [existingDataResponse, tourId, expenseFromRoute?.requestercomment]);

  // ---------------- UI Helpers: Toggle Card ----------------
  const toggleItemExpansion = (localId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems((prev) => ({
      ...prev,
      [localId]: !prev[localId],
    }));
  };

  // ---------------- Item Field Updating ----------------
  const updateItemField = (localId, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, [field]: value } : item))
    );
  };

  // ---------------- Add New Row ----------------
  const handleAddItem = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newItem = createEmptyItem(tourId, expenseFromRoute?.requestercomment);
    setItems((prev) => [...prev, newItem]);
    setExpandedItems((prev) => ({ ...prev, [newItem.localId]: true }));
    ToastMessage('Added new miscellaneous expense row');
  };

  // ---------------- Delete Row ----------------
  const handleDeleteItem = async (index, item) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!item.id) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setItems((prev) => (prev.length === 1 ? [createEmptyItem(tourId)] : prev.filter((_, i) => i !== index)));
            ToastMessage('Removed item');
            return;
          }

          try {
            const res = await miscDelete(item.id).unwrap();
            if (res?.code === 'UNEXPECTED_ERROR' && res?.description === 'Duplicate Name') {
              ToastMessage('Duplicate! Code Or Name ...');
            } else if (res?.code === 'UNEXPECTED_ERROR') {
              ToastMessage(res?.description || 'Failed to delete');
            } else {
              ToastMessage('Deleted Successfully');
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setItems((prev) => (prev.length === 1 ? [createEmptyItem(tourId)] : prev.filter((_, i) => i !== index)));
              refetchSummary();
            }
          } catch (err) {
            ToastMessage(err?.data?.description || err?.data?.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  // ---------------- Dropdown Picker State ----------------
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePickerLocalId, setActivePickerLocalId] = useState(null);

  const openPicker = (localId) => {
    setActivePickerLocalId(localId);
    setPickerVisible(true);
  };

  const currentSelectedItem = useMemo(() => {
    if (!activePickerLocalId) return null;
    return items.find((it) => it.localId === activePickerLocalId);
  }, [items, activePickerLocalId]);

  // ---------------- Handle Dropdown Selection ----------------
  const handleSelectDropdownOption = (optionValue) => {
    if (!activePickerLocalId) return;

    const opt = reasonOptions.find(
      (o) =>
        String(o.value).toLowerCase() === String(optionValue).toLowerCase() ||
        String(o.name).toLowerCase() === String(optionValue).toLowerCase() ||
        String(o.id) === String(optionValue)
    );

    const val = opt?.value ?? optionValue;
    const lbl = opt?.label ?? opt?.name ?? String(optionValue);

    updateItemField(activePickerLocalId, 'expreason', val);
    updateItemField(activePickerLocalId, 'expreasonLabel', lbl);
  };

  // ---------------- Submit Expense Handler (Maker) ----------------
  const handleSubmit = async () => {
    if (!items.length) {
      ToastMessage('Please add at least one expense item.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemNum = i + 1;

      if (!it.expreason || !String(it.expreason).trim()) {
        ToastMessage(`Please Select Expense Reason for Item #${itemNum}`);
        return;
      }

      if (!it.description || !it.description.trim()) {
        ToastMessage(`Please Enter Description for Item #${itemNum}`);
        return;
      }

      if (!it.claimedamount || isNaN(parseFloat(it.claimedamount)) || parseFloat(it.claimedamount) < 0) {
        ToastMessage(`Please Enter Valid Claimed Amount for Item #${itemNum}`);
        return;
      }
    }

    const effectiveTourId =
      tourId ||
      Number(
        route?.params?.tourId ||
        route?.params?.tour_id ||
        route?.params?.tourid ||
        expenseFromRoute?.tourid ||
        expenseFromRoute?.tour_id ||
        expenseFromRoute?.tourgid ||
        claimdata?.tourid ||
        claimdata?.tour_id ||
        claimdata?.tourgid ||
        claimdata?.id ||
        claimdata?.tour_no ||
        claimdata?.tourno ||
        claimdata?.data?.[0]?.tourid ||
        items[0]?.tourgid ||
        items[0]?.tour_id ||
        items[0]?.tourid
      ) || 0;

    if (!effectiveTourId) {
      ToastMessage('Tour ID is missing. Please go back and open this expense again.');
      return;
    }

    const payloadData = items.map((it) => {
      const claimedVal = parseFloat(it.claimedamount) || 0;
      const eligibleVal =
        it.eligibleamount !== '' && it.eligibleamount !== null && !isNaN(parseFloat(it.eligibleamount))
          ? parseFloat(it.eligibleamount)
          : claimedVal;
      const approvedVal =
        it.approvedamount !== '' && it.approvedamount !== null && !isNaN(parseFloat(it.approvedamount))
          ? parseFloat(it.approvedamount)
          : claimedVal;

      let rawReason = '';
      if (typeof it.expreason === 'object' && it.expreason !== null) {
        rawReason = String(it.expreason.value || it.expreason.name || '').trim();
      } else {
        rawReason = String(it.expreason || '').trim();
      }

      const reasonLower = rawReason.toLowerCase();
      const reasonVal = REASON_VALUE_MAP[reasonLower] || reasonLower || 'others';

      const row = {
        tourgid: Number(effectiveTourId),
        tour_id: Number(effectiveTourId),
        tourid: Number(effectiveTourId),
        expense_id: 6,
        expenseid: 6,
        expensegid: 6,
        description: (it.description || '').trim(),
        eligibleamount: eligibleVal,
        expreason: reasonVal,
        claimedamount: claimedVal,
        claimamount: claimedVal,
        requestercomment:
          (it.requestercomment && it.requestercomment.trim()) ||
          expenseFromRoute?.requestercomment ||
          claimdata?.requestercomment ||
          'Miscellaneous',
        approvedamount: approvedVal,
      };

      if (
        it.id &&
        typeof it.id === 'number' &&
        it.id > 0 &&
        !String(it.id).startsWith('temp-') &&
        !String(it.id).startsWith('row_') &&
        !String(it.id).startsWith('fetched_')
      ) {
        row.id = Number(it.id);
      }

      return row;
    });

    const body = { data: payloadData };
    console.log('Submitting Misc Expense payload:', JSON.stringify(body));

    try {
      const res = await miscCreate(body).unwrap();
      if (
        (res?.message === 'Successfully Created' && res?.status === 'success') ||
        (res?.message === 'Successfully Updated' && res?.status === 'success') ||
        res?.status === 'success'
      ) {
        ToastMessage('Successfully Created');
        handleGoBack();
      } else {
        ToastMessage(res?.description || res?.message || 'Failed to submit expense');
      }
    } catch (err) {
      console.log('Misc Expense submit error:', err);
      ToastMessage(err?.data?.description || err?.data?.message || 'Submission failed');
    }
  };

  // ---------------- Approver Amount Update (Checker Level 2) ----------------
  const handleApprove = async () => {
    const approverArray = items.map((it) => ({
      id: it.id,
      amount: parseFloat(it.approvedamount || it.claimedamount || 0),
    }));

    try {
      const res = await miscApprove({ tourId, payload: approverArray }).unwrap();
      if (res?.status === 'success') {
        ToastMessage('Success....');
        handleGoBack();
      } else {
        ToastMessage(res?.description || 'Approval failed');
      }
    } catch (err) {
      ToastMessage(err?.data?.description || err?.data?.message || 'Approval failed');
    }
  };

  const dynamicStyles = getDynamicStyles(CustomColors, isDark);
  const styles = dynamicStyles;

  // ---------------- Dropdown Render Item ----------------
  const DropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected =
      selected === options.value ||
      selected === options.name ||
      String(selected || '').toLowerCase() === String(options.value || '').toLowerCase();
    return (
      <TouchableOpacity
        style={[dynamicStyles.actionSheetItem, isSelected && dynamicStyles.actionSheetItemSelected]}
        onPress={() => {
          onPress(options.value ?? options.name ?? options);
          setPickerStatus(false);
        }}
      >
        <Text
          allowFontScaling={false}
          style={[dynamicStyles.actionSheetItemText, isSelected && dynamicStyles.actionSheetItemTextSelected]}
        >
          {options.label || options.name || options.value}
        </Text>
        {isSelected && (
          <MaterialIcons name="check" size={moderateScale(18)} color={CustomColors.appThemeColor} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={dynamicStyles.keyboardAvoidingContainer}
    >
      <ScrollView
        style={dynamicStyles.container}
        contentContainerStyle={dynamicStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------- On Behalf Banner ---------------- */}
        {isonbehalf && (
          <View style={dynamicStyles.onBehalfBanner}>
            <MaterialIcons name="info" size={moderateScale(20)} color={CustomColors.appThemeColor} />
            <Text allowFontScaling={false} style={dynamicStyles.onBehalfText}>
              On Behalf Employee - {onbehalf_empName}
            </Text>
          </View>
        )}

        {/* ---------------- Tour Details Card (Professional Read-Only Summary) ---------------- */}
        <View style={dynamicStyles.tourCard}>
          <View style={dynamicStyles.tourCardHeader}>
            <View style={dynamicStyles.tourCardHeaderLeft}>
              <View style={dynamicStyles.tourIconWrap}>
                <MaterialIcons
                  name="card-travel"
                  size={moderateScale(18)}
                  color={CustomColors.appThemeColor}
                />
              </View>
              <Text allowFontScaling={false} style={dynamicStyles.tourCardTitle}>
                Tour Details
              </Text>
            </View>
            {tourreq_no && tourreq_no !== 'N/A' ? (
              <View style={dynamicStyles.tourReqBadge}>
                <Text allowFontScaling={false} style={dynamicStyles.tourReqBadgeText}>
                  Req #{tourreq_no}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={dynamicStyles.tourFieldsGrid}>
            {/* Tour No */}
            <View style={dynamicStyles.tourFieldBlock}>
              <Text allowFontScaling={false} style={dynamicStyles.tourFieldLabel}>
                Tour No
              </Text>
              <Text allowFontScaling={false} style={dynamicStyles.tourFieldValueText} numberOfLines={1}>
                {tourreq_no || 'N/A'}
              </Text>
            </View>

            {/* Employee */}
            <View style={dynamicStyles.tourFieldBlock}>
              <Text allowFontScaling={false} style={dynamicStyles.tourFieldLabel}>
                Employee
              </Text>
              <Text allowFontScaling={false} style={dynamicStyles.tourFieldValueText} numberOfLines={1}>
                {employeeCode ? `(${employeeCode}) ` : ''}{employeeName || 'N/A'}
              </Text>
            </View>

            {/* Designation */}
            <View style={dynamicStyles.tourFieldBlock}>
              <Text allowFontScaling={false} style={dynamicStyles.tourFieldLabel}>
                Designation
              </Text>
              <Text allowFontScaling={false} style={dynamicStyles.tourFieldValueText} numberOfLines={1}>
                {designation || 'N/A'}
              </Text>
            </View>

            {/* Employee Grade */}
            <View style={dynamicStyles.tourFieldBlock}>
              <Text allowFontScaling={false} style={dynamicStyles.tourFieldLabel}>
                Grade
              </Text>
              <Text allowFontScaling={false} style={dynamicStyles.tourFieldValueText} numberOfLines={1}>
                {employeeGrade || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* ---------------- Section Header Row ---------------- */}
        <View style={dynamicStyles.sectionHeaderRow}>
          <View style={dynamicStyles.sectionHeaderLeft}>
            <View style={dynamicStyles.sectionIconWrap}>
              <MaterialIcons
                name="miscellaneous-services"
                size={moderateScale(18)}
                color={CustomColors.appThemeColor}
              />
            </View>
            <Text allowFontScaling={false} style={dynamicStyles.sectionHeaderTitle}>
              Miscellaneous Expenses
            </Text>
            <View style={dynamicStyles.itemCountBadge}>
              <Text allowFontScaling={false} style={dynamicStyles.itemCountText}>
                {items.length}
              </Text>
            </View>
          </View>

          {isMakerAction && (
            <TouchableOpacity
              style={dynamicStyles.addButton}
              onPress={handleAddItem}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={moderateScale(18)} color="#fff" />
              <Text allowFontScaling={false} style={dynamicStyles.addButtonText}>
                Add Expense
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ---------------- Loading Indicator ---------------- */}
        {isFetchingSummary && (
          <View style={dynamicStyles.loadingContainer}>
            <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
            <Text allowFontScaling={false} style={dynamicStyles.loadingText}>
              Loading expenses...
            </Text>
          </View>
        )}

        {/* ---------------- Expense Items List ---------------- */}
        {items.map((item, index) => {
          const isExpanded = expandedItems[item.localId] !== false;
          const itemNumber = index + 1;

          return (
            <View key={item.localId} style={dynamicStyles.itemCard}>
              {/* Item Card Header Bar */}
              <TouchableOpacity
                style={dynamicStyles.itemCardHeader}
                onPress={() => toggleItemExpansion(item.localId)}
                activeOpacity={0.7}
              >
                <View style={dynamicStyles.itemCardHeaderLeft}>
                  <View style={dynamicStyles.itemBadge}>
                    <Text allowFontScaling={false} style={dynamicStyles.itemBadgeText}>
                      #{itemNumber}
                    </Text>
                  </View>
                  <Text allowFontScaling={false} style={dynamicStyles.itemHeaderTitle} numberOfLines={1}>
                    {item.expreasonLabel || item.description || `Expense #${itemNumber}`}
                  </Text>
                </View>

                <View style={dynamicStyles.itemCardHeaderRight}>
                  {item.claimedamount ? (
                    <View style={dynamicStyles.claimedPill}>
                      <Text allowFontScaling={false} style={dynamicStyles.claimedPillText}>
                        ₹{item.claimedamount}
                      </Text>
                    </View>
                  ) : null}

                  {isMakerAction && items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(index, item)}
                      style={dynamicStyles.deleteIconButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="delete-outline" size={moderateScale(20)} color={CustomColors.red} />
                    </TouchableOpacity>
                  )}

                  <MaterialIcons
                    name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={moderateScale(22)}
                    color={CustomColors.textDark}
                  />
                </View>
              </TouchableOpacity>

              {/* Item Card Body */}
              {isExpanded && (
                <View style={dynamicStyles.itemCardBody}>
                  {/* Expense Reason (Required) */}
                  <View style={dynamicStyles.fieldGroup}>
                    <View style={dynamicStyles.fieldLabelRow}>
                      <Text allowFontScaling={false} style={dynamicStyles.fieldLabel}>
                        Expense Reason
                      </Text>
                      <Text style={dynamicStyles.requiredAsterisk}>*</Text>
                    </View>
                    <TouchableOpacity
                      style={dynamicStyles.pickerTrigger}
                      onPress={() => openPicker(item.localId)}
                      activeOpacity={0.8}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          dynamicStyles.pickerTriggerText,
                          !item.expreason && dynamicStyles.placeholderText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.expreasonLabel || item.expreason || 'Select Expense Reason'}
                      </Text>
                      <MaterialIcons name="keyboard-arrow-down" size={moderateScale(22)} color={CustomColors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Description (Required) */}
                  <View style={dynamicStyles.fieldGroup}>
                    <View style={dynamicStyles.fieldLabelRow}>
                      <Text allowFontScaling={false} style={dynamicStyles.fieldLabel}>
                        Description
                      </Text>
                      <Text style={dynamicStyles.requiredAsterisk}>*</Text>
                    </View>
                    <TextInput
                      style={dynamicStyles.textInput}
                      value={item.description}
                      onChangeText={(v) => updateItemField(item.localId, 'description', v)}
                      placeholder="Enter Description"
                      placeholderTextColor={CustomColors.textMuted}
                    />
                  </View>

                  {/* Two column row: Eligible Amount & Claimed Amount */}
                  <View style={dynamicStyles.fieldRow}>
                    {/* Eligible Amount */}
                    <View style={[dynamicStyles.fieldGroup, { flex: 1, marginRight: horizontalScale(8) }]}>
                      <View style={dynamicStyles.fieldLabelRow}>
                        <Text allowFontScaling={false} style={dynamicStyles.fieldLabel}>
                          Eligible Amount
                        </Text>
                        {isCalculatingLogic && (
                          <ActivityIndicator size="small" color={CustomColors.appThemeColor} style={{ marginLeft: 6 }} />
                        )}
                      </View>
                      <View style={dynamicStyles.currencyInputWrap}>
                        <Text allowFontScaling={false} style={dynamicStyles.currencyPrefix}>₹</Text>
                        <TextInput
                          style={dynamicStyles.currencyInput}
                          value={item.eligibleamount}
                          onChangeText={(v) => updateItemField(item.localId, 'eligibleamount', v)}
                          placeholder="0.00"
                          keyboardType="numeric"
                          placeholderTextColor={CustomColors.textMuted}
                        />
                      </View>
                    </View>

                    {/* Total Claimed Amount */}
                    <View style={[dynamicStyles.fieldGroup, { flex: 1, marginLeft: horizontalScale(8) }]}>
                      <View style={dynamicStyles.fieldLabelRow}>
                        <Text allowFontScaling={false} style={dynamicStyles.fieldLabel}>
                          Claimed Amount
                        </Text>
                        <Text style={dynamicStyles.requiredAsterisk}>*</Text>
                      </View>
                      <View style={dynamicStyles.currencyInputWrap}>
                        <Text allowFontScaling={false} style={dynamicStyles.currencyPrefix}>₹</Text>
                        <TextInput
                          style={dynamicStyles.currencyInput}
                          value={item.claimedamount}
                          onChangeText={(v) => {
                            updateItemField(item.localId, 'claimedamount', v);
                            if (!item.eligibleamount || item.eligibleamount === item.claimedamount) {
                              updateItemField(item.localId, 'eligibleamount', v);
                            }
                          }}
                          placeholder="0.00"
                          keyboardType="numeric"
                          placeholderTextColor={CustomColors.textMuted}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Requester Comment */}
                  <View style={dynamicStyles.fieldGroup}>
                    <Text allowFontScaling={false} style={dynamicStyles.fieldLabel}>
                      Requester Comment
                    </Text>
                    <TextInput
                      style={[dynamicStyles.textInput, dynamicStyles.multilineInput]}
                      value={item.requestercomment}
                      onChangeText={(v) => updateItemField(item.localId, 'requestercomment', v)}
                      placeholder="Add any remarks or details..."
                      placeholderTextColor={CustomColors.textMuted}
                      multiline
                    />
                  </View>

                  {/* Approved Amount (for checker/approver) */}
                  {(isChecker || isApproverEligible || item.approvedamount !== '') && (
                    <View style={dynamicStyles.fieldGroup}>
                      <Text allowFontScaling={false} style={dynamicStyles.fieldLabel}>
                        Approved Amount
                      </Text>
                      <View style={dynamicStyles.currencyInputWrap}>
                        <Text allowFontScaling={false} style={dynamicStyles.currencyPrefix}>₹</Text>
                        <TextInput
                          style={dynamicStyles.currencyInput}
                          value={item.approvedamount}
                          onChangeText={(v) => updateItemField(item.localId, 'approvedamount', v)}
                          placeholder="Enter Approved Amount"
                          keyboardType="numeric"
                          placeholderTextColor={CustomColors.textMuted}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* ---------------- Bottom Action Buttons ---------------- */}
        <View style={dynamicStyles.bottomActions}>
          {isMakerAction && (
            <TouchableOpacity
              style={[dynamicStyles.primaryButton, isSubmitting && dynamicStyles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={moderateScale(20)} color="#fff" style={{ marginRight: 8 }} />
                  <Text allowFontScaling={false} style={dynamicStyles.primaryButtonText}>
                    Submit Miscellaneous Expense
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isApproverEligible && (
            <TouchableOpacity
              style={[dynamicStyles.approveButton, isApproving && dynamicStyles.buttonDisabled]}
              onPress={handleApprove}
              disabled={isApproving}
              activeOpacity={0.85}
            >
              {isApproving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="verified" size={moderateScale(20)} color="#fff" style={{ marginRight: 8 }} />
                  <Text allowFontScaling={false} style={dynamicStyles.primaryButtonText}>
                    Approve
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={dynamicStyles.secondaryButton}
            onPress={handleGoBack}
            activeOpacity={0.8}
          >
            <Text allowFontScaling={false} style={dynamicStyles.secondaryButtonText}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ---------------- Action Sheet Picker Modal ---------------- */}
      {activePickerLocalId && (
        <CustomActionSheetPicker
          pickerStatus={pickerVisible}
          setPickerStatus={(status) => setPickerVisible(status)}
          title="Select Expense Reason"
          optionsData={reasonOptions}
          RenderItem={DropdownItem}
          onPress={handleSelectDropdownOption}
          selected={currentSelectedItem?.expreason}
          isLoading={reasonLoading}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Dynamic Stylesheet with Curated Colors & Metrics
// ---------------------------------------------------------------------------
const getDynamicStyles = (CustomColors, isDark) =>
  StyleSheet.create({
    keyboardAvoidingContainer: {
      flex: 1,
      backgroundColor: isDark ? CustomColors.screenBackground : '#f8fafc',
    },
    container: {
      flex: 1,
      backgroundColor: isDark ? CustomColors.screenBackground : '#f8fafc',
    },
    scrollContent: {
      padding: moderateScale(14),
      paddingBottom: verticalScale(40),
    },

    // On Behalf Banner
    onBehalfBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1e293b' : '#eff6ff',
      padding: moderateScale(12),
      borderRadius: moderateScale(10),
      marginBottom: verticalScale(12),
      borderLeftWidth: 4,
      borderLeftColor: CustomColors.appThemeColor,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#dbeafe',
    },
    onBehalfText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.medium,
      color: isDark ? '#93c5fd' : '#1e40af',
      marginLeft: horizontalScale(8),
      flex: 1,
    },

    // Tour Details Card (Executive Look)
    tourCard: {
      backgroundColor: CustomColors.cardBackground || '#fff',
      borderRadius: moderateScale(14),
      padding: moderateScale(14),
      marginBottom: verticalScale(14),
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
    },
    tourCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: verticalScale(12),
      paddingBottom: verticalScale(8),
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#f1f5f9',
    },
    tourCardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tourIconWrap: {
      width: moderateScale(30),
      height: moderateScale(30),
      borderRadius: moderateScale(8),
      backgroundColor: `${CustomColors.appThemeColor}18`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: horizontalScale(8),
    },
    tourCardTitle: {
      fontSize: moderateScale(15),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
    },
    tourReqBadge: {
      backgroundColor: `${CustomColors.appThemeColor}15`,
      paddingHorizontal: horizontalScale(10),
      paddingVertical: verticalScale(4),
      borderRadius: moderateScale(12),
      borderWidth: 1,
      borderColor: `${CustomColors.appThemeColor}30`,
    },
    tourReqBadgeText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.semiBold,
      color: CustomColors.appThemeColor,
    },
    tourFieldsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -horizontalScale(4),
    },
    tourFieldBlock: {
      width: '50%',
      paddingHorizontal: horizontalScale(4),
      marginBottom: verticalScale(8),
    },
    tourFieldLabel: {
      fontSize: moderateScale(10),
      fontFamily: Fonts.medium,
      color: CustomColors.textMuted || '#64748b',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: verticalScale(2),
    },
    tourFieldValueText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      paddingHorizontal: horizontalScale(10),
      paddingVertical: verticalScale(7),
      borderRadius: moderateScale(8),
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
      overflow: 'hidden',
    },

    // Section Header Row
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: verticalScale(2),
      marginBottom: verticalScale(12),
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sectionIconWrap: {
      width: moderateScale(28),
      height: moderateScale(28),
      borderRadius: moderateScale(7),
      backgroundColor: `${CustomColors.appThemeColor}18`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: horizontalScale(6),
    },
    sectionHeaderTitle: {
      fontSize: moderateScale(15),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
    },
    itemCountBadge: {
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(2),
      borderRadius: moderateScale(10),
      marginLeft: horizontalScale(6),
    },
    itemCountText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.appThemeColor,
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(6),
      borderRadius: moderateScale(8),
      elevation: 2,
      shadowColor: CustomColors.appThemeColor,
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
    },
    addButtonText: {
      color: '#fff',
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(12),
      marginLeft: horizontalScale(3),
    },

    // Loading State
    loadingContainer: {
      padding: moderateScale(24),
      alignItems: 'center',
    },
    loadingText: {
      marginTop: verticalScale(8),
      fontSize: moderateScale(13),
      fontFamily: Fonts.medium,
      color: CustomColors.textMuted || '#6b7280',
    },

    // Item Cards
    itemCard: {
      backgroundColor: CustomColors.cardBackground || '#fff',
      borderRadius: moderateScale(14),
      marginBottom: verticalScale(14),
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
    },
    itemCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(11),
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#f1f5f9',
    },
    itemCardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    itemBadge: {
      backgroundColor: CustomColors.appThemeColor,
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(3),
      borderRadius: moderateScale(6),
      marginRight: horizontalScale(8),
    },
    itemBadgeText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.bold,
      color: '#fff',
    },
    itemHeaderTitle: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
      flex: 1,
    },
    itemCardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    claimedPill: {
      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(3),
      borderRadius: moderateScale(6),
      marginRight: horizontalScale(8),
      borderWidth: 1,
      borderColor: isDark ? '#059669' : '#a7f3d0',
    },
    claimedPillText: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.bold,
      color: isDark ? '#34d399' : '#059669',
    },
    deleteIconButton: {
      padding: moderateScale(4),
      marginRight: horizontalScale(4),
    },

    // Item Card Body
    itemCardBody: {
      padding: moderateScale(14),
    },
    fieldGroup: {
      marginBottom: verticalScale(12),
    },
    fieldRow: {
      flexDirection: 'row',
    },
    fieldLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(4),
    },
    fieldLabel: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.medium,
      color: CustomColors.textDark,
    },
    requiredAsterisk: {
      color: CustomColors.red || '#ef4444',
      fontWeight: 'bold',
      marginLeft: 2,
    },

    // Inputs & Picker Trigger
    textInput: {
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#cbd5e1',
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(9),
      backgroundColor: isDark ? '#0f172a' : '#fff',
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
    },
    multilineInput: {
      minHeight: verticalScale(55),
      textAlignVertical: 'top',
    },
    pickerTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#cbd5e1',
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(10),
      backgroundColor: isDark ? '#0f172a' : '#fff',
    },
    pickerTriggerText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
      flex: 1,
    },
    placeholderText: {
      color: CustomColors.textMuted || '#94a3b8',
    },

    // Currency Input Wrap
    currencyInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#cbd5e1',
      borderRadius: moderateScale(8),
      backgroundColor: isDark ? '#0f172a' : '#fff',
      paddingHorizontal: horizontalScale(10),
    },
    currencyPrefix: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.bold,
      color: CustomColors.textMuted || '#64748b',
      marginRight: horizontalScale(4),
    },
    currencyInput: {
      flex: 1,
      paddingVertical: verticalScale(9),
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
    },

    // Bottom Action Buttons
    bottomActions: {
      marginTop: verticalScale(8),
      marginBottom: verticalScale(20),
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(13),
      marginBottom: verticalScale(10),
      elevation: 2,
      shadowColor: CustomColors.appThemeColor,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 5,
    },
    approveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#059669',
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(13),
      marginBottom: verticalScale(10),
      elevation: 2,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.semiBold,
      color: '#fff',
    },
    secondaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(12),
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
    },
    secondaryButtonText: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.medium,
      color: CustomColors.textDark,
    },

    // ActionSheet Items
    actionSheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: verticalScale(13),
      paddingHorizontal: horizontalScale(16),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#334155' : '#f1f5f9',
    },
    actionSheetItemSelected: {
      backgroundColor: `${CustomColors.appThemeColor}14`,
    },
    actionSheetItemText: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
      flex: 1,
    },
    actionSheetItemTextSelected: {
      fontFamily: Fonts.semiBold,
      color: CustomColors.appThemeColor,
    },
  });