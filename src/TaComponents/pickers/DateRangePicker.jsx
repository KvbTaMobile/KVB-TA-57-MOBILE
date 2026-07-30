import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import moment from "moment";
import DatePickerDialog from "../dialogs/DatePickerDialog";
import {
  moderateScale,
  horizontalScale,
  verticalScale,
} from "../../styles/Metrics";
import { CustomColors } from "../../styles/CustomColors";

export default function DateRangePicker({
  fromDate,
  toDate,
  onPressFromDate,
  onPressToDate,
}) {
  const [fromDatePickerStatus, setFromDatePickerStatus] = useState(false);
  const [toDatePickerStatus, setToDatePickerStatus] = useState(false);
  return (
    <View>
      <View style={styles.outerContainer}>
        <Pressable
          style={styles.pickerContainer}
          onPress={() => {
            setFromDatePickerStatus(true);
          }}
        >
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={moderateScale(16)}
            color="black"
          />
          {fromDate != "" ? (
            <Text allowFontScaling={false}>{moment(fromDate).format("DD-MMM-YYYY")}</Text>
          ) : (
            <Text allowFontScaling={false}>From Date</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.pickerContainer}
          onPress={() => {
            setToDatePickerStatus(true);
          }}
        >
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={moderateScale(16)}
            color="black"
          />
          {toDate != "" ? (
            <Text allowFontScaling={false}>{moment(toDate).format("DD-MMM-YYYY")}</Text>
          ) : (
            <Text allowFontScaling={false}>To Date</Text>
          )}
        </Pressable>
      </View>
      {fromDatePickerStatus && (
        <DatePickerDialog
          dialogStatus={fromDatePickerStatus}
          setDialogStatus={(value) => {
            setFromDatePickerStatus(value);
          }}
          selected={fromDate}
          onSelect={(value) => {
            onPressFromDate(value);
          }}
        />
      )}
      {toDatePickerStatus && (
        <DatePickerDialog
          dialogStatus={toDatePickerStatus}
          setDialogStatus={(value) => {
            setToDatePickerStatus(value);
          }}
          selected={toDate}
          onSelect={(value) => {
            onPressToDate(value);
          }}
          minimumDate={fromDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  pickerContainer: {
    width: "48%",
    height: verticalScale(35),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: moderateScale(8),
    borderWidth: 0.8,
    borderColor: CustomColors.textBlack,
    flexDirection: "row",
    gap: horizontalScale(8),
  },
});
