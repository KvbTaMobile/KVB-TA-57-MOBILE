import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet, // Import StyleSheet from react-native
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons as Icon } from "@expo/vector-icons";// Assuming CustomActionSheetPicker exists and its path is correct
import CustomActionSheetPicker from "../pickers/ActionSheetPicker";

// Define CustomColors directly in this file for a self-contained example
// In a real app, you'd likely import this from a central theme file
const CustomColors = {
  primary: '#007bff',       // A vibrant blue for primary actions
  primaryLight: '#e6f2ff',  // A lighter shade of primary for selections
  secondary: '#6c757d',     // A muted gray for secondary elements
  white: '#FFFFFF',         // Pure white
  black: '#000000',         // Pure black
  darkGray: '#333333',      // Dark text and elements
  lightGray: '#F0F0F0',     // Light background, button background
  textDark: '#333333',      // Default text color
  textLight: '#888888',     // Placeholder and less prominent text
  borderLight: '#DDDDDD',   // Light border color
  background: '#F8F8F8',    // General screen background (not directly used here, but for context)
  inputBackground: '#FFFFFF', // Explicit white for inputs
};

const FilterModal = ({
  isVisible,
  onClose,
  filters, // These filters likely contain `requestedDate` as a string if from external source
  dispatch,
  setFilters,
  applyFilters,
  clearAllFilters,
  statusOptions,
  getStatusLabel,
  title,
}) => {
  // Initialize localFilters. Convert requestedDate string to Date object if it exists.
  const [localFilters, setLocalFilters] = useState(() => ({
    ...filters,
    // Convert string date to Date object for internal use if it's not already a Date object
    // Handle cases where initial date might be an empty string
    requestedDate: filters.requestedDate
      ? new Date(filters.requestedDate) // Ensure format is parsable (e.g., "YYYY-MM-DD" or "MM/DD/YYYY")
      : null,
  }));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  useEffect(() => {
    // When external filters change, update local filters
    setLocalFilters((prev) => ({
      ...filters,
      // Convert string date to Date object if it's present
      requestedDate: filters.requestedDate
        ? new Date(filters.requestedDate)
        : null,
    }));
  }, [filters]);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (event.type === 'set' && selectedDate) { // 'set' for confirming selection, 'dismissed' for cancel
      setLocalFilters((prevFilters) => ({
        ...prevFilters,
        requestedDate: selectedDate, // Store as Date object
      }));
    } else if (event.type === 'dismissed') {
      // If date picker is dismissed, no action needed for the date
    }
  };

  const formatDateForDisplay = (date) => {
    if (!date) return "";
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const day = date.getDate();
    const monthAbbr = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const formattedDay = day < 10 ? `0${day}` : day;
    return `${formattedDay}-${monthAbbr}-${year}`;
  };

  const handleApplyFilters = () => {
    // Before dispatching, convert date back to string if your Redux state/API expects it
    const filtersToDispatch = {
      ...localFilters,
      requestedDate: formatDateForDisplay(localFilters.requestedDate),
    };
    dispatch(setFilters(filtersToDispatch));
    applyFilters();
    onClose();
  };

  const handleClearAllFilters = () => {
    const cleared = {
      tourNO: "",
      requestedDate: null, // Set to null for Date object
      status: null,
    };
    setLocalFilters(cleared);
    // Before dispatching, convert date to string if your Redux state/API expects ""
    const clearedForDispatch = {
      ...cleared,
      requestedDate: "" // Send empty string if API expects it
    }
    dispatch(setFilters(clearedForDispatch));
    clearAllFilters();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={localStyles.modalOverlay}>
        <View style={localStyles.modalContent}>
          {/* Close Button at top-right */}
          <TouchableOpacity onPress={onClose} style={localStyles.closeButton}>
            <Icon name="close" size={24} color={CustomColors.darkGray} />
          </TouchableOpacity>

          {/* Modal Title */}
          <Text allowFontScaling={false} style={localStyles.modalTitle}>{title}</Text>

          {/* Tour No. Input */}
          <TextInput allowFontScaling={false}
            placeholder="Travel No."
            placeholderTextColor={CustomColors.textLight}
            value={localFilters.tourNO}
            onChangeText={(text) =>
              setLocalFilters((prevFilters) => ({
                ...prevFilters,
                tourNO: text,
              }))
            }
            style={localStyles.input}
          />

          {/* Requested Date Picker Trigger */}
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={localStyles.dateInput}
          >
            <Icon
              name="calendar-today"
              size={20}
              color={CustomColors.textLight}
              style={localStyles.inputIcon}
            />
            <Text allowFontScaling={false}
              style={
                localFilters.requestedDate
                  ? localStyles.dateTextFilled
                  : localStyles.dateTextPlaceholder
              }
            >
              {formatDateForDisplay(localFilters.requestedDate) || "Request Date"}
            </Text>
          </TouchableOpacity>

          {/* DateTimePicker */}
          {showDatePicker && (
            <DateTimePicker
              value={localFilters.requestedDate || new Date()} // Use stored Date or current date
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
            />
          )}

          {/* Status Picker Trigger (Action) */}
          <TouchableOpacity
            onPress={() => setStatusPickerVisible(true)}
            style={localStyles.dateInput} // Reusing dateInput style for consistency
          >
            <Icon
              name="arrow-drop-down"
              size={24}
              color={CustomColors.textLight}
              style={localStyles.inputIcon}
            />
            <Text allowFontScaling={false}
              style={
                localFilters.status
                  ? localStyles.dateTextFilled
                  : localStyles.dateTextPlaceholder
              }
            >
              {localFilters.status?.label ||
                getStatusLabel(localFilters.status) ||
                "Select Action"}
            </Text>
          </TouchableOpacity>

          {/* Custom Action Sheet Picker */}
          <CustomActionSheetPicker
            pickerStatus={statusPickerVisible}
            setPickerStatus={setStatusPickerVisible}
            title="Select Action"
            optionsData={statusOptions}
            RenderItem={({ options, onPress, setPickerStatus, selected }) => (
              <TouchableOpacity
                onPress={() => {
                  setLocalFilters((prevFilters) => ({
                    ...prevFilters,
                    status: options, // options should be { label: '...', value: '...' }
                  }));
                  setPickerStatus(false);
                }}
                style={[
                  localStyles.actionSheetOption,
                  selected === options.value && localStyles.actionSheetOptionSelected,
                ]}
              >
                <Text allowFontScaling={false} style={localStyles.actionSheetOptionText}>
                  {options.label}
                </Text>
              </TouchableOpacity>
            )}
            selected={localFilters.status?.value}
            onSearch={null}
            isLoading={false}
            isFetchingMore={false}
            onEndReached={() => { }}
            hasMoreData={false}
          />

          {/* Action Buttons */}
          <View style={localStyles.buttonRow}>
            <TouchableOpacity
              onPress={handleApplyFilters}
              style={localStyles.applyButton}
            >
              <Text allowFontScaling={false} style={localStyles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearAllFilters}
              style={localStyles.clearButton}
            >
              <Text allowFontScaling={false} style={localStyles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Define styles using StyleSheet.create directly in this file
const localStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: CustomColors.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 420,
    shadowColor: CustomColors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: CustomColors.darkGray,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: CustomColors.borderLight,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: CustomColors.textDark,
    backgroundColor: CustomColors.inputBackground,
  },
  dateInput: {
    height: 50,
    borderColor: CustomColors.borderLight,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CustomColors.inputBackground,
  },
  inputIcon: {
    marginRight: 10,
  },
  dateTextFilled: {
    flex: 1,
    fontSize: 16,
    color: CustomColors.textDark,
  },
  dateTextPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: CustomColors.textLight,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  applyButton: {
    flex: 1,
    backgroundColor: CustomColors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  applyButtonText: {
    color: CustomColors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    flex: 1,
    backgroundColor: CustomColors.lightGray,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: CustomColors.borderLight,
  },
  clearButtonText: {
    color: CustomColors.darkGray,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Styles for CustomActionSheetPicker's RenderItem
  actionSheetOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.borderLight,
    backgroundColor: CustomColors.white,
  },
  actionSheetOptionSelected: {
    backgroundColor: CustomColors.primaryLight,
  },
  actionSheetOptionText: {
    fontSize: 17,
    color: CustomColors.textDark,
  },
});

export default FilterModal;