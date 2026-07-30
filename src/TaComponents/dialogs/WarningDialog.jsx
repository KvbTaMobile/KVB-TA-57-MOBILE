import React from "react";
import { getColors } from "../../globalstyles/Colors";
import { Fonts } from "../../globalstyles/Fonts";
import { View, StyleSheet, Text, Pressable, Modal } from "react-native";
import {
  moderateScale,
  verticalScale,
  horizontalScale,
} from "../../globalstyles/Metrics";
import { getCustomColors } from "../../styles/CustomColors";
import { useSelector } from "react-redux";2222

export default function WarningDialog({
  dialogStatus,
  setDialogStatus,
  onPressEvent,
  userName,
  tittle, // Matched your ProfileScreen spelling 'tittle'
  subTittle,
}) {

  // Close the modal by updating the parent's state
  const closeModal = () => {
    setDialogStatus(false);
  };

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);
 

const styles = StyleSheet.create({
  viewWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Darkened for better focus
  },
  modalView: {
    width: "80%", // More consistent than absolute positioning
    backgroundColor: Colors.backgroundWhite,
    borderRadius: moderateScale(12), // Smoother corners
    elevation: 5,
    shadowColor: CustomColors.textBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    overflow: 'hidden', // Ensures buttons respect border radius
  },
  headerContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(15),
    paddingHorizontal: horizontalScale(10),
  },
  titleText: {
    fontSize: moderateScale(18),
    fontFamily: Fonts.bold, // Use Bold for titles
    color: Colors.textBlack,
  },
  subTitleText: {
    fontSize: moderateScale(14),
    textAlign: "center",
    color: Colors.textGray2,
    paddingBottom: verticalScale(25),
    paddingHorizontal: horizontalScale(15),
    fontFamily: Fonts.regular,
  },
  buttonOuterContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor:CustomColors.errorBorderColorRed,
  },
  pressable1: {
    flex: 1,
    paddingVertical: verticalScale(14),
    backgroundColor: Colors.statusRed,
    justifyContent: "center",
    alignItems: "center",
  },
  pressable2: {
    flex: 1,
    paddingVertical: verticalScale(14),
    backgroundColor: Colors.backgroundWhite,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.medium,
  },
  pressed: {
    opacity: 0.7,
  },
});

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={dialogStatus} // Directly use the prop
      onRequestClose={closeModal}
    >
      <View style={styles.viewWrapper}>
        <View style={styles.modalView}>
          <View style={styles.headerContainer}>
            {userName && (
              <Text allowFontScaling={false} style={styles.titleText}>Hey! {userName}</Text>
            )}
            {tittle && <Text allowFontScaling={false} style={styles.titleText}>{tittle}</Text>}
          </View>

          <View style={{ justifyContent: "center" }}>
            <Text allowFontScaling={false} style={styles.subTitleText}>{subTittle}</Text>
          </View>

          <View style={styles.buttonOuterContainer}>
            {/* YES BUTTON */}
            <Pressable
              style={({ pressed }) =>
                pressed ? [styles.pressable1, styles.pressed] : styles.pressable1
              }
              onPress={() => {
                closeModal();     // 1. Close modal
                onPressEvent();   // 2. Trigger logout
              }}
            >
              <Text allowFontScaling={false} style={[styles.buttonText, { color: Colors.textWhite }]}>
                Yes
              </Text>
            </Pressable>

            {/* NO BUTTON */}
            <Pressable
              style={({ pressed }) =>
                pressed ? [styles.pressable2, styles.pressed] : styles.pressable2
              }
              onPress={closeModal}
            >
              <Text allowFontScaling={false} style={[styles.buttonText, { color: Colors.textBlack }]}>
                No
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
