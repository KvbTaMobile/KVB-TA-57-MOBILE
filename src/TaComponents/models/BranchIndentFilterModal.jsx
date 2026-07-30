import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    TextInput,
    Modal,
    TouchableOpacity,
    Dimensions,
} from "react-native";

import { useDispatch, useSelector } from "react-redux";
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import {
    setMakerFilters,
    setApproverFilters,
} from "../../redux/slices/branchIndentSlice";
import {
    useLazyBranchSearchQuery,
    useLazyCommoditySearchQuery,
    useLazyProductSearchQuery,
    useLazyProductTypeSearchQuery
} from "../../redux/rtk_query/apiSlice";
// import { CustomColors } from "../../styles/CustomColors";
import { getCustomColors } from "../../styles/CustomColors";


const { height } = Dimensions.get('window');
export default function BranchIndentMakerFilterScreen({
    visible,
    setVisible,
    origin = "BIRMaker", // ✅ comes from parent
}) {


    const dispatch = useDispatch();
    const isDark = useSelector(state => state.theme.isDark);
    const CustomColors = getCustomColors(isDark);

    const { makerFilters, approverFilters } = useSelector(state => state.branchIndent);
    const currentReduxFilters = origin === "BIRMaker" ? makerFilters : approverFilters;

    /* -------------------- PICKER VISIBILITY -------------------- */
    const [branchPicker, setBranchPicker] = useState(false);
    const [commodityPicker, setCommodityPicker] = useState(false);
    const [productTypePicker, setProductTypePicker] = useState(false);
    const [productPicker, setProductPicker] = useState(false);

    /* -------------------- SELECTION STATES -------------------- */
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedCommodity, setSelectedCommodity] = useState(null);
    const [selectedProductType, setSelectedProductType] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [pir, setpir] = useState("");

    const [qty, setQuantity] = useState("");

    /* -------------------- PAGINATION & DATA STATES -------------------- */
    const [branchData, setBranchData] = useState([]);
    const [branchQuery, setBranchQuery] = useState("");
    const [branchPage, setBranchPage] = useState(1);

    const [commodityData, setCommodityData] = useState([]);
    const [commodityQuery, setCommodityQuery] = useState("");
    const [commodityPage, setCommodityPage] = useState(1);

    const [productTypeData, setProductTypeData] = useState([]); // ✅ Added
    const [productTypePage, setProductTypePage] = useState(1);   // ✅ Added

    const [productData, setProductData] = useState([]);
    const [productQuery, setProductQuery] = useState("");
    const [productPage, setProductPage] = useState(1);

    // const productTypeOptions = [
    //     { label: "Material", value: 158 },
    //     { label: "Subcontract", value: 159 },
    //     { label: "Property", value: 160 },
    //     { label: "Civil", value: 161 }
    // ];

    /* -------------------- RTK QUERY HOOKS -------------------- */
    const [searchBranch, branchRes] = useLazyBranchSearchQuery();
    const [searchCommodity, commodityRes] = useLazyCommoditySearchQuery();
    const [searchProduct, productRes] = useLazyProductSearchQuery();
    const [searchProductType, productTypeRes] = useLazyProductTypeSearchQuery();
    /* -------------------- SYNC REDUX TO LOCAL -------------------- */
    useEffect(() => {
        if (visible) {
            setSelectedBranch(currentReduxFilters.selectedBranch || null);
            setSelectedCommodity(currentReduxFilters.selectedCommodity || null);
            setSelectedProductType(currentReduxFilters.selectedProductType || null);
            setSelectedProduct(currentReduxFilters.selectedProduct || null);
            setpir(currentReduxFilters.pir?.toString() || "")
            setQuantity(currentReduxFilters.qty?.toString() || "");
        }
    }, [visible, currentReduxFilters]);

    /* -------------------- DATA AGGREGATION -------------------- */
    useEffect(() => {
        if (branchRes.data?.data) {
            setBranchData(prev => branchPage === 1 ? branchRes.data.data : [...prev, ...branchRes.data.data]);
        }
    }, [branchRes.data]);
    useEffect(() => {
        if (productTypeRes.data?.data) {

            setProductTypeData(prev => {

                const merged =
                    productTypePage === 1
                        ? productTypeRes.data.data
                        : [...prev, ...productTypeRes.data.data];

                // remove duplicates
                return merged.filter(
                    (item, index, self) =>
                        index === self.findIndex(t => t.id === item.id)
                );
            });
        }
    }, [productTypeRes.data]);
    useEffect(() => {
        if (commodityRes.data?.data) {
            setCommodityData(prev => commodityPage === 1 ? commodityRes.data.data : [...prev, ...commodityRes.data.data]);
        }
    }, [commodityRes.data]);

    useEffect(() => {
        if (productRes.data?.data) {
            setProductData(prev => productPage === 1 ? productRes.data.data : [...prev, ...productRes.data.data]);
        }
    }, [productRes.data]);

    /* -------------------- HANDLERS -------------------- */
    const handleSearch = (type, text) => {
        if (type === 'branch') {
            setBranchQuery(text); setBranchPage(1);
            searchBranch({ searchText: text, pageNo: 1 });
        } else if (type === 'commodity') {
            setCommodityQuery(text); setCommodityPage(1);
            searchCommodity({ searchText: text, pageNo: 1 });
        } else if (type === 'productType') {
            setProductTypePage(1);

            searchProductType({
                params_data: {
                    page: 1,
                    data: text || "",
                }
            });
        }
        else if (type === 'product') {
            setProductQuery(text); setProductPage(1);
            // 🔹 FIX: Pass the IDs from your selected states
            searchProduct({
                searchText: text,
                pageNo: 1,
                commodity_id: selectedCommodity?.id || "",
                product_type: selectedProductType?.id || "", // Using .id from your new API
                branch_id: selectedBranch?.id || "",
                no: pir || ""

            });
        }
    };

    const handleLoadMore = (type) => {
        if (type === 'branch' && branchRes.data?.pagination?.has_next && !branchRes.isFetching) {
            const next = branchPage + 1; setBranchPage(next);
            searchBranch({ searchText: branchQuery, pageNo: next });
        } else if (type === 'commodity' && commodityRes.data?.pagination?.has_next && !commodityRes.isFetching) {
            const next = commodityPage + 1; setCommodityPage(next);
            searchCommodity({ searchText: commodityQuery, pageNo: next });
        } else if (type === 'product' && productRes.data?.pagination?.has_next && !productRes.isFetching) {
            const next = productPage + 1; setProductPage(next);
            searchProduct({ searchText: productQuery, pageNo: next });
        }
        else if (
            type === 'productType' &&
            productTypeRes.data?.pagination?.has_next &&
            !productTypeRes.isFetching
        ) {
            const next = productTypePage + 1;

            setProductTypePage(next);

            searchProductType({
                params_data: {
                    page: next,
                    data: "",
                }
            });
        }
    };

    const RenderDropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
        // 🔹 FIX: Compare unique IDs or values, not the whole object or generic keys
        const isSelected = selected && (
            (options.id && selected.id === options.id) ||
            (options.value && selected.value === options.value) ||
            (options.product_id && selected.product_id === options.product_id)
        );

        return (
            <TouchableOpacity
                onPress={() => {
                    onPress(options);
                    setPickerStatus(false);
                }}
                style={[
                    styles.actionSheetOption,
                    isSelected && styles.actionSheetOptionSelected // Only blue if ID matches
                ]}
            >
                <Text allowFontScaling={false} style={[
                    styles.actionSheetOptionText,
                    isSelected && styles.actionSheetOptionTextSelected
                ]}>
                    {options.label || options.fullname || options.name || options.productdisplayname}
                </Text>
            </TouchableOpacity>
        );
    };
    const applyFilter = () => {
        const filters = {
            // API Data (Numbers/Strings)
            branch_id: selectedBranch?.id || "",
            commodity_id: selectedCommodity?.id || "",
            product_type: selectedProductType?.id || selectedProductType?.value || "", // ✅ Use .id from API
            product_id: selectedProduct?.product_id || selectedProduct?.id || "",
            pir: pir || "",
            qty: qty || "",

            // UI Persistence Data (Full Objects)
            selectedBranch,
            selectedCommodity,
            selectedProductType,
            selectedProduct
        };
        console.log(origin)
        if (origin === "BIRMaker") {
            dispatch(setMakerFilters(filters));
        } else {
            dispatch(setApproverFilters(filters));
        }

        setVisible(false);
    };

    const clearFilter = () => {
        setSelectedBranch(null); setSelectedCommodity(null); setSelectedProductType(null); setSelectedProduct(null); setQuantity("");
        const empty = { branch_id: "", commodity_id: "", product_type: "", product_id: "", qty: "", selectedBranch: null, selectedCommodity: null, selectedProductType: null, selectedProduct: null, pir: '' };
        dispatch(origin === "BIRMaker" ? setMakerFilters(empty) : setApproverFilters(empty));
    };
    const styles = StyleSheet.create({
        modalOverlay: { flex: 1, backgroundColor: CustomColors.backgroundtransparent, justifyContent: "center", alignItems: "center", padding: 16 },
        modalContainer: { width: "90%", maxHeight: height * 0.8, backgroundColor: CustomColors.backgroundWhite, borderRadius: 20, overflow: "hidden" },
        header: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: CustomColors.liteBlue },
        headerTitle: { fontSize: 18, fontWeight: "700", color: CustomColors.textBlack },
        close: { fontSize: 20, fontWeight: "700", color: CustomColors.textGray },
        body: { padding: 20 },
        label: { fontSize: 12, fontWeight: "700", color: CustomColors.textGray, marginBottom: 8, textTransform: 'uppercase' },
        dropdown: { borderWidth: 1, borderColor: CustomColors.backgroundGray, borderRadius: 12, padding: 14, marginBottom: 20, backgroundColor: CustomColors.backgroundGray2 },
        input: { borderWidth: 1, borderColor: CustomColors.backgroundLightGray, borderRadius: 12, padding: 14, marginBottom: 20, backgroundColor: CustomColors.backgroundGray, fontSize: 15, color: CustomColors.textBlack },
        dropdownText: { fontSize: 15, color: CustomColors.textGray, fontWeight: '500' },
        footer: { flexDirection: "row", padding: 15, borderTopWidth: 1, borderTopColor: CustomColors.lightBlue, gap: 12, backgroundColor: CustomColors.backgroundWhite },
        clearBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: CustomColors.borderBgColor, },
        clearText: { fontWeight: "600", color: CustomColors.textBlack },
        applyBtn: {
            flex: 1.5, padding: 14, backgroundColor: CustomColors.appThemeColor,
            borderRadius: 10, alignItems: "center"
        },
        applyText: { color: CustomColors.textWhite, fontWeight: "700" },
        actionSheetOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: CustomColors.backgroundGray },
        actionSheetOptionSelected: { backgroundColor: CustomColors.backgroundGray2 },
        actionSheetOptionText: { fontSize: 15, color: CustomColors.textDarkGray },
        actionSheetOptionTextSelected: { color: CustomColors.statusSelctedBg, fontWeight: "600" }
    });
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text allowFontScaling={false} style={styles.headerTitle}>Filter Requests</Text>
                        <Pressable onPress={() => setVisible(false)} hitSlop={10}><Text allowFontScaling={false} style={styles.close}>✕</Text></Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                        <Text allowFontScaling={false} style={styles.label}>Product</Text>
                        <Pressable style={styles.dropdown} onPress={() => { setBranchPicker(true); handleSearch('branch', ""); }}>
                            <Text allowFontScaling={false} style={[styles.dropdownText, !selectedBranch && { color: CustomColors.textGray }]}>{selectedBranch?.fullname || "Select Product"}</Text>
                        </Pressable>

                        {/* <Text allowFontScaling={false} style={styles.label}>Commodity</Text>
                        <Pressable style={styles.dropdown} onPress={() => { setCommodityPicker(true); handleSearch('commodity', ""); }}>
                            <Text allowFontScaling={false} style={[styles.dropdownText, !selectedCommodity && { color: CustomColors.textGray }]}>{selectedCommodity?.name || "Select Commodity"}</Text>
                        </Pressable> */}

                        <Text allowFontScaling={false} style={styles.label}>Classification Type</Text>
                        <Pressable
                            style={styles.dropdown}
                            onPress={() => {
                                setProductTypePicker(true);
                                handleSearch('productType', "");
                            }}
                        >
                            <Text allowFontScaling={false} style={[styles.dropdownText, !selectedProductType && { color: CustomColors.textGray }]}>
                                {/* 🔹 Prioritize .name here as well */}
                                {selectedProductType?.name || "Select Classification Type"}
                            </Text>
                        </Pressable>
                        <Text allowFontScaling={false} style={styles.label}>PIR Number</Text>
                        <TextInput allowFontScaling={false} value={pir} onChangeText={setpir} style={styles.input}></TextInput>
                        {/* <Text allowFontScaling={false} style={styles.label}>Product</Text>
                        <Pressable style={styles.dropdown} onPress={() => { setProductPicker(true); handleSearch('product', ""); }}>
                            <Text allowFontScaling={false} style={[styles.dropdownText, !selectedProduct && { color: CustomColors.textGray }]}>{selectedProduct?.productdisplayname || "Select Product"}</Text>
                        </Pressable>

                        <Text allowFontScaling={false} style={styles.label}>qty</Text>
                        <TextInput allowFontScaling={false} style={styles.input} placeholder="0" placeholderTextColor={CustomColors.textGray} value={qty} onChangeText={setQuantity} keyboardType="numeric" /> */}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable style={styles.clearBtn} onPress={clearFilter}><Text allowFontScaling={false} style={styles.clearText}>Clear All</Text></Pressable>
                        <Pressable style={styles.applyBtn} onPress={applyFilter}><Text allowFontScaling={false} style={styles.applyText}>Apply Filter</Text></Pressable>
                    </View>

                    {/* ---------- PICKERS ---------- */}
                    <CustomActionSheetPicker
                        pickerStatus={branchPicker} setPickerStatus={setBranchPicker} title="Select Branch"
                        optionsData={branchData} onSearch={(t) => handleSearch('branch', t)}
                        onEndReached={() => handleLoadMore('branch')}
                        isLoading={branchRes.isLoading && branchPage === 1}
                        isFetchingMore={branchRes.isFetching}
                        hasMoreData={branchRes.data?.pagination?.has_next}
                        RenderItem={RenderDropdownItem}
                        onPress={(item) => setSelectedBranch(item)}
                        selected={selectedBranch}
                    />

                    <CustomActionSheetPicker
                        pickerStatus={commodityPicker} setPickerStatus={setCommodityPicker} title="Select Commodity"
                        optionsData={commodityData} onSearch={(t) => handleSearch('commodity', t)}
                        onEndReached={() => handleLoadMore('commodity')}
                        isLoading={commodityRes.isLoading && commodityPage === 1}
                        isFetchingMore={commodityRes.isFetching}
                        hasMoreData={commodityRes.data?.pagination?.has_next}
                        RenderItem={RenderDropdownItem}
                        onPress={(item) => setSelectedCommodity(item)}
                        selected={selectedCommodity}
                    />
                    <CustomActionSheetPicker
                        pickerStatus={productTypePicker}
                        setPickerStatus={setProductTypePicker}
                        title="Select Product Type"
                        optionsData={productTypeData}
                        onSearch={(t) => handleSearch('productType', t)}
                        onEndReached={() => handleLoadMore('productType')}
                        isLoading={productTypeRes.isLoading && productTypePage === 1}
                        isFetchingMore={productTypeRes.isFetching}
                        hasMoreData={productTypeRes.data?.pagination?.has_next}
                        RenderItem={RenderDropdownItem}
                        onPress={(item) => setSelectedProductType(item)}
                        selected={selectedProductType}
                    />
                    <CustomActionSheetPicker
                        pickerStatus={productPicker} setPickerStatus={setProductPicker} title="Select Product"
                        optionsData={productData} onSearch={(t) => handleSearch('product', t)}
                        onEndReached={() => handleLoadMore('product')}
                        isLoading={productRes.isLoading && productPage === 1}
                        isFetchingMore={productRes.isFetching}
                        hasMoreData={productRes.data?.pagination?.has_next}
                        RenderItem={RenderDropdownItem}
                        onPress={(item) => setSelectedProduct(item)}
                        selected={selectedProduct}
                    />


                </View>
            </View>
        </Modal>
    );
}

