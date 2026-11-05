// src/screens/taScreens/AssignApproverScreen.jsx

import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
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
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  useLazyGetAssignApproverSummaryQuery,
  useAssignApproverMutation,
  useLazyBranchListQuery,
  useLazyEmployeeListQuery,
} from "../../redux/rtk_query/apiSlice";

import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { CustomColors, getCustomColors } from "../../styles/CustomColors";
import { Environment } from "../../environment/Environment";

import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";
import { Fonts } from "../../styles/Fonts";

const getInitials = (name) => {
  if (!name) return "AA";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return String(name).slice(0, 2).toUpperCase();
};

const AssignApproverScreen = ({ navigation }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const colors = getCustomColors(isDark) || CustomColors;
  const themeColor = colors.appThemeColor || "#4f806d";

  const styles = useMemo(
    () => createStyles(isDark, themeColor, colors),
    [isDark, themeColor, colors]
  );

  const authToken = useSelector(
    (state) =>
      state.auth?.user?.token ||
      state.auth?.token ||
      state.login?.token ||
      ""
  );

  // RTK Query Hooks
  const [triggerGetSummary, { isFetching: isQueryFetching }] =
    useLazyGetAssignApproverSummaryQuery();
  const [assignApproverMutation, { isLoading: isSubmitting }] =
    useAssignApproverMutation();
  const [triggerBranchList] = useLazyBranchListQuery();
  const [triggerEmployeeList] = useLazyEmployeeListQuery();

  // Summary State
  const [records, setRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
    branch: null,
    employee: null,
  });

  // Filter Popup Modal State
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterBranch, setFilterBranch] = useState(null);
  const [filterEmployee, setFilterEmployee] = useState(null);

  // Add / Edit Modal State
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState("create"); // "create" | "edit"
  const [formBranch, setFormBranch] = useState(null);
  const [formEmployee, setFormEmployee] = useState(null);
  const [tourApprove, setTourApprove] = useState(false);
  const [advanceApprove, setAdvanceApprove] = useState(false);
  const [expenseApprove, setExpenseApprove] = useState(false);

  // Searchable Picker Sub-modal State
  const [pickerConfig, setPickerConfig] = useState({
    visible: false,
    title: "",
    type: "", // "branch_filter" | "employee_filter" | "branch_form" | "employee_form"
    searchQuery: "",
    data: [],
    loading: false,
  });

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const fetchSummary = useCallback(
    async (pageToFetch = 1, isRefresh = false) => {
      if (pageToFetch === 1 && !isRefresh) {
        setIsLoadingInitial(true);
      }

      try {
        const branchId = appliedFilters.branch?.id || "";
        const employeeId = appliedFilters.employee?.id || "";

        const res = await triggerGetSummary({
          page: pageToFetch,
          branch_id: branchId,
          employee_id: employeeId,
        }).unwrap();

        const incomingData = Array.isArray(res?.data) ? res.data : [];
        const pagination = res?.pagination || {};

        if (pageToFetch === 1) {
          setRecords(incomingData);
        } else {
          setRecords((prev) => [...prev, ...incomingData]);
        }

        setCurrentPage(pageToFetch);
        setHasNextPage(Boolean(pagination.has_next));
        setTotalCount(pagination.count || incomingData.length);
      } catch (err) {
        console.error("fetchSummary error:", err);
        ToastMessage("Failed to load approver list");
        if (pageToFetch === 1) {
          setRecords([]);
        }
      } finally {
        setIsLoadingInitial(false);
        setIsRefreshing(false);
        setIsFetchingMore(false);
      }
    },
    [appliedFilters, triggerGetSummary]
  );

  useEffect(() => {
    fetchSummary(1);
  }, [fetchSummary]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSummary(1, true);
  };

  const handleLoadMore = () => {
    if (!isFetchingMore && !isLoadingInitial && hasNextPage) {
      setIsFetchingMore(true);
      fetchSummary(currentPage + 1);
    }
  };

  // -------------------------------------------------------------
  // Report Download
  // -------------------------------------------------------------
  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      const branchId = appliedFilters.branch?.id || "";
      const employeeId = appliedFilters.employee?.id || "";
      const downloadUrl = `${Environment.taServiceUrl}/taserv/approverlist_download_excel?branch_id=${branchId}&employee_id=${employeeId}`;
      const fileName = `Assign_Approver_Report_${Date.now()}.xlsx`;
      const localFileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(
        downloadUrl,
        localFileUri,
        {
          headers: {
            Authorization: `Token ${authToken}`,
          },
        }
      );

      if (downloadResult?.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Download / Share Approver Report",
            UTI: "com.microsoft.excel.xlsx",
          });
        } else {
          ToastMessage("Report downloaded successfully");
        }
      } else {
        ToastMessage("Failed to download report");
      }
    } catch (error) {
      console.error("Download report error:", error);
      ToastMessage("Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  // -------------------------------------------------------------
  // Header Configuration with AppThemeColor
  // -------------------------------------------------------------
  const activeFilterCount =
    (appliedFilters.branch ? 1 : 0) + (appliedFilters.employee ? 1 : 0);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Assign Approver",
      headerStyle: {
        backgroundColor: themeColor,
      },
      headerTintColor: "#ffffff",
      headerTitleStyle: {
        fontSize: moderateScale(18),
        fontFamily: Fonts.bold,
        color: "#ffffff",
        letterSpacing: 0.3,
      },
      headerShadowVisible: false,
      headerBackTitleVisible: false,
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          {/* Download Excel Report */}
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleDownloadReport}
            disabled={isDownloading}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialCommunityIcons
                name="file-excel-outline"
                size={moderateScale(19)}
                color="#ffffff"
              />
            )}
          </TouchableOpacity>

          {/* Filter Popup Button */}
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => {
              setFilterBranch(appliedFilters.branch);
              setFilterEmployee(appliedFilters.employee);
              setIsFilterModalVisible(true);
            }}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="filter-outline"
              size={moderateScale(18)}
              color="#ffffff"
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* + Add Approver Header Button */}
          <TouchableOpacity
            style={[styles.headerIconButton, styles.headerAddButton]}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="add"
              size={moderateScale(22)}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, activeFilterCount, isDownloading, appliedFilters, themeColor, styles]);

  // -------------------------------------------------------------
  // Searchable Picker Helper
  // -------------------------------------------------------------
  const openSearchPicker = async (type, title) => {
    setPickerConfig({
      visible: true,
      title,
      type,
      searchQuery: "",
      data: [],
      loading: true,
    });

    try {
      if (type === "branch_filter" || type === "branch_form") {
        const res = await triggerBranchList({ name: "", page: 1 }).unwrap();
        setPickerConfig((prev) => ({
          ...prev,
          data: Array.isArray(res?.data) ? res.data : [],
          loading: false,
        }));
      } else if (type === "employee_filter") {
        const branchId = filterBranch?.id || 0;
        const res = await triggerEmployeeList({
          branch: branchId,
          name: "",
          page: 1,
        }).unwrap();
        setPickerConfig((prev) => ({
          ...prev,
          data: Array.isArray(res?.data) ? res.data : [],
          loading: false,
        }));
      } else if (type === "employee_form") {
        if (!formBranch?.id) {
          ToastMessage("Please Select Branch first");
          setPickerConfig((prev) => ({ ...prev, visible: false, loading: false }));
          return;
        }
        const res = await triggerEmployeeList({
          branch: formBranch.id,
          name: "",
          page: 1,
        }).unwrap();
        setPickerConfig((prev) => ({
          ...prev,
          data: Array.isArray(res?.data) ? res.data : [],
          loading: false,
        }));
      }
    } catch (err) {
      console.error("openSearchPicker error:", err);
      setPickerConfig((prev) => ({ ...prev, data: [], loading: false }));
    }
  };

  const handlePickerSearch = async (text) => {
    setPickerConfig((prev) => ({
      ...prev,
      searchQuery: text,
      loading: true,
    }));

    try {
      if (
        pickerConfig.type === "branch_filter" ||
        pickerConfig.type === "branch_form"
      ) {
        const res = await triggerBranchList({ name: text, page: 1 }).unwrap();
        setPickerConfig((prev) => ({
          ...prev,
          data: Array.isArray(res?.data) ? res.data : [],
          loading: false,
        }));
      } else if (pickerConfig.type === "employee_filter") {
        const branchId = filterBranch?.id || 0;
        const res = await triggerEmployeeList({
          branch: branchId,
          name: text,
          page: 1,
        }).unwrap();
        setPickerConfig((prev) => ({
          ...prev,
          data: Array.isArray(res?.data) ? res.data : [],
          loading: false,
        }));
      } else if (pickerConfig.type === "employee_form") {
        const res = await triggerEmployeeList({
          branch: formBranch?.id || 0,
          name: text,
          page: 1,
        }).unwrap();
        setPickerConfig((prev) => ({
          ...prev,
          data: Array.isArray(res?.data) ? res.data : [],
          loading: false,
        }));
      }
    } catch (err) {
      console.error("handlePickerSearch error:", err);
      setPickerConfig((prev) => ({ ...prev, data: [], loading: false }));
    }
  };

  const handleSelectItem = (item) => {
    const { type } = pickerConfig;
    if (type === "branch_filter") {
      setFilterBranch(item);
      setFilterEmployee(null); // Reset employee when branch changes
    } else if (type === "employee_filter") {
      setFilterEmployee(item);
    } else if (type === "branch_form") {
      setFormBranch(item);
      setFormEmployee(null); // Reset employee when branch changes
    } else if (type === "employee_form") {
      setFormEmployee(item);
    }
    setPickerConfig((prev) => ({ ...prev, visible: false }));
  };

  // -------------------------------------------------------------
  // Filter Actions
  // -------------------------------------------------------------
  const handleApplyFilter = () => {
    setAppliedFilters({
      branch: filterBranch,
      employee: filterEmployee,
    });
    setIsFilterModalVisible(false);
  };

  const handleClearFilter = () => {
    setFilterBranch(null);
    setFilterEmployee(null);
    setAppliedFilters({
      branch: null,
      employee: null,
    });
    setIsFilterModalVisible(false);
  };

  const handleRemoveFilterChip = (key) => {
    setAppliedFilters((prev) => ({
      ...prev,
      [key]: null,
    }));
  };

  // -------------------------------------------------------------
  // Add / Edit Modal Actions
  // -------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setFormMode("create");
    setFormBranch(null);
    setFormEmployee(null);
    setTourApprove(false);
    setAdvanceApprove(false);
    setExpenseApprove(false);
    setIsFormModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    setFormMode("edit");
    setFormBranch({
      id: item.branchid,
      code: item.branch_code,
      name: item.branch_name,
    });
    setFormEmployee({
      id: item.employeeid,
      code: item.employee_code,
      full_name: item.employee_name || item.employee_name_code,
      name: item.employee_name,
    });
    setTourApprove(Boolean(item.tourapprove));
    setAdvanceApprove(Boolean(item.advanceapprove));
    setExpenseApprove(Boolean(item.expenseapprove));
    setIsFormModalVisible(true);
  };

  const handleSubmitForm = async () => {
    if (!formBranch?.id) {
      ToastMessage("Please Select Branch");
      return;
    }
    if (!formEmployee?.id) {
      ToastMessage("Please Select Employee");
      return;
    }
    if (!tourApprove && !advanceApprove && !expenseApprove) {
      ToastMessage("Please select any of the Approver Permission");
      return;
    }

    const payload = [
      {
        branchid: formBranch.id,
        employeeid: formEmployee.id,
        tourapprove: tourApprove ? 1 : 0,
        advanceapprove: advanceApprove ? 1 : 0,
        expenseapprove: expenseApprove ? 1 : 0,
      },
    ];

    try {
      const res = await assignApproverMutation(payload).unwrap();
      if (res?.status === "success" || !res?.error) {
        ToastMessage(
          formMode === "edit"
            ? "Permission Updated Successfully"
            : "Permission Added Successfully"
        );
        setIsFormModalVisible(false);
        fetchSummary(1);
      } else {
        ToastMessage(res?.description || "Failed to update permission");
      }
    } catch (err) {
      console.error("submit form error:", err);
      const errorMsg =
        err?.data?.description ||
        err?.data?.message ||
        "Failed to update permission";
      ToastMessage(errorMsg);
    }
  };

  // -------------------------------------------------------------
  // Render Item: Approver Card
  // -------------------------------------------------------------
  const renderItem = ({ item, index }) => {
    const isTourActive = Boolean(item.tourapprove);
    const isAdvActive = Boolean(item.advanceapprove);
    const isExpActive = Boolean(item.expenseapprove);
    const initials = getInitials(item.employee_name);

    return (
      <View style={styles.card}>
        {/* Card Header: Avatar + Employee Name/Code + Edit Action */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.employeeInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.employeeName} numberOfLines={1}>
                  {item.employee_name || "-"}
                </Text>
                <View style={styles.snoBadge}>
                  <Text style={styles.snoText}>#{index + 1}</Text>
                </View>
              </View>
              {item.employee_code ? (
                <View style={styles.codeBadge}>
                  <Ionicons
                    name="card-outline"
                    size={moderateScale(12)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                  />
                  <Text style={styles.employeeCode}>{item.employee_code}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Edit Action Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleOpenEditModal(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={moderateScale(15)}
              color={themeColor}
            />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Branch Info Row */}
        <View style={styles.branchContainer}>
          <View style={styles.branchIconBox}>
            <MaterialCommunityIcons
              name="bank-outline"
              size={moderateScale(15)}
              color={themeColor}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.branchLabel}>Assigned Branch</Text>
            <Text style={styles.branchText} numberOfLines={2}>
              {item.branch_code ? `[${item.branch_code}] ` : ""}
              {item.branch_name || "-"}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Approver Permissions */}
        <View style={styles.permissionsContainer}>
          <Text style={styles.permissionsLabel}>Permissions</Text>
          <View style={styles.permissionChipsRow}>
            {/* Tour Approver */}
            <View
              style={[
                styles.permissionChip,
                isTourActive ? styles.chipActiveTour : styles.chipInactive,
              ]}
            >
              <Ionicons
                name={isTourActive ? "checkmark-circle" : "close-circle"}
                size={moderateScale(13)}
                color={isTourActive ? "#059669" : (isDark ? "#64748b" : "#94a3b8")}
                style={{ marginRight: horizontalScale(4) }}
              />
              <Text
                style={[
                  styles.permissionChipText,
                  isTourActive ? styles.textActiveTour : styles.textInactive,
                ]}
              >
                Tour
              </Text>
            </View>

            {/* Advance Approver */}
            <View
              style={[
                styles.permissionChip,
                isAdvActive ? styles.chipActiveAdv : styles.chipInactive,
              ]}
            >
              <Ionicons
                name={isAdvActive ? "checkmark-circle" : "close-circle"}
                size={moderateScale(13)}
                color={isAdvActive ? "#2563eb" : (isDark ? "#64748b" : "#94a3b8")}
                style={{ marginRight: horizontalScale(4) }}
              />
              <Text
                style={[
                  styles.permissionChipText,
                  isAdvActive ? styles.textActiveAdv : styles.textInactive,
                ]}
              >
                Advance
              </Text>
            </View>

            {/* Expense Approver */}
            <View
              style={[
                styles.permissionChip,
                isExpActive ? styles.chipActiveExp : styles.chipInactive,
              ]}
            >
              <Ionicons
                name={isExpActive ? "checkmark-circle" : "close-circle"}
                size={moderateScale(13)}
                color={isExpActive ? "#9333ea" : (isDark ? "#64748b" : "#94a3b8")}
                style={{ marginRight: horizontalScale(4) }}
              />
              <Text
                style={[
                  styles.permissionChipText,
                  isExpActive ? styles.textActiveExp : styles.textInactive,
                ]}
              >
                Expense
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------
  // Render Main Component
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <View style={styles.filterChipContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipScrollContent}
          >
            {appliedFilters.branch && (
              <View style={styles.filterChip}>
                <Ionicons
                  name="business"
                  size={moderateScale(13)}
                  color="#0284c7"
                  style={{ marginRight: horizontalScale(4) }}
                />
                <Text style={styles.filterChipText} numberOfLines={1}>
                  Branch: {appliedFilters.branch.code || ""}{" "}
                  {appliedFilters.branch.name || ""}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveFilterChip("branch")}
                  style={styles.filterChipClose}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={moderateScale(15)}
                    color="#0284c7"
                  />
                </TouchableOpacity>
              </View>
            )}

            {appliedFilters.employee && (
              <View style={styles.filterChip}>
                <Ionicons
                  name="person"
                  size={moderateScale(13)}
                  color="#0284c7"
                  style={{ marginRight: horizontalScale(4) }}
                />
                <Text style={styles.filterChipText} numberOfLines={1}>
                  Employee:{" "}
                  {appliedFilters.employee.full_name ||
                    appliedFilters.employee.name ||
                    ""}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveFilterChip("employee")}
                  style={styles.filterChipClose}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={moderateScale(15)}
                    color="#0284c7"
                  />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.clearAllBtn}
              onPress={handleClearFilter}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trash-outline"
                size={moderateScale(13)}
                color="#ef4444"
                style={{ marginRight: 2 }}
              />
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Record Count Header Bar */}
      <View style={styles.countBar}>
        <View style={styles.countLeft}>
          <MaterialCommunityIcons
            name="shield-account-outline"
            size={moderateScale(16)}
            color={themeColor}
          />
          <Text style={styles.countText}>
            {totalCount > 0
              ? `Showing ${records.length} of ${totalCount} Approvers`
              : "No approvers assigned"}
          </Text>
        </View>
        {isQueryFetching && !isLoadingInitial && (
          <ActivityIndicator size="small" color={themeColor} />
        )}
      </View>

      {/* Main List */}
      {isLoadingInitial ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loaderText}>Loading approvers...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item?.employeeid
              ? `${item.employeeid}-${item.branchid || 0}-${index}`
              : String(index)
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[themeColor]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={themeColor} />
                <Text style={styles.footerText}>
                  Loading more records...
                </Text>
              </View>
            ) : (
              <View style={{ height: verticalScale(20) }} />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons
                  name="shield-account-outline"
                  size={moderateScale(40)}
                  color={isDark ? "#64748b" : "#94a3b8"}
                />
              </View>
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilterCount > 0
                  ? "Try adjusting your filters to see more results"
                  : "Tap '+' in the header above to assign a new approver"}
              </Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={[styles.emptyResetBtn, { backgroundColor: themeColor }]}
                  onPress={handleClearFilter}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyResetText}>
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ============================================================ */}
      {/* 1. FILTER POPUP MODAL (Centered Dialog) */}
      {/* ============================================================ */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalDialog}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { backgroundColor: themeColor }]}>
                <View style={styles.modalHeaderTitleRow}>
                  <View style={styles.modalHeaderIconBadge}>
                    <Ionicons
                      name="filter"
                      size={moderateScale(16)}
                      color="#ffffff"
                    />
                  </View>
                  <Text style={styles.modalTitleText}>Filter Approvers</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsFilterModalVisible(false)}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={moderateScale(20)} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Branch Selector */}
                <Text style={styles.inputLabel}>Select Branch</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() =>
                    openSearchPicker("branch_filter", "Select Branch")
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="business-outline"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                    style={{ marginRight: horizontalScale(8) }}
                  />
                  <Text
                    style={
                      filterBranch
                        ? styles.selectorTextSelected
                        : styles.selectorTextPlaceholder
                    }
                    numberOfLines={1}
                  >
                    {filterBranch
                      ? `(${filterBranch.code}) ${filterBranch.name}`
                      : "Choose branch..."}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                  />
                </TouchableOpacity>

                {/* Employee Selector */}
                <Text style={styles.inputLabel}>Select Employee</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() =>
                    openSearchPicker("employee_filter", "Select Employee")
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="person-outline"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                    style={{ marginRight: horizontalScale(8) }}
                  />
                  <Text
                    style={
                      filterEmployee
                        ? styles.selectorTextSelected
                        : styles.selectorTextPlaceholder
                    }
                    numberOfLines={1}
                  >
                    {filterEmployee
                      ? filterEmployee.full_name ||
                      `(${filterEmployee.code}) ${filterEmployee.name}`
                      : "Choose employee..."}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                  />
                </TouchableOpacity>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalFooterButton, styles.btnSecondary]}
                  onPress={handleClearFilter}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnSecondaryText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalFooterButton,
                    styles.btnPrimary,
                    { backgroundColor: themeColor },
                  ]}
                  onPress={handleApplyFilter}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnPrimaryText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 2. ADD / EDIT APPROVER POPUP MODAL (Centered Dialog) */}
      {/* ============================================================ */}
      <Modal
        visible={isFormModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFormModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalDialog}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { backgroundColor: themeColor }]}>
                <View style={styles.modalHeaderTitleRow}>
                  <View style={styles.modalHeaderIconBadge}>
                    <MaterialCommunityIcons
                      name={
                        formMode === "edit"
                          ? "account-edit-outline"
                          : "account-plus-outline"
                      }
                      size={moderateScale(18)}
                      color="#ffffff"
                    />
                  </View>
                  <Text style={styles.modalTitleText}>
                    {formMode === "edit" ? "Edit Approver" : "Assign Approver"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsFormModalVisible(false)}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={moderateScale(20)} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Branch Field */}
                <Text style={styles.inputLabel}>
                  Branch <Text style={{ color: "#ef4444" }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => openSearchPicker("branch_form", "Select Branch")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="business-outline"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                    style={{ marginRight: horizontalScale(8) }}
                  />
                  <Text
                    style={
                      formBranch
                        ? styles.selectorTextSelected
                        : styles.selectorTextPlaceholder
                    }
                    numberOfLines={1}
                  >
                    {formBranch
                      ? `(${formBranch.code}) ${formBranch.name}`
                      : "Choose branch"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                  />
                </TouchableOpacity>

                {/* Employee Field */}
                <Text style={styles.inputLabel}>
                  Employee <Text style={{ color: "#ef4444" }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => {
                    if (!formBranch?.id) {
                      ToastMessage("Please Select Branch first");
                      return;
                    }
                    openSearchPicker("employee_form", "Select Employee");
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="person-outline"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                    style={{ marginRight: horizontalScale(8) }}
                  />
                  <Text
                    style={
                      formEmployee
                        ? styles.selectorTextSelected
                        : styles.selectorTextPlaceholder
                    }
                    numberOfLines={1}
                  >
                    {formEmployee
                      ? formEmployee.full_name ||
                      `(${formEmployee.code}) ${formEmployee.name}`
                      : "Choose employee"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#64748b"}
                  />
                </TouchableOpacity>

                {/* Approver Permission Checkboxes Section */}
                <View style={styles.permissionsSection}>
                  <Text style={styles.sectionTitle}>
                    Approver Permissions{" "}
                    <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>

                  {/* Tour Approver Checkbox Tile */}
                  <TouchableOpacity
                    style={[
                      styles.permissionCardTile,
                      tourApprove && styles.permissionCardTileActiveTour,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setTourApprove((prev) => !prev)}
                  >
                    <MaterialCommunityIcons
                      name={
                        tourApprove
                          ? "checkbox-marked"
                          : "checkbox-blank-outline"
                      }
                      size={moderateScale(22)}
                      color={tourApprove ? "#059669" : (isDark ? "#64748b" : "#94a3b8")}
                    />
                    <View style={styles.checkboxTextContainer}>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          tourApprove && { color: isDark ? "#6ee7b7" : "#047857" },
                        ]}
                      >
                        Tour Approver
                      </Text>
                      <Text style={styles.checkboxSubLabel}>
                        Authorizes review & approval of tour requests
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Advance Approver Checkbox Tile */}
                  <TouchableOpacity
                    style={[
                      styles.permissionCardTile,
                      advanceApprove && styles.permissionCardTileActiveAdv,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setAdvanceApprove((prev) => !prev)}
                  >
                    <MaterialCommunityIcons
                      name={
                        advanceApprove
                          ? "checkbox-marked"
                          : "checkbox-blank-outline"
                      }
                      size={moderateScale(22)}
                      color={advanceApprove ? "#2563eb" : (isDark ? "#64748b" : "#94a3b8")}
                    />
                    <View style={styles.checkboxTextContainer}>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          advanceApprove && { color: isDark ? "#93c5fd" : "#1d4ed8" },
                        ]}
                      >
                        Advance Approver
                      </Text>
                      <Text style={styles.checkboxSubLabel}>
                        Authorizes approval of tour travel advance funds
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expense Approver Checkbox Tile */}
                  <TouchableOpacity
                    style={[
                      styles.permissionCardTile,
                      expenseApprove && styles.permissionCardTileActiveExp,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setExpenseApprove((prev) => !prev)}
                  >
                    <MaterialCommunityIcons
                      name={
                        expenseApprove
                          ? "checkbox-marked"
                          : "checkbox-blank-outline"
                      }
                      size={moderateScale(22)}
                      color={expenseApprove ? "#9333ea" : (isDark ? "#64748b" : "#94a3b8")}
                    />
                    <View style={styles.checkboxTextContainer}>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          expenseApprove && { color: isDark ? "#d8b4fe" : "#7e22ce" },
                        ]}
                      >
                        Expense Approver
                      </Text>
                      <Text style={styles.checkboxSubLabel}>
                        Authorizes approval of travel expense claims
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalFooterButton, styles.btnSecondary]}
                  onPress={() => setIsFormModalVisible(false)}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalFooterButton,
                    styles.btnPrimary,
                    { backgroundColor: themeColor },
                    isSubmitting && { opacity: 0.7 },
                  ]}
                  onPress={handleSubmitForm}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>
                      {formMode === "edit" ? "Update Approver" : "Assign Approver"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 3. SEARCHABLE PICKER POPUP MODAL (Centered Dialog) */}
      {/* ============================================================ */}
      <Modal
        visible={pickerConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPickerConfig((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            {/* Header */}
            <View style={[styles.pickerHeader, { backgroundColor: themeColor }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="search"
                  size={moderateScale(18)}
                  color="#ffffff"
                  style={{ marginRight: horizontalScale(6) }}
                />
                <Text style={styles.pickerTitle}>{pickerConfig.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setPickerConfig((prev) => ({ ...prev, visible: false }))
                }
                style={styles.modalCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={moderateScale(20)} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.pickerSearchBox}>
              <Ionicons
                name="search-outline"
                size={moderateScale(18)}
                color={isDark ? "#94a3b8" : "#64748b"}
                style={{ marginRight: horizontalScale(8) }}
              />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Type to search..."
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                value={pickerConfig.searchQuery}
                onChangeText={handlePickerSearch}
                autoCorrect={false}
              />
              {pickerConfig.searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => handlePickerSearch("")}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={moderateScale(18)}
                    color={isDark ? "#94a3b8" : "#94a3b8"}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            {pickerConfig.loading ? (
              <View style={styles.pickerLoaderBox}>
                <ActivityIndicator size="small" color={themeColor} />
              </View>
            ) : (
              <FlatList
                data={pickerConfig.data}
                keyExtractor={(item, idx) =>
                  item?.id ? String(item.id) : String(idx)
                }
                renderItem={({ item }) => {
                  const displayText = item.code
                    ? `(${item.code}) ${item.name || item.full_name}`
                    : item.full_name || item.name || "-";
                  return (
                    <TouchableOpacity
                      style={styles.pickerItemRow}
                      onPress={() => handleSelectItem(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pickerItemIcon}>
                        <Ionicons
                          name={
                            pickerConfig.type?.includes("branch")
                              ? "business"
                              : "person"
                          }
                          size={moderateScale(16)}
                          color={themeColor}
                        />
                      </View>
                      <Text style={styles.pickerItemText} numberOfLines={2}>
                        {displayText}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={moderateScale(16)}
                        color={isDark ? "#64748b" : "#cbd5e1"}
                      />
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => (
                  <View style={styles.pickerSeparator} />
                )}
                ListEmptyComponent={
                  <View style={styles.pickerEmptyBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={moderateScale(32)}
                      color={isDark ? "#64748b" : "#94a3b8"}
                    />
                    <Text style={styles.pickerEmptyText}>
                      No matches found
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AssignApproverScreen;

// -------------------------------------------------------------
// Upgraded Professional Styles
// -------------------------------------------------------------
const createStyles = (isDark, themeColor, colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
    },

    // Header Controls
    headerRightContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: horizontalScale(8),
      marginRight: horizontalScale(4),
    },
    headerIconButton: {
      width: moderateScale(36),
      height: moderateScale(36),
      borderRadius: moderateScale(18),
      backgroundColor: "rgba(255, 255, 255, 0.16)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.28)",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    headerAddButton: {
      backgroundColor: "rgba(255, 255, 255, 0.24)",
    },
    filterBadge: {
      position: "absolute",
      top: -verticalScale(4),
      right: -horizontalScale(4),
      backgroundColor: "#ef4444",
      borderRadius: moderateScale(9),
      minWidth: moderateScale(18),
      height: moderateScale(18),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: themeColor,
    },
    filterBadgeText: {
      color: "#ffffff",
      fontSize: moderateScale(10),
      fontWeight: "800",
    },

    // Filter Chips Bar
    filterChipContainer: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#334155" : "#e2e8f0",
      paddingVertical: verticalScale(8),
    },
    filterChipScrollContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: horizontalScale(14),
      gap: horizontalScale(8),
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#0c4a6e" : "#f0f9ff",
      borderRadius: moderateScale(20),
      paddingVertical: verticalScale(5),
      paddingHorizontal: horizontalScale(10),
      borderWidth: 1,
      borderColor: isDark ? "#0284c7" : "#bae6fd",
      maxWidth: horizontalScale(220),
    },
    filterChipText: {
      fontSize: moderateScale(11.5),
      color: isDark ? "#e0f2fe" : "#0369a1",
      fontFamily: Fonts.medium || "System",
      marginRight: horizontalScale(4),
    },
    filterChipClose: {
      marginLeft: horizontalScale(2),
    },
    clearAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: verticalScale(5),
      paddingHorizontal: horizontalScale(10),
      backgroundColor: isDark ? "#450a0a" : "#fef2f2",
      borderRadius: moderateScale(20),
      borderWidth: 1,
      borderColor: isDark ? "#991b1b" : "#fecaca",
    },
    clearAllText: {
      fontSize: moderateScale(11.5),
      color: "#ef4444",
      fontWeight: "700",
    },

    // Record Count Header Bar
    countBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(10),
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#334155" : "#e2e8f0",
    },
    countLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: horizontalScale(6),
    },
    countText: {
      fontSize: moderateScale(12.5),
      color: isDark ? "#94a3b8" : "#64748b",
      fontFamily: Fonts.medium || "System",
    },

    // List & Loading
    listContent: {
      padding: moderateScale(14),
      paddingBottom: verticalScale(30),
    },
    loaderCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: moderateScale(20),
    },
    loaderText: {
      marginTop: verticalScale(12),
      fontSize: moderateScale(13.5),
      color: isDark ? "#94a3b8" : "#64748b",
      fontWeight: "500",
    },
    footerLoader: {
      paddingVertical: verticalScale(16),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: horizontalScale(8),
    },
    footerText: {
      fontSize: moderateScale(12),
      color: isDark ? "#94a3b8" : "#64748b",
    },

    // Empty State
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: verticalScale(60),
      paddingHorizontal: horizontalScale(24),
    },
    emptyIconCircle: {
      width: moderateScale(76),
      height: moderateScale(76),
      borderRadius: moderateScale(38),
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: verticalScale(14),
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    emptyTitle: {
      fontSize: moderateScale(17),
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#1e293b",
      fontFamily: Fonts.bold || "System",
    },
    emptySubtitle: {
      fontSize: moderateScale(13),
      color: isDark ? "#94a3b8" : "#64748b",
      textAlign: "center",
      marginTop: verticalScale(6),
      lineHeight: moderateScale(18),
      maxWidth: 280,
    },
    emptyResetBtn: {
      marginTop: verticalScale(18),
      paddingVertical: verticalScale(9),
      paddingHorizontal: horizontalScale(18),
      borderRadius: moderateScale(8),
    },
    emptyResetText: {
      color: "#ffffff",
      fontSize: moderateScale(12.5),
      fontWeight: "700",
    },

    // Approver Card
    card: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: moderateScale(14),
      padding: moderateScale(14),
      marginBottom: verticalScale(12),
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: horizontalScale(8),
    },
    avatarContainer: {
      width: moderateScale(40),
      height: moderateScale(40),
      borderRadius: moderateScale(20),
      backgroundColor: isDark ? "#334155" : "#f1f5f9",
      borderWidth: 1.5,
      borderColor: themeColor,
      justifyContent: "center",
      alignItems: "center",
      marginRight: horizontalScale(10),
    },
    avatarText: {
      fontSize: moderateScale(13),
      fontWeight: "800",
      color: themeColor,
    },
    employeeInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: horizontalScale(6),
    },
    employeeName: {
      fontSize: moderateScale(14.5),
      fontFamily: Fonts.bold || "System",
      color: isDark ? "#f8fafc" : "#0f172a",
      fontWeight: "700",
    },
    snoBadge: {
      backgroundColor: isDark ? "#334155" : "#f1f5f9",
      paddingHorizontal: horizontalScale(6),
      paddingVertical: verticalScale(2),
      borderRadius: moderateScale(6),
    },
    snoText: {
      fontSize: moderateScale(10.5),
      fontWeight: "700",
      color: isDark ? "#94a3b8" : "#64748b",
    },
    codeBadge: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: verticalScale(2),
      gap: horizontalScale(4),
    },
    employeeCode: {
      fontSize: moderateScale(11.5),
      color: isDark ? "#94a3b8" : "#64748b",
      fontWeight: "500",
    },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(79, 128, 109, 0.15)" : "#f0fdf4",
      paddingVertical: verticalScale(5),
      paddingHorizontal: horizontalScale(10),
      borderRadius: moderateScale(8),
      borderWidth: 1,
      borderColor: isDark ? "rgba(79, 128, 109, 0.4)" : "#bbf7d0",
      gap: horizontalScale(4),
    },
    editText: {
      fontSize: moderateScale(12),
      fontWeight: "700",
      color: themeColor,
    },
    branchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      padding: moderateScale(10),
      borderRadius: moderateScale(10),
      marginTop: verticalScale(10),
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#f1f5f9",
    },
    branchIconBox: {
      width: moderateScale(30),
      height: moderateScale(30),
      borderRadius: moderateScale(8),
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      marginRight: horizontalScale(8),
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    branchLabel: {
      fontSize: moderateScale(10),
      color: isDark ? "#94a3b8" : "#64748b",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    branchText: {
      fontSize: moderateScale(12.5),
      color: isDark ? "#e2e8f0" : "#1e293b",
      fontWeight: "600",
      marginTop: 1,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? "#334155" : "#f1f5f9",
      marginVertical: verticalScale(10),
    },
    permissionsContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: verticalScale(6),
    },
    permissionsLabel: {
      fontSize: moderateScale(11.5),
      color: isDark ? "#94a3b8" : "#64748b",
      fontWeight: "600",
    },
    permissionChipsRow: {
      flexDirection: "row",
      gap: horizontalScale(6),
    },
    permissionChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: verticalScale(3.5),
      paddingHorizontal: horizontalScale(8),
      borderRadius: moderateScale(8),
      borderWidth: 1,
    },
    permissionChipText: {
      fontSize: moderateScale(11),
      fontWeight: "700",
    },
    chipActiveTour: {
      backgroundColor: isDark ? "#064e3b" : "#ecfdf5",
      borderColor: isDark ? "#059669" : "#a7f3d0",
    },
    textActiveTour: {
      color: isDark ? "#6ee7b7" : "#047857",
    },
    chipActiveAdv: {
      backgroundColor: isDark ? "#1e3a8a" : "#eff6ff",
      borderColor: isDark ? "#2563eb" : "#bfdbfe",
    },
    textActiveAdv: {
      color: isDark ? "#93c5fd" : "#1d4ed8",
    },
    chipActiveExp: {
      backgroundColor: isDark ? "#581c87" : "#faf5ff",
      borderColor: isDark ? "#9333ea" : "#e9d5ff",
    },
    textActiveExp: {
      color: isDark ? "#d8b4fe" : "#7e22ce",
    },
    chipInactive: {
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    textInactive: {
      color: isDark ? "#64748b" : "#94a3b8",
    },

    // Modal Styles
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: moderateScale(16),
    },
    modalContainer: {
      width: "100%",
      maxWidth: 440,
    },
    modalDialog: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: moderateScale(16),
      overflow: "hidden",
      maxHeight: "90%",
      elevation: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(14),
    },
    modalHeaderTitleRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    modalHeaderIconBadge: {
      width: moderateScale(30),
      height: moderateScale(30),
      borderRadius: moderateScale(15),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: horizontalScale(10),
    },
    modalTitleText: {
      fontSize: moderateScale(16),
      fontWeight: "700",
      color: "#ffffff",
      fontFamily: Fonts.bold || "System",
    },
    modalCloseButton: {
      width: moderateScale(30),
      height: moderateScale(30),
      borderRadius: moderateScale(15),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalBody: {
      paddingHorizontal: horizontalScale(18),
      paddingVertical: verticalScale(14),
    },
    inputLabel: {
      fontSize: moderateScale(12.5),
      fontWeight: "700",
      color: isDark ? "#cbd5e1" : "#334155",
      marginBottom: verticalScale(6),
      marginTop: verticalScale(10),
    },
    selectorButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#cbd5e1",
      borderRadius: moderateScale(10),
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(12),
    },
    selectorTextSelected: {
      fontSize: moderateScale(13),
      color: isDark ? "#f8fafc" : "#0f172a",
      flex: 1,
      fontWeight: "500",
    },
    selectorTextPlaceholder: {
      fontSize: moderateScale(13),
      color: isDark ? "#64748b" : "#94a3b8",
      flex: 1,
    },
    permissionsSection: {
      marginTop: verticalScale(16),
      paddingTop: verticalScale(12),
      borderTopWidth: 1,
      borderTopColor: isDark ? "#334155" : "#f1f5f9",
    },
    sectionTitle: {
      fontSize: moderateScale(13.5),
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
      marginBottom: verticalScale(10),
    },
    permissionCardTile: {
      flexDirection: "row",
      alignItems: "center",
      padding: moderateScale(12),
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      borderRadius: moderateScale(10),
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      marginBottom: verticalScale(8),
    },
    permissionCardTileActiveTour: {
      backgroundColor: isDark ? "rgba(5, 150, 105, 0.1)" : "#ecfdf5",
      borderColor: isDark ? "#059669" : "#a7f3d0",
    },
    permissionCardTileActiveAdv: {
      backgroundColor: isDark ? "rgba(37, 99, 235, 0.1)" : "#eff6ff",
      borderColor: isDark ? "#2563eb" : "#bfdbfe",
    },
    permissionCardTileActiveExp: {
      backgroundColor: isDark ? "rgba(147, 51, 234, 0.1)" : "#faf5ff",
      borderColor: isDark ? "#9333ea" : "#e9d5ff",
    },
    checkboxTextContainer: {
      marginLeft: horizontalScale(10),
      flex: 1,
    },
    checkboxLabel: {
      fontSize: moderateScale(13.5),
      fontWeight: "700",
      color: isDark ? "#f8fafc" : "#0f172a",
    },
    checkboxSubLabel: {
      fontSize: moderateScale(11),
      color: isDark ? "#94a3b8" : "#64748b",
      marginTop: verticalScale(1),
    },
    modalFooter: {
      flexDirection: "row",
      paddingHorizontal: horizontalScale(18),
      paddingVertical: verticalScale(14),
      borderTopWidth: 1,
      borderTopColor: isDark ? "#334155" : "#e2e8f0",
      gap: horizontalScale(12),
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
    },
    modalFooterButton: {
      flex: 1,
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(10),
      alignItems: "center",
      justifyContent: "center",
    },
    btnPrimary: {},
    btnPrimaryText: {
      color: "#ffffff",
      fontSize: moderateScale(14),
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    btnSecondary: {
      backgroundColor: isDark ? "#334155" : "#f1f5f9",
      borderWidth: 1,
      borderColor: isDark ? "#475569" : "#e2e8f0",
    },
    btnSecondaryText: {
      color: isDark ? "#cbd5e1" : "#475569",
      fontSize: moderateScale(14),
      fontWeight: "600",
    },

    // Searchable Picker Modal
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: moderateScale(20),
    },
    pickerContainer: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderRadius: moderateScale(16),
      maxHeight: "80%",
      width: "100%",
      maxWidth: 440,
      overflow: "hidden",
      elevation: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(14),
    },
    pickerTitle: {
      fontSize: moderateScale(15.5),
      fontWeight: "700",
      color: "#ffffff",
      fontFamily: Fonts.bold || "System",
    },
    pickerSearchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      borderRadius: moderateScale(10),
      marginHorizontal: horizontalScale(14),
      marginVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(9),
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#e2e8f0",
    },
    pickerSearchInput: {
      flex: 1,
      fontSize: moderateScale(13),
      color: isDark ? "#f8fafc" : "#0f172a",
      padding: 0,
    },
    pickerLoaderBox: {
      paddingVertical: verticalScale(30),
      alignItems: "center",
      justifyContent: "center",
    },
    pickerItemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(13),
    },
    pickerItemIcon: {
      width: moderateScale(28),
      height: moderateScale(28),
      borderRadius: moderateScale(14),
      backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      justifyContent: "center",
      alignItems: "center",
      marginRight: horizontalScale(10),
    },
    pickerItemText: {
      fontSize: moderateScale(13),
      color: isDark ? "#e2e8f0" : "#1e293b",
      flex: 1,
      marginRight: horizontalScale(8),
      fontWeight: "500",
    },
    pickerSeparator: {
      height: 1,
      backgroundColor: isDark ? "#334155" : "#f1f5f9",
    },
    pickerEmptyBox: {
      paddingVertical: verticalScale(35),
      alignItems: "center",
      justifyContent: "center",
      gap: verticalScale(8),
    },
    pickerEmptyText: {
      fontSize: moderateScale(13),
      color: isDark ? "#64748b" : "#94a3b8",
    },
  });
