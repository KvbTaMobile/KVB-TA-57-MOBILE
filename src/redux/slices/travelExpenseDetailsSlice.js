import { createSlice } from "@reduxjs/toolkit";

const travelExpenseDetailsSlice = createSlice({
    name: "travelExpenseDetails",
    initialState: {
        details: null,
    },
    reducers: {
        setTravelExpenseDetails: (state, action) => {

            state.details = action.payload;
        },
        clearTravelExpenseDetails: (state) => {
            state.details = null;
        },
    },
});

export const { setTravelExpenseDetails, clearTravelExpenseDetails } = travelExpenseDetailsSlice.actions;
export default travelExpenseDetailsSlice.reducer;