// components/modals/SelfOrOnBehalfModal.js

import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedEmployee } from "../../redux/slices/SelfOrOnBehalfSlice";
import { useLazyOnBehalfListQuery } from "../../redux/rtk_query/apiSlice";
import { setApproverList, updateApproverList } from "../../redux/slices/Dropdowns";
import { getCustomColors } from "../../styles/CustomColors";
import CustomActionSheetPicker from "../pickers/ActionSheetPicker";
import ToastMessage from "../toast/ToastMessage";

const SelfOrOnBehalfModal = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const [hasMoreApprover, setHasMoreApprover] = useState(true);
  const [ApproverPage, setApproverPage] = useState(0);
  const [currentApproverSearchQuery, setCurrentApproverSearchQuery] =
    useState("");

  const { selectedEmployee } = useSelector((state) => state.selfOrOnBehalf);
  const [isEmployeePickerVisible, setEmployeePickerVisible] = useState(false);
  const { approvers } = useSelector((state) => state.Dropdowns);

  const debounceTimeout = useRef(null);

  const [
    triggerApprover,
    {
      isLoading: isLoadingApprover,
      data: ApproverData,
      isFetching: isFetchingApprover,
    },
  ] = useLazyOnBehalfListQuery();

  useEffect(() => {
    if (ApproverData) {
      //console.log(ApproverData.pagination.has_next)
      setHasMoreApprover(ApproverData.pagination.has_next);
      if (ApproverPage === 1) {
        dispatch(
          setApproverList({
            data: ApproverData.data,
            pagination: ApproverData.pagination,
          })
        );
      } else {
        dispatch(
          updateApproverList({
            data: ApproverData.data,
            pagination: ApproverData.pagination,
          })
        );
      }
      setHasMoreApprover(ApproverData.pagination.has_next);
    }
  }, [ApproverData, dispatch]);
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: CustomColors.backgroundtransparent,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: CustomColors.modal_background,
      borderRadius: 12,
      padding: 24,
      width: "90%",
      maxWidth: 400,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 20,
      color: CustomColors.appThemeColor
    },
    inputField: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: CustomColors.borderColor,
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 8,
      marginBottom: 12,
      justifyContent: "space-between",
    },
    inputText: {
      fontSize: 16,
      flex: 1,
      color: CustomColors.textGray
    },
    submitButton: {
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    submitText: {
      color: CustomColors.textWhite,
      fontSize: 16,
      fontWeight: "600",
    },
    actionSheetOption: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.backgroundGray,
    },
    actionSheetOptionSelected: {
      backgroundColor: CustomColors.backgroundGray,

    },
    actionSheetOptionText: {
      fontSize: 16,
      color: CustomColors.textGray,
    },
    actionSheetOptionTextSelected: {
      color: CustomColors.primaryBlue,
      fontWeight: "bold",
    },
  });
  const RenderDropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected = selected && selected.value === options.value;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress(options);
          setPickerStatus(false);
        }}
        style={[
          styles.actionSheetOption,
          isSelected && styles.actionSheetOptionSelected,
        ]}
      >
        <Text allowFontScaling={false}
          style={[
            styles.actionSheetOptionText,
            isSelected && styles.actionSheetOptionTextSelected,
          ]}
        >
          {typeof options.label === "string"
            ? options.label
            : String(options.label)}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleSearchEmployee = (query) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setCurrentApproverSearchQuery(query);
      setApproverPage(1);
      setHasMoreApprover(true);
      dispatch(setApproverList({ data: [], pagination: { has_next: true } }));
      triggerApprover({ query: query, page: 1 });
    }, 500);
  };

  const handleLoadMoreApprover = () => {
    if (isFetchingApprover || !hasMoreApprover) return;
    const nextPage = ApproverPage + 1;
    setApproverPage(nextPage);
    triggerApprover({
      query: currentApproverSearchQuery,
      page: nextPage,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => { onClose(), setApproverPage(0) }}
    >
      <Pressable style={styles.overlay} onPress={() => { onClose(), setApproverPage(0) }}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <Text allowFontScaling={false} style={styles.title}>Choose Employee</Text>

          <TouchableOpacity
            style={styles.inputField}
            onPress={() => setEmployeePickerVisible(true)}
          >
            <Text allowFontScaling={false} style={styles.inputText}>
              {selectedEmployee?.employee_name || "Select Employee"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={CustomColors.White} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={() => { onClose(), setApproverPage(0) }}>
            <Text allowFontScaling={false} style={styles.submitText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </Pressable>

      {isEmployeePickerVisible && (
        <CustomActionSheetPicker
          pickerStatus={isEmployeePickerVisible}
          setPickerStatus={setEmployeePickerVisible}
          title="Select Employee"
          optionsData={approvers.map((person) => ({
            label: String(person.full_name),
            value: person.id,
          }))}
          RenderItem={RenderDropdownItem}
          onPress={(selectedOption) => {
            //console.log("asdfghjk", selectedOption)
            dispatch(
              setSelectedEmployee({
                employeegid: selectedOption.value,
                employee_name: selectedOption.label,
              })
            );
          }}
          selected={{
            label: selectedEmployee?.employee_name || undefined,
            value: selectedEmployee?.employeegid || undefined,
          }}
          onSearch={handleSearchEmployee}
          isLoading={isLoadingApprover && ApproverPage === 0}
          onEndReached={handleLoadMoreApprover}
          hasMoreData={hasMoreApprover}
          isFetchingMore={isFetchingApprover && ApproverPage > 0}
        />
      )}
    </Modal>
  );
};

export default SelfOrOnBehalfModal;

