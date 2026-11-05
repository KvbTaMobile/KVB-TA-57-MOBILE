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

import { useLazyGetAdvanceMakerSummaryQuery } from "../../redux/rtk_query/apiSlice";
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

const AdvanceMakerSummaryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const advanceSummaryData = useSelector(
    (state) => state.TravelMaker.advanceMakerSummaryArray || []
  );
  const filters = useSelector((state) => state.travelFilter);

  // Lazy query matching your unchanged apiSlice endpoint
  const [triggerAdvanceSummary, { isFetching }] = useLazyGetAdvanceMakerSummaryQuery();

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
            fontSize: moderateScale(20),
            fontWeight: "600",
            color: CustomColors.textWhite,
          }}
        >
          Advance Request Summary
        </Text>
      ),
      headerTintColor: CustomColors.textWhite,
      headerRight: HeaderRight,
    });
  }, [navigation, HeaderRight, CustomColors, globalStyles]);

  // Main data loader constructing `val` parameter
  const loadData = useCallback(
    async (pageNum, isInitial = false, activeFilters = {}) => {
      if (!hasMoreRef.current && !isInitial) return;
      if (!isInitial) setIsLoadingMore(true);

      // 🔑 Build `val` string matching Angular format: &tour_no=...&request_date=...
      let val = "";
      if (activeFilters?.tourNO) {
        val += `&tour_no=${activeFilters.tourNO}`;
      }
      if (activeFilters?.requestedDate) {
        val += `&request_date=${activeFilters.requestedDate}`;
      }

      try {
        const result = await triggerAdvanceSummary({
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
        ToastMessage("Something went wrong loading advance summary.");
      } finally {
        if (!isInitial) setIsLoadingMore(false);
      }
    },
    [dispatch, triggerAdvanceSummary]
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
    navigation.navigate("advance_maker_edit", {
      tourDataParams: itemData,
      from: "ADVANCE_MAKER",
      tour_id: itemData?.tourgid || itemData?.id,
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
          Please wait...
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

      {advanceSummaryData?.length > 0 ? (
        <RowList
          data={advanceSummaryData}
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
            No advance requests found.
          </Text>
        </View>
      )}

      {/* Create Advance Floating Button */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          backgroundColor: CustomColors.appThemeColor,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          elevation: 5,
        }}
        onPress={() =>
          navigation.navigate("advance_request_create", {
            from: "ADVANCE_MAKER",
            tour_id: 0,
          })
        }
      >
        <Icon name="add" size={28} color={CustomColors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default AdvanceMakerSummaryScreen;