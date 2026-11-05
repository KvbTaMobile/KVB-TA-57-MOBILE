import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect } from "react";
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
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import {
  useLazyGetApUserSummaryQuery,
  useLazyGetSettlementStatusDropdownQuery,
  useLazyGetFailedTranStatusDropdownQuery,
  useChangeFailedTranStatusMutation,
  useRepushFailedTranMutation,
  useLazyGetFailedViewEntryQuery,
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
  if (!dateString || dateString === "None" || dateString === "-") return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
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

const ECF_TYPES = [
  { id: "", text: "All Types" },
  { id: 11, text: "TAF" },
  { id: 8, text: "TCF" },
];

const CHANGE_STATUS_ENABLED_IDS = [25, 13, 28, 38, 52];
const REPUSH_ENABLED_IDS = [9, 13, 25, 27, 28, 38];

const SettlementApprovalScreen = ({ navigation }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  // RTK Query hooks
  const [triggerGetApUserSummary] = useLazyGetApUserSummaryQuery();
  const [triggerGetSettlementStatus] = useLazyGetSettlementStatusDropdownQuery();
  const [triggerGetFailedTranStatus] = useLazyGetFailedTranStatusDropdownQuery();
  const [changeStatusMutation, { isLoading: isChangingStatus }] = useChangeFailedTranStatusMutation();
  const [repushMutation, { isLoading: isRepushing }] = useRepushFailedTranMutation();
  const [triggerGetViewEntry] = useLazyGetFailedViewEntryQuery();

  // Summary list state
  const [summaryList, setSummaryList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Status dropdown options from backend
  const [settleStatusOptions, setSettleStatusOptions] = useState([]);
  const [failedInitStatuses, setFailedInitStatuses] = useState([]);

  // Filter Form State
  const [filterTourId, setFilterTourId] = useState("");
  const [filterCrNo, setFilterCrNo] = useState("");
  const [filterEcfType, setFilterEcfType] = useState("");
  const [filterStatus, setFilterStatus] = useState(null);

  // Applied Filter State (to keep active filters in sync with pagination)
  const [appliedFilters, setAppliedFilters] = useState({
    tour_id: "",
    crno: "",
    aptype: "",
    status: "",
  });

  // Filter Modal & Pickers
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);
  const [ecfTypeDropdownVisible, setEcfTypeDropdownVisible] = useState(false);

  // View Entry Modal State
  const [viewEntryVisible, setViewEntryVisible] = useState(false);
  const [viewEntryLoading, setViewEntryLoading] = useState(false);
  const [viewEntryCrNo, setViewEntryCrNo] = useState("");
  const [viewEntryData, setViewEntryData] = useState([]);
  const [selectedErrorIndex, setSelectedErrorIndex] = useState(-1);

  // Change Status Modal State
  const [changeStatusVisible, setChangeStatusVisible] = useState(false);
  const [activeItemForStatus, setActiveItemForStatus] = useState(null);
  const [allowedStatusesForModal, setAllowedStatusesForModal] = useState([]);
  const [selectedNewStatus, setSelectedNewStatus] = useState(null);
  const [cbsRefNo, setCbsRefNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showCbsRefNo, setShowCbsRefNo] = useState(false);
  const [isCbsReadonly, setIsCbsReadonly] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  // Filter indicator count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.tour_id.trim()) count++;
    if (appliedFilters.crno.trim()) count++;
    if (appliedFilters.aptype !== "") count++;
    if (appliedFilters.status !== "") count++;
    return count;
  }, [appliedFilters]);

  // Header configuration: Single navigation header with filter option in headerRight
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
            name="file-check-outline"
            size={22}
            color="#ffffff"
            style={{ marginRight: 8 }}
          />
          <View>
            <Text
              allowFontScaling={false}
              style={{
                fontSize: moderateScale(17),
                fontFamily: Fonts.bold,
                fontWeight: "700",
                color: "#ffffff",
              }}
            >
              Settlement Approval
            </Text>
            {totalCount > 0 && (
              <Text
                allowFontScaling={false}
                style={{
                  fontSize: moderateScale(11),
                  fontFamily: Fonts.regular,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {totalCount} {totalCount === 1 ? "Record" : "Records"}
              </Text>
            )}
          </View>
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", marginRight: 10 }}>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={{ padding: 6, position: "relative" }}
            accessibilityLabel="Filter settlement approvals"
            activeOpacity={0.7}
          >
            <MaterialIcons name="filter-list" size={26} color="#ffffff" />
            {activeFilterCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  minWidth: moderateScale(16),
                  height: moderateScale(16),
                  borderRadius: moderateScale(8),
                  backgroundColor: "#FF5252",
                  borderWidth: 1.5,
                  borderColor: "#ffffff",
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 2,
                }}
              >
                <Text
                  allowFontScaling={false}
                  style={{
                    color: "#ffffff",
                    fontSize: moderateScale(9),
                    fontFamily: Fonts.bold,
                    fontWeight: "700",
                  }}
                >
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, CustomColors, totalCount, activeFilterCount]);

  // Load Status Dropdowns
  useEffect(() => {
    // 1. Settlement status for filter
    triggerGetSettlementStatus()
      .unwrap()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setSettleStatusOptions(res.data);
        }
      })
      .catch((err) => {
        console.log("Error loading settlement status dropdown:", err);
      });

    // 2. Failed tran status for status change modal
    triggerGetFailedTranStatus()
      .unwrap()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setFailedInitStatuses(res.data);
        }
      })
      .catch((err) => {
        console.log("Error loading failed tran status dropdown:", err);
      });
  }, []);

  // Fetch summary data
  const fetchSummary = useCallback(
    async (pageNumber = 1, currentFilters = appliedFilters, isRefresh = false) => {
      if (pageNumber === 1 && !isRefresh) {
        setIsLoading(true);
      } else if (pageNumber > 1) {
        setIsLoadingMore(true);
      }

      try {
        const queryParams = {
          page: pageNumber,
          tour_id: currentFilters.tour_id?.trim() || "",
          crno: currentFilters.crno?.trim() || "",
          aptype: currentFilters.aptype !== "" ? currentFilters.aptype : "",
          status: currentFilters.status !== "" ? currentFilters.status : "",
        };

        const response = await triggerGetApUserSummary(queryParams).unwrap();

        const data = response?.data || [];
        const pagination = response?.pagination || {};

        setTotalCount(pagination?.count || 0);
        setHasNextPage(Boolean(pagination?.has_next));
        setPage(pagination?.index || pageNumber);

        if (pageNumber === 1) {
          setSummaryList(data);
        } else {
          setSummaryList((prev) => {
            const existingIds = new Set(
              prev.map((item) => item.AP_invoice_id || item.id || `${item.tour_no}_${item.crno}`)
            );
            const newItems = data.filter(
              (item) => !existingIds.has(item.AP_invoice_id || item.id || `${item.tour_no}_${item.crno}`)
            );
            return [...prev, ...newItems];
          });
        }
      } catch (error) {
        console.log("Error fetching AP user summary:", error);
        ToastMessage(error?.data?.message || "Failed to load settlement approvals");
        if (pageNumber === 1) {
          setSummaryList([]);
          setTotalCount(0);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [appliedFilters, triggerGetApUserSummary]
  );

  // Initial fetch
  useEffect(() => {
    fetchSummary(1, appliedFilters);
  }, []);

  // Pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchSummary(1, appliedFilters, true);
  }, [fetchSummary, appliedFilters]);

  // Load more / Infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasNextPage) {
      fetchSummary(page + 1, appliedFilters);
    }
  }, [isLoadingMore, isLoading, hasNextPage, page, appliedFilters, fetchSummary]);

  // Apply filters from modal
  const handleApplyFilters = () => {
    const newFilters = {
      tour_id: filterTourId.trim(),
      crno: filterCrNo.trim(),
      aptype: filterEcfType !== "" ? filterEcfType : "",
      status: filterStatus?.id !== undefined ? String(filterStatus.id) : "",
    };
    setAppliedFilters(newFilters);
    setFilterModalVisible(false);
    fetchSummary(1, newFilters);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterTourId("");
    setFilterCrNo("");
    setFilterEcfType("");
    setFilterStatus(null);
    const emptyFilters = {
      tour_id: "",
      crno: "",
      aptype: "",
      status: "",
    };
    setAppliedFilters(emptyFilters);
    setFilterModalVisible(false);
    fetchSummary(1, emptyFilters);
  };

  // View Details (Angular: approveexpenceEdit)
  const handleViewDetails = (item) => {
    if (Number(item?.aptype) === 8) {
      // TCF (Claim Approval)
      navigation.navigate("ExpenseApprovalView", {
        tour_id: item.tour_id,
        crno: item.crno,
        expense: item,
        from: "ap_verify",
        key: 2,
      });
    } else {
      // TAF (Advance Approval)
      navigation.navigate("advance_approval_view", {
        tour_id: item.tour_id,
        adv_id: item.adv_id,
        crno: item.crno,
        tourDataParams: item,
        from: "ap_verify",
        key: 1,
      });
    }
  };

  // View Entry (Angular: failedViewEntry)
  const handleViewEntry = async (item) => {
    const crNo = item?.AP_invoice_crno || item?.crno;
    if (!crNo) {
      ToastMessage("CR No not found for entry details");
      return;
    }

    setViewEntryCrNo(crNo);
    setViewEntryVisible(true);
    setViewEntryLoading(true);
    setViewEntryData([]);
    setSelectedErrorIndex(-1);

    try {
      const res = await triggerGetViewEntry({ crno: crNo, page: 1 }).unwrap();
      if (res?.data && Array.isArray(res.data)) {
        setViewEntryData(res.data);
      } else {
        setViewEntryData([]);
        if (res?.message) ToastMessage(res.message);
      }
    } catch (err) {
      console.log("Error fetching entry details:", err);
      ToastMessage(err?.data?.message || "Failed to load entry details");
    } finally {
      setViewEntryLoading(false);
    }
  };

  // Repush Action (Angular: Repushcall)
  const handleRepush = (item) => {
    const invoiceId = item?.AP_invoice_id || item?.id;
    const statusText = item?.AP_status_text || "";

    if (!invoiceId) {
      ToastMessage("Invalid Invoice ID for repush");
      return;
    }

    Alert.alert(
      "Confirm Repush",
      "Are you sure to repush the Invoice?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Repush",
          style: "default",
          onPress: async () => {
            try {
              const res = await repushMutation({
                id: invoiceId,
                status: statusText,
              }).unwrap();

              if (res?.code && res?.code !== "SUCCESS") {
                ToastMessage(res?.description || res?.message || "Repush failed");
              } else if (res?.status === "success" || res?.status === "Success" || !res?.code) {
                ToastMessage(res?.message || res?.status || "Invoice repushed successfully");
                fetchSummary(1, appliedFilters);
              } else {
                ToastMessage(res?.status || "Repush completed");
                fetchSummary(1, appliedFilters);
              }
            } catch (err) {
              console.log("Error repushing invoice:", err);
              ToastMessage(err?.data?.message || err?.data?.description || "Failed to repush invoice");
            }
          },
        },
      ]
    );
  };

  // Change Status Action (Angular: failedChangeStat)
  const handleOpenChangeStatus = (item) => {
    const apStatusId = Number(item?.AP_status_id);
    setActiveItemForStatus(item);
    setSelectedNewStatus(null);
    setCbsRefNo("");
    setRemarks("");
    setShowCbsRefNo(false);
    setIsCbsReadonly(false);

    // Filter status options according to Angular logic
    let filtered = [];
    if (apStatusId === 13) {
      filtered = failedInitStatuses.filter((x) => Number(x.id) === 27);
    } else if (apStatusId === 25) {
      filtered = failedInitStatuses.filter((x) => Number(x.id) === 9 || Number(x.id) === 8);
    } else if (apStatusId === 28 || apStatusId === 38) {
      filtered = failedInitStatuses.filter((x) => Number(x.id) === 14);
    } else if (apStatusId === 52) {
      filtered = failedInitStatuses.filter((x) => Number(x.id) === 12);
    } else {
      filtered = failedInitStatuses;
    }

    setAllowedStatusesForModal(filtered);
    setChangeStatusVisible(true);
  };

  // Handle status selection in Change Status Modal (Angular: statusChange)
  const handleSelectNewStatus = (statusObj) => {
    setSelectedNewStatus(statusObj);
    setStatusPickerVisible(false);

    const statusId = Number(statusObj?.id);
    const initType = Number(activeItemForStatus?.AP_status_id);

    if ((statusId === 27 || statusId === 14) && initType === 13) {
      setShowCbsRefNo(true);
      setIsCbsReadonly(false);
    } else if (statusId !== 27 && statusId !== 14 && initType === 13) {
      setShowCbsRefNo(false);
      setIsCbsReadonly(false);
    } else if (statusId === 9 && initType === 25) {
      setShowCbsRefNo(true);
      setIsCbsReadonly(false);
    } else if (statusId === 8 && initType === 25) {
      setShowCbsRefNo(false);
      setIsCbsReadonly(true);
    } else {
      setShowCbsRefNo(false);
      setIsCbsReadonly(false);
    }
  };

  // Submit Change Status (Angular: SubmitChangeStatus)
  const handleSubmitChangeStatus = async () => {
    if (!selectedNewStatus) {
      ToastMessage("Please select Status");
      return;
    }

    if (showCbsRefNo && !cbsRefNo.trim()) {
      ToastMessage("Please enter CBS Ref No.");
      return;
    }

    if (!remarks.trim()) {
      ToastMessage("Please enter Remarks");
      return;
    }

    const payload = {
      apinvoiceheader_id: activeItemForStatus?.AP_invoice_id || activeItemForStatus?.id,
      apinvoiceheaderstatus: selectedNewStatus.id,
      cbsrefno: cbsRefNo.trim(),
      remarks: remarks.trim(),
    };

    try {
      const res = await changeStatusMutation(payload).unwrap();
      if (res?.status === "success" || res?.status === "Success" || !res?.code) {
        ToastMessage(res?.message || "Status updated successfully");
        setChangeStatusVisible(false);
        fetchSummary(1, appliedFilters);
      } else {
        ToastMessage(res?.message || res?.description || "Failed to update status");
      }
    } catch (err) {
      console.log("Error changing status:", err);
      ToastMessage(err?.data?.message || err?.data?.description || "Failed to update status");
    }
  };

  // Render individual card
  const renderItem = ({ item, index }) => {
    const ecfTypeBadge =
      Number(item?.aptype) === 11 ? "TAF" : Number(item?.aptype) === 8 ? "TCF" : "-";
    const isTaf = ecfTypeBadge === "TAF";

    const apStatusText =
      item?.AP_status_text ||
      ([0, 2].includes(Number(item?.AP_Status))
        ? "Payment Not Created"
        : [3, 4, 5].includes(Number(item?.AP_Status))
        ? "Payment Completed"
        : "-");

    const isPaymentCompleted =
      apStatusText?.toLowerCase().includes("completed") ||
      [3, 4, 5].includes(Number(item?.AP_Status));
    const isPaymentNotCreated =
      apStatusText?.toLowerCase().includes("not created") ||
      [0, 2].includes(Number(item?.AP_Status));

    const isRepushEnabled = REPUSH_ENABLED_IDS.includes(Number(item?.AP_status_id));
    const isChangeStatusEnabled = CHANGE_STATUS_ENABLED_IDS.includes(Number(item?.AP_status_id));

    const copyTourNo = async (tNo) => {
      if (tNo && tNo !== "-") {
        await Clipboard.setStringAsync(String(tNo));
        ToastMessage(`Copied "${tNo}" to clipboard`);
      }
    };

    return (
      <View
        style={[
          cardStyles.card,
          {
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderColor: isDark ? "#334155" : "#E2E8F0",
          },
        ]}
      >
        {/* Card Header: S.No, Tour ID, and ECF Type Badge */}
        <View style={cardStyles.headerRow}>
          <View style={cardStyles.leftHeader}>
            <View style={[cardStyles.sNoBadge, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
              <Text allowFontScaling={false} style={[cardStyles.sNoText, { color: isDark ? "#94A3B8" : "#475569" }]}>
                #{index + 1}
              </Text>
            </View>
            <View style={{ marginLeft: horizontalScale(8), flex: 1 }}>
              <TouchableOpacity
                style={cardStyles.tourNoWrapper}
                onPress={() => copyTourNo(item?.tour_no || item?.tour_id)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  allowFontScaling={false}
                  style={[cardStyles.tourNoText, { color: CustomColors.appThemeColor }]}
                  numberOfLines={1}
                >
                  {item?.tour_no || item?.tour_id || "-"}
                </Text>
                {(item?.tour_no || item?.tour_id) && (
                  <MaterialIcons
                    name="content-copy"
                    size={13}
                    color={CustomColors.appThemeColor}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>
              <Text allowFontScaling={false} style={[cardStyles.crNoText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                CR: {item?.crno || "-"}
              </Text>
            </View>
          </View>

          <View
            style={[
              cardStyles.typeBadge,
              {
                backgroundColor: isTaf ? (isDark ? "#082F49" : "#E0F2FE") : (isDark ? "#2E1065" : "#EDE9FE"),
                borderColor: isTaf ? "#38BDF8" : "#A78BFA",
              },
            ]}
          >
            <Text
              allowFontScaling={false}
              style={[
                cardStyles.typeBadgeText,
                { color: isTaf ? (isDark ? "#7DD3FC" : "#0284C7") : (isDark ? "#C4B5FD" : "#7C3AED") },
              ]}
            >
              {ecfTypeBadge}
            </Text>
          </View>
        </View>

        <View style={[cardStyles.divider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

        {/* Raiser & Commodity */}
        <View style={cardStyles.infoRow}>
          <View style={cardStyles.infoColFull}>
            <Text allowFontScaling={false} style={[cardStyles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              ECF Raiser
            </Text>
            <View style={cardStyles.iconTextRow}>
              <MaterialCommunityIcons
                name="account-circle-outline"
                size={moderateScale(17)}
                color={CustomColors.appThemeColor}
                style={{ marginRight: horizontalScale(5) }}
              />
              <Text
                allowFontScaling={false}
                style={[cardStyles.value, { color: isDark ? "#F8FAFC" : "#0F172A" }]}
                numberOfLines={1}
              >
                {item?.raisername || item?.onbehalfof?.full_name || "-"}
              </Text>
            </View>
          </View>
        </View>

        {item?.commodity_id?.name && (
          <View style={cardStyles.infoRow}>
            <View style={cardStyles.infoColFull}>
              <Text allowFontScaling={false} style={[cardStyles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                Commodity Name
              </Text>
              <Text allowFontScaling={false} style={[cardStyles.value, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                {item?.commodity_id?.name || "-"}
              </Text>
            </View>
          </View>
        )}

        {/* Financials: Amount & AP Status */}
        <View
          style={[
            cardStyles.highlightBox,
            {
              backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <View style={cardStyles.infoCol}>
            <Text allowFontScaling={false} style={[cardStyles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              ECF Amount
            </Text>
            <Text allowFontScaling={false} style={[cardStyles.amountText, { color: CustomColors.appThemeColor }]}>
              ₹ {formatCurrency(item?.apamount)}
            </Text>
          </View>

          <View style={[cardStyles.infoCol, { alignItems: "flex-end" }]}>
            <Text allowFontScaling={false} style={[cardStyles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              AP Status
            </Text>
            <View
              style={[
                cardStyles.statusBadge,
                {
                  backgroundColor: isPaymentCompleted
                    ? (isDark ? "#064E3B" : "#DCFCE7")
                    : isPaymentNotCreated
                    ? (isDark ? "#78350F" : "#FEF3C7")
                    : (isDark ? "#1E293B" : "#F1F5F9"),
                  borderColor: isPaymentCompleted
                    ? "#86EFAC"
                    : isPaymentNotCreated
                    ? "#FDE68A"
                    : "#CBD5E1",
                },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[
                  cardStyles.statusBadgeText,
                  {
                    color: isPaymentCompleted
                      ? (isDark ? "#6EE7B7" : "#15803D")
                      : isPaymentNotCreated
                      ? (isDark ? "#FCD34D" : "#B45309")
                      : (isDark ? "#CBD5E1" : CustomColors.textDark),
                  },
                ]}
                numberOfLines={1}
              >
                {apStatusText}
              </Text>
            </View>
          </View>
        </View>

        {/* ECF Status, Dates & Document Required */}
        <View style={cardStyles.gridRow}>
          <View style={cardStyles.gridCol}>
            <Text allowFontScaling={false} style={[cardStyles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              ECF Status
            </Text>
            <Text allowFontScaling={false} style={[cardStyles.gridValue, { color: isDark ? "#F8FAFC" : "#1E293B" }]}>
              {item?.ecfstatus || "-"}
            </Text>
          </View>

          <View style={cardStyles.gridCol}>
            <Text allowFontScaling={false} style={[cardStyles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Invoice Date
            </Text>
            <Text allowFontScaling={false} style={[cardStyles.gridValue, { color: isDark ? "#F8FAFC" : "#1E293B" }]}>
              {formatDateToDisplay(item?.apdate)}
            </Text>
          </View>
        </View>

        <View style={cardStyles.gridRow}>
          <View style={cardStyles.gridCol}>
            <Text allowFontScaling={false} style={[cardStyles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Doc Required
            </Text>
            <View
              style={[
                cardStyles.docBadge,
                {
                  backgroundColor: Number(item?.papertype) === 1 ? (isDark ? "#450A0A" : "#FEF2F2") : (isDark ? "#052E16" : "#F0FDF4"),
                  borderColor: Number(item?.papertype) === 1 ? "#FCA5A5" : "#86EFAC",
                },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[
                  cardStyles.docBadgeText,
                  {
                    color: Number(item?.papertype) === 1 ? (isDark ? "#FCA5A5" : "#DC2626") : (isDark ? "#86EFAC" : "#16A34A"),
                  },
                ]}
              >
                {Number(item?.papertype) === 1 ? "YES" : "NO"}
              </Text>
            </View>
          </View>

          <View style={cardStyles.gridCol}>
            <Text allowFontScaling={false} style={[cardStyles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Inward Date
            </Text>
            <Text allowFontScaling={false} style={[cardStyles.gridValue, { color: isDark ? "#F8FAFC" : "#1E293B" }]}>
              {formatDateToDisplay(item?.inward_date || item?.apdate)}
            </Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={[cardStyles.actionsContainer, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
          {/* 1. View Details */}
          <TouchableOpacity
            style={[
              cardStyles.actionBtn,
              {
                backgroundColor: isDark ? "#064E3B" : "#F0FDF4",
                borderColor: isDark ? "#047857" : "#BBF7D0",
              },
            ]}
            onPress={() => handleViewDetails(item)}
            activeOpacity={0.75}
          >
            <MaterialIcons name="visibility" size={moderateScale(16)} color={isDark ? "#6EE7B7" : "#16A34A"} />
            <Text allowFontScaling={false} style={[cardStyles.actionBtnText, { color: isDark ? "#6EE7B7" : "#16A34A" }]}>
              Details
            </Text>
          </TouchableOpacity>

          {/* 2. View Entry */}
          <TouchableOpacity
            style={[
              cardStyles.actionBtn,
              {
                backgroundColor: isDark ? "#1E3A8A" : "#EFF6FF",
                borderColor: isDark ? "#1D4ED8" : "#BFDBFE",
              },
            ]}
            onPress={() => handleViewEntry(item)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="clipboard-text-outline" size={moderateScale(16)} color={isDark ? "#93C5FD" : "#2563EB"} />
            <Text allowFontScaling={false} style={[cardStyles.actionBtnText, { color: isDark ? "#93C5FD" : "#2563EB" }]}>
              Entries
            </Text>
          </TouchableOpacity>

          {/* 3. Change Status */}
          <TouchableOpacity
            style={[
              cardStyles.actionBtn,
              {
                backgroundColor: isChangeStatusEnabled
                  ? (isDark ? "#78350F" : "#FFFBEB")
                  : (isDark ? "#1E293B" : "#F3F4F6"),
                borderColor: isChangeStatusEnabled
                  ? (isDark ? "#B45309" : "#FDE68A")
                  : (isDark ? "#334155" : "#E5E7EB"),
                opacity: isChangeStatusEnabled ? 1 : 0.45,
              },
            ]}
            onPress={() => isChangeStatusEnabled && handleOpenChangeStatus(item)}
            disabled={!isChangeStatusEnabled}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name="sync-alt"
              size={moderateScale(16)}
              color={
                isChangeStatusEnabled
                  ? (isDark ? "#FCD34D" : "#D97706")
                  : (isDark ? "#64748B" : "#9CA3AF")
              }
            />
            <Text
              allowFontScaling={false}
              style={[
                cardStyles.actionBtnText,
                {
                  color: isChangeStatusEnabled
                    ? (isDark ? "#FCD34D" : "#D97706")
                    : (isDark ? "#64748B" : "#9CA3AF"),
                },
              ]}
            >
              Status
            </Text>
          </TouchableOpacity>

          {/* 4. Repush */}
          <TouchableOpacity
            style={[
              cardStyles.actionBtn,
              {
                backgroundColor: isRepushEnabled
                  ? (isDark ? "#831843" : "#FDF2F8")
                  : (isDark ? "#1E293B" : "#F3F4F6"),
                borderColor: isRepushEnabled
                  ? (isDark ? "#BE185D" : "#FBCFE8")
                  : (isDark ? "#334155" : "#E5E7EB"),
                opacity: isRepushEnabled ? 1 : 0.45,
              },
            ]}
            onPress={() => isRepushEnabled && handleRepush(item)}
            disabled={!isRepushEnabled}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={moderateScale(16)}
              color={
                isRepushEnabled
                  ? (isDark ? "#F472B6" : "#DB2777")
                  : (isDark ? "#64748B" : "#9CA3AF")
              }
            />
            <Text
              allowFontScaling={false}
              style={[
                cardStyles.actionBtnText,
                {
                  color: isRepushEnabled
                    ? (isDark ? "#F472B6" : "#DB2777")
                    : (isDark ? "#64748B" : "#9CA3AF"),
                },
              ]}
            >
              Repush
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }}
      edges={["bottom"]}
    >

      {/* Active Filter Chips Summary Bar (if any) */}
      {activeFilterCount > 0 && (
        <View
          style={[
            chipStyles.container,
            {
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderBottomColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={chipStyles.scroll}>
            {appliedFilters.tour_id ? (
              <View
                style={[
                  chipStyles.chip,
                  {
                    backgroundColor: isDark ? "#334155" : "#EFF6FF",
                    borderColor: isDark ? "#3B82F6" : "#BFDBFE",
                  },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[chipStyles.chipText, { color: isDark ? "#93C5FD" : "#1D4ED8" }]}
                >
                  Tour: {appliedFilters.tour_id}
                </Text>
              </View>
            ) : null}

            {appliedFilters.crno ? (
              <View
                style={[
                  chipStyles.chip,
                  {
                    backgroundColor: isDark ? "#334155" : "#EFF6FF",
                    borderColor: isDark ? "#3B82F6" : "#BFDBFE",
                  },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[chipStyles.chipText, { color: isDark ? "#93C5FD" : "#1D4ED8" }]}
                >
                  CR: {appliedFilters.crno}
                </Text>
              </View>
            ) : null}

            {appliedFilters.aptype ? (
              <View
                style={[
                  chipStyles.chip,
                  {
                    backgroundColor: isDark ? "#334155" : "#EFF6FF",
                    borderColor: isDark ? "#3B82F6" : "#BFDBFE",
                  },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[chipStyles.chipText, { color: isDark ? "#93C5FD" : "#1D4ED8" }]}
                >
                  Type: {Number(appliedFilters.aptype) === 11 ? "TAF" : "TCF"}
                </Text>
              </View>
            ) : null}

            {appliedFilters.status ? (
              <View
                style={[
                  chipStyles.chip,
                  {
                    backgroundColor: isDark ? "#334155" : "#EFF6FF",
                    borderColor: isDark ? "#3B82F6" : "#BFDBFE",
                  },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[chipStyles.chipText, { color: isDark ? "#93C5FD" : "#1D4ED8" }]}
                >
                  Status: {settleStatusOptions.find((s) => String(s.id) === String(appliedFilters.status))?.text || appliedFilters.status}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity onPress={handleResetFilters} style={chipStyles.clearBtn}>
              <Text
                allowFontScaling={false}
                style={[chipStyles.clearText, { color: "#EF4444" }]}
              >
                Clear All
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Main List with Continuous Scrolling */}
      {isLoading ? (
        <View style={emptyStyles.loadingContainer}>
          <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
          <Text allowFontScaling={false} style={[emptyStyles.loadingText, { color: CustomColors.textGray }]}>
            Loading settlement records...
          </Text>
        </View>
      ) : summaryList.length === 0 ? (
        <View style={emptyStyles.container}>
          <MaterialCommunityIcons
            name="file-search-outline"
            size={moderateScale(64)}
            color={CustomColors.textGray}
          />
          <Text allowFontScaling={false} style={[emptyStyles.title, { color: CustomColors.textDark }]}>
            No Records Found
          </Text>
          <Text allowFontScaling={false} style={[emptyStyles.subtitle, { color: CustomColors.textGray }]}>
            {activeFilterCount > 0
              ? "No approvals match your selected filter criteria. Try clearing filters."
              : "There are currently no settlement approvals waiting for action."}
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={[emptyStyles.resetBtn, { backgroundColor: CustomColors.appThemeColor }]}
              onPress={handleResetFilters}
            >
              <Text allowFontScaling={false} style={emptyStyles.resetBtnText}>
                Reset Filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={summaryList}
          renderItem={renderItem}
          keyExtractor={(item, idx) =>
            item?.AP_invoice_id ? `inv_${item.AP_invoice_id}` : `settle_${item?.id || idx}_${item?.crno || ""}`
          }
          contentContainerStyle={listStyles.contentContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[CustomColors.appThemeColor]}
            />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={listStyles.footerLoader}>
                <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
                <Text allowFontScaling={false} style={[listStyles.footerText, { color: CustomColors.textGray }]}>
                  Loading more records...
                </Text>
              </View>
            ) : summaryList.length > 0 && !hasNextPage ? (
              <View style={listStyles.endOfListContainer}>
                <Text allowFontScaling={false} style={[listStyles.endOfListText, { color: CustomColors.textGray }]}>
                  All {totalCount} records loaded
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* ============================================================ */}
      {/* FILTER POPUP MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={modalStyles.modalContainer}
          >
            <View style={[modalStyles.dialog, { backgroundColor: CustomColors.cardBackground || "#FFF" }]}>
              {/* Modal Header */}
              <View style={modalStyles.header}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialIcons name="tune" size={moderateScale(22)} color={CustomColors.appThemeColor} style={{ marginRight: horizontalScale(8) }} />
                  <Text allowFontScaling={false} style={[modalStyles.title, { color: CustomColors.textDark }]}>
                    Filter Approvals
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <MaterialIcons name="close" size={moderateScale(24)} color={CustomColors.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView style={modalStyles.formBody} keyboardShouldPersistTaps="handled">
                {/* 1. Tour ID */}
                <View style={modalStyles.formGroup}>
                  <Text allowFontScaling={false} style={[modalStyles.fieldLabel, { color: CustomColors.textDark }]}>
                    Tour ID
                  </Text>
                  <TextInput
                    allowFontScaling={false}
                    style={[
                      modalStyles.input,
                      {
                        borderColor: CustomColors.lightGray,
                        color: CustomColors.textDark,
                        backgroundColor: CustomColors.backgroundWhite,
                      },
                    ]}
                    placeholder="Enter Tour ID"
                    placeholderTextColor={CustomColors.textGray}
                    value={filterTourId}
                    onChangeText={setFilterTourId}
                  />
                </View>

                {/* 2. CR No */}
                <View style={modalStyles.formGroup}>
                  <Text allowFontScaling={false} style={[modalStyles.fieldLabel, { color: CustomColors.textDark }]}>
                    CR No
                  </Text>
                  <TextInput
                    allowFontScaling={false}
                    style={[
                      modalStyles.input,
                      {
                        borderColor: CustomColors.lightGray,
                        color: CustomColors.textDark,
                        backgroundColor: CustomColors.backgroundWhite,
                      },
                    ]}
                    placeholder="Enter CR No"
                    placeholderTextColor={CustomColors.textGray}
                    value={filterCrNo}
                    onChangeText={setFilterCrNo}
                  />
                </View>

                {/* 3. ECF Type */}
                <View style={modalStyles.formGroup}>
                  <Text allowFontScaling={false} style={[modalStyles.fieldLabel, { color: CustomColors.textDark }]}>
                    ECF Type
                  </Text>
                  <TouchableOpacity
                    style={[
                      modalStyles.dropdownTrigger,
                      {
                        borderColor: CustomColors.lightGray,
                        backgroundColor: CustomColors.backgroundWhite,
                      },
                    ]}
                    onPress={() => setEcfTypeDropdownVisible(true)}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        modalStyles.dropdownValue,
                        {
                          color: filterEcfType !== "" ? CustomColors.textDark : CustomColors.textGray,
                        },
                      ]}
                    >
                      {filterEcfType === 11
                        ? "TAF"
                        : filterEcfType === 8
                        ? "TCF"
                        : "All Types"}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={CustomColors.textGray} />
                  </TouchableOpacity>
                </View>

                {/* 4. ECF Status */}
                <View style={modalStyles.formGroup}>
                  <Text allowFontScaling={false} style={[modalStyles.fieldLabel, { color: CustomColors.textDark }]}>
                    ECF Status
                  </Text>
                  <TouchableOpacity
                    style={[
                      modalStyles.dropdownTrigger,
                      {
                        borderColor: CustomColors.lightGray,
                        backgroundColor: CustomColors.backgroundWhite,
                      },
                    ]}
                    onPress={() => setStatusDropdownVisible(true)}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        modalStyles.dropdownValue,
                        {
                          color: filterStatus ? CustomColors.textDark : CustomColors.textGray,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {filterStatus ? filterStatus.name || filterStatus.text : "Select Status (Optional)"}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={CustomColors.textGray} />
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={[modalStyles.footer, { borderTopColor: CustomColors.lightGray }]}>
                <TouchableOpacity
                  style={[modalStyles.resetButton, { borderColor: CustomColors.lightGray }]}
                  onPress={handleResetFilters}
                >
                  <Text allowFontScaling={false} style={[modalStyles.resetButtonText, { color: CustomColors.textDark }]}>
                    Reset
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.applyButton, { backgroundColor: CustomColors.appThemeColor }]}
                  onPress={handleApplyFilters}
                >
                  <Text allowFontScaling={false} style={modalStyles.applyButtonText}>
                    Apply Filters
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* ECF TYPE SELECTION MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={ecfTypeDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEcfTypeDropdownVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setEcfTypeDropdownVisible(false)}
        >
          <View style={[pickerStyles.pickerCard, { backgroundColor: CustomColors.cardBackground || "#FFF" }]}>
            <View style={pickerStyles.pickerHeader}>
              <Text allowFontScaling={false} style={[pickerStyles.pickerTitle, { color: CustomColors.textDark }]}>
                Select ECF Type
              </Text>
              <TouchableOpacity onPress={() => setEcfTypeDropdownVisible(false)}>
                <MaterialIcons name="close" size={22} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>
            {ECF_TYPES.map((typeItem) => {
              const isSelected = filterEcfType === typeItem.id;
              return (
                <TouchableOpacity
                  key={String(typeItem.id)}
                  style={[
                    pickerStyles.optionRow,
                    { borderBottomColor: CustomColors.lightGray },
                    isSelected && { backgroundColor: CustomColors.primaryLight },
                  ]}
                  onPress={() => {
                    setFilterEcfType(typeItem.id);
                    setEcfTypeDropdownVisible(false);
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      pickerStyles.optionText,
                      { color: isSelected ? CustomColors.appThemeColor : CustomColors.textDark },
                    ]}
                  >
                    {typeItem.text}
                  </Text>
                  {isSelected && (
                    <MaterialIcons name="check" size={20} color={CustomColors.appThemeColor} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================ */}
      {/* SETTLEMENT STATUS DROPDOWN MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={statusDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusDropdownVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setStatusDropdownVisible(false)}
        >
          <View style={[pickerStyles.pickerCard, { backgroundColor: CustomColors.cardBackground || "#FFF", maxHeight: 420 }]}>
            <View style={pickerStyles.pickerHeader}>
              <Text allowFontScaling={false} style={[pickerStyles.pickerTitle, { color: CustomColors.textDark }]}>
                Select ECF Status
              </Text>
              <TouchableOpacity onPress={() => setStatusDropdownVisible(false)}>
                <MaterialIcons name="close" size={22} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {/* Clear option */}
              <TouchableOpacity
                style={[pickerStyles.optionRow, { borderBottomColor: CustomColors.lightGray }]}
                onPress={() => {
                  setFilterStatus(null);
                  setStatusDropdownVisible(false);
                }}
              >
                <Text allowFontScaling={false} style={[pickerStyles.optionText, { color: CustomColors.textGray }]}>
                  All Statuses (Clear)
                </Text>
              </TouchableOpacity>

              {settleStatusOptions.map((st) => {
                const isSelected = filterStatus && String(filterStatus.id) === String(st.id);
                return (
                  <TouchableOpacity
                    key={String(st.id)}
                    style={[
                      pickerStyles.optionRow,
                      { borderBottomColor: CustomColors.lightGray },
                      isSelected && { backgroundColor: CustomColors.primaryLight },
                    ]}
                    onPress={() => {
                      setFilterStatus(st);
                      setStatusDropdownVisible(false);
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        pickerStyles.optionText,
                        { color: isSelected ? CustomColors.appThemeColor : CustomColors.textDark },
                      ]}
                    >
                      {st.name || st.text}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color={CustomColors.appThemeColor} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================ */}
      {/* VIEW ENTRY MODAL (Angular: viewEntryFailed) */}
      {/* ============================================================ */}
      <Modal
        visible={viewEntryVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewEntryVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View style={[entryStyles.dialog, { backgroundColor: CustomColors.cardBackground || "#FFF" }]}>
            {/* Header */}
            <View style={[entryStyles.header, { backgroundColor: CustomColors.primaryLight }]}>
              <View style={{ flex: 1 }}>
                <Text allowFontScaling={false} style={[entryStyles.title, { color: CustomColors.appThemeColor }]}>
                  View Entry Details
                </Text>
                <Text allowFontScaling={false} style={[entryStyles.subtitle, { color: CustomColors.textGray }]}>
                  CR No: {viewEntryCrNo}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setViewEntryVisible(false)}>
                <MaterialIcons name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>

            {viewEntryLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
                <Text allowFontScaling={false} style={{ marginTop: 12, color: CustomColors.textGray }}>
                  Loading journal entries...
                </Text>
              </View>
            ) : viewEntryData.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <MaterialCommunityIcons name="clipboard-alert-outline" size={48} color={CustomColors.textGray} />
                <Text allowFontScaling={false} style={{ marginTop: 12, fontSize: 16, color: CustomColors.textDark }}>
                  No entry records found
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 460, paddingHorizontal: horizontalScale(16) }}>
                {viewEntryData.map((dt, idx) => {
                  const hasError = Boolean(dt?.errordescription && dt?.errordescription !== "0");
                  const isErrorOpen = selectedErrorIndex === idx;

                  return (
                    <View
                      key={String(idx)}
                      style={[
                        entryStyles.entryCard,
                        {
                          borderColor: CustomColors.lightGray,
                          backgroundColor: CustomColors.backgroundWhite,
                        },
                      ]}
                    >
                      <View style={entryStyles.entryHeader}>
                        <Text allowFontScaling={false} style={[entryStyles.entryIndex, { color: CustomColors.appThemeColor }]}>
                          #{idx + 1}
                        </Text>
                        <View
                          style={[
                            entryStyles.statusPill,
                            {
                              backgroundColor:
                                dt?.entry_new_status?.toLowerCase().includes("success")
                                  ? "#DCFCE7"
                                  : "#FEF3C7",
                            },
                          ]}
                        >
                          <Text
                            allowFontScaling={false}
                            style={[
                              entryStyles.statusPillText,
                              {
                                color:
                                  dt?.entry_new_status?.toLowerCase().includes("success")
                                    ? "#16A34A"
                                    : "#D97706",
                              },
                            ]}
                          >
                            {dt?.entry_new_status || dt?.type || "Entry"}
                          </Text>
                        </View>
                      </View>

                      <View style={entryStyles.entryDetails}>
                        <View style={entryStyles.entryRow}>
                          <Text allowFontScaling={false} style={[entryStyles.entryLabel, { color: CustomColors.textGray }]}>
                            GL No:
                          </Text>
                          <Text allowFontScaling={false} style={[entryStyles.entryVal, { color: CustomColors.textDark }]}>
                            {dt?.gl || "-"}
                          </Text>
                        </View>

                        <View style={entryStyles.entryRow}>
                          <Text allowFontScaling={false} style={[entryStyles.entryLabel, { color: CustomColors.textGray }]}>
                            GL Desc:
                          </Text>
                          <Text allowFontScaling={false} style={[entryStyles.entryVal, { color: CustomColors.textDark }]}>
                            {dt?.glnodescription || "-"}
                          </Text>
                        </View>

                        <View style={entryStyles.entryRow}>
                          <Text allowFontScaling={false} style={[entryStyles.entryLabel, { color: CustomColors.textGray }]}>
                            Module:
                          </Text>
                          <Text allowFontScaling={false} style={[entryStyles.entryVal, { color: CustomColors.textDark }]}>
                            {dt?.module || "-"}
                          </Text>
                        </View>

                        <View style={entryStyles.entryRow}>
                          <Text allowFontScaling={false} style={[entryStyles.entryLabel, { color: CustomColors.textGray }]}>
                            Txn Date:
                          </Text>
                          <Text allowFontScaling={false} style={[entryStyles.entryVal, { color: CustomColors.textDark }]}>
                            {formatDateToDisplay(dt?.transactiondate)}{" "}
                            {dt?.transactiontime || ""}
                          </Text>
                        </View>

                        <View style={entryStyles.entryRow}>
                          <Text allowFontScaling={false} style={[entryStyles.entryLabel, { color: CustomColors.textGray }]}>
                            Amount:
                          </Text>
                          <Text
                            allowFontScaling={false}
                            style={[entryStyles.entryVal, { color: CustomColors.appThemeColor, fontWeight: "700" }]}
                          >
                            ₹ {formatCurrency(dt?.amount)}
                          </Text>
                        </View>
                      </View>

                      {/* Error Toggle if present */}
                      {hasError && (
                        <View style={entryStyles.errorSection}>
                          <TouchableOpacity
                            style={entryStyles.errorToggle}
                            onPress={() => setSelectedErrorIndex(isErrorOpen ? -1 : idx)}
                          >
                            <MaterialIcons
                              name={isErrorOpen ? "expand-less" : "error-outline"}
                              size={18}
                              color="#DC2626"
                            />
                            <Text allowFontScaling={false} style={entryStyles.errorToggleText}>
                              {isErrorOpen ? "Hide Error Description" : "View Error Description"}
                            </Text>
                          </TouchableOpacity>

                          {isErrorOpen && (
                            <View style={entryStyles.errorContentBox}>
                              <Text allowFontScaling={false} style={entryStyles.errorDescText}>
                                {dt?.errordescription}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={[entryStyles.footer, { borderTopColor: CustomColors.lightGray }]}>
              <TouchableOpacity
                style={[entryStyles.closeBtn, { backgroundColor: CustomColors.appThemeColor }]}
                onPress={() => setViewEntryVisible(false)}
              >
                <Text allowFontScaling={false} style={entryStyles.closeBtnText}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* CHANGE STATUS MODAL (Angular: failedChangeStatus) */}
      {/* ============================================================ */}
      <Modal
        visible={changeStatusVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChangeStatusVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={modalStyles.modalContainer}
          >
            <View style={[modalStyles.dialog, { backgroundColor: CustomColors.cardBackground || "#FFF" }]}>
              <View style={modalStyles.header}>
                <View>
                  <Text allowFontScaling={false} style={[modalStyles.title, { color: CustomColors.textDark }]}>
                    Change Status
                  </Text>
                  <Text allowFontScaling={false} style={[modalStyles.subtitle, { color: CustomColors.textGray }]}>
                    CR No: {activeItemForStatus?.crno || "-"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setChangeStatusVisible(false)}>
                  <MaterialIcons name="close" size={24} color={CustomColors.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView style={modalStyles.formBody} keyboardShouldPersistTaps="handled">
                {/* Current Status info */}
                <View style={[cardStyles.highlightBox, { marginBottom: verticalScale(14) }]}>
                  <Text allowFontScaling={false} style={[cardStyles.label, { color: CustomColors.textGray }]}>
                    Current AP Status:
                  </Text>
                  <Text allowFontScaling={false} style={[cardStyles.value, { color: CustomColors.appThemeColor, fontWeight: "700" }]}>
                    {activeItemForStatus?.AP_status_text || "-"}
                  </Text>
                </View>

                {/* Status Dropdown Trigger */}
                <View style={modalStyles.formGroup}>
                  <Text allowFontScaling={false} style={[modalStyles.fieldLabel, { color: CustomColors.textDark }]}>
                    Change Status To *
                  </Text>
                  <TouchableOpacity
                    style={[
                      modalStyles.dropdownTrigger,
                      {
                        borderColor: CustomColors.lightGray,
                        backgroundColor: CustomColors.backgroundWhite,
                      },
                    ]}
                    onPress={() => setStatusPickerVisible(true)}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        modalStyles.dropdownValue,
                        {
                          color: selectedNewStatus ? CustomColors.textDark : CustomColors.textGray,
                        },
                      ]}
                    >
                      {selectedNewStatus ? selectedNewStatus.text || selectedNewStatus.name : "Select Target Status"}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={CustomColors.textGray} />
                  </TouchableOpacity>
                </View>

                {/* CBS Ref No (conditional) */}
                <View style={modalStyles.formGroup}>
                  <Text allowFontScaling={false} style={[modalStyles.fieldLabel, { color: CustomColors.textDark }]}>
                    CBS Ref No {showCbsRefNo ? "*" : ""}
                  </Text>
                  <TextInput
                    allowFontScaling={false}
                    style={[
                      modalStyles.input,
                      {
                        borderColor: CustomColors.lightGray,
                        color: CustomColors.textDark,
                        backgroundColor: isCbsReadonly ? "#F3F4F6" : CustomColors.backgroundWhite,
                      },
                    ]}
                    placeholder="Enter CBS Ref No"
                    placeholderTextColor={CustomColors.textGray}
                    value={cbsRefNo}
                    onChangeText={setCbsRefNo}
                    editable={!isCbsReadonly}
                  />
                </View>

                {/* Remarks (required) */}
                <View style={modalStyles.formGroup}>
                  <Text allowFontScaling={false} style={[modalStyles.fieldLabel, { color: CustomColors.textDark }]}>
                    Remarks *
                  </Text>
                  <TextInput
                    allowFontScaling={false}
                    style={[
                      modalStyles.input,
                      {
                        height: verticalScale(70),
                        borderColor: CustomColors.lightGray,
                        color: CustomColors.textDark,
                        backgroundColor: CustomColors.backgroundWhite,
                        textAlignVertical: "top",
                        paddingTop: verticalScale(8),
                      },
                    ]}
                    placeholder="Enter remarks for status change"
                    placeholderTextColor={CustomColors.textGray}
                    value={remarks}
                    onChangeText={setRemarks}
                    multiline
                  />
                </View>
              </ScrollView>

              {/* Status Picker Sub-Modal */}
              {statusPickerVisible && (
                <Modal
                  visible={statusPickerVisible}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setStatusPickerVisible(false)}
                >
                  <TouchableOpacity
                    style={modalStyles.backdrop}
                    activeOpacity={1}
                    onPress={() => setStatusPickerVisible(false)}
                  >
                    <View style={[pickerStyles.pickerCard, { backgroundColor: CustomColors.cardBackground || "#FFF" }]}>
                      <View style={pickerStyles.pickerHeader}>
                        <Text allowFontScaling={false} style={[pickerStyles.pickerTitle, { color: CustomColors.textDark }]}>
                          Select Status
                        </Text>
                        <TouchableOpacity onPress={() => setStatusPickerVisible(false)}>
                          <MaterialIcons name="close" size={22} color={CustomColors.textDark} />
                        </TouchableOpacity>
                      </View>
                      {allowedStatusesForModal.length === 0 ? (
                        <View style={{ padding: 20, alignItems: "center" }}>
                          <Text allowFontScaling={false} style={{ color: CustomColors.textGray }}>
                            No target status available for this item
                          </Text>
                        </View>
                      ) : (
                        allowedStatusesForModal.map((st) => (
                          <TouchableOpacity
                            key={String(st.id)}
                            style={[
                              pickerStyles.optionRow,
                              { borderBottomColor: CustomColors.lightGray },
                              selectedNewStatus?.id === st.id && { backgroundColor: CustomColors.primaryLight },
                            ]}
                            onPress={() => handleSelectNewStatus(st)}
                          >
                            <Text
                              allowFontScaling={false}
                              style={[
                                pickerStyles.optionText,
                                {
                                  color: selectedNewStatus?.id === st.id ? CustomColors.appThemeColor : CustomColors.textDark,
                                },
                              ]}
                            >
                              {st.text || st.name}
                            </Text>
                            {selectedNewStatus?.id === st.id && (
                              <MaterialIcons name="check" size={20} color={CustomColors.appThemeColor} />
                            )}
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </TouchableOpacity>
                </Modal>
              )}

              {/* Footer */}
              <View style={[modalStyles.footer, { borderTopColor: CustomColors.lightGray }]}>
                <TouchableOpacity
                  style={[modalStyles.resetButton, { borderColor: CustomColors.lightGray }]}
                  onPress={() => setChangeStatusVisible(false)}
                >
                  <Text allowFontScaling={false} style={[modalStyles.resetButtonText, { color: CustomColors.textDark }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    modalStyles.applyButton,
                    { backgroundColor: CustomColors.appThemeColor },
                    isChangingStatus && { opacity: 0.7 },
                  ]}
                  onPress={handleSubmitChangeStatus}
                  disabled={isChangingStatus}
                >
                  {isChangingStatus ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text allowFontScaling={false} style={modalStyles.applyButtonText}>
                      Save Status
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettlementApprovalScreen;

// ============================================================
// STYLES
// ============================================================

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  iconButton: {
    padding: moderateScale(6),
    borderRadius: moderateScale(8),
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: horizontalScale(12),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
    opacity: 0.9,
    marginTop: verticalScale(2),
  },
  filterButton: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: moderateScale(2),
    right: moderateScale(2),
    minWidth: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: horizontalScale(4),
  },
  badgeText: {
    color: "#FFF",
    fontSize: moderateScale(10),
    fontFamily: Fonts.bold,
    fontWeight: "700",
  },
});

const chipStyles = StyleSheet.create({
  container: {
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
  },
  scroll: {
    paddingHorizontal: horizontalScale(16),
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
    marginRight: horizontalScale(8),
    borderWidth: 1,
  },
  chipText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.medium,
  },
  clearBtn: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
  },
  clearText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.bold,
  },
});

const listStyles = StyleSheet.create({
  contentContainer: {
    padding: moderateScale(14),
    paddingBottom: verticalScale(40),
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
  },
  footerText: {
    marginLeft: horizontalScale(8),
    fontSize: moderateScale(13),
    fontFamily: Fonts.regular,
  },
  endOfListContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(16),
  },
  endOfListText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: moderateScale(16),
    borderWidth: 1,
    padding: moderateScale(15),
    marginBottom: verticalScale(12),
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: horizontalScale(8),
  },
  sNoBadge: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(8),
  },
  sNoText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.bold,
  },
  tourNoWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  tourNoText: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.bold,
  },
  crNoText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.regular,
    marginTop: verticalScale(1),
  },
  typeBadge: {
    paddingHorizontal: horizontalScale(11),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(14),
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.bold,
  },
  divider: {
    height: 1,
    marginVertical: verticalScale(10),
  },
  infoRow: {
    marginBottom: verticalScale(6),
  },
  infoColFull: {
    width: "100%",
  },
  iconTextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(2),
  },
  label: {
    fontSize: moderateScale(10),
    fontFamily: Fonts.medium,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.semiBold,
  },
  highlightBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: moderateScale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    marginVertical: verticalScale(8),
  },
  infoCol: {
    flex: 1,
  },
  amountText: {
    fontSize: moderateScale(17),
    fontFamily: Fonts.bold,
    marginTop: verticalScale(2),
  },
  statusBadge: {
    paddingHorizontal: horizontalScale(9),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    marginTop: verticalScale(2),
  },
  statusBadgeText: {
    fontSize: moderateScale(10),
    fontFamily: Fonts.bold,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: verticalScale(3),
  },
  gridCol: {
    flex: 1,
  },
  gridValue: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.medium,
    marginTop: verticalScale(2),
  },
  docBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(6),
    borderWidth: 1,
    marginTop: verticalScale(2),
  },
  docBadgeText: {
    fontSize: moderateScale(10),
    fontFamily: Fonts.bold,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: verticalScale(10),
    marginTop: verticalScale(10),
    gap: horizontalScale(6),
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(9),
    borderWidth: 1,
    gap: horizontalScale(3),
  },
  actionBtnText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.bold,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: horizontalScale(32),
    paddingBottom: verticalScale(30),
  },
  title: {
    fontSize: moderateScale(17),
    fontFamily: Fonts.bold,
    marginTop: verticalScale(14),
    textAlign: "center",
  },
  subtitle: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
    marginTop: verticalScale(8),
    textAlign: "center",
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: verticalScale(18),
    paddingHorizontal: horizontalScale(22),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resetBtnText: {
    color: "#FFF",
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(13),
    fontFamily: Fonts.regular,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: moderateScale(16),
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
  },
  dialog: {
    borderRadius: moderateScale(20),
    overflow: "hidden",
    maxHeight: "90%",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: moderateScale(17),
    fontFamily: Fonts.bold,
  },
  subtitle: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
    marginTop: verticalScale(2),
  },
  formBody: {
    padding: moderateScale(16),
    maxHeight: 380,
  },
  formGroup: {
    marginBottom: verticalScale(14),
  },
  fieldLabel: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.semiBold,
    marginBottom: verticalScale(6),
  },
  input: {
    borderWidth: 1,
    borderRadius: moderateScale(10),
    paddingHorizontal: horizontalScale(12),
    height: verticalScale(42),
    fontSize: moderateScale(13),
    fontFamily: Fonts.regular,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: moderateScale(10),
    paddingHorizontal: horizontalScale(12),
    height: verticalScale(42),
  },
  dropdownValue: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.regular,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: horizontalScale(10),
  },
  resetButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: moderateScale(10),
    height: verticalScale(42),
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
  },
  applyButton: {
    flex: 1,
    borderRadius: moderateScale(10),
    height: verticalScale(42),
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  applyButtonText: {
    color: "#FFF",
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
  },
});

const pickerStyles = StyleSheet.create({
  pickerCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: moderateScale(16),
    overflow: "hidden",
    paddingBottom: verticalScale(8),
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  pickerTitle: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.bold,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.regular,
  },
});

const entryStyles = StyleSheet.create({
  dialog: {
    width: "100%",
    maxWidth: 420,
    borderRadius: moderateScale(20),
    overflow: "hidden",
    maxHeight: "85%",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(14),
  },
  title: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
  },
  subtitle: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
    marginTop: verticalScale(2),
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginTop: verticalScale(10),
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(6),
  },
  entryIndex: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
  },
  statusPill: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(8),
  },
  statusPillText: {
    fontSize: moderateScale(10),
    fontFamily: Fonts.bold,
  },
  entryDetails: {
    gap: verticalScale(4),
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryLabel: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.regular,
  },
  entryVal: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.medium,
    maxWidth: "65%",
    textAlign: "right",
  },
  errorSection: {
    marginTop: verticalScale(8),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FECACA",
    paddingTop: verticalScale(6),
  },
  errorToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(4),
  },
  errorToggleText: {
    color: "#DC2626",
    fontSize: moderateScale(11),
    fontFamily: Fonts.bold,
  },
  errorContentBox: {
    marginTop: verticalScale(6),
    padding: moderateScale(8),
    backgroundColor: "#FEF2F2",
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorDescText: {
    fontSize: moderateScale(11),
    color: "#991B1B",
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  closeBtn: {
    width: "100%",
    borderRadius: moderateScale(10),
    height: verticalScale(42),
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  closeBtnText: {
    color: "#FFF",
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
  },
});
