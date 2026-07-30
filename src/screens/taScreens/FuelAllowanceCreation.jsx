import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import React, { useLayoutEffect, useState, useEffect, } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Environment } from '../../environment/Environment';
import { uploadMultipart } from "../../utilities/upload";
import { pickDocuments } from "../../utilities/filePicker";
import {
  useGetEmployeeDetailsForFuelQuery,
  useModeOfTravelQuery,
  useGetEligibleAmountMutation,
  useFuelAllowanceCreateMutation,
} from '../../redux/rtk_query/apiSlice';
import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';
import { EvilIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import *as FileSystem from 'expo-file-system';
import *as WebBrowser from 'expo-web-browser';
import *as IntentLauncher from 'expo-intent-launcher';
import { setEmployeeDetails } from '../../redux/slices/EmployeeSlice';
import { useDispatch, useSelector } from 'react-redux';
import { horizontalScale, moderateScale, verticalScale } from '../../styles/Metrics';
import { getCustomColors } from "../../styles/CustomColors";
import * as create_styles from "../../styles/StyleSheet";
import { MaterialIcons } from "@expo/vector-icons";

// --- Helper Components ---

const FileDisplaySection = ({
  title,
  files,
  handleViewFile,
  removeFile,
  isEditable,
  emptyMessage,
  CustomColors
}) => (
  <View>
    <Text allowFontScaling={false} style={{ fontWeight: 'bold', marginVertical: 10, color: CustomColors.textGray }}>{title}</Text>
    {files.length === 0 ? (
      <Text allowFontScaling={false}>{emptyMessage}</Text>
    ) : (
      files.map((file, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => handleViewFile(file)}>
            <Text allowFontScaling={false} style={{ color: CustomColors.textBlue }}>{file.name || file.file_name}</Text>
          </TouchableOpacity>
          {isEditable && (
            <TouchableOpacity
              onPress={() => removeFile(file)}
              style={{ marginLeft: 10, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 5, }}>
              {/* <Text allowFontScaling={false} style={{ color: CustomColors.textRed }}>Remove</Text> */}
              <MaterialIcons name="delete" size={22} color={CustomColors.textRed} />
            </TouchableOpacity>
          )}
        </View>
      ))
    )}
  </View>
);

const FuelAllowanceCreation = ({ route }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [fuelEntries, setFuelEntries] = useState([]);
  const [totalClaimAmount, setTotalClaimAmount] = useState(0);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const employeeInfRedux = useSelector(state => state.employee.employeeDetails);
  const [isModePickerVisible, setModePickerVisible] = useState(false);
  const externalstyles = create_styles.create_styles(isDark);
  const globalStyles = create_styles.styles(isDark);
  const [empinf, setEmpinf] = useState({
    empgrade: '',
    empgid: '',
    empbranchgid: '',
    empdesignation: '',
    remarks: '',
  });

  const [inputRow, setInputRow] = useState({
    from_date: '',
    to_date: '',
    from_place: '',
    to_place: '',
    mode_of_travel: null,
    total_km: '',
    claim_amount: '',
    // claim_amount: 200,

    remarks: '',
  });

  const [files, setFiles] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedModeofTravelObj, setSelectedModeofTravelObj] = useState(null);

  const [parentDate, setParentDate] = useState(() =>
    route.params?.parentDate ? new Date(route.params.parentDate) : new Date()
  );


  const authToken = useSelector((s) => s.auth.user?.token);
  const csrfToken = useSelector((s) => s.auth.csrfToken);
  const csrfCookie = useSelector((s) => s.auth.csrfCookie);
  const {
    data: employeeDetails,
    isLoading: isLoadingEmployeeDetails,
    error: employeeDetailsError,
  } = useGetEmployeeDetailsForFuelQuery();
  const {
    data: modeOfTravelOptions,
    isLoading: isLoadingModeOfTravel,
    error: modeOfTravelError,
  } = useModeOfTravelQuery();
  const [
    getEligibleAmount,
    {
      data: eligibleAmountData,
      error: eligibleAmountError,
      isLoading: isLoadingEligibleAmount,
    },
  ] = useGetEligibleAmountMutation();
  const [
    fuelAllowanceCreate,
    { isLoading: isCreatingFuelAllowance },
  ] = useFuelAllowanceCreateMutation();

  // --- Derived State and Constants ---
  const ccbsPayload = route?.params?.ccbsPayload;
  const childMinDate = new Date(parentDate.getFullYear(), parentDate.getMonth(), 1);
  const childMaxDate = new Date(parentDate.getFullYear(), parentDate.getMonth() + 1, 0);
  const today = new Date();
  const parentMinDate = new Date(today.getFullYear() - 1, 0, 1);
  const parentMaxDate = new Date(today.getFullYear(), today.getMonth(), 0);

  useEffect(() => {
    if (employeeDetails) {
      dispatch(setEmployeeDetails(employeeDetails));
    }
  }, [employeeDetails, dispatch]);

  useEffect(() => {
    if (employeeInfRedux && employeeInfRedux.id) {
      setEmpinf({
        empgrade: employeeInfRedux.grade,
        empgid: employeeInfRedux.id,
        empbranchgid: employeeInfRedux.entity_branch_id,
        empdesignation: employeeInfRedux.designation,
        remarks: '',
      });
    }
  }, [employeeInfRedux]);

  useEffect(() => {
    if (route.params?.inputRowData) {
      const incoming = Array.isArray(route.params.inputRowData[0])
        ? route.params.inputRowData.flat()
        : route.params.inputRowData;

      setFuelEntries(incoming);
    }
  }, [route.params]);


  useEffect(() => {
    if (eligibleAmountData?.eligible_amount) {
      setInputRow(prevState => ({
        ...prevState,
        claim_amount: eligibleAmountData.eligible_amount.toString(),
      }));
    }
  }, [eligibleAmountData]);



  useEffect(() => {
    if (inputRow?.total_km && inputRow?.mode_of_travel && selectedModeofTravelObj?.name) {
      fetchEligibleAmount();
    }
  }, [inputRow?.total_km, inputRow?.mode_of_travel, selectedModeofTravelObj?.name]);
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.appScreenColor,
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(15),
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.appScreenColor,
    },
    errorTextt: {
      color: 'red',
      fontSize: moderateScale(16),
    },
    card: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(20),
      paddingHorizontal: horizontalScale(20),
      marginBottom: verticalScale(20),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    sectionTitle: {
      fontSize: moderateScale(20),
      fontWeight: 'bold',
      marginBottom: verticalScale(15),
      color: CustomColors.textBlack,
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.textGray,
      paddingBottom: verticalScale(10),
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(20),
    },
    avatarContainer: {
      width: moderateScale(80),
      height: moderateScale(80),
      borderRadius: moderateScale(40),
      backgroundColor: CustomColors.backgroundGray,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileName: {
      fontSize: moderateScale(20),
      fontWeight: '700',
      color: CustomColors.textBlack,
    },
    profileCode: {
      fontSize: moderateScale(15),
      color: CustomColors.textDarkGray,
      marginTop: verticalScale(5),
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.textGray,
      paddingBottom: verticalScale(8),
    },
    infoLabel: {
      fontSize: moderateScale(14),
      fontWeight: 'bold',
      color: CustomColors.textGray,
      flex: 1,
    },

    infoLabel1: {
      fontSize: moderateScale(14),
      fontWeight: 'bold',
      color: CustomColors.textGray,
      flex: 1,
      marginBottom: verticalScale(3),
    },
    infoValue: {
      fontSize: moderateScale(14),
      color: CustomColors.textGray,
      flex: 2,
      textAlign: 'right',
    },
    badge: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(5),
      paddingHorizontal: horizontalScale(8),
      paddingVertical: verticalScale(3),
      marginLeft: horizontalScale(10),
    },
    badgeText: {
      fontSize: moderateScale(12),
      color: CustomColors.textBlue,
      fontWeight: 'bold',
    },
    dateRow: {
      justifyContent: 'flex-start',
      marginTop: verticalScale(10),
    },
    inputWrapper: {
      marginBottom: verticalScale(15),
    },
    input: {
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(10),
      fontSize: moderateScale(16),
      backgroundColor: CustomColors.backgroundWhite,
      color: CustomColors.textBlack,
    },
    inputError: {
      borderColor: CustomColors.textRed,
    },
    errorIcon: {
      color: CustomColors.textRed,
      fontSize: moderateScale(12),
      marginTop: verticalScale(5),
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: moderateScale(8),
      marginBottom: verticalScale(15),
      overflow: 'hidden',
      backgroundColor: CustomColors.backgroundWhite
    },
    attachmentSection: {
      marginTop: verticalScale(20),
      borderTopWidth: 1,
      borderTopColor: CustomColors.textDark,
      paddingTop: verticalScale(15),
    },
    attachmentHeader: {
      fontSize: moderateScale(18),
      fontWeight: 'bold',
      marginBottom: verticalScale(10),
      color: CustomColors.textBlack,
    },
    attachmentButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(15),
    },
    pickFileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.textGreen,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(15),
      borderRadius: moderateScale(5),
    },
    buttonText: {
      color: CustomColors.textWhite,
      marginLeft: horizontalScale(5),
      fontWeight: 'bold',
    },
    addButton: {
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      marginTop: verticalScale(5),
      flex: 1,
      marginRight: horizontalScale(10),
    },
    addButtonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(16),
      fontWeight: 'bold',



    },
    addButton1: {
      backgroundColor: CustomColors.textGray,
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      marginTop: verticalScale(8),
      flex: 1,
      marginLeft: horizontalScale(10),
    },
    addButtonText1: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(16),
      fontWeight: 'bold',
    },
    errorText: {
      color: 'red',
      fontSize: moderateScale(12),
      marginBottom: verticalScale(10),
    },
    entryCard: {
      backgroundColor: CustomColors.backgroundGray,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(15),
      marginBottom: verticalScale(10),
      borderLeftWidth: 5,
      borderLeftColor: CustomColors.primaryBlue
    },
    deleteButton: {
      backgroundColor: CustomColors.backgroundRed,
      paddingVertical: verticalScale(8),
      paddingHorizontal: horizontalScale(8),
      borderRadius: moderateScale(5),
      alignSelf: 'flex-end',
      marginTop: verticalScale(10),
    },
    deleteButtonText: {
      color: CustomColors.textWhite,
      fontWeight: 'bold',
    },

    entryCard: {
      backgroundColor: CustomColors.backgroundWhite,
      padding: moderateScale(16),
      marginBottom: verticalScale(12),
      marginTop: verticalScale(12),
      borderRadius: moderateScale(12),
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    entryTitle: {
      fontSize: moderateScale(18),
      fontWeight: '700',
      color: CustomColors.textDarkGray,
      marginBottom: verticalScale(4),
    },
    entryDates: {
      fontSize: moderateScale(14),
      color: CustomColors.textGray,
      marginBottom: verticalScale(8),
    },
    entryDetails: {
      fontSize: moderateScale(14),
      color: CustomColors.textDarkGray,
      marginBottom: verticalScale(4),
    },
    entryAmount: {
      fontSize: moderateScale(16),
      fontWeight: '600',
      color: CustomColors.textGreen,
    },
  });
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,

      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },

      headerTitle: () => (
        <Text
          allowFontScaling={false}
          style={{
            ...globalStyles.headerTitle,
            fontSize: moderateScale(20),
            fontWeight: "600",
            color: CustomColors.textWhite,
          }}
        >
          Fuel Allowance Creation
        </Text>
      ),

      headerTintColor: CustomColors.textWhite,
    });
  }, [navigation, isDark]);


  const formatDate = date => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const RenderDropdownItem = ({
    options,
    onPress,
    setPickerStatus,
    selected,
  }) => {
    const isSelected = selected && selected.value === options.value;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress(options);
          setPickerStatus(false);
        }}
        style={[
          externalstyles.actionSheetOption,
          isSelected && externalstyles.actionSheetOptionSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Select ${options.label}`} // Corrected typo
      >
        <Text
          allowFontScaling={false}
          style={[
            externalstyles.actionSheetOptionText,
            isSelected && externalstyles.actionSheetOptionTextSelected,
          ]}
        >
          {typeof options.label === "string"
            ? options.label
            : String(options.label)}
        </Text>
      </TouchableOpacity>
    );
  };
  const handleDateChange = (event, selectedDate, type) => {
    setShowPicker(false);
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      if (type === 'from') {
        setInputRow({ ...inputRow, from_date: formattedDate });
      } else if (type === 'to') {
        setInputRow({ ...inputRow, to_date: formattedDate });
      } else if (type === 'parent') {
        setParentDate(selectedDate);
      }
    }
  };

  const validateDates = () => {
    const { from_date, to_date } = inputRow;
    if (from_date && to_date) {
      const fromDateObj = new Date(from_date);
      const toDateObj = new Date(to_date);

      if (toDateObj < fromDateObj) {
        setErrors(prevState => ({
          ...prevState,
          date: 'To date must be greater than From date',
        }));
        return false;
      } else {
        setErrors(prevState => ({
          ...prevState,
          date: null,
        }));
        return true;
      }
    }
    return true;
  };

  const validateInputRow = () => {
    const newErrors = {};

    if (!inputRow.from_date) newErrors.from_date = true;
    if (!inputRow.to_date) newErrors.to_date = true;
    if (!inputRow.from_place.trim()) newErrors.from_place = true;
    if (!inputRow.to_place.trim()) newErrors.to_place = true;
    if (!inputRow.mode_of_travel) newErrors.mode_of_travel = true;
    if (
      !inputRow.total_km ||
      isNaN(inputRow.total_km) ||
      parseFloat(inputRow.total_km) <= 0
    )
      newErrors.total_km = true;
    if (
      !inputRow.claim_amount ||
      isNaN(inputRow.claim_amount) ||
      parseFloat(inputRow.claim_amount) <= 0
    )
      newErrors.claim_amount = true;

    if (!validateDates()) newErrors.date = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchEligibleAmount = async () => {
    try {
      await getEligibleAmount({
        mode_of_travel: selectedModeofTravelObj?.name,
        total_km: inputRow?.total_km.toString(),
        emp_category: employeeDetails?.emp_category?.id?.toString() || '1',
        hierarchy_id: 1, // Assuming fixed hierarchy_id
      });
    } catch (err) {
      console.error('Error fetching eligible amount:', err);
    }
  };

  const getMimeType = filename => {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    return types[ext] || 'application/octet-stream';
  };

const pickFiles = async () => {
  const selectedFiles = await pickDocuments(true);

  if (selectedFiles.length) {
    setFiles(prev => [...prev, ...selectedFiles]);
  }
};
const takePhoto = async () => {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission denied', 'Camera access is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];

      const file = {
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: asset.fileSize || 0,
      };

      setFiles((prev) => [...prev, file]);
    }
  } catch (error) {
    console.log('Camera Error:', error);
    Alert.alert('Error', 'Failed to capture photo.');
  }
};

  const handleViewFile = async file => {
    try {
      const info = await FileSystem.getInfoAsync(file.uri);
      if (!info.exists) {
        Alert.alert('File not found');
        return;
      }

      const mimeType = getMimeType(file.name || file.file_name);
      const uri =
        Platform.OS === 'android'
          ? await FileSystem.getContentUriAsync(file.uri)
          : file.uri;

      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: uri,
          flags: 1,
          type: mimeType,
        });
      } else {
        await WebBrowser.openBrowserAsync(uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to open file.');
    }
  };

  const removeFile = fileToRemove => {
    Alert.alert('Remove File', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setFiles(prev => prev.filter(file => file.uri !== fileToRemove.uri));
        },
      },
    ]);
  };

const handleSubmitFuelAllowance = async () => {
  // ---------- VALIDATION ----------
  if (validateInputRow()) {
    ToastAndroid.show(
      'Please fill all required fields correctly.',
      ToastAndroid.SHORT
    );
    return;
  }

  if (!ccbsPayload) {
    ToastAndroid.show('Please add CCBS', ToastAndroid.SHORT);
    return;
  }

  // ---------- PAYLOAD ----------
  const payload = {
    data: {
      empgid: empinf.empgid,
      empgrade: empinf.empgrade || null,
      empdesignation: empinf.empdesignation,
      empbranchgid: empinf.empbranchgid,
      remarks: empinf.remarks || '',
    },
    month: parentDate.getMonth() + 1,
    year: parentDate.getFullYear(),
    fuel_data: Array.isArray(fuelEntries[0])
      ? fuelEntries.flat()
      : fuelEntries,
    ccbs: ccbsPayload?.ccbs || [],
    file_required: files.length > 0 ? 1 : 0,
  };

  try {
    console.log('========================');
    console.log('FUEL PAYLOAD:', JSON.stringify(payload, null, 2));
    console.log('FILES COUNT:', files.length);

    if (files.length > 0) {
      console.log('FILE INFO:', {
        name: files[0].name,
        uri: files[0].uri,
        type: files[0].type,
        size: files[0].size,
      });
    }

    // ---------- UPLOAD ----------
    const res = await uploadMultipart({
      url: `${Environment.taServiceUrl}/taserv/fuel_allowance_create`,
      data: payload,
      files,
      headers: {
        Authorization: `Token ${authToken}`,
        ...(csrfToken && { "X-CSRFToken": csrfToken }),
        ...(csrfCookie && { "X-CSRFCookie": csrfCookie }),
      },
    });

    console.log('UPLOAD RESPONSE:', res);
    console.log('========================');

    // ---------- SUCCESS ----------
    if (
      res?.status === 'success' ||
      res?.message?.toLowerCase().includes('success')
    ) {
      setInputRow({
        from_date: '',
        to_date: '',
        from_place: '',
        to_place: '',
        mode_of_travel: null,
        total_km: '',
        claim_amount: '',
        remarks: '',
      });

      setFuelEntries([]);
      setFiles([]);
      setSelectedModeofTravelObj(null);
      setTotalClaimAmount(0);

      ToastAndroid.show(
        'Fuel allowance created successfully',
        ToastAndroid.SHORT
      );

      navigation.goBack();
    } else {
      Alert.alert(
        'Submission Failed',
        res?.description ||
          res?.message ||
          'Something went wrong'
      );
      console.log("description=>", res?.description || res?.message)
    }
  } catch (error) {
    console.log('========================');
    console.log('FUEL UPLOAD ERROR:', error);
    console.log('ERROR MESSAGE:', error?.message);
    console.log('========================');

    let message = 'Submission failed. Please try again.';

    if (error?.message?.includes('HTTP 500')) {
      message = 'HTTP 500 Internal Server error';
    } else if (error?.message?.includes('HTTP 413')) {
      message = 'File is too large.';
    } else if (error?.message) {
      message = error.message;
    }

    Alert.alert('Failed', message);
  }
};


  if (isLoadingEmployeeDetails || isLoadingModeOfTravel) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={{ color: CustomColors.textBlack }}> Loading details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>Employee Profile</Text>

        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons
              name="account-circle"
              size={70}
              color={CustomColors.textBlack}
            />
          </View>
          <View style={{ marginLeft: 20, flex: 1 }}>
            <Text allowFontScaling={false} style={styles.profileName}>{employeeInfRedux?.full_name}</Text>
            <Text allowFontScaling={false} style={styles.profileCode}>
              ID: <Text allowFontScaling={false} style={{ color: CustomColors.textBlue, fontWeight: '600' }}>{employeeInfRedux?.code}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text allowFontScaling={false} style={styles.infoLabel}>Branch and Code</Text>
          <View style={styles.badge}>
            <Text allowFontScaling={false} style={styles.badgeText}>
              {employeeInfRedux?.employee_branch_code}
            </Text>
          </View>
          <Text allowFontScaling={false} style={styles.infoValue}>
            {employeeInfRedux?.employee_branch_name}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text allowFontScaling={false} style={styles.infoLabel}>Functional Head</Text>
          <Text allowFontScaling={false} style={styles.infoValue}>
            {employeeInfRedux?.functionalhead?.code} -{' '}
            {employeeInfRedux?.functionalhead?.full_name}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text allowFontScaling={false} style={styles.infoLabel}>RM</Text>
          <Text allowFontScaling={false} style={styles.infoValue}>
            {employeeInfRedux?.rm?.code} - {employeeInfRedux?.rm?.full_name}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text allowFontScaling={false} style={styles.infoLabel}>Regional Manager</Text>
          <Text allowFontScaling={false} style={styles.infoValue}>
            {employeeInfRedux?.reg_zon_mag?.code} -{' '}
            {employeeInfRedux?.reg_zon_mag?.full_name}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text allowFontScaling={false} style={styles.infoLabel}>Designation</Text>
          <Text allowFontScaling={false} style={styles.infoValue}>{employeeInfRedux?.designation}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text allowFontScaling={false} style={styles.infoLabel}>Req Date</Text>
          <Text allowFontScaling={false} style={styles.infoValue}>
            {new Date().toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text allowFontScaling={false} style={styles.infoLabel}>Remarks</Text>
          <TextInput allowFontScaling={false}
            style={styles.infoValue}
            placeholder="Enter remark"
            placeholderTextColor={CustomColors.textGray}
            value={empinf.remarks}
            onChangeText={text =>
              setEmpinf(prev => ({
                ...prev,
                remarks: text,
              }))
            }
          />
        </View>

        <View style={[styles.infoRow, styles.dateRow]}>
          <TouchableOpacity
            onPress={() => setShowPicker('parent')}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <EvilIcons name="calendar" size={22} color={CustomColors.textBlue} />
            <Text allowFontScaling={false} style={{ marginLeft: 10, color: CustomColors.textGray }} color={CustomColors.textBlue} >
              {parentDate.toDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {showPicker === 'parent' && (
          <DateTimePicker
            value={parentDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) =>
              handleDateChange(event, selectedDate, 'parent')
            }
            maximumDate={parentMaxDate}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>Travel Details</Text>

        <Text allowFontScaling={false} style={styles.infoLabel}>From Date</Text>
        <View style={[styles.input, { marginBottom: 10, paddingVertical: verticalScale(12) }]}>
          <TouchableOpacity
            onPress={() => setShowPicker('from')}
            style={{ flexDirection: 'row', alignItems: 'center' }}>
            <EvilIcons name="calendar" size={22} color={CustomColors.appThemeColor} />
            <Text allowFontScaling={false} style={{ marginLeft: 10, color: CustomColors.textGray }} color={CustomColors.textBlue} >

              {inputRow.from_date
                ? new Date(inputRow.from_date).toDateString()
                : 'Select Date'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text allowFontScaling={false} style={styles.infoLabel1}>To Date</Text>
        <View style={[styles.input, { marginBottom: 10, paddingVertical: verticalScale(12) }]}>
          <TouchableOpacity
            onPress={() => setShowPicker('to')}
            style={{ flexDirection: 'row', alignItems: 'center' }}>
            <EvilIcons name="calendar" size={22} color={CustomColors.appThemeColor} />
            <Text allowFontScaling={false} style={{ marginLeft: 10, color: CustomColors.textGray }} color={CustomColors.textBlue} >

              {inputRow.to_date
                ? new Date(inputRow.to_date).toDateString()
                : 'Select Date'}
            </Text>
          </TouchableOpacity>
        </View>

        {errors.date && <Text allowFontScaling={false} style={styles.errorText}>{errors.date}</Text>}

        {showPicker === 'from' && (
          <DateTimePicker
            value={inputRow.from_date ? new Date(inputRow.from_date) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) =>
              handleDateChange(event, selectedDate, 'from')
            }
            minimumDate={childMinDate}
            maximumDate={childMaxDate}
          />
        )}

        {showPicker === 'to' && (
          <DateTimePicker
            value={inputRow.to_date ? new Date(inputRow.to_date) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) =>
              handleDateChange(event, selectedDate, 'to')
            }
            minimumDate={new Date(inputRow.from_date)}
            maximumDate={childMaxDate}
          />
        )}

        <Text allowFontScaling={false} style={styles.infoLabel}>From Place</Text>
        <View style={styles.inputWrapper}>
          <TextInput allowFontScaling={false}
            style={[styles.input, errors.from_place && styles.inputError]}
            placeholder="Enter From Place"
            placeholderTextColor={CustomColors.textGray}
            value={inputRow.from_place}
            onChangeText={text => {
              setInputRow({ ...inputRow, from_place: text });
              if (errors.from_place) setErrors({ ...errors, from_place: false });
            }}
          />
          {errors.from_place && <Text allowFontScaling={false} style={styles.errorIcon}>!</Text>}
        </View>

        <Text allowFontScaling={false} style={styles.infoLabel}>To Place</Text>
        <View style={styles.inputWrapper}>
          <TextInput allowFontScaling={false}
            style={[styles.input, errors.to_place && styles.inputError]}
            placeholder="Enter To Place"
            placeholderTextColor={CustomColors.textGray}
            value={inputRow.to_place}
            onChangeText={text => {
              setInputRow({ ...inputRow, to_place: text });
              if (errors.to_place) setErrors({ ...errors, to_place: false });
            }}
          />
          {errors.to_place && <Text allowFontScaling={false} style={styles.errorIcon}>!</Text>}
        </View>
        <Text allowFontScaling={false} style={styles.infoLabel}>
          Mode of Travel
        </Text>
        <TouchableOpacity
          style={[
            externalstyles.pickerInput,
            errors.mode_of_travel && externalstyles.errorBorder,

          ]}
          onPress={() => setModePickerVisible(true)}

        >
          <Text
            style={[
              externalstyles.pickerInputText,
              !selectedModeofTravelObj && { color: CustomColors.textGray }, // placeholder color
            ]}
          >
            {selectedModeofTravelObj?.name || "Select Mode"}
          </Text>

          <Ionicons
            name="chevron-down"
            size={20}
            color={CustomColors.mediumGray}
            style={externalstyles.pickerIcon}
          />
        </TouchableOpacity>


        {isModePickerVisible && modeOfTravelOptions?.length > 0 && (
          <CustomActionSheetPicker
            pickerStatus={isModePickerVisible}
            setPickerStatus={setModePickerVisible}
            title="Select Mode of Travel"
            optionsData={modeOfTravelOptions.map(item => ({
              label: String(item.name),
              value: item.id,
            }))}
            RenderItem={RenderDropdownItem}
            onPress={(selectedOption) => {
              const selectedItem = modeOfTravelOptions.find(
                item => item.id === selectedOption.value
              );

              setSelectedModeofTravelObj(selectedItem);

              setInputRow({
                ...inputRow,
                mode_of_travel: selectedItem ? selectedItem.id : '',
              });

              if (errors.mode_of_travel) {
                setErrors(prev => ({ ...prev, mode_of_travel: false }));
              }

              setModePickerVisible(false);
            }}
            selected={
              selectedModeofTravelObj
                ? {
                  label: selectedModeofTravelObj.name,
                  value: selectedModeofTravelObj.id,
                }
                : null
            }
            isLoading={false}
          />
        )}


        {/* <Text allowFontScaling={false} style={styles.infoLabel}>Mode of Travel</Text>
        <View
          style={[
            styles.pickerContainer,
            errors.mode_of_travel && styles.inputError,
          ]}>
          <Picker
            mode="dropdown"
            selectedValue={selectedModeofTravelObj?.id || ''}
            onValueChange={itemValue => {
              const selectedItem = modeOfTravelOptions?.find(
                item => item.id === itemValue,
              );

              setSelectedModeofTravelObj(selectedItem);
              setInputRow({
                ...inputRow,
                mode_of_travel: selectedItem ? selectedItem.id : '',
              });
              if (errors.mode_of_travel)
                setErrors({ ...errors, mode_of_travel: false });
            }}>
            <Picker.Item label="Select Mode" value="" />
            {modeOfTravelOptions?.map(item => (
              <Picker.Item key={item.id} label={item.name}  value={item.id} />
            ))}
          </Picker>
        </View> */}

        {errors.mode_of_travel && <Text allowFontScaling={false} style={styles.errorIcon}>!</Text>}

        <Text allowFontScaling={false} style={styles.infoLabel}>Total KM</Text>
        <View style={styles.inputWrapper}>
          <TextInput allowFontScaling={false}
            style={[styles.input, errors.total_km && styles.inputError]}
            placeholder="Enter Total KM"
            placeholderTextColor={CustomColors.textGray}
            keyboardType="numeric"
            value={inputRow.total_km}
            onChangeText={text => {
              setInputRow({ ...inputRow, total_km: text });
              if (errors.total_km) setErrors({ ...errors, total_km: false });
            }}
          />
          {errors.total_km && <Text allowFontScaling={false} style={styles.errorIcon}>!</Text>}
        </View>

        <Text allowFontScaling={false} style={styles.infoLabel}>Claim Amount</Text>
        <View style={styles.inputWrapper}>
          <TextInput allowFontScaling={false}
            style={[styles.input, errors.claim_amount && styles.inputError]}
            placeholder="Claim Amount"
            placeholderTextColor={CustomColors.textGray}
            keyboardType="numeric"
            value={inputRow.claim_amount}
            editable={false}
          />
          {errors.claim_amount && <Text allowFontScaling={false} style={styles.errorIcon}>!</Text>}
        </View>

        <Text allowFontScaling={false} style={styles.infoLabel}>Remarks</Text>
        <View style={styles.inputWrapper}>
          <TextInput allowFontScaling={false}
            style={styles.input}
            placeholder="Enter Remarks"
            placeholderTextColor={CustomColors.textGray}
            value={inputRow.remarks}
            onChangeText={text => setInputRow({ ...inputRow, remarks: text })}
          />
        </View>



        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (validateInputRow()) {
              const numericClaim = parseFloat(inputRow.claim_amount || '0');

              setFuelEntries(prevEntries => {
                const newEntries = [...prevEntries, inputRow];

                const newTotal = newEntries.reduce((sum, entry) => {
                  return sum + parseFloat(entry.claim_amount || 0);
                }, 0);

                setTotalClaimAmount(newTotal);

                return newEntries;
              });

              setInputRow({
                from_date: '',
                to_date: '',
                from_place: '',
                to_place: '',
                mode_of_travel: null,
                total_km: '',
                claim_amount: '',
                remarks: '',
              });
              setSelectedModeofTravelObj(null);
              ToastAndroid.show('Trip added to list.', ToastAndroid.SHORT);
            }
          }}

        >
          <Text allowFontScaling={false} style={styles.addButtonText}>Add Another Trip</Text>
        </TouchableOpacity>

        {fuelEntries.map((entry, idx) => (
          <View key={idx} style={styles.entryCard}>
            <Text allowFontScaling={false} style={styles.entryTitle}>Trip {idx + 1}</Text>
            <Text allowFontScaling={false} style={styles.entryDates}>
              {entry.from_date} → {entry.to_date}
            </Text>
            <Text allowFontScaling={false} style={styles.entryDetails}>
              Distance: {entry.total_km} km
            </Text>
            <Text allowFontScaling={false} style={styles.entryAmount}>Claim: ₹{entry.claim_amount}</Text>
          </View>
        ))}


        <View style={styles.attachmentSection}>
          <Text allowFontScaling={false} style={styles.attachmentHeader}>Attachments</Text>

          <View style={styles.attachmentButtonsContainer}>
            <TouchableOpacity onPress={pickFiles} style={styles.pickFileButton}>
              <Ionicons name="folder" size={20} color={CustomColors.iconWhite} />
              <Text allowFontScaling={false} style={styles.buttonText}> Pick Files</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={takePhoto} style={styles.pickFileButton}>
              <Ionicons name="camera" size={20} color={CustomColors.iconWhite} />
              <Text allowFontScaling={false} style={styles.buttonText}> Take Photo</Text>
            </TouchableOpacity>
          </View>

          {files.length > 0 && (
            <FileDisplaySection
              title="Selected Files"
              files={files}
              handleViewFile={handleViewFile}
              removeFile={removeFile}
              isEditable={true}
              emptyMessage="No new files selected."
              CustomColors={CustomColors}
            />)
          }
        </View>



        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleSubmitFuelAllowance}
            disabled={isCreatingFuelAllowance}>
            <Text allowFontScaling={false} style={styles.addButtonText}>
              {isCreatingFuelAllowance ? 'Submitting...' : 'Submit Claim'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (parseFloat(totalClaimAmount) > 0) {
                navigation.navigate('ccbs', {
                  data: totalClaimAmount,
                  inputRowData: fuelEntries,
                  empinfData: empinf,
                  filesData: files,
                  parentDate: parentDate.toISOString(),
                });
              } else {
                ToastAndroid.show(
                  'Claim amount must be greater than 0 to add CCBS.',
                  ToastAndroid.SHORT,
                );
              }
            }}
            style={styles.addButton1}>
            <Text allowFontScaling={false} style={styles.addButtonText1}>Add CCBS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default FuelAllowanceCreation;



