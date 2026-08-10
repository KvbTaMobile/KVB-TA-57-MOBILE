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

// Date Formatter matching Angular "dd-MMM-yyyy" (e.g., 01-Aug-2026)
const formatDateForFilter = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = d.getDate()?.toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const TravelMakerSummaryScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const getRedux = useSelector(
    (state) => state.TravelMaker.travelMakerSummaryArray
  );
  const filters = useSelector((state) => state.travelFilter);
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
  const [filterModalVisible, setFilterModalVisible] = useState(false);

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
      backgroundColor: CustomColors.liteBlue || "#E8F0FE",
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(15),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderColor || "#D1D5DB",
    },
    onBehalfText: {
      fontSize: moderateScale(16),
      color: CustomColors.darkGray || "#374151",
      fontWeight: "500",
    },
    onBehalfEmployeeName: {
      fontWeight: "bold",
      color: CustomColors.primaryBlue || "#1D4ED8",
      fontSize: moderateScale(16),
    },
  });

  const HeaderRight = useCallback(
    () => (
      <View style={screenStyles.headerRightContainer}>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={screenStyles.headerButton}
        >
          <MaterialIcons
            name="filter-list"
            size={28}
            color={CustomColors.white}
          />
        </TouchableOpacity>
        {isMaker && (
          <TouchableOpacity
            onPress={() => handleCreateTour()}
            style={screenStyles.headerButton}
          >
            <MaterialIcons name="add" size={28} color={CustomColors.white} />
          </TouchableOpacity>
        )}
      </View>
    ),
    [navigation, isDark, CustomColors, selectedEmployee, isMaker]
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

  const loadData = async (pageNum, isInitial = false) => {
    if (isFetchingRef.current) return;
    if (!hasMoreData && !isInitial) return;

    isFetchingRef.current = true;
    if (!isInitial) setIsLoadingMore(true);

    const payload = {
      page: pageNum,
    };

    // Extract search query values
    const tourNoVal = filters?.tourNO || filters?.tour_no;
    const dateVal = filters?.requestedDate || filters?.request_date;

    if (tourNoVal && String(tourNoVal).trim() !== "") {
      payload.tour_no = String(tourNoVal).trim();
    }
    if (dateVal) {
      payload.request_date = formatDateForFilter(dateVal);
    }

    if (mode === "onbehalf" || selectedEmployee) {
      const onBehalfId = selectedEmployee?.employeegid || selectedEmployee?.id;
      if (onBehalfId) {
        payload.onbehalf = onBehalfId;
      }
    }

    try {
      const result = await trigger(payload).unwrap();

      const summaryList = result?.data || [];
      const hasNextPage = result?.pagination?.has_next ?? false;

      if (Array.isArray(summaryList) && summaryList.length > 0) {
        if (isInitial) {
          dispatch(clearTravelMakerSummaryArray());
        }
        dispatch(setTravelMakerSummaryArray({ data: summaryList }));
        setHasMoreData(hasNextPage);
        setPage(pageNum + 1);
      } else {
        if (isInitial) {
          dispatch(clearTravelMakerSummaryArray());
        }
        setHasMoreData(false);
      }
    } catch (err) {
      ToastMessage("Failed to fetch tour data.");
      setHasMoreData(false);
    } finally {
      isFetchingRef.current = false;
      if (!isInitial) setIsLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setHasMoreData(true);
    setPage(1);
    await loadData(1, true);
  }, [filters, mode, selectedEmployee]);

  // Initial load when screen gains focus
  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [])
  );

  useEffect(() => {
    return () => {
      dispatch(clearTravelMakerSummaryArray());
      dispatch(clearFilters());
    };
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData && !isFetching && !isFetchingRef.current) {
      loadData(page, false);
    }
  };

  const handleCreateTour = () => {
    navigation.navigate("travel_create_screen", {
      from: "MAKER",
      tour_id: "NEW",
      onbehalf: selectedEmployee?.employeegid || selectedEmployee?.id,
      onbehalfname: selectedEmployee?.employee_name || selectedEmployee?.full_name,
    });
  };

  const handleCardPress = (itemData) => {
    navigation.navigate("travel_edit_screen", {
      tourDataParams: itemData,
      from: "MAKER",
      tour_id: itemData.id || itemData.requestno,
      onbehalf: selectedEmployee?.employeegid || selectedEmployee?.id,
      onbehalfname: selectedEmployee?.employee_name || selectedEmployee?.full_name,
    });
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    handleRefresh();
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    setFilterModalVisible(false);
    setTimeout(() => {
      handleRefresh();
    }, 100);
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
      {/* On Behalf Header Banner */}
      {(mode === "onbehalf" || selectedEmployee) && (
        <View style={screenStyles.onBehalfContainer}>
          <Text allowFontScaling={false} style={screenStyles.onBehalfText}>
            On Behalf Employee -{" "}
            <Text
              allowFontScaling={false}
              style={screenStyles.onBehalfEmployeeName}
            >
              {selectedEmployee?.employee_name || selectedEmployee?.full_name}
            </Text>
          </Text>
        </View>
      )}

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