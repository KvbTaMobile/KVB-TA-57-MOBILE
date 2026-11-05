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
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";
import { styles } from "../../styles/StyleSheet";
import CustomActionSheetPicker from "../pickers/ActionSheetPicker";
import {
  useLazyBranchListQuery,
  useLazyEmployeeListQuery
} from "../../redux/rtk_query/apiSlice";
import { setBranchList, updateBranchList } from "../../redux/slices/Dropdowns";

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const parseDateSafe = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const day = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase();
    const month = months[mStr] !== undefined ? months[mStr] : parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

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
  isChecker,
  isTourApproval
}) => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styles(isDark);
  const { branchs } = useSelector((state) => state.Dropdowns, shallowEqual);

  // RTK Queries
  const [fetchBranchList, { data: branchListData, isLoading: isBranchLoading }] = useLazyBranchListQuery();
  const [fetchEmployeeList, { data: employeeListData, isLoading: isEmployeeLoading }] = useLazyEmployeeListQuery();

  const [localFilters, setLocalFilters] = useState(filters);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Branch state
  const [branchSearchText, setBranchSearchText] = useState("");
  const [branchPage, setBranchPage] = useState(1);
  const [hasMoreBranches, setHasMoreBranches] = useState(true);

  // Employee state
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeSearchText, setEmployeeSearchText] = useState("");

  const [pickerStates, setPickerStates] = useState({
    status: false,
    employeeBranch: false,
    employeeName: false,
    requirements: false,
    bookingStatus: false,
    travelStatus: false,
  });

  // Memoized branch dropdown options
  const employeeBranchOptions = useMemo(
    () =>
      branchs?.map((item) => ({
        label: item.name_code || item.name,
        value: item.id,
        code: item.code,
      })) || [],
    [branchs]
  );

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Fetch branches on open
  useEffect(() => {
    if (pickerStates.employeeBranch && branchs.length === 0) {
      fetchBranchList({ name: branchSearchText, page: 1 });
      setBranchPage(1);
    }
  }, [pickerStates.employeeBranch]);

  // Update branches in Redux
  useEffect(() => {
    if (branchListData?.data) {
      branchPage === 1
        ? dispatch(setBranchList(branchListData))
        : dispatch(updateBranchList(branchListData));
      setHasMoreBranches(branchListData.pagination?.has_next ?? branchListData.data.length >= 10);
    }
  }, [branchListData]);

  // Fetch branchwise/search employees when picker opens or branch changes
  useEffect(() => {
    if (pickerStates.employeeName) {
      const branchId = localFilters.employeeBranch?.value || 0;
      fetchEmployeeList({ branchId, name: employeeSearchText, page: 1 });
    }
  }, [pickerStates.employeeName, localFilters.employeeBranch]);

  // Handle Employee data mapping
  useEffect(() => {
    if (employeeListData?.data) {
      const mappedEmployees = employeeListData.data.map((emp) => ({
        label: emp.full_name || `(${emp.code}) ${emp.name}`,
        value: emp.id,
        code: emp.code,
        name: emp.name,
      }));
      setEmployeeOptions(mappedEmployees);
    }
  }, [employeeListData]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (event.type === "set" && selectedDate) {
      const date = new Date(selectedDate);
      const day = date.getDate().toString().padStart(2, "0");
      const month = MONTH_NAMES_SHORT[date.getMonth()];
      const year = date.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      setLocalFilters((prev) => ({ ...prev, requestedDate: formattedDate }));
    }
  };

  const handlePickerSelect = (key, selectedOption) => {
    if (key === "employeeBranch") {
      setLocalFilters((prev) => ({
        ...prev,
        employeeBranch: selectedOption,
        employeeName: null,
        employeeCode: ""
      }));
    } else if (key === "employeeName") {
      setLocalFilters((prev) => ({
        ...prev,
        employeeName: selectedOption,
        employeeCode: selectedOption?.code || prev.employeeCode,
      }));
    } else {
      setLocalFilters((prev) => ({ ...prev, [key]: selectedOption }));
    }
    setPickerStates((prev) => ({ ...prev, [key]: false }));
  };

  const handleApplyFilters = () => {
    dispatch(setFilters(localFilters));
    applyFilters?.(localFilters);
    onClose();
  };

  const handleClearAllFilters = () => {
    const cleared = {
      tourNO: "",
      requestedDate: "",
      status: null,
      employeeCode: "",
      employeeName: null,
      employeeBranch: null,
      empgrade: "",
      claim_amount: "",
      requirements: null,
      bookingStatus: null,
      travelStatus: null,
    };
    setLocalFilters(cleared);
    clearAllFilters?.();
    onClose();
  };

  const isTourEditable = !localFilters.employeeCode && !localFilters.employeeName && !localFilters.employeeBranch;
  const isEmpCodeEditable = !localFilters.employeeName && !localFilters.employeeBranch && !localFilters.tourNO;
  const isBranchSelectable = !localFilters.employeeCode && !localFilters.employeeName && !localFilters.tourNO;

  const renderPicker = (label, key, options, value, getLabel, searchable = false) => (
    <>
      <TouchableOpacity
        onPress={() => setPickerStates((prev) => ({ ...prev, [key]: true }))}
        style={globalStyles.dateInput}
        disabled={key === "employeeBranch" && !isBranchSelectable}
      >
        <Icon name="arrow-drop-down" size={24} color={CustomColors.textLight} style={globalStyles.inputIcon} />
        <Text allowFontScaling={false} style={value ? globalStyles.dateTextFilled : globalStyles.dateTextPlaceholder} numberOfLines={1}>
          {value?.label || getLabel?.(value) || label}
        </Text>
      </TouchableOpacity>

      {pickerStates[key] && (
        <CustomActionSheetPicker
          pickerStatus={pickerStates[key]}
          setPickerStatus={(val) => setPickerStates((prev) => ({ ...prev, [key]: val }))}
          title={label}
          optionsData={options}
          RenderItem={({ options: opt }) => (
            <TouchableOpacity
              onPress={() => handlePickerSelect(key, key === "employeeBranch" || key === "employeeName" ? opt : opt.value)}
              style={[
                globalStyles.actionSheetOption,
                (value?.value === opt.value || value === opt.value) && globalStyles.actionSheetOptionSelected,
              ]}
            >
              <Text allowFontScaling={false} style={globalStyles.actionSheetOptionText}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          )}
          selected={value?.value || value}
          onSearch={
            searchable
              ? (text) => {
                if (key === "employeeBranch") {
                  setBranchSearchText(text);
                  fetchBranchList({ name: text, page: 1 });
                  setBranchPage(1);
                } else if (key === "employeeName") {
                  setEmployeeSearchText(text);
                  const branchId = localFilters.employeeBranch?.value || 0;
                  fetchEmployeeList({ branchId, name: text, page: 1 });
                }
              }
              : null
          }
          isLoading={key === "employeeBranch" ? isBranchLoading : key === "employeeName" ? isEmployeeLoading : false}
          isFetchingMore={false}
          onEndReached={() => {
            if (key === "employeeBranch" && !isBranchLoading && hasMoreBranches) {
              const nextPage = branchPage + 1;
              fetchBranchList({ name: branchSearchText, page: nextPage });
              setBranchPage(nextPage);
            }
          }}
          hasMoreData={key === "employeeBranch" ? hasMoreBranches : false}
        />
      )}
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
            <TextInput
              allowFontScaling={false}
              placeholder="*Tour No."
              placeholderTextColor={CustomColors.textLight}
              value={localFilters.tourNO}
              onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, tourNO: text }))}
              style={globalStyles.input}
              editable={isTourEditable}
            />

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[
                globalStyles.dateInput,
                { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Icon name="calendar-today" size={20} color={CustomColors.textLight} style={globalStyles.inputIcon} />
                <Text
                  allowFontScaling={false}
                  style={localFilters.requestedDate ? globalStyles.dateTextFilled : globalStyles.dateTextPlaceholder}
                  numberOfLines={1}
                >
                  {localFilters.requestedDate || "Requested Date"}
                </Text>
              </View>
              {localFilters.requestedDate ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setLocalFilters((prev) => ({ ...prev, requestedDate: "" }));
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 4 }}
                >
                  <Icon name="close" size={18} color={CustomColors.textLight} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={parseDateSafe(localFilters.requestedDate)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
              />
            )}

            {isTourApproval && (
              <>
                {renderPicker("Select Status", "status", statusOptions, localFilters.status, getStatusLabel)}
              </>
            )}

            {(isChecker || isAdmin) && (
              <>
                <TextInput
                  allowFontScaling={false}
                  placeholder="Employee Code"
                  placeholderTextColor={CustomColors.textLight}
                  value={localFilters.employeeCode}
                  onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, employeeCode: text }))}
                  style={globalStyles.input}
                  editable={isEmpCodeEditable}
                />

                {renderPicker(
                  "Select Employee Branch",
                  "employeeBranch",
                  employeeBranchOptions,
                  localFilters.employeeBranch,
                  null,
                  true
                )}

                {renderPicker(
                  "Select Employee Name",
                  "employeeName",
                  employeeOptions,
                  localFilters.employeeName,
                  null,
                  true
                )}

                <TextInput
                  allowFontScaling={false}
                  placeholder="Grade (e.g., L1, L2)"
                  placeholderTextColor={CustomColors.textLight}
                  value={localFilters.empgrade}
                  onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, empgrade: text }))}
                  style={globalStyles.input}
                />

                <TextInput
                  allowFontScaling={false}
                  placeholder="Claim Amount"
                  keyboardType="numeric"
                  placeholderTextColor={CustomColors.textLight}
                  value={localFilters.claim_amount}
                  onChangeText={(text) => setLocalFilters((prev) => ({ ...prev, claim_amount: text }))}
                  style={globalStyles.input}
                />
              </>
            )}

            {isChecker && renderPicker("Select Status", "status", statusOptions, localFilters.status, getStatusLabel)}

            {isAdmin && (
              <>
                {renderPicker("Select Requirements", "requirements", requirementsOptions, localFilters.requirements, getRequirementsLabel)}
                {renderPicker("Select Booking Status", "bookingStatus", bookingStatusOptions, localFilters.bookingStatus, getBookingStatusLabel)}
                {renderPicker("Select Travel Status", "travelStatus", travelStatusOptions, localFilters.travelStatus, getTravelStatusLabel)}
              </>
            )}
          </ScrollView>

          <View style={globalStyles.buttonRow}>
            <TouchableOpacity onPress={handleApplyFilters} style={globalStyles.applyButton}>
              <Text allowFontScaling={false} style={globalStyles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearAllFilters}
              style={[
                globalStyles.clearButton,
                {
                  backgroundColor: isDark ? "#334155" : (CustomColors.white || "#FFFFFF"),
                  borderColor: isDark ? "#475569" : (CustomColors.borderColor || "#CCCCCC"),
                },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[
                  globalStyles.clearButtonText,
                  { color: isDark ? "#f8fafc" : (CustomColors.textDark || "#333333") },
                ]}
              >
                Clear Filters
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default FilterModal;