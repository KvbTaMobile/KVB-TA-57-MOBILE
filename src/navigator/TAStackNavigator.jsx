import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "../screens/taScreens/HomeScreen";
import TravelMakerSummaryScreen from "../screens/taScreens/travelMakerSummary";
import TravelMakerCreateScreen from "../screens/taScreens/TravelMakerScreen";
import TravelApproverSummaryScreen from "../screens/taScreens/TravelApproverSummary";
// import TravelCancelMakerSummary from "../screens/travel/TravelCancelMakerSummary";
// import TravelCancelApproverSummary from "../screens/travel/TravelCancelApproverSummary";
import AdminSummaryScreen from "../screens/taScreens/AdminSummary";
import BookingScreen from "../screens/taScreens/BookingScreen";
import ExpenseDetail from "../screens/taScreens/ExpenseMakerDetails";
import LocalConveyanceScreen from "../screens/taScreens/LocalConveyanceScreen";
import DailyReimbursementScreen from "../screens/taScreens/DailyReimbursementScreen";
import LodgingScreen from "../screens/taScreens/LodgingScreen";
import AssociatedExpenseScreen from "../screens/taScreens/AssociatedExpenseScreen";
import TravellingExpensesScreen from "../screens/taScreens/TravellingExpenses";
import FuelAllowanceSummary from "../screens/taScreens/FuelAllowanceSummary";
import FuelAllowanceCreation from "../screens/taScreens/FuelAllowanceCreation";
// import Cbbs from "../screens/travel/Cbbs";
// import BusinessSegmentPicker from "../screens/travel/BusinessSegmentPicker";
// import ModuleSelectionScreen from "./ModuleSelectionScreen";
import DateRelaxationSummary from "../screens/taScreens/DateRelaxationSummary";
import MessageScreen from "../screens/taScreens/MessageScreen";
import ChatBubbleScreen from "../screens/taScreens/ChatBubbleScreen";
import FuelListSummary from "../screens/taScreens/FuelListSummary";
// import FuelAllowanceActionScreen from "../screens/travel/FuelAllowanceActionScreen";
// import FuelAllowanceSummaryAction from "../screens/travel/FuelAllowanceSummaryAction";
import ExpenseMakerScreen from "../screens/taScreens/ExpenseMakerSummary";
import ExpenseApprovalList from "../screens/taScreens/ExpenseApprovalSummary";
// import vendorMakerScreen from "../screens/Vendor/vendorMakerScreen";
// import VendorCreationScreen from "../screens/Vendor/VendorCreationScreen";
// import VendorAddressScreen from "../screens/Vendor/VendorAddressScreen";
// import VendorContactScreen from "../screens/Vendor/VendorContactScreen";
// import VendorProfileScreen from "../screens/Vendor/VendorProfileScreen";
import { CustomColors } from "../styles/CustomColors";
const Stack = createNativeStackNavigator();
import { SCREEN_NAMES } from "../utilities/expenseType";
import Ccbs from "../screens/taScreens/Cbbs";

const TAStackNavigator = ({ route, openDrawer, selectedModule }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: CustomColors.actionBarColor,
        },
        headerTintColor: CustomColors.actionBarTextColor,
        navigationBarColor: CustomColors.navigationBarColor,
        contentStyle: {
          backgroundColor: CustomColors.appScreenColor,
        },
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="home"
        component={DashboardScreen}
        options={{ headerShown: false }}
        initialParams={{ selectedModule, openDrawer: () => openDrawer() }}
      />

      <Stack.Screen
        name="travel_maker_summary"
        component={TravelMakerSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="travel_maker_screen"
        component={TravelMakerCreateScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="travel_approver_summary"
        component={TravelApproverSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="admin_summary"
        component={AdminSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      ></Stack.Screen>
      <Stack.Screen
        name="ExpenseMaker"
        component={ExpenseMakerScreen}
        options={{ headerBackTitleVisible: false }}
      ></Stack.Screen>

      <Stack.Screen
        name="ExpenseApproval"
        component={ExpenseApprovalList}
        options={{ headerBackTitleVisible: false }}
      ></Stack.Screen>
      <Stack.Screen
        name="fuel_allowance_maker_summary"
        component={FuelAllowanceSummary}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="fuel_allowance_creation"
        component={FuelAllowanceCreation}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="fuellistall"
        component={FuelListSummary}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="date_relaxation"
        component={DateRelaxationSummary}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="Message"
        component={MessageScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="chat"
        component={ChatBubbleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExpenseDetail"
        component={ExpenseDetail}
        options={{ headerBackTitleVisible: false }}
      ></Stack.Screen>
      <Stack.Screen
        name={SCREEN_NAMES.LODGING}
        component={LodgingScreen}
        options={{ title: "Lodging", headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.LOCAL_CONVEYANCE}
        component={LocalConveyanceScreen}
        options={{ title: "Local Conveyance", headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.TRAVELLING_EXPENSES}
        component={TravellingExpensesScreen}
        options={{
          title: "Travelling Expenses",
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.DAILY_REIMBURSEMENT}
        component={DailyReimbursementScreen}
        options={{
          title: "Daily Reimbursement",
          headerBackTitleVisible: false,
        }}
      />


      <Stack.Screen
        name={SCREEN_NAMES.ASSOCIATED_EXPENSE}
        component={AssociatedExpenseScreen}
        options={{ title: "Associated Expense", headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="BookingScreen"
        component={BookingScreen}
        options={{ headerBackTitleVisible: false }}
      ></Stack.Screen>

      <Stack.Screen
        name="ccbs"
        component={Ccbs}
        options={{ headerBackTitleVisible: false }}
      />
      {/*
      <Stack.Screen
        name="travel_Cancel_maker_summary"
        component={TravelCancelMakerSummary}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="travel_Cancel_approver_summary"
        component={TravelCancelApproverSummary}
        options={{ headerBackTitleVisible: false }}
      />
    

      
      
      <Stack.Screen
        name="ExpenseDetail"
        component={ExpenseDetail}
        options={{ headerBackTitleVisible: false }}
      ></Stack.Screen>
    
      <Stack.Screen
        name="fuel_allowance_maker_summary_deep"
        component={FuelAllowanceSummaryAction}
        options={{ headerBackTitleVisible: false }}
      />

    

    

     

      <Stack.Screen
        name="fuelaction"
        component={FuelAllowanceActionScreen}
        options={{ headerBackTitleVisible: false }}
      />
    
      <Stack.Screen
        name="vendorMaker"
        component={vendorMakerScreen}
        options={{
          headerBackTitleVisible: false  // ✅ correct as a screen option
        }}
      />
      <Stack.Screen
        name="vendor_creation"
        component={VendorCreationScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="vendor_address"
        component={VendorAddressScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="vendor_contact"
        component={VendorContactScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="vendor_profile"
        component={VendorProfileScreen}
        options={{ headerBackTitleVisible: false }}
      /> */}
    </Stack.Navigator>
  );
};

export default TAStackNavigator;