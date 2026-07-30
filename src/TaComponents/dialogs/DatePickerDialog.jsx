import React, { useState } from "react";
import moment from "moment";
import DatePicker from "react-native-modern-datepicker";
import { Modal, StyleSheet, View, Text, Pressable } from "react-native";
import { Fonts } from "../../styles/Fonts";
import { CustomColors } from "../../styles/CustomColors";
import {
  verticalScale,
  horizontalScale,
  moderateScale,
} from "../../styles/Metrics";

export default function DatePickerDialog({
  dialogStatus,
  setDialogStatus,
  onSelect,
  selected,
  minimumDate,
  maximumDate,
  current,
}) {
  const [isModalVisible, setModalVisible] = useState(dialogStatus);
  const toggleModalVisibility = () => {
    setModalVisible(!isModalVisible);
    setDialogStatus(false);
  };

  return (
    <View style={styles.screenContainer}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        presentationStyle="overFullScreen"
        onDismiss={toggleModalVisibility}
      >
        <View style={styles.viewWrapper}>
          <View
            style={[
              styles.modalView,
              { backgroundColor: CustomColors.backgroundWhite },
            ]}
          >
            <Pressable
              style={styles.closeButtonContainer}
              onPress={() => {
                toggleModalVisibility();
              }}
            >
              <Text allowFontScaling={false}
                style={[
                  styles.closeButtonText,
                  { color: CustomColors.iconGray },
                ]}
              >
                Close
              </Text>
            </Pressable>
            <DatePicker
              style={styles.calenderContainer}
              mode="calendar"
              current={moment(current).format("YYYY/MM/DD")}
              selected={moment(selected).format("YYYY/MM/DD")}
              /* minimumDate={minimumDate ? minimumDate : null}
              maximumDate={maximumDate ? maximumDate : null} */
              minimumDate={
                minimumDate ? moment(minimumDate).format("YYYY/MM/DD") : null
              }
              maximumDate={
                maximumDate ? moment(maximumDate).format("YYYY/MM/DD") : null
              }
              onDateChange={(date) => {
                const dateParts = date.split("/");
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1;
                const day = parseInt(dateParts[2]);
                const dateObject = new Date(year, month, day);

                onSelect(dateObject);
                toggleModalVisibility();
              }}
              onTimeChange={() => {}}
              onMonthYearChange={() => {}}
              options={{
                backgroundColor: CustomColors.backgroundWhite,
                defaultFont: Fonts.regular,
                textFontSize: moderateScale(14),
                headerFont: Fonts.medium,
                textHeaderFontSize: moderateScale(14),
                textHeaderColor: CustomColors.textBlack,
                textDefaultColor: CustomColors.textBlack,
                selectedTextColor: CustomColors.textWhite,
                mainColor: CustomColors.textBlack,
                // textSecondaryColor: "",
                borderColor: "transparent",
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  viewWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CustomColors.overlayBlack,
  },
  modalView: {
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: moderateScale(10),
    flexWrap: "wrap",
  },
  calenderContainer: {
    borderRadius: moderateScale(10),
  },
  closeButtonContainer: {
    alignSelf: "flex-end",
    paddingTop: verticalScale(20),
    paddingHorizontal: horizontalScale(20),
  },
  closeButtonText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: CustomColors.textBlue,
  },
});
