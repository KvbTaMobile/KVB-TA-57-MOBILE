// screens/ExpenseDetailScreen.js
import React, { useEffect, useState, useCallback, useMemo, useRef, } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  PermissionsAndroid,
  Linking,
  Platform,
} from 'react-native';
import { Environment } from "../../environment/Environment";
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  useLazyGetExpenseDetailsQuery, useLazyGetExpenseListQuery, useLazyGetApprovalFlowQuery, useLazyDocumentGetQuery, useDocumentInsertMutation, useDeleteDocumentMutation, useExpenseDeleteMutation,
  useTourApproveMutation, useLazyGetCCBSQuery,
  useTourRejectMutation,
  useTourReturnMutation,
  useTourForwardMutation,
  useExpenseSubmitMutation,
  useLazyGetBusinessSegmentsQuery, useLazyGetCcSegmentsQuery,
  useLazyApproverListQuery,

} from '../../redux/rtk_query/apiSlice';
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';
// import { setBusinessList, setCostCenterList } from '../../data/redux/slices/ExpenseSlice';

// Import custom styles
import { getCustomColors } from '../../styles/CustomColors';
import { moderateScale, verticalScale, horizontalScale } from '../../styles/Metrics';
import { Fonts } from '../../styles/Fonts';
import {
  setExpenseDetails,
  setExpenseList,
  setApprovalFlow,
  setDocuments,
  removeExpenseItem,
  setCcbsSplits, setCostCenterList, setBusinessList, removeCcbsSplit,
  clearCcbsSplits, setIsApprovalFlowLoading
  //  setSubmittedSplits, addSubmittedSplit, clearSubmittedSplits
} from '../../redux/slices/ExpenseSlice';
import * as  create_styles from "../../styles/StyleSheet"; // Using create_styles for card themes
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from "react-redux";
// import BusinessSegmentPicker from '../travel/BusinessSegmentPicker';
// import CcPicker from '../travel/CcPicker';
import {
  Ionicons,
  MaterialIcons,
  Entypo,
  FontAwesome5,
} from '@expo/vector-icons';
import ToastMessage from "../../TaComponents/toast/ToastMessage";
// import * as DocumentPicker from 'expo-document-picker';
import FileDisplaySection from "../../TaComponents/cards/FileDisplaySection"; // Assuming this is your component
import * as WebBrowser from "expo-web-browser";
import * as IntentLauncher from "expo-intent-launcher";
import * as FileSystem from "expo-file-system/legacy"
// import * as ImagePicker from 'expo-image-picker'; // Uncomment if using expo-image-picker
// import ImagePicker from 'react-native-image-picker'; // Uncomment if using react-native-image-picker
import { uploadMultipart } from '../../utilities/upload';
import { pickDocuments } from '../../utilities/filePicker';
import { EXPENSE_IDS, SCREEN_NAMES } from '../../utilities/expenseType';

const ExpenseDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyle = create_styles.create_styles(isDark);
  const authToken = useSelector((s) => s.auth.user?.token);
  const csrfToken = useSelector((s) => s.auth.csrfToken);
  const csrfCookie = useSelector((s) => s.auth.csrfCookie);
  const { expense, from } = route.params || {};
const [filesByExpense, setFilesByExpense] = useState({}); 
  const authRedux = useSelector((state) => state.auth);
  // const { expense } = route.params;
  const tourNo = expense?.tourid || expense?.id; // This is the main tour ID
  // const { claimdata } = route.params || {};
  // //console.log("claimdata==========> ", expense)
  const dispatch = useDispatch();

  // const { expenseDetails, expenseList, approvalFlow, documents } = useSelector(state => state.expense);


  const expenseIdToScreenMap = {
    [EXPENSE_IDS.TRAVELLING_EXPENSE]: SCREEN_NAMES.TRAVELLING_EXPENSES,
    [EXPENSE_IDS.DAILY_REIMBURSEMENT]: SCREEN_NAMES.DAILY_REIMBURSEMENT,
    [EXPENSE_IDS.INCIDENTAL_EXPENSE]: SCREEN_NAMES.INCIDENTAL_EXPENSE,
    [EXPENSE_IDS.LOCAL_CONVEYANCE]: SCREEN_NAMES.LOCAL_CONVEYANCE,
    [EXPENSE_IDS.LODGING]: SCREEN_NAMES.LODGING,
    [EXPENSE_IDS.MISC_EXPENSE]: SCREEN_NAMES.MISC_EXPENSE,
    [EXPENSE_IDS.PACKAGING_FREIGHT]: SCREEN_NAMES.PACKAGING_FREIGHT,
    [EXPENSE_IDS.Local_Deputation_Allowance]: SCREEN_NAMES.Local_Deputation_Allowance,
    [EXPENSE_IDS.ASSOCIATED_EXPENSE]: SCREEN_NAMES.ASSOCIATED_EXPENSE,

  };




  const [refreshing, setRefreshing] = useState(false);
  const [isAddExpenseModalVisible, setIsAddExpenseModalVisible] = useState(false);
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [selectedExpenseType, setSelectedExpenseType] = useState(null);
  const [newComments, setNewComments] = useState('');
  const [newClaimedAmount, setNewClaimedAmount] = useState('');
  // const [files, setFiles] = useState([]); // State for newly picked local files
  //  const [documentData, setDocumentData] = useState({ data: [], tour_approver: [] });
  const [fetchError, setFetchError] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  // const [submittedSplitsByExpense, setSubmittedSplitsByExpense] = useState({});

  // These states control *internal logic* and UI elements *other than* the add icon
  const [canAddItems, setCanAddItems] = useState(false);
  const [canEditDeleteItems, setCanEditDeleteItems] = useState(false);
  const [isEditable, setIsEditable] = useState(true); // Maker is editable by default until status dictates otherwise

  const [expenseItems, setExpenseItems] = useState([]);
  const [claimStatusId, setClaimStatusId] = useState(null);
  const [isAppoverEditable, setIsAppoverEditable] = useState(false); // Approver editability

  const [selectedExpenseTypeName, setSelectedExpenseTypeName] = useState('');
  const [expenseTypePickerVisible, setExpenseTypePickerVisible] = useState(false);

  const [tempLocalFiles, setTempLocalFiles] = useState([]);
  const [getExpenseId, setGetExpenseId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isBsPickerVisible, setBsPickerVisible] = useState(false);
  const [BsPage, setBsPage] = useState(0);
  const [hasMoreBs, sethasMoreBs] = useState(true);
  const [currentBsSearchQuery, setcurrentBsSearchQuery] = useState("");
  const [isCcPickerVisible, setCcPickerVisible] = useState(false);
  const [isRemarksModalVisible, setIsRemarksModalVisible] = useState(false);
  const [expremarks, setexpRemarks] = useState('');
  const [availableExpenseList, setAvailableExpenseList] = useState([]);
  const [triggerApproverList, { isFetching: isApproverLoading }] = useLazyApproverListQuery();
  const [approverList, setApproverList] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [isApproverPickerVisible, setIsApproverPickerVisible] = useState(false);
  const [CcPage, setCcPage] = useState(0);
  const [hasMoreCc, sethasMoreCc] = useState(true);
  const [currentCcSearchQuery, setcurrentCcSearchQuery] = useState("");
  const [triggerGetDetails] = useLazyGetExpenseDetailsQuery();

  const [triggerApprovalFlow] = useLazyGetApprovalFlowQuery();
  const submittedSplitsByExpense = useSelector(state => state.expense.submittedSplits);
  // //console.log("AAAAAAAAA ",submittedSplitsByExpense)
  const [triggerGetDocuments, { data: documentData, isFetching: isDocFetching, error: docError }] =
    useLazyDocumentGetQuery();
  const [triggerGetExpenseList] = useLazyGetExpenseListQuery();
  const [deleteExpense] = useExpenseDeleteMutation();
  const {
    approvalFlow,
    isApprovalFlowLoading,
    approvalFlowError,
    documents,
  } = useSelector(state => state.expense);
  const expenseDetails = useSelector(state => state.expense.expenseDetails);
  const expenseList = useSelector((state) => state.expense.expenseList);
  const ccbsSplits = useSelector(state => state.expense.ccbsSplits);
  const businessList = useSelector((state) => state.expense.businessList);
  const costCenterList = useSelector((state) => state.expense.costCenterList);
  // //console.log('businessList',businessList,'costCenterList',costCenterList)
  const getBusinessName = (id) => {//console.log('BS_IDDDDD', id) 
    return businessList?.find(b => b.id === id)?.name || '-';
  }
  const getCostCenterName = (id) => costCenterList?.find(cc => cc.id === id)?.name || '-';

  // //console.log(ccbsSplits)
  const [remarkModalVisible, setRemarkModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [remarks, setRemarks] = useState('');
  const claimedAmount = expenseDetails?.claimed_amount || 0;

  const [selectedExpenseIdForSplits, setSelectedExpenseIdForSplits] = useState(null);


  const debounceTimeout = useRef(null);
  const [currentSplit, setCurrentSplit] = useState({
    business: null,
    cc: null,
    percentage: '',
    amount: '',
  });
  const [triggerbs, {
    data: bsData,
    isLoading: isLoadingBS,
    isFetching: isFetchingBS
  }] = useLazyGetBusinessSegmentsQuery();

  const [triggercc, {
    data: ccData,
    isLoading: isLoadingCC,
    isFetching: isFetchingCC
  }] = useLazyGetCcSegmentsQuery();
  //useExpenseSubmitMutation
  const [
    triggerExpenseSubmit,
    {
      isLoading: isLoadingExpSubmit,
      data: ExpSubmitData, // Not used in current submit, but good to have if API returns data
      // isFetching: isFetchingTourSubmit, // Also not used
    },
  ] = useExpenseSubmitMutation();
  const [
    triggerTourApprove,
    {
      isLoading: isLoadingTourApprove,
      isFetching: isFetchingTourApprove,
      data: TourApproveData,
    },
  ] = useTourApproveMutation();
  const [triggerGetCCBSQuery, { data: ccbs, isLoading, errorccbs }] = useLazyGetCCBSQuery();
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
  const styles = StyleSheet.create({
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
  const modalStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: CustomColors.overlayBlack,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: '92%',
      backgroundColor: CustomColors.backgroundGray2,
      borderRadius: 12,
      paddingVertical: 25,
      paddingHorizontal: 20,
      position: 'relative',
      elevation: 8,
      maxHeight: '90%',
    },
    closeIcon: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 20,
      textAlign: 'center',
      color: CustomColors.textDarkGray,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 12,
      color: CustomColors.textDarkGray,
    },
    input: {
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 6,
      fontSize: 14,
      color: CustomColors.textBlack,
    },
    inputError: {
      borderColor: 'red',
    },
    amountLabel: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: '500',
      color: CustomColors.textBlue,
    },
    errorText: {
      color: CustomColors.textRed,
      marginTop: 6,
      fontSize: 13,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 25,
    },
    cancelButton: {
      backgroundColor: CustomColors.textGray,
      marginTop: verticalScale(20),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      borderRadius: moderateScale(10),
    },
    confirmButton: {
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      // flex: 1,
    },
    buttonText: {
      color: CustomColors.textWhite,
      fontWeight: '600',
      fontSize: 15,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: CustomColors.backgroundBlack,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: 12,
      padding: 20,
      elevation: 6,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 12,
      color: CustomColors.textBlack,
    },
    modalSubtitle: {
      fontSize: 14,
      color: CustomColors.textDarkGray,
      marginBottom: 10,
    },
    singleLineInput: {
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 14,
      color: CustomColors.textDark,
      backgroundColor: CustomColors.backgroundGray,
    },
    modalButtonGroup: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 20,
    },
    modalButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginLeft: 10,
    },



    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    processingText: {
      color: CustomColors.textWhite,
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
    },
    addButtonContainer: {
      alignItems: 'flex-end',
      marginVertical: 10,
    },
    addButton: {
      backgroundColor: CustomColors.appThemeColor, // or use CustomColors.primaryBlue
      padding: 12,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4, // for Android shadow
      shadowColor: CustomColors.textBlack, // iOS shadow
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      width: 48,
      height: 48,
    },
    disabledButton: {
      backgroundColor: CustomColors.textGray,
      shadowOpacity: 0,
      elevation: 0,
    },

    subTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
      color: CustomColors.textGray,
    },
    card: {
      backgroundColor: CustomColors.backgroundWhite,
      padding: 12,
      borderRadius: 8,
      marginBottom: 10,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    cardText: {
      fontSize: 14,
      color: CustomColors.textGray,
      marginBottom: 2,
    },
    confirmButtonText: {
      color: CustomColors.textDarkGray,
      fontWeight: '600',
      justifyContent: 'center'
    },
    confirmButton: {
      marginTop: verticalScale(20),
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      borderRadius: moderateScale(10),
    },
    cancelButtonText: {
      color: CustomColors.textGray,
      fontWeight: '600',
    },
    ccbsCardSection: {
      marginTop: 10,
      padding: 10,
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: 8,
    },
    ccbsSectionTitle: {
      fontWeight: 'bold',
      marginBottom: 8,
      color: CustomColors.appThemeColor,
    },
    ccbsCard: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: 6,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: CustomColors.textGray,
    },
    ccbsCardText: {
      fontSize: 13,
      color: CustomColors.textDark,
    },
    skeletonCard: {
      backgroundColor: '#F2F2F2',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    skeletonBadge: {
      height: 22,
      width: '70%',
      backgroundColor: '#E0E0E0',
      borderRadius: 6,
      marginBottom: 10,
    },
    skeletonRow: {
      height: 14,
      width: '100%',
      backgroundColor: '#E0E0E0',
      borderRadius: 4,
      marginBottom: 8,
    },
    skeletonRowShort: {
      height: 14,
      width: '60%',
      backgroundColor: '#E0E0E0',
      borderRadius: 4,
    },

  });
  // --- Header Right Component (Add Button) ---
  const HeaderRight = useCallback(
    () => (
      <>
        <View style={styles.headerRightContainer}>
          {from !== 'Checker' && (
            <TouchableOpacity
              onPress={() => setIsAddExpenseModalVisible(true)}
              style={styles.addIconContainer}
              disabled={!canAddItems}
            >
              <Ionicons name="add-circle" size={moderateScale(25)} color={canAddItems ? CustomColors.white : CustomColors.backgroundtransparent} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerRightContainer}>
          <TouchableOpacity
            onPress={async () => {
              setIsApprovalModalVisible(true);
              dispatch(setApprovalFlow(null));
              dispatch(setIsApprovalFlowLoading(true));

              try {
                const res = await triggerApprovalFlow(tourNo).unwrap();
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

      </>
    ),
    [canAddItems,
      from,
      tourNo,
      dispatch,
      triggerApprovalFlow,
      setIsApprovalModalVisible, navigation, isDark]
  );

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerShown: true,

        headerStyle: {
          backgroundColor: CustomColors.appThemeColor,
        },

        headerTitle: () => (
          <Text
            allowFontScaling={false}
            style={{
              ...globalStyle.headerTitle,
              fontSize: moderateScale(20),
              fontWeight: "600",
              color: CustomColors.white,
            }}
          >
            Expense Details
          </Text>
        ),

        headerTintColor: CustomColors.white,
        headerRight: HeaderRight,
      });
    }, [navigation, HeaderRight, isDark])
  );
useFocusEffect(
  useCallback(() => {
    if (!tourNo) {
      return;
    }
    setLoading(true);
    setIsAppoverEditable(expense?.claim_status_id === 2);
    triggerGetDetails(tourNo)
      .unwrap()
      .then((data) => {
        dispatch(setExpenseDetails(data));
        setFetchError(null);
      })
      .catch((err) => {
        setFetchError(err);
      })
      .finally(() => setLoading(false));
  }, [tourNo, triggerGetDetails, dispatch, expense?.claim_status_id])
);

  useEffect(() => {
    return () => {
      dispatch(clearCcbsSplits());
    };
  }, []);

  // Fetch approval flow and approvers on mount
  useEffect(() => {
    if (tourNo) {
      triggerApprovalFlow(tourNo)
        .unwrap()
        .then((res) => {
          if (res?.data || res) {
            dispatch(setApprovalFlow(res?.data || res));
          }
        })
        .catch(() => {});
    }
  }, [tourNo, triggerApprovalFlow, dispatch]);

  // Auto-resolve Approver from approvalFlow, expense, or expenseDetails
  useEffect(() => {
    if (selectedApprover?.id) return;

    const flowStep =
      approvalFlow?.approve?.find((s) => s.status === 2 && s.approver_id) ||
      approvalFlow?.approve?.find((s) => s.applevel === 1 && s.approver_id) ||
      approvalFlow?.approve?.find((s) => s.approver_id) ||
      approvalFlow?.approve?.[0];

    const approverId =
      flowStep?.approver_id ||
      flowStep?.approvedby_id ||
      expense?.approver_id ||
      expense?.approvedby_id ||
      expense?.approval_id ||
      (typeof expense?.approval === 'object'
        ? expense?.approval?.id
        : typeof expense?.approval === 'number'
        ? expense?.approval
        : null) ||
      expenseDetails?.approver_data?.id ||
      expenseDetails?.approver_id ||
      expenseDetails?.approvedby_id;

    const approverName =
      flowStep?.approvedby ||
      expense?.approvedby ||
      expenseDetails?.approver_data?.name ||
      expenseDetails?.approvedby ||
      '';

    const approverCode =
      flowStep?.approver_code ||
      expense?.approver_code ||
      expenseDetails?.approver_data?.code ||
      '';

    if (approverId) {
      setSelectedApprover({
        id: Number(approverId),
        name: approverName,
        code: approverCode,
        fullLabel: approverCode
          ? `(${approverCode}) ${approverName}`
          : approverName || `Approver #${approverId}`,
      });
    }
  }, [approvalFlow, expense, expenseDetails, selectedApprover?.id]);

  useEffect(() => {
    const fetchExpenseList = async () => {
      try {
        const response = await triggerGetExpenseList().unwrap();
        console.log("response expenseList", response)
        dispatch(setExpenseList(response.data));

      } catch (err) {
        // console.error("Failed to fetch expense list", err);
      }
    };

    fetchExpenseList();
  }, []);

  useEffect(() => {
    const fetchccbs = async () => {
      try {
        const response = await triggerGetCCBSQuery({ type: 2, tour: tourNo, tour_id: tourNo }).unwrap();
        if (Array.isArray(response)) {
          dispatch(setCcbsSplits(response));

          const newList = response.map(item => ({
            business: {
              id: item.bs_data?.id || null,
              name: item.bs_data?.name || '',
            },
            cc: {
              id: item.cc_data?.id || null,
              name: item.cc_data?.name || '',
            },
            percentage: item.percentage?.toString() || '',
            amount: item.amount?.toString() || '',
          }));

          setSplitsList(newList);
        }
      } catch (err) {
        console.log('CCBS data not available or error:', err);
      }
    };

    if (tourNo) {
      fetchccbs();
    }
  }, [triggerGetCCBSQuery, dispatch, tourNo]);

  useEffect(() => {
    if (expenseDetails) {
      if (Array.isArray(expenseDetails.data)) {
        const mappedItems = expenseDetails.data.map(item => ({
          ...item,
          expenseTypeName: item.expensename,
          documents: item.documents || [],
        }));
        setExpenseItems(mappedItems);
      } else {
        setExpenseItems([]);
      }

      const currentStatusId = expense?.claim_status_id || '';
      setClaimStatusId(currentStatusId);

      const STATUS_IDS = [-1, 1, 5];
      const shouldEnableActions = STATUS_IDS.includes(currentStatusId);
      console.log('shouldEnableActions', shouldEnableActions)
      const firstItem = expenseDetails.data[0];
      setGetExpenseId(firstItem?.expenseid ? expenseDetails.data : null);
      console.log('isEditable', isEditable)
      setCanAddItems(shouldEnableActions);
      setCanEditDeleteItems(shouldEnableActions);
      setIsEditable(shouldEnableActions);

    }
    setRefreshing(false);
  }, [expenseDetails, expense?.claim_status_id, isEditable, canEditDeleteItems, canAddItems]);


  useEffect(() => {
    if (bsData) {
      if (bsData.data && bsData.data.length > 0) {
        if (BsPage === 1) {
          dispatch(setBusinessList(bsData.data));
        } else {
          dispatch(setBusinessList([...businessList, ...bsData.data]));
        }
        sethasMoreBs(true);
      } else {
        sethasMoreBs(false);
      }
    }
  }, [bsData, dispatch]);
  useEffect(() => {
    if (ccData) {
      if (ccData.data && ccData.data.length > 0) {
        dispatch(setCostCenterList(ccData.data));
      }
    }
  }, [ccData, dispatch]);
  // useEffect(() => {
  //   if (bsData?.data) dispatch(setBusinessList(bsData.data));
  // }, [bsData]);

  // useEffect(() => {
  //   if (ccData?.data) dispatch(setCostCenterList(ccData.data));
  // }, [ccData]);

  // //console.log("newClaimedAmount",expenseDetails?.claimed_amount || 0)
  const onChangePercentage = (val) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const valid = cleaned.split('.').length > 2
      ? cleaned.substring(0, cleaned.lastIndexOf('.'))
      : cleaned;

    const percent = parseFloat(valid);
    const claimed = parseFloat(claimedAmount || 0);

    let updatedSplit;

    if (!isNaN(percent) && claimed > 0) {
      const calcAmount = (claimed * percent) / 100;
      updatedSplit = {
        ...currentSplit,
        percentage: valid,
        amount: calcAmount.toFixed(2),
      };
    } else {
      updatedSplit = { ...currentSplit, percentage: valid, amount: '' };
    }

    setCurrentSplit(updatedSplit);
    validateTotal(updatedSplit, splitsList, selectedIndex); // <- important
  };
  //BS
  const handleSearchBs = useCallback(
    (query) => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        setcurrentBsSearchQuery(query);
        setBsPage(1);
        sethasMoreBs(true);
        triggerbs({ query: query, page: 1 }).then((res) => {
          if (res?.data?.data) {
            dispatch(setBusinessList(res.data.data));
            sethasMoreBs(res.data.pagination?.has_next ?? false);
          }
        });
      }, 400);
    },
    [triggerbs, dispatch]
  );
  const handleLoadMoreBs = () => {
    if (isFetchingBS || !hasMoreBs) {
      return;
    }
    const nextPage = BsPage + 1;
    setBsPage(nextPage);
    triggerbs({ query: currentBsSearchQuery, page: nextPage }).then((res) => {
      if (res?.data?.data && res.data.data.length > 0) {
        dispatch(setBusinessList([...(businessList || []), ...res.data.data]));
        sethasMoreBs(res.data.pagination?.has_next ?? false);
      } else {
        sethasMoreBs(false);
      }
    });
  };
  const openBsPicker = () => {
    setBsPickerVisible(true);
    if (!businessList || businessList.length === 0 || currentBsSearchQuery !== "") {
      setcurrentBsSearchQuery("");
      setBsPage(1);
      sethasMoreBs(true);
      triggerbs({ query: "", page: 1 }).then((res) => {
        if (res?.data?.data) {
          dispatch(setBusinessList(res.data.data));
          sethasMoreBs(res.data.pagination?.has_next ?? false);
        }
      });
    }
  };
  //CC
  const handleSearchCc = useCallback(
    (query) => {
      const bsId = currentSplit?.business?.id || currentSplit?.business?.value;
      if (!bsId) {
        ToastMessage("Please Select Business Segement First.");
        return;
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        setcurrentCcSearchQuery(query);
        triggercc({ query: query, bs_id: bsId }).then((res) => {
          if (res?.data?.data) {
            dispatch(setCostCenterList(res.data.data));
          }
        });
      }, 400);
    },
    [triggercc, dispatch, currentSplit?.business]
  );
  const openCcPicker = () => {
    const bsId = currentSplit?.business?.id || currentSplit?.business?.value;
    if (!bsId) {
      ToastMessage("Please Select Business Segement First.");
      return;
    }
    setCcPickerVisible(true);
    if (!costCenterList || costCenterList.length === 0 || currentCcSearchQuery !== "") {
      setcurrentCcSearchQuery("");
      triggercc({ query: "", bs_id: bsId }).then((res) => {
        if (res?.data?.data) {
          dispatch(setCostCenterList(res.data.data));
        }
      });
    }
  };
  const onChangeAmount = (val) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const valid = cleaned.split('.').length > 2
      ? cleaned.substring(0, cleaned.lastIndexOf('.'))
      : cleaned;

    const amount = parseFloat(valid);
    const claimed = parseFloat(claimedAmount || 0);

    let updatedSplit;

    if (!isNaN(amount) && claimed > 0) {
      const calcPercent = (amount / claimed) * 100;
      updatedSplit = {
        ...currentSplit,
        amount: valid,
        percentage: calcPercent.toFixed(2),
      };
    } else {
      updatedSplit = { ...currentSplit, amount: valid, percentage: '' };
    }

    setCurrentSplit(updatedSplit);
    validateTotal(updatedSplit, splitsList, selectedIndex); // <- important
  };
  // //console.log(setCcbsSplits)
  const handleCcbsSubmit = () => {
    const tourgid = tourNo; // dynamically fetched from state/props
    const allSplits = splitsList.map(split => ({
      bs_data: split.business,
      cc_data: split.cc,
      amount: parseFloat(split.amount),
      percentage: parseFloat(split.percentage),
      tourgid,
    }));

    // ✅ Save to Redux in backend format
    dispatch(setCcbsSplits(allSplits));


    setModalVisible(false);
    setSelectedIndex(null);
    setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
  };
  const openSubmitModal = async () => {
    setIsRemarksModalVisible(true);
    const branchId =
      expense?.branch_id ||
      expense?.empbranchgid ||
      expenseDetails?.branch_id ||
      authRedux?.user?.employee_branch_id ||
      authRedux?.user?.branch_id ||
      authRedux?.user?.branch;

    if (branchId && (!approverList || approverList.length === 0)) {
      try {
        const res = await triggerApproverList({ branch: branchId, page: 1, type: "tour" }).unwrap();
        if (Array.isArray(res?.data)) {
          setApproverList(
            res.data.map((emp) => ({
              label: `(${emp.code}) ${emp.full_name || emp.name} - ${emp.employee_designation || ""}`,
              value: emp.id,
              raw: emp,
            }))
          );
        }
      } catch (e) {
        // console.warn("Failed to load approver list:", e);
      }
    }
  };

  const handleExpSubmit = async () => {
    if (!expremarks.trim()) {
      ToastMessage('Please enter remarks before submitting.');
      return;
    }

    if (!tourNo || !splitsList.length) {
      ToastMessage('Tour number or CCBS splits missing.');
      return;
    }

    const finalApproverId =
      selectedApprover?.id ||
      expense?.approver_id ||
      expense?.approvedby_id ||
      expense?.approval_id ||
      (typeof expense?.approval === 'object'
        ? expense?.approval?.id
        : typeof expense?.approval === 'number'
        ? expense?.approval
        : null) ||
      approvalFlow?.approve?.find((s) => s.status === 2 && s.approver_id)?.approver_id ||
      approvalFlow?.approve?.find((s) => s.applevel === 1 && s.approver_id)?.approver_id ||
      approvalFlow?.approve?.find((s) => s.approver_id)?.approver_id ||
      approvalFlow?.approve?.[0]?.approver_id ||
      approvalFlow?.approve?.[0]?.id ||
      expenseDetails?.approver_data?.id ||
      expenseDetails?.approver_id;

    if (!finalApproverId) {
      ToastMessage('Please select an Approver before submitting.');
      return;
    }

    const allSplits = splitsList.map((split) => ({
      bsid: typeof split.business === 'object' ? split.business.id : split.business,
      ccid: typeof split.cc === 'object' ? split.cc.id : split.cc,
      amount: parseFloat(split.amount) || 0,
      percentage: parseFloat(split.percentage) || 0,
      tourgid: tourNo,
    }));

    const submitPayload = {
      tourgid: Number(tourNo),
      appcomment: expremarks.trim(),
      ccbs: allSplits,
      approveby: Number(finalApproverId),
      approvedby: Number(finalApproverId),
      approval: Number(finalApproverId),
    };

    console.log("Submitting Expense Payload:", JSON.stringify(submitPayload));

    setIsSubmitting(true);
    try {
      const res = await uploadMultipart({
        url: `${Environment.taServiceUrl}/taserv/expense/submit`,
        data: submitPayload,
        headers: {
          Authorization: `Token ${authToken}`,
          ...(csrfToken && { 'X-CSRFToken': csrfToken }),
          ...(csrfCookie && { 'X-CSRFCookie': csrfCookie }),
        },
      });

      console.log("Expense Submit Response:", res);

      if (
        res?.status?.toLowerCase() === 'success' ||
        res?.message?.toLowerCase() === 'success' ||
        res?.data?.status?.toLowerCase() === 'success'
      ) {
        ToastMessage(res?.message || res?.description || 'Submitted successfully.');
        setIsRemarksModalVisible(false);
        setexpRemarks('');
        setSelectedIndex(null);
        setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
        navigation.goBack();
      } else {
        const msg = res?.description || res?.message || res?.data?.description || 'Submission failed.';
        ToastMessage(msg);
      }
    } catch (err) {
      console.log("Expense Submit Catch Error:", err);
      const msg = err?.data?.description || err?.data?.message || err?.message || 'Submission failed.';
      ToastMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };


  // const handleSubmitAllSplits = () => {
  //   //console.log('Submit Clicked');
  //   //console.log('splitsList:', splitsList);
  //   //console.log('selectedExpenseIdForSplits:', selectedExpenseIdForSplits);

  //   if (!selectedExpenseIdForSplits || splitsList.length === 0) {
  //     //console.log('Validation failed. No splits or expense ID.');
  //     return;
  //   }

  //   dispatch(setSubmittedSplits({
  //     expenseId: selectedExpenseIdForSplits,
  //     splits: splitsList,
  //   }));

  //   setModalVisible(false);
  //   setSelectedIndex(null);
  //   setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
  // };


  const ApprovalFlowSkeleton = () => (
    <View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRowShort} />
        </View>
      ))}
    </View>
  );

const pickFiles = async (expenseId) => {
  if (!isEditable) {
    ToastMessage('File upload is not allowed at this stage.');
    return;
  }
  try {
    const newFiles = await pickDocuments(true);
    if (newFiles.length > 0) {
      setFilesByExpense(prev => ({
        ...prev,
        [expenseId]: [...(prev[expenseId] || []), ...newFiles],
      }));
      ToastMessage(`${newFiles.length} file(s) attached successfully`);
    }
  } catch (error) {
    console.log('File picker error:', error);
    ToastMessage('Failed to pick document');
  }
};



  // const createdExpenseIds = useMemo(() => {
  //   console.log("expenseDetails data", expenseDetails?.data)
  //   return Array.isArray(expenseDetails?.data)
  //     ? expenseDetails.data.map(item => item.expenseid)
  //     : [];
  // }, [expenseDetails]);

  // const availableExpenseList = useMemo(() => {
  //   return Array.isArray(expenseList)
  //     ? expenseList.filter(item => !createdExpenseIds.includes(item.id))
  //     : [];


  // }, [expenseList, createdExpenseIds]);
  // useEffect(() => {
  //   if (expenseItems.length > 0 && expenseItems[0].expenseid) {
  //     console.log('check', expenseItems.length > 0 && expenseItems[0].expenseid)
  //     console.log('check item', expenseItems.length, expenseItems[0].expenseid)
  //   }
  // })
  const createdExpenseIds = useMemo(() => {
    return Array.isArray(expenseItems)
      ? expenseItems
        .filter(item => item?.expenseid)     // safety
        .map(item => item.expenseid)
      : [];
  }, [expenseItems]);

  useEffect(() => {
    const tourReason = String(
      expense?.reason ||
      expense?.tour_reason ||
      expense?.reason_data?.name ||
      expenseDetails?.reason ||
      expenseDetails?.tour_reason ||
      ''
    ).toLowerCase();

    const isLocalDeputation = tourReason.includes('local deputation') || tourReason.includes('deputation');

    const timer = setTimeout(() => {
      let filteredList = Array.isArray(expenseList)
        ? expenseList.filter(item => !createdExpenseIds?.includes(item?.id))
        : [];

      if (isLocalDeputation) {
        // When tour reason is Local Deputation, only Local Deputation Allowance is allowed
        filteredList = filteredList.filter(item => item.id === EXPENSE_IDS.Local_Deputation_Allowance);
      } else {
        // For all other tour reasons, exclude Local Deputation Allowance
        filteredList = filteredList.filter(item => item.id !== EXPENSE_IDS.Local_Deputation_Allowance);
      }

      setAvailableExpenseList(filteredList);
    }, 300);

    return () => clearTimeout(timer);
  }, [expenseList, createdExpenseIds, expense, expenseDetails]);


  useEffect(() => {
    if (expenseDetails && Array.isArray(expenseDetails.data)) {
      expenseDetails.data.forEach((item) => {
        const itemDocs = item.documents || item.file_data || [];
        if (item.expenseid && Array.isArray(itemDocs) && itemDocs.length > 0) {
          dispatch(setDocuments({ key: item.expenseid, value: itemDocs }));
        }
      });
    }
  }, [expenseDetails, dispatch]);
  useEffect(() => {
    const totalAdded = splitsList.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    const totalPercentage = splitsList.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0);

    const canAddMore = totalAdded < claimedAmount && totalPercentage < 100;
    setCanAddItems(canAddMore);
  }, [splitsList, claimedAmount]);

  // const { data: claimAmount } = route.params;
  const parentDateParam = route.params?.parentDate;

  // State for current input (single)


  const [parentDate, setParentDate] = useState(
    parentDateParam ? new Date(parentDateParam) : new Date()
  );

  // //console.log("TEstinbrrg",currentSplit)
  // State for saved splits list
  const [splitsList, setSplitsList] = useState([]);

  // Open state for pickers
  const [businessOpen, setBusinessOpen] = useState(false);
  const [ccOpen, setCcOpen] = useState(false);

  const [error, setError] = useState('');

  const updateCurrentSplit = (field, value) => {
    let updatedSplit = { ...currentSplit };

    if (field === 'business') {
      updatedSplit.business = value;
      updatedSplit.cc = null; // reset cc when business changes
    } else if (field === 'cc') {
      updatedSplit.cc = value;
    } else if (field === 'percentage') {
      const cleaned = value.replace(/[^0-9.]/g, '');
      const valid = cleaned.split('.').length > 2
        ? cleaned.substring(0, cleaned.lastIndexOf('.'))
        : cleaned;
      const percent = parseFloat(valid);

      updatedSplit.percentage = valid;

      if (!isNaN(percent)) {
        const calculated = (claimAmount * percent) / 100;
        updatedSplit.amount = calculated;
      } else {
        updatedSplit.amount = 0;
      }
    }

    setCurrentSplit(updatedSplit);
    validateTotal(updatedSplit, splitsList);
  };

  const validateTotal = (current, list, editIdx = null) => {
    let totalAmount = list.reduce((sum, s, idx) => {
      if (idx === editIdx) return sum; // exclude currently editing row
      return sum + parseFloat(s.amount || 0);
    }, 0);

    totalAmount += parseFloat(current.amount || 0);

    if (totalAmount > claimedAmount) {
      setError('Total amount cannot exceed claimed amount');
      return false;
    }

    setError('');
    return true;
  };

  const [selectedIndex, setSelectedIndex] = useState(null); // null = Add mode


  const onEditSplit = (index) => {
    //console.log('index', index, 'value', splitsList)
    const split = splitsList[index];
    setCurrentSplit({
      business: { ...split.business },
      cc: { ...split.cc },
      percentage: split.percentage,
      amount: split.amount,
    });
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const onDeleteSplit = (index) => {
    Alert.alert(
      'Delete Confirmation',
      'Are you sure you want to delete this CCBS split?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = [...splitsList];
            updated.splice(index, 1);
            setSplitsList(updated);

            dispatch(removeCcbsSplit(index)); // ✅ update Redux

            if (selectedIndex === index) {
              setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
              setSelectedIndex(null);
            }
          },
        },
      ]
    );
  };






  const validateRemarks = (text) => {
    if (!text || text.trim() === '') {
      ToastMessage('Please enter approver remarks');
      return false;
    }
    return true;
  };

  const getBaseFormData = (remarks) => ({
    apptype: 'claim',
    appcomment: remarks,
  });

  const handleApprove = async (values) => {
    const remarks = values?.approverRemarks || '';
    if (!validateRemarks(remarks)) return;

    const formData = {
      ...getBaseFormData(remarks),
      id: expense.id,
      tourgid: expense.tourid,
      applevel: expense.applevel,
      status: '3',
    };

    try {
      const response = await triggerTourApprove({ data: formData }).unwrap();
      if (response?.status === 'success' || response?.message === 'Success') {
        ToastMessage('Tour request approved successfully!');
        navigation.goBack();
      } else {
        ToastMessage(response?.description || response?.message || 'Approve failed. Please try again.');
      }
    } catch (error) {
      // console.error('Approve error:', error);
      const errorMessage =
        error?.data?.description || error?.data?.message || error?.message || 'Failed to approve the request.';
      ToastMessage(errorMessage);
    }
  };

  const handleReject = async (values) => {
    const remarks = values?.approverRemarks || '';
    if (!validateRemarks(remarks)) return;

    const formData = {
      ...getBaseFormData(remarks),
      id: expense.id,
      tour_id: expense.tourid,
    };

    try {
      const response = await triggerTourReject({ data: formData }).unwrap();
      if (response?.status === 'success' || response?.message === 'Success') {
        ToastMessage('Tour request rejected successfully!');
        navigation.goBack();
      } else {
        ToastMessage(response?.description || response?.message || 'Reject failed. Please try again.');
      }
    } catch (error) {
      // console.error('Reject error:', error);
      const errorMessage =
        error?.data?.description || error?.data?.message || error?.message || 'Failed to reject the request.';
      ToastMessage(errorMessage);
    }
  };

  const handleReturn = async (values) => {
    const remarks = values?.approverRemarks || '';
    if (!validateRemarks(remarks)) return;

    const formData = {
      ...getBaseFormData(remarks),
      id: expense.id,
      tour_id: expense.tourid,
    };

    try {
      const response = await triggerTourReturn({ data: formData }).unwrap();
      if (response?.status === 'success' || response?.message === 'Success') {
        ToastMessage('Tour request returned successfully!');
        navigation.goBack();
      } else {
        ToastMessage(response?.description || response?.message || 'Return failed. Please try again.');
      }
    } catch (error) {
      // console.error('Return error:', error);
      const errorMessage =
        error?.data?.description || error?.data?.message || error?.message || 'Failed to return the request.';
      ToastMessage(errorMessage);
    }
  };
  const addCurrentSplitToList = () => {
    const percent = parseFloat(currentSplit.percentage || 0);
    const amount = parseFloat(currentSplit.amount || 0);

    if (!currentSplit.business || !currentSplit.cc) {
      ToastMessage('Please select Business Segment and Cost Center.');
      return;
    }

    if (percent <= 0 || amount <= 0) {
      ToastMessage('Enter valid percentage and amount.');
      return;
    }

    const totalPercent = splitsList.reduce((sum, item, i) => (
      sum + (i === selectedIndex ? 0 : parseFloat(item.percentage || 0))
    ), 0) + percent;

    if (totalPercent > 100) {
      ToastMessage('Total percentage exceeds 100%.');
      return;
    }

    let updated = [...splitsList];
    if (selectedIndex !== null) {
      updated[selectedIndex] = currentSplit;
    } else {
      updated.push(currentSplit);
    }

    setSplitsList(updated);
    setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
    setSelectedIndex(null);
    // setModalVisible(false);
  };
  const addOrUpdateSplit = () => {
    const isEditMode = selectedIndex !== null;

    if (!currentSplit.business || !currentSplit.cc) {
      ToastMessage('Please select both Business Segment and Cost Center.');
      return;
    }

    if (!currentSplit.percentage || Number(currentSplit.percentage) <= 0) {
      ToastMessage('Enter a valid percentage greater than 0.');
      return;
    }

    const isValid = validateTotal(currentSplit, splitsList, isEditMode ? selectedIndex : null);
    if (!isValid) {
      ToastMessage('Total exceeds claimed amount.');
      return;
    }

    const updatedSplit = {
      ...currentSplit,
      amount: parseFloat(currentSplit.amount).toFixed(2),
    };

    if (isEditMode) {
      const updatedList = [...splitsList];
      updatedList[selectedIndex] = updatedSplit;
      setSplitsList(updatedList);
    } else {
      setSplitsList(prev => [...prev, updatedSplit]);
    }

    // Reset state after add or update
    setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
    setSelectedIndex(null);
    // setModalVisible(false);
    setError('');
  };


  const handleEdit = (index) => {
    setCurrentSplit(splitsList[index]);
    setEditIndex(index);
  };
  const handleCancel = () => {
    setModalVisible(false);
    setCurrentSplit({
      business: null,
      cc: null,
      percentage: '',
      amount: '',
    });
    setEditIndex(null);
  };

  // Function to take photo using camera
  const takePhoto = async () => {
    if (!isEditable) {
      ToastMessage('You cannot add photos to this expense in its current status.');
      return;
    }
    ToastMessage('Camera functionality is not yet implemented.');
    // Integrate Expo ImagePicker here:
    // const { status } = await ImagePicker.requestCameraPermissionsAsync();
    // if (status !== 'granted') {
    //   Alert.alert('Permission required', 'Please enable camera access in settings.');
    //   return;
    // }
    // try {
    //   let result = await ImagePicker.launchCameraAsync({
    //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //     allowsEditing: true,
    //     aspect: [4, 3],
    //     quality: 1,
    //   });
    //   if (!result.canceled) {
    //     const photoAsset = result.assets[0];
    //     setNewlyPickedFiles((prev) => [...prev, {
    //       name: photoAsset.fileName || `photo_${Date.now()}.jpg`,
    //       uri: photoAsset.uri,
    //       file_url: photoAsset.uri, // For consistent prop with FileDisplaySection
    //       id: photoAsset.uri,
    //     }]);
    //     ToastMessage('Photo added!');
    //   }
    // } catch (error) {
    //   console.error('Error taking photo:', error);
    //   Alert.alert('Error', 'Failed to take photo. Please try again.');
    // }
  };
  const [newlyPickedFiles, setNewlyPickedFiles] = useState([]);
  // State for maker's uploaded files (from API) - initial state derived from expense.documents
  const [makerUploadedFiles, setMakerUploadedFiles] = useState([]);
  // State for approver's uploaded files (from API) - initial state derived from expense.documents
  const [approverUploadedFiles, setApproverUploadedFiles] = useState([]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    triggerGetDetails(tourNo)
      .unwrap()
      .finally(() => setRefreshing(false));
  }, [tourNo, triggerGetDetails]);

  // --- Calculate Total Claimed Amount ---
  const calculateTotalClaimedAmount = useCallback(() => {
    return expenseItems.reduce((sum, item) => sum + (parseFloat(item.claimedamount) || 0), 0);
  }, [expenseItems]);

  // --- Add New Expense Item Logic ---
const handleAddExpenseItem = () => {
    if (!canAddItems) {
      ToastMessage('You cannot add new expense items in the current claim status.');
      return;
    }

    if (!selectedExpenseType || newComments.trim() === '') {
      ToastMessage('Please select an Expense Type and add Comments.');
      return;
    }

    if (selectedExpenseType === EXPENSE_IDS.Local_Deputation_Allowance) {
      const tourReason = String(
        expense?.reason ||
        expense?.tour_reason ||
        expense?.reason_data?.name ||
        expenseDetails?.reason ||
        expenseDetails?.tour_reason ||
        ''
      ).toLowerCase();
      const isLocalDeputation = tourReason.includes('local deputation') || tourReason.includes('deputation');
      if (!isLocalDeputation) {
        Alert.alert(
          'Expense Not Allowed',
          'Local Deputation Allowance is not permitted for this tour. Bank policy strictly requires the tour reason to be "Local Deputation".'
        );
        return;
      }
    }

    const expenseTypeName =
      expenseList?.find(opt => String(opt.id) === String(selectedExpenseType))?.name
      || 'Unknown Expense Type';

    const newItem = {
      expenseid: selectedExpenseType,
      expensename: expenseTypeName,
      requestercomment: newComments.trim(),
      eligibleamount: 0.0,
      claimedamount: 0.0,
      newlycreated: 'yes',
      edit: 'no',
      documents: [...tempLocalFiles],
    };

    // REMOVED: setExpenseItems(prev => [...prev, newItem]);
    // This item isn't real yet — it only becomes real once the child screen
    // (e.g. TravelDetailsScreen) actually submits it to the backend. Adding
    // it here removed the option from the dropdown even when the user
    // backed out without saving.

    setSelectedExpenseType(null);
    setNewComments('');
    setNewClaimedAmount('');
    setTempLocalFiles([]);
    setSelectedExpenseTypeName("");
    setIsAddExpenseModalVisible(false);

    const targetScreen = expenseIdToScreenMap[newItem.expenseid];
    console.log('Navigating to screen for new expense item:', targetScreen, 'with data:', newItem);
    if (targetScreen) {
      navigation.navigate(targetScreen, {
        tourId: tourNo,
        expense: newItem,
        claimdata: expense,
        fromNew: true,
      });
    }
};


  // --- MIME Type Helper ---
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
  const handleCardPressEdit = (
    expenseData, expen
  ) => {
    if (!expenseData || typeof expenseData.expenseid === 'undefined') {
      // console.error('handleCardPressForExpense: Invalid expenseData received.', expenseData);
      ToastMessage('Invalid expense details. Please try again.');
      return;
    }
    const targetScreen = expenseIdToScreenMap[expenseData.expenseid];
    // //console.log('kkkkkkkkkk',targetScreen)
    if (targetScreen) {
      // Navigate to the specific screen for the expense ID
      // //console.log("==========>", expenseData )
      navigation.navigate(targetScreen, {
        tourId: tourNo,
        expense: expenseData,
        claimdata: expense,
        from,
      });
    } else {
      // Handle cases where an expense ID doesn't have a specific screen mapping
      // console.warn(
      //   `Navigation Warning: No specific screen mapped for Expense ID: ${expenseData.expenseid} ` +
      //   `("${expenseData.expenseTypeName || 'Unknown'}"). Cannot navigate to a specific editor.`
      // );
    }
  };

  // --- Handle Card Press for Editing Expense Item ---


  // --- File Picking for the Modal (new item being added) ---
  const pickFilesForNewItem = async () => {
  
     try {
          const files = await pickDocuments(false); // single file
    
          if (files.length > 0) {
            setTempLocalFiles(files[0]);
            ToastMessage('Document attached successfully');
          }
        } catch {
          ToastMessage('Failed to pick document');
        }
  };

  // --- View Local File (from tempLocalFiles in modal) ---
  const handleViewLocalFile = async (file) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(file.file_url || file.uri); // Use file_url or uri
      if (!fileInfo.exists || fileInfo.isDirectory) {
        ToastMessage("Error: File not found or is invalid.");
        return;
      }

      const mimeType = getMimeType(file.name);
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(file.file_url || file.uri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: mimeType,
        });
      } else {
        await WebBrowser.openBrowserAsync(file.file_url || file.uri);
      }
    } catch (error) {
      // console.error("Failed to open file:", error);
      ToastMessage(`Error: Unable to open file. ${error.message}`);
    }
  };
  const handleViewFile = async (file) => {
    try {
      console.log(file);

console.log(await FileSystem.getInfoAsync(response.uri));
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
      //  console.error("Failed to open file:", error);
      ToastMessage(`Error: Unable to open file. ${error.message}`);
    }
  };

  // --- View Web File (for already uploaded files on cards) ---
const handleWebViewFile = async (file) => {
  try {
    setLoading(true);

    const fileExtension = file.file_name.split(".").pop().toLowerCase();
    // const downloadUrl = `${Environment.taServiceUrl}/taserv/doc_download/${file.file_id}`;
     const downloadUrl = `${Environment.taServiceUrl}/taserv/document_view?doc_option=view&id=${file.id}`;
console.log("Downloading from URL:", downloadUrl);
    const response = await fetch(downloadUrl, {
      headers: {
        authorization: `Token ${authRedux?.user?.token}`,
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
        ...(csrfCookie && { 'X-CSRFCookie': csrfCookie }),
      },
    });
    console.log("Download response headers:", response.headers);
console.log("Download response status:", response.status, "OK:", response.ok);
    if (!response.ok) {
      console.log("Failed to download file. Status:", response.status, "Status Text:", response.statusText);
      throw new Error("Failed to download file");
    }

    // Buffer -> ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
console.log("Downloaded ArrayBuffer size:", arrayBuffer.byteLength);
    // ArrayBuffer -> Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);
console.log("Converted to Uint8Array size:", uint8Array.length);
    // Uint8Array -> Base64
    let binary = "";
    uint8Array.forEach((b) => {
      binary += String.fromCharCode(b);
    });

    const base64 = global.btoa(binary);
console.log("Converted to Base64 length:", base64.length);
    const localUri =
      FileSystem.cacheDirectory + `tempfile.${fileExtension}`;

    await FileSystem.writeAsStringAsync(localUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
console.log("File written to local URI:", localUri);
    const mimeType = getMimeType(file.file_name);

    if (Platform.OS === "android") {
      const contentUri = await FileSystem.getContentUriAsync(localUri);

      await IntentLauncher.startActivityAsync(
        "android.intent.action.VIEW",
        {
          data: contentUri,
          type: mimeType,
          flags: 1,
        }
      );
      console.log("Intent launched for Android with content URI:", contentUri);
    } else {
      await WebBrowser.openBrowserAsync(localUri);
      console.log("Opened file in WebBrowser for iOS/Web with local URI:", localUri);
    }
  } catch (e) {
    console.log("VIEW ERROR:", e);
    ToastMessage(e.message);
  } finally {
    setLoading(false);
  }
};
  const [deleteDocument, { data: deleteDocumentData }] = useDeleteDocumentMutation();

const removeFile = (fileOrId, typeId) => {
  const isObj = fileOrId && typeof fileOrId === 'object';
  const fileId = isObj ? fileOrId.id : fileOrId;
  const fileUri = isObj ? fileOrId.uri : null;

  console.log("Attempting to remove file:", fileOrId, "for typeId:", typeId);
  Alert.alert("Remove File", "Are you sure you want to remove this file?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Remove",
      style: "destructive",
      onPress: async () => {
        try {
          if (fileId) {
            console.log("File has an ID, proceeding to delete from server:", fileId);
const deleteRes = await deleteDocument(fileId).unwrap();
console.log("DELETE RESPONSE:", deleteRes);

console.log("Refreshing...");
const res = await triggerGetDocuments(
  { tour_id: tourNo, expid: typeId },
  false
).unwrap();

console.log("UPDATED DOCS:", res.data);

dispatch(
  setDocuments({
    key: typeId,
    value: res.data || [],
  })
);
          } else {
            setFilesByExpense(prev => ({
              ...prev,
              [typeId]: (prev[typeId] || []).filter(item => item.uri !== fileUri),
            }));
          }
        } catch (err) {
          console.log("DELETE ERROR:", err);
          Alert.alert("Error", "Failed to delete file.");
        }
      },
    },
  ]);
};

  const handleDeleteItem = (expenseId, tourNo) => {
    Alert.alert(
      "Delete Expense",
      "Do you want to delete this expense item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await deleteExpense({ tour_id: tourNo, expid: expenseId }).unwrap();

              // Update local list
              setExpenseItems(prev => prev.filter(item => item.expenseid !== expenseId));


              dispatch(removeExpenseItem(expenseId));
              const msg = response?.status || "Expense deleted successfully";
              ToastMessage(msg); // or use ToastAndroid if on Android


            } catch (error) {
              // console.error("Delete error:", error);
              // Alert.alert("Error", "Failed to delete expense. Please try again.");
            }
          }
        }
      ]
    );
  };


  const [documentInsert] = useDocumentInsertMutation();
const handleUpload = async (typeId) => {
  const filesToUpload = filesByExpense[typeId] || [];
  if (!filesToUpload.length) {
    ToastMessage("No files selected");
    return;
  }

  const payload = {
    tour_id: Number(tourNo),
    ref_type: 2,
    requirement_type: typeId,
  };

  try {
    const response = await uploadMultipart({
      url: `${Environment.taServiceUrl}/taserv/document_insert`,
      data: payload,
      files: filesToUpload,
      headers: {
        Authorization: `Token ${authToken}`,
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
        ...(csrfCookie && { 'X-CSRFCookie': csrfCookie }),
      },
    });

    if (
      response?.status?.toLowerCase() === "success" ||
      response?.message?.toLowerCase() === "success"
    ) {
      ToastMessage("File Uploaded Successfully");

      const res = await triggerGetDocuments({ tour_id: tourNo, expid: typeId }).unwrap();
      dispatch(setDocuments({ key: typeId, value: res.data }));

      setFilesByExpense(prev => ({ ...prev, [typeId]: [] })); // clear only this item's picked files
    } else {
      ToastMessage(response?.description || response?.message || "Upload Failed");
    }
  } catch (error) {
    ToastMessage(error?.description || error?.message || "Upload Failed");
  }
};

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
          globalStyle.actionSheetOption,
          isSelected && globalStyle.actionSheetOptionSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Select ${options.label}`} // Corrected typo
      >
        <Text
          allowFontScaling={false}
          style={[
            globalStyle.actionSheetOptionText,
            isSelected && globalStyle.actionSheetOptionTextSelected,
          ]}
        >
          {typeof options.label === "string"
            ? options.label
            : String(options.label)}
        </Text>
      </TouchableOpacity>
    );
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        // console.warn(err);
        return false;
      }
    }
    return true;
  };

  const takePhotoForNewItem = async () => {
    ToastMessage('Camera functionality is not yet implemented.');
  };



  if (refreshing || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={styles.loadingText}>Please Wait...</Text>
      </View>
    );
  }

  if (!expenseDetails && !fetchError && expenseItems.length === 0) {
    return (
      <View style={styles.centered}>
        <Text allowFontScaling={false} style={styles.noDataText}>No details found for this expense. Start by adding new expense items.</Text>
        <TouchableOpacity
          onPress={() => setIsAddExpenseModalVisible(true)}
          style={[styles.addButton, !canAddItems && styles.disabledButton]}
          disabled={!canAddItems}
        >
          <Ionicons name="add" size={moderateScale(20)} color={CustomColors.white} />
          <Text allowFontScaling={false} style={styles.addButtonText}>Add First Expense</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const values = { approverRemarks: remarks };

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[CustomColors.appThemeColor]} />
        }
      >
        {/* Tour Number Highlighted at Top */}
        <View style={styles.tourNoContainer}>
          <Text allowFontScaling={false} style={styles.tourNoLabel}>Tour No:</Text>
          <Text allowFontScaling={false} style={styles.tourNoValue}>{tourNo || 'N/A'}</Text>
        </View>

        {/* Expense Items Section - Each item is a card */}
        {expenseItems.length > 0 && expenseItems[0].expenseid ? (
          <View style={globalStyle.sectionCard}>
            <Text allowFontScaling={false} style={globalStyle.sectionHeader}>Expense Items</Text>
            {expenseItems.map((item) => (
              <TouchableOpacity
                key={item.id?.toString() || `temp-${Math.random()}`}
                onPress={() => handleCardPressEdit(item)}
                onLongPress={() => canEditDeleteItems && handleDeleteItem(item.expenseid, item.tourid)}
                delayLongPress={500}
                activeOpacity={0.8}
                isEditable={isEditable}
                style={styles.expenseItemCard}
              >
                <View style={styles.cardHeader}>
                  <Text allowFontScaling={false} style={styles.cardItemTitle}>{item.expensename || item.expenseTypeName}</Text>
                  {canEditDeleteItems && (
                    <MaterialIcons name="edit" size={moderateScale(20)} color={CustomColors.primaryBlue} />
                  )}
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardDetailRow}>
                    <Text allowFontScaling={false} style={styles.cardLabel}>Comments:</Text>
                    <Text allowFontScaling={false} style={styles.cardValue}>{item.requestercomment || ''}</Text>
                  </View>
                  <View style={styles.cardDetailRow}>
                    <Text allowFontScaling={false} style={styles.cardLabel}>Claimed Amount:</Text>
                    <Text allowFontScaling={false} style={styles.cardValue}>
                      ₹{(parseFloat(item.claimedamount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.attachmentSection}>
                    <Text allowFontScaling={false} style={styles.attachmentHeader}>Attachments</Text>

                    {/* Pick/Take buttons */}
                    <View style={styles.attachmentButtonsContainer}>
                    <TouchableOpacity onPress={() => pickFiles(item.expenseid)} style={styles.pickFileButton}>
                        <Ionicons name="folder" size={20} color={CustomColors.white} />
                        <Text allowFontScaling={false} style={styles.buttonText}> Pick Files</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={takePhoto} style={styles.pickFileButton}>
                        <Ionicons name="camera" size={20} color={CustomColors.white} />
                        <Text allowFontScaling={false} style={styles.buttonText}> Take Photo</Text>
                      </TouchableOpacity>
                    </View>

                    {/* New Selected Files */}
                    {console.log('DOCS FOR ITEM', item.expenseid, JSON.stringify(documents?.[item?.expenseid]))}
<FileDisplaySection
  title="Selected Files"
  files={filesByExpense[item.expenseid] || []}
  handleViewFile={handleViewFile}
  removeFile={(file) => removeFile(file, item.expenseid)}
  isEditable={true}
  emptyMessage="No new files selected."
/>

{(filesByExpense[item.expenseid]?.length > 0) && (
  <TouchableOpacity onPress={() => handleUpload(item.expenseid)} style={styles.uploadButton}>
    <Ionicons name="cloud-upload" size={20} color={CustomColors.white} />
    <Text allowFontScaling={false} style={styles.buttonText}> Upload Files</Text>
  </TouchableOpacity>
)}

                 {/* Maker Uploaded */}
<FileDisplaySection
  title="Uploaded Files"
  files={documents?.[item?.expenseid] || []}
  handleWebViewFile={handleWebViewFile}
  removeFile={(file) => removeFile(file, item.expenseid)}
  isEditable={isEditable}
  typeId={item?.expenseid}
  emptyMessage="No files uploaded by you."
/>

{/* Approver Uploaded */}
<FileDisplaySection
  title="Approver Uploaded Files"
  files={documentData?.tour_approver || []}
  handleViewFile={handleWebViewFile}
  removeFile={(file) => removeFile(file, item.expenseid)}
  isEditable={false}
  emptyMessage="No files uploaded by approver."
/>
                  </View>


                </View>
              </TouchableOpacity>

            ))}

            {/* Total Claimed Amount */}
            <View style={styles.totalAmountCard}>
              <Text allowFontScaling={false} style={styles.totalAmountLabel}>Total Claimed:</Text>
              <Text allowFontScaling={false} style={styles.totalAmountValue}>
                ₹{calculateTotalClaimedAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Pick/Take buttons */}
            {expenseItems && (
              <View style={styles.expenseItemContainer}>

                {/* Add CCBS Button for each item */}
                <View style={styles.attachmentButtonsContainer}>
                  {(from !== 'Checker' || isAppoverEditable) && (
                    <TouchableOpacity
                      style={styles.pickFileButton}
                      disabled={!canAddItems && !isAppoverEditable}
                      onPress={() => {
                        setSelectedIndex(null);
                        setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
                        setModalVisible(true);
                      }}
                    >
                      <Icon name="plus" size={22} color={CustomColors.iconWhite} />
                      <Text allowFontScaling={false} style={styles.buttonText}>Add CCBS</Text>
                    </TouchableOpacity>
                  )}

                </View>

                {ccbsSplits?.length > 0 && (
                  <View style={modalStyles.ccbsCardSection}>
                    <Text allowFontScaling={false} style={modalStyles.ccbsSectionTitle}>Submitted CCBS</Text>
                    {ccbsSplits.map((split, idx) => (
                      <TouchableOpacity
                        disabled={!canAddItems && !isAppoverEditable}
                        key={idx}
                        style={modalStyles.card}
                        onPress={() => onEditSplit(idx)}
                        onLongPress={() => onDeleteSplit(idx)}
                      >
                        <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}> Business:
                          <Text allowFontScaling={false} style={{ color: CustomColors.textBlack }}> {split.bs_data?.name}</Text></Text>
                        <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}>  Cost Center:
                          <Text allowFontScaling={false} style={{ color: CustomColors.textBlack }}>{split.cc_data?.name}</Text></Text>
                        <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}>  Percentage:
                          <Text allowFontScaling={false} style={{ color: CustomColors.textBlack }}>{split.percentage}%</Text></Text>
                        <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}>  Amount:
                          <Text allowFontScaling={false} style={{ color: CustomColors.textBlack }}>₹{split.amount}</Text></Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}


              </View>
            )}




          </View>

        ) : (
          <View style={styles.centered}>
            <Text allowFontScaling={false} style={styles.noDataText}>No expense items recorded for this tour yet.</Text>
          </View>
        )}


        {/* Add New Expense Item Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isAddExpenseModalVisible}
          onRequestClose={() => setIsAddExpenseModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text allowFontScaling={false} style={styles.modalTitle}>Add New Expense Item</Text>

              <View style={styles.formField}>
                <Text allowFontScaling={false} style={styles.label}>Expense Type<Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                  style={styles.actionSheetTriggerButton}
                  onPress={() => setExpenseTypePickerVisible(true)}
                >
                  <Text allowFontScaling={false} style={selectedExpenseType ? styles.selectedText : styles.placeholderText}>
                    {selectedExpenseTypeName || 'Select Expense Type'}
                  </Text>
                </TouchableOpacity>

                <CustomActionSheetPicker
                  pickerStatus={expenseTypePickerVisible}
                  setPickerStatus={setExpenseTypePickerVisible}
                  title="Select Expense Type"
                  optionsData={availableExpenseList.map(item => ({
                    label: item.name,
                    value: item.id,
                    expense: item,   // ✅ FULL OBJECT
                  }))}

                  RenderItem={({ options, onPress, selected, setPickerStatus }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedExpenseType(options.value);
                        setSelectedExpenseTypeName(options.label);
                        onPress?.(options.value);
                        setPickerStatus(false);
                      }}
                      style={{
                        padding: 15,
                        backgroundColor: selected === options.value ? CustomColors.primaryLight : CustomColors.backgroundWhite,

                      }}
                    >
                      <Text allowFontScaling={false} style={{ color: selected === options.value ? CustomColors.primaryBlue : CustomColors.textDark }}>{options.label}</Text>
                    </TouchableOpacity>
                  )}
                  onPress={(value) => {
                    setSelectedExpenseType(value);
                    const selectedItem = expenseList?.find(item => item.id === value);

                    setSelectedExpenseTypeName(selectedItem?.name || '');
                  }}

                  selected={selectedExpenseType}
                  // isLoading={isexplist}
                  isFetchingMore={false}
                  onEndReached={() => { }}
                  hasMoreData={false}
                />

              </View>




              <View style={styles.formField}>
                <Text allowFontScaling={false} style={styles.label}>Requester Comments<Text allowFontScaling={false} style={styles.required}>*</Text></Text>
                <TextInput allowFontScaling={false}
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Comments"
                  value={newComments}
                  onChangeText={setNewComments}
                  multiline={true}
                  numberOfLines={4}
                  placeholderTextColor={CustomColors.textGray}
                />
              </View>



              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsAddExpenseModalVisible(false);
                    setTempLocalFiles([]); // Clear temp files on cancel
                    setSelectedExpenseType(null);
                    setSelectedExpenseTypeName("")
                  }}
                >
                  <Text allowFontScaling={false} style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleAddExpenseItem}
                >
                  <Text allowFontScaling={false} style={styles.modalButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          animationType="slide"
          transparent={true}
          visible={isApprovalModalVisible}
          onRequestClose={() => setIsApprovalModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity onPress={() => setIsApprovalModalVisible(false)} style={styles.modalHeaderIcon}>
                <MaterialIcons name="close" size={24} color={CustomColors.textRed} />
              </TouchableOpacity>
              <Text allowFontScaling={false} style={styles.modalTitle}>Approval Flow</Text>

              {isApprovalFlowLoading ? (
                <View style={globalStyle.loadingContainer}>
                  <ActivityIndicator style={{ padding: 10 }} />
                  <Text style={globalStyle.loadingText}> Please wait...</Text>

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
                      <View key={step.id?.toString() || index.toString()} style={styles.approvalStepCard}>

                        <View style={[
                          styles.statusBadge,
                          step.status === 3 ? styles.statusApproved :
                            step.status === 5 ? styles.statusReturned :
                              styles.statusDefault
                        ]}>
                          <Text allowFontScaling={false} style={styles.statusBadgeText}>{displayStatus}</Text>
                        </View>

                        <View style={styles.cardDetailRow}>
                          <Text allowFontScaling={false} style={styles.cardLabel}>Date:</Text>
                          <Text allowFontScaling={false} style={styles.cardValue}>{step.approveddate || 'N/A'}</Text>
                        </View>
                        <View style={styles.cardDetailRow}>
                          <Text allowFontScaling={false} style={styles.cardLabel}>Type:</Text>
                          <Text allowFontScaling={false} style={styles.cardValue}>{step.apptype || 'N/A'}</Text>
                        </View>
                        <View style={styles.cardDetailRow}>
                          <Text allowFontScaling={false} style={styles.cardLabel}>Approved By:</Text>
                          <Text allowFontScaling={false} style={styles.cardValue}>{step.approvedby || 'N/A'}</Text>
                        </View>
                        <View style={styles.cardDetailRow}>
                          <Text allowFontScaling={false} style={styles.cardLabel}>Raised By:</Text>
                          <Text allowFontScaling={false} style={styles.cardValue}>{step.onbehalfof?.full_name || 'N/A'}</Text>
                        </View>
                        <View style={styles.cardDetailRow}>
                          <Text allowFontScaling={false} style={styles.cardLabel}>Comment:</Text>
                          <Text allowFontScaling={false} style={styles.cardValue}>{step.comment || 'N/A'}</Text>
                        </View>

                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text allowFontScaling={false} style={styles.noDataText}>No approval flow details available.</Text>
              )}

            </View>
          </View>
        </Modal>
        {/* Overlay for fetching/loading state */}

      </ScrollView>
      {/* <View style={modalStyles.fixedButtonContainer}>
<TouchableOpacity
  onPress={() => {
    setSelectedIndex(null);
    setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
    setModalVisible(true);
  }}
  style={modalStyles.addButton}
>
  <Icon name="plus" size={22} color="#fff" />
</TouchableOpacity>
</View> */}
      <View style={styles.fixedButtonContainer}>
        {from !== 'Checker' && (
          <TouchableOpacity
            style={[
              styles.fullWidthButton,
              {
                backgroundColor: canAddItems
                  ? CustomColors.appThemeColor
                  : CustomColors.mediumGray,
              },
            ]}
            disabled={!canAddItems}
            onPress={openSubmitModal}
          >
            <Text allowFontScaling={false} style={styles.fullWidthButtonText}>Submit</Text>
          </TouchableOpacity>

        )}
      </View>
      <Modal
        visible={isRemarksModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRemarksModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setIsRemarksModalVisible(false)}
            >
              <Icon name="close" size={24} color={CustomColors.textRed} />
            </TouchableOpacity>
            <View style={globalStyle.headerStyle}>
              <Text allowFontScaling={false} style={styles.modalTitle}>Submit Expense Claim</Text>
            </View>

            <ScrollView
              style={globalStyle.ScrollView}
              contentContainerStyle={styles.modalScrollViewContent}
            >
              {/* Approver Selection / Display */}
              <View style={{ marginBottom: verticalScale(12) }}>
                <Text style={{ fontSize: moderateScale(13), fontWeight: "600", color: CustomColors.textBlack, marginBottom: verticalScale(4) }}>
                  Approver *
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const branchId =
                      expense?.branch_id ||
                      expense?.empbranchgid ||
                      expenseDetails?.branch_id ||
                      authRedux?.user?.employee_branch_id ||
                      authRedux?.user?.branch_id ||
                      authRedux?.user?.branch;
                    if (branchId && (!approverList || approverList.length === 0)) {
                      triggerApproverList({ branch: branchId, page: 1, type: "tour" })
                        .unwrap()
                        .then((res) => {
                          if (Array.isArray(res?.data)) {
                            setApproverList(
                              res.data.map((emp) => ({
                                label: `(${emp.code}) ${emp.full_name || emp.name} - ${emp.employee_designation || ""}`,
                                value: emp.id,
                                raw: emp,
                              }))
                            );
                          }
                        })
                        .catch(() => {});
                    }
                    setIsApproverPickerVisible(true);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: moderateScale(10),
                    backgroundColor: CustomColors.white,
                    borderWidth: 1,
                    borderColor: selectedApprover?.id ? CustomColors.primaryThemeColor : CustomColors.borderGray,
                    borderRadius: moderateScale(8),
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <Ionicons name="person-circle-outline" size={22} color={CustomColors.primaryThemeColor} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: moderateScale(13), color: selectedApprover?.id ? CustomColors.textBlack : CustomColors.textGray }}>
                      {selectedApprover?.fullLabel || selectedApprover?.name || "Select Approver"}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={20} color={CustomColors.textGray} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: moderateScale(13), fontWeight: "600", color: CustomColors.textBlack, marginBottom: verticalScale(4) }}>
                Remarks *
              </Text>
              <TextInput allowFontScaling={false}
                style={[globalStyle.input, { minHeight: verticalScale(60), textAlignVertical: 'top' }]}
                value={expremarks}
                onChangeText={setexpRemarks}
                placeholder="Type your remarks..."
                placeholderTextColor={CustomColors.textGray}
                multiline
              />
            </ScrollView>

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={[modalStyles.confirmButton, isSubmitting && { opacity: 0.6 }]}
                onPress={handleExpSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text allowFontScaling={false} style={modalStyles.buttonText}>Confirm</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.cancelButton}
                onPress={() => setIsRemarksModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text allowFontScaling={false} style={modalStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Approver Picker */}
      {isApproverPickerVisible && (
        <CustomActionSheetPicker
          pickerStatus={isApproverPickerVisible}
          setPickerStatus={setIsApproverPickerVisible}
          title="Select Approver"
          optionsData={approverList || []}
          RenderItem={RenderDropdownItem}
          onPress={(opt) => {
            setSelectedApprover({
              id: opt.value,
              name: opt.raw?.full_name || opt.raw?.name || opt.label,
              code: opt.raw?.code || "",
              fullLabel: opt.label,
            });
            setIsApproverPickerVisible(false);
          }}
          selected={selectedApprover ? { value: selectedApprover.id, label: selectedApprover.fullLabel } : null}
          onSearch={(query) => {
            const branchId =
              expense?.branch_id ||
              expense?.empbranchgid ||
              expenseDetails?.branch_id ||
              authRedux?.user?.employee_branch_id ||
              authRedux?.user?.branch_id ||
              authRedux?.user?.branch;
            if (branchId) {
              triggerApproverList({ branch: branchId, name: query, page: 1, type: "tour" })
                .unwrap()
                .then((res) => {
                  if (Array.isArray(res?.data)) {
                    setApproverList(
                      res.data.map((emp) => ({
                        label: `(${emp.code}) ${emp.full_name || emp.name} - ${emp.employee_designation || ""}`,
                        value: emp.id,
                        raw: emp,
                      }))
                    );
                  }
                })
                .catch(() => {});
            }
          }}
          isLoading={isApproverLoading}
        />
      )}


      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>

            {/* ❌ Close */}
            <TouchableOpacity
              style={modalStyles.closeIcon}
              onPress={() => {
                setModalVisible(false);
                setSelectedIndex(null);
                setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
              }}
            >
              <Ionicons name="close" size={24} color={CustomColors.textRed} />
            </TouchableOpacity>

            <Text allowFontScaling={false} style={modalStyles.title}>
              {selectedIndex !== null ? 'Edit CCBS' : 'Add CCBS'}
            </Text>

            {/* Business Segment */}
            <Text allowFontScaling={false} style={globalStyle.label}>
              Business Segment
            </Text>
            <TouchableOpacity
              onPress={openBsPicker}
              style={[
                globalStyle.pickerInput,
              ]}
              disabled={false}
            >
              <Text allowFontScaling={false} style={globalStyle.pickerInputText}>
                {currentSplit.business?.name
                  ? String(currentSplit.business.name)
                  : "Select Business Segment"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={CustomColors.mediumGray}
                style={globalStyle.pickerIcon}
              />
            </TouchableOpacity>

            {/* Cost Center */}
            <Text allowFontScaling={false} style={globalStyle.label}>
              Cost Center
            </Text>
            <TouchableOpacity
              onPress={openCcPicker}
              style={[
                globalStyle.pickerInput,
              ]}
              disabled={false}
            >
              <Text allowFontScaling={false} style={globalStyle.pickerInputText}>
                {currentSplit.cc?.name
                  ? String(currentSplit.cc.name)
                  : "Select Cost Center"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={CustomColors.mediumGray}
                style={globalStyle.pickerIcon}
              />
            </TouchableOpacity>

            {/* Percentage */}
            <Text allowFontScaling={false} style={globalStyle.label}>Percentage (%)</Text>
            <TextInput allowFontScaling={false}
              style={[globalStyle.input, error && globalStyle.errorBorder]}
              keyboardType="decimal-pad"
              value={currentSplit.percentage}
              onChangeText={onChangePercentage}
              placeholder="Enter percentage"
              placeholderTextColor={CustomColors.textGray}

            />

            {/* Amount */}
            <Text allowFontScaling={false} style={globalStyle.label}>Amount (₹)</Text>
            <TextInput allowFontScaling={false}
              style={[globalStyle.input, error && globalStyle.errorBorder]}
              keyboardType="decimal-pad"
              value={currentSplit.amount}
              onChangeText={onChangeAmount}
              placeholder="Enter amount"
              placeholderTextColor={CustomColors.textGray}
            />

            {/* Validation Error */}
            {error ? (
              <Text allowFontScaling={false} style={{ color: CustomColors.textRed, marginTop: 4 }}>{error}</Text>
            ) : null}

            {/* Add / Update / Cancel */}
            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  modalStyles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedIndex(null);
                  setCurrentSplit({ business: null, cc: null, percentage: '', amount: '' });
                }}
              >
                <Text allowFontScaling={false} style={modalStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  modalStyles.confirmButton,
                  (!canAddItems && !isAppoverEditable) && { backgroundColor: 'gray' },
                ]}
                disabled={!canAddItems && !isAppoverEditable}
                onPress={addOrUpdateSplit}
              >
                <Text allowFontScaling={false} style={modalStyles.confirmButtonText}>
                  {selectedIndex !== null ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* CCBS Cards */}
            {splitsList.length > 0 && (
              <>
                <ScrollView style={{ marginTop: 30, maxHeight: 300 }}>
                  <Text allowFontScaling={false} style={modalStyles.subTitle}>Added CCBS</Text>
                  {splitsList.map((split, index) => (
                    <TouchableOpacity
                      key={index}
                      style={modalStyles.card}
                      onPress={() => onEditSplit(index)}
                      onLongPress={() => onDeleteSplit(index)}
                    >
                      <Text allowFontScaling={false} style={modalStyles.cardText}>Business: {split.business?.name || '-'}</Text>
                      <Text allowFontScaling={false} style={modalStyles.cardText}>Cost Center: {split.cc?.name || '-'}</Text>
                      <Text allowFontScaling={false} style={modalStyles.cardText}>Percentage: {split.percentage}%</Text>
                      <Text allowFontScaling={false} style={modalStyles.cardText}>Amount: ₹{split.amount}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* ✅ Submit All Button */}
                <TouchableOpacity
                  style={[
                    modalStyles.modalButton,
                    modalStyles.confirmButton]}
                  onPress={() => handleCcbsSubmit()}
                >
                  <Text allowFontScaling={false} style={modalStyles.confirmButtonText}>Submit All</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </View>
      </Modal>

      {/* Business Segment Picker (Top-level Modal to ensure touch and scroll work) */}
      {isBsPickerVisible && (
        <CustomActionSheetPicker
          pickerStatus={isBsPickerVisible}
          setPickerStatus={setBsPickerVisible}
          title="Select Business Segment "
          optionsData={(businessList || []).map((bs) => ({
            label: String(bs.name || ''),
            value: bs.id,
          }))}
          RenderItem={RenderDropdownItem}
          onPress={(selectedOption) => {
            setCurrentSplit({
              ...currentSplit,
              business: {
                id: selectedOption.value,
                name: selectedOption.label,
              },
              cc: null,
            });
            dispatch(setCostCenterList([]));
            triggercc({ query: "", bs_id: selectedOption.value }).then((res) => {
              if (res?.data?.data) {
                dispatch(setCostCenterList(res.data.data));
              }
            });
          }}
          selected={{
            label: currentSplit.business?.name
              ? String(currentSplit.business.name)
              : undefined,
            value: currentSplit.business?.id ? currentSplit.business.id : undefined,
          }}
          onSearch={handleSearchBs}
          isLoading={isFetchingBS && BsPage === 1}
          onEndReached={handleLoadMoreBs}
          hasMoreData={hasMoreBs}
          isFetchingMore={isFetchingBS && BsPage > 1}
        />
      )}

      {/* Cost Center Picker (Top-level Modal) */}
      {isCcPickerVisible && (
        <CustomActionSheetPicker
          pickerStatus={isCcPickerVisible}
          setPickerStatus={setCcPickerVisible}
          title="Select Cost Center "
          optionsData={(costCenterList || []).map((cc) => ({
            label: String(cc.name || ''),
            value: cc.id,
          }))}
          RenderItem={RenderDropdownItem}
          onPress={(selectedOption) => {
            setCurrentSplit({
              ...currentSplit,
              cc: {
                id: selectedOption.value,
                name: selectedOption.label,
              },
            });
          }}
          selected={{
            label: currentSplit.cc?.name
              ? String(currentSplit.cc.name)
              : undefined,
            value: currentSplit.cc?.id ? currentSplit.cc.id : undefined,
          }}
          onSearch={handleSearchCc}
          isLoading={isFetchingCC}
        />
      )}





      <View style={globalStyle.submitButtonContainer}>
        {from === 'Checker' && (
          <View style={globalStyle.checkerButtonsContainer}>
            {/* Approve */}
            <TouchableOpacity
              style={[
                globalStyle.checkerButton,
                globalStyle.approveButton,
                (isSubmitting || !isAppoverEditable) && globalStyle.checkerButtonDisabled,
              ]}
              onPress={() => {
                setSelectedAction('approve');
                setRemarkModalVisible(true);
              }}
              disabled={isSubmitting || !isAppoverEditable}
              accessibilityLabel={isSubmitting ? 'Approving request' : 'Approve travel request'}
              accessibilityState={{ disabled: isSubmitting || !isAppoverEditable }}
            >
              {isSubmitting ? (
                <ActivityIndicator color={CustomColors.textWhite} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={moderateScale(20)} color={CustomColors.textWhite} />
                  <Text allowFontScaling={false} style={globalStyle.checkerButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Reject */}
            <TouchableOpacity
              style={[
                globalStyle.checkerButton,
                globalStyle.rejectButton,
                (isSubmitting || !isAppoverEditable) && globalStyle.checkerButtonDisabled,
              ]}
              onPress={() => {
                setSelectedAction('reject');
                setRemarkModalVisible(true);
              }}
              disabled={isSubmitting || !isAppoverEditable}
              accessibilityLabel={isSubmitting ? 'Rejecting request' : 'Reject travel request'}
              accessibilityState={{ disabled: isSubmitting || !isAppoverEditable }}
            >
              {isSubmitting ? (
                <ActivityIndicator color={CustomColors.textWhite} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={moderateScale(20)} color={CustomColors.textWhite} />
                  <Text allowFontScaling={false} style={globalStyle.checkerButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Return */}
            {expense?.tour_cancel_status_id === -1 && (
              <TouchableOpacity
                style={[
                  globalStyle.checkerButton,
                  globalStyle.returnButton,
                  (isSubmitting || !isAppoverEditable) && globalStyle.checkerButtonDisabled,
                ]}
                onPress={() => {
                  setSelectedAction('return');
                  setRemarkModalVisible(true);
                }}
                disabled={isSubmitting || !isAppoverEditable}
                accessibilityLabel={isSubmitting ? 'Returning request' : 'Return travel request'}
                accessibilityState={{ disabled: isSubmitting || !isAppoverEditable }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={CustomColors.textWhite} />
                ) : (
                  <>
                    <Ionicons name="arrow-undo-outline" size={moderateScale(20)} color={CustomColors.textWhite} />
                    <Text allowFontScaling={false} style={globalStyle.checkerButtonText}>Return</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {remarkModalVisible && (
          <Modal
            transparent
            visible={remarkModalVisible}
            animationType="slide"
            onRequestClose={() => setRemarkModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {/* Header with X cancel icon */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setRemarkModalVisible(false);
                      setRemarks('');
                      setSelectedAction(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color={CustomColors.textRed} />
                  </TouchableOpacity>
                  <Text allowFontScaling={false} style={styles.modalTitle}>Remarks</Text>
                </View>

                <Text allowFontScaling={false} style={modalStyles.modalSubtitle}>
                  Please enter a brief remark for this action.
                </Text>

                <TextInput allowFontScaling={false}
                  style={modalStyles.singleLineInput}
                  placeholder="Enter remarks"
                  placeholderTextColor={CustomColors.textGray}
                  value={remarks}
                  onChangeText={setRemarks}
                  returnKeyType="done"
                  maxLength={250}
                />

                <View style={modalStyles.modalButtonGroup}>
                  {/* <TouchableOpacity
            style={[modalStyles.modalButton, styles.cancelButton]}
            onPress={() => {
              setRemarkModalVisible(false);
              setRemarks('');
              setSelectedAction(null);
            }}
            disabled={isModalLoading}
          >
            <Text style={modalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity> */}

                  <TouchableOpacity
                    style={[
                      modalStyles.modalButton,
                      modalStyles.confirmButton,
                      isModalLoading && { opacity: 0.7 },
                    ]}
                    onPress={async () => {
                      const values = { approverRemarks: remarks };

                      if (!values.approverRemarks?.trim()) {
                        ToastMessage("Please enter approver remarks");
                        return;
                      }

                      setIsModalLoading(true);

                      try {
                        if (selectedAction === 'approve') await handleApprove(values);
                        if (selectedAction === 'reject') await handleReject(values);
                        if (selectedAction === 'return') await handleReturn(values);

                        setRemarkModalVisible(false);
                        setRemarks('');
                        setSelectedAction(null);
                      } catch (error) {
                        // console.error("Modal confirm error:", error);
                      } finally {
                        setIsModalLoading(false);
                      }
                    }}
                    disabled={isModalLoading}
                  >
                    {isModalLoading ? (
                      <View style={modalStyles.loadingRow}>
                        <ActivityIndicator color={CustomColors.appThemeColor} size="small" />
                        <Text allowFontScaling={false} style={modalStyles.processingText}>Processing...</Text>
                      </View>
                    ) : (
                      <Text allowFontScaling={false} style={modalStyles.confirmButtonText}>Confirm</Text>
                    )}

                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}


      </View>

    </>
  );
};

// --- Updated Stylesheet for ExpenseDetailScreen ---


export default ExpenseDetailScreen;