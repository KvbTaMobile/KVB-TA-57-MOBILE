import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  modules: [],       // Store the module list here
  moduleId: null,   
  loading: false,
  error: null,
};

const userModulesSlice = createSlice({
  name: 'userModules',
  initialState,
  reducers: {
    setUserModules: (state, action) => {
      state.modules = action.payload;
    },
    setModuleId: (state, action) => {
      state.moduleId = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearUserModules: (state) => {
      state.modules = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setUserModules,
  setModuleId,
  setLoading,
  setError,
  clearUserModules,
} = userModulesSlice.actions;

export default userModulesSlice.reducer;
