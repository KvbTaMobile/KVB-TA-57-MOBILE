import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  list: [],        
  selected: null, 
};

const entitySlice = createSlice({
  name: "entity",
  initialState,
  reducers: {
    setEntities: (state, action) => {
      state.list = action.payload;
    },

    setSelectedEntity: (state, action) => {
      state.selected = action.payload; 
    },

    clearEntities: (state) => {
      state.list = [];
      state.selected = null;
    },
  },
});

export const {
  setEntities,
  setSelectedEntity,
  clearEntities,
} = entitySlice.actions;

export default entitySlice.reducer;
