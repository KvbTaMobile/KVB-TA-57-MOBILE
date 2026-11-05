// src/navigator/TAStackNavigator.jsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import all screens
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
import PackagingFreightScreen from "../screens/taScreens/PackagingFreight";
import LocalDeputationAllowance from "../screens/taScreens/LocalDeputationAllowance";
import MiscExpenseScreen from "../screens/taScreens/MiscExpenseScreen";
import AssociatedExpenseScreen from "../screens/taScreens/AssociatedExpenseScreen";
import TravellingExpensesScreen from "../screens/taScreens/TravellingExpenses";
import AdvanceMakerSummaryScreen from "../screens/taScreens/AdvanceMakerSummaryScreen";
import AdvanceRequestCreateScreen from "../screens/taScreens/AdvanceRequestCreateScreen";
import AdvanceMakerEditScreen from "../screens/taScreens/AdvanceMakerEditScreen";
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
import ExpenseApprovalViewScreen from "../screens/taScreens/ExpenseApprovalViewScreen";
import CancelMakerSummaryScreen from "../screens/taScreens/CancelMakerSummaryScreens";

import { useSelector } from "react-redux";
import { getCustomColors, CustomColors as DefaultCustomColors } from "../styles/CustomColors";
import { SCREEN_NAMES } from "../utilities/expenseType";
import Ccbs from "../screens/taScreens/Cbbs";

// Incidental Expense Screen
import IncidentalExpenseScreen from "../screens/taScreens/IncidentalExpenseScreen";

// Cancel Approval, Claim Approval, and Advance Recovery Screens
import CancelApprovalSummary from "../screens/taScreens/CancelApprovalSummary";
import ClaimApprovalScreen from "../screens/taScreens/ClaimApproval";
import AdvanceRecoverySummary from "../screens/taScreens/AdvanceRecoverySummary";
import SettlementApprovalScreen from "../screens/taScreens/SettlementApprovalScreen";
import AssignApproverScreen from "../screens/taScreens/AssignApproverScreen";
import TourReportScreen from "../screens/taScreens/TourReportScreen";
import BranchwisePendingReportScreen from "../screens/taScreens/BranchwisePendingReportScreen";
import EmployeeTourReportScreen from "../screens/taScreens/EmployeeTourReportScreen";
import EclaimBillConsolidateScreen from "../screens/taScreens/EclaimBillConsolidateScreen";
import TaReportScreen from "../screens/taScreens/TaReportScreen";
import GstReportScreen from "../screens/taScreens/GstReportScreen";   

// Placeholders for screens pending implementation
const EclaimAddTourCancelScreen = () => null;

const Stack = createNativeStackNavigator();

const TAStackNavigator = ({
  route,
  openDrawer,
  selectedModule,
  permittedList,
  taFlags,
}) => {
  const isDark = useSelector((state) => state.theme?.isDark);
  const CustomColors = getCustomColors(isDark);

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
      }}
    >
      {/* Home */}
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

      {/* Travel Maker Summary */}
      <Stack.Screen
        name="travel_maker_summary"
        component={TravelMakerSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Travel Create */}
      <Stack.Screen
        name="travel_create_screen"
        component={TravelMakerCreateScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Travel Edit */}
      <Stack.Screen
        name="travel_edit_screen"
        component={TravelMakerEditScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Travel Approver Summary */}
      <Stack.Screen
        name="travel_approver_summary"
        component={TravelApproverSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Advance Maker Summary */}
      <Stack.Screen
        name="advance_maker_summary"
        component={AdvanceMakerSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Advance Request Create */}
      <Stack.Screen
        name="advance_request_create"
        component={AdvanceRequestCreateScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Advance Maker Edit */}
      <Stack.Screen
        name="advance_maker_edit"
        component={AdvanceMakerEditScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Advance Approver Summary */}
      <Stack.Screen
        name="advance_approver_summary"
        component={AdvanceApproverSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Advance Approval View */}
      <Stack.Screen
        name="advance_approval_view"
        component={AdvanceApprovalViewScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Admin Summary */}
      <Stack.Screen
        name="admin_summary"
        component={AdminSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Cancel Maker Summary */}
      <Stack.Screen
        name="cancel_maker_summary"
        component={CancelMakerSummaryScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Expense Maker */}
      <Stack.Screen
        name="ExpenseMaker"
        component={ExpenseMakerScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Expense Approval */}
      <Stack.Screen
        name="ExpenseApproval"
        component={ExpenseApprovalList}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Cancel Approver / Approval Summary */}
      <Stack.Screen
        name="cancel_approver_summary"
        component={CancelApprovalSummary}
        options={{ headerBackTitleVisible: false }}
      />


      {/* Claim Approval */}
      <Stack.Screen
        name="ClaimApproval"
        component={ClaimApprovalScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Advance Recovery Summary */}
      <Stack.Screen
        name="advance_recovery"
        component={AdvanceRecoverySummary}
        options={{ headerBackTitleVisible: false }}
        initialParams={{
          taFlags,
        }}
      />

      {/* Settlement Approval / AP User Summary */}
      <Stack.Screen
        name="settlement_approval"
        component={SettlementApprovalScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="apuser_summary"
        component={SettlementApprovalScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Assign Approver */}
      <Stack.Screen
        name="assign_approver"
        component={AssignApproverScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Tour Report / Master Report Container */}
      <Stack.Screen
        name="tour_report"
        component={TaReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="tour_report_screen"
        component={TourReportScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Branch Wise Pending Report */}
      <Stack.Screen
        name="branchwise_pending_report"
        component={BranchwisePendingReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="branchwisereport"
        component={BranchwisePendingReportScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* TA Master Report (Parent Tab Container) */}
      <Stack.Screen
        name="ta_report"
        component={TaReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="ta-report"
        component={TaReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="TaReport"
        component={TaReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="report"
        component={TaReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="reports"
        component={TaReportScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Employee Tour Report */}
      <Stack.Screen
        name="employee_tour_report"
        component={EmployeeTourReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="employeereport"
        component={EmployeeTourReportScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* TA Consolidate / eClaim Bill Consolidate */}
      <Stack.Screen
        name="eclaim_bill_consolidate"
        component={EclaimBillConsolidateScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="taconsolidate"
        component={EclaimBillConsolidateScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* GST Report */}
      <Stack.Screen
        name="gst_report"
        component={GstReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="gst-report"
        component={GstReportScreen}
        options={{ headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="gstreport"
        component={GstReportScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="EclaimAddTourCancelScreen"
        component={EclaimAddTourCancelScreen}
        options={{ headerShown: false }}
      />


      {/* Fuel Allowance Maker Summary */}
      <Stack.Screen
        name="fuel_allowance_maker_summary"
        component={FuelAllowanceSummary}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Fuel Allowance Creation */}
      <Stack.Screen
        name="fuel_allowance_creation"
        component={FuelAllowanceCreation}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Fuel List */}
      <Stack.Screen
        name="fuellistall"
        component={FuelListSummary}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Date Relaxation */}
      <Stack.Screen
        name="date_relaxation"
        component={DateRelaxationSummary}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Message */}
      <Stack.Screen
        name="Message"
        component={MessageScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Chat */}
      <Stack.Screen
        name="chat"
        component={ChatBubbleScreen}
        options={{ headerShown: false }}
      />

      {/* Expense Detail */}
      <Stack.Screen
        name="ExpenseDetail"
        component={ExpenseDetail}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Expense Approval View */}
      <Stack.Screen
        name="ExpenseApprovalView"
        component={ExpenseApprovalViewScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* Packaging Freight */}
      <Stack.Screen
        name={SCREEN_NAMES.PACKAGING_FREIGHT}
        component={PackagingFreightScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name={SCREEN_NAMES.Local_Deputation_Allowance}
        component={LocalDeputationAllowance}
        options={{ headerBackTitleVisible: false }}
      />


      <Stack.Screen
        name={SCREEN_NAMES.MISC_EXPENSE}
        component={MiscExpenseScreen}
        options={{ headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name={SCREEN_NAMES.INCIDENTAL_EXPENSE}
        component={IncidentalExpenseScreen}
        options={{
          title: "Incidental Expense",
          headerBackTitleVisible: false,
        }}
      />





      {/* Lodging */}
      <Stack.Screen
        name={SCREEN_NAMES.LODGING}
        component={LodgingScreen}
        options={{
          title: "Lodging",
          headerBackTitleVisible: false,
        }}
      />

      {/* Local Conveyance */}
      <Stack.Screen
        name={SCREEN_NAMES.LOCAL_CONVEYANCE}
        component={LocalConveyanceScreen}
        options={{
          title: "Local Conveyance",
          headerBackTitleVisible: false,
        }}
      />

      {/* Travelling Expenses */}
      <Stack.Screen
        name={SCREEN_NAMES.TRAVELLING_EXPENSES}
        component={TravellingExpensesScreen}
        options={{
          title: "Travelling Expenses",
          headerBackTitleVisible: false,
        }}
      />

      {/* Daily Reimbursement */}
      <Stack.Screen
        name={SCREEN_NAMES.DAILY_REIMBURSEMENT}
        component={DailyReimbursementScreen}
        options={{
          title: "Daily Reimbursement",
          headerBackTitleVisible: false,
        }}
      />

      {/* Associated Expense */}
      <Stack.Screen
        name={SCREEN_NAMES.ASSOCIATED_EXPENSE}
        component={AssociatedExpenseScreen}
        options={{
          title: "Associated Expense",
          headerBackTitleVisible: false,
        }}
      />

      {/* Booking */}
      <Stack.Screen
        name="BookingScreen"
        component={BookingScreen}
        options={{ headerBackTitleVisible: false }}
      />

      {/* CCBS */}
      <Stack.Screen
        name="ccbs"
        component={Ccbs}
        options={{ headerBackTitleVisible: false }}
      />
    </Stack.Navigator>
  );
};

export default TAStackNavigator;