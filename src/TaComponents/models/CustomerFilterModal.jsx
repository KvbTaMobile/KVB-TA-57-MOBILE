import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
    Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import {
    setCustomerFilters,
    clearCustomerFilters,
} from "../../redux/slices/customerFilterSlice";

import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import { useClassificationDropdownQuery, useHeadernameDropdownQuery, useGSTcategoryDropdownQuery } from "../../redux/rtk_query/apiSlice";

import { getCustomColors } from "../../styles/CustomColors";


const CustomerFilter = ({ visible, onClose, onApplyFilters }) => {
    const dispatch = useDispatch();

    const filters = useSelector((state) => state.customerFilter);

    const [localFilters, setLocalFilters] = useState({
        code: filters?.code || '',
        name: filters?.name || '',
        panno: filters?.panno || '',
        classification: filters?.classification || null,
        headerName: filters?.headerName || null,
        renewalDate: filters?.renewalDate || '',
        status: filters?.status || null,
        requestType: filters?.requestType || null,
        gstCategory: filters?.gstCategory || null,
    });
    console.log("local", localFilters)
    const isDark = useSelector(state => state.theme.isDark);
    const CustomColors = getCustomColors(isDark);

    // State for pagination
    const [classificationPage, setClassificationPage] = useState(1);
    const [headerNamePage, setHeaderNamePage] = useState(1);
    const [gstCategoryPage, setGstCategoryPage] = useState(1);

    // API calls for dynamic dropdown data with pagination
    const { data: classificationData, isFetching: isFetchingClassification } = useClassificationDropdownQuery({ page: classificationPage });
    const { data: headerNameData, isFetching: isFetchingHeaderName } = useHeadernameDropdownQuery({ page: headerNamePage });
    const { data: gstCategoryData, isFetching: isFetchingGstCategory } = useGSTcategoryDropdownQuery({ page: gstCategoryPage });

    // Combined lists for dropdowns
    const [classificationList, setClassificationList] = useState([]);
    const [headerNameList, setHeaderNameList] = useState([]);
    const [gstCategoryList, setGstCategoryList] = useState([]);
    const [showRenewableDatePicker, setShowRenewableDatePicker] = useState(false);

    // Effects to handle API data and pagination
    useEffect(() => {
        if (classificationData?.data) {
            const newItems = classificationData.data.map(item => ({ value: item.id, label: item.name || item.text }));
            setClassificationList(prevList => {
                // Prevent duplication by checking if data is already in the list
                const uniqueItems = newItems.filter(newItem => !prevList.some(item => item.value === newItem.value));
                return [...prevList, ...uniqueItems];
            });
        }
    }, [classificationData]);

    useEffect(() => {
        if (headerNameData?.data) {
            const newItems = headerNameData.data.map(item => ({ value: item.id, label: item.full_name }));
            setHeaderNameList(prevList => {
                const uniqueItems = newItems.filter(newItem => !prevList.some(item => item.value === newItem.value));
                return [...prevList, ...uniqueItems];
            });
        }
    }, [headerNameData]);

    useEffect(() => {
        if (gstCategoryData?.data) {
            const newItems = gstCategoryData.data.map(item => ({ value: item.id, label: item.text }));
            setGstCategoryList(prevList => {
                const uniqueItems = newItems.filter(newItem => !prevList.some(item => item.value === newItem.value));
                return [...prevList, ...uniqueItems];
            });
        }
    }, [gstCategoryData]);

    // Sync local state with Redux filters when they change
    useEffect(() => {
        setLocalFilters({
            code: filters?.code || '',
            name: filters?.name || '',
            panno: filters?.panno || '',
            classification: filters?.classification || null,
            headerName: filters?.headerName || null,
            renewalDate: filters?.renewalDate || '',
            status: filters?.status || null,
            requestType: filters?.requestType || null,
            gstCategory: filters?.gstCategory || null,

        });
    }, [filters]);

    // Static dropdown options
    const statusOptions = [

        { value: 1, label: "DRAFT" },
        //  {'id':2, 'name':'PENDING_RM'},{'id':3, 'name':'PENDING_CHECKER'},
        { value: 4, label: "PENDING_HEADER" },
        { value: 5, label: "APPROVED" },
        { value: 6, label: "RENEWAL_APPROVED" },
        { value: 0, label: "REJECTED" },
    ];

    const requestTypeOptions = [
        { value: 0, label: "All" },
        { value: 3, label: "Activation" },
        { value: 4, label: "Deactivation" },
        { value: 1, label: "Approved" },
        { value: 7, label: "Queue" },
        { value: 2, label: "Modification" },
        { value: 6, label: "Termination" },
        { value: 8, label: "Pending" },
    ];

    // Picker visibility state
    const [statusPickerVisible, setStatusPickerVisible] = useState(false);
    const [requestTypePickerVisible, setRequestTypePickerVisible] = useState(false);
    const [classificationPickerVisible, setClassificationPickerVisible] = useState(false);
    const [headerNamePickerVisible, setHeaderNamePickerVisible] = useState(false);
    const [gstCategoryPickerVisible, setGstCategoryPickerVisible] = useState(false);

    // Helper functions to get labels for selected values
    const getStatusLabel = (value) => statusOptions.find(item => item.value === value)?.label;
    const getRequestTypeLabel = (value) => requestTypeOptions.find(item => item.value === value)?.label;
    const getClassificationLabel = (value) => classificationList.find(item => item.value === value)?.label;
    const getHeaderNameLabel = (value) => headerNameList.find(item => item.value === value)?.label;
    const getGstCategoryLabel = (value) => gstCategoryList.find(item => item.value === value)?.label;

    // Handlers
    const handleApply = () => {
        //console.log("[DEBUG] Applying filters:", localFilters);
        dispatch(setCustomerFilters(localFilters));
        onApplyFilters?.(localFilters);
        onClose?.();
    };

    const handleClear = () => {
        // 1. Reset Redux
        dispatch(clearCustomerFilters());

        // 2. Reset Local Filter state to initial values
        const resetValues = {
            code: '',
            name: '',
            panno: '',
            classification: null,
            headerName: null,
            renewalDate: '',
            status: null,
            requestType: null,
            gstCategory: null,
        };
        setLocalFilters(resetValues);

        // 3. Reset Pagination states for dropdowns
        setClassificationPage(1);
        setHeaderNamePage(1);
        setGstCategoryPage(1);

        // 4. Trigger screen update and close
        onApplyFilters?.(resetValues); // Passing reset values directly fixes the sync delay
        onClose?.();
    };
    const onRenewableDateChange = (event, selectedDate) => {
        setShowRenewableDatePicker(false);
        if (selectedDate) {
            setLocalFilters((prev) => ({
                ...prev,
                renewableDate: selectedDate.toISOString().split("T")[0], // format: YYYY-MM-DD
            }));
        }
    };



    const styles = StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: CustomColors.backgroundtransparent,
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContainer: {
            width: '92%',
            maxHeight: '85%',
            backgroundColor: CustomColors.backgroundCard, // Use Card background for professional feel
            borderRadius: 15,
            padding: 20,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: '800',
            marginBottom: 20,
            color: CustomColors.textBlack,
            textAlign: 'center',
            letterSpacing: 0.5,
        },
        closeButton: {
            position: 'absolute',
            right: 15,
            top: 15,
            zIndex: 1,
        },
        inputGroup: {
            marginBottom: 15,
        },
        input: {
            borderWidth: 1.5,
            borderColor: CustomColors.borderLight, // Subtle borders
            borderRadius: 10,
            padding: 12,
            fontSize: 15,
            color: CustomColors.textBlack,
            backgroundColor: CustomColors.backgroundWhite,
            marginBottom: 12,
        },
        dateInput: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: CustomColors.borderLight,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            backgroundColor: CustomColors.backgroundWhite,
        },
        inputIcon: {
            marginLeft: 'auto',
            color: CustomColors.appThemeColor, // Use theme color for icons
        },
        dateTextFilled: {
            color: CustomColors.textBlack,
            fontWeight: '500',
        },
        dateTextPlaceholder: {
            color: CustomColors.textLight,
        },
        buttonContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingBottom: 10,
        },
        button: {
            flex: 0.48, // Balanced width
            padding: 15,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        clearButton: {
            backgroundColor: CustomColors.dividerGray, // Neutral color for clear
        },
        applyButton: {
            backgroundColor: CustomColors.appThemeColor,
            elevation: 2,
        },
        buttonText: {
            color: CustomColors.white,
            fontWeight: 'bold',
            fontSize: 15,
            textTransform: 'uppercase',
        },
        // Action Sheet Items
        actionSheetOption: {
            padding: 18,
            backgroundColor: CustomColors.backgroundCard,
            borderBottomWidth: 0.5,
            borderBottomColor: CustomColors.dividerGray,
        },
        actionSheetOptionSelected: {
            backgroundColor: CustomColors.primaryLight,
        },
        actionSheetOptionText: {
            fontSize: 16,
            color: CustomColors.textBlack,
            fontWeight: '500',
        },
    });
    const renderActionSheetItem = ({ options, onPress, setPickerStatus, selected }) => (
        <TouchableOpacity
            onPress={() => {
                onPress(options.value);
                setPickerStatus(false);
            }}
            style={[
                styles.actionSheetOption,
                selected === options.value && styles.actionSheetOptionSelected,
            ]}
        >
            <Text allowFontScaling={false} style={styles.actionSheetOptionText}>{options.label}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color={CustomColors.darkGray} />
                        </TouchableOpacity>
                        <Text allowFontScaling={false} style={styles.modalTitle}>Filter Customer</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <TextInput allowFontScaling={false}
                                    placeholder="Code"
                                    placeholderTextColor={CustomColors.textGray}
                                    value={localFilters.code}
                                    onChangeText={(text) => setLocalFilters({ ...localFilters, code: text })}
                                    style={styles.input}
                                />
                                <TextInput allowFontScaling={false}
                                    placeholder="Name"
                                    placeholderTextColor={CustomColors.textGray}
                                    value={localFilters.name}
                                    onChangeText={(text) => setLocalFilters({ ...localFilters, name: text })}
                                    style={styles.input}
                                />
                                <TextInput allowFontScaling={false}
                                    placeholder="PAN No."
                                    placeholderTextColor={CustomColors.textGray}
                                    value={localFilters.panno}
                                    onChangeText={(text) => setLocalFilters({ ...localFilters, panno: text })}
                                    style={styles.input}
                                />
                                <TouchableOpacity
                                    onPress={() => setStatusPickerVisible(true)}
                                    style={styles.dateInput}
                                >
                                    <Text allowFontScaling={false}
                                        style={
                                            localFilters.status !== null && localFilters.status !== undefined
                                                ? styles.dateTextFilled
                                                : styles.dateTextPlaceholder
                                        }
                                    >
                                        {getStatusLabel(localFilters.status) || "Select Status"}
                                    </Text>
                                    <Icon name="arrow-drop-down" size={24} color={CustomColors.textLight} style={styles.inputIcon} />
                                </TouchableOpacity>
                                <CustomActionSheetPicker
                                    pickerStatus={statusPickerVisible}
                                    setPickerStatus={setStatusPickerVisible}
                                    title="Select Status"
                                    optionsData={statusOptions}
                                    RenderItem={renderActionSheetItem}
                                    selected={localFilters.status}
                                    onPress={(value) => {
                                        //console.log("[DEBUG] Status selected from picker:", value);
                                        setLocalFilters(prev => {
                                            const updated = { ...prev, status: value };
                                            //console.log("[DEBUG] localFilters after status change:", updated);
                                            return updated;
                                        });
                                    }}
                                    onSearch={null}
                                    isLoading={false}
                                    isFetchingMore={false}
                                    onEndReached={() => { }}
                                    hasMoreData={false}
                                />


                                {/* Renewable Date Picker */}
                                <TouchableOpacity
                                    onPress={() => setShowRenewableDatePicker(true)}
                                    style={styles.dateInput}
                                >

                                    <Text allowFontScaling={false}
                                        style={
                                            localFilters.renewableDate
                                                ? styles.dateTextFilled
                                                : styles.dateTextPlaceholder
                                        }
                                    >
                                        {localFilters.renewableDate || "Renewable Date"}
                                    </Text>
                                    <Icon
                                        name="calendar-today"
                                        size={20}
                                        color={CustomColors.textLight}
                                        style={styles.inputIcon}
                                    />
                                </TouchableOpacity>

                                {showRenewableDatePicker && (
                                    <DateTimePicker
                                        value={
                                            localFilters.renewableDate
                                                ? new Date(localFilters.renewableDate)
                                                : new Date()
                                        }
                                        mode="date"
                                        display={Platform.OS === "ios" ? "spinner" : "default"}
                                        onChange={onRenewableDateChange}
                                    />
                                )}

                                <TouchableOpacity
                                    onPress={() => setRequestTypePickerVisible(true)}
                                    style={styles.dateInput}
                                >

                                    <Text allowFontScaling={false}
                                        style={
                                            localFilters.requestType !== null && localFilters.requestType !== undefined
                                                ? styles.dateTextFilled
                                                : styles.dateTextPlaceholder
                                        }
                                    >
                                        {getRequestTypeLabel(localFilters.requestType) || "Select Request Type"}
                                    </Text>
                                    <Icon name="arrow-drop-down" size={24} color={CustomColors.textLight} style={styles.inputIcon} />
                                </TouchableOpacity>
                                <CustomActionSheetPicker
                                    pickerStatus={requestTypePickerVisible}
                                    setPickerStatus={setRequestTypePickerVisible}
                                    title="Select Request Type"
                                    optionsData={requestTypeOptions}
                                    RenderItem={renderActionSheetItem}
                                    selected={localFilters.requestType}
                                    onPress={(value) => setLocalFilters(prev => ({ ...prev, requestType: value }))}
                                    onSearch={null}
                                    isLoading={false}
                                    isFetchingMore={false}
                                    onEndReached={() => { }}
                                    hasMoreData={false}
                                />


                                <TouchableOpacity
                                    onPress={() => setClassificationPickerVisible(true)}
                                    style={styles.dateInput}
                                >

                                    <Text allowFontScaling={false}
                                        style={
                                            localFilters.classification !== null
                                                ? styles.dateTextFilled
                                                : styles.dateTextPlaceholder
                                        }
                                    >
                                        {getClassificationLabel(localFilters.classification) || "Select Classification"}
                                    </Text>
                                    <Icon name="arrow-drop-down" size={24} color={CustomColors.textLight} style={styles.inputIcon} />
                                </TouchableOpacity>
                                <CustomActionSheetPicker
                                    pickerStatus={classificationPickerVisible}
                                    setPickerStatus={setClassificationPickerVisible}
                                    title="Select Classification"
                                    optionsData={classificationList}
                                    RenderItem={renderActionSheetItem}
                                    selected={localFilters.classification}
                                    onPress={(value) => setLocalFilters(prev => ({ ...prev, classification: value }))}
                                    onSearch={null}
                                    isLoading={isFetchingClassification}
                                    isFetchingMore={isFetchingClassification && classificationPage > 1}
                                    onEndReached={() => {
                                        if (classificationData?.pagination?.has_next) {
                                            setClassificationPage(prevPage => prevPage + 1);
                                        }
                                    }}
                                    hasMoreData={classificationData?.pagination?.has_next || false}
                                />

                                <TouchableOpacity
                                    onPress={() => setHeaderNamePickerVisible(true)}
                                    style={styles.dateInput}
                                >

                                    <Text allowFontScaling={false}
                                        style={
                                            localFilters.headerName !== null
                                                ? styles.dateTextFilled
                                                : styles.dateTextPlaceholder
                                        }
                                    >
                                        {getHeaderNameLabel(localFilters.headerName) || "Select Header Name"}
                                    </Text>
                                    <Icon name="arrow-drop-down" size={24} color={CustomColors.textLight} style={styles.inputIcon} />
                                </TouchableOpacity>
                                <CustomActionSheetPicker
                                    pickerStatus={headerNamePickerVisible}
                                    setPickerStatus={setHeaderNamePickerVisible}
                                    title="Select Header Name"
                                    optionsData={headerNameList}
                                    RenderItem={renderActionSheetItem}
                                    selected={localFilters.headerName}
                                    onPress={(value) => setLocalFilters(prev => ({ ...prev, headerName: value }))}
                                    onSearch={null}
                                    isLoading={isFetchingHeaderName}
                                    isFetchingMore={isFetchingHeaderName && headerNamePage > 1}
                                    onEndReached={() => {
                                        if (headerNameData?.pagination?.has_next) {
                                            setHeaderNamePage(prevPage => prevPage + 1);
                                        }
                                    }}
                                    hasMoreData={headerNameData?.pagination?.has_next || false}
                                />


                                <TouchableOpacity
                                    onPress={() => setGstCategoryPickerVisible(true)}
                                    style={styles.dateInput}
                                >

                                    <Text allowFontScaling={false}
                                        style={
                                            localFilters.gstCategory !== null
                                                ? styles.dateTextFilled
                                                : styles.dateTextPlaceholder
                                        }
                                    >
                                        {getGstCategoryLabel(localFilters.gstCategory) || "Select GST Category"}
                                    </Text>
                                    <Icon name="arrow-drop-down" size={24} color={CustomColors.textLight} style={styles.inputIcon} />
                                </TouchableOpacity>
                                <CustomActionSheetPicker
                                    pickerStatus={gstCategoryPickerVisible}
                                    setPickerStatus={setGstCategoryPickerVisible}
                                    title="Select GST Category"
                                    optionsData={gstCategoryList}
                                    RenderItem={renderActionSheetItem}
                                    selected={localFilters.gstCategory}
                                    onPress={(value) => setLocalFilters(prev => ({ ...prev, gstCategory: value }))}
                                    onSearch={null}
                                    isLoading={isFetchingGstCategory}
                                    isFetchingMore={isFetchingGstCategory && gstCategoryPage > 1}
                                    onEndReached={() => {
                                        if (gstCategoryData?.pagination?.has_next) {
                                            setGstCategoryPage(prevPage => prevPage + 1);
                                        }
                                    }}
                                    hasMoreData={gstCategoryData?.pagination?.has_next || false}
                                />
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClear}>
                                    <Text allowFontScaling={false} style={styles.buttonText}>Clear</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.applyButton]} onPress={handleApply}>
                                    <Text allowFontScaling={false} style={styles.buttonText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};


export default CustomerFilter;