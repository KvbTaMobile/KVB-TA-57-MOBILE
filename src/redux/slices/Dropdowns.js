import { createSlice } from '@reduxjs/toolkit';

const Dropdowns = createSlice({
  name: 'Dropdowns',
  initialState: {
    reasons: [],
    approvers: [],
    branchs: [],
    cities: [],
    common: {},
    client: [],
  },
  reducers: {
    setReasonList: (state, action) => {
      state.reasons = action.payload.data;
    },
    updateReasonList: (state, action) => {
      state.reasons = [...state.reasons, ...action.payload.data];
    },
    setApproverList: (state, action) => {
      state.approvers = action.payload.data;
    },
    updateApproverList: (state, action) => {
      state.approvers = [...state.approvers, ...action.payload.data];
    },
    setBranchList: (state, action) => {
      state.branchs = action.payload.data;
    },
    updateBranchList: (state, action) => {
      state.branchs = [...state.branchs, ...action.payload.data];
    },
    setCityList: (state, action) => {
      state.cities = action.payload.data;
    },
    updateCityList: (state, action) => {
      state.cities = [...state.cities, ...action.payload.data];
    },
    setCommonDropDownList: (state, action) => {
      state.common = {...state.common, ...action.payload};
    },
    setClientList: (state, action) => {
      state.client = action.payload.data;
    },
    updateClientList: (state, action) => {
      state.client = [...state.client, ...action.payload.data];
    },
    clearDropdownData: (state) => {
      state.reasons = [];
      state.approvers = [];
      state.branchs = [];
      state.cities = [];
      state.common = {};
      state.client = [];
    },
  },
});

export const {
  setReasonList,
  setApproverList,
  setBranchList,
  setCommonDropDownList,
  setCityList,
  setClientList,
  clearDropdownData,
  updateReasonList,
  updateApproverList,
  updateBranchList,
  updateCityList,
  updateClientList,
} = Dropdowns.actions;

export default Dropdowns.reducer;
