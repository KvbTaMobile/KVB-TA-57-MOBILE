import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  FlatList,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";

import { useLazyGetBranchwisePendingReportQuery } from "../../redux/rtk_query/apiSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../styles/Metrics";
import { Fonts } from "../../styles/Fonts";

const RADIO_OPTIONS = [
  { value: 1, display: "Self", icon: "account" },
  { value: 0, display: "Other", icon: "account-group" },
];

const BranchwisePendingReportScreen = ({ navigation, isEmbedded = false }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const authRedux = useSelector((state) => state.auth);
  const employeeId = authRedux?.user?.employee_id || authRedux?.user?.id || 0;

  // Selected radio option: 1 = Self, 0 = Other
  const [selectedType, setSelectedType] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("card"); // 'card' | 'table'

  // Report state
  const [reportList, setReportList] = useState([]);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // RTK Query hook
  const [triggerGetBranchwise, { isFetching }] = useLazyGetBranchwisePendingReportQuery();

  // Navigation Header
  useLayoutEffect(() => {
    if (isEmbedded) return;
    navigation.setOptions({
      title: "Branch Wise Pending",
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },
      headerTintColor: CustomColors.textWhite || "#FFFFFF",
      headerTitleStyle: {
        fontFamily: Fonts.Bold,
        fontSize: moderateScale(18),
        color: CustomColors.textWhite || "#FFFFFF",
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setViewMode((prev) => (prev === "card" ? "table" : "card"))}
          style={{ marginRight: horizontalScale(14), padding: 4 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={viewMode === "card" ? "table-large" : "card-text-outline"}
            size={24}
            color={CustomColors.textWhite || "#FFFFFF"}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, CustomColors, viewMode, isEmbedded]);

  // Fetch Report Data
  const fetchReportData = useCallback(
    async (pageToLoad = 1, typeValue = selectedType, isRefresh = false) => {
      try {
        if (pageToLoad > 1) {
          setIsLoadingMore(true);
        }
        const empIdParam = typeValue === 1 ? employeeId : 0;
        const response = await triggerGetBranchwise({
          empId: empIdParam,
          page: pageToLoad,
        }).unwrap();

        const data = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination || {};

        if (isMountedRef.current) {
          if (pageToLoad === 1 || isRefresh) {
            setReportList(data);
          } else {
            setReportList((prev) => [...prev, ...data]);
          }
          setCurrentPage(pagination?.index || pageToLoad);
          setHasNext(Boolean(pagination?.has_next));
          setHasPrevious(Boolean(pagination?.has_previous));
        }
      } catch (err) {
        const isCanceled =
          !isMountedRef.current ||
          err?.name === "AbortError" ||
          (err?.status === "FETCH_ERROR" &&
            (String(err?.error || "").toLowerCase().includes("cancel") ||
             String(err?.error || "").toLowerCase().includes("abort"))) ||
          String(err?.message || "").toLowerCase().includes("cancel") ||
          String(err?.error || "").toLowerCase().includes("cancel");

        if (isCanceled) {
          return;
        }

        console.error("Error fetching Branchwise Pending Report:", err);
        if (pageToLoad === 1 && isMountedRef.current) {
          setReportList([]);
        }
        if (isMountedRef.current) {
          ToastMessage(err?.data?.message || err?.message || "Failed to load branchwise report");
        }
      } finally {
        if (isMountedRef.current) {
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [employeeId, selectedType, triggerGetBranchwise]
  );

  // Load on mount and when selectedType changes
  useEffect(() => {
    fetchReportData(1, selectedType, true);
  }, [selectedType, fetchReportData]);

  // Pull to refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    fetchReportData(1, selectedType, true);
  };

  // Radio button click handler
  const handleSelectType = (value) => {
    if (value === selectedType) return;
    setSelectedType(value);
    setCurrentPage(1);
    setReportList([]);
    setHasNext(false);
  };

  // Load More on Scroll (Infinite Scroll for cards)
  const handleLoadMore = () => {
    if (hasNext && !isFetching && !isLoadingMore && !isRefreshing && reportList.length > 0) {
      fetchReportData(currentPage + 1, selectedType, false);
    }
  };

  // Pagination Handlers (for Table View)
  const handlePreviousPage = () => {
    if (!hasPrevious || currentPage <= 1 || isFetching || isLoadingMore) return;
    fetchReportData(currentPage - 1, selectedType, true);
  };

  const handleNextPage = () => {
    if (!hasNext || isFetching || isLoadingMore) return;
    fetchReportData(currentPage + 1, selectedType, false);
  };

  // Footer Loader for Card View
  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={componentStyles.listFooterLoader}>
          <ActivityIndicator size="small" color={CustomColors.appThemeColor || "#4F806D"} />
          <Text style={[componentStyles.listFooterText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#909497") }]}>
            Loading more branches...
          </Text>
        </View>
      );
    }
    if (!hasNext && filteredList.length > 0) {
      return (
        <View style={componentStyles.listFooterEnd}>
          <Text style={[componentStyles.listFooterEndText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#909497") }]}>
            All {filteredList.length} branches loaded
          </Text>
        </View>
      );
    }
    return <View style={{ height: verticalScale(16) }} />;
  };

  // Client-side search filtering by branch name
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return reportList;
    const query = searchQuery.trim().toLowerCase();
    return reportList.filter((item) =>
      (item?.branch_name || "").toLowerCase().includes(query)
    );
  }, [reportList, searchQuery]);

  // Helper for total pending calculation per branch
  const calculateTotalPending = (item) => {
    const parse = (val) => Number(val) || 0;
    return (
      parse(item?.one_two) +
      parse(item?.three_ten) +
      parse(item?.eleven_thirty) +
      parse(item?.thirtyone_sixty) +
      parse(item?.above_sixty)
    );
  };

  // Card View Renderer
  const renderCardItem = ({ item, index }) => {
    const serialNumber = index + 1;
    const totalPending = calculateTotalPending(item);

    return (
      <View
        style={[
          componentStyles.cardContainer,
          {
            backgroundColor: isDark ? "#1e293b" : CustomColors.white,
            borderColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
          },
        ]}
      >
        {/* Card Header: Serial Number, Branch Name & Total Badge */}
        <View style={componentStyles.cardHeader}>
          <View style={componentStyles.branchInfoContainer}>
            <View
              style={[
                componentStyles.serialBadge,
                { backgroundColor: isDark ? "#334155" : (CustomColors.appliteThemecolor || "#FFF3E0") },
              ]}
            >
              <Text
                style={[
                  componentStyles.serialText,
                  { color: isDark ? "#6ee7b7" : (CustomColors.appThemeColor || "#4F806D") },
                ]}
              >
                #{serialNumber}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={2}
                style={[
                  componentStyles.branchNameText,
                  { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#1A1A1A") },
                ]}
              >
                {item?.branch_name || "Unknown Branch"}
              </Text>
            </View>
          </View>

          {totalPending > 0 && (
            <View
              style={[
                componentStyles.totalBadge,
                { backgroundColor: isDark ? "#3b0764" : "#EDE7F6" },
              ]}
            >
              <Text style={[componentStyles.totalBadgeText, { color: isDark ? "#d8b4fe" : "#5E35B1" }]}>
                {totalPending} Total
              </Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View
          style={[
            componentStyles.divider,
            { backgroundColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#F0F0F0") },
          ]}
        />

        {/* Aging Buckets Grid */}
        <View style={componentStyles.agingGrid}>
          {/* 1 to 2 Days */}
          <View style={[componentStyles.agingItem, { backgroundColor: isDark ? "#064e3b" : "#E8F5E9" }]}>
            <Text style={[componentStyles.agingLabel, { color: isDark ? "#6ee7b7" : "#2E7D32" }]}>1 - 2 Days</Text>
            <Text style={[componentStyles.agingValue, { color: isDark ? "#a7f3d0" : "#1B5E20" }]}>
              {item?.one_two ?? 0}
            </Text>
          </View>

          {/* 3 to 10 Days */}
          <View style={[componentStyles.agingItem, { backgroundColor: isDark ? "#1e3a5f" : "#E3F2FD" }]}>
            <Text style={[componentStyles.agingLabel, { color: isDark ? "#93c5fd" : "#1565C0" }]}>3 - 10 Days</Text>
            <Text style={[componentStyles.agingValue, { color: isDark ? "#bfdbfe" : "#0D47A1" }]}>
              {item?.three_ten ?? 0}
            </Text>
          </View>

          {/* 11 to 30 Days */}
          <View style={[componentStyles.agingItem, { backgroundColor: isDark ? "#451a03" : "#FFF8E1" }]}>
            <Text style={[componentStyles.agingLabel, { color: isDark ? "#fcd34d" : "#F57F17" }]}>11 - 30 Days</Text>
            <Text style={[componentStyles.agingValue, { color: isDark ? "#fde68a" : "#E65100" }]}>
              {item?.eleven_thirty ?? 0}
            </Text>
          </View>

          {/* 31 to 60 Days */}
          <View style={[componentStyles.agingItem, { backgroundColor: isDark ? "#431407" : "#FFF3E0" }]}>
            <Text style={[componentStyles.agingLabel, { color: isDark ? "#fdba74" : "#E65100" }]}>31 - 60 Days</Text>
            <Text style={[componentStyles.agingValue, { color: isDark ? "#fed7aa" : "#BF360C" }]}>
              {item?.thirtyone_sixty ?? 0}
            </Text>
          </View>

          {/* Above 60 Days */}
          <View style={[componentStyles.agingItem, { backgroundColor: isDark ? "#450a0a" : "#FFEBEE" }]}>
            <Text style={[componentStyles.agingLabel, { color: isDark ? "#fca5a5" : "#C62828" }]}>&gt; 60 Days</Text>
            <Text style={[componentStyles.agingValue, { color: isDark ? "#fecaca" : "#B71C1C" }]}>
              {item?.above_sixty ?? 0}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Table View Renderer
  const renderTableView = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ paddingHorizontal: horizontalScale(16) }}
      >
        <View
          style={[
            componentStyles.tableContainer,
            {
              backgroundColor: isDark ? "#1e293b" : CustomColors.white,
              borderColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
            },
          ]}
        >
          {/* Table Header */}
          <View
            style={[
              componentStyles.tableRow,
              componentStyles.tableHeaderRow,
              { backgroundColor: CustomColors.appThemeColor || "#4F806D" },
            ]}
          >
            <Text style={[componentStyles.tableHeaderCell, { width: 50 }]}>S.No</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 170, textAlign: "left" }]}>
              Branch
            </Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 85 }]}>1 to 2 Days</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 85 }]}>3 to 10 Days</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 85 }]}>11 to 30 Days</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 85 }]}>31 to 60 Days</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 75 }]}>More</Text>
          </View>

          {/* Table Body */}
          {filteredList.map((item, index) => {
            const serialNumber = index + 1;
            const isEven = index % 2 === 0;

            return (
              <View
                key={`${item?.branch_name || index}-${index}`}
                style={[
                  componentStyles.tableRow,
                  {
                    backgroundColor: isEven
                      ? (isDark ? "#1e293b" : CustomColors.white)
                      : (isDark ? "#0f172a" : (CustomColors.backgroundLightGray || "#F9F9F9")),
                    borderBottomColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#EEEEEE"),
                  },
                ]}
              >
                <Text style={[componentStyles.tableCell, { width: 50, color: isDark ? "#94a3b8" : CustomColors.textGray }]}>
                  {serialNumber}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[
                    componentStyles.tableCell,
                    {
                      width: 170,
                      textAlign: "left",
                      fontFamily: Fonts.SemiBold || Fonts.Regular,
                      color: isDark ? "#f8fafc" : CustomColors.textBlack,
                    },
                  ]}
                >
                  {item?.branch_name || "-"}
                </Text>
                <Text
                  style={[
                    componentStyles.tableCell,
                    {
                      width: 85,
                      fontWeight: Number(item?.one_two) > 0 ? "700" : "400",
                      color: Number(item?.one_two) > 0 ? (isDark ? "#4ade80" : "#2E7D32") : (isDark ? "#64748b" : CustomColors.textGray),
                    },
                  ]}
                >
                  {item?.one_two ?? 0}
                </Text>
                <Text
                  style={[
                    componentStyles.tableCell,
                    {
                      width: 85,
                      fontWeight: Number(item?.three_ten) > 0 ? "700" : "400",
                      color: Number(item?.three_ten) > 0 ? (isDark ? "#60a5fa" : "#1565C0") : (isDark ? "#64748b" : CustomColors.textGray),
                    },
                  ]}
                >
                  {item?.three_ten ?? 0}
                </Text>
                <Text
                  style={[
                    componentStyles.tableCell,
                    {
                      width: 85,
                      fontWeight: Number(item?.eleven_thirty) > 0 ? "700" : "400",
                      color: Number(item?.eleven_thirty) > 0 ? (isDark ? "#fbbf24" : "#E65100") : (isDark ? "#64748b" : CustomColors.textGray),
                    },
                  ]}
                >
                  {item?.eleven_thirty ?? 0}
                </Text>
                <Text
                  style={[
                    componentStyles.tableCell,
                    {
                      width: 85,
                      fontWeight: Number(item?.thirtyone_sixty) > 0 ? "700" : "400",
                      color: Number(item?.thirtyone_sixty) > 0 ? (isDark ? "#fb923c" : "#D84315") : (isDark ? "#64748b" : CustomColors.textGray),
                    },
                  ]}
                >
                  {item?.thirtyone_sixty ?? 0}
                </Text>
                <Text
                  style={[
                    componentStyles.tableCell,
                    {
                      width: 75,
                      fontWeight: Number(item?.above_sixty) > 0 ? "700" : "400",
                      color: Number(item?.above_sixty) > 0 ? (isDark ? "#f87171" : "#C62828") : (isDark ? "#64748b" : CustomColors.textGray),
                    },
                  ]}
                >
                  {item?.above_sixty ?? 0}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        componentStyles.container,
        { backgroundColor: isDark ? "#0f172a" : (CustomColors.backgroundLightGray || "#F5F5F5") },
      ]}
    >
      {/* Top Section: Title & Radio Buttons */}
      <View
        style={[
          componentStyles.topControlCard,
          {
            backgroundColor: isDark ? "#1e293b" : CustomColors.white,
            borderColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
          },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: verticalScale(12) }}>
          <Text
            style={[
              componentStyles.screenHeading,
              { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#111111"), marginBottom: 0 },
            ]}
          >
            eClaim TA Bills Branch Wise Pending
          </Text>
          {isEmbedded && (
            <TouchableOpacity
              onPress={() => setViewMode((prev) => (prev === "card" ? "table" : "card"))}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: horizontalScale(10),
                paddingVertical: verticalScale(6),
                borderRadius: 6,
                backgroundColor: CustomColors.appThemeColor,
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={viewMode === "card" ? "table-large" : "card-text-outline"}
                size={16}
                color={CustomColors.textWhite || "#FFFFFF"}
              />
              <Text style={{ color: CustomColors.textWhite || "#FFFFFF", fontSize: moderateScale(11), fontFamily: Fonts.SemiBold, marginLeft: 4 }}>
                {viewMode === "card" ? "Table" : "Cards"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Radio Selector: Self vs Other */}
        <View style={componentStyles.radioContainer}>
          {RADIO_OPTIONS.map((opt) => {
            const isSelected = selectedType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleSelectType(opt.value)}
                activeOpacity={0.8}
                style={[
                  componentStyles.radioButton,
                  {
                    borderColor: isSelected
                      ? CustomColors.appThemeColor || "#4F806D"
                      : isDark
                      ? "#475569"
                      : CustomColors.textInputBorderColor || "#CCCCCC",
                    backgroundColor: isSelected
                      ? isDark
                        ? "#064e3b"
                        : CustomColors.appliteThemecolor || "#E8F5E9"
                      : isDark
                      ? "#334155"
                      : CustomColors.white,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isSelected ? "radiobox-marked" : "radiobox-blank"}
                  size={20}
                  color={
                    isSelected
                      ? isDark
                        ? "#6ee7b7"
                        : CustomColors.appThemeColor || "#4F806D"
                      : isDark
                      ? "#94a3b8"
                      : CustomColors.textGray || "#888888"
                  }
                />
                <Text
                  style={[
                    componentStyles.radioText,
                    {
                      color: isSelected
                        ? isDark
                          ? "#6ee7b7"
                          : CustomColors.appThemeColor || "#4F806D"
                        : isDark
                        ? "#cbd5e1"
                        : CustomColors.textDark || "#333333",
                      fontFamily: isSelected ? Fonts.Bold : Fonts.Regular,
                    },
                  ]}
                >
                  {opt.display}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Bar & View Mode Toggle */}
        <View style={componentStyles.searchRow}>
          <View
            style={[
              componentStyles.searchInputWrapper,
              {
                backgroundColor: isDark ? "#334155" : (CustomColors.backgroundLightGray || "#F7F7F7"),
                borderColor: isDark ? "#475569" : (CustomColors.textInputBorderColor || "#E0E0E0"),
              },
            ]}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={isDark ? "#94a3b8" : (CustomColors.textGray || "#909497")}
              style={{ marginRight: 6 }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter by branch name..."
              placeholderTextColor={isDark ? "#94a3b8" : (CustomColors.textGray || "#999999")}
              style={[
                componentStyles.searchInput,
                { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#000000") },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialIcons
                  name="close"
                  size={18}
                  color={isDark ? "#94a3b8" : (CustomColors.textGray || "#888888")}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      {(isFetching || isLoadingMore) && !isRefreshing && reportList.length === 0 ? (
        <View style={componentStyles.centerLoader}>
          <ActivityIndicator size="large" color={CustomColors.appThemeColor || "#4F806D"} />
          <Text style={[componentStyles.loadingText, { color: isDark ? "#94a3b8" : CustomColors.textGray }]}>
            Loading branch wise report...
          </Text>
        </View>
      ) : filteredList.length === 0 ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[CustomColors.appThemeColor]}
              tintColor={CustomColors.appThemeColor}
            />
          }
          contentContainerStyle={componentStyles.emptyStateContainer}
        >
          <MaterialCommunityIcons
            name="file-search-outline"
            size={64}
            color={isDark ? "#475569" : (CustomColors.textGray || "#AAAAAA")}
          />
          <Text
            style={[
              componentStyles.emptyStateTitle,
              { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#333333") },
            ]}
          >
            No Records Found...
          </Text>
          <Text style={[componentStyles.emptyStateSubtitle, { color: isDark ? "#94a3b8" : CustomColors.textGray }]}>
            There are no pending TA bills for the selected filter.
          </Text>
        </ScrollView>
      ) : viewMode === "card" ? (
        <FlatList
          data={filteredList}
          keyExtractor={(item, index) => `${item?.branch_name || index}-${index}`}
          renderItem={renderCardItem}
          contentContainerStyle={componentStyles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[CustomColors.appThemeColor]}
              tintColor={CustomColors.appThemeColor}
            />
          }
        />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[CustomColors.appThemeColor]}
              tintColor={CustomColors.appThemeColor}
            />
          }
          contentContainerStyle={{ paddingVertical: verticalScale(10) }}
        >
          {renderTableView()}
        </ScrollView>
      )}

      {/* Pagination Footer (shown only in Table mode) */}
      {viewMode === "table" && reportList.length > 0 && (
        <View
          style={[
            componentStyles.paginationBar,
            {
              backgroundColor: isDark ? "#1e293b" : CustomColors.white,
              borderTopColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
            },
          ]}
        >
          <Text style={[componentStyles.totalRecordsText, { color: isDark ? "#94a3b8" : CustomColors.textGray }]}>
            Showing {filteredList.length} {filteredList.length === 1 ? "branch" : "branches"}
          </Text>

          <View style={componentStyles.paginationControls}>
            <TouchableOpacity
              onPress={handlePreviousPage}
              disabled={!hasPrevious || currentPage <= 1 || isFetching}
              style={[
                componentStyles.pageButton,
                {
                  borderColor:
                    hasPrevious && currentPage > 1
                      ? CustomColors.appThemeColor
                      : isDark
                      ? "#475569"
                      : CustomColors.overlayLightGray || "#E0E0E0",
                  backgroundColor:
                    hasPrevious && currentPage > 1
                      ? isDark
                        ? "#064e3b"
                        : CustomColors.appliteThemecolor || "#E8F5E9"
                      : isDark
                      ? "#334155"
                      : "#F5F5F5",
                },
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={18}
                color={
                  hasPrevious && currentPage > 1
                    ? isDark
                      ? "#6ee7b7"
                      : CustomColors.appThemeColor || "#4F806D"
                    : isDark
                    ? "#64748b"
                    : "#BBBBBB"
                }
              />
            </TouchableOpacity>

            <View style={componentStyles.pageIndicator}>
              <Text
                style={[
                  componentStyles.pageNumberText,
                  { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#111111") },
                ]}
              >
                Page {currentPage}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextPage}
              disabled={!hasNext || isFetching}
              style={[
                componentStyles.pageButton,
                {
                  borderColor: hasNext
                    ? CustomColors.appThemeColor
                    : isDark
                    ? "#475569"
                    : CustomColors.overlayLightGray || "#E0E0E0",
                  backgroundColor: hasNext
                    ? isDark
                      ? "#064e3b"
                      : CustomColors.appliteThemecolor || "#E8F5E9"
                    : isDark
                    ? "#334155"
                    : "#F5F5F5",
                },
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-forward"
                size={18}
                color={
                  hasNext
                    ? isDark
                      ? "#6ee7b7"
                      : CustomColors.appThemeColor || "#4F806D"
                    : isDark
                    ? "#64748b"
                    : "#BBBBBB"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default BranchwisePendingReportScreen;

const componentStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlCard: {
    paddingHorizontal: horizontalScale(16),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  screenHeading: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.Bold,
    marginBottom: verticalScale(10),
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
    gap: horizontalScale(12),
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: moderateScale(20),
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(14),
    gap: horizontalScale(6),
  },
  radioText: {
    fontSize: moderateScale(14),
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(8),
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(10),
    height: verticalScale(38),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13),
    paddingVertical: 0,
    fontFamily: Fonts.Regular,
  },
  listContent: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    gap: verticalScale(10),
  },
  cardContainer: {
    borderRadius: moderateScale(10),
    padding: moderateScale(14),
    borderWidth: 1,
    elevation: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  branchInfoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(8),
  },
  serialBadge: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(6),
  },
  serialText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
  },
  branchNameText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.Bold,
  },
  totalBadge: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
    marginLeft: horizontalScale(8),
  },
  totalBadgeText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
  },
  divider: {
    height: 1,
    marginVertical: verticalScale(10),
  },
  agingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: horizontalScale(6),
  },
  agingItem: {
    flex: 1,
    minWidth: "18%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(4),
    borderRadius: moderateScale(6),
  },
  agingLabel: {
    fontSize: moderateScale(9),
    fontFamily: Fonts.SemiBold || Fonts.Regular,
    textAlign: "center",
    marginBottom: verticalScale(2),
  },
  agingValue: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.Bold,
    textAlign: "center",
  },
  tableContainer: {
    borderRadius: moderateScale(8),
    borderWidth: 1,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
  },
  tableHeaderRow: {
    paddingVertical: verticalScale(12),
  },
  tableHeaderCell: {
    color: "#FFFFFF",
    fontFamily: Fonts.Bold,
    fontSize: moderateScale(12),
    textAlign: "center",
    paddingHorizontal: horizontalScale(6),
  },
  tableCell: {
    fontFamily: Fonts.Regular,
    fontSize: moderateScale(12),
    textAlign: "center",
    paddingHorizontal: horizontalScale(6),
  },
  centerLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(8),
  },
  loadingText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.Regular,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: horizontalScale(32),
    paddingVertical: verticalScale(60),
    gap: verticalScale(8),
  },
  emptyStateTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.Bold,
    marginTop: verticalScale(8),
  },
  emptyStateSubtitle: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.Regular,
    textAlign: "center",
  },
  paginationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(10),
    borderTopWidth: 1,
  },
  totalRecordsText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.Regular,
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(8),
  },
  pageButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(6),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageIndicator: {
    paddingHorizontal: horizontalScale(6),
  },
  pageNumberText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.SemiBold || Fonts.Bold,
  },
  listFooterLoader: {
    paddingVertical: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(6),
  },
  listFooterText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.Medium || Fonts.Regular,
  },
  listFooterEnd: {
    paddingVertical: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  listFooterEndText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.Regular,
  },
});
