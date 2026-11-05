import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from "react";
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import {
  MaterialIcons,
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Environment } from "../../environment/Environment";

import {
  useGetRecoverySummaryMutation,
  useRecoveryEditMutation,
  useLazyBranchListQuery,
  useLazyEmployeeListQuery,
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

// Format date to "DD-MMM-YYYY"
const formatDateToDisplay = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString




    ("default", { month: "short" });
  const year = d.getFullYear(); 0
  return `${day}-${month}-${year}`; ` `
};

// Format currency to Indian standard
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return "0.00";
  }
  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const BATCH_SIZE = 20;

const AdvanceRecoverySummary = ({ navigation, route }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const token = useSelector((state) => state?.auth?.token);
  const modules = useSelector((state) => state.userModules?.modules);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const taFlags = route?.params?.taFlags;

  // Determine user recovery permissions from Redux modules and taFlags
  const { hasRecoveryPermission, isRecoveryMaker, isRecoveryChecker } = useMemo(() => {
    let maker = Boolean(taFlags?.recoveryMaker);
    let checker = Boolean(taFlags?.recoveryChecker);

    const taModule = modules?.find((m) => m.name === "TA e-Claim");
    const submodules = taModule?.submodule || [];
    const recoverySub = submodules.find(
      (s) =>
        s.name?.toLowerCase() === "recovery" ||
        s.name?.toLowerCase()?.includes("recovery")
    );
    const roles = recoverySub?.role || [];
    if (roles.some((r) => r.name?.toLowerCase() === "maker")) maker = true;
    if (roles.some((r) => r.name?.toLowerCase() === "checker")) checker = true;

    return {
      hasRecoveryPermission: maker || checker,
      isRecoveryMaker: maker,
      isRecoveryChecker: checker,
    };
  }, [taFlags, modules]);

  // Main data states
  const [allRecoveryData, setAllRecoveryData] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(BATCH_SIZE);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState("");

  // Filter States
  const [tourNo, setTourNo] = useState("");
  const [invoiceCrNo, setInvoiceCrNo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Modals
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [jvModalVisible, setJvModalVisible] = useState(false);
  const [activeJvItem, setActiveJvItem] = useState(null);
  const [existingJvMap, setExistingJvMap] = useState({});

  // Branch Search
  const [branchSearchText, setBranchSearchText] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);
  const [branchPage, setBranchPage] = useState(1);
  const [branchHasNext, setBranchHasNext] = useState(false);

  // Employee Search
  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // Active filter indicator
  const hasActiveFilters = Boolean(
    tourNo.trim() ||
    invoiceCrNo.trim() ||
    selectedBranch ||
    selectedEmployee
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (tourNo.trim()) count++;
    if (invoiceCrNo.trim()) count++;
    if (selectedBranch) count++;
    if (selectedEmployee) count++;
    return count;
  }, [tourNo, invoiceCrNo, selectedBranch, selectedEmployee]);

  // API Hooks
  const [triggerRecoverySummary, { isLoading }] = useGetRecoverySummaryMutation();
  const [triggerRecoveryEdit, { isLoading: isSubmittingJv }] = useRecoveryEditMutation();
  const [triggerBranchList, { isFetching: isBranchLoading }] = useLazyBranchListQuery();
  const [triggerEmployeeList, { isFetching: isEmployeeLoading }] = useLazyEmployeeListQuery();

  const isFetchingRef = useRef(false);

  // Header configuration
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor || "#0C4DA2",
      },
      headerTintColor: "#ffffff",
      headerTitle: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons
            name="cash-refund"
            size={22}
            color="#ffffff"
            style={{ marginRight: 8 }}
          />
          <Text
            allowFontScaling={false}
            style={{
              fontSize: moderateScale(18),
              fontFamily: Fonts.BOLD,
              fontWeight: "700",
              color: "#ffffff",
            }}
          >
            Advance Recovery
          </Text>
        </View>
      ),
      headerRight: () =>
        permissionDenied ? null : (
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 10 }}>
            {/* Download Report Button */}
            <TouchableOpacity
              onPress={handleDownloadReport}
              style={{ padding: 6, marginRight: 8 }}
              disabled={isDownloading || allRecoveryData.length === 0}
              activeOpacity={0.7}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <MaterialIcons
                  name="file-download"
                  size={24}
                  color="#ffffff"
                  style={{ opacity: allRecoveryData.length === 0 ? 0.4 : 1 }}
                />
              )}
            </TouchableOpacity>

            {/* Filter Button */}
            <TouchableOpacity
              onPress={() => setFilterModalVisible(true)}
              style={{ padding: 6, position: "relative" }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="filter-list" size={26} color="#ffffff" />
              {hasActiveFilters && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: "#FF5252",
                    borderWidth: 1.5,
                    borderColor: "#ffffff",
                  }}
                />
              )}
            </TouchableOpacity>
          </View>
        ),
    });
  }, [
    navigation,
    CustomColors,
    hasActiveFilters,
    isDownloading,
    allRecoveryData,
    permissionDenied,
    selectedBranch,
    selectedEmployee,
    tourNo,
    invoiceCrNo,
  ]);

  // Fetch Recovery Summary from Backend
  const fetchRecoverySummary = useCallback(
    async (customFilters = null) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      // Pre-check: If user modules exist and definitely do not have recovery role, abort early and show permission denied
      if (modules && modules.length > 0 && !hasRecoveryPermission) {
        setPermissionDenied(true);
        setPermissionErrorMessage(
          "You do not have permission to perform this action. Advance Recovery is restricted to authorized Recovery Maker or Checker users."
        );
        setAllRecoveryData([]);
        isFetchingRef.current = false;
        setIsRefreshing(false);
        return;
      }

      try {
        const payload = {
          Employee_code:
            customFilters?.employee?.code !== undefined
              ? customFilters.employee?.code || ""
              : selectedEmployee?.code || "",
          Employee_gid:
            customFilters?.employee?.id !== undefined
              ? customFilters.employee?.id
                ? String(customFilters.employee.id)
                : ""
              : selectedEmployee?.id
                ? String(selectedEmployee.id)
                : "",
          Branch_code:
            customFilters?.branch?.code !== undefined
              ? customFilters.branch?.code || ""
              : selectedBranch?.code || "",
          Branch_gid:
            customFilters?.branch?.id !== undefined
              ? customFilters.branch?.id
                ? String(customFilters.branch.id)
                : ""
              : selectedBranch?.id
                ? String(selectedBranch.id)
                : "",
          Invoice_No:
            customFilters?.tourNo !== undefined
              ? customFilters.tourNo.trim()
              : tourNo.trim(),
          Invoice_crno:
            customFilters?.invoiceCrNo !== undefined
              ? customFilters.invoiceCrNo.trim()
              : invoiceCrNo.trim(),
        };

        const response = await triggerRecoverySummary(payload).unwrap();

        setPermissionDenied(false);
        setPermissionErrorMessage("");

        const list = Array.isArray(response?.DATA)
          ? response.DATA
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setAllRecoveryData(list);

        const detectedJvs = {};
        list.forEach((item) => {
          const jvNum =
            item.jv_number ||
            item.jvnumber ||
            item.jv_no ||
            item.jecrno ||
            (Array.isArray(item.jv_data) && item.jv_data[0]?.jecrno);
          if (jvNum) {
            const ref =
              item.invoiceheader_crno ||
              item.ppxheader_crno ||
              item.tour_no ||
              item.invoiceheader_invoiceno;
            if (ref) detectedJvs[ref] = String(jvNum);
            if (item.tour_no) detectedJvs[item.tour_no] = String(jvNum);
            if (item.invoiceheader_invoiceno) detectedJvs[item.invoiceheader_invoiceno] = String(jvNum);
            if (item.invoiceheader_crno) detectedJvs[item.invoiceheader_crno] = String(jvNum);
            if (item.ppxheader_crno) detectedJvs[item.ppxheader_crno] = String(jvNum);
          }
        });
        if (Object.keys(detectedJvs).length > 0) {
          setExistingJvMap((prev) => ({ ...prev, ...detectedJvs }));
        }
      } catch (err) {
        console.error("Error fetching recovery summary:", err);
        setAllRecoveryData([]);

        const status = err?.status;
        const detail =
          err?.data?.detail ||
          err?.data?.details ||
          err?.data?.message ||
          err?.data?.error ||
          err?.message ||
          "";

        const isPermissionError =
          status === 403 ||
          String(detail).toLowerCase().includes("permission") ||
          String(detail).toLowerCase().includes("not authorized") ||
          String(detail).toLowerCase().includes("forbidden");

        if (isPermissionError) {
          setPermissionDenied(true);
          setPermissionErrorMessage(
            typeof detail === "string" && detail.trim()
              ? detail
              : "You do not have permission to perform this action. Advance Recovery is restricted to authorized Recovery Maker or Checker users."
          );
        } else {
          ToastMessage(detail || "Failed to load recovery summary");
        }
      } finally {
        isFetchingRef.current = false;
        setIsRefreshing(false);
      }
    },
    [
      triggerRecoverySummary,
      selectedEmployee,
      selectedBranch,
      tourNo,
      invoiceCrNo,
      modules,
      hasRecoveryPermission,
    ]
  );

  // Retry when access is restricted or failed
  const handleRetry = () => {
    setPermissionDenied(false);
    setPermissionErrorMessage("");
    fetchRecoverySummary();
  };

  // Initial Load
  useEffect(() => {
    fetchRecoverySummary();
  }, []);

  // Pull to refresh
  const onRefresh = () => {
    setIsRefreshing(true);
    setDisplayLimit(BATCH_SIZE);
    fetchRecoverySummary();
  };

  // Search submission from quick bar
  const handleQuickSearch = () => {
    setDisplayLimit(BATCH_SIZE);
    fetchRecoverySummary();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setTourNo("");
    setInvoiceCrNo("");
    setSelectedBranch(null);
    setSelectedEmployee(null);
    setDisplayLimit(BATCH_SIZE);
    fetchRecoverySummary({
      tourNo: "",
      invoiceCrNo: "",
      branch: null,
      employee: null,
    });
  };

  // Fetch branches via search_employeebranch API
  const fetchBranches = async (query = "", pageNo = 1, append = false) => {
    try {
      const res = await triggerBranchList({ name: query, page: pageNo }).unwrap();
      const list = Array.isArray(res?.data) ? res.data : [];
      setBranchHasNext(Boolean(res?.pagination?.has_next));
      setBranchPage(pageNo);
      if (append) {
        setBranchOptions((prev) => [...prev, ...list]);
      } else {
        setBranchOptions(list);
      }
    } catch (e) {
      console.error("Branch fetch error:", e);
      if (!append) setBranchOptions([]);
    }
  };

  // Fetch employees via branchwise_employee_get API
  const fetchEmployees = async (query = "") => {
    try {
      const branchId = selectedBranch?.id || 0;
      let searchStr = "";
      if (typeof query === "string") {
        searchStr = query;
      } else if (query && typeof query === "object") {
        searchStr = query.name || query.full_name || query.code || "";
      }
      searchStr = String(searchStr).trim();
      if (searchStr === "[object Object]") {
        searchStr = "";
      }

      const res = await triggerEmployeeList({
        branch: branchId,
        name: searchStr,
        page: 1,
      }).unwrap();
      const list = Array.isArray(res?.data) ? res.data : [];
      setEmployeeOptions(list);
    } catch (e) {
      console.error("Employee fetch error:", e);
      setEmployeeOptions([]);
    }
  };

  // Download Tour Advance Recovery Report (matching Angular touradvdownload)
  const handleDownloadReport = async () => {
    if (isDownloading) return;

    if (permissionDenied) {
      ToastMessage("You do not have permission to download the recovery report.");
      return;
    }

    if (!allRecoveryData || allRecoveryData.length === 0) {
      ToastMessage("There are no recovery records available to download.");
      return;
    }

    setIsDownloading(true);
    try {
      const payload = {
        Branch_code: selectedBranch?.code || "",
        Employee_code: selectedEmployee?.code || "",
        Branch_gid: selectedBranch?.id || "",
        Employee_gid: selectedEmployee?.id || "",
        Invoice_No: tourNo.trim(),
        Invoice_crno: invoiceCrNo.trim(),
        report: 1,
      };

      const url = `${Environment.taServiceUrl}/taserv/recovery_summary`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Token ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 403) {
        ToastMessage("You do not have permission to download the recovery report.");
        return;
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (
          json.code === "UNEXPECTED_ERROR" ||
          json.MESSAGE === "NOT FOUND" ||
          (json.description && json.description.includes("None of [Index"))
        ) {
          ToastMessage("No advance recovery records available to download.");
          return;
        }
        ToastMessage(json.description || json.message || "Failed to download report.");
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const len = bytes.byteLength;
      const CHUNK_SIZE = 8192;
      for (let i = 0; i < len; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64data = (typeof btoa !== "undefined" ? btoa : global.btoa)(binary);

      const fileUri = `${FileSystem.cacheDirectory}Tour_Advance_Recovery_Report.xlsx`;
      await FileSystem.writeAsStringAsync(fileUri, base64data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Download Tour Recovery Report",
          UTI: "com.microsoft.excel.xlsx",
        });
      } else {
        ToastMessage("Report saved successfully.");
      }
    } catch (err) {
      console.error("Download report error:", err);
      ToastMessage(err.message || "An unexpected error occurred during download.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Total records count
  const totalRecords = allRecoveryData.length;

  // Reset display limit when allRecoveryData updates (e.g. after search/filter/refresh)
  useEffect(() => {
    setDisplayLimit(BATCH_SIZE);
  }, [allRecoveryData]);

  // Continuous scrolling data: subset of records rendered, expanding on scroll
  const displayedData = useMemo(() => {
    return allRecoveryData.slice(0, displayLimit);
  }, [allRecoveryData, displayLimit]);

  // Load next chunk of records as user scrolls down
  const handleLoadMore = () => {
    if (displayLimit < allRecoveryData.length) {
      setDisplayLimit((prev) => Math.min(prev + BATCH_SIZE, allRecoveryData.length));
    }
  };

  // Overall Financial Totals
  const financialTotals = useMemo(() => {
    let totalAdvance = 0;
    let totalBalance = 0;

    allRecoveryData.forEach((item) => {
      totalAdvance += Number(item.ppxheader_amount) || 0;
      totalBalance += Number(item.ppxheader_balance) || 0;
    });

    const totalRecovered = Math.max(0, totalAdvance - totalBalance);

    return {
      totalAdvance,
      totalBalance,
      totalRecovered,
    };
  }, [allRecoveryData]);

  // Open JV Detail Modal
  const handleOpenJvModal = (item) => {
    setActiveJvItem(item);
    setJvModalVisible(true);
  };

  // Helper to extract or look up existing JV number for a tour record
  const getExistingJvNumber = useCallback(
    (item) => {
      if (!item) return null;
      const ref =
        item.invoiceheader_crno ||
        item.ppxheader_crno ||
        item.tour_no ||
        item.invoiceheader_invoiceno;
      if (ref && existingJvMap[ref]) return existingJvMap[ref];
      if (item.tour_no && existingJvMap[item.tour_no]) return existingJvMap[item.tour_no];
      if (item.invoiceheader_invoiceno && existingJvMap[item.invoiceheader_invoiceno])
        return existingJvMap[item.invoiceheader_invoiceno];
      if (item.invoiceheader_crno && existingJvMap[item.invoiceheader_crno])
        return existingJvMap[item.invoiceheader_crno];
      if (item.ppxheader_crno && existingJvMap[item.ppxheader_crno])
        return existingJvMap[item.ppxheader_crno];

      if (item.jv_number) return String(item.jv_number);
      if (item.jvnumber) return String(item.jvnumber);
      if (item.jv_no) return String(item.jv_no);
      if (item.jecrno) return String(item.jecrno);
      if (Array.isArray(item.jv_data) && item.jv_data.length > 0 && item.jv_data[0]?.jecrno) {
        return String(item.jv_data[0].jecrno);
      }
      return null;
    },
    [existingJvMap]
  );

  // Check if a JV is already created (cannot create duplicate JV)
  const hasJvCreated = useCallback(
    (item) => {
      if (!item) return false;
      if (
        item.jv_entry_id !== undefined &&
        item.jv_entry_id !== null &&
        item.jv_entry_id !== 0 &&
        item.jv_entry_id !== "0"
      ) {
        return true;
      }
      if (Array.isArray(item.jv_data) && item.jv_data.length > 0) {
        return true;
      }
      if (getExistingJvNumber(item)) {
        return true;
      }
      return false;
    },
    [getExistingJvNumber]
  );

  // Create JV Entry (matching Angular confirmjventry)
  const handleCreateJvEntry = (item) => {
    const balAmount = Number(item.ppxheader_balance) || 0;
    if (balAmount <= 0) {
      ToastMessage("This tour advance balance is already zero.");
      return;
    }

    if (hasJvCreated(item)) {
      const existingNo = getExistingJvNumber(item);
      ToastMessage(
        existingNo
          ? `JV entry already exists: ${existingNo}`
          : "JV entry has already been created for this tour."
      );
      return;
    }

    Alert.alert(
      "Confirm JV Entry",
      `Do you want to create a JV entry for Tour #${item.tour_no || item.invoiceheader_invoiceno || "-"} with balance amount ₹ ${formatCurrency(balAmount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create JV",
          style: "default",
          onPress: async () => {
            const itemCrn = item.invoiceheader_crno || item.ppxheader_crno;
            try {
              const payload = {
                crnno: itemCrn,
                balanceamt: balAmount,
              };
              const res = await triggerRecoveryEdit(payload).unwrap();
              if (
                res?.status === "success" ||
                res?.status?.toLowerCase?.() === "success" ||
                res?.STATUS === "0" ||
                res?.MESSAGE === "SUCCESS" ||
                res?.status === "0" ||
                res?.message?.toLowerCase?.() === "success" ||
                res?.data?.status === "success"
              ) {
                ToastMessage(res?.message || res?.description || "JV entry was created successfully.");
                fetchRecoverySummary();
              } else {
                const desc = res?.description || res?.message || "";
                const match = desc.match(/already created for the ref no\s*-\s*([^,]+),\s*jv number\s*-\s*([^"'\s]+)/i);
                if (match) {
                  const refNo = match[1].trim();
                  const jvNo = match[2].trim();
                  setExistingJvMap((prev) => ({
                    ...prev,
                    [refNo]: jvNo,
                    [itemCrn]: jvNo,
                    [item.tour_no]: jvNo,
                    [item.invoiceheader_invoiceno]: jvNo,
                  }));
                  ToastMessage(`JV entry already exists: ${jvNo}`);
                  fetchRecoverySummary();
                } else {
                  ToastMessage(desc || "Could not create JV entry.");
                }
              }
            } catch (err) {
              console.error("Error creating JV:", err);
              const desc = err?.data?.description || err?.data?.message || err?.message || "";
              const match = desc.match(/already created for the ref no\s*-\s*([^,]+),\s*jv number\s*-\s*([^"'\s]+)/i);
              if (match) {
                const refNo = match[1].trim();
                const jvNo = match[2].trim();
                setExistingJvMap((prev) => ({
                  ...prev,
                  [refNo]: jvNo,
                  [itemCrn]: jvNo,
                  [item.tour_no]: jvNo,
                  [item.invoiceheader_invoiceno]: jvNo,
                }));
                ToastMessage(`JV entry already exists: ${jvNo}`);
                fetchRecoverySummary();
              } else {
                ToastMessage(
                  err?.data?.description ||
                  err?.data?.message ||
                  err?.message ||
                  "Failed to create JV entry."
                );
              }
            }
          },
        },
      ]
    );
  };

  // Render individual Recovery Card
  const renderItem = ({ item }) => {
    const advAmount = Number(item.ppxheader_amount) || 0;
    const balAmount = Number(item.ppxheader_balance) || 0;
    const recoveredAmount = Math.max(0, advAmount - balAmount);
    const isFullyRecovered = balAmount <= 0;
    const jvCount = Array.isArray(item.jv_data) ? item.jv_data.length : 0;
    const existingJvNo = getExistingJvNumber(item);
    const hasJv = hasJvCreated(item);

    return (
      <View
        style={[
          cardStyles.card,
          {
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            borderColor: isDark ? "#334155" : "#EAEFF5",
          },
        ]}
      >
        {/* Card Header: Tour No & Date */}
        <View style={cardStyles.cardHeader}>
          <View style={cardStyles.tourBadgeContainer}>
            <View style={cardStyles.tourBadge}>
              <Ionicons name="airplane" size={13} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={cardStyles.tourBadgeText}>
                #{item.tour_no || item.invoiceheader_invoiceno || "-"}
              </Text>
            </View>
            <Text style={[cardStyles.crNoText, { color: isDark ? "#cbd5e1" : "#64748B" }]} numberOfLines={1}>
              {item.invoiceheader_crno || item.ppxheader_crno || "-"}
            </Text>
          </View>

          <View style={[cardStyles.dateBadge, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
            <Ionicons name="calendar-outline" size={13} color={isDark ? "#94a3b8" : "#555"} style={{ marginRight: 4 }} />
            <Text style={[cardStyles.dateText, { color: isDark ? "#cbd5e1" : "#475569" }]}>
              {formatDateToDisplay(item.ppxheader_date)}
            </Text>
          </View>
        </View>

        {/* Employee & Branch Section */}
        <View style={cardStyles.infoSection}>
          <View style={cardStyles.infoRow}>
            <View style={[cardStyles.iconCircle, { backgroundColor: isDark ? "#334155" : "#EFF6FF" }]}>
              <MaterialIcons name="person" size={16} color={isDark ? "#60a5fa" : "#0C4DA2"} />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[cardStyles.infoLabel, { color: isDark ? "#94a3b8" : "#94A3B8" }]}>Employee</Text>
              <Text style={[cardStyles.infoValue, { color: isDark ? "#f8fafc" : "#1E293B" }]} numberOfLines={1}>
                {item.employee_name || "-"} ({item.employee_code || "-"})
              </Text>
            </View>

            {item.Advance_By ? (
              <View style={[cardStyles.advanceByBadge, { backgroundColor: isDark ? "#451a03" : "#FEF3C7" }]}>
                <Text style={[cardStyles.advanceByText, { color: isDark ? "#fcd34d" : "#92400E" }]}>{item.Advance_By}</Text>
              </View>
            ) : null}
          </View>

          <View style={[cardStyles.infoRow, { marginTop: 6 }]}>
            <View style={[cardStyles.iconCircle, { backgroundColor: isDark ? "#334155" : "#EFF6FF" }]}>
              <MaterialIcons name="apartment" size={16} color={isDark ? "#60a5fa" : "#0C4DA2"} />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[cardStyles.infoLabel, { color: isDark ? "#94a3b8" : "#94A3B8" }]}>Branch</Text>
              <Text style={[cardStyles.infoValue, { color: isDark ? "#cbd5e1" : "#1E293B" }]} numberOfLines={1}>
                {item.branch_name || "-"} ({item.branch_code || "-"})
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[cardStyles.divider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

        {/* Financial Details Row */}
        <View
          style={[
            cardStyles.amountGrid,
            {
              backgroundColor: isDark ? "#0f172a" : "#F8FAFC",
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? "#334155" : "transparent",
            },
          ]}
        >
          {/* Advance Amount */}
          <View style={cardStyles.amountColumn}>
            <Text style={[cardStyles.amountLabel, { color: isDark ? "#94a3b8" : "#64748B" }]}>Advance Amount</Text>
            <Text style={[cardStyles.amountValue, { color: isDark ? "#f8fafc" : "#1E293B" }]}>
              ₹ {formatCurrency(advAmount)}
            </Text>
          </View>

          {/* Recovered Amount */}
          <View style={cardStyles.amountColumn}>
            <Text style={[cardStyles.amountLabel, { color: isDark ? "#94a3b8" : "#64748B" }]}>Recovered</Text>
            <Text style={[cardStyles.amountValue, { color: isDark ? "#4ade80" : "#16A34A" }]}>
              ₹ {formatCurrency(recoveredAmount)}
            </Text>
          </View>

          {/* Balance Amount */}
          <View style={cardStyles.amountColumn}>
            <Text style={[cardStyles.amountLabel, { color: isDark ? "#94a3b8" : "#64748B" }]}>Balance</Text>
            <Text
              style={[
                cardStyles.amountValue,
                { color: isFullyRecovered ? (isDark ? "#4ade80" : "#16A34A") : (isDark ? "#f87171" : "#DC2626") },
              ]}
            >
              ₹ {formatCurrency(balAmount)}
            </Text>
          </View>
        </View>

        {/* Footer: Recovery Status & Actions */}
        <View style={cardStyles.cardFooter}>
          <View
            style={[
              cardStyles.statusBadge,
              isFullyRecovered
                ? { backgroundColor: isDark ? "#064e3b" : "#DCFCE7" }
                : { backgroundColor: isDark ? "#451a03" : "#FEF3C7" },
            ]}
          >
            <Ionicons
              name={isFullyRecovered ? "checkmark-circle" : "time-outline"}
              size={13}
              color={isFullyRecovered ? (isDark ? "#6ee7b7" : "#16A34A") : (isDark ? "#fcd34d" : "#B45309")}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                cardStyles.statusBadgeText,
                { color: isFullyRecovered ? (isDark ? "#a7f3d0" : "#16A34A") : (isDark ? "#fde68a" : "#B45309") },
              ]}
            >
              {isFullyRecovered ? "Fully Recovered" : "Pending Recovery"}
            </Text>
          </View>

          {/* Action Buttons: JV View, JV Created & JV Entry */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {hasJv ? (
              jvCount > 0 ? (
                <TouchableOpacity
                  style={[
                    cardStyles.jvButton,
                    {
                      backgroundColor: isDark ? "#1e3a5f" : "#EFF6FF",
                      borderColor: isDark ? "#3b82f6" : "#BFDBFE",
                    },
                  ]}
                  onPress={() => handleOpenJvModal(item)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={14}
                    color={isDark ? "#93c5fd" : "#0C4DA2"}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[cardStyles.jvButtonText, { color: isDark ? "#93c5fd" : "#0C4DA2" }]}>JV ({jvCount})</Text>
                  <Ionicons name="chevron-forward" size={12} color={isDark ? "#93c5fd" : "#0C4DA2"} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    cardStyles.jvCreatedButton,
                    {
                      backgroundColor: isDark ? "#042f2e" : "#F0FDFA",
                      borderColor: isDark ? "#0d9488" : "#99F6E4",
                    },
                  ]}
                  onPress={() => handleOpenJvModal(item)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={14}
                    color={isDark ? "#5eead4" : "#0D9488"}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[cardStyles.jvCreatedButtonText, { color: isDark ? "#5eead4" : "#0F766E" }]}>
                    {existingJvNo ? existingJvNo : "JV Created"}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={isDark ? "#5eead4" : "#0D9488"} />
                </TouchableOpacity>
              )
            ) : !isFullyRecovered ? (
              <TouchableOpacity
                style={[
                  cardStyles.createJvButton,
                  {
                    backgroundColor: isDark ? "#064e3b" : "#DCFCE7",
                    borderColor: isDark ? "#16a34a" : "#86EFAC",
                  },
                ]}
                onPress={() => handleCreateJvEntry(item)}
                activeOpacity={0.75}
                disabled={isSubmittingJv}
              >
                <MaterialIcons name="add-circle-outline" size={13} color={isDark ? "#86efac" : "#15803D"} style={{ marginRight: 3 }} />
                <Text style={[cardStyles.createJvButtonText, { color: isDark ? "#86efac" : "#15803D" }]}>JV Entry</Text>
              </TouchableOpacity>
            ) : (
              <View style={cardStyles.noJvBadge}>
                <Text style={[cardStyles.noJvText, { color: isDark ? "#64748b" : "#94A3B8" }]}>No JV Entries</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.container, { backgroundColor: isDark ? "#0f172a" : (CustomColors.backgroundLightGray || "#F3F5F8") }]}
      edges={["bottom"]}
    >
      {permissionDenied ? (
        <View style={[permStyles.wrapper, { backgroundColor: isDark ? "#0f172a" : "#F3F5F8" }]}>
          <View
            style={[
              permStyles.card,
              {
                backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "#334155" : "transparent",
              },
            ]}
          >
            <View style={[permStyles.iconCircle, { backgroundColor: isDark ? "#450a0a" : "#FEF2F2", borderColor: isDark ? "#7f1d1d" : "#FEE2E2" }]}>
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={moderateScale(48)}
                color="#EF4444"
              />
            </View>

            <Text style={[permStyles.title, { color: isDark ? "#f8fafc" : "#0F172A" }]}>Access Restricted</Text>
            <Text style={[permStyles.subtitle, { color: isDark ? "#94a3b8" : "#475569" }]}>
              You do not have permission to access Tour Advance Recovery.
            </Text>

            <View style={[permStyles.detailBox, { backgroundColor: isDark ? "#450a0a" : "#FEF2F2", borderColor: isDark ? "#7f1d1d" : "#FECACA" }]}>
              <MaterialIcons
                name="error-outline"
                size={moderateScale(18)}
                color="#EF4444"
                style={{ marginRight: 8, marginTop: 1 }}
              />
              <Text style={[permStyles.detailText, { color: isDark ? "#fca5a5" : "#991B1B" }]}>
                {permissionErrorMessage || "You do not have permission to perform this action."}
              </Text>
            </View>

            <Text style={[permStyles.helpText, { color: isDark ? "#94a3b8" : "#64748B" }]}>
              This section is restricted to authorized Advance Recovery Maker or Checker users. If you believe this is an error or require access, please contact your System Administrator.
            </Text>

            <View style={permStyles.btnRow}>
              <TouchableOpacity
                style={permStyles.backBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={moderateScale(18)} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={permStyles.backBtnText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[permStyles.retryBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9", borderColor: isDark ? "#475569" : "#CBD5E1" }]}
                onPress={handleRetry}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={moderateScale(18)} color={isDark ? "#93c5fd" : (CustomColors.appThemeColor || "#0C4DA2")} style={{ marginRight: 6 }} />
                <Text style={[permStyles.retryBtnText, { color: isDark ? "#93c5fd" : "#0C4DA2" }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* 1. DASHBOARD STAT OVERVIEW CARDS - DISPLAYED ONE BY ONE */}
          <View style={statStyles.statWrapper}>
            {/* Card 1: Records Card */}
            <View
              style={[
                statStyles.singleCard,
                {
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? "#334155" : "transparent",
                  borderLeftWidth: 4,
                  borderLeftColor: "#3B82F6",
                },
              ]}
            >
              <View style={[statStyles.iconCircle, { backgroundColor: isDark ? "#1e3a5f" : "#EFF6FF" }]}>
                <MaterialIcons name="format-list-numbered" size={18} color="#3B82F6" />
              </View>
              <View style={statStyles.cardTextContainer}>
                <Text style={[statStyles.cardTitle, { color: isDark ? "#94a3b8" : "#475569" }]}>Total Records</Text>
                <Text style={[statStyles.cardValue, { color: isDark ? "#f8fafc" : "#0F172A" }]}>{totalRecords} Records</Text>
              </View>
            </View>

            {/* Card 2: Total Advance Card */}
            <View
              style={[
                statStyles.singleCard,
                {
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? "#334155" : "transparent",
                  borderLeftWidth: 4,
                  borderLeftColor: isDark ? "#60a5fa" : "#0C4DA2",
                },
              ]}
            >
              <View style={[statStyles.iconCircle, { backgroundColor: isDark ? "#1e3a5f" : "#EEF2FF" }]}>
                <MaterialCommunityIcons name="cash-multiple" size={18} color={isDark ? "#60a5fa" : "#0C4DA2"} />
              </View>
              <View style={statStyles.cardTextContainer}>
                <Text style={[statStyles.cardTitle, { color: isDark ? "#94a3b8" : "#475569" }]}>Total Advance Amount</Text>
                <Text style={[statStyles.cardValue, { color: isDark ? "#60a5fa" : "#0C4DA2" }]}>
                  ₹ {formatCurrency(financialTotals.totalAdvance)}
                </Text>
              </View>
            </View>

            {/* Card 3: Total Recovered Card */}
            <View
              style={[
                statStyles.singleCard,
                {
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? "#334155" : "transparent",
                  borderLeftWidth: 4,
                  borderLeftColor: isDark ? "#4ade80" : "#10B981",
                },
              ]}
            >
              <View style={[statStyles.iconCircle, { backgroundColor: isDark ? "#064e3b" : "#ECFDF5" }]}>
                <Ionicons name="checkmark-done-circle" size={18} color={isDark ? "#4ade80" : "#10B981"} />
              </View>
              <View style={statStyles.cardTextContainer}>
                <Text style={[statStyles.cardTitle, { color: isDark ? "#94a3b8" : "#475569" }]}>Total Recovered Amount</Text>
                <Text style={[statStyles.cardValue, { color: isDark ? "#4ade80" : "#10B981" }]}>
                  ₹ {formatCurrency(financialTotals.totalRecovered)}
                </Text>
              </View>
            </View>

            {/* Card 4: Outstanding Balance Card */}
            <View
              style={[
                statStyles.singleCard,
                {
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? "#334155" : "transparent",
                  borderLeftWidth: 4,
                  borderLeftColor: isDark ? "#f87171" : "#EF4444",
                },
              ]}
            >
              <View style={[statStyles.iconCircle, { backgroundColor: isDark ? "#450a0a" : "#FEF2F2" }]}>
                <MaterialIcons name="hourglass-empty" size={18} color={isDark ? "#f87171" : "#EF4444"} />
              </View>
              <View style={statStyles.cardTextContainer}>
                <Text style={[statStyles.cardTitle, { color: isDark ? "#94a3b8" : "#475569" }]}>Outstanding Balance</Text>
                <Text style={[statStyles.cardValue, { color: isDark ? "#f87171" : "#EF4444" }]}>
                  ₹ {formatCurrency(financialTotals.totalBalance)}
                </Text>
              </View>
            </View>
          </View>


          {/* 3. ACTIVE FILTERS PILLS (ALL 4 FIELDS WITH QUICK REMOVE) */}
          {hasActiveFilters && (
            <View style={searchStyles.activeFilterPillsRow}>
              {tourNo.trim().length > 0 && (
                <View style={[searchStyles.activePill, { backgroundColor: isDark ? "#334155" : "#E0E7FF" }]}>
                  <Ionicons name="search" size={12} color={isDark ? "#93c5fd" : "#0C4DA2"} style={{ marginRight: 4 }} />
                  <Text style={[searchStyles.activePillText, { color: isDark ? "#f8fafc" : "#1E1B4B" }]} numberOfLines={1}>
                    Tour: {tourNo.trim()}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setTourNo("");
                      fetchRecoverySummary({ tourNo: "" });
                    }}
                    style={{ marginLeft: 4 }}
                  >
                    <Ionicons name="close" size={14} color={isDark ? "#94a3b8" : "#555"} />
                  </TouchableOpacity>
                </View>
              )}

              {invoiceCrNo.trim().length > 0 && (
                <View style={[searchStyles.activePill, { backgroundColor: isDark ? "#334155" : "#E0E7FF" }]}>
                  <Ionicons name="barcode-outline" size={12} color={isDark ? "#93c5fd" : "#0C4DA2"} style={{ marginRight: 4 }} />
                  <Text style={[searchStyles.activePillText, { color: isDark ? "#f8fafc" : "#1E1B4B" }]} numberOfLines={1}>
                    CR: {invoiceCrNo.trim()}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setInvoiceCrNo("");
                      fetchRecoverySummary({ invoiceCrNo: "" });
                    }}
                    style={{ marginLeft: 4 }}
                  >
                    <Ionicons name="close" size={14} color={isDark ? "#94a3b8" : "#555"} />
                  </TouchableOpacity>
                </View>
              )}

              {selectedBranch && (
                <View style={[searchStyles.activePill, { backgroundColor: isDark ? "#334155" : "#E0E7FF" }]}>
                  <MaterialIcons name="apartment" size={12} color={isDark ? "#93c5fd" : "#0C4DA2"} style={{ marginRight: 4 }} />
                  <Text style={[searchStyles.activePillText, { color: isDark ? "#f8fafc" : "#1E1B4B" }]} numberOfLines={1}>
                    Branch: {selectedBranch.name || selectedBranch.code}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedBranch(null);
                      fetchRecoverySummary({ branch: null });
                    }}
                    style={{ marginLeft: 4 }}
                  >
                    <Ionicons name="close" size={14} color={isDark ? "#94a3b8" : "#555"} />
                  </TouchableOpacity>
                </View>
              )}

              {selectedEmployee && (
                <View style={[searchStyles.activePill, { backgroundColor: isDark ? "#334155" : "#E0E7FF" }]}>
                  <MaterialIcons name="person" size={12} color={isDark ? "#93c5fd" : "#0C4DA2"} style={{ marginRight: 4 }} />
                  <Text style={[searchStyles.activePillText, { color: isDark ? "#f8fafc" : "#1E1B4B" }]} numberOfLines={1}>
                    Emp: {selectedEmployee.name || selectedEmployee.code}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEmployee(null);
                      fetchRecoverySummary({ employee: null });
                    }}
                    style={{ marginLeft: 4 }}
                  >
                    <Ionicons name="close" size={14} color={isDark ? "#94a3b8" : "#555"} />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                onPress={handleClearFilters}
                style={searchStyles.clearAllPillBtn}
                activeOpacity={0.7}
              >
                <Text style={[searchStyles.clearAllPillText, { color: isDark ? "#fca5a5" : "#DC2626" }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 4. RECOVERY SUMMARY LIST OR EMPTY STATE */}
          {isLoading && !isRefreshing && allRecoveryData.length === 0 ? (
            <View style={stateStyles.centeredContainer}>
              <ActivityIndicator size="large" color={CustomColors.primaryColor || "#0C4DA2"} />
              <Text style={[stateStyles.loadingText, { color: isDark ? "#94a3b8" : "#64748B" }]}>Fetching recovery summary...</Text>
            </View>
          ) : (
            <FlatList
              data={displayedData}
              keyExtractor={(item, index) =>
                `${item.ppxheader_gid || item.invoiceheader_crno || item.tour_no}_${index}`
              }
              renderItem={renderItem}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: verticalScale(30) }}
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              windowSize={11}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  colors={[CustomColors.primaryColor || "#0C4DA2"]}
                />
              }
              ListFooterComponent={
                displayLimit < allRecoveryData.length ? (
                  <View style={{ paddingVertical: 18, alignItems: "center" }}>
                    <ActivityIndicator size="small" color={CustomColors.primaryColor || "#0C4DA2"} />
                    <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748B", marginTop: 6 }}>
                      Loading more cards ({displayedData.length} of {totalRecords})...
                    </Text>
                  </View>
                ) : allRecoveryData.length > 0 ? (
                  <View style={{ paddingVertical: 18, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, color: isDark ? "#64748b" : "#94A3B8" }}>
                      All {totalRecords} records loaded
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={stateStyles.emptyContainer}>
                  <FontAwesome5 name="inbox" size={52} color={isDark ? "#475569" : "#CBD5E1"} />
                  <Text style={[stateStyles.emptyTitle, { color: isDark ? "#f8fafc" : "#334155" }]}>No Recovery Records Found</Text>
                  <Text style={[stateStyles.emptySubtitle, { color: isDark ? "#94a3b8" : "#64748B" }]}>
                    {hasActiveFilters
                      ? "No advance recovery records match the selected filters."
                      : "No tour advance recoveries found."}
                  </Text>
                  {hasActiveFilters && (
                    <TouchableOpacity
                      style={stateStyles.resetEmptyBtn}
                      onPress={handleClearFilters}
                      activeOpacity={0.8}
                    >
                      <Text style={stateStyles.resetEmptyBtnText}>Clear All Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          )}
        </>
      )}

      {/* 6. ADVANCED FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View
            style={[
              modalStyles.modalContainer,
              {
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "#334155" : "transparent",
              },
            ]}
          >
            {/* Header */}
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="filter" size={20} color={isDark ? "#60a5fa" : (CustomColors.appThemeColor || "#0C4DA2")} style={{ marginRight: 6 }} />
                <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#0F172A" }]}>Filter Advance Recovery</Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#333"} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "78%" }}>
              {/* Invoice CR No */}
              <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#475569" }]}>Invoice CR No</Text>
              <View
                style={[
                  modalStyles.modalInputWrapper,
                  {
                    backgroundColor: isDark ? "#334155" : "#F8FAFC",
                    borderColor: isDark ? "#475569" : "#CBD5E1",
                  },
                ]}
              >
                <Ionicons name="barcode-outline" size={16} color={isDark ? "#94a3b8" : "#888"} style={{ marginRight: 6 }} />
                <TextInput
                  style={[modalStyles.modalInput, { color: isDark ? "#f8fafc" : "#1E293B" }]}
                  placeholder="e.g. TAF2403120002A1"
                  placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                  value={invoiceCrNo}
                  onChangeText={setInvoiceCrNo}
                />
                {invoiceCrNo.length > 0 && (
                  <TouchableOpacity onPress={() => setInvoiceCrNo("")}>
                    <Ionicons name="close-circle" size={16} color={isDark ? "#94a3b8" : "#999"} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Branch Selector */}
              <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#475569" }]}>Branch</Text>
              <TouchableOpacity
                style={[
                  modalStyles.selectorBtn,
                  {
                    backgroundColor: isDark ? "#334155" : "#F8FAFC",
                    borderColor: isDark ? "#475569" : "#CBD5E1",
                  },
                ]}
                onPress={() => {
                  fetchBranches("");
                  setBranchModalVisible(true);
                }}
                activeOpacity={0.75}
              >
                <MaterialIcons name="apartment" size={18} color={isDark ? "#60a5fa" : (CustomColors.appThemeColor || "#0C4DA2")} style={{ marginRight: 8 }} />
                <Text style={[modalStyles.selectorBtnText, { color: isDark ? "#f8fafc" : "#1E293B" }]} numberOfLines={1}>
                  {selectedBranch
                    ? selectedBranch.name_code || `${selectedBranch.code} - ${selectedBranch.name}`
                    : "Search & Select Branch"}
                </Text>
                {selectedBranch ? (
                  <TouchableOpacity onPress={() => setSelectedBranch(null)}>
                    <Ionicons name="close-circle" size={18} color={isDark ? "#94a3b8" : "#999"} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={isDark ? "#94a3b8" : "#999"} />
                )}
              </TouchableOpacity>

              {/* Employee Selector */}
              <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#475569" }]}>Employee</Text>
              <TouchableOpacity
                style={[
                  modalStyles.selectorBtn,
                  {
                    backgroundColor: isDark ? "#334155" : "#F8FAFC",
                    borderColor: isDark ? "#475569" : "#CBD5E1",
                  },
                ]}
                onPress={() => {
                  fetchEmployees("");
                  setEmployeeModalVisible(true);
                }}
                activeOpacity={0.75}
              >
                <MaterialIcons name="person-outline" size={18} color={isDark ? "#60a5fa" : (CustomColors.appThemeColor || "#0C4DA2")} style={{ marginRight: 8 }} />
                <Text style={[modalStyles.selectorBtnText, { color: isDark ? "#f8fafc" : "#1E293B" }]} numberOfLines={1}>
                  {selectedEmployee
                    ? selectedEmployee.full_name || `(${selectedEmployee.code}) ${selectedEmployee.name}`
                    : "Search & Select Employee"}
                </Text>
                {selectedEmployee ? (
                  <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                    <Ionicons name="close-circle" size={18} color={isDark ? "#94a3b8" : "#999"} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={isDark ? "#94a3b8" : "#999"} />
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={modalStyles.footerBtns}>
              <TouchableOpacity
                style={[
                  modalStyles.resetBtn,
                  {
                    backgroundColor: isDark ? "#334155" : "#F1F5F9",
                    borderWidth: isDark ? 1 : 0,
                    borderColor: isDark ? "#475569" : "transparent",
                  },
                ]}
                onPress={() => {
                  setTourNo("");
                  setInvoiceCrNo("");
                  setSelectedBranch(null);
                  setSelectedEmployee(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[modalStyles.resetBtnText, { color: isDark ? "#cbd5e1" : "#475569" }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.applyBtn, { backgroundColor: CustomColors.appThemeColor || "#0C4DA2" }]}
                onPress={() => {
                  setFilterModalVisible(false);
                  setDisplayLimit(BATCH_SIZE);
                  fetchRecoverySummary();
                }}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. SEARCHABLE BRANCH PICKER MODAL (search_employeebranch API) */}
      <Modal
        visible={branchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View
            style={[
              modalStyles.pickerModalContainer,
              {
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "#334155" : "transparent",
              },
            ]}
          >
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="apartment" size={20} color={isDark ? "#60a5fa" : (CustomColors.appThemeColor || "#0C4DA2")} style={{ marginRight: 6 }} />
                <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#0F172A" }]}>Select Branch</Text>
              </View>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#333"} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                modalStyles.searchBox,
                {
                  backgroundColor: isDark ? "#334155" : "#F1F5F9",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? "#475569" : "transparent",
                },
              ]}
            >
              <Ionicons name="search" size={18} color={isDark ? "#94a3b8" : "#888"} style={{ marginRight: 6 }} />
              <TextInput
                style={[modalStyles.searchInput, { color: isDark ? "#f8fafc" : "#1E293B" }]}
                placeholder="Search branch by name or code..."
                placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                value={branchSearchText}
                onChangeText={(text) => {
                  setBranchSearchText(text);
                  fetchBranches(text, 1, false);
                }}
              />
              {branchSearchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setBranchSearchText("");
                    fetchBranches("", 1, false);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={isDark ? "#94a3b8" : "#999"} />
                </TouchableOpacity>
              )}
            </View>

            {isBranchLoading && branchOptions.length === 0 ? (
              <ActivityIndicator
                size="small"
                color={CustomColors.appThemeColor || "#0C4DA2"}
                style={{ marginTop: 24 }}
              />
            ) : (
              <FlatList
                data={branchOptions}
                keyExtractor={(item, index) => `${item.id || item.code || "branch"}_${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[modalStyles.pickerItem, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}
                    onPress={() => {
                      setSelectedBranch(item);
                      setBranchModalVisible(false);
                    }}
                  >
                    <View style={[modalStyles.pickerItemIconWrap, { backgroundColor: isDark ? "#1e3a5f" : "#EFF6FF" }]}>
                      <MaterialIcons name="business" size={16} color={isDark ? "#60a5fa" : "#0C4DA2"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[modalStyles.pickerItemTitle, { color: isDark ? "#f8fafc" : "#1E293B" }]}>
                        {item.name || item.name_code}
                      </Text>
                      <Text style={[modalStyles.pickerItemCode, { color: isDark ? "#94a3b8" : "#64748B" }]}>
                        Branch Code: {item.code}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? "#64748b" : "#C4C4C4"} />
                  </TouchableOpacity>
                )}
                onEndReached={() => {
                  if (branchHasNext && !isBranchLoading) {
                    fetchBranches(branchSearchText, branchPage + 1, true);
                  }
                }}
                onEndReachedThreshold={0.4}
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: "center" }}>
                    <Text style={{ color: isDark ? "#94a3b8" : "#888", fontSize: 13 }}>No branches found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 8. SEARCHABLE EMPLOYEE PICKER MODAL (branchwise_employee_get API) */}
      <Modal
        visible={employeeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmployeeModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View
            style={[
              modalStyles.pickerModalContainer,
              {
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "#334155" : "transparent",
              },
            ]}
          >
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="person" size={20} color={isDark ? "#60a5fa" : (CustomColors.appThemeColor || "#0C4DA2")} style={{ marginRight: 6 }} />
                <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#0F172A" }]}>Select Employee</Text>
              </View>
              <TouchableOpacity onPress={() => setEmployeeModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#333"} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                modalStyles.searchBox,
                {
                  backgroundColor: isDark ? "#334155" : "#F1F5F9",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? "#475569" : "transparent",
                },
              ]}
            >
              <Ionicons name="search" size={18} color={isDark ? "#94a3b8" : "#888"} style={{ marginRight: 6 }} />
              <TextInput
                style={[modalStyles.searchInput, { color: isDark ? "#f8fafc" : "#1E293B" }]}
                placeholder="Search employee by name or code..."
                placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                value={employeeSearchText}
                onChangeText={(text) => {
                  setEmployeeSearchText(text);
                  fetchEmployees(text);
                }}
              />
              {employeeSearchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setEmployeeSearchText("");
                    fetchEmployees("");
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={isDark ? "#94a3b8" : "#999"} />
                </TouchableOpacity>
              )}
            </View>

            {isEmployeeLoading && employeeOptions.length === 0 ? (
              <ActivityIndicator
                size="small"
                color={CustomColors.appThemeColor || "#0C4DA2"}
                style={{ marginTop: 24 }}
              />
            ) : (
              <FlatList
                data={employeeOptions}
                keyExtractor={(item, index) => `${item.id || item.code || "emp"}_${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[modalStyles.pickerItem, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}
                    onPress={() => {
                      setSelectedEmployee(item);
                      setEmployeeModalVisible(false);
                    }}
                  >
                    <View style={[modalStyles.pickerItemIconWrap, { backgroundColor: isDark ? "#1e3a5f" : "#EFF6FF" }]}>
                      <MaterialIcons name="person-outline" size={16} color={isDark ? "#60a5fa" : "#0C4DA2"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[modalStyles.pickerItemTitle, { color: isDark ? "#f8fafc" : "#1E293B" }]}>
                        {item.full_name || item.name}
                      </Text>
                      <Text style={[modalStyles.pickerItemCode, { color: isDark ? "#94a3b8" : "#64748B" }]}>
                        Emp Code: {item.code}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? "#64748b" : "#C4C4C4"} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: "center" }}>
                    <Text style={{ color: isDark ? "#94a3b8" : "#888", fontSize: 13 }}>No employees found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 9. JOURNAL VOUCHER (JV) ENTRIES MODAL */}
      <Modal
        visible={jvModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setJvModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View
            style={[
              modalStyles.modalContainer,
              {
                maxHeight: "75%",
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "#334155" : "transparent",
              },
            ]}
          >
            {/* Header */}
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}>
              <View>
                <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#0F172A" }]}>Journal Vouchers (JV)</Text>
                <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#666", marginTop: 2 }}>
                  Tour #{activeJvItem?.tour_no || activeJvItem?.invoiceheader_invoiceno} • CR:{" "}
                  {activeJvItem?.invoiceheader_crno}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setJvModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#333"} />
              </TouchableOpacity>
            </View>

            {/* JV List */}
            <FlatList
              data={
                Array.isArray(activeJvItem?.jv_data) && activeJvItem.jv_data.length > 0
                  ? activeJvItem.jv_data
                  : getExistingJvNumber(activeJvItem) || activeJvItem?.jv_entry_id
                    ? [
                      {
                        jecrno:
                          getExistingJvNumber(activeJvItem) ||
                          (activeJvItem?.jv_entry_id ? `JV #${activeJvItem.jv_entry_id}` : "-"),
                        jestatus: activeJvItem?.jv_status || "Approved",
                        jeamount: activeJvItem?.ppxheader_balance || activeJvItem?.ppxheader_amount || 0,
                      },
                    ]
                    : []
              }
              keyExtractor={(jv, i) => `${jv.jecrno || i}_${i}`}
              contentContainerStyle={{ paddingVertical: 10 }}
              renderItem={({ item: jv, index }) => {
                const isReturned = jv.jestatus === "Returned";
                const isApproved = jv.jestatus === "Approved";
                const isPending = !isReturned && !isApproved;

                return (
                  <View
                    style={[
                      jvStyles.jvCard,
                      {
                        backgroundColor: isDark ? "#0f172a" : "#F8FAFC",
                        borderColor: isDark ? "#334155" : "#E2E8F0",
                      },
                    ]}
                  >
                    <View style={jvStyles.jvHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={jvStyles.jvIndexBadge}>
                          <Text style={jvStyles.jvIndexText}>#{index + 1}</Text>
                        </View>
                        <Text style={[jvStyles.jvCrNo, { color: isDark ? "#f8fafc" : "#1E293B" }]}>{jv.jecrno || "-"}</Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          jvStyles.statusChip,
                          isReturned
                            ? { backgroundColor: isDark ? "#450a0a" : "#FEE2E2" }
                            : isApproved
                              ? { backgroundColor: isDark ? "#064e3b" : "#DCFCE7" }
                              : { backgroundColor: isDark ? "#451a03" : "#FEF3C7" },
                        ]}
                      >
                        <Text
                          style={[
                            jvStyles.statusChipText,
                            isReturned
                              ? { color: isDark ? "#fca5a5" : "#DC2626" }
                              : isApproved
                                ? { color: isDark ? "#86efac" : "#16A34A" }
                                : { color: isDark ? "#fde68a" : "#B45309" },
                          ]}
                        >
                          {jv.jestatus || "Pending"}
                        </Text>
                      </View>
                    </View>

                    <View style={[jvStyles.jvBody, { borderTopColor: isDark ? "#334155" : "#EDF2F7" }]}>
                      <Text style={[jvStyles.jvAmountLabel, { color: isDark ? "#94a3b8" : "#64748B" }]}>Voucher Amount:</Text>
                      <Text style={[jvStyles.jvAmountValue, { color: isDark ? "#f8fafc" : "#0F172A" }]}>
                        ₹ {formatCurrency(jv.jeamount)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: "center" }}>
                  <Text style={{ color: isDark ? "#94a3b8" : "#888" }}>No Journal Vouchers found.</Text>
                </View>
              }
            />

            <TouchableOpacity
              style={[modalStyles.applyBtn, { backgroundColor: CustomColors.appThemeColor || "#0C4DA2", marginTop: 12 }]}
              onPress={() => setJvModalVisible(false)}
            >
              <Text style={modalStyles.applyBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdvanceRecoverySummary;

// =========================================================================
// STYLES
// =========================================================================

const statStyles = StyleSheet.create({
  statWrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  singleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.MEDIUM,
    color: "#475569",
  },
  cardValue: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.BOLD,
    fontWeight: "700",
    color: "#0F172A",
  },
});

const searchStyles = StyleSheet.create({
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  filterFieldBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    height: verticalScale(42),
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  filterFieldBarActive: {
    backgroundColor: "#F8FAFC",
  },
  filterFieldPlaceholder: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.REGULAR,
    color: "#64748B",
  },
  filterFieldTextActive: {
    color: "#0F172A",
    fontFamily: Fonts.SEMIBOLD,
    fontWeight: "600",
  },
  filterBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  filterTriggerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    height: verticalScale(40),
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  filterTriggerBtnActive: {
    backgroundColor: "#0C4DA2",
    borderColor: "#0C4DA2",
  },
  filterTriggerBtnText: {
    color: "#1E293B",
    fontFamily: Fonts.SEMIBOLD,
    fontSize: moderateScale(13),
    fontWeight: "600",
    marginLeft: 6,
  },
  filterTriggerBtnTextActive: {
    color: "#ffffff",
  },
  filterCountBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  filterCountText: {
    color: "#ffffff",
    fontSize: moderateScale(11),
    fontFamily: Fonts.BOLD,
    fontWeight: "700",
  },
  downloadTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderRadius: 8,
    height: verticalScale(40),
    paddingHorizontal: 14,
    marginLeft: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  downloadTriggerBtnText: {
    color: "#ffffff",
    fontFamily: Fonts.SEMIBOLD,
    fontSize: moderateScale(13),
    fontWeight: "600",
    marginLeft: 6,
  },
  activeFilterPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E7FF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 4,
  },
  activePillText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.MEDIUM,
    color: "#1E1B4B",
    maxWidth: 160,
  },
  clearAllPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  clearAllPillText: {
    color: "#DC2626",
    fontSize: moderateScale(11),
    fontFamily: Fonts.SEMIBOLD,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginVertical: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: "#EAEFF5",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tourBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tourBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0C4DA2",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  tourBadgeText: {
    color: "#ffffff",
    fontSize: moderateScale(12),
    fontFamily: Fonts.BOLD,
    fontWeight: "700",
  },
  crNoText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.MEDIUM,
    color: "#64748B",
    flex: 1,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  dateText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.REGULAR,
    color: "#475569",
  },
  infoSection: {
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: moderateScale(10),
    fontFamily: Fonts.REGULAR,
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.SEMIBOLD,
    color: "#1E293B",
  },
  advanceByBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  advanceByText: {
    fontSize: moderateScale(10),
    fontFamily: Fonts.BOLD,
    color: "#92400E",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  amountGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
  },
  amountColumn: {
    flex: 1,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: moderateScale(10),
    fontFamily: Fonts.REGULAR,
    color: "#64748B",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.BOLD,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  statusFullyRecovered: {
    backgroundColor: "#DCFCE7",
  },
  statusPendingRecovery: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.SEMIBOLD,
    fontWeight: "600",
  },
  jvButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jvButtonText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.SEMIBOLD,
    color: "#0C4DA2",
    marginRight: 2,
  },
  createJvButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  createJvButtonText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.SEMIBOLD,
    color: "#15803D",
    fontWeight: "600",
  },
  jvCreatedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jvCreatedButtonText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.SEMIBOLD,
    color: "#0F766E",
    fontWeight: "600",
    marginRight: 2,
  },
  noJvBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noJvText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.REGULAR,
    color: "#94A3B8",
    fontStyle: "italic",
  },
});



const stateStyles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: moderateScale(13),
    color: "#64748B",
    fontFamily: Fonts.MEDIUM,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.BOLD,
    color: "#334155",
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.REGULAR,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
  },
  resetEmptyBtn: {
    marginTop: 16,
    backgroundColor: "#0C4DA2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetEmptyBtnText: {
    color: "#ffffff",
    fontFamily: Fonts.SEMIBOLD,
    fontSize: moderateScale(12),
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    width: "100%",
    maxWidth: 440,
    borderRadius: 16,
    padding: 18,
    maxHeight: "86%",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  pickerModalContainer: {
    backgroundColor: "#ffffff",
    width: "100%",
    maxWidth: 440,
    borderRadius: 16,
    padding: 18,
    maxHeight: "85%",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.BOLD,
    fontWeight: "700",
    color: "#0F172A",
  },
  filterLabel: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.SEMIBOLD,
    color: "#475569",
    marginTop: 12,
    marginBottom: 4,
  },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: verticalScale(40),
    backgroundColor: "#F8FAFC",
  },
  modalInput: {
    flex: 1,
    fontSize: moderateScale(13),
    color: "#1E293B",
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: verticalScale(40),
    backgroundColor: "#F8FAFC",
  },
  selectorBtnText: {
    flex: 1,
    fontSize: moderateScale(13),
    color: "#1E293B",
  },
  footerBtns: {
    flexDirection: "row",
    marginTop: 16,
  },
  resetBtn: {
    flex: 1,
    height: verticalScale(42),
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  resetBtnText: {
    color: "#475569",
    fontFamily: Fonts.SEMIBOLD,
    fontSize: moderateScale(14),
  },
  applyBtn: {
    flex: 2,
    height: verticalScale(42),
    backgroundColor: "#0C4DA2",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnText: {
    color: "#ffffff",
    fontFamily: Fonts.SEMIBOLD,
    fontSize: moderateScale(14),
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
    height: verticalScale(40),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13),
    color: "#1E293B",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  pickerItemIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  pickerItemTitle: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.SEMIBOLD,
    color: "#1E293B",
  },
  pickerItemCode: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.REGULAR,
    color: "#64748B",
    marginTop: 1,
  },
});

const jvStyles = StyleSheet.create({
  jvCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  jvHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jvIndexBadge: {
    backgroundColor: "#0C4DA2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  jvIndexText: {
    color: "#ffffff",
    fontSize: moderateScale(10),
    fontFamily: Fonts.BOLD,
  },
  jvCrNo: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.SEMIBOLD,
    color: "#1E293B",
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  chipReturned: {
    backgroundColor: "#FEE2E2",
  },
  chipApproved: {
    backgroundColor: "#DCFCE7",
  },
  chipPending: {
    backgroundColor: "#FEF3C7",
  },
  statusChipText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.SEMIBOLD,
  },
  jvBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#EDF2F7",
  },
  jvAmountLabel: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.REGULAR,
    color: "#64748B",
  },
  jvAmountValue: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.BOLD,
    fontWeight: "700",
    color: "#0F172A",
  },
});

const permStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#F3F5F8",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: verticalScale(28),
    paddingHorizontal: horizontalScale(20),
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconCircle: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
    borderWidth: 2,
    borderColor: "#FEE2E2",
  },
  title: {
    fontSize: moderateScale(20),
    fontFamily: Fonts.BOLD,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  subtitle: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.MEDIUM,
    color: "#475569",
    textAlign: "center",
    marginBottom: verticalScale(16),
    lineHeight: moderateScale(20),
  },
  detailBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: moderateScale(12),
    width: "100%",
    marginBottom: verticalScale(16),
  },
  detailText: {
    flex: 1,
    fontSize: moderateScale(13),
    fontFamily: Fonts.REGULAR,
    color: "#991B1B",
    lineHeight: moderateScale(18),
  },
  helpText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.REGULAR,
    color: "#64748B",
    textAlign: "center",
    lineHeight: moderateScale(18),
    marginBottom: verticalScale(24),
    paddingHorizontal: 6,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 12,
  },
  backBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0C4DA2",
    paddingVertical: verticalScale(12),
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#0C4DA2",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backBtnText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.BOLD,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  retryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: verticalScale(12),
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.SEMI_BOLD,
    fontWeight: "600",
    color: "#0C4DA2",
  },
});
