import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,ToastAndroid,
} from 'react-native';
import BusinessSegmentPicker from './BusinessSegmentPicker';
import CcPicker from './CcPicker';
import { horizontalScale, moderateScale, verticalScale } from '../../styles/Metrics';
import { getCustomColors } from '../../styles/CustomColors';
import { useSelector } from 'react-redux';
import * as styless from "../../styles/StyleSheet";
const Cbbs = ({ route,navigation }) => {
  const { data: claimAmount } = route.params;
  const parentDateParam = route.params?.parentDate;
 const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
   const globalStyles = styless.styles(isDark);
  // State for current input (single)
  const [currentSplit, setCurrentSplit] = useState({
    business: null,         
    cc: null,
    percentage: '',
    amount: 0,
  });

  const [parentDate, setParentDate] = useState(
    parentDateParam ? new Date(parentDateParam) : new Date()
  );

  //console.log("TEstinbrrg",currentSplit)
  // State for saved splits list
  const [splitsList, setSplitsList] = useState([]);

  // Open state for pickers
  const [businessOpen, setBusinessOpen] = useState(false);
  const [ccOpen, setCcOpen] = useState(false);

  const [error, setError] = useState('');

  const updateCurrentSplit = (field, value) => {
    let updatedSplit = { ...currentSplit };

    if (field === 'business') {
      updatedSplit.business = value;
      updatedSplit.cc = null; // reset cc when business changes
    } else if (field === 'cc') {
      updatedSplit.cc = value;
    } else if (field === 'percentage') {
      const cleaned = value.replace(/[^0-9.]/g, '');
      const valid = cleaned.split('.').length > 2
        ? cleaned.substring(0, cleaned.lastIndexOf('.'))
        : cleaned;
      const percent = parseFloat(valid);

      updatedSplit.percentage = valid;

      if (!isNaN(percent)) {
        const calculated = (claimAmount * percent) / 100;
        updatedSplit.amount = calculated;
      } else {
        updatedSplit.amount = 0;
      }
    }

    setCurrentSplit(updatedSplit);
    validateTotal(updatedSplit, splitsList);
  };

  const validateTotal = (current, list) => {
    const totalAmount =
      list.reduce((sum, s) => sum + (s.amount || 0), 0) + (current.amount || 0);

    if (totalAmount > claimAmount) {
      setError('Total amount cannot exceed claim amount');
      return false;
    } else {
      setError('');
      return true;
    }
  };

  const addCurrentSplitToList = () => {
    if (!currentSplit.business || !currentSplit.cc) {
      ToastAndroid.show('Please select both Business Segment and Cost Center.', ToastAndroid.SHORT);
      return;
    }
  
    if (!currentSplit.percentage || Number(currentSplit.percentage) <= 0) {
      ToastAndroid.show('Enter a valid percentage greater than 0.', ToastAndroid.SHORT);
      return;
    }
  
    if (!validateTotal(currentSplit, splitsList)) {
      ToastAndroid.show('Total amount exceeds claim limit.', ToastAndroid.SHORT);
      return;
    }

    setSplitsList(prev => [...prev, currentSplit]);
    setCurrentSplit({
      business: null,
      cc: null,
      percentage: '',
      amount: 0,
    });
    setBusinessOpen(false);
    setCcOpen(false);
  };
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: CustomColors.backgroundWhite,  
  },
  scrollContent: {
    paddingVertical: verticalScale(20),
    paddingHorizontal: horizontalScale(20),
    paddingBottom: verticalScale(80),
  },
  label: {
    fontWeight: '600',
    marginBottom: verticalScale(8),
    color: CustomColors.textGray,  // dark slate blue for readability
    fontSize: moderateScale(14),
  },
  input: {
    height: verticalScale(44),
    borderWidth: 1,
    paddingHorizontal: horizontalScale(12),
    borderRadius: moderateScale(8),
    borderColor: CustomColors.textGray,
    backgroundColor: CustomColors.backgroundWhite,
    fontSize: moderateScale(16),
    marginBottom: verticalScale(12),
   color:CustomColors.textBlack
  },
  splitBlock: {
    marginBottom: verticalScale(24),
    paddingVertical: verticalScale(20),
    paddingHorizontal: horizontalScale(20),
    borderRadius: moderateScale(12),
    backgroundColor: CustomColors.backgroundGray2,
    // subtle shadow for elevation
    shadowColor: CustomColors.textBlack,
    shadowOpacity: 0.07,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  addButton: {
    marginTop: verticalScale(14),
    alignItems: 'center',
    backgroundColor: CustomColors.appThemeColor,
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
  },
  addButtonText: {
    color: CustomColors.textWhite,
    fontWeight: '700',
    fontSize: moderateScale(16),
  },
  splitListContainer: {
    marginTop: verticalScale(24),
  },
  splitItem: {
    backgroundColor: CustomColors.textGray,
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(16),
    borderRadius: moderateScale(10),
    marginBottom: verticalScale(12),
  },
  splitItemText: {
    color: CustomColors.textBlue,
    fontSize: moderateScale(15),
    marginBottom: verticalScale(4),
  },
  totalsContainer: {
    marginTop: verticalScale(12),
    paddingHorizontal: horizontalScale(10),
  },
  totalText: {
    fontWeight: '600',
    fontSize: moderateScale(15),
    color: CustomColors.textDarkGray,
  },
  errorText: {
    color: CustomColors.textRed,
    marginTop: verticalScale(6),
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: CustomColors.textDarkGray,
  },
});

  useLayoutEffect(() => {
    navigation.setOptions({ title: "CCBS",
      headerShown: true,
                  headerStyle: { backgroundColor: CustomColors.appThemeColor },
                    headerTitleStyle: {
                            ...globalStyles.headerTitle,
                            fontSize: moderateScale(20),   
                            fontWeight: '600',            
                        },
                  headerTintColor: CustomColors.textWhite,
     });

  }, [navigation,isDark]);

  const handleSubmit = () => {
    if (splitsList.length === 0) {
    ToastAndroid.show('Add at least one split before submitting.', ToastAndroid.SHORT);
    return;
  }

  if (totalPercentage !== 100) {
    ToastAndroid.show('Total percentage must be exactly 100%.', ToastAndroid.SHORT);
    return;
  }
  
    const payload = {
      ccbs: splitsList.map(split => ({
        bsid: split.business?.id,
        ccid: split.cc?.id,
        amount: parseFloat(split.amount.toFixed(2)),
        percentage: parseFloat(split.percentage)
      }))
    };
  
    //console.log('Submitting payload:', payload);
  
    ToastAndroid.show('Splits add successfully!', ToastAndroid.SHORT);

      navigation.navigate('fuel_allowance_creation', { ccbsPayload: payload, inputRowData: route.params?.inputRowData, // return back the original inputRow
        empinfData: route.params?.empinfData,parentDate: parentDate.toISOString(), });
  };
  

  const totalAmount = splitsList.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalPercentage = splitsList.reduce(
    (sum, s) => sum + parseFloat(s.percentage || 0),
    0
  );

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input box for current split */}
        <View style={styles.splitBlock}>
          <Text allowFontScaling={false} style={styles.label}>Business Segment</Text>
          <BusinessSegmentPicker
            open={businessOpen}
            setOpen={setBusinessOpen}
            onSelect={(val) => updateCurrentSplit('business', val)}
            selected={currentSplit.business}
          />

          <Text allowFontScaling={false} style={styles.label}>Cost Center Segment</Text>
          <CcPicker
            open={ccOpen}
            setOpen={setCcOpen}
            bsId={currentSplit.business?.id}
            onSelect={(val) => updateCurrentSplit('cc', val)}
            selected={currentSplit.cc}
          />

          <Text allowFontScaling={false} style={styles.label}>Percentage</Text>
          <TextInput allowFontScaling={false}
            style={[styles.input, error && { borderColor: CustomColors.textRed }]}
            placeholder="Enter percentage (0 - 100)"
            placeholderTextColor={CustomColors.textGray}
            keyboardType="decimal-pad"
            maxLength={5}
            value={currentSplit.percentage}
            onChangeText={(val) => updateCurrentSplit('percentage', val)}
          />

          <Text allowFontScaling={false} style={styles.label}>Amount: ₹{currentSplit.amount.toFixed(2)}</Text>

          {error !== '' && <Text allowFontScaling={false} style={{ color: CustomColors.textRed }}>{error}</Text>}

          <TouchableOpacity onPress={addCurrentSplitToList} style={styles.addButton}>
            <Text allowFontScaling={false} style={styles.addButtonText}>+ Add to List</Text>
          </TouchableOpacity>
        </View>

        {/* Show list of saved splits */}
        {splitsList.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text allowFontScaling={false} style={[styles.label, { fontWeight: '700' }]}>Added Splits:</Text>
            {splitsList.map((split, index) => (
              <View key={index} style={styles.splitBlock}>
                <Text allowFontScaling={false} style={{color:CustomColors.textGray}}> Business:
                      <Text allowFontScaling={false} style={{color:CustomColors.textBlack}}> {split.business?.name || '-'}</Text></Text>
                    <Text allowFontScaling={false} style={{color:CustomColors.textGray}}> Cost Center: 
                               <Text allowFontScaling={false} style={{color:CustomColors.textBlack}}>{split.cc?.name || '-'}</Text></Text>
                    <Text allowFontScaling={false} style={{color:CustomColors.textGray}}>  Percentage: 
                               <Text allowFontScaling={false} style={{color:CustomColors.textBlack}}>{split.percentage}%</Text></Text>
                     <Text allowFontScaling={false} style={{color:CustomColors.textGray}}> Amount:
                               <Text allowFontScaling={false} style={{color:CustomColors.textBlack}}> ₹{split.amount.toFixed(2)}</Text></Text>
              </View>
            ))}

            <Text allowFontScaling={false} style={styles.label}>
              Total Percentage: {totalPercentage.toFixed(2)}%
            </Text>
            <Text allowFontScaling={false} style={styles.label}>
              Total Amount: ₹{totalAmount.toFixed(2)} / ₹{claimAmount}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          style={[
            styles.addButton,
            {
              backgroundColor: totalPercentage === 100 ? CustomColors.textGreen : CustomColors.textGray,
            },
          ]}
          disabled={totalPercentage !== 100}
        >
          <Text allowFontScaling={false} style={styles.addButtonText}>Submit All</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Cbbs;




  // import React, { useState } from 'react';
// import {
//   View,
//   ScrollView,
//   Text,
//   TextInput,
//   StyleSheet,
//   Platform,
//   KeyboardAvoidingView,
//   TouchableOpacity,
//   Alert,
// } from 'react-native';
// import BusinessSegmentPicker from './BusinessSegmentPicker';
// import CcPicker from './CcPicker';

// const Cbbs = ({ route,navigation }) => {
//   const { data: claimAmount } = route.params;
//   const parentDateParam = route.params?.parentDate;

//   // State for current input (single)
//   const [currentSplit, setCurrentSplit] = useState({
//     business: null,
//     cc: null,
//     percentage: '',
//     amount: 0,
//   });

//   const [parentDate, setParentDate] = useState(
//     parentDateParam ? new Date(parentDateParam) : new Date()
//   );

//   //console.log("TEstinbrrg",currentSplit)
//   // State for saved splits list
//   const [splitsList, setSplitsList] = useState([]);

//   // Open state for pickers
//   const [businessOpen, setBusinessOpen] = useState(false);
//   const [ccOpen, setCcOpen] = useState(false);

//   const [error, setError] = useState('');

//   const updateCurrentSplit = (field, value) => {
//     let updatedSplit = { ...currentSplit };

//     if (field === 'business') {
//       updatedSplit.business = value;
//       updatedSplit.cc = null; // reset cc when business changes
//     } else if (field === 'cc') {
//       updatedSplit.cc = value;
//     } else if (field === 'percentage') {
//       const cleaned = value.replace(/[^0-9.]/g, '');
//       const valid = cleaned.split('.').length > 2
//         ? cleaned.substring(0, cleaned.lastIndexOf('.'))
//         : cleaned;
//       const percent = parseFloat(valid);

//       updatedSplit.percentage = valid;

//       if (!isNaN(percent)) {
//         const calculated = (claimAmount * percent) / 100;
//         updatedSplit.amount = calculated;
//       } else {
//         updatedSplit.amount = 0;
//       }
//     }

//     setCurrentSplit(updatedSplit);
//     validateTotal(updatedSplit, splitsList);
//   };

//   const validateTotal = (current, list) => {
//     const totalAmount =
//       list.reduce((sum, s) => sum + (s.amount || 0), 0) + (current.amount || 0);

//     if (totalAmount > claimAmount) {
//       setError('Total amount cannot exceed claim amount');
//       return false;
//     } else {
//       setError('');
//       return true;
//     }
//   };

//   const addCurrentSplitToList = () => {
//     if (!currentSplit.business || !currentSplit.cc) {
//       Alert.alert('Validation', 'Please select Business and Cost Center.');
//       return;
//     }
//     if (!currentSplit.percentage || Number(currentSplit.percentage) <= 0) {
//       Alert.alert('Validation', 'Please enter a valid percentage.');
//       return;
//     }
//     if (!validateTotal(currentSplit, splitsList)) {
//       return;
//     }
//     setSplitsList(prev => [...prev, currentSplit]);
//     setCurrentSplit({
//       business: null,
//       cc: null,
//       percentage: '',
//       amount: 0,
//     });
//     setBusinessOpen(false);
//     setCcOpen(false);
//   };

//   // const handleSubmit = () => {
//   //   if (splitsList.length === 0) {
//   //     Alert.alert('Error', 'Add at least one split before submitting.');
//   //     return;
//   //   }
//   //   // Here, you can send splitsList to your API or handle it as needed
//   //   //console.log('Submitting splits:', splitsList);
//   //   Alert.alert('Success', 'Splits submitted successfully!');
//   // };

//   const handleSubmit = () => {
//     if (splitsList.length === 0) {
//       Alert.alert('Error', 'Add at least one split before submitting.');
//       return;
//     }
  
//     // Transform splitsList into payload format
//     const payload = {
//       ccbs: splitsList.map(split => ({
//         bsid: split.business?.id,
//         ccid: split.cc?.id,
//         amount: parseFloat(split.amount.toFixed(2)),
//         percentage: parseFloat(split.percentage)
//       }))
//     };
  
//     //console.log('Submitting payload:', payload);
  
//     // Submit this payload to your API or navigate back with it
//     Alert.alert('Success', 'Splits submitted successfully!');

//       // Navigate to fuel_allowance_creation with the payload
//       navigation.navigate('fuel_allowance_creation', { ccbsPayload: payload, inputRowData: route.params?.inputRowData, // return back the original inputRow
//         empinfData: route.params?.empinfData,parentDate: parentDate.toISOString(), });
//   };
  

//   const totalAmount = splitsList.reduce((sum, s) => sum + (s.amount || 0), 0);
//   const totalPercentage = splitsList.reduce(
//     (sum, s) => sum + parseFloat(s.percentage || 0),
//     0
//   );

//   return (
//     <KeyboardAvoidingView
//       style={styles.wrapper}
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//     >
//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         keyboardShouldPersistTaps="handled"
//       >
//         {/* Input box for current split */}
//         <View style={styles.splitBlock}>
//           <Text style={styles.label}>Business Segment</Text>
//           <BusinessSegmentPicker
//             open={businessOpen}
//             setOpen={setBusinessOpen}
//             onSelect={(val) => updateCurrentSplit('business', val)}
//             selected={currentSplit.business}
//           />

//           <Text style={styles.label}>Cost Center Segment</Text>
//           <CcPicker
//             open={ccOpen}
//             setOpen={setCcOpen}
//             bsId={currentSplit.business?.id}
//             onSelect={(val) => updateCurrentSplit('cc', val)}
//             selected={currentSplit.cc}
//           />

//           <Text style={styles.label}>Percentage</Text>
//           <TextInput
//             style={[styles.input, error && { borderColor: 'red' }]}
//             placeholder="Enter percentage (0 - 100)"
//             keyboardType="decimal-pad"
//             maxLength={5}
//             value={currentSplit.percentage}
//             onChangeText={(val) => updateCurrentSplit('percentage', val)}
//           />

//           <Text style={styles.label}>Amount: ₹{currentSplit.amount.toFixed(2)}</Text>

//           {error !== '' && <Text style={{ color: 'red' }}>{error}</Text>}

//           <TouchableOpacity onPress={addCurrentSplitToList} style={styles.addButton}>
//             <Text style={styles.addButtonText}>+ Add to List</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Show list of saved splits */}
//         {splitsList.length > 0 && (
//           <View style={{ marginTop: 20 }}>
//             <Text style={[styles.label, { fontWeight: '700' }]}>Added Splits:</Text>
//             {splitsList.map((split, index) => (
//               <View key={index} style={styles.splitBlock}>
//                 <Text>Business: {split.business?.name || '-'}</Text>
//                 <Text>Cost Center: {split.cc?.name || '-'}</Text>
//                 <Text>Percentage: {split.percentage}%</Text>
//                 <Text>Amount: ₹{split.amount.toFixed(2)}</Text>
//               </View>
//             ))}

//             <Text style={styles.label}>
//               Total Percentage: {totalPercentage.toFixed(2)}%
//             </Text>
//             <Text style={styles.label}>
//               Total Amount: ₹{totalAmount.toFixed(2)} / ₹{claimAmount}
//             </Text>
//           </View>
//         )}

//     {/* <TouchableOpacity
//       onPress={handleSubmit}
//       style={[
//         styles.addButton,
//         {
//           backgroundColor: totalPercentage === 100 ? '#28a745' : CustomColors.textGray,
//         },
//       ]}
//       disabled={totalPercentage !== 100}
//     >
//       <Text style={styles.addButtonText}>Submit All</Text>
//     </TouchableOpacity> */}

//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// };

// export default Cbbs;

// const styles = StyleSheet.create({
//   wrapper: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   scrollContent: {
//     padding: 16,
//     paddingBottom: 60,
//   },
//   label: {
//     fontWeight: '500',
//     marginBottom: 6,
//     color: '#333',
//   },
//   input: {
//     height: 40,
//     borderWidth: 1,
//     paddingHorizontal: 10,
//     borderRadius: 4,
//     borderColor: CustomColors.textGray,
//     marginBottom: 10,
//   },
//   splitBlock: {
//     marginBottom: 20,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 6,
//     backgroundColor: '#f9f9f9',
//   },
//   addButton: {
//     marginTop: 10,
//     alignItems: 'center',
//     backgroundColor: '#007bff',
//     paddingVertical: 12,
//     borderRadius: 6,
//   },
//   addButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//   },
// });



