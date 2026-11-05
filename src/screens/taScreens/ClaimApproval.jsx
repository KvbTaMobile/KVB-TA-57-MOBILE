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
import { useSelector } from "react-redux";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useLazyClaimApprovalSummaryQuery,
  useCommonDropDownGetQuery,
  useAgingDropdownQuery,
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

const ClaimApprovalScreen = ({ navigation }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  // Data List state
  const [claimsList, setClaimsList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick Filters
  const [tourNo, setTourNo] = useState("");
  const [requestDate, setRequestDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Status Filter: Default PENDING (id 2)
  const [selectedStatusId, setSelectedStatusId] = useState(2);
  const [selectedStatusName, setSelectedStatusName] = useState("PENDING");

  // Advanced Filters
  const [selectedAging, setSelectedAging] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Modals for Branch and Employee Picker
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);
  const [isBranchLoading, setIsBranchLoading] = useState(false);

  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

  // RTK Query Hooks
  const { data: statusDropdownData } = useCommonDropDownGetQuery("status");
  const { data: agingDropdownData } = useAgingDropdownQuery({ page: 1, data: "" });
  const [triggerClaimApprovalSummary, { isFetching }] =
    useLazyClaimApprovalSummaryQuery();
  const [triggerBranchList] = useLazyBranchListQuery();
  const [triggerEmployeeList] = useLazyEmployeeListQuery();

  const isFetchingRef = useRef(false);

  // Header options
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Claim Approval",
      headerStyle: {
        backgroundColor: CustomColors.actionBarColor,
      },
      headerTintColor: CustomColors.actionBarTextColor,
      headerTitleStyle: {
        fontFamily: Fonts.Bold,
        fontSize: moderateScale(17),
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

  // Status options
  const statusList = React.useMemo(() => {
    const raw = Array.isArray(statusDropdownData)
      ? statusDropdownData
      : statusDropdownData?.data || [];
    return raw.filter(
      (item) => item.name !== "FORWARD" && item.name !== "RETURN" && item.value !== "FORWARD" && item.value !== "RETURN"
    );
  }, [statusDropdownData]);

  // Aging options
  const agingList = React.useMemo(() => {
    return Array.isArray(agingDropdownData)
      ? agingDropdownData
      : agingDropdownData?.data || [];
  }, [agingDropdownData]);

  // Fetch Claims
  const fetchClaims = useCallback(
    async (pageNumber = 1, shouldAppend = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const response = await triggerClaimApprovalSummary({
          status: selectedStatusId,
          page: pageNumber,
          page_size: 10,
          tour_no: tourNo.trim() || undefined,
          request_date: requestDate ? formatDateToDisplay(requestDate) : undefined,
          branch_id: selectedBranch?.id || undefined,
          employee_id: selectedEmployee?.id || undefined,
          aging_id: selectedAging?.id || undefined,
        }).unwrap();

        const list = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination || {};
        const count = response?.count || list.length;

        setTotalCount(count);
        setHasNext(Boolean(pagination.has_next));
        setHasPrevious(Boolean(pagination.has_previous));
        setPage(pagination.index || pageNumber);

        if (shouldAppend) {
          setClaimsList((prev) => [...prev, ...list]);
        } else {
          setClaimsList(list);
        }
      } catch (err) {
        console.error("Error fetching Claim Approvals:", err);
        if (!shouldAppend) setClaimsList([]);
        ToastMessage(err?.data?.message || "Failed to load claim approvals. Please check connection.");
      } finally {
        isFetchingRef.current = false;
        setIsRefreshing(false);
      }
    },
    [
      selectedStatusId,
      tourNo,
      requestDate,
      selectedBranch,
      selectedEmployee,
      selectedAging,
      triggerClaimApprovalSummary,
    ]
  );

  useEffect(() => {
    setPage(1);
    fetchClaims(1, false);
  }, [selectedStatusId]);

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchClaims(1, false);
  };

  const handleSearch = () => {
    setPage(1);
    fetchClaims(1, false);
  };

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
      fetchClaims(1, false);
    }, 50);
  };

  const handleNextPage = () => {
    if (hasNext && !isFetching) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchClaims(nextPage, false);
    }
  };

  const handlePreviousPage = () => {
    if (hasPrevious && !isFetching && page > 1) {
      const prevPage = page - 1;
      setPage(prevPage);
      fetchClaims(prevPage, false);
    }
  };

  const handleStatusChange = (statusItem) => {
    let sId = statusItem?.id;
    const sName = statusItem?.name || statusItem?.value;
    if (sName === "APPROVED") sId = 3;
    else if (sName === "PENDING") sId = 2;
    else if (sName === "REJECTED") sId = 4;

    setSelectedStatusId(sId);
    setSelectedStatusName(sName);
  };

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

  const handleActionClick = (item) => {
    navigation.navigate("ExpenseApprovalView", {
      claimData: item,
      tourId: item.tourid || item.id,
    });
  };

  const getStatusBadgeStyle = (statusName) => {
    const st = (statusName || "").toUpperCase();
    if (st.includes("APPROV")) {
      return { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" };
    }
    if (st.includes("REJECT")) {
      return { bg: "#FFEBEE", text: "#C62828", border: "#FFCDD2" };
    }
    return { bg: "#FFF8E1", text: "#F57C00", border: "#FFE082" };
  };

  const renderItem = ({ item, index }) => {
    const sNo = (page - 1) * 10 + index + 1;
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

    const currentStatus = item.claim_status || item.status_name || selectedStatusName;
    const badgeStyle = getStatusBadgeStyle(currentStatus);

    return (
      <View
        style={[
          cardStyles.cardContainer,
          {
            backgroundColor: CustomColors.white,
            borderColor: CustomColors.cardBorderColor || "#E0E0E0",
          },
        ]}
      >
        <View style={cardStyles.headerRow}>
          <View style={cardStyles.badgeRow}>
            <View style={cardStyles.sNoCircle}>
              <Text style={cardStyles.sNoText}>{sNo}</Text>
            </View>
            <View style={{ marginLeft: horizontalScale(8) }}>
              <Text style={[cardStyles.tourNoText, { color: CustomColors.primaryColor }]}>
                {tourNumber}
              </Text>
              <Text style={cardStyles.dateSubText}>
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

        <View style={cardStyles.divider} />

        <View style={cardStyles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" style={{ marginTop: 2 }} />
          <View style={{ marginLeft: horizontalScale(8), flex: 1 }}>
            <Text style={cardStyles.employeeNameText}>
              {employeeCode ? `(${employeeCode}) ` : ""}
              {employeeName}
            </Text>
            {(designation || grade) && (
              <Text style={cardStyles.metaText}>
                {designation}
                {designation && grade ? " • " : ""}
                {grade ? `Grade: ${grade}` : ""}
              </Text>
            )}
          </View>
        </View>

        <View style={cardStyles.infoRow}>
          <Ionicons name="business-outline" size={16} color="#666" style={{ marginTop: 2 }} />
          <View style={{ marginLeft: horizontalScale(8), flex: 1 }}>
            <Text style={cardStyles.branchText}>
              {branchCode ? `${branchCode} - ` : ""}
              {branchName}
            </Text>
          </View>
        </View>

        {(fromPlace || toPlace) && (
          <View style={cardStyles.infoRow}>
            <Ionicons name="navigate-outline" size={16} color="#666" style={{ marginTop: 2 }} />
            <Text style={[cardStyles.metaText, { marginLeft: horizontalScale(8), flex: 1 }]}>
              {fromPlace || "-"} <Ionicons name="arrow-forward" size={12} color="#888" /> {toPlace || "-"}
            </Text>
          </View>
        )}

        {reason !== "-" && (
          <View style={cardStyles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color="#666" style={{ marginTop: 2 }} />
            <Text style={[cardStyles.metaText, { marginLeft: horizontalScale(8), flex: 1 }]}>
              Reason: {reason}
            </Text>
          </View>
        )}

        <View style={cardStyles.footerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
            {claimAmt !== undefined && claimAmt !== null && (
              <View style={cardStyles.amountContainer}>
                <Text style={cardStyles.amountLabel}>Claim Amount</Text>
                <Text style={cardStyles.amountValue}>₹{Number(claimAmt).toLocaleString()}</Text>
              </View>
            )}
            {diffDays !== undefined && diffDays !== null && (
              <View style={cardStyles.agingBadge}>
                <Ionicons name="time-outline" size={12} color="#D97706" />
                <Text style={cardStyles.agingBadgeText}>{diffDays}d ago</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[cardStyles.actionBtn, { backgroundColor: CustomColors.primaryColor }]}
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
    <SafeAreaView style={[globalStyles.container, { backgroundColor: "#F4F6F9" }]} edges={["bottom"]}>
      {/* QUICK SEARCH BAR */}
      <View style={searchStyles.searchCard}>
        <View style={searchStyles.inputRow}>
          <View style={searchStyles.textInputContainer}>
            <Ionicons name="search-outline" size={16} color="#888" style={{ marginLeft: 8 }} />
            <TextInput
              style={searchStyles.textInput}
              placeholder="Tour No"
              placeholderTextColor="#999"
              value={tourNo}
              onChangeText={setTourNo}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {tourNo.length > 0 && (
              <TouchableOpacity onPress={() => setTourNo("")} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={searchStyles.dateBtn}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color={CustomColors.primaryColor} />
            <Text style={searchStyles.dateBtnText}>
              {requestDate ? formatDateToDisplay(requestDate) : "Req Date"}
            </Text>
            {requestDate && (
              <TouchableOpacity
                onPress={() => setRequestDate(null)}
                style={{ marginLeft: 4 }}
              >
                <Ionicons name="close-circle" size={14} color="#999" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        <View style={searchStyles.btnRow}>
          <TouchableOpacity
            style={[searchStyles.submitBtn, { backgroundColor: CustomColors.primaryColor }]}
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <MaterialIcons name="search" size={18} color="#fff" />
            <Text style={searchStyles.submitBtnText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={searchStyles.clearBtn}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Text style={searchStyles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={requestDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setRequestDate(date);
          }}
        />
      )}

      {/* STATUS PILLS */}
      <View style={statusStyles.statusContainer}>
        {statusList.map((st) => {
          const isSelected =
            selectedStatusName === st.name || selectedStatusName === st.value;
          return (
            <TouchableOpacity
              key={st.id || st.value}
              style={[
                statusStyles.statusPill,
                isSelected && [
                  statusStyles.statusPillActive,
                  {
                    backgroundColor: CustomColors.primaryColor,
                    borderColor: CustomColors.primaryColor,
                  },
                ],
              ]}
              onPress={() => handleStatusChange(st)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  statusStyles.statusPillText,
                  isSelected && statusStyles.statusPillTextActive,
                ]}
              >
                {st.name || st.value}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SUMMARY LIST */}
      {isFetching && !isRefreshing && claimsList.length === 0 ? (
        <View style={stateStyles.centeredContainer}>
          <ActivityIndicator size="large" color={CustomColors.primaryColor} />
          <Text style={stateStyles.loadingText}>Loading claim approvals...</Text>
        </View>
      ) : (
        <FlatList
          data={claimsList}
          keyExtractor={(item, index) => `${item.id || item.requestno || item.tourid}_${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: verticalScale(80) }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[CustomColors.primaryColor]}
            />
          }
          ListEmptyComponent={
            <View style={stateStyles.emptyContainer}>
              <FontAwesome5 name="inbox" size={54} color="#BDBDBD" />
              <Text style={stateStyles.emptyTitle}>No Records Found</Text>
              <Text style={stateStyles.emptySubtitle}>
                No claim approvals available for the selected filters.
              </Text>
            </View>
          }
        />
      )}

      {/* PAGINATION FOOTER */}
      <View style={pageStyles.paginationFooter}>
        <TouchableOpacity
          style={[
            pageStyles.pageButton,
            !hasPrevious && pageStyles.pageButtonDisabled,
          ]}
          onPress={handlePreviousPage}
          disabled={!hasPrevious || isFetching}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={20}
            color={hasPrevious ? CustomColors.primaryColor : "#BDBDBD"}
          />
          <Text
            style={[
              pageStyles.pageButtonText,
              { color: hasPrevious ? CustomColors.primaryColor : "#BDBDBD" },
            ]}
          >
            Prev
          </Text>
        </TouchableOpacity>

        <View style={pageStyles.pageIndicator}>
          <Text style={pageStyles.pageIndicatorText}>
            Page {page} {totalCount > 0 ? `• ${totalCount} items` : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            pageStyles.pageButton,
            !hasNext && pageStyles.pageButtonDisabled,
          ]}
          onPress={handleNextPage}
          disabled={!hasNext || isFetching}
          activeOpacity={0.7}
        >
          <Text
            style={[
              pageStyles.pageButtonText,
              { color: hasNext ? CustomColors.primaryColor : "#BDBDBD" },
            ]}
          >
            Next
          </Text>
          <MaterialIcons
            name="arrow-forward"
            size={20}
            color={hasNext ? CustomColors.primaryColor : "#BDBDBD"}
          />
        </TouchableOpacity>
      </View>

      {/* ADVANCED FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Filter Approvals</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={modalStyles.filterLabel}>Aging</Text>
            <View style={modalStyles.agingPillsContainer}>
              <TouchableOpacity
                style={[
                  modalStyles.agingChip,
                  selectedAging === null && modalStyles.agingChipActive,
                ]}
                onPress={() => setSelectedAging(null)}
              >
                <Text
                  style={[
                    modalStyles.agingChipText,
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
                    style={[modalStyles.agingChip, isSel && modalStyles.agingChipActive]}
                    onPress={() => setSelectedAging(aging)}
                  >
                    <Text
                      style={[
                        modalStyles.agingChipText,
                        isSel && modalStyles.agingChipTextActive,
                      ]}
                    >
                      {aging.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
                  ? selectedBranch.name_code || `${selectedBranch.code} - ${selectedBranch.name}`
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

            <Text style={modalStyles.filterLabel}>Employee</Text>
            <TouchableOpacity
              style={modalStyles.selectorBtn}
              onPress={() => {
                fetchEmployees("");
                setEmployeeModalVisible(true);
              }}
            >
              <Ionicons name="person-outline" size={18} color="#666" />
              <Text style={modalStyles.selectorBtnText} numberOfLines={1}>
                {selectedEmployee
                  ? selectedEmployee.full_name || `(${selectedEmployee.code}) ${selectedEmployee.name}`
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

            <View style={modalStyles.footerBtns}>
              <TouchableOpacity
                style={modalStyles.resetBtn}
                onPress={() => {
                  setSelectedAging(null);
                  setSelectedBranch(null);
                  setSelectedEmployee(null);
                }}
              >
                <Text style={modalStyles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.applyBtn, { backgroundColor: CustomColors.primaryColor }]}
                onPress={() => {
                  setFilterModalVisible(false);
                  setPage(1);
                  fetchClaims(1, false);
                }}
              >
                <Text style={modalStyles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BRANCH PICKER MODAL */}
      <Modal
        visible={branchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.pickerModalContainer}>
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
                placeholder="Search branch by name or code..."
                value={branchSearch}
                onChangeText={(text) => {
                  setBranchSearch(text);
                  fetchBranches(text);
                }}
              />
            </View>

            {isBranchLoading ? (
              <ActivityIndicator size="small" color={CustomColors.primaryColor} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={branchOptions}
                keyExtractor={(item) => String(item.id || item.code)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={modalStyles.pickerItem}
                    onPress={() => {
                      setSelectedBranch(item);
                      setBranchModalVisible(false);
                    }}
                  >
                    <Text style={modalStyles.pickerItemTitle}>
                      {item.name_code || `${item.code} - ${item.name}`}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* EMPLOYEE PICKER MODAL */}
      <Modal
        visible={employeeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmployeeModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.pickerModalContainer}>
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
                placeholder="Search employee name or code..."
                value={employeeSearch}
                onChangeText={(text) => {
                  setEmployeeSearch(text);
                  fetchEmployees(text);
                }}
              />
            </View>

            {isEmployeeLoading ? (
              <ActivityIndicator size="small" color={CustomColors.primaryColor} style={{ marginTop: 20 }} />
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

export default ClaimApprovalScreen;

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

const pageStyles = StyleSheet.create({
  paginationFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: verticalScale(50),
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(20),
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(12),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FAFAFA",
  },
  pageButtonDisabled: {
    opacity: 0.4,
    borderColor: "#EAEAEA",
  },
  pageButtonText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.SemiBold,
    marginHorizontal: 4,
  },
  pageIndicator: {
    alignItems: "center",
  },
  pageIndicatorText: {
    fontSize: moderateScale(12),
    color: "#555",
    fontFamily: Fonts.Medium,
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
