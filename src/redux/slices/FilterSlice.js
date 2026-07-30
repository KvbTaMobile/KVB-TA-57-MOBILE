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
      const payload = action.payload;
      for (const key in payload) {
        if (
          Object.hasOwnProperty.call(state, key) &&
          Object.hasOwnProperty.call(payload, key)
        ) {
          state[key] = payload[key];
        }
      }
    },
    clearFilters: () => {
      return initialState;
    },
  },
});

export const { setFilters, clearFilters } = travelFilterSlice.actions;

export default travelFilterSlice.reducer;
