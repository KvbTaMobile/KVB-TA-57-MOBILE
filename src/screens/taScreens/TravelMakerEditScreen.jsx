import React, {
  useEffect,
  useLayoutEffect,
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
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { Fonts } from "../../styles/Fonts";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import DateTimePicker from "@react-native-community/datetimepicker";
import { moderateScale, verticalScale, horizontalScale } from "../../styles/Metrics";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import FileDisplaySection from "../../TaComponents/cards/FileDisplaySection";
import * as create_styles from "../../styles/StyleSheet";
import {
  useLazyTourDataGetQuery,
  useLazyGetApprovalFlowQuery,
  useLazyEmployeeListQuery,
  useLazyBranchListQuery,
  apiSlice,
} from "../../redux/rtk_query/apiSlice";
import {
  updateField,
  resetForm,
  setIsApprovalFlowLoading,
  setApprovalFlow,
} from "../../redux/slices/travelMakerFormSlice";
import { clearDropdownData } from "../../redux/slices/Dropdowns";
import { getCustomColors } from "../../styles/CustomColors";
import { Environment } from "../../environment/Environment";
import { uploadMultipart } from "../../utilities/upload";
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import { pickDocuments } from "../../utilities/filePicker";

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate()?.toString().padStart(2, "0");
  const month = d.toLocaleString("default", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.0`;
};

const diffInDays = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const startOnly = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const endOnly = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  return Math.round((endOnly - startOnly) / (1000 * 60 * 60 * 24));
};

const isValidId = (v) =>
  v !== undefined && v !== null && v !== "" && v !== "undefined" && v !== "null";

const normalizePerson = (raw) => {
  if (!raw) return null;
  if (typeof raw === "number" || typeof raw === "string") {
    return isValidId(raw) ? { id: raw, code: "", full_name: "" } : null;
  }
  const id = raw.id ?? raw.employee_id ?? raw.emp_id ?? null;
  if (!isValidId(id)) return null;
  return {
    id,
    code: raw.code ?? raw.emp_code ?? "",
    full_name: raw.full_name ?? raw.name ?? raw.employe_name ?? raw.employee_name ?? "",
  };
};

const normalizeBranch = (raw) => {
  if (!raw) return null;
  if (typeof raw === "number" || typeof raw === "string") {
    return isValidId(raw) ? { id: raw, code: "", name: "" } : null;
  }
  const id = raw.id ?? raw.branch_id ?? null;
  if (!isValidId(id)) return null;
  return {
    id,
    code: raw.code ?? raw.branch_code ?? "",
    name: raw.name ?? raw.branch_name ?? "",
  };
};

const TravelMakerEditScreen = ({ route, navigation }) => {
  const tourDataParams = route?.params?.tourDataParams;
  const tour_id = route?.params?.tour_id || tourDataParams?.id;
  const from = route?.params?.from || "MAKER";

  const isMaker = from === "MAKER";

  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const styles = create_styles.create_styles(isDark);

  const [files, setFiles] = useState([]);
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditable, setIsEditable] = useState(true);

  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [dateTargetField, setDateTargetField] = useState(null);
  const [activeDetailIndex, setActiveDetailIndex] = useState(null);

  const [isPermittedByPickerVisible, setIsPermittedByPickerVisible] = useState(false);
  const [permittedByList, setPermittedByList] = useState([]);
  const [isBranchPickerVisible, setIsBranchPickerVisible] = useState(false);
  const [branchList, setBranchList] = useState([]);
  const [isApproverPickerVisible, setIsApproverPickerVisible] = useState(false);
  const [approverList, setApproverList] = useState([]);

  const [triggerApprovalFlow] = useLazyGetApprovalFlowQuery();
  const [triggerTourDataGet, { isLoading: isLoadingTourData, data: tourData }] =
    useLazyTourDataGetQuery();
  const [triggerEmployeeList, { isFetching: isEmpLoading }] = useLazyEmployeeListQuery();
  const [triggerBranchList, { isFetching: isBranchLoading }] = useLazyBranchListQuery();

  const scrollViewRef = useRef(null);

  const authToken = useSelector((s) => s.auth.user?.token);
  const csrfToken = useSelector((s) => s.auth.csrfToken);
  const csrfCookie = useSelector((s) => s.auth.csrfCookie);

  const travelForm = useSelector((state) => state.travelMakerFormSlice);
  const { approvalFlow, isApprovalFlowLoading } = useSelector(
    (state) => state.travelMakerFormSlice
  );

  const modalstyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: CustomColors.backgroundtransparent,
    },
    modalContent: {
      backgroundColor: CustomColors.modal_background,
      borderRadius: moderateScale(15),
      padding: moderateScale(20),
      width: "92%",
      maxHeight: "85%",
      elevation: 10,
    },
    modalHeaderIcon: { alignItems: "flex-end" },
    modalTitle: {
      fontSize: moderateScale(18),
      fontFamily: Fonts.bold,
      color: CustomColors.appThemeColor,
      marginBottom: verticalScale(15),
      textAlign: "center",
    },
    statusBadge: {
      paddingVertical: verticalScale(6),
      paddingHorizontal: horizontalScale(12),
      borderRadius: moderateScale(6),
      marginBottom: verticalScale(8),
      alignItems: "center",
      backgroundColor: CustomColors.appThemeColor,
    },
    statusBadgeText: { fontSize: moderateScale(13), color: CustomColors.white },
    approvalStepCard: {
      backgroundColor: CustomColors.backgroundGray,
      borderRadius: moderateScale(8),
      padding: moderateScale(12),
      marginBottom: verticalScale(10),
      borderWidth: 1,
      borderColor: CustomColors.borderLight,
    },
    cardLabel: {
      fontSize: moderateScale(13),
      fontFamily: Fonts.regular,
      color: CustomColors.textDarkGray,
      marginBottom: verticalScale(4),
    },
    noDataText: {
      fontSize: moderateScale(15),
      color: CustomColors.textGray,
      textAlign: "center",
      marginVertical: 20,
    },
    attachmentBtn: {
      backgroundColor: CustomColors.appThemeColor || "#2e7d32",
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(15),
      borderRadius: moderateScale(8),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginVertical: verticalScale(10),
    },
    attachmentBtnText: {
      color: CustomColors.white,
      fontFamily: Fonts.bold,
      fontSize: moderateScale(14),
      marginLeft: horizontalScale(6),
    },
    pickFileBtn: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(10),
      borderRadius: moderateScale(8),
      alignItems: "center",
      justifyContent: "center",
      marginRight: horizontalScale(6),
    },
    cameraBtn: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: "#2e7d32",
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(10),
      borderRadius: moderateScale(8),
      alignItems: "center",
      justifyContent: "center",
      marginLeft: horizontalScale(6),
    },
    btnText: {
      color: CustomColors.white,
      fontFamily: Fonts.bold,
      fontSize: moderateScale(13),
      marginLeft: horizontalScale(6),
    },
  });

  const HeaderRight = useCallback(
    () => (
      <View style={styles.headerRightContainer}>
        <TouchableOpacity
          onPress={async () => {
            setIsApprovalModalVisible(true);
            dispatch(setApprovalFlow(null));
            dispatch(setIsApprovalFlowLoading(true));
            try {
              const res = await triggerApprovalFlow(tour_id).unwrap();
              dispatch(setApprovalFlow(res?.data || res));
            } catch (e) {
            } finally {
              dispatch(setIsApprovalFlowLoading(false));
            }
          }}
          style={[styles.addIconContainer, { marginLeft: horizontalScale(10) }]}
        >
          <Ionicons name="eye" size={moderateScale(25)} color={CustomColors.white} />
        </TouchableOpacity>
      </View>
    ),
    [tour_id, dispatch, triggerApprovalFlow, CustomColors.white, styles]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "eClaim Tour",
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerShown: true,
      headerTintColor: CustomColors.textWhite,
      headerRight: HeaderRight,
    });
  }, [navigation, HeaderRight, CustomColors.appThemeColor, CustomColors.textWhite]);

  useEffect(() => {
    if (!isValidId(tour_id)) return;

    triggerTourDataGet({ tour_id });

    triggerApprovalFlow(tour_id)
      .unwrap()
      .then((res) => dispatch(setApprovalFlow(res?.data || res)))
      .catch(() => {});

    const fetchDocumentsDirect = async () => {
      try {
        const response = await fetch(
          `${Environment.taServiceUrl}/taserv/fetch_documents/${tour_id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Token ${authToken}`,
              ...(csrfToken && { "X-CSRFToken": csrfToken }),
              ...(csrfCookie && { "X-CSRFCookie": csrfCookie }),
            },
          }
        );
        const res = await response.json();
        if (res) {
          dispatch(
            updateField({
              DocumentData: {
                tour_maker: res?.tour_maker || [],
                tour_approver: res?.tour_approver || [],
                tour_file_count: res?.tour_file_count || 0,
              },
            })
          );
        }
      } catch (e) {
        console.log("Failed to fetch documents directly:", e);
      }
    };

    fetchDocumentsDirect();

    return () => {
      dispatch(resetForm());
      dispatch(clearDropdownData());
    };
  }, [tour_id, dispatch, triggerTourDataGet, triggerApprovalFlow, authToken, csrfToken, csrfCookie]);

  useEffect(() => {
    if (tourData) {
      const tourStatus = tourData.tour_status;
      const canEdit = isMaker && tourStatus !== "APPROVED" && tourStatus !== "REJECTED" && tourStatus == "PENDING";
      setIsEditable(canEdit);

      const parseDateString = (dateString) => {
        if (!dateString) return null;
        const [day, monthStr, year] = dateString.split("-");
        const monthMap = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };
        const month = monthMap[monthStr];
        return month !== undefined ? new Date(year, month, day) : null;
      };

      const startDateISO = parseDateString(tourData.startdate)?.toISOString();
      const endDateISO = parseDateString(tourData.enddate)?.toISOString();

      const permittedByNormalized = normalizePerson(tourData.permitted_by_data) || {
        id: tourData.permittedby_id,
        code: tourData.permittedby_code,
        full_name: tourData.permittedby,
      };

      const approverNormalized = normalizePerson(tourData.approver_data) || {
        id: tourData.approver_branch_data?.id,
        code: tourData.approver_branch_data?.code,
        full_name: tourData.approver_branch_data?.full_name,
      };

      const branchNormalized = normalizeBranch(tourData.branch_data_maker) || {
        id: tourData.empbranchgid,
        code: tourData.branch_code,
        name: tourData.branch_name,
      };

      const payload = {
        id: tourData.id,
        tourNo: tourData.requestno || tourData.id,
        requestDate: parseDateString(tourData.requestdate)?.toISOString() || new Date().toISOString(),
        empName: tourData.employee_name,
        empCode: tourData.employee_code,
        empDesign: tourData.empdesignation,
        empGrade: tourData.empgrade,
        reason: tourData.reason_data || { id: tourData.reason_id, name: tourData.reason },
        startDate: startDateISO,
        endDate: endDateISO,
        durationDays: tourData.durationdays ?? diffInDays(startDateISO, endDateISO),
        remarks: tourData.ordernoremarks,
        permittedby: permittedByNormalized,
        empbranchgid: branchNormalized,
        approval: approverNormalized,
        transfer_on_promotion: tourData.transfer_on_promotion?.toString() || "0",
        quantum_of_funds: tourData.quantum_of_funds,
        opening_balance: tourData.opening_balance,
        debit_branch: tourData.debit_branch,
        details: (tourData.detail || []).map((item) => ({
          ...item,
          detailStartDate: parseDateString(item.startdate)?.toISOString(),
          detailEndDate: parseDateString(item.enddate)?.toISOString(),
          startingpoint: item.startingpoint || "",
          placeofvisit: item.placeofvisit || "",
          purposeofvisit: item.purposeofvisit || "",
        })),
      };
      dispatch(updateField(payload));
    }
  }, [tourData, isMaker, dispatch]);

  const handleOpenPermittedByPicker = async () => {
    if (!isEditable) return;
    setIsPermittedByPickerVisible(true);
    try {
      const result = await dispatch(
        apiSlice.endpoints.searchEmployee.initiate({ query: "", page: 1 })
      ).unwrap();
      setPermittedByList(result?.data || []);
    } catch (e) {}
  };

  const handleOpenBranchPicker = async () => {
    if (!isEditable) return;
    setIsBranchPickerVisible(true);
    try {
      const res = await triggerBranchList({ name: "", page: 1 }).unwrap();
      setBranchList(res?.data || []);
    } catch (e) {}
  };

  const handleOpenApproverPicker = async (branchId) => {
    if (!isEditable) return;
    if (!isValidId(branchId)) {
      ToastMessage("Please select a branch first.");
      return;
    }
    setIsApproverPickerVisible(true);
    try {
      const res = await triggerEmployeeList({ branch: branchId, query: "", page: 1 }).unwrap();
      setApproverList(res?.data || []);
    } catch (e) {}
  };

  const handlePickLocalFiles = async () => {
    try {
      const selectedFiles = await pickDocuments(true);
      if (selectedFiles.length === 0) return;
      setFiles((prev) => [...prev, ...selectedFiles]);
    } catch (err) {
      ToastMessage("Failed to pick files.");
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Camera access is needed.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const newFile = {
          uri: asset.uri,
          name: asset.fileName || `camera_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        };
        setFiles((prev) => [...prev, newFile]);
      }
    } catch (e) {
      ToastMessage("Failed to launch camera.");
    }
  };

  const handleRemoveLocalFile = (uri) => {
    setFiles((prev) => prev.filter((f) => f.uri !== uri));
  };

  const handleConfirmDate = (event, selectedDate, setFieldValue, values) => {
    setIsDatePickerVisible(false);
    if (!selectedDate) return;

    const isoDate = selectedDate.toISOString();

    if (dateTargetField === "startDate") {
      setFieldValue("startDate", isoDate);
      if (values?.endDate) {
        setFieldValue("durationDays", diffInDays(isoDate, values.endDate));
      }
    } else if (dateTargetField === "endDate") {
      setFieldValue("endDate", isoDate);
      if (values?.startDate) {
        setFieldValue("durationDays", diffInDays(values.startDate, isoDate));
      }
    } else if (dateTargetField === "detailStart" && activeDetailIndex !== null) {
      setFieldValue(`details[${activeDetailIndex}].detailStartDate`, isoDate);
    } else if (dateTargetField === "detailEnd" && activeDetailIndex !== null) {
      setFieldValue(`details[${activeDetailIndex}].detailEndDate`, isoDate);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setIsSubmitting(true);
      const reasonId = Number(values.reason?.id || 0);

      const data = {
        id: values.id,
        requestno: values.tourNo ? String(values.tourNo).toUpperCase() : "NEW",
        requestdate: formatDateTime(values.requestDate || new Date()),
        reason: reasonId,
        startdate: formatDateTime(values.startDate),
        enddate: formatDateTime(values.endDate),
        durationdays: Number(values.durationDays || 1),
        ordernoremarks: values.remarks,
        permittedby: Number(values.permittedby?.id || 0),
        approval: Number(values.approval?.id || 0),
        empbranchgid: Number(values.empbranchgid?.id || 0),
        comments: values.comments || "",
        transfer_on_promotion: [6, 7, 8].includes(reasonId) ? Number(values.transfer_on_promotion || 0) : 0,
        quantum_of_funds: reasonId === 2 ? Number(values.quantum_of_funds) : null,
        opening_balance: reasonId === 2 ? Number(values.opening_balance) : null,
        debit_branch: reasonId === 12 ? values.debit_branch?.id || null : null,
        tour_exist: values.isOnGoingTour || values.isHoliday ? 1 : 0,

        detail: (values.details || []).map((item) => ({
          ...(item.id ? { id: item.id } : {}),
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
        ToastMessage("Tour Updated Successfully");
        navigation.goBack();
      } else {
        ToastMessage(response?.description || "Update failed.");
      }
    } catch (error) {
      ToastMessage("Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWebViewFile = async (file) => {
    try {
      const fileExtension = file.file_name.split(".").pop().toLowerCase();
      const downloadUrl = `${Environment.taServiceUrl}/taserv/document_view?doc_option=view&id=${file.id}`;
      const localUri = FileSystem.cacheDirectory + `tempfile.${fileExtension}`;

      const response = await FileSystem.downloadAsync(downloadUrl, localUri, {
        headers: {
          Authorization: `Token ${authToken}`,
          ...(csrfToken && { "X-CSRFToken": csrfToken }),
          ...(csrfCookie && { "X-CSRFCookie": csrfCookie }),
        },
      });
      const fileInfo = await FileSystem.getInfoAsync(response.uri);
      if (!fileInfo.exists || fileInfo.isDirectory) {
        ToastMessage("Error: File not found or is invalid.");
        return;
      }

      const mimeType = "application/octet-stream";
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(response.uri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
          type: mimeType,
        });
      } else {
        await WebBrowser.openBrowserAsync(response.uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load document.");
    }
  };

  const renderDropdownItem = ({ options, onPress, setPickerStatus, selected }) => {
    const isSelected = selected && selected.value === options.value;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress(options);
          setPickerStatus(false);
        }}
        style={{
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: CustomColors.borderLight,
        }}
      >
        <Text style={{ fontSize: moderateScale(14), color: isSelected ? CustomColors.appThemeColor : CustomColors.textDark }}>
          {options.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoadingTourData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={styles.loadingText}>
          Loading Tour Data...
        </Text>
      </View>
    );
  }

  const totalAttachmentCount =
    (travelForm.DocumentData?.tour_maker?.length || 0) + files.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: CustomColors.appScreenColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: CustomColors.appScreenColor }}>
        <Formik enableReinitialize initialValues={travelForm} onSubmit={handleSubmit}>
          {({ values, handleChange, handleSubmit: formikSubmit, setFieldValue }) => (
            <>
              <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" ref={scrollViewRef}>

                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Tour Information</Text>
                  <Text allowFontScaling={false} style={styles.label}>Tour No</Text>
                  <TextInput style={styles.input} value={values.tourNo?.toString()} editable={false} allowFontScaling={false} />
                  <Text allowFontScaling={false} style={styles.label}>Request Date</Text>
                  <TextInput style={styles.input} value={formatDate(values.requestDate)} editable={false} allowFontScaling={false} />
                </View>

                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Employee Details</Text>
                  <Text allowFontScaling={false} style={styles.label}>Employee Name</Text>
                  <TextInput style={styles.input} value={values.empName} editable={false} allowFontScaling={false} />
                  <Text allowFontScaling={false} style={styles.label}>Employee Code</Text>
                  <TextInput style={styles.input} value={values.empCode} editable={false} allowFontScaling={false} />
                  <Text allowFontScaling={false} style={styles.label}>Designation</Text>
                  <TextInput style={styles.input} value={values.empDesign} editable={false} allowFontScaling={false} />
                  <Text allowFontScaling={false} style={styles.label}>Employee Grade</Text>
                  <TextInput style={styles.input} value={values.empGrade} editable={false} allowFontScaling={false} />
                </View>

                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Tour Details</Text>
                  <Text allowFontScaling={false} style={styles.label}>Tour Reason</Text>
                  <TextInput style={styles.input} value={values.reason?.name} editable={false} allowFontScaling={false} />

                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      style={styles.dateColumn}
                      disabled={!isEditable}
                      onPress={() => {
                        setDateTargetField("startDate");
                        setIsDatePickerVisible(true);
                      }}
                    >
                      <Text allowFontScaling={false} style={styles.label}>Tour Start Date</Text>
                      <TextInput style={styles.input} value={formatDate(values.startDate)} editable={false} pointerEvents="none" allowFontScaling={false} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dateColumn}
                      disabled={!isEditable}
                      onPress={() => {
                        setDateTargetField("endDate");
                        setIsDatePickerVisible(true);
                      }}
                    >
                      <Text allowFontScaling={false} style={styles.label}>Tour End Date</Text>
                      <TextInput style={styles.input} value={formatDate(values.endDate)} editable={false} pointerEvents="none" allowFontScaling={false} />
                    </TouchableOpacity>
                  </View>

                  <Text allowFontScaling={false} style={styles.label}>No of Tour Days</Text>
                  <TextInput style={styles.input} value={String(values.durationDays || 0)} editable={false} allowFontScaling={false} />

                  <Text allowFontScaling={false} style={styles.label}>Order No or Remarks</Text>
                  <TextInput
                    style={styles.input}
                    value={values.remarks}
                    onChangeText={handleChange("remarks")}
                    editable={isEditable}
                    allowFontScaling={false}
                  />

                  {/* Permitted By Field */}
                  <Text allowFontScaling={false} style={styles.label}>Permitted By</Text>
                  <TouchableOpacity onPress={handleOpenPermittedByPicker} disabled={!isEditable}>
                    <TextInput
                      style={styles.input}
                      value={
                        values.permittedby?.full_name
                          ? `(${values.permittedby.code || ""}) ${values.permittedby.full_name}`.trim()
                          : ""
                      }
                      editable={false}
                      pointerEvents="none"
                      allowFontScaling={false}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Tour Itinerary Table</Text>
                  {(values.details || []).map((item, index) => (
                    <View key={index} style={{ borderBottomWidth: 1, borderBottomColor: CustomColors.borderLight, paddingBottom: 15, marginBottom: 15 }}>
                      <Text style={[styles.label, { color: CustomColors.appThemeColor }]}>S.No: {index + 1}</Text>

                      <View style={styles.dateRow}>
                        <TouchableOpacity
                          style={styles.dateColumn}
                          disabled={!isEditable}
                          onPress={() => {
                            setDateTargetField("detailStart");
                            setActiveDetailIndex(index);
                            setIsDatePickerVisible(true);
                          }}
                        >
                          <Text allowFontScaling={false} style={styles.label}>Start Date</Text>
                          <TextInput style={styles.input} value={formatDate(item.detailStartDate)} editable={false} pointerEvents="none" allowFontScaling={false} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dateColumn}
                          disabled={!isEditable}
                          onPress={() => {
                            setDateTargetField("detailEnd");
                            setActiveDetailIndex(index);
                            setIsDatePickerVisible(true);
                          }}
                        >
                          <Text allowFontScaling={false} style={styles.label}>End Date</Text>
                          <TextInput style={styles.input} value={formatDate(item.detailEndDate)} editable={false} pointerEvents="none" allowFontScaling={false} />
                        </TouchableOpacity>
                      </View>

                      <Text allowFontScaling={false} style={styles.label}>Starting Point</Text>
                      <TextInput
                        style={styles.input}
                        value={item.startingpoint}
                        onChangeText={(text) => setFieldValue(`details[${index}].startingpoint`, text)}
                        editable={isEditable}
                        allowFontScaling={false}
                      />

                      <Text allowFontScaling={false} style={styles.label}>Place of Visit</Text>
                      <TextInput
                        style={styles.input}
                        value={item.placeofvisit}
                        onChangeText={(text) => setFieldValue(`details[${index}].placeofvisit`, text)}
                        editable={isEditable}
                        allowFontScaling={false}
                      />

                      <Text allowFontScaling={false} style={styles.label}>Purpose of Visit</Text>
                      <TextInput
                        style={styles.input}
                        value={item.purposeofvisit}
                        onChangeText={(text) => setFieldValue(`details[${index}].purposeofvisit`, text)}
                        editable={isEditable}
                        allowFontScaling={false}
                      />
                    </View>
                  ))}
                </View>

                {/* 🔑 FILE UPLOAD & ATTACHMENT SECTION (UPSIDE OF TO APPROVER) */}
                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>Upload Attachments</Text>
                  
                  {isEditable && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: verticalScale(10) }}>
                      <TouchableOpacity style={modalstyles.pickFileBtn} onPress={handlePickLocalFiles}>
                        <Ionicons name="document-attach-outline" size={20} color={CustomColors.white} />
                        <Text style={modalstyles.btnText}> Pick Files</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={modalstyles.cameraBtn} onPress={openCamera}>
                        <Ionicons name="camera-outline" size={20} color={CustomColors.white} />
                        <Text style={modalstyles.btnText}> Camera</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Local Selected Files Display */}
                  {files.length > 0 && (
                    <FileDisplaySection
                      title="Selected Files"
                      files={files}
                      removeFile={handleRemoveLocalFile}
                      isEditable={isEditable}
                    />
                  )}

                  {/* Button to Trigger Full Attachments Modal */}
                {/* Replace paperclip-outline with attach-outline */}
<TouchableOpacity style={modalstyles.attachmentBtn} onPress={() => setIsAttachmentModalVisible(true)}>
  <Ionicons name="attach-outline" size={20} color={CustomColors.white} />
  <Text allowFontScaling={false} style={modalstyles.attachmentBtnText}>
    View All Attachments ({totalAttachmentCount})
  </Text>
</TouchableOpacity>
                </View>

                {/* To Approver Section */}
                <View style={styles.sectionCard}>
                  <Text allowFontScaling={false} style={styles.sectionHeader}>To Approver</Text>

                  <Text allowFontScaling={false} style={styles.label}>Branch</Text>
                  <TouchableOpacity onPress={handleOpenBranchPicker} disabled={!isEditable}>
                    <TextInput
                      style={styles.input}
                      value={
                        values.empbranchgid?.name
                          ? `(${values.empbranchgid.code || ""}) ${values.empbranchgid.name}`.trim()
                          : ""
                      }
                      editable={false}
                      pointerEvents="none"
                      allowFontScaling={false}
                    />
                  </TouchableOpacity>

                  <Text allowFontScaling={false} style={styles.label}>Approver Employee</Text>
                  <TouchableOpacity
                    onPress={() => handleOpenApproverPicker(values.empbranchgid?.id)}
                    disabled={!isEditable || !isValidId(values.empbranchgid?.id)}
                  >
                    <TextInput
                      style={styles.input}
                      value={
                        values.approval?.full_name
                          ? `(${values.approval.code || ""}) ${values.approval.full_name}`.trim()
                          : ""
                      }
                      editable={false}
                      pointerEvents="none"
                      allowFontScaling={false}
                    />
                  </TouchableOpacity>
                </View>

                <View style={{ height: 80 }} />
              </ScrollView>

              <View style={styles.submitButtonContainer}>
                {isMaker && (
                  <TouchableOpacity style={styles.submitButtonFullWidth} onPress={formikSubmit} disabled={isSubmitting || !isEditable}>
                    {isSubmitting ? (
                      <ActivityIndicator color={CustomColors.textWhite} />
                    ) : (
                      <Text allowFontScaling={false} style={styles.submitButtonText}>Update Tour</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {isDatePickerVisible && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(evt, date) => handleConfirmDate(evt, date, setFieldValue, values)}
                />
              )}

              <CustomActionSheetPicker
                pickerStatus={isPermittedByPickerVisible}
                setPickerStatus={setIsPermittedByPickerVisible}
                title="Select Permitted By"
                optionsData={permittedByList.map((emp) => ({
                  label: `(${emp.code}) ${emp.full_name || emp.name}`,
                  value: emp.id,
                  raw: emp,
                }))}
                RenderItem={renderDropdownItem}
                onPress={(selected) => {
                  setFieldValue("permittedby", normalizePerson(selected.raw));
                  setIsPermittedByPickerVisible(false);
                }}
                isLoading={isEmpLoading}
              />

              <CustomActionSheetPicker
                pickerStatus={isBranchPickerVisible}
                setPickerStatus={setIsBranchPickerVisible}
                title="Select Branch"
                optionsData={branchList.map((branch) => ({
                  label: `(${branch.code}) ${branch.name}`,
                  value: branch.id,
                  raw: branch,
                }))}
                RenderItem={renderDropdownItem}
                onPress={(selected) => {
                  setFieldValue("empbranchgid", normalizeBranch(selected.raw));
                  setFieldValue("approval", null);
                  setIsBranchPickerVisible(false);
                }}
                isLoading={isBranchLoading}
              />

              <CustomActionSheetPicker
                pickerStatus={isApproverPickerVisible}
                setPickerStatus={setIsApproverPickerVisible}
                title="Select Approver Employee"
                optionsData={approverList.map((emp) => ({
                  label: `(${emp.code}) ${emp.full_name || emp.name}`,
                  value: emp.id,
                  raw: emp,
                }))}
                RenderItem={renderDropdownItem}
                onPress={(selected) => {
                  setFieldValue("approval", normalizePerson(selected.raw));
                  setIsApproverPickerVisible(false);
                }}
                isLoading={isEmpLoading}
              />
            </>
          )}
        </Formik>
      </SafeAreaView>

      {/* Attachments Popup Modal */}
      <Modal animationType="slide" transparent={true} visible={isAttachmentModalVisible} onRequestClose={() => setIsAttachmentModalVisible(false)}>
        <View style={modalstyles.modalOverlay}>
          <View style={modalstyles.modalContent}>
            <TouchableOpacity onPress={() => setIsAttachmentModalVisible(false)} style={modalstyles.modalHeaderIcon}>
              <MaterialIcons name="close" size={24} color={CustomColors.textRed} />
            </TouchableOpacity>
            <Text allowFontScaling={false} style={modalstyles.modalTitle}>Attachments</Text>

            <ScrollView>
              {files.length > 0 && (
                <FileDisplaySection
                  title="Newly Attached Files"
                  files={files}
                  removeFile={handleRemoveLocalFile}
                  isEditable={isEditable}
                />
              )}

              {(travelForm.DocumentData?.tour_maker || travelForm.DocumentData?.data)?.length > 0 ? (
                <FileDisplaySection
                  title="Tour Maker Attached Files"
                  files={travelForm.DocumentData?.tour_maker || travelForm.DocumentData?.data}
                  handleWebViewFile={handleWebViewFile}
                  isEditable={false}
                />
              ) : (
                <Text allowFontScaling={false} style={modalstyles.noDataText}>No Tour attachments found.</Text>
              )}

              {travelForm.DocumentData?.tour_approver?.length > 0 && (
                <FileDisplaySection
                  title="Tour Approver Attached Files"
                  files={travelForm.DocumentData.tour_approver}
                  handleWebViewFile={handleWebViewFile}
                  isEditable={false}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Approval View Modal */}
      <Modal animationType="slide" transparent={true} visible={isApprovalModalVisible} onRequestClose={() => setIsApprovalModalVisible(false)}>
        <View style={modalstyles.modalOverlay}>
          <View style={modalstyles.modalContent}>
            <TouchableOpacity onPress={() => setIsApprovalModalVisible(false)} style={modalstyles.modalHeaderIcon}>
              <MaterialIcons name="close" size={24} color={CustomColors.textRed} />
            </TouchableOpacity>
            <Text allowFontScaling={false} style={modalstyles.modalTitle}>Approval View</Text>

            {isApprovalFlowLoading ? (
              <ActivityIndicator style={{ padding: 10 }} />
            ) : approvalFlow?.approve && approvalFlow.approve.length > 0 ? (
              <ScrollView>
                {approvalFlow.approve.map((step, index) => (
                  <View key={step.id?.toString() || index.toString()} style={modalstyles.approvalStepCard}>
                    <View style={modalstyles.statusBadge}>
                      <Text allowFontScaling={false} style={modalstyles.statusBadgeText}>
                        {step.apptype} - Level {step.applevel}
                      </Text>
                    </View>
                    <Text allowFontScaling={false} style={modalstyles.cardLabel}>Date: {step.approveddate || "N/A"}</Text>
                    <Text allowFontScaling={false} style={modalstyles.cardLabel}>Approved By: {step.approvedby || "N/A"}</Text>
                    <Text allowFontScaling={false} style={modalstyles.cardLabel}>Comment: {step.appcomment || step.comment || "N/A"}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text allowFontScaling={false} style={modalstyles.noDataText}>No approval flow details available.</Text>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default TravelMakerEditScreen;