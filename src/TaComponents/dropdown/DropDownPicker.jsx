import React from "react";
import { StyleSheet } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "../../styles/Metrics";
const DropdownPicker = ({
  data,
  placeholder,
  selectedValue,
  setSelectedValue,
  isSearch = false,
  selectedItemStyle,
  labelField,
  valueField,
  placeholderStyle,
  setSearchInput,
}) => {
  return (
    <Dropdown
      style={styles.dropdown}
      placeholderStyle={[
        styles.placeholderStyle,
        placeholderStyle && placeholderStyle,
      ]}
      selectedTextStyle={[styles.selectedTextStyle, { ...selectedItemStyle }]}
      inputSearchStyle={styles.inputSearchStyle}
      iconStyle={styles.iconStyle}
      data={data}
      dropdownPosition="bottom"
      search={isSearch}
      maxHeight={horizontalScale(300)}
      labelField={labelField}
      valueField={valueField}
      placeholder={placeholder}
      searchPlaceholder="Search..."
      value={selectedValue}
      onChange={(item) => {
        setSelectedValue(item);
      }}
      renderLeftIcon={() => null}
      onChangeText={(text) => setSearchInput(text)}
    />
  );
};
export default DropdownPicker;
const styles = StyleSheet.create({
  dropdown: {},
  icon: {
    marginRight: horizontalScale(5),
  },
  placeholderStyle: {
    fontSize: moderateScale(16),
  },
  selectedTextStyle: {
    // fontSize: moderateScale(16),
    paddingLeft: moderateScale(12),
  },
  iconStyle: {
    width: moderateScale(0),
    height: moderateScale(0),
  },
  inputSearchStyle: {
    height: verticalScale(40),
    fontSize: moderateScale(16),
  },
});
