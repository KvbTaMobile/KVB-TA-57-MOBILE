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
  ScrollView,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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
  useLazyCommonDropDownGetQuery,
  useGetIncidentalExpenseQuery,
  useIncidentalLogicMutation,
  useIncidentalCreateMutation,
  useDeleteIncidentalMutation,
  useApproveIncidentalMutation,
  useLazyValidateSupplierGstQuery,
  useLazySearchHsnQuery,
} from '../../redux/rtk_query/apiSlice';
import * as styless from '../../styles/StyleSheet';

// ---------------------------------------------------------------------------
// Date Helpers
// ---------------------------------------------------------------------------
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatDateToDDMMYYYY = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_SHORT[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
};

const parseDDMMYYYYToDate = (dateString) => {
  if (!dateString) return new Date();
  if (dateString instanceof Date) return dateString;
  const parts = String(dateString).split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
    const day = parseInt(parts[0], 10);
    const monthIndex = MONTH_NAMES_SHORT.findIndex(
      (m) => m.toLowerCase() === parts[1].toLowerCase()
    );
    const year = parseInt(parts[2], 10);
    if (monthIndex !== -1 && !isNaN(day) && !isNaN(year)) {
      const date = new Date(year, monthIndex, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDateToYYYYMMDD = (dateObj) => {
  if (!dateObj) return '';
  const date = parseDDMMYYYYToDate(dateObj);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstWeekdayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

let tempIdCounter = 0;
const generateTempId = () => `temp-${Date.now()}-${tempIdCounter++}`;

const emptyIncidentalItem = () => ({
  id: generateTempId(),
  modeOfTravel: '',
  onwardReturnSameDay: '',
  travelTimeHours: '',
  singleFare: '',
  incidentalAmount: '',
  bankGst: '',
  vendorGstNo: '',
  vendorName: '',
  vendorCode: '',
  address: '',
  hsnCode: '',
  hsnId: null,
  cgstRate: 0,
  sgstRate: 0,
  igstRate: 0,
  taxableAmount: '',
  cgst: '',
  sgst: '',
  igst: '',
  invoiceAmount: '',
  amount: '',
  invoiceDate: '',
  invoiceNo: '',
  isGstValidated: false,
});

const mapIncidentalItem = (item, defaultBankGst = '33AAACT3373J1ZD') => {
  if (!item) return emptyIncidentalItem();

  const rawTravelMode =
    item.travel_mode?.value ??
    item.travel_mode?.name ??
    item.travel_mode ??
    item.modeoftravel ??
    item.travelmode ??
    item.modeOfTravel ??
    '';
  const resolvedMode =
    typeof rawTravelMode === 'object' && rawTravelMode !== null
      ? rawTravelMode.value || rawTravelMode.name || ''
      : String(rawTravelMode || '');

  const rawSameDay =
    item.same_day_return?.value ??
    item.same_day_return ??
    item.onwardreturnsameday ??
    item.onwardReturnSameDay ??
    '';
  const resolvedSameDay =
    typeof rawSameDay === 'object' && rawSameDay !== null
      ? String(rawSameDay.value ?? rawSameDay.name ?? '')
      : (rawSameDay !== '' && rawSameDay !== null && rawSameDay !== undefined ? String(rawSameDay) : '');

  const singleFareVal =
    item.single_fare ??
    item.singlefare ??
    item.singleFare ??
    item.claimedamount ??
    item.claimed_amount ??
    item.amount ??
    '';

  const incidentalAmtVal =
    item.eligibleamount ??
    item.eligible_amount ??
    item.incidentalamount ??
    item.incidentalAmount ??
    item.claimedamount ??
    item.claimed_amount ??
    item.amount ??
    '';

  const bankGstVal = item.bankgstno || item.bank_gst_no || item.bankGst || defaultBankGst;
  const vendorGstVal = item.vendorgstno || item.vendor_gst_no || item.vendorGstNo || '';
  const vendorNameVal = item.vendorname || item.vendor_name || item.vendorName || '';
  const vendorCodeVal = item.vendorcode || item.vendor_code || item.vendorCode || '';
  const addressVal = item.address || item.vendor_address || '';
  const hsnCodeVal = typeof item.hsncode === 'object' && item.hsncode !== null
    ? item.hsncode.code || ''
    : String(item.hsncode || item.hsn_code || item.hsnCode || '');
  const hsnIdVal = item.hsnid ?? item.hsnId ?? null;

  const rawDate = item.invoice_date || item.invoicedate || item.invoiceDate || '';
  let formattedDate = '';
  if (rawDate) {
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      formattedDate = formatDateToDDMMYYYY(new Date(rawDate));
    } else {
      formattedDate = String(rawDate);
    }
  }

  return {
    id: item.id || generateTempId(),
    modeOfTravel: resolvedMode,
    onwardReturnSameDay: resolvedSameDay,
    travelTimeHours: String(item.travel_hours ?? item.traveltimehours ?? item.travelTimeHours ?? ''),
    singleFare: singleFareVal !== '' && singleFareVal !== null && singleFareVal !== undefined ? String(singleFareVal) : '',
    incidentalAmount: incidentalAmtVal !== '' && incidentalAmtVal !== null && incidentalAmtVal !== undefined ? String(incidentalAmtVal) : '',
    bankGst: bankGstVal,
    vendorGstNo: vendorGstVal,
    vendorName: vendorNameVal,
    vendorCode: vendorCodeVal,
    address: addressVal,
    hsnCode: hsnCodeVal,
    hsnId: hsnIdVal,
    cgstRate: Number(item.cgstp ?? item.cgstrate ?? item.cgstRate ?? 0),
    sgstRate: Number(item.sgstp ?? item.sgstrate ?? item.sgstRate ?? 0),
    igstRate: Number(item.igstp ?? item.igstrate ?? item.igstRate ?? 0),
    taxableAmount: String(item.taxableamount ?? item.taxable_amount ?? item.taxableAmount ?? ''),
    cgst: String(item.cgst ?? item.Cgst ?? ''),
    sgst: String(item.sgst ?? item.Sgst ?? ''),
    igst: String(item.igst ?? item.Igst ?? ''),
    invoiceAmount: String(item.invoiceamount ?? item.invoice_amount ?? item.invoiceAmount ?? ''),
    amount: String(item.amount ?? item.approvedamount ?? item.claimedamount ?? item.claimed_amount ?? ''),
    invoiceDate: formattedDate,
    invoiceNo: item.invoice_no || item.invoiceno || item.invoiceNo || '',
    isGstValidated: Boolean(vendorGstVal),
  };
};

// ---------------------------------------------------------------------------
// Reusable Editable Row Component (Structured Input Box)
// ---------------------------------------------------------------------------
const EditableRow = ({
  label,
  value,
  onChangeText,
  onBlur = null,
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
  rightAccessory = null,
  styles,
  CustomColors,
  prefixText = null,
  suffixText = null,
}) => (
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
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        {isEditing ? (
          isDatePicker ? (
            <TouchableOpacity
              onPress={isDisabled ? undefined : onPressDatePicker}
              disabled={isDisabled}
              style={[
                styles.inputBox,
                isDisabled ? styles.disabledInputBox : styles.editableInputBox,
              ]}
              activeOpacity={0.7}
            >
              <Text
                allowFontScaling={false}
                style={[
                  styles.inputValueText,
                  !value && styles.placeholderText,
                  isDisabled && styles.disabledValueText,
                ]}
              >
                {value && value !== 'N/A' ? value : placeholder || 'Select Date'}
              </Text>
              <MaterialIcons
                name="calendar-today"
                size={moderateScale(18)}
                color={isDisabled ? (CustomColors.textLightGray || '#94A3B8') : CustomColors.appThemeColor}
              />
            </TouchableOpacity>
          ) : isPicker ? (
            <TouchableOpacity
              onPress={isDisabled ? undefined : onPressPicker}
              disabled={isDisabled}
              style={[
                styles.inputBox,
                isDisabled ? styles.disabledInputBox : styles.editableInputBox,
              ]}
              activeOpacity={0.7}
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
              <MaterialIcons
                name="keyboard-arrow-down"
                size={moderateScale(22)}
                color={isDisabled ? (CustomColors.textLightGray || '#94A3B8') : (CustomColors.textGray || '#64748B')}
              />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.inputBox,
                isDisabled ? styles.disabledInputBox : styles.editableInputBox,
                multiline && styles.multilineInputBox,
              ]}
            >
              {prefixText ? (
                <Text
                  allowFontScaling={false}
                  style={isDisabled ? styles.disabledPrefixText : styles.prefixText}
                >
                  {prefixText}
                </Text>
              ) : null}
              <TextInput
                allowFontScaling={false}
                style={[
                  styles.editableTextInput,
                  multiline && styles.multilineTextInput,
                  isDisabled && styles.disabledValueText,
                ]}
                value={value !== undefined && value !== null ? String(value) : ''}
                onChangeText={onChangeText}
                onBlur={onBlur}
                keyboardType={keyboardType}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                placeholder={placeholder}
                placeholderTextColor={CustomColors.textLightGray || '#94A3B8'}
                editable={!isDisabled}
              />
              {suffixText ? (
                <Text allowFontScaling={false} style={styles.suffixText}>
                  {suffixText}
                </Text>
              ) : null}
            </View>
          )
        ) : (
          <View
            style={[
              styles.inputBox,
              styles.disabledInputBox,
              multiline && styles.multilineInputBox,
            ]}
          >
            {prefixText ? (
              <Text allowFontScaling={false} style={styles.disabledPrefixText}>
                {prefixText}
              </Text>
            ) : null}
            <Text
              allowFontScaling={false}
              style={[styles.inputValueText, styles.disabledValueText]}
              numberOfLines={multiline ? 4 : 2}
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
      {rightAccessory}
    </View>
  </View>
);

// ---------------------------------------------------------------------------
// Calendar Date Picker Modal
// ---------------------------------------------------------------------------
const CustomCalendarPicker = ({
  visible,
  onClose,
  initialDate,
  onSelectDate,
  maximumDate = null,
  minimumDate = null,
  CustomColors,
  styles,
}) => {
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (visible) {
      setViewYear(initialDate.getFullYear());
      setViewMonth(initialDate.getMonth());
    }
  }, [visible, initialDate]);

  const today = startOfDay(new Date());
  const maxDay = maximumDate ? startOfDay(maximumDate) : null;
  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const selected = startOfDay(initialDate);

  const isMonthNavDisabled = (direction) => {
    const candidate = new Date(viewYear, viewMonth + direction, 1);
    if (direction > 0 && maxDay) {
      const lastOfCandidate = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0);
      if (startOfDay(new Date(candidate.getFullYear(), candidate.getMonth(), 1)) > maxDay && lastOfCandidate > maxDay) {
        return (
          candidate.getFullYear() > maxDay.getFullYear() ||
          (candidate.getFullYear() === maxDay.getFullYear() && candidate.getMonth() > maxDay.getMonth())
        );
      }
    }
    if (direction < 0 && minDay) {
      return (
        candidate.getFullYear() < minDay.getFullYear() ||
        (candidate.getFullYear() === minDay.getFullYear() && candidate.getMonth() < minDay.getMonth())
      );
    }
    return false;
  };

  const goToMonth = (direction) => {
    if (isMonthNavDisabled(direction)) return;
    let nextMonth = viewMonth + direction;
    let nextYear = viewYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const handleDayPress = (day) => {
    const candidate = startOfDay(new Date(viewYear, viewMonth, day));
    if (maxDay && candidate > maxDay) return;
    if (minDay && candidate < minDay) return;
    onSelectDate(new Date(viewYear, viewMonth, day));
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekdayOfMonth(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.calendarModalContainer}>
          <View style={styles.hsnModalHeader}>
            <Text allowFontScaling={false} style={styles.hsnModalTitle}>
              Select Invoice Date
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={moderateScale(24)} color={CustomColors.textDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarHeaderRow}>
            <TouchableOpacity
              onPress={() => goToMonth(-1)}
              disabled={isMonthNavDisabled(-1)}
              style={styles.calendarNavButton}
            >
              <MaterialIcons
                name="chevron-left"
                size={moderateScale(26)}
                color={isMonthNavDisabled(-1) ? CustomColors.textLightGray : CustomColors.appThemeColor}
              />
            </TouchableOpacity>

            <Text allowFontScaling={false} style={styles.calendarMonthText}>
              {MONTH_NAMES_FULL[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity
              onPress={() => goToMonth(1)}
              disabled={isMonthNavDisabled(1)}
              style={styles.calendarNavButton}
            >
              <MaterialIcons
                name="chevron-right"
                size={moderateScale(26)}
                color={isMonthNavDisabled(1) ? CustomColors.textLightGray : CustomColors.appThemeColor}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarWeekdayRow}>
            {WEEKDAY_LABELS.map((w, idx) => (
              <Text key={`weekday-${idx}`} allowFontScaling={false} style={styles.calendarWeekdayText}>
                {w}
              </Text>
            ))}
          </View>

          {weeks.map((week, wIdx) => (
            <View key={`week-${wIdx}`} style={styles.calendarWeekRow}>
              {week.map((day, dIdx) => {
                if (!day) {
                  return <View key={`empty-${wIdx}-${dIdx}`} style={styles.calendarDayCellEmpty} />;
                }
                const candidate = startOfDay(new Date(viewYear, viewMonth, day));
                const isToday = isSameDay(candidate, today);
                const isSelected = isSameDay(candidate, selected);
                const isDisabled = (maxDay && candidate > maxDay) || (minDay && candidate < minDay);
                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      styles.calendarDayCell,
                      isSelected && styles.calendarDayCellSelected,
                      isToday && !isSelected && styles.calendarDayCellToday,
                    ]}
                    disabled={isDisabled}
                    onPress={() => handleDayPress(day)}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                        isDisabled && styles.calendarDayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <TouchableOpacity
            style={styles.calendarTodayButton}
            onPress={() => {
              if (maxDay && today > maxDay) return;
              if (minDay && today < minDay) return;
              onSelectDate(new Date());
            }}
          >
            <Text allowFontScaling={false} style={styles.calendarTodayButtonText}>
              Today
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const IncidentalExpenseScreen = ({ route }) => {
  const navigation = useNavigation();
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const isDark = useSelector((state) => state.theme?.isDark || false);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);

  const expenseFromRoute = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || 'Maker';

  // Resolved Tour Details
  const tourId =
    expenseFromRoute?.tourid ||
    expenseFromRoute?.tour_id ||
    expenseFromRoute?.tourgid ||
    expenseFromRoute?.tourNo ||
    claimdata?.tourid ||
    claimdata?.tour_id ||
    claimdata?.tourgid ||
    claimdata?.id ||
    claimdata?.data?.[0]?.tourid;

  const hasRouteExpense = Boolean(
    expenseFromRoute && (
      (expenseFromRoute.claimedamount !== undefined && expenseFromRoute.claimedamount !== null && expenseFromRoute.claimedamount !== '') ||
      (expenseFromRoute.claimed_amount !== undefined && expenseFromRoute.claimed_amount !== null && expenseFromRoute.claimed_amount !== '') ||
      (expenseFromRoute.single_fare !== undefined && expenseFromRoute.single_fare !== null && expenseFromRoute.single_fare !== '') ||
      (expenseFromRoute.singlefare !== undefined && expenseFromRoute.singlefare !== null && expenseFromRoute.singlefare !== '') ||
      (expenseFromRoute.singleFare !== undefined && expenseFromRoute.singleFare !== null && expenseFromRoute.singleFare !== '') ||
      expenseFromRoute.travel_hours !== undefined ||
      expenseFromRoute.traveltimehours !== undefined ||
      expenseFromRoute.travel_mode !== undefined ||
      expenseFromRoute.modeoftravel !== undefined ||
      (expenseFromRoute.id && expenseFromRoute.expenseid === 3)
    )
  );

  const travelNo =
    expenseFromRoute?.requestno ||
    claimdata?.requestno ||
    claimdata?.data?.[0]?.requestno ||
    expenseFromRoute?.tourid ||
    claimdata?.tourid ||
    claimdata?.tour_id ||
    claimdata?.id ||
    'N/A';

  const employeeName = useMemo(() => {
    if (claimdata?.maker_data?.full_name) {
      const code = claimdata.maker_data.code;
      return code ? `(${code}) ${claimdata.maker_data.full_name}` : claimdata.maker_data.full_name;
    }
    if (claimdata?.data?.[0]?.employee_name) {
      const code = claimdata.data[0].employee_code;
      return code ? `(${code}) ${claimdata.data[0].employee_name}` : claimdata.data[0].employee_name;
    }
    if (expenseFromRoute?.employee_name) {
      const code = expenseFromRoute?.employee_code || expenseFromRoute?.emp_code;
      return code ? `(${code}) ${expenseFromRoute.employee_name}` : expenseFromRoute.employee_name;
    }
    if (claimdata?.employee_name) {
      const code = claimdata?.employee_code || claimdata?.emp_code;
      return code ? `(${code}) ${claimdata.employee_name}` : claimdata.employee_name;
    }
    return 'N/A';
  }, [claimdata, expenseFromRoute]);

  const designation =
    expenseFromRoute?.designation ||
    claimdata?.maker_data?.designation ||
    claimdata?.designation ||
    claimdata?.data?.[0]?.designation ||
    'N/A';

  const employeeGrade =
    expenseFromRoute?.employee_grade ||
    expenseFromRoute?.emp_grade ||
    claimdata?.maker_data?.grade ||
    claimdata?.employee_grade ||
    claimdata?.emp_grade ||
    claimdata?.data?.[0]?.emp_grade ||
    'N/A';

  // On Behalf employee banner
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

  // Applevel and Status resolution
  const fromUpper = String(from || '').toUpperCase();
  const applevel = Number(
    claimdata?.applevel ??
    expenseFromRoute?.applevel ??
    (fromUpper === 'CHECKER' ? 2 : 0)
  );
  const isChecker =
    fromUpper === 'CHECKER' ||
    applevel === 2;

  const claimStatusId = Number(
    claimdata?.claim_status_id ??
    expenseFromRoute?.claim_status_id ??
    claimdata?.statusid ??
    -1
  );

  // Maker can edit when creating or modifying incidental expenses
  const isMakerAction = !isChecker;
  const isApprovedAmt = isChecker;
  const isApproveButton = isChecker;
  const isSubmitButton = isMakerAction;
  const addIncidentalButtonDisabled = !isMakerAction;

  // States
  const [items, setItems] = useState(() => {
    if (hasRouteExpense) {
      const initial = mapIncidentalItem(expenseFromRoute, '33AAACT3373J1ZD');
      return [initial];
    }
    return [];
  });
  const [expandedItems, setExpandedItems] = useState(() => {
    if (hasRouteExpense) {
      const initial = mapIncidentalItem(expenseFromRoute, '33AAACT3373J1ZD');
      return { [initial.id]: true };
    }
    return {};
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditable, setIsEditable] = useState(true);
  const [bankGst, setBankGst] = useState('33AAACT3373J1ZD');

  // Picker controls
  const [activePickerField, setActivePickerField] = useState(null);
  const [activePickerItemId, setActivePickerItemId] = useState(null);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // HSN controls
  const [hsnModalVisible, setHsnModalVisible] = useState(false);
  const [hsnActiveItemId, setHsnActiveItemId] = useState(null);
  const [hsnSearchText, setHsnSearchText] = useState('');
  const [hsnResults, setHsnResults] = useState([]);
  const [hsnPage, setHsnPage] = useState(1);
  const [hsnHasNext, setHsnHasNext] = useState(false);
  const hsnDebounceRef = useRef(null);

  // Calendar date picker
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [dateActiveItemId, setDateActiveItemId] = useState(null);
  const [dateModalInitialDate, setDateModalInitialDate] = useState(new Date());

  // RTK Query hooks
  const [triggerDropdownGet] = useLazyCommonDropDownGetQuery();
  const [modeOfTravelOptions, setModeOfTravelOptions] = useState([
    { id: 18, name: 'TRAIN', label: 'TRAIN', value: 'Train' },
    { id: 19, name: 'ROAD', label: 'ROAD', value: 'ROAD' },
  ]);
  const [yesNoOptions, setYesNoOptions] = useState([
    { id: 1, name: 'Yes', label: 'Yes', value: '1' },
    { id: 2, name: 'No', label: 'No', value: '0' },
  ]);

  const {
    data: fetchedIncidentalData,
    isLoading: isFetchingIncidental,
    isSuccess: isIncidentalSuccess,
    refetch: refetchIncidental,
  } = useGetIncidentalExpenseQuery(tourId, { skip: !tourId, refetchOnMountOrArgChange: true });

  const [triggerIncidentalCreate, { isLoading: isCreatingIncidental }] =
    useIncidentalCreateMutation();

  const [triggerIncidentalLogic] = useIncidentalLogicMutation();
  const [triggerDeleteIncidental, { isLoading: isDeletingIncidental }] =
    useDeleteIncidentalMutation();
  const [triggerApproveIncidental, { isLoading: isApprovingIncidental }] =
    useApproveIncidentalMutation();

  const [triggerSearchHsn, { isFetching: isSearchingHsn }] =
    useLazySearchHsnQuery();

  const [triggerValidateSupplierGst] = useLazyValidateSupplierGstQuery();
  const [validatingItemId, setValidatingItemId] = useState(null);

  // Header configuration
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
            { fontSize: moderateScale(20), fontWeight: '600', color: CustomColors.white },
          ]}
        >
          Incidental Expense
        </Text>
      ),
    });
  }, [navigation, CustomColors, globalStyles]);

  // Load dropdown options from backend
  useEffect(() => {
    (async () => {
      try {
        const modeRes = await triggerDropdownGet('incidental_travelmode').unwrap();
        const list = Array.isArray(modeRes) ? modeRes : (modeRes?.data || []);
        if (list && list.length > 0) {
          const formatted = list.map((o) => ({
            id: o.id,
            name: String(o.name || o.value || '').toUpperCase(),
            label: String(o.name || o.value || '').toUpperCase(),
            value: String(o.value || o.name || ''),
          }));
          setModeOfTravelOptions(formatted);
        }
      } catch (e) {
        console.log('[Incidental] Mode of Travel dropdown error:', e);
      }
      try {
        const ynRes = await triggerDropdownGet('yn').unwrap();
        const ynList = Array.isArray(ynRes) ? ynRes : (ynRes?.data || []);
        if (ynList && ynList.length > 0) {
          setYesNoOptions(
            ynList.map((o) => ({
              id: o.id,
              name: String(o.name || (String(o.value) === '1' ? 'Yes' : 'No')),
              label: String(o.name || (String(o.value) === '1' ? 'Yes' : 'No')),
              value: String(o.value ?? (o.name === 'Yes' ? '1' : '0')),
            }))
          );
        }
      } catch (e) {
        console.log('[Incidental] Yes/No dropdown error:', e);
      }
    })();
  }, [triggerDropdownGet]);

  // Populate items from API data
  useEffect(() => {
    if (isIncidentalSuccess && fetchedIncidentalData) {
      const resolvedBankGst = fetchedIncidentalData?.branch_gst || bankGst || '33AAACT3373J1ZD';
      setBankGst(resolvedBankGst);
      const fetchedList = Array.isArray(fetchedIncidentalData)
        ? fetchedIncidentalData
        : (fetchedIncidentalData?.data || []);

      if (fetchedList.length > 0) {
        const mappedItems = fetchedList.map((item) => mapIncidentalItem(item, resolvedBankGst));
        setItems(mappedItems);
        const expandMap = {};
        mappedItems.forEach((it) => {
          expandMap[it.id] = true;
        });
        setExpandedItems(expandMap);
      } else if (hasRouteExpense) {
        const initial = mapIncidentalItem(expenseFromRoute, resolvedBankGst);
        setItems([initial]);
        setExpandedItems({ [initial.id]: true });
      } else {
        const initial = { ...emptyIncidentalItem(), bankGst: resolvedBankGst };
        setItems([initial]);
        setExpandedItems({ [initial.id]: true });
      }

      setIsEditable(isMakerAction);
    }
  }, [isIncidentalSuccess, fetchedIncidentalData, isMakerAction, hasRouteExpense, expenseFromRoute, bankGst]);

  // Fallback initial row
  useEffect(() => {
    if (!isFetchingIncidental && items.length === 0) {
      if (hasRouteExpense) {
        const initial = mapIncidentalItem(expenseFromRoute, bankGst || '33AAACT3373J1ZD');
        setItems([initial]);
        setExpandedItems({ [initial.id]: true });
      } else {
        const initial = { ...emptyIncidentalItem(), bankGst: bankGst || '33AAACT3373J1ZD' };
        setItems([initial]);
        setExpandedItems({ [initial.id]: true });
      }
      setIsEditable(isMakerAction);
    }
  }, [isFetchingIncidental, items.length, bankGst, isMakerAction, hasRouteExpense, expenseFromRoute]);

  // ---------------------------------------------------------------------------
  // GST Calculation (gst_calc from Angular lines 948-1001)
  // ---------------------------------------------------------------------------
  const calculateGst = useCallback((item) => {
    const bnkGst = String(item.bankGst || '').trim();
    const vndGst = String(item.vendorGstNo || '').trim();
    const hsn = item.hsnCode;
    const taxAmt = parseFloat(item.taxableAmount) || 0;
    const igstRate = Number(item.igstRate) || 0;

    if (bnkGst && vndGst && bnkGst !== vndGst && hsn) {
      const bnkState = bnkGst.slice(0, 2);
      const loState = vndGst.slice(0, 2);

      if (bnkState === loState) {
        // Intra-state: CGST & SGST
        const per = igstRate / 2;
        const amt = round2((taxAmt * per) / 100);
        return {
          cgst: String(amt),
          sgst: String(amt),
          igst: '0',
          cgstRate: per,
          sgstRate: per,
          igstRate: 0,
          invoiceAmount: String(round2(amt + amt + taxAmt)),
        };
      } else {
        // Inter-state: IGST
        const amt = round2((igstRate * taxAmt) / 100);
        return {
          igst: String(amt),
          cgst: '0',
          sgst: '0',
          igstRate: igstRate,
          cgstRate: 0,
          sgstRate: 0,
          invoiceAmount: String(round2(amt + taxAmt)),
        };
      }
    } else if (bnkGst && vndGst && bnkGst === vndGst && hsn) {
      ToastMessage('Bank GST and Vendor GST are Same');
      return {
        vendorGstNo: '',
        cgst: '0',
        sgst: '0',
        igst: '0',
        invoiceAmount: String(taxAmt),
      };
    } else {
      return {
        cgst: '0',
        sgst: '0',
        igst: '0',
        invoiceAmount: String(taxAmt),
      };
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Incidental Eligible Amount Calculation via API (taserv/incidental/logic)
  // ---------------------------------------------------------------------------
  const calculateEligibleAmount = useCallback(
    async (itemId, itemSnapshot) => {
      if (
        !itemSnapshot.modeOfTravel ||
        itemSnapshot.onwardReturnSameDay === '' ||
        itemSnapshot.onwardReturnSameDay === null ||
        !itemSnapshot.travelTimeHours ||
        !itemSnapshot.singleFare
      ) {
        return;
      }
      try {
        const payload = {
          expense_id: 3,
          travel_mode: itemSnapshot.modeOfTravel,
          same_day_return: Number(itemSnapshot.onwardReturnSameDay),
          travel_hours: Number(itemSnapshot.travelTimeHours),
          single_fare: Number(itemSnapshot.singleFare),
        };
        const res = await triggerIncidentalLogic(payload).unwrap();
        if (res && res.elgibleamount !== undefined) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === itemId
                ? { ...it, incidentalAmount: String(res.elgibleamount) }
                : it
            )
          );
        }
      } catch (err) {
        console.log('[Incidental] calculateEligibleAmount error:', err);
      }
    },
    [triggerIncidentalLogic]
  );

  // ---------------------------------------------------------------------------
  // Update Item Field Handler
  // ---------------------------------------------------------------------------
  const updateItemField = useCallback(
    (itemId, field, value) => {
      setHasUnsavedChanges(true);
      setItems((prev) => {
        return prev.map((it) => {
          if (it.id !== itemId) return it;

          let updated = { ...it, [field]: value };

          // If vendor GST changed, reset validation status
          if (field === 'vendorGstNo') {
            updated.isGstValidated = false;
            // If user cleared GST, also reset auto-filled vendor details
            if (!value) {
              updated.vendorName = '';
              updated.vendorCode = '';
              updated.address = '';
            }
          }

          // If same_day_return is 1 (Yes) and travel_hours > 24, clear travel_hours
          if (field === 'onwardReturnSameDay') {
            if (value === '1' && Number(updated.travelTimeHours) > 24) {
              updated.travelTimeHours = '';
              ToastMessage({
                type: 'error',
                text1: 'Validation',
                text2: 'If you are return on the same day you cannot enter time more then 24',
              });
            }
          }

          // If taxableAmount or vendorGstNo changes, recalculate GST
          if (field === 'taxableAmount' || field === 'vendorGstNo') {
            const gstRecalc = calculateGst(updated);
            updated = { ...updated, ...gstRecalc };
          }

          // If CGST, SGST, or IGST is entered manually, recalculate invoice amount
          if (field === 'cgst' || field === 'sgst' || field === 'igst') {
            const tax = parseFloat(updated.taxableAmount) || 0;
            const c = parseFloat(field === 'cgst' ? value : updated.cgst) || 0;
            const s = parseFloat(field === 'sgst' ? value : updated.sgst) || 0;
            const i = parseFloat(field === 'igst' ? value : updated.igst) || 0;
            if (tax > 0 || c > 0 || s > 0 || i > 0) {
              updated.invoiceAmount = String(round2(tax + c + s + i));
            }
          }

          // Check if eligible amount calculation should be triggered
          if (
            field === 'modeOfTravel' ||
            field === 'onwardReturnSameDay' ||
            field === 'travelTimeHours' ||
            field === 'singleFare'
          ) {
            calculateEligibleAmount(itemId, updated);
          }

          return updated;
        });
      });
    },
    [calculateGst, calculateEligibleAmount]
  );

  // Clean numeric inputs
  const updateNumericItemField = useCallback(
    (text, field, itemId) => {
      let cleaned = text.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
      }

      // travelTimeHours: whole numbers only, max 4 chars, limit <= 24 if same day return
      if (field === 'travelTimeHours') {
        cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
        const currentItem = items.find((it) => it.id === itemId);
        if (currentItem?.onwardReturnSameDay === '1' && Number(cleaned) > 24) {
          ToastMessage({
            type: 'error',
            text1: 'Validation',
            text2: 'If you are return on the same day you cannot enter time more then 24',
          });
          cleaned = '';
        }
      }

      // singleFare: max 8 chars
      if (field === 'singleFare') {
        cleaned = cleaned.slice(0, 8);
      }

      updateItemField(itemId, field, cleaned);
    },
    [items, updateItemField]
  );

  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ---------------------------------------------------------------------------
  // Add Expense Item
  // ---------------------------------------------------------------------------
  const handleAddExpenseItem = useCallback(() => {
    if (addIncidentalButtonDisabled) {
      ToastMessage('This claim cannot be modified in its current status.');
      return;
    }
    const newItem = { ...emptyIncidentalItem(), bankGst: bankGst || '33AAACT3373J1ZD' };
    setItems((prev) => [...prev, newItem]);
    setExpandedItems((prev) => ({ ...prev, [newItem.id]: true }));
    ToastMessage('New incidental expense item added.');
  }, [addIncidentalButtonDisabled, bankGst]);

  // ---------------------------------------------------------------------------
  // Delete Item (with Backend Delete if persisted ID)
  // ---------------------------------------------------------------------------
  const handleDeleteItem = useCallback(
    (itemId) => {
      if (!isEditable) {
        ToastMessage('This claim cannot be modified in its current status.');
        return;
      }
      if (items.length <= 1) {
        ToastMessage('You must have at least one incidental expense item.');
        return;
      }

      const itemToDelete = items.find((it) => it.id === itemId);
      const isPersisted = itemToDelete && !String(itemToDelete.id).startsWith('temp-');

      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this incidental expense item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (isPersisted) {
                try {
                  const res = await triggerDeleteIncidental(itemToDelete.id).unwrap();
                  if (res?.code === 'UNEXPECTED_ERROR') {
                    ToastMessage({ type: 'error', text1: 'Delete Error', text2: res.description || 'Could not delete item.' });
                    return;
                  }
                  ToastMessage('Deleted Successfully....');
                  setItems((prev) => prev.filter((it) => it.id !== itemId));
                  setHasUnsavedChanges(true);
                  if (refetchIncidental) refetchIncidental();
                } catch (delErr) {
                  console.log('[Incidental] Delete error:', delErr);
                  ToastMessage({ type: 'error', text1: 'Delete Failed', text2: 'Error deleting item from server.' });
                }
              } else {
                setItems((prev) => prev.filter((it) => it.id !== itemId));
                setHasUnsavedChanges(true);
                ToastMessage('Expense item removed.');
              }
            },
          },
        ]
      );
    },
    [isEditable, items, triggerDeleteIncidental, refetchIncidental]
  );

  // ---------------------------------------------------------------------------
  // Dropdown Picker Handler
  // ---------------------------------------------------------------------------
  const currentActiveItem = useMemo(
    () => items.find((it) => it.id === activePickerItemId) || {},
    [items, activePickerItemId]
  );

  const currentPickerOptions =
    activePickerField === 'modeOfTravel'
      ? modeOfTravelOptions
      : activePickerField === 'onwardReturnSameDay'
      ? yesNoOptions
      : [];

  const DropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected =
      selected === options.value ||
      selected === options.name ||
      String(selected || '').toLowerCase() === String(options.value || '').toLowerCase();
    return (
      <TouchableOpacity
        style={[
          styles.actionSheetItem,
          isSelected && styles.actionSheetItemSelected,
        ]}
        onPress={() => {
          onPress(options.value ?? options.name ?? options);
          setPickerStatus(false);
        }}
      >
        <Text allowFontScaling={false} style={styles.actionSheetItemText}>
          {options.label || options.name || options.value}
        </Text>
      </TouchableOpacity>
    );
  };

  const handlePickerSelect = (val) => {
    if (!activePickerItemId || !activePickerField) return;
    const resolvedValue =
      typeof val === 'object' && val !== null ? (val.value ?? val.name ?? val.label ?? '') : String(val ?? '');
    updateItemField(activePickerItemId, activePickerField, resolvedValue);
  };

  // ---------------------------------------------------------------------------
  // HSN Search & Selection
  // ---------------------------------------------------------------------------
  const runHsnSearch = useCallback(
    async (queryText, page = 1, append = false) => {
      try {
        const res = await triggerSearchHsn({ query: queryText, page }).unwrap();
        const list = res?.data || [];
        setHsnResults((prev) => (append ? [...prev, ...list] : list));
        setHsnHasNext(Boolean(res?.pagination?.has_next));
        setHsnPage(page);
      } catch (e) {
        console.log('[Incidental] HSN search error:', e);
        ToastMessage({ type: 'error', text1: 'HSN Search Error', text2: 'Could not fetch HSN codes.' });
      }
    },
    [triggerSearchHsn]
  );

  const openHsnModal = (itemId) => {
    if (!isEditable) return;
    setHsnActiveItemId(itemId);
    setHsnSearchText('');
    setHsnModalVisible(true);
    runHsnSearch('', 1, false);
  };

  const onHsnSearchChange = (text) => {
    setHsnSearchText(text);
    if (hsnDebounceRef.current) clearTimeout(hsnDebounceRef.current);
    hsnDebounceRef.current = setTimeout(() => {
      runHsnSearch(text, 1, false);
    }, 400);
  };

  const handleHsnLoadMore = () => {
    if (!hsnHasNext || isSearchingHsn) return;
    runHsnSearch(hsnSearchText, hsnPage + 1, true);
  };

  const handleHsnSelect = (hsnRecord) => {
    if (!hsnActiveItemId) return;
    setHasUnsavedChanges(true);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== hsnActiveItemId) return it;
        const cgstRate = Number(hsnRecord.cgstrate || 0);
        const sgstRate = Number(hsnRecord.sgstrate || 0);
        const igstRate = Number(hsnRecord.igstrate || 0);
        const updated = {
          ...it,
          hsnCode: hsnRecord.code,
          hsnId: hsnRecord.id,
          cgstRate,
          sgstRate,
          igstRate,
        };
        const gstCalcRes = calculateGst(updated);
        return { ...updated, ...gstCalcRes };
      })
    );
    setHsnModalVisible(false);
  };

  // ---------------------------------------------------------------------------
  // Supplier GST Validation (venserv/validate?type=gst&value=...)
  // Matching Angular lines 1104-1124:
  // - extracts tradeNam -> vendorname, ctjCd -> vendorcode, pradr.addr -> address
  // - resets to empty on failure
  // - sets validate_gst = true on success
  // ---------------------------------------------------------------------------
  const handleValidateVendorGst = useCallback(
    async (itemId) => {
      const item = items.find((it) => it.id === itemId);
      const gstNo = item?.vendorGstNo ? String(item.vendorGstNo).trim() : '';
      if (!gstNo) {
        ToastMessage('Please enter Supplier GST No before validating.');
        return;
      }

      setValidatingItemId(itemId);
      try {
        const res = await triggerValidateSupplierGst({ value: gstNo }).unwrap();
        console.log('[Incidental] GST Validation response:', res);

        const vs = res?.validation_status;
        if (!res || vs === false || vs === 'false' || !vs) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === itemId
                ? {
                    ...it,
                    vendorName: '',
                    vendorCode: '',
                    address: '',
                    isGstValidated: false,
                  }
                : it
            )
          );
          ToastMessage({
            type: 'error',
            text1: 'Validation Error',
            text2: res?.description || 'Please Enter Valid GST No',
          });
          return;
        }

        // Extract and patch fields matching Angular:
        // let vendor_name = gst_details.validation_status.tradeNam
        // let vendor_code = gst_details.validation_status.ctjCd
        // let vendor_address = bno + ',' + st + ',' + loc + ',' + stcd + ',' + pncd
        const vendor_name = vs.tradeNam || vs.lgnm || '';
        const vendor_code = vs.ctjCd || '';
        const addrObj = vs.pradr?.addr;
        let vendor_address = '';
        if (addrObj) {
          const parts = [
            addrObj.bno,
            addrObj.st,
            addrObj.loc,
            addrObj.stcd,
            addrObj.pncd,
          ].filter(Boolean);
          vendor_address = parts.join(',');
        } else if (typeof vs.address === 'string') {
          vendor_address = vs.address;
        }

        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== itemId) return it;
            const updated = {
              ...it,
              vendorName: vendor_name,
              vendorCode: vendor_code,
              address: vendor_address,
              isGstValidated: true,
            };
            const gstCalcRes = calculateGst(updated);
            return { ...updated, ...gstCalcRes };
          })
        );

        setHasUnsavedChanges(true);
        ToastMessage('GST validated successfully.');
      } catch (err) {
        console.log('[Incidental] GST validation error:', err);
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  vendorName: '',
                  vendorCode: '',
                  address: '',
                  isGstValidated: false,
                }
              : it
          )
        );
        ToastMessage({
          type: 'error',
          text1: 'GST Validation Failed',
          text2: err?.data?.description || err?.message || 'Could not validate this GST number.',
        });
      } finally {
        setValidatingItemId(null);
      }
    },
    [items, triggerValidateSupplierGst, calculateGst]
  );

  // ---------------------------------------------------------------------------
  // Copy Bank GST No to Clipboard
  // ---------------------------------------------------------------------------
  const handleCopyBankGst = useCallback(async (gstNo) => {
    const val = String(gstNo || '').trim();
    if (!val) {
      ToastMessage('No Bank GST No to copy');
      return;
    }
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(val);
      }
      ToastMessage('Bank GST No copied to clipboard');
    } catch (err) {
      console.log('Copy GST error:', err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Date Picker Handlers
  // ---------------------------------------------------------------------------
  const handleDatePickerPress = useCallback(
    (itemId, currentValue) => {
      if (!isEditable) return;
      const initialDate = parseDDMMYYYYToDate(currentValue);
      setDateActiveItemId(itemId);
      setDateModalInitialDate(initialDate);
      setDateModalVisible(true);
    },
    [isEditable]
  );

  const handleCalendarSelectDate = useCallback(
    (selectedDate) => {
      if (dateActiveItemId) {
        updateItemField(dateActiveItemId, 'invoiceDate', formatDateToDDMMYYYY(selectedDate));
      }
      setDateModalVisible(false);
    },
    [dateActiveItemId, updateItemField]
  );

  // ---------------------------------------------------------------------------
  // Form Submission (Matching Angular submitForm)
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (items.length === 0) {
      ToastMessage('Please add at least one incidental expense item.');
      return;
    }

    // Angular Validation Rules
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const sNo = i + 1;

      // 1. Vendor GST validated if entered
      if (item.vendorGstNo && String(item.vendorGstNo).trim() !== '') {
        if (!item.isGstValidated) {
          ToastMessage(`Item #${sNo}: Please validate VENDOR GST No`);
          return;
        }
      }

      // 2. Travel hours whole number check (no decimals)
      if (item.travelTimeHours && String(item.travelTimeHours).includes('.')) {
        ToastMessage(`Item #${sNo}: Please Enter No of Hours in Numbers not Decimals`);
        return;
      }

      // 3. Mode of travel mandatory
      if (!item.modeOfTravel || String(item.modeOfTravel).trim() === '') {
        ToastMessage(`Item #${sNo}: Please Select Mode of Travel`);
        return;
      }

      // 4. Same day return mandatory
      if (item.onwardReturnSameDay === '' || item.onwardReturnSameDay === null || item.onwardReturnSameDay === undefined) {
        ToastMessage(`Item #${sNo}: Please Select Onward and Return Journey on Same Day`);
        return;
      }

      // 5. If same day return is 0 (No), travel hours must be >= 24
      if (String(item.onwardReturnSameDay) === '0' && Number(item.travelTimeHours) < 24) {
        ToastMessage(`Item #${sNo}: Travel Time in Hours should be greater than 24`);
        return;
      }

      // 6. Travel time mandatory
      if (!item.travelTimeHours || String(item.travelTimeHours).trim() === '') {
        ToastMessage(`Item #${sNo}: Please Enter Travel Time in Hours`);
        return;
      }

      // 7. Single fare > 0
      if (!item.singleFare || Number(item.singleFare) <= 0) {
        ToastMessage(`Item #${sNo}: Please Enter Valid Single Fare Amount`);
        return;
      }

      // 8. Invoice amount >= single fare (if invoice amount entered)
      if (Number(item.invoiceAmount) > 0 && Number(item.invoiceAmount) < Number(item.singleFare)) {
        ToastMessage(`Item #${sNo}: Invoice Amount must be greater than or equal to claim amount`);
        return;
      }
    }

    // Build payload matching Angular: { data: [...] }
    const payload = {
      data: items.map((it) => {
        const itemPayload = {
          expenseid: 3,
          requestercomment: it.requestercomment || expenseFromRoute?.requestercomment || claimdata?.requestercomment || '',
          tourid: Number(tourId),
          same_day_return: Number(it.onwardReturnSameDay),
          single_fare: Number(it.singleFare),
          travel_hours: Number(it.travelTimeHours),
          travel_mode: String(it.modeOfTravel),
          eligibleamount: Number(it.incidentalAmount || 0),
          bankgstno: it.bankGst || bankGst,
          vendorgstno: it.vendorGstNo || '',
          vendorname: it.vendorName || '',
          vendorcode: it.vendorCode || '',
          address: it.address || '',
          hsncode: it.hsnCode || '',
          taxableamount: Number(it.taxableAmount || 0),
          cgst: Number(it.cgst || 0),
          sgst: Number(it.sgst || 0),
          igst: Number(it.igst || 0),
          igstp: Number(it.igstRate || 0),
          cgstp: Number(it.cgstRate || 0),
          sgstp: Number(it.sgstRate || 0),
          invoiceamount: Number(it.invoiceAmount || 0),
          invoicedate: it.invoiceDate ? formatDateToYYYYMMDD(it.invoiceDate) : null,
          invoiceno: it.invoiceNo || null,
        };

        if (it.id && !String(it.id).startsWith('temp-')) {
          itemPayload.id = it.id;
        } else if (items.length === 1 && expenseFromRoute?.id && !String(expenseFromRoute.id).startsWith('temp-')) {
          itemPayload.id = expenseFromRoute.id;
        }

        return itemPayload;
      }),
    };

    try {
      const res = await triggerIncidentalCreate(payload).unwrap();

      if (res?.status === 'success' || res?.message === 'Successfully Created' || res?.message === 'Successfully Updated') {
        ToastMessage('Successfully Created');
        setHasUnsavedChanges(false);
        handleGoBack();
      } else {
        ToastMessage({
          type: 'error',
          text1: 'Submission Error',
          text2: res?.description || 'Could not submit incidental expense.',
        });
      }
    } catch (err) {
      console.log('[Incidental] Submit error:', err);
      ToastMessage({
        type: 'error',
        text1: 'Submission Failed',
        text2: err?.data?.description || err?.data?.message || err?.message || 'Error submitting expense.',
      });
    }
  }, [items, expenseFromRoute, claimdata, tourId, bankGst, triggerIncidentalCreate, handleGoBack]);

  // ---------------------------------------------------------------------------
  // Approver Action (Matching Angular incidentalApproveButton)
  // ---------------------------------------------------------------------------
  const handleApprove = useCallback(async () => {
    for (let i = 0; i < items.length; i += 1) {
      if (!items[i].amount || Number(items[i].amount) <= 0) {
        ToastMessage(`Item #${i + 1}: Please enter valid Approved Amount.`);
        return;
      }
    }

    const applist = items.map((it) => ({
      id: it.id,
      amount: Number(it.amount || 0),
      gst_no: it.vendorGstNo || '',
      vendor_name: it.vendorName || '',
      invoice_no: it.invoiceNo || '',
      invoice_date: it.invoiceDate ? formatDateToYYYYMMDD(it.invoiceDate) : '',
      vendor_code: it.vendorCode || '',
      vendor_address: it.address || '',
      hsn_code: it.hsnCode || '',
      taxable_amount: Number(it.taxableAmount || 0),
      Cgst: Number(it.cgst || 0),
      Sgst: Number(it.sgst || 0),
      Igst: Number(it.igst || 0),
      invoice_amount: Number(it.invoiceAmount || 0),
    }));

    try {
      const res = await triggerApproveIncidental({ tourId, payload: applist }).unwrap();
      if (res?.status === 'success') {
        ToastMessage('Success....');
        handleGoBack();
      } else {
        ToastMessage({
          type: 'error',
          text1: 'Approval Failed',
          text2: res?.description || 'Could not approve incidental expense.',
        });
      }
    } catch (err) {
      console.log('[Incidental] Approve error:', err);
      ToastMessage({
        type: 'error',
        text1: 'Approval Error',
        text2: err?.data?.description || 'An error occurred during approval.',
      });
    }
  }, [items, tourId, triggerApproveIncidental, handleGoBack]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const styles = StyleSheet.create({
    keyboardAvoidingContainer: { flex: 1, backgroundColor: CustomColors.appScreenColor },
    scrollContainer: {
      flexGrow: 1,
      padding: moderateScale(14),
      paddingBottom: verticalScale(120),
    },
    // On Behalf Header Banner
    onBehalfBanner: {
      backgroundColor: CustomColors.appThemeColor + '15',
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(14),
      marginBottom: verticalScale(14),
      borderLeftWidth: moderateScale(4),
      borderLeftColor: CustomColors.appThemeColor,
    },
    onBehalfText: {
      fontSize: moderateScale(15),
      fontWeight: '600',
      color: CustomColors.textDark,
      fontFamily: Fonts.semiBold,
    },
    // Tour Details Card
    tourCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(14),
      padding: moderateScale(18),
      marginBottom: verticalScale(16),
      borderLeftWidth: moderateScale(6),
      borderLeftColor: CustomColors.appThemeColor,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    tourCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(12),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.lightGray,
      paddingBottom: verticalScale(8),
    },
    tourCardTitle: {
      fontSize: moderateScale(18),
      fontWeight: '700',
      color: CustomColors.appThemeColor,
      fontFamily: Fonts.bold,
      marginLeft: horizontalScale(6),
    },
    tourGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    tourGridItem: {
      width: '48%',
      marginBottom: verticalScale(10),
    },
    tourFieldLabel: {
      fontSize: moderateScale(13),
      color: CustomColors.textGray,
      fontFamily: Fonts.medium,
      marginBottom: verticalScale(2),
    },
    tourFieldValue: {
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      fontWeight: '600',
      fontFamily: Fonts.semiBold,
    },
    // Section Header Row with Add Button on the side
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: verticalScale(6),
      marginBottom: verticalScale(14),
      paddingHorizontal: horizontalScale(4),
    },
    sectionHeading: {
      fontSize: moderateScale(18),
      fontWeight: '700',
      color: CustomColors.appThemeColor,
      fontFamily: Fonts.bold,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(7),
      paddingHorizontal: horizontalScale(14),
      borderRadius: moderateScale(8),
      elevation: 2,
    },
    addButtonDisabled: {
      backgroundColor: CustomColors.mediumGray || '#BDBDBD',
      opacity: 0.6,
    },
    addButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      marginLeft: horizontalScale(4),
    },
    // Item Details Cards
    itemCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(14),
      borderWidth: 1,
      borderColor: CustomColors.lightGray,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(14),
      backgroundColor: CustomColors.appScreenColor,
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.lightGray,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    cardTitle: {
      fontSize: moderateScale(15),
      fontWeight: '600',
      color: CustomColors.textDark,
      fontFamily: Fonts.semiBold,
      marginLeft: horizontalScale(10),
      flex: 1,
    },
    cardHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardDetails: {
      padding: moderateScale(14),
    },
    detailItemContainer: {
      marginBottom: verticalScale(14),
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(6),
    },
    labelContainer: {
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
    detailValueText: {
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
      paddingVertical: verticalScale(4),
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
      fontFamily: Fonts.medium,
      color: CustomColors.textGray || '#64748B',
      marginLeft: horizontalScale(6),
    },
    actionSheetTriggerButtonText: {
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
      flex: 1,
    },
    disabledInput: {
      backgroundColor: CustomColors.lightGray || '#F0F0F0',
      color: CustomColors.textGray,
    },
    disabledText: {
      color: CustomColors.textGray,
    },
    multilineInput: {
      minHeight: verticalScale(60),
      textAlignVertical: 'top',
    },
    // Supplier GST Validate Button & Badge
    validateBtn: {
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(16),
      marginLeft: horizontalScale(8),
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: verticalScale(46),
      elevation: 1,
    },
    validateBtnDisabled: {
      backgroundColor: CustomColors.mediumGray || '#BDBDBD',
      opacity: 0.6,
    },
    validateBtnText: {
      color: CustomColors.white,
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
    },
    copyBtn: {
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(14),
      marginLeft: horizontalScale(8),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: verticalScale(46),
      elevation: 1,
    },
    copyBtnText: {
      color: CustomColors.white,
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      marginLeft: horizontalScale(4),
    },
    validatedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: verticalScale(4),
    },
    validatedBadgeText: {
      color: '#2E7D32',
      fontSize: moderateScale(12),
      fontWeight: '600',
      marginLeft: horizontalScale(4),
      fontFamily: Fonts.semiBold,
    },
    sNoBadge: {
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(12),
      width: moderateScale(26),
      height: moderateScale(26),
      justifyContent: 'center',
      alignItems: 'center',
    },
    sNoText: {
      color: CustomColors.white,
      fontSize: moderateScale(12),
      fontWeight: 'bold',
      fontFamily: Fonts.bold,
    },
    noDataText: {
      padding: moderateScale(20),
      textAlign: 'center',
      color: CustomColors.textGray,
      fontSize: moderateScale(14),
      fontFamily: Fonts.medium,
    },
    // Bottom Action Bar
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
      elevation: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bottomButton: {
      flex: 1,
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: horizontalScale(6),
    },
    backButton: {
      backgroundColor: CustomColors.mediumGray || '#757575',
    },
    submitButton: {
      backgroundColor: CustomColors.appThemeColor,
    },
    approveButton: {
      backgroundColor: CustomColors.appThemeColor,
    },
    bottomButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(15),
      fontWeight: 'bold',
      fontFamily: Fonts.bold,
    },
    // Custom ActionSheet Item
    actionSheetItem: {
      paddingVertical: verticalScale(14),
      paddingHorizontal: horizontalScale(18),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.lightGray,
    },
    actionSheetItemSelected: {
      backgroundColor: CustomColors.appThemeColor + '15',
    },
    actionSheetItemText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
    },
    // HSN & Calendar Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: moderateScale(16),
    },
    hsnModalContainer: {
      width: '100%',
      maxHeight: '80%',
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(14),
      padding: moderateScale(16),
      elevation: 6,
    },
    hsnModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(12),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.lightGray,
      paddingBottom: verticalScale(8),
    },
    hsnModalTitle: {
      fontSize: moderateScale(17),
      fontWeight: '700',
      color: CustomColors.appThemeColor,
      fontFamily: Fonts.bold,
    },
    hsnSearchInput: {
      borderWidth: 1,
      borderColor: CustomColors.lightGray,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(8),
      paddingHorizontal: horizontalScale(10),
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
      marginBottom: verticalScale(12),
    },
    hsnRow: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(6),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.lightGray,
    },
    hsnRowCode: {
      fontSize: moderateScale(14),
      fontWeight: '600',
      color: CustomColors.textDark,
      fontFamily: Fonts.semiBold,
    },
    hsnRowSub: {
      fontSize: moderateScale(12),
      color: CustomColors.textGray,
      marginTop: verticalScale(2),
      fontFamily: Fonts.regular,
    },
    calendarModalContainer: {
      width: '94%',
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(14),
      padding: moderateScale(16),
      elevation: 6,
    },
    calendarHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(12),
    },
    calendarNavButton: {
      padding: moderateScale(6),
    },
    calendarMonthText: {
      fontSize: moderateScale(16),
      fontWeight: '700',
      color: CustomColors.textDark,
      fontFamily: Fonts.bold,
    },
    calendarWeekdayRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: verticalScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.lightGray,
      paddingBottom: verticalScale(6),
    },
    calendarWeekdayText: {
      width: moderateScale(36),
      textAlign: 'center',
      fontSize: moderateScale(12),
      fontWeight: '600',
      color: CustomColors.textGray,
      fontFamily: Fonts.semiBold,
    },
    calendarWeekRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: verticalScale(6),
    },
    calendarDayCell: {
      width: moderateScale(36),
      height: moderateScale(36),
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: moderateScale(18),
    },
    calendarDayCellEmpty: {
      width: moderateScale(36),
      height: moderateScale(36),
    },
    calendarDayCellSelected: {
      backgroundColor: CustomColors.appThemeColor,
    },
    calendarDayCellToday: {
      borderWidth: 1,
      borderColor: CustomColors.appThemeColor,
    },
    calendarDayText: {
      fontSize: moderateScale(13),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
    },
    calendarDayTextSelected: {
      color: CustomColors.white,
      fontWeight: 'bold',
      fontFamily: Fonts.bold,
    },
    calendarDayTextDisabled: {
      color: CustomColors.textLightGray,
    },
    calendarTodayButton: {
      marginTop: verticalScale(10),
      paddingVertical: verticalScale(8),
      alignItems: 'center',
      backgroundColor: CustomColors.appThemeColor + '15',
      borderRadius: moderateScale(8),
    },
    calendarTodayButtonText: {
      color: CustomColors.appThemeColor,
      fontWeight: '600',
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(13),
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* On Behalf Banner (Matching Angular) */}
        {isonbehalf && (
          <View style={styles.onBehalfBanner}>
            <Text allowFontScaling={false} style={styles.onBehalfText}>
              On Behalf Employee - {onbehalf_empName}
            </Text>
          </View>
        )}

        {/* Tour Details Card (Matching Angular) */}
        <View style={styles.tourCard}>
          <View style={styles.tourCardHeader}>
            <MaterialIcons
              name="card-travel"
              size={moderateScale(22)}
              color={CustomColors.appThemeColor}
            />
            <Text allowFontScaling={false} style={styles.tourCardTitle}>
              Tour Details
            </Text>
          </View>

          <View style={styles.tourGrid}>
            <View style={styles.tourGridItem}>
              <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                Tour No
              </Text>
              <Text allowFontScaling={false} style={styles.tourFieldValue}>
                {travelNo}
              </Text>
            </View>

            <View style={styles.tourGridItem}>
              <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                Employee Name
              </Text>
              <Text allowFontScaling={false} style={styles.tourFieldValue}>
                {employeeName}
              </Text>
            </View>

            <View style={styles.tourGridItem}>
              <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                Designation
              </Text>
              <Text allowFontScaling={false} style={styles.tourFieldValue}>
                {designation}
              </Text>
            </View>

            <View style={styles.tourGridItem}>
              <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                Employee Grade
              </Text>
              <Text allowFontScaling={false} style={styles.tourFieldValue}>
                {employeeGrade}
              </Text>
            </View>
          </View>
        </View>

        {/* Expense Item Details Section Heading with Add Button on the Side */}
        <View style={styles.sectionHeaderRow}>
          <Text allowFontScaling={false} style={styles.sectionHeading}>
            Expense Item Details
          </Text>
          {isMakerAction && (
            <TouchableOpacity
              style={[
                styles.addButton,
                addIncidentalButtonDisabled && styles.addButtonDisabled,
              ]}
              onPress={handleAddExpenseItem}
              disabled={addIncidentalButtonDisabled}
            >
              <MaterialIcons name="add" size={moderateScale(18)} color={CustomColors.white} />
              <Text allowFontScaling={false} style={styles.addButtonText}>
                Add
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Collapsible Expense Item Details Cards */}
        {items.map((item, index) => {
          const isExpanded = expandedItems[item.id] ?? true;
          const isItemEditable = isMakerAction;

          const onwardReturnLabel =
            yesNoOptions.find((o) => o.value === String(item.onwardReturnSameDay))?.label ||
            (item.onwardReturnSameDay === '1' ? 'Yes' : item.onwardReturnSameDay === '0' ? 'No' : item.onwardReturnSameDay);

          const modeLabel =
            modeOfTravelOptions.find(
              (o) =>
                String(o.value).toLowerCase() === String(item.modeOfTravel).toLowerCase() ||
                String(o.name).toLowerCase() === String(item.modeOfTravel).toLowerCase() ||
                String(o.id) === String(item.modeOfTravel)
            )?.label ||
            item.modeOfTravel;

          // In Angular: disabled if vendorgstno !== '' || applevel == 1
          const isVendorDetailsDisabled = Boolean(item.vendorGstNo) || !isItemEditable;
          const isApprovedAmountEditable = applevel === 2 && claimStatusId <= 2;

          return (
            <View key={`card-${item.id}-${index}`} style={styles.itemCard}>
              <TouchableOpacity
                onPress={() => toggleExpand(item.id)}
                style={styles.cardHeader}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.sNoBadge}>
                    <Text allowFontScaling={false} style={styles.sNoText}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text allowFontScaling={false} style={styles.cardTitle}>
                    {modeLabel || 'New Item'} {item.invoiceDate ? `(${item.invoiceDate})` : ''}
                  </Text>
                </View>
                <View style={styles.cardHeaderActions}>
                  {isMakerAction && (
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item.id)}
                      style={{ padding: moderateScale(4), marginRight: horizontalScale(8) }}
                    >
                      <MaterialIcons
                        name="delete"
                        size={moderateScale(22)}
                        color={CustomColors.dangerRed || '#E53935'}
                      />
                    </TouchableOpacity>
                  )}
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={moderateScale(26)}
                    color={CustomColors.appThemeColor}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.cardDetails}>
                  {/* Mode of Travel */}
                  <EditableRow
                    label="Mode of Travel"
                    value={modeLabel}
                    isPicker
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    onPressPicker={() => {
                      setActivePickerItemId(item.id);
                      setActivePickerField('modeOfTravel');
                      setPickerModalVisible(true);
                    }}
                    placeholder="Select Mode"
                    isRequired
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Onward and Return journey on same Day */}
                  <EditableRow
                    label="Onward and Return journey on same Day"
                    value={onwardReturnLabel}
                    isPicker
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    onPressPicker={() => {
                      setActivePickerItemId(item.id);
                      setActivePickerField('onwardReturnSameDay');
                      setPickerModalVisible(true);
                    }}
                    placeholder="Select Yes/No"
                    isRequired
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Travel Time in Hours */}
                  <EditableRow
                    label="Travel Time in Hours"
                    value={item.travelTimeHours}
                    onChangeText={(text) => updateNumericItemField(text, 'travelTimeHours', item.id)}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    keyboardType="numeric"
                    placeholder="Enter Time in Hours"
                    suffixText="Hrs"
                    isRequired
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Single Fare in Rs (₹) */}
                  <EditableRow
                    label="Single Fare in Rs (₹)"
                    value={item.singleFare}
                    onChangeText={(text) => updateNumericItemField(text, 'singleFare', item.id)}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    keyboardType="numeric"
                    placeholder="Enter fare in Rs (₹)"
                    prefixText="₹"
                    isRequired
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Incidental Expense (Input Field) */}
                  <EditableRow
                    label="Incidental Expense"
                    value={item.incidentalAmount}
                    onChangeText={(text) => updateNumericItemField(text, 'incidentalAmount', item.id)}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    keyboardType="numeric"
                    placeholder="0.00"
                    prefixText="₹"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Bank GST No (Input Field with Copy Button) */}
                  <EditableRow
                    label="Bank GST No"
                    value={item.bankGst || bankGst || '33AAACT3373J1ZD'}
                    onChangeText={(text) => updateItemField(item.id, 'bankGst', text.toUpperCase().slice(0, 15))}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    placeholder="Bank GST No"
                    CustomColors={CustomColors}
                    styles={styles}
                    rightAccessory={
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => handleCopyBankGst(item.bankGst || bankGst || '33AAACT3373J1ZD')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="content-copy" size={moderateScale(15)} color={CustomColors.white} />
                        <Text allowFontScaling={false} style={styles.copyBtnText}>Copy</Text>
                      </TouchableOpacity>
                    }
                  />

                  {/* Supplier GST No with Validate Button */}
                  <View style={styles.detailItemContainer}>
                    <View style={styles.labelRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>
                        Supplier GST No
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={[
                          styles.inputBox,
                          !isItemEditable ? styles.disabledInputBox : styles.editableInputBox,
                          { flex: 1 },
                        ]}
                      >
                        <TextInput
                          allowFontScaling={false}
                          style={[
                            styles.editableTextInput,
                            !isItemEditable && styles.disabledValueText,
                          ]}
                          value={item.vendorGstNo || ''}
                          onChangeText={(text) => {
                            updateItemField(
                              item.id,
                              'vendorGstNo',
                              text.toUpperCase().replace(/[^0-9A-Z]/g, '')
                            );
                          }}
                          onBlur={() => {
                            setItems((prev) =>
                              prev.map((it) =>
                                it.id === item.id ? { ...it, ...calculateGst(it) } : it
                              )
                            );
                          }}
                          placeholder="Enter Supplier GST No"
                          placeholderTextColor={CustomColors.textLightGray || '#94A3B8'}
                          editable={isItemEditable}
                          maxLength={15}
                        />
                      </View>
                      {isItemEditable && (
                        <TouchableOpacity
                          style={[
                            styles.validateBtn,
                            validatingItemId === item.id && styles.validateBtnDisabled,
                          ]}
                          onPress={() => handleValidateVendorGst(item.id)}
                          disabled={validatingItemId === item.id}
                          activeOpacity={0.7}
                        >
                          {validatingItemId === item.id ? (
                            <ActivityIndicator size="small" color={CustomColors.white} />
                          ) : (
                            <Text allowFontScaling={false} style={styles.validateBtnText}>
                              Validate
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {item.isGstValidated && (
                      <View style={styles.validatedBadge}>
                        <MaterialIcons
                          name="check-circle"
                          size={moderateScale(14)}
                          color="#2E7D32"
                        />
                        <Text allowFontScaling={false} style={styles.validatedBadgeText}>
                          GST Validated
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Vendor Name (Disabled if Supplier GST entered, editable if empty) */}
                  <EditableRow
                    label="Vendor Name"
                    value={item.vendorName}
                    onChangeText={(text) => updateItemField(item.id, 'vendorName', text)}
                    isEditing={!isVendorDetailsDisabled}
                    isDisabled={isVendorDetailsDisabled}
                    placeholder="Vendor Name"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Vendor Code (Disabled if Supplier GST entered, editable if empty) */}
                  <EditableRow
                    label="Vendor Code"
                    value={item.vendorCode}
                    onChangeText={(text) => updateItemField(item.id, 'vendorCode', text)}
                    isEditing={!isVendorDetailsDisabled}
                    isDisabled={isVendorDetailsDisabled}
                    placeholder="Vendor Code"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Address (Disabled if Supplier GST entered, editable if empty) */}
                  <EditableRow
                    label="Address"
                    value={item.address}
                    onChangeText={(text) => updateItemField(item.id, 'address', text)}
                    isEditing={!isVendorDetailsDisabled}
                    isDisabled={isVendorDetailsDisabled}
                    multiline
                    placeholder="Address"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* HSN Code */}
                  <EditableRow
                    label="HSN Code"
                    value={item.hsnCode}
                    isPicker
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    onPressPicker={() => openHsnModal(item.id)}
                    placeholder="Select HSN"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Taxable Amount */}
                  <EditableRow
                    label="Taxable Amount"
                    value={item.taxableAmount}
                    onChangeText={(text) => updateNumericItemField(text, 'taxableAmount', item.id)}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    keyboardType="numeric"
                    placeholder="0.00"
                    prefixText="₹"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* CGST */}
                  <EditableRow
                    label={`CGST${item.cgstRate ? ` (${item.cgstRate}%)` : ''}`}
                    value={item.cgst}
                    onChangeText={(text) => updateNumericItemField(text, 'cgst', item.id)}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    keyboardType="numeric"
                    placeholder="0.00"
                    prefixText="₹"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* SGST */}
                  <EditableRow
                    label={`SGST${item.sgstRate ? ` (${item.sgstRate}%)` : ''}`}
                    value={item.sgst}
                    onChangeText={(text) => updateNumericItemField(text, 'sgst', item.id)}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    keyboardType="numeric"
                    placeholder="0.00"
                    prefixText="₹"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* IGST */}
                  <EditableRow
                    label={`IGST${item.igstRate ? ` (${item.igstRate}%)` : ''}`}
                    value={item.igst}
                    onChangeText={(text) => updateNumericItemField(text, 'igst', item.id)}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    keyboardType="numeric"
                    placeholder="0.00"
                    prefixText="₹"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Invoice Amount */}
                  <EditableRow
                    label="Invoice Amount"
                    value={item.invoiceAmount}
                    onChangeText={(text) => updateNumericItemField(text, 'invoiceAmount', item.id)}
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    keyboardType="numeric"
                    placeholder="0.00"
                    prefixText="₹"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Approved Amount (for Approver) */}
                  {isApprovedAmt && (
                    <EditableRow
                      label="Approved Amount"
                      value={item.amount}
                      onChangeText={(text) => updateNumericItemField(text, 'amount', item.id)}
                      isEditing={isApprovedAmountEditable}
                      isDisabled={!isApprovedAmountEditable}
                      keyboardType="numeric"
                      placeholder="Approved Amount"
                      isRequired
                      prefixText="₹"
                      CustomColors={CustomColors}
                      styles={styles}
                    />
                  )}

                  {/* Invoice Date */}
                  <EditableRow
                    label="Invoice Date"
                    value={item.invoiceDate}
                    isDatePicker
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    onPressDatePicker={() => handleDatePickerPress(item.id, item.invoiceDate)}
                    placeholder="DD-MMM-YYYY"
                    CustomColors={CustomColors}
                    styles={styles}
                  />

                  {/* Invoice No */}
                  <EditableRow
                    label="Invoice No"
                    value={item.invoiceNo}
                    onChangeText={(text) =>
                      updateItemField(item.id, 'invoiceNo', text.replace(/[^a-zA-Z0-9]/g, ''))
                    }
                    isEditing={isItemEditable}
                    isDisabled={!isItemEditable}
                    placeholder="Invoice No"
                    CustomColors={CustomColors}
                    styles={styles}
                  />
                </View>
              )}
            </View>
          );
        })}

        {items.length === 0 && (
          <Text allowFontScaling={false} style={styles.noDataText}>
            No incidental expense items added yet. Click "+ Add" to add an item.
          </Text>
        )}
      </ScrollView>

      {/* Bottom Fixed Action Bar */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity style={[styles.bottomButton, styles.backButton]} onPress={handleGoBack}>
          <Text allowFontScaling={false} style={styles.bottomButtonText}>Back</Text>
        </TouchableOpacity>

        {isApproveButton && (
          <TouchableOpacity
            style={[styles.bottomButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={isApprovingIncidental}
          >
            <Text allowFontScaling={false} style={styles.bottomButtonText}>
              {isApprovingIncidental ? 'Approving...' : 'Approve'}
            </Text>
          </TouchableOpacity>
        )}

        {isSubmitButton && (
          <TouchableOpacity
            style={[
              styles.bottomButton,
              styles.submitButton,
              {
                backgroundColor:
                  items.length > 0 && isEditable && !isCreatingIncidental
                    ? CustomColors.appThemeColor
                    : CustomColors.mediumGray || '#BDBDBD',
              },
            ]}
            onPress={handleSubmit}
            disabled={items.length === 0 || !isEditable || isCreatingIncidental}
          >
            <Text allowFontScaling={false} style={styles.bottomButtonText}>
              {isCreatingIncidental ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown ActionSheet Picker */}
      {activePickerItemId && (
        <CustomActionSheetPicker
          pickerStatus={pickerModalVisible}
          setPickerStatus={(status) => setPickerModalVisible(status)}
          title={
            activePickerField === 'modeOfTravel'
              ? 'Select Mode of Travel'
              : 'Select Yes/No'
          }
          optionsData={currentPickerOptions}
          RenderItem={DropdownItem}
          onPress={(value) => {
            handlePickerSelect(value);
            setPickerModalVisible(false);
          }}
          selected={currentActiveItem[activePickerField]}
        />
      )}

      {/* HSN Search Modal */}
      <Modal
        visible={hsnModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHsnModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.hsnModalContainer}>
            <View style={styles.hsnModalHeader}>
              <Text allowFontScaling={false} style={styles.hsnModalTitle}>Select HSN Code</Text>
              <TouchableOpacity onPress={() => setHsnModalVisible(false)}>
                <MaterialIcons name="close" size={moderateScale(24)} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>
            <TextInput
              allowFontScaling={false}
              style={styles.hsnSearchInput}
              value={hsnSearchText}
              onChangeText={onHsnSearchChange}
              placeholder="Search HSN code or description"
              placeholderTextColor={CustomColors.textLightGray}
            />
            {isSearchingHsn && hsnResults.length === 0 ? (
              <ActivityIndicator
                size="small"
                color={CustomColors.appThemeColor}
                style={{ marginTop: verticalScale(20) }}
              />
            ) : (
              <FlatList
                data={hsnResults}
                keyExtractor={(hsnItem, idx) => `hsn-${hsnItem.id || hsnItem.code || 'item'}-${idx}`}
                onEndReachedThreshold={0.4}
                onEndReached={handleHsnLoadMore}
                renderItem={({ item: hsnItem }) => (
                  <TouchableOpacity
                    style={styles.hsnRow}
                    onPress={() => handleHsnSelect(hsnItem)}
                  >
                    <Text allowFontScaling={false} style={styles.hsnRowCode}>
                      {hsnItem.code} {hsnItem.description ? `- ${hsnItem.description}` : ''}
                    </Text>
                    <Text allowFontScaling={false} style={styles.hsnRowSub}>
                      CGST {hsnItem.cgstrate || (hsnItem.igstrate ? hsnItem.igstrate / 2 : 0)}% · SGST {hsnItem.sgstrate || (hsnItem.igstrate ? hsnItem.igstrate / 2 : 0)}% · IGST {hsnItem.igstrate || 0}%
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text allowFontScaling={false} style={styles.noDataText}>No HSN codes found.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Calendar Date Picker */}
      <CustomCalendarPicker
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        initialDate={dateModalInitialDate}
        onSelectDate={handleCalendarSelectDate}
        maximumDate={new Date()}
        CustomColors={CustomColors}
        styles={styles}
      />
    </KeyboardAvoidingView>
  );
};

export default IncidentalExpenseScreen;