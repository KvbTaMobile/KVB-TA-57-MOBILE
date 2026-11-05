// CustomActionSheetPicker.js
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSelector } from "react-redux";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCustomColors } from "../../styles/CustomColors";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../styles/Metrics";

const CustomActionSheetPicker = ({
  pickerStatus,
  setPickerStatus,
  title,
  optionsData,
  RenderItem,
  onPress,
  selected,
  onSearch,
  isLoading,
  isFetchingMore,
  onEndReached,
  hasMoreData,
}) => {
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  //console.log(optionsData)
  const styles = StyleSheet.create({
    keyboardAvoidingContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      flex: 1,
      backgroundColor: CustomColors.backgroundtransparent,
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: CustomColors.backgroundWhite,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '70%',
      shadowColor: CustomColors.textBlack,
      shadowOffset: {
        width: 0,
        height: -3,
      },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.lightGray,
    },
    title: {
      fontSize: 19,
      fontWeight: '600',
      color: CustomColors.textDarkGray,
    },
    closeButton: {
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    closeButtonText: {
      fontSize: 16,
      color: CustomColors.primaryBlue,
      fontWeight: '500',
    },
    searchContainer: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.textGray,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 15,
      fontSize: 16,
      color: CustomColors.darkGray,
      marginRight: 10,
      backgroundColor: CustomColors.borderLight + '50',
    },
    loadingIndicator: {
      marginLeft: 'auto',
    },
    flatListContent: {
      paddingBottom: 20,
    },
    emptyListText: {
      textAlign: 'center',
      marginTop: 30,
      fontSize: 16,
      color: CustomColors.darkGray,
      paddingHorizontal: 20,
    },
  });
  return (
    <Modal
      visible={pickerStatus}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setPickerStatus(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <Text allowFontScaling={false} style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={() => setPickerStatus(false)} style={styles.closeButton}>
                <Text allowFontScaling={false} style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {onSearch && (
              <View style={styles.searchContainer}>
                <TextInput allowFontScaling={false}
                  style={styles.searchInput}
                  placeholder="Search..."
                  onChangeText={onSearch}
                  placeholderTextColor={CustomColors.darkGray}
                />
                {isLoading && (
                  <ActivityIndicator
                    size="small"
                    color={CustomColors.appThemeColor}
                    style={styles.loadingIndicator}
                  />
                )}
              </View>
            )}

            <FlatList
              data={optionsData || []}
              keyExtractor={(item, index) => index.toString()}
              nestedScrollEnabled={true}
              onEndReachedThreshold={0.8}
              onEndReached={() => {
                if (hasMoreData && !isFetchingMore && typeof onEndReached === 'function') {
                  onEndReached();
                }
              }}
              renderItem={({ item }) => {
                if (typeof RenderItem === 'function') {
                  return (
                    <RenderItem
                      options={item}
                      onPress={onPress}
                      setPickerStatus={setPickerStatus}
                      selected={selected}
                    />
                  );
                }
                const isSelected = selected && (selected.value === item.value || selected === item.value);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (typeof onPress === 'function') onPress(item);
                      if (typeof setPickerStatus === 'function') setPickerStatus(false);
                    }}
                    style={{
                      paddingVertical: verticalScale(12),
                      paddingHorizontal: horizontalScale(16),
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: CustomColors.borderColor,
                      backgroundColor: isSelected ? (CustomColors.primaryLight || '#e0f2fe') : 'transparent',
                    }}
                  >
                    <Text allowFontScaling={false} style={{
                      fontSize: moderateScale(14),
                      color: isSelected ? (CustomColors.primaryBlue || CustomColors.textBlack) : CustomColors.textBlack,
                    }}>
                      {item?.label || item?.name || String(item)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                !isLoading && <Text allowFontScaling={false} style={styles.emptyListText}>No items found.</Text>
              )}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.flatListContent}
            />
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};



export default CustomActionSheetPicker;