import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
} from "react-native";
import { useLazyBranchListQuery, useLazyEmployeeListQuery } from "../../redux/rtk_query/apiSlice";
import { getCustomColors } from "../../styles/CustomColors";
import { moderateScale, verticalScale, horizontalScale } from "../../styles/Metrics";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';

const RADIO_OPTIONS = [
  { value: 1, display: "Self" },
  { value: 0, display: "On Behalf Of" },
];

const SelfOrOnBehalfModal = ({ visible, onSubmit }) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const [status, setStatus] = useState(null); // 1 = self, 0 = onbehalf

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [isBranchPickerVisible, setBranchPickerVisible] = useState(false);
  const [branchList, setBranchList] = useState([]);
  const [branchPage, setBranchPage] = useState(1);
  const [hasMoreBranch, setHasMoreBranch] = useState(true);
  const [currentBranchQuery, setCurrentBranchQuery] = useState("");

  const [isEmpPickerVisible, setEmpPickerVisible] = useState(false);
  const [empList, setEmpList] = useState([]);
  const [empPage, setEmpPage] = useState(1);
  const [hasMoreEmp, setHasMoreEmp] = useState(true);
  const [currentEmpQuery, setCurrentEmpQuery] = useState("");

  const [triggerBranch, { isFetching: isBranchLoading }] = useLazyBranchListQuery();
  const [triggerEmployee, { isFetching: isEmpLoading }] = useLazyEmployeeListQuery();
  const debounceRef = useRef(null);

  const showRadioBtn = status === 0;
  const showDisabled =
    status === null || (status === 0 && (!selectedBranch || !selectedEmployee));

  // Block Android back button (mirrors backdrop static behavior)
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [visible]);

  const resetLocalState = () => {
    setStatus(null);
    setSelectedBranch(null);
    setSelectedEmployee(null);
    setBranchList([]);
    setBranchPage(1);
    setHasMoreBranch(true);
    setCurrentBranchQuery("");
    setEmpList([]);
    setEmpPage(1);
    setHasMoreEmp(true);
    setCurrentEmpQuery("");
  };

  useEffect(() => {
    if (visible) resetLocalState();
  }, [visible]);

  const expensedatas = (option) => {
    setStatus(option.value);
    setSelectedBranch(null);
    setSelectedEmployee(null);
    setEmpList([]);
  };

  // Branch picker methods
  const openBranchPicker = () => {
    setBranchPickerVisible(true);
    setCurrentBranchQuery("");
    setBranchPage(1);
    setHasMoreBranch(true);
    setBranchList([]);
    triggerBranch({ name: "", page: 1 })
      .unwrap()
      .then((res) => setBranchList(res?.data || []))
      .catch(() => setBranchList([]));
  };

  const handleSearchBranch = useCallback(
    (text) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setCurrentBranchQuery(text);
        setBranchPage(1);
        setHasMoreBranch(true);
        setBranchList([]);
        try {
          const res = await triggerBranch({ name: text, page: 1 }).unwrap();
          setBranchList(res?.data || []);
          setHasMoreBranch(res?.pagination?.has_next ?? false);
        } catch {
          setBranchList([]);
        }
      }, 300);
    },
    [triggerBranch]
  );

  const handleLoadMoreBranch = async () => {
    if (isBranchLoading || !hasMoreBranch) return;
    const nextPage = branchPage + 1;
    setBranchPage(nextPage);
    try {
      const res = await triggerBranch({ name: currentBranchQuery, page: nextPage }).unwrap();
      setBranchList((prev) => [...prev, ...(res?.data || [])]);
      setHasMoreBranch(res?.pagination?.has_next ?? false);
    } catch {
      setHasMoreBranch(false);
    }
  };

  const onSelectBranch = (branch) => {
    setSelectedBranch(branch);
    setSelectedEmployee(null);
    setEmpList([]);
  };

  // Employee picker methods
  const openEmpPicker = () => {
    if (!selectedBranch) return;
    setEmpPickerVisible(true);
    setCurrentEmpQuery("");
    setEmpPage(1);
    setHasMoreEmp(true);
    setEmpList([]);
    triggerEmployee({ branch: selectedBranch.id, query: "", page: 1 })
      .unwrap()
      .then((res) => setEmpList(res?.data || []))
      .catch(() => setEmpList([]));
  };

  const handleSearchEmp = useCallback(
    (text) => {
      if (!selectedBranch) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setCurrentEmpQuery(text);
        setEmpPage(1);
        setHasMoreEmp(true);
        setEmpList([]);
        try {
          const res = await triggerEmployee({ branch: selectedBranch.id, query: text, page: 1 }).unwrap();
          setEmpList(res?.data || []);
          setHasMoreEmp(res?.pagination?.has_next ?? false);
        } catch {
          setEmpList([]);
        }
      }, 300);
    },
    [triggerEmployee, selectedBranch]
  );

  const handleLoadMoreEmp = async () => {
    if (isEmpLoading || !hasMoreEmp || !selectedBranch) return;
    const nextPage = empPage + 1;
    setEmpPage(nextPage);
    try {
      const res = await triggerEmployee({ branch: selectedBranch.id, query: currentEmpQuery, page: nextPage }).unwrap();
      setEmpList((prev) => [...prev, ...(res?.data || [])]);
      setHasMoreEmp(res?.pagination?.has_next ?? false);
    } catch {
      setHasMoreEmp(false);
    }
  };

  const onSelectEmp = (emp) => {
    setSelectedEmployee(emp);
  };

  const submitForms = () => {
    if (status === null) return;
    if (status === 0 && (!selectedBranch || !selectedEmployee)) return;

    onSubmit({
      mode: status === 1 ? "self" : "onbehalf",
      selectedBranch: status === 0 ? selectedBranch : null,
      selectedEmployee: status === 0 ? selectedEmployee : null,
    });
  };

  const styles = getStyles(CustomColors);

  const RenderBranchItem = ({ options, onPress, selected, setPickerStatus }) => {
    const isSelected = selected?.value === options.value;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress(options.raw);
          setPickerStatus(false);
        }}
        style={[styles.actionSheetOption, isSelected && styles.actionSheetOptionSelected]}
      >
        <Text allowFontScaling={false} style={[styles.actionSheetOptionText, isSelected && styles.actionSheetOptionTextSelected]}>
          {options.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const RenderEmpItem = ({ options, onPress, selected, setPickerStatus }) => {
    const isSelected = selected?.value === options.value;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress(options.raw);
          setPickerStatus(false);
        }}
        style={[styles.actionSheetOption, isSelected && styles.actionSheetOptionSelected]}
      >
        <Text allowFontScaling={false} style={[styles.actionSheetOptionText, isSelected && styles.actionSheetOptionTextSelected]}>
          {options.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text allowFontScaling={false} style={styles.title}>Onbehalf Of</Text>

          <View style={styles.radioRow}>
            {RADIO_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.radioOption}
                onPress={() => expensedatas(opt)}
              >
                <View style={[styles.radioCircle, status === opt.value && styles.radioCircleSelected]}>
                  {status === opt.value && <View style={styles.radioDot} />}
                </View>
                <Text allowFontScaling={false} style={styles.radioLabel}>{opt.display}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {showRadioBtn && (
            <>
              <Text allowFontScaling={false} style={styles.label}>Branch *</Text>
              <TouchableOpacity style={styles.inputField} onPress={openBranchPicker}>
                <Text allowFontScaling={false} style={styles.inputText}>
                  {selectedBranch ? `(${selectedBranch.code}) ${selectedBranch.name}` : "Select Branch"}
                </Text>
                <Ionicons name="chevron-down" size={20} color={CustomColors.textGray} />
              </TouchableOpacity>

              <Text allowFontScaling={false} style={styles.label}>Employee *</Text>
              <TouchableOpacity
                style={[styles.inputField, !selectedBranch && styles.inputFieldDisabled]}
                onPress={openEmpPicker}
                disabled={!selectedBranch}
              >
                <Text allowFontScaling={false} style={styles.inputText}>
                  {selectedEmployee ? (selectedEmployee.full_name || selectedEmployee.name) : "Select Employee"}
                </Text>
                <Ionicons name="chevron-down" size={20} color={CustomColors.textGray} />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, showDisabled && styles.submitButtonDisabled]}
            disabled={showDisabled}
            onPress={submitForms}
          >
            <Text allowFontScaling={false} style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isBranchPickerVisible && (
        <CustomActionSheetPicker
          pickerStatus={isBranchPickerVisible}
          setPickerStatus={setBranchPickerVisible}
          title="Select Branch"
          optionsData={branchList.map((b) => ({
            label: `(${b.code}) ${b.name}`,
            value: b.id,
            raw: b,
          }))}
          RenderItem={RenderBranchItem}
          onPress={onSelectBranch}
          selected={{
            label: selectedBranch ? `(${selectedBranch.code}) ${selectedBranch.name}` : undefined,
            value: selectedBranch?.id,
          }}
          onSearch={handleSearchBranch}
          isLoading={isBranchLoading && branchPage === 1}
          onEndReached={handleLoadMoreBranch}
          hasMoreData={hasMoreBranch}
          isFetchingMore={isBranchLoading && branchPage > 1}
        />
      )}

      {isEmpPickerVisible && (
        <CustomActionSheetPicker
          pickerStatus={isEmpPickerVisible}
          setPickerStatus={setEmpPickerVisible}
          title="Select Employee"
          optionsData={empList.map((e) => ({
            label: e.full_name || e.name || e.employee_name,
            value: e.id || e.employeegid,
            raw: e,
          }))}
          RenderItem={RenderEmpItem}
          onPress={onSelectEmp}
          selected={{
            label: selectedEmployee?.full_name || selectedEmployee?.name,
            value: selectedEmployee?.id || selectedEmployee?.employeegid,
          }}
          onSearch={handleSearchEmp}
          isLoading={isEmpLoading && empPage === 1}
          onEndReached={handleLoadMoreEmp}
          hasMoreData={hasMoreEmp}
          isFetchingMore={isEmpLoading && empPage > 1}
        />
      )}
    </Modal>
  );
};

const getStyles = (CustomColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: CustomColors.overlayBlack || "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      width: "90%",
      backgroundColor: CustomColors.backgroundWhite || "#fff",
      borderRadius: moderateScale(12),
      padding: moderateScale(20),
    },
    title: {
      fontSize: moderateScale(18),
      fontWeight: "700",
      marginBottom: verticalScale(15),
      textAlign: "center",
      color: CustomColors.textDark,
    },
    radioRow: {
      flexDirection: "row",
      marginBottom: verticalScale(15),
    },
    radioOption: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: horizontalScale(20),
    },
    radioCircle: {
      width: moderateScale(18),
      height: moderateScale(18),
      borderRadius: moderateScale(9),
      borderWidth: 2,
      borderColor: CustomColors.appThemeColor,
      justifyContent: "center",
      alignItems: "center",
      marginRight: horizontalScale(6),
    },
    radioCircleSelected: {
      borderColor: CustomColors.appThemeColor,
    },
    radioDot: {
      width: moderateScale(9),
      height: moderateScale(9),
      borderRadius: moderateScale(5),
      backgroundColor: CustomColors.appThemeColor,
    },
    radioLabel: {
      fontSize: moderateScale(15),
      color: CustomColors.textDark,
    },
    label: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      marginTop: verticalScale(10),
      color: CustomColors.textDark,
    },
    inputField: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(12),
      marginTop: verticalScale(6),
    },
    inputFieldDisabled: {
      opacity: 0.5,
    },
    inputText: {
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      flex: 1,
    },
    submitButton: {
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(12),
      alignItems: "center",
      marginTop: verticalScale(20),
    },
    submitButtonDisabled: {
      backgroundColor: CustomColors.textGray,
    },
    submitButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(15),
      fontWeight: "700",
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

export default SelfOrOnBehalfModal;