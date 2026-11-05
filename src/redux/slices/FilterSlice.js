import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  tourNO: "",
  requestedDate: "",
  status: 2,
  employeeCode: "",
  employeeName: "",
  employeeBranch: null,
  requirements: 0,
  bookingStatus: -5,
  travelStatus: "Travel_3",
};

const travelFilterSlice = createSlice({
  name: "travelFilter",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      const payload = action.payload || {};

      // Key normalization map for backend snake_case compatibility
      const keyMap = {
        tour_no: "tourNO",
        request_date: "requestedDate",
        employee_code: "employeeCode",
        employee_name: "employeeName",
        employee_branch: "employeeBranch",
      };

      Object.keys(payload).forEach((key) => {
        const targetKey = keyMap[key] || key;
        if (Object.prototype.hasOwnProperty.call(state, targetKey)) {
          state[targetKey] = payload[key];
        }
      });
    },

    clearFilters: () => {
      return initialState;
    },
  },
});

export const { setFilters, clearFilters } = travelFilterSlice.actions;

export default travelFilterSlice.reducer;