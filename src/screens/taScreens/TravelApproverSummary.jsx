import React, { useState, useEffect, useCallback, useLayoutEffect } from "react";
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

import { useLazyTravelApproveSummaryQuery } from "../../redux/rtk_query/apiSlice";
import {
  clearTravelApproverSummaryArray,
  setTravelApproverSummaryArray,
} from "../../redux/slices/TravelMaker";
import { setFilters, clearFilters } from "../../redux/slices/FilterSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import TravelMakerSummaryCard from "../../TaComponents/cards/TravelMakerSummaryCard";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import FilterModal from "../../TaComponents/models/FilterModel";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import { moderateScale } from "../../globalstyles/Metrics";

const TravelApproverSummaryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const getRedux = useSelector(
    (state) => state.TravelMaker.travelApproverSummaryArray
  );
  const filters = useSelector((state) => state.travelFilter);

  const [triggerSummary, { isFetching }] = useLazyTravelApproveSummaryQuery();

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

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
          Travel Approver Summary
        </Text>
      ),
      headerTintColor: CustomColors.textWhite,
      headerRight: HeaderRight,
    });
  }, [navigation, HeaderRight, CustomColors, globalStyles]);

  const loadData = useCallback(
    async (pageNum, isInitial = false, activeFilters = filters) => {
      if (!hasMoreData && !isInitial) return;
      if (!isInitial) setIsLoadingMore(true);

      const statusValue =
        typeof activeFilters.status === "object"
          ? activeFilters.status?.value
          : activeFilters.status;

      // Approver summary payload: Tour No, Requested Date, and Status Filter
      const payload = {
        page: pageNum,
        tour_no: activeFilters.tourNO || "",
        request_date: activeFilters.requestedDate || "",
        type: "tour",
        status: statusValue !== undefined && statusValue !== null && statusValue !== "" ? statusValue : 2,
      };

      try {
        const result = await triggerSummary(payload).unwrap();

        if (result?.data?.length > 0) {
          dispatch(setTravelApproverSummaryArray({ data: result.data }));
          setPage(pageNum + 1);
        } else {
          setHasMoreData(false);
        }
      } catch (err) {
        ToastMessage("Something went wrong loading summary.");
      } finally {
        if (!isInitial) setIsLoadingMore(false);
      }
    },
    [dispatch, filters, hasMoreData, triggerSummary]
  );

  const handleRefresh = useCallback(
    async (customFilters = filters) => {
      setHasMoreData(true);
      setPage(1);
      dispatch(clearTravelApproverSummaryArray());
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
      dispatch(clearTravelApproverSummaryArray());
      dispatch(clearFilters());
    };
  }, [dispatch]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData && !isFetching) {
      loadData(page, false, filters);
    }
  };

  const handleCardPress = (itemData) => {
    navigation.navigate("travel_edit_screen", {
      tourDataParams: itemData,
      from: "CHECKER",
      tour_id: itemData?.tourid || itemData?.id,
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

  const getStatusLabel = (value) => {
    const status = statusOptions.find((option) => option.value === value);
    return status ? status.label : "Select Status";
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
        statusOptions={statusOptions}
        getStatusLabel={getStatusLabel}
        isTourApproval={true}
        isChecker={false}
        isAdmin={false}
        title={"Travel Approver Filter"}
      />

      {getRedux?.length > 0 ? (
        <RowList
          data={getRedux}
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
            No travel requests found matching your filters.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default TravelApproverSummaryScreen;