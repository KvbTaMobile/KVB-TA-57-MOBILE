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
      backgroundColor: CustomColors.white,
      paddingVertical: verticalScale(14),
      borderRadius: moderateScale(8),
      alignItems: "center",
      borderWidth: moderateScale(1),
      borderColor: CustomColors.borderColor,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(1) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(1),
      elevation: moderateScale(2),
    },
    clearButtonText: {
      color: CustomColors.darkGray,
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
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(16),
      padding: verticalScale(20),
      marginBottom: verticalScale(20),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(4) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(6),
      elevation: moderateScale(5),
      borderWidth: moderateScale(1),
      borderColor: CustomColors.lightGray,
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
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(16),
      padding: 0,
      marginBottom: verticalScale(20),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: horizontalScale(0), height: verticalScale(4) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(6),
      elevation: moderateScale(5),
      borderWidth: moderateScale(1),
      borderColor: CustomColors.lightGray,
    },

    // Section Headers
    sectionHeader: {
      fontSize: moderateScale(20),
      fontWeight: "700",
      color: CustomColors.appThemeColor,
      marginBottom: verticalScale(16),
      borderBottomWidth: moderateScale(1),
      borderColor: CustomColors.appThemeColor,
      paddingBottom: verticalScale(6),
    },
    itinarySectionHeader: {
      fontSize: moderateScale(22),
      fontWeight: "700",
      color: CustomColors.appThemeColor,
      marginBottom: verticalScale(16),
      borderBottomWidth: moderateScale(1),
      borderColor: CustomColors.appThemeColor,
      paddingBottom: verticalScale(6),
      padding: moderateScale(10),
    },

    // Labels & Inputs
    label: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      marginTop: verticalScale(16),
      marginBottom: verticalScale(6),
      color: CustomColors.textDarkGray,
    },
    mandatory: {
      color: CustomColors.dangerRed,
    },
    input: {
      backgroundColor: CustomColors.inputBackground,
      borderWidth: moderateScale(1),
      borderColor: CustomColors.mediumGray,
      borderRadius: moderateScale(12),
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(12),
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
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
      borderWidth: moderateScale(1),
      borderColor: CustomColors.mediumGray,
      borderRadius: moderateScale(12),
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(14),
      backgroundColor: CustomColors.inputBackground,
    },
    pickerInputText: {
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
      flex: 1,
    },
    pickerIcon: {
      marginLeft: horizontalScale(10),
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
      marginBottom: verticalScale(16),
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(12),
      padding: 0,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: moderateScale(1),
      borderColor: CustomColors.borderColor,
    },
    detailRowHeader: {
      fontWeight: "700",
      fontSize: moderateScale(16),
      color: CustomColors.primaryBlue,
      marginBottom: verticalScale(10),
    },

    // File Uploads
    fileList: {
      marginTop: verticalScale(12),

    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: CustomColors.backgroundGray2,
      borderRadius: moderateScale(8),
      padding: moderateScale(10),
      marginTop: verticalScale(8),
    },
    fileName: {
      flex: 1,
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
    },
    fileActions: {
      flexDirection: "row",
      gap: horizontalScale(10),
      marginLeft: horizontalScale(10),
    },
    viewButton: {
      backgroundColor: CustomColors.appThemeColor,
      padding: moderateScale(6),
      borderRadius: moderateScale(8),
    },
    deleteFileButton: {
      backgroundColor: CustomColors.dangerRed,
      padding: moderateScale(6),
      borderRadius: moderateScale(8),
    },

    // Buttons
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CustomColors.appThemeColor,
      padding: moderateScale(14),
      borderRadius: moderateScale(12),
      justifyContent: "center",
      marginTop: verticalScale(16),
      width: moderateScale(300),
      alignSelf: "center",
    },
    pickFileButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CustomColors.appThemeColor,
      padding: moderateScale(14),
      borderRadius: moderateScale(12),
      justifyContent: "center",
      marginTop: verticalScale(16),
    },
    buttonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(14),
      fontWeight: "600",
      marginLeft: horizontalScale(6),


    },
    removeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CustomColors.dangerRed,
      padding: moderateScale(10),
      borderRadius: moderateScale(10),
      alignSelf: "flex-start",
      marginTop: verticalScale(12),
    },
    submitButtonContainer: {
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(10),
      backgroundColor: CustomColors.backgroundWhite,
      borderTopWidth: moderateScale(1),
      borderTopColor: CustomColors.lightGray,
    },
    submitButtonFullWidth: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(16),
      borderRadius: moderateScale(14),
    },
    submitButtonDisabled: {
      backgroundColor: CustomColors.textGray,
    },
    submitButtonText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(18),
      fontWeight: "bold",
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