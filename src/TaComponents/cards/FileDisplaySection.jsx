import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from "react-redux";
import { getCustomColors } from '../../styles/CustomColors'; // Assuming CustomColors is well-defined
import { horizontalScale, verticalScale, moderateScale } from "../../globalstyles/Metrics";


const FileDisplaySection = ({ title, files, handleViewFile, handleWebViewFile, removeFile, isEditable }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Changed initial state to true for immediate visibility
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  if (!files || files.length === 0) return null;
  const styles = StyleSheet.create({
    container: {
      marginVertical: verticalScale(12),
      borderRadius: moderateScale(10),
      backgroundColor: CustomColors.appScreenColor,
      shadowColor: CustomColors.actionBarIconColor,
      shadowOffset: { width: 0, height: verticalScale(1) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(3),
      elevation: 2,
      overflow: 'hidden',
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(14),
      paddingHorizontal: horizontalScale(16),
      backgroundColor: CustomColors.appScreenColor,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.borderColor,
    },

    title: {
      fontSize: moderateScale(17),
      fontWeight: '600',
      color: CustomColors.textBlack,

    },

    fileList: {
      paddingHorizontal: horizontalScale(16),
      paddingTop: verticalScale(8),
      paddingBottom: verticalScale(12),
    },

    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: CustomColors.backgroundGray,
      borderRadius: moderateScale(8),
      padding: moderateScale(12),
      marginVertical: verticalScale(6),
      shadowColor: CustomColors.shadowColor,
      shadowOffset: { width: 0, height: verticalScale(0.5) },
      shadowOpacity: 0.08,
      shadowRadius: moderateScale(2),
      elevation: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: CustomColors.borderColor,
    },

    fileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: horizontalScale(12),
    },

    fileIcon: {
      marginRight: horizontalScale(10),
      color: CustomColors.textBlue
    },

    fileName: {
      flexShrink: 1,
      color: CustomColors.textDarkGray,
      fontSize: moderateScale(14),
    },

    fileActions: {
      flexDirection: 'row',
      gap: horizontalScale(10),
    },

    actionButton: {
      backgroundColor: CustomColors.accentBlue,
      padding: moderateScale(8),
      borderRadius: moderateScale(20),
      width: moderateScale(36),
      height: moderateScale(36),
      justifyContent: 'center',
      alignItems: 'center',
    },

    removeButton: {
      backgroundColor: CustomColors.dangerRed,
    },

    disabledButton: {
      backgroundColor: CustomColors.lightGray,
    },
  });
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityLabel={`Toggle ${title} section`}
        activeOpacity={0.7} // Added activeOpacity for better touch feedback
      >
        <Text allowFontScaling={false} style={styles.title}>{title}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'} // Using solid chevrons for a slightly bolder look
          size={20}
          color={CustomColors.textBlack} // Changed color to a primary text color
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.fileList}>
          {files.map((file, index) => (
            <View
              key={file.uri || file.id || index.toString()}
              style={styles.fileItem}
            >
              <View style={styles.fileInfo}>
                <Ionicons
                  name="document" // Using a solid document icon
                  size={18}
                  color={CustomColors.iconColor} // A neutral icon color
                  style={styles.fileIcon}
                />
                <Text allowFontScaling={false}
                  style={styles.fileName}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {file.name || file.file_name}
                </Text>
              </View>

              <View style={styles.fileActions}>
                {/* View Button */}
                <TouchableOpacity
                  onPress={() => {
                    if (file.uri && typeof handleViewFile === 'function') {
                      handleViewFile(file);
                    } else if (typeof handleWebViewFile === 'function') {
                      handleWebViewFile(file);
                    } else if (typeof handleViewFile === 'function') {
                      handleViewFile(file);
                    }
                  }}
                  style={styles.actionButton}
                  accessibilityLabel={`View file ${file.name || file.file_name}`}
                  activeOpacity={0.7}
                >
                  <Ionicons name="eye" size={16} color={CustomColors.textBlue} />
                </TouchableOpacity>

                {/* Remove Button */}
                <TouchableOpacity
                  onPress={() => {
                    if (typeof removeFile === 'function') {
                      removeFile(file.uri || file.id);
                    }
                  }}
                  style={[
                    styles.actionButton,
                    styles.removeButton, // Specific style for remove button
                    !isEditable && styles.disabledButton,
                  ]}
                  accessibilityLabel={`Remove file ${file.name || file.file_name}`}
                  disabled={!isEditable}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="trash"
                    size={16}
                    color={isEditable ? CustomColors.white : CustomColors.darkGray}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};



export default FileDisplaySection;
