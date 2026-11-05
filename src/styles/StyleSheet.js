import { StyleSheet, Platform } from "react-native";
// import { CustomColors } from "./CustomColors";
import { getCustomColors } from "./CustomColors";
import { useSelector } from "react-redux";
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../styles/Metrics";
import { Fonts } from "./Fonts";
export const styles = (isDark) => {
  // const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  return StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: CustomColors.backgroundGray,
    },
    headerTitle: {
      fontFamily: Fonts.bold,
      fontWeight: "bold",
      fontSize: moderateScale(18),
      color: CustomColors.white,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: CustomColors.backgroundGray,
    },
    loadingText: {
      marginTop: verticalScale(10),
      fontSize: moderateScale(16),
      color: CustomColors.darkGray,
      fontFamily: "System",
    },
    noDataContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: moderateScale(20),
    },
    noDataText: {
      fontSize: moderateScale(16),
      color: CustomColors.textLight,
      textAlign: "center",
    },

    // Modal
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: CustomColors.overlayBlack,
    },
    modalContent: {
      width: "90%",
      maxHeight: "85%",
      backgroundColor: CustomColors.modal_background,
      borderRadius: moderateScale(10),
      alignItems: "center",
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(2) },
      shadowOpacity: 0.25,
      shadowRadius: moderateScale(4),
      elevation: moderateScale(5),
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: verticalScale(15),
      paddingHorizontal: horizontalScale(20),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.borderColor,
      width: "100%",
    },
    modalTitle: {
      fontSize: moderateScale(20),
      fontWeight: "bold",
      color: CustomColors.appThemeColor,
      textAlign: "center",
      flex: 1,
    },
    closeButton: {
      position: "absolute",
      right: horizontalScale(15),
      padding: moderateScale(5),
      zIndex: 1,
    },
    modalScrollView: {
      flexGrow: 1,
      width: "100%",
    },
    modalScrollViewContent: {
      paddingVertical: verticalScale(20),
      paddingHorizontal: horizontalScale(20),
    },

    // Inputs
    input: {
      height: verticalScale(50),
      width: "100%",
      borderWidth: moderateScale(1),
      borderColor: CustomColors.borderColor,
      borderRadius: moderateScale(8),
      paddingHorizontal: moderateScale(12),
      marginBottom: verticalScale(12),
      fontSize: moderateScale(16),
      color: CustomColors.textDark,
      backgroundColor: CustomColors.backgroundGray2,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(1) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(1),
      elevation: moderateScale(2),
    },
    inputIcon: {
      marginRight: horizontalScale(10),
    },
    dateInput: {
      flexDirection: "row",
      alignItems: "center",
      height: verticalScale(50),
      width: "100%",
      borderWidth: moderateScale(1),
      borderColor: CustomColors.borderColor,
      borderRadius: moderateScale(8),
      paddingHorizontal: moderateScale(12),
      marginBottom: verticalScale(12),
      backgroundColor: CustomColors.backgroundGray2,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(1) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(1),
      elevation: moderateScale(2),
    },
    dateTextFilled: {
      fontSize: moderateScale(16),
      color: CustomColors.textDark,
      flex: 1,
    },
    dateTextPlaceholder: {
      fontSize: moderateScale(16),
      color: CustomColors.textLight,
      flex: 1,
    },

    // Buttons
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      paddingTop: verticalScale(15),
      paddingBottom: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CustomColors.borderColor,
    },
    applyButton: {
      flex: 1,
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(14),
      borderRadius: moderateScale(8),
      alignItems: "center",
      marginRight: horizontalScale(8),
      shadowColor: CustomColors.primaryBlue,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(2) },
      shadowOpacity: 0.3,
      shadowRadius: moderateScale(3),
      elevation: moderateScale(5),
    },
    applyButtonText: {
      color: CustomColors.white,
      fontWeight: "bold",
      fontSize: moderateScale(16),
    },
    clearButton: {
      flex: 1,
      backgroundColor: isDark ? "#334155" : (CustomColors.white || "#FFFFFF"),
      paddingVertical: verticalScale(14),
      borderRadius: moderateScale(8),
      alignItems: "center",
      borderWidth: moderateScale(1),
      borderColor: isDark ? "#475569" : (CustomColors.borderColor || "#CCCCCC"),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(1) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(1),
      elevation: moderateScale(2),
    },
    clearButtonText: {
      color: isDark ? "#f8fafc" : (CustomColors.textDark || "#333333"),
      fontWeight: "600",
      fontSize: moderateScale(16),
    },

    // Action Sheet (renamed second variants to avoid duplicates)
    actionSheetOption: {
      padding: moderateScale(15),
      backgroundColor: CustomColors.backgroundGray2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.borderColor,
    },
    actionSheetOptionSelected: {
      backgroundColor: CustomColors.linkBlue,
    },
    actionSheetOptionText: {
      fontSize: moderateScale(16),
      color: CustomColors.textDark,
    },

    // Extra (renamed alt styles)
    modalOverlay_alt: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: CustomColors.backgroundGray2,
    },
    actionSheetOption_alt: {
      paddingVertical: verticalScale(20),
      paddingHorizontal: horizontalScale(20),
      borderBottomWidth: moderateScale(1),
      borderBottomColor: CustomColors.backgroundGray2,
      width: "100%",
    },
    actionSheetOptionText_alt: {
      fontSize: moderateScale(16),
      color: CustomColors.textGray,
    },
    actionSheetOptionTextSelected: {
      fontWeight: "bold",
      color: CustomColors.primaryBlue,
    },
    datePickerModalView: {
      backgroundColor: "white",
      width: "100%",
      borderTopLeftRadius: moderateScale(20),
      borderTopRightRadius: moderateScale(20),
      paddingTop: verticalScale(20),
      paddingBottom:
        Platform.OS === "ios" ? verticalScale(40) : verticalScale(20),
      alignItems: "center",
    },
    datePickerConfirmButton: {
      marginTop: verticalScale(20),
      backgroundColor: CustomColors.primaryBlue,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      borderRadius: moderateScale(10),
    },
    datePickerConfirmButtonText: {
      color: "white",
      fontSize: moderateScale(16),
      fontWeight: "bold",
    },
    errorBorder: {
      borderWidth: moderateScale(1.5),
      borderColor: CustomColors.backgroundRed,
      backgroundColor: CustomColors.backgroundGray2,
      borderRadius: moderateScale(8),
    },
  });
}

export const create_styles = (isDark) => {
  const CustomColors = getCustomColors(isDark);
  return StyleSheet.create({
    // Layout
    safeArea: {
      flex: 1,
      backgroundColor: CustomColors.backgroundWhite,
    },
    container: {
      flex: 1,
      paddingHorizontal: horizontalScale(16),
      paddingTop: verticalScale(16),
      backgroundColor: CustomColors.backgroundWhite,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: CustomColors.backgroundWhite,
    },
    loadingText: {
      marginTop: verticalScale(10),
      fontSize: moderateScale(16),
      color: CustomColors.darkGray,
    },

    // Section Cards
    sectionCard: {
      backgroundColor: isDark ? (CustomColors.cardBackground || '#1e293b') : '#ffffff',
      borderRadius: moderateScale(14),
      padding: moderateScale(16),
      marginBottom: verticalScale(14),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
    },
    chatBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: CustomColors.dangerRed,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
    },

    chatBadgeText: {
      color: CustomColors.White,
      fontSize: 10,
      fontWeight: "700",
    },

    itinarySectionCard: {
      backgroundColor: isDark ? (CustomColors.cardBackground || '#1e293b') : '#ffffff',
      borderRadius: moderateScale(14),
      padding: 0,
      marginBottom: verticalScale(14),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
    },

    // Section Headers
    sectionHeader: {
      fontSize: moderateScale(16),
      fontWeight: "700",
      color: CustomColors.appThemeColor,
      marginBottom: verticalScale(14),
      borderBottomWidth: 1,
      borderColor: isDark ? '#334155' : '#f1f5f9',
      paddingBottom: verticalScale(8),
    },
    itinarySectionHeader: {
      fontSize: moderateScale(16),
      fontWeight: "700",
      color: CustomColors.appThemeColor,
      marginBottom: verticalScale(14),
      borderBottomWidth: 1,
      borderColor: isDark ? '#334155' : '#f1f5f9',
      paddingBottom: verticalScale(8),
      padding: moderateScale(10),
    },

    // Labels & Inputs
    label: {
      fontSize: moderateScale(13),
      fontWeight: "600",
      marginTop: verticalScale(12),
      marginBottom: verticalScale(6),
      color: isDark ? '#cbd5e1' : CustomColors.textDarkGray,
    },
    mandatory: {
      color: CustomColors.dangerRed || "#ef4444",
    },
    input: {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#cbd5e1',
      borderRadius: moderateScale(10),
      paddingHorizontal: horizontalScale(14),
      paddingVertical: verticalScale(11),
      fontSize: moderateScale(13),
      color: isDark ? '#f8fafc' : CustomColors.darkGray,
    },
    multilineInput: {
      height: verticalScale(100),
      textAlignVertical: "top",
    },

    // Pickers
    pickerInput: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#cbd5e1',
      borderRadius: moderateScale(10),
      paddingHorizontal: horizontalScale(14),
      paddingVertical: verticalScale(12),
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    },
    pickerInputText: {
      fontSize: moderateScale(13),
      color: isDark ? '#f8fafc' : CustomColors.darkGray,
      flex: 1,
      fontWeight: '500',
    },
    pickerIcon: {
      marginLeft: horizontalScale(8),
    },

    // Date Group
    dateRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: horizontalScale(12),
    },
    dateColumn: {
      flex: 1,
    },

    // Detail Rows
    detailRow: {
      marginBottom: verticalScale(14),
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderRadius: moderateScale(14),
      padding: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
    },
    detailRowHeader: {
      fontWeight: "700",
      fontSize: moderateScale(15),
      color: isDark ? '#60a5fa' : CustomColors.primaryBlue,
      marginBottom: verticalScale(10),
    },

    // File Uploads
    fileList: {
      marginTop: verticalScale(10),
    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderRadius: moderateScale(10),
      padding: moderateScale(10),
      marginTop: verticalScale(8),
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
    },
    fileName: {
      flex: 1,
      fontSize: moderateScale(13),
      color: isDark ? '#f8fafc' : CustomColors.darkGray,
      fontWeight: '500',
    },
    fileActions: {
      flexDirection: "row",
      gap: horizontalScale(8),
      marginLeft: horizontalScale(10),
    },
    viewButton: {
      backgroundColor: CustomColors.appThemeColor,
      padding: moderateScale(8),
      borderRadius: moderateScale(8),
    },
    deleteFileButton: {
      backgroundColor: CustomColors.dangerRed,
      padding: moderateScale(8),
      borderRadius: moderateScale(8),
    },

    // Buttons
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(18),
      borderRadius: moderateScale(10),
      justifyContent: "center",
      marginTop: verticalScale(14),
      alignSelf: "center",
      shadowColor: CustomColors.appThemeColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },
    pickFileButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(18),
      borderRadius: moderateScale(10),
      justifyContent: "center",
      marginTop: verticalScale(14),
      shadowColor: CustomColors.appThemeColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: moderateScale(13.5),
      fontWeight: "700",
      marginLeft: horizontalScale(6),
      letterSpacing: 0.2,
    },
    removeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CustomColors.dangerRed,
      paddingVertical: verticalScale(8),
      paddingHorizontal: horizontalScale(12),
      borderRadius: moderateScale(8),
      alignSelf: "flex-start",
      marginTop: verticalScale(10),
    },
    submitButtonContainer: {
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(12),
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 4,
    },
    submitButtonFullWidth: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(14),
      borderRadius: moderateScale(12),
      shadowColor: CustomColors.appThemeColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    submitButtonDisabled: {
      backgroundColor: isDark ? '#334155' : '#94a3b8',
      shadowOpacity: 0,
      elevation: 0,
    },
    submitButtonText: {
      color: '#ffffff',
      fontSize: moderateScale(16),
      fontWeight: "700",
      letterSpacing: 0.3,
    },

    // Checker Buttons
    checkerButtonsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: moderateScale(10),
    },
    checkerButton: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      padding: moderateScale(12),
      borderRadius: moderateScale(10),
      justifyContent: "center",
    },
    checkerButtonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(16),
      fontWeight: "600",
      marginLeft: horizontalScale(6),
    },
    checkerButtonDisabled: {
      opacity: 0.7,
    },
    approveButton: {
      backgroundColor: CustomColors.statusGreen,
    },
    rejectButton: {
      backgroundColor: CustomColors.statusRed,
    },
    returnButton: {
      backgroundColor: CustomColors.accentOrange,
    },
    forwardButton: {
      backgroundColor: CustomColors.statusBlue,
    },

    // Date Picker Modal
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: CustomColors.backgroundtransparent,
    },
    datePickerModalView: {
      backgroundColor: "white",
      width: "100%",
      borderTopLeftRadius: moderateScale(20),
      borderTopRightRadius: moderateScale(20),
      paddingTop: verticalScale(20),
      paddingBottom:
        Platform.OS === "ios" ? verticalScale(40) : verticalScale(20),
      alignItems: "center",
    },
    datePickerConfirmButton: {
      marginTop: verticalScale(20),
      backgroundColor: CustomColors.primaryBlue,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(20),
      borderRadius: moderateScale(10),
    },
    datePickerConfirmButtonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(16),
      fontWeight: "bold",
    },

    // Action Sheet
    actionSheetOption: {
      paddingVertical: verticalScale(20),
      paddingHorizontal: horizontalScale(20),
      borderBottomWidth: moderateScale(1),
      borderBottomColor: CustomColors.backgroundGray2,
      width: "100%",
    },
    actionSheetOptionSelected: {
      backgroundColor: CustomColors.backgroundGray,
    },
    actionSheetOptionText: {
      fontSize: moderateScale(16),
      color: CustomColors.darkGray,
    },
    actionSheetOptionTextSelected: {
      fontWeight: "bold",
      color: CustomColors.primaryBlue,
    },

    // Error
    errorBorder: {
      borderWidth: moderateScale(1.5),
      borderColor: CustomColors.backgroundRed,
      backgroundColor: CustomColors.backgroundGray2,
      borderRadius: moderateScale(8),
    },

    // File Section
    fileSectionContainer: {
      marginBottom: verticalScale(10),
      borderWidth: moderateScale(1),
      borderColor: CustomColors.lightGray,
      borderRadius: moderateScale(8),
      overflow: "hidden",
    },
    fileSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: moderateScale(12),
      borderBottomWidth: moderateScale(1),
      borderBottomColor: CustomColors.lightGray,
    },

    // Radio
    radioGroup: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: verticalScale(10),
    },
    radioItem: {
      flexDirection: "row",
      alignItems: "center",

    },
    radioLabel: {
      marginLeft: horizontalScale(8),
      fontSize: moderateScale(16),
      color: CustomColors.textGray,
    },
    // Add this to your create_styles.js or local styles
    floatingChatButton: {
      position: 'absolute',
      bottom: verticalScale(100), // Positioned above the submit button container
      right: moderateScale(20),
      backgroundColor: CustomColors.appThemeColor,
      width: moderateScale(56),
      height: moderateScale(56),
      borderRadius: moderateScale(28),
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5, // For Android shadow
      shadowColor: CustomColors.textBlack, // For iOS shadow
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      zIndex: 1000,
    }
  });
}