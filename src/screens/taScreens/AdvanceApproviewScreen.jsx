import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import { Environment } from "../../environment/Environment";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";
import { uploadMultipart } from "../../utilities/upload"; 
import { pickDocuments } from "../../utilities/filePicker"; 
import * as apiHooks from "../../redux/rtk_query/apiSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import { moderateScale } from "../../globalstyles/Metrics";

const disableList = ["APPROVED", "REJECTED"];

// Custom Dropdown Item Component for CustomActionSheetPicker
const DefaultDropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const isSelected = selected?.id === options?.id;

  return (
    <TouchableOpacity
      style={[
        itemStyles.optionItem,
        {
          borderBottomColor: CustomColors.lightGray,
          backgroundColor: isSelected ? CustomColors.primaryLight : "transparent",
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
          itemStyles.optionText,
          { color: isSelected ? CustomColors.appThemeColor : CustomColors.textDark },
        ]}
      >
        {options?.name || options?.code_name || options?.full_name || ""}
      </Text>
      {isSelected && <Icon name="check" size={20} color={CustomColors.appThemeColor} />}
    </TouchableOpacity>
  );
};

const AdvanceApproviewScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);
  const userToken = useSelector((state) => state.auth?.token || state.login?.token || "");

  const { tourDataParams = {}, tour_id = 0, from = "ADVANCE_VIEW" } = route.params || {};

  const tourId = tour_id || tourDataParams?.tourgid || tourDataParams?.tourid || tourDataParams?.id || 0;
  const isChecker = from === "CHECKER" || from === "ADVANCE_CHECKER" || tourDataParams?.applevel === 1;

  // Angular UI Button Flags
  const [showApproveBtn, setShowApproveBtn] = useState(true);
  const [showCancelBtn, setShowCancelBtn] = useState(false);

  // Modal Decision Control State
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [decisionType, setDecisionType] = useState(null); // '3': Approve, '4': Reject, '5': Return
  const [isCancelDecision, setIsCancelDecision] = useState(false);
  const [actionComment, setActionComment] = useState("");

  // Master Lists
  const [bsList, setBsList] = useState([]);
  const [ccList, setCcList] = useState([]);

  // Header Details State
  const [tourDetails, setTourDetails] = useState({
    reqNo: tourDataParams?.requestno || tourDataParams?.reqno || "",
    requestDate: tourDataParams?.requestdate || "",
    reason: tourDataParams?.reason || "",
    startDate: tourDataParams?.startdate || "",
    endDate: tourDataParams?.enddate || tourDataParams?.enddatee || "",
    empName: tourDataParams?.employee_name || "",
    empCode: tourDataParams?.employee_code || "",
    empGrade: tourDataParams?.empgrade || "",
    empDesignation: tourDataParams?.empdesignation || "",
    branchName: tourDataParams?.branch_name || "",
    onBehalfName: tourDataParams?.onbehalfof?.full_name || tourDataParams?.onbehalfname || "",
    onBehalfEnable: !!(tourDataParams?.onbehalfof || tourDataParams?.onbehalfname),
  });

  // Advance Breakdown List
  const [advanceList, setAdvanceList] = useState([
    {
      id: 0,
      reason: "",
      reqamount: "",
      appamount: "",
      crnno: "",
      statuss: "PENDING",
      invoiceheadergid: null,
    },
  ]);

  // CCBS State
  const emptyCCBS = useMemo(() => ({
    id: 0,
    bsid: "",
    ccid: "",
    amount: "",
    percentage: "",
  }), []);

  const [ccbsList, setCcbsList] = useState([emptyCCBS]);
  const [ccbsModalVisible, setCcbsModalVisible] = useState(false);
  const [approvalFlowModalVisible, setApprovalFlowVisible] = useState(false);

  // Approver / Remarks State
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [remarks, setRemarks] = useState("");

  // Attachments State
  const [selectedFiles, setSelectedFiles] = useState([]); // 🔑 FIXED: Added missing selectedFiles state
  const [tourMakerAttachments, setTourMakerAttachments] = useState([]);
  const [advanceMakerAttachments, setAdvanceMakerAttachments] = useState([]);
  const [advanceApproverAttachments, setAdvanceApproverAttachments] = useState([]);
  const [approvalFlowList, setApprovalFlowList] = useState([]);

  // RTK Query Hooks
  const [fetchAdvanceDetails, { isLoading: isDetailsLoading }] =
    apiHooks.useLazyGetAdvanceEditDetailsQuery
      ? apiHooks.useLazyGetAdvanceEditDetailsQuery()
      : [() => ({ unwrap: async () => ({}) }), { isLoading: false }];

  const [fetchCcbsList] = apiHooks.useLazyGetCCBSQuery
    ? apiHooks.useLazyGetCCBSQuery()
    : [() => ({ unwrap: async () => [] })];

  const [fetchApprovalFlow] = apiHooks.useLazyGetApprovalFlowQuery
    ? apiHooks.useLazyGetApprovalFlowQuery()
    : [() => ({ unwrap: async () => ({ approve: [] }) })];

  const [fetchTourBsCc] = apiHooks.useLazyGetTourBsCcFetchQuery
    ? apiHooks.useLazyGetTourBsCcFetchQuery()
    : [() => ({ unwrap: async () => ({ data: [] }) })];

  const [fetchDocumentGet] = apiHooks.useLazyDocumentDataGetQuery
    ? apiHooks.useLazyDocumentDataGetQuery()
    : [() => ({ unwrap: async () => ({ tour_maker: [], advance_maker: [], advance_approver: [] }) })];

  const [approveTour, { isLoading: isApproving }] = apiHooks.useTourApproveMutation
    ? apiHooks.useTourApproveMutation()
    : [async () => ({})];

  const [rejectTour, { isLoading: isRejecting }] = apiHooks.useTourRejectMutation
    ? apiHooks.useTourRejectMutation()
    : [async () => ({})];

  const [returnTour, { isLoading: isReturning }] = apiHooks.useTourReturnMutation
    ? apiHooks.useTourReturnMutation()
    : [async () => ({})];

  const isDecisionSubmitting = isApproving || isRejecting || isReturning;

  // Header Right Component
  const HeaderRight = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => setApprovalFlowVisible(true)}
        style={{ marginRight: 15, padding: 4 }}
      >
        <Icon name="visibility" size={26} color={CustomColors.white} />
      </TouchableOpacity>
    ),
    [CustomColors.white]
  );

  // Configure Header Navigation
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "eClaim Advance View",
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerTintColor: CustomColors.textWhite,
      headerTitleStyle: { fontWeight: "700", fontSize: moderateScale(18) },
      headerRight: HeaderRight,
    });
  }, [navigation, CustomColors, HeaderRight]);

  // Angular Buttons Visibility Evaluation
  useEffect(() => {
    if (tourDataParams?.reason !== undefined && tourDataParams?.reason !== null) {
      setShowApproveBtn(true);
    } else {
      setShowApproveBtn(false);
    }

    if (tourDataParams?.apptype === "AdvanceCancel") {
      setShowCancelBtn(true);
      setShowApproveBtn(false);
    }

    if (
      tourDataParams?.advance_status === "APPROVE" ||
      tourDataParams?.advance_status === "REJECT"
    ) {
      setShowApproveBtn(false);
    }
  }, [tourDataParams]);

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

  // Robust In-App Document Viewer
  const handleViewFile = useCallback(async (file) => {
    try {
      const fileUrl = file?.uri || file?.url;
      const fileName = file?.name || file?.file_name || "document";

      if (!fileUrl) {
        ToastMessage("File URL not available.");
        return;
      }

      const mimeType = getMimeType(fileName);

      if (Platform.OS === "android") {
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: fileUrl,
          type: mimeType,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        });
      } else if (Platform.OS === "ios") {
        await WebBrowser.openBrowserAsync(fileUrl);
      }
    } catch (error) {
      console.error("Failed to open file:", error);
      ToastMessage("No application available to view this file.");
    }
  }, []);

  // Handle Downloading Document Attachment
  const handleDownloadAttachment = useCallback((url, fileName) => {
    if (url) {
      Linking.openURL(url).catch(() => ToastMessage("Cannot download attachment."));
    } else {
      ToastMessage("Download link not available.");
    }
  }, []);

  // Document Picker
  const handlePickDocument = async () => {
    try {
      const picked = await pickDocuments(true);
      if (picked && picked.length > 0) {
        setSelectedFiles((prev) => [...prev, ...picked]);
      }
    } catch (err) {
      ToastMessage("Error selecting files.");
    }
  };

  // Load Screen Data
  const loadScreenData = useCallback(async () => {
    if (!tourId) return;

    try {
      // 1. Fetch CCBS Allocation List
      const ccbsRes = await fetchCcbsList({ type: "1", tour: tourId }).unwrap();
      if (Array.isArray(ccbsRes) && ccbsRes.length > 0) {
        setCcbsList(
          ccbsRes.map((item) => ({
            id: item.id,
            bsid: item.bsid,
            ccid: item.ccid,
            bs_data: item.bs_data,
            cc_data: item.cc_data,
            amount: String(item.amount ?? ""),
            percentage: String(item.percentage ?? ""),
          }))
        );
      }

      // 2. Fetch Advance Details & Patch Payload
      const detailsRes = await fetchAdvanceDetails({
        tour_no: tourId,
      }).unwrap();

      if (detailsRes?.reason_id) {
        const bsccRes = await fetchTourBsCc({
          reason: detailsRes.reason_id,
        }).unwrap();

        if (Array.isArray(bsccRes?.data)) {
          const bs = [];
          const cc = [];

          bsccRes.data.forEach((item) => {
            if (item.bs_data) {
              bs.push({
                id: item.bs_data.id,
                name: item.bs_data.code_name,
                code: item.bs_data.code,
                raw: item.bs_data,
              });
            }

            if (item.cc_data) {
              cc.push({
                id: item.cc_data.id,
                name: item.cc_data.code_name,
                code: item.cc_data.code,
                raw: item.cc_data,
              });
            }
          });

          setBsList(bs);
          setCcList(cc);
        }
      }

      if (detailsRes) {
        setTourDetails((prev) => ({
          ...prev,
          reqNo: detailsRes.requestno || prev.reqNo,
          requestDate: detailsRes.requestdate || prev.requestDate,
          reason: detailsRes.reason || prev.reason,
          startDate: detailsRes.startdate || prev.startDate,
          endDate: detailsRes.enddate || prev.endDate,
          branchName: detailsRes.branch_name || prev.branchName,
        }));

        if (detailsRes.remarks) {
          setRemarks(detailsRes.remarks);
        }

        if (detailsRes?.approver_branch_data) {
          const branch = detailsRes.approver_branch_data;
          setSelectedBranch({
            id: branch.branch_id,
            code: branch.branch_code,
            name: `(${branch.branch_code}) ${branch.branch_name}`,
          });
        }

        if (detailsRes?.approver_data) {
          const approver = detailsRes.approver_data;
          setSelectedApprover({
            id: approver.id,
            code: approver.code,
            name: `(${approver.code}) ${approver.name}`,
          });
        }

        if (Array.isArray(detailsRes?.detail)) {
          setAdvanceList(
            detailsRes.detail.map((item) => ({
              id: item.id,
              reason: item.reason || "",
              reqamount: String(item.reqamount ?? ""),
              appamount: String(item.appamount ?? ""),
              crnno: item.crnno || "",
              statuss: item.status_name || "",
              status: item.status,
              invoiceheadergid: item.invoiceheadergid,
            }))
          );
        }

        if (Array.isArray(detailsRes.approve)) {
          setApprovalFlowList(detailsRes.approve);
        }
      }

      // 3. Fallback Approval Flow Query
      const flowRes = await fetchApprovalFlow(tourId).unwrap();
      if (flowRes?.approve && (!detailsRes?.approve || detailsRes.approve.length === 0)) {
        setApprovalFlowList(flowRes.approve);
      }

      // 4. Fetch Documents
      try {
        const docsRes = await fetchDocumentGet(tourId).unwrap();
        setTourMakerAttachments(docsRes?.tour_maker || []);
        setAdvanceMakerAttachments(docsRes?.advance_maker || []);
        setAdvanceApproverAttachments(docsRes?.advance_approver || []);
      } catch (docErr) {
        setTourMakerAttachments([]);
        setAdvanceMakerAttachments([]);
        setAdvanceApproverAttachments([]);
      }
    } catch (err) {
      console.warn("Error loading advance approview details:", err);
    }
  }, [tourId]);

  useEffect(() => {
    loadScreenData();
  }, [loadScreenData]);

  // Totals Calculations
  const requestedTotal = useMemo(() => {
    return advanceList.reduce((acc, curr) => acc + (parseFloat(curr.reqamount) || 0), 0);
  }, [advanceList]);

  const approvedTotal = useMemo(() => {
    return advanceList.reduce((acc, curr) => acc + (parseFloat(curr.appamount) || 0), 0);
  }, [advanceList]);

  // Status Text Mapping
  const getAdvanceStatusText = (status, apptype = "ADVANCE CREATION") => {
    const statusNum = Number(status);
    const typeStr = String(apptype || "").toUpperCase();

    if (typeStr.includes("TOUR")) {
      switch (statusNum) {
        case 1:
          return "Tour Request Submitted";
        case 2:
          return "Tour Request Submitted To Approver";
        case 3:
          return "Tour Request Approved";
        case 4:
          return "Tour Request Rejected";
        case 5:
          return "Tour Request Returned From Approver";
        default:
          return String(status || "PENDING");
      }
    } else {
      switch (statusNum) {
        case 1:
          return "Tour Advance Submitted";
        case 2:
          return "Tour Advance Pending with Approver";
        case 3:
          return "Tour Advance Approved";
        case 4:
          return "Tour Advance Rejected";
        case 5:
          return "Tour Advance Returned From Approver";
        case 15:
        case 17:
          return "Tour Advance Cancel Submitted";
        default:
          return String(status || "PENDING");
      }
    }
  };

  // Safe Status Color Theme
  const getStatusColor = (status) => {
    const statusStr = String(status || "").toUpperCase();

    switch (statusStr) {
      case "APPROVED":
      case "3":
        return { bg: CustomColors.statusGreenLite, text: CustomColors.textGreen };
      case "REJECTED":
      case "4":
        return { bg: CustomColors.statusRedLite, text: CustomColors.textRed };
      case "RETURNED":
      case "5":
        return { bg: CustomColors.statusAmberLite, text: CustomColors.textAmber };
      case "PENDING":
      case "2":
      case "0":
        return { bg: CustomColors.primaryLight, text: CustomColors.textBlue };
      default:
        return { bg: CustomColors.primaryLight, text: CustomColors.textBlue };
    }
  };

  // Open Decision Reason Modal
  const openDecisionModal = (type, isCancel = false) => {
    setDecisionType(type);
    setIsCancelDecision(isCancel);
    setActionComment("");
    setDecisionModalVisible(true);
  };

  const closeDecisionModal = () => {
    setDecisionModalVisible(false);
    setActionComment("");
    setDecisionType(null);
    setIsCancelDecision(false);
  };
const authToken = useSelector((s) => s.auth.user?.token);
  const csrfToken = useSelector((s) => s.auth.csrfToken);
  const csrfCookie = useSelector((s) => s.auth.csrfCookie);
  const handleExecuteDecision = async () => {
    if (!actionComment.trim()) {
      ToastMessage("Please enter a reason / comment.");
      return;
    }

    // 1. Construct backend payload
    const payload = {
      id: tourDataParams?.id || tourId,
      tourgid: Number(tourId),
      requestno: tourDataParams?.requestno || tourDetails?.reqNo || "",
      apptype: isCancelDecision ? "AdvanceCancel" : "advance",
      applevel: "1",
      appcomment: actionComment.trim(),
      appamount: Number(approvedTotal || 0),
      status: String(decisionType),
    };

    // Determine endpoint URL
    let endpoint = "/taserv/tourapprove";
    if (decisionType === "4") endpoint = "/taserv/tourreject";
    if (decisionType === "5") endpoint = "/taserv/tourreturn";

    const API_BASE_URL = Environment.taServiceUrl;
    const fullUrl = `${API_BASE_URL}${endpoint}`;

    try {
      // 2. Call reusable multipart uploader
      const response = await uploadMultipart({
        url: fullUrl,
        data: payload,
        files: selectedFiles, // Selected files array
        headers: { authorization: `Token ${authToken}`,
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
        ...(csrfCookie && { 'X-CSRFCookie': csrfCookie }),
       } ,
      });

      console.log("Upload & Decision Response:", response);

      if (response?.status === "success" || response?.status === "SUCCESS") {
        ToastMessage("Decision submitted successfully.");
        closeDecisionModal();
        navigation.goBack();
      } else {
        ToastMessage(response?.description || "Failed to process decision.");
      }
    } catch (err) {
      console.error("Decision Error:", err);
      ToastMessage(err?.message || "Error submitting decision.");
    }
  };

  // Helper title for modal based on decision type
  const getModalTitle = () => {
    if (decisionType === "3") return isCancelDecision ? "Approve Cancel Reason" : "Approve Reason";
    if (decisionType === "4") return isCancelDecision ? "Reject Cancel Reason" : "Reject Reason";
    if (decisionType === "5") return "Return Reason";
    return "Decision Comment";
  };

  const getModalButtonTheme = () => {
    if (decisionType === "3") return { bg: CustomColors.btnGreen, text: CustomColors.textWhite, label: "Approve" };
    if (decisionType === "4") return { bg: CustomColors.dangerRed, text: CustomColors.textWhite, label: "Reject" };
    return { bg: CustomColors.statusYellow, text: CustomColors.textBlack, label: "Return" };
  };

  if (isDetailsLoading) {
    return (
      <View style={[uiStyles.centered, { backgroundColor: CustomColors.appScreenColor }]}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={[uiStyles.loadingText, { color: CustomColors.textDark }]}>
          Loading Advance Request...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[uiStyles.safeArea, { backgroundColor: CustomColors.appScreenColor }]} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={uiStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Tour Overview Card */}
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }]}>
            <View style={uiStyles.cardHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[uiStyles.iconBadge, { backgroundColor: CustomColors.primaryLight }]}>
                  <Icon name="flight-takeoff" size={20} color={CustomColors.appThemeColor} />
                </View>
                <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark }]}>
                  Tour Overview
                </Text>
              </View>
              {tourDetails.reqNo ? (
                <View style={[uiStyles.tourTag, { backgroundColor: CustomColors.backgroundGray2 }]}>
                  <Text style={[uiStyles.tourTagText, { color: CustomColors.textSlate }]}>{tourDetails.reqNo}</Text>
                </View>
              ) : null}
            </View>

            <View style={uiStyles.gridTwoCol}>
              <View style={uiStyles.infoItem}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Requested Date</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{tourDetails.requestDate || "-"}</Text>
              </View>
              <View style={uiStyles.infoItem}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Reason</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{tourDetails.reason || "-"}</Text>
              </View>
            </View>

            <View style={[uiStyles.divider, { backgroundColor: CustomColors.dividerGray }]} />

            <View style={uiStyles.gridTwoCol}>
              <View style={uiStyles.infoItem}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Start Date</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{tourDetails.startDate || "-"}</Text>
              </View>
              <View style={uiStyles.infoItem}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>End Date</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{tourDetails.endDate || "-"}</Text>
              </View>
            </View>
          </View>

          {/* 2. Employee Info Card */}
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }]}>
            <View style={uiStyles.cardHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[uiStyles.iconBadge, { backgroundColor: CustomColors.primaryLight }]}>
                  <Icon name="person" size={20} color={CustomColors.appThemeColor} />
                </View>
                <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark }]}>
                  Employee Details
                </Text>
              </View>

              {tourDetails.onBehalfEnable ? (
                <View style={[uiStyles.statusPill, { backgroundColor: CustomColors.primaryLight }]}>
                  <Text style={[uiStyles.statusPillText, { color: CustomColors.textBlue }]}>
                    On Behalf: {tourDetails.onBehalfName}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={uiStyles.gridTwoCol}>
              <View style={uiStyles.infoItem}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Employee Name</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>
                  {tourDetails.empName} ({tourDetails.empCode})
                </Text>
              </View>
              <View style={uiStyles.infoItem}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Grade / Designation</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>
                  {tourDetails.empGrade} - {tourDetails.empDesignation}
                </Text>
              </View>
            </View>

            {tourDetails.branchName ? (
              <View style={{ marginTop: 8 }}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Branch</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{tourDetails.branchName}</Text>
              </View>
            ) : null}
          </View>

          {/* 3. Advance Breakdown List */}
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }]}>
            <View style={uiStyles.cardHeaderRow}>
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark }]}>
                Advance Breakdown
              </Text>

              <TouchableOpacity
                style={[uiStyles.smallOutlineBtn, { borderColor: CustomColors.appThemeColor }]}
                onPress={() => setCcbsModalVisible(true)}
              >
                <Icon name="pie-chart" size={16} color={CustomColors.appThemeColor} />
                <Text style={[uiStyles.smallOutlineBtnText, { color: CustomColors.appThemeColor }]}>CCBS</Text>
              </TouchableOpacity>
            </View>

            {advanceList.map((item, index) => {
              const statusTheme = getStatusColor(item.statuss);

              return (
                <View
                  key={`adv-${index}`}
                  style={[uiStyles.itemCard, { backgroundColor: CustomColors.backgroundLightGray, borderColor: CustomColors.borderColor }]}
                >
                  <View style={uiStyles.itemCardHeader}>
                    <Text style={[uiStyles.itemCardIndex, { color: CustomColors.textDark }]}>Item #{index + 1}</Text>
                    <View style={[uiStyles.statusPill, { backgroundColor: statusTheme.bg }]}>
                      <Text style={[uiStyles.statusPillText, { color: statusTheme.text }]}>
                        {item.statuss}
                      </Text>
                    </View>
                  </View>

                  <View style={uiStyles.formGroup}>
                    <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Reason</Text>
                    <TextInput
                      style={[uiStyles.textInputDisabled, { backgroundColor: CustomColors.disableInput, color: CustomColors.disableText, borderColor: CustomColors.borderColor }]}
                      value={item.reason}
                      editable={false}
                    />
                  </View>

                  <View style={uiStyles.gridTwoCol}>
                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Requested Amount (₹)</Text>
                      <TextInput
                        style={[uiStyles.textInputDisabled, { backgroundColor: CustomColors.disableInput, color: CustomColors.disableText, borderColor: CustomColors.borderColor }]}
                        value={item.reqamount}
                        editable={false}
                      />
                    </View>

                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Approved Amount (₹)</Text>
                      <TextInput
                        style={[uiStyles.textInputDisabled, { backgroundColor: CustomColors.disableInput, color: CustomColors.disableText, borderColor: CustomColors.borderColor }]}
                        value={item.appamount}
                        editable={false}
                      />
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Total Footer */}
            <View style={[uiStyles.summaryContainer, { borderColor: CustomColors.dividerGray }]}>
              <View style={uiStyles.summaryRow}>
                <Text style={[uiStyles.summaryLabel, { color: CustomColors.textDark }]}>Total Requested:</Text>
                <Text style={[uiStyles.summaryValue, { color: CustomColors.textDark }]}>₹{requestedTotal.toLocaleString()}</Text>
              </View>
              <View style={uiStyles.summaryRow}>
                <Text style={[uiStyles.summaryLabel, { color: CustomColors.textDark }]}>Total Approved:</Text>
                <Text style={[uiStyles.summaryValue, { color: CustomColors.textGreen }]}>₹{approvedTotal.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* 4. Document Attachments */}
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }]}>
            <View style={uiStyles.cardHeaderRow}>
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark }]}>
                Attachments
              </Text>

              <TouchableOpacity
                style={[uiStyles.smallOutlineBtn, { borderColor: CustomColors.appThemeColor }]}
                onPress={handlePickDocument}
              >
                <Icon name="cloud-upload" size={16} color={CustomColors.appThemeColor} />
                <Text style={[uiStyles.smallOutlineBtnText, { color: CustomColors.appThemeColor }]}>Upload File</Text>
              </TouchableOpacity>
            </View>

            {/* Tour Maker Attachments */}
            {tourMakerAttachments.map((file, idx) => (
              <View
                key={`tour-file-${idx}`}
                style={[uiStyles.fileChip, { backgroundColor: CustomColors.backgroundGray2 }]}
              >
                <Icon name="attachment" size={20} color={CustomColors.appThemeColor} />
                <Text style={[uiStyles.fileChipName, { color: CustomColors.textDark }]} numberOfLines={1}>
                  {file.file_name} (Tour Maker)
                </Text>
                <TouchableOpacity style={uiStyles.iconActionBtn} onPress={() => handleViewFile(file)}>
                  <Icon name="visibility" size={20} color={CustomColors.linkBlue} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={uiStyles.iconActionBtn}
                  onPress={() => handleDownloadAttachment(file.url, file.file_name)}
                >
                  <Icon name="file-download" size={20} color={CustomColors.btnGreen} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Advance Maker Attachments */}
            {advanceMakerAttachments.map((file, idx) => (
              <View
                key={`adv-file-${idx}`}
                style={[uiStyles.fileChip, { backgroundColor: CustomColors.backgroundGray2 }]}
              >
                <Icon name="attachment" size={20} color={CustomColors.textGreen} />
                <Text style={[uiStyles.fileChipName, { color: CustomColors.textDark }]} numberOfLines={1}>
                  {file.file_name} (Advance Maker)
                </Text>
                <TouchableOpacity style={uiStyles.iconActionBtn} onPress={() => handleViewFile(file)}>
                  <Icon name="visibility" size={20} color={CustomColors.linkBlue} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={uiStyles.iconActionBtn}
                  onPress={() => handleDownloadAttachment(file.url, file.file_name)}
                >
                  <Icon name="file-download" size={20} color={CustomColors.btnGreen} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Advance Approver Attachments */}
            {advanceApproverAttachments.map((file, idx) => (
              <View
                key={`app-file-${idx}`}
                style={[uiStyles.fileChip, { backgroundColor: CustomColors.backgroundGray2 }]}
              >
                <Icon name="attachment" size={20} color={CustomColors.textYellow} />
                <Text style={[uiStyles.fileChipName, { color: CustomColors.textDark }]} numberOfLines={1}>
                  {file.file_name} (Approver)
                </Text>
                <TouchableOpacity style={uiStyles.iconActionBtn} onPress={() => handleViewFile(file)}>
                  <Icon name="visibility" size={20} color={CustomColors.linkBlue} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={uiStyles.iconActionBtn}
                  onPress={() => handleDownloadAttachment(file.url, file.file_name)}
                >
                  <Icon name="file-download" size={20} color={CustomColors.btnGreen} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Local Selected Files */}
            {selectedFiles.map((file, idx) => (
              <View
                key={`file-${idx}`}
                style={[uiStyles.fileChip, { backgroundColor: CustomColors.backgroundGray2 }]}
              >
                <Icon name="insert-drive-file" size={20} color={CustomColors.appThemeColor} />
                <Text style={[uiStyles.fileChipName, { color: CustomColors.textDark }]} numberOfLines={1}>
                  {file.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}>
                  <Icon name="cancel" size={20} color={CustomColors.iconGray} />
                </TouchableOpacity>
              </View>
            ))}

            {tourMakerAttachments.length === 0 &&
              advanceMakerAttachments.length === 0 &&
              advanceApproverAttachments.length === 0 &&
              selectedFiles.length === 0 && (
                <Text style={[uiStyles.emptyText, { color: CustomColors.textLight }]}>No attachments available.</Text>
              )}
          </View>

          {/* 5. To Approver Info Card */}
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }]}>
            <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark, marginBottom: 10 }]}>
              To Approver
            </Text>

            <View style={uiStyles.gridTwoCol}>
              <View style={uiStyles.infoItem}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Branch</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{selectedBranch?.name || tourDetails.branchName || "-"}</Text>
              </View>
              <View style={uiStyles.infoItem}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Approver</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{selectedApprover?.name || "-"}</Text>
              </View>
            </View>

            {remarks ? (
              <View style={{ marginTop: 10 }}>
                <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>Maker Remarks</Text>
                <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{remarks}</Text>
              </View>
            ) : null}
          </View>

          {/* 6. Approval Flow Trail List */}
          {/* {approvalFlowList.length > 0 && (
            <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }]}>
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark }]}>
                Approval Flow
              </Text>

              {approvalFlowList.map((flow, idx) => {
                const statusText = getAdvanceStatusText(flow.status, flow.apptype);
                const statusTheme = getStatusColor(flow.status);
                return (
                  <View key={`flow-${idx}`} style={[uiStyles.flowCard, { borderColor: CustomColors.dividerGray }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={[uiStyles.flowName, { color: CustomColors.textDark }]}>
                        {flow.approvedby} ({flow.approver_code || flow.approvedby_code})
                      </Text>
                      <View style={[uiStyles.statusPill, { backgroundColor: statusTheme.bg }]}>
                        <Text style={[uiStyles.statusPillText, { color: statusTheme.text }]}>
                          {statusText}
                        </Text>
                      </View>
                    </View>
                    <Text style={[uiStyles.flowMeta, { color: CustomColors.textLight }]}>
                      Type: {flow.apptype || "ADVANCE"} • Date: {flow.approveddate || "-"}
                    </Text>
                    {flow.comment ? <Text style={[uiStyles.flowComment, { color: CustomColors.textDark }]}>{flow.comment}</Text> : null}
                  </View>
                );
              })}
            </View>
          )} */}
        </ScrollView>

        {/* Sticky Decision Footer matching Angular Conditions */}
        <View style={[uiStyles.footerBar, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }]}>
          {showApproveBtn ? (
            <View style={uiStyles.checkerBtnGroup}>
              <TouchableOpacity
                style={[uiStyles.checkerBtn, { backgroundColor: CustomColors.btnGreen }]}
                onPress={() => openDecisionModal("3", false)}
              >
                <Text style={[uiStyles.checkerBtnText, { color: CustomColors.textWhite }]}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[uiStyles.checkerBtn, { backgroundColor: CustomColors.statusOrange }]}
                onPress={() => openDecisionModal("5", false)}
              >
                <Text style={[uiStyles.checkerBtnText, { color: CustomColors.textBlack }]}>Return</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[uiStyles.checkerBtn, { backgroundColor: CustomColors.dangerRed }]}
                onPress={() => openDecisionModal("4", false)}
              >
                <Text style={[uiStyles.checkerBtnText, { color: CustomColors.textWhite }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          ) : showCancelBtn ? (
            <View style={uiStyles.checkerBtnGroup}>
              <TouchableOpacity
                style={[uiStyles.checkerBtn, { backgroundColor: CustomColors.btnGreen }]}
                onPress={() => openDecisionModal("3", true)}
              >
                <Text style={[uiStyles.checkerBtnText, { color: CustomColors.textWhite }]}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[uiStyles.checkerBtn, { backgroundColor: CustomColors.dangerRed }]}
                onPress={() => openDecisionModal("4", true)}
              >
                <Text style={[uiStyles.checkerBtnText, { color: CustomColors.textWhite }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[uiStyles.primaryActionBtn, { backgroundColor: CustomColors.appThemeColor }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[uiStyles.primaryActionBtnText, { color: CustomColors.textWhite }]}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Decision Reason Entry Modal */}
      <Modal visible={decisionModalVisible} animationType="slide" transparent>
        <View style={globalStyles.modalOverlay}>
          <View style={[uiStyles.modalContainer, { backgroundColor: CustomColors.modal_background }]}>
            <View style={[uiStyles.modalHeader, { borderColor: CustomColors.dividerGray }]}>
              <Text style={[uiStyles.modalTitle, { color: CustomColors.textDark }]}>
                {getModalTitle()}
              </Text>
              <TouchableOpacity onPress={closeDecisionModal}>
                <Icon name="close" size={22} color={CustomColors.iconGray} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 15 }}>
              <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark, marginBottom: 8 }]}>
                Comments / Reason *
              </Text>
              <TextInput
                style={[
                  uiStyles.textInput,
                  {
                    height: 100,
                    textAlignVertical: "top",
                    backgroundColor: CustomColors.inputBackground,
                    color: CustomColors.textDark,
                    borderColor: CustomColors.textInputBorderColor,
                  },
                ]}
                value={actionComment}
                onChangeText={setActionComment}
                placeholder={`Enter comments for ${getModalButtonTheme().label.toLowerCase()}...`}
                placeholderTextColor={CustomColors.textLight}
                multiline
              />
            </View>

            <View style={{ padding: 15, borderTopWidth: 1, borderColor: CustomColors.dividerGray, flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
              <TouchableOpacity
                style={[uiStyles.smallOutlineBtn, { borderColor: CustomColors.textDark }]}
                onPress={closeDecisionModal}
                disabled={isDecisionSubmitting}
              >
                <Text style={[uiStyles.smallOutlineBtnText, { color: CustomColors.textDark }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[uiStyles.primaryActionBtn, { backgroundColor: getModalButtonTheme().bg, paddingHorizontal: 20 }]}
                onPress={handleExecuteDecision}
                disabled={isDecisionSubmitting}
              >
                {isDecisionSubmitting ? (
                  <ActivityIndicator color={getModalButtonTheme().text} />
                ) : (
                  <Text style={[uiStyles.primaryActionBtnText, { color: getModalButtonTheme().text }]}>
                    Submit {getModalButtonTheme().label}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CCBS Allocation Modal */}
      <Modal visible={ccbsModalVisible} animationType="slide" transparent>
        <View style={globalStyles.modalOverlay}>
          <View style={[uiStyles.modalContainer, { backgroundColor: CustomColors.modal_background }]}>
            <View style={[uiStyles.modalHeader, { borderColor: CustomColors.dividerGray }]}>
              <Text style={[uiStyles.modalTitle, { color: CustomColors.textDark }]}>
                CCBS (Tour No: {tourDetails.reqNo})
              </Text>
              <TouchableOpacity onPress={() => setCcbsModalVisible(false)}>
                <Icon name="close" size={22} color={CustomColors.iconGray} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 15, paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: moderateScale(12), color: CustomColors.textDark, fontWeight: "600" }}>
                Req Amt: ₹{requestedTotal}
              </Text>
              <Text style={{ fontSize: moderateScale(12), color: CustomColors.textGreen, fontWeight: "600" }}>
                Appr Amt: ₹{approvedTotal}
              </Text>
            </View>

            <ScrollView style={{ padding: 15 }} keyboardShouldPersistTaps="handled">
              {ccbsList.map((ccbs, idx) => (
                <View
                  key={`ccbs-${idx}`}
                  style={[uiStyles.itemCard, { backgroundColor: CustomColors.backgroundGray2, borderColor: CustomColors.borderColor }]}
                >
                  <Text style={[uiStyles.itemCardIndex, { color: CustomColors.textDark }]}>Allocation Row #{idx + 1}</Text>
                  <View style={uiStyles.gridTwoCol}>
                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>BS</Text>
                      <TextInput
                        style={[uiStyles.textInputDisabled, { backgroundColor: CustomColors.disableInput, color: CustomColors.disableText, borderColor: CustomColors.borderColor }]}
                        value={ccbs.bs_data?.name || (bsList.find((x) => x.id === ccbs.bsid)?.name) || "Select BS"}
                        editable={false}
                      />
                    </View>

                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>CC</Text>
                      <TextInput
                        style={[uiStyles.textInputDisabled, { backgroundColor: CustomColors.disableInput, color: CustomColors.disableText, borderColor: CustomColors.borderColor }]}
                        value={ccbs.cc_data?.name || (ccList.find((x) => x.id === ccbs.ccid)?.name) || "Select CC"}
                        editable={false}
                      />
                    </View>
                  </View>

                  <View style={uiStyles.gridTwoCol}>
                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Amount (₹)</Text>
                      <TextInput
                        style={[uiStyles.textInputDisabled, { backgroundColor: CustomColors.disableInput, color: CustomColors.disableText, borderColor: CustomColors.borderColor }]}
                        value={ccbs.amount}
                        editable={false}
                      />
                    </View>

                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Percentage (%)</Text>
                      <TextInput
                        style={[uiStyles.textInputDisabled, { backgroundColor: CustomColors.disableInput, color: CustomColors.disableText, borderColor: CustomColors.borderColor }]}
                        value={ccbs.percentage}
                        editable={false}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={{ padding: 15, borderTopWidth: 1, borderColor: CustomColors.dividerGray }}>
              <TouchableOpacity
                style={[uiStyles.primaryActionBtn, { backgroundColor: CustomColors.appThemeColor }]}
                onPress={() => setCcbsModalVisible(false)}
              >
                <Text style={[uiStyles.primaryActionBtnText, { color: CustomColors.textWhite }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Approval Flow Audit Trail Modal */}
      <Modal visible={approvalFlowModalVisible} animationType="slide" transparent>
        <View style={globalStyles.modalOverlay}>
          <View style={[uiStyles.modalContainer, { backgroundColor: CustomColors.modal_background }]}>
            <View style={[uiStyles.modalHeader, { borderColor: CustomColors.dividerGray }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="alt-route" size={22} color={CustomColors.appThemeColor} />
                <Text style={[uiStyles.modalTitle, { color: CustomColors.textDark }]}>Approval Flow Trail</Text>
              </View>
              <TouchableOpacity onPress={() => setApprovalFlowVisible(false)}>
                <Icon name="close" size={22} color={CustomColors.iconGray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 15 }}>
              {approvalFlowList.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <Text style={[uiStyles.emptyText, { color: CustomColors.textLight }]}>No approval trail available.</Text>
                </View>
              ) : (
                approvalFlowList.map((flow, idx) => {
                  const statusText = getAdvanceStatusText(flow.status, flow.apptype);
                  const statusTheme = getStatusColor(flow.status);
                  return (
                    <View
                      key={`flow-modal-${idx}`}
                      style={[uiStyles.flowCardModal, { backgroundColor: CustomColors.backgroundGray2, borderColor: CustomColors.borderColor }]}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={[uiStyles.flowName, { color: CustomColors.textDark }]}>
                          {flow.approvedby} ({flow.approver_code || flow.approvedby_code})
                        </Text>
                        <View style={[uiStyles.statusPill, { backgroundColor: statusTheme.bg }]}>
                          <Text style={[uiStyles.statusPillText, { color: statusTheme.text }]}>
                            {statusText}
                          </Text>
                        </View>
                      </View>

                      <Text style={[uiStyles.flowMeta, { color: CustomColors.textLight }]}>
                        Type: {flow.apptype || "ADVANCE"} • Date: {flow.approveddate || "-"}
                      </Text>

                      {flow.comment ? (
                        <Text style={[uiStyles.flowComment, { color: CustomColors.textDark }]}>
                          Remark: "{flow.comment}"
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={{ padding: 15, borderTopWidth: 1, borderColor: CustomColors.dividerGray }}>
              <TouchableOpacity
                style={[uiStyles.primaryActionBtn, { backgroundColor: CustomColors.appThemeColor }]}
                onPress={() => setApprovalFlowVisible(false)}
              >
                <Text style={[uiStyles.primaryActionBtnText, { color: CustomColors.textWhite }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdvanceApproviewScreen;

const itemStyles = StyleSheet.create({
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
});

const uiStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: moderateScale(14),
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 20,
  },

  /* Cards */
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: moderateScale(15),
    fontWeight: "700",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tourTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tourTagText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },

  /* Grid */
  gridTwoCol: {
    flexDirection: "row",
    gap: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },

  /* Item Cards */
  itemCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemCardIndex: {
    fontSize: moderateScale(12),
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: moderateScale(10),
    fontWeight: "700",
  },

  /* Inputs */
  formGroup: {
    flex: 1,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: moderateScale(13),
  },
  textInputDisabled: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: moderateScale(13),
  },

  /* Buttons */
  smallOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  smallOutlineBtnText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  smallFillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  smallFillBtnText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },

  /* Summary Footer */
  summaryContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: moderateScale(14),
    fontWeight: "700",
  },

  /* Files Chip */
  emptyText: {
    fontSize: moderateScale(12),
    fontStyle: "italic",
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    gap: 8,
  },
  fileChipName: {
    flex: 1,
    fontSize: moderateScale(12),
  },
  iconActionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  /* Audit Flow Card */
  flowCard: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  flowCardModal: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  flowName: {
    fontSize: moderateScale(13),
    fontWeight: "700",
  },
  flowMeta: {
    fontSize: moderateScale(11),
    marginTop: 4,
  },
  flowComment: {
    fontSize: moderateScale(12),
    marginTop: 6,
    fontStyle: "italic",
  },

  /* Sticky Footer */
  footerBar: {
    padding: 12,
    borderTopWidth: 1,
    elevation: 8,
  },
  primaryActionBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionBtnText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
  checkerBtnGroup: {
    flexDirection: "row",
    gap: 10,
  },
  checkerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  checkerBtnText: {
    fontSize: moderateScale(13),
    fontWeight: "700",
  },

  /* Modal */
  modalContainer: {
    borderRadius: 12,
    maxHeight: "80%",
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
});