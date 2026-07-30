import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React from "react";
import { Colors, getColors } from "../../globalstyles/Colors";
import { Fonts } from "../../globalstyles/Fonts";
import {
  moderateScale,
  verticalScale,
  horizontalScale,
} from "../../globalstyles/Metrics";
import AntDesign from "@expo/vector-icons/AntDesign";
import InputTextBox from "../inputs/InputTextBox";
import { useSelector } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";

const RescheduleDialog = ({
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

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);

  
const styles = StyleSheet.create({
  screenContainer: {
    // alignSelf: "center",
    justifyContent: "center",
  },
  modalView: {
    top: "20%",
    backgroundColor: "lightblue",
    height: verticalScale(500),
    width: horizontalScale(320),
    alignSelf: "center",
    borderRadius: moderateScale(8),
    padding: 20,
    gap: moderateScale(20),
  },
  viewWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  buttonView: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: moderateScale(20),
  },
  button: {
    padding: moderateScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: "lightgrey",
  },
  headingText: {
    color: Colors.textBlack,
    fontFamily: Fonts.medium,
    fontSize: moderateScale(16),
  },
});
  return (
    <KeyboardAvoidingView
      style={styles.screenContainer}
      behavior={Platform.OS === "ios" ? "padding" : null}
    >
      <Modal
        animationType="none"
        transparent
        visible={dialogVisible}
        presentationStyle="overFullScreen"
        // onDismiss={onClose}
      >
        <View style={styles.modalView}>
          <View style={styles.viewWrapper}>
            <Text allowFontScaling={false} style={styles.headingText}>{from}</Text>
            <AntDesign
              name="close"
              size={moderateScale(24)}
              color="black"
              onPress={onClose}
            />
          </View>
          <InputTextBox
            label={"Remarks"}
            value={remarkValue}
            hint={"Remarks..."}
            onChangeEvent={onChangeRemark}
          />
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
          <InputTextBox
            label={"Due Date"}
            value={dueDateValue}
            hint={"Due Date..."}
            onChangeEvent={onChangeDueDate}
          />
          <View style={styles.buttonView}>
            <Pressable style={styles.button} onPress={onClose}>
              <Text allowFontScaling={false}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onPress}>
              <Text allowFontScaling={false}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default RescheduleDialog;

