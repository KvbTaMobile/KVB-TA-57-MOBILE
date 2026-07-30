import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Colors, getColors } from "../../globalstyles/Colors";
import { Fonts } from "../../globalstyles/Fonts";
import InputTextBox from "../../components/buttons/InputTextBox";
import AntDesign from "@expo/vector-icons/AntDesign";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";
import DateTimePickerModal  from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import moment from "moment";
import { useSelector } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";

const RemarksDialog = ({
  from,
  dialogVisible,
  onClose,
  onPress,
  nameValue,
  detailValue,
  dueDateValue,
  remarkValue,
  onChangeName,
  onChangeDetail,
  onChangeDueDate,
  onChangeRemark,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mode, setMode] = useState("date");
  const [tempDate, setTempDate] = useState(null);

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);
  
  const openPicker = () => {
    setTempDate(null);
    setMode("date");          // ✅ RESET MODE
    setShowDatePicker(true);
  };
  
  const onChange = (event, selectedDate) => {
    // User cancelled
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      setMode("date");        // ✅ RESET MODE
      setTempDate(null);
      return;
    }
  
    // DATE selected → move to TIME
    if (mode === "date") {
      setTempDate(selectedDate);  // ✅ STORE DATE
      setMode("time");
      return;
    }
  
    // TIME selected → finalize
    if (mode === "time") {
      const finalDate = new Date(tempDate);
      finalDate.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0
      );
  
      const formattedUTC = moment(finalDate).format(
        "YYYY-MM-DD HH:mm:ss"
      );
  
      onChangeDueDate(formattedUTC);
  
      setShowDatePicker(false);
      setMode("date");        // ✅ RESET
      setTempDate(null);
    }
  };

  const styles = StyleSheet.create({
    viewWraper: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    modalView: {
      position: "absolute",
      bottom: verticalScale(0.5),
      width: "100%",
      // height: verticalScale(300),
      backgroundColor: Colors.backgroundWhite,
      borderTopLeftRadius: moderateScale(20),
      borderTopRightRadius: moderateScale(20),
    },
    modalContainer: {
      paddingHorizontal: horizontalScale(15),
      paddingVertical: verticalScale(20),
    },
    headingView: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    headingText: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(16),
      color: Colors.textBlack,
    },
    buttonView: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: moderateScale(20),
    },
    button: {
      width: moderateScale(70),
      padding: moderateScale(10),
      borderRadius: moderateScale(8),
      backgroundColor: Colors.backgroundBlue,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonText: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(14),
      color: Colors.textWhite,
    },
    inputBox: {
      paddingVertical: verticalScale(30),
    },
  });
  


  return (
    <>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : null}>
        <Modal
          animationType="none"
          transparent
          visible={dialogVisible}
          presentationStyle="overFullScreen"
          onDismiss={onClose}
        >
          <View style={styles.viewWraper}>
            <View style={styles.modalView}>
              <View style={styles.modalContainer}>
                <View style={styles.headingView}>
                  <Text allowFontScaling={false} style={styles.headingText}>{from}</Text>
                  <AntDesign
                    name="close"
                    size={moderateScale(24)}
                    color="black"
                    onPress={onClose}
                  />
                </View>
                <View style={styles.inputBox}>
                  {from == "Rescheduled" && (
                    <>
                      <InputTextBox
                        label={"Name"}
                        value={nameValue}
                        hint={"Name..."}
                        onChangeEvent={onChangeName}
                      />
                      <InputTextBox
                        label={"Details"}
                        value={detailValue}
                        hint={"Details..."}
                        onChangeEvent={onChangeDetail}
                      />
                      <View style={{ flexDirection: "row" }}>
                        <InputTextBox
                          label={"Due Date"}
                          value={
                            dueDateValue
                              ? moment(dueDateValue).format("DD-MMM-YYYY LT")
                              : ""
                          }
                          hint={"Due Date..."}
                          // onChangeEvent={onChangeDueDate}
                          editable={false}
                        />
                        <MaterialCommunityIcons
                          name="calendar-month"
                          size={moderateScale(30)}
                          color="grey"
                          style={{
                            right: horizontalScale(35),
                            top: verticalScale(7),
                          }}
                          onPress={() => {
                            setShowDatePicker(!showDatePicker);
                          }}
                        />
                      </View>
                    </>
                  )}
                  {(from == "No contact" ||
                    from == "Call back" ||
                    from === "Promised to pay" ||
                    from === "Dispute") && (
                    <>
                      <View style={{ flexDirection: "row" }}>
                        <InputTextBox
                          label={"Due Date"}
                          value={
                            dueDateValue
                              ? moment(dueDateValue).format("DD-MMM-YYYY LT")
                              : ""
                          }
                          hint={"Due Date..."}
                          // onChangeEvent={onChangeDueDate}
                          editable={false}
                        />
                        <MaterialCommunityIcons
                          name="calendar-month"
                          size={moderateScale(25)}
                          color="rgb(81, 79, 79)"
                          style={{
                            right: horizontalScale(32),
                            top: verticalScale(10),
                          }}
                          onPress={() => {
                            setShowDatePicker(!showDatePicker);
                          }}
                        />
                      </View>
                    </>
                  )}
                  <InputTextBox
                    label={"Remarks"}
                    value={remarkValue}
                    hint={"Remarks..."}
                    onChangeEvent={onChangeRemark}
                  />
                  <View style={styles.buttonView}>
                    <Pressable style={styles.button} onPress={onClose}>
                      <Text allowFontScaling={false} style={styles.buttonText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.button} onPress={onPress}>
                      <Text allowFontScaling={false} style={styles.buttonText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
      {showDatePicker && (
        <DateTimePickerModal
        value={new Date()}
        mode={mode}
        minimumDate={new Date()}
        is24Hour={false}
        display={Platform.OS === "ios" ? "inline" : "default"}
        onChange={onChange}
        />
      )}
    </>
  );
};

export default RemarksDialog;


