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
import DateTimePicker from '@react-native-community/datetimepicker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  useLazyGetTourGradeDetailsQuery,
  useLazyGetPackingSummaryQuery,
  usePackingCreateMutation,
  useDeletePackingMutation,
  usePackingEligibleAmtMutation,
  usePackingApproveMutation,
  useGetPackingTwoWheelerDropdownQuery,
  useGetDecisionDropdownQuery,
  useLazyValidateSupplierGstQuery,
  useLazySearchHsnQuery,
} from '../../redux/rtk_query/apiSlice';
import * as styless from '../../styles/StyleSheet';

// ---------------------------------------------------------------------------
// Date Helpers
// ---------------------------------------------------------------------------
const formatDateToDDMMYYYY = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${monthNames[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
};

const parseDDMMYYYYToDate = (dateString) => {
  if (!dateString) return new Date();
  const parts = String(dateString).split('-');
  if (parts.length !== 3) {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const day = parseInt(parts[0], 10);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = monthNames.findIndex((m) => m.toLowerCase() === parts[1].toLowerCase());
  const year = parseInt(parts[2], 10);
  if (monthIndex === -1 || isNaN(day) || isNaN(year)) return new Date();
  const date = new Date(year, monthIndex, day);
  return isNaN(date.getTime()) ? new Date() : date;
};

const formatDateToYYYYMMDD = (dateInput) => {
  if (!dateInput) return null;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = typeof dateInput === 'string' ? parseDDMMYYYYToDate(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

let tempIdCounter = 0;
const generateTempId = () => `temp-${Date.now()}-${tempIdCounter++}`;

const YES_NO_OPTIONS = [
  { label: 'Yes', value: '1', name: 'Yes' },
  { label: 'No', value: '0', name: 'No' },
];

const DEFAULT_BANK_GST = '33AAACK2845K1ZT';
const DEFAULT_VENDOR_GST = '33AAACT3373J1ZD';
const SUPPLIER_GST_VALIDATE_API = 'https://kvbapi.vsolv.co.in/venserv/validate';

const emptyPackingItem = (defaultBankGst = DEFAULT_BANK_GST, maxEligibleTonnage = '') => ({
  id: generateTempId(),
  twoWheelerTransport: '0',
  householdGoodsTransport: '0',
  transportOfTwoWheelerBy: '',
  totalDistanceKm: '',
  distanceHillyTerrain: '',
  tonnageHouseholdGoods: '',
  maxEligibleTonnage: maxEligibleTonnage ? String(maxEligibleTonnage) : '',
  billedAmountHouseholdGoods: '',
  eligibleTransportationAmount: '',
  transportChargesForVehicle: '',
  vehicleTransportByDriver: '0',
  travelTimeHours: '',
  noDaysDriverEngaged: '',
  driverBattas: '',
  octroiCharges: '',
  breakageCharges: '',
  receiptForLosses: '0',
  eligibleBreakageLumpsum: '',
  eligibleAmount: '',
  transferOnPromotion: '0',
  basicSalary: '',
  dependentTraveling: '0',
  dependenciesRelation: [],
  claimAmount: '',
  invoiceDate: '',
  invoiceNo: '',
  bankGstNo: defaultBankGst || DEFAULT_BANK_GST,
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
  approvedAmount: '',
  isGstValidated: false,
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
// Main PackagingFreight Component
// ---------------------------------------------------------------------------
const PackagingFreight = ({ route }) => {
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

  const authUser = useSelector((state) => state.auth?.user || state.auth?.userData || state.auth);

  const tourReqNo =
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
    claimdata?.data?.[0]?.tour_no ||
    claimdata?.data?.[0]?.tourno ||
    (tourId ? String(tourId) : '');

  const [bankGst, setBankGst] = useState(
    claimdata?.branch_gst ||
    expenseFromRoute?.branch_gst ||
    claimdata?.bankgstno ||
    claimdata?.bank_gst ||
    DEFAULT_BANK_GST
  );

  const [items, setItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isEditable = from !== 'Checker';

  const initialEmpCode =
    claimdata?.maker_data?.code ||
    claimdata?.employee_code ||
    claimdata?.empcode ||
    expenseFromRoute?.employee_code ||
    expenseFromRoute?.empcode ||
    authUser?.code ||
    authUser?.employee_code ||
    '';

  const initialEmpName =
    claimdata?.maker_data?.full_name ||
    claimdata?.employee_name ||
    claimdata?.empname ||
    expenseFromRoute?.employee_name ||
    expenseFromRoute?.empname ||
    authUser?.name ||
    authUser?.employee_name ||
    '';

  const initialDesignation =
    claimdata?.maker_data?.designation ||
    claimdata?.designation ||
    claimdata?.empdesignation ||
    expenseFromRoute?.designation ||
    expenseFromRoute?.empdesignation ||
    authUser?.designation ||
    '';

  const initialGrade =
    claimdata?.maker_data?.grade ||
    claimdata?.employee_grade ||
    claimdata?.empgrade ||
    claimdata?.emp_grade ||
    expenseFromRoute?.employee_grade ||
    expenseFromRoute?.empgrade ||
    authUser?.grade ||
    '';

  // Tour Meta Info (Non-editable Card State)
  const [tourDetails, setTourDetails] = useState({
    employeeCode: initialEmpCode,
    employeeName: initialEmpName,
    designation: initialDesignation,
    employeeGrade: initialGrade,
    requestNo: tourReqNo,
    maxTonnage: '3000',
  });

  // Dropdown options
  const [twoWheelerByOptions, setTwoWheelerByOptions] = useState([
    { label: 'Train', value: 'Train', name: 'Train' },
    { label: 'Lorry', value: 'Lorry', name: 'Lorry' },
    { label: 'Drive', value: 'Drive', name: 'Drive' },
  ]);
  const [yesNoOptions] = useState(YES_NO_OPTIONS);

  // Picker modal state
  const [activePickerField, setActivePickerField] = useState(null);
  const [activePickerItemId, setActivePickerItemId] = useState(null);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // HSN search modal state
  const [hsnModalVisible, setHsnModalVisible] = useState(false);
  const [hsnActiveItemId, setHsnActiveItemId] = useState(null);
  const [hsnSearchText, setHsnSearchText] = useState('');
  const [hsnResults, setHsnResults] = useState([]);
  const [hsnPage, setHsnPage] = useState(1);
  const [hsnHasNext, setHsnHasNext] = useState(false);
  const hsnDebounceRef = useRef(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date().toISOString());
  const [dateActiveItemId, setDateActiveItemId] = useState(null);

  // RTK Query Hooks
  const [triggerTourGradeDetails] = useLazyGetTourGradeDetailsQuery();
  const [triggerPackingSummary] = useLazyGetPackingSummaryQuery();
  const [triggerPackingCreate, { isLoading: isSubmitting }] = usePackingCreateMutation();
  const [triggerDeletePacking] = useDeletePackingMutation();
  const [triggerPackingEligibleAmt, { isLoading: isCalculatingEligible }] = usePackingEligibleAmtMutation();
  const [triggerPackingApprove, { isLoading: isApproving }] = usePackingApproveMutation();
  const [triggerValidateSupplierGst] = useLazyValidateSupplierGstQuery();
  const [triggerSearchHsn, { isFetching: isSearchingHsn }] = useLazySearchHsnQuery();
  const { data: rawTwoWheelerData } = useGetPackingTwoWheelerDropdownQuery();

  const [validatingItemId, setValidatingItemId] = useState(null);
  const [isLoadingScreen, setIsLoadingScreen] = useState(true);

  // Set Navigation Header (Theme color with white text)
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
          eClaim Packaging Freight Expense
        </Text>
      ),
    });
  }, [navigation, CustomColors, globalStyles]);

  // Sync two-wheeler dropdown options from API if returned
  useEffect(() => {
    if (rawTwoWheelerData) {
      const list = Array.isArray(rawTwoWheelerData) ? rawTwoWheelerData : rawTwoWheelerData?.data || [];
      if (list.length > 0) {
        setTwoWheelerByOptions(
          list.map((o) => ({
            label: o.name || o.label || String(o.value || ''),
            value: o.value || o.name || String(o.id || ''),
            name: o.name || o.label || '',
            id: o.id,
          }))
        );
      }
    }
  }, [rawTwoWheelerData]);

  // Check if Tour Reason permits Packaging & Freight
  useEffect(() => {
    const tourReason = String(
      claimdata?.reason ||
      claimdata?.tour_reason ||
      expenseFromRoute?.reason ||
      expenseFromRoute?.tour_reason ||
      ''
    );
    if (tourReason.toLowerCase().includes('local deputation') || tourReason.toLowerCase().includes('deputation')) {
      Alert.alert(
        'Expense Not Allowed',
        'ONLY LOCAL DEPUTATION EXPENSE IS ALLOWED FOR THIS TOUR REASON.\n\nPackaging & Freight cannot be submitted for this tour. Please claim Local Deputation Allowance instead.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    }
  }, [claimdata, expenseFromRoute, navigation]);

  // ---------------------------------------------------------------------------
  // Load Dropdowns, Grade Details & Existing Tour Packing Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoadingScreen(true);

        let maxTon = '3000';
        let branchGst = bankGst || DEFAULT_BANK_GST;

        // 1. Fetch Tour Grade & Details: GET /taserv/tourno_grade_get/:tourId
        if (tourId) {
          try {
            const gradeRes = await triggerTourGradeDetails(tourId).unwrap();
            if (gradeRes && isMounted) {
              maxTon = String(gradeRes.maxtonnage || gradeRes.tonnagefamily || '3000');
              if (gradeRes.branch_gst) {
                branchGst = gradeRes.branch_gst;
                setBankGst(gradeRes.branch_gst);
              }
              setTourDetails((prev) => ({
                ...prev,
                employeeCode: gradeRes.employee_code || prev.employeeCode,
                employeeName: gradeRes.employee_name || prev.employeeName,
                designation: gradeRes.gradelevel || gradeRes.designation || prev.designation,
                employeeGrade: gradeRes.employee_grade || gradeRes.empgrade || prev.employeeGrade,
                requestNo: gradeRes.request_no || prev.requestNo,
                maxTonnage: maxTon,
              }));
            }
          } catch (err) {
            console.log('Error fetching tour grade details:', err);
          }

          // 2. Fetch Existing Packing Moving data: GET /taserv/packingmvg/tour/:tourId
          try {
            const packingRes = await triggerPackingSummary({ tourId }).unwrap();
            const fetchedBranchGst = packingRes?.branch_gst || branchGst || bankGst || DEFAULT_BANK_GST;
            branchGst = fetchedBranchGst;
            setBankGst(fetchedBranchGst);
            const fetchedList = packingRes?.data || [];

            if (fetchedList.length > 0 && isMounted) {
              const mapped = fetchedList.map((item) => {
                const twVal = typeof item.twowheelertrans === 'object' && item.twowheelertrans !== null
                  ? String(item.twowheelertrans.value ?? '0')
                  : String(item.twowheelertrans ?? item.twowheelertransport ?? '0');

                const hhVal = typeof item.hhgoodstrans === 'object' && item.hhgoodstrans !== null
                  ? String(item.hhgoodstrans.value ?? '0')
                  : String(item.hhgoodstrans ?? item.householdgoodstransport ?? '0');

                const transTwoBy = typeof item.transtwowheelerby === 'object' && item.transtwowheelerby !== null
                  ? String(item.transtwowheelerby.value ?? '')
                  : String(item.transtwowheelerby ?? item.transportoftwowheelerby ?? '');

                const vehDriver = typeof item.vehicletransbydriver === 'object' && item.vehicletransbydriver !== null
                  ? String(item.vehicletransbydriver.value ?? '0')
                  : String(item.vehicletransbydriver ?? item.vehicletransportbydriver ?? '0');

                const receiptLoss = typeof item.receipt_loss === 'object' && item.receipt_loss !== null
                  ? String(item.receipt_loss.value ?? '0')
                  : String(item.receipt_loss ?? item.receiptforlosses ?? '0');

                const transferPromo = typeof item.transfer_on_promotion === 'object' && item.transfer_on_promotion !== null
                  ? String(item.transfer_on_promotion.set_value ?? item.transfer_on_promotion.value ?? '0')
                  : String(item.transfer_on_promotion ?? item.transferonpromotion ?? '0');

                const depVal = item.dependent === true || item.dependent === '1' || item.dependent === 1 || item.dependenttraveling === '1' ? '1' : '0';

                return {
                  id: item.id,
                  twoWheelerTransport: twVal,
                  householdGoodsTransport: hhVal,
                  transportOfTwoWheelerBy: transTwoBy,
                  totalDistanceKm: String(item.totaldisttrans ?? item.totaldistancekm ?? ''),
                  distanceHillyTerrain: String(item.distinhilly ?? item.distancehillyterrain ?? ''),
                  tonnageHouseholdGoods: String(item.tonnagehhgood ?? item.tonnagehouseholdgoods ?? ''),
                  maxEligibleTonnage: String(item.maxeligibletonnage ?? item.maxeligton ?? maxTon),
                  billedAmountHouseholdGoods: String(item.billedamthhgoodstrans ?? item.billedamounthouseholdgoods ?? ''),
                  eligibleTransportationAmount: String(item.eligtransamt ?? item.eligibletransportationamount ?? ''),
                  transportChargesForVehicle: String(item.transchargesvehicle ?? item.transportchargesforvehicle ?? ''),
                  vehicleTransportByDriver: vehDriver,
                  travelTimeHours: String(item.traveltime ?? item.traveltimehours ?? ''),
                  noDaysDriverEngaged: String(item.daysdrivereng ?? item.nodaysdriverengaged ?? ''),
                  driverBattas: String(item.driverbatta ?? item.driverbattas ?? ''),
                  octroiCharges: String(item.octroivehicle ?? item.octroicharges ?? ''),
                  breakageCharges: String(item.breakagecharges ?? ''),
                  receiptForLosses: receiptLoss,
                  eligibleBreakageLumpsum: String(item.eligbreakagecharge ?? item.eligiblebreakagelumpsum ?? ''),
                  eligibleAmount: String(item.eligibleamount ?? ''),
                  transferOnPromotion: transferPromo,
                  basicSalary: String(item.basic_salary ?? item.basicsalary ?? ''),
                  dependentTraveling: depVal,
                  dependenciesRelation: Array.isArray(item.dependencies_relation) ? item.dependencies_relation : [],
                  claimAmount: String(item.claimedamount ?? item.claimamount ?? ''),
                  invoiceDate: item.invoice_date || item.invoicedate || '',
                  invoiceNo: item.invoice_no || item.invoiceno || '',
                  bankGstNo: item.bankgstno || branchGst || bankGst || DEFAULT_BANK_GST,
                  vendorGstNo: item.vendorgstno || '',
                  vendorName: item.vendorname || '',
                  vendorCode: item.vendorcode || '',
                  address: item.address || '',
                  hsnCode: typeof item.hsncode === 'object' && item.hsncode !== null ? item.hsncode.code || '' : String(item.hsncode || ''),
                  hsnId: item.hsnid ?? null,
                  cgstRate: Number(item.cgstp ?? item.cgstrate ?? 0),
                  sgstRate: Number(item.sgstp ?? item.sgstrate ?? 0),
                  igstRate: Number(item.igstp ?? item.igstrate ?? 0),
                  taxableAmount: String(item.taxable_amount ?? item.taxableamount ?? ''),
                  cgst: String(item.cgst ?? ''),
                  sgst: String(item.sgst ?? ''),
                  igst: String(item.igst ?? ''),
                  invoiceAmount: String(item.invoice_amount ?? item.invoiceamount ?? ''),
                  approvedAmount: String(item.approvedamount ?? ''),
                  isGstValidated: Boolean(item.vendorgstno),
                };
              });

              setItems(mapped);
              const initExp = {};
              mapped.forEach((it) => { initExp[it.id] = true; });
              setExpandedItems(initExp);
            } else if (isMounted) {
              const fresh = emptyPackingItem(branchGst || bankGst || DEFAULT_BANK_GST, maxTon);
              setItems([fresh]);
              setExpandedItems({ [fresh.id]: true });
            }
          } catch (packErr) {
            console.log('Error fetching packing summary:', packErr);
            if (isMounted) {
              const fresh = emptyPackingItem(branchGst || bankGst || DEFAULT_BANK_GST, maxTon);
              setItems([fresh]);
              setExpandedItems({ [fresh.id]: true });
            }
          }
        }
      } catch (e) {
        ToastMessage('Failed to initialize packing data');
      } finally {
        if (isMounted) setIsLoadingScreen(false);
      }
    })();

    return () => { isMounted = false; };
  }, [tourId, triggerTourGradeDetails, triggerPackingSummary]);

  // ---------------------------------------------------------------------------
  // GST Recalculation Handler (intra-state vs inter-state)
  // ---------------------------------------------------------------------------
  const calculateGst = useCallback((item) => {
    const taxable = parseFloat(item.taxableAmount) || 0;
    if (taxable <= 0) {
      return { cgst: '', sgst: '', igst: '', invoiceAmount: '' };
    }

    const bankGst = String(item.bankGstNo || '').trim();
    const vendorGst = String(item.vendorGstNo || '').trim();

    if (bankGst.length >= 2 && vendorGst.length >= 2) {
      const bankState = bankGst.slice(0, 2);
      const vendorState = vendorGst.slice(0, 2);

      if (bankState === vendorState) {
        // Intra-state: CGST + SGST (half of IGST rate each)
        const halfRate = (item.igstRate > 0 ? item.igstRate : (item.cgstRate + item.sgstRate)) / 2;
        const c = round2((taxable * halfRate) / 100);
        const s = round2((taxable * halfRate) / 100);
        const inv = round2(taxable + c + s);
        return {
          cgst: String(c),
          sgst: String(s),
          igst: '0',
          cgstRate: halfRate,
          sgstRate: halfRate,
          igstRate: 0,
          invoiceAmount: String(inv),
        };
      } else {
        // Inter-state: IGST
        const rate = item.igstRate > 0 ? item.igstRate : (item.cgstRate + item.sgstRate);
        const i = round2((taxable * rate) / 100);
        const inv = round2(taxable + i);
        return {
          cgst: '0',
          sgst: '0',
          igst: String(i),
          cgstRate: 0,
          sgstRate: 0,
          igstRate: rate,
          invoiceAmount: String(inv),
        };
      }
    }

    // Fallback: use individual rates if available
    const c = item.cgstRate > 0 ? round2((taxable * item.cgstRate) / 100) : (parseFloat(item.cgst) || 0);
    const s = item.sgstRate > 0 ? round2((taxable * item.sgstRate) / 100) : (parseFloat(item.sgst) || 0);
    const i = item.igstRate > 0 ? round2((taxable * item.igstRate) / 100) : (parseFloat(item.igst) || 0);
    const inv = round2(taxable + c + s + i);
    return {
      cgst: c > 0 ? String(c) : item.cgst,
      sgst: s > 0 ? String(s) : item.sgst,
      igst: i > 0 ? String(i) : item.igst,
      invoiceAmount: String(inv),
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Update Item Field Handler
  // ---------------------------------------------------------------------------
  const updateItemField = useCallback((itemId, field, value) => {
    setHasUnsavedChanges(true);
    setItems((prev) =>
      prev.map((it) => {
        if (String(it.id) !== String(itemId)) return it;
        let updated = { ...it, [field]: value };

        // Reset GST validation if vendor GST changed
        if (field === 'vendorGstNo') {
          updated.isGstValidated = false;
          if (!value) {
            updated.vendorName = '';
            updated.vendorCode = '';
            updated.address = '';
          }
        }

        // Auto-recalculate GST & Invoice Amount
        if (field === 'taxableAmount' || field === 'vendorGstNo' || field === 'bankGstNo') {
          const gstResult = calculateGst(updated);
          updated = { ...updated, ...gstResult };
        }

        // If manual CGST/SGST/IGST entered, adjust invoiceAmount
        if (field === 'cgst' || field === 'sgst' || field === 'igst') {
          const tax = parseFloat(updated.taxableAmount) || 0;
          const c = parseFloat(field === 'cgst' ? value : updated.cgst) || 0;
          const s = parseFloat(field === 'sgst' ? value : updated.sgst) || 0;
          const i = parseFloat(field === 'igst' ? value : updated.igst) || 0;
          if (tax > 0 || c > 0 || s > 0 || i > 0) {
            updated.invoiceAmount = String(round2(tax + c + s + i));
          }
        }

        return updated;
      })
    );
  }, [calculateGst]);

  // ---------------------------------------------------------------------------
  // Eligible Amount API Calculation Handler (calc_eligble -> /taserv/packingmvg/logic)
  // ---------------------------------------------------------------------------
  const handleCalculateEligible = useCallback(async (itemId) => {
    const item = items.find((it) => String(it.id) === String(itemId));
    if (!item) return;

    const totalDist = parseFloat(item.totalDistanceKm) || 0;
    const hillyDist = parseFloat(item.distanceHillyTerrain) || 0;
    if (hillyDist > totalDist) {
      ToastMessage(`Distance in Hilly Terrain (${hillyDist} KM) cannot be greater than Total Distance (${totalDist} KM)`);
      return;
    }

    try {
      const payload = {
        totaldisttrans: Number(item.totalDistanceKm || 0),
        twowheelertrans: item.twoWheelerTransport || '0',
        tonnagehhgood: Number(item.tonnageHouseholdGoods || 0),
        receipt_loss: item.receiptForLosses || '0',
        distinhilly: Number(item.distanceHillyTerrain || 0),
        tourgid: Number(tourId),
        traveltime: Number(item.travelTimeHours || 0),
        vehicletransbydriver: item.vehicleTransportByDriver || '0',
        expense_id: 7,
      };

      const res = await triggerPackingEligibleAmt(payload).unwrap();
      if (res) {
        setHasUnsavedChanges(true);
        setItems((prev) =>
          prev.map((it) => {
            if (String(it.id) !== String(itemId)) return it;
            return {
              ...it,
              eligibleTransportationAmount: res.transportation_amount !== undefined ? String(res.transportation_amount) : it.eligibleTransportationAmount,
              eligibleAmount: res.Eligible_amount !== undefined ? String(res.Eligible_amount) : it.eligibleAmount,
              driverBattas: res.driverbatta !== undefined ? String(res.driverbatta) : it.driverBattas,
              noDaysDriverEngaged: res.daysdrivereng !== undefined ? String(res.daysdrivereng) : it.noDaysDriverEngaged,
              eligibleBreakageLumpsum: res.breakagecharge !== undefined ? String(res.breakagecharge) : it.eligibleBreakageLumpsum,
            };
          })
        );
        ToastMessage('Eligible amounts calculated successfully!');
      }
    } catch (err) {
      console.log('Error calculating packing eligible amount:', err);
      ToastMessage(err?.data?.description || 'Could not calculate eligible amounts');
    }
  }, [items, tourId, triggerPackingEligibleAmt]);

  // ---------------------------------------------------------------------------
  // UI Helpers: Toggle Card, Add Row, Delete Row
  // ---------------------------------------------------------------------------
  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAddExpenseItem = useCallback(() => {
    if (!isEditable) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const activeBankGst = items[0]?.bankGstNo || bankGst || DEFAULT_BANK_GST;
    const maxTon = tourDetails.maxTonnage || '3000';
    const newItem = emptyPackingItem(activeBankGst, maxTon);
    setItems((prev) => [...prev, newItem]);
    setExpandedItems((prev) => ({ ...prev, [newItem.id]: true }));
    setHasUnsavedChanges(true);
    ToastMessage('New packing & moving row added.');
  }, [isEditable, items, bankGst, tourDetails.maxTonnage]);

  const handleDeleteItem = useCallback((itemId) => {
    if (!isEditable) return;
    const targetItem = items.find((it) => String(it.id) === String(itemId));

    Alert.alert('Confirm Delete', 'Are you sure you want to delete this row?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (targetItem && !String(targetItem.id).startsWith('temp-')) {
            try {
              const res = await triggerDeletePacking(targetItem.id).unwrap();
              if (res?.code === 'UNEXPECTED_ERROR') {
                ToastMessage(res?.description || 'Could not delete row');
                return;
              }
              ToastMessage('Deleted Successfully....');
            } catch (err) {
              ToastMessage(err?.data?.description || 'Error deleting row');
            }
          }
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setItems((prev) => (prev.length === 1 ? [emptyPackingItem(prev[0]?.bankGstNo, tourDetails.maxTonnage)] : prev.filter((it) => String(it.id) !== String(itemId))));
          setHasUnsavedChanges(true);
        },
      },
    ]);
  }, [isEditable, items, tourDetails.maxTonnage, triggerDeletePacking]);

  // ---------------------------------------------------------------------------
  // HSN Search Handlers
  // ---------------------------------------------------------------------------
  const runHsnSearch = useCallback(async (queryText, page = 1, append = false) => {
    try {
      const res = await triggerSearchHsn({ query: queryText, page }).unwrap();
      const list = res?.data || [];
      setHsnResults((prev) => (append ? [...prev, ...list] : list));
      setHsnHasNext(Boolean(res?.pagination?.has_next));
      setHsnPage(page);
    } catch (e) {
      ToastMessage('Could not fetch HSN codes');
    }
  }, [triggerSearchHsn]);

  const openHsnModal = (itemId) => {
    setHsnActiveItemId(itemId);
    setHsnSearchText('');
    setHsnModalVisible(true);
    runHsnSearch('', 1, false);
  };

  const onHsnSearchChange = (text) => {
    setHsnSearchText(text);
    if (hsnDebounceRef.current) clearTimeout(hsnDebounceRef.current);
    hsnDebounceRef.current = setTimeout(() => runHsnSearch(text, 1, false), 400);
  };

  const handleHsnSelect = (hsnRecord) => {
    if (!hsnActiveItemId) return;
    setHasUnsavedChanges(true);
    setItems((prev) =>
      prev.map((it) => {
        if (String(it.id) !== String(hsnActiveItemId)) return it;
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
        const gstResult = calculateGst(updated);
        return { ...updated, ...gstResult };
      })
    );
    setHsnModalVisible(false);
  };

  // ---------------------------------------------------------------------------
  // Supplier GST Validation (venserv/validate?type=gst&value=...)
  // ---------------------------------------------------------------------------
  const handleValidateVendorGst = useCallback(async (itemId) => {
    const item = items.find((it) => String(it.id) === String(itemId));
    let gstNo = item?.vendorGstNo ? String(item.vendorGstNo).trim().toUpperCase() : '';

    // Auto-fetch default vendor GST if not manually entered
    if (!gstNo) {
      gstNo = DEFAULT_VENDOR_GST;
    }

    setValidatingItemId(itemId);
    try {
      let responseData = null;
      let validationStatus = null;

      try {
        const res = await triggerValidateSupplierGst({ value: gstNo }).unwrap();
        responseData = res;
        validationStatus = res?.validation_status;
      } catch (rtkErr) {
        console.log('RTK GST validate error, trying fallback fetch:', rtkErr);
      }

      // If RTK query failed or returned empty, try direct fetch
      if (!validationStatus) {
        try {
          const url = `${SUPPLIER_GST_VALIDATE_API}?type=gst&value=${encodeURIComponent(
            gstNo
          )}`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          });
          if (response.ok) {
            responseData = await response.json();
            validationStatus = responseData?.validation_status;
          }
        } catch (fetchErr) {
          console.log('Fallback fetch error:', fetchErr);
        }
      }

      if (!validationStatus || validationStatus === false || validationStatus === 'false') {
        setItems((prev) =>
          prev.map((it) =>
            String(it.id) === String(itemId) ? { ...it, vendorName: '', vendorCode: '', address: '', isGstValidated: false } : it
          )
        );
        ToastMessage('Please Enter Valid GST No');
        return;
      }

      const statusObj = typeof validationStatus === 'object' && validationStatus !== null ? validationStatus : responseData;
      const returnedGst = (
        statusObj?.gstin ||
        responseData?.gstin ||
        statusObj?.GSTIN ||
        statusObj?.gst_no ||
        responseData?.gst_no ||
        statusObj?.suppliergstno ||
        gstNo ||
        DEFAULT_VENDOR_GST
      ).toUpperCase();

      let vendorName =
        statusObj?.tradeNam ||
        statusObj?.lgnm ||
        responseData?.tradeNam ||
        responseData?.lgnm ||
        responseData?.name ||
        '';

      let vendorCode =
        statusObj?.ctjCd ||
        statusObj?.vendorcode ||
        statusObj?.vendorCode ||
        statusObj?.code ||
        '';

      const pradr = statusObj?.pradr?.addr || responseData?.pradr?.addr || {};
      const addressParts = [
        pradr.bno,
        pradr.bnm,
        pradr.st,
        pradr.loc,
        pradr.city,
        pradr.dst,
        pradr.stcd,
        pradr.pncd,
      ].filter(Boolean);
      let address = addressParts.join(', ');
      if (!address) {
        if (typeof statusObj?.address === 'string') address = statusObj.address;
        else if (typeof responseData?.address === 'string') address = responseData.address;
      }

      // Safe fallbacks so fields are never left blank
      if (!vendorName && returnedGst === DEFAULT_VENDOR_GST) {
        vendorName = 'VSOLV ENGINEERING PRIVATE LIMITED';
      }
      if (!vendorCode && returnedGst === DEFAULT_VENDOR_GST) {
        vendorCode = 'VM0702';
      }
      if (!address && returnedGst === DEFAULT_VENDOR_GST) {
        address = '5th Floor North Side, Commerz, 16th, International Business Park, Oberoi Garden City, Goregaon East, Mumbai, Maharashtra, 400063';
      }

      const activeBankGst = item?.bankGstNo || bankGst || DEFAULT_BANK_GST;

      setItems((prev) =>
        prev.map((it) => {
          if (String(it.id) !== String(itemId)) return it;
          const updated = {
            ...it,
            bankGstNo: activeBankGst,
            vendorGstNo: returnedGst,
            vendorName,
            vendorCode,
            address,
            isGstValidated: true,
          };
          const gstResult = calculateGst(updated);
          return { ...updated, ...gstResult };
        })
      );

      setHasUnsavedChanges(true);

      Alert.alert(
        'Vendor GST Details',
        `GSTIN: ${returnedGst}\nTrade Name: ${vendorName || 'N/A'}\nVendor Code: ${vendorCode || 'N/A'}\nAddress: ${address || 'N/A'}`,
        [{ text: 'OK' }]
      );

      ToastMessage('Vendor GST & details auto-fetched and populated.');
    } catch (err) {
      console.log('GST validation error:', err);
      setItems((prev) =>
        prev.map((it) =>
          String(it.id) === String(itemId) ? { ...it, vendorName: '', vendorCode: '', address: '', isGstValidated: false } : it
        )
      );
      ToastMessage(err?.data?.description || err?.message || 'Could not validate GST number');
    } finally {
      setValidatingItemId(null);
    }
  }, [items, bankGst, triggerValidateSupplierGst, calculateGst]);

  // ---------------------------------------------------------------------------
  // Copy Bank GST No Handler
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
  // Dependent Members Add / Remove
  // ---------------------------------------------------------------------------
  const handleAddDependent = (itemId) => {
    setHasUnsavedChanges(true);
    setItems((prev) =>
      prev.map((it) => {
        if (String(it.id) !== String(itemId)) return it;
        const currentList = Array.isArray(it.dependenciesRelation) ? it.dependenciesRelation : [];
        return {
          ...it,
          dependenciesRelation: [
            ...currentList,
            { id: generateTempId(), tour_id: Number(tourId), expense_id: 7, name: '', relation: '' },
          ],
        };
      })
    );
  };

  const handleUpdateDependent = (itemId, index, field, text) => {
    setHasUnsavedChanges(true);
    setItems((prev) =>
      prev.map((it) => {
        if (String(it.id) !== String(itemId)) return it;
        const currentList = [...(it.dependenciesRelation || [])];
        if (currentList[index]) {
          currentList[index] = { ...currentList[index], [field]: text };
        }
        return { ...it, dependenciesRelation: currentList };
      })
    );
  };

  const handleRemoveDependent = (itemId, index) => {
    setHasUnsavedChanges(true);
    setItems((prev) =>
      prev.map((it) => {
        if (String(it.id) !== String(itemId)) return it;
        const currentList = [...(it.dependenciesRelation || [])];
        currentList.splice(index, 1);
        return { ...it, dependenciesRelation: currentList };
      })
    );
  };

  // ---------------------------------------------------------------------------
  // Submit Handler (Matching Angular submitForm)
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!tourId || isNaN(Number(tourId)) || Number(tourId) <= 0) {
      Alert.alert(
        'Tour ID Missing',
        'Tour ID not found. Please re-open the expense from the tour screen.'
      );
      ToastMessage('Tour ID not found. Please re-open the expense.');
      return;
    }

    const tourReason = String(
      claimdata?.reason ||
      claimdata?.tour_reason ||
      expenseFromRoute?.reason ||
      expenseFromRoute?.tour_reason ||
      ''
    );
    if (tourReason.toLowerCase().includes('local deputation') || tourReason.toLowerCase().includes('deputation')) {
      Alert.alert(
        'Expense Not Allowed',
        'ONLY LOCAL DEPUTATION EXPENSE IS ALLOWED FOR THIS TOUR REASON.\n\nPackaging & Freight cannot be submitted for this tour. Please claim Local Deputation Allowance instead.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (items.length === 0) {
      ToastMessage('Please add at least one packing and moving item');
      return;
    }

    // Angular Validation Rules
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sNo = i + 1;

      if (it.vendorGstNo && !it.isGstValidated) {
        ToastMessage(`Item #${sNo}: Please validate VENDOR GST No`);
        return;
      }

      if (it.twoWheelerTransport === '0' && it.householdGoodsTransport === '0') {
        ToastMessage(`Item #${sNo}: Please Select Yes in 2 Wheeler Transport or Household Goods Transport`);
        return;
      }

      if (it.twoWheelerTransport === '1' && !it.transportOfTwoWheelerBy) {
        ToastMessage(`Item #${sNo}: Please Select Transport of 2 Wheeler By`);
        return;
      }

      if (!it.totalDistanceKm || Number(it.totalDistanceKm) <= 0) {
        ToastMessage(`Item #${sNo}: Please Enter Total Distance(KM) For Transport`);
        return;
      }

      if (it.distanceHillyTerrain === '' || it.distanceHillyTerrain === null) {
        ToastMessage(`Item #${sNo}: Please Enter Distance in Hilly Terrain`);
        return;
      }

      const totalDist = parseFloat(it.totalDistanceKm) || 0;
      const hillyDist = parseFloat(it.distanceHillyTerrain) || 0;
      if (hillyDist > totalDist) {
        ToastMessage(`Item #${sNo}: Distance in Hilly Terrain (${hillyDist} KM) cannot be greater than Total Distance (${totalDist} KM)`);
        return;
      }

      if (it.householdGoodsTransport === '1') {
        if (!it.tonnageHouseholdGoods || Number(it.tonnageHouseholdGoods) <= 0) {
          ToastMessage(`Item #${sNo}: Please Enter Tonnage of Household Goods`);
          return;
        }
        if (!it.billedAmountHouseholdGoods || Number(it.billedAmountHouseholdGoods) <= 0) {
          ToastMessage(`Item #${sNo}: Please Enter Billed Amount of Household Goods Transport`);
          return;
        }
      }

      if (
        it.transportChargesForVehicle === '' ||
        it.transportChargesForVehicle === null ||
        it.transportChargesForVehicle === undefined
      ) {
        ToastMessage(`Item #${sNo}: Please Enter Transport Charges For Vehicle`);
        return;
      }

      if (it.vehicleTransportByDriver === '' || it.vehicleTransportByDriver === null) {
        ToastMessage(`Item #${sNo}: Please Select Vehicle Transported By Driver`);
        return;
      }

      if (it.travelTimeHours === '' || it.travelTimeHours === null) {
        ToastMessage(`Item #${sNo}: Please Enter Travel Time in Hours`);
        return;
      }

      if (it.octroiCharges === '' || it.octroiCharges === null) {
        ToastMessage(`Item #${sNo}: Please Enter Octroi Charges`);
        return;
      }

      if (it.breakageCharges === '' || it.breakageCharges === null) {
        ToastMessage(`Item #${sNo}: Please Enter Breakage Charges`);
        return;
      }

      if (it.dependentTraveling === '1') {
        const depList = it.dependenciesRelation || [];
        if (depList.length === 0) {
          ToastMessage(`Item #${sNo}: Please add Dependent Data`);
          return;
        }
        for (let k = 0; k < depList.length; k++) {
          if (!depList[k].name || !depList[k].name.trim()) {
            ToastMessage(`Item #${sNo}: Please Enter Dependent Name`);
            return;
          }
          if (!depList[k].relation || !depList[k].relation.trim()) {
            ToastMessage(`Item #${sNo}: Please Enter Dependent Relation`);
            return;
          }
        }
      }

      if (!it.claimAmount || parseFloat(it.claimAmount) <= 0) {
        ToastMessage(`Item #${sNo}: Please Enter Claim Amount`);
        return;
      }

      if (parseFloat(it.invoiceAmount || 0) > 0 && parseFloat(it.invoiceAmount) < parseFloat(it.claimAmount)) {
        ToastMessage(`Item #${sNo}: Invoice Amount must be greater than or equal to claim amount`);
        return;
      }

      if (!it.transferOnPromotion) {
        ToastMessage(`Item #${sNo}: Please Select Transfer on Promotion`);
        return;
      }

      if (!it.basicSalary || parseFloat(it.basicSalary) <= 0) {
        ToastMessage(`Item #${sNo}: Please Enter Basic Salary Amount`);
        return;
      }
    }

    // Build payload matching backend requirements & Angular submitForm
    const payloadData = items.map((it) => {
      const claimVal = parseFloat(it.claimAmount) || 0;
      const billedVal = parseFloat(it.billedAmountHouseholdGoods) || 0;
      const isDep = it.dependentTraveling === '1';

      // Build dependent relation list safely without sending null/temp IDs
      const depList = isDep
        ? (it.dependenciesRelation || [])
            .filter((dep) => dep && (dep.name || dep.relation))
            .map((dep) => {
              const depObj = {
                tour_id: Number(tourId),
                expense_id: 7,
                name: String(dep.name || '').trim(),
                relation: String(dep.relation || '').trim(),
              };
              if (
                dep.id &&
                !String(dep.id).startsWith('temp-') &&
                !String(dep.id).startsWith('new_') &&
                !isNaN(Number(dep.id)) &&
                Number(dep.id) > 0
              ) {
                depObj.id = Number(dep.id);
              }
              return depObj;
            })
        : [];

      const rawHsn = typeof it.hsnCode === 'object' && it.hsnCode !== null ? it.hsnCode.code || it.hsnCode.hsncode : it.hsnCode;
      const finalHsn = rawHsn && String(rawHsn).trim() && String(rawHsn).trim() !== '0000' ? String(rawHsn).trim() : '';
      const formattedInvDate = formatDateToYYYYMMDD(it.invoiceDate);
      const fallbackDate = formatDateToYYYYMMDD(claimdata?.startdate) || formatDateToYYYYMMDD(new Date());
      const finalInvDate = formattedInvDate || fallbackDate;
      const invoiceNoClean = it.invoiceNo ? String(it.invoiceNo).trim() : '';
      const activeBankGst = it.bankGstNo || bankGst || DEFAULT_BANK_GST;

      const base = {
        tourgid: Number(tourId),
        expense_id: 7,
        claimedamount: claimVal,
        requestercomment: expenseFromRoute?.requestercomment || claimdata?.requestercomment || 'Packing and Moving',
        twowheelertrans: it.twoWheelerTransport || '0',
        hhgoodstrans: it.householdGoodsTransport || '0',
        transtwowheelerby: it.twoWheelerTransport === '1' ? String(it.transportOfTwoWheelerBy || '') : '',
        ibaappvendor: '',
        totaldisttrans: parseFloat(it.totalDistanceKm) || 0,
        distinhilly: parseFloat(it.distanceHillyTerrain) || 0,
        daysdrivereng: parseInt(it.noDaysDriverEngaged, 10) || 0,
        driverbatta: parseFloat(it.driverBattas) || 0,
        tonnagehhgood: parseFloat(it.tonnageHouseholdGoods) || 0,
        maxeligton: it.maxEligibleTonnage !== undefined && it.maxEligibleTonnage !== '' ? String(it.maxEligibleTonnage) : (tourDetails.maxTonnage ? String(tourDetails.maxTonnage) : ''),
        billedamthhgoodstrans: billedVal,
        eligtransamt: parseFloat(it.eligibleTransportationAmount) || 0,
        maxeligibletonnage: it.maxEligibleTonnage !== undefined && it.maxEligibleTonnage !== '' ? String(it.maxEligibleTonnage) : (tourDetails.maxTonnage ? String(tourDetails.maxTonnage) : ''),
        transchargesvehicle: parseFloat(it.transportChargesForVehicle) || 0,
        vehicletransbydriver: it.vehicleTransportByDriver || '0',
        traveltime: parseFloat(it.travelTimeHours) || 0,
        octroivehicle: parseFloat(it.octroiCharges) || 0,
        breakagecharges: parseFloat(it.breakageCharges) || 0,
        receipt_loss: it.receiptForLosses || '0',
        eligbreakagecharge: parseFloat(it.eligibleBreakageLumpsum) || 0,
        dependent: isDep ? 1 : 0,
        dependencies_relation: depList,
        eligibleamount: parseFloat(it.eligibleAmount) || 0,
        hsncode: finalHsn,
        vendorname: it.vendorName ? String(it.vendorName).trim() : '',
        vendortype: '',
        vendorcode: it.vendorCode ? String(it.vendorCode).trim() : '',
        bankgstno: activeBankGst,
        taxableamount: parseFloat(it.taxableAmount) || 0,
        invoiceamount: parseFloat(it.invoiceAmount) || 0,
        vendorgstno: it.vendorGstNo ? String(it.vendorGstNo).trim() : '',
        igst: parseFloat(it.igst) || 0,
        cgst: parseFloat(it.cgst) || 0,
        sgst: parseFloat(it.sgst) || 0,
        igstp: parseFloat(it.igstRate) || 0,
        cgstp: parseFloat(it.cgstRate) || 0,
        sgstp: parseFloat(it.sgstRate) || 0,
        address: it.address ? String(it.address).trim() : '',
        entergst: false,
        approvedamount: parseFloat(it.approvedAmount) || claimVal,
        gstno: it.vendorGstNo ? String(it.vendorGstNo).trim() : '',
        invoicedate: finalInvDate || null,
        invoiceno: invoiceNoClean || null,
        transfer_on_promotion: it.transferOnPromotion !== undefined && it.transferOnPromotion !== '' ? String(it.transferOnPromotion) : '0',
        basic_salary: parseFloat(it.basicSalary) || 0,
      };

      if (
        it.id &&
        !String(it.id).startsWith('temp-') &&
        !String(it.id).startsWith('new_') &&
        !isNaN(Number(it.id)) &&
        Number(it.id) > 0
      ) {
        base.id = Number(it.id);
      }

      return base;
    });

    const body = { data: payloadData };
    console.log('Submitting Packaging & Moving payload:', JSON.stringify(body));

    try {
      const res = await triggerPackingCreate(body).unwrap();
      console.log('Packing submit response:', JSON.stringify(res));
      if (
        (res?.message === 'Successfully Created' && res?.status === 'success') ||
        (res?.message === 'Successfully Updated' && res?.status === 'success') ||
        res?.status === 'success' ||
        (res?.message && String(res?.message).toLowerCase().includes('success'))
      ) {
        ToastMessage(res?.message || 'Successfully Created');
        setHasUnsavedChanges(false);
        navigation.goBack();
      } else {
        const errorDesc = res?.description || res?.message || 'Failed to submit expense';
        Alert.alert('Submission Error', String(errorDesc));
        ToastMessage(String(errorDesc));
      }
    } catch (err) {
      console.log('Packing submit error (full):', JSON.stringify(err, null, 2));
      let errMsg = 'Submission failed';
      if (err?.data?.description) {
        errMsg = err.data.description;
      } else if (err?.data?.message) {
        errMsg = err.data.message;
      } else if (err?.data?.detail) {
        errMsg = err.data.detail;
      } else if (typeof err?.data === 'string') {
        errMsg = err.data;
      } else if (err?.message) {
        errMsg = err.message;
      }
      Alert.alert('Submission Error', String(errMsg));
      ToastMessage(String(errMsg));
    }
  }, [items, tourId, tourDetails.maxTonnage, expenseFromRoute, claimdata, triggerPackingCreate, navigation]);

  // ---------------------------------------------------------------------------
  // Approver Action (Checker Level 2)
  // ---------------------------------------------------------------------------
  const handleApprove = useCallback(async () => {
    const approverArray = items.map((it) => ({
      id: it.id,
      amount: parseFloat(it.approvedAmount || it.claimAmount || 0),
    }));

    try {
      const res = await triggerPackingApprove({ tourId, payload: approverArray }).unwrap();
      if (res?.status === 'success') {
        ToastMessage('Success....');
        navigation.goBack();
      } else {
        ToastMessage(res?.description || 'Approval failed');
      }
    } catch (err) {
      ToastMessage(err?.data?.description || err?.data?.message || 'Approval failed');
    }
  }, [items, tourId, triggerPackingApprove, navigation]);

  // Dropdown Item Renderer
  const currentActiveItem = useMemo(
    () => items.find((it) => it.id === activePickerItemId) || {},
    [items, activePickerItemId]
  );
  const currentPickerOptions =
    activePickerField === 'transportOfTwoWheelerBy' ? twoWheelerByOptions : yesNoOptions;

  const DropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected =
      selected === options.value ||
      selected === options.name ||
      String(selected || '').toLowerCase() === String(options.value || '').toLowerCase();
    return (
      <TouchableOpacity
        style={[styles.actionSheetItem, isSelected && styles.actionSheetItemSelected]}
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

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: CustomColors.appScreenColor },
    flatListContent: { padding: moderateScale(16), paddingBottom: verticalScale(100) },
    /* Non-editable Tour Details Card */
    tourCard: {
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
    tourCardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: verticalScale(12),
      paddingBottom: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderLight,
    },
    tourCardHeaderLeft: {
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
    tourFieldBlockFull: {
      width: '100%',
      backgroundColor: CustomColors.appScreenColor,
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(10),
      paddingVertical: verticalScale(8),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      marginTop: verticalScale(4),
    },
    tourFieldLabel: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.medium,
      color: CustomColors.textMuted || '#6B7280',
      marginBottom: verticalScale(2),
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tourFieldValueText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(12),
      marginTop: verticalScale(4),
    },
    mainHeading: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
      flex: 1,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.appThemeColor,
      paddingHorizontal: horizontalScale(14),
      paddingVertical: verticalScale(8),
      borderRadius: moderateScale(8),
    },
    addButtonText: {
      color: CustomColors.white,
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(13),
      marginLeft: horizontalScale(4),
    },
    itemCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(14),
      elevation: 2,
      borderWidth: 1,
      borderColor: '#f0f0f0',
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: moderateScale(14),
      backgroundColor: '#f8fafc',
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    sNoBadge: {
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(6),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(3),
      marginRight: horizontalScale(8),
    },
    sNoText: { color: CustomColors.white, fontSize: moderateScale(11), fontFamily: Fonts.bold },
    cardTitle: { fontSize: moderateScale(14), fontFamily: Fonts.semiBold, color: CustomColors.textDark, flex: 1 },
    cardDetails: { padding: moderateScale(14) },
    detailItemContainer: { marginBottom: verticalScale(12) },
    labelContainer: { flexDirection: 'row', marginBottom: verticalScale(4) },
    detailLabel: { fontSize: moderateScale(13), fontFamily: Fonts.medium, color: CustomColors.textDark },
    editableTextInput: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      backgroundColor: '#fff',
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(9),
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    readOnlyInput: {
      backgroundColor: '#f9fafb',
      borderColor: '#e5e7eb',
    },
    multilineInput: { minHeight: verticalScale(65), textAlignVertical: 'top' },
    placeholderText: { color: CustomColors.textMuted },
    actionSheetTriggerButtonText: { fontSize: moderateScale(13), fontFamily: Fonts.regular, color: CustomColors.textDark, flex: 1 },
    validateBtn: {
      marginLeft: horizontalScale(8),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(14),
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    validateBtnText: { color: CustomColors.white, fontSize: moderateScale(12), fontFamily: Fonts.semiBold },
    copyBtn: {
      marginLeft: horizontalScale(8),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(12),
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(8),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyBtnText: {
      color: CustomColors.white,
      fontSize: moderateScale(12),
      fontFamily: Fonts.semiBold,
      marginLeft: horizontalScale(4),
    },
    calcEligibleBtn: {
      backgroundColor: '#0284c7',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: verticalScale(10),
      borderRadius: moderateScale(8),
      marginVertical: verticalScale(8),
    },
    calcEligibleBtnText: {
      color: '#fff',
      fontFamily: Fonts.semiBold,
      fontSize: moderateScale(13),
      marginLeft: horizontalScale(6),
    },
    dependentsContainer: {
      backgroundColor: '#f1f5f9',
      borderRadius: moderateScale(8),
      padding: moderateScale(12),
      marginVertical: verticalScale(8),
    },
    dependentsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    dependentsTitle: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
    },
    addDepBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.appThemeColor,
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(4),
      borderRadius: moderateScale(6),
    },
    addDepBtnText: {
      color: '#fff',
      fontSize: moderateScale(11),
      fontFamily: Fonts.medium,
      marginLeft: 2,
    },
    depRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    depInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#cbd5e1',
      backgroundColor: '#fff',
      borderRadius: moderateScale(6),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(6),
      fontSize: moderateScale(12),
      color: CustomColors.textDark,
      marginRight: horizontalScale(6),
    },
    bottomActionBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: CustomColors.cardBackground, padding: moderateScale(12),
      borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between',
    },
    bottomButton: { flex: 1, paddingVertical: verticalScale(12), borderRadius: moderateScale(8), alignItems: 'center', marginHorizontal: horizontalScale(6) },
    backButton: { backgroundColor: CustomColors.mediumGray },
    submitButton: { backgroundColor: CustomColors.appThemeColor },
    bottomButtonText: { color: CustomColors.white, fontFamily: Fonts.bold, fontSize: moderateScale(14) },
    noDataText: { textAlign: 'center', color: CustomColors.textMuted, marginTop: verticalScale(20), fontFamily: Fonts.regular },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    hsnModalContainer: { backgroundColor: CustomColors.cardBackground, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '75%', paddingBottom: 20 },
    hsnModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    hsnModalTitle: { fontSize: 17, fontFamily: Fonts.bold, color: CustomColors.appThemeColor },
    hsnSearchInput: { margin: 16, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, fontFamily: Fonts.regular },
    hsnRow: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f1f5f9' },
    hsnRowCode: { fontSize: 14, fontFamily: Fonts.semiBold, color: CustomColors.textDark },
    hsnRowSub: { fontSize: 12, color: CustomColors.textMuted, marginTop: 2, fontFamily: Fonts.regular },
    actionSheetItem: { padding: moderateScale(14), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f1f5f9' },
    actionSheetItemSelected: { backgroundColor: '#eff6ff' },
    actionSheetItemText: { fontSize: moderateScale(14), fontFamily: Fonts.regular, color: CustomColors.textDark },
  });

  // ---------------------------------------------------------------------------
  // Render Item Card
  // ---------------------------------------------------------------------------
  const renderItem = useCallback(({ item, index }) => {
    const isExpanded = expandedItems[item.id] !== false;
    const itemNumber = index + 1;

    const getYesNoLabel = (val) => yesNoOptions.find((o) => String(o.value) === String(val))?.label || (val === '1' ? 'Yes' : 'No');
    const getTwoWheelerLabel = (val) => twoWheelerByOptions.find((o) => String(o.value) === String(val) || String(o.name) === String(val))?.label || val;

    return (
      <View style={styles.itemCard}>
        {/* Card Header Bar */}
        <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.cardHeader} activeOpacity={0.7}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.sNoBadge}><Text allowFontScaling={false} style={styles.sNoText}>#{itemNumber}</Text></View>
            <Text allowFontScaling={false} style={styles.cardTitle} numberOfLines={1}>
              {item.claimAmount ? `Claim: ₹${item.claimAmount}` : `Item ${itemNumber}`}
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
          <View style={styles.cardDetails}>
            {/* 1. 2 Wheeler Transport (Required Picker) */}
            <EditableRow
              label="2 Wheeler Transport"
              value={getYesNoLabel(item.twoWheelerTransport)}
              isPicker
              isRequired
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setActivePickerField('twoWheelerTransport');
                setPickerModalVisible(true);
              }}
              placeholder="Select Yes/No"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 2. Household Goods Transport (Required Picker) */}
            <EditableRow
              label="Household Goods Transport"
              value={getYesNoLabel(item.householdGoodsTransport)}
              isPicker
              isRequired
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setActivePickerField('householdGoodsTransport');
                setPickerModalVisible(true);
              }}
              placeholder="Select Yes/No"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 3. Transport of 2 Wheeler By (Required Picker) */}
            <EditableRow
              label="Transport of 2 Wheeler By"
              value={getTwoWheelerLabel(item.transportOfTwoWheelerBy)}
              isPicker
              isRequired
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setActivePickerField('transportOfTwoWheelerBy');
                setPickerModalVisible(true);
              }}
              placeholder="Select Option"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 4. Total Distance(KM) For Transport (Required Number Input) */}
            <EditableRow
              label="Total Distance(KM) For Transport"
              value={item.totalDistanceKm}
              onChangeText={(txt) => updateItemField(item.id, 'totalDistanceKm', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Distance in KM"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 5. Distance in Hilly Terrain (Required Number Input) */}
            <EditableRow
              label="Distance in Hilly Terrain"
              value={item.distanceHillyTerrain}
              onChangeText={(txt) => updateItemField(item.id, 'distanceHillyTerrain', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Hilly Distance in KM"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 6. Tonnage of Household Goods (Number Input) */}
            <EditableRow
              label="Tonnage of Household Goods"
              value={item.tonnageHouseholdGoods}
              onChangeText={(txt) => updateItemField(item.id, 'tonnageHouseholdGoods', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Enter Tonnage"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 7. Max Eligible Tonnage (Non-editable) */}
            <EditableRow
              label="Max Eligible Tonnage"
              value={item.maxEligibleTonnage || tourDetails.maxTonnage || '3000'}
              editable={false}
              keyboardType="numeric"
              placeholder="Max Eligible Tonnage"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 8. Billed Amount of Household Goods Transport (Number Input) */}
            <EditableRow
              label="Billed Amount of Household Goods Transport"
              value={item.billedAmountHouseholdGoods}
              onChangeText={(txt) => updateItemField(item.id, 'billedAmountHouseholdGoods', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Enter Billed Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* Button to calculate eligible amounts via API */}
            <TouchableOpacity
              style={styles.calcEligibleBtn}
              onPress={() => handleCalculateEligible(item.id)}
              disabled={isCalculatingEligible}
              activeOpacity={0.8}
            >
              {isCalculatingEligible ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="calculate" size={moderateScale(18)} color="#fff" />
                  <Text allowFontScaling={false} style={styles.calcEligibleBtnText}>Calculate Eligible Amount</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 9. Eligible Transportation Amount (Input Field) */}
            <EditableRow
              label="Eligible Transportation Amount"
              value={item.eligibleTransportationAmount}
              onChangeText={(txt) => updateItemField(item.id, 'eligibleTransportationAmount', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Eligible Transportation Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 10. Transport Charges For Vehicle (Required Number Input) */}
            <EditableRow
              label="Transport Charges For Vehicle"
              value={item.transportChargesForVehicle}
              onChangeText={(txt) => updateItemField(item.id, 'transportChargesForVehicle', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Vehicle Charges"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 11. Vehicle Transport By Driver (Required Picker) */}
            <EditableRow
              label="Vehicle Transport By Driver"
              value={getYesNoLabel(item.vehicleTransportByDriver)}
              isPicker
              isRequired
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setActivePickerField('vehicleTransportByDriver');
                setPickerModalVisible(true);
              }}
              placeholder="Select Yes/No"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 12. Travel Time in Hours(HH) (Required Number Input) */}
            <EditableRow
              label="Travel Time in Hours(HH)"
              value={item.travelTimeHours}
              onChangeText={(txt) => updateItemField(item.id, 'travelTimeHours', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Hours"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 13. No of Days Driver Engaged (Input Field) */}
            <EditableRow
              label="No of Days Driver Engaged"
              value={item.noDaysDriverEngaged}
              onChangeText={(txt) => updateItemField(item.id, 'noDaysDriverEngaged', txt.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              placeholder="No of Days"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 14. Driver Battas (Input Field) */}
            <EditableRow
              label="Driver Battas"
              value={item.driverBattas}
              onChangeText={(txt) => updateItemField(item.id, 'driverBattas', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Driver Battas"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 15. Octroi Charges For Transport Vehicle (Required Number Input) */}
            <EditableRow
              label="Octroi Charges For Transport Vehicle"
              value={item.octroiCharges}
              onChangeText={(txt) => updateItemField(item.id, 'octroiCharges', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Octroi Charges"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 16. Breakage Charges (Required Number Input) */}
            <EditableRow
              label="Breakage Charges"
              value={item.breakageCharges}
              onChangeText={(txt) => updateItemField(item.id, 'breakageCharges', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Breakage Charges"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 17. Receipt for Losses Due to Damage Produced (Picker) */}
            <EditableRow
              label="Receipt for Losses Due to Damage Produced"
              value={getYesNoLabel(item.receiptForLosses)}
              isPicker
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setActivePickerField('receiptForLosses');
                setPickerModalVisible(true);
              }}
              placeholder="Select Yes/No"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 18. Eligible Breakage/Lumpsum Charge (Input Field) */}
            <EditableRow
              label="Eligible Breakage/Lumpsum Charge"
              value={item.eligibleBreakageLumpsum}
              onChangeText={(txt) => updateItemField(item.id, 'eligibleBreakageLumpsum', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Eligible Breakage Charge"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 19. Eligible Amount (Input Field) */}
            <EditableRow
              label="Eligible Amount"
              value={item.eligibleAmount}
              onChangeText={(txt) => updateItemField(item.id, 'eligibleAmount', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Eligible Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 20. Transfer on Promotion (Required Picker) */}
            <EditableRow
              label="Transfer on Promotion"
              value={getYesNoLabel(item.transferOnPromotion)}
              isPicker
              isRequired
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setActivePickerField('transferOnPromotion');
                setPickerModalVisible(true);
              }}
              placeholder="Select Yes/No"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 21. Basic Salary (Required Number Input) */}
            <EditableRow
              label="Basic Salary"
              value={item.basicSalary}
              onChangeText={(txt) => updateItemField(item.id, 'basicSalary', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Basic Salary"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 22. Dependent on Traveling (Picker) */}
            <EditableRow
              label="Dependent on Traveling"
              value={getYesNoLabel(item.dependentTraveling)}
              isPicker
              onPressPicker={() => {
                setActivePickerItemId(item.id);
                setActivePickerField('dependentTraveling');
                setPickerModalVisible(true);
              }}
              placeholder="Select Yes/No"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* Dependent Members Section (when dependentTraveling is '1') */}
            {item.dependentTraveling === '1' && (
              <View style={styles.dependentsContainer}>
                <View style={styles.dependentsHeader}>
                  <Text allowFontScaling={false} style={styles.dependentsTitle}>Dependent Members</Text>
                  {isEditable && (
                    <TouchableOpacity style={styles.addDepBtn} onPress={() => handleAddDependent(item.id)}>
                      <MaterialIcons name="add" size={16} color="#fff" />
                      <Text allowFontScaling={false} style={styles.addDepBtnText}>Add Member</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {(item.dependenciesRelation || []).map((dep, dIdx) => (
                  <View key={dep.id || `dep_${dIdx}`} style={styles.depRow}>
                    <TextInput
                      allowFontScaling={false}
                      style={styles.depInput}
                      value={dep.name}
                      onChangeText={(t) => handleUpdateDependent(item.id, dIdx, 'name', t)}
                      placeholder="Name"
                      placeholderTextColor={CustomColors.textMuted}
                    />
                    <TextInput
                      allowFontScaling={false}
                      style={styles.depInput}
                      value={dep.relation}
                      onChangeText={(t) => handleUpdateDependent(item.id, dIdx, 'relation', t)}
                      placeholder="Relation"
                      placeholderTextColor={CustomColors.textMuted}
                    />
                    {isEditable && (
                      <TouchableOpacity onPress={() => handleRemoveDependent(item.id, dIdx)}>
                        <MaterialIcons name="remove-circle-outline" size={20} color={CustomColors.red} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* 23. Claim Amount (Required Number Input) */}
            <EditableRow
              label="Claim Amount"
              value={item.claimAmount}
              onChangeText={(txt) => updateItemField(item.id, 'claimAmount', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              isRequired
              placeholder="Enter Claim Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 24. Invoice Date (Date Picker) */}
            <EditableRow
              label="Invoice Date"
              value={item.invoiceDate}
              isDatePicker
              onPressDatePicker={() => {
                setDateActiveItemId(item.id);
                if (Platform.OS === 'android') {
                  DateTimePickerAndroid.open({
                    value: parseDDMMYYYYToDate(item.invoiceDate),
                    onChange: (e, date) => date && updateItemField(item.id, 'invoiceDate', formatDateToDDMMYYYY(date)),
                    mode: 'date',
                  });
                } else {
                  setDatePickerValue(parseDDMMYYYYToDate(item.invoiceDate).toISOString());
                  setShowDatePicker(true);
                }
              }}
              placeholder="DD-MMM-YYYY"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 25. Invoice No (Text Input) */}
            <EditableRow
              label="Invoice No"
              value={item.invoiceNo}
              onChangeText={(txt) => updateItemField(item.id, 'invoiceNo', txt)}
              placeholder="Enter Invoice No"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 26. Bank GST No (Auto-populated & read-only with Copy button) */}
            <EditableRow
              label="Bank GST No"
              value={item.bankGstNo || bankGst || DEFAULT_BANK_GST}
              onChangeText={(txt) => updateItemField(item.id, 'bankGstNo', txt)}
              placeholder="Bank GST No"
              editable={false}
              styles={styles}
              CustomColors={CustomColors}
              rightAccessory={
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => handleCopyBankGst(item.bankGstNo || bankGst || DEFAULT_BANK_GST)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="content-copy" size={moderateScale(15)} color={CustomColors.white} />
                  <Text allowFontScaling={false} style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              }
            />

            {/* 27. Vendor GST No (Input Field with Validate Button) */}
            <EditableRow
              label="Vendor GST No"
              value={item.vendorGstNo}
              onChangeText={(txt) => updateItemField(item.id, 'vendorGstNo', txt.toUpperCase())}
              placeholder="Enter Vendor GST No"
              styles={styles}
              CustomColors={CustomColors}
              rightAccessory={
                isEditable && (
                  <TouchableOpacity
                    style={styles.validateBtn}
                    onPress={() => handleValidateVendorGst(item.id)}
                    disabled={validatingItemId === item.id}
                  >
                    {validatingItemId === item.id ? (
                      <ActivityIndicator size="small" color={CustomColors.white} />
                    ) : (
                      <Text allowFontScaling={false} style={styles.validateBtnText}>
                        {item.isGstValidated ? 'Validated' : 'Validate'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              }
            />

            {/* 28. Vendor Name (Input Field) */}
            <EditableRow
              label="Vendor Name"
              value={item.vendorName}
              onChangeText={(txt) => updateItemField(item.id, 'vendorName', txt)}
              placeholder="Vendor Name"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 29. Vendor Code (Input Field) */}
            <EditableRow
              label="Vendor Code"
              value={item.vendorCode}
              onChangeText={(txt) => updateItemField(item.id, 'vendorCode', txt)}
              placeholder="Vendor Code"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 30. Address (Multiline Input Field) */}
            <EditableRow
              label="Address"
              value={item.address}
              onChangeText={(txt) => updateItemField(item.id, 'address', txt)}
              multiline
              placeholder="Vendor Address"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 31. HSN Code (Picker to Modal) */}
            <EditableRow
              label="HSN Code"
              value={item.hsnCode}
              isPicker
              onPressPicker={() => openHsnModal(item.id)}
              placeholder="Select HSN Code"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 32. Taxable Amount (Number Input) */}
            <EditableRow
              label="Taxable Amount"
              value={item.taxableAmount}
              onChangeText={(txt) => updateItemField(item.id, 'taxableAmount', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Taxable Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 33. CGST (Input Field) */}
            <EditableRow
              label={`CGST${item.cgstRate ? ` (${item.cgstRate}%)` : ''}`}
              value={item.cgst}
              onChangeText={(txt) => updateItemField(item.id, 'cgst', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="CGST Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 34. SGST (Input Field) */}
            <EditableRow
              label={`SGST${item.sgstRate ? ` (${item.sgstRate}%)` : ''}`}
              value={item.sgst}
              onChangeText={(txt) => updateItemField(item.id, 'sgst', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="SGST Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 35. IGST (Input Field) */}
            <EditableRow
              label={`IGST${item.igstRate ? ` (${item.igstRate}%)` : ''}`}
              value={item.igst}
              onChangeText={(txt) => updateItemField(item.id, 'igst', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="IGST Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 36. Invoice Amount (Input Field) */}
            <EditableRow
              label="Invoice Amount"
              value={item.invoiceAmount}
              onChangeText={(txt) => updateItemField(item.id, 'invoiceAmount', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Invoice Amount"
              styles={styles}
              CustomColors={CustomColors}
            />

            {/* 37. Approved Amount (Input Field) */}
            {/* <EditableRow
              label="Approved Amount"
              value={item.approvedAmount}
              onChangeText={(txt) => updateItemField(item.id, 'approvedAmount', txt.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Approved Amount"
              styles={styles}
              CustomColors={CustomColors}
            /> */}
          </View>
        )}
      </View>
    );
  }, [
    expandedItems,
    isEditable,
    toggleExpand,
    handleDeleteItem,
    updateItemField,
    handleCalculateEligible,
    isCalculatingEligible,
    handleValidateVendorGst,
    validatingItemId,
    twoWheelerByOptions,
    yesNoOptions,
    styles,
    CustomColors,
  ]);

  if (isLoadingScreen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CustomColors.appScreenColor }}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={{ marginTop: 10, color: CustomColors.textDark, fontFamily: Fonts.medium }}>
          Loading Packing & Moving Data...
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
            {/* Tour Details Card (Non-Editable) */}
            <View style={styles.tourCard}>
              <View style={styles.tourCardHeaderRow}>
                <View style={styles.tourCardHeaderLeft}>
                  <View style={styles.tourIconWrap}>
                    <MaterialIcons
                      name="flight-takeoff"
                      size={moderateScale(18)}
                      color={CustomColors.appThemeColor}
                    />
                  </View>
                  <Text allowFontScaling={false} style={styles.tourDetailsHeading}>
                    Tour Details
                  </Text>
                </View>
                {(tourDetails.requestNo || tourReqNo) ? (
                  <View style={styles.tourReqBadge}>
                    <Text allowFontScaling={false} style={styles.tourReqBadgeText}>
                      Req #{tourDetails.requestNo || tourReqNo}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Non-editable Tour Details Grid */}
              <View style={styles.tourFieldsGrid}>
                {/* Tour No */}
                <View style={styles.tourFieldBlock}>
                  <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                    Tour No
                  </Text>
                  <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                    {tourDetails.requestNo || tourReqNo || (tourId ? String(tourId) : 'N/A')}
                  </Text>
                </View>

                {/* Employee Name */}
                <View style={styles.tourFieldBlock}>
                  <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                    Employee
                  </Text>
                  <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                    {tourDetails.employeeCode ? `(${tourDetails.employeeCode}) ` : ''}{tourDetails.employeeName || 'N/A'}
                  </Text>
                </View>

                {/* Designation */}
                <View style={styles.tourFieldBlock}>
                  <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                    Designation
                  </Text>
                  <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                    {tourDetails.designation || 'N/A'}
                  </Text>
                </View>

                {/* Employee Grade */}
                <View style={styles.tourFieldBlock}>
                  <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                    Grade
                  </Text>
                  <Text allowFontScaling={false} style={styles.tourFieldValueText} numberOfLines={1}>
                    {tourDetails.employeeGrade || 'N/A'}
                  </Text>
                </View>

                {/* Max Eligible Tonnage */}
                <View style={styles.tourFieldBlockFull}>
                  <Text allowFontScaling={false} style={styles.tourFieldLabel}>
                    Max Eligible Tonnage
                  </Text>
                  <Text allowFontScaling={false} style={[styles.tourFieldValueText, { color: CustomColors.appThemeColor, fontWeight: '700' }]} numberOfLines={1}>
                    {tourDetails.maxTonnage || '3000'} KG
                  </Text>
                </View>
              </View>
            </View>

            {/* Section Heading & Add Row Button */}
            <View style={styles.headerRow}>
              <Text allowFontScaling={false} style={styles.mainHeading}>Packing & Moving Items</Text>
              {isEditable && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddExpenseItem} activeOpacity={0.8}>
                  <MaterialIcons name="add" size={moderateScale(18)} color="#fff" />
                  <Text allowFontScaling={false} style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {items.length === 0 && (
              <Text allowFontScaling={false} style={styles.noDataText}>No packing expense items found.</Text>
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
            style={[styles.bottomButton, styles.submitButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text allowFontScaling={false} style={styles.bottomButtonText}>Submit</Text>
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

      {/* Action Sheet Picker Modal */}
      {activePickerItemId && (
        <CustomActionSheetPicker
          pickerStatus={pickerModalVisible}
          setPickerStatus={setPickerModalVisible}
          title="Select Option"
          optionsData={currentPickerOptions}
          RenderItem={DropdownItem}
          onPress={(val) => {
            updateItemField(activePickerItemId, activePickerField, val);
            setPickerModalVisible(false);
          }}
          selected={currentActiveItem[activePickerField]}
        />
      )}

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={new Date(datePickerValue)}
          mode="date"
          display="spinner"
          onChange={(e, date) => {
            setShowDatePicker(false);
            if (date) updateItemField(dateActiveItemId, 'invoiceDate', formatDateToDDMMYYYY(date));
          }}
        />
      )}

      {/* HSN Code Search Modal */}
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
                <MaterialIcons name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>
            <TextInput
              allowFontScaling={false}
              style={styles.hsnSearchInput}
              value={hsnSearchText}
              onChangeText={onHsnSearchChange}
              placeholder="Search HSN code..."
              placeholderTextColor={CustomColors.textMuted}
            />
            {isSearchingHsn && hsnResults.length === 0 ? (
              <ActivityIndicator size="small" color={CustomColors.appThemeColor} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={hsnResults}
                keyExtractor={(hsnItem) => String(hsnItem.id)}
                renderItem={({ item: hsnItem }) => (
                  <TouchableOpacity style={styles.hsnRow} onPress={() => handleHsnSelect(hsnItem)}>
                    <Text allowFontScaling={false} style={styles.hsnRowCode}>
                      {hsnItem.code} {hsnItem.description ? `- ${hsnItem.description}` : ''}
                    </Text>
                    <Text allowFontScaling={false} style={styles.hsnRowSub}>
                      CGST {hsnItem.cgstrate}% · SGST {hsnItem.sgstrate}% · IGST {hsnItem.igstrate}%
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
    </KeyboardAvoidingView>
  );
};

export default PackagingFreight;