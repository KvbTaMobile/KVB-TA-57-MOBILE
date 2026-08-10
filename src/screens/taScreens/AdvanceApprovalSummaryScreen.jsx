import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import * as apiHooks from "../../redux/rtk_query/apiSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import TravelMakerSummaryCard from "../../TaComponents/cards/TravelMakerSummaryCard";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import FilterModal from "../../TaComponents/models/FilterModel";
import { setFilters, clearFilters } from "../../redux/slices/FilterSlice";
import {
  setAdvanceApproverSummaryArray,
  clearAdvanceApproverSummaryArray,
} from "../../redux/slices/TravelMaker";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import { moderateScale } from "../../globalstyles/Metrics";

const formatDateForFilter = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const AdvanceApprovalSummaryScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const getReduxSummary = useSelector(
    (state) => state.TravelMaker.advanceApproverSummaryArray
  );
  const filters = useSelector((state) => state.travelFilter);

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const isFetchingRef = useRef(false);

  const [triggerSummary, { isFetching }] = apiHooks.useLazyGetAdvanceApprovalSummaryQuery
    ? apiHooks.useLazyGetAdvanceApprovalSummaryQuery()
    : apiHooks.useLazyTravelApproveSummaryQuery
    ? apiHooks.useLazyTravelApproveSummaryQuery()
    : [() => ({ unwrap: async () => ({ data: [] }) }), { isFetching: false }];

  const statusOptions = [
    { label: "Pending", value: 2 },
    { label: "Approved", value: 3 },
    { label: "Rejected", value: 4 },
    { label: "Return", value: 5 },
    { label: "Forward", value: 6 },
  ];

  const HeaderRight = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => setFilterModalVisible(true)}
        style={{ marginRight: 15, padding: 4 }}
      >
        <Icon name="filter-list" size={28} color={CustomColors.white} />
      </TouchableOpacity>
    ),
    [CustomColors.white]
  );

  useLayoutEffect(() => {
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
            fontWeight: "700",
            color: CustomColors.textWhite,
          }}
        >
          Advance Approval Summary
        </Text>
      ),
      headerTintColor: CustomColors.textWhite,
      headerRight: HeaderRight,
    });
  }, [navigation, HeaderRight, CustomColors, globalStyles]);

  const loadData = useCallback(
    async (pageNum, isInitial = false, activeFilters = filters) => {
      if (isFetchingRef.current) return;
      if (!hasMoreData && !isInitial) return;

      isFetchingRef.current = true;
      if (!isInitial) setIsLoadingMore(true);

      const statusValue =
        typeof activeFilters.status === "object"
          ? activeFilters.status?.value
          : activeFilters.status;

      const tourNoVal = activeFilters?.tourNO || activeFilters?.tour_no;
      const dateVal = activeFilters?.requestedDate || activeFilters?.request_date;

      const payload = {
        page: pageNum,
        type: "advance",
        status:
          statusValue !== undefined && statusValue !== null && statusValue !== ""
            ? statusValue
            : 2,
      };

      if (tourNoVal && String(tourNoVal).trim() !== "") {
        payload.tour_no = String(tourNoVal).trim();
      }

      if (dateVal) {
        payload.request_date = formatDateForFilter(dateVal);
      }

      try {
        const result = await triggerSummary(payload).unwrap();
        const dataList = result?.data || (Array.isArray(result) ? result : []);
        const hasNextPage = result?.pagination?.has_next ?? (dataList.length >= 10);

        if (Array.isArray(dataList) && dataList.length > 0) {
          if (isInitial) {
            dispatch(clearAdvanceApproverSummaryArray());
          }
          dispatch(setAdvanceApproverSummaryArray({ data: dataList }));
          setHasMoreData(hasNextPage);
          setPage(pageNum + 1);
        } else {
          if (isInitial) {
            dispatch(clearAdvanceApproverSummaryArray());
          }
          setHasMoreData(false);
        }
      } catch (err) {
        console.warn("Error fetching advance approval summary:", err);
        ToastMessage("Failed to fetch advance approval list.");
        setHasMoreData(false);
      } finally {
        isFetchingRef.current = false;
        if (!isInitial) setIsLoadingMore(false);
      }
    },
    [dispatch, filters, hasMoreData, triggerSummary]
  );

  const handleRefresh = useCallback(
    async (customFilters = filters) => {
      setHasMoreData(true);
      setPage(1);
      dispatch(clearAdvanceApproverSummaryArray());
      await loadData(1, true, customFilters);
    },
    [dispatch, loadData, filters]
  );

  useFocusEffect(
    useCallback(() => {
      handleRefresh(filters);
    }, [filters])
  );

  useEffect(() => {
    return () => {
      dispatch(clearAdvanceApproverSummaryArray());
      dispatch(clearFilters());
    };
  }, [dispatch]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData && !isFetching && !isFetchingRef.current) {
      loadData(page, false, filters);
    }
  };

  const handleCardPress = (itemData) => {
    navigation.navigate("advance_approval_view", {
      tourDataParams: itemData,
      from: "CHECKER",
      tour_id: itemData?.tourgid || itemData?.tourid || itemData?.id,
    });
  };

  const applyFilters = (appliedFilters) => {
    dispatch(setFilters(appliedFilters));
    setFilterModalVisible(false);
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    setFilterModalVisible(false);
    setTimeout(() => {
      handleRefresh({});
    }, 100);
  };

  const getStatusLabel = (value) => {
    const status = statusOptions.find((option) => option.value === value);
    return status ? status.label : "Pending";
  };

  if (isFetching && page === 1 && (!getReduxSummary || getReduxSummary.length === 0)) {
    return (
      <View style={[uiStyles.centered, { backgroundColor: CustomColors.appScreenColor }]}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={[uiStyles.loadingText, { color: CustomColors.textDark }]}>
          Loading Advance Approval Requests...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[uiStyles.container, { backgroundColor: CustomColors.appScreenColor }]}>
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
        isTourApproval={true}
        isChecker={false}
        isAdmin={false}
        title={"Advance Approval Filter"}
      />

      {getReduxSummary?.length > 0 ? (
        <RowList
          data={getReduxSummary}
          RenderItem={(props) => (
            <TravelMakerSummaryCard
              {...props}
              isChecker={true}
              isAdvance={true} // 👈 Forces card to render advance_status_id/status_name ("PENDING")
            />
          )}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          hasMoreData={hasMoreData}
          onRefresh={() => handleRefresh(filters)}
          refreshing={isFetching && page === 1}
          onPress={handleCardPress}
        />
      ) : (
        <View style={globalStyles.noDataContainer}>
          <Text allowFontScaling={false} style={globalStyles.noDataText}>
            No advance approval requests found matching your filters.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AdvanceApprovalSummaryScreen;

const uiStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: moderateScale(14),
  },
});