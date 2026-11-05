import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLazyGetExpenseSummaryQuery } from "../../redux/rtk_query/apiSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  setExpenseSummaryArray,
  clearExpenseSummaryArray,
} from "../../redux/slices/ExpenseSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import ExpenseSummaryCard from "../../TaComponents/cards/ExpenseSummaryCard";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import { getCustomColors } from "../../styles/CustomColors";
import FilterModal from "../../TaComponents/models/FilterModel";
import SelfOrOnBehalfModal from "../../TaComponents/models/SelfOrOnBehalfModal";
import {  
  setMode,
  setSelectedBranch,
  setSelectedEmployee,
} from "../../redux/slices/SelfOrOnBehalfSlice";
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
  if (isNaN(date.getTime())) return dateInput;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

const TravelMakerSummaryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const getRedux = useSelector((state) => state.expense.expenseSummaries);
  const filters = useSelector((state) => state.travelFilter);
  const { mode, selectedEmployee } = useSelector(
    (state) => state.selfOrOnBehalf
  );

  const [trigger, { isFetching }] = useLazyGetExpenseSummaryQuery();

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [isSelfModalVisible, setIsSelfModalVisible] = useState(true);

  // Synchronize filter values across asynchronous state transitions
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const hasActiveFilters = Boolean(
    (filters?.tourNO && String(filters.tourNO).trim()) ||
    (filters?.tour_no && String(filters.tour_no).trim()) ||
    filters?.requestedDate ||
    filters?.request_date ||
    filters?.status ||
    filters?.claim_status
  );

  const statusOptions = [
    { label: "Created by me", value: "1" },
    { label: "Created for others", value: "0" },
  ];

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
          marginRight: horizontalScale(4),
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
          width: moderateScale(32),
          height: moderateScale(32),
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
        },
        summaryOverviewTitle: {
          fontSize: moderateScale(14),
          fontFamily: Fonts.bold,
          color: CustomColors.textDark,
          marginLeft: horizontalScale(6),
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
    [CustomColors, isDark]
  );

  const HeaderRight = useCallback(
    () => (
      <View style={screenStyles.headerRightContainer}>
        <TouchableOpacity
          onPress={() => setIsSelfModalVisible(true)}
          style={screenStyles.headerButton}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="swap-horiz"
            size={moderateScale(24)}
            color={CustomColors.white}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={screenStyles.headerButton}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="filter-list"
            size={moderateScale(24)}
            color={CustomColors.white}
          />
          {hasActiveFilters && (
            <View style={screenStyles.filterBadgeDot} />
          )}
        </TouchableOpacity>
      </View>
    ),
    [CustomColors.white, hasActiveFilters, screenStyles]
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
              fontSize: moderateScale(18),
              fontWeight: "600",
              color: CustomColors.white,
            }}
          >
            Expense Maker Summary
          </Text>
        ),
        headerTintColor: CustomColors.white,
        headerRight: HeaderRight,
      });
    }, [navigation, HeaderRight, CustomColors, globalStyles])
  );

  const handleSelfOrOnBehalfSubmit = (res) => {
    setIsSelfModalVisible(false);
    dispatch(setMode(res.mode));
    dispatch(setSelectedBranch(res.selectedBranch));
    dispatch(setSelectedEmployee(res.selectedEmployee));
    firstLoad.current = false;

    setHasMoreData(true);
    setPage(1);
    loadData(1, true, {
      ...filtersRef.current,
      overrideMode: res.mode,
      overrideEmployee: res.selectedEmployee,
    });
  };

  const handleSelfOrOnBehalfClose = () => {
    setIsSelfModalVisible(false);
    if (firstLoad.current) {
      firstLoad.current = false;
      setHasMoreData(true);
      setPage(1);
      loadData(1, true, filtersRef.current);
    }
  };

  const loadData = async (pageNum, isInitial = false, activeFilters = filtersRef.current) => {
    if (!hasMoreData && !isInitial) return;
    if (!isInitial) setIsLoadingMore(true);

    const rawDate = activeFilters?.requestedDate || activeFilters?.request_date;
    const formattedDate = rawDate ? formatDateToDDMMMYYYY(rawDate) : "";

    // Field parameter mapping aligned with Angular API contract
    const payload = {
      page: pageNum,
      tour_no: activeFilters?.tourNO || activeFilters?.tour_no || "",
      request_date: formattedDate,
    };

    const targetMode = activeFilters?.overrideMode !== undefined ? activeFilters.overrideMode : mode;
    const targetEmp = activeFilters?.overrideEmployee !== undefined ? activeFilters.overrideEmployee : selectedEmployee;
    const onBehalfId = targetEmp?.employeegid || targetEmp?.id;

    if (targetMode === "onbehalf" && onBehalfId) {
      payload.onbehalf_empid = onBehalfId;
      payload.onbehalf = onBehalfId;
    }

    try {
      const result = await trigger(payload);
      if (result?.data) {
        const listData = result.data.data || [];
        const pagination = result.data.pagination;

        if (isInitial) {
          dispatch(clearExpenseSummaryArray());
        }

        dispatch(clearExpenseSummaryArray());

        if (listData.length > 0) {
          dispatch(setExpenseSummaryArray({ data: listData }));
        } else {
          dispatch(setExpenseSummaryArray({ data: [] }));
        }

        setHasMoreData(pagination?.has_next ?? false);
        setPage(pageNum + 1);
      } else if (result?.error) {
        ToastMessage("Something went wrong");
        setHasMoreData(false);
      }
    } catch (e) {
      ToastMessage("Failed to fetch data");
    } finally {
      if (!isInitial) setIsLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setHasMoreData(true);
    setPage(1);
    await loadData(1, true, filtersRef.current);
  };

  const firstLoad = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstLoad.current) {
        // Modal will handle loading when submitted or dismissed
        return;
      }
      handleRefresh();
    }, [])
  );

  useEffect(() => {
    if (!filterModalVisible) {
      setHasMoreData(true);
      setPage(1);
      loadData(1, true, filters);
    }
  }, [filters]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData) {
      loadData(page, false, filtersRef.current);
    }
  };

  const handleCardPress = (expenseData) => {
    if (!expenseData.is_tour_started) {
      ToastMessage("Tour Date Not Started.");
      return;
    }
    navigation.navigate("ExpenseDetail", {
      expense: expenseData,
      from: "Maker",
    });
  };

  const applyFilters = () => {
    setFilterModalVisible(false);

    setTimeout(() => {
      setHasMoreData(true);
      setPage(1);
      loadData(1, true, filtersRef.current);
    }, 0);
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    setFilterModalVisible(false);
    setHasMoreData(true);
    setPage(1);
    loadData(1, true, {});
  };

  const getStatusLabel = (value) => {
    const status = statusOptions.find((option) => option.value === value);
    return status ? status.label : "Select Status";
  };

  if (isFetching && page === 1) {
    return (
      <View style={screenStyles.loadingContainer}>
        <View style={screenStyles.loadingCard}>
          <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
          <Text allowFontScaling={false} style={screenStyles.loadingTitle}>
            Loading Expense Claims...
          </Text>
          <Text allowFontScaling={false} style={screenStyles.loadingSubtitle}>
            Fetching summary records
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={screenStyles.container}>
      {/* ---------------- On Behalf Employee Banner ---------------- */}
      {mode === "onbehalf" && selectedEmployee && (
        <TouchableOpacity
          style={screenStyles.onBehalfContainer}
          onPress={() => setIsSelfModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={screenStyles.onBehalfIconWrap}>
            <MaterialIcons
              name="person"
              size={moderateScale(18)}
              color={CustomColors.appThemeColor}
            />
          </View>
          <View style={screenStyles.onBehalfContent}>
            <Text allowFontScaling={false} style={screenStyles.onBehalfSubText}>
              ON BEHALF EMPLOYEE (Tap to switch)
            </Text>
            <Text
              allowFontScaling={false}
              style={screenStyles.onBehalfEmployeeName}
              numberOfLines={1}
            >
              {selectedEmployee?.employee_name || selectedEmployee?.full_name}{" "}
              {selectedEmployee?.employeecode || selectedEmployee?.employee_code
                ? `(${selectedEmployee?.employeecode || selectedEmployee?.employee_code})`
                : ""}
            </Text>
          </View>
          <MaterialIcons
            name="swap-horiz"
            size={moderateScale(20)}
            color={CustomColors.appThemeColor}
          />
        </TouchableOpacity>
      )}


      {/* ---------------- Summary Overview Bar ---------------- */}
      {getRedux?.length > 0 && (
        <View style={screenStyles.summaryOverviewBar}>
          <View style={screenStyles.summaryOverviewLeft}>
            <MaterialIcons
              name="receipt-long"
              size={moderateScale(18)}
              color={CustomColors.appThemeColor}
            />
            <Text allowFontScaling={false} style={screenStyles.summaryOverviewTitle}>
              Expense Claims
            </Text>
          </View>
          <View style={screenStyles.countBadge}>
            <Text allowFontScaling={false} style={screenStyles.countBadgeText}>
              {getRedux.length} {getRedux.length === 1 ? "Request" : "Requests"}
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
      />

      {getRedux?.length > 0 ? (
        <View style={screenStyles.listWrap}>
          <RowList
            data={getRedux}
            RenderItem={({ data: item }) => (
              <ExpenseSummaryCard
                expense={item}
                onPress={() => handleCardPress(item)}
              />
            )}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
            hasMoreData={hasMoreData}
            onRefresh={handleRefresh}
            refreshing={isFetching && page === 1}
          />
        </View>
      ) : (
        <View style={screenStyles.noDataContainer}>
          <View style={screenStyles.noDataIconWrap}>
            <MaterialIcons
              name="receipt"
              size={moderateScale(44)}
              color={CustomColors.textMuted || "#94a3b8"}
            />
          </View>
          <Text allowFontScaling={false} style={screenStyles.noDataTitle}>
            No Expense Claims Found
          </Text>
          <Text allowFontScaling={false} style={screenStyles.noDataSubtitle}>
            {hasActiveFilters
              ? "No expense requests match your current filters. Try changing or clearing filters."
              : "No expense claim requests have been created yet."}
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

      {/* Self or OnBehalf Modal */}
      <SelfOrOnBehalfModal
        visible={isSelfModalVisible}
        onSubmit={handleSelfOrOnBehalfSubmit}
        onClose={handleSelfOrOnBehalfClose}
      />
    </View>
  );
};

export default TravelMakerSummaryScreen;