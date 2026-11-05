import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import all screens carefully
import DashboardScreen from "../screens/taScreens/HomeScreen";
import TravelMakerSummaryScreen from "../screens/taScreens/travelMakerSummary";
import TravelMakerCreateScreen from "../screens/taScreens/TravelMakerScreen";
import TravelMakerEditScreen from "../screens/taScreens/TravelMakerEditScreen";
import TravelApproverSummaryScreen from "../screens/taScreens/TravelApproverSummary";
import AdminSummaryScreen from "../screens/taScreens/AdminSummary";
import BookingScreen from "../screens/taScreens/BookingScreen";
import ExpenseDetail from "../screens/taScreens/ExpenseMakerDetails";
import LocalConveyanceScreen from "../screens/taScreens/LocalConveyanceScreen";
import DailyReimbursementScreen from "../screens/taScreens/DailyReimbursementScreen";
import LodgingScreen from "../screens/taScreens/LodgingScreen";
import AssociatedExpenseScreen from "../screens/taScreens/AssociatedExpenseScreen";
import TravellingExpensesScreen from "../screens/taScreens/TravellingExpenses";
import AdvanceMakerSummaryScreen from "../screens/taScreens/AdvanceMakerSummaryScreen";
import AdvanceRequestCreateScreen from "../screens/taScreens/AdvanceRequestCreateScreen";
import AdvanceMakerEditScreen from "../screens/taScreens/AdvanceMakerEditScreen"; // Reusing the same component for editing
import AdvanceApproverSummaryScreen from "../screens/taScreens/AdvanceApprovalSummaryScreen";
import AdvanceApprovalViewScreen from "../screens/taScreens/AdvanceApproviewScreen";
import FuelAllowanceSummary from "../screens/taScreens/FuelAllowanceSummary";
import FuelAllowanceCreation from "../screens/taScreens/FuelAllowanceCreation";
import DateRelaxationSummary from "../screens/taScreens/DateRelaxationSummary";
import MessageScreen from "../screens/taScreens/MessageScreen";
import ChatBubbleScreen from "../screens/taScreens/ChatBubbleScreen";
import FuelListSummary from "../screens/taScreens/FuelListSummary";
import ExpenseMakerScreen from "../screens/taScreens/ExpenseMakerSummary";
import ExpenseApprovalList from "../screens/taScreens/ExpenseApprovalSummary";
import { CustomColors } from "../styles/CustomColors";
import { SCREEN_NAMES } from "../utilities/expenseType";
import Ccbs from "../screens/taScreens/Cbbs";

const Stack = createNativeStackNavigator();

const TAStackNavigator = ({ route, openDrawer, selectedModule, permittedList, taFlags }) => {
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
        initialParams={{
          selectedModule,
          openDrawer: () => openDrawer(),
          permittedList,
          taFlags,
        }}
      />

      <Stack.Screen
        name="travel_maker_summary"
        component={TravelMakerSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="travel_create_screen"
        component={TravelMakerCreateScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="travel_edit_screen"
        component={TravelMakerEditScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="travel_approver_summary"
        component={TravelApproverSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="advance_maker_summary"
        component={AdvanceMakerSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />
<Stack.Screen
  name="advance_request_create"
  component={AdvanceRequestCreateScreen}
  options={{ headerBackTitleVisible: false }}
/>
<Stack.Screen
  name="advance_maker_edit"
  component={AdvanceMakerEditScreen}
  options={{ headerBackTitleVisible: false }}
/>
<Stack.Screen
  name="advance_approver_summary"
  component={AdvanceApproverSummaryScreen}
  options={{ headerBackTitleVisible: false }}
/>
<Stack.Screen
  name="advance_approval_view"
  component={AdvanceApprovalViewScreen}
  options={{ headerBackTitleVisible: false }}
/>
      <Stack.Screen
        name="admin_summary"
        component={AdminSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="ExpenseMaker"
        component={ExpenseMakerScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="ExpenseApproval"
        component={ExpenseApprovalList}
        options={{ headerBackTitleVisible: false }}
      />

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
      />

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
      />

      <Stack.Screen
        name="ccbs"
        component={Ccbs}
        options={{ headerBackTitleVisible: false }}
      />
    </Stack.Navigator>
  );
};

export default TAStackNavigator;