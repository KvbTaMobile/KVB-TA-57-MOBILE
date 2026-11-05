import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useLazyGetCancelApproverSummaryQuery,
  useLazyClaimApprovalSummaryQuery,
  useCommonDropDownGetQuery,
  useAgingDropdownQuery,
  useLazyBranchListQuery,
  useLazyEmployeeListQuery,
} from "../../redux/rtk_query/apiSlice";
import {
  clearTravelCancelApproverSummaryArray,
  setTravelCancelApproverSummaryArray,
} from "../../redux/slices/TravelMaker";

import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";
import { Fonts } from "../../styles/Fonts";

// Format date to "dd-MMM-yyyy"
const formatDateToDisplay = (dateObj) => {
  if (!dateObj) return "";
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return String(dateObj);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const CancelApprovalSummary = ({ navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  // Tab: "Tour" (TourCancel), "Advance" (AdvanceCancel), "Claim" (claim)
  const [activeTab, setActiveTab] = useState("Tour");

  // Summary List state
  const [summaryList, setSummaryList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Quick Filters
  const [tourNo, setTourNo] = useState("");
  const [requestDate, setRequestDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Status Filter: Default PENDING (id 2 or 47)
  const [selectedStatusId, setSelectedStatusId] = useState(2);
  const [selectedStatusName, setSelectedStatusName] = useState("PENDING");

  // Advanced Filters
  const [selectedAging, setSelectedAging] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Sub-modals for Branch and Employee Picker
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);
  const [isBranchLoading, setIsBranchLoading] = useState(false);

  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

  // Queries
  const { data: statusDropdownData } = useCommonDropDownGetQuery("status");
  const { data: agingDropdownData } = useAgingDropdownQuery({ page: 1, data: "" });

  const [triggerCancelApproverSummary, { isFetching: isCancelFetching }] =
    useLazyGetCancelApproverSummaryQuery();
  const [triggerClaimApprovalSummary, { isFetching: isClaimFetching }] =
    useLazyClaimApprovalSummaryQuery();
  const [triggerBranchList] = useLazyBranchListQuery();
  const [triggerEmployeeList] = useLazyEmployeeListQuery();

  const isFetching = isCancelFetching || isClaimFetching;
  const isFetchingRef = useRef(false);

  // Navigation Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Cancel Approval",
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },
      headerTintColor: CustomColors.textWhite || CustomColors.white,
      headerTitleStyle: {
        fontFamily: Fonts.Bold,
        fontSize: moderateScale(17),
        color: CustomColors.textWhite || CustomColors.white,
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={{ marginRight: horizontalScale(10), padding: 4 }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="filter-list" size={26} color={CustomColors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, CustomColors]);

  // Load Status options (filter out FORWARD and RETURN as per Angular logic)
  const statusList = React.useMemo(() => {
    const raw = Array.isArray(statusDropdownData)
      ? statusDropdownData
      : statusDropdownData?.data || [];
    const filtered = raw.filter(
      (item) => item.name !== "FORWARD" && item.name !== "RETURN" && item.value !== "FORWARD" && item.value !== "RETURN"
    );
    if (filtered.length > 0) return filtered;
    return [
      { id: 2, name: "PENDING", value: "PENDING" },
      { id: 3, name: "APPROVED", value: "APPROVED" },
      { id: 4, name: "REJECTED", value: "REJECTED" },
    ];
  }, [statusDropdownData]);

  // Handle tour no input changes with special character restriction (matching Angular onKeyDown regex)
  const handleTourNoChange = (text) => {
    const cleaned = text.replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/g, "");
    setTourNo(cleaned);
  };

  // Aging options
  const agingList = React.useMemo(() => {
    return Array.isArray(agingDropdownData)
      ? agingDropdownData
      : agingDropdownData?.data || [];
  }, [agingDropdownData]);

  // Core Data Fetch Function
  const fetchSummaryData = useCallback(
    async (pageNumber = 1, shouldAppend = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        let valString = "";
        if (tourNo.trim()) {
          valString += `&tour_no=${encodeURIComponent(tourNo.trim())}`;
        }
        if (requestDate) {
          valString += `&request_date=${encodeURIComponent(formatDateToDisplay(requestDate))}`;
        }
        if (selectedBranch?.id) {
          valString += `&branch_id=${selectedBranch.id}`;
        }
        if (selectedEmployee?.id) {
          valString += `&employee_id=${selectedEmployee.id}`;
        }
        if (selectedAging?.id) {
          valString += `&aging_id=${selectedAging.id}`;
        }

        let response;
        if (activeTab === "Claim") {
          response = await triggerClaimApprovalSummary({
            status: selectedStatusId,
            page: pageNumber,
            page_size: 10,
            tour_no: tourNo.trim() || undefined,
            request_date: requestDate ? formatDateToDisplay(requestDate) : undefined,
            branch_id: selectedBranch?.id || undefined,
            employee_id: selectedEmployee?.id || undefined,
            aging_id: selectedAging?.id || undefined,
          }).unwrap();
        } else {
          const type = activeTab === "Tour" ? "TourCancel" : "AdvanceCancel";
          response = await triggerCancelApproverSummary({
            type,
            status: selectedStatusId,
            page: pageNumber,
            page_size: 10,
            val: valString,
          }).unwrap();
        }

        const list = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination || {};
        const count = response?.count || list.length;

        setTotalCount(count);
        setHasNext(Boolean(pagination.has_next));
        setHasPrevious(Boolean(pagination.has_previous));
        setPage(pagination.index || pageNumber);

        if (shouldAppend) {
          setSummaryList((prev) => [...prev, ...list]);
        } else {
          setSummaryList(list);
          dispatch(clearTravelCancelApproverSummaryArray());
        }
        dispatch(
          setTravelCancelApproverSummaryArray({
            data: list,
            count: count,
          })
        );
      } catch (err) {
        console.error("Error fetching Cancel Approver Summary:", err);
        if (!shouldAppend) setSummaryList([]);
        ToastMessage(err?.data?.message || "Failed to load cancel approvals");
      } finally {
        isFetchingRef.current = false;
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [
      dispatch,
      activeTab,
      selectedStatusId,
      tourNo,
      requestDate,
      selectedBranch,
      selectedEmployee,
      selectedAging,
      triggerCancelApproverSummary,
      triggerClaimApprovalSummary,
    ]
  );

  // Redux cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearTravelCancelApproverSummaryArray());
    };
  }, [dispatch]);

  // Reload on tab or status change
  useEffect(() => {
    setPage(1);
    fetchSummaryData(1, false);
  }, [activeTab, selectedStatusId]);

  // Pull to refresh
  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchSummaryData(1, false);
  };

  // Search click
  const handleSearch = () => {
    setPage(1);
    fetchSummaryData(1, false);
  };

  // Clear search filters
  const handleClear = () => {
    setTourNo("");
    setRequestDate(null);
    setSelectedBranch(null);
    setSelectedEmployee(null);
    setSelectedAging(null);
    setSelectedStatusId(2);
    setSelectedStatusName("PENDING");
    setPage(1);
    setTimeout(() => {
      fetchSummaryData(1, false);
    }, 50);
  };

  // Infinite Scroll Load More
  const handleLoadMore = () => {
    if (!isLoadingMore && hasNext && !isFetching && !isFetchingRef.current) {
      const nextPage = page + 1;
      setIsLoadingMore(true);
      fetchSummaryData(nextPage, true);
    }
  };

  // Status pill click
  const handleStatusChange = (statusItem) => {
    let sId = statusItem?.id;
    const sName = statusItem?.name || statusItem?.value;
    if (sName === "APPROVED") sId = 3;
    else if (sName === "PENDING") sId = 2;
    else if (sName === "REJECTED") sId = 4;

    setSelectedStatusId(sId);
    setSelectedStatusName(sName);
  };

  // Branch Modal Search
  const fetchBranches = async (query = "") => {
    setIsBranchLoading(true);
    try {
      const res = await triggerBranchList({ name: query, page: 1 }).unwrap();
      const list = Array.isArray(res?.data) ? res.data : [];
      setBranchOptions(list);
    } catch (e) {
      console.error("Error fetching branches:", e);
    } finally {
      setIsBranchLoading(false);
    }
  };

  // Employee Modal Search
  const fetchEmployees = async (name = "") => {
    setIsEmployeeLoading(true);
    try {
      const branchId = selectedBranch?.id || 0;
      const res = await triggerEmployeeList({
        branch: branchId,
        name,
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

  // Action Click - View / Approve / Edit (matches Angular canceledit)
  const handleActionClick = (item) => {
    console.log("handleActionClick item:", item);
    if (activeTab === "Claim") {
      navigation.navigate("ExpenseApprovalView", {
        claimData: item,
        tourId: item.tourid || item.tour_id || item.id,
      });
    } else if (activeTab === "Tour") {
      // Must prioritize numeric tour id (tourid, id, tourgid) over requestno string so tourdata endpoint works
      // 1. Tour Cancel: Prioritize numeric tour ID so /taserv/tourdata/:id succeeds
      const tourId =
        item.tourid ||
        item.tour_id ||
        item.tourId ||
        item.id ||
        item.tourgid ||
        item.requestno;

      navigation.navigate("travel_edit_screen", {
        tourDataParams: {
          ...item,
          id: tourId,
          tourid: tourId,
          tour_id: tourId,
          tourId: tourId,
        },
        tour_id: tourId,
        tourid: tourId,
        id: tourId,
        from: "CHECKER",
        isCancelApproval: true,
      });
    } else if (activeTab === "Advance") {
      // 2. Advance Cancel: Similarly pass numeric advance tour ID
      const advanceTourId =
        item.tourgid ||
        item.tourid ||
        item.tour_id ||
        item.tourId ||
        item.id;

      navigation.navigate("advance_approval_view", {
        tourDataParams: {
          ...item,
          id: advanceTourId,
          tourgid: advanceTourId,
          tourid: advanceTourId,
        },
        tour_id: advanceTourId,
        tourgid: advanceTourId,
        id: advanceTourId,
        from: "CHECKER",
        isCancelApproval: true,
      });
    }
  };

  // Status Badge Styling Helper
  const getStatusBadgeStyle = (statusName) => {
    const st = (statusName || "").toUpperCase();
    if (st.includes("APPROV")) {
      return {
        bg: isDark ? "#064e3b" : "#E8F5E9",
        text: isDark ? "#4ade80" : "#2E7D32",
        border: isDark ? "#065f46" : "#A5D6A7",
      };
    }
    if (st.includes("REJECT")) {
      return {
        bg: isDark ? "#450a0a" : "#FFEBEE",
        text: isDark ? "#f87171" : "#C62828",
        border: isDark ? "#7f1d1d" : "#FFCDD2",
      };
    }
    return {
      bg: isDark ? "#451a03" : "#FFF8E1",
      text: isDark ? "#fde68a" : "#F57C00",
      border: isDark ? "#78350f" : "#FFE082",
    };
  };

  // Render individual card
  const renderItem = ({ item, index }) => {
    const sNo = index + 1;
    const tourNumber = item.requestno || item.tourid || item.id || "-";
    const employeeCode = item.employee_code || item.onbehalfof?.code || "";
    const employeeName = item.employee_name || item.onbehalfof?.full_name || "-";
    const branchName = item.branch_name || item.onbehalfof?.branch?.name || "-";
    const branchCode = item.branch_code || item.onbehalfof?.branch?.code || "";
    const grade = item.empgrade || item.onbehalfof?.grade || "";
    const designation = item.empdesignation || item.onbehalfof?.designation || "";
    const dateDisplay = item.requestdate || item.startdate || item.inwarddate || "-";
    const reason = item.reason || "-";
    const fromPlace = item.from_place;
    const toPlace = item.to_place;
    const claimAmt = item.claim_amount;
    const diffDays = item.diff_days;

    const currentStatus =
      item.tour_cancel_status && item.tour_cancel_status !== "DEFAULT"
        ? item.tour_cancel_status
        : item.advance_cancel_status && item.advance_cancel_status !== "DEFAULT"
          ? item.advance_cancel_status
          : item.claim_status || item.status_name || selectedStatusName;

    const badgeStyle = getStatusBadgeStyle(currentStatus);

    return (
      <View
        style={[
          cardStyles.cardContainer,
          {
            backgroundColor: isDark ? "#1e293b" : (CustomColors.white || "#FFFFFF"),
            borderColor: isDark ? "#334155" : (CustomColors.cardBorderColor || "#E0E0E0"),
          },
        ]}
      >
        {/* Top Header: S.No + Tour No + Status */}
        <View style={cardStyles.headerRow}>
          <View style={cardStyles.badgeRow}>
            <View style={[cardStyles.sNoCircle, { backgroundColor: isDark ? "#1e3a5f" : "#E3F2FD" }]}>
              <Text style={[cardStyles.sNoText, { color: isDark ? "#60a5fa" : "#1976D2" }]}>{sNo}</Text>
            </View>
            <View style={{ marginLeft: horizontalScale(8) }}>
              <Text style={[cardStyles.tourNoText, { color: isDark ? "#60a5fa" : (CustomColors.appThemeColor || "#0C4DA2") }]}>
                {tourNumber}
              </Text>
              <Text style={[cardStyles.dateSubText, { color: isDark ? "#94a3b8" : "#888" }]}>
                {formatDateToDisplay(dateDisplay)}
              </Text>
            </View>
          </View>

          <View
            style={[
              cardStyles.statusBadge,
              {
                backgroundColor: badgeStyle.bg,
                borderColor: badgeStyle.border,
              },
            ]}
          >
            <Text style={[cardStyles.statusBadgeText, { color: badgeStyle.text }]}>
              {currentStatus}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[cardStyles.divider, { backgroundColor: isDark ? "#334155" : "#F0F0F0" }]} />

        {/* Employee Info */}
        <View style={cardStyles.infoRow}>
          <Ionicons name="person-outline" size={16} color={isDark ? "#94a3b8" : "#666"} style={{ marginTop: 2 }} />
          <View style={{ marginLeft: horizontalScale(8), flex: 1 }}>
            <Text style={[cardStyles.employeeNameText, { color: isDark ? "#f8fafc" : "#222" }]}>
              {employeeCode ? `(${employeeCode}) ` : ""}
              {employeeName}
            </Text>
            {(designation || grade) && (
              <Text style={[cardStyles.metaText, { color: isDark ? "#cbd5e1" : "#666" }]}>
                {designation}
                {designation && grade ? " • " : ""}
                {grade ? `Grade: ${grade}` : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Branch Info */}
        <View style={cardStyles.infoRow}>
          <Ionicons name="business-outline" size={16} color={isDark ? "#94a3b8" : "#666"} style={{ marginTop: 2 }} />
          <View style={{ marginLeft: horizontalScale(8), flex: 1 }}>
            <Text style={[cardStyles.branchText, { color: isDark ? "#cbd5e1" : "#444" }]}>
              {branchCode ? `${branchCode} - ` : ""}
              {branchName}
            </Text>
          </View>
        </View>

        {/* Travel Route (if available) */}
        {(fromPlace || toPlace) && (
          <View style={cardStyles.infoRow}>
            <Ionicons name="navigate-outline" size={16} color={isDark ? "#94a3b8" : "#666"} style={{ marginTop: 2 }} />
            <Text style={[cardStyles.metaText, { marginLeft: horizontalScale(8), flex: 1, color: isDark ? "#cbd5e1" : "#666" }]}>
              {fromPlace || "-"} <Ionicons name="arrow-forward" size={12} color={isDark ? "#94a3b8" : "#888"} /> {toPlace || "-"}
            </Text>
          </View>
        )}

        {/* Reason */}
        {reason !== "-" && (
          <View style={cardStyles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color={isDark ? "#94a3b8" : "#666"} style={{ marginTop: 2 }} />
            <Text style={[cardStyles.metaText, { marginLeft: horizontalScale(8), flex: 1, color: isDark ? "#cbd5e1" : "#666" }]}>
              Reason: {reason}
            </Text>
          </View>
        )}

        {/* Bottom Bar: Amount / Aging Diff Days + Action Button */}
        <View style={[cardStyles.footerRow, { borderTopColor: isDark ? "#334155" : "#F5F5F5" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
            {claimAmt !== undefined && claimAmt !== null && (
              <View style={cardStyles.amountContainer}>
                <Text style={[cardStyles.amountLabel, { color: isDark ? "#94a3b8" : "#888" }]}>Claim Amount</Text>
                <Text style={[cardStyles.amountValue, { color: isDark ? "#4ade80" : "#2E7D32" }]}>₹{Number(claimAmt).toLocaleString()}</Text>
              </View>
            )}
            {diffDays !== undefined && diffDays !== null && (
              <View style={[cardStyles.agingBadge, { backgroundColor: isDark ? "#451a03" : "#FEF3C7" }]}>
                <Ionicons name="time-outline" size={12} color={isDark ? "#fde68a" : "#D97706"} />
                <Text style={[cardStyles.agingBadgeText, { color: isDark ? "#fde68a" : "#D97706" }]}>{diffDays}d ago</Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[cardStyles.actionBtn, { backgroundColor: CustomColors.appThemeColor }]}
            onPress={() => handleActionClick(item)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={16} color="#fff" />
            <Text style={cardStyles.actionBtnText}>Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: isDark ? "#0f172a" : "#F4F6F9" }]} edges={["bottom"]}>
      {/* 1. TABS: Tour vs Tour Advance vs Claim */}
      <View style={[tabStyles.tabContainer, { backgroundColor: isDark ? "#1e293b" : "#FFFFFF", borderBottomColor: isDark ? "#334155" : "#EAEAEA" }]}>
        {[
          { key: "Tour", label: "Tour", icon: "briefcase" },
          { key: "Advance", label: "Tour Advance", icon: "cash" },
          { key: "Claim", label: "Claim", icon: "receipt" },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                tabStyles.tabItem,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? "#1e293b"
                      : "#FFFFFF"
                    : isDark
                      ? "#0f172a"
                      : "#F9F9F9",
                  borderColor: isSelected
                    ? (CustomColors.appThemeColor || "#0C4DA2")
                    : isDark
                      ? "#334155"
                      : "#E0E0E0",
                },
                isSelected && [tabStyles.activeTabItem, { borderColor: CustomColors.appThemeColor }],
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSelected ? tab.icon : `${tab.icon}-outline`}
                size={16}
                color={isSelected ? (CustomColors.appThemeColor || "#0C4DA2") : isDark ? "#94a3b8" : "#666"}
              />
              <Text
                style={[
                  tabStyles.tabText,
                  {
                    color: isSelected
                      ? (CustomColors.appThemeColor || "#0C4DA2")
                      : isDark
                        ? "#94a3b8"
                        : "#666",
                  },
                  isSelected && [tabStyles.activeTabText, { color: CustomColors.appThemeColor }],
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. QUICK SEARCH BAR */}
      <View
        style={[
          searchStyles.searchCard,
          {
            backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? "#334155" : "transparent",
          },
        ]}
      >
        <View style={searchStyles.inputRow}>
          {/* Tour No Input */}
          <View
            style={[
              searchStyles.textInputContainer,
              {
                backgroundColor: isDark ? "#334155" : "#F5F5F7",
                borderColor: isDark ? "#475569" : "#E0E0E0",
              },
            ]}
          >
            <Ionicons name="search-outline" size={16} color={isDark ? "#94a3b8" : "#888"} style={{ marginLeft: 8 }} />
            <TextInput
              style={[searchStyles.textInput, { color: isDark ? "#f8fafc" : "#333" }]}
              placeholder="Tour No"
              placeholderTextColor={isDark ? "#94a3b8" : "#999"}
              value={tourNo}
              onChangeText={handleTourNoChange}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {tourNo.length > 0 && (
              <TouchableOpacity onPress={() => setTourNo("")} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={16} color={isDark ? "#94a3b8" : "#999"} />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Picker Trigger */}
          <TouchableOpacity
            style={[
              searchStyles.dateBtn,
              {
                backgroundColor: isDark ? "#334155" : "#F5F5F7",
                borderColor: isDark ? "#475569" : "#E0E0E0",
              },
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color={CustomColors.appThemeColor || "#0C4DA2"} />
            <Text style={[searchStyles.dateBtnText, { color: isDark ? "#f8fafc" : "#333" }]}>
              {requestDate ? formatDateToDisplay(requestDate) : "Req Date"}
            </Text>
            {requestDate && (
              <TouchableOpacity
                onPress={() => setRequestDate(null)}
                style={{ marginLeft: 4 }}
              >
                <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#999"} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Buttons Row: Search & Clear */}
        <View style={searchStyles.btnRow}>
          <TouchableOpacity
            style={[searchStyles.submitBtn, { backgroundColor: CustomColors.appThemeColor }]}
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <MaterialIcons name="search" size={18} color="#fff" />
            <Text style={searchStyles.submitBtnText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              searchStyles.clearBtn,
              {
                backgroundColor: isDark ? "#334155" : "#FAFAFA",
                borderColor: isDark ? "#475569" : "#CCC",
              },
            ]}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Text style={[searchStyles.clearBtnText, { color: isDark ? "#cbd5e1" : "#666" }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DateTimePicker modal */}
      {showDatePicker && (
        <DateTimePicker
          value={requestDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event?.type === "set" && date) setRequestDate(date);
          }}
        />
      )}

      {/* 3. STATUS PILLS FILTER */}
      <View style={statusStyles.statusContainer}>
        {statusList.map((st) => {
          const isSelected =
            selectedStatusName === st.name || selectedStatusName === st.value;
          return (
            <TouchableOpacity
              key={st.id || st.value}
              style={[
                statusStyles.statusPill,
                {
                  backgroundColor: isSelected
                    ? (CustomColors.appThemeColor || "#0C4DA2")
                    : isDark
                      ? "#1e293b"
                      : "#FFFFFF",
                  borderColor: isSelected
                    ? (CustomColors.appThemeColor || "#0C4DA2")
                    : isDark
                      ? "#334155"
                      : "#DDD",
                },
                isSelected && [
                  statusStyles.statusPillActive,
                  {
                    backgroundColor: CustomColors.appThemeColor,
                    borderColor: CustomColors.appThemeColor,
                  },
                ],
              ]}
              onPress={() => handleStatusChange(st)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  statusStyles.statusPillText,
                  {
                    color: isSelected
                      ? "#FFFFFF"
                      : isDark
                        ? "#cbd5e1"
                        : "#555",
                  },
                  isSelected && statusStyles.statusPillTextActive,
                ]}
              >
                {st.name || st.value}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. SUMMARY LIST OR EMPTY STATE */}
      {isFetching && !isRefreshing && summaryList.length === 0 ? (
        <View style={stateStyles.centeredContainer}>
          <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
          <Text style={[stateStyles.loadingText, { color: isDark ? "#94a3b8" : "#666" }]}>Loading cancel approvals...</Text>
        </View>
      ) : (
        <FlatList
          data={summaryList}
          keyExtractor={(item, index) => `${item.id || item.requestno || item.tourid}_${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: verticalScale(30) }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[CustomColors.appThemeColor || "#4f806d"]}
            />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: verticalScale(16), alignItems: "center" }}>
                <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
                <Text style={[stateStyles.loadingText, { marginTop: 4, fontSize: moderateScale(12), color: isDark ? "#94a3b8" : "#666" }]}>
                  Loading more approvals...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={stateStyles.emptyContainer}>
              <FontAwesome5 name="inbox" size={54} color={isDark ? "#475569" : "#BDBDBD"} />
              <Text style={[stateStyles.emptyTitle, { color: isDark ? "#f8fafc" : "#444" }]}>No Records Found</Text>
              <Text style={[stateStyles.emptySubtitle, { color: isDark ? "#94a3b8" : "#888" }]}>
                No cancel approvals available for the selected filters.
              </Text>
            </View>
          }
        />
      )}

      {/* 5. ADVANCED FILTER MODAL */}
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
                backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "#334155" : "transparent",
              },
            ]}
          >
            {/* Header */}
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#F0F0F0", borderBottomWidth: 1, paddingBottom: 10 }]}>
              <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#222" }]}>Filter Approvals</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#333"} />
              </TouchableOpacity>
            </View>

            {/* Aging Dropdown */}
            <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#444" }]}>Aging</Text>
            <View style={modalStyles.agingPillsContainer}>
              <TouchableOpacity
                style={[
                  modalStyles.agingChip,
                  {
                    backgroundColor: selectedAging === null
                      ? isDark
                        ? "#1e3a5f"
                        : "#E3F2FD"
                      : isDark
                        ? "#334155"
                        : "#F5F5F5",
                    borderColor: selectedAging === null
                      ? isDark
                        ? "#60a5fa"
                        : "#1976D2"
                      : isDark
                        ? "#475569"
                        : "#DDD",
                  },
                ]}
                onPress={() => setSelectedAging(null)}
              >
                <Text
                  style={[
                    modalStyles.agingChipText,
                    {
                      color: selectedAging === null
                        ? isDark
                          ? "#60a5fa"
                          : "#1976D2"
                        : isDark
                          ? "#cbd5e1"
                          : "#555",
                    },
                    selectedAging === null && modalStyles.agingChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {agingList.map((aging) => {
                const isSel = selectedAging?.id === aging.id;
                return (
                  <TouchableOpacity
                    key={aging.id}
                    style={[
                      modalStyles.agingChip,
                      {
                        backgroundColor: isSel
                          ? isDark
                            ? "#1e3a5f"
                            : "#E3F2FD"
                          : isDark
                            ? "#334155"
                            : "#F5F5F5",
                        borderColor: isSel
                          ? isDark
                            ? "#60a5fa"
                            : "#1976D2"
                          : isDark
                            ? "#475569"
                            : "#DDD",
                      },
                    ]}
                    onPress={() => setSelectedAging(aging)}
                  >
                    <Text
                      style={[
                        modalStyles.agingChipText,
                        {
                          color: isSel
                            ? isDark
                              ? "#60a5fa"
                              : "#1976D2"
                            : isDark
                              ? "#cbd5e1"
                              : "#555",
                        },
                        isSel && modalStyles.agingChipTextActive,
                      ]}
                    >
                      {aging.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Branch Selector */}
            <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#444" }]}>Branch</Text>
            <TouchableOpacity
              style={[
                modalStyles.selectorBtn,
                {
                  backgroundColor: isDark ? "#334155" : "#F5F5F7",
                  borderColor: isDark ? "#475569" : "#E0E0E0",
                },
              ]}
              onPress={() => {
                fetchBranches("");
                setBranchModalVisible(true);
              }}
            >
              <Ionicons name="business-outline" size={18} color={isDark ? "#94a3b8" : "#666"} />
              <Text style={[modalStyles.selectorBtnText, { color: isDark ? "#f8fafc" : "#333" }]} numberOfLines={1}>
                {selectedBranch
                  ? selectedBranch.name_code || `${selectedBranch.code} - ${selectedBranch.name}`
                  : "Select Branch"}
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
            <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#444" }]}>Employee</Text>
            <TouchableOpacity
              style={[
                modalStyles.selectorBtn,
                {
                  backgroundColor: isDark ? "#334155" : "#F5F5F7",
                  borderColor: isDark ? "#475569" : "#E0E0E0",
                },
              ]}
              onPress={() => {
                fetchEmployees("");
                setEmployeeModalVisible(true);
              }}
            >
              <Ionicons name="person-outline" size={18} color={isDark ? "#94a3b8" : "#666"} />
              <Text style={[modalStyles.selectorBtnText, { color: isDark ? "#f8fafc" : "#333" }]} numberOfLines={1}>
                {selectedEmployee
                  ? selectedEmployee.full_name || `(${selectedEmployee.code}) ${selectedEmployee.name}`
                  : "Select Employee"}
              </Text>
              {selectedEmployee ? (
                <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                  <Ionicons name="close-circle" size={18} color={isDark ? "#94a3b8" : "#999"} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={isDark ? "#94a3b8" : "#999"} />
              )}
            </TouchableOpacity>

            {/* Action Buttons: Reset & Apply */}
            <View style={modalStyles.footerBtns}>
              <TouchableOpacity
                style={[
                  modalStyles.resetBtn,
                  {
                    backgroundColor: isDark ? "#334155" : "#FAFAFA",
                    borderColor: isDark ? "#475569" : "#CCC",
                  },
                ]}
                onPress={() => {
                  setSelectedAging(null);
                  setSelectedBranch(null);
                  setSelectedEmployee(null);
                }}
              >
                <Text style={[modalStyles.resetBtnText, { color: isDark ? "#cbd5e1" : "#666" }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.applyBtn, { backgroundColor: CustomColors.appThemeColor }]}
                onPress={() => {
                  setFilterModalVisible(false);
                  setPage(1);
                  fetchSummaryData(1, false);
                }}
              >
                <Text style={modalStyles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. BRANCH PICKER MODAL */}
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
                backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "#334155" : "transparent",
              },
            ]}
          >
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#F0F0F0", borderBottomWidth: 1, paddingBottom: 10 }]}>
              <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#222" }]}>Select Branch</Text>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#333"} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                modalStyles.searchBox,
                {
                  backgroundColor: isDark ? "#334155" : "#F5F5F7",
                  borderColor: isDark ? "#475569" : "#E0E0E0",
                },
              ]}
            >
              <Ionicons name="search" size={18} color={isDark ? "#94a3b8" : "#888"} />
              <TextInput
                style={[modalStyles.searchInput, { color: isDark ? "#f8fafc" : "#333" }]}
                placeholder="Search branch by name or code..."
                placeholderTextColor={isDark ? "#94a3b8" : "#888"}
                value={branchSearch}
                onChangeText={(text) => {
                  setBranchSearch(text);
                  fetchBranches(text);
                }}
              />
            </View>

            {isBranchLoading ? (
              <ActivityIndicator size="small" color={CustomColors.appThemeColor} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={branchOptions}
                keyExtractor={(item, index) => `${item.id || item.code || "branch"}_${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[modalStyles.pickerItem, { borderBottomColor: isDark ? "#334155" : "#F0F0F0" }]}
                    onPress={() => {
                      setSelectedBranch(item);
                      setBranchModalVisible(false);
                    }}
                  >
                    <Text style={[modalStyles.pickerItemTitle, { color: isDark ? "#f8fafc" : "#222" }]}>
                      {item.name_code || `${item.code} - ${item.name}`}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 8. EMPLOYEE PICKER MODAL */}
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
                backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? "#334155" : "transparent",
              },
            ]}
          >
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#F0F0F0", borderBottomWidth: 1, paddingBottom: 10 }]}>
              <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#222" }]}>Select Employee</Text>
              <TouchableOpacity onPress={() => setEmployeeModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#333"} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                modalStyles.searchBox,
                {
                  backgroundColor: isDark ? "#334155" : "#F5F5F7",
                  borderColor: isDark ? "#475569" : "#E0E0E0",
                },
              ]}
            >
              <Ionicons name="search" size={18} color={isDark ? "#94a3b8" : "#888"} />
              <TextInput
                style={[modalStyles.searchInput, { color: isDark ? "#f8fafc" : "#333" }]}
                placeholder="Search employee name or code..."
                placeholderTextColor={isDark ? "#94a3b8" : "#888"}
                value={employeeSearch}
                onChangeText={(text) => {
                  setEmployeeSearch(text);
                  fetchEmployees(text);
                }}
              />
            </View>

            {isEmployeeLoading ? (
              <ActivityIndicator size="small" color={CustomColors.appThemeColor} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={employeeOptions}
                keyExtractor={(item, index) => `${item.id || item.code || "emp"}_${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[modalStyles.pickerItem, { borderBottomColor: isDark ? "#334155" : "#F0F0F0" }]}
                    onPress={() => {
                      setSelectedEmployee(item);
                      setEmployeeModalVisible(false);
                    }}
                  >
                    <Text style={[modalStyles.pickerItemTitle, { color: isDark ? "#f8fafc" : "#222" }]}>
                      {item.full_name || `(${item.code}) ${item.name}`}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CancelApprovalSummary;

/* ==========================================================================
   STYLES
   ========================================================================== */

const tabStyles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(8),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginHorizontal: horizontalScale(4),
    backgroundColor: "#F9F9F9",
  },
  activeTabItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
  },
  tabText: {
    marginLeft: horizontalScale(6),
    fontSize: moderateScale(13),
    fontFamily: Fonts.Medium,
    color: "#666",
  },
  activeTabText: {
    fontFamily: Fonts.Bold,
  },
});

const searchStyles = StyleSheet.create({
  searchCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: horizontalScale(12),
    marginTop: verticalScale(8),
    borderRadius: 10,
    padding: moderateScale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInputContainer: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    height: verticalScale(40),
  },
  textInput: {
    flex: 1,
    paddingHorizontal: horizontalScale(8),
    fontSize: moderateScale(13),
    color: "#333",
  },
  dateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    height: verticalScale(40),
    paddingHorizontal: horizontalScale(10),
    marginLeft: horizontalScale(8),
  },
  dateBtnText: {
    marginLeft: horizontalScale(6),
    fontSize: moderateScale(12),
    color: "#333",
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: verticalScale(8),
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(16),
    borderRadius: 6,
    marginRight: horizontalScale(8),
  },
  submitBtnText: {
    color: "#fff",
    fontSize: moderateScale(13),
    fontFamily: Fonts.SemiBold,
    marginLeft: horizontalScale(4),
  },
  clearBtn: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(14),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CCC",
    backgroundColor: "#FAFAFA",
  },
  clearBtnText: {
    color: "#666",
    fontSize: moderateScale(13),
    fontFamily: Fonts.Medium,
  },
});

const statusStyles = StyleSheet.create({
  statusContainer: {
    flexDirection: "row",
    paddingHorizontal: horizontalScale(12),
    marginVertical: verticalScale(8),
  },
  statusPill: {
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(5),
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: horizontalScale(8),
  },
  statusPillActive: {},
  statusPillText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.Medium,
    color: "#555",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
    fontFamily: Fonts.Bold,
  },
});

const cardStyles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: horizontalScale(12),
    marginBottom: verticalScale(10),
    borderRadius: 12,
    borderWidth: 1,
    padding: moderateScale(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  sNoText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
    color: "#1976D2",
  },
  tourNoText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.Bold,
  },
  dateSubText: {
    fontSize: moderateScale(11),
    color: "#888",
  },
  statusBadge: {
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(3),
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
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
    color: "#222",
  },
  metaText: {
    fontSize: moderateScale(11),
    color: "#666",
    marginTop: 2,
  },
  branchText: {
    fontSize: moderateScale(12),
    color: "#444",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  amountContainer: {
    marginRight: horizontalScale(12),
  },
  amountLabel: {
    fontSize: moderateScale(10),
    color: "#888",
  },
  amountValue: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.Bold,
    color: "#2E7D32",
  },
  agingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: horizontalScale(6),
    paddingVertical: verticalScale(2),
    borderRadius: 6,
  },
  agingBadgeText: {
    fontSize: moderateScale(11),
    color: "#D97706",
    marginLeft: 3,
    fontFamily: Fonts.Medium,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontFamily: Fonts.SemiBold,
    marginLeft: 4,
  },
});

const stateStyles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: moderateScale(13),
    color: "#666",
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
    color: "#444",
    marginTop: verticalScale(12),
  },
  emptySubtitle: {
    fontSize: moderateScale(12),
    color: "#888",
    textAlign: "center",
    marginTop: verticalScale(4),
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: moderateScale(16),
    maxHeight: "85%",
  },
  pickerModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: moderateScale(16),
    height: "75%",
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
    color: "#222",
  },
  filterLabel: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.SemiBold,
    color: "#444",
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
  },
  agingPillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  agingChip: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
    marginBottom: 6,
    marginRight: 6,
  },
  agingChipActive: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1976D2",
  },
  agingChipText: {
    fontSize: moderateScale(12),
    color: "#555",
  },
  agingChipTextActive: {
    color: "#1976D2",
    fontFamily: Fonts.Bold,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: horizontalScale(12),
    height: verticalScale(44),
  },
  selectorBtnText: {
    flex: 1,
    marginLeft: horizontalScale(8),
    fontSize: moderateScale(13),
    color: "#333",
  },
  footerBtns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
  },
  resetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: verticalScale(44),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    marginRight: horizontalScale(8),
  },
  resetBtnText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.SemiBold,
    color: "#666",
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: horizontalScale(10),
    height: verticalScale(40),
    marginBottom: verticalScale(10),
  },
  searchInput: {
    flex: 1,
    marginLeft: horizontalScale(6),
    fontSize: moderateScale(13),
    color: "#333",
  },
  pickerItem: {
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pickerItemTitle: {
    fontSize: moderateScale(13),
    color: "#222",
  },
});
