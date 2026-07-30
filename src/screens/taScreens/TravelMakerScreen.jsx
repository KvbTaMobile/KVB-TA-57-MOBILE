import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
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
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { Fonts } from '../../styles/Fonts';
import { SafeAreaView } from "react-native-safe-area-context";
import {
  setMode,
  setSelectedEmployee,
  resetSelfOrOnBehalf,
} from "../../redux/slices/SelfOrOnBehalfSlice";
import SelfOrOnBehalfModal from "../../TaComponents/models/SelfOrOnBehalfModal";
import RequirementDetailModal from "../../TaComponents/models/RequirementDetailModal";
import RequirementSummaryCard from "../../TaComponents/cards/RequirementSummaryCard";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { moderateScale, verticalScale, horizontalScale } from '../../styles/Metrics';
// import ApproverModal from "../../components/models/ApproverSelectModel";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import FileDisplaySection from "../../TaComponents/cards/FileDisplaySection";
import ExpandableSection from "../../TaComponents/cards/ExpandableSection";
import * as create_styles from "../../styles/StyleSheet";
import {
  useLazyEmpDetailsQuery,
  useLazyTourReasonListQuery,
  useTourSubmitMutation,
  useLazyTourDataGetQuery,
  useLazyDocumentDataGetQuery,
  useTourApproveMutation,
  useTourRejectMutation,
  useTourReturnMutation,
  useTourForwardMutation,
  useTourCancelMutation,
  useHolidayCheckMutation,
  useLazyDepartmentDetailGetQuery,
  useLazyCommonDropDownGetQuery,
  useLazyClientListTaQuery,
  useLazyCityListQuery,
  useDeleteRequirementMutation,
  useLazyEmpBaseGetQuery,
  useLazyGetApprovalFlowQuery, 
  // useGetChatBoxQuery
} from "../../redux/rtk_query/apiSlice";
import {
  updateField,
  resetForm,
  setIsApprovalFlowLoading, setApprovalFlow
} from "../../redux/slices/travelMakerFormSlice";
import {
  setReasonList,
  clearDropdownData,
  setCityList,
  setCommonDropDownList,
  setClientList,
  updateReasonList,
  updateCityList,
  updateClientList,
} from "../../redux/slices/Dropdowns";
import { getCustomColors } from "../../styles/CustomColors";
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";

import { Environment } from "../../environment/Environment";
import * as ImagePicker from 'expo-image-picker';
import { uploadMultipart } from "../../utilities/upload";
import { pickDocuments } from "../../utilities/filePicker";
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
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const formatDateForApi = (value) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

const TravelMakerCreateScreen = ({ route, navigation }) => {
  const tourDataParams = route?.params?.tourDataParams;
  const tour_id = route?.params?.tour_id;
  const from = route?.params?.from;


  const dispatch = useDispatch();
  const { reasons, cities, common, client } = useSelector(
    (state) => state.Dropdowns
  );
  const { mode, selectedEmployee } = useSelector(
    (state) => state.selfOrOnBehalf
  );
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const styles = create_styles.create_styles(isDark);
  const globalStyles = create_styles.styles(isDark);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [dateField, setDateField] = useState(null);
  const [currentDetailDateFieldIndex, setCurrentDetailDateFieldIndex] =
    useState(null);
  // New state for detail row date pickers
  const [files, setFiles] = useState([]);
  const [isReasonPickerVisible, setReasonPickerVisibility] = useState(false);
  const [isCityPickerVisible, setCityPickerVisibility] = useState(false);
  const [isClientPickerVisible, setClientPickerVisibility] = useState(false);
  const [isCommonDropDownPickerVisible, setCommonDropDownPickerVisibility] =
    useState(false);

  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonPage, setReasonPage] = useState(0);
  const [CityPage, setCityPage] = useState(1);
  const [ClientPage, setClientPage] = useState(1);
  // const [CommonDropDownPage, setCommonDropDownPage] = useState(0);
  const [hasMoreReasons, setHasMoreReasons] = useState(true);
  const [hasMoreCity, setHasMoreCity] = useState(true);
  const [hasMoreClient, setHasMoreClient] = useState(true);
  // const [hasMoreCommonDropDown, setHasMoreCommonDropDown] = useState(true);
  const [currentReasonSearchQuery, setCurrentReasonSearchQuery] = useState("");
  const [currentCitySearchQuery, setCurrentCitySearchQuery] = useState("");
  const [currentClientSearchQuery, setCurrentClientSearchQuery] = useState("");
  // const [currentCommonDropDownSearchQuery, setCurrentCommonDropDownSearchQuery] = useState("");
  // const [selectedCommonDropDown, setSelectedCommonDropDown] = useState(0);
  const [isEditable, setIsEditable] = useState(true);
  const [isMaker, setIsMaker] = useState(true);
  const [isChecker, setIsChecker] = useState(false);
  const authRedux = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [isAppoverEditable, setIsAppoverEditable] = useState(false);
  const [isForword, setIsForword] = useState(false);
  const [isCancelMaker, setIsCancelMaker] = useState(false);
  const [isCancelMakerDisabled, setIsCancelMakerDisabled] = useState(true);
  const [onBehalModel, setOnBehalModel] = useState(false);
  const [selectedFieldTitle, setSelectedFieldTitle] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [PickerTarget, setPickerTarget] = useState({
    field: "",
    index: null,
    key: "official",
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState({
    detailIndex: null,
    requirementIndex: null,
  });
  const [triggerEmpBaseGet, { data: empBaseData }] = useLazyEmpBaseGetQuery();
  const [triggerApprovalFlow] = useLazyGetApprovalFlowQuery();
  // const { data: chatBoxData, isFetching, refetch } = useGetChatBoxQuery(
  //   { tourid: tour_id, page: 1 },
  //   { skip: !tour_id }
  // );

  // const unreadCount =
  //   chatBoxData?.data?.reduce(
  //     (sum, item) => sum + (item.unread_message || 0),
  //     0
  //   ) || 0;

  const [NonBasereasons, setNonBaseReasons] = useState([]);
  const [showNonBaseReason, setShowNonBaseReason] = useState(false);

  const [isNonBaseReasonPickerVisible, setNonBaseReasonPickerVisibility] = useState(false);
  const [nonBaseReasonOptions, setNonBaseReasonOptions] = useState([]); // You can populate this later



  const scrollViewRef = useRef(null);
  const reasonRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const remarksRef = useRef(null);
  const branchRef = useRef(null);
  const approverRef = useRef(null);
  const accommodationCostRef = useRef(null);
  const flightCostRef = useRef(null);
  const week_end_travelRef = useRef(null);
  const otherCostRef = useRef(null);
  const detailRefs = useRef([]);
  const nonbaseRef = useRef(null)
  const fileUploadRef = useRef(null);
  const [errors, setErrors] = useState({
    reason: false,
    startDate: false,
    endDate: false,
    remarks: false,
    branch: false,
    approver: false,
    NonBasereason: false,
    details: [],
    fileUpload: false,
  });
  const modalstyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.appScreenColor,
      padding: moderateScale(10), // Consistent padding
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.appScreenColor,
      padding: moderateScale(20),
    },
    loadingText: {
      marginTop: verticalScale(10),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
      fontSize: moderateScale(14),
    },
    errorText: {
      color: CustomColors.dangerRed,
      marginBottom: verticalScale(10),
      fontSize: moderateScale(16),
      textAlign: 'center',
      fontFamily: Fonts.regular,
    },
    retryButton: {
      backgroundColor: CustomColors.primaryBlue,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      borderRadius: moderateScale(5),
      marginTop: verticalScale(10),
    },
    fullWidthButton: {
      width: '100%',
      paddingVertical: verticalScale(15),
      borderRadius: moderateScale(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      color: CustomColors.textGray
    },
    selectedText: { color: CustomColors.textBlack },
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
    fullWidthButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(16),
      fontWeight: 'bold',
      fontFamily: Fonts.bold,
    },
    retryButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(16),
      fontWeight: 'bold',
      fontFamily: Fonts.semiBold,
    },
    noDataText: {
      fontSize: moderateScale(16),
      color: CustomColors.textGray,
      fontFamily: Fonts.regular,
      textAlign: 'center',
      marginTop: verticalScale(20),
      marginBottom: verticalScale(20),
    },
    // Header styles
    headerRightContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginLeft: horizontalScale(10),
    },
    addIconContainer: {
      padding: moderateScale(5),
      borderRadius: moderateScale(15), // Make it circular
    },

    // Tour Number at Top
    tourNoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center the tour number
      marginBottom: verticalScale(20),
      paddingVertical: verticalScale(10),
      backgroundColor: CustomColors.backgroundGray,
      borderRadius: moderateScale(8),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(4),
      elevation: 3,
      // borderColor: CustomColors.borderLight,
      borderWidth: 2,
      borderColor: CustomColors.appThemeColor,
    },
    tourNoLabel: {
      fontSize: moderateScale(20),
      fontFamily: Fonts.bold,
      color: CustomColors.textDark,
      marginRight: horizontalScale(8),
    },
    tourNoValue: {
      fontSize: moderateScale(22),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor, // Highlight color
    },
    required: {
      color: CustomColors.dangerRed,
    },
    // Expense Item Cards (Main List)
    expenseItemCard: {
      backgroundColor: CustomColors.cardBackground,
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(15),
      shadowColor: CustomColors.iconBlack,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.05,
      shadowRadius: moderateScale(6),
      elevation: 3,
      overflow: 'hidden',
      borderColor: CustomColors.appThemeColor,
      borderWidth: 1,
    },
    disabledItemCard: {
      opacity: 0.7, // Only visually disabled, still clickable for navigation
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(20),
      backgroundColor: CustomColors.backgroundGray2,
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderLight,
    },
    cardItemTitle: {
      fontSize: moderateScale(17),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor,
      flex: 1,
      paddingRight: horizontalScale(10),
    },
    cardContent: {
      padding: moderateScale(15),
    },
    cardDetailRow: {
      flexDirection: 'row',
      marginBottom: verticalScale(4),
    },
    label: { // General label style
      fontSize: moderateScale(15),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
      marginRight: horizontalScale(5),
    },
    cardLabel: { // Label within a card
      fontSize: moderateScale(14),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
      marginRight: horizontalScale(5),
    },
    cardValue: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.regular,
      color: CustomColors.textDarkGray,
      flexShrink: 1,
    },
    totalAmountCard: {
      backgroundColor: CustomColors.statusGreen,
      borderRadius: moderateScale(10),
      padding: moderateScale(15),
      marginTop: verticalScale(20),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(4),
      elevation: 3,
    },
    ccbsCard: {
      backgroundColor: CustomColors.primaryBlue,
      borderRadius: moderateScale(10),
      padding: moderateScale(15),
      marginTop: verticalScale(20),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(4),
      elevation: 3,
    },
    totalAmountLabel: {
      fontSize: moderateScale(18),
      fontFamily: Fonts.bold,
      color: CustomColors.white,
    },
    totalAmountValue: {
      fontSize: moderateScale(18),
      fontFamily: Fonts.bold,
      color: CustomColors.white,
    },
    // Attachment Section (used within modal and inside item cards)
    attachmentSectionWrapper: {
      marginTop: verticalScale(15), // Spacing above attachments in the card
      paddingTop: verticalScale(10),
      borderTopWidth: 1,
      borderTopColor: CustomColors.appThemeColor,
    },
    attachmentHeader: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.semiBold,
      color: CustomColors.primaryBlue,
      marginBottom: verticalScale(10),
    },
    attachmentButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: verticalScale(10),
      marginBottom: verticalScale(15),
      gap: horizontalScale(10),
    },
    pickFileButton: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: CustomColors.primaryBlue,
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(10),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: CustomColors.white,
      fontSize: moderateScale(14),
      fontFamily: Fonts.semiBold,
      marginLeft: horizontalScale(8),
    },
    disabledButton: {
      backgroundColor: CustomColors.buttonDisabled,
    },
    noAttachmentsText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.Italic,
      color: CustomColors.textLightGray,
      marginTop: verticalScale(10),
      textAlign: 'center',
    },
    // Add Expense Modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.backgroundtransparent,
    },
    modalContent: {
      backgroundColor: CustomColors.modal_background,
      borderRadius: moderateScale(15),
      padding: moderateScale(25),
      width: '90%',
      maxHeight: '85%',
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.25,
      shadowRadius: moderateScale(8),
      elevation: 10,
    },
    modalHeaderIcon: {
      alignItems: "flex-end"
    },
    modalTitle: {
      fontSize: moderateScale(20),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor,
      marginBottom: verticalScale(20),
      textAlign: 'center',
    },
    formField: {
      marginBottom: verticalScale(18),
    },
    pickerContainer: {
      borderColor: CustomColors.borderLight,
      borderWidth: 1,
      borderRadius: moderateScale(8),
      overflow: 'hidden',
      backgroundColor: CustomColors.inputBackground,
    },
    picker: {
      height: verticalScale(60),
      width: '100%',
      color: CustomColors.textDark,
    },
    fixedButtonContainer: {
      position: 'absolute',
      bottom: 20,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    pickerItem: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.regular,
      color: CustomColors.textDark,
    },
    pickerPlaceholder: {
      color: CustomColors.textLightGray,
    },
    input: {
      borderColor: CustomColors.borderLight,
      borderWidth: 1,
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(15),
      paddingVertical: verticalScale(12),
      fontSize: moderateScale(16),
      fontFamily: Fonts.regular,
      backgroundColor: CustomColors.inputBackground,
      color: CustomColors.textDark,
    },
    multilineInput: {
      minHeight: verticalScale(100),
      textAlignVertical: 'top',
      paddingTop: verticalScale(12),
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: verticalScale(20),
    },
    modalButton: {
      flex: 1,
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(10),
      alignItems: 'center',
      marginHorizontal: horizontalScale(5),
    },
    cancelButton: {
      backgroundColor: CustomColors.textGray,
    },
    submitButton: {
      backgroundColor: CustomColors.appThemeColor,
    },
    modalButtonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(16),
      fontFamily: Fonts.bold,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: CustomColors.backgroundBlack,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    overlayText: {
      marginTop: verticalScale(10),
      color: CustomColors.white,
      fontSize: moderateScale(16),
      fontFamily: Fonts.regular,
    },
    attachmentSection: {
      marginTop: verticalScale(20),
      padding: moderateScale(15),
      backgroundColor: CustomColors.backgroundGray,
      borderRadius: moderateScale(12),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(4),
      elevation: 3,
      borderColor: CustomColors.borderLight,
      borderWidth: 1,
    },
    attachmentHeader: {
      fontSize: moderateScale(17),
      fontFamily: Fonts.semiBold,
      color: CustomColors.textDark,
      marginBottom: verticalScale(10),
    },
    attachmentButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: verticalScale(15),
      gap: horizontalScale(10),
      marginTop: verticalScale(10)
    },
    pickFileButton: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: CustomColors.appThemeColor, // Changed to primaryBlue for consistency
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(10),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ... (inside const styles = StyleSheet.create({...}) at the end of the file)

    // Styles for the Status Badge
    statusBadge: {
      paddingVertical: verticalScale(8),
      paddingHorizontal: horizontalScale(15),
      borderRadius: moderateScale(8),
      marginBottom: verticalScale(10),
      alignSelf: 'flex-start',
      minWidth: horizontalScale(120),
      alignItems: 'center',
      elevation: 2,
    },
    statusBadgeText: {
      // Assuming Fonts.bold is defined from your imports
      // ...Fonts.bold,
      fontSize: moderateScale(14),
      color: CustomColors.white,
    },
    // Status-specific colors - USING YOUR PROVIDED CUSTOM_COLORS
    statusApproved: {
      backgroundColor: CustomColors.statusGreen, // Using statusGreen from your CustomColors
    },
    statusReturned: {
      backgroundColor: CustomColors.statusRed, // Using statusRed from your CustomColors
    },
    statusDefault: {
      backgroundColor: CustomColors.statusGray, // Using statusGray from your CustomColors
    },

    // ... (rest of your existing styles like approvalStepCard, cardDetailRow etc.)
    approvalStepCard: {
      backgroundColor: CustomColors.backgroundGray, // Changed to white for better contrast with status badge
      borderRadius: moderateScale(10),
      padding: moderateScale(15),
      marginBottom: verticalScale(10),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(1) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(3),
      elevation: 2,
    },
    actionSheetTriggerButton: {
      borderWidth: 1,
      borderColor: CustomColors.appThemeColor,
      backgroundColor: CustomColors.appliteThemecolor,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(12),
      minHeight: verticalScale(45),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(12),
    },
    actionSheetTriggerButtonText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDark,
      flex: 1,
      fontFamily: Fonts.regular,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: CustomColors.primaryBlue,
      padding: 12,
      marginVertical: 10,
      borderRadius: 8,
    },

  });
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // const [detailRefs, setDetailRefs] = useState([]);

  // Updated useEffect to initialize Refs properly
  useEffect(() => {
    if (travelForm?.details) {
      detailRefs.current = travelForm.details.map((_, index) => {
        return (
          detailRefs.current[index] || {
            startingpointRef: React.createRef(),
            placeofvisitRef: React.createRef(),
            purposeofvisitRef: React.createRef(),
            detailStartDateRef: React.createRef(),
            detailEndDateRef: React.createRef(),
            typeoftravelRef: React.createRef(),
            clientRef: React.createRef(), // Ensure this exists for every row [cite: 37, 523]
          }
        );
      });
    }
  }, [travelForm?.details?.length]);

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: isSubmitting || !isEditable ? 0.5 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSubmitting, isEditable]);



  const emptyDetailRow = {
    id: 0,
    detailStartDate: null,
    detailEndDate: null,
    startingpoint: "",
    placeofvisit: "",
    purposeofvisit: "",
    typeOfTravel: "",
    client: "",
    requirement: [],
    selectedRequirment: "",
  };
  const getMimeType = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();
    const mimeTypes = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    return mimeTypes[extension] || "application/octet-stream";
  };

  const getNumberOfDatesBetween = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);

    const timeDiff = endDate.getTime() - startDate.getTime();
    // Divide by number of milliseconds in a day and add 1 (inclusive)
    const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    return dayDiff > 0 ? dayDiff : 0;
  };

  const [
    triggerEmpDetails,
    { data: EmpDetailsData, isLoading: isLoadingEmpDetails },
  ] = useLazyEmpDetailsQuery();
  const [
    triggerReason,
    {
      isLoading: isLoadingReason,
      data: ReasonData,
      isFetching: isFetchingReason,
    },
  ] = useLazyTourReasonListQuery();
  const [
    triggerTourSubmit,
    {
      isLoading: isLoadingTourSubmit,
      data: TourSubmitData, // Not used in current submit, but good to have if API returns data
      // isFetching: isFetchingTourSubmit, // Also not used
    },
  ] = useTourSubmitMutation();
  const [
    triggerTourDataGet,
    {
      isLoading: isLoadingTourData,
      isFetching: isFetchingTourData,
      data: tourData,
    },
  ] = useLazyTourDataGetQuery();

  const [
    triggerDocumentDataGet,
    {
      isLoading: isLoadingDocumentData,
      isFetching: isFetchingDocumentData,
      data: DocumentData,
    },
  ] = useLazyDocumentDataGetQuery();

  const [
    triggerTourApprove,
    {
      isLoading: isLoadingTourApprove,
      isFetching: isFetchingTourApprove,
      data: TourApproveData,
    },
  ] = useTourApproveMutation();

  const [
    triggerTourReject,
    {
      isLoading: isLoadingTourReject,
      isFetching: isFetchingTourReject,
      data: TourRejectData,
    },
  ] = useTourRejectMutation();

  const [
    triggerTourReturn,
    {
      isLoading: isLoadingTourReturn,
      isFetching: isFetchingTourReturn,
      data: TourReturnData,
    },
  ] = useTourReturnMutation();

  const [
    triggerTourForword,
    {
      isLoading: isLoadingTourForword,
      isFetching: isFetchingTourForword,
      data: TourForwordData,
    },
  ] = useTourForwardMutation();

  const [
    triggerTourCancel,
    {
      isLoading: isLoadingTourCancel,
      isFetching: isFetchingTourCancel,
      data: TourCancelData,
    },
  ] = useTourCancelMutation();

  const [
    triggerHolidayCheck,
    { data: HolidayCheckData, isLoading: isLoadingHolidayCheck },
  ] = useHolidayCheckMutation();

  const [
    triggerCommonDropDown,
    { data: CommonDropDownData, isLoading: isLoadingCommonDropDown },
  ] = useLazyCommonDropDownGetQuery();
  const [triggerNonBaseDropdown, { data: NonBaseDropdownData, isLoading: isLoadingNonBaseDropdown }] = useLazyCommonDropDownGetQuery();
  const [triggerClient, { data: ClientData, isLoading: isLoadingClient }] =
    useLazyClientListTaQuery();

  const [triggerCity, { data: CityData, isLoading: isLoadingCity }] =
    useLazyCityListQuery();

  const [triggerReqDelete, { data: reqDeledata, isLoading: isLoadingReqDele, error: reqDeleError }] =
    useDeleteRequirementMutation();

  const debounceTimeout = useRef(null);

  const HeaderRight = useCallback(

    () => (

      <>

        {tour_id && (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity
              onPress={async () => {
                setIsApprovalModalVisible(true);
                dispatch(setApprovalFlow(null));
                dispatch(setIsApprovalFlowLoading(true));

                try {
                  const res = await triggerApprovalFlow(tour_id).unwrap();
                  dispatch(setApprovalFlow(res?.data || res));
                } catch (e) {
                } finally {
                  dispatch(setIsApprovalFlowLoading(false));
                }
              }}


              style={[styles.addIconContainer, { marginLeft: horizontalScale(10) }]}
              accessibilityLabel="View Approval Flow"
            >
              <Ionicons name="eye" size={moderateScale(25)} color={CustomColors.white} />
            </TouchableOpacity>
          </View>
        )
        }
      </>
    ),
    [
      from,
      tour_id,
      dispatch,
      triggerApprovalFlow,
      setIsApprovalModalVisible, navigation, isDark]
  );
  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        from === "MAKER"
          ? "Update Travel Request"
          : from === "CHECKER"
            ? "Approve Travel Request"
            : from === "CANCEL_MAKER"
              ? "Create Travel Cancel Request"
              : from === "ADMIN"
                ? "Travel Admin"
                : "Create Travel Request",
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },
      headerShown: true,
      headerTintColor: CustomColors.textWhite,
      headerTitleStyle: {
        ...globalStyles.headerTitle,
        fontSize: moderateScale(14),
        fontWeight: '600',
      },
      headerRight: HeaderRight,
    });
    triggerCommonDropDown("official");

    if (tourDataParams) {
      setIsEditable(
        from === "MAKER" &&
        tourDataParams.tour_status !== "APPROVED" &&
        tourDataParams.tour_status !== "REJECTED" &&
        tourDataParams.tour_status !== "PENDING"
      );

      console.log("Edit", isEditable);
      triggerTourDataGet({
        tour_id: tour_id,
      });
      triggerDocumentDataGet({
        tour_id: tour_id,
        ref_type: 1
      });
      setIsMaker(from === "MAKER");
      setIsChecker(from === "CHECKER");
      setIsCancelMaker(from === "CANCEL_MAKER");
      setIsAppoverEditable(tourDataParams.tour_status === "PENDING");
      setIsCancelMakerDisabled(
        tourDataParams.tour_cancel_status === "APPROVED" ||
        tourDataParams.tour_cancel_status === "REJECTED"
      );
    } else {
      const params = {};
      if (selectedEmployee) {
        params.onbehalf = selectedEmployee.employeegid;
      }
      triggerEmpDetails(params);
    }
    return () => {
      dispatch(resetForm());
      dispatch(clearDropdownData());
      dispatch(resetSelfOrOnBehalf());
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [navigation, dispatch, triggerEmpDetails, HeaderRight, isDark]);

  useEffect(() => {
    if (EmpDetailsData) {
      dispatch(updateField(EmpDetailsData));
    }
  }, [EmpDetailsData, dispatch]);

  useEffect(() => {
    const params = {};
    if (selectedEmployee) {
      params.onbehalf = selectedEmployee.employeegid;
      triggerEmpDetails(params)
    }
  }, [selectedEmployee])

  useEffect(() => {
    if (ReasonData) {
      if (ReasonData.data && ReasonData.data.length > 0) {
        if (reasonPage === 1) {
          dispatch(setReasonList(ReasonData));
        } else {
          dispatch(updateReasonList(ReasonData));
        }
        setHasMoreReasons(true);
      } else {
        setHasMoreReasons(false);
      }
    }
  }, [ReasonData, dispatch]);

  useEffect(() => {
    if (CityData) {
      if (CityData.data && CityData.data.length > 0) {
        if (CityPage === 1) {
          dispatch(setCityList(CityData));
        } else {
          dispatch(updateCityList(CityData));
        }
        // Assuming pagination structure might be different or missing has_next for some APIs
        setHasMoreCity(
          CityData.pagination
            ? CityData.pagination.has_next
            : CityData.data.length > 0
        );
      } else {
        setHasMoreCity(false);
      }
    }
  }, [CityData, dispatch]);

  useEffect(() => {
    if (ClientData) {
      if (ClientData.data && ClientData.data.length > 0) {
        if (ClientPage === 1) {
          dispatch(setClientList(ClientData));
        } else {
          dispatch(updateClientList(ClientData));
        }
        // Assuming pagination structure might be different or missing has_next for some APIs
        setHasMoreClient(
          ClientData.pagination
            ? ClientData.pagination.has_next
            : ClientData.data.length > 0
        );
      } else {
        setHasMoreClient(false);
      }
    }
  }, [ClientData, dispatch]);
  useEffect(() => {
    triggerNonBaseDropdown('base_location');
  }, []);
  useEffect(() => {
    if (NonBaseDropdownData) {
      // Check if the data is directly the array or inside .data
      const options = Array.isArray(NonBaseDropdownData)
        ? NonBaseDropdownData
        : NonBaseDropdownData.data || [];
      setNonBaseReasonOptions(options);
    }
  }, [NonBaseDropdownData]);
  useEffect(() => {
    if (CommonDropDownData && CommonDropDownData.length > 0) {
      // Determine the key: use PickerTarget.key if available, otherwise default to "official"
      const targetKey = PickerTarget.key || "official";

      if (!common?.[targetKey]) {
        dispatch(
          setCommonDropDownList({ [targetKey]: CommonDropDownData })
        );
      }
    }
  }, [CommonDropDownData, dispatch, common]);
  useEffect(() => {

    if (tourData && common?.["official"]) {
      const parseDateString = (dateString) => {
        if (!dateString) return null;
        const [day, monthStr, year] = dateString.split("-");
        const monthMap = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };
        const month = monthMap[monthStr];
        return month !== undefined ? new Date(year, month, day) : null;
      };
      console.log('tourData', tourData.non_base_location)

      // const nonBaseLocationValue = tourData.non_base_location; // "Personal reasons"
      // if (nonBaseLocationValue) {
      //   setShowNonBaseReason(true)
      //   setNonBaseReasonPickerVisibility(false)
      // }
      // 2️⃣ Logic: Show if it's not the default string
      // const isNonBase = nonBaseLocationValue && nonBaseLocationValue !== "Travel from base location";
      // setShowNonBaseReason(isNonBase);
      const nonBaseLocationValue = tourData.non_base_location;
      const isNonBase = nonBaseLocationValue && nonBaseLocationValue !== "";

      // 🔑 Ensure this local state is set so the JSX block renders
      setShowNonBaseReason(isNonBase);
      const payload = {
        id: tourData.id,
        tourNo: tourData.id,
        requestDate: parseDateString(tourData.requestdate)?.toISOString(), // Use optional chaining for safety
        empName: tourData.employee_name,
        empCode: tourData.employee_code,
        empDesign: tourData.empdesignation,
        empGrade: tourData.empgrade,
        reason: tourData.reason_data,
        startDate: parseDateString(tourData.startdate)?.toISOString(),
        endDate: parseDateString(tourData.enddate)?.toISOString(),
        durationDays: tourData.durationdays,
        remarks: tourData.ordernoremarks,
        NonBasereason: isNonBase
          ? { name: nonBaseLocationValue, id: nonBaseLocationValue }
          : null,
        transfer_on_promotion: tourData.transfer_on_promotion?.toString(),
        quantum_of_funds: tourData.quantum_of_funds,
        opening_balance: tourData.opening_balance,
        rm: tourData.rm,
        functionalhead: tourData.functionalhead,
        accommodationCost: tourData.accommodation_cost,
        flightCost: tourData.air_cost,
        otherCost: tourData.other_cost,
        week_end_travel: tourData.week_end_travel,
        details: tourData.detail.map((item) => ({
          ...item,
          detailStartDate: parseDateString(item.startdate)?.toISOString(),
          detailEndDate: parseDateString(item.enddate)?.toISOString(),
          // 🔑 Improved matching with String conversion to avoid type mismatches
          typeOfTravel: common["official"].find(
            (com) => String(com.value) === String(item.official)
          ) || "",
        })),
      };
      dispatch(updateField(payload));
      console.log(payload)
    }
    // 🔑 Added common?.["official"] to dependencies so it re-runs when data arrives
  }, [tourData, common?.["official"], dispatch]);
  useEffect(() => {
    if (tourData) {
      console.log("ggggggg", tourData.onbehalfof);

      if (tourData.onbehalfof && tourData.onbehalfof.id) {
        dispatch(setMode("onbehalf"));
      }
    }
  }, [tourData]);
  useEffect(() => {
    if (DocumentData) {
      dispatch(updateField({ DocumentData: DocumentData }));
    }
  }, [DocumentData, dispatch]);

  const travelForm = useSelector((state) => state.travelMakerFormSlice);
  const {
    approvalFlow,
    isApprovalFlowLoading,

  } = useSelector(state => state.travelMakerFormSlice);
const pickFiles = async () => {
  try {
    const selectedFiles = await pickDocuments(true);

    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
      setErrors((prev) => ({
        ...prev,
        fileUpload: false,
      }));
    }
  } catch (err) {
    console.log(err);
    Alert.alert("Error", "Failed to pick files.");
  }
};
  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access venum');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      console.log('Camera raw result:', result); // 🔍

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];

        const newFile = {
          uri: asset.uri,
          name: asset.fileName || `camera_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };

        console.log('Camera normalized file:', newFile); // 🔍

        setFiles(prev => {
          const updated = [...prev, newFile];
          console.log('Files after adding camera:', updated); // 🔍
          return updated;
        });

        setErrors(prev => ({ ...prev, fileUpload: false }));
      }
    } catch (e) {
      console.log('Camera error', e);
    }
  };



  const removeFile = (uri) => {
    Alert.alert("Remove File", "Are you sure you want to remove this file?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setFiles((prev) => {
            const updated = prev.filter((file) => file.uri !== uri);

            // ✅ OPTIONAL: if all files removed, you can re-show error on next submit
            if (updated.length === 0) {
              setErrors((prevErr) => ({
                ...prevErr,
                fileUpload: false, // don't show immediately, show on submit
              }));
            }

            return updated;
          });
        },
      },
    ]);
  };


  const isDateRangeValid = (newStart, newEnd, currentIndex, values) => {
    const mainTourStartDate = values.startDate
      ? new Date(values.startDate).setHours(0, 0, 0, 0)
      : null;
    const mainTourEndDate = values.endDate
      ? new Date(values.endDate).setHours(23, 59, 59, 999)
      : null;
    const proposedStart = newStart ? new Date(newStart).getTime() : null;
    const proposedEnd = newEnd ? new Date(newEnd).getTime() : null;

    if (proposedStart && proposedEnd && proposedStart > proposedEnd) {
      // Alert.alert("Validation Error", "Itinerary end date cannot be earlier than start date."); // Will be handled by Toast
      return false;
    }

    if (
      mainTourStartDate &&
      proposedStart &&
      proposedStart < mainTourStartDate
    ) {
      //   Alert.alert("Validation Error", "Itinerary start date cannot be before the main tour start date.");
      return false;
    }
    if (mainTourEndDate && proposedEnd && proposedEnd > mainTourEndDate) {
      //   Alert.alert("Validation Error", "Itinerary end date cannot be after the main tour end date.");
      return false;
    }

    // Check for overlaps with other detail rows
    for (let i = 0; i < values.details.length; i++) {
      if (i === currentIndex) continue;
      // Skip the current item being validated

      const existingDetail = values.details[i];
      const existingStart = existingDetail.detailStartDate
        ? new Date(existingDetail.detailStartDate).getTime()
        : null;
      const existingEnd = existingDetail.detailEndDate
        ? new Date(existingDetail.detailEndDate).getTime()
        : null;

      if (existingStart && existingEnd && proposedStart && proposedEnd) {
        // Overlap conditions
        if (
          (proposedStart <= existingEnd && proposedEnd >= existingStart) || // Proposed overlaps existing
          (existingStart <= proposedEnd && existingEnd >= proposedStart) // Existing overlaps proposed
        ) {
          //   Alert.alert("Validation Error", `Itinerary dates for Detail ${currentIndex + 1} overlap with Detail ${i + 1}. Each itinerary day must be unique.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleConfirmDate = async (
    event,
    selectedDate,
    setFieldValue,
    values
  ) => {
    setDatePickerVisibility(false);

    if (!selectedDate) {
      return; // Exit if no date is selected
    }

    // Handle Detail Row Dates
    if (currentDetailDateFieldIndex !== null) {
      const details = [...values.details];
      let newDetailStartDate =
        details[currentDetailDateFieldIndex].detailStartDate;
      let newDetailEndDate = details[currentDetailDateFieldIndex].detailEndDate;

      if (dateField === "detailStartDate") {
        newDetailStartDate = selectedDate.toISOString();
        // If end date is not set or is before the new start date, update end date to new start date
        if (!newDetailEndDate || new Date(newDetailEndDate) < selectedDate) {
          newDetailEndDate = selectedDate.toISOString();
        }
      } else if (dateField === "detailEndDate") {
        newDetailEndDate = selectedDate.toISOString();
        // If start date is not set or is after the new end date, update start date to new end date
        if (
          !newDetailStartDate ||
          new Date(newDetailStartDate) > selectedDate
        ) {
          newDetailStartDate = selectedDate.toISOString();
        }
      }

      if (
        isDateRangeValid(
          newDetailStartDate,
          newDetailEndDate,
          currentDetailDateFieldIndex,
          values
        )
      ) {
        setFieldValue(
          `details[${currentDetailDateFieldIndex}].detailStartDate`,
          newDetailStartDate
        );
        setFieldValue(
          `details[${currentDetailDateFieldIndex}].detailEndDate`,
          newDetailEndDate
        );

        // 🔥 clear red borders for both fields
        setErrors((prev) => {
          const copy = { ...prev };

          if (copy.details?.[currentDetailDateFieldIndex]) {
            copy.details[currentDetailDateFieldIndex] = {
              ...copy.details[currentDetailDateFieldIndex],
              detailStartDate: false,
              detailEndDate: false,
            };
          }

          return copy;
        });
      } else {
        ToastMessage(
          "Invalid date range or overlaps with another itinerary item, or outside main tour dates."
        );
      }

      setCurrentDetailDateFieldIndex(null);

    }
    // Handle Main Tour Dates

    else if (dateField) {
      let newStartDate = values.startDate;
      let newEndDate = values.endDate;
      let mainDatesChanged = false;

      if (dateField === "startDate") {
        newStartDate = selectedDate.toISOString();
        // Ensure end date is not before start date
        if (!newEndDate || new Date(newEndDate) < selectedDate) {
          newEndDate = selectedDate.toISOString();
        }
        mainDatesChanged = true;
      } else if (dateField === "endDate") {
        newEndDate = selectedDate.toISOString();
        // Ensure start date is not after end date
        if (!newStartDate || new Date(newStartDate) > selectedDate) {
          newStartDate = selectedDate.toISOString();
        }
        mainDatesChanged = true;
      }

      if (mainDatesChanged) {
        setFieldValue("startDate", newStartDate);
        setFieldValue("endDate", newEndDate);
        setFieldValue("durationDays", getNumberOfDatesBetween(newStartDate, newEndDate));

        // 🔑 RESET ITINERARY DATES LOGIC
        values.details.forEach((detail, index) => {
          const detailStart = detail.detailStartDate ? new Date(detail.detailStartDate) : null;
          const detailEnd = detail.detailEndDate ? new Date(detail.detailEndDate) : null;
          const mainStart = new Date(newStartDate);
          const mainEnd = new Date(newEndDate);

          // Reset Start Date if it's now outside the main tour boundaries
          if (detailStart && (detailStart < mainStart || detailStart > mainEnd)) {
            setFieldValue(`details[${index}].detailStartDate`, null); //  Reset to null
          }

          // Reset End Date if it's now outside the main tour boundaries
          if (detailEnd && (detailEnd < mainStart || detailEnd > mainEnd)) {
            setFieldValue(`details[${index}].detailEndDate`, null); //  Reset to null
          }

          // Optional: Inform the user
          // if ((detailStart && (detailStart < mainStart || detailStart > mainEnd)) ||
          //   (detailEnd && (detailEnd < mainStart || detailEnd > mainEnd))) {
          //   ToastMessage(`Dates for Itinerary Detail ${index + 1} were reset.`);
          // }
        });

        // Proceed with holiday check
        try {
          const { data: HolidayCheckData } = await triggerHolidayCheck({
            start_date: formatDateOnly(newStartDate),
            end_date: formatDateOnly(newEndDate),
          });
          if (HolidayCheckData) {
            setFieldValue("isHoliday", HolidayCheckData.data.length > 0);
            setFieldValue("isOnGoingTour", HolidayCheckData.ongoing_tour);
            console.log("isOnGoingTour", HolidayCheckData.ongoing_tour)
          }
        } catch (error) {
          console.error("Holiday check failed:", error);
        }
      }
    }
  };

  const handleRequirementCardPress = (requirement, index) => {
    setSelectedRequirement(requirement);
    setIsModalVisible(true);
    setSelectedIndex(index);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedRequirement(null);
    setSelectedIndex(null);
  };

  const handleWebViewFile = async (file) => {
    try {
      setLoading(true);
      const fileExtension = file.file_name.split(".").pop().toLowerCase();
      const downloadUrl = `${Environment.taServiceUrl}/taserv/document_view?doc_option=view&id=${file.id}`;
      const localUri = FileSystem.cacheDirectory + `tempfile.${fileExtension}`;

      const response = await FileSystem.downloadAsync(downloadUrl, localUri, {
        headers: {  
        Authorization: `Token ${authToken}`,
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
        ...(csrfCookie && { 'X-CSRFCookie': csrfCookie }),
      },
      
      });
      try {
        const fileInfo = await FileSystem.getInfoAsync(response.uri);
        if (!fileInfo.exists || fileInfo.isDirectory) {
          ToastMessage("Error: File not found or is invalid."); // Changed to Toast
          return;
        }

        const mimeType = getMimeType(file.file_name);
        if (Platform.OS === "android") {
          const contentUri = await FileSystem.getContentUriAsync(response.uri);
          await IntentLauncher.startActivityAsync(
            "android.intent.action.VIEW",
            {
              data: contentUri,
              flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
              type: mimeType,
            }
          );
        } else {
          // iOS and Web
          await WebBrowser.openBrowserAsync(response.uri);
        }
      } catch (error) {
        console.error("Failed to open file:", error);
        ToastMessage(`Error: Unable to open file. ${error.message}`); // Changed to Toast
      }
      // setFileUri(response.uri)
    } catch (error) {
      console.error("Failed to fetch file:", error);
      Alert.alert("Error", "Failed to load document.");
    } finally {
      setLoading(false);
    }
  };

  const refs = {
    reasonRef,
    startDateRef,
    endDateRef,
    remarksRef,
    branchRef,
    approverRef,
    detailRefs,
    fileUploadRef
  };

  const scrollToRef = (ref) => {
    // console.log("ref", ref)
    if (!ref?.current || !scrollViewRef?.current) return;
    // console.log("ccc", ref?.current, scrollViewRef?.current)
    ref.current.measureLayout(
      scrollViewRef.current,
      (x, y) => {
        scrollViewRef.current.scrollTo({
          x: 0,
          y: Math.max(y - 120, 0),
          animated: true,
        });

        requestAnimationFrame(() => {
          ref.current?.focus();
        });
      },
      () => { }
    );
  };


  const validateForm = (values, refs, scrollViewRef) => {
    const newErrors = {
      reason: false,
      startDate: false,
      endDate: false,
      remarks: false,
      branch: false,
      approver: false,
      NonBasereason: false,
      details: [],

    };

    let isValid = true;
    let firstInvalidRef = null;

    const showFirstError = (ref, message) => {
      if (!firstInvalidRef && ref) {
        firstInvalidRef = ref;
        ToastMessage(message); // ✅ show only first error toast
      }
      isValid = false;
    };

    // 🔹 Top-level validations
    if (!values.reason?.id) {
      newErrors.reason = true;
      showFirstError(refs.reasonRef, "Please select a Reason.");
    }

    if (!values.startDate) {
      newErrors.startDate = true;
      showFirstError(refs.startDateRef, "Please select Tour Start Date.");
    }

    if (!values.endDate) {
      newErrors.endDate = true;
      showFirstError(refs.endDateRef, "Please select Tour End Date.");
    }

    if (
      values.startDate &&
      values.endDate &&
      new Date(values.endDate) < new Date(values.startDate)
    ) {
      newErrors.endDate = true;
      showFirstError(
        refs.endDateRef,
        "Tour End Date cannot be earlier than Start Date."
      );
    }

    if (!values.remarks) {
      newErrors.remarks = true;
      showFirstError(refs.remarksRef, "Please enter Remarks.");
    }

    // 🔹 Detail validations
    if (!Array.isArray(values.details) || values.details.length === 0) {
      showFirstError(refs.addDetailBtnRef, "Please add at least one Tour Itinerary detail.");
    } else {
      values.details.forEach((detail, i) => {
        const detailRef = refs.detailRefs.current?.[i];

        const errorObj = {
          startingpoint: false,
          placeofvisit: false,
          purposeofvisit: false,
          detailStartDate: false,
          detailEndDate: false,
          typeOfTravel: false,
          client: false,
        };

        if (!detail.typeOfTravel?.value) {
          errorObj.typeOfTravel = true;
          showFirstError(
            detailRef?.typeoftravelRef,
            `Please select Type of Travel for Itinerary Detail ${i + 1}.`
          );
        }
        if (!detail.detailStartDate) {
          errorObj.detailStartDate = true;
          showFirstError(
            detailRef?.detailStartDateRef,
            `Please select Start Date for Itinerary Detail ${i + 1}.`
          );
        }

        if (!detail.detailEndDate) {
          errorObj.detailEndDate = true;
          showFirstError(
            detailRef?.detailEndDateRef,
            `Please select End Date for Itinerary Detail ${i + 1}.`
          );
        }
        if (!detail.startingpoint) {
          errorObj.startingpoint = true;
          showFirstError(
            detailRef?.startingpointRef,
            `Please enter Starting Point for Itinerary Detail ${i + 1}.`
          );
        }

        if (!detail.placeofvisit) {
          errorObj.placeofvisit = true;
          showFirstError(
            detailRef?.placeofvisitRef,
            `Please enter Place of Visit for Itinerary Detail ${i + 1}.`
          );
        }



        if (!detail.purposeofvisit) {
          errorObj.purposeofvisit = true;
          showFirstError(
            detailRef?.purposeofvisitRef,
            `Please enter Purpose of Visit for Itinerary Detail ${i + 1}.`
          );
        }

        if (!detail.client?.id) {
          errorObj.client = true;
          showFirstError(
            detailRef?.clientRef,
            `Please select Client for Itinerary Detail ${i + 1}.`
          );
        }
        if (showNonBaseReason && !values.NonBasereason?.id) {
          newErrors.NonBasereason = true;
          showFirstError(nonbaseRef, "Please select a Reason for non-base location travel.");
        }


        if (
          detail.detailStartDate &&
          detail.detailEndDate &&
          new Date(detail.detailEndDate) < new Date(detail.detailStartDate)
        ) {
          errorObj.detailEndDate = true;
          showFirstError(
            detailRef?.detailEndDateRef,
            `End Date cannot be earlier than Start Date for Itinerary Detail ${i + 1}.`
          );
        }

        if (
          detail.detailStartDate &&
          detail.detailEndDate &&
          !isDateRangeValid(detail.detailStartDate, detail.detailEndDate, i, values)
        ) {
          errorObj.detailStartDate = true;
          showFirstError(
            detailRef?.detailStartDateRef,
            `Invalid or overlapping date range for Itinerary Detail ${i + 1}.`
          );
        }

        newErrors.details[i] = errorObj;
      });
    }

    setErrors(newErrors);

    const selectedReason = reasons?.find(
      (r) => String(values?.reason?.id) === String(r.id)
    );

    const isFileMandatory = String(selectedReason?.fileupload) === "1";

    const hasNewFiles = Array.isArray(files) && files.length > 0;
    const hasMakerFiles =
      Array.isArray(values?.DocumentData?.data) &&
      values.DocumentData.data.length > 0;
    const hasApproverFiles =
      Array.isArray(values?.DocumentData?.tour_approver) &&
      values.DocumentData.tour_approver.length > 0;

    if (isFileMandatory && !hasNewFiles && !hasMakerFiles && !hasApproverFiles) {
      setErrors((prev) => ({ ...prev, fileUpload: true }));
      showFirstError(
        refs.fileUploadRef,
        `File Required for Tour Reason ${values?.reason?.name}`
      );
    } else {
      setErrors((prev) => ({ ...prev, fileUpload: false }));
    }



    // 🔹 Scroll to first invalid input
    if (!isValid && firstInvalidRef) {
      setTimeout(() => scrollToRef(firstInvalidRef), 150);
    }

    return isValid;
  };




  const convertDateTime = (datetimeStr) => {
    if (!datetimeStr) return { full: "", date: "", time: "" };

    const d = new Date(datetimeStr);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = "00";

    const full = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    const date = `${yyyy}-${mm}-${dd}`;
    const time = `${hh}:${min}`;

    return { full, date, time };
  };


  const authToken = useSelector((s) => s.auth.user?.token);
  const csrfToken = useSelector((s) => s.auth.csrfToken);
  const csrfCookie = useSelector((s) => s.auth.csrfCookie);

const handleSubmit = async (values) => {
  if (!validateForm(values, refs, scrollViewRef)) {
    return;
  }

  setIsSubmitting(true);

  try {
    const data = {
      requestno: values.tourNo || 'NEW',
      requestdate: formatDateTime(values.requestDate),
      selfcheck: 0,
      reason: values.reason?.id || 0,
      startdate: formatDateTime(values.startDate),
      enddate: formatDateTime(values.endDate),
      durationdays: Number(values.durationDays || 1),

      accommodation_cost: Number(values.accommodationCost || 0),
      other_cost: Number(values.otherCost || 0),
      air_cost: Number(values.flightCost || 0),

      ordernoremarks: values.remarks || '',
      comments: values.comments || '',
      transfer_on_promotion: values.transfer_on_promotion || 0,
      quantum_of_funds: values.quantum_of_funds || null,
      opening_balance: values.opening_balance || null,
      week_end_travel: values.week_end_travel || null,
      sortterm_travel: 0,

      non_base_location: showNonBaseReason
        ? values.NonBasereason?.name || ''
        : '',

      detail: values.details.map((detail) => ({
        startdate: formatDateTime(detail.detailStartDate),
        enddate: formatDateTime(detail.detailEndDate),

        startingpoint:
          detail.startingpoint?.name || detail.startingpoint || '',

        placeofvisit:
          detail.placeofvisit?.name || detail.placeofvisit || '',

        purposeofvisit: detail.purposeofvisit || '',
        toplace: '',

        client: detail.client?.id || 0,
        other_client_name: '',

        official: detail.typeOfTravel?.value || '0',
        currentdatecheck: false,

        requirements: (detail.requirement || []).map((req) => {
          const bookingNeeded = req.booking_needed?.toString() || '';

          // ===== Accommodation =====
          if (bookingNeeded === '1') {
            return {
              booking_needed: '1',
              comments: req.comments || '',
              checkin_time: convertDateTime(req.checkin_time).full,
              checkout_time: convertDateTime(req.checkout_time).full,
              place_of_stay: req.place_of_stay || '',

              room_type:
                typeof req.room_type === 'object'
                  ? req.room_type?.value || req.room_type?.name
                  : req.room_type || '',

              no_of_nights: Number(req.no_of_nights || 0),
              instructions: req.instructions || '',
            };
          }

          // ===== Cab =====
          if (bookingNeeded === '2') {
            return {
              booking_needed: '2',
              comments: req.comments || '',

              travel_type_cab:
                typeof req.travel_type_cab_value === 'object'
                  ? req.travel_type_cab_value?.value
                  : req.travel_type_cab || '',

              cab_segment:
                typeof req.cab_segment === 'object'
                  ? req.cab_segment?.value || req.cab_segment?.name
                  : req.cab_segment || '',

              instructions: req.instructions || '',
              from_time: convertDateTime(req.from_time).full,
              from_place: req.from_place || '',
              to_place: req.to_place || '',
              to_time: req.to_time || null,
            };
          }

          // ===== Bus / Train / Air =====
          return {
            booking_needed: bookingNeeded,
            comments: req.comments || '',
            from_time: convertDateTime(req.from_time).full,
            from_place: req.from_place || '',
            to_place: req.to_place || '',
            to_time: req.to_time || null,
          };
        }),
      })),
    };

    // Edit case
    if (from) {
      data.id = values.id;
    }

    // On behalf
    if (selectedEmployee) {
      data.onbehalfof = selectedEmployee.employeegid;
    }

    // Files
    const uploadFiles = (files || []).map((file, i) => ({
      uri: file.uri,
      name: file.name || `file_${i}`,
      type: file.type || file.mimeType || 'application/octet-stream',
      size: file.size || 0,
    }));

    console.log('TOUR URL:', `${Environment.taServiceUrl}/taserv/tour`);
    console.log('TOUR DATA:', JSON.stringify(data, null, 2));
    console.log('TOUR FILES:', uploadFiles);

    const response = await uploadMultipart({
      url: `${Environment.taServiceUrl}/taserv/tour`,
      data,
      files: uploadFiles,
      headers: {
        Authorization: `Token ${authToken}`,
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        ...(csrfCookie ? { 'X-CSRFCookie': csrfCookie } : {}),
      },
    });

    console.log('TOUR RESPONSE:', response);

    if (
      response?.status === 'success' ||
      response?.message === 'Success'
    ) {
      ToastMessage(
        response?.message || 'Tour request submitted successfully!'
      );
      navigation.goBack();
    } else {
      ToastMessage(
        response?.description ||
          response?.message ||
          'Submission failed.'
      );
    }
  } catch (error) {
    console.log('TOUR ERROR:', error);

    ToastMessage(
      error?.message ||
        error?.data?.description ||
        'Upload failed.'
    );
  } finally {
    setIsSubmitting(false);
  }
};

// ===== Helper =====
const formatDateTime = (date) => {
  if (!date) return null;

  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.0`;
};

  const handleApprove = async (values) => {
    if (!values.approverRemarks) {
      ToastMessage("Please Enter Approver Remorks");
      return false;
    }
    const formData = {
      id: tourDataParams.id,
      tourgid: tourDataParams.tourid,
      apptype: "tour",
      applevel: tourData.latest_applevel,
      appcomment: values.approverRemarks,
      status: "3",
    };
    try {
      const response = await triggerTourApprove({ data: formData }).unwrap();
      if (response?.status === "success" || response?.message === "Success") {
        ToastMessage("Tour request Approved successfully!");
        navigation.goBack();
      } else {
        ToastMessage(
          response?.description ||
          response?.message ||
          "Approve failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Approver error:", error);
      const errorMessage =
        error?.data?.description ||
        error?.data?.message ||
        error?.message ||
        "Failed to Approve the request. Please try again.";
      ToastMessage(errorMessage); // Changed from Alert to ToastMessage
    }
  };

  const handleReject = async (values) => {
    if (!values.approverRemarks) {
      ToastMessage("Please Enter Approver Remorks");
      return false;
    }
    const formData = {
      id: tourDataParams.id,
      tour_id: tourDataParams.tourid,
      apptype: "tour",
      appcomment: values.approverRemarks,
    };
    try {
      const response = await triggerTourReject({ data: formData }).unwrap();
      if (response?.status === "success" || response?.message === "Success") {
        ToastMessage(response.message || "Tour request Rejected successfully!");
        navigation.goBack();
      } else {
        ToastMessage(
          response?.description ||
          response?.message ||
          "Reject failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Reject error:", error);
      const errorMessage =
        error?.data?.description ||
        error?.data?.message ||
        error?.message ||
        "Failed to Reject the request. Please try again.";
      ToastMessage(errorMessage); // Changed from Alert to ToastMessage
    }
  };

  // const handleForward = async (values) => {
  //   if (!values.branch_data || !values.branch_data.id) {
  //     ToastMessage("Please Select Branch");
  //     return false;
  //   }
  //   if (!values.approver_data || !values.approver_data.id) {
  //     ToastMessage("Please Select Approver");
  //     return false;
  //   }
  //   if (!values.approverRemarks) {
  //     ToastMessage("Please Enter Approver Remorks");
  //     return false;
  //   }
  //   const formData = new FormData();
  //   formData.append(
  //     "data",
  //     JSON.stringify({
  //       id: tourDataParams.id,
  //       tour_id: tourDataParams.tourid,
  //       apptype: "tour",
  //       appcomment: values.approverRemarks,
  //       applevel: "2",
  //       approvedby: values.approver_data.id,
  //     })
  //   );
  //   if (files.length > 0) {
  //     files.forEach((file) => {
  //       formData.append("file", {
  //         uri: file.uri,
  //         name: file.name,
  //         type: file.mimeType || getMimeType(file.name),
  //       });
  //     });
  //   }
  //   try {
  //     const response = await triggerTourForword({ data: formData }).unwrap();
  //     if (response?.status === "success" || response?.message === "Success") {
  //       ToastMessage(
  //         response.message || "Tour request Forworded successfully!"
  //       );
  //       navigation.goBack();
  //     } else {
  //       ToastMessage(
  //         response?.description ||
  //           response?.message ||
  //           "Forword failed. Please try again."
  //       );
  //     }
  //   } catch (error) {
  //     console.error("Forword error:", error);
  //     const errorMessage =
  //       error?.data?.description ||
  //       error?.data?.message ||
  //       error?.message ||
  //       "Failed to Forword the request. Please try again.";
  //     ToastMessage(errorMessage); // Changed from Alert to ToastMessage
  //   }
  // };

  const handleReturn = async (values) => {
    if (!values.approverRemarks) {
      ToastMessage("Please Enter Approver Remorks");
      return false;
    }
    const formData = {
      id: tourDataParams.id,
      tour_id: tourDataParams.tourid,
      apptype: "tour",
      appcomment: values.approverRemarks,
    };
    try {
      const response = await triggerTourReturn({ data: formData }).unwrap();
      if (response?.status === "success" || response?.message === "Success") {
        ToastMessage(response.message || "Tour request Returned successfully!");
        navigation.goBack();
      } else {
        ToastMessage(
          response?.description ||
          response?.message ||
          "Return failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Return error:", error);
      const errorMessage =
        error?.data?.description ||
        error?.data?.message ||
        error?.message ||
        "Failed to Return the request. Please try again.";
      ToastMessage(errorMessage);
    }
  };

  const handleCancel = async (values) => {
    if (!values.approverRemarks) {
      ToastMessage("Please Enter Remorks");
      return false;
    }
    const formData = {
      tour_id: tourDataParams.id,
      apptype: "TourCancel",
      appcomment: values.approverRemarks,
      approval: values.approver_data.id,
      status: 1,
    };
    if (selectedEmployee) {
      formData.onbehalfof = selectedEmployee.employeegid;
    }
    // formData.append(
    //   "data",
    //   JSON.stringify({
    //     tour_id: tourDataParams.id,
    //     apptype: "TourCancel",
    //     appcomment: values.approverRemarks,
    //     approval: values.approver_data.id,
    //     status: 1
    //   })
    // );
    // if (files.length > 0) {
    //   files.forEach((file) => {
    //     formData.append("file", {
    //       uri: file.uri,
    //       name: file.name,
    //       type: file.mimeType || getMimeType(file.name),
    //     });
    //   });
    // }
    try {
      const response = await triggerTourCancel({ data: formData }).unwrap();
      if (response?.status === "success" || response?.message === "Success") {
        ToastMessage(
          response.message || "Tour Cancelation request submited successfully!"
        );
        navigation.goBack();
      } else {
        ToastMessage(
          response?.description ||
          response?.message ||
          "Cancelation Submit failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Cancelation Submit error:", error);
      const errorMessage =
        error?.data?.description ||
        error?.data?.message ||
        error?.message ||
        "Failed to Cancelation Submit. Please try again.";
      ToastMessage(errorMessage); // Changed from Alert to ToastMessage
    }
  };

  const handleViewFile = async (file) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists || fileInfo.isDirectory) {
        ToastMessage("Error: File not found or is invalid."); // Changed to Toast
        return;
      }

      const mimeType = getMimeType(file.name);
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(file.uri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: mimeType,
        });
      } else {
        // iOS and Web
        await WebBrowser.openBrowserAsync(file.uri);
      }
    } catch (error) {
      console.error("Failed to open file:", error);
      ToastMessage(`Error: Unable to open file. ${error.message}`);
    }
  };

  const handleSearchReason = useCallback(
    (query) => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        setCurrentReasonSearchQuery(query);
        setReasonPage(1);
        setHasMoreReasons(true); // Reset for new search
        dispatch(setReasonList({ data: [] })); // Clear previous results immediately
        triggerReason({ name: query, page: 1 });
      }, 500);
    },
    [triggerReason, dispatch]
  );

  const handleSearchCity = (query) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setCurrentCitySearchQuery(query);
      setCityPage(1);
      setHasMoreCity(true); // Reset for new search
      dispatch(setCityList({ data: [] })); // Clear previous results immediately
      triggerCity({
        city_name: query,
        page: 1,
        from_place: selectedFieldTitle === "From Place" ? 1 : 0,
      });
    }, 500);
  };

  const handleSearchClient = (query) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setCurrentClientSearchQuery(query);
      setClientPage(1);
      setHasMoreClient(true); // Reset for new search
      dispatch(setClientList({ data: [] })); // Clear previous results immediately
      triggerClient({
        city_name: query,
        page: 1,
        from_place: selectedFieldTitle === "From Place" ? 1 : 0,
      });
    }, 500);
  };
  // }; // Removed extra brace

  // const handleSearchCommonDropDown = useCallback(
  //   (query) => {
  //     if (debounceTimeout.current) {
  //       clearTimeout(debounceTimeout.current);
  //     }
  //     debounceTimeout.current = setTimeout(() => {
  //       setCurrentCommonDropDownSearchQuery(query);
  //       // setCommonDropDownPage(1);
  //       setHasMoreCommonDropDown(true);
  //       dispatch(setCommonDropDownList({ data: [] })); // Clear previous results immediately
  //       triggerCommonDropDown({key: PickerTarget.key});
  //     }, 500);
  //   },
  //   [triggerCommonDropDown, dispatch]
  // );

  const handleLoadMoreReasons = () => {
    if (isFetchingReason || !hasMoreReasons) {
      return;
    }
    const nextPage = reasonPage + 1;
    setReasonPage(nextPage);
    triggerReason({ name: currentReasonSearchQuery, page: nextPage });
  };

  const handleLoadMoreCity = () => {
    if (isLoadingCity) {
      return;
    }
    const nextPage = CityPage + 1;
    setCityPage(nextPage);
    triggerCity({
      city_name: currentCitySearchQuery,
      page: nextPage,
      from_place: selectedFieldTitle === "From Place" ? 1 : 0,
    });
  };

  const handleLoadMoreClient = () => {
    if (isLoadingClient) {
      return;
    }
    const nextPage = ClientPage + 1;
    setClientPage(nextPage);
    triggerClient({
      city_name: currentClientSearchQuery,
      page: nextPage,
      from_place: selectedFieldTitle === "From Place" ? 1 : 0,
    });
  };

  // const handleLoadMoreCommonDropDown = () => {
  //   if (isFetchingCommonDropDown || !hasMoreCommonDropDown) {
  //     return;
  //   }
  //   const nextPage = CommonDropDownPage + 1;
  //   setCommonDropDownPage(nextPage);
  //   triggerCommonDropDown({ name: currentCommonDropDownSearchQuery, page: nextPage });
  // };

  const openReasonPicker = () => {
    setReasonPickerVisibility(true);
    if (reasons.length === 0 || currentReasonSearchQuery !== "") {
      // Fetch if empty or if there was a search term
      setCurrentReasonSearchQuery(""); // Reset search for initial load
      setReasonPage(1);
      setHasMoreReasons(true);
      dispatch(setReasonList({ data: [] }));
      triggerReason({ name: "", page: 1 });
    }
  };

  const openCityPicker = (field, index, title) => {
    setPickerTarget({ field, index }); // e.g., { field: "startingpoint", index: 0 }
    setSelectedField(`details[${index}].${field}`); // e.g., details[0].startingpoint
    setSelectedFieldTitle(title);
    setCityPickerVisibility(true);
    // setCityPage(1);

    // Reset and load city list if necessary
    if (cities.length === 0 || currentCitySearchQuery !== "") {
      setCurrentCitySearchQuery("");
      setHasMoreCity(true);
      triggerCity({
        city_name: "",
        page: 1,
        from_place: title === "From Place" ? 1 : 0,
      });
    }
  };

  const openClientPicker = (field, index, title) => {
    setPickerTarget({ field, index }); // e.g., { field: "startingpoint", index: 0 }
    setSelectedField(`details[${index}].${field}`); // e.g., details[0].startingpoint
    setSelectedFieldTitle(title);
    setClientPickerVisibility(true);
    // setClientPage(1);

    // Reset and load city list if necessary
    if (cities.length === 0 || currentClientSearchQuery !== "") {
      setCurrentClientSearchQuery("");
      setHasMoreClient(true);
      triggerClient({
        city_name: "",
        page: 1,
        from_place: title === "From Place" ? 1 : 0,
      });
    }
  };

  const openCommonDropDownPicker = (
    field,
    index,
    title,
    key,
    requirementIndex = null,
    requirementField = null
  ) => {
    setPickerTarget({ field, index, key });
    if (requirementIndex !== null) {
      setSelectedField(
        `details[${index}].${field}[${requirementIndex}].${requirementField}`
      );
    } else {
      setSelectedField(`details[${index}].${field}`);
    }
    setSelectedFieldTitle(title);
    //console.log(common);
    setCommonDropDownPickerVisibility(true);
    if (!common?.[key]) {
      // setCurrentCommonDropDownSearchQuery("");
      // setCommonDropDownPage(1);
      // setHasMoreCommonDropDown(true);
      triggerCommonDropDown(key);
    }
  };

  const handleModeChange = (newMode) => {
    if (newMode === "self") {
      dispatch(setMode("self"));
      dispatch(setSelectedEmployee(null));
    } else {
      // 👇 Don't change mode yet – open modal first
      setOnBehalModel(true);
    }
  };



  const handleRequirementSelect = (selectedValue, setFieldValue, values) => {
    const requirementTemplates = {
      1: {
        booking_needed: 1,
        comments: "",
        Accomodationkey: "",
        checkin_time: "",
        checkout_time: "",
        place_of_stay: "",
        checkindate: "",
        checkintime: "",
        room_type: "",
        no_of_nights: "",
        checkoutdate: "",
        checkouttime: "",
        otherkey: "",
        instructions: "",
      },
      2: {
        booking_needed: 2,
        comments: "",
        Accomodationkey: "",
        otherkey: "",
        cab_segment: "",
        instructions: "",
        travel_type_cab: "",
        from_time: "",
        fromdate: "",
        fromtime: "",
        from_place: "",
        to_place: "",
      },
      3: {
        booking_needed: 3,
        comments: "",
        Accomodationkey: "",
        otherkey: "",
        from_time: "",
        fromdate: "",
        fromtime: "",
        from_place: "",
        to_place: "",
      },
      4: {
        booking_needed: 4,
        comments: "",
        Accomodationkey: "",
        otherkey: "",
        from_time: "",
        fromdate: "",
        fromtime: "",
        from_place: "",
        to_place: "",
      },
      5: {
        booking_needed: 5,
        comments: "",
        Accomodationkey: "",
        otherkey: "",
        from_time: "",
        fromdate: "",
        fromtime: "",
        from_place: "",
        to_place: "",
      },
    };

    const template = requirementTemplates[selectedValue];
    //console.log(selectedValue);
    if (template) {
      const updatedRequirements = [
        ...values.details[selectedIndex.detailIndex].requirement,
        template,
      ];
      setFieldValue(
        `details[${selectedIndex.detailIndex}].requirement`,
        updatedRequirements
      );
      handleRequirementCardPress(template, {
        detailIndex: selectedIndex.detailIndex,
        requirementIndex: updatedRequirements.length - 1,
      });
    }
  };

  // Generic Render Item for CustomActionSheetPicker
  const RenderDropdownItem = ({
    options,
    onPress,
    setPickerStatus,
    selected,
  }) => {
    const isSelected = selected && selected.value === options.value;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress(options);
          setPickerStatus(false);
        }}
        style={[
          styles.actionSheetOption,
          isSelected && styles.actionSheetOptionSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Select ${options.label}`} // Corrected typo
      >
        <Text
          allowFontScaling={false}
          style={[
            styles.actionSheetOptionText,
            isSelected && styles.actionSheetOptionTextSelected,
          ]}
        >
          {typeof options.label === "string"
            ? options.label
            : String(options.label)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading || isLoadingTourData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={styles.loadingText}>Please wait...</Text>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: CustomColors.appScreenColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    // keyboardVerticalOffset={verticalScale(110)}  // adjust if header exists
    >
      <SafeAreaView edges={'bottom'} style={{ flex: 1, backgroundColor: CustomColors.appScreenColor, }}>
        <Formik
          enableReinitialize
          initialValues={travelForm}
          onSubmit={handleSubmit}
        >
          {({
            values,
            handleChange,
            handleSubmit: formikSubmit,
            setFieldValue,
          }) => {

            const today = new Date().setHours(0, 0, 0, 0);
            const isPastTour = values?.startDate && new Date(values.startDate).getTime() < today;
            useEffect(() => {
              if (!values?.reason?.id) return;

              const selectedRes = reasons?.find(
                (r) => String(values?.reason?.id) === String(r.id)
              );

              const isMandatory = String(selectedRes?.fileupload) === "1";

              if (!isMandatory) {
                setErrors((prev) => ({ ...prev, fileUpload: false }));
              }
            }, [values?.reason?.id, reasons]);

            const lastCheckedRef = useRef({ start: null, end: null });

            useFocusEffect(
              useCallback(() => {
                let isActive = true; // safety to avoid state update after blur

                const callHolidayCheckOnLoad = async () => {
                  if (!values?.startDate || !values?.endDate) return;

                  if (
                    lastCheckedRef.current.start === values.startDate &&
                    lastCheckedRef.current.end === values.endDate
                  ) {
                    return; // already checked for these dates
                  }

                  lastCheckedRef.current = {
                    start: values.startDate,
                    end: values.endDate,
                  };

                  try {
                    const { data: HolidayCheckData } = await triggerHolidayCheck({
                      start_date: formatDateOnly(values.startDate),
                      end_date: formatDateOnly(values.endDate),
                    });

                    if (HolidayCheckData && isActive) {
                      const isHoliday = Array.isArray(HolidayCheckData?.data) && HolidayCheckData.data.length > 0;

                      setFieldValue("isHoliday", isHoliday);
                      setFieldValue("isOnGoingTour", !!HolidayCheckData?.ongoing_tour);


                    }
                  } catch (error) {
                    console.error("Initial holiday check failed:", error);
                  }
                };

                callHolidayCheckOnLoad();

                return () => {
                  isActive = false; // cleanup on blur
                };
              }, [values?.startDate, values?.endDate])
            );


            return (
              <>
                <ScrollView
                  style={styles.container}
                  keyboardShouldPersistTaps="handled" // Good for scrollable forms
                  ref={scrollViewRef}
                  showsVerticalScrollIndicator={false}
                >
                  <View>
                    {/* Tour Information Section */}
                    <View style={styles.sectionCard}>
                      <Text allowFontScaling={false} style={styles.sectionHeader}>Tour Information</Text>

                      <Text allowFontScaling={false} style={styles.label}>Tour Number</Text>
                      <TextInput
                        style={styles.input}
                        value={values.tourNo?.toString()}
                        editable={false}
                        accessibilityLabel="Tour Number"
                        allowFontScaling={false}
                      />

                      <Text allowFontScaling={false} style={styles.label}>Request Date</Text>
                      <TextInput
                        style={styles.input}
                        value={formatDate(values.requestDate)} // Ensure requestDate is populated
                        editable={false}
                        accessibilityLabel="Request Date"
                        allowFontScaling={false}
                      />
                      <View style={styles.radioGroup}>
                        <TouchableOpacity
                          style={styles.radioItem}
                          onPress={() => handleModeChange("self")}
                          disabled={!isEditable}
                        >
                          <Ionicons
                            name={mode === "self" ? "radio-button-on" : "radio-button-off"}
                            size={22}
                            color={CustomColors.appThemeColor}
                          />
                          <Text allowFontScaling={false} style={styles.radioLabel}>Self</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.radioItem}
                          onPress={() => handleModeChange("onbehalf")}
                          disabled={!isEditable}
                        >
                          <Ionicons
                            name={mode === "onbehalf" ? "radio-button-on" : "radio-button-off"}
                            size={22}
                            color={CustomColors.appThemeColor}
                          />
                          <Text allowFontScaling={false} style={styles.radioLabel}>On Behalf Of</Text>
                        </TouchableOpacity>
                      </View>

                    </View>

                    {/* Employee Info Section */}
                    <View style={styles.sectionCard}>
                      <Text allowFontScaling={false} style={styles.sectionHeader}>Employee Information</Text>
                      {isLoadingEmpDetails ? (
                        <ActivityIndicator
                          size="large"
                          color={CustomColors.appThemeColor}
                          style={styles.loadingIndicator}
                        />
                      ) : (
                        <>
                          <Text allowFontScaling={false} style={styles.label}>Employee Name</Text>
                          <TextInput
                            style={styles.input}
                            value={values.empName}
                            editable={false}
                            accessibilityLabel="Employee Name"
                            allowFontScaling={false}
                          />
                          <Text allowFontScaling={false} style={styles.label}>Employee Code</Text>
                          <TextInput
                            style={styles.input}
                            value={values.empCode}
                            editable={false}
                            accessibilityLabel="Employee Code"
                            allowFontScaling={false}
                          />
                          <Text allowFontScaling={false} style={styles.label}>Designation</Text>
                          <TextInput
                            style={styles.input}
                            value={values.empDesign}
                            editable={false}
                            accessibilityLabel="Designation"
                            allowFontScaling={false}
                          />
                          <Text allowFontScaling={false} style={styles.label}>RM</Text>
                          <TextInput
                            style={styles.input}
                            value={values.rm?.full_name}
                            editable={false}
                            accessibilityLabel="Grade"
                            allowFontScaling={false}
                          />
                          <Text allowFontScaling={false} style={styles.label}>Functional Head</Text>
                          <TextInput
                            style={styles.input}
                            value={values.functionalhead?.full_name}
                            editable={false}
                            accessibilityLabel="Grade"
                            allowFontScaling={false}
                          />
                        </>
                      )}
                    </View>

                    {/* Tour Details Section */}
                    <View style={styles.sectionCard}>
                      <Text allowFontScaling={false} style={styles.sectionHeader}>Tour Details</Text>

                      <Text allowFontScaling={false} style={styles.label}>
                        Reason <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                      </Text>
                      <TouchableOpacity
                        onPress={openReasonPicker}
                        style={[
                          styles.pickerInput,
                          errors.reason && styles.errorBorder,
                        ]}
                        ref={reasonRef}
                        accessibilityRole="button"
                        disabled={!isEditable}
                        accessibilityLabel={`Current reason: ${values.reason?.name || "None selected"
                          }. Tap to select reason.`} // Use ?. for safety
                      >
                        <Text allowFontScaling={false} style={styles.pickerInputText}>
                          {values.reason?.name
                            ? String(values.reason.name)
                            : "Select Reason"}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={CustomColors.mediumGray}
                          style={styles.pickerIcon}
                        />
                      </TouchableOpacity>

                      <View style={styles.dateRow}>
                        <View style={styles.dateColumn}>
                          <Text allowFontScaling={false} style={styles.label}>
                            Tour Start Date <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setDateField("startDate");
                              setCurrentDetailDateFieldIndex(null); // Reset for main tour date
                              setDatePickerVisibility(true);
                            }}
                            ref={startDateRef}
                            style={[
                              styles.pickerInput,
                              errors.startDate && styles.errorBorder,
                            ]}
                            accessibilityRole="button"
                            disabled={!isEditable}
                            accessibilityLabel={`Current start date: ${formatDate(values.startDate) || "None selected"
                              }. Tap to select start date.`}
                          >
                            <Text allowFontScaling={false} style={styles.pickerInputText}>
                              {values.startDate
                                ? formatDate(values.startDate)
                                : "Select Start Date"}
                            </Text>
                            <Ionicons
                              name="calendar-outline"
                              size={20}
                              color={CustomColors.mediumGray}
                              style={styles.pickerIcon}
                            />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.dateColumn}>
                          <Text allowFontScaling={false} style={styles.label}>
                            Tour End Date <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setDateField("endDate");
                              setCurrentDetailDateFieldIndex(null); // Reset for main tour date
                              setDatePickerVisibility(true);
                            }}
                            ref={endDateRef}
                            disabled={!isEditable}
                            style={[
                              styles.pickerInput,
                              errors.endDate && styles.errorBorder,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Current end date: ${formatDate(values.endDate) || "None selected"
                              }. Tap to select end date.`}
                          >
                            <Text allowFontScaling={false} style={styles.pickerInputText}>
                              {values.endDate
                                ? formatDate(values.endDate)
                                : "Select End Date"}
                            </Text>
                            <Ionicons
                              name="calendar-outline"
                              size={20}
                              color={CustomColors.mediumGray}
                              style={styles.pickerIcon}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {(values.isOnGoingTour) && (<>
                        <Text allowFontScaling={false} style={{ color: CustomColors.dangerRed, fontSize: moderateScale(12), margin: verticalScale(5) }}>Travel request already exists for the selected dates.</Text>
                      </>)}

                      <Text allowFontScaling={false} style={styles.label}>No Of Days</Text>
                      <TextInput
                        style={styles.input}
                        value={String(values.durationDays)}
                        editable={false}
                        accessibilityLabel="durationDays"
                        allowFontScaling={false}
                      />


                      {(values.isHoliday || values.week_end_travel) && (
                        <>
                          <Text allowFontScaling={false} style={styles.label}>
                            Explanation for Travel falling on Holidays
                            <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                          </Text>
                          <TextInput
                            style={[
                              styles.input,
                              errors.week_end_travel && styles.errorBorder,
                            ]}
                            ref={week_end_travelRef}
                            submitBehavior="submit"
                            onSubmitEditing={() => flightCostRef.current?.focus()}
                            editable={isEditable}
                            placeholder="Enter reason here..."
                            placeholderTextColor={CustomColors.textGray}
                            value={values.week_end_travel}
                            onChangeText={handleChange("week_end_travel")}
                            textAlignVertical="top"
                            accessibilityLabel="Reason for travel on holiday"
                            returnKeyType="next"
                            allowFontScaling={false}
                          />
                        </>
                      )}

                      <Text allowFontScaling={false} style={styles.label}>
                        Flight Cost <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                      </Text>
                      <TextInput
                        ref={flightCostRef}
                        style={[styles.input, errors.flightCost && styles.errorBorder]}
                        keyboardType="numeric"
                        returnKeyType="next"
                        onSubmitEditing={() => scrollToRef(accommodationCostRef)}
                        placeholder="Enter flight cost"
                        placeholderTextColor={CustomColors.textGray}
                        value={values.flightCost?.toString()}
                        onChangeText={handleChange("flightCost")}
                        editable={isEditable}
                        allowFontScaling={false}
                      />


                      <Text allowFontScaling={false} style={styles.label}>
                        Accommodation Cost <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                      </Text>
                      <TextInput
                        ref={accommodationCostRef}
                        style={[styles.input, errors.accommodationCost && styles.errorBorder]}
                        keyboardType="numeric"
                        returnKeyType="next"
                        onSubmitEditing={() => scrollToRef(otherCostRef)}
                        placeholder="Enter accommodation cost"
                        placeholderTextColor={CustomColors.textGray}
                        value={values.accommodationCost?.toString()}
                        onChangeText={handleChange("accommodationCost")}
                        editable={isEditable}
                        allowFontScaling={false}
                      />


                      <Text allowFontScaling={false} style={styles.label}>
                        Other Cost <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                      </Text>
                      <TextInput
                        ref={otherCostRef}
                        style={[styles.input, errors.otherCost && styles.errorBorder]}
                        keyboardType="numeric"
                        returnKeyType="next"
                        onSubmitEditing={() => scrollToRef(remarksRef)}
                        placeholder="Enter other costs"
                        placeholderTextColor={CustomColors.textGray}
                        value={values.otherCost?.toString()}
                        onChangeText={handleChange("otherCost")}
                        editable={isEditable}
                        allowFontScaling={false}
                      />

                      {/* End of new fields */}

                      <Text allowFontScaling={false} style={styles.label}>
                        Remarks<Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                      </Text>
                      <TextInput
                        ref={remarksRef}
                        style={[styles.input, errors.remarks && styles.errorBorder]}
                        multiline
                        submitBehavior="submit"          // 🔑 REQUIRED
                        returnKeyType="next"
                        onSubmitEditing={() => {
                          const targetIndex = 0; // Target Detail 1

                          // 1. Programmatically expand the first detail section
                          setExpandedIndex(targetIndex);

                          // 2. Scroll the row container into view
                          scrollToRef(detailRefs.current?.[targetIndex]?.typeoftravelViewRef);

                          // 3. Wait for the ExpandableSection to mount children
                          setTimeout(() => {
                            const target = detailRefs.current?.[targetIndex]?.typeoftravelRef;
                            if (target?.current) {
                              target.current.focus(); // Successfully triggers the picker bridge 
                            }
                          }, 500); // 500ms allows sufficient time for expansion animation
                        }}
                        editable={isEditable}
                        placeholder="Enter remarks here..."
                        placeholderTextColor={CustomColors.textGray}
                        value={values.remarks}
                        onChangeText={(text) => {
                          handleChange("remarks")(text);   // keep your existing handler
                          setErrors((prev) => ({ ...prev, remarks: false })); // 🔥 hide red border
                        }}

                        textAlignVertical="top"
                        accessibilityLabel="Remarks for tour"
                        allowFontScaling={false}
                      />


                    </View>

                    {/* Tour Days (Details List) Section */}
                    <View style={styles.itinarySectionCard} >
                      <Text allowFontScaling={false} style={styles.itinarySectionHeader}>
                        Tour Itinerary <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                      </Text>

                      {values.details.map((item, index) => (
                        <React.Fragment key={index}>
                          <View
                            ref={(ref) => {
                              if (ref && detailRefs.current[index]) {
                                // Attaches the container view ref for scrolling [cite: 160, 161]
                                detailRefs.current[index].typeoftravelViewRef = { current: ref };
                              }
                            }}
                          >
                            <ExpandableSection
                              title={`Detail ${index + 1}`}
                              expanded={expandedIndex === index} // 🔑 This must match the state in parent
                              onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
                              summaryData={item}
                              isEditable={isEditable}
                              showHeaderAddButton={
                                !isPastTour &&
                                item?.startingpoint &&
                                item?.placeofvisit &&
                                item?.detailStartDate &&
                                item?.detailEndDate
                              }
                              initial={isMaker}
                              onAddPress={() => {
                                openCommonDropDownPicker(
                                  "selectedRequirment",
                                  index,
                                  "Requirements",
                                  "booking_req"
                                );
                                setSelectedIndex({
                                  detailIndex: index,
                                  requirementIndex: null,
                                });
                              }}
                              onDeletePress={() => {
                                const newDetails = [...values.details];
                                newDetails.splice(index, 1);
                                setFieldValue("details", newDetails);
                              }}
                              disableLongPress={
                                values.details.length <= 1 || !isEditable
                              }
                            >
                              {/* --- Type of Travel --- */}
                              <Text allowFontScaling={false} style={styles.label}>
                                Type of Travel <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                              </Text>
                              <TextInput
                                ref={(ref) => {
                                  if (ref && detailRefs.current[index]) {
                                    detailRefs.current[index].typeoftravelRef = { current: ref };
                                  }
                                }}
                                style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}
                                onFocus={() => {
                                  openCommonDropDownPicker(
                                    "typeOfTravel",
                                    index,
                                    "Type of Travel",
                                    "official"
                                  );
                                }}
                                showSoftInputOnFocus={false}
                              />
                              <TouchableOpacity
                                onPress={() =>
                                  openCommonDropDownPicker(
                                    "typeOfTravel",
                                    index,
                                    "Type of Travel",
                                    "official"
                                  )
                                }

                                disabled={!isEditable}
                                style={[
                                  styles.pickerInput,
                                  errors.details?.[index]?.typeOfTravel &&
                                  styles.errorBorder,
                                ]}
                              >
                                <Text allowFontScaling={false} style={styles.pickerInputText}>
                                  {item.typeOfTravel?.name || "Select Type of Travel"}
                                </Text>
                                <Ionicons
                                  name="chevron-down"
                                  size={20}
                                  style={styles.pickerIcon}
                                />
                              </TouchableOpacity>

                              {/* --- Date Pickers --- */}
                              <View style={styles.dateRow}>
                                <View style={styles.dateColumn}>
                                  <Text allowFontScaling={false} style={styles.label}>
                                    Itinerary Start Date{" "}
                                    <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                                  </Text>
                                  <TextInput
                                    ref={(ref) => { if (ref && detailRefs.current[index]) detailRefs.current[index].detailStartDateRef = { current: ref }; }}
                                    style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}
                                    showSoftInputOnFocus={false}
                                    onFocus={() => {
                                      setDateField("detailStartDate");
                                      setCurrentDetailDateFieldIndex(index);
                                      setDatePickerVisibility(true);
                                    }}
                                  />
                                  <TouchableOpacity
                                    onPress={() => {
                                      setDateField("detailStartDate");
                                      setCurrentDetailDateFieldIndex(index);
                                      setDatePickerVisibility(true);
                                    }}
                                    ref={(ref) => {
                                      if (!detailRefs.current[index])
                                        detailRefs.current[index] = {};
                                      detailRefs.current[index].detailStartDateRef =
                                        ref;
                                    }}
                                    disabled={!isEditable}
                                    style={[
                                      styles.pickerInput,
                                      errors?.details?.[index]?.detailStartDate &&
                                      styles.errorBorder,
                                    ]}
                                  >
                                    <Text allowFontScaling={false} style={styles.pickerInputText}>
                                      {item.detailStartDate
                                        ? formatDate(item.detailStartDate)
                                        : "Select Start Date"}
                                    </Text>
                                    <Ionicons
                                      name="calendar-outline"
                                      size={moderateScale(19)}
                                      color={CustomColors.mediumGray}
                                      style={styles.pickerIcon}
                                    />
                                  </TouchableOpacity>
                                </View>

                                <View style={styles.dateColumn}>
                                  <Text allowFontScaling={false} style={styles.label}>
                                    Itinerary End Date{" "}
                                    <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                                  </Text>
                                  <TextInput
                                    ref={(ref) => { if (ref && detailRefs.current[index]) detailRefs.current[index].detailEndDateRef = { current: ref }; }}
                                    style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}
                                    showSoftInputOnFocus={false}
                                    onFocus={() => {
                                      setDateField("detailEndDate");
                                      setCurrentDetailDateFieldIndex(index);
                                      setDatePickerVisibility(true);
                                    }}
                                  />
                                  <TouchableOpacity
                                    onPress={() => {
                                      setDateField("detailEndDate");
                                      setCurrentDetailDateFieldIndex(index);
                                      setDatePickerVisibility(true);
                                    }}
                                    disabled={!isEditable}
                                    style={[
                                      styles.pickerInput,
                                      errors?.details?.[index]?.detailEndDate &&
                                      styles.errorBorder,
                                    ]}
                                  >
                                    <Text allowFontScaling={false} style={styles.pickerInputText}>
                                      {item.detailEndDate
                                        ? formatDate(item.detailEndDate)
                                        : "Select End Date"}
                                    </Text>
                                    <Ionicons
                                      name="calendar-outline"
                                      size={20}
                                      color={CustomColors.mediumGray}
                                      style={styles.pickerIcon}
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* --- Starting Point (From Place) --- */}
                              <Text allowFontScaling={false} style={styles.label}>
                                From Place <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                              </Text>
                              <TextInput
                                ref={(ref) => { if (ref && detailRefs.current[index]) detailRefs.current[index].startingpointRef = { current: ref }; }}
                                style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}
                                showSoftInputOnFocus={false}
                                onFocus={() => openCityPicker("startingpoint", index, "From Place")}
                              />
                              <TouchableOpacity
                                onPress={() => {
                                  openCityPicker(
                                    "startingpoint",
                                    index,
                                    "From Place"
                                  );
                                }}
                                disabled={!isEditable}
                                style={[
                                  styles.pickerInput,
                                  errors.details?.[index]?.startingpoint &&
                                  styles.errorBorder,
                                ]}
                              >
                                <Text allowFontScaling={false} style={styles.pickerInputText}>
                                  {item.startingpoint?.name ||
                                    item.startingpoint ||
                                    "Select From Place"}
                                </Text>
                                <Ionicons
                                  name="chevron-down"
                                  size={moderateScale(19)}
                                  style={styles.pickerIcon}
                                />
                              </TouchableOpacity>

                              {/* --- Place of Visit (To Place) --- */}
                              <Text allowFontScaling={false} style={styles.label}>
                                To Place <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                              </Text>
                              <TextInput
                                ref={(ref) => { if (ref && detailRefs.current[index]) detailRefs.current[index].placeofvisitRef = { current: ref }; }}
                                style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}
                                showSoftInputOnFocus={false}
                                onFocus={() => openCityPicker("placeofvisit", index, "To Place")}
                              />
                              <TouchableOpacity
                                onPress={() =>
                                  openCityPicker("placeofvisit", index, "To Place")
                                }
                                disabled={!isEditable}
                                style={[
                                  styles.pickerInput,
                                  errors.details?.[index]?.placeofvisit &&
                                  styles.errorBorder,
                                ]}
                              >
                                <Text allowFontScaling={false} style={styles.pickerInputText}>
                                  {item.placeofvisit?.name ||
                                    item.placeofvisit ||
                                    "Select To Place"}
                                </Text>
                                <Ionicons
                                  name="chevron-down"
                                  size={20}
                                  style={styles.pickerIcon}
                                />
                              </TouchableOpacity>

                              {/* --- Purpose of Visit --- */}
                              <Text allowFontScaling={false} style={styles.label}>
                                Purpose of Visit{" "}
                                <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                              </Text>
                              <TextInput
                                style={[
                                  styles.input,
                                  errors.details[index]?.purposeofvisit &&
                                  styles.errorBorder,
                                ]}
                                placeholder="e.g., Client Meeting"
                                placeholderTextColor={CustomColors.textGray}
                                value={item.purposeofvisit}
                                editable={isEditable}
                                blurOnSubmit={false}
                                submitBehavior={"submit"}
                                allowFontScaling={false}
                                ref={(ref) => {
                                  if (!detailRefs.current[index])
                                    detailRefs.current[index] = {};
                                  detailRefs.current[index].purposeofvisitRef = ref;
                                }}
                                onSubmitEditing={() => {
                                  // 🔑 1. Scroll the current detail row container into view
                                  scrollToRef(detailRefs.current[index]?.clientRef);

                                  // 🔑 2. Focus the hidden bridge for the Client picker
                                  detailRefs.current[index]?.clientRef?.current?.focus();
                                }}
                                returnKeyType="next"
                                onChangeText={(text) => {
                                  setFieldValue(`details[${index}].purposeofvisit`, text);

                                  // 🔥 clear red border for this row
                                  setErrors((prev) => {
                                    const copy = { ...prev };

                                    if (copy.details?.[index]) {
                                      copy.details[index] = {
                                        ...copy.details[index],
                                        purposeofvisit: false,
                                      };
                                    }

                                    return copy;
                                  });
                                }}


                              />

                              {/* --- Client --- */}
                              <Text allowFontScaling={false} style={styles.label}>
                                Client <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                              </Text>
                              <TextInput
                                ref={(ref) => { if (ref && detailRefs.current[index]) detailRefs.current[index].clientRef = { current: ref }; }}
                                style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}
                                showSoftInputOnFocus={false}
                                onFocus={() => openClientPicker("client", index, "Client")}
                              />
                              <TouchableOpacity
                                onPress={() =>
                                  openClientPicker("client", index, "Client")
                                }
                                disabled={!isEditable}
                                style={[
                                  styles.pickerInput,
                                  errors.details?.[index]?.client &&
                                  styles.errorBorder,
                                ]}
                              >
                                <Text allowFontScaling={false} style={styles.pickerInputText}>
                                  {item.client?.client_name ||
                                    item.client ||
                                    "Select Client"}
                                </Text>
                                <Ionicons
                                  name="chevron-down"
                                  size={moderateScale(19)}
                                  style={styles.pickerIcon}
                                />
                              </TouchableOpacity>

                              {/* --- Requirements Summary Cards --- */}
                              {item.requirement && item.requirement.length > 0 && (
                                <View style={styles.requirementsSection}>
                                  <Text allowFontScaling={false} style={styles.label}>Requirements:</Text>
                                  {item.requirement.map((req, i) => (
                                    <RequirementSummaryCard
                                      key={i}
                                      index={{
                                        detailIndex: index,
                                        requirementIndex: i,
                                      }}
                                      requirement={req}
                                      onPress={handleRequirementCardPress}
                                      onDelete={async (reqdel, ind) => {
                                        if (reqdel?.id) {
                                          await triggerReqDelete({ id: reqdel.id, type: reqdel.booking_needed })
                                          if (!reqDeleError) {
                                            const newRequirements = [...values.details[index].requirement]
                                            newRequirements.splice(ind, 1)
                                            //console.log(ind)
                                            setFieldValue(`details[${index}].requirement`, newRequirements)
                                          }
                                        }
                                        else {
                                          const newRequirements = [...values.details[index].requirement]
                                          newRequirements.splice(ind, 1)
                                          //console.log(ind)
                                          setFieldValue(`details[${index}].requirement`, newRequirements)
                                        }
                                      }}
                                      disableDelete={!isEditable}
                                    />
                                  ))}
                                </View>
                              )}

                              {/* --- Remove Button --- */}
                              {values.details.length > 1 && (
                                <TouchableOpacity
                                  style={styles.removeButton}
                                  onPress={() => {
                                    const newDetails = [...values.details];
                                    newDetails.splice(index, 1);
                                    setFieldValue("details", newDetails);
                                  }}
                                  disabled={!isEditable}
                                >
                                  <Ionicons
                                    name="remove-circle-outline"
                                    size={20}
                                    color={CustomColors.iconWhite}
                                  />
                                  <Text allowFontScaling={false} style={styles.buttonText}>Remove</Text>
                                </TouchableOpacity>
                              )}
                            </ExpandableSection>
                          </View>
                        </React.Fragment>
                      ))}

                      <TouchableOpacity
                        style={styles.addButton}
                        disabled={!isEditable}
                        onPress={() => {
                          setFieldValue("details", [...values.details, emptyDetailRow]);

                          // Manually push a new set of refs for the new row
                          detailRefs.current = [
                            ...detailRefs.current,
                            {
                              startingpointRef: React.createRef(),
                              placeofvisitRef: React.createRef(),
                              purposeofvisitRef: React.createRef(),
                              typeoftravelRef: React.createRef(),
                              clientRef: React.createRef(),
                              detailStartDateRef: React.createRef(),
                              detailEndDateRef: React.createRef(),
                            },
                          ];
                        }}
                        accessibilityLabel="Add new tour itinerary detail row"
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={24}
                          color={CustomColors.iconWhite}
                        />
                        <Text allowFontScaling={false} style={styles.buttonText}> Add Detail</Text>
                      </TouchableOpacity>
                    </View>
                    {showNonBaseReason && (
                      <View style={styles.sectionCard} ref={nonbaseRef}>
                        <Text allowFontScaling={false} style={styles.sectionHeader}>
                          Reason for non base location travel <Text style={styles.mandatory}>*</Text>
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.pickerInput,
                            errors.NonBasereason && styles.errorBorder,
                            !isEditable && { backgroundColor: CustomColors.backgroundGray2 }
                          ]}
                          onPress={() => setNonBaseReasonPickerVisibility(true)}
                          disabled={!isEditable}
                        >
                          <Text style={styles.pickerInputText}>

                            {values.NonBasereason?.name || "Select reason"}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={20}
                            color={CustomColors.mediumGray}
                            style={styles.pickerIcon}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                    {/* Upload Files Section */}
                    <View ref={fileUploadRef} style={[styles.sectionCard, errors?.fileUpload && { borderColor: "red", borderWidth: 1 }]}>
                      <Text allowFontScaling={false} style={styles.sectionHeader}>Attachments</Text>
                      <View style={{ flexDirection: 'row', justifyContent: "space-between" }}>
                        {/* Pick Files */}
                        <TouchableOpacity
                          style={styles.pickFileButton}
                          onPress={pickFiles}
                          disabled={!isEditable}
                          accessibilityLabel="Pick files to upload"
                        >
                          <Ionicons name="document-attach-outline" size={24} color={CustomColors.iconWhite} />
                          <Text allowFontScaling={false}style={styles.buttonText}> Pick Files</Text>
                        </TouchableOpacity>

                        {/* Camera */}
                        <TouchableOpacity
                          style={[styles.pickFileButton, { backgroundColor: CustomColors.primaryGreen }]}
                          onPress={openCamera}
                          disabled={!isEditable}
                          accessibilityLabel="Open camera to take photo"
                        >
                          <Ionicons name="camera-outline" size={24} color={CustomColors.White} />
                          <Text allowFontScaling={false}style={styles.buttonText}> Camera</Text>
                        </TouchableOpacity>
                      </View>

                      {files.length > 0 && (
                        <View style={styles.fileList}>
                          {/* <Text style={styles.label}>Selected Files:</Text> */}
                          {/* {files.map((file, index) => (
                        <View
                          key={file.uri || index?.toString()}
                          style={styles.fileItem}
                        >
                          <Text
                            style={styles.fileName}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                          >
                            <Ionicons
                              name="file-tray-full-outline"
                              size={16}
                              color={CustomColors.darkGray}
                            />{" "}
                            {file.name}
                          </Text>
                          <View style={styles.fileActions}>
                            <TouchableOpacity
                              onPress={() => handleViewFile(file)}
                              style={styles.viewButton}
                              accessibilityLabel={`View file ${file.name}`}
                            >
                              <Ionicons
                                name="eye-outline"
                                size={18}
                                color="#fff"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeFile(file.uri)}
                              style={styles.deleteFileButton}
                              accessibilityLabel={`Remove file ${file.name}`}
                              disabled={!isEditable}
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={18}
                                color="#fff"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))} */}
                          <FileDisplaySection
                            title="Selected Files"
                            files={files} // Your 'files' state for newly selected files
                            handleViewFile={handleViewFile} // Function to view local files
                            removeFile={removeFile} // Function to remove local files
                            isEditable={isEditable}
                          />
                        </View>
                      )}

                      {values.DocumentData?.data?.length > 0 && (
                        <View style={styles.fileList}>
                          {/* <Text style={styles.label}>Maker Uploded Files:</Text> */}
                          {/* {values.DocumentData?.tour_maker?.map((file, index) => (
                        <View key={file.id} style={styles.fileItem}>
                          <Text
                            style={styles.fileName}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                          >
                            <Ionicons
                              name="file-tray-full-outline"
                              size={16}
                              color={CustomColors.darkGray}
                            />{" "}
                            {file.file_name}
                          </Text>
                          <View style={styles.fileActions}>
                            <TouchableOpacity
                              onPress={() => handleWebViewFile(file)}
                              style={styles.viewButton}
                              accessibilityLabel={`View file ${file.file_name}`}
                            >
                              <Ionicons
                                name="eye-outline"
                                size={18}
                                color="#fff"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeFile(file.id)}
                              style={styles.deleteFileButton}
                              accessibilityLabel={`Remove file ${file.file_name}`}
                              disabled={!isEditable}
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={18}
                                color="#fff"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))} */}
                          <FileDisplaySection
                            title="Uploaded Files"
                            files={values.DocumentData?.data} // Data from your 'values' object
                            handleWebViewFile={handleWebViewFile} // Function to view web-uploaded files
                            removeFile={removeFile} // Function to remove uploaded files (if allowed)
                            isEditable={false}
                          />
                        </View>
                      )}

                      {values.DocumentData?.tour_approver?.length > 0 && (
                        <View style={styles.fileList}>
                          {/* <Text style={styles.label}>Approver Uploded Files:</Text> */}
                          {/* {values.DocumentData?.tour_approver?.map((file, index) => (
                        <View key={file.id} style={styles.fileItem}>
                          <Text
                            style={styles.fileName}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                          >
                            <Ionicons
                              name="file-tray-full-outline"
                              size={16}
                              color={CustomColors.darkGray}
                            />{" "}
                            {file.file_name}
                          </Text>
                          <View style={styles.fileActions}>
                            <TouchableOpacity
                              onPress={() => handleWebViewFile(file)}
                              style={styles.viewButton}
                              accessibilityLabel={`View file ${file.file_name}`}
                            >
                              <Ionicons
                                name="eye-outline"
                                size={18}
                                color="#fff"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeFile(file.id)}
                              style={styles.deleteFileButton}
                              accessibilityLabel={`Remove file ${file.file_name}`}
                              disabled={!isEditable}
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={18}
                                color="#fff"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))} */}
                          <FileDisplaySection
                            title="Approver Uploaded Files"
                            files={values.DocumentData?.tour_approver} // Data from your 'values' object
                            handleWebViewFile={handleWebViewFile} // Function to view web-uploaded files
                            removeFile={removeFile} // Function to remove uploaded files (if allowed)
                            isEditable={false}
                          />
                        </View>
                      )}
                    </View>

                    {/* {isMaker && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>Approver Data</Text>

                    <Text style={styles.label} ref={branchRef}>
                      Branch <Text style={styles.mandatory}>*</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={openBranchPicker}
                      disabled={!isEditable}
                      style={[
                        styles.pickerInput,
                        errors.branch && styles.errorBorder,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Current Branch: ${
                        values.branch_data?.name || "None selected"
                      }. Tap to select branch.`} // Use ?. and updated label
                    >
                      <Text style={styles.pickerInputText}>
                        {values.branch_data?.name
                          ? String(values.branch_data.name)
                          : "Select Branch"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={CustomColors.mediumGray}
                        style={styles.pickerIcon}
                      />
                    </TouchableOpacity>

                    <Text style={styles.label} ref={approverRef}>
                      Approver <Text style={styles.mandatory}>*</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={openApproverPicker}
                      disabled={!isEditable}
                      style={[
                        styles.pickerInput,
                        errors.approver && styles.errorBorder,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Current Approver: ${
                        values.approver_data?.full_name || "None selected"
                      }. Tap to select approver.`} // Use ?. and updated label
                    >
                      <Text style={styles.pickerInputText}>
                        {values.approver_data?.full_name
                          ? String(values.approver_data.full_name)
                          : "Select Approver"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={CustomColors.mediumGray}
                        style={styles.pickerIcon}
                      />
                    </TouchableOpacity>
                  </View>
                )} */}

                    {(isChecker || isCancelMaker) && (
                      <View style={styles.sectionCard}>
                        <Text allowFontScaling={false} style={styles.sectionHeader}>
                          {isChecker ? "Approver Remarks" : "Remarks"}
                        </Text>
                        {/* <Text style={styles.label}>Approver Remarks</Text> */}
                        <TextInput
                          style={[styles.input, styles.multilineInput]}
                          editable={
                            isAppoverEditable ||
                            (isCancelMaker && !isCancelMakerDisabled)
                          }
                          placeholder="Enter remarks here..."
                          placeholderTextColor={CustomColors.textGray}
                          value={values.approverRemarks}
                          onChangeText={handleChange("approverRemarks")}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                          accessibilityLabel="Remarks for Approve"
                          allowFontScaling={false}
                        />
                      </View>
                    )}

                    {/* <ApproverModal
                  visible={isForword}
                  onForward={isChecker ? handleForward : handleCancel}
                  values={values}
                  onClose={() => setIsForword(false)}
                  isEditable={
                    isChecker ? isAppoverEditable : !isCancelMakerDisabled
                  }
                  setBranchPickerVisibility={setBranchPickerVisibility}
                  setApproverPickerVisibility={setApproverPickerVisibility}
                  handleChange={handleChange}
                  buttonTitle={isChecker ? "Forward" : "Submit"}
                  remarksTitle={isChecker ? "Approver" : "Cancelation"}
                ></ApproverModal> */}

                    {/* Spacer for bottom button */}
                    <View style={{ height: 80 }} />

                    {/* Date Picker Modal/Component - Keep as is, shown conditionally outside ScrollView logically */}
                    {isDatePickerVisible && Platform.OS === "ios" ? (
                      <Modal
                        transparent={true}
                        animationType="slide"
                        visible={isDatePickerVisible}
                        onRequestClose={() => setDatePickerVisibility(false)}
                      >
                        <Pressable
                          style={styles.modalOverlay}
                          onPress={() => setDatePickerVisibility(false)}
                        >
                          <View style={styles.datePickerModalView}>
                            <DateTimePicker
                              value={
                                currentDetailDateFieldIndex !== null
                                  ? dateField === "detailStartDate" &&
                                    values.details[currentDetailDateFieldIndex]
                                      ?.detailStartDate
                                    ? new Date(
                                      values.details[
                                        currentDetailDateFieldIndex
                                      ].detailStartDate
                                    )
                                    : dateField === "detailEndDate" &&
                                      values.details[currentDetailDateFieldIndex]
                                        ?.detailEndDate
                                      ? new Date(
                                        values.details[
                                          currentDetailDateFieldIndex
                                        ].detailEndDate
                                      )
                                      : new Date()
                                  : dateField === "startDate" && values.startDate
                                    ? new Date(values.startDate)
                                    : dateField === "endDate" && values.endDate
                                      ? new Date(values.endDate)
                                      : new Date()
                              }
                              minimumDate={
                                currentDetailDateFieldIndex !== null
                                  ? dateField === "detailEndDate" &&
                                    values.details[currentDetailDateFieldIndex]
                                      ?.detailStartDate
                                    ? new Date(
                                      values.details[
                                        currentDetailDateFieldIndex
                                      ].detailStartDate
                                    )
                                    : values.startDate
                                      ? new Date(values.startDate)
                                      : undefined
                                  : dateField === "endDate" && values.startDate
                                    ? new Date(values.startDate)
                                    : undefined
                              }
                              maximumDate={
                                currentDetailDateFieldIndex !== null
                                  ? values.endDate
                                    ? new Date(values.endDate)
                                    : undefined
                                  : undefined
                              }
                              mode="date"
                              display={
                                Platform.OS === "ios" ? "spinner" : "default"
                              }
                              onChange={(event, selectedDate) => {
                                if (event?.type === "set" && selectedDate) {
                                  handleConfirmDate(
                                    event,
                                    selectedDate,
                                    setFieldValue,
                                    values
                                  );
                                }
                                setDatePickerVisibility(false);
                              }}
                            />
                            <TouchableOpacity
                              style={styles.datePickerConfirmButton}
                              onPress={() => setDatePickerVisibility(false)}
                            >
                              <Text allowFontScaling={false} style={styles.datePickerConfirmButtonText}>
                                Done
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </Pressable>
                      </Modal>
                    ) : (
                      isDatePickerVisible &&
                      Platform.OS !== "ios" && (
                        <DateTimePicker
                          value={
                            currentDetailDateFieldIndex !== null
                              ? dateField === "detailStartDate" &&
                                values.details[currentDetailDateFieldIndex]
                                  ?.detailStartDate
                                ? new Date(
                                  values.details[
                                    currentDetailDateFieldIndex
                                  ].detailStartDate
                                )
                                : dateField === "detailEndDate" &&
                                  values.details[currentDetailDateFieldIndex]
                                    ?.detailEndDate
                                  ? new Date(
                                    values.details[
                                      currentDetailDateFieldIndex
                                    ].detailEndDate
                                  )
                                  : new Date()
                              : dateField === "startDate" && values.startDate
                                ? new Date(values.startDate)
                                : dateField === "endDate" && values.endDate
                                  ? new Date(values.endDate)
                                  : new Date()
                          }
                          minimumDate={
                            currentDetailDateFieldIndex !== null
                              ? dateField === "detailEndDate" &&
                                values.details[currentDetailDateFieldIndex]
                                  ?.detailStartDate
                                ? new Date(
                                  values.details[
                                    currentDetailDateFieldIndex
                                  ].detailStartDate
                                )
                                : values.startDate
                                  ? new Date(values.startDate)
                                  : undefined
                              : dateField === "endDate" && values.startDate
                                ? new Date(values.startDate)
                                : undefined
                          }
                          maximumDate={
                            currentDetailDateFieldIndex !== null
                              ? values.endDate
                                ? new Date(values.endDate)
                                : undefined
                              : undefined
                          }
                          mode="date"
                          display="default"
                          onChange={(event, selectedDate) => {
                            if (event?.type === "set" && selectedDate) {
                              handleConfirmDate(
                                event,
                                selectedDate,
                                setFieldValue,
                                values
                              );
                            }
                            setDatePickerVisibility(false);
                          }}
                        />
                      )
                    )}
                    {isNonBaseReasonPickerVisible && nonBaseReasonOptions.length > 0 && (
                      <CustomActionSheetPicker
                        pickerStatus={isNonBaseReasonPickerVisible}
                        setPickerStatus={setNonBaseReasonPickerVisibility}
                        title="Select Reason"
                        optionsData={nonBaseReasonOptions.map((NonBasereason) => ({
                          // Based on your LOG: "name" is the display text, "id" is the unique identifier
                          label: String(NonBasereason.name),
                          value: NonBasereason.id, // Or reason.value if the backend prefers the string
                        }))}
                        RenderItem={RenderDropdownItem}
                        onPress={(selectedOption) => {
                          // 1️⃣ set value
                          setFieldValue('NonBasereason', {
                            id: selectedOption.value,
                            name: selectedOption.label,
                          });

                          // 2️⃣ clear error (🔥 removes red border if shown)
                          setErrors((prev) => ({
                            ...prev,
                            NonBasereason: false,
                          }));

                          // 3️⃣ close picker
                          setNonBaseReasonPickerVisibility(false);
                        }}

                        selected={
                          values.NonBasereason
                            ? {
                              label: values.NonBasereason.name,
                              value: values.NonBasereason.id,
                            }
                            : null
                        }
                        isLoading={isLoadingNonBaseDropdown}
                      />
                    )}

                    {/* Reason ActionSheetPicker */}
                    {isReasonPickerVisible && (
                      <CustomActionSheetPicker
                        pickerStatus={isReasonPickerVisible}
                        setPickerStatus={setReasonPickerVisibility}
                        title="Select Reason"
                        optionsData={reasons.map((reason) => ({
                          label: String(reason.name),
                          value: reason.id,
                        }))}
                        RenderItem={RenderDropdownItem}
                        onPress={(selectedOption) => {
                          // 1️⃣ set value
                          setFieldValue("reason", {
                            id: selectedOption.value,
                            name: selectedOption.label,
                          });

                          // 2️⃣ clear error (🔥 removes red border)
                          setErrors((prev) => ({
                            ...prev,
                            reason: false,
                          }));

                          // 3️⃣ continue your flow
                          scrollToRef(startDateRef);
                          setReasonPickerVisibility(false);
                        }}

                        selected={{
                          label: values.reason?.name
                            ? String(values.reason.name)
                            : undefined,
                          value: values.reason?.id ? values.reason.id : undefined,
                        }} // Use ?.
                        onSearch={handleSearchReason}
                        isLoading={isFetchingReason && reasonPage === 1}
                        onEndReached={handleLoadMoreReasons}
                        hasMoreData={hasMoreReasons}
                        isFetchingMore={isFetchingReason && reasonPage > 1}
                      />
                    )}

                    {isCityPickerVisible && (
                      <CustomActionSheetPicker
                        pickerStatus={isCityPickerVisible}
                        setPickerStatus={setCityPickerVisibility}
                        title={`Select ${selectedFieldTitle}`}
                        optionsData={cities.map((city) => ({
                          label: String(city.name),
                          value: city.name,
                        }))}
                        RenderItem={RenderDropdownItem}
                        onPress={async (selectedOption) => {
                          const { field, index } = PickerTarget; // make sure casing matches your state

                          // 1️⃣ Set selected city in Formik
                          setFieldValue(`details[${index}].${field}`, {
                            id: selectedOption.value,
                            name: selectedOption.label,
                          });

                          // 2️⃣ Clear error for this field & row (🔥 removes red border)
                          setErrors((prev) => {
                            const copy = { ...prev };

                            if (copy.details?.[index]) {
                              copy.details[index] = {
                                ...copy.details[index],
                                [field]: false,   // works for startingpoint / placeofvisit
                              };
                            }

                            return copy;
                          });

                          // 3️⃣ Only trigger for "From Place" of Detail 1
                          if (field === "startingpoint" && index === 0) {
                            const selectedCityName = selectedOption.label;

                            try {
                              const res = await triggerEmpBaseGet().unwrap();
                              const baseLocationName = res?.name;

                              if (baseLocationName && selectedCityName !== baseLocationName) {
                                setShowNonBaseReason(true);
                              } else {
                                setShowNonBaseReason(false);
                                setFieldValue("NonBasereason", null);
                              }
                            } catch (err) {
                              console.error("EmpBaseGet API failed", err);
                              setShowNonBaseReason(false);
                            }
                          }

                          // 4️⃣ Close picker
                          setCityPickerVisibility(false);
                        }}


                        selected={{
                          label: values.details[PickerTarget.index][
                            PickerTarget.field
                          ]?.name
                            ? String(
                              values.details[PickerTarget.index][
                                PickerTarget.field
                              ].name
                            )
                            : undefined,
                          value: values.details[PickerTarget.index][
                            PickerTarget.field
                          ]?.name
                            ? String(
                              values.details[PickerTarget.index][
                                PickerTarget.field
                              ].name
                            )
                            : undefined,
                        }}
                        onSearch={handleSearchCity}
                        isLoading={isLoadingCity}
                        onEndReached={handleLoadMoreCity}
                        hasMoreData={hasMoreCity}
                        isFetchingMore={isLoadingCity && CityPage > 1}
                      />
                    )}

                    {isClientPickerVisible && (
                      <CustomActionSheetPicker
                        pickerStatus={isClientPickerVisible}
                        setPickerStatus={setClientPickerVisibility}
                        title={`Select ${selectedFieldTitle}`}
                        optionsData={client.map((clt) => ({
                          label: String(clt.client_name),
                          value: clt.id,
                        }))}
                        RenderItem={RenderDropdownItem}
                        onPress={(selectedOption) => {
                          const { field, index } = PickerTarget; // <-- make sure casing matches your state

                          // 1️⃣ set selected value
                          setFieldValue(`details[${index}].${field}`, {
                            id: selectedOption.value,
                            client_name: selectedOption.label,
                          });

                          // 2️⃣ clear error for this field & row (🔥 this removes red border)
                          setErrors((prev) => {
                            const copy = { ...prev };

                            if (copy.details?.[index]) {
                              copy.details[index] = {
                                ...copy.details[index],
                                [field]: false,   // works for "client"
                              };
                            }

                            return copy;
                          });

                          // 3️⃣ close picker
                          setClientPickerVisibility(false);
                        }}

                        selected={{
                          label: values.details[PickerTarget.index][
                            PickerTarget.field
                          ]?.client_name
                            ? String(
                              values.details[PickerTarget.index][
                                PickerTarget.field
                              ].client_name
                            )
                            : undefined,
                          value: values.details[PickerTarget.index][
                            PickerTarget.field
                          ]?.id
                            ? values.details[PickerTarget.index][PickerTarget.field]
                              .id
                            : undefined,
                        }}
                        onSearch={handleSearchClient}
                        isLoading={isLoadingClient}
                        onEndReached={handleLoadMoreClient}
                        hasMoreData={hasMoreClient}
                        isFetchingMore={isLoadingClient && ClientPage > 1}
                      />
                    )}

                    {isCommonDropDownPickerVisible && (
                      <CustomActionSheetPicker
                        pickerStatus={isCommonDropDownPickerVisible}
                        setPickerStatus={setCommonDropDownPickerVisibility}
                        title="Select CommonDropDown"
                        optionsData={common?.[PickerTarget.key]?.map((branch) => ({
                          label: String(branch.name),
                          value: branch.value,
                        }))}
                        RenderItem={RenderDropdownItem}
                        onPress={(selectedOption) => {
                          //console.log(selectedOption)
                          if (PickerTarget.field === "selectedRequirment") {
                            handleRequirementSelect(
                              selectedOption.value,
                              setFieldValue,
                              values
                            );
                          }
                          setFieldValue(selectedField, {
                            value: selectedOption.value,
                            name: selectedOption.label,
                          });
                        }}


                        // // 2️⃣ clear error for this field & row (🔥 removes red border)
                        // setErrors((prev) => {
                        //   const copy = { ...prev };

                        //   if (copy.details?.[index]) {
                        //     copy.details[index] = {
                        //       ...copy.details[index],
                        //       [field]: false,   // works for typeOfTravel, etc.
                        //     };
                        //   }

                        //   return copy;
                        // });

                        // 3️⃣ close picker
                        //   setCommonDropDownPickerVisibility(false);
                        // }}

                        selected={{
                          label: values.details[PickerTarget.index][
                            PickerTarget.field
                          ]?.name
                            ? String(
                              values.details[PickerTarget.index][
                                PickerTarget.field
                              ].name
                            )
                            : undefined,
                          value: values.details[PickerTarget.index][
                            PickerTarget.field
                          ]?.value
                            ? String(
                              values.details[PickerTarget.index][
                                PickerTarget.field
                              ].value
                            )
                            : undefined,
                        }}
                        // onSearch={handleSearchCommonDropDown}
                        isLoading={isLoadingCommonDropDown}
                        // onEndReached={handleLoadMoreCommonDropDown}
                        hasMoreData={false}
                        isFetchingMore={isLoadingCommonDropDown}
                      />
                    )}
                  </View>
                </ScrollView>
                <View style={styles.submitButtonContainer}>
                  <Animated.View style={{ opacity: opacityAnim }}>
                    {isMaker && (
                      <TouchableOpacity
                        style={[
                          styles.submitButtonFullWidth,
                          (isSubmitting || !isEditable) &&
                          styles.submitButtonDisabled,
                        ]}
                        onPress={formikSubmit}
                        disabled={isSubmitting || !isEditable}
                        accessibilityLabel={
                          isSubmitting
                            ? "Submitting request"
                            : "Update travel request"
                        }
                        accessibilityState={{
                          disabled: isSubmitting || !isEditable,
                        }}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color={CustomColors.textWhite} />
                        ) : (
                          <>
                            <Ionicons
                              name="send-outline"
                              size={moderateScale(24)}
                              color={CustomColors.textWhite}
                            />
                            <Text allowFontScaling={false} style={styles.submitButtonText}>
                              {" "}
                              {from ? "Update Request" : "Submit Request"}{" "}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                  {isChecker && ( // Show these buttons only if isChecker is true
                    <View style={styles.checkerButtonsContainer}>
                      {/* Approve Button */}
                      <TouchableOpacity
                        style={[
                          styles.checkerButton, // General style for checker buttons
                          styles.approveButton, // Specific style for Approve
                          isSubmitting ||
                          (!isAppoverEditable && styles.checkerButtonDisabled),
                        ]}
                        onPress={() => handleApprove(values)} // Define handleApprove function
                        disabled={isSubmitting || !isAppoverEditable}
                        accessibilityLabel={
                          isSubmitting
                            ? "Approving request"
                            : "Approve travel request"
                        }
                        accessibilityState={{
                          disabled: isSubmitting || !isAppoverEditable,
                        }}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color={CustomColors.textWhite} />
                        ) : (
                          <>
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={moderateScale(20)} // Slightly smaller icon for better fit
                              color={CustomColors.textWhite}
                            />
                            <Text allowFontScaling={false} style={styles.checkerButtonText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Reject Button */}
                      <TouchableOpacity
                        style={[
                          styles.checkerButton,
                          styles.rejectButton, // Specific style for Reject
                          isSubmitting ||
                          (!isAppoverEditable && styles.checkerButtonDisabled),
                        ]}
                        onPress={() => handleReject(values)} // Define handleReject function
                        disabled={isSubmitting || !isAppoverEditable}
                        accessibilityLabel={
                          isSubmitting
                            ? "Rejecting request"
                            : "Reject travel request"
                        }
                        accessibilityState={{
                          disabled: isSubmitting || !isAppoverEditable,
                        }}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color={CustomColors.textWhite} />
                        ) : (
                          <>
                            <Ionicons
                              name="close-circle-outline" // Icon for reject
                              size={moderateScale(20)} // Slightly smaller icon for better fit
                              color={CustomColors.textWhite}
                            />
                            <Text allowFontScaling={false} style={styles.checkerButtonText}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Return Button */}
                      {tourData?.tour_cancel_status_id === -1 && (
                        <TouchableOpacity
                          style={[
                            styles.checkerButton,
                            styles.returnButton, // Specific style for Return
                            (isSubmitting || !isAppoverEditable) &&
                            styles.checkerButtonDisabled,
                          ]}
                          onPress={() => handleReturn(values)} // Define handleReturn function
                          disabled={isSubmitting || !isAppoverEditable} // Also disable if not editable
                          accessibilityLabel={
                            isSubmitting
                              ? "Returning request"
                              : "Return travel request"
                          }
                          accessibilityState={{
                            disabled: isSubmitting || !isAppoverEditable,
                          }}
                        >
                          {isSubmitting ? (
                            <ActivityIndicator color={CustomColors.textWhite} />
                          ) : (
                            <>
                              <Ionicons
                                name="arrow-undo-outline"
                                size={moderateScale(20)}
                                color={CustomColors.textWhite}
                              />
                              <Text allowFontScaling={false} style={styles.checkerButtonText}>Return</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {/* Forward Button */}
                      {/* <TouchableOpacity
                    style={[
                      styles.checkerButton,
                      styles.forwardButton, // Specific style for Forward
                      isSubmitting ||
                        (!isAppoverEditable && styles.checkerButtonDisabled),
                    ]}
                    onPress={() => {
                      setIsForword(true);
                    }}
                    disabled={isSubmitting || !isAppoverEditable}
                    accessibilityLabel={
                      isSubmitting
                        ? "Forwarding request"
                        : "Forward travel request"
                    }
                    accessibilityState={{
                      disabled: isSubmitting || !isAppoverEditable,
                    }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={CustomColors.textWhite} />
                    ) : (
                      <>
                        <Ionicons
                          name="arrow-redo-outline" // Icon for forward
                          size={moderateScale(20)} // Slightly smaller icon for better fit
                          color={CustomColors.textWhite}
                        />
                        <Text style={styles.checkerButtonText}>Forward</Text>
                      </>
                    )}
                  </TouchableOpacity> */}
                    </View>
                  )}

                  {isCancelMaker && (
                    <TouchableOpacity
                      style={[
                        styles.submitButtonFullWidth,
                        (isSubmitting || isCancelMakerDisabled) &&
                        styles.submitButtonDisabled,
                      ]}
                      onPress={() => {
                        handleCancel(values);
                      }}
                      disabled={isSubmitting || isCancelMakerDisabled}
                      accessibilityLabel={
                        isSubmitting
                          ? "Forwarding request"
                          : "Forward travel request"
                      }
                      accessibilityState={{
                        disabled: isSubmitting || isCancelMakerDisabled,
                      }}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={CustomColors.textWhite} />
                      ) : (
                        <>
                          <Ionicons
                            name="arrow-redo-outline" // Icon for forward
                            size={moderateScale(20)} // Slightly smaller icon for better fit
                            color={CustomColors.textWhite}
                          />
                          <Text allowFontScaling={false} style={styles.submitButtonText}>
                            {"Submit Cancel Request"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <SelfOrOnBehalfModal
                    visible={onBehalModel}
                    onClose={() => setOnBehalModel(false)}
                  />
                  <RequirementDetailModal
                    visible={isModalVisible}
                    onClose={handleCloseModal}
                    requirement={values?.details?.[selectedIndex?.detailIndex]?.requirement?.[selectedIndex?.requirementIndex]}
                    isEditable={isEditable}
                    onSave={(updatedRequirement, detailIndex, requirementIndex) => {
                      const path = `details[${detailIndex}].requirement[${requirementIndex}]`;
                      setFieldValue(path, updatedRequirement);
                    }}
                    openCommonDropDownPicker={openCommonDropDownPicker}
                    index={selectedIndex}
                    setFieldValue={setFieldValue}
                    minDate={values?.details?.[selectedIndex?.detailIndex]?.detailStartDate ? new Date(values.details[selectedIndex.detailIndex].detailStartDate) : undefined}
                    maxDate={values?.details?.[selectedIndex?.detailIndex]?.detailEndDate ? new Date(values.details[selectedIndex.detailIndex].detailEndDate) : undefined}
                    isAdmin={from === "ADMIN"}
                    navigation={navigation}
                  />
                </View>
              </>
            )
          }}
        </Formik>
      </SafeAreaView>
      {/* </ScrollView> */}
      {/* Floating Chat Icon */}
      {/* {(tour_id || tourDataParams?.tourid) && (
        <TouchableOpacity
          style={styles.floatingChatButton}
          onPress={() => {

            const idToPass = tour_id || tourDataParams?.tourid;

            navigation.navigate("chat", {
              tourid: idToPass,
              fromScreen: from || "CREATE"
            });
          }}
          accessibilityLabel="Open Chat"
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={moderateScale(28)}
            color={CustomColors.textWhite}
          />
        </TouchableOpacity>)} */}
      {/* Floating Chat Icon */}

      {(tour_id || tourDataParams?.tourid) && (
        <TouchableOpacity
          style={styles.floatingChatButton}
          onPress={() => {
            const idToPass = tour_id || tourDataParams?.tourid;
            navigation.navigate("chat", {
              tourid: idToPass,
              fromScreen: from || "CREATE",
            });
          }}
          accessibilityLabel="Open Chat"
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={moderateScale(28)}
            color={CustomColors.textWhite}
          />

          {/* 🔴 Unread badge */}
          {/* {unreadCount > 0 && (
            <View style={styles.chatBadge}>
              <Text allowFontScaling={false}style={styles.chatBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )} */}
        </TouchableOpacity>
      )}


      <Modal
        animationType="slide"
        transparent={true}
        visible={isApprovalModalVisible}
        onRequestClose={() => setIsApprovalModalVisible(false)}
      >
        <View style={modalstyles.modalOverlay}>
          <View style={modalstyles.modalContent}>
            <TouchableOpacity onPress={() => setIsApprovalModalVisible(false)} style={modalstyles.modalHeaderIcon}>
              <MaterialIcons name="close" size={24} color={CustomColors.textRed} />
            </TouchableOpacity>
            <Text allowFontScaling={false} style={modalstyles.modalTitle}>Approval Flow</Text>

            {isApprovalFlowLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator style={{ padding: 10 }} />
                <Text allowFontScaling={false}style={styles.loadingText}> Please wait...</Text>

              </View>


            ) : approvalFlow?.approve && approvalFlow.approve.length > 0 ? (
              <ScrollView style={styles.approvalListContainer}>
                {approvalFlow.approve.map((step, index) => {
                  const getAppLevelRole = (level) => {
                    switch (level) {
                      case 0: return "MAKER";
                      case 1: return "RM";
                      case 2: return "FH";
                      case 3: return "ADMIN";
                      case 4: return "REG ZON MAG (FA)";
                      default: return "";
                    }
                  };

                  const getStatusLabel = (status) => {
                    switch (status) {
                      case 1: return "REQUESTED";
                      case 2: return "PENDING";
                      case 3: return "APPROVED";
                      case 4: return "REJECTED";
                      case 5: return "RETURNED";
                      default: return "UNKNOWN";
                    }
                  };

                  const role = getAppLevelRole(step.applevel);
                  const statusLabel = getStatusLabel(step.status);
                  const fullAppType = step.apptype || "N/A";

                  // Removed the skipping logic as per your request

                  // Display status logic: apptype + status for Maker (applevel 0),
                  // and apptype + status + BY role for others.
                  let displayStatus = `${fullAppType} ${statusLabel}`;
                  if (step.applevel !== undefined && step.applevel !== 0 && role) {
                    displayStatus += ` BY ${role}`;
                  }

                  return (
                    <View key={step.id?.toString() || index.toString()} style={modalstyles.approvalStepCard}>

                      <View style={[
                        modalstyles.statusBadge,
                        step.status === 3 ? modalstyles.statusApproved :
                          step.status === 5 ? modalstyles.statusReturned :
                            modalstyles.statusDefault
                      ]}>
                        <Text allowFontScaling={false} style={modalstyles.statusBadgeText}>{displayStatus}</Text>
                      </View>

                      <View style={modalstyles.cardDetailRow}>
                        <Text allowFontScaling={false} style={modalstyles.cardLabel}>Date:</Text>
                        <Text allowFontScaling={false} style={modalstyles.cardValue}>{step.approveddate || 'N/A'}</Text>
                      </View>
                      <View style={modalstyles.cardDetailRow}>
                        <Text allowFontScaling={false} style={modalstyles.cardLabel}>Type:</Text>
                        <Text allowFontScaling={false} style={modalstyles.cardValue}>{step.apptype || 'N/A'}</Text>
                      </View>
                      <View style={modalstyles.cardDetailRow}>
                        <Text allowFontScaling={false} style={modalstyles.cardLabel}>Approved By:</Text>
                        <Text allowFontScaling={false} style={modalstyles.cardValue}>{step.approvedby || 'N/A'}</Text>
                      </View>
                      <View style={modalstyles.cardDetailRow}>
                        <Text allowFontScaling={false} style={modalstyles.cardLabel}>Raised By:</Text>
                        <Text allowFontScaling={false} style={modalstyles.cardValue}>{step.onbehalfof?.full_name || 'N/A'}</Text>
                      </View>
                      <View style={modalstyles.cardDetailRow}>
                        <Text allowFontScaling={false} style={modalstyles.cardLabel}>Comment:</Text>
                        <Text allowFontScaling={false} style={modalstyles.cardValue}>{step.comment || 'N/A'}</Text>
                      </View>

                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text allowFontScaling={false} style={modalstyles.noDataText}>No approval flow details available.</Text>
            )}

          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>

  );
};
export default TravelMakerCreateScreen;