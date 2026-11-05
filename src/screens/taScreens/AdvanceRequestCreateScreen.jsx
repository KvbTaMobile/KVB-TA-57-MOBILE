import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
  StyleSheet,
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
import {
  clearAdvanceMakerSummaryArray,
  setAdvanceMakerSummaryArray,
} from "../../redux/slices/TravelMaker";
import { setFilters, clearFilters } from "../../redux/slices/FilterSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import TravelMakerSummaryCard from "../../TaComponents/cards/TravelMakerSummaryCard";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import FilterModal from "../../TaComponents/models/FilterModel";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import { moderateScale } from "../../globalstyles/Metrics";

const AdvanceRequestCreateScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const advanceRequestList = useSelector(
    (state) => state.TravelMaker.advanceMakerSummaryArray || []
  );
  const filters = useSelector((state) => state.travelFilter);

  // Safe hook resolution calling the newly mapped advance_summary endpoint hook
  const useAdvancemakerQuery = apiSliceHooks.useLazyGetAdvancemakerSummaryQuery;

  if (!useAdvancemakerQuery) {
    console.error("RTK Query Hook 'getAdvancemakerSummary' is missing in apiSlice.js");
  }

  const [triggerAdvancemakerSummary, { isFetching }] = useAdvancemakerQuery
    ? useAdvancemakerQuery()
    : [() => ({ unwrap: async () => ({ data: [] }) }), { isFetching: false }];

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMoreData;

  const HeaderRight = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => setFilterModalVisible(true)}
        style={{ marginRight: 15 }}
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

  const loadData = useCallback(
    async (pageNum, isInitial = false, activeFilters = {}) => {
      if (!hasMoreRef.current && !isInitial) return;
      if (!isInitial) setIsLoadingMore(true);

      let val = "";
      if (activeFilters?.tourNO) {
        val += `&tour_no=${activeFilters.tourNO}`;
      }
      if (activeFilters?.requestedDate) {
        val += `&request_date=${activeFilters.requestedDate}`;
      }

      try {
        const result = await triggerAdvancemakerSummary({
          page: pageNum,
          val: val,
        }).unwrap();

        if (result?.data?.length > 0) {
          dispatch(
            setAdvanceMakerSummaryArray({
              data: result.data,
              count: result.count || 0,
            })
          );
          setPage(pageNum + 1);
          const hasNext = result.pagination?.has_next ?? false;
          setHasMoreData(hasNext);
          hasMoreRef.current = hasNext;
        } else {
          setHasMoreData(false);
          hasMoreRef.current = false;
        }
      } catch (err) {
        ToastMessage("Failed to load tour summary list.");
      } finally {
        if (!isInitial) setIsLoadingMore(false);
      }
    },
    [dispatch, triggerAdvancemakerSummary]
  );

  const handleRefresh = useCallback(
    async (customFilters = filters) => {
      setHasMoreData(true);
      hasMoreRef.current = true;
      setPage(1);
      dispatch(clearAdvanceMakerSummaryArray());
      await loadData(1, true, customFilters);
    },
    [dispatch, loadData, filters]
  );

  useFocusEffect(
    useCallback(() => {
      handleRefresh(filters);
    }, [filters, handleRefresh])
  );

  useEffect(() => {
    return () => {
      dispatch(clearAdvanceMakerSummaryArray());
      dispatch(clearFilters());
    };
  }, [dispatch]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData && !isFetching) {
      loadData(page, false, filters);
    }
  };

  const handleCardPress = (itemData) => {
    const selectedTourId = itemData?.tourgid || itemData?.id || itemData?.tourid || 0;

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
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    setFilterModalVisible(false);
  };

  if (isFetching && page === 1) {
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

      {advanceRequestList?.length > 0 ? (
        <RowList
          data={advanceRequestList}
          RenderItem={TravelMakerSummaryCard}
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
            No Data Found...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AdvanceRequestCreateScreen;