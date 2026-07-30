// redux/slices/selfOrOnBehalfSlice.js

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mode: 'self', // or 'onbehalf'
  selectedBranch: null,
  selectedEmployee: null,
};

const selfOrOnBehalfSlice = createSlice({
  name: 'selfOrOnBehalf',
  initialState,
  reducers: {
    setMode: (state, action) => {
      state.mode = action.payload;
      if (action.payload === 'self') {
        state.selectedBranch = null;
        state.selectedEmployee = null;
      }
    },
    setSelectedBranch: (state, action) => {
      state.selectedBranch = action.payload;
      state.selectedEmployee = null;
    },
    setSelectedEmployee: (state, action) => {
      //console.log("asdfghjkl", action.payload)
      state.selectedEmployee = action.payload;
    },
    resetSelfOrOnBehalf: () => initialState,
  },
});

export const {
  setMode,
  setSelectedBranch,
  setSelectedEmployee,
  resetSelfOrOnBehalf,
} = selfOrOnBehalfSlice.actions;

export default selfOrOnBehalfSlice.reducer;
