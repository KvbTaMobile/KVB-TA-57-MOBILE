import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
} from "react-native";
import { Fonts } from '../../styles/Fonts';
import { SafeAreaView } from "react-native-safe-area-context";
import SelfOrOnBehalfModal from "../../TaComponents/models/SelfOrOnBehalfModal";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import DateTimePicker from "@react-native-community/datetimepicker";
import { moderateScale, verticalScale, horizontalScale } from '../../styles/Metrics';
import { Ionicons } from "@expo/vector-icons";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import FileDisplaySection from "../../TaComponents/cards/FileDisplaySection";
import * as create_styles from "../../styles/StyleSheet";
import {
  useLazyEmpDetailsQuery,
  useLazyTourReasonListQuery,
  useHolidayCheckMutation,
  useLazyCityListQuery,
  useLazyEmployeeListQuery,
  useLazyBranchListQuery,
} from "../../redux/rtk_query/apiSlice";
import {
  updateField,
  resetForm,
} from "../../redux/slices/travelMakerFormSlice";
import {
  setReasonList,
  clearDropdownData,
  setCityList,
  updateReasonList,
  updateCityList,
} from "../../redux/slices/Dropdowns";
import { getCustomColors } from "../../styles/CustomColors";
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import { Environment } from "../../environment/Environment";
import * as ImagePicker from 'expo-image-picker';
import { uploadMultipart } from "../../utilities/upload";
import { pickDocuments } from "../../utilities/filePicker";

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate()?.toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateOnly = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.0`;
};

const TravelMakerCreateScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { reasons, cities } = useSelector((state) => state.Dropdowns);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const styles = create_styles.create_styles(isDark);

  const [isSelfModalVisible, setIsSelfModalVisible] = useState(true);
  const [selectedOnBehalfEmp, setSelectedOnBehalfEmp] = useState(null);

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [dateField, setDateField] = useState(null);
  const [currentDetailDateFieldIndex, setCurrentDetailDateFieldIndex] = useState(null);
  const [files, setFiles] = useState([]);

  const [isReasonPickerVisible, setReasonPickerVisibility] = useState(false);
  const [isCityPickerVisible, setCityPickerVisibility] = useState(false);
  const [isPermittedByPickerVisible, setPermittedByPickerVisibility] = useState(false);
  const [isApproverBranchPickerVisible, setApproverBranchPickerVisibility] = useState(false);
  const [isApproverEmpPickerVisible, setApproverEmpPickerVisibility] = useState(false);

  const [permittedByList, setPermittedByList] = useState([]);
  const [permittedByPage, setPermittedByPage] = useState(1);
  const [hasMorePermittedBy, setHasMorePermittedBy] = useState(true);
  const [currentPermittedBySearchQuery, setCurrentPermittedBySearchQuery] = useState("");

  const [approverBranchList, setApproverBranchList] = useState([]);
  const [approverBranchPage, setApproverBranchPage] = useState(1);
  const [hasMoreApproverBranch, setHasMoreApproverBranch] = useState(true);
  const [currentApproverBranchSearchQuery, setCurrentApproverBranchSearchQuery] = useState("");

  const [approverEmpList, setApproverEmpList] = useState([]);
  const [approverEmpPage, setApproverEmpPage] = useState(1);
  const [hasMoreApproverEmp, setHasMoreApproverEmp] = useState(true);
  const [currentApproverEmpSearchQuery, setCurrentApproverEmpSearchQuery] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonPage, setReasonPage] = useState(0);
  const [CityPage, setCityPage] = useState(1);
  const [hasMoreReasons, setHasMoreReasons] = useState(true);
  const [hasMoreCity, setHasMoreCity] = useState(true);

  const [currentReasonSearchQuery, setCurrentReasonSearchQuery] = useState("");
  const [currentCitySearchQuery, setCurrentCitySearchQuery] = useState("");
  const [selectedFieldTitle, setSelectedFieldTitle] = useState("");

  const [triggerPermittedByList, { isFetching: isPermittedByLoading }] = useLazyEmployeeListQuery();
  const [triggerBranchList, { isFetching: isBranchLoading }] = useLazyBranchListQuery();
  const [triggerApproverEmpList, { isFetching: isApproverEmpLoading }] = useLazyEmployeeListQuery();

  const scrollViewRef = useRef(null);
  const reasonRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const remarksRef = useRef(null);
  const permittedByRef = useRef(null);
  const approverBranchRef = useRef(null);
  const approverEmpRef = useRef(null);
  const quantumOfFundsRef = useRef(null);
  const openingBalanceRef = useRef(null);
  const debitBranchRef = useRef(null);
  const detailRefs = useRef([]);
  const fileUploadRef = useRef(null);

  const [errors, setErrors] = useState({
    reason: false,
    startDate: false,
    endDate: false,
    remarks: false,
    permittedby: false,
    approverBranch: false,
    approval: false,
    quantumOfFunds: false,
    openingBalance: false,
    debitBranch: false,
    details: [],
    fileUpload: false,
  });

  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleSelfOrOnBehalfSubmit = (res) => {
    setIsSelfModalVisible(false);
    if (res.mode === "onbehalf" && res.selectedEmployee) {
      setSelectedOnBehalfEmp(res.selectedEmployee);
      dispatch(updateField({ onbehalfof: res.selectedEmployee.id || res.selectedEmployee.employeegid }));
      triggerEmpDetails({ onbehalf: res.selectedEmployee.id || res.selectedEmployee.employeegid });
    } else {
      setSelectedOnBehalfEmp(null);
      dispatch(updateField({ onbehalfof: null }));
      triggerEmpDetails({});
    }
  };

  const emptyDetailRow = {
    id: 0,
    detailStartDate: null,
    detailEndDate: null,
    startingpoint: "",
    placeofvisit: "",
    purposeofvisit: "",
  };

  const getNumberOfDatesBetween = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    return dayDiff > 0 ? dayDiff : 0;
  };

  const [triggerEmpDetails, { data: EmpDetailsData, isLoading: isLoadingEmpDetails }] = useLazyEmpDetailsQuery();
  const [triggerReason, { data: ReasonData, isFetching: isFetchingReason }] = useLazyTourReasonListQuery();
  const [triggerHolidayCheck] = useHolidayCheckMutation();
  const [triggerCity, { data: CityData, isLoading: isLoadingCity }] = useLazyCityListQuery();

  const debounceTimeout = useRef(null);
  const authToken = useSelector((s) => s.auth.user?.token);
  const csrfToken = useSelector((s) => s.auth.csrfToken);
  const csrfCookie = useSelector((s) => s.auth.csrfCookie);

  useEffect(() => {
    navigation.setOptions({
      title: "eClaim Tour",
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerShown: true,
      headerTintColor: CustomColors.textWhite,
    });
    triggerEmpDetails({});
    return () => {
      dispatch(resetForm());
      dispatch(clearDropdownData());
    };
  }, [navigation, dispatch, triggerEmpDetails]);

  useEffect(() => {
    if (EmpDetailsData) {
      dispatch(updateField(EmpDetailsData));
    }
  }, [EmpDetailsData, dispatch]);

  useEffect(() => {
    if (ReasonData?.data) {
      if (reasonPage === 1) {
        dispatch(setReasonList(ReasonData));
      } else {
        dispatch(updateReasonList(ReasonData));
      }
      setHasMoreReasons(ReasonData.data.length > 0);
    }
  }, [ReasonData, dispatch]);

  useEffect(() => {
    if (CityData?.data) {
      if (CityPage === 1) {
        dispatch(setCityList(CityData));
      } else {
        dispatch(updateCityList(CityData));
      }
      setHasMoreCity(CityData.pagination ? CityData.pagination.has_next : CityData.data.length > 0);
    }
  }, [CityData, dispatch]);

  const travelForm = useSelector((state) => state.travelMakerFormSlice);

  const getBranchId = () => {
    return (
      travelForm?.empbranchgid?.id ||
      travelForm?.empbranchgid ||
      EmpDetailsData?.employee_branch_id ||
      EmpDetailsData?.branch_id ||
      1
    );
  };

  const pickFiles = async () => {
    try {
      const selectedFiles = await pickDocuments(true);
      if (selectedFiles.length > 0) {
        setFiles((prev) => [...prev, ...selectedFiles]);
        setErrors((prev) => ({ ...prev, fileUpload: false }));
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick files.");
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const newFile = {
          uri: asset.uri,
          name: asset.fileName || `camera_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };
        setFiles(prev => [...prev, newFile]);
        setErrors(prev => ({ ...prev, fileUpload: false }));
      }
    } catch (e) {
      console.log('Camera error', e);
    }
  };

  const removeFile = (uri) => {
    setFiles((prev) => prev.filter((file) => file.uri !== uri));
  };

  const handleConfirmDate = async (event, selectedDate, setFieldValue, values) => {
    setDatePickerVisibility(false);
    if (!selectedDate) return;

    if (currentDetailDateFieldIndex !== null) {
      const details = [...values.details];
      let newDetailStartDate = details[currentDetailDateFieldIndex].detailStartDate;
      let newDetailEndDate = details[currentDetailDateFieldIndex].detailEndDate;

      if (dateField === "detailStartDate") {
        newDetailStartDate = selectedDate.toISOString();
        if (!newDetailEndDate || new Date(newDetailEndDate) < selectedDate) {
          newDetailEndDate = selectedDate.toISOString();
        }
      } else if (dateField === "detailEndDate") {
        newDetailEndDate = selectedDate.toISOString();
        if (!newDetailStartDate || new Date(newDetailStartDate) > selectedDate) {
          newDetailStartDate = selectedDate.toISOString();
        }
      }

      setFieldValue(`details[${currentDetailDateFieldIndex}].detailStartDate`, newDetailStartDate);
      setFieldValue(`details[${currentDetailDateFieldIndex}].detailEndDate`, newDetailEndDate);
      setCurrentDetailDateFieldIndex(null);
    } else if (dateField) {
      let newStartDate = values.startDate;
      let newEndDate = values.endDate;
      let mainDatesChanged = false;

      if (dateField === "startDate") {
        newStartDate = selectedDate.toISOString();
        if (!newEndDate || new Date(newEndDate) < selectedDate) {
          newEndDate = selectedDate.toISOString();
        }
        mainDatesChanged = true;
      } else if (dateField === "endDate") {
        newEndDate = selectedDate.toISOString();
        if (!newStartDate || new Date(newStartDate) > selectedDate) {
          newStartDate = selectedDate.toISOString();
        }
        mainDatesChanged = true;
      }

      if (mainDatesChanged) {
        setFieldValue("startDate", newStartDate);
        setFieldValue("endDate", newEndDate);
        setFieldValue("durationDays", getNumberOfDatesBetween(newStartDate, newEndDate));

        try {
          const { data: HolidayCheckData } = await triggerHolidayCheck({
            start_date: formatDateOnly(newStartDate),
            end_date: formatDateOnly(newEndDate),
          });
          if (HolidayCheckData) {
            setFieldValue("isHoliday", HolidayCheckData.data.length > 0);
            setFieldValue("isOnGoingTour", HolidayCheckData.ongoing_tour);
          }
        } catch (error) {
          console.error("Holiday check failed:", error);
        }
      }
    }
  };

  const handleSubmit = async (values) => {
    try {
      setIsSubmitting(true);
      const reasonId = Number(values.reason?.id || 0);

      if (!reasonId) {
        ToastMessage("Please Select Tour Reason");
        return;
      }

      if (reasonId === 2) {
        if (!values.quantum_of_funds && values.quantum_of_funds !== 0) {
          ToastMessage("Please Enter Quantum Of Funds");
          return;
        }
        if (!values.opening_balance && values.opening_balance !== 0) {
          ToastMessage("Please Enter Opening Balance");
          return;
        }
      }

      let debitBranch = null;
      if (reasonId === 12) {
        if (!values.debit_branch?.id) {
          ToastMessage("Please Select Debit Branch");
          return;
        }
        debitBranch = values.debit_branch.id;
      }

      if (!values.startDate) {
        ToastMessage("Please Select Tour Start Date");
        return;
      }

      if (!values.endDate) {
        ToastMessage("Please Select Tour End Date");
        return;
      }

      if (!values.remarks?.trim()) {
        ToastMessage("Please Enter Order No or Remarks");
        return;
      }

      if (!values.permittedby?.id) {
        ToastMessage("Please Select Permitted By");
        return;
      }

      for (const detail of values.details || []) {
        if (!detail.detailStartDate) {
          ToastMessage("Please Select Tour Itenary Start Date");
          return;
        }
        if (!detail.detailEndDate) {
          ToastMessage("Please Select Tour Itenary End Date");
          return;
        }
        if (new Date(detail.detailEndDate) > new Date(values.endDate)) {
          ToastMessage("Itenary End Date should not be greater than Tour End Date");
          return;
        }
        if (!String(detail.startingpoint || "").trim()) {
          ToastMessage("Please Enter Starting Point");
          return;
        }
        if (!String(detail.placeofvisit || "").trim()) {
          ToastMessage("Please Enter Place of Visit");
          return;
        }
        if (!String(detail.purposeofvisit || "").trim()) {
          ToastMessage("Please Enter Purpose of Visit");
          return;
        }
      }

      if ([1, 2, 4, 5, 6, 7, 8, 11].includes(reasonId)) {
        if (!files || files.length === 0) {
          ToastMessage("Please Attach Files");
          return;
        }
      }

      if (!values.empbranchgid) {
        ToastMessage("Please Select Branch");
        return;
      }

      const approverId = Number(values.approval?.id || values.approval?.employeegid || 0);
      if (!approverId) {
        ToastMessage("Please Select Employee");
        return;
      }

      const data = {
        requestno: "NEW",
        requestdate: formatDateTime(values.requestDate || new Date()),
        reason: reasonId,
        startdate: formatDateTime(values.startDate),
        enddate: formatDateTime(values.endDate),
        durationdays: Number(values.durationDays || 1),
        ordernoremarks: values.remarks,
        permittedby: Number(values.permittedby.id),
        approval: approverId,
        empbranchgid: Number(values.empbranchgid.id || values.empbranchgid),
        comments: values.comments || "",
        transfer_on_promotion: [6, 7, 8].includes(reasonId) ? Number(values.transfer_on_promotion || 0) : 0,
        quantum_of_funds: reasonId === 2 ? Number(values.quantum_of_funds) : null,
        opening_balance: reasonId === 2 ? Number(values.opening_balance) : null,
        debit_branch: debitBranch,
        tour_exist: values.isOnGoingTour || values.isHoliday ? 1 : 0,

        ...(selectedOnBehalfEmp
          ? { onbehalfof: Number(selectedOnBehalfEmp.id || selectedOnBehalfEmp.employeegid) }
          : {}),

        detail: (values.details || []).map((item) => ({
          startdate: formatDateTime(item.detailStartDate),
          enddate: formatDateTime(item.detailEndDate),
          startingpoint: String(item.startingpoint?.name || item.startingpoint).trim(),
          placeofvisit: String(item.placeofvisit?.name || item.placeofvisit).trim(),
          purposeofvisit: String(item.purposeofvisit).trim(),
        })),
      };

      const uploadFiles = (files || []).map((file, index) => ({
        uri: file.uri,
        name: file.name || `file_${index}.jpg`,
        type: file.type || file.mimeType || "image/jpeg",
        size: file.size || 0,
      }));

      const response = await uploadMultipart({
        url: `${Environment.taServiceUrl}/taserv/tour`,
        data,
        files: uploadFiles,
        headers: {
          Authorization: `Token ${authToken}`,
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          ...(csrfCookie ? { "X-CSRFCookie": csrfCookie } : {}),
        },
      });

      if (response?.status === "success" || response?.message === "Success") {
        ToastMessage("Successfully Created");
        navigation.goBack();
      } else {
        ToastMessage(response?.description || response?.message || "Submission failed.");
      }
    } catch (error) {
      ToastMessage("Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchReason = useCallback((query) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setCurrentReasonSearchQuery(query);
      setReasonPage(1);
      setHasMoreReasons(true);
      dispatch(setReasonList({ data: [] }));
      triggerReason({ name: query, page: 1 });
    }, 500);
  }, [triggerReason, dispatch]);

  const handleSearchCity = (query) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setCurrentCitySearchQuery(query);
      setCityPage(1);
      setHasMoreCity(true);
      dispatch(setCityList({ data: [] }));
      triggerCity({ city_name: query, page: 1 });
    }, 500);
  };

  const openReasonPicker = () => {
    setReasonPickerVisibility(true);
    if (reasons.length === 0) {
      triggerReason({ name: "", page: 1 });
    }
  };

  const openCityPicker = (field, index, title) => {
    setSelectedFieldTitle(title);
    setCityPickerVisibility(true);
    if (cities.length === 0) {
      triggerCity({ city_name: "", page: 1 });
    }
  };

  const openPermittedByPicker = () => {
    const branchId = getBranchId();
    if (!branchId) {
      ToastMessage("Please select a Branch first.");
      return;
    }
    setPermittedByPickerVisibility(true);
    triggerPermittedByList({ branch: branchId, query: "", page: 1 })
      .unwrap()
      .then((res) => setPermittedByList(res?.data || []))
      .catch(() => setPermittedByList([]));
  };

  const openApproverBranchPicker = () => {
    setApproverBranchPickerVisibility(true);
    triggerBranchList({ name: "", page: 1 })
      .unwrap()
      .then((res) => setApproverBranchList(res?.data || []))
      .catch(() => setApproverBranchList([]));
  };

  const openApproverEmpPicker = (selectedBranchId) => {
    const targetBranch = selectedBranchId || getBranchId();
    if (!targetBranch) {
      ToastMessage("Please select an Approver Branch first.");
      return;
    }
    setApproverEmpPickerVisibility(true);
    triggerApproverEmpList({ branch: targetBranch, query: "", page: 1 })
      .unwrap()
      .then((res) => setApproverEmpList(res?.data || []))
      .catch(() => setApproverEmpList([]));
  };

  const RenderDropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected = selected && selected.value === options.value;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress(options);
          setPickerStatus(false);
        }}
        style={[styles.actionSheetOption, isSelected && styles.actionSheetOptionSelected]}
      >
        <Text allowFontScaling={false} style={[styles.actionSheetOptionText, isSelected && styles.actionSheetOptionTextSelected]}>
          {typeof options.label === "string" ? options.label : String(options.label)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: CustomColors.appScreenColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: CustomColors.appScreenColor }}>
        
        <SelfOrOnBehalfModal
          visible={isSelfModalVisible}
          onSubmit={handleSelfOrOnBehalfSubmit}
        />

        <Formik
          enableReinitialize
          initialValues={travelForm}
          onSubmit={handleSubmit}
        >
          {({ values, handleChange, handleSubmit: formikSubmit, setFieldValue }) => (
            <>
              <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" ref={scrollViewRef}>
                
                {selectedOnBehalfEmp && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: CustomColors.appliteThemecolor,
                    padding: moderateScale(10),
                    borderRadius: moderateScale(8),
                    marginBottom: verticalScale(10),
                    borderWidth: 1,
                    borderColor: CustomColors.appThemeColor,
                  }}>
                    <Ionicons name="person-circle-outline" size={20} color={CustomColors.appThemeColor} />
                    <Text allowFontScaling={false} style={{ marginLeft: 8, fontSize: moderateScale(14), fontWeight: 'bold', color: CustomColors.appThemeColor }}>
                      On Behalf Of: {selectedOnBehalfEmp.full_name || selectedOnBehalfEmp.name}
                    </Text>
                  </View>
                )}

                {/* Tour Information Section */}
                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Tour Information</Text>

                  <Text allowFontScaling={false} style={styles.label}>Tour No</Text>
                  <TextInput style={styles.input} value="NEW" editable={false} allowFontScaling={false} />

                  <Text allowFontScaling={false} style={styles.label}>Requested Date</Text>
                  <TextInput style={styles.input} value={formatDate(values.requestDate || new Date())} editable={false} allowFontScaling={false} />
                </View>

                {/* Employee Details Section */}
                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Employee Details</Text>
                  {isLoadingEmpDetails ? (
                    <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
                  ) : (
                    <>
                      <Text allowFontScaling={false} style={styles.label}>Employee Name</Text>
                      <TextInput style={styles.input} value={values.empName} editable={false} allowFontScaling={false} />

                      <Text allowFontScaling={false} style={styles.label}>Employee Code</Text>
                      <TextInput style={styles.input} value={values.empCode} editable={false} allowFontScaling={false} />

                      <Text allowFontScaling={false} style={styles.label}>Designation</Text>
                      <TextInput style={styles.input} value={values.empDesign} editable={false} allowFontScaling={false} />

                      <Text allowFontScaling={false} style={styles.label}>Employee Grade</Text>
                      <TextInput style={styles.input} value={values.empGrade} editable={false} allowFontScaling={false} />
                    </>
                  )}
                </View>

                {/* Tour Details Section */}
                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Tour Details</Text>

                  <Text allowFontScaling={false} style={styles.label}>
                    Tour Reason <Text allowFontScaling={false} style={styles.mandatory}>*</Text>
                  </Text>
                  <TouchableOpacity onPress={openReasonPicker} style={[styles.pickerInput, errors.reason && styles.errorBorder]} ref={reasonRef}>
                    <Text allowFontScaling={false} style={styles.pickerInputText}>
                      {values.reason?.name ? String(values.reason.name) : "Select Reason"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                  </TouchableOpacity>

                  {[6, 7, 8].includes(Number(values.reason?.id)) && (
                    <View style={{ marginTop: verticalScale(10) }}>
                      <Text allowFontScaling={false} style={styles.label}>Transfer On Promotion</Text>
                      <TouchableOpacity
                        style={styles.pickerInput}
                        onPress={() => setFieldValue("transfer_on_promotion", values.transfer_on_promotion === "1" ? "0" : "1")}
                      >
                        <Text allowFontScaling={false} style={styles.pickerInputText}>
                          {values.transfer_on_promotion === "1" ? "YES" : "NO"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {Number(values.reason?.id) === 2 && (
                    <View style={{ marginTop: verticalScale(10) }}>
                      <Text allowFontScaling={false} style={styles.label}>Quantum of Funds <Text style={styles.mandatory}>*</Text></Text>
                      <TextInput
                        ref={quantumOfFundsRef}
                        style={[styles.input, errors.quantumOfFunds && styles.errorBorder]}
                        keyboardType="numeric"
                        value={values.quantum_of_funds?.toString()}
                        onChangeText={handleChange("quantum_of_funds")}
                        placeholder="Quantum of Funds"
                      />

                      <Text allowFontScaling={false} style={styles.label}>Opening Balance <Text style={styles.mandatory}>*</Text></Text>
                      <TextInput
                        ref={openingBalanceRef}
                        style={[styles.input, errors.openingBalance && styles.errorBorder]}
                        keyboardType="numeric"
                        value={values.opening_balance?.toString()}
                        onChangeText={handleChange("opening_balance")}
                        placeholder="Opening Balance"
                      />
                    </View>
                  )}

                  {Number(values.reason?.id) === 12 && (
                    <View style={{ marginTop: verticalScale(10) }}>
                      <Text allowFontScaling={false} style={styles.label}>Debit Branch <Text style={styles.mandatory}>*</Text></Text>
                      <TouchableOpacity
                        ref={debitBranchRef}
                        style={[styles.pickerInput, errors.debitBranch && styles.errorBorder]}
                        onPress={() => openCityPicker("debit_branch", 0, "Debit Branch")}
                      >
                        <Text allowFontScaling={false} style={styles.pickerInputText}>
                          {values.debit_branch?.name ? String(values.debit_branch.name) : "Select Debit Branch"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.dateRow}>
                    <View style={styles.dateColumn}>
                      <Text allowFontScaling={false} style={styles.label}>Tour Start Date <Text style={styles.mandatory}>*</Text></Text>
                      <TouchableOpacity
                        onPress={() => {
                          setDateField("startDate");
                          setCurrentDetailDateFieldIndex(null);
                          setDatePickerVisibility(true);
                        }}
                        ref={startDateRef}
                        style={[styles.pickerInput, errors.startDate && styles.errorBorder]}
                      >
                        <Text allowFontScaling={false} style={styles.pickerInputText}>
                          {values.startDate ? formatDate(values.startDate) : "Start Date"}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.dateColumn}>
                      <Text allowFontScaling={false} style={styles.label}>Tour End Date <Text style={styles.mandatory}>*</Text></Text>
                      <TouchableOpacity
                        onPress={() => {
                          setDateField("endDate");
                          setCurrentDetailDateFieldIndex(null);
                          setDatePickerVisibility(true);
                        }}
                        ref={endDateRef}
                        style={[styles.pickerInput, errors.endDate && styles.errorBorder]}
                      >
                        <Text allowFontScaling={false} style={styles.pickerInputText}>
                          {values.endDate ? formatDate(values.endDate) : "End Date"}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text allowFontScaling={false} style={styles.label}>No of Tour Days</Text>
                  <TextInput style={styles.input} value={String(values.durationDays || 0)} editable={false} allowFontScaling={false} />

                  <Text allowFontScaling={false} style={styles.label}>Order No or Remarks <Text style={styles.mandatory}>*</Text></Text>
                  <TextInput
                    ref={remarksRef}
                    style={[styles.input, errors.remarks && styles.errorBorder]}
                    placeholder="Order No or Remarks"
                    value={values.remarks}
                    onChangeText={handleChange("remarks")}
                    allowFontScaling={false}
                  />

                  <Text allowFontScaling={false} style={styles.label}>Permitted By <Text style={styles.mandatory}>*</Text></Text>
                  <TouchableOpacity onPress={openPermittedByPicker} style={[styles.pickerInput, errors.permittedby && styles.errorBorder]} ref={permittedByRef}>
                    <Text allowFontScaling={false} style={styles.pickerInputText}>
                      {values.permittedby?.full_name || values.permittedby?.name || "Select Employee"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                  </TouchableOpacity>
                </View>

                {/* To Approver Section */}
                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>To Approver</Text>

                  <Text allowFontScaling={false} style={styles.label}>Approver Branch <Text style={styles.mandatory}>*</Text></Text>
                  <TouchableOpacity onPress={openApproverBranchPicker} style={[styles.pickerInput, errors.approverBranch && styles.errorBorder]} ref={approverBranchRef}>
                    <Text allowFontScaling={false} style={styles.pickerInputText}>
                      {values.empbranchgid?.name ? `(${values.empbranchgid.code || ''}) ${values.empbranchgid.name}` : "Select Branch"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                  </TouchableOpacity>

                  <Text allowFontScaling={false} style={styles.label}>Approver Employee <Text style={styles.mandatory}>*</Text></Text>
                  <TouchableOpacity onPress={() => openApproverEmpPicker(values.empbranchgid?.id)} style={[styles.pickerInput, errors.approval && styles.errorBorder]} ref={approverEmpRef}>
                    <Text allowFontScaling={false} style={styles.pickerInputText}>
                      {values.approval?.full_name || values.approval?.name || "Select Employee"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                  </TouchableOpacity>
                </View>

                {/* Itinerary Details */}
                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Tour Itinerary Table</Text>

                  {values.details.map((item, index) => (
                    <View key={index} style={{ borderBottomWidth: 1, borderBottomColor: CustomColors.borderLight, paddingBottom: 15, marginBottom: 15 }}>
                      <Text style={[styles.label, { color: CustomColors.appThemeColor }]}>S.No: {index + 1}</Text>

                      <View style={styles.dateRow}>
                        <View style={styles.dateColumn}>
                          <Text allowFontScaling={false} style={styles.label}>Start Date <Text style={styles.mandatory}>*</Text></Text>
                          <TouchableOpacity
                            onPress={() => {
                              setDateField("detailStartDate");
                              setCurrentDetailDateFieldIndex(index);
                              setDatePickerVisibility(true);
                            }}
                            style={[styles.pickerInput, errors?.details?.[index]?.detailStartDate && styles.errorBorder]}
                          >
                            <Text allowFontScaling={false} style={styles.pickerInputText}>
                              {item.detailStartDate ? formatDate(item.detailStartDate) : "Start Date"}
                            </Text>
                            <Ionicons name="calendar-outline" size={19} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.dateColumn}>
                          <Text allowFontScaling={false} style={styles.label}>End Date <Text style={styles.mandatory}>*</Text></Text>
                          <TouchableOpacity
                            onPress={() => {
                              setDateField("detailEndDate");
                              setCurrentDetailDateFieldIndex(index);
                              setDatePickerVisibility(true);
                            }}
                            style={[styles.pickerInput, errors?.details?.[index]?.detailEndDate && styles.errorBorder]}
                          >
                            <Text allowFontScaling={false} style={styles.pickerInputText}>
                              {item.detailEndDate ? formatDate(item.detailEndDate) : "End Date"}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color={CustomColors.mediumGray} style={styles.pickerIcon} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text allowFontScaling={false} style={styles.label}>Starting Point <Text style={styles.mandatory}>*</Text></Text>
                      <TextInput
                        style={[styles.input, errors.details?.[index]?.startingpoint && styles.errorBorder]}
                        placeholder="Starting Point"
                        value={item.startingpoint}
                        onChangeText={(text) => setFieldValue(`details[${index}].startingpoint`, text)}
                      />

                      <Text allowFontScaling={false} style={styles.label}>Place of Visit <Text style={styles.mandatory}>*</Text></Text>
                      <TextInput
                        style={[styles.input, errors.details?.[index]?.placeofvisit && styles.errorBorder]}
                        placeholder="Place of Visit"
                        value={item.placeofvisit}
                        onChangeText={(text) => setFieldValue(`details[${index}].placeofvisit`, text)}
                      />

                      <Text allowFontScaling={false} style={styles.label}>Purpose of Visit <Text style={styles.mandatory}>*</Text></Text>
                      <TextInput
                        style={[styles.input, errors.details?.[index]?.purposeofvisit && styles.errorBorder]}
                        placeholder="Purpose of Visit"
                        value={item.purposeofvisit}
                        onChangeText={(text) => setFieldValue(`details[${index}].purposeofvisit`, text)}
                      />

                      {values.details.length > 1 && (
                        <TouchableOpacity
                          style={[styles.removeButton, { marginTop: 10 }]}
                          onPress={() => {
                            const newDetails = [...values.details];
                            newDetails.splice(index, 1);
                            setFieldValue("details", newDetails);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color={CustomColors.iconWhite} />
                          <Text allowFontScaling={false} style={styles.buttonText}> Clear Tour Detail</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addButton} onPress={() => setFieldValue("details", [...values.details, emptyDetailRow])}>
                    <Ionicons name="add-circle-outline" size={24} color={CustomColors.iconWhite} />
                    <Text allowFontScaling={false} style={styles.buttonText}> Add Tour Detail</Text>
                  </TouchableOpacity>
                </View>

                {/* File Upload Section */}
                <View ref={fileUploadRef} style={[styles.sectionCard, errors?.fileUpload && { borderColor: "red", borderWidth: 1 }]}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>File Upload</Text>
                  <View style={{ flexDirection: 'row', justifyContent: "space-between" }}>
                    <TouchableOpacity style={styles.pickFileButton} onPress={pickFiles}>
                      <Ionicons name="document-attach-outline" size={24} color={CustomColors.iconWhite} />
                      <Text allowFontScaling={false} style={styles.buttonText}> Pick Files</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.pickFileButton, { backgroundColor: CustomColors.primaryGreen }]} onPress={openCamera}>
                      <Ionicons name="camera-outline" size={24} color={CustomColors.White} />
                      <Text allowFontScaling={false} style={styles.buttonText}> Camera</Text>
                    </TouchableOpacity>
                  </View>

                  {files.length > 0 && (
                    <FileDisplaySection
                      title="Selected Files"
                      files={files}
                      handleViewFile={handleWebViewFile}
                      removeFile={removeFile}
                      isEditable={true}
                    />
                  )}
                </View>

                <View style={{ height: 80 }} />

                {isDatePickerVisible && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => handleConfirmDate(event, selectedDate, setFieldValue, values)}
                  />
                )}

                {isReasonPickerVisible && (
                  <CustomActionSheetPicker
                    pickerStatus={isReasonPickerVisible}
                    setPickerStatus={setReasonPickerVisibility}
                    title="Select Reason"
                    optionsData={reasons.map((reason) => ({ label: String(reason.name), value: reason.id }))}
                    RenderItem={RenderDropdownItem}
                    onPress={(selectedOption) => {
                      setFieldValue("reason", { id: selectedOption.value, name: selectedOption.label });
                      setErrors((prev) => ({ ...prev, reason: false }));
                      setReasonPickerVisibility(false);
                    }}
                    selected={{ label: values.reason?.name, value: values.reason?.id }}
                    onSearch={handleSearchReason}
                    isLoading={isFetchingReason}
                  />
                )}

                {isPermittedByPickerVisible && (
                  <CustomActionSheetPicker
                    pickerStatus={isPermittedByPickerVisible}
                    setPickerStatus={setPermittedByPickerVisibility}
                    title="Select Employee"
                    optionsData={permittedByList.map((emp) => ({ label: String(emp.full_name || emp.name), value: emp.id }))}
                    RenderItem={RenderDropdownItem}
                    onPress={(selectedOption) => {
                      setFieldValue("permittedby", { id: selectedOption.value, full_name: selectedOption.label });
                      setErrors((prev) => ({ ...prev, permittedby: false }));
                      setPermittedByPickerVisibility(false);
                    }}
                    selected={{ label: values.permittedby?.full_name || values.permittedby?.name, value: values.permittedby?.id }}
                    isLoading={isPermittedByLoading}
                  />
                )}

                {isApproverBranchPickerVisible && (
                  <CustomActionSheetPicker
                    pickerStatus={isApproverBranchPickerVisible}
                    setPickerStatus={setApproverBranchPickerVisibility}
                    title="Select Approver Branch"
                    optionsData={approverBranchList.map((b) => ({ label: `(${b.code || ''}) ${b.name}`, value: b.id, raw: b }))}
                    RenderItem={RenderDropdownItem}
                    onPress={(selectedOption) => {
                      setFieldValue("empbranchgid", { id: selectedOption.value, name: selectedOption.label });
                      setFieldValue("approval", null);
                      setApproverBranchPickerVisibility(false);
                    }}
                    selected={{ label: values.empbranchgid?.name }}
                    isLoading={isBranchLoading}
                  />
                )}

                {isApproverEmpPickerVisible && (
                  <CustomActionSheetPicker
                    pickerStatus={isApproverEmpPickerVisible}
                    setPickerStatus={setApproverEmpPickerVisibility}
                    title="Select Approver Employee"
                    optionsData={approverEmpList.map((emp) => ({ label: String(emp.full_name || emp.name || emp.employee_name), value: emp.id || emp.employeegid }))}
                    RenderItem={RenderDropdownItem}
                    onPress={(selectedOption) => {
                      setFieldValue("approval", { id: selectedOption.value, full_name: selectedOption.label });
                      setErrors((prev) => ({ ...prev, approval: false }));
                      setApproverEmpPickerVisibility(false);
                    }}
                    selected={{ label: values.approval?.full_name || values.approval?.name, value: values.approval?.id }}
                    isLoading={isApproverEmpLoading}
                  />
                )}

                {isCityPickerVisible && (
                  <CustomActionSheetPicker
                    pickerStatus={isCityPickerVisible}
                    setPickerStatus={setCityPickerVisibility}
                    title={`Select ${selectedFieldTitle}`}
                    optionsData={cities.map((city) => ({ label: String(city.name), value: city.name }))}
                    RenderItem={RenderDropdownItem}
                    onPress={async (selectedOption) => {
                      setFieldValue("debit_branch", { id: selectedOption.value, name: selectedOption.label });
                      setCityPickerVisibility(false);
                    }}
                    selected={{ label: values.debit_branch?.name }}
                    isLoading={isLoadingCity}
                  />
                )}
              </ScrollView>

              <View style={styles.submitButtonContainer}>
                <Animated.View style={{ opacity: opacityAnim }}>
                  <TouchableOpacity
                    style={[styles.submitButtonFullWidth, isSubmitting && styles.submitButtonDisabled]}
                    onPress={formikSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={CustomColors.textWhite} />
                    ) : (
                      <Text allowFontScaling={false} style={styles.submitButtonText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </>
          )}
        </Formik>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default TravelMakerCreateScreen;