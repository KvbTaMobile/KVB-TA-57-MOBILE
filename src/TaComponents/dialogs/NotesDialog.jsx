import {
  Pressable,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
} from "react-native";
import React, { useState } from "react";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";
import AntDesign from "@expo/vector-icons/AntDesign";
import {  getColors } from "../../globalstyles/Colors";
import { Fonts } from "../../globalstyles/Fonts";
import { useSelector } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";

const NotesDialog = ({ dialogVisible, onClose, onPress }) => {
  const [notes, setNotes] = useState("");

  const isDark = useSelector(state => state.theme.isDark);
 const CustomColors = getCustomColors(isDark);
 const Colors = getColors(isDark);

  const styles = StyleSheet.create({
    screenContainer: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:CustomColors.appScreenColor,
    },
    outerContainer: {
      elevation: 1,
      padding: moderateScale(20),
      borderRadius: moderateScale(8),
    },
    topView: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: verticalScale(10),
    },
    headingText: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(18),
      color: Colors.textBlack,
    },
    middleView: {
      margin: moderateScale(12),
      borderWidth: moderateScale(0.6),
      borderColor: "lightgrey",
      padding: moderateScale(12),
      borderRadius: moderateScale(6),
    },
    bottomView: {
      justifyContent: "flex-end",
      gap: moderateScale(12),
      flexDirection: "row",
      paddingTop: verticalScale(10),
      right: horizontalScale(12),
    },
    collectButton: {
      borderRadius: moderateScale(6),
      width: horizontalScale(70),
      height: verticalScale(35),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.activeBackgroundColor,
    },
    buttonText: {
      fontFamily: Fonts.medium,
      fontSize: moderateScale(14),
      color: Colors.textWhite,
    },
    viewWrapper: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    modalView: {
      position: "absolute",
      top: "40%",
      left: "10%",
      right: "10%",
      backgroundColor: Colors.backgroundWhite,
      borderRadius: moderateScale(8),
      elevation: 1,
    },
  });
  return (
    <View style={styles.screenContainer}>
      <Modal
        animationType="none"
        transparent
        visible={dialogVisible}
        presentationStyle="overFullScreen"
        onDismiss={onClose}
      >
        <View style={styles.viewWrapper}>
          <View style={styles.modalView}>
            <View style={styles.outerContainer}>
              <View style={styles.topView}>
                <Text allowFontScaling={false} style={styles.headingText}>Notes</Text>
                <AntDesign
                  name="close"
                  size={moderateScale(24)}
                  color="black"
                  onPress={onClose}
                />
              </View>
              <View style={styles.middleView}>
                <TextInput allowFontScaling={false}
                  placeholder="Add..."
                  placeholderTextColor={CustomColors.textGray}
                  value={notes}
                  onChangeText={setNotes}
                  style={{color:CustomColors.textBlack}}
                />
              </View>
              <View style={styles.bottomView}>
                <Pressable
                  style={styles.collectButton}
                  onPress={() => {
                    onClose();
                  }}
                >
                  <Text allowFontScaling={false} style={styles.buttonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.collectButton}
                  onPress={() => {
                    onPress(notes);
                    setNotes("");
                  }}
                >
                  <Text allowFontScaling={false} style={styles.buttonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default NotesDialog;


