import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
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
  Linking,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";

import { Environment } from "../../environment/Environment";
import { uploadMultipart } from "../../utilities/upload";
import { pickDocuments } from "../../utilities/filePicker";
import { SCREEN_NAMES } from "../../utilities/expenseType";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { getCustomColors } from "../../styles/CustomColors";
import * as create_styles from "../../styles/StyleSheet";
import { moderateScale, verticalScale, horizontalScale } from "../../styles/Metrics";
import { Fonts } from "../../styles/Fonts";

// ============================================================
// Reusable searchable dropdown modal (server-driven typeahead)
// Used for Branch and Employee/Approver search below, since both
// backend endpoints are search endpoints (query param), not
// static lists.
// ============================================================
const SearchableDropdownModal = ({
  visible,
  title,
  searchText,
  onChangeSearchText,
  results,
  isLoading,
  onSelect,
  onClose,
  selected,
  minChars = 2,
}) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={uiStyles.modalBackdrop}>
        <View style={[uiStyles.modalContent, { backgroundColor: CustomColors.cardBackground }]}>
          <View style={uiStyles.modalHeader}>
            <Text allowFontScaling={false} style={[uiStyles.modalHeaderTitle, { color: CustomColors.appThemeColor }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={CustomColors.textDark} />
            </TouchableOpacity>
          </View>
          <View style={uiStyles.divider} />

          <TextInput
            allowFontScaling={false}
            style={[
              uiStyles.searchInput,
              { borderColor: CustomColors.lightGray, color: CustomColors.textDark, backgroundColor: CustomColors.backgroundWhite },
            ]}
            placeholder={`Type at least ${minChars} characters to search`}
            placeholderTextColor={CustomColors.textGray}
            value={searchText}
            onChangeText={onChangeSearchText}
            autoFocus
          />

          <ScrollView style={{ maxHeight: 320, marginTop: verticalScale(8) }} keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={CustomColors.appThemeColor}
                style={{ marginVertical: verticalScale(16) }}
              />
            ) : results.length === 0 ? (
              <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
                {searchText.trim().length < minChars
                  ? `Type at least ${minChars} characters to search.`
                  : "No results found."}
              </Text>
            ) : (
              results.map((item) => {
                const isSelected = selected && selected.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      itemStyles.optionItem,
                      {
                        borderBottomColor: CustomColors.lightGray,
                        backgroundColor: isSelected ? CustomColors.primaryLight : "transparent",
                      },
                    ]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        itemStyles.optionText,
                        { color: isSelected ? CustomColors.appThemeColor : CustomColors.textDark },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && <Icon name="check" size={20} color={CustomColors.appThemeColor} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            style={[uiStyles.modalCloseBtn, { backgroundColor: CustomColors.secondaryGray }]}
            onPress={onClose}
          >
            <Text allowFontScaling={false} style={uiStyles.modalCloseBtnText}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const ExpenseApprovalViewScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = create_styles.styles(isDark);

  const authToken = useSelector(
    (state) => state.auth?.user?.token || state.auth?.token || state.login?.token || ""
  );
  const csrfToken = useSelector((state) => state.auth?.csrfToken);
  const csrfCookie = useSelector((state) => state.auth?.csrfCookie);
  const loginDetails = useSelector((state) => state.auth?.user || state.login?.user || {});
  const loginId = loginDetails?.employee_id || loginDetails?.id || 0;

  const {
    expense = {},
    tourDataParams = {},
    claimData = {},
    tour_id = 0,
    tourId: routeTourId = 0,
    tourNo = "",
    from = "Checker",
  } = route.params || {};

  const isViewOnly = from === "VIEW" || from === "View";

  const summaryData =
    Object.keys(expense).length > 0
      ? expense
      : Object.keys(tourDataParams).length > 0
      ? tourDataParams
      : claimData;

  const rawTourId =
    tour_id ||
    routeTourId ||
    summaryData?.tourid ||
    summaryData?.tourgid ||
    summaryData?.tour_id ||
    summaryData?.tourId ||
    summaryData?.tour_gid ||
    summaryData?.id ||
    0;

  const [tourId, setTourId] = useState(rawTourId);

  // If tourId is a string tour number (e.g. "TR..."), resolve the numeric tour ID
  useEffect(() => {
    if (tourId && typeof tourId === "string" && !/^\d+$/.test(tourId)) {
      fetch(`${Environment.taServiceUrl}/taserv/tourdata?tour_no=${encodeURIComponent(tourId)}`, {
        headers: buildHeaders(),
      })
        .then((r) => r.json())
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          if (list.length > 0 && list[0]?.id) {
            setTourId(list[0].id);
          }
        })
        .catch((e) => console.warn("Failed to resolve tourId from tour number:", e));
    }
  }, [tourId, buildHeaders]);

  // Role / Level
  const appLevel = Number(summaryData?.applevel ?? 1);
  const statusId = Number(
    summaryData?.claim_status_id ?? summaryData?.statusId ?? summaryData?.status ?? 2
  );
  const initialReqTourNo =
    tourNo ||
    summaryData?.requestno ||
    summaryData?.reqtourno ||
    summaryData?.tour_no ||
    (typeof tourId === "string" ? tourId : String(tourId || ""));

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Header & Employee Details
  const [tourDetails, setTourDetails] = useState({
    reqTourNo: initialReqTourNo,
    reason: summaryData?.reason || "",
    startDate: summaryData?.startdate || "",
    endDate: summaryData?.enddate || "",
    empCode: summaryData?.employee_code || "",
    empName: summaryData?.employee_name || "",
    empDesignation: summaryData?.empdesignation || "",
    empGrade: summaryData?.empgrade || "",
    empBranch: summaryData?.branch_name || "",
    empBranchCode: summaryData?.branch_code || "",
    crnNo: summaryData?.crnno || "",
  });

  const initialClaimed = Number(summaryData?.claimedamount || summaryData?.claimed_amount || 0);
  const initialAdvance = Number(summaryData?.advanceamount || summaryData?.advance_amount || 0);
  const initialApproved = Number(summaryData?.approvedamount || summaryData?.approved_amount || 0);

  // Financial Amounts
  const [eligibleAmt, setEligibleAmt] = useState(0);
  const [claimedAmt, setClaimedAmt] = useState(initialClaimed);
  const [approvedAmt, setApprovedAmt] = useState(initialApproved);
  const [sumAdvance, setSumAdvance] = useState(initialAdvance);
  const [netPay, setNetPay] = useState(
    initialApproved > initialAdvance ? initialApproved - initialAdvance : initialAdvance - initialApproved
  );
  const [paperType, setPaperType] = useState(false);
  const [isAdvance, setIsAdvance] = useState(initialAdvance > 0);

  // Expense Items List
  const [claimRequests, setClaimRequests] = useState([]);

  // Advances Breakdown List (Check For Advance modal)
  const [advanceList, setAdvanceList] = useState([]);

  // Credit Details List
  const [creditList, setCreditList] = useState([]);
  const [cdtSum, setCdtSum] = useState(0);

  // Document Attachments
  const [tourExpenseMakerList, setTourExpenseMakerList] = useState([]);
  const [tourExpenseAppList, setTourExpenseAppList] = useState([]);
  const [tourMakerList, setTourMakerList] = useState([]);
  const [tourAppList, setTourAppList] = useState([]);
  const [totalFileCount, setTotalFileCount] = useState(0);
  const [tourAndExpenseFileCount, setTourAndExpenseFileCount] = useState(0);

  // Local Files attached by Approver
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Approval Flow Data
  const [approvalFlowList, setApprovalFlowList] = useState([]);
  const [approvedById, setApprovedById] = useState(0);
  const [lastStatus, setLastStatus] = useState(null);
  const [changeApprover, setChangeApprover] = useState(false);
  const [invalidPermission, setInvalidPermission] = useState(false);
  const [reapprove, setReapprove] = useState(false);

  // ----- Forwarding / Approver search state (server-side typeahead) -----
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [isBranchPickerVisible, setIsBranchPickerVisible] = useState(false);
  const [isApproverPickerVisible, setIsApproverPickerVisible] = useState(false);
  const [approverRemarks, setApproverRemarks] = useState("");

  const [branchSearchText, setBranchSearchText] = useState("");
  const [branchSearchResults, setBranchSearchResults] = useState([]);
  const [isBranchSearching, setIsBranchSearching] = useState(false);
  const branchSearchTimer = useRef(null);

  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [employeeSearchResults, setEmployeeSearchResults] = useState([]);
  const [isEmployeeSearching, setIsEmployeeSearching] = useState(false);
  const employeeSearchTimer = useRef(null);

  // Action UI Flow State (from Angular)
  const [actionKey, setActionKey] = useState(true);
  const [actionApprove, setActionApprove] = useState(false);
  const [actionReject, setActionReject] = useState(false);
  const [actionReturn, setActionReturn] = useState(false);
  const [amtApprove, setAmtApprove] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reasonChange, setReasonChange] = useState("");
  const [moveToOther, setMoveToOther] = useState("");

  // Modals
  const [ccbsModalVisible, setCcbsModalVisible] = useState(false);
  const [ccbsList, setCcbsList] = useState([]);
  const [ccbsEditable, setCcbsEditable] = useState(false);

  const scrollViewRef = useRef(null);

  const [attachmentsModalVisible, setAttachmentsModalVisible] = useState(false);
  const [activeAttachmentTab, setActiveAttachmentTab] = useState("maker");
  const [checkAdvanceModalVisible, setCheckAdvanceModalVisible] = useState(false);
  const [approverFilesModalVisible, setApproverFilesModalVisible] = useState(false);
  const [approvalFlowModalVisible, setApprovalFlowModalVisible] = useState(false);

  const buildHeaders = useCallback(
    () => ({
      Authorization: `Token ${authToken}`,
      ...(csrfToken && { "X-CSRFToken": csrfToken }),
      ...(csrfCookie && { "X-CSRFCookie": csrfCookie }),
    }),
    [authToken, csrfToken, csrfCookie]
  );

  // MIME Helper
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

  // View File
  const handleViewFile = useCallback(async (file) => {
    try {
      const fileUrl = file?.url || file?.uri || file?.file_url;
      const fileName = file?.file_name || file?.name || "document";

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
      } else if (Platform.OS === "ios") {
        await WebBrowser.openBrowserAsync(fileUrl);
      }
    } catch (error) {
      console.error("Failed to open file:", error);
      ToastMessage("No application available to view this file.");
    }
  }, []);

  // Download File
  const handleDownloadFile = useCallback((url, fileName) => {
    if (url) {
      Linking.openURL(url).catch(() => ToastMessage("Cannot open download link."));
    } else {
      ToastMessage("Download link not available.");
    }
  }, []);

  // APUser PDF Download (Angular: pdfapuserdownload)
  const handleDownloadAPUserPdf = useCallback(() => {
    const invoiceNumber = `TOUR${tourId}`;
    const url = `${Environment.taServiceUrl}/taserv/download_documents/${invoiceNumber}?type=pdf`;
    Linking.openURL(url).catch(() => ToastMessage("APUser PDF not available."));
  }, [tourId]);

  // Document Picker for Approver
  const handlePickDocuments = async () => {
    try {
      const picked = await pickDocuments(true);
      if (picked && picked.length > 0) {
        setSelectedFiles((prev) => [...prev, ...picked]);
        ToastMessage(`${picked.length} file(s) attached.`);
      }
    } catch (err) {
      ToastMessage("Error selecting files.");
    }
  };

  const handleRemoveApproverFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Load Screen Data
  const loadScreenData = useCallback(async () => {
    if (!tourId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const headers = buildHeaders();

    try {
      // 1. Fetch Claim Request Summary
      // Angular: this.taService.getclaimrequestsummary(this.tourid, '') -> /taserv/get_claimreq_tourid/{tourid}
      let claimSummaryRes = null;
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/taserv/get_claimreq_tourid/${tourId}`,
          { headers }
        );
        if (res.ok) claimSummaryRes = await res.json();
      } catch (e) {
        console.warn("get_claimreq_tourid fetch error:", e);
      }

      if (claimSummaryRes) {
        const approved = Number(claimSummaryRes.approved_amount || 0);
        const eligible = Number(claimSummaryRes.eligible_amount || 0);
        const claimed = Number(claimSummaryRes.claimed_amount || 0);
        setApprovedAmt(approved);
        setEligibleAmt(eligible);
        setClaimedAmt(claimed);
        setPaperType(!!claimSummaryRes.paper_type);

        if (Array.isArray(claimSummaryRes.data)) {
          setClaimRequests(claimSummaryRes.data);
        }

        if (claimSummaryRes.approver_comment) {
          setApproverRemarks(claimSummaryRes.approver_comment);
        }

        if (claimSummaryRes.crnno) {
          setTourDetails((prev) => ({ ...prev, crnNo: claimSummaryRes.crnno }));
        }

        if (claimSummaryRes.approver_branch_data) {
          const br = claimSummaryRes.approver_branch_data;
          setSelectedBranch({
            id: br.branch_id || br.id,
            code: br.branch_code || br.code,
            name: `(${br.branch_code || br.code}) ${br.branch_name || br.name}`,
          });
        }
      }

      // 2a. Fetch Advance Totals (Angular: getadvanceEditsummary) -> /taserv/expamount?tour_id={id}
      // This still drives the "Advance Adjusted" / "Net Payable" totals on the summary card.
      let advanceSummaryRes = null;
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/taserv/expamount?tour_id=${tourId}`,
          { headers }
        );
        if (res.ok) advanceSummaryRes = await res.json();
      } catch (e) {
        console.warn("advance summary fetch error:", e);
      }

      if (advanceSummaryRes) {
        const totalPaidAdvance = Number(advanceSummaryRes.total_paid_advance || 0);
        setSumAdvance(totalPaidAdvance);
        if (totalPaidAdvance > 0) setIsAdvance(true);

        const currentApproved = claimSummaryRes?.approved_amount ?? approvedAmt;
        if (currentApproved < totalPaidAdvance) {
          setNetPay(totalPaidAdvance - currentApproved);
        } else {
          setNetPay(currentApproved - totalPaidAdvance);
        }
      }

      // 2b. Fetch Advance Details for the "Check For Advance" modal.
      // Endpoint: /taserv/advance_details?tour_id={id}
      // NOTE: when a tour has no advance records, this endpoint returns
      // {code: "UNEXPECTED_ERROR", description: "NO_DATA_FOUND"} with a
      // non-2xx (or 200) response — that is a normal "empty" result, not
      // a real error, so it must not raise a toast.
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/taserv/advance_details?tour_id=${tourId}`,
          { headers }
        );
        let advDetailsRes = null;
        try {
          advDetailsRes = await res.json();
        } catch (parseErr) {
          advDetailsRes = null;
        }

        if (advDetailsRes?.code === "UNEXPECTED_ERROR" && advDetailsRes?.description === "NO_DATA_FOUND") {
          setAdvanceList([]);
        } else if (Array.isArray(advDetailsRes?.data)) {
          setAdvanceList(advDetailsRes.data);
        } else if (Array.isArray(advDetailsRes)) {
          setAdvanceList(advDetailsRes);
        } else {
          setAdvanceList([]);
        }
      } catch (e) {
        console.warn("advance details fetch error:", e);
        setAdvanceList([]);
      }

      // 3. Fetch Credit Details
      // Angular: this.getERA(this.id, 4, '0') -> /taserv/getcreditpaymodesummaryy?type=1&tour_id=...&paymode_id=4&accno=
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/taserv/getcreditpaymodesummaryy?type=1&tour_id=${tourId}&paymode_id=4&accno=`,
          { headers }
        );
        if (res.ok) {
          const eraRes = await res.json();
          if (Array.isArray(eraRes?.data)) {
            const mappedCredits = eraRes.data.map((item, idx) => {
              const paymodeVal =
                typeof item?.paymode === "object"
                  ? item?.paymode?.name || item?.paymode?.text || "-"
                  : item?.paymode || "-";
              const bankVal =
                typeof item?.bank === "object"
                  ? item?.bank?.name || "-"
                  : item?.bank_name || item?.bank || "-";
              const branchVal =
                typeof item?.bankbranch === "object"
                  ? item?.bankbranch?.name || "-"
                  : item?.branch_name || item?.bankbranch || "-";
              const ifscVal =
                typeof item?.bankbranch === "object"
                  ? item?.bankbranch?.ifsccode || item?.bankbranch?.ifsc || "-"
                  : item?.ifsc_code || item?.ifsccode || item?.ifsc || "-";
              const glVal =
                item?.credit_details?.[0]?.glno ||
                item?.glno ||
                item?.gl_no ||
                item?.creditgl ||
                item?.credit_gl ||
                "-";
              const amountVal =
                item?.credit_details?.[0]?.sum_of_approved_amount ??
                item?.credit_details?.[0]?.amount ??
                item?.amount ??
                "0";

              return {
                id: idx,
                paymode: paymodeVal,
                accNo: item?.account_number || item?.accno || item?.acc_no || "-",
                refNo: item?.reference_number || item?.ref_no || item?.account_number || "-",
                bankName: bankVal,
                branchName: branchVal,
                ifscCode: ifscVal,
                beneficiary: item?.beneficiary_name || item?.beneficiary || "-",
                glNo: glVal,
                amount: amountVal,
              };
            });
            setCreditList(mappedCredits);
            const totalNet =
              eraRes.balance_amount ??
              eraRes.net_amount ??
              mappedCredits.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
            setCdtSum(Number(totalNet || 0));
          }
        }
      } catch (e) {
        console.warn("Credit details fetch error:", e);
      }

      // 4. Fetch Documents Attachments
      // Angular: this.taservice.getfetchimages(this.tourid) -> /taserv/getfetchimages/{tourId}
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/taserv/getfetchimages/${tourId}`,
          { headers }
        );
        if (res.ok) {
          const docs = await res.json();
          setTourExpenseMakerList(docs.tour_expense_maker || []);
          setTourExpenseAppList(
            docs.tour_expense_approver ||
            docs.tour_expense_return ||
            docs.Tour_Expense_reject ||
            docs.Tour_Expense_forward ||
            docs.Tour_Expense_create ||
            []
          );
          setTourMakerList(docs.tour_maker || []);
          setTourAppList(docs.tour_approver || []);
          setTotalFileCount(docs.expense_file_count || 0);
          setTourAndExpenseFileCount(
            (docs.expense_file_count || 0) + (docs.tour_file_count || 0)
          );
        }
      } catch (e) {
        console.warn("fetchimages error:", e);
      }

      // 5. Fetch CCBS
      // Angular: this.taservice.getclaimccbsEditview(this.id) -> /taserv/get_claimccbs_view/{tourId}
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/taserv/get_claimccbs_view/${tourId}`,
          { headers }
        );
        if (res.ok) {
          const ccbsData = await res.json();
          if (Array.isArray(ccbsData)) {
            setCcbsList(
              ccbsData.map((c) => ({
                id: c.id,
                bs: c.bs_data?.name || c.bs_data?.code_name || String(c.bsid || "-"),
                cc: c.cc_data?.name || c.cc_data?.code_name || String(c.ccid || "-"),
                amount: String(c.amount || ""),
                percentage: String(c.percentage || ""),
                bs_data: c.bs_data,
                cc_data: c.cc_data,
              }))
            );
            if (statusId === 2 && appLevel === 2) {
              setCcbsEditable(true);
            }
          }
        }
      } catch (e) {
        console.warn("ccbs fetch error:", e);
      }

      // 6. Fetch Approval Flow
      // Angular: this.taservice.getapproveflowalllist(this.tourid, '') -> /taserv/getapproveflowalllist/{tourid}
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/taserv/getapproveflowalllist/${tourId}`,
          { headers }
        );
        if (res.ok) {
          const flowRes = await res.json();
          const datas = flowRes.approve || [];
          setApprovalFlowList(datas);

          if (datas.length > 0) {
            const mainElement = datas[datas.length - 1];
            setApprovedById(mainElement.id);
            setLastStatus(mainElement.status);

            const lastBefore = datas.length >= 2 ? datas[datas.length - 2] : null;

            if (
              lastBefore &&
              loginId == lastBefore.approver_id &&
              statusId == 3 &&
              mainElement.status == 2
            ) {
              setChangeApprover(true);
              setActionApprove(true);
            }

            if ((statusId == 3 || statusId == 4 || statusId == 5) && mainElement.status != 2) {
              setInvalidPermission(true);
            }
          }
        }
      } catch (e) {
        console.warn("approval flow fetch error:", e);
      }
    } catch (err) {
      console.error("General error loading expense approval details:", err);
      ToastMessage("Failed to load some expense details.");
    } finally {
      setIsLoading(false);
    }
  }, [tourId, appLevel, statusId, loginId, buildHeaders]);

  useEffect(() => {
    loadScreenData();
  }, [loadScreenData]);

  // Clear pending debounce timers on unmount
  useEffect(() => {
    return () => {
      if (branchSearchTimer.current) clearTimeout(branchSearchTimer.current);
      if (employeeSearchTimer.current) clearTimeout(employeeSearchTimer.current);
    };
  }, []);

  // ----------------------------------------------------------------
  // Branch search (server-side typeahead)
  // Endpoint: /usrserv/search_employeebranch?query=<text>&page=1
  // ----------------------------------------------------------------
  const searchBranches = useCallback(
    async (query) => {
      setIsBranchSearching(true);
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/usrserv/search_employeebranch?query=${encodeURIComponent(query)}&page=1`,
          { headers: buildHeaders() }
        );
        const json = await res.json().catch(() => null);
        if (Array.isArray(json?.data)) {
          setBranchSearchResults(
            json.data.map((b) => ({
              id: b.id,
              code: b.code || b.branch_code,
              name: `(${b.code || b.branch_code || "-"}) ${b.name || b.branch_name || ""}`,
            }))
          );
        } else {
          setBranchSearchResults([]);
        }
      } catch (e) {
        console.warn("branch search error:", e);
        setBranchSearchResults([]);
      } finally {
        setIsBranchSearching(false);
      }
    },
    [buildHeaders]
  );

  const handleBranchSearchTextChange = (text) => {
    setBranchSearchText(text);
    if (branchSearchTimer.current) clearTimeout(branchSearchTimer.current);

    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setBranchSearchResults([]);
      setIsBranchSearching(false);
      return;
    }

    branchSearchTimer.current = setTimeout(() => searchBranches(trimmed), 400);
  };

  // ----------------------------------------------------------------
  // Employee / Approver search (server-side typeahead), scoped to
  // the selected branch.
  // Endpoint: /taserv/branch_approver_get/expense/branch/{branchId}?name=<text>&tourid={tourId}&page=1
  //
  // IMPORTANT: `name` must be the plain search string. Passing an
  // event object or any non-string here is what produces the
  // "name=[object%20Object]" bug seen in the network log — always
  // pass the already-extracted text value, never the TextInput
  // change event itself.
  // ----------------------------------------------------------------
  const searchEmployees = useCallback(
    async (query) => {
      if (!selectedBranch?.id) return;
      setIsEmployeeSearching(true);
      try {
        const res = await fetch(
          `${Environment.taServiceUrl}/taserv/branch_approver_get/expense/branch/${selectedBranch.id}?name=${encodeURIComponent(
            query
          )}&tourid=${tourId}&page=1`,
          { headers: buildHeaders() }
        );
        const json = await res.json().catch(() => null);
        if (Array.isArray(json?.data)) {
          setEmployeeSearchResults(
            json.data.map((e) => ({
              id: e.id,
              code: e.code || e.employee_code,
              name: `(${e.code || e.employee_code || "-"}) ${e.full_name || e.name || ""}${
                e.employee_designation || e.designation
                  ? ` - ${e.employee_designation || e.designation}`
                  : ""
              }`,
            }))
          );
        } else {
          setEmployeeSearchResults([]);
        }
      } catch (e) {
        console.warn("employee search error:", e);
        setEmployeeSearchResults([]);
      } finally {
        setIsEmployeeSearching(false);
      }
    },
    [selectedBranch, tourId, buildHeaders]
  );

  const handleEmployeeSearchTextChange = (text) => {
    setEmployeeSearchText(text);
    if (employeeSearchTimer.current) clearTimeout(employeeSearchTimer.current);

    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setEmployeeSearchResults([]);
      setIsEmployeeSearching(false);
      return;
    }

    employeeSearchTimer.current = setTimeout(() => searchEmployees(trimmed), 400);
  };

  // Header Title & Right Icon Navigation
  const HeaderRight = useCallback(
    () => (
      <View style={uiStyles.headerRightRow}>
        {statusId === 3 && (
          <TouchableOpacity
            onPress={handleDownloadAPUserPdf}
            style={uiStyles.headerActionBtn}
            accessibilityLabel="APUser PDF"
          >
            <Icon name="picture-as-pdf" size={24} color={CustomColors.dangerRed} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setApprovalFlowModalVisible(true)}
          style={uiStyles.headerActionBtn}
          accessibilityLabel="Approval Flow"
        >
          <Icon name="visibility" size={24} color={CustomColors.white} />
        </TouchableOpacity>
      </View>
    ),
    [statusId, handleDownloadAPUserPdf, CustomColors]
  );

  const handleHeaderBack = useCallback(() => {
    if (!actionKey) {
      handleActionBack();
    } else {
      navigation.goBack();
    }
  }, [actionKey]);

  useEffect(() => {
    const backAction = () => {
      if (!actionKey) {
        handleActionBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [actionKey]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isViewOnly ? "eClaim Tour Expense" : "eClaim Expense Approval",
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerTintColor: CustomColors.textWhite,
      headerTitleStyle: { fontWeight: "700", fontSize: moderateScale(18) },
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleHeaderBack}
          style={{ marginRight: horizontalScale(12) }}
          accessibilityLabel="Back"
        >
          <Icon name="arrow-back" size={24} color={CustomColors.white} />
        </TouchableOpacity>
      ),
      headerRight: HeaderRight,
    });
  }, [navigation, CustomColors, HeaderRight, handleHeaderBack, isViewOnly]);

  // Navigate to child expense screen
  const handleExpenseNavigation = (claimItem) => {
    const expenseId = Number(claimItem.expenseid);
    let targetScreen = null;

    if (expenseId === 1) targetScreen = SCREEN_NAMES.TRAVELLING_EXPENSES;
    else if (expenseId === 2) targetScreen = SCREEN_NAMES.DAILY_REIMBURSEMENT;
    else if (expenseId === 3) targetScreen = SCREEN_NAMES.INCIDENTAL_EXPENSE;
    else if (expenseId === 4) targetScreen = SCREEN_NAMES.LOCAL_CONVEYANCE;
    else if (expenseId === 5) targetScreen = SCREEN_NAMES.LODGING;
    else if (expenseId === 6) targetScreen = SCREEN_NAMES.MISC_EXPENSE;
    else if (expenseId === 7) targetScreen = SCREEN_NAMES.PACKAGING_FREIGHT;
    else if (expenseId === 8) targetScreen = SCREEN_NAMES.Local_Deputation_Allowance;
    else if (expenseId === 9) targetScreen = SCREEN_NAMES.ASSOCIATED_EXPENSE;

    if (targetScreen) {
      navigation.navigate(targetScreen, {
        tourId: summaryData?.tourid || summaryData?.tourgid || summaryData?.id,
        expense: claimItem,
        claimdata: summaryData,
        from: "Checker",
      });
    } else {
      ToastMessage("Screen not mapped for this expense type.");
    }
  };

  // Action Button Handlers (matching Angular actionchange)
  const handleActionClick = (actionName) => {
    setMoveToOther(actionName);
    setActionKey(false);

    if ((actionName === "APPROVE" && appLevel === 1) || actionName === "MOVE TO OTHER") {
      setAmtApprove(false);
      setActionApprove(true);
      setActionReject(false);
      setActionReturn(false);
      setShowReason(false);
    } else if (actionName === "APPROVE" && appLevel === 2) {
      if (approvedAmt === 0) {
        ToastMessage("Total Approved Amount cannot be 0.");
        setActionKey(true);
        return;
      }
      setAmtApprove(true);
      setActionApprove(false);
      setActionReject(false);
      setActionReturn(false);
      setShowReason(true);
    } else if (actionName === "REJECT") {
      setAmtApprove(false);
      setActionApprove(false);
      setActionReject(true);
      setActionReturn(false);
      setShowReason(true);
    } else if (actionName === "RETURN") {
      setAmtApprove(false);
      setActionApprove(false);
      setActionReject(false);
      setActionReturn(true);
      setShowReason(true);
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleActionBack = () => {
    setActionKey(true);
    setActionApprove(false);
    setActionReject(false);
    setActionReturn(false);
    setAmtApprove(false);
    setShowReason(false);
    setReasonChange("");
    setApproverRemarks("");
    setSelectedBranch(null);
    setSelectedApprover(null);
    setMoveToOther("");
  };

  // Submit First (Level 1 Approval or Forwarding / Move to Other)
  // Angular: approvefirst()
  const handleApproveFirst = async () => {
    if (!selectedBranch?.id) {
      ToastMessage("Please select Branch.");
      return;
    }
    if (!selectedApprover?.id) {
      ToastMessage("Please select Employee.");
      return;
    }
    if (!approverRemarks.trim()) {
      ToastMessage("Please enter Remarks.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: approvedById,
      apptype: "claim",
      tourgid: Number(tourId),
      appcomment: approverRemarks.trim(),
      status: "3",
      approvedby: selectedApprover.id,
    };

    try {
      const response = await uploadMultipart({
        url: `${Environment.taServiceUrl}/taserv/tourapprove`,
        data: payload,
        files: selectedFiles,
        headers: buildHeaders(),
      });

      if (response?.status === "success" || response?.status === "SUCCESS") {
        ToastMessage(
          moveToOther === "MOVE TO OTHER" ? "Forwarded Successfully." : "Approved Successfully."
        );
        navigation.goBack();
      } else {
        ToastMessage(response?.description || "Action failed.");
      }
    } catch (err) {
      console.error("ApproveFirst error:", err);
      ToastMessage(err?.message || "Error submitting approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Final Claim Approval (Level 2)
  // Angular: approveclaim()
  const handleApproveClaim = async () => {
    if (!reasonChange.trim()) {
      ToastMessage("Please enter Reason / Comments.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: approvedById,
      apptype: "claim",
      tourgid: Number(tourId),
      appcomment: reasonChange.trim(),
      status: "3",
      approvedby: 0,
      app_empid: selectedApprover?.id || 0,
      paper_type: paperType,
      is_advance: isAdvance,
      is_admin: 0,
    };

    try {
      const response = await uploadMultipart({
        url: `${Environment.taServiceUrl}/taserv/tourapprove`,
        data: payload,
        files: selectedFiles,
        headers: buildHeaders(),
      });

      if (response?.status === "success" || response?.status === "SUCCESS") {
        ToastMessage("Approved Successfully.");
        navigation.goBack();
      } else {
        ToastMessage(response?.description || "Failed to approve claim.");
      }
    } catch (err) {
      console.error("ApproveClaim error:", err);
      ToastMessage(err?.message || "Error submitting claim approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Reject
  // Angular: rejectclaim()
  const handleRejectClaim = async () => {
    if (!reasonChange.trim()) {
      ToastMessage("Please enter Reason for Rejection.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: approvedById,
      apptype: "claim",
      appcomment: reasonChange.trim(),
      tour_id: Number(tourId),
    };

    try {
      const response = await uploadMultipart({
        url: `${Environment.taServiceUrl}/taserv/tourreject`,
        data: payload,
        files: selectedFiles,
        headers: buildHeaders(),
      });

      if (response?.status === "success" || response?.status === "SUCCESS") {
        ToastMessage("Rejected Successfully.");
        navigation.goBack();
      } else {
        ToastMessage(response?.description || "Failed to reject claim.");
      }
    } catch (err) {
      console.error("RejectClaim error:", err);
      ToastMessage(err?.message || "Error submitting rejection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Return
  // Angular: returnclaim()
  const handleReturnClaim = async () => {
    if (!reasonChange.trim()) {
      ToastMessage("Please enter Reason for Return.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: approvedById,
      apptype: "claim",
      appcomment: reasonChange.trim(),
      tour_id: Number(tourId),
    };

    try {
      const response = await uploadMultipart({
        url: `${Environment.taServiceUrl}/taserv/tourreturn`,
        data: payload,
        files: selectedFiles,
        headers: buildHeaders(),
      });

      if (response?.status === "success" || response?.status === "SUCCESS") {
        ToastMessage("Returned Successfully.");
        navigation.goBack();
      } else {
        ToastMessage(response?.description || "Failed to return claim.");
      }
    } catch (err) {
      console.error("ReturnClaim error:", err);
      ToastMessage(err?.message || "Error submitting return.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status mapping for flow list
  const getStatusText = (status) => {
    switch (Number(status)) {
      case 1:
        return { label: "REQUESTED", color: CustomColors.textBlue };
      case 2:
        return { label: "PENDING", color: CustomColors.statusYellow };
      case 3:
        return { label: "APPROVED", color: CustomColors.btnGreen };
      case 4:
        return { label: "REJECTED", color: CustomColors.dangerRed };
      case 5:
        return { label: "RETURNED", color: CustomColors.primaryOrange };
      case 6:
        return { label: "FORWARDED", color: CustomColors.primaryBlue };
      default:
        return { label: `STATUS ${status}`, color: CustomColors.textDark };
    }
  };

  const getExpenseTypeName = (id) => {
    switch (Number(id)) {
      case 1:
        return "Travelling Expense";
      case 2:
        return "Daily Diem";
      case 3:
        return "Incidental Expenses";
      case 4:
        return "Local Conveyance";
      case 5:
        return "Lodging";
      case 6:
        return "Miscellaneous Charges";
      case 7:
        return "Packaging Freight";
      case 8:
        return "Local Deputation";
      case 9:
        return "Own Vehicle On Duty(IBA)";
      default:
        return `Expense Type ${id}`;
    }
  };

  if (isLoading) {
    return (
      <View style={[uiStyles.centered, { backgroundColor: CustomColors.appScreenColor }]}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={[uiStyles.loadingText, { color: CustomColors.textDark }]}>
          Loading Expense Details...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={[uiStyles.container, { backgroundColor: CustomColors.appScreenColor }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={uiStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. TOUR DETAILS CARD */}
        <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground }]}>
          <View style={uiStyles.cardHeaderRow}>
            <Icon name="assignment" size={22} color={CustomColors.appThemeColor} />
            <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.appThemeColor }]}>
              Tour Details
            </Text>
          </View>
          <View style={uiStyles.divider} />

          <View style={uiStyles.gridTwoCol}>
            <View style={uiStyles.fieldContainer}>
              <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                Tour No
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                {tourDetails.reqTourNo || "-"}
              </Text>
            </View>

            <View style={uiStyles.fieldContainer}>
              <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                Tour Reason
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                {tourDetails.reason || "-"}
              </Text>
            </View>

            <View style={uiStyles.fieldContainer}>
              <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                Start Date
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                {tourDetails.startDate || "-"}
              </Text>
            </View>

            <View style={uiStyles.fieldContainer}>
              <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                End Date
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                {tourDetails.endDate || "-"}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. EMPLOYEE DETAILS CARD */}
        <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground }]}>
          <View style={uiStyles.cardHeaderRow}>
            <Icon name="person" size={22} color={CustomColors.appThemeColor} />
            <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.appThemeColor }]}>
              Employee Details
            </Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[uiStyles.badgeButton, { backgroundColor: CustomColors.appThemeColor }]}
              onPress={() => setCcbsModalVisible(true)}
            >
              <Text allowFontScaling={false} style={uiStyles.badgeButtonText}>
                CCBS
              </Text>
            </TouchableOpacity>
          </View>
          <View style={uiStyles.divider} />

          <View style={uiStyles.gridTwoCol}>
            <View style={uiStyles.fieldContainer}>
              <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                Employee Code
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                {tourDetails.empCode || "-"}
              </Text>
            </View>

            <View style={uiStyles.fieldContainer}>
              <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                Employee Name
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                {tourDetails.empName || "-"}
              </Text>
            </View>

            <View style={uiStyles.fieldContainer}>
              <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                Designation
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                {tourDetails.empDesignation || "-"}
              </Text>
            </View>

            <View style={uiStyles.fieldContainer}>
              <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                Grade
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                {tourDetails.empGrade || "-"}
              </Text>
            </View>

            {appLevel === 2 && (
              <View style={[uiStyles.fieldContainer, { width: "100%" }]}>
                <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                  Employee Branch
                </Text>
                <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                  {tourDetails.empBranchCode ? `(${tourDetails.empBranchCode}) ` : ""}
                  {tourDetails.empBranch || "-"}
                </Text>
              </View>
            )}

            {statusId === 3 && (
              <View style={uiStyles.fieldContainer}>
                <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                  CR No
                </Text>
                <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textBlack }]}>
                  {tourDetails.crnNo || "-"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 3. EXPENSE ITEMS CARD */}
        <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground }]}>
          <View style={uiStyles.cardHeaderRow}>
            <Icon name="receipt" size={22} color={CustomColors.appThemeColor} />
            <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.appThemeColor }]}>
              Expense Breakdown
            </Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[uiStyles.badgeButton, { backgroundColor: CustomColors.appThemeColor }]}
              onPress={() => setCheckAdvanceModalVisible(true)}
            >
              <Text allowFontScaling={false} style={uiStyles.badgeButtonText}>
                Check by Balance
              </Text>
            </TouchableOpacity>
          </View>
          <View style={uiStyles.divider} />

          {claimRequests.length === 0 ? (
            <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
              No expense items found.
            </Text>
          ) : (
            claimRequests.map((item, index) => (
              <View
                key={item.id || item.expenseid || index}
                style={[
                  uiStyles.expenseItemCard,
                  {
                    backgroundColor: CustomColors.backgroundWhite,
                    borderColor: CustomColors.lightGray,
                  },
                ]}
              >
                <View style={uiStyles.expenseCardHeader}>
                  <View style={uiStyles.expenseTitleRow}>
                    <Text allowFontScaling={false} style={uiStyles.sNoBadge}>
                      {index + 1}
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={[uiStyles.expenseNameText, { color: CustomColors.textBlack }]}
                    >
                      {getExpenseTypeName(item.expenseid)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[uiStyles.actionIconButton, { backgroundColor: CustomColors.primaryLight }]}
                    onPress={() => handleExpenseNavigation(item)}
                    accessibilityLabel={appLevel === 1 ? "View Expense" : "Edit Expense"}
                  >
                    <Icon
                      name={appLevel === 1 ? "visibility" : "edit"}
                      size={18}
                      color={CustomColors.appThemeColor}
                    />
                  </TouchableOpacity>
                </View>

                <View style={uiStyles.expenseDetailsGrid}>
                  <View style={uiStyles.detailCol}>
                    <Text allowFontScaling={false} style={[uiStyles.detailLabel, { color: CustomColors.textGray }]}>
                      Physical Sub:
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={[
                        uiStyles.detailValue,
                        { color: item.type == 1 ? CustomColors.btnGreen : CustomColors.dangerRed },
                      ]}
                    >
                      {item.type == 1 ? "Yes" : "No"}
                    </Text>
                  </View>

                  <View style={uiStyles.detailCol}>
                    <Text allowFontScaling={false} style={[uiStyles.detailLabel, { color: CustomColors.textGray }]}>
                      Eligible:
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.detailValue, { color: CustomColors.textDark }]}>
                      ₹{(parseFloat(item.eligibleamount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={uiStyles.detailCol}>
                    <Text allowFontScaling={false} style={[uiStyles.detailLabel, { color: CustomColors.textGray }]}>
                      Claimed:
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.detailValue, { color: CustomColors.primaryBlue }]}>
                      ₹{(parseFloat(item.claimedamount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  {appLevel === 2 && (
                    <View style={uiStyles.detailCol}>
                      <Text allowFontScaling={false} style={[uiStyles.detailLabel, { color: CustomColors.textGray }]}>
                        Approved:
                      </Text>
                      <Text allowFontScaling={false} style={[uiStyles.detailValue, { color: CustomColors.btnGreen }]}>
                        ₹{(parseFloat(item.approvedamount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  )}
                </View>

                {item.requestercomment ? (
                  <View style={uiStyles.commentContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.commentLabel, { color: CustomColors.textGray }]}>
                      Comments:
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.commentText, { color: CustomColors.textDark }]}>
                      {item.requestercomment}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          )}

          {/* TOTALS SUMMARY ROW */}
          <View style={[uiStyles.totalsCard, { backgroundColor: CustomColors.primaryLight }]}>
            <View style={uiStyles.totalsRow}>
              <Text allowFontScaling={false} style={[uiStyles.totalLabel, { color: CustomColors.textDark }]}>
                Total Eligible:
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.totalValue, { color: CustomColors.textBlack }]}>
                ₹{(parseFloat(eligibleAmt) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={uiStyles.totalsRow}>
              <Text allowFontScaling={false} style={[uiStyles.totalLabel, { color: CustomColors.textDark }]}>
                Total Claim:
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.totalValue, { color: CustomColors.primaryBlue }]}>
                ₹{(parseFloat(claimedAmt) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {appLevel === 2 && (
              <View style={uiStyles.totalsRow}>
                <Text allowFontScaling={false} style={[uiStyles.totalLabel, { color: CustomColors.textDark }]}>
                  Total Approved:
                </Text>
                <Text allowFontScaling={false} style={[uiStyles.totalValue, { color: CustomColors.btnGreen }]}>
                  ₹{(parseFloat(approvedAmt) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}

            <View style={[uiStyles.totalsRow, { marginTop: verticalScale(6) }]}>
              <TouchableOpacity
                style={[uiStyles.attachViewBtn, { backgroundColor: CustomColors.appThemeColor }]}
                onPress={() => setAttachmentsModalVisible(true)}
              >
                <Icon name="attach-file" size={16} color={CustomColors.white} />
                <Text allowFontScaling={false} style={uiStyles.attachViewBtnText}>
                  View Attachments
                </Text>
              </TouchableOpacity>

              <Text allowFontScaling={false} style={[uiStyles.fileCountBadge, { color: CustomColors.textDark }]}>
                File Count: {appLevel === 1 ? totalFileCount : tourAndExpenseFileCount}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. NET PAYABLE / ADVANCE ADJUSTMENT (APPLEVEL 2) */}
        {appLevel === 2 && (
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.cardHeaderRow}>
              <Icon name="account-balance-wallet" size={22} color={CustomColors.appThemeColor} />
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.appThemeColor }]}>
                Payment & Adjustment Summary
              </Text>
            </View>
            <View style={uiStyles.divider} />

            <View style={uiStyles.paymentSummaryGrid}>
              <View style={uiStyles.paymentBox}>
                <Text allowFontScaling={false} style={[uiStyles.paymentBoxLabel, { color: CustomColors.textGray }]}>
                  Total Claimed
                </Text>
                <Text allowFontScaling={false} style={[uiStyles.paymentBoxValue, { color: CustomColors.textDark }]}>
                  ₹{(parseFloat(claimedAmt) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={uiStyles.paymentBox}>
                <Text allowFontScaling={false} style={[uiStyles.paymentBoxLabel, { color: CustomColors.textGray }]}>
                  Advance Adjusted
                </Text>
                <Text allowFontScaling={false} style={[uiStyles.paymentBoxValue, { color: CustomColors.primaryOrange }]}>
                  ₹{(parseFloat(sumAdvance) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={uiStyles.paymentBox}>
                <Text allowFontScaling={false} style={[uiStyles.paymentBoxLabel, { color: CustomColors.textGray }]}>
                  Total Approved
                </Text>
                <Text allowFontScaling={false} style={[uiStyles.paymentBoxValue, { color: CustomColors.btnGreen }]}>
                  ₹{(parseFloat(approvedAmt) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={[uiStyles.paymentBox, { backgroundColor: CustomColors.primaryLight, borderRadius: 8 }]}>
                <Text allowFontScaling={false} style={[uiStyles.paymentBoxLabel, { color: CustomColors.appThemeColor }]}>
                  Net Payable
                </Text>
                <Text allowFontScaling={false} style={[uiStyles.paymentBoxValue, { color: CustomColors.appThemeColor, fontSize: moderateScale(16) }]}>
                  ₹{(parseFloat(netPay) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[uiStyles.checkAdvanceBtn, { borderColor: CustomColors.appThemeColor }]}
              onPress={() => setCheckAdvanceModalVisible(true)}
            >
              <Icon name="history" size={18} color={CustomColors.appThemeColor} />
              <Text allowFontScaling={false} style={[uiStyles.checkAdvanceBtnText, { color: CustomColors.appThemeColor }]}>
                Check For Advance
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. CREDIT DETAILS CARD */}
        {creditList.length > 0 && (
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.cardHeaderRow}>
              <Icon name="credit-card" size={22} color={CustomColors.appThemeColor} />
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.appThemeColor }]}>
                Credit Details
              </Text>
            </View>
            <View style={uiStyles.divider} />

            {creditList.map((credit, idx) => (
              <View
                key={idx}
                style={[
                  uiStyles.creditItemCard,
                  { backgroundColor: CustomColors.backgroundWhite, borderColor: CustomColors.lightGray },
                ]}
              >
                <Text allowFontScaling={false} style={[uiStyles.sNoBadge, { marginBottom: verticalScale(6) }]}>
                  {idx + 1}
                </Text>
                <View style={uiStyles.gridTwoCol}>
                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      Paymode
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textDark }]}>
                      {credit.paymode}
                    </Text>
                  </View>

                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      Account Detail/GL
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textDark }]}>
                      {credit.accNo}
                    </Text>
                  </View>

                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      Ref No
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textDark }]}>
                      {credit.refNo}
                    </Text>
                  </View>

                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      Bank Name
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textDark }]}>
                      {credit.bankName}
                    </Text>
                  </View>

                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      Branch Name
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textDark }]}>
                      {credit.branchName}
                    </Text>
                  </View>

                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      IFSC Code
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textDark }]}>
                      {credit.ifscCode}
                    </Text>
                  </View>

                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      Beneficiary Name
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textDark }]}>
                      {credit.beneficiary}
                    </Text>
                  </View>

                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      Credit GL
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.textDark }]}>
                      {credit.glNo}
                    </Text>
                  </View>

                  <View style={uiStyles.fieldContainer}>
                    <Text allowFontScaling={false} style={[uiStyles.fieldLabel, { color: CustomColors.textGray }]}>
                      Amount
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.fieldValue, { color: CustomColors.btnGreen, fontWeight: "700" }]}>
                      ₹{(parseFloat(credit.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={[uiStyles.totalsRow, { marginTop: verticalScale(10), justifyContent: "flex-end" }]}>
              <Text allowFontScaling={false} style={[uiStyles.totalLabel, { color: CustomColors.textDark }]}>
                Net Amount:
              </Text>
              <Text allowFontScaling={false} style={[uiStyles.totalValue, { color: CustomColors.btnGreen, marginLeft: horizontalScale(10) }]}>
                ₹{(parseFloat(cdtSum) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        )}

        {/* 6. APPROVER ATTACHMENT & ACTION CARD */}
        {isViewOnly ? (
          <View style={{ alignItems: "center", marginVertical: verticalScale(16) }}>
            <TouchableOpacity
              style={[uiStyles.actionBtn, { backgroundColor: CustomColors.appThemeColor, width: "60%" }]}
              onPress={() => navigation.goBack()}
            >
              <Text allowFontScaling={false} style={uiStyles.actionBtnText}>
                Back
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.cardHeaderRow}>
              <Icon name="cloud-upload" size={22} color={CustomColors.appThemeColor} />
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.appThemeColor }]}>
                Approver Attachment
              </Text>
            </View>
            <View style={uiStyles.divider} />

            <View style={uiStyles.approverAttachRow}>
              <TouchableOpacity
                style={[uiStyles.pickButton, { backgroundColor: CustomColors.appThemeColor }]}
                onPress={handlePickDocuments}
              >
                <Icon name="add" size={20} color={CustomColors.white} />
                <Text allowFontScaling={false} style={uiStyles.pickButtonText}>
                  Attach Files
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[uiStyles.viewAttachedBtn, { borderColor: CustomColors.appThemeColor }]}
                onPress={() => setApproverFilesModalVisible(true)}
              >
                <Text allowFontScaling={false} style={[uiStyles.viewAttachedBtnText, { color: CustomColors.appThemeColor }]}>
                  Files ({selectedFiles.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Local Selected Files */}
            {selectedFiles.length > 0 && (
              <View style={{ marginTop: verticalScale(10) }}>
                {selectedFiles.map((file, idx) => (
                  <View
                    key={`file-${idx}`}
                    style={[
                      uiStyles.fileChip,
                      {
                        backgroundColor: CustomColors.backgroundWhite,
                        borderColor: CustomColors.lightGray,
                        borderWidth: 1,
                        paddingHorizontal: horizontalScale(10),
                        paddingVertical: verticalScale(8),
                        borderRadius: moderateScale(6),
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: verticalScale(6),
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: horizontalScale(8) }}>
                      <Icon name="insert-drive-file" size={18} color={CustomColors.appThemeColor} />
                      <Text
                        numberOfLines={1}
                        style={{
                          marginLeft: horizontalScale(6),
                          fontSize: moderateScale(13),
                          color: CustomColors.textDark,
                          flex: 1,
                        }}
                      >
                        {file.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}>
                      <Icon name="close" size={18} color={CustomColors.dangerRed} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {actionKey && (
              <>
                <View style={[uiStyles.divider, { marginVertical: verticalScale(14) }]} />
                <View style={uiStyles.decisionBar}>
                  <TouchableOpacity
                    style={[uiStyles.actionBtn, { backgroundColor: CustomColors.btnGreen }]}
                    onPress={() => handleActionClick("APPROVE")}
                    disabled={reapprove}
                  >
                    <Text allowFontScaling={false} style={uiStyles.actionBtnText}>
                      Approve
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[uiStyles.actionBtn, { backgroundColor: CustomColors.dangerRed }]}
                    onPress={() => handleActionClick("REJECT")}
                    disabled={reapprove}
                  >
                    <Text allowFontScaling={false} style={uiStyles.actionBtnText}>
                      Reject
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[uiStyles.actionBtn, { backgroundColor: CustomColors.primaryOrange }]}
                    onPress={() => handleActionClick("RETURN")}
                    disabled={reapprove}
                  >
                    <Text allowFontScaling={false} style={uiStyles.actionBtnText}>
                      Return
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[uiStyles.actionBtn, { backgroundColor: CustomColors.primaryBlue }]}
                    onPress={() => handleActionClick("MOVE TO OTHER")}
                    disabled={reapprove}
                  >
                    <Text allowFontScaling={false} style={uiStyles.actionBtnText}>
                      Move to Other
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[uiStyles.actionBtn, { backgroundColor: CustomColors.secondaryGray }]}
                    onPress={() => navigation.goBack()}
                  >
                    <Text allowFontScaling={false} style={uiStyles.actionBtnText}>
                      Back
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* 7. TO APPROVE / MOVE TO OTHER SECTION */}
        {actionApprove && !actionKey && (
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.cardHeaderRow}>
              <Icon
                name={moveToOther === "MOVE TO OTHER" ? "swap-horiz" : "forward"}
                size={22}
                color={CustomColors.appThemeColor}
              />
              <Text allowFontScaling={false} style={[uiStyles.cardHeaderTitle, { color: CustomColors.appThemeColor }]}>
                {moveToOther === "MOVE TO OTHER" ? "Move to Other" : "To Approve"}
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={handleActionBack}
                style={[uiStyles.badgeButton, { backgroundColor: CustomColors.secondaryGray }]}
              >
                <Text allowFontScaling={false} style={uiStyles.badgeButtonText}>
                  Back
                </Text>
              </TouchableOpacity>
            </View>
            <View style={uiStyles.divider} />

            {/* Branch (search) */}
            <Text allowFontScaling={false} style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>
              Branch <Text style={{ color: CustomColors.dangerRed }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[uiStyles.dropdownTrigger, { borderColor: CustomColors.lightGray }]}
              onPress={() => setIsBranchPickerVisible(true)}
            >
              <Text
                allowFontScaling={false}
                style={{ color: selectedBranch ? CustomColors.textBlack : CustomColors.textGray }}
              >
                {selectedBranch ? selectedBranch.name : "Search Branch"}
              </Text>
              <Icon name="search" size={20} color={CustomColors.textDark} />
            </TouchableOpacity>

            {/* Employee (search) */}
            <Text allowFontScaling={false} style={[uiStyles.inputLabel, { color: CustomColors.textDark, marginTop: verticalScale(12) }]}>
              Employee <Text style={{ color: CustomColors.dangerRed }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[uiStyles.dropdownTrigger, { borderColor: CustomColors.lightGray }]}
              onPress={() => {
                if (!selectedBranch) {
                  ToastMessage("Please select Branch first.");
                  return;
                }
                setIsApproverPickerVisible(true);
              }}
            >
              <Text
                allowFontScaling={false}
                style={{ color: selectedApprover ? CustomColors.textBlack : CustomColors.textGray }}
              >
                {selectedApprover ? selectedApprover.name : "Search Employee"}
              </Text>
              <Icon name="search" size={20} color={CustomColors.textDark} />
            </TouchableOpacity>

            {/* Remarks TextArea */}
            <Text allowFontScaling={false} style={[uiStyles.inputLabel, { color: CustomColors.textDark, marginTop: verticalScale(12) }]}>
              Remarks <Text style={{ color: CustomColors.dangerRed }}>*</Text>
            </Text>
            <TextInput
              style={[
                uiStyles.textAreaInput,
                {
                  borderColor: CustomColors.lightGray,
                  color: CustomColors.textDark,
                  backgroundColor: CustomColors.backgroundWhite,
                },
              ]}
              multiline
              numberOfLines={3}
              placeholder="Enter Remarks"
              placeholderTextColor={CustomColors.textGray}
              value={approverRemarks}
              onChangeText={setApproverRemarks}
              maxLength={64}
            />

            <View style={uiStyles.actionButtonRow}>
              <TouchableOpacity
                style={[
                  uiStyles.submitDecisionBtn,
                  {
                    backgroundColor:
                      moveToOther === "MOVE TO OTHER" ? CustomColors.primaryBlue : CustomColors.btnGreen,
                  },
                  isSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleApproveFirst}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={CustomColors.white} size="small" />
                ) : (
                  <Text allowFontScaling={false} style={uiStyles.submitDecisionBtnText}>
                    {moveToOther === "MOVE TO OTHER" ? "Move to Other" : "Submit"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[uiStyles.backDecisionBtn, { backgroundColor: CustomColors.secondaryGray }]}
                onPress={handleActionBack}
                disabled={isSubmitting}
              >
                <Text allowFontScaling={false} style={uiStyles.backDecisionBtnText}>
                  Back
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 8. REASON INPUT FOR REJECT / RETURN / APPROVE LEVEL 2 */}
        {showReason && !actionKey && (
          <View style={[uiStyles.card, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.cardHeaderRow}>
              <Icon
                name={actionReject ? "cancel" : actionReturn ? "assignment-return" : "check-circle"}
                size={22}
                color={
                  actionReject
                    ? CustomColors.dangerRed
                    : actionReturn
                    ? CustomColors.primaryOrange
                    : CustomColors.btnGreen
                }
              />
              <Text
                allowFontScaling={false}
                style={[
                  uiStyles.cardHeaderTitle,
                  {
                    color: actionReject
                      ? CustomColors.dangerRed
                      : actionReturn
                      ? CustomColors.primaryOrange
                      : CustomColors.btnGreen,
                  },
                ]}
              >
                {actionReject ? "Reject Claim" : actionReturn ? "Return Claim" : "Approve Claim"}
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={handleActionBack}
                style={[uiStyles.badgeButton, { backgroundColor: CustomColors.secondaryGray }]}
              >
                <Text allowFontScaling={false} style={uiStyles.badgeButtonText}>
                  Back
                </Text>
              </TouchableOpacity>
            </View>
            <View style={uiStyles.divider} />
            <Text allowFontScaling={false} style={[uiStyles.inputLabel, { color: CustomColors.textDark }]}>
              Reason / Remarks <Text style={{ color: CustomColors.dangerRed }}>*</Text>
            </Text>
            <TextInput
              style={[
                uiStyles.textAreaInput,
                {
                  borderColor: CustomColors.lightGray,
                  color: CustomColors.textDark,
                  backgroundColor: CustomColors.backgroundWhite,
                },
              ]}
              multiline
              numberOfLines={3}
              placeholder="Enter Reason / Comment"
              placeholderTextColor={CustomColors.textGray}
              value={reasonChange}
              onChangeText={setReasonChange}
            />

            <View style={uiStyles.actionButtonRow}>
              {amtApprove && (
                <TouchableOpacity
                  style={[uiStyles.submitDecisionBtn, { backgroundColor: CustomColors.btnGreen }]}
                  onPress={handleApproveClaim}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={CustomColors.white} size="small" />
                  ) : (
                    <Text allowFontScaling={false} style={uiStyles.submitDecisionBtnText}>
                      Approve
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {actionReject && (
                <TouchableOpacity
                  style={[uiStyles.submitDecisionBtn, { backgroundColor: CustomColors.dangerRed }]}
                  onPress={handleRejectClaim}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={CustomColors.white} size="small" />
                  ) : (
                    <Text allowFontScaling={false} style={uiStyles.submitDecisionBtnText}>
                      Reject
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {actionReturn && (
                <TouchableOpacity
                  style={[uiStyles.submitDecisionBtn, { backgroundColor: CustomColors.primaryOrange }]}
                  onPress={handleReturnClaim}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={CustomColors.white} size="small" />
                  ) : (
                    <Text allowFontScaling={false} style={uiStyles.submitDecisionBtnText}>
                      Return
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[uiStyles.backDecisionBtn, { backgroundColor: CustomColors.secondaryGray }]}
                onPress={handleActionBack}
                disabled={isSubmitting}
              >
                <Text allowFontScaling={false} style={uiStyles.backDecisionBtnText}>
                  Back
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ===================== MODALS ===================== */}

      {/* 1. CCBS MODAL */}
      <Modal
        visible={ccbsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCcbsModalVisible(false)}
      >
        <View style={uiStyles.modalBackdrop}>
          <View style={[uiStyles.modalContent, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.modalHeader}>
              <Text allowFontScaling={false} style={[uiStyles.modalHeaderTitle, { color: CustomColors.appThemeColor }]}>
                CCBS Splits ({tourDetails.reqTourNo})
              </Text>
              <TouchableOpacity onPress={() => setCcbsModalVisible(false)}>
                <Icon name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={uiStyles.divider} />

            <ScrollView style={{ maxHeight: 350 }}>
              {ccbsList.length === 0 ? (
                <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
                  No CCBS allocations found.
                </Text>
              ) : (
                ccbsList.map((c, i) => (
                  <View
                    key={c.id || i}
                    style={[
                      uiStyles.ccbsRowCard,
                      { backgroundColor: CustomColors.backgroundWhite, borderColor: CustomColors.lightGray },
                    ]}
                  >
                    <Text allowFontScaling={false} style={[uiStyles.ccbsItemText, { color: CustomColors.textBlack }]}>
                      BS: <Text style={{ fontWeight: "700" }}>{c.bs}</Text>
                    </Text>
                    <Text allowFontScaling={false} style={[uiStyles.ccbsItemText, { color: CustomColors.textBlack }]}>
                      CC: <Text style={{ fontWeight: "700" }}>{c.cc}</Text>
                    </Text>
                    <View style={uiStyles.gridTwoCol}>
                      <Text allowFontScaling={false} style={[uiStyles.ccbsItemText, { color: CustomColors.textDark }]}>
                        Amount: ₹{c.amount}
                      </Text>
                      <Text allowFontScaling={false} style={[uiStyles.ccbsItemText, { color: CustomColors.textDark }]}>
                        Percentage: {c.percentage}%
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[uiStyles.modalCloseBtn, { backgroundColor: CustomColors.secondaryGray }]}
              onPress={() => setCcbsModalVisible(false)}
            >
              <Text allowFontScaling={false} style={uiStyles.modalCloseBtnText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. EXPENSE ATTACHMENTS MODAL */}
      <Modal
        visible={attachmentsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAttachmentsModalVisible(false)}
      >
        <View style={uiStyles.modalBackdrop}>
          <View style={[uiStyles.modalContent, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.modalHeader}>
              <Text allowFontScaling={false} style={[uiStyles.modalHeaderTitle, { color: CustomColors.appThemeColor }]}>
                Expense Attachments
              </Text>
              <TouchableOpacity onPress={() => setAttachmentsModalVisible(false)}>
                <Icon name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={uiStyles.divider} />

            {/* Sub-tabs */}
            <View style={uiStyles.tabBarRow}>
              <TouchableOpacity
                style={[
                  uiStyles.tabItem,
                  activeAttachmentTab === "maker" && { borderBottomColor: CustomColors.appThemeColor, borderBottomWidth: 2 },
                ]}
                onPress={() => setActiveAttachmentTab("maker")}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    uiStyles.tabItemText,
                    { color: activeAttachmentTab === "maker" ? CustomColors.appThemeColor : CustomColors.textGray },
                  ]}
                >
                  Maker ({tourExpenseMakerList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  uiStyles.tabItem,
                  activeAttachmentTab === "approver" && { borderBottomColor: CustomColors.appThemeColor, borderBottomWidth: 2 },
                ]}
                onPress={() => setActiveAttachmentTab("approver")}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    uiStyles.tabItemText,
                    { color: activeAttachmentTab === "approver" ? CustomColors.appThemeColor : CustomColors.textGray },
                  ]}
                >
                  Approver ({tourExpenseAppList.length})
                </Text>
              </TouchableOpacity>

              {appLevel === 2 && (
                <TouchableOpacity
                  style={[
                    uiStyles.tabItem,
                    activeAttachmentTab === "tour" && { borderBottomColor: CustomColors.appThemeColor, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setActiveAttachmentTab("tour")}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      uiStyles.tabItemText,
                      { color: activeAttachmentTab === "tour" ? CustomColors.appThemeColor : CustomColors.textGray },
                    ]}
                  >
                    Tour ({tourMakerList.length + tourAppList.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {activeAttachmentTab === "maker" && (
                tourExpenseMakerList.length === 0 ? (
                  <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
                    No Maker files attached.
                  </Text>
                ) : (
                  tourExpenseMakerList.map((file, idx) => (
                    <View key={file.id || idx} style={[uiStyles.fileItemRow, { borderColor: CustomColors.lightGray }]}>
                      <Text allowFontScaling={false} style={[uiStyles.fileNameText, { color: CustomColors.textBlack }]} numberOfLines={1}>
                        {file.file_name}
                      </Text>
                      <View style={uiStyles.fileActions}>
                        <TouchableOpacity onPress={() => handleViewFile(file)} style={{ marginRight: 15 }}>
                          <Icon name="visibility" size={20} color={CustomColors.appThemeColor} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDownloadFile(file.url, file.file_name)}>
                          <Icon name="file-download" size={20} color={CustomColors.btnGreen} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )
              )}

              {activeAttachmentTab === "approver" && (
                tourExpenseAppList.length === 0 ? (
                  <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
                    No Approver files attached.
                  </Text>
                ) : (
                  tourExpenseAppList.map((file, idx) => (
                    <View key={file.id || idx} style={[uiStyles.fileItemRow, { borderColor: CustomColors.lightGray }]}>
                      <Text allowFontScaling={false} style={[uiStyles.fileNameText, { color: CustomColors.textBlack }]} numberOfLines={1}>
                        {file.file_name}
                      </Text>
                      <View style={uiStyles.fileActions}>
                        <TouchableOpacity onPress={() => handleViewFile(file)} style={{ marginRight: 15 }}>
                          <Icon name="visibility" size={20} color={CustomColors.appThemeColor} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDownloadFile(file.url, file.file_name)}>
                          <Icon name="file-download" size={20} color={CustomColors.btnGreen} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )
              )}

              {activeAttachmentTab === "tour" && (
                [...tourMakerList, ...tourAppList].length === 0 ? (
                  <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
                    No Tour files attached.
                  </Text>
                ) : (
                  [...tourMakerList, ...tourAppList].map((file, idx) => (
                    <View key={file.id || idx} style={[uiStyles.fileItemRow, { borderColor: CustomColors.lightGray }]}>
                      <Text allowFontScaling={false} style={[uiStyles.fileNameText, { color: CustomColors.textBlack }]} numberOfLines={1}>
                        {file.file_name}
                      </Text>
                      <View style={uiStyles.fileActions}>
                        <TouchableOpacity onPress={() => handleViewFile(file)} style={{ marginRight: 15 }}>
                          <Icon name="visibility" size={20} color={CustomColors.appThemeColor} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDownloadFile(file.url, file.file_name)}>
                          <Icon name="file-download" size={20} color={CustomColors.btnGreen} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )
              )}
            </ScrollView>

            <TouchableOpacity
              style={[uiStyles.modalCloseBtn, { backgroundColor: CustomColors.secondaryGray }]}
              onPress={() => setAttachmentsModalVisible(false)}
            >
              <Text allowFontScaling={false} style={uiStyles.modalCloseBtnText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. CHECK ADVANCE MODAL */}
      <Modal
        visible={checkAdvanceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckAdvanceModalVisible(false)}
      >
        <View style={uiStyles.modalBackdrop}>
          <View style={[uiStyles.modalContent, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.modalHeader}>
              <Text allowFontScaling={false} style={[uiStyles.modalHeaderTitle, { color: CustomColors.appThemeColor }]}>
                Check by Balance ({tourDetails.reqTourNo})
              </Text>
              <TouchableOpacity onPress={() => setCheckAdvanceModalVisible(false)}>
                <Icon name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={uiStyles.divider} />

            <ScrollView style={{ maxHeight: 350 }}>
              {advanceList.length === 0 ? (
                <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
                  No Advance records found for this tour.
                </Text>
              ) : (
                advanceList.map((adv, idx) => (
                  <View
                    key={adv.id || idx}
                    style={[
                      uiStyles.ccbsRowCard,
                      { backgroundColor: CustomColors.backgroundWhite, borderColor: CustomColors.lightGray },
                    ]}
                  >
                    <Text allowFontScaling={false} style={[uiStyles.ccbsItemText, { color: CustomColors.textBlack }]}>
                      Reason: <Text style={{ fontWeight: "700" }}>{adv.reason || "-"}</Text>
                    </Text>
                    <View style={uiStyles.gridTwoCol}>
                      <Text allowFontScaling={false} style={[uiStyles.ccbsItemText, { color: CustomColors.textDark }]}>
                        CRN No: {adv.crnno || "-"}
                      </Text>
                      <Text allowFontScaling={false} style={[uiStyles.ccbsItemText, { color: CustomColors.textDark }]}>
                        Paid Adv: ₹{adv.paid_advance_amount || "0"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[uiStyles.modalCloseBtn, { backgroundColor: CustomColors.secondaryGray }]}
              onPress={() => setCheckAdvanceModalVisible(false)}
            >
              <Text allowFontScaling={false} style={uiStyles.modalCloseBtnText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. APPROVER ATTACHED FILES MODAL */}
      <Modal
        visible={approverFilesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setApproverFilesModalVisible(false)}
      >
        <View style={uiStyles.modalBackdrop}>
          <View style={[uiStyles.modalContent, { backgroundColor: CustomColors.cardBackground }]}>
            <View style={uiStyles.modalHeader}>
              <Text allowFontScaling={false} style={[uiStyles.modalHeaderTitle, { color: CustomColors.appThemeColor }]}>
                Attached Files ({selectedFiles.length})
              </Text>
              <TouchableOpacity onPress={() => setApproverFilesModalVisible(false)}>
                <Icon name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={uiStyles.divider} />

            <ScrollView style={{ maxHeight: 350 }}>
              {selectedFiles.length === 0 ? (
                <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
                  No files attached yet.
                </Text>
              ) : (
                selectedFiles.map((file, idx) => (
                  <View key={idx} style={[uiStyles.fileItemRow, { borderColor: CustomColors.lightGray }]}>
                    <Text allowFontScaling={false} style={[uiStyles.fileNameText, { color: CustomColors.textBlack }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <View style={uiStyles.fileActions}>
                      <TouchableOpacity onPress={() => handleViewFile(file)} style={{ marginRight: 15 }}>
                        <Icon name="visibility" size={20} color={CustomColors.appThemeColor} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveApproverFile(idx)}>
                        <Icon name="delete" size={20} color={CustomColors.dangerRed} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[uiStyles.modalCloseBtn, { backgroundColor: CustomColors.secondaryGray }]}
              onPress={() => setApproverFilesModalVisible(false)}
            >
              <Text allowFontScaling={false} style={uiStyles.modalCloseBtnText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 5. APPROVAL FLOW MODAL */}
      <Modal
        visible={approvalFlowModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setApprovalFlowModalVisible(false)}
      >
        <View style={uiStyles.modalBackdrop}>
          <View style={[uiStyles.modalContent, { backgroundColor: CustomColors.cardBackground, maxHeight: "85%" }]}>
            <View style={uiStyles.modalHeader}>
              <Text allowFontScaling={false} style={[uiStyles.modalHeaderTitle, { color: CustomColors.appThemeColor }]}>
                Approval Flow History
              </Text>
              <TouchableOpacity onPress={() => setApprovalFlowModalVisible(false)}>
                <Icon name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={uiStyles.divider} />

            <ScrollView style={{ maxHeight: 450 }}>
              {approvalFlowList.length === 0 ? (
                <Text allowFontScaling={false} style={[uiStyles.emptyText, { color: CustomColors.textGray }]}>
                  No approval records found.
                </Text>
              ) : (
                approvalFlowList.map((flow, index) => {
                  const statusMeta = getStatusText(flow.status);
                  return (
                    <View
                      key={flow.id || index}
                      style={[
                        uiStyles.flowCard,
                        {
                          backgroundColor: CustomColors.backgroundWhite,
                          borderColor: CustomColors.lightGray,
                        },
                      ]}
                    >
                      <View style={uiStyles.flowHeaderRow}>
                        <Text allowFontScaling={false} style={[uiStyles.flowDate, { color: CustomColors.textGray }]}>
                          {flow.approveddate || "-"}
                        </Text>
                        <View style={[uiStyles.statusBadge, { backgroundColor: statusMeta.color + "15" }]}>
                          <Text allowFontScaling={false} style={[uiStyles.statusBadgeText, { color: statusMeta.color }]}>
                            {statusMeta.label}
                          </Text>
                        </View>
                      </View>

                      <Text allowFontScaling={false} style={[uiStyles.flowTypeText, { color: CustomColors.textBlack }]}>
                        {flow.apptype || "Claim Approval"}
                      </Text>

                      <Text allowFontScaling={false} style={[uiStyles.flowApproverText, { color: CustomColors.textDark }]}>
                        Approver: ({flow.approver_code}) {flow.approvedby}
                      </Text>

                      {flow.onbehalfof?.full_name ? (
                        <Text allowFontScaling={false} style={[uiStyles.flowRaisedByText, { color: CustomColors.textGray }]}>
                          Raised By: ({flow.onbehalfof?.code}) {flow.onbehalfof?.full_name}
                        </Text>
                      ) : null}

                      {flow.comment ? (
                        <Text allowFontScaling={false} style={[uiStyles.flowCommentText, { color: CustomColors.textDark }]}>
                          Remarks: {flow.comment}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[uiStyles.modalCloseBtn, { backgroundColor: CustomColors.secondaryGray }]}
              onPress={() => setApprovalFlowModalVisible(false)}
            >
              <Text allowFontScaling={false} style={uiStyles.modalCloseBtnText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 6. BRANCH SEARCH MODAL */}
      <SearchableDropdownModal
        visible={isBranchPickerVisible}
        title="Search Branch"
        searchText={branchSearchText}
        onChangeSearchText={handleBranchSearchTextChange}
        results={branchSearchResults}
        isLoading={isBranchSearching}
        selected={selectedBranch}
        onSelect={(branch) => {
          setSelectedBranch(branch);
          setSelectedApprover(null);
          setEmployeeSearchText("");
          setEmployeeSearchResults([]);
        }}
        onClose={() => setIsBranchPickerVisible(false)}
      />

      {/* 7. EMPLOYEE / APPROVER SEARCH MODAL */}
      <SearchableDropdownModal
        visible={isApproverPickerVisible}
        title="Search Employee"
        searchText={employeeSearchText}
        onChangeSearchText={handleEmployeeSearchTextChange}
        results={employeeSearchResults}
        isLoading={isEmployeeSearching}
        selected={selectedApprover}
        onSelect={(emp) => setSelectedApprover(emp)}
        onClose={() => setIsApproverPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const itemStyles = StyleSheet.create({
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: verticalScale(14),
    paddingHorizontal: horizontalScale(16),
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.medium,
    flex: 1,
    marginRight: horizontalScale(8),
  },
});

const uiStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: moderateScale(14),
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(14),
    fontFamily: Fonts.medium,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    padding: 6,
    marginLeft: 6,
  },
  card: {
    borderRadius: moderateScale(10),
    padding: moderateScale(14),
    marginBottom: verticalScale(14),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  cardHeaderTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
    fontWeight: "700",
    marginLeft: horizontalScale(8),
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: verticalScale(10),
  },
  gridTwoCol: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  fieldContainer: {
    width: "48%",
    marginBottom: verticalScale(10),
  },
  fieldLabel: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
    marginBottom: verticalScale(2),
  },
  fieldValue: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.semiBold,
    fontWeight: "600",
  },
  badgeButton: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(14),
  },
  badgeButtonText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.regular,
    textAlign: "center",
    marginVertical: verticalScale(10),
  },
  expenseItemCard: {
    borderRadius: moderateScale(8),
    borderWidth: 1,
    padding: moderateScale(10),
    marginBottom: verticalScale(10),
  },
  expenseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(6),
  },
  expenseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sNoBadge: {
    backgroundColor: "#E2E8F0",
    color: "#334155",
    paddingHorizontal: horizontalScale(6),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(10),
    fontSize: moderateScale(11),
    fontFamily: Fonts.bold,
    fontWeight: "700",
    marginRight: horizontalScale(6),
    alignSelf: "flex-start",
  },
  expenseNameText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    fontWeight: "700",
    flex: 1,
  },
  actionIconButton: {
    padding: moderateScale(6),
    borderRadius: moderateScale(6),
  },
  expenseDetailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: verticalScale(4),
  },
  detailCol: {
    marginRight: horizontalScale(10),
    marginBottom: verticalScale(4),
  },
  detailLabel: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.regular,
  },
  detailValue: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  commentContainer: {
    marginTop: verticalScale(6),
    paddingTop: verticalScale(4),
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
  },
  commentLabel: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.regular,
  },
  commentText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.medium,
  },
  totalsCard: {
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginTop: verticalScale(6),
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  totalLabel: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.medium,
  },
  totalValue: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  attachViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
  },
  attachViewBtnText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontFamily: Fonts.medium,
    marginLeft: horizontalScale(4),
  },
  fileCountBadge: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.semiBold,
  },
  paymentSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: verticalScale(10),
  },
  paymentBox: {
    width: "48%",
    padding: moderateScale(10),
    marginBottom: verticalScale(8),
  },
  paymentBoxLabel: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
    marginBottom: verticalScale(2),
  },
  paymentBoxValue: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  checkAdvanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
    marginTop: verticalScale(4),
  },
  checkAdvanceBtnText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.semiBold,
    marginLeft: horizontalScale(6),
  },
  creditItemCard: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: verticalScale(8),
  },
  approverAttachRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(6),
  },
  pickButtonText: {
    color: "#fff",
    fontSize: moderateScale(13),
    fontFamily: Fonts.medium,
    marginLeft: horizontalScale(6),
  },
  viewAttachedBtn: {
    borderWidth: 1,
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(6),
  },
  viewAttachedBtnText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.semiBold,
  },
  inputLabel: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.medium,
    marginBottom: verticalScale(4),
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(10),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
    fontFamily: Fonts.regular,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    fontSize: moderateScale(13),
    fontFamily: Fonts.regular,
    textAlignVertical: "top",
    minHeight: verticalScale(70),
  },
  actionButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: horizontalScale(12),
    marginTop: verticalScale(14),
  },
  submitDecisionBtn: {
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    minWidth: horizontalScale(100),
    alignItems: "center",
  },
  submitDecisionBtnText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  backDecisionBtn: {
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    minWidth: horizontalScale(100),
    alignItems: "center",
  },
  backDecisionBtnText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  decisionBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: horizontalScale(6),
    marginTop: verticalScale(4),
  },
  actionBtn: {
    flexGrow: 1,
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    minWidth: horizontalScale(62),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(6),
  },
  actionBtnText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  flowCard: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: verticalScale(8),
  },
  flowHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  flowDate: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.regular,
  },
  statusBadge: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(10),
  },
  statusBadgeText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  flowTypeText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
    fontWeight: "700",
    marginBottom: verticalScale(2),
  },
  flowApproverText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.medium,
  },
  flowRaisedByText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.regular,
    marginTop: verticalScale(2),
  },
  flowCommentText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
    fontStyle: "italic",
    marginTop: verticalScale(4),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: moderateScale(16),
  },
  modalContent: {
    width: "100%",
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  modalHeaderTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
    fontWeight: "700",
    flex: 1,
  },
  ccbsRowCard: {
    borderWidth: 1,
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: verticalScale(8),
  },
  ccbsItemText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.medium,
    marginBottom: verticalScale(2),
  },
  modalCloseBtn: {
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    alignItems: "center",
    marginTop: verticalScale(12),
  },
  modalCloseBtnText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
  },
  tabBarRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: verticalScale(10),
  },
  tabItem: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: horizontalScale(12),
  },
  tabItemText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
  },
  fileItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: verticalScale(10),
    paddingHorizontal: horizontalScale(4),
  },
  fileNameText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.medium,
    flex: 1,
    marginRight: horizontalScale(10),
  },
  fileActions: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ExpenseApprovalViewScreen;
