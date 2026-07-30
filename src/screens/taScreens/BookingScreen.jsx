import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Platform, StyleSheet, KeyboardAvoidingView, Modal, Alert
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'; // Import for Android
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { setCommonDropDownList } from '../../redux/slices/Dropdowns';
import { useDispatch, useSelector } from 'react-redux';

import { getCustomColors } from '../../styles/CustomColors';
import { horizontalScale, verticalScale, moderateScale } from '../../styles/Metrics';
// Import the create_styles as baseStyles and then extend it
import { create_styles as baseStyles, styles as header_styles } from '../../styles/StyleSheet';
import * as styless from "../../styles/StyleSheet";
import { useFocusEffect } from "@react-navigation/native";
import { useLazyBookingDetailsQuery, useAccBookingMutation, useCabBookingMutation, useAirBookingMutation, useBusBookingMutation, useTrainBookingMutation, useLazyCommonDropDownGetQuery, useLazyTourDataGetQuery } from "../../redux/rtk_query/apiSlice"
import { WebView } from 'react-native-webview';
import FileDisplaySection from "../../TaComponents/cards/FileDisplaySection";
import * as WebBrowser from "expo-web-browser";
// import * as FileSystem from "expo-file-system/legacy";

import * as IntentLauncher from "expo-intent-launcher";
import ToastMessage from '../../TaComponents/toast/ToastMessage';
import CustomActionSheetPicker from "../../TaComponents/pickers/ActionSheetPicker";
import { uploadMultipart } from '../../utilities/upload';
import { pickDocuments } from '../../utilities/filePicker';
import { Environment } from '../../environment/Environment';
const DROPDOWN_KEYS = {
  admin_paid: 'yn',
  room_type: 'accommondation_type',
  mode_of_payment: 'acc_payment',
  travel_type_cab_value: 'cab_type',
  cab_segment: 'cab_dropdown',
  class_of_travel_bus: 'bus_class',
  class_of_travel_train: 'train_class',
  train_quota: 'train_quota',
};

const getRequiredFieldsByType = (type) => {
  switch (type) {
    case 1: // Accommodation
      return [
        'admin_paid',
        'booking_date',
        'file',
        'checkin_time',
        'checkout_time',
        'place_of_stay',
        'room_type',
        'no_of_nights',
        'ticket_amount',
        'mode_of_payment',
      ];

    case 2: // Cab
      return [
        'admin_paid',
        'booking_date',
        'from_time',
        'from_place',
        'to_place',
        'ticket_amount',
      ];

    case 3: // Bus
      return [
        'admin_paid',
        'booking_date',
        'file',
        'from_time',
        'from_place',
        'to_place',
        'ticket_amount',
        'class_of_travel_bus',
      ];

    case 4: // Train
      return [
        'admin_paid',
        'booking_date',
        'file',
        'from_time',
        'from_place',
        'to_place',
        'ticket_amount',
        'class_of_travel_train',
        'train_quota',
      ];

    case 5: // Flight
      return [
        'admin_paid',
        'booking_date',
        'file',
        'from_time',
        'from_place',
        'to_place',
        'ticket_no',
        'vendor_name',
        'PNR',
        'ticket_amount',
      ];

    default:
      return [];
  }
};


const BookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  const create_styles = styless.create_styles(isDark)
  const { requirementType, requirementData, minDate: minDateString, maxDate: maxDateString, key, index, setFieldValue } = route.params;
  const minDate = minDateString ? new Date(minDateString) : null;
  const maxDate = maxDateString ? new Date(maxDateString) : null;
  const { user, token,} = useSelector(state => state.auth);


  const authToken = useSelector((s) => s.auth.user?.token);
   const csrfToken = useSelector((s) => s.auth.csrfToken);
   const csrfCookie = useSelector((s) => s.auth.csrfCookie);

  const [form, setForm] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);
  const [showViaWeb, setShowViaWeb] = useState(false);
  const [errors, setErrors] = useState({});
  const [pickerField, setPickerField] = useState(null);
  const [pickerOptions, setPickerOptions] = useState([]);
  const [adminPaidOptions, setAdminPaidOptions] = useState([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState([]);
  const [modeOfPaymentOptions, setModeOfPaymentOptions] = useState([]);
  const [showAdminPaid, setShowAdminPaid] = useState(false);
  const [showRoomType, setShowRoomType] = useState(false);
  const [showModeOfPayment, setShowModeOfPayment] = useState(false);
  // Cab / Travel dropdown visibility
  const [showCabType, setShowCabType] = useState(false);
  const [showCabSegment, setShowCabSegment] = useState(false);
  const [showTrainQuota, setShowTrainQuota] = useState(false);

  const [cabTypeOptions, setcabTypeOptions] = useState([]);
  const [cabSegmentOptions, setcabSegmentOptions] = useState([]);
  const [trainQuotaOptions, settrainQuotaOptions] = useState([]);

  // ✅ Separate visibility
  const [showBusClass, setShowBusClass] = useState(false);
  const [showTrainClass, setShowTrainClass] = useState(false);

  // ✅ Separate options
  const [busClassOptions, setBusClassOptions] = useState([]);
  const [trainClassOptions, setTrainClassOptions] = useState([]);

  // console.log("hiii", common?.cab_dropdown)
  const dispatch = useDispatch();
  const { common } = useSelector(
    (state) => state.Dropdowns
  );
  // console.log('common', common)
  const [triggerBookingDetails, { data: bookingDetailsdata, isLoading: isLoadingBookingDetails, error: bookingDetailsError }] =
    useLazyBookingDetailsQuery();

  const [triggerAccBooking, { data: accBookingdata, isLoading: isLoadingAccBooking, error: accBookingError }] =
    useAccBookingMutation();

  const [triggerCabBooking, { data: cabBookingdata, isLoading: isLoadingCabBooking, error: cabBookingError }] =
    useCabBookingMutation();

  const [triggerAirBooking, { data: airBookingdata, isLoading: isLoadingAirBooking, error: airBookingError }] =
    useAirBookingMutation();

  const [triggerBusBooking, { data: busBookingdata, isLoading: isLoadingBusBooking, error: busBookingError }] =
    useBusBookingMutation();

  const [triggerTrainBooking, { data: trainBookingdata, isLoading: isLoadingTrainBooking, error: trainBookingError }] =
    useTrainBookingMutation();
  const [
    triggerTourDataGet,
    {
      isLoading: isLoadingTourData,
      isFetching: isFetchingTourData,
      data: tourData,
    },
  ] = useLazyTourDataGetQuery();

  const [triggerCommonDropDown, { data: dropdownData, isLoading: isLoadingDropdown, isFetching: isFetchingDropdown }] = useLazyCommonDropDownGetQuery();
  // console.log("dropdownData", dropdownData)
  const styles = StyleSheet.create({
    ...baseStyles, // Spread existing styles
    screenContainer: {
      flex: 1,
      backgroundColor: CustomColors.backgroundWhite,
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingHorizontal: horizontalScale(16),
      paddingBottom: verticalScale(100), // Add padding for the fixed footer
    },
    formSection: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(16),
      padding: moderateScale(20),
      marginBottom: verticalScale(20),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(4) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(6),
      elevation: moderateScale(5),
      borderWidth: moderateScale(1),
      borderColor: CustomColors.lightGray,
    },
    fixedFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: CustomColors.backgroundWhite,
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(15),
      borderTopWidth: moderateScale(1),
      borderTopColor: CustomColors.lightGray,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 10,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: verticalScale(14),
      borderRadius: moderateScale(12),
      marginHorizontal: horizontalScale(5),
    },
    saveButton: {
      backgroundColor: CustomColors.appThemeColor,
    },
    cancelButton: {
      backgroundColor: CustomColors.textGray,
    },
    actionButtonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(18),
      fontWeight: 'bold',
      marginLeft: horizontalScale(8),
    },

    checkerButtonsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: moderateScale(10),
      width: '100%',
    },
    webContainer: {
      flex: 1,
    },
  });
 useFocusEffect(
  useCallback(() => {
    navigation.setOptions({
      headerShown: true,

      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },

      headerTintColor: CustomColors.White,

      // ✅ allowFontScaling applied
      headerTitle: () => (
        <Text
          allowFontScaling={false}
          style={{
            ...globalStyles.headerTitle,
            fontSize: moderateScale(20),
            fontWeight: "600",
            color: CustomColors.White,
          }}
        >
          Booking Screen
        </Text>
      ),

      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowViaWeb(true)}
          style={{ marginRight: 16 }}
        >
          <Ionicons
            name="globe-outline"
            size={24}
            color={CustomColors.iconWhite}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isDark])
);

  // 1️⃣ LOAD DROPDOWNS BASED ON REQUIREMENT TYPE
  useEffect(() => {
    if (!requirementType) return;

    // console.log('📌 Requirement Type:', requirementType);

    const dropdownsToLoad = [];

    if (requirementType === 1) {
      dropdownsToLoad.push('admin_paid', 'room_type', 'mode_of_payment');
    }

    if (requirementType === 2) {
      dropdownsToLoad.push('admin_paid', 'travel_type_cab_value', 'cab_segment');
    }

    if (requirementType === 3) {
      dropdownsToLoad.push('admin_paid', 'class_of_travel_bus');
    }

    if (requirementType === 4) {
      dropdownsToLoad.push('admin_paid', 'class_of_travel_train', 'train_quota');
    }

    // console.log('⬇️ Dropdowns to load:', dropdownsToLoad);

    dropdownsToLoad.forEach(field => {
      const apiKey = DROPDOWN_KEYS[field];

      if (apiKey && !common?.[field]) {
        // console.log(`📡 Fetching dropdown → ${field}`);

        triggerCommonDropDown(apiKey)
          .unwrap()
          .then(res => {
            // console.log(`✅ Dropdown loaded → ${field}`, res);
            dispatch(setCommonDropDownList({ [field]: res }));
          })
          .catch(err => {
            // console.log(`❌ Dropdown failed → ${field}`, err);
          });
      }
    });
  }, [requirementType]);
  useEffect(() => {
    if (!common) return;

    // ✅ Admin Paid
    if (common.admin_paid) {
      setAdminPaidOptions([...common.admin_paid]);
    }

    // ✅ Room Type
    if (common.room_type) {
      setRoomTypeOptions([...common.room_type]);
    }

    // ✅ Mode of Payment
    if (common.mode_of_payment) {
      setModeOfPaymentOptions([...common.mode_of_payment]);
    }

    // ✅ Cab Type
    if (common.travel_type_cab_value) {
      setcabTypeOptions([...common.travel_type_cab_value]);
    }

    // ✅ Cab Segment
    if (common.cab_segment) {
      setcabSegmentOptions([...common.cab_segment]);
    }

    // ✅ Train Quota
    if (common.train_quota) {
      settrainQuotaOptions([...common.train_quota]);
    }


    // ✅ Bus
    if (requirementType === 3 && common.class_of_travel_bus) {
      setBusClassOptions([...common.class_of_travel_bus]);
    }

    // ✅ Train
    if (requirementType === 4 && common.class_of_travel_train) {
      setTrainClassOptions([...common.class_of_travel_train]);
    }

  }, [common, requirementType]);


  useEffect(() => {
    // console.log('🚀 Preloading ALL dropdowns');

    Object.entries(DROPDOWN_KEYS).forEach(([stateKey, apiKey]) => {
      // already loaded → skip
      if (common?.[stateKey]?.length) {
        return;
      }

      // console.log(`📡 Fetching dropdown: ${stateKey} → ${apiKey}`);

      triggerCommonDropDown(apiKey)
        .unwrap()
        .then((res) => {
          dispatch(setCommonDropDownList({ [stateKey]: res }));
          // console.log(`✅ Stored dropdown: ${stateKey}`);
        })
        .catch((err) => {
          // console.log(`❌ Failed dropdown: ${stateKey}`, err);
        });
    });
  }, []);



  // 2️⃣ MAP FILE ATTACHMENTS
  useEffect(() => {
    if (!requirementData?.file_detail) return;

    // console.log('📂 Mapping files:', requirementData.file_detail);

    const mappedFiles = requirementData.file_detail.map(f => ({
      id: f.id,
      name: f.file_name,
      uri: f.file_id,
      type: f.file_type,
    }));

    setForm(prev => ({
      ...prev,
      file: mappedFiles,
    }));
  }, [requirementData]);


  // 3️⃣ FETCH BOOKING + TOUR DATA (VIEW MODE)
  useEffect(() => {
    console.log("key", key,)
    if (key !== 'VIEW') return;
    if (!requirementData?.id) return;

    console.log('👀 VIEW MODE → Fetch booking & tour data');
    console.log('📄 Requirement ID:', requirementData.id);
    console.log('📌 Booking Needed:', requirementData.booking_needed);

    triggerBookingDetails({
      requirement_id: requirementData.id,
      type: requirementData.booking_needed ?? 1,
    });

    // triggerTourDataGet(tour_no);

  }, [
    key,
    requirementData?.id,
    requirementData?.booking_needed,
  ]);


  // 4️⃣ INITIALIZE & MAP FORM VALUES
  useEffect(() => {
    if (!requirementData) return;

    // ensure required dropdowns are ready
    if (
      !common?.room_type ||
      !common?.mode_of_payment ||
      !common?.admin_paid ||
      (requirementType === 2 && !common?.travel_type_cab_value)
    ) {
      return;
    }

    const source =
      key === 'VIEW' && bookingDetailsdata?.data?.[0]
        ? bookingDetailsdata.data[0]
        : requirementData;

    if (!source) return;

    // ROOM TYPE
    const roomTypeValue =
      common.room_type.find(
        i => i.value === source.room_type || i.name === source.room_type
      )?.value || '';

    // MODE OF PAYMENT
    const rawPayment =
      source.mode_of_payment ||
      source.payment_mode ||
      source.acc_payment ||
      '';

    const modeOfPaymentValue =
      common.mode_of_payment.find(
        i => i.value === rawPayment || i.name === rawPayment
      )?.value || '';

    // ADMIN PAID
    const adminPaidValue =
      source.admin_paid === 1 ||
        source.admin_paid === '1' ||
        source.admin_paid === 'YES'
        ? 'YES'
        : 'NO';

    // CAB TYPE
    const cabTypeValue =
      common.travel_type_cab_value?.find(
        i =>
          i.value === source.travel_type_cab_value ||
          i.name === source.travel_type_cab_value ||
          i.value === String(source.travel_type_cab)
      )?.value || '';

    // TYPE-SPECIFIC PATCHES
    const accommodationExtras =
      requirementType === 1
        ? {
          vendor_name: source.vendor_name ?? '',
          PNR: source.PNR ?? '',
          website: source.website ?? '',
          ticket_amount: source.ticket_amount ?? '',
        }
        : {};

    const BusExtras =
      requirementType === 3
        ? {
          vendor_name: source.vendor_name ?? '',
          PNR: source.PNR ?? '',
          website: source.website ?? '',
          ticket_amount: source.ticket_amount ?? '',
          class_of_travel_bus: source.class_of_travel ?? '',
          reference_no: source.ref_no ?? '',
        }
        : {};

    const TrainExtras =
      requirementType === 4
        ? {
          vendor_name: source.vendor_name ?? '',
          PNR: source.PNR ?? '',
          website: source.website ?? '',
          ticket_amount: source.ticket_amount ?? '',
          class_of_travel_train: source.class_of_travel ?? '',
          reference_no: source.ref_no ?? '',
        }
        : {};

    const FlightExtras =
      requirementType === 5
        ? {
          vendor_name: source.vendor_name ?? '',
          PNR: source.PNR ?? '',
          website: source.website ?? '',
          ticket_amount: source.ticket_amount ?? '',
          reference_no: source.ref_no ?? '',
          personal_booking_amount: source.ticket_amount_personal ?? '',
        }
        : {};

    setForm(prev => ({
      ...prev,
      ...source,
      ...accommodationExtras,
      ...BusExtras,
      ...TrainExtras,
      ...FlightExtras,
      tour_no: requirementData.requirement_code || '',
      requirement_id:
        requirementType === 2 ? [requirementData.id] : requirementData.id,
      booking_date:
        key === 'VIEW'
          ? source.booking_date
          : formatDateToCustomString(new Date()),
      room_type: roomTypeValue,
      mode_of_payment: modeOfPaymentValue,
      admin_paid: adminPaidValue,
      travel_type_cab_value: cabTypeValue,
    }));
  }, [
    key,
    requirementType,
    requirementData,
    bookingDetailsdata, // ✅ CRITICAL FIX
    common?.room_type,
    common?.mode_of_payment,
    common?.admin_paid,
    common?.travel_type_cab_value, // ✅ CRITICAL FIX
  ]);




  // 5️⃣ BOOKING SUCCESS HANDLER
  useEffect(() => {
    if (
      accBookingdata?.status ||
      cabBookingdata?.status ||
      airBookingdata?.status ||
      busBookingdata?.status ||
      trainBookingdata?.status
    ) {
      // console.log('🎉 Booking success');

      setFieldValue(
        `details[${index.detailIndex}].requirement[${index.requirementIndex}].booking_status`,
        3
      );

      ToastMessage(
        accBookingdata?.message ||
        cabBookingdata?.message ||
        airBookingdata?.message ||
        busBookingdata?.message ||
        trainBookingdata?.message
      );

      navigation.goBack();
    }
  }, [
    accBookingdata,
    cabBookingdata,
    airBookingdata,
    busBookingdata,
    trainBookingdata,
  ]);


  // 6️⃣ STORE PICKER DATA
  useEffect(() => {
    if (!dropdownData || !pickerField) return;

    // console.log('📥 Picker data received:', pickerField, dropdownData);

    dispatch(setCommonDropDownList({ [pickerField]: dropdownData }));
    setPickerOptions(dropdownData);
  }, [dropdownData, pickerField]);

  const openPicker = (field) => {
    if (field === 'admin_paid') return setShowAdminPaid(true);
    if (field === 'room_type') return setShowRoomType(true);
    if (field === 'mode_of_payment') return setShowModeOfPayment(true);
    if (field === 'travel_type_cab_value') return setShowCabType(true);
    if (field === 'cab_segment') return setShowCabSegment(true);
    if (field === 'train_quota') return setShowTrainQuota(true);
    if (field === 'class_of_travel_bus') { return setShowBusClass(true); }
    if (field === 'class_of_travel_train') { return setShowTrainClass(true); }

  };





  const handlePick = (item) => {
    setForm(prev => ({
      ...prev,
      [pickerField]: item.value,
    }));

    setErrors(prev => ({ ...prev, [pickerField]: false }));
    setPickerField(null);
    setPickerOptions([]);
  };



  const handleInputChange = (field, value) => {
    //console.log('asdfghjk', field, value)
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Helper to format date into a consistent string for storage/display
  const formatDateToCustomString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  const getSafeDate = (value) => {
    const parsed = parseCustomDate(value);
    return parsed instanceof Date && !isNaN(parsed) ? parsed : new Date();
  };

  // Helper to parse the custom date string back into a Date object
  const parseCustomDate = (dateStr) => {
    if (!dateStr) return null;

    // Case 1: Format like 2025-Jul-14 18:35:33
    const matchAbbr = dateStr.match(/^(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (matchAbbr) {
      const [_, year, monStr, day, hour, min, sec] = matchAbbr;
      const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      const month = monthMap[monStr];
      if (month === undefined) return null;
      return new Date(Number(year), month, Number(day), Number(hour), Number(min), Number(sec));
    }

    // Case 2: Format like 2025-07-15 11:33:06
    const matchNumeric = dateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (matchNumeric) {
      const [_, year, month, day, hour, min, sec] = matchNumeric;
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min), Number(sec));
    }

    return null; // Fallback if format not matched
  };



  const formatDateWithTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    const date = parseCustomDate(dateTimeStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStringOrTimestamp) => {
    if (!dateStringOrTimestamp) return 'N/A';
    const date = parseCustomDate(dateStringOrTimestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const showDatepicker = (field, mode = 'date') => {
    setCurrentDateField(field);
    const currentVal = getSafeDate(form[field]);

    if (Platform.OS === 'android') {
      if (mode === 'datetime') {
        // Show date picker first
        DateTimePickerAndroid.open({
          value: currentVal,
          mode: 'date',
          is24Hour: true,
          display: 'default',
          minimumDate: minDate,
          maximumDate: maxDate,
          onChange: (event, selectedDate) => {
            if (event.type === 'dismissed' || !selectedDate) return;

            // Show time picker after date is selected
            DateTimePickerAndroid.open({
              value: selectedDate,
              mode: 'time',
              is24Hour: true,
              display: 'default',
              onChange: (event2, selectedTime) => {
                if (event2.type === 'dismissed' || !selectedTime) return;

                const combined = new Date(selectedDate);
                combined.setHours(selectedTime.getHours());
                combined.setMinutes(selectedTime.getMinutes());
                combined.setSeconds(0);
                handleInputChange(field, formatDateToCustomString(combined));
                setErrors(prev => ({ ...prev, [field]: false }));

              },
            });
          },
        });
      } else if (mode === 'date') {
        // Show only date picker
        DateTimePickerAndroid.open({
          value: currentVal,
          mode: 'date',
          is24Hour: true,
          display: 'default',
          onChange: (event, selectedDate) => {
            if (event.type === 'dismissed' || !selectedDate) return;

            handleInputChange(field, formatDateToCustomString(selectedDate));
          },
        });
      }
    } else {
      // iOS or other platforms: trigger component that shows native picker in UI
      setShowDatePicker(true);
    }
  };

  const handleViewFile = async (file) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists || fileInfo.isDirectory) {
        ToastMessage("File not found or is invalid."); // Changed to Toast
        return;
      }

      const mimeType = getMimeType(file.name);
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(file.uri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: mimeType,
        });
      } else {
        // iOS and Web
        await WebBrowser.openBrowserAsync(file.uri);
      }
    } catch (error) {
      // console.error("Failed to open file:", error);
      ToastMessage(`Error: Unable to open file. ${error.message}`);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    if (currentDateField) {
      handleInputChange(
        currentDateField,
        formatDateToCustomString(selectedDate)
      );
    }
  };

  const getMimeType = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();
    const mimeTypes = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    return mimeTypes[extension] || "application/octet-stream";
  };

const handleFileUpload = async () => {
  try {
    const files = await pickDocuments(true); // multiple files

    if (files.length > 0) {
      setForm(prev => ({
        ...prev,
        file: [...(prev.file || []), ...files],
      }));

      setErrors(prev => ({
        ...prev,
        file: false,
      }));

      ToastMessage(`${files.length} file(s) attached successfully`);
    }
  } catch (error) {
    console.log('File picker error:', error);
    ToastMessage('Failed to pick document');
  }
};
  const removeFile = (uri) => {
    Alert.alert("Remove File", "Are you sure you want to remove this file?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        onPress: () =>
          setForm((prev) => ({
            ...prev,
            file: prev.file.filter(
              (f) => (f.uri || f.id) !== uri
            ),
          })),
        style: "destructive",
      },
    ]);
  };
  const renderInput = (label, field, type = 'text', options = {}) => {
    const value = form[field];
    const hasError = errors[field];

    // ===== DROPDOWN =====
    if (type === 'customDropdown') {
      return (
        <View key={field} style={create_styles.inputContainer}>
          <Text allowFontScaling={false} style={create_styles.label}>
            {label}
            {getRequiredFieldsByType(requirementType).includes(field) && (
              <Text allowFontScaling={false} style={{ color: 'red' }}> *</Text>
            )}

          </Text>

          <TouchableOpacity
            style={[
              create_styles.pickerInput,
              hasError && { borderColor: 'red', borderWidth: 1 }
            ]}
            onPress={() => openPicker(field)}
          >
            <Text allowFontScaling={false} style={create_styles.pickerInputText}>
              {(common?.[field]?.find(o => o.value === value)?.name) || 'Select'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={moderateScale(20)}
              color={CustomColors.darkGray}
            />
          </TouchableOpacity>
        </View>
      );
    }

    // ===== DATE =====
    if (type === 'date') {
      return (
        <View key={field} style={create_styles.inputContainer}>
          <Text allowFontScaling={false} style={create_styles.label}>
            {label}
            {getRequiredFieldsByType(requirementType).includes(field) && <Text allowFontScaling={false} style={{ color: CustomColors.textRed }}> *</Text>}
          </Text>

          <TouchableOpacity
            style={[
              create_styles.pickerInput,
              hasError && { borderColor: 'red', borderWidth: 1 }
            ]}
            onPress={() => showDatepicker(field, 'date')}
          >
            <Text allowFontScaling={false} style={create_styles.pickerInputText}>
              {value ? formatDate(value) : 'Select Date'}
            </Text>
            <Ionicons name="calendar-outline" size={20} />
          </TouchableOpacity>
        </View>
      );
    }

    // ===== DATETIME =====
    if (type === 'datetime') {
      return (
        <View key={field} style={create_styles.inputContainer}>
          <Text allowFontScaling={false} style={create_styles.label}>
            {label}
            {getRequiredFieldsByType(requirementType).includes(field) && <Text allowFontScaling={false} style={{ color: CustomColors.textRed }}> *</Text>}
          </Text>

          <TouchableOpacity
            style={[
              create_styles.pickerInput,
              hasError && { borderColor: 'red', borderWidth: 1 }
            ]}
            onPress={() => showDatepicker(field, 'datetime')}
          >
            <Text allowFontScaling={false} style={create_styles.pickerInputText}>
              {value ? formatDateWithTime(value) : 'Select Date & Time'}
            </Text>
            <Ionicons name="calendar-outline" size={moderateScale(20)} />
          </TouchableOpacity>
        </View>
      );
    }

    // ===== TEXT INPUT =====
    return (
      <View key={field} style={create_styles.inputContainer}>
        <Text allowFontScaling={false} style={create_styles.label}>
          {label}
          {getRequiredFieldsByType(requirementType).includes(field) && <Text allowFontScaling={false} style={{ color: CustomColors.textRed }}> *</Text>}
        </Text>

        <TextInput
          allowFontScaling={false}
          style={[
            create_styles.input,
            hasError && { borderColor: 'red', borderWidth: 1 }
          ]}
          value={value?.toString()}
          editable={!options.disabled}
          keyboardType={options.keyboardType || 'default'}
          placeholder={`Enter ${label}`}
          placeholderTextColor={CustomColors.textGray}
          onChangeText={(text) => {
            handleInputChange(field, text);
            setErrors(prev => ({ ...prev, [field]: false }));
          }}
        />
      </View>
    );
  };

  const hasError = errors.file;


  const renderCommonFields = () => (
    <>
      {renderInput('Requirement code', 'tour_no', 'text', { disabled: true })}
      {renderInput('Remarks', 'comments')}
      {renderInput('Payed by Admin', 'admin_paid', 'customDropdown')}
      {renderInput('Booking Date', 'booking_date', 'date')}
      {requirementType !== 2 && (
        <>
          <TouchableOpacity
            style={[
              create_styles.pickFileButton,
              hasError && { borderColor: 'red', borderWidth: 1 }
            ]}
            onPress={handleFileUpload}
          >
            <Ionicons
              name="document-attach-outline"
              size={moderateScale(20)}
              color={CustomColors.iconWhite}
            />
            <Text allowFontScaling={false} style={create_styles.buttonText}>
              {form.file?.length > 0
                ? `Uploaded (${form.file.length})`
                : 'Upload Files'}
            </Text>
          </TouchableOpacity>


          <FileDisplaySection
            title="Uploaded Files"
            files={form.file}
            handleViewFile={handleViewFile}
            removeFile={removeFile}
            isEditable={key !== 'VIEW'}
          />
        </>
      )}
    </>
  );

  const renderByType = () => {
    switch (requirementType) {
      case 1: // Accommodation
        return (
          <>
            {renderInput('Check-in Date, Time', 'checkin_time', 'datetime')}
            {renderInput('Checkout Date, Time', 'checkout_time', 'datetime')}
            {renderInput('Place of Stay', 'place_of_stay')}
            {renderInput('Hotel Name', 'vendor_name')}
            {renderInput('Admin Comment', 'comments')}
            {renderInput('PNR No', 'PNR')}
            {renderInput('Booking Site', 'website')}
            {renderInput('Room Type', 'room_type', 'customDropdown')}
            {renderInput('No of Nights', 'no_of_nights', 'text', { keyboardType: 'numeric' })}
            {renderInput('Booking Amount', 'ticket_amount', 'text', { keyboardType: 'numeric' })}
            {renderInput('Payment Mode', 'mode_of_payment', 'customDropdown')}
          </>
        );

      case 2: // Cab
        return (
          <>
            {renderInput('Date & Time', 'from_time', 'datetime')}
            {renderInput('From Place', 'from_place')}
            {renderInput('To Place', 'to_place')}
            {renderInput('Invoice No', 'PNR')}
            {renderInput('Invoice Date', 'invoice_date', 'date')}
            {renderInput('Issuance Type', 'issuance_type')}
            {renderInput('Cab Type', 'travel_type_cab_value', 'customDropdown')}
            {renderInput('Cab Segment', 'cab_segment', 'customDropdown')}
            {renderInput('Official Booking Amount', 'ticket_amount', 'text', { keyboardType: 'numeric' })}
          </>
        );

      case 3: // Bus
      case 4: // Train
      case 5: // Flight
        return (
          <>
            {renderInput('Date & Time', 'from_time', 'datetime')}
            {renderInput('From Place', 'from_place')}
            {renderInput('To Place', 'to_place')}
            {requirementType === 3 && renderInput('Bus No', 'bus_number')}
            {requirementType === 5 && renderInput('Ticket No', 'ticket_no')}
            {requirementType === 4 && renderInput("Train Number", "train_number")}
            {renderInput('Vendor Name', 'vendor_name')}
            {renderInput('PNR No', 'PNR')}
            {renderInput('Issuance Type', 'issuance_type')}
            {renderInput('Booking Site', 'website')}
            {renderInput('Official Booking Amount', 'ticket_amount', 'text', { keyboardType: 'numeric' })}
            {requirementType === 3 && (
              renderInput('Class of Travel', 'class_of_travel_bus', 'customDropdown')
            )}

            {requirementType === 4 && (
              renderInput('Class of Travel', 'class_of_travel_train', 'customDropdown')
            )}

            {renderInput('Reference No', 'reference_no')}
            {requirementType === 5 && renderInput('Personal Booking Amount', 'personal_booking_amount', 'text', { keyboardType: 'numeric' })}
            {requirementType === 4 && renderInput('Train Quota', 'train_quota', 'customDropdown')}
          </>
        );

      default:
        return null;
    }
  };

  const formatDateToOutputString = (input) => {
    if (!input) return null;

    if (input instanceof Date) {
      return formatFromDate(input);
    }

    // Handle 'YYYY-MMM-DD HH:MM:SS' (e.g., 2025-Jul-16 00:00:00)
    const textMonthMatch = input.match(/^(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (textMonthMatch) {
      const [_, year, monStr, day, hour, min, sec] = textMonthMatch;
      const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      const month = monthMap[monStr];
      if (month) {
        return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
      }
    }

    // Fallback to Date constructor for ISO and clean formats
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return formatFromDate(date);
    }

    return null; // Invalid
  };

  const formatFromDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  const validateForm = () => {
    const newErrors = {};

    const requiredFields = getRequiredFieldsByType(requirementType);

    requiredFields.forEach(field => {

      const value = form[field];

      // Special case: file
      if (field === 'file') {
        if (!Array.isArray(value) || value.length === 0) {
          newErrors[field] = true;
        }
        return;
      }

      // Accept 0 as valid (dropdowns, numeric)
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        newErrors[field] = true;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // console.log(Object.keys(newErrors).length)
      ToastMessage('Please fill all mandatory fields');
      return false;
    }

    return true;
  };

 const submitBooking = async (url, payload, files = []) => {
  try {
    const response = await uploadMultipart({
      url,
      data: payload,
      files,
      headers: {
        Authorization: `Token ${authToken}`,
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        ...(csrfCookie ? { 'X-CSRFCookie': csrfCookie } : {}),
      },
    });

    console.log('BOOKING RESPONSE:', JSON.stringify(response, null, 2));

    return response;

  } catch (error) {
    console.log('BOOKING ERROR FULL:', error);

    if (error?.response) {
      console.log('STATUS:', error.response.status);
      console.log('BODY:', error.response.body);
    }

    throw error;
  }
};
  const handleSave = async () => {
    const formData = new FormData();
    // console.log("start")
    if (!validateForm()) return;


    const formattedDates = {
      from_time: formatDateToOutputString(form.from_time),
      to_time: formatDateToOutputString(form.to_time),
      checkin_time: formatDateToOutputString(form.checkin_time),
      checkout_time: formatDateToOutputString(form.checkout_time),
      invoice_date: formatDateToOutputString(form.invoice_date),
      booking_date: formatDateToOutputString(form.booking_date),
    };

    const commonFileAppend = () => {
      if (form.file?.length > 0) {
        form.file.forEach((f) => {
          formData.append('file', {
            uri: f.uri,
            name: f.name,
            type: f.mimeType || getMimeType(f.name),
          });
        });
      }
    };
const isAdminPaid = form.admin_paid === 'YES';
    if (requirementType === 1) {
       
      const formattedForm = {
        requirement_id: form.requirement_id,
        checkin_time: formattedDates.checkin_time,
        checkout_time: formattedDates.checkout_time,
        place_of_stay: form.place_of_stay ?? '',
        ref_no: form.reference_no ?? null,
        booking_status: 3,
        travel_detail: 1,
ticket_amount: isAdminPaid ? Number(form.ticket_amount || 0) : 0,
ticket_amount_personal: isAdminPaid ? 0 : Number(form.ticket_amount || 0),
        comments: form.comments ?? '',
        admin_paid: form.admin_paid === 'YES' ? 1 : 0,

        vendor_name: form.vendor_name ?? '',
        amount_saved: 0,
        nac_rate: 0,
        rack_rate_night: 0,
        room_type: form.room_type ?? '',
        total_a: 0,
        total_b: 0,
        no_of_nights: form.no_of_nights ? Number(form.no_of_nights) : 1,
        mode_of_payment: form.mode_of_payment ?? '',
        website: form.website ?? '',
        ticket_no: form.ticket_no ?? null,
        PNR: form.PNR ?? '',
        requirement_code: form.tour_no,
        booking_date: formattedDates.booking_date,
      };
      console.log("payload", JSON.stringify(formattedForm))
      // formData.append('data', JSON.stringify(formattedForm));
      // commonFileAppend();
      // triggerAccBooking({ data: formData });
      const response = await submitBooking(
  `${Environment.taServiceUrl}/taserv/accommodation_booking_admin`,
  formattedForm,
    form.file || []
);

if (
  response?.status === 'success' ||
  response?.message === 'Success'
) {
   setFieldValue(
    `details[${index.detailIndex}].requirement[${index.requirementIndex}].booking_status`,
    3
  );
  ToastMessage(response?.message || 'Accommodation booking saved');
  navigation.goBack();
} else {
  ToastMessage(response?.description || response?.message || 'Save failed');
}
    }

    else if (requirementType === 2) {
      const formattedForm = {
        requirement_id: form.requirement_id,
        from_time: formattedDates.from_time,
        to_time: formattedDates.to_time,
        from_place: form.from_place,
        to_place: form.to_place,
        ref_no: form.reference_no ?? null,
        ref_type: 2,
        booking_status: 3,
        tour: 1,
       ticket_amount: isAdminPaid ? Number(form.ticket_amount || 0) : 0,
ticket_amount_personal: isAdminPaid ? 0 : Number(form.ticket_amount || 0),
        comments: form.comments ?? '',
        admin_paid: form.admin_paid === 'YES' ? 1 : 0,

        vendor_name: form.vendor_name ?? '',
        travel_type_cab: form.travel_type_cab ?? form.travel_type_cab_value ?? '',
        cab_segment: form.cab_segment ?? '',
        ticket_no: form.ticket_no ?? null,
        cab_number: form.cab_number ?? null,
        cost_per_head: 0,
        invoice_date: formattedDates.invoice_date,
        issuance_type: form.issuance_type ?? '',
        difference_inamount: 0,
        fare_quoted: 0,
        website: form.website ?? '',
        PNR: form.PNR ?? '',
        requirement_code: form.tour_no,
        booking_date: formattedDates.booking_date,
      };

      // formData.append('data', JSON.stringify(formattedForm));
      // commonFileAppend();
      // triggerCabBooking({ data: formData });
      console.log("payload", JSON.stringify(formattedForm))
      const response = await submitBooking(
  `${Environment.taServiceUrl}/taserv/cab_booking_admin`,
  formattedForm,
    form.file || []
);

if (
  response?.status === 'success' ||
  response?.message === 'Success'
) {
   setFieldValue(
    `details[${index.detailIndex}].requirement[${index.requirementIndex}].booking_status`,
    3
  );
  ToastMessage(response?.message || 'Cab booking saved');
  navigation.goBack();
} else {
  ToastMessage(response?.description || response?.message || 'Save failed');
}
    }

    else if (requirementType === 3) {
      const formattedForm = {
        requirement_id: form.requirement_id,
        from_time: formattedDates.from_time,
        to_time: formattedDates.to_time,
        from_place: form.from_place ?? '',
        to_place: form.to_place ?? '',
        ref_no: form.reference_no ?? null,
        ref_type: 2,
        booking_status: 3,
        tour: 1,
        ticket_amount: isAdminPaid ? Number(form.ticket_amount || 0) : 0,
        ticket_amount_personal: isAdminPaid ? 0 : Number(form.ticket_amount || 0),
        comments: form.comments ?? '',
        admin_paid: form.admin_paid === 'YES' ? 1 : 0,

        vendor_name: form.vendor_name ?? '',
        class_of_travel: form.class_of_travel_bus ?? '',

        seat_number: form.seat_number ?? null,
        ticket_no: form.ticket_no ?? null,
        bus_number: form.bus_number ?? '',
        cost_per_head: 0,
        issuance_type: form.issuance_type ?? '',
        difference_inamount: 0,
        fare_quoted: 0,
        website: form.website ?? '',
        PNR: form.PNR ?? '',
        requirement_code: form.tour_no,
        booking_date: formattedDates.booking_date,
      };
      console.log("payload", JSON.stringify(formattedForm))
      // formData.append('data', JSON.stringify(formattedForm));
      // commonFileAppend();
      // triggerBusBooking({ data: formData });
      const response = await submitBooking(
 `${Environment.taServiceUrl}/taserv/bus_booking_admin`,
  formattedForm,
    form.file || []
);

if (
  response?.status === 'success' ||
  response?.message === 'Success'
) {
   setFieldValue(
    `details[${index.detailIndex}].requirement[${index.requirementIndex}].booking_status`,
    3
  );
  ToastMessage(response?.message || 'Bus booking saved');
  navigation.goBack();
} else {
  ToastMessage(response?.description || response?.message || 'Save failed');
}
    }

    else if (requirementType === 4) {
      const formattedForm = {
        requirement_id: form.requirement_id,
        from_time: formattedDates.from_time,
        to_time: formattedDates.to_time,
        from_place: form.from_place ?? '',
        to_place: form.to_place ?? '',
        class_of_travel: form.class_of_travel_train ?? '',
        train_quota: form.train_quota ?? '',
        ref_no: form.reference_no ?? null,
        ref_type: 2,
        booking_status: 3,
        travel_detail: 1,
        pnr_no: form.pnr_no ?? '',
        train_number: form.train_number ?? '',
        ticket_amount: isAdminPaid ? Number(form.ticket_amount || 0) : 0,
        ticket_amount_personal: isAdminPaid ? 0 : Number(form.ticket_amount || 0),
        vendor_name: form.vendor_name ?? '',
        comments: form.comments ?? '',
        admin_paid: form.admin_paid === 'YES' ? 1 : 0,

        cost_per_head: 0,
        issuance_type: form.issuance_type ?? '',
        difference_inamount: 0,
        fare_quoted: 0,
        website: form.website ?? '',
        ticket_no: form.ticket_no ?? null,
        PNR: form.PNR ?? '',
        requirement_code: form.tour_no,
        booking_date: formattedDates.booking_date,
      };
      console.log("payload", JSON.stringify(formattedForm))
      // formData.append('data', JSON.stringify(formattedForm));
      // commonFileAppend();
      // triggerTrainBooking({ data: formData });
      const response = await submitBooking(
 `${Environment.taServiceUrl}/taserv/train_booking_admin`,
  formattedForm,
    form.file || []
);

if (
  response?.status === 'success' ||
  response?.message === 'Success'
) {
  setFieldValue(
    `details[${index.detailIndex}].requirement[${index.requirementIndex}].booking_status`,
    3
  );
  ToastMessage(response?.message || 'Train booking saved');
  navigation.goBack();
} else {
  ToastMessage(response?.description || response?.message || 'Save failed');
}
    }

    else if (requirementType === 5) {
      const formattedForm = {
        requirement_id: form.requirement_id,
        from_time: formattedDates.from_time,
        to_time: formattedDates.to_time,
        from_place: form.from_place,
        to_place: form.to_place,
        ref_no: form.reference_no ?? null,
        ref_type: null,
        booking_status: 3,
        tour: 1,
        boarding_no: form.boarding_no ?? null,
        ticket_amount: isAdminPaid ? Number(form.ticket_amount || 0) : 0,
        ticket_amount_personal: isAdminPaid ? 0 : Number(form.ticket_amount || 0),
        vendor_name: form.vendor_name ?? '',
        comments: form.comments ?? '',
        admin_paid: form.admin_paid === 'YES' ? 1 : 0,

        cost_per_head: 0,
        issuance_type: form.issuance_type ?? '',
        difference_inamount: 0,
        fare_quoted: 0,
        website: form.website ?? '',
        ticket_no: form.ticket_no ?? null,
        PNR: form.PNR ?? '',
        flight_number: form.flight_number ?? null,
        requirement_code: form.tour_no,
        booking_date: formattedDates.booking_date,
      };
      console.log("payload", JSON.stringify(formattedForm))
      // formData.append('data', JSON.stringify(formattedForm));
      // commonFileAppend();
      // triggerAirBooking({ data: formData });
      const response = await submitBooking(
  `${Environment.taServiceUrl}/taserv/air_booking_admin`,
  formattedForm,
    form.file || []
);

if (
  response?.status === 'success' ||
  response?.message === 'Success'
) {
   setFieldValue(
    `details[${index.detailIndex}].requirement[${index.requirementIndex}].booking_status`,
    3
  );
  ToastMessage(response?.message || 'Air booking saved');
  navigation.goBack();
} else {
  ToastMessage(response?.description || response?.message || 'Save failed');
}
    }
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
          setPickerStatus && setPickerStatus(false); // ✅ SAFE
        }}
        style={[
          create_styles.actionSheetOption,
          isSelected && create_styles.actionSheetOptionSelected,
        ]}
        accessibilityRole="button"
      >
        <Text allowFontScaling={false}
          style={[
            create_styles.actionSheetOptionText,
            isSelected && create_styles.actionSheetOptionTextSelected,
          ]}
        >
          {typeof options.label === "string"
            ? options.label
            : String(options.label)}
        </Text>
      </TouchableOpacity>
    );
  };





  return (
    <KeyboardAvoidingView
      style={styles.screenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={verticalScale(120)}
    >
      <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formSection}>
          <Text allowFontScaling={false} style={create_styles.sectionHeader}>Booking Details</Text>
          {renderCommonFields()}
        </View>

        {renderByType() && (
          <View style={styles.formSection}>
            <Text allowFontScaling={false} style={create_styles.sectionHeader}>Specific Details ({
              requirementType === 1 ? 'Accommodation' :
                requirementType === 2 ? 'Cab' :
                  requirementType === 3 ? 'Bus' :
                    requirementType === 4 ? 'Train' :
                      requirementType === 5 ? 'Flight' : ''
            })</Text>
            {renderByType()}
          </View>
        )}
      </ScrollView>
      {key !== 'VIEW' && (
        <View style={styles.fixedFooter}>
          <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave}>
            <Ionicons name="save-outline" size={moderateScale(20)} color={CustomColors.iconWhite} />
            <Text allowFontScaling={false} style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => navigation.goBack()}>
            <Ionicons name="close-circle-outline" size={moderateScale(20)} color={CustomColors.iconWhite} />
            <Text allowFontScaling={false} style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      <CustomActionSheetPicker
        pickerStatus={showTrainClass}
        setPickerStatus={setShowTrainClass}
        title="Select Train Class"
        optionsData={trainClassOptions.map(o => ({
          label: o.name,
          value: o.value,
        }))}
        RenderItem={RenderDropdownItem}
        onPress={(item) => {
          setForm(prev => ({
            ...prev,
            class_of_travel_train: item.value,
          }));
          setErrors(prev => ({ ...prev, class_of_travel_train: false }));
          setShowTrainClass(false);
        }}
        selected={{ value: form.class_of_travel_train }}
      />
      <CustomActionSheetPicker
        pickerStatus={showBusClass}
        setPickerStatus={setShowBusClass}
        title="Select Bus Class"
        optionsData={busClassOptions.map(o => ({
          label: o.name,
          value: o.value,
        }))}
        RenderItem={RenderDropdownItem}
        onPress={(item) => {
          setForm(prev => ({
            ...prev,
            class_of_travel_bus: item.value,
          }));
          setErrors(prev => ({ ...prev, class_of_travel_bus: false }));
          setShowBusClass(false);
        }}
        selected={{ value: form.class_of_travel_bus }}
      />


      <CustomActionSheetPicker
        pickerStatus={showTrainQuota}
        setPickerStatus={setShowTrainQuota}
        title="Select Train Quota"
        optionsData={trainQuotaOptions.map(o => ({
          label: o.name,
          value: o.value,
        }))}
        RenderItem={RenderDropdownItem}
        onPress={(item) => {
          setForm(prev => ({ ...prev, train_quota: item.value }));
          setErrors(prev => ({ ...prev, train_quota: false }));

          setShowTrainQuota(false);
        }}
        selected={{ value: form.train_quota }}
      />
      <CustomActionSheetPicker
        pickerStatus={showCabSegment}
        setPickerStatus={setShowCabSegment}
        title="Select Cab Segment"
        optionsData={cabSegmentOptions.map(o => ({
          label: o.name,
          value: o.value,
        }))}
        RenderItem={RenderDropdownItem}
        onPress={(item) => {
          setForm(prev => ({ ...prev, cab_segment: item.value }));
          setErrors(prev => ({ ...prev, cab_segment: false }));

          setShowCabSegment(false);
        }}
        selected={{ value: form.cab_segment }}
      />


      <CustomActionSheetPicker
        pickerStatus={showCabType}
        setPickerStatus={setShowCabType}
        title="Select Cab Type"
        optionsData={cabTypeOptions.map(o => ({
          label: o.name,
          value: o.value,
        }))}
        RenderItem={RenderDropdownItem}
        onPress={(item) => {
          setForm(prev => ({ ...prev, travel_type_cab_value: item.value }));
          setErrors(prev => ({ ...prev, travel_type_cab_value: false }));
          setShowCabType(false);
        }}
        selected={{ value: form.travel_type_cab_value }}
      />

      {pickerField && (
        <CustomActionSheetPicker
          pickerStatus={true}
          setPickerStatus={() => {
            setPickerField(null);
            setPickerOptions([]);
          }}
          title={`Select ${pickerField.replace(/_/g, ' ')}`}
          optionsData={pickerOptions.map(option => ({
            label: String(option.name),
            value: option.value,
          }))}
          RenderItem={RenderDropdownItem}
          onPress={handlePick}
          selected={{ value: form[pickerField] }}
          isLoading={isLoadingDropdown}
        />
      )}


      <CustomActionSheetPicker
        pickerStatus={showAdminPaid}
        setPickerStatus={setShowAdminPaid}
        title="Select Admin Paid"
        optionsData={adminPaidOptions.map(o => ({
          label: o.name,
          value: o.value,
        }))}
        RenderItem={RenderDropdownItem}
        onPress={(item) => {
          setForm(prev => ({ ...prev, admin_paid: item.value }));
          setErrors(prev => ({ ...prev, admin_paid: false }));
          setShowAdminPaid(false);
        }}
        selected={{ value: form.admin_paid }}
      />
      <CustomActionSheetPicker
        pickerStatus={showRoomType}
        setPickerStatus={setShowRoomType}
        title="Select Room Type"
        optionsData={roomTypeOptions.map(o => ({
          label: o.name,
          value: o.value,
        }))}
        RenderItem={RenderDropdownItem}
        onPress={(item) => {
          setForm(prev => ({ ...prev, room_type: item.value }));
          setErrors(prev => ({ ...prev, room_type: false }));
          setShowRoomType(false);
        }}
        selected={{ value: form.room_type }}
      />
      <CustomActionSheetPicker
        pickerStatus={showModeOfPayment}
        setPickerStatus={setShowModeOfPayment}
        title="Select Payment Mode"
        optionsData={modeOfPaymentOptions.map(o => ({
          label: o.name,
          value: o.value,
        }))}
        RenderItem={RenderDropdownItem}
        onPress={(item) => {
          setForm(prev => ({ ...prev, mode_of_payment: item.value }));
          setErrors(prev => ({ ...prev, mode_of_payment: false }));
          setShowModeOfPayment(false);
        }}
        selected={{ value: form.mode_of_payment }}
      />



      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={
            currentDateField && form[currentDateField]
              ? getSafeDate(form[currentDateField])
              : new Date()
          }
          mode="datetime"
          is24Hour={true}
          display="default"
          onChange={handleDateChange}
        />
      )}
      {showViaWeb && (
        <Modal visible={showViaWeb} animationType="slide">
          <View style={{ flex: 1 }}>
            <View style={{ height: 60, backgroundColor: CustomColors.appThemeColor, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
              <TouchableOpacity onPress={() => setShowViaWeb(false)}>
                <Ionicons name="arrow-back" size={24} color={CustomColors.iconWhite} />
              </TouchableOpacity>
              <Text allowFontScaling={false} style={{ color: CustomColors.textWhite, fontSize: 18, marginLeft: 16, fontWeight: 'bold' }}>
                Via.com
              </Text>
            </View>
            <WebView source={{ uri: 'https://www.via.com' }} startInLoadingState />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};



export default BookingScreen;