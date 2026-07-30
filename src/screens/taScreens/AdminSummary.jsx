import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Platform,

} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback } from "react";
import { useLazyAdminSummaryQuery } from "../../redux/rtk_query/apiSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  clearAdminSummaryArray,
  setAdminSummaryArray,
} from "../../redux/slices/TravelMaker";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import TravelMakerSummaryCard from "../../TaComponents/cards/TravelMakerSummaryCard";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import { getCustomColors } from "../../styles/CustomColors";
import FilterModal from "../../TaComponents/models/FilterModel";
import { setFilters, clearFilters } from "../../redux/slices/FilterSlice";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import * as styles from "../../styles/StyleSheet";
import { useFocusEffect } from "@react-navigation/native";
import { horizontalScale, moderateScale, verticalScale } from "../../globalstyles/Metrics";

const AdminSummaryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const getRedux = useSelector(
    (state) => state.TravelMaker.adminSummaryArray
  );
  const filters = useSelector((state) => state.travelFilter);

  const [trigger, { isLoading, isFetching, isError, error, data }] =
    useLazyAdminSummaryQuery();

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filtersCleared, setFiltersCleared] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const statusOptions = [
    { label: "Pending", value: 2 },
    { label: "Approved", value: 3 },
    { label: "Rejected", value: 4 },
    { label: "Return", value: 5 },
    { label: "Forward", value: 6 },
  ];

  const requirementOptions = [
    { label: "Accomodation", value: 1 },
    { label: "Cab", value: 2 },
    { label: "Bus", value: 3 },
    { label: "Train", value: 4 },
    { label: "Flight", value: 5 },
    { label: "All", value: 0 },
  ];

  const bookingStatusOptions = [
    { label: "Not Booked", value: 0 },
    { label: "Not Applicable", value: -1 },
    { label: "In Progress", value: -2 },
    { label: "Booked", value: -3 },
    { label: "Canceled", value: -4 },
    { label: "Not Booked and Inprogress", value: -5 },
    { label: "All", value: -6 },
    { label: "Rejected", value: -7 },
    { label: "Cancel Requested", value: 8 },
  ];

  const travelStatusOptions = [
    { label: "Travel Approved", value: "Travel_3" },
    { label: "Travel Cancel Pending", value: "TravelCancel_2" },
    { label: "Travel Cancel Approved", value: "TravelCancel_3" },
    { label: "Travel Cancel Rejected", value: "TravelCancel_4" },
    { label: "Travel Returned", value: "Travel_5" },
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
    [navigation, isDark]
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
            color: CustomColors.white,
          }}
        >
          Admin Summary
        </Text>
      ),

      headerTintColor: CustomColors.white,
      headerRight: HeaderRight,
    });
  }, [navigation, HeaderRight, isDark])
);


  const handleRefresh = async () => {
    setHasMoreData(true);
    setPage(1);
    dispatch(clearAdminSummaryArray());
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
      // tour_no: filters.tourNO,
      requestedDate: filters.requestedDate,
      type: filters.travelStatus,
      status: 3,
      booking_status: filters.bookingStatus,
      booking_type: filters.requirements,
      // makerid: filters.employeeCode ? filters.employeeCode : filters.employeeName ? filters.employeeName : ""
    }
    if (filters.tourNO) {
      payload.tour_no = filters.tourNO
    }
    if (filters.employeeCode) {
      payload.makerid = filters.employeeCode
    }

    if (filters.employeeName) {
      payload.makerid = filters.employeeName
    }

    if (filters.employeeBranch) {
      payload.branch_id = filters.employeeBranch.value
    }

    const result = await trigger(payload);

    if (result?.data) {
      if (result.data.data?.length > 0) {
        dispatch(setAdminSummaryArray({ data: result.data.data }));
        setPage((prev) => prev + 1);
      } else {
        setHasMoreData(false);
      }
    } else if (result?.error) {
      ToastMessage("Something went wrong");
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
      dispatch(clearAdminSummaryArray());
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

  const handleCardPress = (itemData) => {
    navigation.navigate("travel_maker_screen", {
      tourDataParams: itemData,
      from: itemData.from,
      tour_id: itemData.tourid,
    });
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    setFiltersCleared(true);
    setFilterModalVisible(false);
  };

  const getStatusLabel = (value) => {
    const status = statusOptions.find((option) => option.value === value);
    return status ? status.label : "Select Status";
  };

  const getRequirementsLabel = (value) => {
    const status = requirementOptions.find((option) => option.value === value);
    return status ? status.label : "Select Requirement";
  };

  const getBookingStatusLabel = (value) => {
    const status = bookingStatusOptions.find((option) => option.value === value);
    return status ? status.label : "Select Booking Status";
  };

  const getTravelStatusLabel = (value) => {
    const status = travelStatusOptions.find((option) => option.value === value);
    return status ? status.label : "Select Travel Status";
  };

  if (isFetching && page === 1) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={globalStyles.loadingText}>Please wait...</Text>
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
        title={"Travel Filter"}
        isAdmin={true}
        getRequirementsLabel={getRequirementsLabel}
        getBookingStatusLabel={getBookingStatusLabel}
        getTravelStatusLabel={getTravelStatusLabel}
        requirementsOptions={requirementOptions}
        bookingStatusOptions={bookingStatusOptions}
        travelStatusOptions={travelStatusOptions}
      />

      {getRedux?.length > 0 ? (
        <RowList
          data={getRedux}
          RenderItem={TravelMakerSummaryCard}
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
            No travel requests found matching your filters.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AdminSummaryScreen;
