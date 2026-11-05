// redux/slices/ExpenseSlice.js
import { createSlice } from "@reduxjs/toolkit";
import moment from 'moment';
// Helper function to map tour_status_id to text
const getTourStatusText = (statusId) => {
    switch (statusId) {
        case 0: return 'Pending';
        case 1: return 'Approved';
        case 2: return 'Rejected';
        case 3: return 'Cancelled';
        case 4: return 'Returned';
        case 5: return 'Forwarded';
        default: return 'Unknown';
    }
};
const initialLocalConveyanceState = {
    expenses: [], // This array holds all local conveyance expense items
    editedItemData: {}, // Stores current edits for items by their ID
    claimdata: null, // Holds the overall claim details
    showSubCategoryPicker: false, // UI state for sub-category picker visibility
    activePickerItemId: null, // ID of the item for which the sub-category picker is active
    showDatePicker: false, // UI state for date picker visibility (mainly for iOS modal)
    activeDateField: null, // The specific field ('date') for which the date picker is active
    datePickerValue: new Date().toISOString(), // Value passed to the date picker, defaults to current date in ISO string
    hasUnsavedChanges: false, // Flag to indicate if there are unsaved changes
    expandedItems: {}, // UI state for which expense items are expanded in the list
    deletedItemIds: [], // Stores deleted item IDs
};
const ExpenseSlice = createSlice({
    name: 'expense',
    initialState: {
        expenseSummaries: [],
        totalCount: 0,
        loading: false,
        error: null,
        filters: {
            tourNO: '',
            requestedDate: '',
            status: null,
        },
        // --- ADDED initial states for editing here ---
        editedItem: null,
        isEditingLoading: false,
        editingError: null,
        expenseDetails: null,
        expenseList: [],
        documents: {},
        approvalFlow: null,
        isApprovalFlowLoading: false,
        approvalFlowError: null,
        details: [],
        localConveyance: initialLocalConveyanceState,
        associatedExpenses: [],
        editedAssociatedItemData: {},
        associateActivePickerItemId: null, // Keep this
        associateShowDate: false, // New
        deletedItemIds: [],
        lodgingDetails: [],
        lodgingSubCategoryDropdown: [],
        associatedExpenses: [],
        editedAssociatedItemData: {},
        associateActivePickerItemId: null, // Keep this

        associateShowDate: false, // New
        deletedItemIds: [],
        lodgingDetails: [],
        lodgingSubCategoryDropdown: [],
        expenseApprovals: [],
        totalApprovalCount: 0,
        approvalFilters: {
            tourNO: '',
            requestedDate: '',
            status: { label: 'Select Action', value: '' }, // Initial state for status filter
        },
        ccbsSplits: [],
        businessList: [], // ideally from master data
        costCenterList: [],
    },
    reducers: {
        // --- Existing Reducers ---
        setExpenseSummaryArray: (state, action) => {
            if (action.payload && action.payload.data) {
                const travelArray = action.payload.data.map((item) => ({
                    ...item,
                    tour_status_text: getTourStatusText(item.tour_status_id),
                    from: item.tour_status_id === 3 ? 'CANCEL_MAKER' : 'MAKER'
                }));
                state.expenseSummaries = [...state.expenseSummaries, ...travelArray];
                state.totalCount = action.payload.count || 0;
                // //console.log(state.expenseSummaries)
            }
        },
        clearExpenseSummaryArray: (state) => {
            state.expenseSummaries = [];
            state.totalCount = 0;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = {
                tourNO: '',
                requestedDate: '',
                status: null,
            };
        },
        // --- NEW/MOVED Reducers for Editing ---
        setEditedExpenseItem: (state, action) => {
            state.editedItem = { ...action.payload }; // Ensure a new object is created
            state.isEditingLoading = false; // Reset loading/error when a new item is set
            state.editingError = null;
        },
        updateEditedExpenseField: (state, action) => {
            const { field, value } = action.payload;
            if (state.editedItem) {
                state.editedItem[field] = value;
            }
        },
        clearEditedExpenseItem: (state) => {
            state.editedItem = null;
            state.isEditingLoading = false;
            state.editingError = null;
        },
        setIsEditingLoading: (state, action) => { // Specific loading for the edited item
            state.isEditingLoading = action.payload;
        },
        setEditingError: (state, action) => { // Specific error for the edited item
            state.editingError = action.payload;
        },
        setExpenseDetails: (state, action) => {
            state.expenseDetails = action.payload;
        },
        setExpenseList: (state, action) => {
            state.expenseList = action.payload;
        },
        setApprovalFlow: (state, action) => {
            state.approvalFlow = action.payload;
        },
        setIsApprovalFlowLoading: (state, action) => {
            state.isApprovalFlowLoading = action.payload;
        },
        setDocuments: (state, action) => {
            state.documents[action.payload.key] = action.payload.value;
        },
        clearExpenseData: (state) => {
            state.expenseDetails = null;
            state.approvalFlow = null;
            state.documents = {};
        },
        setDailyReimbursementDetails: (state, action) => {
            state.details = action.payload;
        },
        clearDailyReimbursementDetails: (state) => {
            state.details = [];
        },
        setDailyDiemDropdown: (state, action) => {
            state.dailyDiemDropdown = action.payload;
        },
        setYnDropdown: (state, action) => {
            state.ynDropdown = action.payload;
        },
        setCityDropdown: (state, action) => {
            state.cityDropdown = action.payload;
        },
        setCurrentCitySearchQuery: (state, action) => {
            state.currentCitySearchQuery = action.payload;
        },
        setCityPage: (state, action) => {
            state.cityPage = action.payload;
        },
        setHasMoreCity: (state, action) => {
            state.hasMoreCity = action.payload;
        },
        setSelectedFieldTitle: (state, action) => {
            state.selectedFieldTitle = action.payload;
        },
        removeExpenseItem: (state, action) => {
            const expenseId = action.payload;
            state.expenseDetails.data = state.expenseDetails.data.filter(
                item => item.expenseid !== expenseId
            );
        },
        setLocalConveyanceExpenses: (state, action) => {
            state.localConveyance.expenses = action.payload;
        },

        updateLocalConveyanceEditedItemField: (state, action) => {
            const { value, itemId, field } = action.payload;
            state.localConveyance.editedItemData[itemId] = {
                ...(state.localConveyance.editedItemData[itemId] || {}),
                [field]: value,
            };
            state.localConveyance.hasUnsavedChanges = true;
        },

        updateLocalConveyanceNumericItemField: (state, action) => {
            const { text, key, itemId } = action.payload;
            const updatedValue = text.replace(/[^0-9.]/g, ''); // Ensure only numeric and dot characters
            state.localConveyance.editedItemData[itemId] = {
                ...(state.localConveyance.editedItemData[itemId] || {}),
                [key]: updatedValue,
            };

            // Removed hardcoded eligible amount calculation for 'distance' key.
            // This calculation is now handled in the component's handleNumericInputValidate via API.

            state.localConveyance.hasUnsavedChanges = true;
        },

        addLocalConveyanceExpenseItem: (state) => {
            const newId = `temp-${Date.now()}`; // Generate a unique temporary ID
            const newEmptyItem = {
                id: newId,
                modeOfTravel: 'Road',
                subCategory: 'Bus',
                center: '',
                fromPlace: '',
                toPlace: '',
                distance: '',
                onwardReturn: '1',
                billNumber: '',
                remarks: '',
                claimAmount: '',
                eligibleamount: '0',
                isNew: true, // Flag to identify newly added items
            };
            // Add the new item directly to the main 'expenses' array
            state.localConveyance.expenses.push(newEmptyItem);
            // Also add it to 'editedItemData' for tracking current edits
            state.localConveyance.editedItemData[newId] = newEmptyItem;
            // Expand the newly added item by default
            state.localConveyance.expandedItems[newId] = true;
            state.localConveyance.hasUnsavedChanges = true;
        },

        deleteLocalConveyanceExpenseItem: (state, action) => {
            const itemIdToDelete = action.payload;

            // Remove from editedItemData
            delete state.localConveyance.editedItemData[itemIdToDelete];

            // Remove from expandedItems
            delete state.localConveyance.expandedItems[itemIdToDelete];

            // Track deleted IDs only for existing (non-temp) items
            if (!itemIdToDelete.toString().startsWith('temp-')) {
                if (!state.localConveyance.deletedItemIds) {
                    state.localConveyance.deletedItemIds = [];
                }
                state.localConveyance.deletedItemIds.push(itemIdToDelete);
            }

            // Remove from the expenses array
            state.localConveyance.expenses = state.localConveyance.expenses.filter(
                item => item.id !== itemIdToDelete
            );

            state.localConveyance.hasUnsavedChanges = true;
        },


        toggleLocalConveyanceItemExpansion: (state, action) => {
            const itemId = action.payload;
            state.localConveyance.expandedItems[itemId] = !state.localConveyance.expandedItems[itemId];
        },

        setLocalConveyanceShowDatePicker: (state, action) => {
            state.localConveyance.showDatePicker = action.payload;
        },

        setLocalConveyanceActiveDateField: (state, action) => {
            state.localConveyance.activeDateField = action.payload;
        },

        setLocalConveyanceDatePickerValue: (state, action) => {
            state.localConveyance.datePickerValue = action.payload;
        },

        setLocalConveyanceShowSubCategoryPicker: (state, action) => {
            state.localConveyance.showSubCategoryPicker = action.payload;
            // //console.log(state.localConveyance.showSubCategoryPicker) // Keep //console.log if needed for debugging
        },

        setLocalConveyanceActivePickerItemId: (state, action) => {
            state.localConveyance.activePickerItemId = action.payload;
        },

        setLocalConveyanceHasUnsavedChanges: (state, action) => {
            state.localConveyance.hasUnsavedChanges = action.payload;
        },

        resetLocalConveyanceState: (state) => {
            state.localConveyance = {
                ...initialLocalConveyanceState,
                expenses: [],
                editedItemData: {},
                expandedItems: {},
                deletedItemIds: [],
            };
        },
        setAssociatedExpenses: (state, action) => {
            state.associatedExpenses = action.payload;
            // Initialize edited data when expenses are set
            state.editedAssociatedItemData = action.payload.reduce((acc, item) => {
                acc[item.id] = { ...item }; // Assuming each item has a unique 'id'
                return acc;
            }, {});
        },
        addAssociatedExpenseItem: (state, action) => {
            const newItem = action.payload;
            state.associatedExpenses.push(newItem);
            state.editedAssociatedItemData[newItem.id] = { ...newItem };
        },
        deleteAssociatedExpenseItem: (state, action) => {
            const itemId = action.payload;
            const isNew = itemId.toString().startsWith('new-');

            // ✅ Fix: use correct key
            state.associatedExpenses = state.associatedExpenses.filter(item => item.id !== itemId);

            delete state.editedAssociatedItemData[itemId];

            if (!isNew) {
                state.deletedItemIds.push(itemId); // ✅ Only push existing items
            }
        },

        updateAssociatedEditedItemField: (state, action) => {
            const { itemId, field, value } = action.payload;
            if (!state.editedAssociatedItemData[itemId]) {
                state.editedAssociatedItemData[itemId] = {};
            }
            state.editedAssociatedItemData[itemId][field] = value;
        },


        setAllAssociatedEditedItemData: (state, action) => {
            state.editedAssociatedItemData = action.payload;
        },
        clearAssociatedEditedItemData: (state, action) => {
            delete state.editedAssociatedItemData[action.payload];
        },
        setAssociateActivePickerItemId: (state, action) => {
            state.associateActivePickerItemId = action.payload;
            // //console.log("yyyy", state.associateActivePickerItemId)
        },
        setAssociateShowDate: (state, action) => {
            state.associateShowDate = action.payload;
        },
        mergeAssociateSubmittedItems: (state, action) => {
            const submittedItems = action.payload;

            submittedItems.forEach(newItem => {
                const existingIndex = state.associatedExpenses.findIndex(item =>
                    String(item.billno) === String(newItem.billno) &&
                    String(item.fromdate) === moment(newItem.fromdate, 'YYYY-MM-DD').format("DD-MMM-YYYY")
                );

                const formattedItem = {
                    id: newItem.id || `submitted-${Date.now()}-${Math.random()}`,
                    expensegid: newItem.expensegid,
                    subCategory: newItem.expense || '',
                    date: moment(newItem.fromdate, "YYYY-MM-DD").format("DD-MMM-YYYY"),
                    billno: newItem.billno || '',
                    remarks: newItem.remarks || '',
                    claimedamount: newItem.claimedamount?.toString() || '',
                };

                if (existingIndex !== -1) {
                    // Update existing item
                    state.associatedExpenses[existingIndex] = formattedItem;
                } else {
                    // Add new submitted item
                    state.associatedExpenses.push(formattedItem);
                }

                // Also update editedAssociatedItemData
                state.editedAssociatedItemData[formattedItem.id] = { ...formattedItem };
            });

            // Clear deleted items list
            state.deletedItemIds = [];
        },
        setLodgingDetails: (state, action) => { // New reducer
            state.lodgingDetails = action.payload;
        },
        clearLodgingDetails: (state) => { // New reducer
            state.lodgingDetails = [];
        },
        setLodgingSubCategoryDropdown: (state, action) => { // <--- Reducer for setting sub-categories
            state.lodgingSubCategoryDropdown = action.payload;
        },
        // In your reducers object for expenseSlice:
        setExpenseApprovalsArray: (state, action) => {
            const { data, count } = action.payload;
            state.expenseApprovals = [...state.expenseApprovals, ...data]; // Append
            state.totalApprovalCount = count; // Update total count
        },
        clearExpenseApprovalsArray: (state) => {
            state.expenseApprovals = [];
            state.totalApprovalCount = 0;
        },
        // ... other reducers
        setApprovalFilters: (state, action) => {
            state.approvalFilters = { ...state.approvalFilters, ...action.payload };
        },
        clearApprovalFilters: (state) => {
            state.approvalFilters = {
                tourNO: '',
                requestedDate: '',
                status: { label: 'Select Action', value: '' }, // Initial state for status filter
            };
        },
        setCcbsSplits: (state, action) => {
            state.ccbsSplits = action.payload; // payload = Array of { bsid, ccid, amount, tourgid, percentage }
        },
        // Add one new split
        addCcbsSplit: (state, action) => {
            state.ccbsSplits.push(action.payload);
        },
        // Clear all splits
        clearCcbsSplits: (state) => {
            state.ccbsSplits = [];
        },
        setBusinessList: (state, action) => {
            state.businessList = action.payload;
        },
        setCostCenterList: (state, action) => {
            state.costCenterList = action.payload;
        },
        removeCcbsSplit(state, action) {
            const index = action.payload;
            if (index >= 0 && index < state.ccbsSplits.length) {
                state.ccbsSplits.splice(index, 1);
            }
        },
    }// <-- This curly brace closes the 'reducers' object correctly

});

// All action creators are now correctly generated and can be destructured
export const {
    setExpenseSummaryArray,
    clearExpenseSummaryArray,
    setLoading,
    setError,
    setFilters,
    clearFilters,
    setEditedExpenseItem,
    updateEditedExpenseField,
    clearEditedExpenseItem,
    setIsEditingLoading,
    setEditingError,
    setExpenseDetails,
    setExpenseList,
    setApprovalFlow,
    setDocuments,
    clearExpenseState,
    setDailyReimbursementDetails,
    setIsApprovalFlowLoading,
    clearDailyReimbursementDetails,
    setDailyDiemDropdown,
    setYnDropdown,
    setCityDropdown,
    setCurrentCitySearchQuery, // NEW: Export the action
    setCityPage, // NEW: Export the action
    setHasMoreCity, // NEW: Export the action
    setSelectedFieldTitle, // NEW: Export the action
    removeExpenseItem,
    setLocalConveyanceExpenses,
    updateLocalConveyanceEditedItemField,
    updateLocalConveyanceNumericItemField,
    addLocalConveyanceExpenseItem,
    deleteLocalConveyanceExpenseItem,
    toggleLocalConveyanceItemExpansion,
    setLocalConveyanceShowDatePicker,
    setLocalConveyanceActiveDateField,
    setLocalConveyanceDatePickerValue,
    setLocalConveyanceShowSubCategoryPicker,
    setLocalConveyanceActivePickerItemId,
    setLocalConveyanceHasUnsavedChanges,
    resetLocalConveyanceState,
    setAssociatedExpenses,
    addAssociatedExpenseItem,
    deleteAssociatedExpenseItem,
    updateAssociatedEditedItemField,
    clearAssociatedEditedItemData,
    setAllAssociatedEditedItemData,
    setAssociateActivePickerItemId,
    setAssociateShowDate,
    mergeAssociateSubmittedItems,
    setLodgingDetails,
    clearLodgingDetails,
    setLodgingSubCategoryDropdown,
    setExpenseApprovalsArray,
    clearExpenseApprovalsArray,
    setApprovalFilters,
    clearApprovalFilters,
    setCcbsSplits, addCcbsSplit, clearCcbsSplits,
    setBusinessList, setCostCenterList, removeCcbsSplit
} = ExpenseSlice.actions;

export default ExpenseSlice.reducer;