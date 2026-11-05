import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
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

import {
  useLazyGetEmpTourReportQuery,
  useLazyDownloadEmpTourReportQuery,
} from "../../redux/rtk_query/apiSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../styles/Metrics";
import { Fonts } from "../../styles/Fonts";

const EmployeeTourReportScreen = ({ navigation, isEmbedded = false }) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles.styles(isDark);

  const [tourNo, setTourNo] = useState("");
  const [reportList, setReportList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState("card"); // 'card' | 'table'

  const isFetchingRef = useRef(false);

  // RTK Query hooks
  const [triggerGetEmpReport, { isFetching }] = useLazyGetEmpTourReportQuery();
  const [triggerDownload, { isFetching: isDownloading }] = useLazyDownloadEmpTourReportQuery();

  // Navigation Header (when standalone)
  useLayoutEffect(() => {
    if (isEmbedded) return;
    navigation.setOptions({
      title: "Employee Tour Report",
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

  // Fetch report data with continuous scroll append support
  const fetchReportData = useCallback(
    async (pageToLoad = 1, searchNo = tourNo, shouldAppend = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const response = await triggerGetEmpReport({
          tour_no: (searchNo || "").trim(),
          page: pageToLoad,
        }).unwrap();

        const data = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination || {};
        const count = response?.count ?? data.length;

        setTotalCount(count);
        setCurrentPage(pagination?.index || pageToLoad);
        setHasNext(Boolean(pagination?.has_next));
        setHasPrevious(Boolean(pagination?.has_previous));

        if (shouldAppend) {
          setReportList((prev) => [...prev, ...data]);
        } else {
          setReportList(data);
        }
      } catch (err) {
        console.error("Error fetching Employee Tour Report:", err);
        if (!shouldAppend) setReportList([]);
        ToastMessage(err?.data?.message || "Failed to load employee tour report");
      } finally {
        isFetchingRef.current = false;
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [triggerGetEmpReport, tourNo]
  );

  useEffect(() => {
    fetchReportData(1, "", false);
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchReportData(1, tourNo, false);
  };

  const handleClear = () => {
    setTourNo("");
    setCurrentPage(1);
    fetchReportData(1, "", false);
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    fetchReportData(1, tourNo, false);
  };

  // Continuous infinite scroll on reaching bottom
  const handleLoadMore = () => {
    if (!isLoadingMore && hasNext && !isFetching && !isFetchingRef.current) {
      const nextPage = currentPage + 1;
      setIsLoadingMore(true);
      fetchReportData(nextPage, tourNo, true);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await triggerDownload({ tour_no: tourNo.trim() }).unwrap();
      if (res?.code === "INVALID_DATA") {
        ToastMessage(res?.description || "No Data Found!");
      } else {
        ToastMessage("Employee Tour Report Download Initiated");
      }
    } catch (e) {
      console.error("Error downloading employee report:", e);
      ToastMessage(e?.data?.description || "Download failed");
    }
  };

  // Navigations matching Angular methods
  const handleTourDetail = (report) => {
    const tourId =
      report?.tourid ||
      report?.tour_id ||
      report?.tourgid ||
      report?.id ||
      report?.requestno;
    const tourNo = report?.requestno || report?.tour_no || report?.tourno || "";
    navigation.navigate("travel_edit_screen", {
      tourDataParams: {
        ...report,
        id: tourId,
        tourid: tourId,
        tour_id: tourId,
        tourgid: tourId,
        requestno: tourNo,
      },
      tour_id: tourId,
      tourId: tourId,
      id: tourId,
      tourNo: tourNo,
      from: "VIEW",
    });
  };

  const handleTourExpense = (report) => {
    const tourId =
      report?.tourid ||
      report?.tour_id ||
      report?.tourgid ||
      report?.id ||
      report?.requestno;
    const tourNo = report?.requestno || report?.tour_no || report?.tourno || "";
    navigation.navigate("ExpenseApprovalView", {
      expense: report,
      tourDataParams: report,
      claimData: report,
      tourId: tourId,
      tour_id: tourId,
      tourNo: tourNo,
      from: "VIEW",
    });
  };

  const getStatusBadge = (statusText) => {
    const st = (statusText || "").toUpperCase();
    if (st.includes("APPROV") || st.includes("PAID") || st.includes("SUCCESS")) {
      return {
        bg: isDark ? "#064e3b" : "#E8F5E9",
        text: isDark ? "#6ee7b7" : "#2E7D32",
        border: isDark ? "#047857" : "#A5D6A7",
      };
    }
    if (st.includes("REJECT") || st.includes("FAIL")) {
      return {
        bg: isDark ? "#450a0a" : "#FFEBEE",
        text: isDark ? "#fca5a5" : "#C62828",
        border: isDark ? "#b91c1c" : "#FFCDD2",
      };
    }
    if (st.includes("RETURN")) {
      return {
        bg: isDark ? "#3b0764" : "#F3E5F5",
        text: isDark ? "#d8b4fe" : "#7B1FA2",
        border: isDark ? "#7e22ce" : "#CE93D8",
      };
    }
    return {
      bg: isDark ? "#451a03" : "#FFF8E1",
      text: isDark ? "#fde68a" : "#F57C00",
      border: isDark ? "#b45309" : "#FFE082",
    };
  };

  // Render individual card
  const renderCard = ({ item, index }) => {
    const serialNumber = (currentPage - 1) * pageSize + index + 1;
    const tourBadge = getStatusBadge(item?.tour_status);
    const advanceBadge = getStatusBadge(item?.advance_status);
    const claimBadge = getStatusBadge(item?.claim_status);

    return (
      <View
        style={[
          componentStyles.card,
          {
            backgroundColor: isDark ? "#1e293b" : (CustomColors.white || "#FFFFFF"),
            borderColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
          },
        ]}
      >
        {/* Top Row: Serial & Tour No */}
        <View style={componentStyles.cardHeader}>
          <View style={[componentStyles.serialBadge, { backgroundColor: isDark ? "#334155" : "#E8EAF6" }]}>
            <Text style={[componentStyles.serialText, { color: isDark ? "#a78bfa" : "#3F51B5" }]}>#{serialNumber}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: horizontalScale(10) }}>
            <Text style={[componentStyles.tourNoText, { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#111111") }]}>
              {item?.requestno || "-"}
            </Text>
            <Text style={[componentStyles.dateSubText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#666666") }]}>
              Req Date: {item?.requestdate || "-"}
            </Text>
          </View>

          {item?.tour_status ? (
            <View
              style={[
                componentStyles.statusBadge,
                { backgroundColor: tourBadge.bg, borderColor: tourBadge.border },
              ]}
            >
              <Text style={[componentStyles.statusBadgeText, { color: tourBadge.text }]}>
                {item.tour_status}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Employee & Designation */}
        <View style={componentStyles.infoRow}>
          <Ionicons name="person-outline" size={15} color={isDark ? "#94a3b8" : "#555"} />
          <Text style={[componentStyles.infoText, { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#222") }]}>
            {item?.employee_name || "-"}
            {item?.empdesignation ? ` (${item.empdesignation})` : ""}
          </Text>
        </View>

        {/* Branch */}
        {item?.branch_name && (
          <View style={componentStyles.infoRow}>
            <Ionicons name="business-outline" size={15} color={isDark ? "#94a3b8" : "#555"} />
            <Text style={[componentStyles.infoText, { color: isDark ? "#cbd5e1" : (CustomColors.textGray || "#555") }]}>
              Branch: {item.branch_name}
            </Text>
          </View>
        )}

        {/* Approver */}
        {item?.approvedby && (
          <View style={componentStyles.infoRow}>
            <MaterialIcons name="verified-user" size={15} color={isDark ? "#94a3b8" : "#555"} />
            <Text style={[componentStyles.infoText, { color: isDark ? "#cbd5e1" : (CustomColors.textGray || "#555") }]}>
              Approver: {item.approvedby}
            </Text>
          </View>
        )}

        {/* Travel Period */}
        <View style={componentStyles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color={isDark ? "#94a3b8" : "#555"} />
          <Text style={[componentStyles.infoText, { color: isDark ? "#cbd5e1" : (CustomColors.textGray || "#555") }]}>
            {item?.startdate || "-"} to {item?.enddate || "-"}
          </Text>
        </View>

        {/* Reason */}
        {item?.reason && (
          <View style={componentStyles.infoRow}>
            <Ionicons name="document-text-outline" size={15} color={isDark ? "#94a3b8" : "#555"} />
            <Text
              style={[componentStyles.infoText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#555"), flex: 1 }]}
              numberOfLines={2}
            >
              {item.reason}
            </Text>
          </View>
        )}

        {/* Financial Badges: Advance & Claimed */}
        <View style={[componentStyles.amountRow, { backgroundColor: isDark ? "#0f172a" : "#F9FAFB", borderColor: isDark ? "#334155" : "#EAEAEA" }]}>
          <View style={componentStyles.amountCol}>
            <Text style={[componentStyles.amountLabel, { color: isDark ? "#94a3b8" : "#777" }]}>Advance Amount</Text>
            <Text style={[componentStyles.amountValue, { color: isDark ? "#fca5a5" : "#C62828" }]}>
              ₹{Number(item?.advanceamount || 0).toLocaleString()}
            </Text>
            {item?.advance_status ? (
              <View
                style={[
                  componentStyles.miniStatusBadge,
                  { backgroundColor: advanceBadge.bg, borderColor: advanceBadge.border },
                ]}
              >
                <Text style={[componentStyles.miniStatusText, { color: advanceBadge.text }]}>
                  {item.advance_status}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[componentStyles.amountDivider, { backgroundColor: isDark ? "#334155" : "#E0E0E0" }]} />

          <View style={componentStyles.amountCol}>
            <Text style={[componentStyles.amountLabel, { color: isDark ? "#94a3b8" : "#777" }]}>Claim Amount</Text>
            <Text style={[componentStyles.amountValue, { color: isDark ? "#86efac" : "#2E7D32" }]}>
              ₹{Number(item?.claimedamount || 0).toLocaleString()}
            </Text>
            {item?.claim_status ? (
              <View
                style={[
                  componentStyles.miniStatusBadge,
                  { backgroundColor: claimBadge.bg, borderColor: claimBadge.border },
                ]}
              >
                <Text style={[componentStyles.miniStatusText, { color: claimBadge.text }]}>
                  {item.claim_status}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[componentStyles.cardActions, { borderTopColor: isDark ? "#334155" : "#F0F0F0" }]}>
          <TouchableOpacity
            style={[
              componentStyles.actionBtn,
              {
                borderColor: isDark ? "#60a5fa" : "#1976D2",
                backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
              },
            ]}
            onPress={() => handleTourDetail(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="briefcase-outline" size={14} color={isDark ? "#60a5fa" : "#1976D2"} />
            <Text style={[componentStyles.actionBtnText, { color: isDark ? "#60a5fa" : "#1976D2" }]}>
              Tour Details
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              componentStyles.actionBtn,
              {
                borderColor: isDark ? "#c084fc" : "#7B1FA2",
                backgroundColor: isDark ? "#1e293b" : "#FFFFFF",
              },
            ]}
            onPress={() => handleTourExpense(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={14} color={isDark ? "#c084fc" : "#7B1FA2"} />
            <Text style={[componentStyles.actionBtnText, { color: isDark ? "#c084fc" : "#7B1FA2" }]}>
              Tour Expense
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Table view
  const renderTable = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
        <View style={{ paddingBottom: verticalScale(30) }}>
          {/* Header */}
          <View
            style={[
              componentStyles.tableRow,
              componentStyles.tableHeaderRow,
              { backgroundColor: CustomColors.appThemeColor || "#4F806D" },
            ]}
          >
            <Text style={[componentStyles.tableHeaderCell, { width: 50 }]}>S.No</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 120 }]}>Tour No</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>Req Date</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 100 }]}>From Date</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 100 }]}>To Date</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 140, textAlign: "left" }]}>Employee</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>Branch</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>Advance Amt</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>Claim Amt</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>Tour Status</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 110 }]}>Claim Status</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 90 }]}>Detail</Text>
            <Text style={[componentStyles.tableHeaderCell, { width: 90 }]}>Expense</Text>
          </View>

          {/* Body */}
          {reportList.map((item, index) => {
            const serialNumber = (currentPage - 1) * pageSize + index + 1;
            const isEven = index % 2 === 0;

            return (
              <View
                key={`${item?.requestno || index}-${index}`}
                style={[
                  componentStyles.tableRow,
                  {
                    backgroundColor: isEven
                      ? (isDark ? "#1e293b" : (CustomColors.white || "#FFFFFF"))
                      : (isDark ? "#0f172a" : "#F9F9F9"),
                    borderBottomColor: isDark ? "#334155" : "#EEEEEE",
                  },
                ]}
              >
                <Text style={[componentStyles.tableCell, { width: 50, color: isDark ? "#94a3b8" : "#333" }]}>{serialNumber}</Text>
                <Text style={[componentStyles.tableCell, { width: 120, fontFamily: Fonts.SemiBold, color: isDark ? "#f8fafc" : "#333" }]}>
                  {item.requestno || "-"}
                </Text>
                <Text style={[componentStyles.tableCell, { width: 110, color: isDark ? "#cbd5e1" : "#333" }]}>{item.requestdate || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 100, color: isDark ? "#cbd5e1" : "#333" }]}>{item.startdate || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 100, color: isDark ? "#cbd5e1" : "#333" }]}>{item.enddate || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 140, textAlign: "left", color: isDark ? "#f8fafc" : "#333" }]}>
                  {item.employee_name || "-"}
                </Text>
                <Text style={[componentStyles.tableCell, { width: 110, color: isDark ? "#cbd5e1" : "#333" }]}>{item.branch_name || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 110, color: isDark ? "#fca5a5" : "#C62828" }]}>
                  ₹{Number(item.advanceamount || 0).toLocaleString()}
                </Text>
                <Text style={[componentStyles.tableCell, { width: 110, color: isDark ? "#86efac" : "#2E7D32" }]}>
                  ₹{Number(item.claimedamount || 0).toLocaleString()}
                </Text>
                <Text style={[componentStyles.tableCell, { width: 110, color: isDark ? "#cbd5e1" : "#333" }]}>{item.tour_status || "-"}</Text>
                <Text style={[componentStyles.tableCell, { width: 110, color: isDark ? "#cbd5e1" : "#333" }]}>{item.claim_status || "-"}</Text>
                <TouchableOpacity
                  style={[componentStyles.tableCell, { width: 90, alignItems: "center" }]}
                  onPress={() => handleTourDetail(item)}
                >
                  <Ionicons name="open-outline" size={18} color={isDark ? "#60a5fa" : "#1976D2"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[componentStyles.tableCell, { width: 90, alignItems: "center" }]}
                  onPress={() => handleTourExpense(item)}
                >
                  <Ionicons name="open-outline" size={18} color={isDark ? "#c084fc" : "#7B1FA2"} />
                </TouchableOpacity>
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
      {/* Top Search Card */}
      <View
        style={[
          componentStyles.searchCard,
          {
            backgroundColor: isDark ? "#1e293b" : (CustomColors.white || "#FFFFFF"),
            borderColor: isDark ? "#334155" : (CustomColors.overlayLightGray || "#E0E0E0"),
          },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: verticalScale(10) }}>
          <Text
            style={[
              componentStyles.screenHeading,
              { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#111111"), marginBottom: 0 },
            ]}
          >
            Employee Tour Report
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

        <View style={componentStyles.searchRow}>
          <View
            style={[
              componentStyles.inputWrapper,
              {
                backgroundColor: isDark ? "#334155" : "#F7F8FA",
                borderColor: isDark ? "#475569" : (CustomColors.overlayLightGray || "#CCCCCC"),
              },
            ]}
          >
            <Ionicons name="search-outline" size={16} color={isDark ? "#94a3b8" : "#888"} style={{ marginLeft: 8 }} />
            <TextInput
              style={[
                componentStyles.textInput,
                { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#333333") },
              ]}
              placeholder="Search Tour No"
              placeholderTextColor={isDark ? "#94a3b8" : "#999"}
              value={tourNo}
              onChangeText={setTourNo}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {tourNo.length > 0 && (
              <TouchableOpacity onPress={() => setTourNo("")} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color={isDark ? "#94a3b8" : "#999"} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[componentStyles.searchBtn, { backgroundColor: CustomColors.appThemeColor }]}
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={16} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              componentStyles.clearBtn,
              {
                backgroundColor: isDark ? "#334155" : "#FFFFFF",
                borderColor: isDark ? "#475569" : "#DDD",
              },
            ]}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Text style={[componentStyles.clearBtnText, { color: isDark ? "#cbd5e1" : "#666" }]}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[componentStyles.downloadBtn, { backgroundColor: CustomColors.appThemeColor }]}
            onPress={handleDownload}
            disabled={isDownloading}
            activeOpacity={0.8}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="download" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {isFetching && reportList.length === 0 ? (
          <View style={componentStyles.centerState}>
            <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
            <Text style={[componentStyles.stateText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#666") }]}>
              Loading Employee Tour Reports...
            </Text>
          </View>
        ) : reportList.length === 0 ? (
          <View style={componentStyles.centerState}>
            <MaterialCommunityIcons name="file-document-outline" size={54} color={isDark ? "#475569" : "#BDBDBD"} />
            <Text style={[componentStyles.stateTitle, { color: isDark ? "#f8fafc" : (CustomColors.textBlack || "#333") }]}>
              No Data Found
            </Text>
            <Text style={[componentStyles.stateText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#777") }]}>
              No tour reports found matching the criteria.
            </Text>
          </View>
        ) : viewMode === "card" ? (
          <FlatList
            data={reportList}
            renderItem={renderCard}
            keyExtractor={(item, idx) => `${item.requestno || item.id || idx}_${idx}`}
            contentContainerStyle={componentStyles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[CustomColors.appThemeColor]}
              />
            }
            ListHeaderComponent={
              totalCount > 0 ? (
                <View style={componentStyles.counterBar}>
                  <Text style={[componentStyles.counterText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#666") }]}>
                    Showing {reportList.length} of {totalCount} Records
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              isLoadingMore ? (
                <View style={{ paddingVertical: verticalScale(16), alignItems: "center" }}>
                  <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
                  <Text style={[componentStyles.loadingMoreText, { color: isDark ? "#94a3b8" : (CustomColors.textGray || "#666") }]}>
                    Loading more records...
                  </Text>
                </View>
              ) : null
            }
          />
        ) : (
          renderTable()
        )}
      </View>
    </SafeAreaView>
  );
};

export default EmployeeTourReportScreen;

const componentStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchCard: {
    marginHorizontal: horizontalScale(12),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
    padding: moderateScale(12),
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  screenHeading: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.Bold,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 8,
    borderWidth: 1,
    height: verticalScale(40),
  },
  textInput: {
    flex: 1,
    paddingHorizontal: horizontalScale(8),
    fontSize: moderateScale(13),
    color: "#333",
  },
  searchBtn: {
    width: horizontalScale(40),
    height: verticalScale(40),
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: {
    paddingHorizontal: horizontalScale(12),
    height: verticalScale(40),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  clearBtnText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.Medium,
    color: "#666",
  },
  downloadBtn: {
    width: horizontalScale(40),
    height: verticalScale(40),
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: horizontalScale(12),
    paddingBottom: verticalScale(20),
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: moderateScale(12),
    marginVertical: verticalScale(6),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  serialBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8EAF6",

    alignItems: "center",
    justifyContent: "center",
  },
  serialText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
    color: "#3F51B5",
  },
  tourNoText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.Bold,
  },
  dateSubText: {
    fontSize: moderateScale(11),
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(3),
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(4),
  },
  infoText: {
    fontSize: moderateScale(12),
    marginLeft: horizontalScale(8),
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: moderateScale(8),
    marginTop: verticalScale(10),
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  amountCol: {
    flex: 1,
    alignItems: "center",
  },
  amountDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#E0E0E0",
  },
  amountLabel: {
    fontSize: moderateScale(10),
    color: "#777",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.Bold,
  },
  miniStatusBadge: {
    paddingHorizontal: horizontalScale(6),
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    marginTop: 3,
  },
  miniStatusText: {
    fontSize: moderateScale(9),
    fontFamily: Fonts.SemiBold,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: verticalScale(10),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(5),
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#FFF",
  },
  actionBtnText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.SemiBold,
    marginLeft: 4,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  stateTitle: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.Bold,
    marginTop: verticalScale(10),
  },
  stateText: {
    fontSize: moderateScale(12),
    textAlign: "center",
    marginTop: verticalScale(4),
  },
  counterBar: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(4),
    marginBottom: verticalScale(4),
  },
  counterText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.SemiBold,
  },
  loadingMoreText: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Medium,
    marginTop: 4,
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  pageNumberBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumberText: {
    color: "#FFF",
    fontFamily: Fonts.Bold,
    fontSize: moderateScale(12),
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: verticalScale(8),
    paddingHorizontal: horizontalScale(6),
  },
  tableHeaderRow: {
    paddingVertical: verticalScale(10),
  },
  tableHeaderCell: {
    fontSize: moderateScale(11),
    fontFamily: Fonts.Bold,
    color: "#FFF",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: moderateScale(11),
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 4,
  },
});
