import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  employeeDetails: null,
};

const EmployeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    setEmployeeDetails: (state, action) => {
      state.employeeDetails = action.payload;
    },
    clearEmployeeDetails: (state) => {
      state.employeeDetails = null;
    },
  },
});

export const { setEmployeeDetails, clearEmployeeDetails } = EmployeeSlice.actions;
export default EmployeeSlice.reducer;
