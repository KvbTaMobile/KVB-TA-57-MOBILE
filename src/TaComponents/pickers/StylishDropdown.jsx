import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCustomColors } from "../../styles/CustomColors";
import { horizontalScale, verticalScale, moderateScale } from "../../globalstyles/Metrics";
import { useSelector } from "react-redux";
import { getColors } from "../../globalstyles/Colors";


const ModalDropdown = ({
  visible,
  onClose,
  data,
  selectedValue,
  onSelect,
  label,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const styles = StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: CustomColors.overlayBlack,
    },

    sheet: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      backgroundColor: CustomColors.backgroundWhite,
      borderTopLeftRadius: moderateScale(20),
      borderTopRightRadius: moderateScale(20),
      paddingBottom: verticalScale(24),
      paddingHorizontal: horizontalScale(16),
    },

    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: verticalScale(16),
    },

    title: {
      fontSize: moderateScale(16),
      fontWeight: "700",
      color: CustomColors.textDark,
    },

    item: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: verticalScale(14),
      borderBottomWidth: 0.5,
      borderBottomColor: CustomColors.backgroundGray,
    },

    itemText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDark,
    },
  });
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
        />
      </Pressable>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.header}>
          <Text allowFontScaling={false} style={styles.title}>{label}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={CustomColors.textGray} />
          </TouchableOpacity>
        </View>

        {data.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <Text allowFontScaling={false} style={styles.itemText}>{item.name}</Text>
            {selectedValue?.id === item.id && (
              <Ionicons name="checkmark" size={18} color={CustomColors.textGreen} />
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
};

export default ModalDropdown;




