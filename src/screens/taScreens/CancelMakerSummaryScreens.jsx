import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useLazyGetCancelMakerSummaryQuery } from "../../redux/rtk_query/apiSlice";
import {
    clearTravelCancelMakerSummaryArray,
    setTravelCancelMakerSummaryArray,
} from "../../redux/slices/TravelMaker";
import { setFilters, clearFilters } from "../../redux/slices/FilterSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { RowList } from "../../TaComponents/flat_lists/RowList";
import FilterModal from "../../TaComponents/models/FilterModel";
import SelfOrOnBehalfModal from "../../TaComponents/models/SelfOrOnBehalfModal";
import {
    setMode,
    setSelectedBranch,
    setSelectedEmployee,
} from "../../redux/slices/SelfOrOnBehalfSlice";
import { getCustomColors } from "../../styles/CustomColors";
import * as styles from "../../styles/StyleSheet";
import {
    horizontalScale,
    verticalScale,
    moderateScale,
} from "../../globalstyles/Metrics";
import { Fonts } from "../../styles/Fonts";

// Date Formatter matching Angular DatePipe "dd-MMM-yyyy"
const formatDateToDisplay = (dateObj) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return String(dateObj);
    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleString("default", { month: "short" });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

// Status text mapping for Tour
const getTourStatusText = (statusId, tourStatusStr) => {
    if (typeof tourStatusStr === "string" && tourStatusStr.trim() !== "") {
        const upper = tourStatusStr.toUpperCase();
        if (upper === "APPROVED") return "Tour Request Approved";
        if (upper === "REJECTED") return "Tour Request Rejected";
        if (upper === "RETURNED" || upper === "RETURN") return "Tour Request Returned";
        if (upper === "FORWARDED") return "Tour Request Forwarded";
        if (upper === "PENDING") return "Tour Request Submitted";
    }

    switch (Number(statusId)) {
        case 1:
        case 2:
            return "Tour Request Submitted";
        case 3:
            return "Tour Request Approved";
        case 4:
            return "Tour Request Rejected";
        case 5:
            return "Tour Request Returned";
        case 6:
            return "Tour Request Forwarded";
        case 7:
            return "Tour Cancel Requested";
        case 8:
            return "Tour Cancel Approved";
        default:
            return "Submitted";
    }
};

// Status text mapping for Advance
const getAdvanceStatusText = (advanceStatusId, advanceStatusStr) => {
    if (typeof advanceStatusStr === "string" && advanceStatusStr.trim() !== "") {
        const upper = advanceStatusStr.toUpperCase();
        if (upper === "PENDING") return "Advance Pending";
        if (upper === "APPROVED") return "Advance Approved";
        if (upper === "REJECTED") return "Advance Rejected";
        if (upper === "RETURNED" || upper === "RETURN") return "Advance Returned";
        if (upper === "DEFAULT") return "Advance Pending";
    }

    switch (Number(advanceStatusId)) {
        case 1:
            return "Advance Submitted";
        case 2:
            return "Advance Pending";
        case 3:
            return "Advance Approved";
        case 4:
            return "Advance Rejected";
        case 5:
            return "Advance Returned";
        case 15:
        case 17:
            return "Advance Cancel Submitted";
        default:
            return "Advance Pending";
    }
};

// Status Badge Theme Styling
const getStatusTheme = (statusStr) => {
    const s = String(statusStr || "").toUpperCase();
    if (s.includes("APPROVED")) {
        return {
            bg: "#DCFCE7",
            text: "#15803D",
            border: "#86EFAC",
            icon: "check-circle",
        };
    }
    if (s.includes("REJECTED")) {
        return {
            bg: "#FEE2E2",
            text: "#B91C1C",
            border: "#FCA5A5",
            icon: "cancel",
        };
    }
    if (s.includes("RETURN")) {
        return {
            bg: "#FEF3C7",
            text: "#B45309",
            border: "#FDE68A",
            icon: "replay",
        };
    }
    if (s.includes("CANCEL") || s.includes("REQUEST")) {
        return {
            bg: "#FFEDD5",
            text: "#C2410C",
            border: "#FDBA74",
            icon: "pending-actions",
        };
    }
    return {
        bg: "#EFF6FF",
        text: "#1D4ED8",
        border: "#BFDBFE",
        icon: "info",
    };
};

// Professional Cancel Request Card Component
const CancelRequestCard = ({ data, index, onPress, isAdvance, CustomColors, isDark }) => {
    const isAdvanceType =
        isAdvance ||
        data?.type === "AdvanceCancel" ||
        (data?.advance_status !== undefined && data?.advance_status !== "DEFAULT");

    const displayStatusText =
        (data?.tour_cancel_status && data.tour_cancel_status !== "DEFAULT" ? data.tour_cancel_status : null) ||
        (data?.advance_cancel_status && data.advance_cancel_status !== "DEFAULT" ? data.advance_cancel_status : null) ||
        (isAdvanceType
            ? getAdvanceStatusText(data?.advance_status_id ?? data?.status, data?.advance_status || data?.status_name)
            : getTourStatusText(data?.tour_status_id ?? data?.status, data?.tour_status || data?.status_name));

    const statusTheme = getStatusTheme(displayStatusText);
    const tourNumber = data?.requestno || data?.tourid || data?.tour_id || data?.tourgid || data?.id || "NEW";
    const employeeName = data?.employee_name || data?.full_name || "";
    const employeeCode = data?.employee_code || "";
    const grade = data?.empgrade || "";
    const reason = data?.reason || "";
    const startDate = data?.startdate || "";
    const endDate = data?.enddate || "";
    const requestDate = data?.requestdate || "";
    const fromPlace = data?.from_place || "";
    const toPlace = data?.to_place || "";
    const reqAmount = data?.requested_amount ?? data?.reqamount;

    const copyTourNo = async () => {
        if (tourNumber && tourNumber !== "NEW") {
            await Clipboard.setStringAsync(String(tourNumber));
            ToastMessage(`Copied "${tourNumber}" to clipboard`);
        }
    };

    return (
        <TouchableOpacity
            style={[
                cardStyles.card,
                {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                },
            ]}
            onPress={onPress}
            activeOpacity={0.82}
        >
            {/* Header: S.No + Tour Number with copy + Status Pill */}
            <View style={cardStyles.headerRow}>
                <View style={cardStyles.headerLeft}>
                    <View
                        style={[
                            cardStyles.sNoBadge,
                            { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
                        ]}
                    >
                        <Text
                            allowFontScaling={false}
                            style={[
                                cardStyles.sNoText,
                                { color: isDark ? "#94A3B8" : "#475569" },
                            ]}
                        >
                            #{index + 1}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={cardStyles.tourNoWrapper}
                        onPress={copyTourNo}
                        activeOpacity={0.65}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text
                            allowFontScaling={false}
                            style={[cardStyles.tourNoText, { color: CustomColors.appThemeColor }]}
                            numberOfLines={1}
                        >
                            {tourNumber}
                        </Text>
                        <MaterialIcons
                            name="content-copy"
                            size={14}
                            color={CustomColors.appThemeColor}
                            style={{ marginLeft: 4 }}
                        />
                    </TouchableOpacity>
                </View>

                {/* Status Badge */}
                <View
                    style={[
                        cardStyles.statusBadge,
                        {
                            backgroundColor: statusTheme.bg,
                            borderColor: statusTheme.border,
                        },
                    ]}
                >
                    <MaterialIcons
                        name={statusTheme.icon}
                        size={12}
                        color={statusTheme.text}
                        style={{ marginRight: 4 }}
                    />
                    <Text
                        allowFontScaling={false}
                        style={[cardStyles.statusText, { color: statusTheme.text }]}
                        numberOfLines={1}
                    >
                        {displayStatusText}
                    </Text>
                </View>
            </View>

            {/* Subtle Divider */}
            <View
                style={[
                    cardStyles.divider,
                    { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
                ]}
            />

            {/* Body Info */}
            <View style={cardStyles.body}>
                {/* Employee Row */}
                {employeeName ? (
                    <View style={cardStyles.infoRow}>
                        <View style={cardStyles.iconCircle}>
                            <Ionicons
                                name="person-outline"
                                size={14}
                                color={isDark ? "#94A3B8" : "#64748B"}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text
                                allowFontScaling={false}
                                style={[
                                    cardStyles.employeeName,
                                    { color: isDark ? "#F8FAFC" : "#0F172A" },
                                ]}
                                numberOfLines={1}
                            >
                                {employeeName}
                                {employeeCode ? ` (${employeeCode})` : ""}
                            </Text>
                        </View>
                        {grade ? (
                            <View
                                style={[
                                    cardStyles.gradePill,
                                    { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
                                ]}
                            >
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        cardStyles.gradeText,
                                        { color: isDark ? "#CBD5E1" : "#475569" },
                                    ]}
                                >
                                    Grade: {grade}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* Travel Dates */}
                {(startDate || endDate || requestDate) ? (
                    <View style={cardStyles.infoRow}>
                        <View style={cardStyles.iconCircle}>
                            <MaterialIcons
                                name="date-range"
                                size={14}
                                color={isDark ? "#94A3B8" : "#64748B"}
                            />
                        </View>
                        <Text
                            allowFontScaling={false}
                            style={[
                                cardStyles.infoText,
                                { color: isDark ? "#CBD5E1" : "#334155" },
                            ]}
                            numberOfLines={1}
                        >
                            {startDate && endDate
                                ? `${startDate}  ➔  ${endDate}`
                                : requestDate
                                    ? `Request Date: ${requestDate}`
                                    : startDate || endDate}
                        </Text>
                    </View>
                ) : null}

                {/* Route (From ➔ To) */}
                {(fromPlace || toPlace) ? (
                    <View style={cardStyles.infoRow}>
                        <View style={cardStyles.iconCircle}>
                            <Ionicons
                                name="navigate-outline"
                                size={14}
                                color={isDark ? "#94A3B8" : "#64748B"}
                            />
                        </View>
                        <Text
                            allowFontScaling={false}
                            style={[
                                cardStyles.infoText,
                                { color: isDark ? "#CBD5E1" : "#334155" },
                            ]}
                            numberOfLines={1}
                        >
                            {fromPlace || "-"}  ➔  {toPlace || "-"}
                        </Text>
                    </View>
                ) : null}

                {/* Requested Amount (For Advance or Tour) */}
                {reqAmount !== undefined && reqAmount !== null && reqAmount !== "" ? (
                    <View style={cardStyles.infoRow}>
                        <View style={cardStyles.iconCircle}>
                            <Ionicons
                                name="wallet-outline"
                                size={14}
                                color={isDark ? "#94A3B8" : "#64748B"}
                            />
                        </View>
                        <Text
                            allowFontScaling={false}
                            style={[
                                cardStyles.amountLabel,
                                { color: isDark ? "#CBD5E1" : "#64748B" },
                            ]}
                        >
                            Requested Amount:{" "}
                        </Text>
                        <Text
                            allowFontScaling={false}
                            style={[
                                cardStyles.amountValue,
                                { color: CustomColors.appThemeColor },
                            ]}
                        >
                            ₹{Number(reqAmount).toLocaleString()}
                        </Text>
                    </View>
                ) : null}

                {/* Cancellation Reason Quote */}
                {reason ? (
                    <View
                        style={[
                            cardStyles.reasonBox,
                            {
                                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                                borderColor: isDark ? "#334155" : "#E2E8F0",
                            },
                        ]}
                    >
                        <Ionicons
                            name="chatbox-ellipses-outline"
                            size={14}
                            color={isDark ? "#94A3B8" : "#64748B"}
                            style={{ marginRight: 6, marginTop: 1 }}
                        />
                        <Text
                            allowFontScaling={false}
                            style={[
                                cardStyles.reasonText,
                                { color: isDark ? "#94A3B8" : "#475569" },
                            ]}
                            numberOfLines={2}
                        >
                            {reason}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Footer Action Strip */}
            <View
                style={[
                    cardStyles.footer,
                    {
                        backgroundColor: isDark ? "#0F172A" : "#FAFAFA",
                        borderTopColor: isDark ? "#334155" : "#F1F5F9",
                    },
                ]}
            >
                <View style={cardStyles.footerHintRow}>
                    <Ionicons
                        name="eye-outline"
                        size={13}
                        color={isDark ? "#94A3B8" : "#64748B"}
                    />
                    <Text
                        allowFontScaling={false}
                        style={[
                            cardStyles.footerHintText,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                        ]}
                    >
                        Tap to view or edit request
                    </Text>
                </View>

                <View style={cardStyles.viewButtonPill}>
                    <Text
                        allowFontScaling={false}
                        style={[
                            cardStyles.viewButtonText,
                            { color: CustomColors.appThemeColor },
                        ]}
                    >
                        Review
                    </Text>
                    <MaterialIcons
                        name="chevron-right"
                        size={16}
                        color={CustomColors.appThemeColor}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const CancelMakerSummaryScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const isDark = useSelector((state) => state.theme.isDark);
    const CustomColors = getCustomColors(isDark);
    const globalStyles = styles.styles(isDark);

    const cancelSummaryData = useSelector(
        (state) => state.TravelMaker.travelCancelMakerSummaryArray || []
    );
    const filters = useSelector((state) => state.travelFilter);
    const { mode, selectedEmployee } = useSelector(
        (state) => state.selfOrOnBehalf
    );

    // Active Tab: "Tour" (TourCancel) or "Advance" (AdvanceCancel)
    const [activeTab, setActiveTab] = useState("Tour");

    // Quick Filter Form State (matching Angular memoSearchForm)
    const [tourNo, setTourNo] = useState("");
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Pagination & Loading States
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    // Self or OnBehalf Modal State
    const [isSelfModalVisible, setIsSelfModalVisible] = useState(true);
    const firstLoadRef = useRef(true);

    const handleSelfOrOnBehalfSubmit = (res) => {
        setIsSelfModalVisible(false);
        dispatch(setMode(res.mode));
        dispatch(setSelectedBranch(res.selectedBranch));
        dispatch(setSelectedEmployee(res.selectedEmployee));
        firstLoadRef.current = false;
        handleRefresh(activeTab, tourNo, selectedDate, filters, res.mode, res.selectedEmployee);
    };

    const handleSelfOrOnBehalfClose = () => {
        setIsSelfModalVisible(false);
        if (firstLoadRef.current) {
            firstLoadRef.current = false;
            handleRefresh(activeTab, tourNo, selectedDate, filters);
        }
    };

    // Ref guards to prevent duplicate concurrent network calls
    const isFetchingRef = useRef(false);
    const hasMoreRef = useRef(true);
    hasMoreRef.current = hasMoreData;

    const [triggerCancelSummary, { isFetching }] =
        useLazyGetCancelMakerSummaryQuery();

    // Check if any extra filter is active
    const hasActiveFilters = Boolean(
        tourNo.trim() ||
        selectedDate ||
        (filters && (filters.tourNO || filters.requestedDate || filters.status))
    );

    // Navigation Header
    const HeaderRight = useCallback(
        () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                    onPress={() => setIsSelfModalVisible(true)}
                    style={{
                        marginRight: horizontalScale(14),
                        padding: 4,
                    }}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="swap-horiz" size={24} color={CustomColors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilterModalVisible(true)}
                    style={{
                        marginRight: horizontalScale(14),
                        position: "relative",
                        padding: 4,
                    }}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="filter-list" size={24} color={CustomColors.white} />
                    {hasActiveFilters && (
                        <View style={headerStyles.filterActiveDot} />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleCreateCancelRequest()}
                    style={headerStyles.headerAddBtn}
                    activeOpacity={0.75}
                >
                    <MaterialIcons name="add" size={22} color={CustomColors.appThemeColor} />
                </TouchableOpacity>
            </View>
        ),
        [CustomColors, activeTab, hasActiveFilters]
    );

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerStyle: {
                backgroundColor: CustomColors.appThemeColor,
            },
            headerTitle: () => (
                <View>
                    <Text
                        allowFontScaling={false}
                        style={{
                            fontSize: moderateScale(18),
                            fontFamily: Fonts.bold,
                            color: CustomColors.textWhite,
                        }}
                    >
                        Cancel Request
                    </Text>
                    <Text
                        allowFontScaling={false}
                        style={{
                            fontSize: moderateScale(11),
                            fontFamily: Fonts.regular,
                            color: "rgba(255, 255, 255, 0.8)",
                        }}
                    >
                        {activeTab === "Tour" ? "Tour Cancellation Hub" : "Advance Cancellation Hub"}
                    </Text>
                </View>
            ),
            headerTintColor: CustomColors.textWhite,
            headerRight: HeaderRight,
        });
    }, [navigation, HeaderRight, CustomColors, activeTab]);

    // Main Data Loader
    const loadData = useCallback(
        async (
            pageNum = 1,
            isInitial = false,
            tab = activeTab,
            searchTourNo = tourNo,
            searchDate = selectedDate,
            extraFilters = filters,
            overrideMode,
            overrideEmployee
        ) => {
            if (isFetchingRef.current) return;
            if (!hasMoreRef.current && !isInitial) return;

            isFetchingRef.current = true;
            if (!isInitial) setIsLoadingMore(true);

            const requestType = tab === "Advance" ? "AdvanceCancel" : "TourCancel";

            // Build `val` query string matching Angular format: &tour_no=...&request_date=...
            let val = "";
            const tourQuery =
                (searchTourNo && String(searchTourNo).trim()) ||
                (extraFilters && extraFilters.tourNO && String(extraFilters.tourNO).trim()) ||
                "";
            if (tourQuery) {
                val += `&tour_no=${encodeURIComponent(tourQuery)}`;
            }

            const extraDate = extraFilters && extraFilters.requestedDate;
            const dateQuery = searchDate
                ? formatDateToDisplay(searchDate)
                : extraDate
                    ? formatDateToDisplay(extraDate)
                    : null;

            if (dateQuery) {
                val += `&request_date=${encodeURIComponent(dateQuery)}`;
            }

            // On-behalf employee handling (matches Angular this.onbehalfempid)
            const currentMode = overrideMode !== undefined ? overrideMode : mode;
            const currentEmp = overrideEmployee !== undefined ? overrideEmployee : selectedEmployee;

            if (currentMode === "onbehalf" && currentEmp) {
                const onBehalfId =
                    currentEmp?.employeegid || currentEmp?.id;
                if (onBehalfId) {
                    val += `&onbehalf=${encodeURIComponent(
                        onBehalfId
                    )}&onbehalf_empId=${encodeURIComponent(onBehalfId)}`;
                }
            }

            try {
                const result = await triggerCancelSummary({
                    type: requestType,
                    page: pageNum,
                    val: val,
                }).unwrap();

                const summaryList = result?.data || [];
                const hasNext = result?.pagination?.has_next ?? false;

                if (isInitial) {
                    dispatch(clearTravelCancelMakerSummaryArray());
                }

                if (Array.isArray(summaryList) && summaryList.length > 0) {
                    dispatch(
                        setTravelCancelMakerSummaryArray({
                            data: summaryList,
                            count: result?.count || summaryList.length,
                        })
                    );
                    setHasMoreData(hasNext);
                    hasMoreRef.current = hasNext;
                    setPage(pageNum + 1);
                } else {
                    setHasMoreData(false);
                    hasMoreRef.current = false;
                }
            } catch (err) {
                console.error("Cancel Maker Summary Fetch Error:", err);
                ToastMessage("Failed to fetch cancel request data.");
                setHasMoreData(false);
                hasMoreRef.current = false;
            } finally {
                isFetchingRef.current = false;
                if (!isInitial) setIsLoadingMore(false);
            }
        },
        [
            dispatch,
            triggerCancelSummary,
            activeTab,
            tourNo,
            selectedDate,
            filters,
            mode,
            selectedEmployee,
        ]
    );

    // Refresh handler
    const handleRefresh = useCallback(
        async (
            tab = activeTab,
            searchTourNo = tourNo,
            searchDate = selectedDate,
            extraFilters = filters,
            overrideMode,
            overrideEmployee
        ) => {
            isFetchingRef.current = false;
            setHasMoreData(true);
            hasMoreRef.current = true;
            setPage(1);
            dispatch(clearTravelCancelMakerSummaryArray());
            await loadData(1, true, tab, searchTourNo, searchDate, extraFilters, overrideMode, overrideEmployee);
        },
        [dispatch, loadData, activeTab, tourNo, selectedDate, filters]
    );

    // Focus effect for automatic refresh
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const refreshOnFocus = async () => {
                await new Promise((resolve) => setTimeout(resolve, 300));
                if (isActive && !firstLoadRef.current) {
                    await handleRefresh();
                }
            };
            refreshOnFocus();
            return () => {
                isActive = false;
            };
        }, [activeTab, handleRefresh])
    );

    useEffect(() => {
        return () => {
            dispatch(clearTravelCancelMakerSummaryArray());
            dispatch(clearFilters());
        };
    }, [dispatch]);

    // Tab change handler (Tour <-> Tour Advance)
    const handleTabChange = (newTab) => {
        if (activeTab === newTab) return;
        setActiveTab(newTab);
        dispatch(clearTravelCancelMakerSummaryArray());
        setPage(1);
        setHasMoreData(true);
        hasMoreRef.current = true;
        handleRefresh(newTab, tourNo, selectedDate, filters);
    };

    // Search button clicked (matches Angular tourMakerSearch)
    const handleSearch = () => {
        handleRefresh(activeTab, tourNo, selectedDate, filters);
    };

    // Clear button clicked (matches Angular clearclick)
    const handleClear = () => {
        setTourNo("");
        setSelectedDate(null);
        dispatch(clearFilters());
        handleRefresh(activeTab, "", null, {});
    };

    // Date picker change handler (matches Angular fromDateSelection)
    const onDateChange = (event, date) => {
        setShowDatePicker(false);
        if (event.type === "set" && date) {
            setSelectedDate(date);
        }
    };

    // Infinite Scroll Load More
    const handleLoadMore = () => {
        if (
            !isLoadingMore &&
            hasMoreData &&
            !isFetching &&
            !isFetchingRef.current
        ) {
            loadData(page, false, activeTab, tourNo, selectedDate, filters);
        }
    };

    // Card Press / Edit Action (matches Angular canceledit)
    const handleCardPress = (item) => {
        const isAdvance =
            activeTab === "Advance" ||
            item?.type === "AdvanceCancel" ||
            item?.advance_cancel_status !== undefined;

        if (isAdvance) {
            const advanceTourId =
                item?.tourgid || item?.tour_id || item?.tourid || item?.id;
            navigation.navigate("advance_maker_edit", {
                tourDataParams: {
                    ...item,
                    id: advanceTourId,
                    tourgid: advanceTourId,
                },
                tour_id: advanceTourId,
                from: "ADVANCE_MAKER",
                onbehalf:
                    selectedEmployee?.employeegid || selectedEmployee?.id,
                onbehalfname:
                    selectedEmployee?.employee_name || selectedEmployee?.full_name,
            });
        } else {
            const tourId =
                item?.tourid || item?.tour_id || item?.tourId || item?.id || item?.tourgid;

            navigation.navigate("travel_edit_screen", {
                tourDataParams: {
                    ...item,
                    id: tourId,
                    tourid: tourId,
                    tour_id: tourId,
                },
                tour_id: tourId,
                from: "CANCEL_MAKER",
                onbehalf:
                    selectedEmployee?.employeegid || selectedEmployee?.id,
                onbehalfname:
                    selectedEmployee?.employee_name || selectedEmployee?.full_name,
            });
        }
    };

    // Create Cancel Request button (matches Angular canceladd)
    const handleCreateCancelRequest = () => {
        Alert.alert(
            "Create Cancel Request",
            "Select approved item to cancel:",
            [
                {
                    text: "Cancel Approved Tour",
                    onPress: () => {
                        navigation.navigate("travel_maker_summary", {
                            from: "CANCEL_MAKER",
                        });
                    },
                },
                {
                    text: "Cancel Approved Advance",
                    onPress: () => {
                        navigation.navigate("advance_maker_summary", {
                            from: "CANCEL_MAKER",
                        });
                    },
                },
                { text: "Dismiss", style: "cancel" },
            ],
            { cancelable: true }
        );
    };

    // FilterModal handlers
    const applyModalFilters = (appliedFilters) => {
        dispatch(setFilters(appliedFilters));
        setFilterModalVisible(false);
        handleRefresh(activeTab, tourNo, selectedDate, appliedFilters);
    };

    const clearModalFilters = () => {
        dispatch(clearFilters());
        setFilterModalVisible(false);
        handleRefresh(activeTab, tourNo, selectedDate, {});
    };

    return (
        <SafeAreaView
            style={[
                mainStyles.container,
                { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
            ]}
            edges={["bottom"]}
        >
            {/* 1. On Behalf Header Banner */}
            {mode === "onbehalf" && selectedEmployee && (
                <TouchableOpacity
                    style={[
                        mainStyles.onBehalfContainer,
                        {
                            backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
                            borderColor: isDark ? "#3B82F6" : "#BFDBFE",
                        },
                    ]}
                    onPress={() => setIsSelfModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <View style={mainStyles.onBehalfIconBadge}>
                        <MaterialIcons name="switch-account" size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text
                            allowFontScaling={false}
                            style={[
                                mainStyles.onBehalfSubText,
                                { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                        >
                            Booking On Behalf Of (Tap to switch)
                        </Text>
                        <Text
                            allowFontScaling={false}
                            style={[
                                mainStyles.onBehalfEmployeeName,
                                { color: isDark ? "#60A5FA" : "#1D4ED8" },
                            ]}
                            numberOfLines={1}
                        >
                            {selectedEmployee?.employee_name || selectedEmployee?.full_name}
                        </Text>
                    </View>
                    <MaterialIcons name="swap-horiz" size={20} color="#2563EB" />
                </TouchableOpacity>
            )}

            {/* 2. Modern Segmented Tab Switcher */}
            <View
                style={[
                    mainStyles.tabContainer,
                    {
                        backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
                    },
                ]}
            >
                <TouchableOpacity
                    style={[
                        mainStyles.tabButton,
                        activeTab === "Tour" && [
                            mainStyles.activeTabButton,
                            {
                                backgroundColor: isDark ? "#334155" : "#FFFFFF",
                            },
                        ],
                    ]}
                    onPress={() => handleTabChange("Tour")}
                    activeOpacity={0.85}
                >
                    <MaterialIcons
                        name="card-travel"
                        size={17}
                        color={
                            activeTab === "Tour"
                                ? CustomColors.appThemeColor
                                : isDark
                                    ? "#94A3B8"
                                    : "#64748B"
                        }
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        allowFontScaling={false}
                        style={[
                            mainStyles.tabText,
                            activeTab === "Tour"
                                ? [
                                    mainStyles.activeTabText,
                                    { color: CustomColors.appThemeColor },
                                ]
                                : { color: isDark ? "#94A3B8" : "#64748B" },
                        ]}
                    >
                        Tour Cancel
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        mainStyles.tabButton,
                        activeTab === "Advance" && [
                            mainStyles.activeTabButton,
                            {
                                backgroundColor: isDark ? "#334155" : "#FFFFFF",
                            },
                        ],
                    ]}
                    onPress={() => handleTabChange("Advance")}
                    activeOpacity={0.85}
                >
                    <MaterialIcons
                        name="payments"
                        size={17}
                        color={
                            activeTab === "Advance"
                                ? CustomColors.appThemeColor
                                : isDark
                                    ? "#94A3B8"
                                    : "#64748B"
                        }
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        allowFontScaling={false}
                        style={[
                            mainStyles.tabText,
                            activeTab === "Advance"
                                ? [
                                    mainStyles.activeTabText,
                                    { color: CustomColors.appThemeColor },
                                ]
                                : { color: isDark ? "#94A3B8" : "#64748B" },
                        ]}
                    >
                        Advance Cancel
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 3. Executive Filter & Search Card */}
            <View
                style={[
                    mainStyles.filterCard,
                    {
                        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                        borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                ]}
            >
                {/* Search Input Row */}
                <View style={mainStyles.inputRow}>
                    {/* Tour No Input */}
                    <View
                        style={[
                            mainStyles.inputWrapper,
                            {
                                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                                borderColor: isDark ? "#334155" : "#CBD5E1",
                            },
                        ]}
                    >
                        <MaterialIcons
                            name="search"
                            size={18}
                            color={isDark ? "#94A3B8" : "#64748B"}
                            style={{ marginRight: 6 }}
                        />
                        <TextInput
                            placeholder="Tour / Request No"
                            placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                            value={tourNo}
                            onChangeText={setTourNo}
                            style={[
                                mainStyles.textInput,
                                { color: isDark ? "#F8FAFC" : "#0F172A" },
                            ]}
                            autoCapitalize="none"
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                        {tourNo ? (
                            <TouchableOpacity
                                onPress={() => setTourNo("")}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialIcons
                                    name="close"
                                    size={16}
                                    color={isDark ? "#94A3B8" : "#64748B"}
                                />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Request Date Picker */}
                    <TouchableOpacity
                        style={[
                            mainStyles.dateWrapper,
                            {
                                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                                borderColor: isDark ? "#334155" : "#CBD5E1",
                            },
                        ]}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons
                            name="calendar-today"
                            size={16}
                            color={isDark ? "#94A3B8" : "#64748B"}
                            style={{ marginRight: 6 }}
                        />
                        <Text
                            allowFontScaling={false}
                            style={[
                                mainStyles.dateText,
                                {
                                    color: selectedDate
                                        ? isDark
                                            ? "#F8FAFC"
                                            : "#0F172A"
                                        : isDark
                                            ? "#64748B"
                                            : "#94A3B8",
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {selectedDate ? formatDateToDisplay(selectedDate) : "Request Date"}
                        </Text>
                        {selectedDate ? (
                            <TouchableOpacity
                                onPress={() => setSelectedDate(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialIcons
                                    name="close"
                                    size={15}
                                    color={isDark ? "#94A3B8" : "#64748B"}
                                />
                            </TouchableOpacity>
                        ) : null}
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={selectedDate || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onDateChange}
                    />
                )}

                {/* Actions Row */}
                <View style={mainStyles.actionsRow}>
                    <TouchableOpacity
                        style={[
                            mainStyles.resetButton,
                            {
                                borderColor: isDark ? "#334155" : "#CBD5E1",
                                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                            },
                        ]}
                        onPress={handleClear}
                        activeOpacity={0.75}
                    >
                        <MaterialIcons
                            name="refresh"
                            size={16}
                            color={isDark ? "#94A3B8" : "#475569"}
                        />
                        <Text
                            allowFontScaling={false}
                            style={[
                                mainStyles.resetBtnText,
                                { color: isDark ? "#CBD5E1" : "#475569" },
                            ]}
                        >
                            Reset
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            mainStyles.searchButton,
                            { backgroundColor: CustomColors.appThemeColor },
                        ]}
                        onPress={handleSearch}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="search" size={17} color="#FFFFFF" />
                        <Text allowFontScaling={false} style={mainStyles.searchBtnText}>
                            Search
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Active Filter Chips Bar */}
                {hasActiveFilters ? (
                    <View style={mainStyles.activeFilterChipsRow}>
                        <Text
                            allowFontScaling={false}
                            style={[
                                mainStyles.activeFilterLabel,
                                { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                        >
                            Active:
                        </Text>
                        {tourNo ? (
                            <View
                                style={[
                                    mainStyles.filterChip,
                                    { backgroundColor: isDark ? "#334155" : "#EFF6FF" },
                                ]}
                            >
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        mainStyles.filterChipText,
                                        { color: isDark ? "#93C5FD" : "#1D4ED8" },
                                    ]}
                                >
                                    Tour: {tourNo}
                                </Text>
                                <TouchableOpacity onPress={() => setTourNo("")}>
                                    <MaterialIcons
                                        name="close"
                                        size={13}
                                        color={isDark ? "#93C5FD" : "#1D4ED8"}
                                    />
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        {selectedDate ? (
                            <View
                                style={[
                                    mainStyles.filterChip,
                                    { backgroundColor: isDark ? "#334155" : "#EFF6FF" },
                                ]}
                            >
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        mainStyles.filterChipText,
                                        { color: isDark ? "#93C5FD" : "#1D4ED8" },
                                    ]}
                                >
                                    Date: {formatDateToDisplay(selectedDate)}
                                </Text>
                                <TouchableOpacity onPress={() => setSelectedDate(null)}>
                                    <MaterialIcons
                                        name="close"
                                        size={13}
                                        color={isDark ? "#93C5FD" : "#1D4ED8"}
                                    />
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </View>

            {/* 4. Results Header Strip */}
            <View style={mainStyles.resultsHeader}>
                <View style={mainStyles.resultsTitleGroup}>
                    <Text
                        allowFontScaling={false}
                        style={[
                            mainStyles.resultsTitle,
                            { color: isDark ? "#F8FAFC" : "#1E293B" },
                        ]}
                    >
                        {activeTab === "Tour" ? "Tour Cancel Requests" : "Advance Cancel Requests"}
                    </Text>
                    {cancelSummaryData?.length > 0 && (
                        <View
                            style={[
                                mainStyles.countBadge,
                                { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
                            ]}
                        >
                            <Text
                                allowFontScaling={false}
                                style={[
                                    mainStyles.countBadgeText,
                                    { color: isDark ? "#CBD5E1" : "#475569" },
                                ]}
                            >
                                {cancelSummaryData.length}
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => handleRefresh(activeTab, tourNo, selectedDate, filters)}
                    style={mainStyles.refreshIconBtn}
                    activeOpacity={0.65}
                >
                    <MaterialIcons
                        name="sync"
                        size={18}
                        color={isDark ? "#94A3B8" : "#64748B"}
                    />
                </TouchableOpacity>
            </View>

            {/* 5. Advanced Filter Modal */}
            <FilterModal
                isVisible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                filters={filters}
                dispatch={dispatch}
                setFilters={setFilters}
                applyFilters={applyModalFilters}
                clearAllFilters={clearModalFilters}
                showStatusFilter={false}
                title={"Cancel Request Filter"}
            />

            {/* 6. Main List Rendering */}
            {isFetching && page === 1 ? (
                <View style={mainStyles.loadingContainer}>
                    <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
                    <Text
                        allowFontScaling={false}
                        style={[
                            mainStyles.loadingText,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                        ]}
                    >
                        Loading cancel requests...
                    </Text>
                </View>
            ) : cancelSummaryData?.length > 0 ? (
                <RowList
                    data={cancelSummaryData}
                    RenderItem={(props) => (
                        <CancelRequestCard
                            {...props}
                            isAdvance={activeTab === "Advance"}
                            CustomColors={CustomColors}
                            isDark={isDark}
                        />
                    )}
                    onLoadMore={handleLoadMore}
                    isLoadingMore={isLoadingMore}
                    hasMoreData={hasMoreData}
                    onRefresh={() => handleRefresh(activeTab, tourNo, selectedDate, filters)}
                    refreshing={isFetching && page === 1}
                    onPress={handleCardPress}
                />
            ) : (
                <View style={mainStyles.emptyStateContainer}>
                    <View
                        style={[
                            mainStyles.emptyIconCircle,
                            { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" },
                        ]}
                    >
                        <MaterialIcons
                            name="event-busy"
                            size={44}
                            color={isDark ? "#64748B" : "#94A3B8"}
                        />
                    </View>
                    <Text
                        allowFontScaling={false}
                        style={[
                            mainStyles.emptyTitle,
                            { color: isDark ? "#F8FAFC" : "#1E293B" },
                        ]}
                    >
                        No Cancel Requests Found
                    </Text>
                    <Text
                        allowFontScaling={false}
                        style={[
                            mainStyles.emptySub,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                        ]}
                    >
                        {hasActiveFilters
                            ? "Try adjusting your search criteria or resetting filters."
                            : "You have not raised any cancellation requests yet."}
                    </Text>

                    <View style={mainStyles.emptyActionsRow}>
                        {hasActiveFilters ? (
                            <TouchableOpacity
                                style={[
                                    mainStyles.emptyClearBtn,
                                    {
                                        borderColor: isDark ? "#334155" : "#CBD5E1",
                                    },
                                ]}
                                onPress={handleClear}
                                activeOpacity={0.75}
                            >
                                <MaterialIcons
                                    name="refresh"
                                    size={16}
                                    color={isDark ? "#CBD5E1" : "#475569"}
                                />
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        mainStyles.emptyClearBtnText,
                                        { color: isDark ? "#CBD5E1" : "#475569" },
                                    ]}
                                >
                                    Reset Filters
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={[
                                mainStyles.emptyCreateBtn,
                                { backgroundColor: CustomColors.appThemeColor },
                            ]}
                            onPress={handleCreateCancelRequest}
                            activeOpacity={0.8}
                        >
                            <MaterialIcons name="add" size={18} color="#FFFFFF" />
                            <Text
                                allowFontScaling={false}
                                style={mainStyles.emptyCreateBtnText}
                            >
                                Create Cancel Request
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Self or OnBehalf Modal */}
            <SelfOrOnBehalfModal
                visible={isSelfModalVisible}
                onSubmit={handleSelfOrOnBehalfSubmit}
                onClose={handleSelfOrOnBehalfClose}
            />
        </SafeAreaView>
    );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const headerStyles = StyleSheet.create({
    filterActiveDot: {
        position: "absolute",
        top: 2,
        right: 2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#EF4444",
        borderWidth: 1.5,
        borderColor: "#FFFFFF",
    },
    headerAddBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        marginRight: horizontalScale(10),
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
});

const mainStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    onBehalfContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: horizontalScale(14),
        marginTop: verticalScale(10),
        marginBottom: verticalScale(4),
        paddingVertical: verticalScale(8),
        paddingHorizontal: horizontalScale(12),
        borderRadius: moderateScale(12),
        borderWidth: 1,
    },
    onBehalfIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#DBEAFE",
        alignItems: "center",
        justifyContent: "center",
    },
    onBehalfSubText: {
        fontSize: moderateScale(11),
        fontFamily: Fonts.medium,
    },
    onBehalfEmployeeName: {
        fontSize: moderateScale(13),
        fontFamily: Fonts.bold,
    },
    tabContainer: {
        flexDirection: "row",
        marginHorizontal: horizontalScale(14),
        marginTop: verticalScale(10),
        marginBottom: verticalScale(8),
        borderRadius: moderateScale(12),
        padding: moderateScale(3),
    },
    tabButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: verticalScale(9),
        borderRadius: moderateScale(10),
    },
    activeTabButton: {
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    tabText: {
        fontSize: moderateScale(13),
        fontFamily: Fonts.medium,
    },
    activeTabText: {
        fontFamily: Fonts.bold,
    },
    filterCard: {
        marginHorizontal: horizontalScale(14),
        marginBottom: verticalScale(10),
        padding: moderateScale(12),
        borderRadius: moderateScale(16),
        borderWidth: 1,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    inputRow: {
        flexDirection: "row",
        gap: horizontalScale(8),
    },
    inputWrapper: {
        flex: 1,
        height: verticalScale(42),
        borderRadius: moderateScale(10),
        borderWidth: 1,
        paddingHorizontal: horizontalScale(10),
        flexDirection: "row",
        alignItems: "center",
    },
    textInput: {
        flex: 1,
        fontSize: moderateScale(12),
        fontFamily: Fonts.regular,
        padding: 0,
    },
    dateWrapper: {
        flex: 1,
        height: verticalScale(42),
        borderRadius: moderateScale(10),
        borderWidth: 1,
        paddingHorizontal: horizontalScale(10),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dateText: {
        flex: 1,
        fontSize: moderateScale(12),
        fontFamily: Fonts.regular,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: verticalScale(10),
        gap: horizontalScale(8),
    },
    resetButton: {
        flex: 1,
        height: verticalScale(38),
        borderRadius: moderateScale(9),
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    resetBtnText: {
        fontSize: moderateScale(12),
        fontFamily: Fonts.medium,
    },
    searchButton: {
        flex: 1,
        height: verticalScale(38),
        borderRadius: moderateScale(9),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchBtnText: {
        color: "#FFFFFF",
        fontSize: moderateScale(12),
        fontFamily: Fonts.semiBold,
    },
    activeFilterChipsRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        marginTop: verticalScale(8),
        gap: horizontalScale(6),
        paddingTop: verticalScale(6),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#E2E8F0",
    },
    activeFilterLabel: {
        fontSize: moderateScale(11),
        fontFamily: Fonts.medium,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: verticalScale(3),
        paddingHorizontal: horizontalScale(8),
        borderRadius: moderateScale(12),
        gap: 4,
    },
    filterChipText: {
        fontSize: moderateScale(11),
        fontFamily: Fonts.medium,
    },
    resultsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: horizontalScale(16),
        marginBottom: verticalScale(6),
    },
    resultsTitleGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: horizontalScale(6),
    },
    resultsTitle: {
        fontSize: moderateScale(13),
        fontFamily: Fonts.semiBold,
    },
    countBadge: {
        paddingHorizontal: horizontalScale(7),
        paddingVertical: verticalScale(1),
        borderRadius: moderateScale(10),
    },
    countBadgeText: {
        fontSize: moderateScale(11),
        fontFamily: Fonts.semiBold,
    },
    refreshIconBtn: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: verticalScale(40),
    },
    loadingText: {
        marginTop: verticalScale(10),
        fontSize: moderateScale(13),
        fontFamily: Fonts.regular,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: horizontalScale(32),
        paddingBottom: verticalScale(50),
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: verticalScale(14),
    },
    emptyTitle: {
        fontSize: moderateScale(16),
        fontFamily: Fonts.bold,
        textAlign: "center",
        marginBottom: verticalScale(6),
    },
    emptySub: {
        fontSize: moderateScale(12),
        fontFamily: Fonts.regular,
        textAlign: "center",
        lineHeight: 18,
        marginBottom: verticalScale(18),
    },
    emptyActionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: horizontalScale(10),
    },
    emptyClearBtn: {
        paddingVertical: verticalScale(9),
        paddingHorizontal: horizontalScale(14),
        borderRadius: moderateScale(9),
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    emptyClearBtnText: {
        fontSize: moderateScale(12),
        fontFamily: Fonts.medium,
    },
    emptyCreateBtn: {
        paddingVertical: verticalScale(9),
        paddingHorizontal: horizontalScale(16),
        borderRadius: moderateScale(9),
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    emptyCreateBtnText: {
        color: "#FFFFFF",
        fontSize: moderateScale(12),
        fontFamily: Fonts.semiBold,
    },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: moderateScale(16),
        marginHorizontal: horizontalScale(14),
        marginVertical: verticalScale(6),
        borderWidth: 1,
        elevation: 3,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 5,
        overflow: "hidden",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: verticalScale(12),
        paddingHorizontal: horizontalScale(14),
        paddingBottom: verticalScale(6),
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: horizontalScale(8),
    },
    sNoBadge: {
        paddingHorizontal: horizontalScale(6),
        paddingVertical: verticalScale(2),
        borderRadius: moderateScale(6),
        marginRight: horizontalScale(8),
    },
    sNoText: {
        fontSize: moderateScale(11),
        fontFamily: Fonts.bold,
    },
    tourNoWrapper: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    tourNoText: {
        fontSize: moderateScale(15),
        fontFamily: Fonts.bold,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: verticalScale(3),
        paddingHorizontal: horizontalScale(8),
        borderRadius: moderateScale(12),
        borderWidth: 1,
    },
    statusText: {
        fontSize: moderateScale(10),
        fontFamily: Fonts.bold,
    },
    divider: {
        height: 1,
        marginHorizontal: horizontalScale(14),
        marginVertical: verticalScale(8),
    },
    body: {
        paddingHorizontal: horizontalScale(14),
        paddingBottom: verticalScale(10),
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: verticalScale(6),
    },
    iconCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    employeeName: {
        fontSize: moderateScale(13),
        fontFamily: Fonts.semiBold,
    },
    gradePill: {
        paddingHorizontal: horizontalScale(6),
        paddingVertical: verticalScale(2),
        borderRadius: moderateScale(6),
        marginLeft: horizontalScale(6),
    },
    gradeText: {
        fontSize: moderateScale(10),
        fontFamily: Fonts.medium,
    },
    infoText: {
        fontSize: moderateScale(12),
        fontFamily: Fonts.regular,
        marginLeft: horizontalScale(8),
        flex: 1,
    },
    amountLabel: {
        fontSize: moderateScale(12),
        fontFamily: Fonts.medium,
        marginLeft: horizontalScale(8),
    },
    amountValue: {
        fontSize: moderateScale(13),
        fontFamily: Fonts.bold,
    },
    reasonBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: moderateScale(8),
        borderRadius: moderateScale(8),
        borderWidth: 1,
        marginTop: verticalScale(4),
    },
    reasonText: {
        flex: 1,
        fontSize: moderateScale(11),
        fontFamily: Fonts.regular,
        fontStyle: "italic",
        lineHeight: 16,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: horizontalScale(14),
        paddingVertical: verticalScale(8),
        borderTopWidth: 1,
    },
    footerHintRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    footerHintText: {
        fontSize: moderateScale(11),
        fontFamily: Fonts.regular,
    },
    viewButtonPill: {
        flexDirection: "row",
        alignItems: "center",
    },
    viewButtonText: {
        fontSize: moderateScale(12),
        fontFamily: Fonts.bold,
    },
});

export default CancelMakerSummaryScreen;
