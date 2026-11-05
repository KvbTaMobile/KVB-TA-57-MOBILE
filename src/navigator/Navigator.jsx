import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Colors } from "../globalstyles/Colors";
import { getCustomColors } from "../styles/CustomColors";
import LoginScreen from "../screens/user/LoginScreen";
import DrawerNavigator from "./DrawerNavigator";
// import RouteMapScreen from "../screens/map/RouteMapScreen";
//import HomeScreen from "../screens/main/HomeScreen";
// import TransactionHistory from "../screens/main/TransactionHistoryScreen";
import { Profiler } from "react";
import ProfileScreen from "../screens/user/ProfileScreen";
import SettingsScreen from "../screens/user/SettingsScreen";
// import CollectionDetailsScreen from "../screens/collection/CollectionDetailsScreen";
// import SaleDetails from "../screens/collection/SalesDetails";
// import LoanDetails from "../screens/collection/LoanDetails";
// import PayScreen from "../screens/collection/PayScreen";
// import DynamicQRScreen from "../screens/common/DynamicQRScreen";
// import SplashScreenAnimated from "../screens/user/SplashScreen";
// import CustomerInfo from "../screens/user/CustomerInfo";
// import DashboardScreen from "../screens/common/DashboardScreen";
import TAStackNavigator from "./TAStackNavigator";
// import StockStackNavigator from './StockStackNavigator';
// import VendorStackNavigator from './VenodorStackNavigator';
// import BranchIndentTabs from "./BranchIndentTabs";
// import BranchRequestDetailsScreen from "../screens/prpoScreens/BranchRequestDetailsScreen";
// import CreateBIRScreen from "../screens/prpoScreens/CreateBIR";
// import EditBIRScreen from "../screens/prpoScreens/EditBIR"
// import EditIndependentRequestScreen from "../screens/prpoScreens/EditIndependentRequest";
// import CreateIndependentRequestScreen from "../screens/prpoScreens/CreateIndependentRequest";
import { navigationRef } from "./NavigationService";
// import LeaveStackNavigator from "./LeaveStackNavigator";
// import ChartScreen from "../screens/collection/ChartScreen";
// import VisitSiteSummaryScreen from "../screens/main/VisitSiteSummaryScreen";
// import SiteVisitScreen from "../screens/collection/SiteVisitScreen";
// import VisitSiteFullScreen from "../screens/main/VisitSiteFullScreen";
// import SiteVisitAddScreen from "../screens/collection/SiteVisitAddScreen";
// import TicketSummaryScreen from "../screens/main/TicketSummaryScreen";
// import ProjectInventoryScreen from "../screens/collection/ProjectInventoryScreen";
import ForgotPasswordScreen from "../screens/user/ForgotPasswordScreen";


const Stack = createNativeStackNavigator();

export default function Navigator() {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} translucent={true} />
      <NavigationContainer ref={navigationRef} theme={isDark ? DarkTheme : DefaultTheme}>
        <Stack.Navigator
          initialRouteName="login"
          screenOptions={{
            headerStyle: {
              backgroundColor: CustomColors.actionBarColor || Colors.actionBarColor,
            },
            headerTintColor: CustomColors.actionBarTextColor || Colors.actionBarTextColor,
            navigationBarColor: CustomColors.navigationBarColor || Colors.navigationBarColor,
            contentStyle: {
              backgroundColor: CustomColors.appScreenColor || Colors.appScreenColor,
            },
            headerBackTitleVisible: false,
          }}
        >
          <Stack.Screen
            name="login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />


          {/* <Stack.Screen
            name="splash"
            component={SplashScreenAnimated}
            options={{ headerShown: false }}
          /> */}

          <Stack.Screen
            name="main"
            component={DrawerNavigator}
            options={{ headerShown: false }}
          />

          {/* <Stack.Screen
            name="routemap"
            component={RouteMapScreen}
            options={{ headerShown: false }}
          /> */}

         

          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ headerShown: true }}
          />

          <Stack.Screen
            name="settings"
            component={SettingsScreen}
            options={{ headerShown: false }}
          />

          {/* <Stack.Screen
            name="collection details"
            component={CollectionDetailsScreen}
            options={{ headerShown: true }}
          />

          <Stack.Screen
            name="chart_screen"
            component={ChartScreen}
            options={{ headerShown: true }}
          /> */}

          {/* <Stack.Screen
            name="customerInfo"
            component={CustomerInfo}
            options={{ headerShown: true }}
          />

          <Stack.Screen
            name="sale_details"
            component={SaleDetails}
            options={{ headerShown: true }}
          />

          <Stack.Screen
            name="loan_details"
            component={LoanDetails}
            options={{ headerShown: true }}
          />

          <Stack.Screen
            name="pay_now"
            component={PayScreen}
            options={{ headerShown: true }}
          />

          <Stack.Screen
            name="qr"
            component={DynamicQRScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="transaction_history"
            component={TransactionHistory}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="visit_site_summary"
            component={VisitSiteSummaryScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="visit_site"
            component={SiteVisitScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="visit_site_full"
            component={VisitSiteFullScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="visit_site_add"
            component={SiteVisitAddScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="ticket_summary"
            component={TicketSummaryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="project_inventory"
            component={ProjectInventoryScreen}
            options={{ headerShown: false }}
          /> */}

          {/* <Stack.Screen
            name="dashboard"
            component={DashboardScreen}
            options={{ headerShown: false }}
          /> */}

          {/* <Stack.Screen
            name="branchindent"
            component={BranchIndentTabs}
            options={{ headerShown: false }}
          /> */}

          <Stack.Screen
            name="TAStack"
            component={TAStackNavigator}
            options={{ headerShown: false }}
          />

          {/* <Stack.Screen
            name="vendor"
            component={VendorStackNavigator}
            options={{ headerShown: false }}
          /> */}
          {/* <Stack.Screen
            name="BranchRequestDetails"
            component={BranchRequestDetailsScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="CreateBIR"
            component={CreateBIRScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="EditBIR"
            component={EditBIRScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EditIndependentRequest"
            component={EditIndependentRequestScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateIndependentRequest"
            component={CreateIndependentRequestScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LeaveStack"
            component={LeaveStackNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="StockStack"
            component={StockStackNavigator}
            options={{ headerShown: false }}
          /> */}

        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
