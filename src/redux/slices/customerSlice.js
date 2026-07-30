// src/data/redux/slices/vendorSlice.js

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    customerSummaryArray: [],
};

const customerSlice = createSlice({
    name: "customers",
    initialState,
    reducers: {
        setcustomerSummaryArray: (state, action) => {
            const newCustomers = action.payload?.data || [];

            state.customerSummaryArray = [
                ...state.customerSummaryArray,
                ...newCustomers,
            ];
        },
        clearcustomerSummaryArray: (state) => {
            state.customerSummaryArray = [];
        },

    },
});

export const { setcustomerSummaryArray, clearcustomerSummaryArray } = customerSlice.actions;

export default customerSlice.reducer;