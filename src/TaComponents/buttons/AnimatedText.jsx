import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Dimensions } from "react-native";
import { moderateScale } from "../../globalstyles/Metrics";
import { useSelector } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";
import { getColors } from "../../globalstyles/Colors";

const { width } = Dimensions.get("window");

const AnimatedText = () => {
  const translateX = useRef(new Animated.Value(-width)).current; // Start outside left
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const Colors = getColors(isDark);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0, 
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const styles = StyleSheet.create({
    vsolvText: {
      fontSize: moderateScale(11),
      color: CustomColors.adsGreyText,
      fontStyle:'italic',
      fontWeight:"bold"
    },
  });

  return (
    <Animated.View style={{ transform: [{ translateX }] }}>
      <Text allowFontScaling={false} style={styles.vsolvText}>vsolv product</Text>
    </Animated.View>
  );
};



export default AnimatedText;
