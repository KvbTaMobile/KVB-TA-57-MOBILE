import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLazyExpenseApprovalSummarryQuery } from "../../redux/rtk_query/apiSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  setExpenseApprovalsArray,
  clearExpenseApprovalsArray,
  setApprovalFilters,
  clearApprovalFilters,
} from '../../redux/slices/ExpenseSlice';
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import ExpenseSummaryCard from "../../TaComponents/cards/ExpenseSummaryCard";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import { getCustomColors } from "../../styles/CustomColors";
import FilterModal from '../../TaComponents/models/FilterModel';
import { setFilters, clearFilters } from "../../redux/slices/FilterSlice";
import * as styles from "../../styles/StyleSheet";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";
import { Fonts } from "../../styles/Fonts";

const formatDateToDDMMMYYYY = (dateInput) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

const TravelMakerSummaryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector(state => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);
  const getRedux = useSelector(
    (state) => state.expense.expenseApprovals
  );
  const filters = useSelector((state) => state.travelFilter);
  const { mode, selectedBranch, selectedEmployee } = useSelector(
    (state) => state.selfOrOnBehalf
  );

  const [trigger, { isLoading, isFetching, isError, error, data }] =
    useLazyExpenseApprovalSummarryQuery();

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filtersCleared, setFiltersCleared] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const statusOptions = [
    { label: 'Pending for Approval', value: "2" },
    { label: 'Approved by me', value: "3" },
    { label: 'Rejected by me', value: "4" },
    { label: 'Returned by me', value: "5" },
    { label: 'Approved by all', value: "7" },
  ];

  const currentStatusValue =
    typeof filters.status === "object"
      ? filters.status?.value
      : filters.status;

  const hasActiveFilters = Boolean(
    (filters?.tourNO && String(filters.tourNO).trim()) ||
    (currentStatusValue !== undefined && currentStatusValue !== null && String(currentStatusValue) !== "2") ||
    filters?.requestedDate ||
    filters?.employeeCode ||
    filters?.employeeName ||
    filters?.employeeBranch
  );

  const getStatusLabel = (value) => {
    const status = statusOptions.find((option) => String(option.value) === String(value));
    return status ? status.label : "Select Status";
  };

  const screenStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: isDark ? CustomColors.screenBackground : "#f8fafc",
        },
        headerRightContainer: {
          flexDirection: "row",
          alignItems: "center",
          marginRight: horizontalScale(6),
        },
        headerButton: {
          padding: moderateScale(6),
          borderRadius: moderateScale(8),
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        },
        filterBadgeDot: {
          position: "absolute",
          top: verticalScale(4),
          right: horizontalScale(4),
          width: moderateScale(8),
          height: moderateScale(8),
          borderRadius: moderateScale(4),
          backgroundColor: "#f59e0b",
          borderWidth: 1.5,
          borderColor: CustomColors.appThemeColor,
        },
        onBehalfContainer: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "#1e293b" : "#eff6ff",
          paddingVertical: verticalScale(10),
          paddingHorizontal: horizontalScale(14),
          marginHorizontal: horizontalScale(14),
          marginTop: verticalScale(10),
          borderRadius: moderateScale(10),
          borderLeftWidth: 4,
          borderLeftColor: CustomColors.appThemeColor,
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#dbeafe",
          elevation: 1,
        },
        onBehalfIconWrap: {
          width: moderateScale(34),
          height: moderateScale(34),
          borderRadius: moderateScale(8),
          backgroundColor: `${CustomColors.appThemeColor}18`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: horizontalScale(10),
        },
        onBehalfContent: {
          flex: 1,
        },
        onBehalfSubText: {
          fontSize: moderateScale(10),
          fontFamily: Fonts.medium,
          color: isDark ? "#94a3b8" : "#64748b",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: verticalScale(1),
        },
        onBehalfEmployeeName: {
          fontFamily: Fonts.bold,
          color: isDark ? "#93c5fd" : "#1e40af",
          fontSize: moderateScale(13),
        },
        activeFiltersBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
          marginHorizontal: horizontalScale(14),
          marginTop: verticalScale(8),
          paddingHorizontal: horizontalScale(10),
          paddingVertical: verticalScale(6),
          borderRadius: moderateScale(8),
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#e2e8f0",
        },
        activeFiltersLeft: {
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          flexWrap: "wrap",
        },
        activeFiltersTitle: {
          fontSize: moderateScale(11),
          fontFamily: Fonts.medium,
          color: CustomColors.textMuted || "#64748b",
          marginRight: horizontalScale(6),
        },
        filterChip: {
          backgroundColor: isDark ? "#334155" : "#e2e8f0",
          paddingHorizontal: horizontalScale(8),
          paddingVertical: verticalScale(2),
          borderRadius: moderateScale(6),
          marginRight: horizontalScale(6),
          marginVertical: verticalScale(2),
        },
        filterChipText: {
          fontSize: moderateScale(11),
          fontFamily: Fonts.semiBold,
          color: CustomColors.textDark,
        },
        clearFiltersBtn: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: horizontalScale(6),
          paddingVertical: verticalScale(2),
        },
        clearFiltersText: {
          fontSize: moderateScale(11),
          fontFamily: Fonts.semiBold,
          color: CustomColors.red || "#ef4444",
          marginLeft: horizontalScale(2),
        },
        summaryOverviewBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: horizontalScale(14),
          paddingTop: verticalScale(10),
          paddingBottom: verticalScale(6),
        },
        summaryOverviewLeft: {
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
        },
        summaryOverviewTitle: {
          fontSize: moderateScale(13),
          fontFamily: Fonts.bold,
          color: CustomColors.textDark,
          marginLeft: horizontalScale(6),
        },
        statusBadge: {
          backgroundColor: isDark ? "#1e3a5f" : "#dbeafe",
          paddingHorizontal: horizontalScale(8),
          paddingVertical: verticalScale(2),
          borderRadius: moderateScale(6),
          marginLeft: horizontalScale(8),
        },
        statusBadgeText: {
          fontSize: moderateScale(10),
          fontFamily: Fonts.semiBold,
          color: isDark ? "#93c5fd" : "#1d4ed8",
        },
        countBadge: {
          backgroundColor: isDark ? "#334155" : "#e2e8f0",
          paddingHorizontal: horizontalScale(10),
          paddingVertical: verticalScale(3),
          borderRadius: moderateScale(12),
        },
        countBadgeText: {
          fontSize: moderateScale(11),
          fontFamily: Fonts.semiBold,
          color: CustomColors.textDark,
        },
        listWrap: {
          flex: 1,
          paddingHorizontal: horizontalScale(14),
        },
        loadingContainer: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: moderateScale(24),
          backgroundColor: isDark ? CustomColors.screenBackground : "#f8fafc",
        },
        loadingCard: {
          backgroundColor: CustomColors.cardBackground || "#fff",
          borderRadius: moderateScale(14),
          padding: moderateScale(24),
          alignItems: "center",
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#e2e8f0",
          elevation: 2,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          width: "80%",
        },
        loadingTitle: {
          marginTop: verticalScale(12),
          fontSize: moderateScale(15),
          fontFamily: Fonts.semiBold,
          color: CustomColors.textDark,
        },
        loadingSubtitle: {
          marginTop: verticalScale(4),
          fontSize: moderateScale(12),
          fontFamily: Fonts.regular,
          color: CustomColors.textMuted || "#64748b",
          textAlign: "center",
        },
        noDataContainer: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: moderateScale(24),
          marginTop: verticalScale(40),
        },
        noDataIconWrap: {
          width: moderateScale(80),
          height: moderateScale(80),
          borderRadius: moderateScale(40),
          backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: verticalScale(14),
        },
        noDataTitle: {
          fontSize: moderateScale(16),
          fontFamily: Fonts.bold,
          color: CustomColors.textDark,
          marginBottom: verticalScale(6),
          textAlign: "center",
        },
        noDataSubtitle: {
          fontSize: moderateScale(13),
          fontFamily: Fonts.regular,
          color: CustomColors.textMuted || "#64748b",
          textAlign: "center",
          lineHeight: moderateScale(18),
          paddingHorizontal: horizontalScale(16),
        },
        resetFilterBtn: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: CustomColors.appThemeColor,
          paddingHorizontal: horizontalScale(16),
          paddingVertical: verticalScale(9),
          borderRadius: moderateScale(8),
          marginTop: verticalScale(16),
          elevation: 2,
        },
        resetFilterBtnText: {
          color: "#fff",
          fontFamily: Fonts.semiBold,
          fontSize: moderateScale(13),
          marginLeft: horizontalScale(6),
        },
      }),
    [isDark, CustomColors]
  );

  const HeaderRight = useCallback(
    () => (
      <View style={screenStyles.headerRightContainer}>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={screenStyles.headerButton}
          activeOpacity={0.7}
          accessibilityLabel="Filter Approvals"
        >
          <MaterialIcons
            name="filter-list"
            size={26}
            color={CustomColors.white}
          />
          {hasActiveFilters && <View style={screenStyles.filterBadgeDot} />}
        </TouchableOpacity>
      </View>
    ),
    [navigation, isDark, hasActiveFilters, screenStyles, CustomColors]
  );

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerShown: true,
        headerStyle: {
          backgroundColor: CustomColors.appThemeColor,
        },
        headerTitle: () => (
          <Text
            allowFontScaling={false}
            style={{
              ...globalStyles.headerTitle,
              fontSize: moderateScale(16),
              fontFamily: Fonts.semiBold,
              fontWeight: "600",
              color: CustomColors.white,
            }}
          >
            Expense Approval Summary
          </Text>
        ),
        headerTintColor: CustomColors.white,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: horizontalScale(12), padding: moderateScale(4) }}
            accessibilityLabel="Back"
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={CustomColors.white} />
          </TouchableOpacity>
        ),
        headerRight: HeaderRight,
      });
    }, [navigation, HeaderRight, CustomColors, isDark])
  );

  const handleRefresh = async () => {
    setHasMoreData(true);
    setPage(1);
    dispatch(clearExpenseApprovalsArray());
    await loadData(1, true);
  };

  const loadData = async (pageNum, isInitial = false) => {
    if (!hasMoreData && !isInitial) return;
    if (!isInitial) setIsLoadingMore(true);

    const statusValue =
      typeof filters.status === "object"
        ? filters.status?.value
        : filters.status;

    const payload = {
      page: pageNum,
      status: statusValue || 2
    };
    if (filters.tourNO) {
      payload.tour_no = filters.tourNO;
    }
    if (filters.employeeCode) {
      payload.makerid = filters.employeeCode;
    }

    if (filters.employeeName) {
      payload.makerid = filters.employeeName;
    }

    if (filters.employeeBranch) {
      payload.branch_id = filters.employeeBranch.value;
    }

    const result = await trigger(payload);
    if (result?.data) {
      if (result.data.data?.length > 0) {
        dispatch(setExpenseApprovalsArray({ data: result.data.data }));
        setPage((prev) => prev + 1);
      } else {
        setHasMoreData(false);
      }
    } else if (result?.error) {
      ToastMessage("Something went wrong");
      setHasMoreData(false);
    }

    if (!isInitial) setIsLoadingMore(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (!filtersCleared) {
        handleRefresh();
        return () => { };
      }
    }, [filters])
  );

  useEffect(() => {
    return () => {
      dispatch(clearExpenseApprovalsArray());
      dispatch(clearFilters());
    };
  }, []);

  useEffect(() => {
    if (
      filtersCleared &&
      !filters?.tourNO &&
      filters?.status === 2 &&
      !filters?.requestedDate
    ) {
      handleRefresh();
      setFiltersCleared(false);
    }
  }, [filters, filtersCleared]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData) {
      loadData(page);
    }
  };

  const handleCardPress = (expenseData) => {
    navigation.navigate('ExpenseApprovalView', { expense: expenseData, from: 'Checker' });
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    setFiltersCleared(true);
    setFilterModalVisible(false);
  };

  if (isFetching && page === 1) {
    return (
      <View style={screenStyles.loadingContainer}>
        <View style={screenStyles.loadingCard}>
          <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
          <Text allowFontScaling={false} style={screenStyles.loadingTitle}>
            Loading Approvals
          </Text>
          <Text allowFontScaling={false} style={screenStyles.loadingSubtitle}>
            Fetching expense records, please wait...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={screenStyles.container} edges={['bottom', 'left', 'right']}>
      {/* ---------------- On Behalf Banner ---------------- */}
      {mode !== "self" && selectedEmployee?.employee_name ? (
        <View style={screenStyles.onBehalfContainer}>
          <View style={screenStyles.onBehalfIconWrap}>
            <MaterialIcons
              name="supervised-user-circle"
              size={moderateScale(20)}
              color={CustomColors.appThemeColor}
            />
          </View>
          <View style={screenStyles.onBehalfContent}>
            <Text allowFontScaling={false} style={screenStyles.onBehalfSubText}>
              Acting on behalf of
            </Text>
            <Text allowFontScaling={false} style={screenStyles.onBehalfEmployeeName} numberOfLines={1}>
              {selectedEmployee?.employee_name}
              {selectedEmployee?.employee_code ? ` (${selectedEmployee?.employee_code})` : ""}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ---------------- Active Filters Bar ---------------- */}
      {hasActiveFilters && (
        <View style={screenStyles.activeFiltersBar}>
          <View style={screenStyles.activeFiltersLeft}>
            <Text allowFontScaling={false} style={screenStyles.activeFiltersTitle}>
              Filters:
            </Text>
            {filters?.tourNO ? (
              <View style={screenStyles.filterChip}>
                <Text allowFontScaling={false} style={screenStyles.filterChipText}>
                  Tour: {filters.tourNO}
                </Text>
              </View>
            ) : null}
            {currentStatusValue && String(currentStatusValue) !== "2" ? (
              <View style={screenStyles.filterChip}>
                <Text allowFontScaling={false} style={screenStyles.filterChipText}>
                  {getStatusLabel(currentStatusValue)}
                </Text>
              </View>
            ) : null}
            {filters?.requestedDate ? (
              <View style={screenStyles.filterChip}>
                <Text allowFontScaling={false} style={screenStyles.filterChipText}>
                  {formatDateToDDMMMYYYY(filters.requestedDate)}
                </Text>
              </View>
            ) : null}
            {filters?.employeeCode || filters?.employeeName ? (
              <View style={screenStyles.filterChip}>
                <Text allowFontScaling={false} style={screenStyles.filterChipText}>
                  Maker: {filters.employeeCode || filters.employeeName}
                </Text>
              </View>
            ) : null}
            {filters?.employeeBranch ? (
              <View style={screenStyles.filterChip}>
                <Text allowFontScaling={false} style={screenStyles.filterChipText}>
                  Branch: {filters.employeeBranch?.name || filters.employeeBranch?.code || 'Selected'}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={screenStyles.clearFiltersBtn}
            onPress={clearAllFilters}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="close"
              size={moderateScale(14)}
              color={CustomColors.red || "#ef4444"}
            />
            <Text allowFontScaling={false} style={screenStyles.clearFiltersText}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---------------- Summary Overview Bar ---------------- */}
      {getRedux?.length > 0 && (
        <View style={screenStyles.summaryOverviewBar}>
          <View style={screenStyles.summaryOverviewLeft}>
            <MaterialIcons
              name="rule"
              size={moderateScale(18)}
              color={CustomColors.appThemeColor}
            />
            <Text allowFontScaling={false} style={screenStyles.summaryOverviewTitle}>
              Approvals
            </Text>
            <View style={screenStyles.statusBadge}>
              <Text allowFontScaling={false} style={screenStyles.statusBadgeText}>
                {getStatusLabel(currentStatusValue || "2")}
              </Text>
            </View>
          </View>
          <View style={screenStyles.countBadge}>
            <Text allowFontScaling={false} style={screenStyles.countBadgeText}>
              {getRedux.length} {getRedux.length === 1 ? "Record" : "Records"}
            </Text>
          </View>
        </View>
      )}

      <FilterModal
        isVisible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        dispatch={dispatch}
        setFilters={setFilters}
        applyFilters={applyFilters}
        clearAllFilters={clearAllFilters}
        statusOptions={statusOptions}
        getStatusLabel={getStatusLabel}
        title={"Expense Filter"}
        isChecker={true}
      />

      {getRedux?.length > 0 ? (
        <View style={screenStyles.listWrap}>
          <RowList
            data={getRedux}
            RenderItem={({ data: item }) => (
              <ExpenseSummaryCard expense={item} onPress={() => handleCardPress(item)} />
            )}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
            hasMoreData={hasMoreData}
            onRefresh={handleRefresh}
            refreshing={isFetching && page === 1}
            onPress={handleCardPress}
          />
        </View>
      ) : (
        <View style={screenStyles.noDataContainer}>
          <View style={screenStyles.noDataIconWrap}>
            <MaterialIcons
              name="assignment-turned-in"
              size={moderateScale(44)}
              color={CustomColors.textMuted || "#94a3b8"}
            />
          </View>
          <Text allowFontScaling={false} style={screenStyles.noDataTitle}>
            No Approvals Found
          </Text>
          <Text allowFontScaling={false} style={screenStyles.noDataSubtitle}>
            {hasActiveFilters
              ? "No expense requests match your filter criteria. Try adjusting or clearing filters."
              : "No expense approvals found pending for your review."}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity
              style={screenStyles.resetFilterBtn}
              onPress={clearAllFilters}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={moderateScale(18)} color="#fff" />
              <Text allowFontScaling={false} style={screenStyles.resetFilterBtnText}>
                Reset Filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default TravelMakerSummaryScreen;