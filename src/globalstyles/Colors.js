export const Colors = {
    // action bar colors
    statusBarColor: "#ffffff",
    actionBarColor: "#ffffff",
    actionBarTextColor: "#000000",
    actionBarIconColor: "#000000",
    appScreenColor: "#ecf0f1",
    navigationBarColor: "#000000",

    
  // bottom nav bar colors
  bottomNavBarColor: "#171717",
  activeBackgroundColor: "#C9A155",
  activeIconColor: "#171717",
  inActiveIconColor: "#ffffff",

  // ripple color
  rippleColor: "transparent",

  // icon colors
  commonIconColor: "#000000",
  secondaryIconColor: "#ffffff",
  iconGray: "#626567",

  // text input colors
  textInputBackgroundColor: "#ecf0f1",
  textInputBorderColor: "#000000",
  textInputPlaceholderColor: "#979a9a",
  textInputTextColor: "#000000",

  // text colors
  textBlack: "#000000",
  textWhite: "#ffffff",
  textGray: "gray",
  textGray2: "#626567",
  textGreen: "#71D561",
  textBlue: "#2874a6",
  textBlue2: "#21CBE5",
  diabledTextColor:"#888",


  //border color
  borderColor:"#bbb",
  disabledBorderColor:"#ccc",
  textLine:"#eee",
  textLabelTitle:"#333",
  textLabelColor:"#555",



  // button colors
  primaryButtonColor: "#71D561",
  buttonBlue: "#133E87",

  // background colors
  backgroundGreen: "#71D561",
  backgroundWhite: "#ffffff",
  backgroundYellow: "#f4d03f",
  backgroundGray: "#d0d3d4",
  backgroundGray2: "#3e3e3e",
  // backgroundBlue: "#21CBE5",
  backgroundBlue: "#C9A155",

  backgroundBlue2: "#5dade2",
  backgroundOrange: "#f5b041",
  backgroundBlack: "#000000",
  disabledbackgroundColor:"#f0f0f0",
  editBackgroundColor:'#f9f9f9',

  // status colors
  statusGreen: "#71D561",
  statusYellow: "#f4d03f",
  statusRed: "#FA4032",

  //emptydata color
  emptyDataTitle:"#333",
  emptyDataText:"#666"

    
}


export const getColors = (isDarkTheme = false) => {
  return {
    // Action Bar Colors
    statusBarColor: isDarkTheme ? "#000000" : "#ffffff",
    actionBarColor: isDarkTheme ? "#1e1e1e" : "#ffffff",
    actionBarTextColor: isDarkTheme ? "#ffffff" : "#000000",
    actionBarIconColor: isDarkTheme ? "#ffffff" : "#000000",
    appScreenColor: isDarkTheme ? "#121212" : "#ecf0f1",
    navigationBarColor: isDarkTheme ? "#000000" : "#000000",

    // Bottom Nav Bar Colors
    bottomNavBarColor: isDarkTheme ? "#171717" : "#171717",
    activeBackgroundColor: isDarkTheme ? "#a38708" : "#C9A155",
    activeIconColor: isDarkTheme ? "#000000" : "#171717",
    inActiveIconColor: isDarkTheme ? "#b0b0b0" : "#ffffff",

    // Ripple Color
    rippleColor: "transparent",

    // Icon Colors
    commonIconColor: isDarkTheme ? "#e0e0e0" : "#000000",
    secondaryIconColor: isDarkTheme ? "#ffffff" : "#ffffff",
    iconGray: isDarkTheme ? "#9e9e9e" : "#626567",

    // Text Input Colors
    textInputBackgroundColor: isDarkTheme ? "#1e1e1e" : "#ecf0f1",
    textInputBorderColor: isDarkTheme ? "#4b5563" : "#000000",
    textInputPlaceholderColor: isDarkTheme ? "#6b7280" : "#979a9a",
    textInputTextColor: isDarkTheme ? "#e0e0e0" : "#000000",

    // Text Colors
    textBlack: isDarkTheme ? "#e0e0e0" : "#000000",
    textWhite: "#ffffff",
    textGray: isDarkTheme ? "#b0b0b0" : "gray",
    textGray2: isDarkTheme ? "#9ca3af" : "#626567",
    textGreen: isDarkTheme ? "#81c784" : "#71D561",
    textBlue: isDarkTheme ? "#64b5f6" : "#2874a6",
    textBlue2: isDarkTheme ? "#4dd0e1" : "#21CBE5",
    diabledTextColor: isDarkTheme ? "#6b7280" : "#888",

    // Border Colors
    borderColor: isDarkTheme ? "#374151" : "#bbb",
    disabledBorderColor: isDarkTheme ? "#4b5563" : "#ccc",
    textLine: isDarkTheme ? "#2a2a2a" : "#eee",
    textLabelTitle: isDarkTheme ? "#e5e7eb" : "#333",
    textLabelColor: isDarkTheme ? "#9ca3af" : "#555",

    // Button Colors
    primaryButtonColor: isDarkTheme ? "#66bb6a" : "#71D561",
    buttonBlue: isDarkTheme ? "#1565c0" : "#133E87",

    // Background Colors
    backgroundGreen: isDarkTheme ? "#2e7d32" : "#71D561",
    backgroundWhite: isDarkTheme ? "#121212" : "#ffffff",
    backgroundYellow: isDarkTheme ? "#f9a825" : "#f4d03f",
    backgroundGray: isDarkTheme ? "#2d2d2d" : "#d0d3d4",
    backgroundGray2: isDarkTheme ? "#1a1a1a" : "#3e3e3e",
    backgroundBlue: isDarkTheme ? "#a38708" : "#C9A155",
    backgroundBlue2: isDarkTheme ? "#0288d1" : "#5dade2",
    backgroundOrange: isDarkTheme ? "#ff8f00" : "#f5b041",
    backgroundBlack: isDarkTheme ? "#e0e0e0" : "#000000",
    disabledbackgroundColor: isDarkTheme ? "#2a2a2a" : "#f0f0f0",
    editBackgroundColor: isDarkTheme ? "#1e1e1e" : "#f9f9f9",

    // Status Colors
    statusGreen: isDarkTheme ? "#66bb6a" : "#71D561",
    statusYellow: isDarkTheme ? "#ffd54f" : "#f4d03f",
    statusRed: isDarkTheme ? "#ef5350" : "#FA4032",

    // Empty Data Colors
    emptyDataTitle: isDarkTheme ? "#e5e7eb" : "#333",
    emptyDataText: isDarkTheme ? "#9ca3af" : "#666",
  };
};