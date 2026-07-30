import { useSelector } from "react-redux";
import { getColors } from "../../globalstyles/Colors";
import { Fonts } from "../../globalstyles/Fonts";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "../../globalstyles/Metrics";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { getCustomColors } from "../../styles/CustomColors";

export default function InputTextBox({
  label,
  value,
  onChangeEvent,
  hint,
  editable,
  keyboard,
}) {

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);

  
const styles = StyleSheet.create({
  inputTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  label: {
    color: Colors.textBlack,
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    marginRight: "5%",
    width: "25%",
  },
  textInput: {
    width: "70%",
    height: verticalScale(45),
    padding: moderateScale(8),
    fontFamily: "regular",
    fontSize: moderateScale(14),
    color: Colors.textBlack,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.backgroundWhite,
    borderWidth: moderateScale(0.8),
    borderColor: "lightgrey",
  },
});

  return (
    <View style={styles.inputTextContainer}>
      <Text allowFontScaling={false} style={styles.label}>{label}</Text>
      <TextInput allowFontScaling={false}
        style={styles.textInput}
        placeholder={hint}
        placeholderTextColor={Colors.textInputPlaceholderColor}
        keyboardType={keyboard ? keyboard : "default"}
        value={value}
        editable={editable}
        onChangeText={onChangeEvent}
        autoCapitalize="none"
        //  autoComplete={false}
        autoCorrect={false}
        autoFocus={false}
      ></TextInput>
    </View>
  );
}
