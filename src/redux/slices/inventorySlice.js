

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    inventorySummaryArray: [],
};

const inventorySlice = createSlice({
    name: "inventory",
    initialState,
    reducers: {
        setInventorySummaryArray: (state, action) => {

            const newinventory = action.payload.data;

            state.inventorySummaryArray = [...state.inventorySummaryArray, ...newinventory];
        },
        clearInventorySummary: (state) => {
            state.inventorySummaryArray = [];
        },

    },
});

export const { setInventorySummaryArray, clearInventorySummary } = inventorySlice.actions;

export default inventorySlice.reducer;