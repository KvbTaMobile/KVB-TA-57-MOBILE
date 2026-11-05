import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";

import * as apiHooks from "../../redux/rtk_query/apiSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import { moderateScale } from "../../globalstyles/Metrics";

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */
const disableList = ["APPROVED", "REJECTED"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Angular: datePipe 'dd-MMM-yyyy'
const formatDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

// Angular: omit_special_char  (letters, digits, space only)
const sanitizeText = (t = "") => t.replace(/[^A-Za-z0-9 ]/g, "");

// Angular: appNumberOnly  (digits + single decimal point)
const sanitizeNum = (t = "") => {
  let s = String(t).replace(/[^0-9.]/g, "");
  const i = s.indexOf(".");
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "");
  return s;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// normalise bs / cc objects coming from API
const toOption = (x) => {
  if (!x) return null;
  const id = x.id ?? x.bs_id ?? x.cc_id ?? x.value;
  if (id === undefined || id === null) return null;
  const name =
    x.code_name ||
    x.name ||
    x.full_name ||
    x.label ||
    (x.code ? `${x.code}-${x.name || ""}` : "");
  return {
    id: id,
    code: x.code || "",
    name: name || String(id),
  };
};

const toList = (r) => (Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []);

const emptyAdvanceRow = () => ({
  id: 0,
  reason: "",
  reqamount: "",
  appamount: "",
  crnno: "",
  statuss: "PENDING",
  invoiceheadergid: null,
});

const emptyCcbsRow = () => ({
  id: 0,
  bsid: null,
  ccid: null,
  amount: "",
  percentage: "",
  ccbs_edit_status: null,
});

// safe lazy hook (works even when endpoint is not yet added to apiSlice)
const useSafeLazy = (hookName, fallbackValue) => {
  const hook = apiHooks[hookName];
  return hook
    ? hook()
    : [() => ({ unwrap: async () => fallbackValue }), { isLoading: false }];
};

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

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
const AdvanceEditScreen = ({ route, navigation }) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const { tourDataParams = {}, tour_id = 0, from = "ADVANCE_MAKER" } = route.params || {};

  const isChecker = from === "CHECKER" || from === "ADVANCE_CHECKER" || tourDataParams?.applevel === 1;
  // Angular: checker -> advance_summary.tourid ; maker -> advance_summary.tourgid
  const tourId =
    tour_id ||
    (isChecker ? tourDataParams?.tourid : tourDataParams?.tourgid) ||
    tourDataParams?.tourgid ||
    tourDataParams?.tourid ||
    tourDataParams?.tour_id ||
    tourDataParams?.id ||
    0;
  const advanceId = tourDataParams?.id || 0; // Angular: this.advanceid = advance_summary.id
  const isSpecialPermissionDisabled = Number(tourDataParams?.tour_exist) === 1; // Angular: isDisabled
  const adddisc = tourDataParams?.advance_status !== "APPROVED"; // Angular: adddisc
  const statour = Number(tourDataParams?.tour_status_id); // Angular: statour
  const advanceStatusParam = tourDataParams?.advance_status;
  const onBehalfId =
    tourDataParams?.onbehalfof?.id ?? tourDataParams?.onbehalfid ?? null;

  // Angular: show_approvediv  (checker OR tour already approved)
  const showUploadSection =
    isChecker ||
    String(tourDataParams?.tour_status || "").toUpperCase() === "APPROVED" ||
    statour === 3;

  /* ---------------- state ---------------- */
  const [bsList, setBsList] = useState([]); // default options (tour reason)
  const [ccList, setCcList] = useState([]);
  const [bsOptions, setBsOptions] = useState([]);
  const [ccOptions, setCcOptions] = useState([]);
  const [defaultBs, setDefaultBs] = useState(null);
  const [defaultCc, setDefaultCc] = useState(null);
  const defaultBsRef = useRef(null);
  const defaultCcRef = useRef(null);

  const [tourDetails, setTourDetails] = useState({
    reqNo:
      tourDataParams?.requestno ||
      tourDataParams?.tour_no ||
      tourDataParams?.tourno ||
      tourDataParams?.request_no ||
      tourDataParams?.reqno ||
      tourDataParams?.tourgid ||
      "",
    requestDate:
      tourDataParams?.requestdate ||
      tourDataParams?.request_date ||
      tourDataParams?.requestDate ||
      tourDataParams?.req_date ||
      "",
    reason:
      tourDataParams?.reason ||
      tourDataParams?.tourreason ||
      tourDataParams?.travel_reason ||
      "",
    startDate:
      tourDataParams?.startdate ||
      tourDataParams?.start_date ||
      tourDataParams?.startDate ||
      tourDataParams?.from_date ||
      tourDataParams?.fromdate ||
      "",
    endDate:
      tourDataParams?.enddate ||
      tourDataParams?.end_date ||
      tourDataParams?.endDate ||
      tourDataParams?.enddatee ||
      tourDataParams?.to_date ||
      tourDataParams?.todate ||
      "",
    empName:
      tourDataParams?.employee_name ||
      tourDataParams?.full_name ||
      tourDataParams?.emp_name ||
      tourDataParams?.empname ||
      tourDataParams?.name ||
      "",
    empCode:
      tourDataParams?.employee_code ||
      tourDataParams?.emp_code ||
      tourDataParams?.empcode ||
      tourDataParams?.code ||
      "",
    empGrade:
      tourDataParams?.empgrade ||
      tourDataParams?.grade ||
      tourDataParams?.emp_grade ||
      "",
    empDesignation:
      tourDataParams?.empdesignation ||
      tourDataParams?.designation ||
      tourDataParams?.emp_designation ||
      "",
    onBehalfName:
      tourDataParams?.onbehalfof?.full_name ||
      tourDataParams?.onbehalfof?.name ||
      tourDataParams?.onbehalfname ||
      tourDataParams?.on_behalf_name ||
      "",
    onBehalfEnable: !!(
      tourDataParams?.onbehalfof ||
      tourDataParams?.onbehalfname ||
      tourDataParams?.on_behalf_name
    ),
  });

  const getInitialAdvAmount = () => {
    const val =
      tourDataParams?.requested_amount ??
      tourDataParams?.reqamount ??
      tourDataParams?.req_amount ??
      tourDataParams?.advanceamount ??
      tourDataParams?.advance_amount ??
      tourDataParams?.amount ??
      tourDataParams?.sanctioned_amount ??
      tourDataParams?.advance ??
      tourDataParams?.tour_advance ??
      tourDataParams?.detail?.[0]?.reqamount ??
      tourDataParams?.detail?.[0]?.amount ??
      "";
    return val !== "" && val !== null && val !== undefined ? String(val) : "";
  };

  const getInitialAdvReason = () => {
    return (
      tourDataParams?.reason ||
      tourDataParams?.tourreason ||
      tourDataParams?.travel_reason ||
      tourDataParams?.detail?.[0]?.reason ||
      ""
    );
  };

  const [advanceList, setAdvanceList] = useState(() => {
    const initAmt = getInitialAdvAmount();
    const initReason = getInitialAdvReason();
    return [
      {
        ...emptyAdvanceRow(),
        reqamount: initAmt,
        reason: initReason,
        appamount: isChecker ? initAmt : "",
      },
    ];
  });
  const [ccbsList, setCcbsList] = useState([emptyCcbsRow()]);
  const [loadedCcbsAmt, setLoadedCcbsAmt] = useState(0); // Angular: amt from getccbssum
  const [isCcbsSubmitted, setIsCcbsSubmitted] = useState(false);

  const [ccbsModalVisible, setCcbsModalVisible] = useState(false);
  const [approvalFlowModalVisible, setApprovalFlowVisible] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [branchOptions, setBranchList] = useState([]);
  const [approverOptions, setApproverList] = useState([]);

  const [pickerStatusBranch, setPickerStatusBranch] = useState(false);
  const [pickerStatusApprover, setPickerStatusApprover] = useState(false);
  const [bsPickerVisible, setBsPickerVisible] = useState(false);
  const [ccPickerVisible, setCcPickerVisible] = useState(false);
  const [activeCcbsIdx, setActiveCcbsIdx] = useState(0);

  const [remarks, setRemarks] = useState("");
  const [approverComment, setApproverComment] = useState("");
  const [isChanged, setIsChanged] = useState(false); // Angular: ischanged
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [advanceMakerAttachments, setAdvanceMakerAttachments] = useState([]);
  const [advanceApproverAttachments, setAdvanceApproverAttachments] = useState([]);
  const [totalFileCount, setTotalFileCount] = useState(0);
  const [maxFileLimit, setMaxFileLimit] = useState(10);
  const [approvalFlowList, setApprovalFlowList] = useState([]);

  /* ---------------- API hooks ---------------- */
  const [fetchAdvanceDetails, { isLoading: isDetailsLoading }] = useSafeLazy(
    "useLazyGetAdvanceEditDetailsQuery",
    {}
  );
  const [fetchCcbsList] = useSafeLazy("useLazyGetCCBSQuery", []);
  const [fetchApprovalFlow] = useSafeLazy("useLazyGetApprovalFlowQuery", { approve: [] });
  const [fetchTourBsCc] = useSafeLazy("useLazyGetTourBsCcFetchQuery", { data: [] });
  const [fetchDocumentGet] = useSafeLazy("useLazyDocumentDataGetQuery", {});
  const [fetchBranchList] = useSafeLazy("useLazyBranchListQuery", { data: [] });
  const [fetchApprovers] = useSafeLazy("useLazyApproverListQuery", { data: [] });
  // NEW endpoints (add in apiSlice – see notes)
  const [fetchBusinessSegment] = useSafeLazy("useLazyGetBusinessSegmentsQuery", { data: [] });
  const [fetchCostCenter] = useSafeLazy("useLazyGetCcSegmentsQuery", { data: [] });
  const [fetchAdvancePdf] = useSafeLazy("useLazyGetAdvancePdfQuery", null);
  const [fetchFileLimit] = useSafeLazy("useLazyGetFileUploadLimitQuery", null);

  const [submitAdvance, { isLoading: isSubmitting }] = apiHooks.useTourSubmitMutation
    ? apiHooks.useTourSubmitMutation()
    : [async () => ({}), { isLoading: false }];
  const [approveTour] = apiHooks.useTourApproveMutation ? apiHooks.useTourApproveMutation() : [async () => ({})];
  const [rejectTour] = apiHooks.useTourRejectMutation ? apiHooks.useTourRejectMutation() : [async () => ({})];
  const [returnTour] = apiHooks.useTourReturnMutation ? apiHooks.useTourReturnMutation() : [async () => ({})];

  /* ---------------- header ---------------- */
  const HeaderRight = useCallback(
    () => (
      <TouchableOpacity onPress={() => setApprovalFlowVisible(true)} style={{ marginRight: 15, padding: 4 }}>
        <Icon name="visibility" size={26} color={CustomColors.white} />
      </TouchableOpacity>
    ),
    [CustomColors.white]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isChecker ? "Advance Request Approval" : "eClaim Advance",
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerTintColor: CustomColors.textWhite,
      headerTitleStyle: { fontWeight: "700", fontSize: moderateScale(18) },
      headerRight: HeaderRight,
    });
  }, [navigation, CustomColors, isChecker, HeaderRight]);

  // Angular: notification.showError on init when tour_exist == 1
  useEffect(() => {
    if (isSpecialPermissionDisabled) {
      ToastMessage("This Travel advance need a special permission for the claim enable");
    }
  }, [isSpecialPermissionDisabled]);

  /* ---------------- file open ---------------- */
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
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      csv: "text/csv",
    };
    return mimeTypes[ext] || "*/*";
  };

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
          flags: 1,
        });
      } else {
        await WebBrowser.openBrowserAsync(fileUrl);
      }
    } catch (error) {
      console.error("Failed to open file:", error);
      ToastMessage("No application available to view this file.");
    }
  }, []);

  /* ---------------- loaders ---------------- */
  const loadBranches = useCallback(async () => {
    try {
      const res = await fetchBranchList({ name: "", page: 1 }).unwrap();
      if (res?.data) {
        setBranchList(
          res.data.map((b) => ({ id: b.id, name: `(${b.code}) ${b.name}`, code: b.code, rawName: b.name }))
        );
      }
    } catch (err) {
      console.warn("Error fetching branches:", err);
    }
  }, [fetchBranchList]);

  const loadApprovers = useCallback(
    async (branchId) => {
      if (!branchId) return;
      try {
        const res = await fetchApprovers({
          branch: branchId,
          page: 1,
          type: "tour",
          onbehalf: onBehalfId,
        }).unwrap();
        if (res?.data) {
          setApproverList(
            res.data.map((emp) => ({
              id: emp.id,
              name: `(${emp.code}) ${emp.full_name || emp.name}${emp.employee_designation ? " - " + emp.employee_designation : ""}`,
              code: emp.code,
            }))
          );
        }
      } catch (err) {
        console.warn("Error fetching approvers:", err);
      }
    },
    [fetchApprovers, onBehalfId]
  );

  const loadFileLimit = useCallback(async () => {
    try {
      const res = await fetchFileLimit({ table_name: "file_upload_rate_limit" }).unwrap();
      const v = Number(res?.data?.[0]?.value);
      if (v > 0) setMaxFileLimit(v);
    } catch (e) {
      /* keep default */
    }
  }, [fetchFileLimit]);

  const loadScreenData = useCallback(async () => {
    if (!tourId) {
      console.warn("[AdvanceEdit] tourId missing. params:", JSON.stringify(tourDataParams));
      return;
    }
    console.log("[AdvanceEdit] loading tourId:", tourId, "| isChecker:", isChecker);

    loadBranches();
    loadFileLimit();

    // ---- helpers (response-shape tolerant) ----
    const listOf = (r) =>
      Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : Array.isArray(r?.results) ? r.results : [];

    const normDetails = (r) => {
      if (!r) return null;
      if (r.detail || r.reason !== undefined || r.reason_id !== undefined) return r;
      if (r.data && (r.data.detail || r.data.reason !== undefined)) return r.data;
      return r;
    };

    // object OR plain id -> option
    const pickOpt = (obj, idVal, nameVal, codeVal) => {
      if (obj && typeof obj === "object") {
        const opt = toOption(obj);
        if (opt && opt.name && opt.name !== String(opt.id)) return opt;
      }
      const id = idVal ?? (typeof obj === "number" || typeof obj === "string" ? obj : null);
      if (id !== undefined && id !== null && id !== "") {
        return {
          id: id,
          code: codeVal || (obj && typeof obj === "object" ? obj.code : "") || "",
          name: nameVal || (obj && typeof obj === "object" ? obj.name : "") || String(id),
        };
      }
      return null;
    };

    // try several arg shapes until one returns valid data
    const callFirst = async (trigger, args, isValid, label) => {
      for (const arg of args) {
        try {
          const res = await trigger(arg).unwrap();
          if (isValid(res)) {
            console.log(`[AdvanceEdit] ${label} OK with arg`, JSON.stringify(arg));
            return res;
          }
          console.log(`[AdvanceEdit] ${label} returned empty for arg`, JSON.stringify(arg));
        } catch (e) {
          console.warn(`[AdvanceEdit] ${label} failed for arg`, JSON.stringify(arg), e?.status || e?.message || e);
        }
      }
      return null;
    };

    // ---------- 1. Advance details (rows, approver, header) ----------
    let detailsRes = null;
    let detailArr = [];
    const fallbackHeaderAmt =
      tourDataParams?.requested_amount ??
      tourDataParams?.reqamount ??
      tourDataParams?.advanceamount ??
      tourDataParams?.advance_amount ??
      tourDataParams?.amount ??
      tourDataParams?.sanctioned_amount ??
      tourDataParams?.advance ??
      tourDataParams?.tour_advance ??
      "";
    let headerAdvAmtStr =
      fallbackHeaderAmt !== "" && fallbackHeaderAmt !== null && fallbackHeaderAmt !== undefined
        ? String(fallbackHeaderAmt)
        : "";
    try {
      const raw = await callFirst(
        fetchAdvanceDetails,
        [{ tour_no: tourId }, tourId, { tour_id: tourId }, { id: tourId }],
        (r) => {
          const n = normDetails(r);
          return !!n && (Array.isArray(n.detail) || n.reason !== undefined || n.reason_id !== undefined);
        },
        "advance details"
      );
      detailsRes = normDetails(raw);
      console.log("[AdvanceEdit] details keys:", detailsRes ? Object.keys(detailsRes) : null);

      if (detailsRes) {
        setTourDetails((prev) => ({
          ...prev,
          reqNo:
            detailsRes.requestno ||
            detailsRes.tour_no ||
            detailsRes.tourno ||
            detailsRes.reqno ||
            prev.reqNo,
          requestDate:
            detailsRes.requestdate ||
            detailsRes.request_date ||
            detailsRes.requestDate ||
            prev.requestDate,
          reason:
            detailsRes.reason ||
            detailsRes.tourreason ||
            detailsRes.travel_reason ||
            prev.reason,
          startDate:
            detailsRes.startdate ||
            detailsRes.start_date ||
            detailsRes.startDate ||
            prev.startDate,
          endDate:
            detailsRes.enddate ||
            detailsRes.end_date ||
            detailsRes.endDate ||
            prev.endDate,
          empName:
            detailsRes.employee_name ||
            detailsRes.full_name ||
            detailsRes.emp_name ||
            prev.empName,
          empCode:
            detailsRes.employee_code ||
            detailsRes.emp_code ||
            prev.empCode,
          empGrade:
            detailsRes.empgrade ||
            detailsRes.grade ||
            detailsRes.emp_grade ||
            prev.empGrade,
          empDesignation:
            detailsRes.empdesignation ||
            detailsRes.designation ||
            detailsRes.emp_designation ||
            prev.empDesignation,
        }));

        if (detailsRes.remarks) setRemarks(sanitizeText(detailsRes.remarks));

        // approver branch + approver
        const ab = detailsRes.approver_branch_data || tourDataParams?.approver_branch_data;
        if (ab) {
          setSelectedBranch({
            id: ab.branch_id || ab.id,
            code: ab.branch_code || ab.code,
            name: `(${ab.branch_code || ab.code}) ${ab.branch_name || ab.name}`,
          });
          if (!isChecker) await loadApprovers(ab.branch_id || ab.id);

          const emp = detailsRes.approver_data || tourDataParams?.approver_data || ab;
          if (emp?.id) {
            setSelectedApprover({
              id: emp.id,
              code: emp.code,
              name: `(${emp.code}) ${emp.full_name || emp.name || ""}`,
            });
          }
        } else if (tourDataParams?.branch_id || tourDataParams?.branch_name) {
          setSelectedBranch({
            id: tourDataParams.branch_id || tourDataParams.branchid,
            code: tourDataParams.branch_code || tourDataParams.branchcode || "",
            name: `(${tourDataParams.branch_code || ""}) ${tourDataParams.branch_name || tourDataParams.branch || ""}`.trim(),
          });
          if (tourDataParams.branch_id) await loadApprovers(tourDataParams.branch_id);
          if (tourDataParams.approver_id || tourDataParams.approvedby || tourDataParams.approver_name) {
            setSelectedApprover({
              id: tourDataParams.approver_id || tourDataParams.approverid,
              code: tourDataParams.approver_code || "",
              name: `(${tourDataParams.approver_code || ""}) ${tourDataParams.approvedby || tourDataParams.approver_name || ""}`.trim(),
            });
          }
        }
      } else {
        // Fallback for new advance requests where detailsRes is not yet available
        const ab = tourDataParams?.approver_branch_data;
        if (ab) {
          setSelectedBranch({
            id: ab.branch_id || ab.id,
            code: ab.branch_code || ab.code,
            name: `(${ab.branch_code || ab.code}) ${ab.branch_name || ab.name}`,
          });
          if (!isChecker) await loadApprovers(ab.branch_id || ab.id);

          const emp = tourDataParams?.approver_data || ab;
          if (emp?.id) {
            setSelectedApprover({
              id: emp.id,
              code: emp.code,
              name: `(${emp.code}) ${emp.full_name || emp.name || ""}`,
            });
          }
        } else if (tourDataParams?.branch_id || tourDataParams?.branch_name) {
          setSelectedBranch({
            id: tourDataParams.branch_id || tourDataParams.branchid,
            code: tourDataParams.branch_code || tourDataParams.branchcode || "",
            name: `(${tourDataParams.branch_code || ""}) ${tourDataParams.branch_name || tourDataParams.branch || ""}`.trim(),
          });
          if (tourDataParams.branch_id) await loadApprovers(tourDataParams.branch_id);
          if (tourDataParams.approver_id || tourDataParams.approvedby || tourDataParams.approver_name) {
            setSelectedApprover({
              id: tourDataParams.approver_id || tourDataParams.approverid,
              code: tourDataParams.approver_code || "",
              name: `(${tourDataParams.approver_code || ""}) ${tourDataParams.approvedby || tourDataParams.approver_name || ""}`.trim(),
            });
          }
        }
      }

        const headerAdvAmt =
          detailsRes?.reqamount ??
          detailsRes?.requested_amount ??
          detailsRes?.amount ??
          detailsRes?.advanceamount ??
          detailsRes?.advance_amount ??
          detailsRes?.sanctioned_amount ??
          detailsRes?.advance ??
          detailsRes?.tour_advance ??
          tourDataParams?.requested_amount ??
          tourDataParams?.reqamount ??
          tourDataParams?.advanceamount ??
          tourDataParams?.advance_amount ??
          tourDataParams?.amount ??
          tourDataParams?.sanctioned_amount ??
          tourDataParams?.advance ??
          tourDataParams?.tour_advance ??
          "";
        headerAdvAmtStr =
          headerAdvAmt !== "" && headerAdvAmt !== null && headerAdvAmt !== undefined
            ? String(headerAdvAmt)
            : headerAdvAmtStr;

        const headerReason =
          detailsRes?.reason ||
          detailsRes?.tourreason ||
          tourDataParams?.reason ||
          tourDataParams?.tourreason ||
          "";

        // advance rows
        detailArr = Array.isArray(detailsRes.detail) ? detailsRes.detail : listOf(detailsRes.detail);
        if (detailArr.length > 0) {
          setAdvanceList(
            detailArr.map((item) => {
              const st = item.status_name || item.statuss || "";
              const rowReq =
                item.reqamount ??
                item.requested_amount ??
                item.amount ??
                item.advance_amount ??
                item.advanceamount ??
                item.sanctioned_amount ??
                (headerAdvAmtStr || "");
              let app = item.appamount ?? item.approved_amount;
              if (st === "APPROVED" && (app === undefined || app === null || app === "")) {
                app = item.appamount ?? rowReq;
              } else if (st === "PENDING" && (advanceStatusParam === "RETURNED" || isChecker)) {
                app = item.appamount ?? app ?? (isChecker ? rowReq : "");
              }
              return {
                id: item.id || 0,
                reason: item.reason || headerReason || "",
                reqamount: rowReq !== "" && rowReq !== null && rowReq !== undefined ? String(rowReq) : "",
                appamount: app === null || app === undefined ? "" : String(app),
                crnno: item.crnno || "",
                statuss: st || "PENDING",
                status: item.status,
                invoiceheadergid: item.invoiceheadergid,
              };
            })
          );
        } else {
          // If detailArr is empty, auto-patch advance details row with the advance amount
          setAdvanceList((prev) => {
            const first = prev && prev.length > 0 ? prev[0] : emptyAdvanceRow();
            const existingAmt = first.reqamount || "";
            const finalAmt = existingAmt || headerAdvAmtStr;
            return [
              {
                ...first,
                reason: first.reason || headerReason || "",
                reqamount: finalAmt,
                appamount: isChecker ? (first.appamount || finalAmt) : (first.appamount || ""),
              },
            ];
          });
        }
      } catch (e) {
        console.warn("[AdvanceEdit] details patch error:", e);
      }

    // ---------- 2. CCBS ----------
    let ccbsRows = [];
    try {
      const ccbsRaw = await callFirst(
        fetchCcbsList,
        [{ tour_id: tourId }, tourId, { tour_no: tourId }],
        (r) => listOf(r).length > 0,
        "ccbs"
      );
      const arr = listOf(ccbsRaw);
      console.log("[AdvanceEdit] ccbs count:", arr.length, arr[0] ? Object.keys(arr[0]) : "");
      if (arr.length > 0) {
        ccbsRows = arr.map((item) => ({
          id: item.id,
          bsid: pickOpt(item.bs_data || item.bs, item.bs_id || item.bsid, item.bs_name),
          ccid: pickOpt(item.cc_data || item.cc, item.cc_id || item.ccid, item.cc_name),
          amount: String(item.amount ?? ""),
          percentage: String(item.percentage ?? ""),
          ccbs_edit_status: item.ccbs_edit_status ?? null,
        }));
        setCcbsList(ccbsRows);
        setLoadedCcbsAmt(
          arr.reduce((a, i) => (Number(i.ccbs_edit_status) === 1 ? a + Number(i.amount || 0) : a), 0)
        );

        // Auto-patch advance details row from CCBS amount if row has no amount yet
        const ccbsFirstAmt = ccbsRows[0]?.amount ? String(ccbsRows[0].amount) : "";
        const ccbsSumAmt = arr.reduce((a, i) => a + Number(i.amount || 0), 0);
        const candidateCcbsAmt =
          ccbsFirstAmt || (ccbsSumAmt > 0 ? String(round2(ccbsSumAmt)) : "");

        if (candidateCcbsAmt && Number(candidateCcbsAmt) > 0) {
          setAdvanceList((prev) => {
            const hReason =
              detailsRes?.reason ||
              tourDataParams?.reason ||
              tourDataParams?.tourreason ||
              "";
            if (!prev || prev.length === 0) {
              return [
                {
                  ...emptyAdvanceRow(),
                  reqamount: candidateCcbsAmt,
                  reason: hReason,
                  appamount: isChecker ? candidateCcbsAmt : "",
                },
              ];
            }
            if (!prev[0].reqamount || Number(prev[0].reqamount) === 0) {
              const copy = [...prev];
              copy[0] = {
                ...copy[0],
                reqamount: candidateCcbsAmt,
                reason: copy[0].reason || hReason,
                appamount: isChecker ? (copy[0].appamount || candidateCcbsAmt) : copy[0].appamount,
              };
              return copy;
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.warn("[AdvanceEdit] ccbs patch error:", e);
    }

    // ---------- 3. Default BS / CC from tour reason / employee BS-CC ----------
    let dBs = null;
    let dCc = null;

    try {
      const reasonId = detailsRes?.reason_id || tourDataParams?.reason_id;
      if (reasonId) {
        try {
          const bsccRes = await fetchTourBsCc({ reason: reasonId }).unwrap();
          const data = listOf(bsccRes);
          const firstItem = data[0] || (bsccRes && typeof bsccRes === "object" ? bsccRes : null);
          if (firstItem) {
            dBs = toOption(firstItem.bs_data || firstItem.bs || (firstItem.bs_id ? { id: firstItem.bs_id, name: firstItem.bs_name } : null));
            dCc = toOption(firstItem.cc_data || data[1]?.cc_data || firstItem.cc || (firstItem.cc_id ? { id: firstItem.cc_id, name: firstItem.cc_name } : null));
          }
        } catch (e) {}
      }
    } catch (e) {}

    if (!dBs) {
      dBs = pickOpt(
        detailsRes?.bs_data || tourDataParams?.bs_data || detailsRes?.detail?.[0]?.bs_data,
        detailsRes?.bs_id || detailsRes?.bsid || tourDataParams?.bs_id || tourDataParams?.bsid || detailsRes?.detail?.[0]?.bs_id,
        detailsRes?.bs_name || tourDataParams?.bs_name || detailsRes?.detail?.[0]?.bs_name
      );
    }
    if (!dCc) {
      dCc = pickOpt(
        detailsRes?.cc_data || tourDataParams?.cc_data || detailsRes?.detail?.[0]?.cc_data,
        detailsRes?.cc_id || detailsRes?.ccid || tourDataParams?.cc_id || tourDataParams?.ccid || detailsRes?.detail?.[0]?.cc_id,
        detailsRes?.cc_name || tourDataParams?.cc_name || detailsRes?.detail?.[0]?.cc_name
      );
    }

    try {
      const bsRes = await fetchBusinessSegment({ query: "", page: 1 }).unwrap();
      const bsArr = toList(bsRes).map(toOption).filter(Boolean);
      if (bsArr.length > 0) {
        setBsList(bsArr);
        setBsOptions(bsArr);
        if (!dBs) dBs = bsArr[0];
      }
      const bsIdToUse = dBs?.id || bsArr[0]?.id;
      if (bsIdToUse) {
        const ccRes = await fetchCostCenter({ query: "", bs_id: bsIdToUse, page: 1 }).unwrap();
        const ccArr = toList(ccRes).map(toOption).filter(Boolean);
        if (ccArr.length > 0) {
          setCcList(ccArr);
          setCcOptions(ccArr);
          if (!dCc) dCc = ccArr[0];
        }
      }
    } catch (e) {
      console.warn("[AdvanceEdit] tour bs/cc error:", e);
    }

    if (dBs) {
      defaultBsRef.current = dBs;
      setDefaultBs(dBs);
    }
    if (dCc) {
      defaultCcRef.current = dCc;
      setDefaultCc(dCc);
    }

    if (ccbsRows.length === 0) {
      const firstAdv = detailArr?.[0] || advanceList?.[0];
      const initAmt = firstAdv?.reqamount
        ? String(firstAdv.reqamount)
        : (headerAdvAmtStr || "");
      setCcbsList([
        {
          ...emptyCcbsRow(),
          bsid: dBs || null,
          ccid: dCc || null,
          amount: initAmt,
          percentage: initAmt ? "100" : "",
        },
      ]);
    } else {
      setCcbsList(
        ccbsRows.map((r, i) => {
          if (i === 0) {
            return {
              ...r,
              bsid: (r.bsid && r.bsid.name) ? r.bsid : (dBs || r.bsid),
              ccid: (r.ccid && r.ccid.name) ? r.ccid : (dCc || r.ccid),
            };
          }
          return r;
        })
      );
    }

    // ---------- 4. Approval flow ----------
    try {
      let flow = listOf(detailsRes?.approve);
      const flowRes = await fetchApprovalFlow(tourId).unwrap();
      const flowArr = listOf(flowRes?.approve);
      if (isChecker || flow.length === 0) flow = flowArr.length ? flowArr : flow;
      setApprovalFlowList(flow);

      if (isChecker) {
        const advFlow = flow.filter((r) => r.apptype === "ADVANCE CREATION");
        const last = advFlow[advFlow.length - 1];
        if (last && Number(last.status) !== 2) {
          setIsChanged(true);
          setApproverComment(last.comment || "");
        }
      }
    } catch (e) {
      console.warn("[AdvanceEdit] approval flow error:", e);
    }

    // ---------- 5. Documents ----------
    try {
      const docsRes = await fetchDocumentGet(tourId).unwrap();
      setAdvanceMakerAttachments(docsRes?.advance_maker || []);
      setAdvanceApproverAttachments(docsRes?.advance_approver || []);
      setTotalFileCount(docsRes?.advance_file_count || 0);
    } catch (e) {
      setAdvanceMakerAttachments([]);
      setAdvanceApproverAttachments([]);
    }
  }, [tourId]);

  useEffect(() => {
    loadScreenData();
  }, [loadScreenData]);

  /* ---------------- derived values ---------------- */
  const requestedTotal = useMemo(
    () => advanceList.reduce((a, c) => a + (parseFloat(c.reqamount) || 0), 0),
    [advanceList]
  );
  const approvedTotal = useMemo(
    () => advanceList.reduce((a, c) => a + (parseFloat(c.appamount) || 0), 0),
    [advanceList]
  );

  // Angular: this.amt  (last row requested amount for maker / ccbs total for checker)
  const ccbsBaseAmt = useMemo(() => {
    if (isChecker) return round2(loadedCcbsAmt);
    const last = advanceList[advanceList.length - 1];
    if (last && !disableList.includes(last.statuss)) {
      const v = round2(last.reqamount);
      if (v > 0) return v;
    }
    return round2(loadedCcbsAmt);
  }, [advanceList, isChecker, loadedCcbsAmt]);

  // Angular: [disabled]='adddisc || !disableList.includes(last.statuss) || applevel == 1'
  const isAddAdvanceDisabled = useMemo(() => {
    const last = advanceList[advanceList.length - 1];
    return adddisc || !disableList.includes(last?.statuss) || isChecker;
  }, [advanceList, adddisc, isChecker]);

  // Angular: fieldset disabled
  const isTableLocked = isSpecialPermissionDisabled || isCcbsSubmitted;

  /* ---------------- status helpers ---------------- */
  const getFlowStatusText = (flow) => {
    const s = Number(flow.status);
    if (isChecker) {
      const map = {
        1: "REQUESTED",
        2: "PENDING",
        3: "APPROVED",
        4: "REJECTED",
        5: "RETURNED",
        6: "FORWORDED",
        17: "Tour Advance Cancel Submitted",
      };
      return map[s] || String(flow.status ?? "");
    }
    const t = String(flow.apptype || "").toUpperCase();
    if (t === "TOUR CREATION") {
      const m = {
        1: "Tour Request Submitted",
        2: "Tour Request Submitted To Approver",
        3: "Tour Request Approved",
        4: "Tour Request Rejected",
        5: "Tour Request Returned From Approver",
        6: "Tour Request Forward To Another Employee",
        15: "Tour Request Cancel Submitted To Approver",
      };
      return m[s] || String(flow.status ?? "");
    }
    if (t === "CLAIM CREATION") {
      const m = {
        1: "Tour Claim Submitted",
        2: "Tour Claim Submitted To Approver",
        3: "Tour Claim Approved",
        4: "Tour Claim Rejected",
        5: "Tour Claim Returned From Approver",
      };
      return m[s] || String(flow.status ?? "");
    }
    const m = {
      1: "Tour Advance Submitted",
      2: "Tour Advance Pending with Approver",
      3: "Tour Advance Approved",
      4: "Tour Advance Rejected",
      5: "Tour Advance Returned From Approver",
      15: "Tour Advance Cancel Submitted To Approver",
      17: "Tour Advance Cancel Submitted",
    };
    return m[s] || String(flow.status ?? "");
  };

  const getStatusColor = (status) => {
    const s = String(status || "").toUpperCase();
    switch (s) {
      case "APPROVED":
      case "3":
        return { bg: CustomColors.statusGreenLite, text: CustomColors.textGreen };
      case "REJECTED":
      case "4":
        return { bg: CustomColors.statusRedLite, text: CustomColors.textRed };
      case "RETURNED":
      case "5":
        return { bg: CustomColors.statusAmberLite, text: CustomColors.textAmber };
      default:
        return { bg: CustomColors.primaryLight, text: CustomColors.textBlue };
    }
  };

  /* ---------------- advance row handlers ---------------- */
  const handleAddAdvanceRow = () => {
    if (isAddAdvanceDisabled) return;
    setAdvanceList((prev) => [...prev, emptyAdvanceRow()]);
  };

  // Angular: removeSection + checkStat/checkremove/isDisabled/applevel
  const handleRemoveAdvanceRow = (index) => {
    if (advanceList.length === 1) return;
    setAdvanceList((prev) => prev.filter((_, i) => i !== index));
  };

  const ensureDefaultBsCc = useCallback(async () => {
    try {
      let b = defaultBsRef.current || defaultBs || bsList[0] || null;
      let bArr = bsList;
      if (!b || !b.name) {
        const bsRes = await fetchBusinessSegment({ query: "", page: 1 }).unwrap();
        bArr = toList(bsRes).map(toOption).filter(Boolean);
        if (bArr.length > 0) {
          b = bArr[0];
          setBsList(bArr);
          setBsOptions(bArr);
          defaultBsRef.current = b;
          setDefaultBs(b);
        }
      }

      let c = defaultCcRef.current || defaultCc || ccList[0] || null;
      const bsIdToUse = b?.id || bArr[0]?.id;
      if (bsIdToUse && (!c || !c.name)) {
        const ccRes = await fetchCostCenter({ query: "", bs_id: bsIdToUse, page: 1 }).unwrap();
        const cArr = toList(ccRes).map(toOption).filter(Boolean);
        if (cArr.length > 0) {
          c = cArr[0];
          setCcList(cArr);
          setCcOptions(cArr);
          defaultCcRef.current = c;
          setDefaultCc(c);
        }
      }

      if (b || c) {
        setCcbsList((prev) => {
          if (!prev || prev.length === 0) return prev;
          const copy = [...prev];
          copy[0] = {
            ...copy[0],
            bsid: (copy[0].bsid && copy[0].bsid.name) ? copy[0].bsid : (b || copy[0].bsid),
            ccid: (copy[0].ccid && copy[0].ccid.name) ? copy[0].ccid : (c || copy[0].ccid),
          };
          return copy;
        });
      }
      return { bs: b, cc: c };
    } catch (e) {
      console.warn("[CCBS] ensureDefaultBsCc error:", e);
      return { bs: null, cc: null };
    }
  }, [bsList, ccList, defaultBs, defaultCc, fetchBusinessSegment, fetchCostCenter]);

  const handleAdvanceChange = (text, index, field) => {
    let val = text;
    if (field === "reason") val = sanitizeText(text);
    if (field === "reqamount" || field === "appamount") val = sanitizeNum(text);
    setAdvanceList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });

    // Auto-patch CCBS row when maker enters advance amount
    if (field === "reqamount" && !isChecker && !isCcbsSubmitted) {
      const cleanAmt = sanitizeNum(text);
      const curBs = defaultBsRef.current || defaultBs || bsList[0] || null;
      const curCc = defaultCcRef.current || defaultCc || ccList[0] || null;
      setCcbsList((prev) => {
        const copy = prev && prev.length > 0 ? [...prev] : [emptyCcbsRow()];
        copy[0] = {
          ...copy[0],
          amount: cleanAmt,
          percentage: cleanAmt && Number(cleanAmt) > 0 ? "100" : copy[0].percentage || "",
          bsid: (copy[0].bsid && copy[0].bsid.name) ? copy[0].bsid : (curBs || copy[0].bsid),
          ccid: (copy[0].ccid && copy[0].ccid.name) ? copy[0].ccid : (curCc || copy[0].ccid),
        };
        return copy;
      });

      if (!curBs?.name || !curCc?.name) {
        ensureDefaultBsCc();
      }
    }
  };

  const handleAdvancePdf = async (item) => {
    try {
      const res = await fetchAdvancePdf(item.invoiceheadergid).unwrap();
      const url = typeof res === "string" ? res : res?.url || res?.data?.url;
      if (!url) {
        ToastMessage("PDF not available.");
        return;
      }
      handleViewFile({ url, name: `${item.crnno || "advance"}.pdf` });
    } catch (e) {
      ToastMessage("Unable to download PDF.");
    }
  };

  /* ---------------- approver selection ---------------- */
  const handleBranchSelect = (branchItem) => {
    setSelectedBranch(branchItem);
    setSelectedApprover(null);
    loadApprovers(branchItem.id);
  };
  const brclear = () => {
    setSelectedBranch(null);
    setSelectedApprover(null);
    setApproverList([]);
  };
  const empclear = () => setSelectedApprover(null);

  /* ---------------- files ---------------- */
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (!result.canceled && result.assets) {
        if (selectedFiles.length + result.assets.length > maxFileLimit) {
          ToastMessage(`Maximum ${maxFileLimit} files only allowed`);
          return;
        }
        setSelectedFiles((prev) => [...prev, ...result.assets]);
      }
    } catch (err) {
      ToastMessage("Error selecting files.");
    }
  };

  const handleDownloadAttachment = (url) => {
    if (url) Linking.openURL(url).catch(() => ToastMessage("Cannot download attachment."));
    else ToastMessage("Download link not available.");
  };

  /* ---------------- CCBS logic ---------------- */
  const isCcbsRowReadonly = (row) =>
    Number(row.ccbs_edit_status) === 0 || isChecker || isCcbsSubmitted;

  // Angular: addccbs
  const addCcbsRow = (silent = false) => {
    const last = advanceList[advanceList.length - 1];
    const st = last?.id > 0 ? last?.statuss : null;
    if (st != null && st !== "PENDING" && st !== "RETURNED") return;
    if (!ccbsBaseAmt) {
      if (!silent) ToastMessage("Please Enter Valid Advance Amount...");
      return;
    }
    const vals = ccbsList
      .filter((r) => Number(r.ccbs_edit_status) !== 0)
      .map((r) => parseFloat(r.percentage));
    if (vals.some((v) => isNaN(v))) {
      if (!silent) ToastMessage("Complete the existing CCBS row first.");
      return;
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum < 100) setCcbsList((prev) => [...prev, emptyCcbsRow()]);
    else if (!silent) ToastMessage("Check CCBS Percentage or Amount...");
  };

  // Angular: valuecheck() + modal open
  const openCcbsModal = async () => {
    if (!isChecker && !ccbsBaseAmt) {
      ToastMessage("Please Enter Valid Advance Amount...");
      return;
    }

    let currentBs = defaultBsRef.current || defaultBs || bsList[0] || null;
    let currentCc = defaultCcRef.current || defaultCc || ccList[0] || null;

    if (!currentBs?.name || !currentCc?.name) {
      const fetched = await ensureDefaultBsCc();
      if (fetched.bs) currentBs = fetched.bs;
      if (fetched.cc) currentCc = fetched.cc;
    }

    // Auto-patch values into CCBS row if not yet set
    setCcbsList((prev) => {
      const amtStr = ccbsBaseAmt ? String(ccbsBaseAmt) : "";
      if (!prev || prev.length === 0) {
        return [
          {
            ...emptyCcbsRow(),
            amount: amtStr,
            percentage: amtStr ? "100" : "",
            bsid: currentBs,
            ccid: currentCc,
          },
        ];
      }
      return prev.map((row, i) => {
        if (i === 0) {
          return {
            ...row,
            amount: row.amount || amtStr,
            percentage: row.percentage || (amtStr ? "100" : ""),
            bsid: (row.bsid && row.bsid.name) ? row.bsid : (currentBs || row.bsid),
            ccid: (row.ccid && row.ccid.name) ? row.ccid : (currentCc || row.ccid),
          };
        }
        return row;
      });
    });

    setCcbsModalVisible(true);
  };

  // Angular: ccbs_validation
  const validateCcbs = (rows, idx, field) => {
    const reset = () => {
      const copy = [...rows];
      copy[idx] = { ...copy[idx], percentage: "", amount: "" };
      return copy;
    };
    if (approvedTotal === 0) {
      if (field === "percentage") {
        const sum = rows.reduce((a, r) => a + (Number(r.percentage) || 0), 0);
        if (sum > 100) {
          ToastMessage("Please Enter Valid Percentage as Total Percentage can not be greater than 100");
          return reset();
        }
      } else {
        const sum = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
        if (round2(sum) > ccbsBaseAmt) {
          ToastMessage(
            "Please Enter Valid Amount, as Total CCBS Amount can not be greater than " + ccbsBaseAmt
          );
          return reset();
        }
      }
    } else {
      const sum = rows
        .filter((r) => Number(r.ccbs_edit_status) !== 0)
        .reduce((a, r) => a + (Number(r.percentage) || 0), 0);
      if (sum > 100) {
        ToastMessage(
          "Please Enter Valid Percentage as Total Approved amount Percentage can not be greater than 100"
        );
        return reset();
      }
    }
    return rows;
  };

  const handleCcbsAmountChange = (idx, txt) => {
    const clean = sanitizeNum(txt);
    const next = ccbsList.map((r, i) => (i === idx ? { ...r, amount: clean } : r));
    setCcbsList(validateCcbs(next, idx, "amount"));
  };
  const handleCcbsPercentChange = (idx, txt) => {
    const clean = sanitizeNum(txt);
    const next = ccbsList.map((r, i) => (i === idx ? { ...r, percentage: clean } : r));
    setCcbsList(validateCcbs(next, idx, "percentage"));
  };

  // Angular: percen_calc (blur on amount)
  const handleCcbsAmountBlur = (idx) => {
    const row = ccbsList[idx];
    if (Number(row.ccbs_edit_status) === 0 || isChecker) return;
    const value = ccbsBaseAmt ? (Number(row.amount) / ccbsBaseAmt) * 100 : 0;
    setCcbsList((prev) => {
      const copy = [...prev];
      copy[idx] =
        value > 0
          ? { ...copy[idx], percentage: String(round2(value)) }
          : { ...copy[idx], percentage: "", amount: "" };
      return copy;
    });
  };
  // Angular: amount_calc (blur on percentage)
  const handleCcbsPercentBlur = (idx) => {
    const row = ccbsList[idx];
    if (Number(row.ccbs_edit_status) === 0 || isChecker) return;
    const value = (Number(row.percentage) / 100) * ccbsBaseAmt;
    setCcbsList((prev) => {
      const copy = [...prev];
      copy[idx] =
        value > 0
          ? { ...copy[idx], amount: String(round2(value)) }
          : { ...copy[idx], amount: "", percentage: "" };
      return copy;
    });
  };

  // Angular: removeSection1  (cannot delete the only row / read-only rows)
  const removeCcbsRow = (idx) => {
    setCcbsList((prev) => prev.filter((_, i) => i !== idx));
  };

  // BS / CC pickers
  const openBsPicker = async (idx) => {
    if (isCcbsRowReadonly(ccbsList[idx])) return;
    setActiveCcbsIdx(idx);
    try {
      const res = await fetchBusinessSegment({ query: "", page: 1 }).unwrap();
      const opts = (res?.data || []).map(toOption).filter(Boolean);
      setBsOptions(opts.length ? opts : bsList);
    } catch (e) {
      setBsOptions(bsList);
    }
    setBsPickerVisible(true);
  };

  const loadCcOptions = async (bsId) => {
    try {
      const res = await fetchCostCenter({ query: "", bs_id: bsId, page: 1 }).unwrap();
      const opts = (res?.data || []).map(toOption).filter(Boolean);
      setCcOptions(opts.length ? opts : ccList);
    } catch (e) {
      setCcOptions(ccList);
    }
  };

  const handleBsSelect = (opt) => {
    setCcbsList((prev) => {
      const copy = [...prev];
      copy[activeCcbsIdx] = { ...copy[activeCcbsIdx], bsid: opt, ccid: null };
      return copy;
    });
    loadCcOptions(opt.id);
  };

  const openCcPicker = async (idx) => {
    if (isCcbsRowReadonly(ccbsList[idx])) return;
    const bs = ccbsList[idx]?.bsid;
    if (!bs?.id) {
      ToastMessage("Please select The BS Name");
      return;
    }
    setActiveCcbsIdx(idx);
    await loadCcOptions(bs.id);
    setCcPickerVisible(true);
  };

  const handleCcSelect = (opt) => {
    setCcbsList((prev) => {
      const copy = [...prev];
      copy[activeCcbsIdx] = { ...copy[activeCcbsIdx], ccid: opt };
      return copy;
    });
  };

  // Angular: submitccbs
  const submitCcbs = () => {
    if (!ccbsList || ccbsList.length === 0) {
      ToastMessage("No CCBS data available");
      return;
    }
    let sumPercent = 0;
    let sumAmt = 0;
    for (const row of ccbsList) {
      if (!row.bsid && !row.ccid && !row.amount && !row.percentage) continue;
      if (!row.bsid?.id) return ToastMessage("Please Select The BS Name");
      if (!row.ccid?.id) return ToastMessage("Please Select The CC Name");
      if (!row.percentage || Number(row.percentage) < 0.1)
        return ToastMessage("Please Enter Valid CCBS Percentage");
      if (!row.amount || Number(row.amount) <= 0) return ToastMessage("Please Enter Valid Amount");
      if (Number(row.ccbs_edit_status) === 1 || row.ccbs_edit_status == null) {
        sumAmt += Number(row.amount);
        sumPercent += Number(row.percentage);
      }
    }
    if (Math.abs(sumPercent - 100) > 0.01 || Math.abs(round2(sumAmt) - ccbsBaseAmt) > 0.01) {
      ToastMessage("Check CCBS Percentage and Amount");
      return;
    }
    setIsCcbsSubmitted(true);
    setCcbsModalVisible(false);
    ToastMessage("CCBS Added Successfully....");
  };

  /* ---------------- submit (maker) ---------------- */
  const showApiError = (res, fallback) => {
    if (res?.code === "UNEXPECTED_ERROR" && res?.description === "Duplicate Name")
      return ToastMessage("Duplicate! Code Or Name ...");
    if (res?.code === "UNEXPECTED_ERROR" && res?.description === "Unexpected Internal Server Error")
      return ToastMessage("INVALID_DATA!...");
    if (res?.code === "UNEXPECTED_ERROR" && res?.description?.MESSAGE)
      return ToastMessage(res.description.MESSAGE);
    ToastMessage(
      typeof res?.description === "string" ? res.description : fallback || "Action failed."
    );
  };

  const handleSubmitMakerForm = async () => {
    if (!remarks.trim()) return ToastMessage("Please Enter Remarks");

    if (showUploadSection && selectedFiles.length === 0 && advanceMakerAttachments.length === 0)
      return ToastMessage("please Upload the File");

    if (!selectedApprover?.id) return ToastMessage("Please Select Employee");

    // only rows not APPROVED / REJECTED are sent
    const pending = advanceList.filter((r) => !disableList.includes(r.statuss));
    if (pending.length === 0) return ToastMessage("No new advance to submit.");
    if (!pending[0].reason?.trim()) return ToastMessage("Please Enter Reason");
    if (!pending[0].reqamount || Number(pending[0].reqamount) <= 0)
      return ToastMessage("Please Enter Advance Amount");

    // CCBS validation (Angular: ccbsdata.forEach + sum_percent)
    const mainCcbs = ccbsList.filter(
      (r) => Number(r.ccbs_edit_status) === 1 || r.ccbs_edit_status == null
    );
    const filledCcbs = mainCcbs.filter((r) => r.ccid || r.bsid || r.amount || r.percentage);
    for (const r of filledCcbs) {
      if (!r.ccid?.id || !r.bsid?.id) return ToastMessage("Please Select CCBS");
      if (!r.percentage || Number(r.percentage) < 0.1) return ToastMessage("Please Enter CCBS Percentage");
    }
    const sumPercent = filledCcbs.reduce((a, r) => a + Number(r.percentage || 0), 0);
    if (Math.abs(sumPercent - 100) > 0.01) return ToastMessage("Check CCBS Percentage or Amount...");

    const payload = {
      advance: pending.map((item, i) => ({
        ...(item.id > 0 && { id: item.id }),
        remarks: i === pending.length - 1 ? remarks : "",
        reason: item.reason,
        reqamount: Number(item.reqamount),
        appamount: null,
        tourgid: tourId,
        invoiceheadergid: item.invoiceheadergid ?? null,
        approval: i === pending.length - 1 ? selectedApprover.id : null,
        statuss: item.id > 0 ? item.statuss : null,
        crnno: item.crnno || null,
        pdf: null,
        ...(onBehalfId ? { onbehalfof: onBehalfId } : {}),
      })),
      ccbs: filledCcbs.map((r) => ({
        ...(r.id > 0 && { id: r.id }),
        ccid: r.ccid.id,
        bsid: r.bsid.id,
        amount: Number(r.amount || 0),
        percentage: Number(r.percentage || 0),
        tourgid: tourId,
      })),
    };

    try {
      // NOTE: mutation now receives { data, files } – adapt your apiSlice to build FormData
      const res = await submitAdvance({ data: payload, files: selectedFiles }).unwrap();
      if (res?.status === "SUCCESS" || res?.status === "success") {
        ToastMessage(res?.message || "Advance request submitted successfully.");
        navigation.goBack();
      } else {
        showApiError(res, "Failed to submit request.");
      }
    } catch (err) {
      ToastMessage("Error submitting advance request.");
    }
  };

  /* ---------------- approver actions ---------------- */
  const handleApproverAction = async (actionType) => {
    const pendingRow =
      [...advanceList].reverse().find((r) => !disableList.includes(r.statuss)) ||
      advanceList[advanceList.length - 1];
    const updatingAmt = pendingRow?.appamount;

    if (actionType !== "REJECT" && (updatingAmt === "" || updatingAmt == null))
      return ToastMessage("Please Enter Approve Amount");
    if (!approverComment.trim()) return ToastMessage("Please Enter reason");

    const base = {
      id: advanceId,
      requestno: tourDetails.reqNo,
      apptype: "advance",
      appcomment: approverComment,
    };

    let call;
    if (actionType === "APPROVE") {
      call = approveTour({
        data: {
          ...base,
          tourgid: tourId,
          applevel: "1",
          appamount: Number(updatingAmt),
          status: "3",
        },
        files: selectedFiles,
      });
    } else if (actionType === "REJECT") {
      call = rejectTour({ data: { ...base, tour_id: tourId }, files: selectedFiles });
    } else {
      call = returnTour({
        data: { ...base, tour_id: tourId, appamount: Number(updatingAmt) },
        files: selectedFiles,
      });
    }

    try {
      const res = await call.unwrap();
      if (res?.status === "success" || res?.status === "SUCCESS") {
        const label = { APPROVE: "Approved", REJECT: "Rejected", RETURN: "Returned" }[actionType];
        ToastMessage(`${label} Successfully....`);
        navigation.goBack();
      } else {
        showApiError(res);
      }
    } catch (err) {
      ToastMessage("Error performing action.");
    }
  };

  /* ---------------- render ---------------- */
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

  const inputColors = (disabled) => ({
    backgroundColor: disabled ? CustomColors.disableInput : CustomColors.inputBackground,
    color: disabled ? CustomColors.disableText : CustomColors.textDark,
    borderColor: CustomColors.textInputBorderColor,
  });

  const cardStyle = [uiStyles.card, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }];

  const InfoItem = ({ label, value }) => (
    <View style={uiStyles.infoItem}>
      <Text style={[uiStyles.infoLabel, { color: CustomColors.textLight }]}>{label}</Text>
      <Text style={[uiStyles.infoValue, { color: CustomColors.textDark }]}>{value || "-"}</Text>
    </View>
  );

  const totalSelectedAndExisting = selectedFiles.length;

  return (
    <SafeAreaView style={[uiStyles.safeArea, { backgroundColor: CustomColors.appScreenColor }]} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={uiStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isSpecialPermissionDisabled && (
            <View style={uiStyles.warningBox}>
              <Icon name="warning" size={18} color={CustomColors.dangerRed} />
              <Text style={uiStyles.warningText}>
                This Travel advance need a special permission for the claim enable
              </Text>
            </View>
          )}

          {/* 1. Tour Information */}
          <View style={cardStyle}>
            <View style={uiStyles.cardHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[uiStyles.iconBadge, { backgroundColor: CustomColors.primaryLight }]}>
                  <Icon name="flight-takeoff" size={20} color={CustomColors.appThemeColor} />
                </View>
                <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark }]}>
                  Tour Information
                </Text>
              </View>
              {tourDetails.reqNo ? (
                <View style={[uiStyles.tourTag, { backgroundColor: CustomColors.backgroundGray2 }]}>
                  <Text style={[uiStyles.tourTagText, { color: CustomColors.textSlate }]}>
                    Tour No: {tourDetails.reqNo}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={uiStyles.gridTwoCol}>
              <InfoItem label="Requested Date" value={formatDate(tourDetails.requestDate)} />
              <InfoItem label="Tour Reason" value={tourDetails.reason} />
            </View>
            <View style={[uiStyles.divider, { backgroundColor: CustomColors.dividerGray }]} />
            <View style={uiStyles.gridTwoCol}>
              <InfoItem label="Start Date" value={formatDate(tourDetails.startDate)} />
              <InfoItem label="Tour End Date" value={formatDate(tourDetails.endDate)} />
            </View>
          </View>

          {/* 2. Employee & Advance Details */}
          <View style={cardStyle}>
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
              <InfoItem label="Employee" value={`${tourDetails.empName} (${tourDetails.empCode})`} />
            </View>
            <View style={[uiStyles.divider, { backgroundColor: CustomColors.dividerGray }]} />
            <View style={uiStyles.gridTwoCol}>
              <InfoItem label="Designation" value={tourDetails.empDesignation} />
              <InfoItem label="Grade" value={tourDetails.empGrade} />
            </View>
          </View>

          {/* 3. Advance Breakdown */}
          <View style={cardStyle}>
            <View style={uiStyles.cardHeaderRow}>
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark }]}>
                Advance Details
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[
                    uiStyles.smallFillBtn,
                    {
                      backgroundColor: isSpecialPermissionDisabled
                        ? CustomColors.disableInput
                        : CustomColors.btnGreen,
                    },
                  ]}
                  onPress={openCcbsModal}
                  disabled={isSpecialPermissionDisabled}
                >
                  <Icon name="pie-chart" size={16} color={CustomColors.textWhite} />
                  <Text style={[uiStyles.smallFillBtnText, { color: CustomColors.textWhite }]}>CCBS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    uiStyles.smallFillBtn,
                    { backgroundColor: isAddAdvanceDisabled ? CustomColors.disableInput : CustomColors.appThemeColor },
                  ]}
                  onPress={handleAddAdvanceRow}
                  disabled={isAddAdvanceDisabled}
                >
                  <Icon name="add" size={16} color={CustomColors.textWhite} />
                  <Text style={[uiStyles.smallFillBtnText, { color: CustomColors.textWhite }]}>Advance</Text>
                </TouchableOpacity>
              </View>
            </View>

            {advanceList.map((item, index) => {
              const rowLocked = disableList.includes(item.statuss); // checkdisable / checkStat
              const makerReadonly = rowLocked || isChecker || isTableLocked;
              const approvedReadonly = !isChecker || rowLocked || isChanged || isTableLocked;
              const statusTheme = getStatusColor(item.statuss);
              const canDelete = !rowLocked && !isChecker && !isSpecialPermissionDisabled && advanceList.length > 1;

              return (
                <View
                  key={`adv-${index}`}
                  style={[
                    uiStyles.itemCard,
                    { backgroundColor: CustomColors.backgroundLightGray, borderColor: CustomColors.borderColor },
                  ]}
                >
                  <View style={uiStyles.itemCardHeader}>
                    <Text style={[uiStyles.itemCardIndex, { color: CustomColors.textDark }]}>S.No {index + 1}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {item.statuss === "APPROVED" && item.invoiceheadergid ? (
                        <TouchableOpacity onPress={() => handleAdvancePdf(item)}>
                          <Icon name="file-download" size={22} color={CustomColors.btnGreen} />
                        </TouchableOpacity>
                      ) : null}
                      <View style={[uiStyles.statusPill, { backgroundColor: statusTheme.bg }]}>
                        <Text style={[uiStyles.statusPillText, { color: statusTheme.text }]}>
                          {item.statuss || "NEW"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={uiStyles.formGroup}>
                    <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Reason *</Text>
                    <TextInput
                      style={[uiStyles.textInput, inputColors(makerReadonly)]}
                      value={item.reason}
                      onChangeText={(t) => handleAdvanceChange(t, index, "reason")}
                      editable={!makerReadonly}
                      placeholder="e.g For Ticket"
                      placeholderTextColor={CustomColors.textLight}
                    />
                  </View>

                  <View style={uiStyles.gridTwoCol}>
                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Advance Amount *</Text>
                      <TextInput
                        style={[uiStyles.textInput, inputColors(makerReadonly)]}
                        value={item.reqamount}
                        keyboardType="numeric"
                        onChangeText={(t) => handleAdvanceChange(t, index, "reqamount")}
                        editable={!makerReadonly}
                        placeholder="e.g 1000"
                        placeholderTextColor={CustomColors.textLight}
                      />
                    </View>

                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Approved Amount *</Text>
                      <TextInput
                        style={[uiStyles.textInput, inputColors(approvedReadonly)]}
                        value={item.appamount}
                        keyboardType="numeric"
                        onChangeText={(t) => handleAdvanceChange(t, index, "appamount")}
                        editable={!approvedReadonly}
                        placeholder="-"
                        placeholderTextColor={CustomColors.textLight}
                      />
                    </View>
                  </View>

                  <View style={uiStyles.gridTwoCol}>
                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>CRN No</Text>
                      <TextInput
                        style={[uiStyles.textInputDisabled, {
                          backgroundColor: CustomColors.disableInput,
                          color: CustomColors.disableText,
                          borderColor: CustomColors.borderColor,
                        }]}
                        value={item.crnno}
                        editable={false}
                        placeholder="-"
                        placeholderTextColor={CustomColors.textLight}
                      />
                    </View>
                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Status</Text>
                      <TextInput
                        style={[uiStyles.textInputDisabled, {
                          backgroundColor: CustomColors.disableInput,
                          color: CustomColors.disableText,
                          borderColor: CustomColors.borderColor,
                        }]}
                        value={item.statuss}
                        editable={false}
                        placeholder="Status"
                        placeholderTextColor={CustomColors.textLight}
                      />
                    </View>
                  </View>

                  {canDelete && (
                    <TouchableOpacity style={uiStyles.deleteRowBtn} onPress={() => handleRemoveAdvanceRow(index)}>
                      <Icon name="delete-outline" size={20} color={CustomColors.dangerRed} />
                      <Text style={[uiStyles.deleteRowText, { color: CustomColors.dangerRed }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Total */}
            <View style={[uiStyles.summaryContainer, { borderColor: CustomColors.dividerGray }]}>
              <View style={uiStyles.summaryRow}>
                <Text style={[uiStyles.summaryLabel, { color: CustomColors.textDark }]}>Total Amount (Requested):</Text>
                <Text style={[uiStyles.summaryValue, { color: CustomColors.textDark }]}>
                  ₹{requestedTotal.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={uiStyles.summaryRow}>
                <Text style={[uiStyles.summaryLabel, { color: CustomColors.textDark }]}>Total Amount (Approved):</Text>
                <Text style={[uiStyles.summaryValue, { color: CustomColors.textGreen }]}>
                  ₹{approvedTotal.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. File Upload  (Angular: show_approvediv) */}
          {showUploadSection && (
            <View style={cardStyle}>
              <View style={uiStyles.cardHeaderRow}>
                <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark }]}>
                  File Upload
                </Text>
                <TouchableOpacity
                  style={[
                    uiStyles.smallOutlineBtn,
                    { borderColor: isSpecialPermissionDisabled ? CustomColors.disableText : CustomColors.appThemeColor },
                  ]}
                  onPress={handlePickDocument}
                  disabled={isSpecialPermissionDisabled}
                >
                  <Icon
                    name="cloud-upload"
                    size={16}
                    color={isSpecialPermissionDisabled ? CustomColors.disableText : CustomColors.appThemeColor}
                  />
                  <Text
                    style={[
                      uiStyles.smallOutlineBtnText,
                      { color: isSpecialPermissionDisabled ? CustomColors.disableText : CustomColors.appThemeColor },
                    ]}
                  >
                    Attachment
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[uiStyles.gridTwoCol, { marginBottom: 8 }]}>
                <Text style={[uiStyles.summaryLabel, { color: CustomColors.textDark }]}>
                  File Count: {totalFileCount}
                </Text>
                <Text style={[uiStyles.summaryLabel, { color: CustomColors.textDark }]}>
                  Selected: {totalSelectedAndExisting}
                </Text>
              </View>

              {/* Local selected files */}
              {selectedFiles.map((file, idx) => (
                <View key={`file-${idx}`} style={[uiStyles.fileChip, { backgroundColor: CustomColors.backgroundGray2 }]}>
                  <Icon name="insert-drive-file" size={20} color={CustomColors.appThemeColor} />
                  <Text style={[uiStyles.fileChipName, { color: CustomColors.textDark }]} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <TouchableOpacity style={uiStyles.iconActionBtn} onPress={() => handleViewFile(file)}>
                    <Icon name="visibility" size={20} color={CustomColors.linkBlue} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={uiStyles.iconActionBtn}
                    onPress={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Icon name="delete" size={20} color={CustomColors.dangerRed} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Advance Maker files */}
              {advanceMakerAttachments.length > 0 && (
                <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark, marginTop: 8 }]}>
                  Advance Maker Attached Files
                </Text>
              )}
              {advanceMakerAttachments.map((file, idx) => (
                <View key={`adv-file-${idx}`} style={[uiStyles.fileChip, { backgroundColor: CustomColors.backgroundGray2 }]}>
                  <Icon name="attachment" size={20} color={CustomColors.textGreen} />
                  <Text style={[uiStyles.fileChipName, { color: CustomColors.textDark }]} numberOfLines={1}>
                    {file.file_name}
                  </Text>
                  <TouchableOpacity style={uiStyles.iconActionBtn} onPress={() => handleViewFile(file)}>
                    <Icon name="visibility" size={20} color={CustomColors.linkBlue} />
                  </TouchableOpacity>
                  <TouchableOpacity style={uiStyles.iconActionBtn} onPress={() => handleDownloadAttachment(file.url)}>
                    <Icon name="file-download" size={20} color={CustomColors.btnGreen} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Advance Approver files */}
              {advanceApproverAttachments.length > 0 && (
                <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark, marginTop: 8 }]}>
                  Advance Approver Attached Files
                </Text>
              )}
              {advanceApproverAttachments.map((file, idx) => (
                <View key={`apr-file-${idx}`} style={[uiStyles.fileChip, { backgroundColor: CustomColors.backgroundGray2 }]}>
                  <Icon name="attachment" size={20} color={CustomColors.appThemeColor} />
                  <Text style={[uiStyles.fileChipName, { color: CustomColors.textDark }]} numberOfLines={1}>
                    {file.file_name}
                  </Text>
                  <TouchableOpacity style={uiStyles.iconActionBtn} onPress={() => handleViewFile(file)}>
                    <Icon name="visibility" size={20} color={CustomColors.linkBlue} />
                  </TouchableOpacity>
                  <TouchableOpacity style={uiStyles.iconActionBtn} onPress={() => handleDownloadAttachment(file.url)}>
                    <Icon name="file-download" size={20} color={CustomColors.btnGreen} />
                  </TouchableOpacity>
                </View>
              ))}

              {selectedFiles.length === 0 &&
                advanceMakerAttachments.length === 0 &&
                advanceApproverAttachments.length === 0 && (
                  <Text style={[uiStyles.emptyText, { color: CustomColors.textLight }]}>No attachments available.</Text>
                )}

              {/* Checker: Reason (mandatory) */}
              {isChecker && (
                <View style={[uiStyles.formGroup, { marginTop: 10 }]}>
                  <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Reason *</Text>
                  <TextInput
                    style={[uiStyles.textInput, inputColors(isChanged || isSpecialPermissionDisabled)]}
                    value={approverComment}
                    onChangeText={(t) => setApproverComment(sanitizeText(t))}
                    editable={!isChanged && !isSpecialPermissionDisabled}
                    placeholder="Enter Reason"
                    placeholderTextColor={CustomColors.textLight}
                  />
                </View>
              )}
            </View>
          )}

          {/* 5. To Approver  (Angular: applevel != 1) */}
          {!isChecker && (
            <View style={cardStyle}>
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.textDark, marginBottom: 10 }]}>
                To Approver
              </Text>

              <View style={uiStyles.formGroup}>
                <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Branch *</Text>
                <View style={[uiStyles.pickerSelector, inputColors(isSpecialPermissionDisabled)]}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setPickerStatusBranch(true)}
                    disabled={isSpecialPermissionDisabled}
                  >
                    <Text style={{ color: selectedBranch ? CustomColors.textDark : CustomColors.textLight }}>
                      {selectedBranch?.name || "Select Branch"}
                    </Text>
                  </TouchableOpacity>
                  {selectedBranch && !isSpecialPermissionDisabled ? (
                    <TouchableOpacity onPress={brclear}>
                      <Icon name="close" size={20} color={CustomColors.iconGray} />
                    </TouchableOpacity>
                  ) : (
                    <Icon name="arrow-drop-down" size={24} color={CustomColors.iconGray} />
                  )}
                </View>
              </View>

              <View style={uiStyles.formGroup}>
                <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Approver *</Text>
                <View style={[uiStyles.pickerSelector, inputColors(isSpecialPermissionDisabled)]}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (!selectedBranch) return ToastMessage("Please select a Branch first.");
                      setPickerStatusApprover(true);
                    }}
                    disabled={isSpecialPermissionDisabled}
                  >
                    <Text style={{ color: selectedApprover ? CustomColors.textDark : CustomColors.textLight }}>
                      {selectedApprover?.name || "Select Employee"}
                    </Text>
                  </TouchableOpacity>
                  {selectedApprover && !isSpecialPermissionDisabled ? (
                    <TouchableOpacity onPress={empclear}>
                      <Icon name="close" size={20} color={CustomColors.iconGray} />
                    </TouchableOpacity>
                  ) : (
                    <Icon name="arrow-drop-down" size={24} color={CustomColors.iconGray} />
                  )}
                </View>
              </View>

              <View style={uiStyles.formGroup}>
                <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Remarks *</Text>
                <TextInput
                  style={[uiStyles.textInput, { height: 80, textAlignVertical: "top" }, inputColors(isSpecialPermissionDisabled)]}
                  value={remarks}
                  onChangeText={(t) => setRemarks(sanitizeText(t))}
                  editable={!isSpecialPermissionDisabled}
                  multiline
                  placeholder="Remarks"
                  placeholderTextColor={CustomColors.textLight}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[uiStyles.footerBar, { backgroundColor: CustomColors.cardBackground, borderColor: CustomColors.borderColor }]}>
          {!isChecker ? (
            <TouchableOpacity
              style={[
                uiStyles.primaryActionBtn,
                { backgroundColor: isSpecialPermissionDisabled ? CustomColors.disableInput : CustomColors.appThemeColor },
              ]}
              onPress={handleSubmitMakerForm}
              disabled={isSubmitting || isSpecialPermissionDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator color={CustomColors.textWhite} />
              ) : (
                <>
                  <Icon name="send" size={18} color={CustomColors.textWhite} />
                  <Text style={[uiStyles.primaryActionBtnText, { color: CustomColors.textWhite }]}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={uiStyles.checkerBtnGroup}>
              <TouchableOpacity
                style={[uiStyles.checkerBtn, { backgroundColor: isChanged ? CustomColors.disableInput : CustomColors.btnGreen }]}
                onPress={() => handleApproverAction("APPROVE")}
                disabled={isChanged}
              >
                <Text style={[uiStyles.checkerBtnText, { color: CustomColors.textWhite }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[uiStyles.checkerBtn, { backgroundColor: isChanged ? CustomColors.disableInput : CustomColors.statusYellow }]}
                onPress={() => handleApproverAction("RETURN")}
                disabled={isChanged}
              >
                <Text style={[uiStyles.checkerBtnText, { color: CustomColors.textBlack }]}>Return</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[uiStyles.checkerBtn, { backgroundColor: isChanged ? CustomColors.disableInput : CustomColors.dangerRed }]}
                onPress={() => handleApproverAction("REJECT")}
                disabled={isChanged}
              >
                <Text style={[uiStyles.checkerBtnText, { color: CustomColors.textWhite }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Branch / Approver pickers */}
      <CustomActionSheetPicker
        pickerStatus={pickerStatusBranch}
        setPickerStatus={setPickerStatusBranch}
        optionsData={branchOptions}
        RenderItem={DefaultDropdownItem}
        onPress={handleBranchSelect}
        selected={selectedBranch}
        title="Select Branch"
      />
      <CustomActionSheetPicker
        pickerStatus={pickerStatusApprover}
        setPickerStatus={setPickerStatusApprover}
        optionsData={approverOptions}
        RenderItem={DefaultDropdownItem}
        onPress={(item) => setSelectedApprover(item)}
        selected={selectedApprover}
        title="Select Employee"
      />

      {/* Approval Flow Modal */}
      <Modal visible={approvalFlowModalVisible} animationType="slide" transparent>
        <View style={globalStyles.modalOverlay}>
          <View style={[uiStyles.modalContainer, { backgroundColor: CustomColors.modal_background }]}>
            <View style={[uiStyles.modalHeader, { borderColor: CustomColors.dividerGray }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="alt-route" size={22} color={CustomColors.appThemeColor} />
                <Text style={[uiStyles.modalTitle, { color: CustomColors.textDark }]}>Approval Flow</Text>
              </View>
              <TouchableOpacity onPress={() => setApprovalFlowVisible(false)}>
                <Icon name="close" size={22} color={CustomColors.iconGray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 15 }}>
              {approvalFlowList.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <Text style={[uiStyles.emptyText, { color: CustomColors.textLight }]}>No approval available.</Text>
                </View>
              ) : (
                approvalFlowList.map((flow, idx) => {
                  const statusTheme = getStatusColor(flow.status);
                  return (
                    <View
                      key={`flow-modal-${idx}`}
                      style={[uiStyles.flowCardModal, { backgroundColor: CustomColors.backgroundGray2, borderColor: CustomColors.borderColor }]}
                    >
                      <Text style={[uiStyles.flowMeta, { color: CustomColors.textLight }]}>
                        #{idx + 1} • {formatDate(flow.approveddate)} • {flow.apptype || "-"}
                      </Text>
                      <Text style={[uiStyles.flowName, { color: CustomColors.textDark, marginTop: 4 }]}>
                        ({flow.approver_code || flow.approvedby_code}) {flow.approvedby}
                      </Text>
                      {flow.onbehalfof ? (
                        <Text style={[uiStyles.flowMeta, { color: CustomColors.textLight }]}>
                          Raised By: ({flow.onbehalfof.code}) {flow.onbehalfof.full_name}
                        </Text>
                      ) : null}
                      <View style={[uiStyles.statusPill, { backgroundColor: statusTheme.bg, alignSelf: "flex-start", marginTop: 6 }]}>
                        <Text style={[uiStyles.statusPillText, { color: statusTheme.text }]}>
                          {getFlowStatusText(flow)}
                        </Text>
                      </View>
                      {flow.comment ? (
                        <Text style={[uiStyles.flowComment, { color: CustomColors.textDark }]}>
                          Remarks: {flow.comment}
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

      {/* CCBS Modal */}
      <Modal visible={ccbsModalVisible} animationType="slide" transparent onRequestClose={() => setCcbsModalVisible(false)}>
        <View style={globalStyles.modalOverlay}>
          <View style={[uiStyles.modalContainer, { backgroundColor: CustomColors.modal_background }]}>
            <View style={[uiStyles.modalHeader, { borderColor: CustomColors.dividerGray }]}>
              <View style={{ flex: 1 }}>
                <Text style={[uiStyles.modalTitle, { color: CustomColors.textDark }]}>
                  CCBS (Tour No) : {tourDetails.reqNo}
                </Text>
                <Text style={[uiStyles.flowMeta, { color: CustomColors.textDark }]}>
                  Requested Amount: {ccbsBaseAmt}   |   Approved Amount: {approvedTotal}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCcbsModalVisible(false)}>
                <Icon name="close" size={22} color={CustomColors.iconGray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 15 }} keyboardShouldPersistTaps="handled">
              {ccbsList.map((ccbs, idx) => {
                const ro = isCcbsRowReadonly(ccbs);
                const amtRo = ro || !ccbsBaseAmt;
                const canDeleteRow = ccbsList.length > 1 && !ro && !isSpecialPermissionDisabled;
                return (
                  <View
                    key={`ccbs-${idx}`}
                    style={[uiStyles.itemCard, { backgroundColor: CustomColors.backgroundGray2, borderColor: CustomColors.borderColor }]}
                  >
                    <Text style={[uiStyles.itemCardIndex, { color: CustomColors.textDark }]}>CCBS Row #{idx + 1}</Text>

                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>BS *</Text>
                      <TouchableOpacity style={[uiStyles.pickerSelector, inputColors(ro)]} onPress={() => openBsPicker(idx)} disabled={ro}>
                        <Text style={{ color: (ccbs.bsid?.name || ccbs.bsid?.id) ? CustomColors.textDark : CustomColors.textLight, flex: 1 }}>
                          {ccbs.bsid?.name || ccbs.bsid?.code_name || ccbs.bsid?.label || (ccbs.bsid?.id ? String(ccbs.bsid.id) : "Select BS")}
                        </Text>
                        <Icon name="arrow-drop-down" size={24} color={CustomColors.iconGray} />
                      </TouchableOpacity>
                    </View>

                    <View style={uiStyles.formGroup}>
                      <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>CC *</Text>
                      <TouchableOpacity style={[uiStyles.pickerSelector, inputColors(ro)]} onPress={() => openCcPicker(idx)} disabled={ro}>
                        <Text style={{ color: (ccbs.ccid?.name || ccbs.ccid?.id) ? CustomColors.textDark : CustomColors.textLight, flex: 1 }}>
                          {ccbs.ccid?.name || ccbs.ccid?.code_name || ccbs.ccid?.label || (ccbs.ccid?.id ? String(ccbs.ccid.id) : "Select CC")}
                        </Text>
                        <Icon name="arrow-drop-down" size={24} color={CustomColors.iconGray} />
                      </TouchableOpacity>
                    </View>

                    <View style={uiStyles.gridTwoCol}>
                      <View style={uiStyles.formGroup}>
                        <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Advance Amount *</Text>
                        <TextInput
                          style={[uiStyles.textInput, inputColors(amtRo)]}
                          value={ccbs.amount}
                          keyboardType="numeric"
                          editable={!amtRo}
                          onChangeText={(t) => handleCcbsAmountChange(idx, t)}
                          onBlur={() => handleCcbsAmountBlur(idx)}
                          placeholder="Advance Amount"
                          placeholderTextColor={CustomColors.textLight}
                        />
                      </View>
                      <View style={uiStyles.formGroup}>
                        <Text style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>Percentage *</Text>
                        <TextInput
                          style={[uiStyles.textInput, inputColors(amtRo)]}
                          value={ccbs.percentage}
                          keyboardType="numeric"
                          maxLength={4}
                          editable={!amtRo}
                          onChangeText={(t) => handleCcbsPercentChange(idx, t)}
                          onBlur={() => handleCcbsPercentBlur(idx)}
                          placeholder="Percentage"
                          placeholderTextColor={CustomColors.textLight}
                        />
                      </View>
                    </View>

                    {canDeleteRow && (
                      <TouchableOpacity style={uiStyles.deleteRowBtn} onPress={() => removeCcbsRow(idx)}>
                        <Icon name="delete-outline" size={20} color={CustomColors.dangerRed} />
                        <Text style={[uiStyles.deleteRowText, { color: CustomColors.dangerRed }]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {!isChecker && !isCcbsSubmitted && (
                <TouchableOpacity
                  style={[uiStyles.smallOutlineBtn, { borderColor: CustomColors.appThemeColor, alignSelf: "flex-start", marginBottom: 20 }]}
                  onPress={() => addCcbsRow(false)}
                >
                  <Icon name="add" size={16} color={CustomColors.appThemeColor} />
                  <Text style={[uiStyles.smallOutlineBtnText, { color: CustomColors.appThemeColor }]}>Add CCBS Row</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={{ padding: 15, borderTopWidth: 1, borderColor: CustomColors.dividerGray, flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[
                  uiStyles.primaryActionBtn,
                  {
                    flex: 1,
                    backgroundColor:
                      isChecker || isSpecialPermissionDisabled || isCcbsSubmitted
                        ? CustomColors.disableInput
                        : CustomColors.appThemeColor,
                  },
                ]}
                onPress={submitCcbs}
                disabled={isChecker || isSpecialPermissionDisabled || isCcbsSubmitted}
              >
                <Text style={[uiStyles.primaryActionBtnText, { color: CustomColors.textWhite }]}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[uiStyles.primaryActionBtn, { flex: 1, backgroundColor: CustomColors.backgroundGray2 }]}
                onPress={() => setCcbsModalVisible(false)}
              >
                <Text style={[uiStyles.primaryActionBtnText, { color: CustomColors.textDark }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BS / CC pickers live inside the CCBS modal so they stack above it */}
          <CustomActionSheetPicker
            pickerStatus={bsPickerVisible}
            setPickerStatus={setBsPickerVisible}
            optionsData={bsOptions}
            RenderItem={DefaultDropdownItem}
            onPress={handleBsSelect}
            selected={ccbsList[activeCcbsIdx]?.bsid}
            title="Select BS"
          />
          <CustomActionSheetPicker
            pickerStatus={ccPickerVisible}
            setPickerStatus={setCcPickerVisible}
            optionsData={ccOptions}
            RenderItem={DefaultDropdownItem}
            onPress={handleCcSelect}
            selected={ccbsList[activeCcbsIdx]?.ccid}
            title="Select CC"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdvanceEditScreen;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const itemStyles = StyleSheet.create({
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { fontSize: moderateScale(14), fontWeight: "500" },
});

const uiStyles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: moderateScale(14) },
  scrollContent: { padding: 12, paddingBottom: 20 },

  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE8E6",
    borderWidth: 1,
    borderColor: "#F5C6CB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  warningText: { flex: 1, fontSize: moderateScale(12), color: "#721C24", fontWeight: "600" },

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
  cardHeaderTitle: { fontSize: moderateScale(15), fontWeight: "700" },
  iconBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tourTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tourTagText: { fontSize: moderateScale(12), fontWeight: "600" },

  gridTwoCol: { flexDirection: "row", gap: 12 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: moderateScale(11), fontWeight: "600", marginBottom: 2, textTransform: "uppercase" },
  infoValue: { fontSize: moderateScale(13), fontWeight: "600" },
  divider: { height: 1, marginVertical: 10 },

  itemCard: { borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1 },
  itemCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemCardIndex: { fontSize: moderateScale(12), fontWeight: "700" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusPillText: { fontSize: moderateScale(10), fontWeight: "700" },

  formGroup: { flex: 1, marginBottom: 8 },
  inputLabel: { fontSize: moderateScale(11), fontWeight: "600", marginBottom: 4 },
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
  pickerSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },

  deleteRowBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", marginTop: 4 },
  deleteRowText: { fontSize: moderateScale(12), fontWeight: "600" },

  smallOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  smallOutlineBtnText: { fontSize: moderateScale(12), fontWeight: "600" },
  smallFillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  smallFillBtnText: { fontSize: moderateScale(12), fontWeight: "600" },

  summaryContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, gap: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: moderateScale(13), fontWeight: "600" },
  summaryValue: { fontSize: moderateScale(14), fontWeight: "700" },

  emptyText: { fontSize: moderateScale(12), fontStyle: "italic" },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    gap: 8,
  },
  fileChipName: { flex: 1, fontSize: moderateScale(12) },
  iconActionBtn: { paddingHorizontal: 4, paddingVertical: 2 },

  flowCardModal: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 10 },
  flowName: { fontSize: moderateScale(13), fontWeight: "700" },
  flowMeta: { fontSize: moderateScale(11), marginTop: 4 },
  flowComment: { fontSize: moderateScale(12), marginTop: 6, fontStyle: "italic" },

  footerBar: { padding: 12, borderTopWidth: 1, elevation: 8 },
  primaryActionBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionBtnText: { fontSize: moderateScale(14), fontWeight: "700" },
  checkerBtnGroup: { flexDirection: "row", gap: 10 },
  checkerBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  checkerBtnText: { fontSize: moderateScale(13), fontWeight: "700" },

  modalContainer: { borderRadius: 12, maxHeight: "85%", width: "100%" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: moderateScale(16), fontWeight: "700" },
});
