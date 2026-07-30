import { TouchableOpacity, Animated,StyleSheet,View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useRef, useState } from "react";
import { horizontalScale, moderateScale, verticalScale } from "../../globalstyles/Metrics";
import {  getColors } from "../../globalstyles/Colors";
import {  getCustomColors } from "../../styles/CustomColors";
import { useSelector } from "react-redux";

const CustomFloatingAction = ({ onCameraPress, onFilePress }) => {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);

  const toggleMenu = () => {
    Animated.spring(animation, {
      toValue: open ? 0 : 1,
      useNativeDriver: true,
    }).start();
    setOpen(!open);
  };

  const cameraStyle = {
    transform: [
      { scale: animation },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -moderateScale(60)],
        }),
      },
    ],
    opacity: animation,
  };

  const fileStyle = {
    transform: [
      { scale: animation },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -moderateScale(120)],
        }),
      },
    ],
    opacity: animation,
  };

  const fabStyles = StyleSheet.create({
    container: {
      position: "absolute",
      right: horizontalScale(20),
      bottom: verticalScale(70),
      alignItems: "center",
    },
    mainBtn: {
      width: moderateScale(50),
      height: moderateScale(50),
      borderRadius: moderateScale(25),
      backgroundColor: Colors.backgroundBlue,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
    },
    actionBtn: {
      position: "absolute",
      width: moderateScale(44),
      height: moderateScale(44),
      borderRadius: moderateScale(22),
      backgroundColor: Colors.backgroundBlue,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
    },
  });

  return (
    <View style={fabStyles.container}>
      {/* File */}
      <Animated.View style={[fabStyles.actionBtn, fileStyle]}>
        <TouchableOpacity onPress={onFilePress}>
          <MaterialCommunityIcons
            name="file-upload"
            size={moderateScale(22)}
            color={CustomColors.iconTextColor}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Camera */}
      <Animated.View style={[fabStyles.actionBtn, cameraStyle]}>
        <TouchableOpacity onPress={onCameraPress}>
          <MaterialCommunityIcons
            name="camera"
            size={moderateScale(22)}
            color={CustomColors.iconTextColor}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Main FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleMenu}
        style={fabStyles.mainBtn}
      >
        <MaterialCommunityIcons
          name={open ? "close" : "plus"}
          size={moderateScale(26)}
          color={CustomColors.iconTextColor}
        />
      </TouchableOpacity>
    </View>
  );
};

export default CustomFloatingAction;



  