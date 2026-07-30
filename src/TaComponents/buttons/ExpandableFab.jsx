import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Colors, getColors } from "../../globalstyles/Colors";
import { moderateScale } from "../../globalstyles/Metrics";
import { CustomColors, getCustomColors } from "../../styles/CustomColors";
import { useSelector } from "react-redux";

export default function ExpandableFab({ onCamera, onFile }) {
  const [open, setOpen] = useState(false);

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);


  
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    bottom: 28,
    alignItems: "center",
  },
  mainFab: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: 100,
    backgroundColor: Colors.backgroundBlue,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  smallFab: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: 100,
    backgroundColor: Colors.activeBackgroundColor,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    elevation: 4,
  },
});


  return (
    <View style={styles.container}>
      {open && (
        <>
          <Pressable style={styles.smallFab} onPress={onCamera}>
            <MaterialCommunityIcons name="camera" size={22} color={CustomColors.iconTextColor} />
          </Pressable>

          <Pressable style={styles.smallFab} onPress={onFile}>
            <MaterialCommunityIcons name="file" size={22} color={CustomColors.iconTextColor} />
          </Pressable>
        </>
      )}

      <Pressable style={styles.mainFab} onPress={() => setOpen(!open)}>
        <MaterialCommunityIcons name={open ? "close" : "plus"} size={26} color={CustomColors.iconTextColor} />
      </Pressable>
    </View>
  );
}
