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
  ScrollView,
  Modal,
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
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useLazyGetConsolidateReportQuery,
  useLazyDownloadConsolidateReportQuery,
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
} from "../../styles/Metrics";
import { Fonts } from "../../styles/Fonts";

const formatDateToAPI = (dateObj) => {
  if (!dateObj) return "";
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return String(dateObj);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateToDisplay = (dateObj) => {
  if (!dateObj) return "";
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return String(dateObj);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const EclaimBillConsolidateScreen = ({ navigation, isEmbedded = false }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  // Search filter states
  const [tourNo, setTourNo] = useState("");
  const [crnNo, setCrnNo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'from' | 'to'

  // Modal states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);
  const [isBranchLoading, setIsBranchLoading] = useState(false);

  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

  // Report state
  const [reportList, setReportList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState("card"); // 'card' | 'table'

  const isFetchingRef = useRef(false);

  // RTK Query hooks
  const [triggerGetConsolidate, { isFetching }] = useLazyGetConsolidateReportQuery();
  const [triggerDownload, { isFetching: isDownloading }] = useLazyDownloadConsolidateReportQuery();
  const [triggerBranchList] = useLazyBranchListQuery();
  const [triggerEmployeeList] = useLazyEmployeeListQuery();

  // Navigation Header (when standalone)
  useLayoutEffect(() => {
    if (isEmbedded) return;
    navigation.setOptions({
      title: "TA Consolidate",
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },
      headerTintColor: CustomColors.textWhite || "#FFFFFF",
      headerTitleStyle: {
        fontFamily: Fonts.Bold,
        fontSize: moderateScale(18),
        color: CustomColors.textWhite || "#FFFFFF",
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setViewMode((prev) => (prev === "card" ? "table" : "card"))}
          style={{ marginRight: horizontalScale(14), padding: 4 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={viewMode === "card" ? "table-large" : "card-text-outline"}
            size={24}
            color={CustomColors.textWhite || "#FFFFFF"}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, CustomColors, viewMode, isEmbedded]);

  // Branch Selector Fetcher
  const fetchBranches = async (searchQuery = "") => {
    setIsBranchLoading(true);
    try {
      const res = await triggerBranchList({ name: searchQuery, query: searchQuery, page: 1 }).unwrap();
      const list = Array.isArray(res?.data) ? res.data : [];
      setBranchOptions(list);
    } catch (e) {
      console.error("Error fetching branches:", e);
      setBranchOptions([]);
    } finally {
      setIsBranchLoading(false);
    }
  };

  // Employee Selector Fetcher (filtered by branch if available)
  const fetchEmployees = async (searchQuery = "", branchId = selectedBranch?.id) => {
    setIsEmployeeLoading(true);
    try {
      const res = await triggerEmployeeList({
        query: searchQuery,
        name: searchQuery,
        branch_id: branchId || "",
        page: 1,
      }).unwrap();
      const list = Array.isArray(res?.data) ? res.data : [];
      setEmployeeOptions(list);
    } catch (e) {
      console.error("Error fetching employees:", e);
      setEmployeeOptions([]);
    } finally {
      setIsEmployeeLoading(false);
    }
  };

  // Fetch Report Data with continuous scroll append support
  const fetchReportData = useCallback(
    async (pageToLoad = 1, shouldAppend = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const params = {
          tour_no: tourNo.trim(),
          crnno: crnNo.trim(),
          branchid: selectedBranch?.id ? String(selectedBranch.id) : "",
          employee_id: selectedEmployee?.id ? String(selectedEmployee.id) : "",
          form_date: fromDate ? formatDateToAPI(fromDate) : "",
          to_date: toDate ? formatDateToAPI(toDate) : "",
          page: pageToLoad,
        };

        const response = await triggerGetConsolidate(params).unwrap();

        const data = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination || {};
        const count = response?.count ?? data.length;

        setTotalCount(count);
        setCurrentPage(pagination?.index || pageToLoad);
        setHasNext(Boolean(pagination?.has_next));
        setHasPrevious(Boolean(pagination?.has_previous));

        if (shouldAppend) {
          setReportList((prev) => [...prev, ...data]);
        } else {
          setReportList(data);
        }
      } catch (err) {
        console.error("Error fetching TA Consolidate Report:", err);
        if (!shouldAppend) setReportList([]);
        ToastMessage(err?.data?.message || "Failed to load consolidate report");
      } finally {
        isFetchingRef.current = false;
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [
      triggerGetConsolidate,
      tourNo,
      crnNo,
      selectedBranch,
      selectedEmployee,
      fromDate,
      toDate,
    ]
  );

  useEffect(() => {
    fetchReportData(1, false);
  }, []);

  const handleSearch = () => {
    setFilterModalVisible(false);
    setCurrentPage(1);
    fetchReportData(1, false);
  };

  const handleClear = () => {
    setTourNo("");
    setCrnNo("");
    setSelectedBranch(null);
    setSelectedEmployee(null);
    setFromDate(null);
    setToDate(null);
    setCurrentPage(1);
    setTimeout(() => {
      fetchReportData(1, false);
    }, 50);
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    fetchReportData(1, false);
  };

  // Continuous infinite scroll on reaching bottom
  const handleLoadMore = () => {
    if (!isLoadingMore && hasNext && !isFetching && !isFetchingRef.current) {
      const nextPage = currentPage + 1;
      setIsLoadingMore(true);
      fetchReportData(nextPage, true);
    }
  };

  const handlePreviousPage = () => {
    if (hasPrevious && currentPage > 1 && !isFetching) {
      const prevPage = currentPage - 1;
      fetchReportData(prevPage);
    }
  };

  const handleNextPage = () => {
    if (hasNext && !isFetching) {
      const nextPage = currentPage + 1;
      fetchReportData(nextPage);
    }
  };

  const handleDownload = async () => {
    try {
      const params = {
        tour_no: tourNo.trim(),
        crnno: crnNo.trim(),
        branch: selectedBranch?.id ? String(selectedBranch.id) : "",
        employee_id: selectedEmployee?.id ? String(selectedEmployee.id) : "",
        from_date: fromDate ? formatDateToAPI(fromDate) : "",
        to_date: toDate ? formatDateToAPI(toDate) : "",
      };
      const res = await triggerDownload(params).unwrap();
      if (res?.code === "INVALID_DATA") {
        ToastMessage(res?.description || "No Data Found!");
      } else {
        ToastMessage("TA Consolidate Download Initiated");
      }
    } catch (e) {
      console.error("Error downloading consolidate report:", e);
      ToastMessage(e?.data?.description || "Download failed");
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const pickerType = activeDatePicker;
    setActiveDatePicker(null);
    if (event?.type === "set" && selectedDate) {
      if (pickerType === "from") setFromDate(selectedDate);
      else if (pickerType === "to") setToDate(selectedDate);
    }
  };

  // Render individual card
  const renderCard = ({ item, index }) => {
    const serialNumber = (currentPage - 1) * pageSize + index + 1;

    return (
      <View
        style={[
          componentStyles.card,
          {
            backgroundColor: isDark ? "#1e293b" : (CustomColors.white || "#FFFFFF"),
            borderColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
          },
        ]}
      >
        {/* Top Header */}
        <View style={componentStyles.cardHeader}>
          <View style={[componentStyles.serialBadge, { backgroundColor: isDark ? "#334155" : "#EDE7F6" }]}>
            <Text style={[componentStyles.serialText, { color: isDark ? "#c084fc" : "#673AB7" }]}>#{serialNumber}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: horizontalScale(10) }}>
            <Text style={[componentStyles.tourNoText, { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#111111") }]}>
              {item?.requestno || "-"}
            </Text>
            {item?.claim_crnno ? (
              <Text style={[componentStyles.crnText, { color: isDark ? "#6ee7b7" : CustomColors.appThemeColor }]}>
                CRN: {item.claim_crnno}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              componentStyles.totalAmtBadge,
              {
                backgroundColor: isDark ? "#064e3b" : "#E8F5E9",
                borderColor: isDark ? "#047857" : "#A5D6A7",
              },
            ]}
          >
            <Text style={[componentStyles.totalAmtLabel, { color: isDark ? "#6ee7b7" : "#2E7D32" }]}>Total Claim</Text>
            <Text style={[componentStyles.totalAmtValue, { color: isDark ? "#a7f3d0" : "#1B5E20" }]}>
              ₹{Number(item?.total_amount || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Employee & Designation */}
        <View style={componentStyles.infoRow}>
          <Ionicons name="person-outline" size={15} color={isDark ? "#94a3b8" : "#555"} />
          <Text style={[componentStyles.infoText, { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#222") }]}>
            {item?.employee_data || "-"}
            {item?.empdesignation ? ` (${item.empdesignation})` : ""}
          </Text>
        </View>

        {/* Branch */}
        {item?.branch_data && (
          <View style={componentStyles.infoRow}>
            <Ionicons name="business-outline" size={15} color={isDark ? "#94a3b8" : "#555"} />
            <Text style={[componentStyles.infoText, { color: isDark ? "#cbd5e1" : (CustomColors.textGray || "#555") }]}>
              Branch: {item.branch_data}
            </Text>
          </View>
        )}

        {/* Tour Reason */}
        {item?.reasonname && (
          <View style={componentStyles.infoRow}>
            <Ionicons name="document-text-outline" size={15} color={isDark ? "#94a3b8" : "#555"} />
            <Text style={[componentStyles.infoText, { color: isDark ? "#cbd5e1" : (CustomColors.textGray || "#555"), flex: 1 }]} numberOfLines={2}>
              Reason: {item.reasonname}
            </Text>
          </View>
        )}

        {/* Dates & Duration */}
        <View style={componentStyles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color={isDark ? "#94a3b8" : "#555"} />
          <Text style={[componentStyles.infoText, { color: isDark ? "#cbd5e1" : (CustomColors.textGray || "#555") }]}>
            {item?.startdate || "-"} to {item?.enddate || "-"}
            {item?.durationdays ? ` (${item.durationdays} days)` : ""}
          </Text>
        </View>

        {/* Expense Breakdown Grid */}
        <View
          style={[
            componentStyles.expenseBreakdownBox,
            {
              backgroundColor: isDark ? "#0f172a" : "#F9FAFB",
              borderColor: isDark ? "#334155" : "#EAEAEA",
            },
          ]}
        >
          <Text style={[componentStyles.breakdownHeader, { color: isDark ? "#94a3b8" : "#555" }]}>Expense Breakdown</Text>
          <View style={componentStyles.breakdownGrid}>
            <View style={componentStyles.breakdownItem}>
              <Text style={[componentStyles.bdLabel, { color: isDark ? "#64748b" : "#777" }]}>Travel</Text>
              <Text style={[componentStyles.bdValue, { color: isDark ? "#f8fafc" : "#333" }]}>₹{Number(item?.travel_amount || 0).toLocaleString()}</Text>
            </View>

            <View style={componentStyles.breakdownItem}>
              <Text style={[componentStyles.bdLabel, { color: isDark ? "#64748b" : "#777" }]}>Daily Diem</Text>
              <Text style={[componentStyles.bdValue, { color: isDark ? "#f8fafc" : "#333" }]}>₹{Number(item?.dailydeim_amount || 0).toLocaleString()}</Text>
            </View>

            <View style={componentStyles.breakdownItem}>
              <Text style={[componentStyles.bdLabel, { color: isDark ? "#64748b" : "#777" }]}>Lodging</Text>
              <Text style={[componentStyles.bdValue, { color: isDark ? "#f8fafc" : "#333" }]}>₹{Number(item?.lodging_amount || 0).toLocaleString()}</Text>
            </View>

            <View style={componentStyles.breakdownItem}>
              <Text style={[componentStyles.bdLabel, { color: isDark ? "#64748b" : "#777" }]}>Incidental</Text>
              <Text style={[componentStyles.bdValue, { color: isDark ? "#f8fafc" : "#333" }]}>₹{Number(item?.incidental_amount || 0).toLocaleString()}</Text>
            </View>

            <View style={componentStyles.breakdownItem}>
              <Text style={[componentStyles.bdLabel, { color: isDark ? "#64748b" : "#777" }]}>Local Conv.</Text>
              <Text style={[componentStyles.bdValue, { color: isDark ? "#f8fafc" : "#333" }]}>₹{Number(item?.local_amount || 0).toLocaleString()}</Text>
            </View>

            <View style={componentStyles.breakdownItem}>
              <Text style={[componentStyles.bdLabel, { color: isDark ? "#64748b" : "#777" }]}>Packing/Mvg</Text>
              <Text style={[componentStyles.bdValue, { color: isDark ? "#f8fafc" : "#333" }]}>₹{Number(item?.packing_amount || 0).toLocaleString()}</Text>
            </View>

            <View style={componentStyles.breakdownItem}>
              <Text style={[componentStyles.bdLabel, { color: isDark ? "#64748b" : "#777" }]}>Misc</Text>
              <Text style={[componentStyles.bdValue, { color: isDark ? "#f8fafc" : "#333" }]}>₹{Number(item?.misc_amount || 0).toLocaleString()}</Text>
            </View>

            <View style={componentStyles.breakdownItem}>
              <Text style={[componentStyles.bdLabel, { color: isDark ? "#64748b" : "#777" }]}>IBA</Text>
              <Text style={[componentStyles.bdValue, { color: isDark ? "#f8fafc" : "#333" }]}>₹{Number(item?.iba_amount || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Table view
  const renderTable = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
        <View style={{ paddingBottom: verticalScale(30) }}>
          {/* Header */}
          <View
            style={[
              componentStyles.tableRow,
              componentStyles.tableHeaderRow,
              { backgroundColor: CustomColors.appThemeColor || "#4F806D" },
            ]}
          >
            <Text style={[componentStyles.tableHeaderCell, { width: 50 }]}>S.No</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>Tour No</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>CR No</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 130, textAlign: "left" }]}>Employee</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>Branch</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 100 }]}>From</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 100 }]}>To</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 90 }]}>Travel</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 90 }]}>Daily Diem</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 90 }]}>Lodging</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 90 }]}>Local</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 90 }]}>Total Claim</Text>
          </View>

          {/* Body */}
          {reportList.map((item, index) => {
            const serialNumber = (currentPage - 1) * pageSize + index + 1;
            const isEven = index % 2 === 0;

            return (
              <View
                key={`${item?.requestno || index}-${index}`}
                style={[
                  componentStyles.tableRow,
                  {
                    backgroundColor: isEven
                      ? (isDark ? "#1e293b" : (CustomColors.white || "#FFFFFF"))
                      : (isDark ? "#0f172a" : "#F9F9F9"),
                    borderBottomColor: isDark ? "#334155" : "#EEEEEE",
                  },
                ]}
              >
                <Text style={[componentStyles.tableCell, { width: 50, color: isDark ? "#94a3b8" : "#333" }]}>{serialNumber}</Text>
                <Text style={[componentStyles.tableCell, { width: 110, fontFamily: Fonts.SemiBold, color: isDark ? "#f8fafc" : "#333" }]}>
                  {item.requestno || "-"}
                </Text>
                <Text style={[componentStyles.tableCell, { width: 110, color: isDark ? "#6ee7b7" : CustomColors.appThemeColor }]}>{item.claim_crnno || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 130, textAlign: "left", color: isDark ? "#f8fafc" : "#333" }]}>
                  {item.employee_data || "-"}
                </Text>
                <Text style={[componentStyles.tableCell, { width: 110, color: isDark ? "#cbd5e1" : "#333" }]}>{item.branch_data || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 100, color: isDark ? "#cbd5e1" : "#333" }]}>{item.startdate || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 100, color: isDark ? "#cbd5e1" : "#333" }]}>{item.enddate || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 90, color: isDark ? "#cbd5e1" : "#333" }]}>₹{Number(item.travel_amount || 0).toLocaleString()}</Text>
                <Text style={[componentStyles.tableCell, { width: 90, color: isDark ? "#cbd5e1" : "#333" }]}>₹{Number(item.dailydeim_amount || 0).toLocaleString()}</Text>
                <Text style={[componentStyles.tableCell, { width: 90, color: isDark ? "#cbd5e1" : "#333" }]}>₹{Number(item.lodging_amount || 0).toLocaleString()}</Text>
                <Text style={[componentStyles.tableCell, { width: 90, color: isDark ? "#cbd5e1" : "#333" }]}>₹{Number(item.local_amount || 0).toLocaleString()}</Text>
                <Text style={[componentStyles.tableCell, { width: 90, fontFamily: Fonts.Bold, color: isDark ? "#86efac" : "#2E7D32" }]}>
                  ₹{Number(item.total_amount || 0).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        componentStyles.container,
        { backgroundColor: isDark ? "#0f172a" : (CustomColors.backgroundLightGray || "#F5F5F5") },
      ]}
    >
      {/* Search Header Bar */}
      <View
        style={[
          componentStyles.searchCard,
          {
            backgroundColor: isDark ? "#1e293b" : (CustomColors.white || "#FFFFFF"),
            borderColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
          },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: verticalScale(10) }}>
          <Text
            style={[
              componentStyles.screenHeading,
              { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#111111"), marginBottom: 0 },
            ]}
          >
            eClaim Bill Consolidate
          </Text>

          {isEmbedded && (
            <TouchableOpacity
              onPress={() => setViewMode((prev) => (prev === "card" ? "table" : "card"))}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: horizontalScale(10),
                paddingVertical: verticalScale(6),
                borderRadius: 6,
                backgroundColor: CustomColors.appThemeColor,
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={viewMode === "card" ? "table-large" : "card-text-outline"}
                size={16}
                color={CustomColors.textWhite || "#FFFFFF"}
              />
              <Text style={{ color: CustomColors.textWhite || "#FFFFFF", fontSize: moderateScale(11), fontFamily: Fonts.SemiBold, marginLeft: 4 }}>
                {viewMode === "card" ? "Table" : "Cards"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={componentStyles.searchRow}>
          <View
            style={[
              componentStyles.inputWrapper,
              {
                backgroundColor: isDark ? "#334155" : "#F7F8FA",
                borderColor: isDark ? "#475569" : (CustomColors.overlayLightGray || "#CCCCCC"),
              },
            ]}
          >
            <Ionicons name="search-outline" size={16} color={isDark ? "#94a3b8" : "#888"} style={{ marginLeft: 8 }} />
            <TextInput
              style={[
                componentStyles.textInput,
                { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#333333") },
              ]}
              placeholder="Tour No / CR No"
              placeholderTextColor={isDark ? "#94a3b8" : "#999"}
              value={tourNo}
              onChangeText={setTourNo}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {tourNo.length > 0 && (
              <TouchableOpacity onPress={() => setTourNo("")} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color={isDark ? "#94a3b8" : "#999"} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[componentStyles.filterBtn, { backgroundColor: CustomColors.appThemeColor }]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
            <Text style={componentStyles.filterBtnText}>Filters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[componentStyles.downloadBtn, { backgroundColor: CustomColors.appThemeColor }]}
            onPress={handleDownload}
            disabled={isDownloading}
            activeOpacity={0.8}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="download" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Chips for Active Filters */}
        {(selectedBranch || selectedEmployee || crnNo || fromDate || toDate) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={componentStyles.chipsScroll}>
            {crnNo ? (
              <View style={[componentStyles.chip, { backgroundColor: isDark ? "#334155" : "#E8EAF6" }]}>
                <Text style={[componentStyles.chipText, { color: isDark ? "#cbd5e1" : "#333" }]}>CR: {crnNo}</Text>
                <TouchableOpacity onPress={() => setCrnNo("")}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            ) : null}

            {selectedBranch ? (
              <View style={[componentStyles.chip, { backgroundColor: isDark ? "#334155" : "#E8EAF6" }]}>
                <Text style={[componentStyles.chipText, { color: isDark ? "#cbd5e1" : "#333" }]}>Branch: {selectedBranch.code}</Text>
                <TouchableOpacity onPress={() => setSelectedBranch(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            ) : null}

            {selectedEmployee ? (
              <View style={[componentStyles.chip, { backgroundColor: isDark ? "#334155" : "#E8EAF6" }]}>
                <Text style={[componentStyles.chipText, { color: isDark ? "#cbd5e1" : "#333" }]}>Emp: {selectedEmployee.code}</Text>
                <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            ) : null}

            {fromDate ? (
              <View style={[componentStyles.chip, { backgroundColor: isDark ? "#334155" : "#E8EAF6" }]}>
                <Text style={[componentStyles.chipText, { color: isDark ? "#cbd5e1" : "#333" }]}>From: {formatDateToDisplay(fromDate)}</Text>
                <TouchableOpacity onPress={() => setFromDate(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            ) : null}

            {toDate ? (
              <View style={[componentStyles.chip, { backgroundColor: isDark ? "#334155" : "#E8EAF6" }]}>
                <Text style={[componentStyles.chipText, { color: isDark ? "#cbd5e1" : "#333" }]}>To: {formatDateToDisplay(toDate)}</Text>
                <TouchableOpacity onPress={() => setToDate(null)}>
                  <Ionicons name="close-circle" size={14} color={isDark ? "#94a3b8" : "#666"} />
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleClear}
              style={[componentStyles.chip, { backgroundColor: isDark ? "#450a0a" : "#FFEBEE" }]}
            >
              <Text style={[componentStyles.chipText, { color: isDark ? "#fca5a5" : "#C62828" }]}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {isFetching && reportList.length === 0 ? (
          <View style={componentStyles.centerState}>
            <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
            <Text style={[componentStyles.stateText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#666") }]}>
              Loading TA Consolidate Reports...
            </Text>
          </View>
        ) : reportList.length === 0 ? (
          <View style={componentStyles.centerState}>
            <MaterialCommunityIcons name="layers-outline" size={54} color={isDark ? "#475569" : "#BDBDBD"} />
            <Text style={[componentStyles.stateTitle, { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#333") }]}>
              No Data Found
            </Text>
            <Text style={[componentStyles.stateText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#777") }]}>
              No consolidate records found matching your filters.
            </Text>
          </View>
        ) : viewMode === "card" ? (
          <FlatList
            data={reportList}
            renderItem={renderCard}
            keyExtractor={(item, idx) => `${item.requestno || item.id || "bill"}_${idx}`}
            contentContainerStyle={componentStyles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              reportList.length > 0 ? (
                <View style={componentStyles.counterBar}>
                  <Text style={[componentStyles.counterText, { color: isDark ? "#94a3b8" : "#666" }]}>
                    Showing {reportList.length} of {totalCount} records
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              isLoadingMore ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
                  <Text style={[componentStyles.loadingMoreText, { color: isDark ? "#94a3b8" : "#888" }]}>Loading more records...</Text>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[CustomColors.appThemeColor]}
              />
            }
          />
        ) : (
          renderTable()
        )}
      </View>

      {/* FILTER MODAL */}
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
              style={[
                modalStyles.modalContainer,
                {
                  backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#EEEEEE",
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
              onPress={(e) => e.stopPropagation?.()}
            >
              <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#EEE" }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="filter" size={20} color={CustomColors.appThemeColor} style={{ marginRight: 6 }} />
                  <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#333" }]}>Search & Filter</Text>
                </View>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Ionicons name="close" size={24} color={isDark ? "#f8fafc" : "#333"} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "78%" }}>
                {/* Tour No */}
                <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#555" }]}>Tour No</Text>
                <TextInput
                  style={[
                    modalStyles.inputField,
                    {
                      backgroundColor: isDark ? "#334155" : "#F5F5F7",
                      borderColor: isDark ? "#475569" : "#E0E0E0",
                      color: isDark ? "#f8fafc" : "#333",
                    },
                  ]}
                  placeholder="Enter Tour No"
                  placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                  value={tourNo}
                  onChangeText={setTourNo}
                />

                {/* CR No */}
                <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#555" }]}>CR No</Text>
                <TextInput
                  style={[
                    modalStyles.inputField,
                    {
                      backgroundColor: isDark ? "#334155" : "#F5F5F7",
                      borderColor: isDark ? "#475569" : "#E0E0E0",
                      color: isDark ? "#f8fafc" : "#333",
                    },
                  ]}
                  placeholder="Enter CR No"
                  placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                  value={crnNo}
                  onChangeText={setCrnNo}
                />

                {/* Branch Selector */}
                <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#555" }]}>Branch</Text>
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
                    {selectedBranch ? `(${selectedBranch.code}) ${selectedBranch.name}` : "Select Branch"}
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
                <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#555" }]}>Employee</Text>
                <TouchableOpacity
                  style={[
                    modalStyles.selectorBtn,
                    {
                      backgroundColor: isDark ? "#334155" : "#F5F5F7",
                      borderColor: isDark ? "#475569" : "#E0E0E0",
                    },
                  ]}
                  onPress={() => {
                    if (!selectedBranch) {
                      ToastMessage("Please select a Branch first");
                      return;
                    }
                    fetchEmployees("", selectedBranch.id);
                    setEmployeeModalVisible(true);
                  }}
                >
                  <Ionicons name="person-outline" size={18} color={isDark ? "#94a3b8" : "#666"} />
                  <Text style={[modalStyles.selectorBtnText, { color: isDark ? "#f8fafc" : "#333" }]} numberOfLines={1}>
                    {selectedEmployee ? `(${selectedEmployee.code}) ${selectedEmployee.name || selectedEmployee.full_name}` : "Select Employee"}
                  </Text>
                  {selectedEmployee ? (
                    <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                      <Ionicons name="close-circle" size={18} color={isDark ? "#94a3b8" : "#999"} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={isDark ? "#94a3b8" : "#999"} />
                  )}
                </TouchableOpacity>

                {/* AP Payment Dates */}
                <Text style={[modalStyles.filterLabel, { color: isDark ? "#cbd5e1" : "#555" }]}>AP Payment Date Range</Text>
                <View style={modalStyles.dateRangeRow}>
                  <TouchableOpacity
                    style={[
                      modalStyles.dateRangeBtn,
                      {
                        backgroundColor: isDark ? "#334155" : "#F5F5F7",
                        borderColor: isDark ? "#475569" : "#E0E0E0",
                      },
                    ]}
                    onPress={() => setActiveDatePicker("from")}
                  >
                    <Text style={[modalStyles.dateRangeBtnLabel, { color: isDark ? "#94a3b8" : "#888" }]}>From Date</Text>
                    <Text style={[modalStyles.dateRangeBtnValue, { color: isDark ? "#f8fafc" : "#333" }]}>
                      {fromDate ? formatDateToDisplay(fromDate) : "Select"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      modalStyles.dateRangeBtn,
                      {
                        backgroundColor: isDark ? "#334155" : "#F5F5F7",
                        borderColor: isDark ? "#475569" : "#E0E0E0",
                      },
                    ]}
                    onPress={() => setActiveDatePicker("to")}
                  >
                    <Text style={[modalStyles.dateRangeBtnLabel, { color: isDark ? "#94a3b8" : "#888" }]}>To Date</Text>
                    <Text style={[modalStyles.dateRangeBtnValue, { color: isDark ? "#f8fafc" : "#333" }]}>
                      {toDate ? formatDateToDisplay(toDate) : "Select"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={modalStyles.footerBtns}>
                <TouchableOpacity
                  style={[
                    modalStyles.resetBtn,
                    {
                      backgroundColor: isDark ? "#334155" : "#FFFFFF",
                      borderColor: isDark ? "#475569" : "#CCC",
                    },
                  ]}
                  onPress={handleClear}
                >
                  <Text style={[modalStyles.resetBtnText, { color: isDark ? "#cbd5e1" : "#666" }]}>Reset All</Text>
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

      {/* BRANCH PICKER MODAL */}
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
            style={[
              modalStyles.pickerModalContainer,
              {
                backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
                borderColor: isDark ? "#334155" : "#EEEEEE",
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#EEE" }]}>
              <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#333" }]}>Select Branch</Text>
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
                placeholder="Search branch..."
                placeholderTextColor={isDark ? "#94a3b8" : "#999"}
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
                    style={[modalStyles.pickerItem, { borderBottomColor: isDark ? "#334155" : "#F0F0F0" }]}
                    onPress={() => {
                      setSelectedBranch(item);
                      setSelectedEmployee(null);
                      setBranchModalVisible(false);
                      fetchEmployees("", item.id);
                    }}
                  >
                    <Text style={[modalStyles.pickerItemTitle, { color: isDark ? "#f8fafc" : "#333" }]}>
                      ({item.code}) {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* EMPLOYEE PICKER MODAL */}
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
            style={[
              modalStyles.pickerModalContainer,
              {
                backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
                borderColor: isDark ? "#334155" : "#EEEEEE",
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? "#334155" : "#EEE" }]}>
              <Text style={[modalStyles.modalTitle, { color: isDark ? "#f8fafc" : "#333" }]}>Select Employee</Text>
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
                placeholder="Search employee..."
                placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                value={employeeSearch}
                onChangeText={(t) => {
                  setEmployeeSearch(t);
                  fetchEmployees(t, selectedBranch?.id);
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
                    style={[modalStyles.pickerItem, { borderBottomColor: isDark ? "#334155" : "#F0F0F0" }]}
                    onPress={() => {
                      setSelectedEmployee(item);
                      setEmployeeModalVisible(false);
                    }}
                  >
                    <Text style={[modalStyles.pickerItemTitle, { color: isDark ? "#f8fafc" : "#333" }]}>
                      ({item.code}) {item.name || item.full_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* DATE PICKER */}
      {activeDatePicker && (
        <DateTimePicker
          value={
            activeDatePicker === "from"
              ? fromDate || new Date()
              : toDate || new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
};

export default EclaimBillConsolidateScreen;

const componentStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchCard: {
    marginHorizontal: horizontalScale(12),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
    padding: moderateScale(12),
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  screenHeading: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.Bold,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 8,
    borderWidth: 1,
    height: verticalScale(40),
  },
  textInput: {
    flex: 1,
    paddingHorizontal: horizontalScale(8),
    fontSize: moderateScale(13),
    color: "#333",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(12),
    height: verticalScale(40),
    borderRadius: 8,
    gap: 4,
  },
  filterBtnText: {
    color: "#FFF",
    fontFamily: Fonts.Bold,
    fontSize: moderateScale(12),
  },
  downloadBtn: {
    width: horizontalScale(40),
    height: verticalScale(40),
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsScroll: {
    marginTop: verticalScale(8),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8EAF6",
    borderRadius: 16,
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(4),
    marginRight: horizontalScale(6),
    gap: 6,
  },
  chipText: {
    fontSize: moderateScale(11),
    color: "#333",
    fontFamily: Fonts.Medium,
  },
  listContent: {
    paddingHorizontal: horizontalScale(12),
    paddingBottom: verticalScale(20),
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: moderateScale(12),
    marginVertical: verticalScale(6),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  serialBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EDE7F6",
    alignItems: "center",
    justifyContent: "center",
  },
  serialText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
    color: "#673AB7",
  },
  tourNoText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.Bold,
  },
  crnText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.SemiBold,
    marginTop: 1,
  },
  totalAmtBadge: {
    alignItems: "flex-end",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  totalAmtLabel: {
    fontSize: moderateScale(9),
    color: "#2E7D32",
  },
  totalAmtValue: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.Bold,
    color: "#1B5E20",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(4),
  },
  infoText: {
    fontSize: moderateScale(12),
    marginLeft: horizontalScale(8),
  },
  expenseBreakdownBox: {
    marginTop: verticalScale(10),
    padding: moderateScale(10),
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  breakdownHeader: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
    color: "#555",
    marginBottom: verticalScale(6),
  },
  breakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  breakdownItem: {
    width: "25%",
    alignItems: "center",
  },
  bdLabel: {
    fontSize: moderateScale(9),
    color: "#777",
  },
  bdValue: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.SemiBold,
    color: "#333",
    marginTop: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  counterBar: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(4),
    marginBottom: verticalScale(4),
  },
  counterText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.Medium,
    color: "#666",
  },
  loadingMoreText: {
    marginTop: verticalScale(6),
    fontSize: moderateScale(12),
    fontFamily: Fonts.Medium,
    color: "#888",
  },
  stateTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.Bold,
    marginTop: verticalScale(10),
  },
  stateText: {
    fontSize: moderateScale(12),
    textAlign: "center",
    marginTop: verticalScale(4),
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    borderTopWidth: 1,
  },
  totalCountText: {
    fontSize: moderateScale(12),
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  pageNumberBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumberText: {
    color: "#FFF",
    fontFamily: Fonts.Bold,
    fontSize: moderateScale(12),
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: verticalScale(8),
    paddingHorizontal: horizontalScale(6),
  },
  tableHeaderRow: {
    paddingVertical: verticalScale(10),
  },
  tableHeaderCell: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
    color: "#FFF",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: moderateScale(11),
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 4,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: moderateScale(16),
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: moderateScale(16),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    marginBottom: verticalScale(10),
  },
  modalTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.Bold,
    color: "#333",
  },
  filterLabel: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.SemiBold,
    color: "#555",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(4),
  },
  inputField: {
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: horizontalScale(10),
    height: verticalScale(40),
    fontSize: moderateScale(13),
    color: "#333",
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: horizontalScale(10),
    height: verticalScale(40),
  },
  selectorBtnText: {
    flex: 1,
    marginLeft: horizontalScale(8),
    fontSize: moderateScale(13),
    color: "#333",
  },
  dateRangeRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateRangeBtn: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: moderateScale(8),
  },
  dateRangeBtnLabel: {
    fontSize: moderateScale(10),
    color: "#888",
  },
  dateRangeBtnValue: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.SemiBold,
    color: "#333",
    marginTop: 2,
  },
  footerBtns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(16),
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
    fontSize: moderateScale(13),
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
  pickerModalContainer: {
    width: "90%",
    maxHeight: "75%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: moderateScale(16),
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: horizontalScale(8),
    height: verticalScale(40),
    marginBottom: verticalScale(10),
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: moderateScale(13),
    color: "#333",
  },
  pickerItem: {
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pickerItemTitle: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.Medium,
    color: "#333",
  },
});
