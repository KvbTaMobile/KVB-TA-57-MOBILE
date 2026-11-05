import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLazyTravelMakerSummaryQuery } from "../../redux/rtk_query/apiSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  clearTravelMakerSummaryArray,
  setTravelMakerSummaryArray,
} from "../../redux/slices/TravelMaker";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import TravelMakerSummaryCard from "../../TaComponents/cards/TravelMakerSummaryCard";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import FilterModal from "../../TaComponents/models/FilterModel";
import { setFilters, clearFilters } from "../../redux/slices/FilterSlice";
import SelfOrOnBehalfModal from "../../TaComponents/models/SelfOrOnBehalfModal";
import {
  setMode,
  setSelectedBranch,
  setSelectedEmployee,
  resetSelfOrOnBehalf,
} from "../../redux/slices/SelfOrOnBehalfSlice";
import { styles } from "../../styles/StyleSheet";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";
import { getCustomColors } from "../../styles/CustomColors";
import { SafeAreaView } from "react-native-safe-area-context";

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Date Formatter matching Angular "dd-MMM-yyyy" (e.g., 01-Aug-2026)
const formatDateForFilter = (dateString) => {
  if (!dateString) return "";
  const str = String(dateString).trim();
  const parts = str.split("-");

  // If already DD-MMM-YYYY (e.g. 03-Sep-2026 or 03-sep-2026)
  if (parts.length === 3 && isNaN(Number(parts[1]))) {
    const day = parts[0].padStart(2, "0");
    const mStr = parts[1].toLowerCase();
    const months = {
      jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", may: "May", jun: "Jun",
      jul: "Jul", aug: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec"
    };
    const month = months[mStr] || (parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase());
    return `${day}-${month}-${parts[2]}`;
  }

  // If DD-MM-YYYY (e.g. 03-09-2026)
  if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
    const day = parts[0].padStart(2, "0");
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${MONTH_NAMES_SHORT[monthIdx]}-${year}`;
    }
  }

  // If YYYY-MM-DD (e.g. 2026-09-03)
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, "0");
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${MONTH_NAMES_SHORT[monthIdx]}-${year}`;
    }
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return str;
  const day = d.getDate()?.toString().padStart(2, "0");
  const month = MONTH_NAMES_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const TravelMakerSummaryScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const getRedux = useSelector(
    (state) => state.TravelMaker.travelMakerSummaryArray
  );
  const filters = useSelector((state) => state.travelFilter);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const { mode, selectedEmployee } = useSelector(
    (state) => state.selfOrOnBehalf
  );

  // Define screen scope flags to prevent ReferenceErrors
  const isMaker = route?.params?.from === "MAKER" || true;

  const [trigger, { isFetching }] = useLazyTravelMakerSummaryQuery();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles(isDark);

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const hasMoreRef = useRef(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [isSelfModalVisible, setIsSelfModalVisible] = useState(true);
  const firstLoadRef = useRef(true);

  // Ref to guard against concurrent duplicate API requests
  const isFetchingRef = useRef(false);

  const screenStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.appScreenColor,
    },
    headerRightContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerButton: {
      marginLeft: horizontalScale(15),
    },
    onBehalfContainer: {
      backgroundColor: isDark ? "#1e293b" : (CustomColors.liteBlue || "#E8F0FE"),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(15),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderColor || "#D1D5DB",
    },
    onBehalfRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    onBehalfTextWrap: {
      flex: 1,
      marginHorizontal: horizontalScale(8),
    },
    onBehalfSubText: {
      fontSize: moderateScale(11),
      color: CustomColors.darkGray || "#64748b",
      fontWeight: "600",
    },
    onBehalfEmployeeName: {
      fontWeight: "bold",
      color: CustomColors.primaryBlue || "#1D4ED8",
      fontSize: moderateScale(14),
      marginTop: verticalScale(2),
    },
  });

  const HeaderRight = useCallback(
    () => (
      <View style={screenStyles.headerRightContainer}>
        {/* Switch Mode Button */}
        <TouchableOpacity
          onPress={() => setIsSelfModalVisible(true)}
          style={screenStyles.headerButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={mode === "onbehalf" ? "people" : "person"}
            size={24}
            color={CustomColors.white}
          />
        </TouchableOpacity>

        {/* Filter Button */}
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={screenStyles.headerButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="filter-list"
            size={28}
            color={CustomColors.white}
          />
        </TouchableOpacity>

        {/* Add Tour Button */}
        {isMaker && (
          <TouchableOpacity
            onPress={() => handleCreateTour()}
            style={screenStyles.headerButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={28} color={CustomColors.white} />
          </TouchableOpacity>
        )}
      </View>
    ),
    [navigation, isDark, CustomColors, selectedEmployee, isMaker, mode]
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
              fontSize: moderateScale(20),
              fontWeight: "600",
              color: CustomColors.textWhite,
            }}
          >
            Tour ID Creation
          </Text>
        ),
        headerTintColor: CustomColors.textWhite,
        headerRight: HeaderRight,
      });
    }, [navigation, isDark, HeaderRight, CustomColors, globalStyles])
  );

  const loadData = useCallback(
    async (pageNum, isInitial = false, activeFilters) => {
      if (isFetchingRef.current) return;
      if (!hasMoreRef.current && !isInitial) return;

      isFetchingRef.current = true;
      if (!isInitial) setIsLoadingMore(true);

      const payload = {
        page: pageNum,
      };

      // Extract search query values from activeFilters (or fallback to ref)
      const currentFilters = activeFilters !== undefined ? activeFilters : filtersRef.current || {};
      const tourNoVal = currentFilters?.tourNO || currentFilters?.tour_no;
      const dateVal = currentFilters?.requestedDate || currentFilters?.request_date;

      if (tourNoVal && String(tourNoVal).trim() !== "") {
        payload.tour_no = String(tourNoVal).trim().toUpperCase();
      }
      if (dateVal) {
        payload.request_date = formatDateForFilter(dateVal);
      }

      // Condition-wise: Self vs Onbehalf (supports immediate override from modal submit)
      const targetMode = currentFilters?.overrideMode !== undefined ? currentFilters.overrideMode : mode;
      const targetEmp = currentFilters?.overrideEmployee !== undefined ? currentFilters.overrideEmployee : selectedEmployee;

      if (targetMode === "onbehalf" && targetEmp) {
        const onBehalfId = targetEmp?.employeegid || targetEmp?.id;
        if (onBehalfId) {
          payload.onbehalf = onBehalfId;
        }
      }

      try {
        const result = await trigger(payload).unwrap();

        const summaryList = result?.data || [];
        const hasNextPage = result?.pagination?.has_next ?? false;

        console.log(
          "TRAVEL MAKER SUMMARY REFRESH:",
          JSON.stringify({
            page: pageNum,
            count: summaryList.length,
            hasNextPage,
            payload,
          })
        );

        if (isInitial) {
          dispatch(clearTravelMakerSummaryArray());
        }

        if (Array.isArray(summaryList) && summaryList.length > 0) {
          dispatch(setTravelMakerSummaryArray({ data: summaryList }));
          hasMoreRef.current = hasNextPage;
          setHasMoreData(hasNextPage);
          setPage(pageNum + 1);
        } else {
          hasMoreRef.current = false;
          setHasMoreData(false);
        }
      } catch (err) {
        ToastMessage("Failed to fetch tour data.");
        hasMoreRef.current = false;
        setHasMoreData(false);
      } finally {
        isFetchingRef.current = false;
        if (!isInitial) setIsLoadingMore(false);
      }
    },
    [dispatch, trigger, mode, selectedEmployee]
  );

  const handleRefresh = useCallback(
    async (customFilters) => {
      isFetchingRef.current = false;
      hasMoreRef.current = true;
      setHasMoreData(true);
      setPage(1);
      await loadData(1, true, customFilters);
    },
    [loadData]
  );

  // Initial load whenever this screen gains focus (deferred if initial modal is pending)
  useFocusEffect(
    useCallback(() => {
      if (firstLoadRef.current) {
        // Modal is displayed on initial screen enter; submit or close triggers the initial load
        return;
      }
      handleRefresh();
    }, [handleRefresh])
  );

  const handleSelfOrOnBehalfSubmit = (res) => {
    setIsSelfModalVisible(false);
    dispatch(setMode(res.mode));
    dispatch(setSelectedBranch(res.selectedBranch));
    dispatch(setSelectedEmployee(res.selectedEmployee));
    firstLoadRef.current = false;

    setHasMoreData(true);
    setPage(1);
    handleRefresh({
      ...filtersRef.current,
      overrideMode: res.mode,
      overrideEmployee: res.selectedEmployee,
    });
  };

  const handleSelfOrOnBehalfClose = () => {
    setIsSelfModalVisible(false);
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      setHasMoreData(true);
      setPage(1);
      handleRefresh(filtersRef.current);
    }
  };

  useEffect(() => {
    return () => {
      dispatch(clearTravelMakerSummaryArray());
      dispatch(clearFilters());
      dispatch(resetSelfOrOnBehalf());
    };
  }, [dispatch]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData && !isFetching && !isFetchingRef.current) {
      loadData(page, false);
    }
  };

  // Clear filters before navigating to create screen and pass current onbehalf context
  const handleCreateTour = () => {
    dispatch(clearFilters());

    navigation.navigate("travel_create_screen", {
      mode: mode,
      onbehalf: mode === "onbehalf" ? (selectedEmployee?.employeegid || selectedEmployee?.id) : null,
      onbehalfname: mode === "onbehalf" ? (selectedEmployee?.employee_name || selectedEmployee?.full_name) : null,
      selectedEmployee: mode === "onbehalf" ? selectedEmployee : null,
    });
  };

  const handleCardPress = (itemData) => {
    console.log("========== TOUR ID DEBUG ==========");
    console.log("FULL ITEM DATA:", JSON.stringify(itemData, null, 2));

    // Get the actual Tour ID from backend response
    const tourId =
      itemData?.tourid ??
      itemData?.tour_id ??
      itemData?.tourId ??
      itemData?.id ??
      null;

    console.log("tourid:", itemData?.tourid);
    console.log("tour_id:", itemData?.tour_id);
    console.log("tourId:", itemData?.tourId);
    console.log("id:", itemData?.id);
    console.log("FINAL TOUR ID:", tourId);
    console.log("===================================");

    // Stop navigation if Tour ID is really missing
    if (
      tourId === null ||
      tourId === undefined ||
      String(tourId).trim() === ""
    ) {
      ToastMessage("Tour ID not found");
      return;
    }

    // Navigate to edit screen with the SAME Tour ID everywhere
    navigation.navigate("travel_edit_screen", {
      tourDataParams: {
        ...itemData,

        // Normalize Tour ID
        id: tourId,
        tourid: tourId,
        tour_id: tourId,
        tourId: tourId,
      },

      // Also pass separately
      tour_id: tourId,
      tourid: tourId,
      tourId: tourId,

      from: "MAKER",

      onbehalf:
        mode === "onbehalf"
          ? (selectedEmployee?.employeegid || selectedEmployee?.id)
          : null,

      onbehalfname:
        mode === "onbehalf"
          ? (selectedEmployee?.employee_name || selectedEmployee?.full_name)
          : null,
    });
  };

  const applyFilters = (appliedFilters) => {
    setFilterModalVisible(false);
    const target = appliedFilters || filtersRef.current;
    filtersRef.current = target;
    handleRefresh(target);
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    filtersRef.current = {};
    setFilterModalVisible(false);
    handleRefresh({});
  };

  if (isFetching && page === 1 && (!getRedux || getRedux.length === 0)) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={globalStyles.loadingText}>
          Please wait...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={screenStyles.container}>
      {/* On Behalf Header Banner (Condition-wise) */}
      {mode === "onbehalf" && selectedEmployee && (
        <TouchableOpacity
          style={screenStyles.onBehalfContainer}
          onPress={() => setIsSelfModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={screenStyles.onBehalfRow}>
            <MaterialIcons
              name="person"
              size={moderateScale(20)}
              color={CustomColors.primaryBlue || "#1D4ED8"}
            />
            <View style={screenStyles.onBehalfTextWrap}>
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
              size={moderateScale(22)}
              color={CustomColors.primaryBlue || "#1D4ED8"}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Self or OnBehalf Modal ("Add Onbehalf Of") */}
      <SelfOrOnBehalfModal
        visible={isSelfModalVisible}
        onSubmit={handleSelfOrOnBehalfSubmit}
        onClose={handleSelfOrOnBehalfClose}
        title="Add Onbehalf Of"
      />

      {/* Search Filter Modal */}
      <FilterModal
        isVisible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        dispatch={dispatch}
        setFilters={setFilters}
        applyFilters={applyFilters}
        clearAllFilters={clearAllFilters}
        showStatusFilter={false}
        title={"Tour Search Filter"}
      />

      {getRedux?.length > 0 ? (
        <RowList
          data={getRedux}
          RenderItem={(props) => (
            <TravelMakerSummaryCard {...props} isMaker={isMaker} />
          )}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          hasMoreData={hasMoreData}
          onRefresh={handleRefresh}
          refreshing={isFetching && page === 1}
          onPress={handleCardPress}
        />
      ) : (
        <View style={globalStyles.noDataContainer}>
          <Text allowFontScaling={false} style={globalStyles.noDataText}>
            No Data Found...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default TravelMakerSummaryScreen;