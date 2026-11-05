import React, { useState, useEffect, useCallback, useLayoutEffect, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useLazyTourReportGetQuery,
  useReportStatusDropdownQuery,
  useLazyBranchListQuery,
  useLazyEmployeeListQuery,
  useLazyGetApprovalFlowQuery,
  useLazyReportDownloadTourSummaryQuery,
  useLazyReportDownloadProvisionSummaryQuery,
  useLazyProvisionReportExcelDownloadQuery,
} from "../../redux/rtk_query/apiSlice";

import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";
import { Fonts } from "../../styles/Fonts";

// Date Formatter matching Angular DatePipe "yyyy-MM-dd"
const formatDateToAPI = (dateObj) => {
  if (!dateObj) return "";
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return String(dateObj);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Date Formatter for UI display "dd-MMM-yyyy"
const formatDateToDisplay = (dateObj) => {
  if (!dateObj) return "";
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return String(dateObj);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const MONTH_OPTIONS = [
  { id: "1", text: "January" },
  { id: "2", text: "February" },
  { id: "3", text: "March" },
  { id: "4", text: "April" },
  { id: "5", text: "May" },
  { id: "6", text: "June" },
  { id: "7", text: "July" },
  { id: "8", text: "August" },
  { id: "9", text: "September" },
  { id: "10", text: "October" },
  { id: "11", text: "November" },
  { id: "12", text: "December" },
];

const TourReportScreen = ({ navigation, isEmbedded = false }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const searchStyles = useMemo(() => getSearchStyles(isDark, CustomColors), [isDark, CustomColors]);
  const cardStyles = useMemo(() => getCardStyles(isDark, CustomColors), [isDark, CustomColors]);
  const modalStyles = useMemo(() => getModalStyles(isDark, CustomColors), [isDark, CustomColors]);
  const historyStyles = useMemo(() => getHistoryStyles(isDark, CustomColors), [isDark, CustomColors]);
  const stateStyles = useMemo(() => getStateStyles(isDark, CustomColors), [isDark, CustomColors]);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Search filter states
  const [tourNo, setTourNo] = useState("");
  const [crnNo, setCrnNo] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Date picker states
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [paymentFromDate, setPaymentFromDate] = useState(null);
  const [paymentToDate, setPaymentToDate] = useState(null);
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'from' | 'to' | 'payFrom' | 'payTo'

  // Summary List state
  const [reportList, setReportList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modals visibility
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);
  const [isBranchLoading, setIsBranchLoading] = useState(false);

  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [monthModalVisible, setMonthModalVisible] = useState(false);

  // Approval flow history modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [historyTourId, setHistoryTourId] = useState(null);

  // RTK Queries
  const { data: statusDropdownData } = useReportStatusDropdownQuery();
  const [triggerTourReport, { isFetching }] = useLazyTourReportGetQuery();
  const [triggerBranchList] = useLazyBranchListQuery();
  const [triggerEmployeeList] = useLazyEmployeeListQuery();
  const [triggerApprovalFlow, { isFetching: isHistoryLoading }] = useLazyGetApprovalFlowQuery();
  const [triggerDownloadTourSummary, { isFetching: isTourDownloading }] =
    useLazyReportDownloadTourSummaryQuery();
  const [triggerPrepareExcel, { isFetching: isPreparingExcel }] =
    useLazyReportDownloadProvisionSummaryQuery();
  const [triggerDownloadProvisionReport, { isFetching: isProvisionDownloading }] =
    useLazyProvisionReportExcelDownloadQuery();

  const isFetchingRef = useRef(false);

  // Download Handlers matching Angular methods
  const handleDownloadTourSummary = async () => {
    try {
      const params = {
        tourno: tourNo.trim(),
        empbranch: selectedBranch?.id ? String(selectedBranch.id) : "",
        empid: selectedEmployee?.id ? String(selectedEmployee.id) : "",
        grade: grade.trim(),
        all_report: "1",
        crnno: crnNo.trim(),
        pay_from_date: paymentFromDate ? formatDateToAPI(paymentFromDate) : "",
        pay_to_date: paymentToDate ? formatDateToAPI(paymentToDate) : "",
        status: selectedStatus?.id !== undefined ? String(selectedStatus.id) : "",
        from_date: fromDate ? formatDateToAPI(fromDate) : "",
        to_date: toDate ? formatDateToAPI(toDate) : "",
      };
      const res = await triggerDownloadTourSummary(params).unwrap();
      if (res?.code === "INVALID_DATA") {
        ToastMessage(res?.description || "No Data Found!");
      } else {
        ToastMessage("Tour Report Download Initiated");
      }
    } catch (e) {
      console.error("Error downloading tour report:", e);
      ToastMessage(e?.data?.description || "No Data Found!");
    }
  };

  const handlePrepareExcel = async () => {
    try {
      const params = {
        tourno: tourNo.trim(),
        all_report: "1",
        from_date: fromDate ? formatDateToAPI(fromDate) : "",
        to_date: toDate ? formatDateToAPI(toDate) : "",
        month: selectedMonth?.text ? selectedMonth.text.toLowerCase() : "",
        crnno: crnNo.trim(),
        pay_from_date: paymentFromDate ? formatDateToAPI(paymentFromDate) : "",
        pay_to_date: paymentToDate ? formatDateToAPI(paymentToDate) : "",
        status: selectedStatus?.id !== undefined ? String(selectedStatus.id) : "",
      };
      const res = await triggerPrepareExcel(params).unwrap();
      if (res?.code) {
        ToastMessage(res?.description || "Error preparing excel");
      } else {
        ToastMessage(res?.message || "Prepared Excel Successfully Created");
      }
    } catch (e) {
      console.error("Error preparing excel:", e);
      ToastMessage(e?.data?.description || "Failed to prepare excel");
    }
  };

  const handleDownloadProvisionReport = async () => {
    try {
      const res = await triggerDownloadProvisionReport().unwrap();
      if (res?.code) {
        ToastMessage(res?.description || "No Data Found!");
      } else {
        ToastMessage("Provision Report Download Initiated");
      }
    } catch (e) {
      console.error("Error downloading provision report:", e);
      ToastMessage(e?.data?.description || "Failed to download provision report");
    }
  };

  // Navigation Header
  useLayoutEffect(() => {
    if (isEmbedded) return;
    navigation.setOptions({
      title: "Tour Report",
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },
      headerTintColor: CustomColors.textWhite || CustomColors.white,
      headerTitleStyle: {
        fontFamily: Fonts.Bold,
        fontSize: moderateScale(18),
        color: CustomColors.textWhite || CustomColors.white,
      },
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={handleDownloadTourSummary}
            style={{ marginRight: horizontalScale(10), padding: 4 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="file-download" size={24} color={CustomColors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={{ marginRight: horizontalScale(10), padding: 4 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="filter-list" size={26} color={CustomColors.white} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, CustomColors, tourNo, selectedBranch, selectedEmployee, grade, crnNo, paymentFromDate, paymentToDate, selectedStatus, fromDate, toDate]);

  // Status dropdown options
  const statusList = React.useMemo(() => {
    const raw = Array.isArray(statusDropdownData)
      ? statusDropdownData
      : statusDropdownData?.data || [];
    return raw;
  }, [statusDropdownData]);

  // Grade Input Sanitization (matches Angular onInputChange: /[^a-zA-Z0-9]/g)
  const handleGradeChange = (text) => {
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, "");
    setGrade(cleaned);
  };

  // Branch Modal Search
  const fetchBranches = async (query = "") => {
    setIsBranchLoading(true);
    try {
      const q = typeof query === "string" ? query : "";
      const res = await triggerBranchList({ name: q, query: q, page: 1 }).unwrap();
      const list = Array.isArray(res?.data) ? res.data : [];
      setBranchOptions(list);
    } catch (e) {
      console.error("Error fetching branches:", e);
    } finally {
      setIsBranchLoading(false);
    }
  };

  // Employee Modal Search
  const fetchEmployees = async (name = "", branchIdOverride = null) => {
    const branchId = branchIdOverride ?? selectedBranch?.id;
    if (!branchId) {
      setEmployeeOptions([]);
      return;
    }
    setIsEmployeeLoading(true);
    try {
      const q = typeof name === "string" ? name : "";
      const res = await triggerEmployeeList({
        branch: branchId,
        name: q,
        page: 1,
      }).unwrap();
      const list = Array.isArray(res?.data) ? res.data : [];
      setEmployeeOptions(list);
    } catch (e) {
      console.error("Error fetching employees:", e);
    } finally {
      setIsEmployeeLoading(false);
    }
  };

  // Core Data Fetch Function
  const fetchReportData = useCallback(
    async (pageNumber = 1, shouldAppend = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const params = {
          tourno: tourNo.trim(),
          empid: selectedEmployee?.id ? String(selectedEmployee.id) : "",
          grade: grade.trim(),
          branchid: selectedBranch?.id ? String(selectedBranch.id) : "",
          month: selectedMonth?.text ? selectedMonth.text.toLowerCase() : "",
          crnno: crnNo.trim(),
          pay_from_date: paymentFromDate ? formatDateToAPI(paymentFromDate) : "",
          pay_to_date: paymentToDate ? formatDateToAPI(paymentToDate) : "",
          status: selectedStatus?.id !== undefined ? String(selectedStatus.id) : "",
          page: pageNumber,
          form_date: fromDate ? formatDateToAPI(fromDate) : "",
          to_date: toDate ? formatDateToAPI(toDate) : "",
        };

        const response = await triggerTourReport(params, false).unwrap();

        if (response?.code === "INVALID_DATA") {
          if (!shouldAppend && isMountedRef.current) setReportList([]);
          if (isMountedRef.current) {
            setHasNext(false);
            setTotalCount(0);
          }
          return;
        }

        const list = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination || {};
        const count = response?.count || list.length;

        if (isMountedRef.current) {
          setTotalCount(count);
          setHasNext(Boolean(pagination.has_next));
          setPage(pagination.index || pageNumber);

          if (shouldAppend) {
            setReportList((prev) => [...prev, ...list]);
          } else {
            setReportList(list);
          }
        }
      } catch (err) {
        const isCanceled =
          !isMountedRef.current ||
          err?.name === "AbortError" ||
          (err?.status === "FETCH_ERROR" &&
            (String(err?.error || "").toLowerCase().includes("cancel") ||
             String(err?.error || "").toLowerCase().includes("abort"))) ||
          String(err?.message || "").toLowerCase().includes("cancel") ||
          String(err?.error || "").toLowerCase().includes("cancel");

        if (isCanceled) {
          // Request was aborted/canceled; silently ignore without showing error toast or wiping list
          return;
        }

        console.error("Error fetching Tour Report:", err);
        if (!shouldAppend && isMountedRef.current) setReportList([]);
        if (isMountedRef.current) {
          ToastMessage(err?.data?.message || "Failed to load tour reports");
        }
      } finally {
        isFetchingRef.current = false;
        if (isMountedRef.current) {
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [
      tourNo,
      crnNo,
      grade,
      selectedBranch,
      selectedEmployee,
      selectedStatus,
      selectedMonth,
      fromDate,
      toDate,
      paymentFromDate,
      paymentToDate,
      triggerTourReport,
    ]
  );

  // Initial load
  useEffect(() => {
    fetchReportData(1, false);
  }, []);

  // Pull to refresh
  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchReportData(1, false);
  };

  // Search Click
  const handleSearch = () => {
    setFilterModalVisible(false);
    setPage(1);
    fetchReportData(1, false);
  };

  // Clear All Filters
  const handleClear = () => {
    setTourNo("");
    setCrnNo("");
    setGrade("");
    setSelectedBranch(null);
    setSelectedEmployee(null);
    setSelectedStatus(null);
    setSelectedMonth(null);
    setFromDate(null);
    setToDate(null);
    setPaymentFromDate(null);
    setPaymentToDate(null);
    setPage(1);
    setTimeout(() => {
      fetchReportData(1, false);
    }, 50);
  };

  // Infinite Scroll Load More
  const handleLoadMore = () => {
    if (!isLoadingMore && hasNext && !isFetching && !isFetchingRef.current) {
      const nextPage = page + 1;
      setIsLoadingMore(true);
      fetchReportData(nextPage, true);
    }
  };

  // Date picker handler
  const handleDateChange = (event, selectedDate) => {
    const pickerType = activeDatePicker;
    setActiveDatePicker(null);
    if (event?.type === "set" && selectedDate) {
      if (pickerType === "from") setFromDate(selectedDate);
      else if (pickerType === "to") setToDate(selectedDate);
      else if (pickerType === "payFrom") setPaymentFromDate(selectedDate);
      else if (pickerType === "payTo") setPaymentToDate(selectedDate);
    }
  };

  // History / Approval Flow Click
  const handleHistoryClick = async (report) => {
    const tourId = report.tourid || report.id;
    setHistoryTourId(tourId);
    setHistoryModalVisible(true);
    try {
      const res = await triggerApprovalFlow(tourId).unwrap();
      const list = res?.data || res?.approve || (Array.isArray(res) ? res : []);
      setApprovalHistory(list);
    } catch (e) {
      console.error("Error fetching approval flow:", e);
      ToastMessage("Failed to load approval history");
      setApprovalHistory([]);
    }
  };

  // Sub-action navigations
  const handleTourDetailClick = (report) => {
    const tourId = report.tourid || report.id;
    navigation.navigate("travel_edit_screen", {
      tourDataParams: { ...report, id: tourId, tourid: tourId },
      tour_id: tourId,
      from: "VIEW",
    });
  };

  const handleTourAdvanceClick = (report) => {
    const tourId = report.tourid || report.id;
    navigation.navigate("advance_approval_view", {
      tourDataParams: { ...report, id: tourId, tourgid: tourId, tourid: tourId },
      tour_id: tourId,
      from: "ADVANCE_VIEW",
    });
  };

  const handleTourExpenseClick = (report) => {
    navigation.navigate("ExpenseApprovalView", {
      claimData: report,
      tourId: report.tourid || report.id,
    });
  };

  // Badge styling helper
  const getBadgeColor = (statusText) => {
    const st = (statusText || "").toUpperCase();
    if (st.includes("APPROV") || st.includes("PAID") || st.includes("SUCCESS")) {
      return {
        bg: isDark ? "#064e3b" : "#E8F5E9",
        text: isDark ? "#6ee7b7" : "#2E7D32",
        border: isDark ? "#047857" : "#A5D6A7",
      };
    }
    if (st.includes("REJECT") || st.includes("FAIL")) {
      return {
        bg: isDark ? "#450a0a" : "#FFEBEE",
        text: isDark ? "#fca5a5" : "#C62828",
        border: isDark ? "#b91c1c" : "#FFCDD2",
      };
    }
    if (st.includes("RETURN")) {
      return {
        bg: isDark ? "#3b0764" : "#F3E5F5",
        text: isDark ? "#d8b4fe" : "#7B1FA2",
        border: isDark ? "#7e22ce" : "#CE93D8",
      };
    }
    return {
      bg: isDark ? "#451a03" : "#FFF8E1",
      text: isDark ? "#fcd34d" : "#F57C00",
      border: isDark ? "#b45309" : "#FFE082",
    };
  };

  // Render individual Report Card
  const renderItem = ({ item, index }) => {
    const sNo = index + 1;
    const tourNumber = item.requestno || item.tourid || item.id || "-";
    const crnNumber = item.claim_crnno || "-";
    const employeeCode = item.employee_code || "";
    const employeeName = item.employee_name || "-";
    const branchName = item.branch_name || "-";
    const branchCode = item.branch_code || "";
    const gradeVal = item.empgrade || "";
    const designation = item.empdesignation || "";
    const reason = item.reason || "-";
    const reqDate = item.requestdate || "-";
    const startDate = item.startdate || "-";
    const endDate = item.enddate || "-";
    const approvedAmt = item.approvedamount;
    const advanceAmt = item.advanceamount;
    const claimStatus = item.claim_status || "DEFAULT";
    const paymentStatus = item.payment_status;

    const claimBadge = getBadgeColor(claimStatus);
    const payBadge = paymentStatus ? getBadgeColor(paymentStatus) : null;

    return (
      <View style={[cardStyles.cardContainer, { backgroundColor: isDark ? "#1e293b" : CustomColors.white }]}>
        {/* Top Header: S.No + Tour No + CR No + Claim Status */}
        <View style={cardStyles.headerRow}>
          <View style={cardStyles.badgeRow}>
            <View style={cardStyles.sNoCircle}>
              <Text style={cardStyles.sNoText}>{sNo}</Text>
            </View>
            <View style={{ marginLeft: horizontalScale(8) }}>
              <Text style={[cardStyles.tourNoText, { color: CustomColors.appThemeColor }]}>
                {tourNumber}
              </Text>
              {crnNumber !== "-" && (
                <Text style={cardStyles.crnSubText}>CR No: {crnNumber}</Text>
              )}
            </View>
          </View>

          <View
            style={[
              cardStyles.statusBadge,
              { backgroundColor: claimBadge.bg, borderColor: claimBadge.border },
            ]}
          >
            <Text style={[cardStyles.statusBadgeText, { color: claimBadge.text }]}>
              {claimStatus}
            </Text>
          </View>
        </View>

        <View style={cardStyles.divider} />

        {/* Employee Info */}
        <View style={cardStyles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" style={{ marginTop: 2 }} />
          <View style={{ marginLeft: horizontalScale(8), flex: 1 }}>
            <Text style={cardStyles.employeeNameText}>
              {employeeCode ? `(${employeeCode}) ` : ""}
              {employeeName}
            </Text>
            {(designation || gradeVal) && (
              <Text style={cardStyles.metaText}>
                {designation}
                {designation && gradeVal ? " • " : ""}
                {gradeVal ? `Grade: ${gradeVal}` : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Branch Info */}
        <View style={cardStyles.infoRow}>
          <Ionicons name="business-outline" size={16} color="#666" style={{ marginTop: 2 }} />
          <View style={{ marginLeft: horizontalScale(8), flex: 1 }}>
            <Text style={cardStyles.branchText}>
              {branchCode ? `${branchCode} - ` : ""}
              {branchName}
            </Text>
          </View>
        </View>

        {/* Dates & Reason */}
        <View style={cardStyles.datesCard}>
          <View style={cardStyles.dateCol}>
            <Text style={cardStyles.dateLabel}>Req Date</Text>
            <Text style={cardStyles.dateValue}>{formatDateToDisplay(reqDate)}</Text>
          </View>
          <View style={cardStyles.dateCol}>
            <Text style={cardStyles.dateLabel}>From Date</Text>
            <Text style={cardStyles.dateValue}>{formatDateToDisplay(startDate)}</Text>
          </View>
          <View style={cardStyles.dateCol}>
            <Text style={cardStyles.dateLabel}>To Date</Text>
            <Text style={cardStyles.dateValue}>{formatDateToDisplay(endDate)}</Text>
          </View>
        </View>

        {reason !== "-" && (
          <View style={[cardStyles.infoRow, { marginTop: verticalScale(4) }]}>
            <Ionicons name="document-text-outline" size={15} color="#888" style={{ marginTop: 2 }} />
            <Text style={[cardStyles.metaText, { marginLeft: horizontalScale(6), flex: 1 }]}>
              {reason}
            </Text>
          </View>
        )}

        {/* Financials Row */}
        <View style={cardStyles.financialsRow}>
          <View style={cardStyles.amountContainer}>
            <Text style={cardStyles.amountLabel}>Approved Amount</Text>
            <Text style={cardStyles.amountValueApproved}>
              ₹{Number(approvedAmt || 0).toLocaleString()}
            </Text>
          </View>

          <View style={cardStyles.amountContainer}>
            <Text style={cardStyles.amountLabel}>Advance Amount</Text>
            <Text style={cardStyles.amountValueAdvance}>
              ₹{Number(advanceAmt || 0).toLocaleString()}
            </Text>
          </View>

          {payBadge && (
            <View style={[cardStyles.statusBadge, { backgroundColor: payBadge.bg, borderColor: payBadge.border }]}>
              <Text style={[cardStyles.statusBadgeText, { color: payBadge.text }]}>
                {paymentStatus}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons: Tour Detail, Advance, Expenses, History */}
        <View style={cardStyles.actionsRow}>
          <TouchableOpacity
            style={[cardStyles.actionChip, { borderColor: "#1976D2" }]}
            onPress={() => handleTourDetailClick(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="briefcase-outline" size={14} color="#1976D2" />
            <Text style={[cardStyles.actionChipText, { color: "#1976D2" }]}>Detail</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[cardStyles.actionChip, { borderColor: "#D32F2F" }]}
            onPress={() => handleTourAdvanceClick(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={14} color="#D32F2F" />
            <Text style={[cardStyles.actionChipText, { color: "#D32F2F" }]}>Advance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[cardStyles.actionChip, { borderColor: "#7B1FA2" }]}
            onPress={() => handleTourExpenseClick(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={14} color="#7B1FA2" />
            <Text style={[cardStyles.actionChipText, { color: "#7B1FA2" }]}>Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[cardStyles.actionChip, { borderColor: "#2E7D32", backgroundColor: isDark ? "#064e3b" : "#E8F5E9" }]}
            onPress={() => handleHistoryClick(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={14} color={isDark ? "#6ee7b7" : "#2E7D32"} />
            <Text style={[cardStyles.actionChipText, { color: isDark ? "#6ee7b7" : "#2E7D32" }]}>History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: isDark ? "#0f172a" : "#F4F6F9" }]} edges={["bottom"]}>
      {/* 1. QUICK SEARCH BAR */}
      <View style={searchStyles.searchCard}>
        <View style={searchStyles.inputRow}>
          <View style={searchStyles.textInputContainer}>
            <Ionicons name="search-outline" size={16} color={isDark ? "#94a3b8" : "#888"} style={{ marginLeft: 8 }} />
            <TextInput
              style={searchStyles.textInput}
              placeholder="Search Tour No"
              placeholderTextColor={isDark ? "#94a3b8" : "#999"}
              value={tourNo}
              onChangeText={setTourNo}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {tourNo.length > 0 && (
              <TouchableOpacity onPress={() => setTourNo("")} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={16} color={isDark ? "#94a3b8" : "#999"} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[searchStyles.filterBtn, { backgroundColor: CustomColors.appThemeColor }]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
            <Text style={searchStyles.filterBtnText}>Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips Bar */}
        {(selectedBranch || selectedEmployee || selectedStatus || selectedMonth || fromDate || toDate) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={searchStyles.chipsScroll}>
            {selectedBranch && (
              <View style={searchStyles.chipItem}>
                <Text style={searchStyles.chipText}>Branch: {selectedBranch.code}</Text>
                <TouchableOpacity onPress={() => setSelectedBranch(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            )}
            {selectedEmployee && (
              <View style={searchStyles.chipItem}>
                <Text style={searchStyles.chipText}>Emp: {selectedEmployee.code}</Text>
                <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            )}
            {selectedStatus && (
              <View style={searchStyles.chipItem}>
                <Text style={searchStyles.chipText}>Status: {selectedStatus.name}</Text>
                <TouchableOpacity onPress={() => setSelectedStatus(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            )}
            {selectedMonth && (
              <View style={searchStyles.chipItem}>
                <Text style={searchStyles.chipText}>Month: {selectedMonth.text}</Text>
                <TouchableOpacity onPress={() => setSelectedMonth(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            )}
            {fromDate && (
              <View style={searchStyles.chipItem}>
                <Text style={searchStyles.chipText}>From: {formatDateToDisplay(fromDate)}</Text>
                <TouchableOpacity onPress={() => setFromDate(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            )}
            {toDate && (
              <View style={searchStyles.chipItem}>
                <Text style={searchStyles.chipText}>To: {formatDateToDisplay(toDate)}</Text>
                <TouchableOpacity onPress={() => setToDate(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={handleClear} style={[searchStyles.chipItem, { backgroundColor: isDark ? "#450a0a" : "#FFEBEE" }]}>
              <Text style={[searchStyles.chipText, { color: isDark ? "#f87171" : "#C62828" }]}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* 2. REPORT LIST OR EMPTY STATE */}
      {isFetching && !isRefreshing && reportList.length === 0 ? (
        <View style={stateStyles.centeredContainer}>
          <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
          <Text style={stateStyles.loadingText}>Loading tour reports...</Text>
        </View>
      ) : (
        <FlatList
          data={reportList}
          keyExtractor={(item, index) => `${item.id || item.requestno || item.tourid}_${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: verticalScale(40) }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[CustomColors.appThemeColor || "#4f806d"]}
            />
          }
          ListHeaderComponent={
            totalCount > 0 ? (
              <View style={stateStyles.counterBar}>
                <Text style={stateStyles.counterText}>
                  Showing {reportList.length} of {totalCount} Records
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: verticalScale(16), alignItems: "center" }}>
                <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
                <Text style={[stateStyles.loadingText, { marginTop: 4, fontSize: moderateScale(12) }]}>
                  Loading more records...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={stateStyles.emptyContainer}>
              <FontAwesome5 name="file-invoice" size={54} color="#BDBDBD" />
              <Text style={stateStyles.emptyTitle}>No Tour Reports Found</Text>
              <Text style={stateStyles.emptySubtitle}>
                Try adjusting your search criteria or filters.
              </Text>
            </View>
          }
        />
      )}

      {/* 3. ADVANCED FILTER POPUP MODAL */}
      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%", alignItems: "center" }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={modalStyles.modalContainer}
              onPress={(e) => e.stopPropagation?.()}
            >
              <View style={modalStyles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="filter"
                    size={20}
                    color={CustomColors.appThemeColor}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={modalStyles.modalTitle}>Search & Filter</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFilterModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={isDark ? "#FFFFFF" : "#333"} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: "78%" }}
                keyboardShouldPersistTaps="handled"
              >
              {/* Tour No */}
              <Text style={modalStyles.filterLabel}>Tour No</Text>
              <TextInput
                style={modalStyles.inputField}
                placeholder="Enter Tour No"
                value={tourNo}
                onChangeText={setTourNo}
              />

              {/* CR No */}
              <Text style={modalStyles.filterLabel}>CR No</Text>
              <TextInput
                style={modalStyles.inputField}
                placeholder="Enter CR No"
                value={crnNo}
                onChangeText={setCrnNo}
              />

              {/* Grade */}
              <Text style={modalStyles.filterLabel}>Grade</Text>
              <TextInput
                style={modalStyles.inputField}
                placeholder="Enter Grade (alphanumeric)"
                value={grade}
                onChangeText={handleGradeChange}
              />

              {/* Branch Selector */}
              <Text style={modalStyles.filterLabel}>Branch</Text>
              <TouchableOpacity
                style={modalStyles.selectorBtn}
                onPress={() => {
                  fetchBranches("");
                  setBranchModalVisible(true);
                }}
              >
                <Ionicons name="business-outline" size={18} color="#666" />
                <Text style={modalStyles.selectorBtnText} numberOfLines={1}>
                  {selectedBranch
                    ? `(${selectedBranch.code}) ${selectedBranch.name}`
                    : "Select Branch"}
                </Text>
                {selectedBranch ? (
                  <TouchableOpacity onPress={() => setSelectedBranch(null)}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                )}
              </TouchableOpacity>

              {/* Employee Selector */}
              <Text style={modalStyles.filterLabel}>Employee</Text>
              <TouchableOpacity
                style={modalStyles.selectorBtn}
                onPress={() => {
                  if (!selectedBranch?.id) {
                    ToastMessage("Please Select The Branch");
                    return;
                  }
                  fetchEmployees("", selectedBranch.id);
                  setEmployeeModalVisible(true);
                }}
              >
                <Ionicons name="person-outline" size={18} color="#666" />
                <Text style={modalStyles.selectorBtnText} numberOfLines={1}>
                  {selectedEmployee
                    ? `(${selectedEmployee.code}) ${selectedEmployee.name}`
                    : "Select Employee"}
                </Text>
                {selectedEmployee ? (
                  <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                )}
              </TouchableOpacity>

              {/* Status Dropdown Trigger */}
              <Text style={modalStyles.filterLabel}>Tour Status</Text>
              <TouchableOpacity
                style={modalStyles.selectorBtn}
                onPress={() => setStatusModalVisible(true)}
              >
                <Ionicons name="flag-outline" size={18} color="#666" />
                <Text style={modalStyles.selectorBtnText} numberOfLines={1}>
                  {selectedStatus ? selectedStatus.name : "Select Status"}
                </Text>
                {selectedStatus ? (
                  <TouchableOpacity onPress={() => setSelectedStatus(null)}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                )}
              </TouchableOpacity>

              {/* Month Selector Trigger */}
              <Text style={modalStyles.filterLabel}>Month</Text>
              <TouchableOpacity
                style={modalStyles.selectorBtn}
                onPress={() => setMonthModalVisible(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#666" />
                <Text style={modalStyles.selectorBtnText} numberOfLines={1}>
                  {selectedMonth ? selectedMonth.text : "Select Month"}
                </Text>
                {selectedMonth ? (
                  <TouchableOpacity onPress={() => setSelectedMonth(null)}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                )}
              </TouchableOpacity>

              {/* Date Ranges: From Date & To Date */}
              <Text style={modalStyles.filterLabel}>Tour Dates</Text>
              <View style={modalStyles.dateRangeRow}>
                <TouchableOpacity
                  style={modalStyles.dateRangeBtn}
                  onPress={() => setActiveDatePicker("from")}
                >
                  <Text style={modalStyles.dateRangeBtnLabel}>From Date</Text>
                  <Text style={modalStyles.dateRangeBtnValue}>
                    {fromDate ? formatDateToDisplay(fromDate) : "Select"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={modalStyles.dateRangeBtn}
                  onPress={() => setActiveDatePicker("to")}
                >
                  <Text style={modalStyles.dateRangeBtnLabel}>To Date</Text>
                  <Text style={modalStyles.dateRangeBtnValue}>
                    {toDate ? formatDateToDisplay(toDate) : "Select"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Payment Date Ranges */}
              <Text style={modalStyles.filterLabel}>Payment Dates</Text>
              <View style={modalStyles.dateRangeRow}>
                <TouchableOpacity
                  style={modalStyles.dateRangeBtn}
                  onPress={() => setActiveDatePicker("payFrom")}
                >
                  <Text style={modalStyles.dateRangeBtnLabel}>Pay From Date</Text>
                  <Text style={modalStyles.dateRangeBtnValue}>
                    {paymentFromDate ? formatDateToDisplay(paymentFromDate) : "Select"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={modalStyles.dateRangeBtn}
                  onPress={() => setActiveDatePicker("payTo")}
                >
                  <Text style={modalStyles.dateRangeBtnLabel}>Pay To Date</Text>
                  <Text style={modalStyles.dateRangeBtnValue}>
                    {paymentToDate ? formatDateToDisplay(paymentToDate) : "Select"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Export & Download Actions from Angular */}
            <View style={modalStyles.exportBtnsRow}>
              <TouchableOpacity
                style={[modalStyles.exportBtn, { borderColor: CustomColors.appThemeColor }]}
                onPress={handleDownloadTourSummary}
                disabled={isTourDownloading}
              >
                {isTourDownloading ? (
                  <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
                ) : (
                  <>
                    <MaterialIcons name="file-download" size={16} color={CustomColors.appThemeColor} />
                    <Text style={[modalStyles.exportBtnText, { color: CustomColors.appThemeColor }]}>
                      Tour Report
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modalStyles.exportBtn,
                  {
                    borderColor: isDark ? "#2e7d32" : "#1B5E20",
                    backgroundColor: isDark ? "#064e3b" : "#E8F5E9",
                  },
                ]}
                onPress={handlePrepareExcel}
                disabled={isPreparingExcel}
              >
                {isPreparingExcel ? (
                  <ActivityIndicator size="small" color={isDark ? "#a7f3d0" : "#1B5E20"} />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={16} color={isDark ? "#a7f3d0" : "#1B5E20"} />
                    <Text
                      style={[
                        modalStyles.exportBtnText,
                        { color: isDark ? "#a7f3d0" : "#1B5E20" },
                      ]}
                    >
                      Prepare Excel
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modalStyles.exportBtn,
                  {
                    borderColor: isDark ? "#ea580c" : "#E65100",
                    backgroundColor: isDark ? "#431407" : "#FFF3E0",
                  },
                ]}
                onPress={handleDownloadProvisionReport}
                disabled={isProvisionDownloading}
              >
                {isProvisionDownloading ? (
                  <ActivityIndicator size="small" color={isDark ? "#fdba74" : "#E65100"} />
                ) : (
                  <>
                    <MaterialIcons name="download" size={16} color={isDark ? "#fdba74" : "#E65100"} />
                    <Text
                      style={[
                        modalStyles.exportBtnText,
                        { color: isDark ? "#fdba74" : "#E65100" },
                      ]}
                    >
                      Provision
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom Buttons */}
            <View style={modalStyles.footerBtns}>
              <TouchableOpacity style={modalStyles.resetBtn} onPress={handleClear}>
                <Text style={modalStyles.resetBtnText}>Reset All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.applyBtn, { backgroundColor: CustomColors.appThemeColor }]}
                onPress={handleSearch}
              >
                <Text style={modalStyles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* 4. BRANCH PICKER POPUP MODAL */}
      <Modal
        visible={branchModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setBranchModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={modalStyles.pickerModalContainer}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Select Branch</Text>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.searchBox}>
              <Ionicons name="search" size={18} color="#888" />
              <TextInput
                style={modalStyles.searchInput}
                placeholder="Search branch..."
                value={branchSearch}
                onChangeText={(t) => {
                  setBranchSearch(t);
                  fetchBranches(t);
                }}
              />
            </View>

            {isBranchLoading ? (
              <ActivityIndicator size="small" color={CustomColors.appThemeColor} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={branchOptions}
                keyExtractor={(item) => String(item.id || item.code)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={modalStyles.pickerItem}
                    onPress={() => {
                      setSelectedBranch(item);
                      setSelectedEmployee(null);
                      setBranchModalVisible(false);
                      fetchEmployees("", item.id);
                    }}
                  >
                    <Text style={modalStyles.pickerItemTitle}>
                      ({item.code}) {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 5. EMPLOYEE PICKER POPUP MODAL */}
      <Modal
        visible={employeeModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEmployeeModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setEmployeeModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={modalStyles.pickerModalContainer}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setEmployeeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.searchBox}>
              <Ionicons name="search" size={18} color="#888" />
              <TextInput
                style={modalStyles.searchInput}
                placeholder="Search employee..."
                value={employeeSearch}
                onChangeText={(t) => {
                  setEmployeeSearch(t);
                  fetchEmployees(t);
                }}
              />
            </View>

            {isEmployeeLoading ? (
              <ActivityIndicator size="small" color={CustomColors.appThemeColor} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={employeeOptions}
                keyExtractor={(item) => String(item.id || item.code)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={modalStyles.pickerItem}
                    onPress={() => {
                      setSelectedEmployee(item);
                      setEmployeeModalVisible(false);
                    }}
                  >
                    <Text style={modalStyles.pickerItemTitle}>
                      ({item.code}) {item.name || item.full_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 6. STATUS PICKER POPUP MODAL */}
      <Modal
        visible={statusModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={modalStyles.pickerModalContainer}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Select Tour Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={statusList}
              keyExtractor={(item, idx) => String(item.id || idx)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.pickerItem}
                  onPress={() => {
                    setSelectedStatus(item);
                    setStatusModalVisible(false);
                  }}
                >
                  <Text style={modalStyles.pickerItemTitle}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 7. MONTH PICKER POPUP MODAL */}
      <Modal
        visible={monthModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMonthModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setMonthModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={modalStyles.pickerModalContainer}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Select Month</Text>
              <TouchableOpacity onPress={() => setMonthModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MONTH_OPTIONS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.pickerItem}
                  onPress={() => {
                    setSelectedMonth(item);
                    setMonthModalVisible(false);
                  }}
                >
                  <Text style={modalStyles.pickerItemTitle}>{item.text}</Text>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 8. APPROVAL FLOW HISTORY POPUP MODAL */}
      <Modal
        visible={historyModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setHistoryModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[modalStyles.modalContainer, { maxHeight: "80%" }]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={modalStyles.modalHeader}>
              <View>
                <Text style={modalStyles.modalTitle}>Approval Flow</Text>
                {historyTourId && (
                  <Text style={modalStyles.modalSubTitle}>Tour ID: {historyTourId}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {isHistoryLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
                <Text style={stateStyles.loadingText}>Loading approval history...</Text>
              </View>
            ) : approvalHistory.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Ionicons name="information-circle-outline" size={40} color="#999" />
                <Text style={stateStyles.emptySubtitle}>No approval history available.</Text>
              </View>
            ) : (
              <FlatList
                data={approvalHistory}
                keyExtractor={(item, idx) => String(item.id || idx)}
                renderItem={({ item, index }) => {
                  const approverCode = item.approver_code || "";
                  const approverName = item.approvedby || item.approver_name || "-";
                  const raisedCode = item.onbehalfof?.code || "";
                  const raisedName = item.onbehalfof?.full_name || "-";
                  const statusBadge = getBadgeColor(item.status_name || (item.status === 3 ? "APPROVED" : item.status === 4 ? "REJECTED" : "PENDING"));

                  const getStatusText = (st) => {
                    if (st === 1) return "REQUESTED";
                    if (st === 2) return "PENDING";
                    if (st === 3) return "APPROVED";
                    if (st === 4) return "REJECTED";
                    if (st === 5) return "RETURNED";
                    if (st === 6) return "Advance Submitted";
                    if (st === 17) return "Advance Cancel Submitted";
                    return item.status_name || `Status (${st})`;
                  };

                  return (
                    <View style={historyStyles.historyCard}>
                      <View style={historyStyles.historyTopRow}>
                        <View style={historyStyles.stepBadge}>
                          <Text style={historyStyles.stepText}>#{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={historyStyles.appType}>{item.apptype || "Tour Approval"}</Text>
                          <Text style={historyStyles.dateText}>
                            {formatDateToDisplay(item.approveddate || item.created_date)}
                          </Text>
                        </View>
                        <View style={[cardStyles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.border }]}>
                          <Text style={[cardStyles.statusBadgeText, { color: statusBadge.text }]}>
                            {getStatusText(item.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={historyStyles.detailRow}>
                        <Text style={historyStyles.label}>Approver:</Text>
                        <Text style={historyStyles.value}>
                          {approverCode ? `(${approverCode}) ` : ""}{approverName}
                        </Text>
                      </View>

                      {raisedName !== "-" && (
                        <View style={historyStyles.detailRow}>
                          <Text style={historyStyles.label}>Raised By:</Text>
                          <Text style={historyStyles.value}>
                            {raisedCode ? `(${raisedCode}) ` : ""}{raisedName}
                          </Text>
                        </View>
                      )}

                      {item.comment ? (
                        <View style={historyStyles.commentBox}>
                          <Text style={historyStyles.commentText}>"{item.comment}"</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                }}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* DateTimePicker Dialog */}
      {activeDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
};

export default TourReportScreen;

/* ==========================================================================
   DYNAMIC THEME STYLES
   ========================================================================== */

const getSearchStyles = (isDark, CustomColors) =>
  StyleSheet.create({
    searchCard: {
      backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
      marginHorizontal: horizontalScale(12),
      marginTop: verticalScale(8),
      marginBottom: verticalScale(4),
      borderRadius: 10,
      padding: moderateScale(10),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#334155" : "transparent",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    textInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#334155" : "#F5F5F7",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "#475569" : "#E0E0E0",
      height: verticalScale(40),
    },
    textInput: {
      flex: 1,
      paddingHorizontal: horizontalScale(8),
      fontSize: moderateScale(13),
      color: isDark ? "#f8fafc" : "#333",
    },
    filterBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: horizontalScale(12),
      height: verticalScale(40),
      borderRadius: 8,
      marginLeft: horizontalScale(8),
    },
    filterBtnText: {
      color: "#fff",
      fontSize: moderateScale(13),
      fontFamily: Fonts.SemiBold,
      marginLeft: 4,
    },
    chipsScroll: {
      marginTop: verticalScale(8),
      flexDirection: "row",
    },
    chipItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1e3a5f" : "#E8F0FE",
      borderRadius: 14,
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(4),
      marginRight: horizontalScale(6),
    },
    chipText: {
      fontSize: moderateScale(11),
      color: isDark ? "#93c5fd" : "#1967D2",
      fontFamily: Fonts.Medium,
      marginRight: 4,
    },
  });

const getCardStyles = (isDark, CustomColors) =>
  StyleSheet.create({
    cardContainer: {
      marginHorizontal: horizontalScale(12),
      marginBottom: verticalScale(10),
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#E0E0E0",
      padding: moderateScale(12),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1.5 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 3,
      elevation: 2,
      backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    sNoCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: isDark ? "#1e3a5f" : "#E3F2FD",
      alignItems: "center",
      justifyContent: "center",
    },
    sNoText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.Bold,
      color: isDark ? "#93c5fd" : "#1976D2",
    },
    tourNoText: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.Bold,
    },
    crnSubText: {
      fontSize: moderateScale(11),
      color: isDark ? "#94a3b8" : "#777",
    },
    statusBadge: {
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(3),
      borderRadius: 10,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.Bold,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? "#334155" : "#F0F0F0",
      marginVertical: verticalScale(8),
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: verticalScale(4),
    },
    employeeNameText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.SemiBold,
      color: isDark ? "#f8fafc" : "#222",
    },
    metaText: {
      fontSize: moderateScale(11),
      color: isDark ? "#94a3b8" : "#666",
    },
    branchText: {
      fontSize: moderateScale(12),
      color: isDark ? "#cbd5e1" : "#444",
    },
    datesCard: {
      flexDirection: "row",
      backgroundColor: isDark ? "#0f172a" : "#F9FAFB",
      borderRadius: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#334155" : "transparent",
      padding: moderateScale(8),
      marginVertical: verticalScale(6),
      justifyContent: "space-between",
    },
    dateCol: {
      alignItems: "center",
      flex: 1,
    },
    dateLabel: {
      fontSize: moderateScale(10),
      color: isDark ? "#94a3b8" : "#888",
      fontFamily: Fonts.Medium,
    },
    dateValue: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.SemiBold,
      color: isDark ? "#f8fafc" : "#333",
      marginTop: 2,
    },
    financialsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: verticalScale(6),
      paddingVertical: verticalScale(6),
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: isDark ? "#334155" : "#F0F0F0",
    },
    amountContainer: {
      flex: 1,
    },
    amountLabel: {
      fontSize: moderateScale(10),
      color: isDark ? "#94a3b8" : "#888",
    },
    amountValueApproved: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.Bold,
      color: isDark ? "#4ade80" : "#2E7D32",
    },
    amountValueAdvance: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.Bold,
      color: isDark ? "#f87171" : "#C62828",
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: verticalScale(6),
      gap: 6,
    },
    actionChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(4),
      borderRadius: 6,
      borderWidth: 1,
      backgroundColor: isDark ? "#334155" : "#FAFAFA",
    },
    actionChipText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.SemiBold,
      marginLeft: 3,
    },
  });

const getModalStyles = (isDark, CustomColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: horizontalScale(16),
    },
    modalContainer: {
      backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
      borderRadius: moderateScale(16),
      padding: moderateScale(16),
      width: "100%",
      maxHeight: "88%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#334155" : "transparent",
    },
    pickerModalContainer: {
      backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
      borderRadius: moderateScale(16),
      padding: moderateScale(16),
      width: "100%",
      maxHeight: "75%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#334155" : "transparent",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: verticalScale(12),
    },
    modalTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.Bold,
      color: isDark ? "#f8fafc" : "#222",
    },
    modalSubTitle: {
      fontSize: moderateScale(12),
      color: isDark ? "#94a3b8" : "#666",
      marginTop: 2,
    },
    filterLabel: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.SemiBold,
      color: isDark ? "#cbd5e1" : "#444",
      marginTop: verticalScale(8),
      marginBottom: verticalScale(4),
    },
    inputField: {
      backgroundColor: isDark ? "#334155" : "#F5F5F7",
      borderWidth: 1,
      borderColor: isDark ? "#475569" : "#E0E0E0",
      borderRadius: 8,
      paddingHorizontal: horizontalScale(10),
      height: verticalScale(40),
      fontSize: moderateScale(13),
      color: isDark ? "#f8fafc" : "#333",
    },
    selectorBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#334155" : "#F5F5F7",
      borderWidth: 1,
      borderColor: isDark ? "#475569" : "#E0E0E0",
      borderRadius: 8,
      paddingHorizontal: horizontalScale(10),
      height: verticalScale(40),
    },
    selectorBtnText: {
      flex: 1,
      marginLeft: horizontalScale(8),
      fontSize: moderateScale(13),
      color: isDark ? "#f8fafc" : "#333",
    },
    dateRangeRow: {
      flexDirection: "row",
      gap: 8,
    },
    dateRangeBtn: {
      flex: 1,
      backgroundColor: isDark ? "#334155" : "#F5F5F7",
      borderWidth: 1,
      borderColor: isDark ? "#475569" : "#E0E0E0",
      borderRadius: 8,
      padding: moderateScale(8),
    },
    dateRangeBtnLabel: {
      fontSize: moderateScale(10),
      color: isDark ? "#94a3b8" : "#888",
    },
    dateRangeBtnValue: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.SemiBold,
      color: isDark ? "#f8fafc" : "#333",
      marginTop: 2,
    },
    footerBtns: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: verticalScale(16),
      marginBottom: verticalScale(8),
    },
    resetBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      height: verticalScale(44),
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "#475569" : "#CCC",
      marginRight: horizontalScale(8),
      backgroundColor: isDark ? "#334155" : "transparent",
    },
    resetBtnText: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.SemiBold,
      color: isDark ? "#cbd5e1" : "#666",
    },
    applyBtn: {
      flex: 2,
      alignItems: "center",
      justifyContent: "center",
      height: verticalScale(44),
      borderRadius: 8,
      marginLeft: horizontalScale(8),
    },
    applyBtnText: {
      fontSize: moderateScale(14),
      fontFamily: Fonts.Bold,
      color: "#FFFFFF",
    },
    exportBtnsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: verticalScale(14),
      gap: 8,
    },
    exportBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: verticalScale(38),
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: horizontalScale(4),
    },
    exportBtnText: {
      fontSize: moderateScale(11),
      fontFamily: Fonts.Bold,
      marginLeft: 3,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#334155" : "#F5F5F7",
      borderWidth: 1,
      borderColor: isDark ? "#475569" : "#E0E0E0",
      borderRadius: 8,
      paddingHorizontal: horizontalScale(10),
      height: verticalScale(40),
      marginBottom: verticalScale(10),
    },
    searchInput: {
      flex: 1,
      marginLeft: horizontalScale(6),
      fontSize: moderateScale(13),
      color: isDark ? "#f8fafc" : "#333",
    },
    pickerItem: {
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#334155" : "#F0F0F0",
    },
    pickerItemTitle: {
      fontSize: moderateScale(13),
      color: isDark ? "#f8fafc" : "#222",
    },
  });

const getHistoryStyles = (isDark, CustomColors) =>
  StyleSheet.create({
    historyCard: {
      backgroundColor: isDark ? "#0f172a" : "#F9FAFB",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#E5E7EB",
      padding: moderateScale(10),
      marginBottom: verticalScale(8),
    },
    historyTopRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(6),
    },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: isDark ? "#334155" : "#E5E7EB",
      alignItems: "center",
      justifyContent: "center",
    },
    stepText: {
      fontSize: moderateScale(10),
      fontFamily: Fonts.Bold,
      color: isDark ? "#f8fafc" : "#374151",
    },
    appType: {
      fontSize: moderateScale(12),
      fontFamily: Fonts.Bold,
      color: isDark ? "#f8fafc" : "#1F2937",
    },
    dateText: {
      fontSize: moderateScale(10),
      color: isDark ? "#94a3b8" : "#6B7280",
    },
    detailRow: {
      flexDirection: "row",
      marginTop: verticalScale(2),
    },
    label: {
      fontSize: moderateScale(11),
      color: isDark ? "#94a3b8" : "#6B7280",
      width: 75,
    },
    value: {
      fontSize: moderateScale(11),
      color: isDark ? "#e2e8f0" : "#1F2937",
      fontFamily: Fonts.Medium,
      flex: 1,
    },
    commentBox: {
      backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#E5E7EB",
      padding: moderateScale(6),
      marginTop: verticalScale(6),
    },
    commentText: {
      fontSize: moderateScale(11),
      fontStyle: "italic",
      color: isDark ? "#94a3b8" : "#4B5563",
    },
  });

const getStateStyles = (isDark, CustomColors) =>
  StyleSheet.create({
    centeredContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: moderateScale(13),
      color: isDark ? "#94a3b8" : "#666",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: verticalScale(60),
      paddingHorizontal: horizontalScale(20),
    },
    emptyTitle: {
      fontSize: moderateScale(16),
      fontFamily: Fonts.Bold,
      color: isDark ? "#f8fafc" : "#444",
      marginTop: verticalScale(12),
    },
    emptySubtitle: {
      fontSize: moderateScale(12),
      color: isDark ? "#94a3b8" : "#888",
      textAlign: "center",
      marginTop: verticalScale(4),
    },
    counterBar: {
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(6),
    },
    counterText: {
      fontSize: moderateScale(12),
      color: isDark ? "#94a3b8" : "#666",
      fontFamily: Fonts.Medium,
    },
  });
