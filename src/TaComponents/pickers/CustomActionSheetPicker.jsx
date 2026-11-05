// CustomActionSheetPicker.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    Animated,
    Dimensions,
    Pressable,
} from 'react-native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCustomColors } from '../../styles/CustomColors';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const SHEET_HEIGHT = Math.round(SCREEN_H * 0.68);
const HEADER_H = 58;
const SEARCH_H = 68;
const PAGINATION_H = 54;
const SAFE_BOTTOM = Platform.OS === 'ios' ? 34 : 0;

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonRow = ({ C, anim }) => {
    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
    return (
        <Animated.View style={[sk.row, { opacity }]}>
            <View style={[sk.avatar, { backgroundColor: C.backgroundGray }]} />
            <View style={sk.lines}>
                <View style={[sk.line1, { backgroundColor: C.backgroundGray }]} />
                <View style={[sk.line2, { backgroundColor: C.backgroundGray }]} />
            </View>
        </Animated.View>
    );
};
const sk = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    lines: { flex: 1, gap: 7 },
    line1: { height: 13, borderRadius: 6, width: '65%' },
    line2: { height: 10, borderRadius: 5, width: '42%' },
});
const SKELETON_COUNT = 7;

// ── getItemKey ────────────────────────────────────────────────────────────────
// Extracts a stable string key from any item shape:
//   { id }  →  storage items that use numeric id
//   { code } → storage/branch items that use code as identifier
//   { value } → dropdown items shaped by mapDropdownData
//   plain string / number → simple list
const getItemKey = (item) => {
    if (item == null) return null;
    if (typeof item !== 'object') return String(item);
    if (item.id != null) return String(item.id);
    if (item.code != null) return String(item.code);
    if (item.value != null) return String(item.value);
    if (item.name != null) return String(item.name);
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
const CustomActionSheetPicker = ({
    pickerStatus,
    setPickerStatus,
    title = 'Select',

    // MODE A — remote
    fetchData,
    pageSize = 15,

    // MODE B — external / local (zero breaking changes)
    optionsData,
    onSearch,
    isLoading: externalLoading,
    isFetchingMore,
    onEndReached,
    hasMoreData,

    // Shared
    RenderItem,
    onPress,
    selected,
    searchPlaceholder = 'Search...',
    emptyText = 'No items found.',
    showSearch = true,
    showPagination = true,
}) => {
    const isDark = useSelector((s) => s.theme.isDark);
    const C = getCustomColors(isDark);

    // ── Internal state ────────────────────────────────────────────────────────
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingMore, setFetchingMore] = useState(false);

    // ── Refs ──────────────────────────────────────────────────────────────────
    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const searchTimeout = useRef(null);
    const appendPageRef = useRef(1);
    const currentPageRef = useRef(1);
    const isFirstRender = useRef(true);
    const isMounted = useRef(false);
    const flatListRef = useRef(null);
    const hasScrolledOnOpen = useRef(false);  // prevent repeat scrolls per open
    const isAppendingRef = useRef(false);  // true while load-more is in flight

    const isRemoteMode = typeof fetchData === 'function';

    // ── Shimmer ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // ── selectedRef — always fresh inside callbacks ───────────────────────────
    const selectedRef = useRef(selected);
    useEffect(() => { selectedRef.current = selected; }, [selected]);

    // ── doScrollToSelected ────────────────────────────────────────────────────
    // Uses getItemKey so it matches BOTH id-keyed and code-keyed items.
    const doScrollToSelected = useCallback((dataArr) => {
        if (!flatListRef.current || !dataArr?.length) return;
        const sel = selectedRef.current;
        if (!sel) return;

        const selKey = getItemKey(sel);
        if (!selKey) return;

        const idx = dataArr.findIndex((item) => getItemKey(item) === selKey);
        if (idx < 0) return;  // selected item not in current page — skip silently

        setTimeout(() => {
            try {
                flatListRef.current?.scrollToIndex({
                    index: idx,
                    animated: true,
                    viewPosition: 0.3,
                });
            } catch {
                // scrollToIndex can fail if the item hasn't rendered yet
                flatListRef.current?.scrollToOffset({
                    offset: idx * 60,
                    animated: true,
                });
            }
        }, 180);
    }, []); // stable — reads selected via ref

    // ── Scroll trigger: MODE A (remote) ──────────────────────────────────────
    // Watches `items` state. Fires once after the first successful remote fetch.
    useEffect(() => {
        if (!pickerStatus || !isRemoteMode) return;
        if (hasScrolledOnOpen.current) return;
        if (isAppendingRef.current) return;
        if (items.length === 0) return;

        doScrollToSelected(items);
        hasScrolledOnOpen.current = true;
    }, [items]);

    // ── Scroll trigger: MODE B (local / external) ─────────────────────────────
    // Watches `optionsData` prop. Fires once each time the picker opens and data
    // arrives (covers both immediate static lists and async-loaded paginated ones).
    useEffect(() => {
        if (!pickerStatus || isRemoteMode) return;
        if (hasScrolledOnOpen.current) return;
        const data = optionsData ?? [];
        if (data.length === 0) return;

        doScrollToSelected(data);
        hasScrolledOnOpen.current = true;
    }, [optionsData, pickerStatus]);

    // ── Remote: load ──────────────────────────────────────────────────────────
    const loadRemote = useCallback(async (q, p, append = false) => {
        if (!isRemoteMode) return;
        isAppendingRef.current = append;
        append ? setFetchingMore(true) : setLoading(true);

        try {
            const res = await fetchData({ search: q, page: p, pageSize });
            if (!isMounted.current) return;
            const newItems = res.items ?? [];
            setItems((prev) => {
                if (!append) return newItems;
                const seen = new Set(prev.map((i) => getItemKey(i) ?? ''));
                return [...prev, ...newItems.filter((i) => !seen.has(getItemKey(i) ?? ''))];
            });
            setTotal(res.total ?? 0);
            setHasMore(res.hasMore ?? false);
        } catch (e) {
            console.warn('[CustomActionSheetPicker]', e);
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setFetchingMore(false);
                isAppendingRef.current = false;
            }
        }
    }, [fetchData, pageSize, isRemoteMode]);

    // ── Open / close ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (pickerStatus) {
            isMounted.current = true;
            isFirstRender.current = true;
            hasScrolledOnOpen.current = false;   // reset on every open
            currentPageRef.current = 1;
            appendPageRef.current = 1;

            setSearchText('');
            setPage(1);
            setItems([]);
            setTotal(0);
            setHasMore(false);

            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 68, friction: 13 }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
            ]).start();

            if (isRemoteMode) loadRemote('', 1, false);

        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(() => { isMounted.current = false; });
        }
    }, [pickerStatus]);

    // ── Remote: search debounce ───────────────────────────────────────────────
    useEffect(() => {
        if (!pickerStatus || !isRemoteMode) return;
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            currentPageRef.current = 1;
            appendPageRef.current = 1;
            hasScrolledOnOpen.current = false;  // allow re-scroll on new search results
            setPage(1);
            loadRemote(searchText, 1, false);
        }, 350);
        return () => clearTimeout(searchTimeout.current);
    }, [searchText]);

    useEffect(() => { if (pickerStatus) isFirstRender.current = true; }, [pickerStatus]);

    // ── Pagination ────────────────────────────────────────────────────────────
    const goToPage = useCallback((targetPage) => {
        if (!pickerStatus || !isRemoteMode) return;
        if (targetPage === currentPageRef.current) return;
        currentPageRef.current = targetPage;
        appendPageRef.current = targetPage;
        hasScrolledOnOpen.current = false;  // re-scroll after page change
        setPage(targetPage);
        loadRemote(searchText, targetPage, false);
    }, [pickerStatus, isRemoteMode, searchText, loadRemote]);

    // ── Remote: infinite scroll ───────────────────────────────────────────────
    const handleEndReached = useCallback(() => {
        if (!isRemoteMode || !hasMore || loading || fetchingMore) return;
        const next = appendPageRef.current + 1;
        appendPageRef.current = next;
        loadRemote(searchText, next, true);
    }, [isRemoteMode, hasMore, loading, fetchingMore, searchText, loadRemote]);

    // ── Local search ──────────────────────────────────────────────────────────
    const handleLocalSearch = (text) => {
        setSearchText(text);
        hasScrolledOnOpen.current = false;  // allow re-scroll after search
        onSearch?.(text);
    };

    // ── Unified data ──────────────────────────────────────────────────────────
    const listData = isRemoteMode ? items : (optionsData ?? []);
    const listLoading = isRemoteMode ? loading : !!externalLoading;
    const listFetching = isRemoteMode ? fetchingMore : !!isFetchingMore;

    // ── Pagination meta ───────────────────────────────────────────────────────
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const pageStart = (page - 1) * pageSize + 1;
    const pageEnd = Math.min(page * pageSize, total);
    const isFirstPage = page <= 1;
    const isLastPage = !hasMore;

    const reservedHeight =
        HEADER_H +
        (showSearch ? SEARCH_H : 0) +
        (isRemoteMode && showPagination && total > pageSize ? PAGINATION_H : 0) +
        SAFE_BOTTOM;

    const listHeight = SHEET_HEIGHT - reservedHeight;
    const handleClose = () => setPickerStatus(false);

    const s = useRef(null);
    s.current = buildStyles(C);

    return (
        <Modal
            visible={pickerStatus}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            {/*
              Layout: a single flex column.
              - Top area: Pressable that fills all space ABOVE the sheet → tap-to-close
              - Bottom area: the sheet itself (fixed height) → absorbs all touches

              This avoids overlapping absoluteFill layers which cause scroll-end
              touches to bleed through to the backdrop and close the sheet.
            */}
            <Animated.View style={[s.current.rootContainer, { opacity: backdropAnim }]} pointerEvents="box-none">
                {/* Empty top area — tap anywhere above sheet to close */}
                <Pressable style={{ flex: 1 }} onPress={handleClose} />
            </Animated.View>

            {/* Sheet column — sits at bottom, never lets touches through */}
            <KeyboardAvoidingView
                style={s.current.sheetWrapper}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                pointerEvents="box-none"
            >
                <Animated.View
                    style={[s.current.sheet, { height: SHEET_HEIGHT, transform: [{ translateY: slideAnim }] }]}
                    pointerEvents="auto"
                >
                    <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>

                        {/* Handle */}
                        <View style={s.current.handleWrap}>
                            <View style={[s.current.handle, { backgroundColor: C.borderColor }]} />
                        </View>

                        {/* Header */}
                        <View style={[s.current.header, { height: HEADER_H, borderBottomColor: C.dividerGray }]}>
                            <Text allowFontScaling={false} style={[s.current.titleText, { color: C.textDark }]} numberOfLines={1}>
                                {title}
                            </Text>
                            {isRemoteMode && !listLoading && total > 0 && (
                                <View style={[s.current.countPill, { backgroundColor: C.primaryLight }]}>
                                    <Text style={[s.current.countPillText, { color: C.primaryBlue }]}>{total}</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                onPress={handleClose}
                                style={[s.current.cancelBtn, { backgroundColor: C.backgroundGray }]}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text allowFontScaling={false} style={[s.current.cancelText, { color: C.textDark }]}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        {showSearch && (
                            <View style={[s.current.searchWrap, { height: SEARCH_H, borderBottomColor: C.dividerGray }]}>
                                <View style={[s.current.searchBox, {
                                    backgroundColor: C.inputBackground,
                                    borderColor: C.textInputBorderColor,
                                }]}>
                                    {listLoading
                                        ? <ActivityIndicator size="small" color={C.primaryBlue} style={s.current.searchLeftIcon} />
                                        : <Text style={s.current.searchLeftIcon}>🔍</Text>
                                    }
                                    <TextInput
                                        allowFontScaling={false}
                                        style={[s.current.searchInput, { color: C.textBlack }]}
                                        placeholder={searchPlaceholder}
                                        placeholderTextColor={C.textLight}
                                        value={searchText}
                                        onChangeText={isRemoteMode ? setSearchText : handleLocalSearch}
                                        autoCorrect={false}
                                        autoCapitalize="none"
                                        clearButtonMode="while-editing"
                                        returnKeyType="search"
                                    />
                                    {Platform.OS === 'android' && searchText.length > 0 && (
                                        <TouchableOpacity onPress={() => {
                                            setSearchText('');
                                            if (!isRemoteMode) {
                                                hasScrolledOnOpen.current = false;
                                                onSearch?.('');
                                            }
                                        }}>
                                            <Text style={{ color: C.textGray, fontSize: 16, paddingHorizontal: 6 }}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* List */}
                        <View style={{ height: listHeight }}>
                            {listLoading && listData.length === 0 ? (
                                <View>
                                    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                                        <SkeletonRow key={i} C={C} anim={shimmerAnim} />
                                    ))}
                                </View>
                            ) : (
                                <FlatList
                                    ref={flatListRef}
                                    data={listData}
                                    keyExtractor={(item, index) => {
                                        const k = getItemKey(item);
                                        return k ? `${k}__${index}` : `i__${index}`;
                                    }}
                                    renderItem={({ item }) => (
                                        <RenderItem
                                            options={item}
                                            onPress={onPress}
                                            setPickerStatus={setPickerStatus}
                                            selected={selected}
                                        />
                                    )}
                                    keyboardShouldPersistTaps="always"
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={
                                        listData.length === 0 ? { flex: 1 } : { paddingBottom: 8 }
                                    }
                                    onEndReachedThreshold={0.5}
                                    onEndReached={
                                        isRemoteMode
                                            ? handleEndReached
                                            : () => { if (hasMoreData && !isFetchingMore) onEndReached?.(); }
                                    }
                                    onScrollToIndexFailed={({ index, averageItemLength }) => {
                                        flatListRef.current?.scrollToOffset({
                                            offset: index * (averageItemLength || 56),
                                            animated: true,
                                        });
                                    }}
                                    ListEmptyComponent={
                                        !listLoading ? (
                                            <View style={s.current.emptyWrap}>
                                                <Text style={s.current.emptyIcon}>🔍</Text>
                                                <Text allowFontScaling={false}
                                                    style={[s.current.emptyText, { color: C.textEmpty }]}>
                                                    {emptyText}
                                                </Text>
                                            </View>
                                        ) : null
                                    }
                                    ListFooterComponent={
                                        listFetching ? (
                                            <View style={s.current.footerLoader}>
                                                <ActivityIndicator size="small" color={C.primaryBlue} />
                                                <Text style={[s.current.footerLoaderText, { color: C.textLight }]}>
                                                    Loading more...
                                                </Text>
                                            </View>
                                        ) : null
                                    }
                                />
                            )}
                        </View>

                        {/* Pagination (Mode A only) */}
                        {isRemoteMode && showPagination && total > pageSize && !listLoading && (
                            <View style={[s.current.paginationWrap, {
                                height: PAGINATION_H,
                                borderTopColor: C.dividerGray,
                                backgroundColor: C.backgroundGray2,
                            }]}>
                                <TouchableOpacity
                                    onPress={() => goToPage(page - 1)}
                                    disabled={isFirstPage || loading}
                                    style={[s.current.pageBtn, {
                                        borderColor: isFirstPage ? C.borderColor : C.primaryBlue,
                                        backgroundColor: isFirstPage ? 'transparent' : C.primaryLight,
                                        opacity: isFirstPage || loading ? 0.38 : 1,
                                    }]}
                                >
                                    <Text style={[s.current.pageBtnText, { color: isFirstPage ? C.textGray : C.primaryBlue }]}>
                                        ‹ Prev
                                    </Text>
                                </TouchableOpacity>

                                <View style={{ alignItems: 'center' }}>
                                    <Text style={[s.current.pageRange, { color: C.textDark }]}>
                                        {pageStart}–{pageEnd}
                                        <Text style={{ color: C.textGray, fontWeight: '400' }}> of {total}</Text>
                                    </Text>
                                    <Text style={[s.current.pageNumLabel, { color: C.textLight }]}>
                                        Page {page} of {totalPages}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    onPress={() => goToPage(page + 1)}
                                    disabled={isLastPage || loading}
                                    style={[s.current.pageBtn, {
                                        borderColor: isLastPage ? C.borderColor : C.primaryBlue,
                                        backgroundColor: isLastPage ? 'transparent' : C.primaryLight,
                                        opacity: isLastPage || loading ? 0.38 : 1,
                                    }]}
                                >
                                    <Text style={[s.current.pageBtnText, { color: isLastPage ? C.textGray : C.primaryBlue }]}>
                                        Next ›
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                    </SafeAreaView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const buildStyles = (C) =>
    StyleSheet.create({
        // rootContainer: absoluteFill animated dim overlay — tap above sheet to close
        rootContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: C.backgroundtransparent, justifyContent: 'flex-end' },
        backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: C.backgroundtransparent },
        // sheetWrapper: sits at the bottom of the screen in normal flow (not absolute)
        sheetWrapper: { justifyContent: 'flex-end', position: 'absolute', bottom: 0, left: 0, right: 0 },
        sheet: { width: SCREEN_W, backgroundColor: C.backgroundWhite, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 20 },
        handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
        handle: { width: 38, height: 4, borderRadius: 2 },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
        titleText: { flex: 1, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
        countPill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
        countPillText: { fontSize: 12, fontWeight: '700' },
        cancelBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
        cancelText: { fontSize: 13, fontWeight: '600' },
        searchWrap: { paddingHorizontal: 14, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
        searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 42 },
        searchLeftIcon: { fontSize: 15, marginRight: 8, width: 20, textAlign: 'center' },
        searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
        emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
        emptyIcon: { fontSize: 36 },
        emptyText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
        footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
        footerLoaderText: { fontSize: 13 },
        paginationWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
        pageBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
        pageBtnText: { fontSize: 13, fontWeight: '600' },
        pageRange: { fontSize: 13, fontWeight: '600' },
        pageNumLabel: { fontSize: 11, marginTop: 1 },
    });

export default CustomActionSheetPicker;
