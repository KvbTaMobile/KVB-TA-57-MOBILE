import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  updateCustomerInfo: null,  // Entire payload from API
};

const updateCustomerInfoSlice = createSlice({
  name: 'updateCustomerInfo',
  initialState,
  reducers: {
    setUpdateCustomerInfo(state, action) {
      state.updateCustomerInfo = action.payload; // Should be full payload: { data, subtag_type }
    },
    clearUpdateCustomerInfo(state) {
      state.updateCustomerInfo = null;
    },
  },
});

export const { setUpdateCustomerInfo, clearUpdateCustomerInfo } = updateCustomerInfoSlice.actions;
export default updateCustomerInfoSlice.reducer;
