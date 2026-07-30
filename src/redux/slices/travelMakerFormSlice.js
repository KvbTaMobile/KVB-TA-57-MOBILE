// data/redux/slices/travelMakerFormSlice.js
import { createSlice } from '@reduxjs/toolkit';

const emptyDetailRow = {
  id: 0,
  detailStartDate: null,
  detailEndDate: null,
  startingpoint: "",
  placeofvisit: "",
  purposeofvisit: "",
  typeOfTravel: "",
  client: "",
  requirement: [],
  selectedRequirment: ""
};

const initialState = {
  id: 0,
  tourNo: "New",
  requestDate: new Date().toISOString(),
  empName: "",
  empCode: "",
  empDesign: "",
  empGrade: "",
  reason: {},
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
  durationDays: 1,
  remarks: "",
  details: [emptyDetailRow],
  NonBasereason: "",
  approver_data: {},
  branch_data: {},
  comments: '',
  transfer_on_promotion: '0',
  quantum_of_funds: null,
  opening_balance: null,
  selectedBranch: 0,
  DocumentData: {},
  approverRemarks: "",
  rm: {},
  functionalhead: {},
  accommodationCost: 0,
  flightCost: 0,
  otherCost: 0,
  isHoliday: false,
  isOnGoingTour: false,
  week_end_travel: null,
  approvalFlow: null,
  isApprovalFlowLoading: false,

};

const travelMakerFormSlice = createSlice({
  name: 'travelMakerForm',
  initialState,
  reducers: {
    resetForm: () => initialState,
    updateField: (state, action) => {
      const payload = action.payload;
      for (const key in payload) {
        if (Object.hasOwnProperty.call(state, key) && Object.hasOwnProperty.call(payload, key)) {
          state[key] = payload[key];
        }
      }
      if (payload.full_name !== undefined) state.empName = payload.full_name;
      if (payload.code !== undefined) state.empCode = payload.code;
      if (payload.designation !== undefined) state.empDesign = payload.designation;
      if (payload.grade !== undefined) state.empGrade = payload.grade;
    },
    updateDetails: (state, action) => {
      state.details = action.payload;
    },
    updateSelectedBranch: (state, action) => {
      state.selectedBranch = action.payload
    },
    setApprovalFlow: (state, action) => {
      state.approvalFlow = action.payload;
    },
    setIsApprovalFlowLoading: (state, action) => {
      state.isApprovalFlowLoading = action.payload;
    },
  },
});

export const { resetForm, updateField, updateDetails, updateSelectedBranch, setIsApprovalFlowLoading, setApprovalFlow } = travelMakerFormSlice.actions;
export default travelMakerFormSlice.reducer;
