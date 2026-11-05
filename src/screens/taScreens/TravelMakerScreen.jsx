import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { Fonts } from '../../styles/Fonts';
import { SafeAreaView } from "react-native-safe-area-context";
import SelfOrOnBehalfModal from "../../TaComponents/models/SelfOrOnBehalfModal";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import DateTimePicker from "@react-native-community/datetimepicker";
import { moderateScale, verticalScale, horizontalScale } from '../../styles/Metrics';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import FileDisplaySection from "../../TaComponents/cards/FileDisplaySection";
import * as create_styles from "../../styles/StyleSheet";
import {
  useLazyEmpDetailsQuery,
  useLazyTourReasonListQuery,
  useHolidayCheckMutation,
  useLazyCityListQuery,
  useLazyEmployeeListQuery,
  useLazyApproverListQuery,
  useLazyBranchListQuery,
} from "../../redux/rtk_query/apiSlice";
import {
  updateField,
  resetForm,
} from "../../redux/slices/travelMakerFormSlice";
import {
  setReasonList,
  clearDropdownData,
  setCityList,
  updateReasonList,
  updateCityList,
} from "../../redux/slices/Dropdowns";
import { getCustomColors } from "../../styles/CustomColors";
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import { Environment } from "../../environment/Environment";
import * as ImagePicker from 'expo-image-picker';
import { uploadMultipart } from "../../utilities/upload";
import { pickDocuments } from "../../utilities/filePicker";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate()?.toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateOnly = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.0`;
};

const safeSearchText = (text) => {
  if (typeof text === "string") return text;
  if (text == null) return "";
  if (typeof text === "object") {
    if (text.nativeEvent && typeof text.nativeEvent.text === "string") {
      return text.nativeEvent.text;
    }
    if (typeof text.text === "string") return text.text;
    if (typeof text.value === "string") return text.value;
    try {
      const str = JSON.stringify(text);
      if (str && str !== "{}") return str;
    } catch (_) { /* ignore */ }
    return "";
  }
  return String(text);
};

// --------------------------------------------
// Empty row for itinerary details
// --------------------------------------------
const emptyDetailRow = {
  id: 0,
  detailStartDate: null,
  detailEndDate: null,
  startingpoint: "",
  placeofvisit: "",
  purposeofvisit: "",
};

// --------------------------------------------
// Stable initial values (never changes)
// --------------------------------------------
const getInitialFormValues = () => ({
  tourNo: "NEW",
  requestDate: new Date().toISOString(),
  empName: "",
  empCode: "",
  empDesign: "",
  empGrade: "",
  empGender: "",
  empId: "",
  reason: null,
  startDate: null,
  endDate: null,
  durationDays: 0,
  remarks: "",
  permittedby: null,
  approval: null,
  empbranchgid: null,
  quantum_of_funds: "",
  opening_balance: "",
  debit_branch: null,
  transfer_on_promotion: "0",
  details: [{ ...emptyDetailRow }],
  isHoliday: false,
  isOnGoingTour: false,
  comments: "",
});

const TravelMakerCreateScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { reasons, cities } = useSelector((state) => state.Dropdowns);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const styles = create_styles.create_styles(isDark);

  const screenStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: isDark ? CustomColors.screenBackground : "#f8fafc",
          paddingHorizontal: horizontalScale(14),
          paddingTop: verticalScale(10),
        },
        sectionCard: {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderRadius: moderateScale(14),
          padding: moderateScale(16),
          marginBottom: verticalScale(14),
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#e2e8f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        },
        sectionHeaderWrap: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: verticalScale(10),
          marginBottom: verticalScale(14),
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#334155" : "#f1f5f9",
        },
        sectionHeaderLeft: {
          flexDirection: "row",
          alignItems: "center",
        },
        sectionIconBadge: {
          width: moderateScale(30),
          height: moderateScale(30),
          borderRadius: moderateScale(8),
          backgroundColor: `${CustomColors.appThemeColor}18`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: horizontalScale(8),
        },
        sectionHeaderTitle: {
          fontSize: moderateScale(15),
          fontFamily: Fonts.bold,
          color: CustomColors.textDark || "#0f172a",
        },
        infoGridRow: {
          flexDirection: "row",
          gap: horizontalScale(10),
          marginBottom: verticalScale(10),
        },
        infoTile: {
          flex: 1,
          backgroundColor: isDark ? "#0f172a" : "#f8fafc",
          borderRadius: moderateScale(10),
          paddingHorizontal: horizontalScale(12),
          paddingVertical: verticalScale(10),
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#e2e8f0",
        },
        infoTileLabel: {
          fontSize: moderateScale(10),
          fontFamily: Fonts.medium,
          color: isDark ? "#94a3b8" : "#64748b",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: verticalScale(4),
        },
        infoTileValueWrap: {
          flexDirection: "row",
          alignItems: "center",
          gap: horizontalScale(6),
        },
        infoTileValueHighlight: {
          fontSize: moderateScale(15),
          fontFamily: Fonts.bold,
          color: CustomColors.appThemeColor,
        },
        infoTileValue: {
          fontSize: moderateScale(13),
          fontFamily: Fonts.semiBold,
          color: CustomColors.textDark || "#1e293b",
        },
        empProfileCard: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
          borderRadius: moderateScale(12),
          padding: moderateScale(12),
          marginBottom: verticalScale(12),
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#e2e8f0",
        },
        empAvatarWrap: {
          width: moderateScale(42),
          height: moderateScale(42),
          borderRadius: moderateScale(21),
          backgroundColor: `${CustomColors.appThemeColor}20`,
          alignItems: "center",
          justifyContent: "center",
        },
        empNameText: {
          fontSize: moderateScale(14),
          fontFamily: Fonts.bold,
          color: CustomColors.textDark || "#0f172a",
          marginBottom: verticalScale(2),
        },
        empCodeBadge: {
          fontSize: moderateScale(11),
          fontFamily: Fonts.medium,
          color: CustomColors.appThemeColor,
        },
        durationBadgeWrap: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: `${CustomColors.appThemeColor}12`,
          paddingHorizontal: horizontalScale(12),
          paddingVertical: verticalScale(8),
          borderRadius: moderateScale(8),
          marginVertical: verticalScale(10),
          alignSelf: "flex-start",
        },
        durationBadgeText: {
          fontSize: moderateScale(12),
          fontFamily: Fonts.medium,
          color: CustomColors.appThemeColor,
          marginLeft: horizontalScale(6),
        },
        itineraryLegCard: {
          backgroundColor: isDark ? "#0f172a" : "#f8fafc",
          borderRadius: moderateScale(12),
          padding: moderateScale(14),
          marginBottom: verticalScale(14),
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#e2e8f0",
        },
        itineraryLegHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: verticalScale(10),
          paddingBottom: verticalScale(6),
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#334155" : "#e2e8f0",
        },
        legBadge: {
          backgroundColor: `${CustomColors.appThemeColor}20`,
          paddingHorizontal: horizontalScale(10),
          paddingVertical: verticalScale(3),
          borderRadius: moderateScale(6),
        },
        legBadgeText: {
          fontSize: moderateScale(11),
          fontFamily: Fonts.bold,
          color: CustomColors.appThemeColor,
        },
        deleteLegBtn: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: horizontalScale(8),
          paddingVertical: verticalScale(3),
          borderRadius: moderateScale(6),
          backgroundColor: isDark ? "#450a0a" : "#fef2f2",
        },
        deleteLegText: {
          fontSize: moderateScale(11),
          fontFamily: Fonts.semiBold,
          color: "#ef4444",
          marginLeft: horizontalScale(4),
        },
        addLegBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${CustomColors.appThemeColor}15`,
          borderWidth: 1,
          borderColor: CustomColors.appThemeColor,
          borderStyle: "dashed",
          paddingVertical: verticalScale(12),
          borderRadius: moderateScale(10),
          marginTop: verticalScale(4),
        },
        addLegBtnText: {
          fontSize: moderateScale(13),
          fontFamily: Fonts.bold,
          color: CustomColors.appThemeColor,
          marginLeft: horizontalScale(6),
        },
        fieldGroup: {
          marginBottom: verticalScale(12),
        },
        fieldLabel: {
          fontSize: moderateScale(12),
          fontFamily: Fonts.semiBold,
          color: CustomColors.textDark || "#334155",
          marginBottom: verticalScale(6),
        },
        mandatory: {
          color: "#ef4444",
        },
        fieldInput: {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#cbd5e1",
          borderRadius: moderateScale(10),
          paddingHorizontal: horizontalScale(14),
          paddingVertical: verticalScale(11),
          fontSize: moderateScale(13),
          color: CustomColors.textDark || "#0f172a",
        },
        fieldPicker: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#cbd5e1",
          borderRadius: moderateScale(10),
          paddingHorizontal: horizontalScale(14),
          paddingVertical: verticalScale(12),
        },
        fieldPickerText: {
          fontSize: moderateScale(13),
          fontFamily: Fonts.medium,
          color: CustomColors.textDark || "#0f172a",
          flex: 1,
        },
        fieldPickerPlaceholder: {
          fontSize: moderateScale(13),
          fontFamily: Fonts.regular,
          color: isDark ? "#64748b" : "#94a3b8",
          flex: 1,
        },
        errorBorder: {
          borderColor: "#ef4444",
          backgroundColor: isDark ? "#450a0a" : "#fef2f2",
        },
        fileActionRow: {
          flexDirection: "row",
          gap: horizontalScale(10),
          marginBottom: verticalScale(12),
        },
        fileActionBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: CustomColors.appThemeColor,
          paddingVertical: verticalScale(11),
          borderRadius: moderateScale(10),
          elevation: 1,
        },
        fileActionBtnCamera: {
          backgroundColor: "#059669",
        },
        fileActionText: {
          fontSize: moderateScale(13),
          fontFamily: Fonts.bold,
          color: "#ffffff",
          marginLeft: horizontalScale(6),
        },
        onBehalfContainer: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "#1e293b" : "#eff6ff",
          paddingVertical: verticalScale(10),
          paddingHorizontal: horizontalScale(14),
          borderRadius: moderateScale(10),
          marginBottom: verticalScale(12),
          borderLeftWidth: 4,
          borderLeftColor: CustomColors.appThemeColor,
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#dbeafe",
        },
        onBehalfIconWrap: {
          width: moderateScale(34),
          height: moderateScale(34),
          borderRadius: moderateScale(8),
          backgroundColor: `${CustomColors.appThemeColor}18`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: horizontalScale(10),
        },
        onBehalfCaption: {
          fontSize: moderateScale(10),
          fontFamily: Fonts.medium,
          color: isDark ? "#94a3b8" : "#64748b",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        },
        onBehalfName: {
          fontSize: moderateScale(13),
          fontFamily: Fonts.bold,
          color: isDark ? "#93c5fd" : "#1e40af",
        },
        submitBar: {
          paddingHorizontal: horizontalScale(16),
          paddingVertical: verticalScale(12),
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#334155" : "#e2e8f0",
          elevation: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        submitBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: CustomColors.appThemeColor,
          paddingVertical: verticalScale(14),
          borderRadius: moderateScale(12),
          elevation: 2,
        },
        submitBtnDisabled: {
          backgroundColor: isDark ? "#475569" : "#94a3b8",
        },
        submitBtnText: {
          fontSize: moderateScale(16),
          fontFamily: Fonts.bold,
          color: "#ffffff",
          marginLeft: horizontalScale(6),
        },
      }),
    [isDark, CustomColors]
  );

  // --------------------------------------------
  // Navigation params
  // --------------------------------------------
  const tourDataParams = route?.params?.tourDataParams;
  const tour_id = route?.params?.tour_id;
  const from = route?.params?.from;
  const isCreateMode = !tourDataParams && !tour_id;
  const hasPresetMode = route?.params?.mode !== undefined || Boolean(route?.params?.onbehalf);

  const [isSelfModalVisible, setIsSelfModalVisible] = useState(isCreateMode && !hasPresetMode);
  const [selectedOnBehalfEmp, setSelectedOnBehalfEmp] = useState(
    route?.params?.selectedEmployee ||
    (route?.params?.onbehalf ? { id: route?.params?.onbehalf, full_name: route?.params?.onbehalfname } : null)
  );

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [dateField, setDateField] = useState(null);
  const [currentDetailDateFieldIndex, setCurrentDetailDateFieldIndex] = useState(null);
  const [files, setFiles] = useState([]);

  const [isReasonPickerVisible, setReasonPickerVisibility] = useState(false);
  const [isCityPickerVisible, setCityPickerVisibility] = useState(false);
  const [isApproverBranchPickerVisible, setApproverBranchPickerVisibility] = useState(false);
  const [isApproverEmpPickerVisible, setApproverEmpPickerVisibility] = useState(false);

  // Custom Permitted By picker state
  const [isPermittedByModalVisible, setPermittedByModalVisible] = useState(false);
  const [permittedByList, setPermittedByList] = useState([]);
  const [permittedByPage, setPermittedByPage] = useState(1);
  const [hasMorePermittedBy, setHasMorePermittedBy] = useState(true);
  const [permittedBySearch, setPermittedBySearch] = useState("");
  const [isPermittedByFetching, setIsPermittedByFetching] = useState(false);
  const [isPermittedByFetchingMore, setIsPermittedByFetchingMore] = useState(false);
  const [selectedPermittedBy, setSelectedPermittedBy] = useState(null);
  const permittedByDebounceRef = useRef(null);
  const permittedBySearchRef = useRef("");

  // Other picker lists
  const [approverBranchList, setApproverBranchList] = useState([]);
  const [approverBranchPage, setApproverBranchPage] = useState(1);
  const [hasMoreApproverBranch, setHasMoreApproverBranch] = useState(true);
  const [currentApproverBranchSearchQuery, setCurrentApproverBranchSearchQuery] = useState("");

  const [approverEmpList, setApproverEmpList] = useState([]);
  const [approverEmpPage, setApproverEmpPage] = useState(1);
  const [hasMoreApproverEmp, setHasMoreApproverEmp] = useState(true);
  const [currentApproverEmpSearchQuery, setCurrentApproverEmpSearchQuery] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonPage, setReasonPage] = useState(0);
  const [CityPage, setCityPage] = useState(1);
  const [hasMoreReasons, setHasMoreReasons] = useState(true);
  const [hasMoreCity, setHasMoreCity] = useState(true);

  const [currentReasonSearchQuery, setCurrentReasonSearchQuery] = useState("");
  const [currentCitySearchQuery, setCurrentCitySearchQuery] = useState("");
  const [selectedFieldTitle, setSelectedFieldTitle] = useState("");

  const [triggerPermittedByList, { isFetching: isPermittedByLoading }] = useLazyEmployeeListQuery();
  const [triggerBranchList, { isFetching: isBranchLoading }] = useLazyBranchListQuery();
  const [triggerApproverEmpList, { isFetching: isApproverEmpLoading }] = useLazyApproverListQuery();

  const scrollViewRef = useRef(null);
  const reasonRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const remarksRef = useRef(null);
  const permittedByRef = useRef(null);
  const approverBranchRef = useRef(null);
  const approverEmpRef = useRef(null);
  const quantumOfFundsRef = useRef(null);
  const openingBalanceRef = useRef(null);
  const debitBranchRef = useRef(null);
  const detailRefs = useRef([]);
  const fileUploadRef = useRef(null);

  const [errors, setErrors] = useState({
    reason: false,
    startDate: false,
    endDate: false,
    remarks: false,
    permittedby: false,
    approverBranch: false,
    approval: false,
    quantumOfFunds: false,
    openingBalance: false,
    debitBranch: false,
    details: [],
    fileUpload: false,
  });

  const opacityAnim = useRef(new Animated.Value(1)).current;

  // --------------------------------------------
  // Helper functions
  // --------------------------------------------
  const getNumberOfDatesBetween = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    return dayDiff > 0 ? dayDiff : 0;
  };

  const getDateOnly = (date) => {
    const d = new Date(date);
    return new Date(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    );
  };

  const getBranchId = () => {
    const rawBranch = travelForm?.empbranchgid;
    if (rawBranch && typeof rawBranch === "object") {
      return rawBranch.id || rawBranch.branch_id || rawBranch.empbranchgid || 0;
    }
    if (rawBranch) {
      return rawBranch;
    }
    return (
      EmpDetailsData?.employee_branch_id ||
      EmpDetailsData?.branch_id ||
      EmpDetailsData?.empbranchgid?.id ||
      0
    );
  };

  // --------------------------------------------
  // RTK Query hooks
  // --------------------------------------------
  const [triggerEmpDetails, { data: EmpDetailsData, isLoading: isLoadingEmpDetails }] = useLazyEmpDetailsQuery();
  const [triggerReason, { data: ReasonData, isFetching: isFetchingReason }] = useLazyTourReasonListQuery();
  const [triggerHolidayCheck] = useHolidayCheckMutation();
  const [triggerCity, { data: CityData, isLoading: isLoadingCity }] = useLazyCityListQuery();

  const debounceTimeout = useRef(null);
  const authToken = useSelector((s) => s.auth.user?.token);
  const csrfToken = useSelector((s) => s.auth.csrfToken);
  const csrfCookie = useSelector((s) => s.auth.csrfCookie);

  // --------------------------------------------
  // Redux form state
  // --------------------------------------------
  const travelForm = useSelector((state) => state.travelMakerFormSlice);

  // --------------------------------------------
  // Stable initial values for Formik (memoized from tourDataParams if editing)
  // --------------------------------------------
  const initialFormValues = useMemo(() => {
    if (tourDataParams) {
      const rawDetails = tourDataParams.detail || tourDataParams.details || [];
      const mappedDetails = rawDetails.length > 0
        ? rawDetails.map((item, idx) => ({
          id: item.id || idx,
          detailStartDate: item.startdate ? new Date(item.startdate).toISOString() : null,
          detailEndDate: item.enddate ? new Date(item.enddate).toISOString() : null,
          startingpoint: item.startingpoint || '',
          placeofvisit: item.placeofvisit || '',
          purposeofvisit: item.purposeofvisit || '',
        }))
        : [{ ...emptyDetailRow }];

      return {
        id: tourDataParams.id,
        tourNo: tourDataParams.requestno || tourDataParams.id || 'NEW',
        requestDate: tourDataParams.requestdate ? new Date(tourDataParams.requestdate).toISOString() : new Date().toISOString(),
        empName: tourDataParams.employee_name || '',
        empCode: tourDataParams.employee_code || '',
        empDesign: tourDataParams.empdesignation || '',
        empGrade: tourDataParams.empgrade || '',
        empGender: tourDataParams.gender || '',
        empId: tourDataParams.empid || tourDataParams.employee_id || '',
        reason: tourDataParams.reason_data || (tourDataParams.reason ? { id: tourDataParams.reason_id, name: tourDataParams.reason } : null),
        startDate: tourDataParams.startdate ? new Date(tourDataParams.startdate).toISOString() : null,
        endDate: tourDataParams.enddate ? new Date(tourDataParams.enddate).toISOString() : null,
        durationDays: tourDataParams.durationdays || 0,
        remarks: tourDataParams.ordernoremarks || '',
        permittedby: tourDataParams.permittedby ? (typeof tourDataParams.permittedby === 'object' ? tourDataParams.permittedby : { id: tourDataParams.permittedby_id, full_name: tourDataParams.permittedby }) : null,
        approval: tourDataParams.approval ? (typeof tourDataParams.approval === 'object' ? tourDataParams.approval : { id: tourDataParams.approver_id, full_name: tourDataParams.approver }) : null,
        empbranchgid: tourDataParams.empbranchgid || null,
        quantum_of_funds: tourDataParams.quantum_of_funds !== undefined && tourDataParams.quantum_of_funds !== null ? String(tourDataParams.quantum_of_funds) : '',
        opening_balance: tourDataParams.opening_balance !== undefined && tourDataParams.opening_balance !== null ? String(tourDataParams.opening_balance) : '',
        debit_branch: tourDataParams.debit_branch || null,
        transfer_on_promotion: String(tourDataParams.transfer_on_promotion || '0'),
        details: mappedDetails,
        isHoliday: false,
        isOnGoingTour: false,
        comments: tourDataParams.comments || '',
      };
    }
    return getInitialFormValues();
  }, [tourDataParams]);

  // --------------------------------------------
  // Formik ref to sync Redux updates
  // --------------------------------------------
  const formikRef = useRef(null);

  // --------------------------------------------
  // Effects
  // --------------------------------------------
  // 1. Navigation Header
  useEffect(() => {
    navigation.setOptions({
      title: "eClaim Tour",
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerShown: true,
      headerTintColor: CustomColors.textWhite,
      headerTitleStyle: {
        fontFamily: Fonts.bold,
        fontSize: moderateScale(17),
        color: CustomColors.textWhite,
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: horizontalScale(12), padding: moderateScale(4) }}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={CustomColors.textWhite} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, CustomColors]);

  // 2. Cleanup Redux form state ONLY on true component unmount
  useEffect(() => {
    return () => {
      dispatch(resetForm());
      dispatch(clearDropdownData());
    };
  }, [dispatch]);

  // 3. Populate form from navigation params (if editing / viewing)
  useEffect(() => {
    if (!tourDataParams) return;
    const rawDetails = tourDataParams.detail || tourDataParams.details || [];
    const mappedDetails = rawDetails.length > 0
      ? rawDetails.map((item, idx) => ({
        id: item.id || idx,
        detailStartDate: item.startdate ? new Date(item.startdate).toISOString() : null,
        detailEndDate: item.enddate ? new Date(item.enddate).toISOString() : null,
        startingpoint: item.startingpoint || '',
        placeofvisit: item.placeofvisit || '',
        purposeofvisit: item.purposeofvisit || '',
      }))
      : [{ ...emptyDetailRow }];

    const payload = {
      id: tourDataParams.id,
      tourNo: tourDataParams.requestno || tourDataParams.id || 'NEW',
      requestDate: tourDataParams.requestdate ? new Date(tourDataParams.requestdate).toISOString() : new Date().toISOString(),
      empName: tourDataParams.employee_name || '',
      empCode: tourDataParams.employee_code || '',
      empDesign: tourDataParams.empdesignation || '',
      empGrade: tourDataParams.empgrade || '',
      reason: tourDataParams.reason_data || (tourDataParams.reason ? { id: tourDataParams.reason_id, name: tourDataParams.reason } : null),
      startDate: tourDataParams.startdate ? new Date(tourDataParams.startdate).toISOString() : null,
      endDate: tourDataParams.enddate ? new Date(tourDataParams.enddate).toISOString() : null,
      durationDays: tourDataParams.durationdays || 0,
      remarks: tourDataParams.ordernoremarks || '',
      permittedby: tourDataParams.permittedby || null,
      approval: tourDataParams.approval || null,
      empbranchgid: tourDataParams.empbranchgid || null,
      quantum_of_funds: tourDataParams.quantum_of_funds !== undefined && tourDataParams.quantum_of_funds !== null ? String(tourDataParams.quantum_of_funds) : '',
      opening_balance: tourDataParams.opening_balance !== undefined && tourDataParams.opening_balance !== null ? String(tourDataParams.opening_balance) : '',
      debit_branch: tourDataParams.debit_branch || null,
      transfer_on_promotion: String(tourDataParams.transfer_on_promotion || '0'),
      details: mappedDetails,
    };
    dispatch(updateField(payload));
  }, [tourDataParams, dispatch]);

  // 4. Fetch employee details on mount ONLY in Create mode
  const hasFetchedEmpDetailsRef = useRef(false);
  useEffect(() => {
    if (isCreateMode && authToken && !hasFetchedEmpDetailsRef.current) {
      hasFetchedEmpDetailsRef.current = true;
      const onbehalfId = route?.params?.onbehalf;
      if (onbehalfId) {
        dispatch(updateField({ onbehalfof: onbehalfId }));
        triggerEmpDetails({ onbehalf: onbehalfId });
      } else {
        triggerEmpDetails({});
      }
    }
  }, [isCreateMode, authToken, triggerEmpDetails, route?.params?.onbehalf, dispatch]);

  // 5. Update form with employee details (only employee-specific fields in Create mode)
  useEffect(() => {
    if (!isCreateMode || !EmpDetailsData) return;

    const looksLikeBackendError =
      EmpDetailsData?.code === "UNEXPECTED_ERROR" &&
      typeof EmpDetailsData?.description === "string";

    if (looksLikeBackendError) {
      ToastMessage(
        EmpDetailsData?.description ||
        "Could not load employee details. Please try again."
      );
      hasFetchedEmpDetailsRef.current = false;
      return;
    }

    // Only update fields that come from employee details
    dispatch(updateField({
      empName: EmpDetailsData.full_name ?? '',
      empCode: EmpDetailsData.code ?? '',
      empDesign: EmpDetailsData.designation ?? '',
      empGrade: EmpDetailsData.grade ?? '',
      empGender: EmpDetailsData.gender ?? '',
      empId: EmpDetailsData.id ?? '',
      empbranchgid: EmpDetailsData.employee_branch_id ? {
        id: EmpDetailsData.employee_branch_id,
        code: EmpDetailsData.employee_branch_code,
      } : null,
    }));
  }, [isCreateMode, EmpDetailsData, dispatch]);

  // Handle Reason list
  useEffect(() => {
    if (ReasonData?.data) {
      if (reasonPage === 1) {
        dispatch(setReasonList(ReasonData));
      } else {
        dispatch(updateReasonList(ReasonData));
      }
      setHasMoreReasons(ReasonData.data.length > 0);
    }
  }, [ReasonData, dispatch, reasonPage]);

  // Handle City list
  useEffect(() => {
    if (CityData?.data) {
      if (CityPage === 1) {
        dispatch(setCityList(CityData));
      } else {
        dispatch(updateCityList(CityData));
      }
      setHasMoreCity(CityData.pagination ? CityData.pagination.has_next : CityData.data.length > 0);
    }
  }, [CityData, dispatch, CityPage]);

  // --------------------------------------------
  // Sync Redux travelForm into Formik without wiping out values
  // --------------------------------------------
  useEffect(() => {
    if (!formikRef.current) return;
    const { setFieldValue, values } = formikRef.current;
    Object.keys(travelForm).forEach((key) => {
      const newVal = travelForm[key];
      if (newVal !== undefined && newVal !== null && newVal !== '' && values[key] !== newVal) {
        if (Array.isArray(newVal)) {
          if (newVal.length > 0 && JSON.stringify(values[key]) !== JSON.stringify(newVal)) {
            setFieldValue(key, newVal);
          }
        } else if (typeof newVal === 'object') {
          if (Object.keys(newVal).length > 0 && JSON.stringify(values[key]) !== JSON.stringify(newVal)) {
            setFieldValue(key, newVal);
          }
        } else {
          setFieldValue(key, newVal);
        }
      }
    });
  }, [travelForm]);

  // --------------------------------------------
  // Handlers for Self/OnBehalf
  // --------------------------------------------
  const handleSelfOrOnBehalfSubmit = (res) => {
    setIsSelfModalVisible(false);
    if (res.mode === "onbehalf" && res.selectedEmployee) {
      setSelectedOnBehalfEmp(res.selectedEmployee);
      dispatch(updateField({ onbehalfof: res.selectedEmployee.id || res.selectedEmployee.employeegid }));
      triggerEmpDetails({ onbehalf: res.selectedEmployee.id || res.selectedEmployee.employeegid });
    } else {
      setSelectedOnBehalfEmp(null);
      dispatch(updateField({ onbehalfof: null }));
      triggerEmpDetails({});
    }
  };

  // --------------------------------------------
  // File pickers
  // --------------------------------------------
  const pickFiles = async () => {
    try {
      const selectedFiles = await pickDocuments(true);
      if (selectedFiles.length > 0) {
        setFiles((prev) => [...prev, ...selectedFiles]);
        setErrors((prev) => ({ ...prev, fileUpload: false }));
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick files.");
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const newFile = {
          uri: asset.uri,
          name: asset.fileName || `camera_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };
        setFiles(prev => [...prev, newFile]);
        setErrors(prev => ({ ...prev, fileUpload: false }));
      }
    } catch (e) {
      console.log('Camera error', e);
    }
  };

  const getMimeType = (fileName = "") => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain",
      csv: "text/csv",
    };
    return mimeTypes[ext] || "*/*";
  };

  const handleWebViewFile = async (file) => {
    try {
      const fileUrl = file?.uri || file?.url;
      const fileName = file?.name || file?.file_name || "document";

      if (!fileUrl) {
        ToastMessage("File URL not available.");
        return;
      }

      const mimeType = getMimeType(fileName);

      if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        await WebBrowser.openBrowserAsync(fileUrl, {
          controlsColor: CustomColors.appThemeColor,
          dismissButtonStyle: "close",
          showTitle: true,
          enableBarCollapsing: true,
        });
        return;
      }

      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(fileUrl);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          type: mimeType,
          flags: 1,
        });
      } else if (Platform.OS === "ios") {
        await WebBrowser.openBrowserAsync(fileUrl);
      }
    } catch (error) {
      console.error("Failed to view file:", error);
      ToastMessage("No application available to view this file.");
    }
  };

  const removeFile = (uri) => {
    setFiles((prev) => prev.filter((file) => file.uri !== uri));
  };

  // --------------------------------------------
  // Date picker
  // --------------------------------------------
  const handleConfirmDate = async (event, selectedDate, setFieldValue, values) => {
    setDatePickerVisibility(false);
    if (event?.type === "dismissed" || !selectedDate) {
      setCurrentDetailDateFieldIndex(null);
      setDateField(null);
      return;
    }

    if (currentDetailDateFieldIndex !== null) {
      const details = [...values.details];
      let newDetailStartDate = details[currentDetailDateFieldIndex].detailStartDate;
      let newDetailEndDate = details[currentDetailDateFieldIndex].detailEndDate;

      if (dateField === "detailStartDate") {
        newDetailStartDate = selectedDate.toISOString();
        if (!newDetailEndDate || new Date(newDetailEndDate) < selectedDate) {
          newDetailEndDate = selectedDate.toISOString();
        }
      } else if (dateField === "detailEndDate") {
        newDetailEndDate = selectedDate.toISOString();
        if (!newDetailStartDate || new Date(newDetailStartDate) > selectedDate) {
          newDetailStartDate = selectedDate.toISOString();
        }
      }

      setFieldValue(`details[${currentDetailDateFieldIndex}].detailStartDate`, newDetailStartDate);
      setFieldValue(`details[${currentDetailDateFieldIndex}].detailEndDate`, newDetailEndDate);
      setCurrentDetailDateFieldIndex(null);
      setDateField(null);
    } else if (dateField) {
      let newStartDate = values.startDate;
      let newEndDate = values.endDate;
      let mainDatesChanged = false;

      if (dateField === "startDate") {
        newStartDate = selectedDate.toISOString();
        if (!newEndDate || new Date(newEndDate) < selectedDate) {
          newEndDate = selectedDate.toISOString();
        }
        mainDatesChanged = true;
      } else if (dateField === "endDate") {
        newEndDate = selectedDate.toISOString();
        if (!newStartDate || new Date(newStartDate) > selectedDate) {
          newStartDate = selectedDate.toISOString();
        }
        mainDatesChanged = true;
      }

      if (mainDatesChanged) {
        setFieldValue("startDate", newStartDate);
        setFieldValue("endDate", newEndDate);
        setFieldValue("durationDays", getNumberOfDatesBetween(newStartDate, newEndDate));

        if (values.details && values.details.length > 0) {
          const updatedDetails = values.details.map((leg) => {
            let sDate = leg.detailStartDate;
            let eDate = leg.detailEndDate;
            if (sDate && new Date(sDate) < new Date(newStartDate)) {
              sDate = newStartDate;
            }
            if (sDate && new Date(sDate) > new Date(newEndDate)) {
              sDate = newEndDate;
            }
            if (eDate && new Date(eDate) > new Date(newEndDate)) {
              eDate = newEndDate;
            }
            if (eDate && new Date(eDate) < new Date(newStartDate)) {
              eDate = newStartDate;
            }
            if (sDate && eDate && new Date(sDate) > new Date(eDate)) {
              eDate = sDate;
            }
            return {
              ...leg,
              detailStartDate: sDate,
              detailEndDate: eDate,
            };
          });
          setFieldValue("details", updatedDetails);
        }

        try {
          const { data: HolidayCheckData } = await triggerHolidayCheck({
            start_date: formatDateOnly(newStartDate),
            end_date: formatDateOnly(newEndDate),
          });
          if (HolidayCheckData) {
            setFieldValue("isHoliday", HolidayCheckData.data.length > 0);
            setFieldValue("isOnGoingTour", HolidayCheckData.ongoing_tour);
          }
        } catch (error) {
          console.error("Holiday check failed:", error);
        }
      }
      setDateField(null);
    }
  };

  // --------------------------------------------
  // Search functions for pickers
  // --------------------------------------------
  const handleSearchReason = useCallback((query) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setCurrentReasonSearchQuery(query);
      setReasonPage(1);
      setHasMoreReasons(true);
      dispatch(setReasonList({ data: [] }));
      triggerReason({ name: query, page: 1 });
    }, 500);
  }, [triggerReason, dispatch]);

  const handleSearchCity = (query) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setCurrentCitySearchQuery(query);
      setCityPage(1);
      setHasMoreCity(true);
      dispatch(setCityList({ data: [] }));
      triggerCity({ city_name: query, page: 1 });
    }, 500);
  };

  const openReasonPicker = () => {
    setReasonPickerVisibility(true);
    if (reasons.length === 0) {
      triggerReason({ name: "", page: 1 });
    }
  };

  const openCityPicker = (field, index, title) => {
    setSelectedFieldTitle(title);
    setCityPickerVisibility(true);
    if (cities.length === 0) {
      triggerCity({ city_name: "", page: 1 });
    }
  };

  // --------------------------------------------
  // --------------------------------------------
  // Permitted By custom modal
  // --------------------------------------------
  const fetchPermittedBy = (branchId, search = "", page = 1, append = false) => {
    if (append && (isPermittedByFetching || isPermittedByFetchingMore)) return;

    if (append) {
      setIsPermittedByFetchingMore(true);
    } else {
      setIsPermittedByFetching(true);
    }

    const sanitizedSearch = safeSearchText(search).trim();

    triggerPermittedByList({
      branch: branchId,
      maker: EmpDetailsData?.id,
      name: sanitizedSearch,
      query: sanitizedSearch,
      onbehalfof: selectedOnBehalfEmp?.id || selectedOnBehalfEmp?.employeegid || "",
      page,
    })
      .unwrap()
      .then((res) => {
        const newData = res?.data || [];
        setPermittedByList((prev) => {
          if (!append) return newData;
          const existingIds = new Set(prev.map((i) => String(i.id || i.employeegid || i.code)));
          const filteredNew = newData.filter((i) => !existingIds.has(String(i.id || i.employeegid || i.code)));
          return [...prev, ...filteredNew];
        });

        const more =
          res?.pagination?.has_next !== undefined
            ? !!res.pagination.has_next
            : res?.has_next !== undefined
              ? !!res.has_next
              : newData.length >= 10;

        setHasMorePermittedBy(more);
        setPermittedByPage(page);
      })
      .catch(() => {
        if (!append) setPermittedByList([]);
        setHasMorePermittedBy(false);
      })
      .finally(() => {
        if (append) {
          setIsPermittedByFetchingMore(false);
        } else {
          setIsPermittedByFetching(false);
        }
      });
  };

  const openPermittedByPicker = () => {
    const branchId = getBranchId();
    if (!branchId || branchId === 0) {
      ToastMessage("Please ensure you have a valid branch assigned.");
      return;
    }
    if (permittedByDebounceRef.current) {
      clearTimeout(permittedByDebounceRef.current);
    }
    setPermittedByModalVisible(true);
    setPermittedBySearch("");
    permittedBySearchRef.current = "";
    setPermittedByPage(1);
    setHasMorePermittedBy(true);
    setPermittedByList([]);
    fetchPermittedBy(branchId, "", 1, false);
  };

  const loadMorePermittedBy = () => {
    if (
      permittedByList.length === 0 ||
      !hasMorePermittedBy ||
      isPermittedByFetchingMore ||
      isPermittedByFetching
    ) {
      return;
    }
    const branchId = getBranchId();
    if (!branchId) return;
    fetchPermittedBy(branchId, permittedBySearchRef.current, permittedByPage + 1, true);
  };

  const onPermittedBySearch = (text) => {
    const safeText = safeSearchText(text);
    setPermittedBySearch(safeText);
    permittedBySearchRef.current = safeText;

    if (permittedByDebounceRef.current) {
      clearTimeout(permittedByDebounceRef.current);
    }

    permittedByDebounceRef.current = setTimeout(() => {
      const branchId = getBranchId();
      if (!branchId) return;
      setPermittedByPage(1);
      setHasMorePermittedBy(true);
      fetchPermittedBy(branchId, safeText, 1, false);
    }, 350);
  };

  // --------------------------------------------
  // Approver Branch / Employee pickers
  // --------------------------------------------
  const openApproverBranchPicker = () => {
    setApproverBranchPickerVisibility(true);
    triggerBranchList({ name: "", page: 1 })
      .unwrap()
      .then((res) => setApproverBranchList(res?.data || []))
      .catch(() => setApproverBranchList([]));
  };

  const openApproverEmpPicker = (selectedBranchId) => {
    const targetBranch = selectedBranchId || getBranchId();
    if (!targetBranch) {
      ToastMessage("Please select an Approver Branch first.");
      return;
    }
    setApproverEmpPickerVisibility(true);
    triggerApproverEmpList({ branch: targetBranch, name: "", page: 1 })
      .unwrap()
      .then((res) => setApproverEmpList(res?.data || []))
      .catch(() => setApproverEmpList([]));
  };

  // --------------------------------------------
  // Render dropdown item (shared)
  // --------------------------------------------
  const RenderDropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected = selected && selected.value === options.value;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress(options);
          setPickerStatus(false);
        }}
        style={[styles.actionSheetOption, isSelected && styles.actionSheetOptionSelected]}
      >
        <Text allowFontScaling={false} style={[styles.actionSheetOptionText, isSelected && styles.actionSheetOptionTextSelected]}>
          {typeof options.label === "string" ? options.label : String(options.label)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPermittedByItem = ({ item }) => {
    const label = item.full_name || item.name || "";
    const isSelected = selectedPermittedBy?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.actionSheetOption, isSelected && styles.actionSheetOptionSelected]}
        onPress={() => {
          setSelectedPermittedBy(item);
        }}
      >
        <Text allowFontScaling={false} style={[styles.actionSheetOptionText, isSelected && styles.actionSheetOptionTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // --------------------------------------------
  // Submit handler
  // --------------------------------------------
  const handleSubmit = async (values) => {
    try {
      setIsSubmitting(true);
      const reasonId = Number(values.reason?.id || 0);

      if (!reasonId) {
        ToastMessage("Please Select Tour Reason");
        return;
      }

      if (reasonId === 2) {
        if (!values.quantum_of_funds && values.quantum_of_funds !== 0) {
          ToastMessage("Please Enter Quantum Of Funds");
          return;
        }
        if (!values.opening_balance && values.opening_balance !== 0) {
          ToastMessage("Please Enter Opening Balance");
          return;
        }
      }

      let debitBranch = null;
      if (reasonId === 12) {
        if (!values.debit_branch?.id) {
          ToastMessage("Please Select Debit Branch");
          return;
        }
        debitBranch = values.debit_branch.id;
      }

      if (!values.startDate) {
        ToastMessage("Please Select Tour Start Date");
        return;
      }

      if (!values.endDate) {
        ToastMessage("Please Select Tour End Date");
        return;
      }

      if (!values.remarks?.trim()) {
        ToastMessage("Please Enter Order No or Remarks");
        return;
      }

      if (!values.permittedby?.id) {
        ToastMessage("Please Select Permitted By");
        return;
      }

      for (const detail of values.details || []) {
        if (!detail.detailStartDate) {
          ToastMessage("Please Select Tour Itenary Start Date");
          return;
        }

        if (!detail.detailEndDate) {
          ToastMessage("Please Select Tour Itenary End Date");
          return;
        }

        const detailStartDate = getDateOnly(detail.detailStartDate);
        const tourStartDate = getDateOnly(values.startDate);

        const detailEndDate = getDateOnly(detail.detailEndDate);
        const tourEndDate = getDateOnly(values.endDate);

        if (detailStartDate < tourStartDate) {
          ToastMessage(
            "Itenary Start Date should not be earlier than Tour Start Date"
          );
          return;
        }

        if (detailEndDate > tourEndDate) {
          ToastMessage(
            "Itenary End Date should not be greater than Tour End Date"
          );
          return;
        }

        if (!String(detail.startingpoint || "").trim()) {
          ToastMessage("Please Enter Starting Point");
          return;
        }

        if (!String(detail.placeofvisit || "").trim()) {
          ToastMessage("Please Enter Place of Visit");
          return;
        }

        if (!String(detail.purposeofvisit || "").trim()) {
          ToastMessage("Please Enter Purpose of Visit");
          return;
        }
      }

      if ([1, 2, 4, 5, 6, 7, 8, 11].includes(reasonId)) {
        if (!files || files.length === 0) {
          ToastMessage("Please Attach Files");
          return;
        }
      }

      if (!values.empbranchgid) {
        ToastMessage("Please Select Branch");
        return;
      }

      const approverId = Number(values.approval?.id || values.approval?.employeegid || 0);
      if (!approverId) {
        ToastMessage("Please Select Employee");
        return;
      }

      const data = {
        requestno: "NEW",
        requestdate: formatDateTime(values.requestDate || new Date()),
        reason: reasonId,
        startdate: formatDateTime(values.startDate),
        enddate: formatDateTime(values.endDate),
        durationdays: Number(values.durationDays || 1),
        ordernoremarks: values.remarks,
        permittedby: Number(values.permittedby.id),
        approval: approverId,
        empbranchgid: Number(values.empbranchgid.id || values.empbranchgid),
        comments: values.comments || "",
        transfer_on_promotion: [6, 7, 8].includes(reasonId) ? Number(values.transfer_on_promotion || 0) : 0,
        quantum_of_funds: reasonId === 2 ? Number(values.quantum_of_funds) : null,
        opening_balance: reasonId === 2 ? Number(values.opening_balance) : null,
        debit_branch: debitBranch,
        tour_exist: values.isOnGoingTour || values.isHoliday ? 1 : 0,

        ...(selectedOnBehalfEmp
          ? { onbehalfof: Number(selectedOnBehalfEmp.id || selectedOnBehalfEmp.employeegid) }
          : {}),

        detail: (values.details || []).map((item) => ({
          startdate: formatDateTime(item.detailStartDate),
          enddate: formatDateTime(item.detailEndDate),
          startingpoint: String(item.startingpoint?.name || item.startingpoint).trim(),
          placeofvisit: String(item.placeofvisit?.name || item.placeofvisit).trim(),
          purposeofvisit: String(item.purposeofvisit).trim(),
        })),
      };

      const uploadFiles = (files || []).map((file, index) => ({
        uri: file.uri,
        name: file.name || `file_${index}.jpg`,
        type: file.type || file.mimeType || "image/jpeg",
        size: file.size || 0,
      }));

      const response = await uploadMultipart({
        url: `${Environment.taServiceUrl}/taserv/tour`,
        data,
        files: uploadFiles,
        headers: {
          Authorization: `Token ${authToken}`,
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          ...(csrfCookie ? { "X-CSRFCookie": csrfCookie } : {}),
        },
      });

      if (response?.status === "success" || response?.message === "Success") {
        ToastMessage("Successfully Created");
        navigation.goBack();
      } else {
        ToastMessage(response?.description || response?.message || "Submission failed.");
      }
    } catch (error) {
      ToastMessage("Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------
  // Render
  // --------------------------------------------
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: CustomColors.appScreenColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: CustomColors.appScreenColor }}>

        {/* ✅ SelfOrOnBehalfModal – kept as is */}
        <SelfOrOnBehalfModal
          visible={isSelfModalVisible}
          onSubmit={handleSelfOrOnBehalfSubmit}
        />

        <Formik
          enableReinitialize={true}
          initialValues={initialFormValues}
          onSubmit={handleSubmit}
        >
          {({ values, handleChange, handleSubmit: formikSubmit, setFieldValue }) => {
            // Store ref for sync
            formikRef.current = { setFieldValue, values };

            return (
              <>
                <ScrollView style={screenStyles.container} keyboardShouldPersistTaps="handled" ref={scrollViewRef}>

                  {selectedOnBehalfEmp && (
                    <View style={screenStyles.onBehalfContainer}>
                      <View style={screenStyles.onBehalfIconWrap}>
                        <Ionicons name="person-circle-outline" size={moderateScale(22)} color={CustomColors.appThemeColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text allowFontScaling={false} style={screenStyles.onBehalfCaption}>CREATING ON BEHALF OF</Text>
                        <Text allowFontScaling={false} style={screenStyles.onBehalfName}>
                          {selectedOnBehalfEmp.full_name || selectedOnBehalfEmp.name}
                          {selectedOnBehalfEmp.employee_code ? ` (${selectedOnBehalfEmp.employee_code})` : ""}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Tour Information Section */}
                  <View style={screenStyles.sectionCard}>
                    <View style={screenStyles.sectionHeaderWrap}>
                      <View style={screenStyles.sectionHeaderLeft}>
                        <View style={screenStyles.sectionIconBadge}>
                          <Ionicons name="information-circle-outline" size={moderateScale(18)} color={CustomColors.appThemeColor} />
                        </View>
                        <Text allowFontScaling={false} style={screenStyles.sectionHeaderTitle}>Tour Information</Text>
                      </View>
                    </View>

                    <View style={screenStyles.infoGridRow}>
                      <View style={screenStyles.infoTile}>
                        <Text allowFontScaling={false} style={screenStyles.infoTileLabel}>Tour No</Text>
                        <View style={screenStyles.infoTileValueWrap}>
                          <Ionicons name="pricetag-outline" size={moderateScale(15)} color={CustomColors.appThemeColor} />
                          <Text allowFontScaling={false} style={screenStyles.infoTileValueHighlight}>
                            {values.tourNo || "NEW"}
                          </Text>
                        </View>
                      </View>
                      <View style={screenStyles.infoTile}>
                        <Text allowFontScaling={false} style={screenStyles.infoTileLabel}>Requested Date</Text>
                        <View style={screenStyles.infoTileValueWrap}>
                          <Ionicons name="calendar-outline" size={moderateScale(15)} color={CustomColors.textGray} />
                          <Text allowFontScaling={false} style={screenStyles.infoTileValue}>
                            {formatDate(values.requestDate || new Date())}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Employee Details Section */}
                  <View style={screenStyles.sectionCard}>
                    <View style={screenStyles.sectionHeaderWrap}>
                      <View style={screenStyles.sectionHeaderLeft}>
                        <View style={screenStyles.sectionIconBadge}>
                          <Ionicons name="person-outline" size={moderateScale(18)} color={CustomColors.appThemeColor} />
                        </View>
                        <Text allowFontScaling={false} style={screenStyles.sectionHeaderTitle}>Employee Details</Text>
                      </View>
                    </View>
                    {isLoadingEmpDetails ? (
                      <ActivityIndicator size="large" color={CustomColors.appThemeColor} style={{ marginVertical: verticalScale(14) }} />
                    ) : (
                      <>
                        <View style={screenStyles.empProfileCard}>
                          <View style={screenStyles.empAvatarWrap}>
                            <Ionicons name="person" size={moderateScale(22)} color={CustomColors.appThemeColor} />
                          </View>
                          <View style={{ flex: 1, marginLeft: horizontalScale(10) }}>
                            <Text allowFontScaling={false} style={screenStyles.empNameText}>
                              {values.empName || "Employee Name"}
                            </Text>
                            <Text allowFontScaling={false} style={screenStyles.empCodeBadge}>
                              Emp Code: {values.empCode || "N/A"}
                            </Text>
                          </View>
                        </View>

                        <View style={screenStyles.infoGridRow}>
                          <View style={screenStyles.infoTile}>
                            <Text allowFontScaling={false} style={screenStyles.infoTileLabel}>Designation</Text>
                            <Text allowFontScaling={false} style={screenStyles.infoTileValue} numberOfLines={1}>
                              {values.empDesign || "-"}
                            </Text>
                          </View>
                          <View style={screenStyles.infoTile}>
                            <Text allowFontScaling={false} style={screenStyles.infoTileLabel}>Grade</Text>
                            <Text allowFontScaling={false} style={screenStyles.infoTileValue} numberOfLines={1}>
                              {values.empGrade || "-"}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Tour Details Section */}
                  <View style={screenStyles.sectionCard}>
                    <View style={screenStyles.sectionHeaderWrap}>
                      <View style={screenStyles.sectionHeaderLeft}>
                        <View style={screenStyles.sectionIconBadge}>
                          <Ionicons name="briefcase-outline" size={moderateScale(18)} color={CustomColors.appThemeColor} />
                        </View>
                        <Text allowFontScaling={false} style={screenStyles.sectionHeaderTitle}>Tour Details</Text>
                      </View>
                    </View>

                    <View style={screenStyles.fieldGroup}>
                      <Text allowFontScaling={false} style={screenStyles.fieldLabel}>
                        Tour Reason <Text style={screenStyles.mandatory}>*</Text>
                      </Text>
                      <TouchableOpacity onPress={openReasonPicker} style={[screenStyles.fieldPicker, errors.reason && screenStyles.errorBorder]} ref={reasonRef} activeOpacity={0.8}>
                        <Text allowFontScaling={false} style={values.reason?.name ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                          {values.reason?.name ? String(values.reason.name) : "Select Reason"}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={CustomColors.mediumGray} />
                      </TouchableOpacity>
                    </View>

                    {[6, 7, 8].includes(Number(values.reason?.id)) && (
                      <View style={screenStyles.fieldGroup}>
                        <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Transfer On Promotion</Text>
                        <TouchableOpacity
                          style={screenStyles.fieldPicker}
                          onPress={() => setFieldValue("transfer_on_promotion", values.transfer_on_promotion === "1" ? "0" : "1")}
                          activeOpacity={0.8}
                        >
                          <Text allowFontScaling={false} style={screenStyles.fieldPickerText}>
                            {values.transfer_on_promotion === "1" ? "YES" : "NO"}
                          </Text>
                          <Ionicons name="swap-horizontal" size={18} color={CustomColors.appThemeColor} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {Number(values.reason?.id) === 2 && (
                      <View style={screenStyles.fieldGroup}>
                        <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Quantum of Funds <Text style={screenStyles.mandatory}>*</Text></Text>
                        <TextInput
                          ref={quantumOfFundsRef}
                          style={[screenStyles.fieldInput, errors.quantumOfFunds && screenStyles.errorBorder]}
                          keyboardType="numeric"
                          value={values.quantum_of_funds?.toString()}
                          onChangeText={handleChange("quantum_of_funds")}
                          placeholder="Enter Quantum of Funds"
                          placeholderTextColor={CustomColors.textLightGray || "#94a3b8"}
                          allowFontScaling={false}
                        />

                        <View style={{ marginTop: verticalScale(10) }}>
                          <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Opening Balance <Text style={screenStyles.mandatory}>*</Text></Text>
                          <TextInput
                            ref={openingBalanceRef}
                            style={[screenStyles.fieldInput, errors.openingBalance && screenStyles.errorBorder]}
                            keyboardType="numeric"
                            value={values.opening_balance?.toString()}
                            onChangeText={handleChange("opening_balance")}
                            placeholder="Enter Opening Balance"
                            placeholderTextColor={CustomColors.textLightGray || "#94a3b8"}
                            allowFontScaling={false}
                          />
                        </View>
                      </View>
                    )}

                    {Number(values.reason?.id) === 12 && (
                      <View style={screenStyles.fieldGroup}>
                        <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Debit Branch <Text style={screenStyles.mandatory}>*</Text></Text>
                        <TouchableOpacity
                          ref={debitBranchRef}
                          style={[screenStyles.fieldPicker, errors.debitBranch && screenStyles.errorBorder]}
                          onPress={() => openCityPicker("debit_branch", 0, "Debit Branch")}
                          activeOpacity={0.8}
                        >
                          <Text allowFontScaling={false} style={values.debit_branch?.name ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                            {values.debit_branch?.name ? String(values.debit_branch.name) : "Select Debit Branch"}
                          </Text>
                          <Ionicons name="chevron-down" size={18} color={CustomColors.mediumGray} />
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={screenStyles.infoGridRow}>
                      <View style={{ flex: 1 }}>
                        <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Tour Start Date <Text style={screenStyles.mandatory}>*</Text></Text>
                        <TouchableOpacity
                          onPress={() => {
                            setDateField("startDate");
                            setCurrentDetailDateFieldIndex(null);
                            setDatePickerVisibility(true);
                          }}
                          ref={startDateRef}
                          style={[screenStyles.fieldPicker, errors.startDate && screenStyles.errorBorder]}
                          activeOpacity={0.8}
                        >
                          <Text allowFontScaling={false} style={values.startDate ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                            {values.startDate ? formatDate(values.startDate) : "Start Date"}
                          </Text>
                          <Ionicons name="calendar-outline" size={18} color={CustomColors.appThemeColor} />
                        </TouchableOpacity>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Tour End Date <Text style={screenStyles.mandatory}>*</Text></Text>
                        <TouchableOpacity
                          onPress={() => {
                            setDateField("endDate");
                            setCurrentDetailDateFieldIndex(null);
                            setDatePickerVisibility(true);
                          }}
                          ref={endDateRef}
                          style={[screenStyles.fieldPicker, errors.endDate && screenStyles.errorBorder]}
                          activeOpacity={0.8}
                        >
                          <Text allowFontScaling={false} style={values.endDate ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                            {values.endDate ? formatDate(values.endDate) : "End Date"}
                          </Text>
                          <Ionicons name="calendar-outline" size={18} color={CustomColors.appThemeColor} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Total Duration Days pill */}
                    <View style={screenStyles.durationBadgeWrap}>
                      <Ionicons name="time-outline" size={16} color={CustomColors.appThemeColor} />
                      <Text allowFontScaling={false} style={screenStyles.durationBadgeText}>
                        Total Tour Days: <Text style={{ fontFamily: Fonts.bold }}>{String(values.durationDays || 0)} Days</Text>
                      </Text>
                    </View>

                    <View style={screenStyles.fieldGroup}>
                      <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Order No or Remarks <Text style={screenStyles.mandatory}>*</Text></Text>
                      <TextInput
                        ref={remarksRef}
                        style={[screenStyles.fieldInput, errors.remarks && screenStyles.errorBorder]}
                        value={values.remarks}
                        onChangeText={handleChange("remarks")}
                        placeholder="Enter Order No or Remarks"
                        placeholderTextColor={CustomColors.textLightGray || "#94a3b8"}
                        allowFontScaling={false}
                      />
                    </View>

                    <View style={screenStyles.fieldGroup}>
                      <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Permitted By <Text style={screenStyles.mandatory}>*</Text></Text>
                      <TouchableOpacity onPress={openPermittedByPicker} style={[screenStyles.fieldPicker, errors.permittedby && screenStyles.errorBorder]} ref={permittedByRef} activeOpacity={0.8}>
                        <Text allowFontScaling={false} style={(values.permittedby?.full_name || values.permittedby?.name) ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                          {values.permittedby?.code ? `(${values.permittedby.code}) ` : ""}
                          {values.permittedby?.full_name || values.permittedby?.name || "Select Employee"}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={CustomColors.mediumGray} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* To Approver Section */}
                  <View style={screenStyles.sectionCard}>
                    <View style={screenStyles.sectionHeaderWrap}>
                      <View style={screenStyles.sectionHeaderLeft}>
                        <View style={screenStyles.sectionIconBadge}>
                          <Ionicons name="shield-checkmark-outline" size={moderateScale(18)} color={CustomColors.appThemeColor} />
                        </View>
                        <Text allowFontScaling={false} style={screenStyles.sectionHeaderTitle}>To Approver</Text>
                      </View>
                    </View>

                    <View style={screenStyles.fieldGroup}>
                      <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Approver Branch <Text style={screenStyles.mandatory}>*</Text></Text>
                      <TouchableOpacity onPress={openApproverBranchPicker} style={[screenStyles.fieldPicker, errors.approverBranch && screenStyles.errorBorder]} ref={approverBranchRef} activeOpacity={0.8}>
                        <Text allowFontScaling={false} style={values.empbranchgid?.name ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                          {values.empbranchgid?.name ? ` ${values.empbranchgid.name}` : "Select Branch"}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={CustomColors.mediumGray} />
                      </TouchableOpacity>
                    </View>

                    <View style={screenStyles.fieldGroup}>
                      <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Approver Employee <Text style={screenStyles.mandatory}>*</Text></Text>
                      <TouchableOpacity onPress={() => openApproverEmpPicker(values.empbranchgid?.id)} style={[screenStyles.fieldPicker, errors.approval && screenStyles.errorBorder]} ref={approverEmpRef} activeOpacity={0.8}>
                        <Text allowFontScaling={false} style={(values.approval?.full_name || values.approval?.name) ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                          {values.approval?.full_name || values.approval?.name || "Select Employee"}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={CustomColors.mediumGray} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Itinerary Details */}
                  <View style={screenStyles.sectionCard}>
                    <View style={screenStyles.sectionHeaderWrap}>
                      <View style={screenStyles.sectionHeaderLeft}>
                        <View style={screenStyles.sectionIconBadge}>
                          <Ionicons name="map-outline" size={moderateScale(18)} color={CustomColors.appThemeColor} />
                        </View>
                        <Text allowFontScaling={false} style={screenStyles.sectionHeaderTitle}>Tour Itinerary</Text>
                      </View>
                      <View style={screenStyles.legBadge}>
                        <Text allowFontScaling={false} style={screenStyles.legBadgeText}>
                          {values.details.length} {values.details.length === 1 ? "Stop" : "Stops"}
                        </Text>
                      </View>
                    </View>

                    {values.details.map((item, index) => (
                      <View key={index} style={screenStyles.itineraryLegCard}>
                        <View style={screenStyles.itineraryLegHeader}>
                          <View style={screenStyles.legBadge}>
                            <Text allowFontScaling={false} style={screenStyles.legBadgeText}>Leg {index + 1}</Text>
                          </View>

                          {values.details.length > 1 && (
                            <TouchableOpacity
                              style={screenStyles.deleteLegBtn}
                              onPress={() => {
                                const newDetails = [...values.details];
                                newDetails.splice(index, 1);
                                setFieldValue("details", newDetails);
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={15} color="#ef4444" />
                              <Text allowFontScaling={false} style={screenStyles.deleteLegText}>Remove</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={screenStyles.infoGridRow}>
                          <View style={{ flex: 1 }}>
                            <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Start Date <Text style={screenStyles.mandatory}>*</Text></Text>
                            <TouchableOpacity
                              onPress={() => {
                                if (!values.startDate || !values.endDate) {
                                  ToastMessage("Please select Tour Start Date and Tour End Date first");
                                  return;
                                }
                                setDateField("detailStartDate");
                                setCurrentDetailDateFieldIndex(index);
                                setDatePickerVisibility(true);
                              }}
                              style={[screenStyles.fieldPicker, errors?.details?.[index]?.detailStartDate && screenStyles.errorBorder]}
                              activeOpacity={0.8}
                            >
                              <Text allowFontScaling={false} style={item.detailStartDate ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                                {item.detailStartDate ? formatDate(item.detailStartDate) : "Start Date"}
                              </Text>
                              <Ionicons name="calendar-outline" size={17} color={CustomColors.appThemeColor} />
                            </TouchableOpacity>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text allowFontScaling={false} style={screenStyles.fieldLabel}>End Date <Text style={screenStyles.mandatory}>*</Text></Text>
                            <TouchableOpacity
                              onPress={() => {
                                if (!values.startDate || !values.endDate) {
                                  ToastMessage("Please select Tour Start Date and Tour End Date first");
                                  return;
                                }
                                setDateField("detailEndDate");
                                setCurrentDetailDateFieldIndex(index);
                                setDatePickerVisibility(true);
                              }}
                              style={[screenStyles.fieldPicker, errors?.details?.[index]?.detailEndDate && screenStyles.errorBorder]}
                              activeOpacity={0.8}
                            >
                              <Text allowFontScaling={false} style={item.detailEndDate ? screenStyles.fieldPickerText : screenStyles.fieldPickerPlaceholder} numberOfLines={1}>
                                {item.detailEndDate ? formatDate(item.detailEndDate) : "End Date"}
                              </Text>
                              <Ionicons name="calendar-outline" size={17} color={CustomColors.appThemeColor} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={screenStyles.fieldGroup}>
                          <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Starting Point <Text style={screenStyles.mandatory}>*</Text></Text>
                          <TextInput
                            style={[screenStyles.fieldInput, errors.details?.[index]?.startingpoint && screenStyles.errorBorder]}
                            placeholder="Enter Starting Point"
                            placeholderTextColor={CustomColors.textLightGray || "#94a3b8"}
                            value={item.startingpoint}
                            onChangeText={(text) => setFieldValue(`details[${index}].startingpoint`, text)}
                            allowFontScaling={false}
                          />
                        </View>

                        <View style={screenStyles.fieldGroup}>
                          <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Place of Visit <Text style={screenStyles.mandatory}>*</Text></Text>
                          <TextInput
                            style={[screenStyles.fieldInput, errors.details?.[index]?.placeofvisit && screenStyles.errorBorder]}
                            placeholder="Enter Place of Visit"
                            placeholderTextColor={CustomColors.textLightGray || "#94a3b8"}
                            value={item.placeofvisit}
                            onChangeText={(text) => setFieldValue(`details[${index}].placeofvisit`, text)}
                            allowFontScaling={false}
                          />
                        </View>

                        <View style={screenStyles.fieldGroup}>
                          <Text allowFontScaling={false} style={screenStyles.fieldLabel}>Purpose of Visit <Text style={screenStyles.mandatory}>*</Text></Text>
                          <TextInput
                            style={[screenStyles.fieldInput, errors.details?.[index]?.purposeofvisit && screenStyles.errorBorder]}
                            placeholder="Enter Purpose of Visit"
                            placeholderTextColor={CustomColors.textLightGray || "#94a3b8"}
                            value={item.purposeofvisit}
                            onChangeText={(text) => setFieldValue(`details[${index}].purposeofvisit`, text)}
                            allowFontScaling={false}
                          />
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={screenStyles.addLegBtn}
                      onPress={() => setFieldValue("details", [...values.details, { ...emptyDetailRow }])}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={CustomColors.appThemeColor} />
                      <Text allowFontScaling={false} style={screenStyles.addLegBtnText}>Add Another Tour Stop</Text>
                    </TouchableOpacity>
                  </View>

                  {/* File Upload Section */}
                  <View ref={fileUploadRef} style={[screenStyles.sectionCard, errors?.fileUpload && screenStyles.errorBorder]}>
                    <View style={screenStyles.sectionHeaderWrap}>
                      <View style={screenStyles.sectionHeaderLeft}>
                        <View style={screenStyles.sectionIconBadge}>
                          <Ionicons name="attach-outline" size={moderateScale(18)} color={CustomColors.appThemeColor} />
                        </View>
                        <Text allowFontScaling={false} style={screenStyles.sectionHeaderTitle}>File Attachments</Text>
                      </View>
                      {files.length > 0 && (
                        <View style={screenStyles.legBadge}>
                          <Text allowFontScaling={false} style={screenStyles.legBadgeText}>
                            {files.length} {files.length === 1 ? "File" : "Files"}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={screenStyles.fileActionRow}>
                      <TouchableOpacity style={screenStyles.fileActionBtn} onPress={pickFiles} activeOpacity={0.8}>
                        <Ionicons name="document-attach-outline" size={20} color="#ffffff" />
                        <Text allowFontScaling={false} style={screenStyles.fileActionText}>Pick Documents</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={[screenStyles.fileActionBtn, screenStyles.fileActionBtnCamera]} onPress={openCamera} activeOpacity={0.8}>
                        <Ionicons name="camera-outline" size={20} color="#ffffff" />
                        <Text allowFontScaling={false} style={screenStyles.fileActionText}>Use Camera</Text>
                      </TouchableOpacity>
                    </View>

                    {files.length > 0 && (
                      <FileDisplaySection
                        title="Selected Files"
                        files={files}
                        handleViewFile={handleWebViewFile}
                        removeFile={removeFile}
                        isEditable={true}
                      />
                    )}
                  </View>

                  <View style={{ height: 40 }} />

                  {isDatePickerVisible && (() => {
                    let pickerValue = new Date();
                    let minDate = undefined;
                    let maxDate = undefined;

                    if (currentDetailDateFieldIndex !== null) {
                      const leg = values.details?.[currentDetailDateFieldIndex];
                      const tourStart = values.startDate ? new Date(values.startDate) : null;
                      const tourEnd = values.endDate ? new Date(values.endDate) : null;

                      minDate = tourStart || undefined;
                      maxDate = tourEnd || undefined;

                      if (dateField === "detailStartDate") {
                        if (leg?.detailStartDate) {
                          pickerValue = new Date(leg.detailStartDate);
                        } else if (tourStart) {
                          pickerValue = tourStart;
                        }
                      } else if (dateField === "detailEndDate") {
                        if (leg?.detailStartDate) {
                          minDate = new Date(leg.detailStartDate);
                        }
                        if (leg?.detailEndDate) {
                          pickerValue = new Date(leg.detailEndDate);
                        } else if (leg?.detailStartDate) {
                          pickerValue = new Date(leg.detailStartDate);
                        } else if (tourEnd) {
                          pickerValue = tourEnd;
                        }
                      }

                      if (minDate && pickerValue < minDate) {
                        pickerValue = minDate;
                      }
                      if (maxDate && pickerValue > maxDate) {
                        pickerValue = maxDate;
                      }
                    } else {
                      if (dateField === "startDate") {
                        if (values.startDate) {
                          pickerValue = new Date(values.startDate);
                        }
                      } else if (dateField === "endDate") {
                        if (values.endDate) {
                          pickerValue = new Date(values.endDate);
                        } else if (values.startDate) {
                          pickerValue = new Date(values.startDate);
                        }
                        if (values.startDate) {
                          minDate = new Date(values.startDate);
                        }
                      }
                    }

                    return (
                      <DateTimePicker
                        value={pickerValue}
                        mode="date"
                        display="default"
                        minimumDate={minDate}
                        maximumDate={maxDate}
                        onChange={(event, selectedDate) => handleConfirmDate(event, selectedDate, setFieldValue, values)}
                      />
                    );
                  })()}

                  {/* Reason Picker */}
                  {isReasonPickerVisible && (
                    <CustomActionSheetPicker
                      pickerStatus={isReasonPickerVisible}
                      setPickerStatus={setReasonPickerVisibility}
                      title="Select Reason"
                      optionsData={reasons.map((reason) => ({ label: String(reason.name), value: reason.id }))}
                      RenderItem={RenderDropdownItem}
                      onPress={(selectedOption) => {
                        setFieldValue("reason", { id: selectedOption.value, name: selectedOption.label });
                        setErrors((prev) => ({ ...prev, reason: false }));
                        setReasonPickerVisibility(false);
                      }}
                      selected={{ label: values.reason?.name, value: values.reason?.id }}
                      onSearch={handleSearchReason}
                      isLoading={isFetchingReason}
                    />
                  )}

                  {/* CUSTOM PERMITTED BY MODAL */}
                  <Modal
                    visible={isPermittedByModalVisible}
                    transparent={true}
                    animationType="slide"
                    statusBarTranslucent
                    onRequestClose={() => setPermittedByModalVisible(false)}
                  >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                      <Pressable
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => setPermittedByModalVisible(false)}
                      />
                      <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ width: '100%', maxHeight: '85%' }}
                        pointerEvents="box-none"
                      >
                        <View
                          style={{
                            backgroundColor: isDark ? "#1e293b" : "#ffffff",
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            paddingHorizontal: moderateScale(16),
                            paddingTop: moderateScale(16),
                            paddingBottom: Platform.OS === 'ios' ? moderateScale(28) : moderateScale(16),
                            height: 520,
                            maxHeight: '100%',
                          }}
                        >
                          {/* Top drag handle indicator */}
                          <View style={{ alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? "#475569" : "#cbd5e1" }} />
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text allowFontScaling={false} style={{ fontSize: moderateScale(17), fontFamily: Fonts.bold, color: CustomColors.textDark || "#0f172a" }}>
                              Select Permitted By
                            </Text>
                            <TouchableOpacity onPress={() => setPermittedByModalVisible(false)} style={{ padding: 4 }}>
                              <Ionicons name="close" size={24} color={CustomColors.textDark || "#0f172a"} />
                            </TouchableOpacity>
                          </View>

                          <View style={{ marginBottom: 12 }}>
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
                              borderRadius: moderateScale(10),
                              paddingHorizontal: horizontalScale(12),
                              borderWidth: 1,
                              borderColor: isDark ? "#334155" : "#cbd5e1",
                            }}>
                              <Ionicons name="search-outline" size={18} color={CustomColors.textSecondary || "#64748b"} style={{ marginRight: 8 }} />
                              <TextInput
                                style={{
                                  flex: 1,
                                  paddingVertical: verticalScale(10),
                                  fontSize: moderateScale(14),
                                  fontFamily: Fonts.medium,
                                  color: CustomColors.textDark || "#0f172a",
                                }}
                                placeholder="Search employee by name or code..."
                                placeholderTextColor={CustomColors.textLightGray || "#94a3b8"}
                                value={permittedBySearch}
                                onChangeText={onPermittedBySearch}
                                allowFontScaling={false}
                                returnKeyType="search"
                                autoCorrect={false}
                                autoCapitalize="none"
                              />
                              {permittedBySearch ? (
                                <TouchableOpacity onPress={() => onPermittedBySearch("")} style={{ padding: 4 }}>
                                  <Ionicons name="close-circle" size={18} color={CustomColors.textLightGray || "#94a3b8"} />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>

                          {isPermittedByFetching && permittedByList.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
                            </View>
                          ) : (
                            <FlatList
                              data={permittedByList}
                              keyExtractor={(item, index) => String(item.id || item.employeegid || item.code || index)}
                              renderItem={({ item }) => {
                                const isSelected = selectedPermittedBy?.id === item.id || values.permittedby?.id === item.id;
                                const displayText = item.code
                                  ? `(${item.code}) ${item.full_name || item.name || ""}`
                                  : (item.full_name || item.name || "");
                                return (
                                  <TouchableOpacity
                                    style={[
                                      styles.actionSheetOption,
                                      isSelected && styles.actionSheetOptionSelected,
                                      { borderRadius: 8, marginVertical: 2 }
                                    ]}
                                    onPress={() => {
                                      const selectedObj = {
                                        id: item.id || item.employeegid,
                                        code: item.code || "",
                                        full_name: item.full_name || item.name || "",
                                        name: item.full_name || item.name || "",
                                      };
                                      setSelectedPermittedBy(selectedObj);
                                      setFieldValue("permittedby", selectedObj);
                                      setErrors((prev) => ({ ...prev, permittedby: false }));
                                      setPermittedByModalVisible(false);
                                    }}
                                  >
                                    <Text
                                      allowFontScaling={false}
                                      style={[
                                        styles.actionSheetOptionText,
                                        isSelected && styles.actionSheetOptionTextSelected,
                                        { fontSize: moderateScale(15) }
                                      ]}
                                    >
                                      {displayText}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              }}
                              onEndReached={loadMorePermittedBy}
                              onEndReachedThreshold={0.3}
                              keyboardShouldPersistTaps="handled"
                              ListFooterComponent={
                                isPermittedByFetchingMore ? (
                                  <View style={{ paddingVertical: 12 }}>
                                    <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
                                  </View>
                                ) : null
                              }
                              ListEmptyComponent={
                                !isPermittedByFetching ? (
                                  <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                    <Ionicons name="people-outline" size={36} color={CustomColors.textLightGray || "#94a3b8"} style={{ marginBottom: 8 }} />
                                    <Text allowFontScaling={false} style={{ textAlign: 'center', color: CustomColors.textSecondary || "#64748b", fontFamily: Fonts.medium }}>
                                      No employees found
                                    </Text>
                                  </View>
                                ) : null
                              }
                              style={{ flex: 1 }}
                              contentContainerStyle={{ paddingBottom: moderateScale(16) }}
                            />
                          )}
                        </View>
                      </KeyboardAvoidingView>
                    </View>
                  </Modal>

                  {/* Approver Branch Picker */}
                  {isApproverBranchPickerVisible && (
                    <CustomActionSheetPicker
                      pickerStatus={isApproverBranchPickerVisible}
                      setPickerStatus={setApproverBranchPickerVisibility}
                      title="Select Approver Branch"
                      optionsData={approverBranchList.map((b) => ({ label: `(${b.code || ''}) ${b.name}`, value: b.id, raw: b }))}
                      RenderItem={RenderDropdownItem}
                      onPress={(selectedOption) => {
                        setFieldValue("empbranchgid", { id: selectedOption.value, name: selectedOption.label });
                        setFieldValue("approval", null);
                        setApproverBranchPickerVisibility(false);
                      }}
                      selected={{ label: values.empbranchgid?.name }}
                      onSearch={(text) => {
                        triggerBranchList({ name: safeSearchText(text), page: 1 })
                          .unwrap()
                          .then((res) => setApproverBranchList(res?.data || []))
                          .catch(() => setApproverBranchList([]));
                      }}
                      isLoading={isBranchLoading}
                    />
                  )}

                  {/* Approver Employee Picker */}
                  {isApproverEmpPickerVisible && (
                    <CustomActionSheetPicker
                      pickerStatus={isApproverEmpPickerVisible}
                      setPickerStatus={setApproverEmpPickerVisibility}
                      title="Select Approver Employee"
                      optionsData={approverEmpList.map((emp) => ({ label: `(${emp.code || ''}) ${emp.full_name || emp.name || emp.employee_name}`, value: emp.id || emp.employeegid }))}
                      RenderItem={RenderDropdownItem}
                      onPress={(selectedOption) => {
                        setFieldValue("approval", { id: selectedOption.value, full_name: selectedOption.label });
                        setErrors((prev) => ({ ...prev, approval: false }));
                        setApproverEmpPickerVisibility(false);
                      }}
                      selected={{ label: `(${values.approval?.code || ''})${values.approval?.full_name || values.approval?.name}`, value: values.approval?.id }}
                      onSearch={(text) => {
                        const targetBranch = values.empbranchgid?.id || getBranchId();
                        triggerApproverEmpList({ branch: targetBranch, name: safeSearchText(text), page: 1 })
                          .unwrap()
                          .then((res) => setApproverEmpList(res?.data || []))
                          .catch(() => setApproverEmpList([]));
                      }}
                      isLoading={isApproverEmpLoading}
                    />
                  )}

                  {/* City / Debit Branch Picker */}
                  {isCityPickerVisible && (
                    <CustomActionSheetPicker
                      pickerStatus={isCityPickerVisible}
                      setPickerStatus={setCityPickerVisibility}
                      title={`Select ${selectedFieldTitle}`}
                      optionsData={cities.map((city) => ({ label: String(city.name), value: city.name }))}
                      RenderItem={RenderDropdownItem}
                      onPress={async (selectedOption) => {
                        setFieldValue("debit_branch", { id: selectedOption.value, name: selectedOption.label });
                        setCityPickerVisibility(false);
                      }}
                      selected={{ label: values.debit_branch?.name }}
                      onSearch={handleSearchCity}
                      isLoading={isLoadingCity}
                    />
                  )}
                </ScrollView>

                <View style={screenStyles.submitBar}>
                  <Animated.View style={{ opacity: opacityAnim }}>
                    <TouchableOpacity
                      style={[screenStyles.submitBtn, isSubmitting && screenStyles.submitBtnDisabled]}
                      onPress={formikSubmit}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={CustomColors.textWhite || "#ffffff"} size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={22} color="#ffffff" />
                          <Text allowFontScaling={false} style={screenStyles.submitBtnText}>Submit Tour Request</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </>
            );
          }}
        </Formik>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default TravelMakerCreateScreen;