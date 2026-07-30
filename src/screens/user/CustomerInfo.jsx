import React, { useEffect, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useUpdateCustomerInfoMutation } from "../../redux/rtk_query/apiSlice";
import { setCustomerInfo } from "../../redux/slices/CustomerInfoSlice";
import Feather from "@expo/vector-icons/Feather";
import moment from "moment";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "../../globalstyles/Metrics";
import { getColors } from "../../globalstyles/Colors";
import { Fonts } from "../../globalstyles/Fonts";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getCustomColors } from "../../styles/CustomColors";


const VALIDATION_RULES = {
  1: {
    validate: (v) => !v || /^\d{12}$/.test(v),
    message: "Aadhaar must be exactly 12 digits",
  },
  2: {
    validate: (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v),
    message: "Invalid PAN format (e.g. ABCDE1234F)",
  },
  3: {
    validate: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: "Invalid Email format",
  },
  4: {
    validate: (v) => !v || /^\d{6}$/.test(v),
    message: "Pincode must be exactly 6 digits",
  },
  5: {
    validate: (v) => !v || v.trim().length > 0,
    message: "City cannot be blank",
  },
  6: {
    validate: (v) => !v || v.trim().length > 0,
    message: "District cannot be blank",
  },
  7: {
    validate: (v) => !v || v.trim().length > 0,
    message: "State cannot be blank",
  },
  8: {
    validate: (v) => !v || ["male", "female", "others"].includes(v),
    message: "Invalid gender value",
  },
  9: {
    validate: (v) =>
      !v || ["unmarried", "married", "widow", "divorce"].includes(v),
    message: "Invalid marital status",
  },
};


const DATE_FORMATS = [
  "YYYY-MM-DD HH:mm:ss",
  "DD-MMM-YYYY HH:mm:ss",
  "DD-MMM-YYYY",
  "YYYY-MM-DD",
  moment.ISO_8601,
];

const formatDateSafe = (val, outputFmt = "DD-MMM-YYYY LT") => {
  if (!val) return "N/A";
  const parsed = moment(String(val), DATE_FORMATS, true);
  return parsed.isValid() ? parsed.format(outputFmt) : String(val);
};


const resolveDisplayValue = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "object")
    return val.name ?? val.label ?? JSON.stringify(val);
  return String(val);
};


const CustomerInfoScreen = ({ route }) => {
  const { ref_id, type } = route.params;
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const customerInfo = useSelector((state) => state.customerInfo.data);
  const [updateCustomerInfo] = useUpdateCustomerInfoMutation();

  const [editableFields, setEditableFields] = useState({});
  const [expandedSections, setExpandedSections] = useState(["General"]);
  const [editModeSections, setEditModeSections] = useState({});
  const [loadingSections, setLoadingSections] = useState({});

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [tempDate, setTempDate] = useState(null);
  const [activeDateLabel, setActiveDateLabel] = useState(null);

  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Customer Details",
      headerStyle: { backgroundColor: CustomColors.appThemeColor },
      headerTintColor: CustomColors.textWhite,
      headerTitleStyle: { fontWeight: "600" },
    });
  }, []);

  useEffect(() => {
    if (!customerInfo) return;
    const values = {};
    Object.values(customerInfo).forEach((fields) => {
      fields.forEach((f) => {
        values[f.display_name] = resolveDisplayValue(f.display_value);
      });
    });
    setEditableFields(values);
  }, [customerInfo]);

  const handleChange = (label, value) =>
    setEditableFields((prev) => ({ ...prev, [label]: value }));

  /* ── DateTime Picker logic ── */
  const openDateTimePicker = (label) => {
    setActiveDateLabel(label);
    setPickerMode("date");
    setTempDate(null);
    setShowDatePicker(true);
  };

  const onDateTimeChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      setPickerMode("date");
      setTempDate(null);
      setActiveDateLabel(null);
      return;
    }

    if (pickerMode === "date") {
      setTempDate(selectedDate);
      setPickerMode("time");
      return;
    }

    // Both date + time chosen → commit
    const finalDate = new Date(tempDate);
    finalDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    handleChange(activeDateLabel, moment(finalDate).format("YYYY-MM-DD HH:mm:ss"));

    setShowDatePicker(false);
    setPickerMode("date");
    setTempDate(null);
    setActiveDateLabel(null);
  };


  const buildPayload = (sectionName) => {
    const payload = { id: ref_id };
    let changed = false;

    for (const field of customerInfo[sectionName]) {
      const label = field.display_name;
      const currentEdited = editableFields[label] ?? "";
      const originalRaw = field.display_value;                 
      const originalResolved = resolveDisplayValue(originalRaw); 

      if (!field.can_edit) {
        payload[label] = originalRaw;
        continue;
      }

      const isActuallyChanged = currentEdited !== originalResolved;

      if (!isActuallyChanged) {
        payload[label] = originalRaw;
        continue;
      }

      if (!field.is_compulsory && (currentEdited === "" || currentEdited === null)) {
        payload[label] = originalRaw;
      } else {
        payload[label] = currentEdited;
        changed = true;
      }
    }

    return { payload, changed };
  };

  const handleSave = async (sectionName) => {
    for (const field of customerInfo[sectionName]) {
      if (!field.can_edit || !field.validation_id) continue;
      const currentVal = editableFields[field.display_name] ?? "";
      const rule = VALIDATION_RULES[field.validation_id];
      if (rule && !rule.validate(currentVal)) {
        ToastMessage(rule.message);
        return;
      }
    }

    const { payload, changed } = buildPayload(sectionName);

    if (!changed) {
      ToastMessage("No changes to save");
      return;
    }

    setLoadingSections((p) => ({ ...p, [sectionName]: true }));
    try {
      const res = await updateCustomerInfo({ data: payload, type }).unwrap();
      ToastMessage(res.message ?? "Saved successfully");

      const updated = { ...customerInfo };
      updated[sectionName] = updated[sectionName].map((f) => ({
        ...f,
        display_value: payload[f.display_name] ?? f.display_value,
      }));
      dispatch(setCustomerInfo(updated));
      setEditModeSections((p) => ({ ...p, [sectionName]: false }));
    } catch (err) {
      console.log("Save error:", err);
      ToastMessage("Something went wrong");
    } finally {
      setLoadingSections((p) => ({ ...p, [sectionName]: false }));
    }
  };

  if (!customerInfo) {
    return (
      <View style={staticStyles.noDataContainer}>
        <Image
          source={require("../../assets/images/no_data.png")}
          style={staticStyles.noDataImage}
        />
        <Text allowFontScaling={false} style={staticStyles.noDataTitle}>
          No Data Found
        </Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    parent: { flex: 1, backgroundColor: CustomColors.backgroundGray2 },
    container: { padding: moderateScale(16) },

    section: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(16),
      paddingVertical: verticalScale(16),
      paddingHorizontal: horizontalScale(16),
      marginBottom: verticalScale(16),
      elevation: 3,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: verticalScale(12),
    },

    sectionTitle: {
      fontSize: moderateScale(17),
      fontFamily: Fonts.bold,
      color: CustomColors.textBlack,
    },

    saveBtn: {
      backgroundColor: Colors.backgroundBlue,
      paddingHorizontal: horizontalScale(18),
      paddingVertical: verticalScale(8),
      borderRadius: moderateScale(20),
      minWidth: horizontalScale(60),
      alignItems: "center",
      justifyContent: "center",
    },

    saveBtnDisabled: {
      backgroundColor: Colors.backgroundBlue,
      opacity: 0.6,
    },

    saveText: {
      color: CustomColors.textWhite,
      fontFamily: Fonts.medium,
    },

    field: { marginBottom: verticalScale(14) },

    label: {
      fontSize: moderateScale(13),
      color: Colors.textLabelTitle,
      marginBottom: verticalScale(6),
    },

    input: {
      backgroundColor: CustomColors.backgroundGray,
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(12),
      color: CustomColors.textBlack,
    },

    inputt: {
      color: CustomColors.textBlack,
    },

    inputRow: {
      backgroundColor: CustomColors.backgroundGray,
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(12),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    disabledInput: {
      backgroundColor: CustomColors.backgroundGray2,
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(12),
      borderRadius: moderateScale(10),
    },
  });

  return (
    <View style={styles.parent}>
      <ScrollView contentContainerStyle={styles.container}>
        {Object.entries(customerInfo).map(([sectionName, fields]) => {
          if (!fields || fields.length === 0) return null;

          return (
            <View key={sectionName} style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() =>
                  setExpandedSections((p) =>
                    p.includes(sectionName)
                      ? p.filter((s) => s !== sectionName)
                      : [...p, sectionName]
                  )
                }
              >
                <Text allowFontScaling={false} style={styles.sectionTitle}>
                  {sectionName}
                </Text>

                {editModeSections[sectionName] ? (
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      loadingSections[sectionName] && styles.saveBtnDisabled,
                    ]}
                    onPress={() => handleSave(sectionName)}
                    disabled={!!loadingSections[sectionName]}
                  >
                    {loadingSections[sectionName] ? (
                      <ActivityIndicator
                        size="small"
                        color="#ffffff"
                        style={{ paddingHorizontal: horizontalScale(6) }}
                      />
                    ) : (
                      <Text allowFontScaling={false} style={styles.saveText}>
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setEditModeSections((p) => ({ ...p, [sectionName]: true }));
                      setExpandedSections((p) =>
                        p.includes(sectionName) ? p : [...p, sectionName]
                      );
                    }}
                  >
                    <Feather name="edit" size={20} color={CustomColors.textBlack} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {expandedSections.includes(sectionName) &&
                fields.map((field, i) => {
                  const label = field.display_name;
                  const value = editableFields[label] ?? "";
                  const isDateField =
                    field.field_type?.text === "Date" ||
                    field.field_type?.text === "Datetime";
                  const isEditing = editModeSections[sectionName] && field.can_edit;

                  return (
                    <View key={i} style={styles.field}>
                      <Text allowFontScaling={false} style={styles.label}>
                        {label}
                        {field.is_compulsory ? (
                          <Text style={{ color: "red" }}> *</Text>
                        ) : null}
                      </Text>

                      {isEditing ? (
                        isDateField ? (
                          <TouchableOpacity
                            style={styles.inputRow}
                            onPress={() => openDateTimePicker(label)}
                          >
                            <Text allowFontScaling={false} style={styles.inputt}>
                              {value ? formatDateSafe(value, "DD-MMM-YYYY LT") : "Select date"}
                            </Text>
                            <Feather
                              name="calendar"
                              size={18}
                              color={CustomColors.textBlack}
                            />
                          </TouchableOpacity>
                        ) : (
                          <TextInput
                            allowFontScaling={false}
                            style={styles.input}
                            value={value}
                            onChangeText={(v) => handleChange(label, v)}
                            placeholder={`Enter ${label}`}
                            placeholderTextColor={CustomColors.textGray}
                            keyboardType={
                              field.field_type?.text === "Number"
                                ? "numeric"
                                : "default"
                            }
                          />
                        )
                      ) : (
                        <View style={styles.disabledInput}>
                          <Text style={styles.inputt} allowFontScaling={false}>
                            {isDateField
                              ? formatDateSafe(value, "DD-MMM-YYYY LT")
                              : resolveDisplayValue(value) || "N/A"}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={tempDate ?? new Date()}
          mode={pickerMode}
          onChange={onDateTimeChange}
        />
      )}
    </View>
  );
};

export default CustomerInfoScreen;

const staticStyles = StyleSheet.create({
  noDataContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  noDataImage: { width: 200, height: 200 },
  noDataTitle: { fontSize: moderateScale(18), fontFamily: Fonts.bold },
});