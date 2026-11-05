import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import * as apiSliceHooks from "../../redux/rtk_query/apiSlice";
import { setFilters, clearFilters } from "../../redux/slices/FilterSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import TravelMakerSummaryCard from "../../TaComponents/cards/TravelMakerSummaryCard";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import FilterModal from "../../TaComponents/models/FilterModel";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import { moderateScale } from "../../globalstyles/Metrics";

const AdvanceRequestCreateScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const filters = useSelector((state) => state.travelFilter);
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const useAdvancemakerQuery = apiSliceHooks.useLazyGetAdvancemakerSummaryQuery;
  if (!useAdvancemakerQuery) {
    console.error("RTK Query Hook 'getAdvancemakerSummary' is missing in apiSlice.js");
  }
  const [triggerAdvancemakerSummary, { isFetching }] = useAdvancemakerQuery
    ? useAdvancemakerQuery()
    : [() => ({ unwrap: async () => ({ data: [] }) }), { isFetching: false }];

  // LOCAL list state – isolated from other screens
  const [advanceRequestList, setAdvanceRequestList] = useState([]);
  const [page, setPage] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);

  const HeaderRight = useCallback(
    () => (
      <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={{ marginRight: 15 }}>
        <Icon name="filter-list" size={28} color={CustomColors.white} />
      </TouchableOpacity>
    ),
    [CustomColors.white]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerTitle: () => (
        <Text
          allowFontScaling={false}
          style={{
            ...globalStyles.headerTitle,
            fontSize: moderateScale(18),
            fontWeight: "600",
            color: CustomColors.textWhite,
          }}
        >
          eClaim Advance Request Add
        </Text>
      ),
      headerTintColor: CustomColors.textWhite,
      headerRight: HeaderRight,
    });
  }, [navigation, HeaderRight, CustomColors, globalStyles]);

  const buildQuery = (activeFilters = {}) => {
    let val = "";
    if (activeFilters?.tourNO) val += `&tour_no=${activeFilters.tourNO}`;
    if (activeFilters?.requestedDate) val += `&request_date=${activeFilters.requestedDate}`;
    return val;
  };

  const loadData = useCallback(
    async (pageNum, isInitial, activeFilters) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (isInitial) setIsInitialLoading(true);
      else setIsLoadingMore(true);

      const currentReqId = ++requestIdRef.current;

      try {
        const queryFilters = activeFilters !== undefined ? activeFilters : filtersRef.current;
        const result = await triggerAdvancemakerSummary({
          page: pageNum,
          val: buildQuery(queryFilters),
        }).unwrap();

        // If another request was started while this was in flight, discard this response
        if (currentReqId !== requestIdRef.current) return;

        const rows = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
          ? result
          : Array.isArray(result?.data?.data)
          ? result.data.data
          : [];

        setAdvanceRequestList((prev) => {
          if (isInitial) return rows;
          const seen = new Set(prev.map((r) => r.id ?? r.tourgid ?? r.tour_id ?? r.requestno));
          return [...prev, ...rows.filter((r) => !seen.has(r.id ?? r.tourgid ?? r.tour_id ?? r.requestno))];
        });

        const hasNext = rows.length > 0 && !!(result?.pagination?.has_next ?? result?.has_next ?? false);
        setPage(pageNum + 1);
        setHasMoreData(hasNext);
        hasMoreRef.current = hasNext;
      } catch (err) {
        if (currentReqId === requestIdRef.current) {
          ToastMessage("Failed to load tour summary list.");
        }
      } finally {
        if (currentReqId === requestIdRef.current) {
          loadingRef.current = false;
          setIsInitialLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [triggerAdvancemakerSummary]
  );

  const handleRefresh = useCallback(
    async (customFilters) => {
      loadingRef.current = false;
      hasMoreRef.current = true;
      setHasMoreData(true);
      setPage(1);
      const activeFilters = customFilters !== undefined ? customFilters : filtersRef.current;
      await loadData(1, true, activeFilters);
    },
    [loadData]
  );

  // Runs on initial focus and when screen is focused
  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );

  useEffect(() => {
    return () => {
      dispatch(clearFilters());
    };
  }, [dispatch]);

  const handleLoadMore = () => {
    if (
      isInitialLoading ||
      isLoadingMore ||
      isFetching ||
      loadingRef.current ||
      !hasMoreRef.current ||
      advanceRequestList.length === 0
    ) {
      return;
    }
    loadData(page, false, filtersRef.current);
  };

  const handleCardPress = (itemData) => {
    const selectedTourId =
      itemData?.tourgid || itemData?.tour_id || itemData?.tourid || itemData?.id || 0;
    navigation.navigate("advance_maker_edit", {
      tourDataParams: itemData,
      from: "ADVANCE_CREATE",
      tour_id: selectedTourId,
      id: itemData?.id || selectedTourId,
    });
  };

  const applyFilters = (appliedFilters) => {
    dispatch(setFilters(appliedFilters));
    setFilterModalVisible(false);
    handleRefresh(appliedFilters);
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    setFilterModalVisible(false);
    handleRefresh({});
  };

  const renderCardItem = useCallback(
    (props) => <TravelMakerSummaryCard {...props} isAdvance={true} />,
    []
  );

  if (isInitialLoading && advanceRequestList.length === 0) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={globalStyles.loadingText}>
          Loading eligible tours...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <FilterModal
        isVisible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        dispatch={dispatch}
        setFilters={setFilters}
        applyFilters={applyFilters}
        clearAllFilters={clearAllFilters}
        isChecker={false}
        isAdmin={false}
        title={"Advance Request Filter"}
      />

      {advanceRequestList.length > 0 ? (
        <RowList
          data={advanceRequestList}
          RenderItem={renderCardItem}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          hasMoreData={hasMoreData}
          onRefresh={() => handleRefresh()}
          refreshing={isInitialLoading}
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

export default AdvanceRequestCreateScreen;