import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthSlice from "../slices/AuthSlice";
import SettingsSlice from "../slices/SettingsSlice";
import EntitySlice from "../slices/EntitySlice";
import { apiSlice } from "../rtk_query/apiSlice";
// import CollectionSlice from "../slices/CollectionSlice";
// import DocumentSlice from "../slices/DocumentSlice";
// import CustomerInfoSlice from "../slices/CustomerInfoSlice";
// import UpdateCustomerInfoSlice from "../slices/updateCustomerInfoSlice";
// import QRSlice from "../slices/QRSlice";
import UserModulesSlice from "../slices/UserModulesSlice";
import TravelMaker from "../slices/TravelMaker";
import Dropdowns from "../slices/Dropdowns"
import travelFilter from "../slices/FilterSlice"
import selfOrOnBehalf from "../slices/SelfOrOnBehalfSlice"
import travelMakerFormSlice from "../slices/travelMakerFormSlice"
import travelExpenseDetailsReducer from '../slices/travelExpenseDetailsSlice';
import ExpenseSlice from "../slices/ExpenseSlice";
// import EmployeeSlice from "../slices/EmployeeSlice";
// import FuelSummarySlice from "../slices/FuelSummarySlice";
import BusinessSegmentSlice from "../slices/BusinessSegmentSlice";
// import branchIndentReducer from "../slices/branchIndentSlice";
// import vendorReducer from "../slices/vendorSlice";
// import customersReducer from "../slices/customerSlice"
// import vendorFilterReducer from "../slices/vendorFilterSlice";
// import CustomerFilterReducer from "../slices/customerFilterSlice"
// import vendorMakerReducer from "../slices/VendorMakerslice";
// import vendorCommonReducer from "../slices/vendorCommonSlice";

//stock
import inventoryReducer from "../slices/inventorySlice";

//HRMS
// import checkInSlice from "../slices/hrms_slices/checkInSlice";
// import roleSlice from "../slices/hrms_slices/roleSlice";
// import taskDurationSlice from "../slices/hrms_slices/taskDurationSlice";
// import filterOptionSlice from "../slices/hrms_slices/filterOptionSlice";
// import designationSlice from "../slices/hrms_slices/designationSlice";


import themeReducer from '../slices/themeSlice';
// Persist config for settings
const persistConfig = {
  key: "KVB",
  storage: AsyncStorage,
  whitelist: ["settings"],
};

// Combine persisted reducers
const persistedReducer = persistReducer(
  persistConfig,
  combineReducers({
    settings: SettingsSlice,
  })
);

// Root reducer
const rootReducer = combineReducers({
  auth: AuthSlice,
  entity: EntitySlice,
  // collection: CollectionSlice,
  // document: DocumentSlice,
  // customerInfo: CustomerInfoSlice,
  // updateCustomerInfo: UpdateCustomerInfoSlice,
  // qr: QRSlice,
  userModules: UserModulesSlice,
  //ta
  TravelMaker: TravelMaker,
  Dropdowns: Dropdowns,
  travelFilter: travelFilter,
  selfOrOnBehalf, selfOrOnBehalf,
  travelMakerFormSlice: travelMakerFormSlice,
  travelExpenseDetails: travelExpenseDetailsReducer,
  expense: ExpenseSlice,
  // employee: EmployeeSlice,
  // fuelSummary: FuelSummarySlice,
  businessSegment: BusinessSegmentSlice,
  [apiSlice.reducerPath]: apiSlice.reducer,
  persisted: persistedReducer,
  // branchIndent: branchIndentReducer,
  // //vendor
  // vendors: vendorReducer,
  // customers: customersReducer,
  // vendorFilter: vendorFilterReducer,
  // customerFilter: CustomerFilterReducer,
  // vendorMaker: vendorMakerReducer,
  // vendorCommon: vendorCommonReducer,

  //hrms
  // checkIn: checkInSlice,
  // roles: roleSlice,
  // taskDuration: taskDurationSlice,
  // filterOptions: filterOptionSlice,
  // designation: designationSlice,

  //stock
  inventory: inventoryReducer,

  theme: themeReducer,
});

// Configure store
const PersistedStore = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(apiSlice.middleware),
});

// Persistor
const persistor = persistStore(PersistedStore);

// Setup listeners for RTK Query
setupListeners(PersistedStore.dispatch);

export { PersistedStore, persistor };
