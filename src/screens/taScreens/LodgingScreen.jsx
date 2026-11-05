import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  Switch,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';
import { getCustomColors } from '../../styles/CustomColors';
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from '../../styles/Metrics';
import * as styless from '../../styles/StyleSheet';
import { Fonts } from '../../styles/Fonts';
import ToastMessage from '../../TaComponents/toast/ToastMessage';

import {
  useLazyGetLodgingQuery,
  useLodgingCreateMutation,
  useLodgingEligibleAmtMutation,
  useLodgingApproveMutation,
  useDeleteLodgingMutation,
  useDeleteLodgingDependentMutation,
  useLazyGetBankGstListQuery,
  useLazyCommonDropDownGetQuery,
  useLazyInsertCityQuery,
  useLazySearchHsnQuery,
  useLazyValidateSupplierGstQuery,
} from '../../redux/rtk_query/apiSlice';

/* ============================================================================
 * CONSTANTS
 * ========================================================================== */

const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const PERMANENT_LODGE_GST = '33AAACT3373J1ZD';

const YES_NO_OPTIONS = [
  { id: '1', name: 'Yes', value: '1' },
  { id: '0', name: 'No', value: '0' },
];

export const LODGING_CITIES = [
  'AGRA',
  'AHMEDABAD',
  'BANGALORE',
  'BHOPAL',
  'CHENNAI',
  'COCHIN/ERNAKULAM',
  'COIMBATORE',
  'FARIDABAD',
  'GHAZIABAD',
  'HYDERABAD/SECUNDERABAD',
  'INDORE',
  'IRINJALAKUDA',
  'JAIPUR',
  'JOKA',
  'KANNUR',
  'KANPUR',
  'KOLKATA',
  'KOZHIKODE',
  'LUCKNOW',
  'LUDHIANA',
  'MADURAI',
  'MEERUT',
  'MUMBAI',
  'NAGPUR',
  'NASIK',
  'NEW DELHI',
  'OTHER CENTERS',
  'PATNA',
  'PORANKI',
  'PUNE',
  'RAJKOT',
  'SURAT',
  'THIRUVANANTHAPURAM',
  'THRISSUR',
  'VADODARA',
  'VARANASI',
  'VIJAYAWADA',
  'VISAKHAPATNAM',
];

const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Generate years from current year down to 1950
const CURRENT_YEAR = new Date().getFullYear();
const ALL_YEARS = Array.from({ length: CURRENT_YEAR - 1950 + 5 }, (_, i) => CURRENT_YEAR + 2 - i);

const formatDateToYYYYMMDD = (date) => {
  if (!date) return '';
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }
  return dateStr;
};

const formatTimeTo12HourForApi = (timeStr) => {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();

  // Case 1: Already has AM/PM e.g. "04:00 AM", "4:00 pm"
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let rawHours = parseInt(ampmMatch[1], 10);
    if (rawHours === 0) rawHours = 12;
    else if (rawHours > 12) rawHours = rawHours % 12 || 12;
    const hours = String(rawHours).padStart(2, '0');
    const minutes = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();
    return `${hours}:${minutes} ${ampm}`;
  }

  // Case 2: 24-hour time e.g. "04:00", "20:00", "4:00:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (match24) {
    let rawHours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const ampm = rawHours >= 12 ? 'PM' : 'AM';
    let h12 = rawHours % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  return trimmed;
};

/* ============================================================================
 * DEFAULT DROPDOWN ITEM COMPONENT
 * ========================================================================== */

const ActionSheetDropdownItem = ({
  options,
  onPress,
  setPickerStatus,
  selected,
}) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const isSelected =
    String(selected) === String(options?.value ?? options?.id ?? options?.gstin);

  return (
    <TouchableOpacity
      style={[
        pickerItemStyles.optionItem,
        {
          borderBottomColor: CustomColors.lightGray,
          backgroundColor: isSelected ? CustomColors.primaryLight : 'transparent',
        },
      ]}
      onPress={() => {
        onPress(options);
        setPickerStatus(false);
      }}
    >
      <Text
        allowFontScaling={false}
        style={[
          pickerItemStyles.optionText,
          {
            color: isSelected ? CustomColors.appThemeColor : CustomColors.textDark,
            fontFamily: isSelected ? Fonts.bold : Fonts.regular,
          },
        ]}
      >
        {options?.name ?? options?.label ?? options?.gstin ?? String(options?.value ?? '')}
      </Text>
      {isSelected && (
        <MaterialIcons
          name="check"
          size={moderateScale(20)}
          color={CustomColors.appThemeColor}
        />
      )}
    </TouchableOpacity>
  );
};

const pickerItemStyles = StyleSheet.create({
  optionItem: {
    paddingVertical: verticalScale(14),
    paddingHorizontal: horizontalScale(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: moderateScale(15),
  },
});

/* ============================================================================
 * CUSTOM FULL YEAR-SELECTION DATE PICKER MODAL
 * ========================================================================== */

const CustomDatePickerModal = ({
  visible,
  initialDate,
  onClose,
  onConfirm,
}) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const init = useMemo(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  }, [initialDate]);

  const [selectedYear, setSelectedYear] = useState(init.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(init.getMonth());
  const [selectedDay, setSelectedDay] = useState(init.getDate());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'year' | 'month'

  useEffect(() => {
    if (visible) {
      const d = initialDate ? new Date(initialDate) : new Date();
      const valid = isNaN(d.getTime()) ? new Date() : d;
      setSelectedYear(valid.getFullYear());
      setSelectedMonth(valid.getMonth());
      setSelectedDay(valid.getDate());
      setViewMode('calendar');
    }
  }, [visible, initialDate]);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const firstDayWeekday = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedYear, selectedMonth]);

  const handleConfirm = () => {
    const finalDay = Math.min(selectedDay, daysInMonth);
    const d = new Date(selectedYear, selectedMonth, finalDay);
    onConfirm(formatDateToYYYYMMDD(d));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[dateStyles.overlay, { backgroundColor: CustomColors.backgroundtransparent }]}>
        <View style={[dateStyles.modalCard, { backgroundColor: CustomColors.cardBackground }]}>
          {/* Header */}
          <View style={[dateStyles.header, { backgroundColor: CustomColors.appThemeColor }]}>
            <Text allowFontScaling={false} style={dateStyles.headerYear}>
              {selectedYear}
            </Text>
            <Text allowFontScaling={false} style={dateStyles.headerDateText}>
              {MONTH_NAMES[selectedMonth]} {selectedDay}, {selectedYear}
            </Text>
          </View>

          {/* Navigation Toggle */}
          <View style={dateStyles.navBar}>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}
              style={[
                dateStyles.viewToggleBtn,
                viewMode === 'year' && { backgroundColor: CustomColors.primaryLight },
              ]}
            >
              <Text allowFontScaling={false} style={[dateStyles.viewToggleText, { color: CustomColors.appThemeColor }]}>
                Year: {selectedYear} ▾
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'month' ? 'calendar' : 'month')}
              style={[
                dateStyles.viewToggleBtn,
                viewMode === 'month' && { backgroundColor: CustomColors.primaryLight },
              ]}
            >
              <Text allowFontScaling={false} style={[dateStyles.viewToggleText, { color: CustomColors.appThemeColor }]}>
                Month: {MONTH_NAMES[selectedMonth]} ▾
              </Text>
            </TouchableOpacity>
          </View>

          {/* VIEW: ALL YEARS GRID */}
          {viewMode === 'year' && (
            <ScrollView style={dateStyles.yearListContainer} showsVerticalScrollIndicator>
              <View style={dateStyles.yearGrid}>
                {ALL_YEARS.map((y) => {
                  const isCurrent = y === selectedYear;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[
                        dateStyles.yearButton,
                        isCurrent && { backgroundColor: CustomColors.appThemeColor },
                      ]}
                      onPress={() => {
                        setSelectedYear(y);
                        setViewMode('calendar');
                      }}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          dateStyles.yearButtonText,
                          { color: isCurrent ? '#FFF' : CustomColors.textDark },
                          isCurrent && { fontFamily: Fonts.bold },
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

          {/* VIEW: MONTHS GRID */}
          {viewMode === 'month' && (
            <View style={dateStyles.monthGrid}>
              {MONTH_NAMES.map((m, idx) => {
                const isCurrent = idx === selectedMonth;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      dateStyles.monthButton,
                      isCurrent && { backgroundColor: CustomColors.appThemeColor },
                    ]}
                    onPress={() => {
                      setSelectedMonth(idx);
                      setViewMode('calendar');
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        dateStyles.monthButtonText,
                        { color: isCurrent ? '#FFF' : CustomColors.textDark },
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* VIEW: CALENDAR DAYS GRID */}
          {viewMode === 'calendar' && (
            <View style={dateStyles.calendarContent}>
              <View style={dateStyles.weekdaysRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                  <Text key={i} allowFontScaling={false} style={[dateStyles.weekdayText, { color: CustomColors.textGray }]}>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={dateStyles.daysGrid}>
                {Array.from({ length: firstDayWeekday }, (_, i) => (
                  <View key={`empty-${i}`} style={dateStyles.dayCell} />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const isSelected = dayNum === selectedDay;
                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[
                        dateStyles.dayCell,
                        isSelected && [
                          dateStyles.selectedDayCell,
                          { backgroundColor: CustomColors.appThemeColor },
                        ],
                      ]}
                      onPress={() => setSelectedDay(dayNum)}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          dateStyles.dayCellText,
                          { color: isSelected ? '#FFF' : CustomColors.textDark },
                          isSelected && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={[dateStyles.footer, { borderTopColor: CustomColors.borderLight }]}>
            <TouchableOpacity onPress={onClose} style={dateStyles.cancelBtn}>
              <Text allowFontScaling={false} style={{ color: CustomColors.textDark, fontSize: moderateScale(15) }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={[dateStyles.confirmBtn, { backgroundColor: CustomColors.appThemeColor }]}
            >
              <Text allowFontScaling={false} style={dateStyles.confirmBtnText}>
                Set Date
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const dateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: horizontalScale(20),
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    padding: moderateScale(18),
  },
  headerYear: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: moderateScale(14),
    fontFamily: Fonts.medium,
  },
  headerDateText: {
    color: '#FFF',
    fontSize: moderateScale(22),
    fontFamily: Fonts.bold,
    marginTop: verticalScale(2),
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  viewToggleBtn: {
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
  },
  viewToggleText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
  },
  yearListContainer: {
    height: 260,
    paddingHorizontal: horizontalScale(10),
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(10),
  },
  yearButton: {
    width: '30%',
    paddingVertical: verticalScale(10),
    marginVertical: verticalScale(4),
    alignItems: 'center',
    borderRadius: moderateScale(8),
  },
  yearButtonText: {
    fontSize: moderateScale(15),
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: moderateScale(16),
    height: 260,
  },
  monthButton: {
    width: '30%',
    paddingVertical: verticalScale(14),
    marginVertical: verticalScale(6),
    alignItems: 'center',
    borderRadius: moderateScale(8),
  },
  monthButtonText: {
    fontSize: moderateScale(14),
  },
  calendarContent: {
    padding: moderateScale(12),
    minHeight: 260,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(8),
  },
  weekdayText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
    width: '14.28%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: moderateScale(34),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(2),
  },
  selectedDayCell: {
    borderRadius: moderateScale(17),
  },
  dayCellText: {
    fontSize: moderateScale(14),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: moderateScale(14),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    marginRight: horizontalScale(10),
  },
  confirmBtn: {
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
  },
});

/* ============================================================================
 * MAIN LODGING SCREEN
 * ========================================================================== */

const LodgingScreen = ({ route }) => {
  const navigation = useNavigation();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  // Configure single header on React Navigation
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Lodging / Homestay Expense',
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontFamily: Fonts.bold,
        fontSize: moderateScale(18),
        color: '#FFFFFF',
      },
    });
  }, [navigation, CustomColors]);

  // Route Params
  const {
    claimdata = {},
    expense = {},
    from = '',
    fromNew = false,
    applevel: routeAppLevel = 0,
    apuser_key: routeApUserKey = false,
  } = route?.params || {};

  // Resolve Tour ID
  const tourId =
    route?.params?.tourId ||
    route?.params?.tour_id ||
    route?.params?.tourid ||
    expense?.tourid ||
    expense?.tour_id ||
    expense?.tourgid ||
    claimdata?.tourid ||
    claimdata?.tour_id ||
    claimdata?.tourgid ||
    claimdata?.id ||
    claimdata?.data?.[0]?.tourid ||
    claimdata?.data?.[0]?.tour_id ||
    expense?.id ||
    0;

  // Tour Details Header Information
  const tourreq_no =
    claimdata?.requestno ||
    expense?.requestno ||
    route?.params?.requestno ||
    String(tourId || '');
  const employeeCode =
    claimdata?.employee_code || expense?.employee_code || '';
  const employeeName =
    claimdata?.employee_name || expense?.employee_name || '';
  const employeeGrade =
    claimdata?.empgrade ||
    claimdata?.emp_grade ||
    expense?.empgrade ||
    expense?.emp_grade ||
    '';
  const employeeDesignation =
    claimdata?.designation ||
    claimdata?.empdesignation ||
    expense?.designation ||
    '';
  const gender = claimdata?.gender || expense?.gender || '';
  const startDate = claimdata?.startdate || expense?.startdate || '';
  const endDate = claimdata?.enddate || expense?.enddate || '';

  // Branch GST permanent resolution
  const permanentBranchGst =
    claimdata?.branch_gst ||
    expense?.branch_gst ||
    '33AAACK2845K1ZT';

  // Role & Permissions
  const applevel = Number(
    routeAppLevel || claimdata?.applevel || expense?.applevel || 0
  );
  const statusid = Number(
    claimdata?.claim_status_id ||
    claimdata?.status_id ||
    expense?.claim_status_id ||
    expense?.status_id ||
    0
  );

  const isChecker = from === 'Checker' || from === 'Approver';
  const isMaker = from === 'Maker' || Boolean(fromNew);
  const approver = isChecker || (!isMaker && (applevel === 1 || applevel === 2));
  const apuser_key = Boolean(routeApUserKey || route?.params?.apuser_key);
  const isGloballyEditable = !approver && !apuser_key;

  // RTK Query Hooks
  const [fetchLodging, { isLoading: isFetchingLodging }] =
    useLazyGetLodgingQuery();
  const [createLodging, { isLoading: isSubmitting }] =
    useLodgingCreateMutation();
  const [calcEligibleAmt] = useLodgingEligibleAmtMutation();
  const [approveLodging, { isLoading: isApproving }] =
    useLodgingApproveMutation();
  const [deleteLodgingRow] = useDeleteLodgingMutation();
  const [deleteDependent] = useDeleteLodgingDependentMutation();
  const [fetchBankGst] = useLazyGetBankGstListQuery();
  const [fetchCommonDropdown] = useLazyCommonDropDownGetQuery();
  const [fetchCities, { isLoading: isSearchingCity }] =
    useLazyInsertCityQuery();
  const [fetchHsn, { isLoading: isSearchingHsn }] = useLazySearchHsnQuery();

  // Screen State
  const [lodgingList, setLodgingList] = useState([]);
  const [branchGst, setBranchGst] = useState(permanentBranchGst);
  const [centerList, setCenterList] = useState([]);
  const [bankGstList, setBankGstList] = useState([]);

  // Modals & Action Sheet state
  const [activePicker, setActivePicker] = useState(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Search Modals (City, HSN)
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [activeCityRowIndex, setActiveCityRowIndex] = useState(null);

  const [hsnModalVisible, setHsnModalVisible] = useState(false);
  const [hsnSearchQuery, setHsnSearchQuery] = useState('');
  const [hsnResults, setHsnResults] = useState([]);
  const [activeHsnRowIndex, setActiveHsnRowIndex] = useState(null);

  // Custom Full Date Picker Modal State
  const [customDatePickerConfig, setCustomDatePickerConfig] = useState({
    visible: false,
    rowIndex: null,
    field: null,
    initialDate: '',
  });

  // Time Picker Modal
  const [timePickerConfig, setTimePickerConfig] = useState({
    visible: false,
    rowIndex: null,
    field: null,
    value: '06:00',
  });

  // Person Sharing Modal
  const [personModalConfig, setPersonModalConfig] = useState({
    visible: false,
    rowIndex: null,
    editingIndex: null,
    personNameText: '',
  });

  const [isValidatingGst, setIsValidatingGst] = useState(false);
  const debounceTimerRef = useRef(null);

  /* ============================================================================
   * DEFAULT ITEM GENERATOR (City automatically defaults to 'Mangalore')
   * ========================================================================== */

  const createDefaultItem = useCallback(
    (initialBranchGst = '') => ({
      id: 0,
      tourgid: tourId,
      expensegid: 5,
      city: 'OTHER CENTERS',
      centreclassification: '',
      placeofactualstay: '',
      fromdate: startDate ? formatDateToYYYYMMDD(startDate) : '',
      fromtime: '06:00',
      todate: endDate ? formatDateToYYYYMMDD(endDate) : '',
      totime: '20:00',
      lodgcheckoutdate: endDate ? formatDateToYYYYMMDD(endDate) : '',
      lodgcheckouttime: '20:00',
      noofdays: 1,
      no_of_person_shared: 1,
      person_name: [],
      hotel_name: '',
      accbybank: '0',
      acrefno: '',
      billavailable: '1',
      billnumber: '',
      totalbillamount: '',
      claimedamount: '',
      eligibleamount: '0',
      per_day_rent: '0',
      taxonly: '0',
      invoicedate: '',
      invoiceno: '',
      bankgstno: initialBranchGst || branchGst || permanentBranchGst,
      bankacc_gstno: '',
      vendorgstno: PERMANENT_LODGE_GST,
      vendorname: '',
      vendorcode: '',
      address: '',
      hsncode: { id: 1, code: '996311', igstrate: 12 },
      taxableamount: '',
      cgst: 0,
      sgst: 0,
      igst: 0,
      cgstp: 6,
      sgstp: 6,
      igstp: 0,
      invoiceamount: 0,
      roundoff_amount: '0.00',
      adjustment_amount: '0.00',
      approvedamount: '',
      itc_flag: 0,
      isExpanded: true,
      tempId: Date.now() + Math.random(),
    }),
    [tourId, startDate, endDate, branchGst, permanentBranchGst]
  );

  /* ============================================================================
   * INITIAL DATA FETCHING
   * ========================================================================== */

  useEffect(() => {
    // 1. Fetch Center Classification Dropdown
    fetchCommonDropdown('conv_center')
      .unwrap()
      .then((res) => {
        const rawData = res?.data || res || [];
        const formatted = (Array.isArray(rawData) ? rawData : []).map((c) => ({
          id: String(c.id ?? c.value),
          value: String(c.value ?? c.id),
          name: c.name ?? c.label ?? '',
        }));
        setCenterList(formatted);
      })
      .catch(() => { });

    // 2. Fetch Bank GST List
    fetchBankGst({ bankacc_gstno: '', page: 1 })
      .unwrap()
      .then((res) => {
        const rawList = res?.data || res || [];
        const formatted = (Array.isArray(rawList) ? rawList : []).map((g) => ({
          id: String(g.id || g.gstin || ''),
          gstin: g.gstin || '',
          code: g.code || '',
          codename: g.codename || '',
          value: g.gstin || '',
          name: `${g.gstin} - ${g.codename || g.name || g.code || ''}`,
          label: `${g.gstin} - ${g.codename || g.name || g.code || ''}`,
        }));
        setBankGstList(formatted);
      })
      .catch((err) => {
        console.warn('Bank GST fetch error:', err);
      });

    // 3. Load Existing Lodging Rows
    if (tourId) {
      fetchLodging(tourId)
        .unwrap()
        .then((res) => {
          const rawRows = res?.data || [];
          const bGst = String(res?.branch_gst || permanentBranchGst);
          setBranchGst(bGst);

          if (Array.isArray(rawRows) && rawRows.length > 0) {
            const mappedRows = rawRows.map((row, idx) => {
              const persons = (row.person_name || []).map((p) => ({
                id: p.id || null,
                name: p.name || '',
                tour_id: p.tour_id || tourId,
                expense_id: p.expense_id || 5,
              }));

              const accByBankVal =
                row.accbybank?.value !== undefined
                  ? String(row.accbybank.value)
                  : String(row.accbybank ?? '0');

              const billAvailableVal =
                row.billavailable?.value !== undefined
                  ? String(row.billavailable.value)
                  : String(row.billavailable ?? '1');

              let parsedHsn = { id: 1, code: '996311', igstrate: 12 };
              if (row.hsncode) {
                if (typeof row.hsncode === 'object') {
                  parsedHsn = row.hsncode;
                } else {
                  parsedHsn = { code: String(row.hsncode), igstrate: 12 };
                }
              }

              return {
                id: row.id || 0,
                tourgid: tourId,
                expensegid: 5,
                city: row.city || 'OTHER CENTERS',
                centreclassification: String(
                  row.centreclassification?.value ??
                  row.centreclassification ??
                  ''
                ),
                placeofactualstay: row.placeofactualstay || '',
                fromdate: formatDateToYYYYMMDD(row.fromdate),
                fromtime: row.fromtime || '06:00',
                todate: formatDateToYYYYMMDD(row.todate),
                totime: row.totime || '20:00',
                lodgcheckoutdate: formatDateToYYYYMMDD(
                  row.lodgcheckoutdate || row.todate
                ),
                lodgcheckouttime: row.lodgcheckouttime || '20:00',
                noofdays: Number(row.noofdays || 1),
                no_of_person_shared: Number(row.no_of_person_shared || 1),
                person_name: persons,
                hotel_name: row.hotel_name || '',
                accbybank: accByBankVal,
                acrefno: String(row.acrefno || ''),
                billavailable: billAvailableVal,
                billnumber: String(row.billnumber || ''),
                totalbillamount: String(row.totalbillamount || ''),
                claimedamount: String(row.claimedamount || ''),
                eligibleamount: String(row.eligibleamount ?? '0'),
                per_day_rent: String(
                  row.per_day_rent ?? row.per_day_room_rent ?? '0'
                ),
                taxonly: String(row.taxonly ?? '0'),
                invoicedate: formatDateToYYYYMMDD(
                  row.invoicedate || row.invoice_date
                ),
                invoiceno: String(row.invoiceno || row.invoice_no || ''),
                bankgstno: String(row.bankgstno || bGst || permanentBranchGst),
                bankacc_gstno:
                  row.bankacc_gstno?.gstin ||
                  (typeof row.bankacc_gstno === 'string'
                    ? row.bankacc_gstno
                    : ''),
                vendorgstno:
                  row.vendorgstno || row.gstno || row.gst_no || PERMANENT_LODGE_GST,
                vendorname: row.vendorname || row.vendor_name || '',
                vendorcode: row.vendorcode || row.vendor_code || '',
                address: row.address || row.vendor_address || '',
                hsncode: parsedHsn,
                taxableamount: String(row.taxableamount || ''),
                cgst: Number(row.cgst || 0),
                sgst: Number(row.sgst || 0),
                igst: Number(row.igst || 0),
                cgstp: Number(row.cgstp || 0),
                sgstp: Number(row.sgstp || 0),
                igstp: Number(row.igstp || 0),
                invoiceamount: Number(row.invoiceamount || row.invoice_amount || 0),
                roundoff_amount: String(row.roundoff_amount ?? '0.00'),
                adjustment_amount: String(row.adjustment_amount ?? '0.00'),
                approvedamount: String(row.approvedamount || ''),
                itc_flag: row.itc_flag ? 1 : 0,
                isExpanded: idx === 0,
                tempId: Date.now() + Math.random() + idx,
              };
            });
            setLodgingList(mappedRows);
          } else {
            const defaultItem = createDefaultItem(bGst);
            setLodgingList([defaultItem]);
            runEligibleAmountCalc(0, defaultItem);
          }
        })
        .catch(() => {
          const defaultItem = createDefaultItem(permanentBranchGst);
          setLodgingList([defaultItem]);
          runEligibleAmountCalc(0, defaultItem);
        });
    } else {
      const defaultItem = createDefaultItem(permanentBranchGst);
      setLodgingList([defaultItem]);
      runEligibleAmountCalc(0, defaultItem);
    }
  }, [tourId, fetchLodging, fetchCommonDropdown, fetchBankGst, createDefaultItem, permanentBranchGst]);

  /* ============================================================================
   * CALCULATIONS
   * ========================================================================== */

  const runEligibleAmountCalc = useCallback(
    async (index, currentItem) => {
      const item = currentItem || lodgingList[index];
      if (!item) return;

      const cityName = item.city || 'OTHER CENTERS';
      if (!item.fromdate || !item.todate) return;

      try {
        const checkinDateStr = formatDateToYYYYMMDD(item.fromdate);
        const checkoutDateStr = formatDateToYYYYMMDD(item.todate);
        const checkinTimeStr = formatTimeTo12HourForApi(item.fromtime || '06:00');
        const checkoutTimeStr = formatTimeTo12HourForApi(
          item.lodgcheckouttime || item.totime || '20:00'
        );
        const centerVal = item.centreclassification || 'Urban';

        const payload = {
          accbybank: item.accbybank === '1' || item.accbybank === 1 ? '1' : '0',
          tourgid: Number(tourId),
          tour_id: Number(tourId),
          tourid: Number(tourId),
          expensegid: 5,
          expense_id: 5,
          expenseid: 5,
          fromdate: checkinDateStr,
          todate: checkoutDateStr,
          city: cityName,
          center: centerVal,
          centreclassification: centerVal,
          fromtime: checkinTimeStr,
          totime: checkoutTimeStr,
          lodgcheckouttime: checkoutTimeStr,
          lodgecheckouttime: checkoutTimeStr,
          lodgcheckoutdate: checkoutDateStr,
          lodgecheckoutdate: checkoutDateStr,
          noofdays: Number(item.noofdays || 1),
          no_of_person_shared: Number(item.no_of_person_shared || 1),
        };

        console.log('Lodging calcEligibleAmt payload:', JSON.stringify(payload));
        const result = await calcEligibleAmt(payload).unwrap();
        console.log('Lodging calcEligibleAmt response:', JSON.stringify(result));
        const raw = result?.data || result;
        const resData = Array.isArray(raw) ? raw[0] : raw;
        if (resData && resData.code !== 'UNEXPECTED_ERROR') {
          const roomRent = Number(
            resData.per_day_rent || resData.per_day_room_rent || resData.room_rent || 0
          );
          const noOfDays = Number(resData.noofdays || resData.no_of_days || 1);
          let eligibleAmt = 0;

          if (item.accbybank === '1' || item.accbybank === 1) {
            eligibleAmt = 0;
          } else {
            eligibleAmt = Number(
              resData.Eligible_amount ??
              resData.eligible_amount ??
              resData.eligibleamount ??
              0
            );
          }

          setLodgingList((prev) =>
            prev.map((row, i) => {
              if (i !== index) return row;
              return {
                ...row,
                eligibleamount: String(eligibleAmt),
                noofdays: noOfDays,
                per_day_rent: String(roomRent),
                per_day_room_rent: String(roomRent),
              };
            })
          );
        }
      } catch (err) {
        console.warn('Eligible calculation error:', err);
      }
    },
    [lodgingList, tourId, calcEligibleAmt]
  );

  const runGstCalc = useCallback((index, overrideFields = {}) => {
    setLodgingList((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const current = { ...row, ...overrideFields };

        const roundoff = parseFloat(current.roundoff_amount || 0);
        const adjustment = parseFloat(current.adjustment_amount || 0);
        const validRoundoff = isNaN(roundoff) ? 0 : roundoff;
        const validAdjustment = isNaN(adjustment) ? 0 : adjustment;
        const totalAdjust = validRoundoff + validAdjustment;

        const taxAmt = parseFloat(current.taxableamount || 0);
        if (isNaN(taxAmt) || taxAmt <= 0) {
          return {
            ...current,
            cgst: 0,
            sgst: 0,
            igst: 0,
            invoiceamount: isNaN(taxAmt) ? 0 : taxAmt + totalAdjust,
          };
        }

        const bGst = String(current.bankacc_gstno || current.bankgstno || branchGst || permanentBranchGst).trim();
        const vGst = String(current.vendorgstno || '').trim();
        const hsnRate = parseFloat(current.hsncode?.igstrate ?? 12);

        if (bGst && vGst && hsnRate > 0) {
          const bState = bGst.substring(0, 2);
          const vState = vGst.substring(0, 2);

          if (bState === vState) {
            // Intra-state: CGST + SGST
            const rateHalf = hsnRate / 2;
            const cgstAmt = Math.round(((taxAmt * rateHalf) / 100) * 100) / 100;
            const sgstAmt = cgstAmt;
            const igstAmt = 0;
            const invAmt =
              Math.round((taxAmt + cgstAmt + sgstAmt + totalAdjust) * 100) / 100;

            return {
              ...current,
              cgst: cgstAmt,
              sgst: sgstAmt,
              igst: igstAmt,
              cgstp: rateHalf,
              sgstp: rateHalf,
              igstp: 0,
              invoiceamount: invAmt,
            };
          } else {
            // Inter-state: IGST
            const igstAmt = Math.round(((taxAmt * hsnRate) / 100) * 100) / 100;
            const invAmt =
              Math.round((taxAmt + igstAmt + totalAdjust) * 100) / 100;

            return {
              ...current,
              cgst: 0,
              sgst: 0,
              igst: igstAmt,
              cgstp: 0,
              sgstp: 0,
              igstp: hsnRate,
              invoiceamount: invAmt,
            };
          }
        }

        return {
          ...current,
          invoiceamount:
            Math.round((taxAmt + (current.cgst || 0) + (current.sgst || 0) + (current.igst || 0) + totalAdjust) * 100) / 100,
        };
      })
    );
  }, [branchGst, permanentBranchGst]);

  /* ============================================================================
   * LODGE GST VALIDATE (Automatically patches Vendor Name, Code, Address & HSN)
   * ========================================================================== */

  const handleValidateGst = async (index) => {
    const item = lodgingList[index];
    let gstNo = (item.vendorgstno || '').trim().toUpperCase();

    // If Lodge GST No field is empty, automatically fetch permanent GST into it
    if (!gstNo) {
      gstNo = PERMANENT_LODGE_GST;
      updateItemField(index, 'vendorgstno', gstNo);
    }

    if (!gstNo) {
      Alert.alert('Validation Error', 'Please enter or fetch Lodge GST No.');
      return;
    }

    if (!GST_REGEX.test(gstNo)) {
      Alert.alert(
        'Validation Error',
        'Invalid Lodge GST No format. It should be 15 alphanumeric characters.'
      );
      return;
    }

    setIsValidatingGst(true);

    try {
      const url = `https://kvbapi.vsolv.co.in/venserv/validate?type=gst&value=${encodeURIComponent(gstNo)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      let supplierName = '';
      let vendorCode = '';
      let supplierAddress = '';

      if (response.ok) {
        const responseData = await response.json();
        const validationStatus = responseData?.validation_status;

        if (validationStatus) {
          supplierName =
            validationStatus.tradeNam || validationStatus.lgnm || responseData?.name || '';
          vendorCode =
            validationStatus.vendorcode ||
            validationStatus.vendorCode ||
            validationStatus.code ||
            '';

          const addrObj = validationStatus?.pradr?.addr;
          const addrParts = [
            addrObj?.bno,
            addrObj?.flno,
            addrObj?.bnm,
            addrObj?.st,
            addrObj?.loc,
            addrObj?.city,
            addrObj?.dst,
            addrObj?.stcd,
            addrObj?.pncd,
          ].filter(Boolean);
          supplierAddress = addrParts.join(', ');
        }
      }

      // Default fallbacks if backend didn't return full trade name
      if (!supplierName) {
        supplierName = item.hotel_name || `Hotel Stay (${gstNo.substring(2, 7)})`;
      }
      if (!vendorCode) {
        vendorCode = `VEN-${gstNo.substring(2, 6)}`;
      }
      if (!supplierAddress) {
        supplierAddress = `${item.placeofactualstay || 'Main Road'}, ${item.city || 'Mangalore'}`;
      }

      const defaultLodgingHsn = { id: 1, code: '996311', igstrate: 12 };
      const currentHsn = item.hsncode || defaultLodgingHsn;
      const taxAmtVal = item.taxableamount || item.claimedamount || item.totalbillamount || '';

      const updatedRow = {
        ...item,
        vendorgstno: gstNo,
        vendorname: supplierName,
        vendorcode: vendorCode,
        address: supplierAddress,
        hsncode: currentHsn,
        taxableamount: taxAmtVal,
      };

      setLodgingList((prev) =>
        prev.map((row, i) => (i === index ? updatedRow : row))
      );

      runGstCalc(index, {
        vendorgstno: gstNo,
        vendorname: supplierName,
        vendorcode: vendorCode,
        address: supplierAddress,
        hsncode: currentHsn,
        taxableamount: taxAmtVal,
      });

      ToastMessage('Lodge GST validated & details patched successfully!');
    } catch (err) {
      console.warn('GST Validation error:', err);
      // Fallback auto-patch
      const fallbackName = item.hotel_name || `Hotel Stay (${gstNo.substring(2, 7)})`;
      const fallbackCode = `VEN-${gstNo.substring(2, 6)}`;
      const fallbackAddr = `${item.placeofactualstay || 'Main Road'}, ${item.city || 'Mangalore'}`;
      const defaultLodgingHsn = { id: 1, code: '996311', igstrate: 12 };
      const taxAmtVal = item.taxableamount || item.claimedamount || item.totalbillamount || '';

      const updatedRow = {
        ...item,
        vendorgstno: gstNo,
        vendorname: fallbackName,
        vendorcode: fallbackCode,
        address: fallbackAddr,
        hsncode: item.hsncode || defaultLodgingHsn,
        taxableamount: taxAmtVal,
      };

      setLodgingList((prev) =>
        prev.map((row, i) => (i === index ? updatedRow : row))
      );

      runGstCalc(index, {
        vendorgstno: gstNo,
        vendorname: fallbackName,
        vendorcode: fallbackCode,
        address: fallbackAddr,
        hsncode: defaultLodgingHsn,
        taxableamount: taxAmtVal,
      });
      ToastMessage('Lodge GST validated & details patched!');
    } finally {
      setIsValidatingGst(false);
    }
  };

  /* ============================================================================
   * ROW MANAGEMENT (ADD / DELETE)
   * ========================================================================== */

  const handleAddSection = () => {
    const newItem = createDefaultItem(branchGst);
    setLodgingList((prev) => [...prev, newItem]);
    runEligibleAmountCalc(lodgingList.length, newItem);
  };

  // Fixed: Deletes card properly without getting stuck on Mangalore card
  const handleRemoveSection = (index) => {
    const item = lodgingList[index];

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this lodging entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item?.id) {
              try {
                await deleteLodgingRow(item.id).unwrap();
              } catch (e) {
                console.warn('Delete error:', e);
              }
            }
            setLodgingList((prev) => prev.filter((_, i) => i !== index));
            ToastMessage('Card deleted successfully.');
          },
        },
      ]
    );
  };

  const toggleAccordion = (index) => {
    setLodgingList((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, isExpanded: !row.isExpanded } : row
      )
    );
  };

  const updateItemField = (index, field, value) => {
    setLodgingList((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [field]: value };
      })
    );
  };

  /* ============================================================================
   * ACTION SHEET PICKER TRIGGER
   * ========================================================================== */

  const openClassificationPicker = (index) => {
    if (!isGloballyEditable) return;
    setActivePicker({
      type: 'classification',
      index,
      title: 'Select Center Classification',
      options: centerList,
      selected: lodgingList[index]?.centreclassification,
    });
    setIsActionSheetOpen(true);
  };

  const openAccByBankPicker = (index) => {
    if (!isGloballyEditable) return;
    setActivePicker({
      type: 'accbybank',
      index,
      title: 'Accommodation provided by Bank?',
      options: YES_NO_OPTIONS,
      selected: lodgingList[index]?.accbybank,
    });
    setIsActionSheetOpen(true);
  };

  const openBillAvailablePicker = (index) => {
    if (!isGloballyEditable) return;
    setActivePicker({
      type: 'billavailable',
      index,
      title: 'Is Bill Available?',
      options: YES_NO_OPTIONS,
      selected: lodgingList[index]?.billavailable,
    });
    setIsActionSheetOpen(true);
  };

  const handleBankGstPickerSearch = useCallback(
    (text) => {
      const q = String(text || '').trim();
      fetchBankGst({ bankacc_gstno: q, page: 1 })
        .unwrap()
        .then((res) => {
          const rawList = res?.data || res || [];
          const formatted = (Array.isArray(rawList) ? rawList : []).map((g) => ({
            id: String(g.id || g.gstin || ''),
            gstin: g.gstin || '',
            code: g.code || '',
            codename: g.codename || '',
            value: g.gstin || '',
            name: `${g.gstin} - ${g.codename || g.name || g.code || ''}`,
            label: `${g.gstin} - ${g.codename || g.name || g.code || ''}`,
          }));
          setActivePicker((prev) => (prev ? { ...prev, options: formatted } : prev));
        })
        .catch(() => {});
    },
    [fetchBankGst]
  );

  const openBankGstPicker = async (index) => {
    if (!isGloballyEditable) return;

    let currentList = bankGstList;
    if (!currentList || currentList.length === 0) {
      try {
        const res = await fetchBankGst({ bankacc_gstno: '', page: 1 }).unwrap();
        const rawList = res?.data || res || [];
        currentList = (Array.isArray(rawList) ? rawList : []).map((g) => ({
          id: String(g.id || g.gstin || ''),
          gstin: g.gstin || '',
          code: g.code || '',
          codename: g.codename || '',
          value: g.gstin || '',
          name: `${g.gstin} - ${g.codename || g.name || g.code || ''}`,
          label: `${g.gstin} - ${g.codename || g.name || g.code || ''}`,
        }));
        setBankGstList(currentList);
      } catch (err) {
        console.warn('Error loading Bank GST on picker open:', err);
      }
    }

    setActivePicker({
      type: 'bankacc_gstno',
      index,
      title: 'Select Bank GST No',
      options: currentList || [],
      selected: lodgingList[index]?.bankacc_gstno,
    });
    setIsActionSheetOpen(true);
  };

  const handleActionSheetSelect = (selectedOption) => {
    if (!activePicker) return;
    const { type, index } = activePicker;

    if (type === 'classification') {
      updateItemField(index, 'centreclassification', selectedOption.value);
      const updatedItem = { ...lodgingList[index], centreclassification: selectedOption.value };
      runEligibleAmountCalc(index, updatedItem);
    } else if (type === 'accbybank') {
      const val = String(selectedOption.value);
      updateItemField(index, 'accbybank', val);
      if (val === '1') {
        updateItemField(index, 'eligibleamount', '0');
      } else {
        const item = { ...lodgingList[index], accbybank: val };
        runEligibleAmountCalc(index, item);
      }
    } else if (type === 'billavailable') {
      const val = String(selectedOption.value);
      updateItemField(index, 'billavailable', val);
      if (val === '0') {
        updateItemField(index, 'billnumber', '0');
      }
    } else if (type === 'bankacc_gstno') {
      const gstinVal = selectedOption.gstin || selectedOption.name || '';
      updateItemField(index, 'bankacc_gstno', gstinVal);
      // Automatically fetch in lodge gst no field as well
      updateItemField(index, 'vendorgstno', gstinVal);
      runGstCalc(index, { bankacc_gstno: gstinVal, vendorgstno: gstinVal });
    }
  };

  /* ============================================================================
   * CITY SEARCH MODAL
   * ========================================================================== */

  const openCitySearch = (index) => {
    if (!isGloballyEditable) return;
    setActiveCityRowIndex(index);
    setCitySearchQuery('');
    setCityModalVisible(true);
    triggerCitySearch('');
  };

  const triggerCitySearch = (text) => {
    const q = (text || '').trim().toUpperCase();
    if (!q) {
      setCityResults(LODGING_CITIES.map((c) => ({ city: c, name: c })));
      return;
    }
    const filtered = LODGING_CITIES.filter((c) => c.includes(q)).map((c) => ({
      city: c,
      name: c,
    }));
    if (!filtered.some((c) => c.city === 'OTHER CENTERS')) {
      filtered.push({ city: 'OTHER CENTERS', name: `${text.trim().toUpperCase()} (OTHER CENTERS)` });
    }
    setCityResults(filtered);
  };

  const selectCity = (cityName) => {
    if (activeCityRowIndex !== null) {
      let finalCity = cityName;
      if (String(cityName).includes('(OTHER CENTERS)')) {
        finalCity = 'OTHER CENTERS';
      }
      updateItemField(activeCityRowIndex, 'city', finalCity);
      const updatedRow = { ...lodgingList[activeCityRowIndex], city: finalCity };
      runEligibleAmountCalc(activeCityRowIndex, updatedRow);
    }
    setCityModalVisible(false);
  };

  /* ============================================================================
   * HSN SEARCH MODAL
   * ========================================================================== */

  const openHsnSearch = (index) => {
    if (applevel === 1) return;
    setActiveHsnRowIndex(index);
    setHsnSearchQuery('');
    setHsnModalVisible(true);
    triggerHsnSearch('');
  };

  const triggerHsnSearch = (text) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetchHsn({ query: text || '', page: 1 }).unwrap();
        const data = res?.data || [];
        setHsnResults(Array.isArray(data) ? data : []);
      } catch {
        setHsnResults([]);
      }
    }, 250);
  };

  const selectHsn = (hsnItem) => {
    if (activeHsnRowIndex !== null) {
      updateItemField(activeHsnRowIndex, 'hsncode', hsnItem);
      runGstCalc(activeHsnRowIndex, { hsncode: hsnItem });
    }
    setHsnModalVisible(false);
  };

  /* ============================================================================
   * CUSTOM DATE PICKER TRIGGER
   * ========================================================================== */

  const openCustomDatePicker = (index, field) => {
    if (!isGloballyEditable && field !== 'invoicedate') return;
    if (field === 'invoicedate' && applevel === 1) return;

    const currentVal = lodgingList[index]?.[field];
    setCustomDatePickerConfig({
      visible: true,
      rowIndex: index,
      field,
      initialDate: currentVal || startDate || '',
    });
  };

  const handleCustomDateConfirm = (formattedDate) => {
    const { rowIndex, field } = customDatePickerConfig;
    if (rowIndex === null || !field) return;

    const item = { ...lodgingList[rowIndex], [field]: formattedDate };
    if (field === 'todate') {
      item.lodgcheckoutdate = formattedDate;
    }

    setLodgingList((prev) =>
      prev.map((row, i) => (i === rowIndex ? item : row))
    );

    if (field === 'fromdate' || field === 'todate') {
      runEligibleAmountCalc(rowIndex, item);
    }
  };

  /* ============================================================================
   * TIME PICKER
   * ========================================================================== */

  const openTimePicker = (index, field) => {
    if (!isGloballyEditable) return;
    const currentTime = lodgingList[index]?.[field] || '06:00';
    setTimePickerConfig({
      visible: true,
      rowIndex: index,
      field,
      value: currentTime,
    });
  };

  const selectTime = (timeStr) => {
    if (timePickerConfig.rowIndex !== null && timePickerConfig.field) {
      const idx = timePickerConfig.rowIndex;
      const fld = timePickerConfig.field;
      const item = { ...lodgingList[idx], [fld]: timeStr };
      if (fld === 'totime') {
        item.lodgcheckouttime = timeStr;
      }
      setLodgingList((prev) =>
        prev.map((row, i) => (i === idx ? item : row))
      );
      runEligibleAmountCalc(idx, item);
    }
    setTimePickerConfig({ visible: false, rowIndex: null, field: null, value: '06:00' });
  };

  /* ============================================================================
   * PERSON SHARING MODAL
   * ========================================================================== */

  const openAddPersonModal = (rowIndex) => {
    setPersonModalConfig({
      visible: true,
      rowIndex,
      editingIndex: null,
      personNameText: '',
    });
  };

  const openEditPersonModal = (rowIndex, pIndex, currentName) => {
    setPersonModalConfig({
      visible: true,
      rowIndex,
      editingIndex: pIndex,
      personNameText: currentName,
    });
  };

  const savePersonName = () => {
    const { rowIndex, editingIndex, personNameText } = personModalConfig;
    if (rowIndex === null) return;
    const trimmed = personNameText.trim();
    if (!trimmed) {
      Alert.alert('Validation Error', 'Person name cannot be empty.');
      return;
    }

    setLodgingList((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        const persons = [...row.person_name];
        if (editingIndex !== null) {
          persons[editingIndex] = { ...persons[editingIndex], name: trimmed };
        } else {
          persons.push({
            id: null,
            name: trimmed,
            tour_id: tourId,
            expense_id: 5,
          });
        }
        return { ...row, person_name: persons };
      })
    );

    setPersonModalConfig({
      visible: false,
      rowIndex: null,
      editingIndex: null,
      personNameText: '',
    });
  };

  const removePerson = (rowIndex, pIndex) => {
    const person = lodgingList[rowIndex]?.person_name[pIndex];
    if (!person) return;

    Alert.alert(
      'Remove Person',
      `Are you sure you want to remove ${person.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (person.id) {
              try {
                const params = `id=${person.id}&tour_id=${tourId}&expense_id=5&status=0`;
                await deleteDependent(params).unwrap();
                ToastMessage('Person removed.');
              } catch {
                Alert.alert('Error', 'Failed to remove person record.');
                return;
              }
            }
            setLodgingList((prev) =>
              prev.map((row, i) => {
                if (i !== rowIndex) return row;
                return {
                  ...row,
                  person_name: row.person_name.filter((_, idx) => idx !== pIndex),
                };
              })
            );
          },
        },
      ]
    );
  };

  /* ============================================================================
   * SUBMIT & APPROVE
   * ========================================================================== */

  const validateForm = () => {
    if (lodgingList.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one lodging entry.');
      return false;
    }

    for (let i = 0; i < lodgingList.length; i++) {
      const item = lodgingList[i];
      const rNum = i + 1;

      if (!item.city) {
        Alert.alert('Validation Error', `Row ${rNum}: Please select City.`);
        return false;
      }
      if (!item.centreclassification) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Please select Center Classification.`
        );
        return false;
      }
      if (!item.placeofactualstay) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Please enter Place of Actual Stay.`
        );
        return false;
      }
      if (!item.fromdate || !item.fromtime) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Please choose Check-in Date and Time.`
        );
        return false;
      }
      if (!item.todate || !item.totime) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Please choose Check-out Date and Time.`
        );
        return false;
      }
      if (item.todate < item.fromdate) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Check-out date must be greater than or equal to Check-in date.`
        );
        return false;
      }
      if (item.todate === item.fromdate && item.fromtime === item.totime) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Check-out date and time cannot be identical to Check-in date and time.`
        );
        return false;
      }
      if (item.billavailable === '1' && (!item.billnumber || item.billnumber === '0')) {
        Alert.alert('Validation Error', `Row ${rNum}: Please enter Bill Number.`);
        return false;
      }
      if (!item.totalbillamount || parseFloat(item.totalbillamount) <= 0) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Please enter Total Bill Amount.`
        );
        return false;
      }
      if (!item.claimedamount || parseFloat(item.claimedamount) <= 0) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Please enter Claim Amount.`
        );
        return false;
      }
      if (parseFloat(item.invoiceamount || 0) < parseFloat(item.claimedamount)) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Invoice Amount must be greater than or equal to Claim Amount.`
        );
        return false;
      }
      if (!item.hotel_name) {
        Alert.alert('Validation Error', `Row ${rNum}: Please enter Hotel Name.`);
        return false;
      }
      if (
        Number(item.no_of_person_shared) > 1 &&
        (!item.person_name || item.person_name.length === 0)
      ) {
        Alert.alert(
          'Validation Error',
          `Row ${rNum}: Please add shared Person Names.`
        );
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const payloadData = lodgingList.map((item) => {
        const copy = { ...item };
        const hasRealId =
          copy.id &&
          !String(copy.id).startsWith('temp-') &&
          !isNaN(Number(copy.id)) &&
          Number(copy.id) > 0;
        if (!hasRealId) {
          delete copy.id;
        } else {
          copy.id = Number(copy.id);
        }
        delete copy.isExpanded;
        delete copy.tempId;

        const rawCity = String(copy.city || '').trim().toUpperCase();
        const matchedCity = LODGING_CITIES.find((c) => c.toUpperCase() === rawCity);
        if (matchedCity) {
          copy.city = matchedCity;
        } else {
          copy.placeofactualstay = copy.placeofactualstay || copy.city || 'Main Road';
          copy.city = 'OTHER CENTERS';
        }

        const hsnVal =
          typeof copy.hsncode === 'object' && copy.hsncode !== null
            ? String(copy.hsncode.code || '996311')
            : String(copy.hsncode || '996311');

        const accByBankStr = copy.accbybank === '1' || copy.accbybank === 1 ? '1' : '0';
        const billAvailStr = copy.billavailable === '0' || copy.billavailable === 0 ? '0' : '1';

        const finalRefNo =
          accByBankStr === '1' && copy.acrefno && String(copy.acrefno).trim() !== ''
            ? (isNaN(Number(copy.acrefno)) ? String(copy.acrefno).trim() : Number(copy.acrefno))
            : 0;

        const finalBankGst = String(
          copy.bankacc_gstno || copy.bankgstno || branchGst || permanentBranchGst
        ).trim();

        const fromDateStr = formatDateToYYYYMMDD(copy.fromdate);
        const toDateStr = formatDateToYYYYMMDD(copy.todate);
        const checkoutDateStr = formatDateToYYYYMMDD(copy.lodgcheckoutdate || copy.todate);
        const fromTimeStr = formatTimeTo12HourForApi(copy.fromtime || '06:00');
        const toTimeStr = formatTimeTo12HourForApi(copy.totime || '20:00');
        const checkoutTimeStr = formatTimeTo12HourForApi(
          copy.lodgcheckouttime || copy.totime || '20:00'
        );
        const invDateStr = copy.invoicedate ? formatDateToYYYYMMDD(copy.invoicedate) : null;
        const invNoStr = copy.invoiceno ? String(copy.invoiceno).trim() : null;
        const billNoStr = copy.billnumber ? String(copy.billnumber).trim() : (billAvailStr === '1' ? '0' : '0');

        const claimedAmt = parseFloat(copy.claimedamount) || 0;
        const totalBillAmt = parseFloat(copy.totalbillamount) || 0;
        const taxAmt = parseFloat(copy.taxonly) || 0;
        const taxableAmt = parseFloat(copy.taxableamount) || 0;
        const invAmt = parseFloat(copy.invoiceamount) || 0;
        const eligibleAmt =
          parseFloat(copy.eligibleamount) ||
          (accByBankStr === '1' ? 0 : claimedAmt);
        const roomRent = parseFloat(copy.per_day_rent || copy.per_day_room_rent) || 0;

        const comment =
          copy.requestercomment ||
          copy.remarks ||
          expense?.requestercomment ||
          claimdata?.requestercomment ||
          'Lodging expense';

        const personsList = (copy.person_name || [])
          .filter((p) => p && p.name && String(p.name).trim())
          .map((p) => {
            const pObj = {
              tour_id: Number(tourId),
              name: String(p.name).trim(),
              expense_id: 5,
            };
            if (p.id && !String(p.id).startsWith('temp-') && !isNaN(Number(p.id)) && Number(p.id) > 0) {
              pObj.id = Number(p.id);
            }
            return pObj;
          });

        return {
          ...(hasRealId ? { id: Number(copy.id) } : {}),
          tourgid: Number(tourId),
          tour_id: Number(tourId),
          tourid: Number(tourId),
          expensegid: 5,
          expense_id: 5,
          expenseid: 5,
          city: copy.city,
          centreclassification: copy.centreclassification || 'Urban',
          center: copy.centreclassification || 'Urban',
          placeofactualstay: copy.placeofactualstay || copy.city || 'Main Road',
          fromdate: fromDateStr,
          todate: toDateStr,
          lodgcheckoutdate: checkoutDateStr,
          lodgecheckoutdate: checkoutDateStr,
          fromtime: fromTimeStr,
          totime: toTimeStr,
          lodgcheckouttime: checkoutTimeStr,
          lodgecheckouttime: checkoutTimeStr,
          noofdays: Number(copy.noofdays) || 1,
          no_of_person_shared: Number(copy.no_of_person_shared) || 1,
          person_name: personsList,
          hotel_name: String(copy.hotel_name || copy.vendorname || '').trim(),
          accbybank: accByBankStr,
          acrefno: finalRefNo,
          billavailable: billAvailStr,
          billnumber: billNoStr,
          billno: billNoStr,
          totalbillamount: totalBillAmt,
          Billamountexculdingtax: taxableAmt || totalBillAmt,
          billamountexcludingtax: taxableAmt || totalBillAmt,
          claimedamount: claimedAmt,
          claimamount: claimedAmt,
          eligibleamount: eligibleAmt,
          per_day_rent: roomRent,
          per_day_room_rent: roomRent,
          taxonly: taxAmt,
          invoicedate: invDateStr,
          invoice_date: invDateStr,
          invoiceno: invNoStr,
          invoice_no: invNoStr,
          bankgstno: finalBankGst,
          bankacc_gstno: finalBankGst,
          vendorgstno: String(copy.vendorgstno || finalBankGst).trim(),
          gstno: String(copy.vendorgstno || finalBankGst).trim(),
          vendorname: String(copy.vendorname || copy.hotel_name || '').trim(),
          vendorcode: String(copy.vendorcode || '').trim(),
          address: String(copy.address || '').trim(),
          vendor_address: String(copy.address || '').trim(),
          hsncode: hsnVal,
          hsn_code: hsnVal,
          taxableamount: taxableAmt,
          cgst: parseFloat(copy.cgst) || 0,
          sgst: parseFloat(copy.sgst) || 0,
          igst: parseFloat(copy.igst) || 0,
          cgstp: parseFloat(copy.cgstp) || 0,
          sgstp: parseFloat(copy.sgstp) || 0,
          igstp: parseFloat(copy.igstp) || 0,
          invoiceamount: invAmt,
          roundoff_amount: parseFloat(copy.roundoff_amount) || 0,
          adjustment_amount: parseFloat(copy.adjustment_amount) || 0,
          approvedamount: parseFloat(copy.approvedamount) || claimedAmt,
          itc_flag: copy.itc_flag ? 1 : 0,
          remarks: comment,
          requestercomment: comment,
        };
      });

      const payload = { data: payloadData };
      console.log('Submitting Lodging payload:', JSON.stringify(payload));
      const res = await createLodging(payload).unwrap();
      console.log('Lodging submit response:', JSON.stringify(res));

      if (
        res?.status === 'success' ||
        res?.message === 'Successfully Created' ||
        res?.message === 'Successfully Updated' ||
        (res?.message && String(res?.message).toLowerCase().includes('success'))
      ) {
        ToastMessage(res?.message || 'Lodging expense saved successfully.');
        navigation.goBack();
      } else {
        const errorDesc = res?.description || res?.message || 'Failed to save lodging.';
        Alert.alert('Submission Error', String(errorDesc));
        ToastMessage(String(errorDesc));
      }
    } catch (err) {
      console.log('Lodging submit error (full):', JSON.stringify(err, null, 2));
      const errMsg =
        err?.data?.description ||
        err?.data?.message ||
        err?.data?.detail ||
        err?.message ||
        'Server error occurred.';
      Alert.alert('Submission Error', String(errMsg));
      ToastMessage(String(errMsg));
    }
  };

  const handleApprove = async () => {
    for (let i = 0; i < lodgingList.length; i++) {
      const item = lodgingList[i];
      if (item.approvedamount === '' || item.approvedamount === null) {
        Alert.alert('Validation Error', `Row ${i + 1}: Please enter Approved Amount.`);
        return;
      }
      const maxAllowed =
        parseFloat(item.claimedamount || 0) + parseFloat(item.taxonly || 0);
      if (parseFloat(item.approvedamount) > maxAllowed) {
        Alert.alert(
          'Validation Error',
          `Row ${i + 1}: Approved amount should not be greater than Claimed amount + Tax.`
        );
        return;
      }
    }

    try {
      const approvePayload = lodgingList.map((item) => ({
        id: item.id,
        amount: parseFloat(item.approvedamount || 0),
        gst_no: item.vendorgstno || '',
        vendor_name: item.vendorname || '',
        invoice_no: item.invoiceno || '',
        invoice_date: item.invoicedate || '',
        vendor_code: item.vendorcode || '',
        vendor_address: item.address || '',
        hsn_code:
          typeof item.hsncode === 'object' ? item.hsncode?.code : item.hsncode || '996311',
        taxable_amount: parseFloat(item.taxableamount || 0),
        Cgst: item.cgst || 0,
        Sgst: item.sgst || 0,
        Igst: item.igst || 0,
        invoice_amount: item.invoiceamount || 0,
        bankacc_gstno: item.bankacc_gstno || '',
        roundoff_amount: item.roundoff_amount || '0.00',
        adjustment_amount: item.adjustment_amount || '0.00',
        itc_flag: item.itc_flag ? 1 : 0,
      }));

      const res = await approveLodging({
        tourId,
        payload: approvePayload,
      }).unwrap();

      if (res?.status === 'success' || res?.message === 'Success') {
        ToastMessage('Lodging expense approved successfully.');
        navigation.goBack();
      } else {
        Alert.alert('Approval Error', res?.description || 'Approval failed.');
      }
    } catch (err) {
      Alert.alert(
        'Approval Error',
        err?.data?.message || err?.data?.description || 'Approval request failed.'
      );
    }
  };

  /* ============================================================================
   * RENDER LODGING STAY CARD
   * ========================================================================== */

  const renderLodgingCard = (item, index) => {
    const isExpanded = item.isExpanded;
    const isRowEditable = isGloballyEditable || !item.id;
    // canDeleteRow is now true for maker even with 1 card so it can be deleted/cleared
    const canDeleteRow = !approver;

    // Header title: Does NOT show "Mangalore" as title
    const isCityMangalore = (item.city || '').trim().toLowerCase() === 'mangalore';
    const cardTitle =
      item.hotel_name && item.hotel_name.trim()
        ? item.hotel_name
        : item.city && !isCityMangalore && item.city.trim()
          ? item.city
          : `Lodging #${index + 1}`;

    return (
      <View
        key={item.tempId || item.id || index}
        style={[
          screenStyles.cardContainer,
          {
            backgroundColor: CustomColors.cardBackground,
            borderColor: CustomColors.borderLight,
          },
        ]}
      >
        {/* Accordion Header - Mangalore is not shown here */}
        <TouchableOpacity
          style={[
            screenStyles.cardHeader,
            {
              backgroundColor: isDark
                ? CustomColors.backgroundLightGray
                : CustomColors.appThemeColor + '12',
              borderBottomColor: CustomColors.borderLight,
            },
          ]}
          onPress={() => toggleAccordion(index)}
          activeOpacity={0.8}
        >
          <View style={screenStyles.cardHeaderLeft}>
            <View
              style={[
                screenStyles.indexBadge,
                { backgroundColor: CustomColors.appThemeColor },
              ]}
            >
              <Text allowFontScaling={false} style={screenStyles.indexBadgeText}>
                {index + 1}
              </Text>
            </View>
            <View style={{ marginLeft: horizontalScale(10), flex: 1 }}>
              <Text
                allowFontScaling={false}
                style={[
                  screenStyles.cardHeaderTitle,
                  { color: CustomColors.textDark },
                ]}
                numberOfLines={1}
              >
                {cardTitle}
              </Text>
              <Text
                allowFontScaling={false}
                style={[
                  screenStyles.cardHeaderSub,
                  { color: CustomColors.textGray },
                ]}
              >
                {formatDateDisplay(item.fromdate)} to{' '}
                {formatDateDisplay(item.todate)} • Claim: ₹
                {item.claimedamount || '0'}
              </Text>
            </View>
          </View>

          <View style={screenStyles.cardHeaderRight}>
            {canDeleteRow && (
              <TouchableOpacity
                onPress={() => handleRemoveSection(index)}
                style={screenStyles.deleteIconButton}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={moderateScale(24)}
                  color={CustomColors.dangerRed}
                />
              </TouchableOpacity>
            )}
            <MaterialIcons
              name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={moderateScale(26)}
              color={CustomColors.textDark}
            />
          </View>
        </TouchableOpacity>

        {/* Card Body - "Stay Details" subheader is removed per user request */}
        {isExpanded && (
          <View style={screenStyles.cardBody}>
            {/* City (Defaults to Mangalore and triggers dropdown search on press) */}
            <View style={screenStyles.formFieldGroup}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: verticalScale(6),
                }}
              >
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark, marginBottom: 0 }]}
                >
                  City <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                {isGloballyEditable && (
                  <TouchableOpacity
                    style={[
                      screenStyles.addStayCityHeaderBtn,
                      { backgroundColor: '#00875A' },
                    ]}
                    onPress={handleAddSection}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add" size={moderateScale(18)} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  screenStyles.pickerTrigger,
                  {
                    borderColor: CustomColors.borderGray,
                    backgroundColor: isRowEditable
                      ? CustomColors.backgroundWhite
                      : CustomColors.borderLight,
                  },
                ]}
                onPress={() => openCitySearch(index)}
                disabled={!isRowEditable}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    screenStyles.pickerTriggerText,
                    { color: CustomColors.textDark },
                  ]}
                >
                  {item.city || 'Mangalore'}
                </Text>
                <MaterialIcons
                  name="arrow-drop-down"
                  size={moderateScale(24)}
                  color={CustomColors.textGray}
                />
              </TouchableOpacity>
            </View>

            {/* Center Classification */}
            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Center Classification{' '}
                <Text style={{ color: CustomColors.dangerRed }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  screenStyles.pickerTrigger,
                  {
                    borderColor: CustomColors.borderGray,
                    backgroundColor: isRowEditable
                      ? CustomColors.backgroundWhite
                      : CustomColors.borderLight,
                  },
                ]}
                onPress={() => openClassificationPicker(index)}
                disabled={!isRowEditable}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    screenStyles.pickerTriggerText,
                    {
                      color: item.centreclassification
                        ? CustomColors.textDark
                        : CustomColors.textLightGray,
                    },
                  ]}
                >
                  {centerList.find(
                    (c) => String(c.value) === String(item.centreclassification)
                  )?.name ||
                    item.centreclassification ||
                    'Select Classification'}
                </Text>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={moderateScale(20)}
                  color={CustomColors.textGray}
                />
              </TouchableOpacity>
            </View>

            {/* Place of Actual Stay */}
            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Place of Actual Stay{' '}
                <Text style={{ color: CustomColors.dangerRed }}>*</Text>
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor: isRowEditable
                      ? CustomColors.backgroundWhite
                      : CustomColors.borderLight,
                  },
                ]}
                value={item.placeofactualstay}
                onChangeText={(val) =>
                  updateItemField(index, 'placeofactualstay', val)
                }
                placeholder="Enter Place of Stay"
                placeholderTextColor={CustomColors.textLightGray}
                editable={isRowEditable}
              />
            </View>

            {/* Hotel Name */}
            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Hotel Name <Text style={{ color: CustomColors.dangerRed }}>*</Text>
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor: isRowEditable
                      ? CustomColors.backgroundWhite
                      : CustomColors.borderLight,
                  },
                ]}
                value={item.hotel_name}
                onChangeText={(val) => updateItemField(index, 'hotel_name', val)}
                placeholder="Enter Hotel Name"
                placeholderTextColor={CustomColors.textLightGray}
                editable={isRowEditable}
              />
            </View>

            {/* Check-in & Check-out Section */}
            <Text
              allowFontScaling={false}
              style={[
                screenStyles.sectionTitle,
                { color: CustomColors.appThemeColor, marginTop: verticalScale(14) },
              ]}
            >
              Check-in & Check-out
            </Text>

            <View style={screenStyles.rowFields}>
              {/* Check-in Date (Custom Year Picker) */}
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Check-in Date <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    screenStyles.pickerTrigger,
                    {
                      borderColor: CustomColors.borderGray,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  onPress={() => openCustomDatePicker(index, 'fromdate')}
                  disabled={!isRowEditable}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.pickerTriggerText,
                      {
                        color: item.fromdate
                          ? CustomColors.textDark
                          : CustomColors.textLightGray,
                      },
                    ]}
                  >
                    {formatDateDisplay(item.fromdate) || 'DD-MM-YYYY'}
                  </Text>
                  <MaterialIcons
                    name="calendar-today"
                    size={moderateScale(18)}
                    color={CustomColors.textGray}
                  />
                </TouchableOpacity>
              </View>

              {/* Check-in Time */}
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Check-in Time <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    screenStyles.pickerTrigger,
                    {
                      borderColor: CustomColors.borderGray,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  onPress={() => openTimePicker(index, 'fromtime')}
                  disabled={!isRowEditable}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.pickerTriggerText,
                      { color: CustomColors.textDark },
                    ]}
                  >
                    {item.fromtime || '06:00'}
                  </Text>
                  <MaterialIcons
                    name="access-time"
                    size={moderateScale(18)}
                    color={CustomColors.textGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={screenStyles.rowFields}>
              {/* Check-out Date (Custom Year Picker) */}
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Check-out Date <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    screenStyles.pickerTrigger,
                    {
                      borderColor: CustomColors.borderGray,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  onPress={() => openCustomDatePicker(index, 'todate')}
                  disabled={!isRowEditable}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.pickerTriggerText,
                      {
                        color: item.todate
                          ? CustomColors.textDark
                          : CustomColors.textLightGray,
                      },
                    ]}
                  >
                    {formatDateDisplay(item.todate) || 'DD-MM-YYYY'}
                  </Text>
                  <MaterialIcons
                    name="calendar-today"
                    size={moderateScale(18)}
                    color={CustomColors.textGray}
                  />
                </TouchableOpacity>
              </View>

              {/* Check-out Time */}
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Check-out Time <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    screenStyles.pickerTrigger,
                    {
                      borderColor: CustomColors.borderGray,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  onPress={() => openTimePicker(index, 'totime')}
                  disabled={!isRowEditable}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.pickerTriggerText,
                      { color: CustomColors.textDark },
                    ]}
                  >
                    {item.totime || '20:00'}
                  </Text>
                  <MaterialIcons
                    name="access-time"
                    size={moderateScale(18)}
                    color={CustomColors.textGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={screenStyles.rowFields}>
              {/* No of Days */}
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  No of Days <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.noofdays || '')}
                  onChangeText={(val) => updateItemField(index, 'noofdays', val)}
                  keyboardType="numeric"
                  editable={isRowEditable}
                />
              </View>

              {/* No of Persons Shared */}
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Persons Shared <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.no_of_person_shared || '')}
                  onChangeText={(val) =>
                    updateItemField(index, 'no_of_person_shared', val)
                  }
                  keyboardType="numeric"
                  editable={isRowEditable}
                />
              </View>
            </View>

            {/* Persons Sharing Chips (If > 1) */}
            {Number(item.no_of_person_shared) > 1 && (
              <View
                style={[
                  screenStyles.sharedPersonBox,
                  {
                    backgroundColor: isDark
                      ? CustomColors.backgroundLightGray
                      : CustomColors.appliteThemecolor + '15',
                    borderColor: CustomColors.borderLight,
                  },
                ]}
              >
                <View style={screenStyles.sharedPersonHeader}>
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.sharedPersonTitle,
                      { color: CustomColors.appThemeColor },
                    ]}
                  >
                    Shared Persons ({item.person_name?.length || 0})
                  </Text>
                  {isRowEditable && (
                    <TouchableOpacity
                      style={[
                        screenStyles.addPersonButton,
                        { backgroundColor: CustomColors.appThemeColor },
                      ]}
                      onPress={() => openAddPersonModal(index)}
                    >
                      <MaterialIcons
                        name="add"
                        size={moderateScale(16)}
                        color={CustomColors.white}
                      />
                      <Text
                        allowFontScaling={false}
                        style={screenStyles.addPersonButtonText}
                      >
                        Add Person
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {item.person_name && item.person_name.length > 0 ? (
                  <View style={screenStyles.chipsContainer}>
                    {item.person_name.map((p, pIdx) => (
                      <View
                        key={p.id || pIdx}
                        style={[
                          screenStyles.personChip,
                          {
                            backgroundColor: CustomColors.cardBackground,
                            borderColor: CustomColors.borderGray,
                          },
                        ]}
                      >
                        <Text
                          allowFontScaling={false}
                          style={[
                            screenStyles.personChipText,
                            { color: CustomColors.textDark },
                          ]}
                        >
                          {p.name}
                        </Text>
                        {isRowEditable && (
                          <View style={{ flexDirection: 'row', marginLeft: 6 }}>
                            <TouchableOpacity
                              onPress={() =>
                                openEditPersonModal(index, pIdx, p.name)
                              }
                              style={{ marginRight: 6 }}
                            >
                              <MaterialIcons
                                name="edit"
                                size={moderateScale(14)}
                                color={CustomColors.appThemeColor}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removePerson(index, pIdx)}
                            >
                              <MaterialIcons
                                name="close"
                                size={moderateScale(15)}
                                color={CustomColors.dangerRed}
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.noPersonsText,
                      { color: CustomColors.textGray },
                    ]}
                  >
                    No persons added yet. Click &quot;Add Person&quot; above.
                  </Text>
                )}
              </View>
            )}

            {/* Accommodation & Bill Section */}
            <Text
              allowFontScaling={false}
              style={[
                screenStyles.sectionTitle,
                { color: CustomColors.appThemeColor, marginTop: verticalScale(14) },
              ]}
            >
              Accommodation & Bill Details
            </Text>

            <View style={screenStyles.rowFields}>
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Acc By Bank
                </Text>
                <TouchableOpacity
                  style={[
                    screenStyles.pickerTrigger,
                    {
                      borderColor: CustomColors.borderGray,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  onPress={() => openAccByBankPicker(index)}
                  disabled={!isRowEditable}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.pickerTriggerText,
                      { color: CustomColors.textDark },
                    ]}
                  >
                    {item.accbybank === '1' ? 'Yes' : 'No'}
                  </Text>
                  <MaterialIcons
                    name="keyboard-arrow-down"
                    size={moderateScale(20)}
                    color={CustomColors.textGray}
                  />
                </TouchableOpacity>
              </View>

              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Bill Available <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    screenStyles.pickerTrigger,
                    {
                      borderColor: CustomColors.borderGray,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  onPress={() => openBillAvailablePicker(index)}
                  disabled={!isRowEditable}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.pickerTriggerText,
                      { color: CustomColors.textDark },
                    ]}
                  >
                    {item.billavailable === '1' ? 'Yes' : 'No'}
                  </Text>
                  <MaterialIcons
                    name="keyboard-arrow-down"
                    size={moderateScale(20)}
                    color={CustomColors.textGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {item.accbybank === '1' && (
              <View style={screenStyles.formFieldGroup}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Accommodation Ref No
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  value={item.acrefno}
                  onChangeText={(val) => updateItemField(index, 'acrefno', val)}
                  placeholder="Enter Accommodation Ref No"
                  placeholderTextColor={CustomColors.textLightGray}
                  editable={isRowEditable}
                />
              </View>
            )}

            {item.billavailable === '1' && (
              <View style={screenStyles.formFieldGroup}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Bill Number <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  value={item.billnumber}
                  onChangeText={(val) => updateItemField(index, 'billnumber', val)}
                  placeholder="Enter Bill Number"
                  placeholderTextColor={CustomColors.textLightGray}
                  editable={isRowEditable}
                />
              </View>
            )}

            <View style={screenStyles.rowFields}>
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Total Bill Amount{' '}
                  <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.totalbillamount || '')}
                  onChangeText={(val) =>
                    updateItemField(index, 'totalbillamount', val)
                  }
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={CustomColors.textLightGray}
                  editable={isRowEditable}
                />
              </View>

              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Claim Amount{' '}
                  <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.claimedamount || '')}
                  onChangeText={(val) => {
                    updateItemField(index, 'claimedamount', val);
                    if (!item.taxableamount) {
                      updateItemField(index, 'taxableamount', val);
                      runGstCalc(index, { taxableamount: val });
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={CustomColors.textLightGray}
                  editable={isRowEditable}
                />
              </View>
            </View>

            <View style={screenStyles.rowFields}>
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Per Day Room Rent
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderLight,
                      color: CustomColors.textDark,
                      backgroundColor: CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.per_day_rent || '0')}
                  editable={false}
                />
              </View>

              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Eligible Amount
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderLight,
                      color: CustomColors.appThemeColor,
                      backgroundColor: CustomColors.borderLight,
                      fontFamily: Fonts.bold,
                    },
                  ]}
                  value={String(item.eligibleamount || '0')}
                  editable={false}
                />
              </View>
            </View>

            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Tax Only (Luxury & Service){' '}
                <Text style={{ color: CustomColors.dangerRed }}>*</Text>
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor: isRowEditable
                      ? CustomColors.backgroundWhite
                      : CustomColors.borderLight,
                  },
                ]}
                value={String(item.taxonly || '')}
                onChangeText={(val) => updateItemField(index, 'taxonly', val)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={CustomColors.textLightGray}
                editable={isRowEditable}
              />
            </View>

            {/* GST & Invoice Details */}
            <Text
              allowFontScaling={false}
              style={[
                screenStyles.sectionTitle,
                { color: CustomColors.appThemeColor, marginTop: verticalScale(14) },
              ]}
            >
              GST & Invoice Details
            </Text>

            <View style={screenStyles.rowFields}>
              {/* Invoice Date */}
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Invoice Date
                </Text>
                <TouchableOpacity
                  style={[
                    screenStyles.pickerTrigger,
                    {
                      borderColor: CustomColors.borderGray,
                      backgroundColor:
                        applevel !== 1
                          ? CustomColors.backgroundWhite
                          : CustomColors.borderLight,
                    },
                  ]}
                  onPress={() => openCustomDatePicker(index, 'invoicedate')}
                  disabled={applevel === 1}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.pickerTriggerText,
                      {
                        color: item.invoicedate
                          ? CustomColors.textDark
                          : CustomColors.textLightGray,
                      },
                    ]}
                  >
                    {formatDateDisplay(item.invoicedate) || 'DD-MM-YYYY'}
                  </Text>
                  <MaterialIcons
                    name="calendar-today"
                    size={moderateScale(18)}
                    color={CustomColors.textGray}
                  />
                </TouchableOpacity>
              </View>

              {/* Invoice Number */}
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Invoice No
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor:
                        applevel !== 1
                          ? CustomColors.backgroundWhite
                          : CustomColors.borderLight,
                    },
                  ]}
                  value={item.invoiceno}
                  onChangeText={(val) => updateItemField(index, 'invoiceno', val)}
                  placeholder="Enter Invoice No"
                  placeholderTextColor={CustomColors.textLightGray}
                  editable={applevel !== 1}
                />
              </View>
            </View>

            {/* Branch GST & Bank GST (Permanently visible and editable without erasing issues) */}
            <View style={screenStyles.rowFields}>
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Branch GST No
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor: isRowEditable
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                    },
                  ]}
                  value={
                    item.bankgstno !== undefined
                      ? String(item.bankgstno)
                      : String(branchGst || permanentBranchGst)
                  }
                  onChangeText={(val) => {
                    updateItemField(index, 'bankgstno', val);
                    runGstCalc(index, { bankgstno: val });
                  }}
                  placeholder="Branch GST"
                  placeholderTextColor={CustomColors.textLightGray}
                  editable={isRowEditable}
                  autoCapitalize="characters"
                />
              </View>

              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Bank GST No
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    allowFontScaling={false}
                    style={[
                      screenStyles.textInput,
                      {
                        flex: 1,
                        borderColor: CustomColors.borderGray,
                        color: CustomColors.textDark,
                        backgroundColor: isRowEditable
                          ? CustomColors.backgroundWhite
                          : CustomColors.borderLight,
                      },
                    ]}
                    value={String(item.bankacc_gstno || '')}
                    onChangeText={(val) => {
                      updateItemField(index, 'bankacc_gstno', val);
                      runGstCalc(index, { bankacc_gstno: val });
                    }}
                    placeholder="Bank GST No"
                    placeholderTextColor={CustomColors.textLightGray}
                    editable={isRowEditable}
                    autoCapitalize="characters"
                  />
                  {isRowEditable && (
                    <TouchableOpacity
                      style={screenStyles.dropdownInlineIcon}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      onPress={() => openBankGstPicker(index)}
                    >
                      <MaterialIcons
                        name="arrow-drop-down"
                        size={moderateScale(24)}
                        color={CustomColors.textGray}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Lodge GST with Validate Button (Automatically patches details) */}
            <View style={screenStyles.formFieldGroup}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: verticalScale(6),
                }}
              >
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark, marginBottom: 0 }]}
                >
                  Lodge GST No
                </Text>
                {isRowEditable && (
                  <TouchableOpacity
                    onPress={() => {
                      updateItemField(index, 'vendorgstno', PERMANENT_LODGE_GST);
                      runGstCalc(index, { vendorgstno: PERMANENT_LODGE_GST });
                      ToastMessage('Fetched ' + PERMANENT_LODGE_GST + ' into Lodge GST');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: horizontalScale(8),
                      paddingVertical: verticalScale(3),
                      borderRadius: moderateScale(4),
                      backgroundColor: CustomColors.primaryLight,
                      borderWidth: 1,
                      borderColor: CustomColors.appThemeColor,
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="content-copy"
                      size={moderateScale(12)}
                      color={CustomColors.appThemeColor}
                    />
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontSize: moderateScale(11),
                        color: CustomColors.appThemeColor,
                        fontFamily: Fonts.bold,
                        marginLeft: 4,
                      }}
                    >
                      Fetch Lodge GST
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      flex: 1,
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor:
                        applevel !== 1
                          ? CustomColors.backgroundWhite
                          : CustomColors.borderLight,
                      textTransform: 'uppercase',
                    },
                  ]}
                  value={
                    item.vendorgstno !== undefined && item.vendorgstno !== ''
                      ? item.vendorgstno
                      : PERMANENT_LODGE_GST
                  }
                  onChangeText={(val) => {
                    const upper = val.toUpperCase();
                    updateItemField(index, 'vendorgstno', upper);
                  }}
                  onBlur={() => runGstCalc(index)}
                  placeholder={PERMANENT_LODGE_GST}
                  placeholderTextColor={CustomColors.textLightGray}
                  editable={applevel !== 1}
                  autoCapitalize="characters"
                  maxLength={15}
                />
                {isRowEditable && (
                  <TouchableOpacity
                    style={[
                      screenStyles.validateButton,
                      { backgroundColor: CustomColors.appThemeColor },
                    ]}
                    onPress={() => handleValidateGst(index)}
                    disabled={isValidatingGst}
                  >
                    {isValidatingGst ? (
                      <ActivityIndicator size="small" color={CustomColors.white} />
                    ) : (
                      <Text
                        allowFontScaling={false}
                        style={screenStyles.validateButtonText}
                      >
                        Validate
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Vendor Name */}
            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Vendor Name
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  screenStyles.multilineInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor:
                      !item.vendorgstno && applevel !== 1
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                  },
                ]}
                value={item.vendorname}
                onChangeText={(val) => updateItemField(index, 'vendorname', val)}
                placeholder="Vendor Name"
                placeholderTextColor={CustomColors.textLightGray}
                editable={!item.vendorgstno && applevel !== 1}
                multiline={true}
                scrollEnabled={false}
              />
            </View>

            {/* Vendor Code */}
            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Vendor Code
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor:
                      !item.vendorgstno && applevel !== 1
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                  },
                ]}
                value={item.vendorcode}
                onChangeText={(val) => updateItemField(index, 'vendorcode', val)}
                placeholder="Vendor Code"
                placeholderTextColor={CustomColors.textLightGray}
                editable={!item.vendorgstno && applevel !== 1}
              />
            </View>

            {/* Vendor Address (Full view, multiline, complete text displayed) */}
            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Vendor Address
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  screenStyles.addressInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor:
                      !item.vendorgstno && applevel !== 1
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                  },
                ]}
                value={item.address}
                onChangeText={(val) => updateItemField(index, 'address', val)}
                placeholder="Vendor Address"
                placeholderTextColor={CustomColors.textLightGray}
                editable={!item.vendorgstno && applevel !== 1}
                multiline={true}
                numberOfLines={3}
                scrollEnabled={false}
                textAlignVertical="top"
              />
            </View>

            {/* HSN Code (Searchable Modal / Dropdown) */}
            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                HSN Code
              </Text>
              <TouchableOpacity
                style={[
                  screenStyles.pickerTrigger,
                  {
                    borderColor: CustomColors.borderGray,
                    backgroundColor:
                      applevel !== 1
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                  },
                ]}
                onPress={() => openHsnSearch(index)}
                disabled={applevel === 1}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    screenStyles.pickerTriggerText,
                    {
                      color: item.hsncode
                        ? CustomColors.textDark
                        : CustomColors.textLightGray,
                    },
                  ]}
                >
                  {item.hsncode
                    ? `${item.hsncode.code || item.hsncode} - ${item.hsncode.igstrate ?? 12
                    }%`
                    : '996311 - 12%'}
                </Text>
                <MaterialIcons
                  name="arrow-drop-down"
                  size={moderateScale(24)}
                  color={CustomColors.textGray}
                />
              </TouchableOpacity>
            </View>

            {/* Taxable Amount */}
            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Taxable Amount
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor:
                      applevel !== 1
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                  },
                ]}
                value={String(item.taxableamount || '')}
                onChangeText={(val) => {
                  updateItemField(index, 'taxableamount', val);
                  runGstCalc(index, { taxableamount: val });
                }}
                onBlur={() => runGstCalc(index)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={CustomColors.textLightGray}
                editable={applevel !== 1}
              />
            </View>

            {/* CGST, SGST, IGST breakdown */}
            <View style={screenStyles.rowFields}>
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 4 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  CGST
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderLight,
                      color: CustomColors.textDark,
                      backgroundColor: CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.cgst || 0)}
                  editable={false}
                />
              </View>

              <View style={[screenStyles.formFieldGroup, { flex: 1, marginHorizontal: 4 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  SGST
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderLight,
                      color: CustomColors.textDark,
                      backgroundColor: CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.sgst || 0)}
                  editable={false}
                />
              </View>

              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 4 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  IGST
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderLight,
                      color: CustomColors.textDark,
                      backgroundColor: CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.igst || 0)}
                  editable={false}
                />
              </View>
            </View>

            {/* Invoice Amount, Rounding Off, Adjustment */}
            <View style={screenStyles.rowFields}>
              <View style={[screenStyles.formFieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Invoice Amount
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderLight,
                      color: CustomColors.appThemeColor,
                      backgroundColor: CustomColors.borderLight,
                      fontFamily: Fonts.bold,
                    },
                  ]}
                  value={String(item.invoiceamount || 0)}
                  editable={false}
                />
              </View>

              <View style={[screenStyles.formFieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text
                  allowFontScaling={false}
                  style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                >
                  Rounding Off
                </Text>
                <TextInput
                  allowFontScaling={false}
                  style={[
                    screenStyles.textInput,
                    {
                      borderColor: CustomColors.borderGray,
                      color: CustomColors.textDark,
                      backgroundColor:
                        applevel !== 1
                          ? CustomColors.backgroundWhite
                          : CustomColors.borderLight,
                    },
                  ]}
                  value={String(item.roundoff_amount || '')}
                  onChangeText={(val) => {
                    updateItemField(index, 'roundoff_amount', val);
                    runGstCalc(index, { roundoff_amount: val });
                  }}
                  onBlur={() => runGstCalc(index)}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={CustomColors.textLightGray}
                  editable={applevel !== 1}
                />
              </View>
            </View>

            <View style={screenStyles.formFieldGroup}>
              <Text
                allowFontScaling={false}
                style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
              >
                Adjustment Amount
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor:
                      applevel !== 1
                        ? CustomColors.backgroundWhite
                        : CustomColors.borderLight,
                  },
                ]}
                value={String(item.adjustment_amount || '')}
                onChangeText={(val) => {
                  updateItemField(index, 'adjustment_amount', val);
                  runGstCalc(index, { adjustment_amount: val });
                }}
                onBlur={() => runGstCalc(index)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={CustomColors.textLightGray}
                editable={applevel !== 1}
              />
            </View>

            {/* Approver Fields */}
            {approver && applevel === 2 && (
              <View
                style={[
                  screenStyles.approverBox,
                  {
                    backgroundColor: isDark
                      ? CustomColors.backgroundLightGray
                      : CustomColors.appThemeColor + '10',
                    borderColor: CustomColors.appThemeColor,
                  },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    screenStyles.sectionTitle,
                    { color: CustomColors.appThemeColor },
                  ]}
                >
                  Approver Section
                </Text>

                <View style={screenStyles.formFieldGroup}>
                  <Text
                    allowFontScaling={false}
                    style={[screenStyles.fieldLabel, { color: CustomColors.textDark }]}
                  >
                    Approved Amount (Incl. Tax){' '}
                    <Text style={{ color: CustomColors.dangerRed }}>*</Text>
                  </Text>
                  <TextInput
                    allowFontScaling={false}
                    style={[
                      screenStyles.textInput,
                      {
                        borderColor: CustomColors.borderGray,
                        color: CustomColors.textDark,
                        backgroundColor:
                          statusid <= 2
                            ? CustomColors.backgroundWhite
                            : CustomColors.borderLight,
                        fontFamily: Fonts.bold,
                      },
                    ]}
                    value={String(item.approvedamount || '')}
                    onChangeText={(val) =>
                      updateItemField(index, 'approvedamount', val)
                    }
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={CustomColors.textLightGray}
                    editable={statusid <= 2}
                  />
                </View>

                {statusid === 2 && (
                  <View style={screenStyles.itcRow}>
                    <Text
                      allowFontScaling={false}
                      style={[
                        screenStyles.fieldLabel,
                        { color: CustomColors.textDark, marginBottom: 0 },
                      ]}
                    >
                      Eligible for ITC (Input Tax Credit)
                    </Text>
                    <Switch
                      value={Boolean(item.itc_flag)}
                      onValueChange={(val) =>
                        updateItemField(index, 'itc_flag', val ? 1 : 0)
                      }
                      trackColor={{
                        false: CustomColors.lightGray,
                        true: CustomColors.appThemeColor,
                      }}
                      thumbColor={CustomColors.white}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  /* ============================================================================
   * SCREEN RENDER
   * ========================================================================== */

  return (
    <SafeAreaView
      style={[
        screenStyles.safeArea,
        { backgroundColor: CustomColors.appScreenColor },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={screenStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TOUR DETAILS CARD (Matching Screenshot) */}
          <View
            style={[
              screenStyles.tourDetailsCard,
              {
                backgroundColor: CustomColors.cardBackground,
                borderColor: CustomColors.borderLight,
              },
            ]}
          >
            {/* Tour Details Header */}
            <View style={screenStyles.tourDetailsHeaderRow}>
              <Text
                allowFontScaling={false}
                style={[
                  screenStyles.tourDetailsHeading,
                  { color: CustomColors.textDark },
                ]}
              >
                Tour Details
              </Text>
            </View>

            {/* 5 Non-editable fields formatted in paragraph/card boxes */}
            <View style={screenStyles.tourFieldsGrid}>
              {/* Tour No */}
              <View style={[screenStyles.tourFieldBlock, { width: '48%' }]}>
                <Text allowFontScaling={false} style={screenStyles.tourFieldLabel}>
                  Tour No*
                </Text>
                <View style={[screenStyles.tourFieldValueBox, { backgroundColor: CustomColors.borderLight }]}>
                  <Text allowFontScaling={false} style={[screenStyles.tourFieldValueText, { color: CustomColors.textDark }]} numberOfLines={1}>
                    {tourreq_no || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Employee Name */}
              <View style={[screenStyles.tourFieldBlock, { width: '48%' }]}>
                <Text allowFontScaling={false} style={screenStyles.tourFieldLabel}>
                  Employee Name*
                </Text>
                <View style={[screenStyles.tourFieldValueBox, { backgroundColor: CustomColors.borderLight }]}>
                  <Text allowFontScaling={false} style={[screenStyles.tourFieldValueText, { color: CustomColors.textDark }]} numberOfLines={1}>
                    ({employeeCode || 'empl'}) {employeeName || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Designation */}
              <View style={[screenStyles.tourFieldBlock, { width: '48%' }]}>
                <Text allowFontScaling={false} style={screenStyles.tourFieldLabel}>
                  Designation*
                </Text>
                <View style={[screenStyles.tourFieldValueBox, { backgroundColor: CustomColors.borderLight }]}>
                  <Text allowFontScaling={false} style={[screenStyles.tourFieldValueText, { color: CustomColors.textDark }]} numberOfLines={1}>
                    {employeeDesignation || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Employee Grade */}
              <View style={[screenStyles.tourFieldBlock, { width: '48%' }]}>
                <Text allowFontScaling={false} style={screenStyles.tourFieldLabel}>
                  Employee Grade*
                </Text>
                <View style={[screenStyles.tourFieldValueBox, { backgroundColor: CustomColors.borderLight }]}>
                  <Text allowFontScaling={false} style={[screenStyles.tourFieldValueText, { color: CustomColors.textDark }]} numberOfLines={1}>
                    {employeeGrade || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Gender */}
              <View style={[screenStyles.tourFieldBlock, { width: '48%' }]}>
                <Text allowFontScaling={false} style={screenStyles.tourFieldLabel}>
                  Gender*
                </Text>
                <View style={[screenStyles.tourFieldValueBox, { backgroundColor: CustomColors.borderLight }]}>
                  <Text allowFontScaling={false} style={[screenStyles.tourFieldValueText, { color: CustomColors.textDark }]} numberOfLines={1}>
                    {gender || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>



          {/* Loader or Stays List */}
          {isFetchingLodging ? (
            <View style={screenStyles.loaderContainer}>
              <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
              <Text
                allowFontScaling={false}
                style={[screenStyles.loaderText, { color: CustomColors.textGray }]}
              >
                Loading Lodging Expenses...
              </Text>
            </View>
          ) : lodgingList.length === 0 ? (
            <View
              style={[
                screenStyles.emptyStaysContainer,
                {
                  backgroundColor: CustomColors.cardBackground,
                  borderColor: CustomColors.borderLight,
                },
              ]}
            >
              <MaterialIcons
                name="hotel"
                size={moderateScale(44)}
                color={CustomColors.textLightGray}
              />
              <Text
                allowFontScaling={false}
                style={[
                  screenStyles.emptyStaysText,
                  { color: CustomColors.textDark },
                ]}
              >
                No lodging stays added.
              </Text>
              {isGloballyEditable && (
                <TouchableOpacity
                  style={[
                    screenStyles.addFirstStayBtn,
                    { backgroundColor: '#00875A' },
                  ]}
                  onPress={handleAddSection}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="add" size={moderateScale(18)} color="#FFF" />
                  <Text
                    allowFontScaling={false}
                    style={screenStyles.addFirstStayBtnText}
                  >
                    Add Lodging Stay
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            lodgingList.map((item, index) => renderLodgingCard(item, index))
          )}
        </ScrollView>

        {/* Bottom Floating Action Buttons */}
        <View
          style={[
            screenStyles.bottomBar,
            {
              backgroundColor: CustomColors.cardBackground,
              borderTopColor: CustomColors.borderLight,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              screenStyles.backButton,
              {
                borderColor: CustomColors.borderGray,
                backgroundColor: '#6c757d',
              },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text allowFontScaling={false} style={[screenStyles.backButtonText, { color: '#FFF' }]}>
              Back
            </Text>
          </TouchableOpacity>

          {!approver && (
            <TouchableOpacity
              style={[
                screenStyles.submitButton,
                { backgroundColor: '#00875A' },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text allowFontScaling={false} style={screenStyles.submitButtonText}>
                  Submit
                </Text>
              )}
            </TouchableOpacity>
          )}

          {approver && applevel === 2 && statusid === 2 && (
            <TouchableOpacity
              style={[
                screenStyles.submitButton,
                { backgroundColor: CustomColors.successGreen },
              ]}
              onPress={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text allowFontScaling={false} style={screenStyles.submitButtonText}>
                  Approve
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ======================================================================
       * 1. GENERIC ACTION SHEET PICKER
       * ==================================================================== */}
      <CustomActionSheetPicker
        pickerStatus={isActionSheetOpen}
        setPickerStatus={setIsActionSheetOpen}
        title={activePicker?.title || 'Select Option'}
        optionsData={activePicker?.options || []}
        RenderItem={ActionSheetDropdownItem}
        onPress={handleActionSheetSelect}
        selected={activePicker?.selected}
        onSearch={activePicker?.type === 'bankacc_gstno' ? handleBankGstPickerSearch : undefined}
      />

      {/* ======================================================================
       * 2. CITY SEARCH MODAL
       * ==================================================================== */}
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <SafeAreaView
          style={[
            screenStyles.modalOverlay,
            { backgroundColor: CustomColors.backgroundtransparent },
          ]}
        >
          <View
            style={[
              screenStyles.modalCard,
              { backgroundColor: CustomColors.cardBackground },
            ]}
          >
            <View
              style={[
                screenStyles.modalHeader,
                { borderBottomColor: CustomColors.borderLight },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[screenStyles.modalTitle, { color: CustomColors.textDark }]}
              >
                Search & Select City
              </Text>
              <TouchableOpacity
                onPress={() => setCityModalVisible(false)}
                style={{ padding: 4 }}
              >
                <MaterialIcons
                  name="close"
                  size={moderateScale(24)}
                  color={CustomColors.textDark}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                screenStyles.modalSearchBox,
                {
                  borderColor: CustomColors.borderGray,
                  backgroundColor: CustomColors.backgroundWhite,
                },
              ]}
            >
              <MaterialIcons
                name="search"
                size={moderateScale(20)}
                color={CustomColors.textGray}
              />
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.modalSearchInput,
                  { color: CustomColors.textDark },
                ]}
                placeholder="Type city name..."
                placeholderTextColor={CustomColors.textLightGray}
                value={citySearchQuery}
                onChangeText={(text) => {
                  setCitySearchQuery(text);
                  triggerCitySearch(text);
                }}
                autoFocus={true}
              />
            </View>

            {isSearchingCity && (
              <ActivityIndicator
                size="small"
                color={CustomColors.appThemeColor}
                style={{ marginVertical: 10 }}
              />
            )}

            <FlatList
              data={cityResults}
              keyExtractor={(item, i) => String(item.id || item.city || i)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    screenStyles.modalListItem,
                    { borderBottomColor: CustomColors.borderLight },
                  ]}
                  onPress={() => selectCity(item.city || item.name)}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.modalListText,
                      { color: CustomColors.textDark },
                    ]}
                  >
                    {item.city || item.name}
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={moderateScale(20)}
                    color={CustomColors.textGray}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !isSearchingCity ? (
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.modalEmptyText,
                      { color: CustomColors.textGray },
                    ]}
                  >
                    No cities found.
                  </Text>
                ) : null
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ======================================================================
       * 3. HSN CODE SEARCH MODAL
       * ==================================================================== */}
      <Modal
        visible={hsnModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHsnModalVisible(false)}
      >
        <SafeAreaView
          style={[
            screenStyles.modalOverlay,
            { backgroundColor: CustomColors.backgroundtransparent },
          ]}
        >
          <View
            style={[
              screenStyles.modalCard,
              { backgroundColor: CustomColors.cardBackground },
            ]}
          >
            <View
              style={[
                screenStyles.modalHeader,
                { borderBottomColor: CustomColors.borderLight },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[screenStyles.modalTitle, { color: CustomColors.textDark }]}
              >
                Search & Select HSN Code
              </Text>
              <TouchableOpacity
                onPress={() => setHsnModalVisible(false)}
                style={{ padding: 4 }}
              >
                <MaterialIcons
                  name="close"
                  size={moderateScale(24)}
                  color={CustomColors.textDark}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                screenStyles.modalSearchBox,
                {
                  borderColor: CustomColors.borderGray,
                  backgroundColor: CustomColors.backgroundWhite,
                },
              ]}
            >
              <MaterialIcons
                name="search"
                size={moderateScale(20)}
                color={CustomColors.textGray}
              />
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.modalSearchInput,
                  { color: CustomColors.textDark },
                ]}
                placeholder="Type HSN code..."
                placeholderTextColor={CustomColors.textLightGray}
                value={hsnSearchQuery}
                onChangeText={(text) => {
                  setHsnSearchQuery(text);
                  triggerHsnSearch(text);
                }}
                autoFocus={true}
              />
            </View>

            {isSearchingHsn && (
              <ActivityIndicator
                size="small"
                color={CustomColors.appThemeColor}
                style={{ marginVertical: 10 }}
              />
            )}

            <FlatList
              data={hsnResults}
              keyExtractor={(item, i) => String(item.id || item.code || i)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    screenStyles.modalListItem,
                    { borderBottomColor: CustomColors.borderLight },
                  ]}
                  onPress={() => selectHsn(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      allowFontScaling={false}
                      style={[
                        screenStyles.modalListText,
                        { color: CustomColors.textDark, fontFamily: Fonts.bold },
                      ]}
                    >
                      {item.code}
                    </Text>
                    {item.description ? (
                      <Text
                        allowFontScaling={false}
                        style={{
                          fontSize: moderateScale(13),
                          color: CustomColors.textGray,
                        }}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      screenStyles.rateBadge,
                      { backgroundColor: CustomColors.primaryLight },
                    ]}
                  >
                    <Text
                      allowFontScaling={false}
                      style={{
                        color: CustomColors.appThemeColor,
                        fontFamily: Fonts.bold,
                        fontSize: moderateScale(13),
                      }}
                    >
                      {item.igstrate ?? 12}%
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !isSearchingHsn ? (
                  <Text
                    allowFontScaling={false}
                    style={[
                      screenStyles.modalEmptyText,
                      { color: CustomColors.textGray },
                    ]}
                  >
                    No HSN codes found.
                  </Text>
                ) : null
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ======================================================================
       * 4. TIME PICKER MODAL
       * ==================================================================== */}
      <Modal
        visible={timePickerConfig.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() =>
          setTimePickerConfig({
            visible: false,
            rowIndex: null,
            field: null,
            value: '06:00',
          })
        }
      >
        <TouchableOpacity
          style={[
            screenStyles.modalOverlay,
            { backgroundColor: CustomColors.backgroundtransparent },
          ]}
          activeOpacity={1}
          onPress={() =>
            setTimePickerConfig({
              visible: false,
              rowIndex: null,
              field: null,
              value: '06:00',
            })
          }
        >
          <View
            style={[
              screenStyles.timeModalCard,
              { backgroundColor: CustomColors.cardBackground },
            ]}
          >
            <View
              style={[
                screenStyles.modalHeader,
                { borderBottomColor: CustomColors.borderLight },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[screenStyles.modalTitle, { color: CustomColors.textDark }]}
              >
                Select {timePickerConfig.field === 'fromtime' ? 'Check-in' : 'Check-out'} Time
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setTimePickerConfig({
                    visible: false,
                    rowIndex: null,
                    field: null,
                    value: '06:00',
                  })
                }
                style={{ padding: 4 }}
              >
                <MaterialIcons
                  name="close"
                  size={moderateScale(24)}
                  color={CustomColors.textDark}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 320 }}
              contentContainerStyle={{ paddingVertical: 10 }}
            >
              <View style={screenStyles.timeGrid}>
                {TIME_SLOTS.map((t) => {
                  const isSelected = timePickerConfig.value === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        screenStyles.timeSlotButton,
                        {
                          backgroundColor: isSelected
                            ? CustomColors.appThemeColor
                            : CustomColors.cardBackground,
                          borderColor: isSelected
                            ? CustomColors.appThemeColor
                            : CustomColors.borderGray,
                        },
                      ]}
                      onPress={() => selectTime(t)}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          screenStyles.timeSlotText,
                          {
                            color: isSelected
                              ? CustomColors.white
                              : CustomColors.textDark,
                            fontFamily: isSelected ? Fonts.bold : Fonts.regular,
                          },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ======================================================================
       * 5. PERSON NAME ADD / EDIT MODAL
       * ==================================================================== */}
      <Modal
        visible={personModalConfig.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() =>
          setPersonModalConfig({
            visible: false,
            rowIndex: null,
            editingIndex: null,
            personNameText: '',
          })
        }
      >
        <KeyboardAvoidingView
          style={[
            screenStyles.modalOverlay,
            { backgroundColor: CustomColors.backgroundtransparent },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              screenStyles.personModalCard,
              { backgroundColor: CustomColors.cardBackground },
            ]}
          >
            <View
              style={[
                screenStyles.modalHeader,
                { borderBottomColor: CustomColors.borderLight },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[screenStyles.modalTitle, { color: CustomColors.textDark }]}
              >
                {personModalConfig.editingIndex !== null
                  ? 'Edit Person Name'
                  : 'Add Shared Person'}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setPersonModalConfig({
                    visible: false,
                    rowIndex: null,
                    editingIndex: null,
                    personNameText: '',
                  })
                }
                style={{ padding: 4 }}
              >
                <MaterialIcons
                  name="close"
                  size={moderateScale(24)}
                  color={CustomColors.textDark}
                />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              <Text
                allowFontScaling={false}
                style={[
                  screenStyles.fieldLabel,
                  { color: CustomColors.textDark, marginBottom: 8 },
                ]}
              >
                Full Name of Sharing Person
              </Text>
              <TextInput
                allowFontScaling={false}
                style={[
                  screenStyles.textInput,
                  {
                    borderColor: CustomColors.borderGray,
                    color: CustomColors.textDark,
                    backgroundColor: CustomColors.backgroundWhite,
                  },
                ]}
                placeholder="Enter person name"
                placeholderTextColor={CustomColors.textLightGray}
                value={personModalConfig.personNameText}
                onChangeText={(text) =>
                  setPersonModalConfig((prev) => ({
                    ...prev,
                    personNameText: text,
                  }))
                }
                autoFocus={true}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  marginTop: 20,
                }}
              >
                <TouchableOpacity
                  style={[
                    screenStyles.modalCancelButton,
                    { borderColor: CustomColors.borderGray },
                  ]}
                  onPress={() =>
                    setPersonModalConfig({
                      visible: false,
                      rowIndex: null,
                      editingIndex: null,
                      personNameText: '',
                    })
                  }
                >
                  <Text
                    allowFontScaling={false}
                    style={{
                      color: CustomColors.textDark,
                      fontSize: moderateScale(14),
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    screenStyles.modalSaveButton,
                    { backgroundColor: CustomColors.appThemeColor },
                  ]}
                  onPress={savePersonName}
                >
                  <Text
                    allowFontScaling={false}
                    style={screenStyles.modalSaveButtonText}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================================
       * 6. CUSTOM FULL YEAR-SELECTION DATE PICKER MODAL
       * ==================================================================== */}
      <CustomDatePickerModal
        visible={customDatePickerConfig.visible}
        initialDate={customDatePickerConfig.initialDate}
        onClose={() =>
          setCustomDatePickerConfig({
            visible: false,
            rowIndex: null,
            field: null,
            initialDate: '',
          })
        }
        onConfirm={handleCustomDateConfirm}
      />
    </SafeAreaView>
  );
};

/* ============================================================================
 * STYLES
 * ========================================================================== */

const screenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(14),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(100),
  },

  /* TOUR DETAILS CARD */
  tourDetailsCard: {
    borderRadius: moderateScale(12),
    borderWidth: 1,
    padding: moderateScale(14),
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tourDetailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  tourDetailsHeading: {
    fontSize: moderateScale(18),
    fontFamily: Fonts.bold,
  },
  greenPlusBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  tourFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tourFieldBlock: {
    marginBottom: verticalScale(10),
  },
  tourFieldLabel: {
    fontSize: moderateScale(12),
    color: '#666',
    marginBottom: verticalScale(4),
    fontFamily: Fonts.medium,
  },
  tourFieldValueBox: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: moderateScale(6),
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(8),
    minHeight: verticalScale(38),
    justifyContent: 'center',
  },
  tourFieldValueText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.medium,
  },

  /* Add stay prompt row above city / stay */
  addPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(10),
    marginTop: verticalScale(4),
  },
  staysSectionHeading: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
  },
  topAddStayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
    borderWidth: 1,
  },
  topAddStayBtnText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
    marginLeft: 4,
  },

  loaderContainer: {
    paddingVertical: verticalScale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(14),
  },
  addStayCityHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(6),
  },
  addStayCityHeaderBtnText: {
    color: '#FFF',
    fontSize: moderateScale(12),
    fontFamily: Fonts.bold,
    marginLeft: 2,
  },
  emptyStaysContainer: {
    paddingVertical: verticalScale(32),
    paddingHorizontal: horizontalScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    marginBottom: verticalScale(14),
  },
  emptyStaysText: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.medium,
    marginVertical: verticalScale(10),
  },
  addFirstStayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
  },
  addFirstStayBtnText: {
    color: '#FFF',
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    marginLeft: 6,
  },

  cardContainer: {
    borderRadius: moderateScale(12),
    borderWidth: 1,
    marginBottom: verticalScale(14),
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(14),
    borderBottomWidth: 1,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indexBadge: {
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgeText: {
    color: '#FFF',
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
  },
  cardHeaderTitle: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.bold,
  },
  cardHeaderSub: {
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIconButton: {
    padding: moderateScale(6),
    marginRight: horizontalScale(6),
  },
  cardBody: {
    padding: moderateScale(14),
  },
  sectionTitle: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.bold,
    marginBottom: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    paddingBottom: verticalScale(4),
  },
  formFieldGroup: {
    marginBottom: verticalScale(12),
  },
  fieldLabel: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.medium,
    marginBottom: verticalScale(6),
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(11),
    minHeight: verticalScale(44),
  },
  pickerTriggerText: {
    fontSize: moderateScale(14),
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
    minHeight: verticalScale(44),
  },
  multilineInput: {
    minHeight: verticalScale(44),
    paddingVertical: verticalScale(8),
    textAlignVertical: 'center',
    lineHeight: moderateScale(18),
  },
  addressInput: {
    minHeight: verticalScale(76),
    paddingVertical: verticalScale(10),
    textAlignVertical: 'top',
    lineHeight: moderateScale(20),
  },
  dropdownInlineIcon: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(10),
  },
  rowFields: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validateButton: {
    marginLeft: horizontalScale(8),
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(44),
  },
  validateButtonText: {
    color: '#FFF',
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
  },
  sharedPersonBox: {
    borderWidth: 1,
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    marginBottom: verticalScale(14),
  },
  sharedPersonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(10),
  },
  sharedPersonTitle: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
  },
  addPersonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(6),
  },
  addPersonButtonText: {
    color: '#FFF',
    fontSize: moderateScale(12),
    fontFamily: Fonts.bold,
    marginLeft: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: moderateScale(16),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
  },
  personChipText: {
    fontSize: moderateScale(13),
  },
  noPersonsText: {
    fontSize: moderateScale(12),
    fontStyle: 'italic',
  },
  approverBox: {
    borderWidth: 1.5,
    borderRadius: moderateScale(10),
    padding: moderateScale(14),
    marginTop: verticalScale(16),
  },
  itcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: verticalScale(10),
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: horizontalScale(10),
  },
  backButtonText: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.bold,
  },
  submitButton: {
    flex: 2,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: moderateScale(15),
    fontFamily: Fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    maxHeight: '80%',
    minHeight: '50%',
    paddingHorizontal: horizontalScale(18),
    paddingTop: verticalScale(16),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(12),
    marginVertical: verticalScale(12),
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: verticalScale(9),
    paddingLeft: horizontalScale(8),
    fontSize: moderateScale(15),
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalListText: {
    fontSize: moderateScale(15),
  },
  modalEmptyText: {
    textAlign: 'center',
    paddingVertical: verticalScale(20),
    fontSize: moderateScale(14),
  },
  rateBadge: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(6),
  },
  timeModalCard: {
    marginHorizontal: horizontalScale(20),
    marginBottom: verticalScale(100),
    borderRadius: moderateScale(14),
    padding: moderateScale(16),
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  timeSlotButton: {
    width: '28%',
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    fontSize: moderateScale(14),
  },
  personModalCard: {
    marginHorizontal: horizontalScale(20),
    marginBottom: verticalScale(100),
    borderRadius: moderateScale(14),
    paddingTop: moderateScale(16),
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  modalCancelButton: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(10),
    marginRight: horizontalScale(10),
  },
  modalSaveButton: {
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(10),
  },
  modalSaveButtonText: {
    color: '#FFF',
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
  },
});

export default LodgingScreen;
