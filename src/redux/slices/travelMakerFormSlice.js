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
  permittedby: {},      
  empbranchgid: {},     
  approval: {},         
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

// Helper function to normalize person objects (Permitted By / Approver)
const normalizePersonObject = (raw, defaultCode = "", defaultName = "") => {
  if (!raw) return {};
  if (typeof raw === "string" || typeof raw === "number") {
    return { id: raw, code: defaultCode, full_name: defaultName };
  }
  return {
    id: raw.id ?? raw.employee_id ?? raw.emp_id ?? 0,
    code: raw.code ?? raw.emp_code ?? defaultCode,
    full_name: raw.full_name ?? raw.name ?? raw.employe_name ?? raw.employee_name ?? defaultName,
  };
};

// Helper function to normalize branch objects
const normalizeBranchObject = (raw, defaultCode = "", defaultName = "") => {
  if (!raw) return {};
  if (typeof raw === "string" || typeof raw === "number") {
    return { id: raw, code: defaultCode, name: defaultName };
  }
  return {
    id: raw.id ?? raw.branch_id ?? 0,
    code: raw.code ?? raw.branch_code ?? defaultCode,
    name: raw.name ?? raw.branch_name ?? defaultName,
  };
};

const travelMakerFormSlice = createSlice({
  name: 'travelMakerForm',
  initialState,
  reducers: {
    resetForm: () => initialState,
    
    updateField: (state, action) => {
      const payload = action.payload || {};

      // 1. Standard keys update
      for (const key in payload) {
        if (Object.hasOwnProperty.call(payload, key)) {
          state[key] = payload[key];
        }
      }

      // 2. Employee Profile Metadata Mapping
      if (payload.full_name !== undefined) state.empName = payload.full_name;
      if (payload.code !== undefined) state.empCode = payload.code;
      if (payload.designation !== undefined) state.empDesign = payload.designation;
      if (payload.grade !== undefined) state.empGrade = payload.grade;

      // 3. Permitted By Normalization (Matches Angular permitted_by_data / permittedby)
      if (payload.permitted_by_data || payload.permittedby || payload.permittedby_id) {
        const rawPermitted = payload.permitted_by_data || payload.permittedby;
        state.permittedby = normalizePersonObject(
          rawPermitted,
          payload.permittedby_code || "",
          typeof payload.permittedby === "string" ? payload.permittedby : ""
        );
      }

      // 4. Branch Normalization (Matches branch_data_maker / empbranchgid)
      if (payload.branch_data_maker || payload.empbranchgid || payload.approver_branch_data) {
        const rawBranch = payload.branch_data_maker || payload.empbranchgid;
        state.empbranchgid = normalizeBranchObject(
          rawBranch,
          payload.branch_code || "",
          payload.branch_name || ""
        );
      }

      // 5. Approver Employee Normalization (Matches approver_data / approval)
      if (payload.approver_data || payload.approval) {
        const rawApprover = payload.approver_data || payload.approval;
        state.approval = normalizePersonObject(rawApprover);
      }
    },

    updateDetails: (state, action) => {
      state.details = action.payload;
    },

    updateSelectedBranch: (state, action) => {
      state.selectedBranch = action.payload;
    },

    setApprovalFlow: (state, action) => {
      state.approvalFlow = action.payload;
    },

    setIsApprovalFlowLoading: (state, action) => {
      state.isApprovalFlowLoading = action.payload;
    },
  },
});

export const {
  resetForm,
  updateField,
  updateDetails,
  updateSelectedBranch,
  setIsApprovalFlowLoading,
  setApprovalFlow,
} = travelMakerFormSlice.actions;

export default travelMakerFormSlice.reducer;