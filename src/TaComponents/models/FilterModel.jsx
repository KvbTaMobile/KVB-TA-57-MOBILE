import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons as Icon } from "@expo/vector-icons"; import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";
import { styles } from "../../styles/StyleSheet";
import CustomActionSheetPicker from "../pickers/ActionSheetPicker";
import { useLazyBranchListQuery } from "../../redux/rtk_query/apiSlice";
import { setBranchList, updateBranchList } from "../../redux/slices/Dropdowns";

const FilterModal = ({
  isVisible,
  onClose,
  filters,
  setFilters,
  applyFilters,
  clearAllFilters,
  statusOptions,
  getStatusLabel,
  title,
  isAdmin,
  requirementsOptions,
  bookingStatusOptions,
  travelStatusOptions,
  getRequirementsLabel,
  getBookingStatusLabel,
  getTravelStatusLabel,
  isChecker
}) => {
  const dispatch = useDispatch();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles(isDark)
  const { branchs } = useSelector((state) => state.Dropdowns, shallowEqual);
  const [fetchBranchList, { data: branchListData, isLoading: isBranchLoading }] = useLazyBranchListQuery();

  const [localFilters, setLocalFilters] = useState(filters);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [branchSearchText, setBranchSearchText] = useState("");
  const [branchPage, setBranchPage] = useState(1);
  const [hasMoreBranches, setHasMoreBranches] = useState(true);

  const [pickerStates, setPickerStates] = useState({
    status: false,
    employeeBranch: false,
    requirements: false,
    bookingStatus: false,
    travelStatus: false,
  });

  // Memoized branch dropdown options
  const employeeBranchOptions = useMemo(
    () =>
      branchs?.map((item) => ({
        label: item.name,
        value: item.id,
      })) || [],
    [branchs]
  );

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (pickerStates.employeeBranch && branchs.length === 0) {
      fetchBranchList({ name: branchSearchText, page: 1 });
      setBranchPage(1);
    }
  }, [pickerStates.employeeBranch]);

  useEffect(() => {
    if (branchListData?.data) {
      branchPage === 1 ? dispatch(setBranchList(branchListData)) : dispatch(updateBranchList(branchListData));
      setHasMoreBranches(branchListData.pagination?.has_next ?? branchListData.data.length >= 10);
    }
  }, [branchListData]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (event.type === "set" && selectedDate) {
      const date = new Date(selectedDate);
      const formattedDate = `${date.getDate().toString().padStart(2, "0")}-${date.toLocaleString("default", {
        month: "short",
      })}-${date.getFullYear()}`;
      setLocalFilters((prev) => ({ ...prev, requestedDate: formattedDate }));
    }
  };

  const handlePickerSelect = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
    setPickerStates((prev) => ({ ...prev, [key]: false }));
  };

  const handleApplyFilters = () => {
    dispatch(setFilters(localFilters));
    applyFilters();
    onClose();
  };

  const handleClearAllFilters = () => {
    const cleared = {
      tourNO: "",
      requestedDate: "",
      status: null,
      employeeCode: "",
      employeeName: "",
      employeeBranch: null,
      requirements: null,
      bookingStatus: null,
      travelStatus: null,
    };
    setLocalFilters(cleared);
    clearAllFilters();
    onClose();
  };

  const isTourEditable = !localFilters.employeeCode && !localFilters.employeeName && !localFilters.employeeBranch;
  const isEmpCodeEditable = !localFilters.employeeName && !localFilters.employeeBranch && !localFilters.tourNO;
  const isEmpNameEditable = !localFilters.employeeCode && !localFilters.employeeBranch && !localFilters.tourNO;
  const isBranchSelectable = !localFilters.employeeCode && !localFilters.employeeName && !localFilters.tourNO;

  const renderPicker = (label, key, options, value, getLabel, searchable = false) => (
    <>
      <TouchableOpacity
        onPress={() => setPickerStates((prev) => ({ ...prev, [key]: true }))}
        style={globalStyles.dateInput}
        disabled={key === "employeeBranch" && !isBranchSelectable}
      >
        <Icon name="arrow-drop-down" size={24} color={CustomColors.textLight} style={globalStyles.inputIcon} />
        <Text allowFontScaling={false} style={value?.toString() ? globalStyles.dateTextFilled : globalStyles.dateTextPlaceholder} numberOfLines={1}>
          {value?.label || getLabel?.(value) || label}
        </Text>
      </TouchableOpacity>

      {pickerStates[key] && <CustomActionSheetPicker
        pickerStatus={pickerStates[key]}
        setPickerStatus={(val) => setPickerStates((prev) => ({ ...prev, [key]: val }))}
        title={label}
        optionsData={options}
        RenderItem={({ options, setPickerStatus, selected }) => (
          <TouchableOpacity
            onPress={() => handlePickerSelect(key, key === "employeeBranch" ? options : options.value)}
            style={[
              globalStyles.actionSheetOption,
              globalStyles === options.value && globalStyles.actionSheetOptionSelected,
            ]}
          >
            <Text allowFontScaling={false} style={globalStyles.actionSheetOptionText}>{options.label}</Text>
          </TouchableOpacity>
        )}
        selected={value?.value}
        onSearch={
          searchable
            ? (text) => {
              setBranchSearchText(text);
              fetchBranchList({ name: text, page: 1 });
              setBranchPage(1);
            }
            : null
        }
        isLoading={key === "employeeBranch" ? isBranchLoading : false}
        isFetchingMore={false}
        onEndReached={() => {
          if (key === "employeeBranch" && !isBranchLoading && hasMoreBranches) {
            const nextPage = branchPage + 1;
            fetchBranchList({ name: branchSearchText, page: nextPage });
            setBranchPage(nextPage);
          }
        }}
        hasMoreData={key === "employeeBranch" ? hasMoreBranches : false}
      />}
    </>
  );

  return (
    <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
      <View style={globalStyles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={globalStyles.modalContent}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <View style={globalStyles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={globalStyles.closeButton}>
              <Icon name="close" size={24} color={CustomColors.darkGray} />
            </TouchableOpacity>
            <Text allowFontScaling={false} style={globalStyles.modalTitle}>{title}</Text>
          </View>

          <ScrollView
            contentContainerStyle={globalStyles.modalScrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={globalStyles.modalScrollView}
          >
            <TextInput allowFontScaling={false}
              placeholder="Tour No."
              placeholderTextColor={CustomColors.textLight}
              value={localFilters.tourNO}
              onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, tourNO: text }))}
              style={globalStyles.input}
              editable={isTourEditable}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={globalStyles.dateInput}>
              <Icon name="calendar-today" size={20} color={CustomColors.textLight} style={globalStyles.inputIcon} />
              <Text allowFontScaling={false}
                style={localFilters.requestedDate ? globalStyles.dateTextFilled : globalStyles.dateTextPlaceholder}
                numberOfLines={1}
              >
                {localFilters.requestedDate || "Requested Date"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={localFilters.requestedDate ? new Date(localFilters.requestedDate) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
              />
            )}

            {isChecker && (
              <>
                <TextInput allowFontScaling={false}
                  placeholder="Employee Code"
                  placeholderTextColor={CustomColors.textLight}
                  value={localFilters.employeeCode}
                  onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, employeeCode: text }))}
                  style={globalStyles.input}
                  editable={isEmpCodeEditable}
                />

                <TextInput allowFontScaling={false}
                  placeholder="Employee Name"
                  placeholderTextColor={CustomColors.textLight}
                  value={localFilters.employeeName}
                  onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, employeeName: text }))}
                  style={globalStyles.input}
                  editable={isEmpNameEditable}
                />

                {renderPicker("Select Employee Branch", "employeeBranch", employeeBranchOptions, localFilters.employeeBranch, null, true)}
                {  renderPicker("Select Status", "status", statusOptions, localFilters.status, getStatusLabel)}
              </>)}
            {isAdmin &&(
              <>
                <TextInput allowFontScaling={false}
                  placeholder="Employee Code"
                  placeholderTextColor={CustomColors.textLight}
                  value={localFilters.employeeCode}
                  onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, employeeCode: text }))}
                  style={globalStyles.input}
                  editable={isEmpCodeEditable}
                />

                <TextInput allowFontScaling={false}
                  placeholder="Employee Name"
                  placeholderTextColor={CustomColors.textLight}
                  value={localFilters.employeeName}
                  onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, employeeName: text }))}
                  style={globalStyles.input}
                  editable={isEmpNameEditable}
                />

                {renderPicker("Select Employee Branch", "employeeBranch", employeeBranchOptions, localFilters.employeeBranch, null, true)}
                {renderPicker("Select Requirements", "requirements", requirementsOptions, localFilters.requirements, getRequirementsLabel)}
                {renderPicker("Select Booking Status", "bookingStatus", bookingStatusOptions, localFilters.bookingStatus, getBookingStatusLabel)}
                {renderPicker("Select Travel Status", "travelStatus", travelStatusOptions, localFilters.travelStatus, getTravelStatusLabel)}
              </>
            ) }
          </ScrollView>

          <View style={globalStyles.buttonRow}>
            <TouchableOpacity onPress={handleApplyFilters} style={globalStyles.applyButton}>
              <Text allowFontScaling={false} style={globalStyles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearAllFilters} style={globalStyles.clearButton}>
              <Text allowFontScaling={false} style={globalStyles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default FilterModal;
