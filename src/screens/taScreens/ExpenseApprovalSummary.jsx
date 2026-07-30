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
import * as styles from "../../styles/StyleSheet"; // Renamed for clarity
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";

const TravelMakerSummaryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isDark = useSelector(state => state.theme.isDark);
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
      </View>
    ),
    [navigation, isDark]
  );
  const screenStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.backgroundGray,
    },

    headerRightContainer: {
      flexDirection: "row",
      alignItems: "center",
    },

    headerButton: {
      marginLeft: horizontalScale(15),
    },

    onBehalfContainer: {
      backgroundColor: CustomColors.lightBlue,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(15),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.borderColor,
    },

    onBehalfText: {
      fontSize: moderateScale(16),
      color: CustomColors.darkGray,
    },

    onBehalfEmployeeName: {
      fontWeight: "bold",
      fontSize: moderateScale(16),
      color: CustomColors.primaryBlue,
    },
  });
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
            fontWeight: "600",
            color: CustomColors.white,
          }}
        >
          Expense Approval Summary
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
    navigation.navigate('ExpenseDetail', { expense: expenseData, from: 'Checker' });
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

  if (isFetching && page === 1) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={globalStyles.loadingText}>Please wait...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={screenStyles.container}>
      {mode !== "self" && (
        <View style={screenStyles.onBehalfContainer}>
          <Text allowFontScaling={false} style={screenStyles.onBehalfText}>
            On Behalf Employee -{" "}
            <Text allowFontScaling={false} style={screenStyles.onBehalfEmployeeName}>
              {selectedEmployee?.employee_name}
            </Text>
          </Text>
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



export default TravelMakerSummaryScreen;