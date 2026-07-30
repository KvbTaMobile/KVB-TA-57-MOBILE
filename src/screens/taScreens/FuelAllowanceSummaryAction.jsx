import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity, Button, TextInput, Modal,
  Linking, // Added for opening URLs directly where appropriate
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import * as IntentLauncher from 'expo-intent-launcher';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetFuelDocumentsQuery, useGetFuelAllowanceDetailsQuery, useGetCbbsQuery } from '../../redux/rtk_query/apiSlice'
import { horizontalScale, verticalScale, moderateScale } from '../../styles/Metrics';
import { getCustomColors } from '../../styles/CustomColors';



// --- Helper for Mime Types ---
const getMimeType = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase(); // Added optional chaining
  const types = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return types[ext] || 'application/octet-stream';
};

// --- File System Utilities (Android Specific) ---
const FOLDER_KEY = 'NAC_APP_FOLDER'; // Changed key for clarity

const saveToNACFolder = async (url, fileName, token) => {
  try {
    let directoryUri = await SecureStore.getItemAsync(FOLDER_KEY);

    if (!directoryUri) {
      const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Folder access permission is required to save files.');
        return null;
      }
      directoryUri = perm.directoryUri;
      await SecureStore.setItemAsync(FOLDER_KEY, directoryUri);
    }

    const tempFileUri = FileSystem.cacheDirectory + fileName;
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      tempFileUri,
      { headers: { Authorization: `Token ${token}` } }
    );
    const { uri: downloadedUri } = await downloadResumable.downloadAsync();

    // Create file in the designated directory
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      directoryUri,
      fileName,
      getMimeType(fileName)
    );

    // Read content from downloaded URI and write to the new file URI
    const fileContent = await FileSystem.readAsStringAsync(downloadedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, fileContent, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Delete the temporary cached file
    await FileSystem.deleteAsync(downloadedUri, { idempotent: true });

    return fileUri;
  } catch (e) {
    console.error('❌ Save to folder error:', e);
    Alert.alert('Download Failed', `Could not save file: ${e.message || 'Unknown error'}`);
    return null;
  }
};
const FuelAllowanceSummaryAction = () => {
  const route = useRoute();
  const { tourId } = route.params;
  const userToken = useSelector((state) => state.auth.user.token);
  const [isDownloading, setIsDownloading] = useState(false);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const { data: docs, isLoading: isLoadingDocs, error: errorDocs } = useGetFuelDocumentsQuery(tourId);
  const { data: cbbs, isLoading: isLoadingCbbs, error: errorCbbs } = useGetCbbsQuery(tourId);
  const { data: details, isLoading: isLoadingDetails, error: errorDetails } = useGetFuelAllowanceDetailsQuery(tourId);

  const isLoading = isLoadingDetails || isLoadingDocs || isLoadingCbbs;
  const hasError = errorDetails || errorDocs || errorCbbs;



  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.textGray,
      paddingVertical: verticalScale(16),
      paddingHorizontal: horizontalScale(16),
    },
    centeredContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.textGray,
    },
    loadingText: {
      marginTop: verticalScale(10),
      fontSize: moderateScale(16),
      color: CustomColors.textGray,
      fontFamily: 'System',
    },
    errorText: {
      fontSize: moderateScale(16),
      fontWeight: '600',
      color: CustomColors.textRed,
      marginTop: verticalScale(16),
      textAlign: 'center',
    },
    errorSubText: {
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
      marginTop: verticalScale(8),
      textAlign: 'center',
      paddingHorizontal: horizontalScale(24),
    },
    headerCard: {
      borderRadius: moderateScale(12),
      padding: moderateScale(24),
      marginBottom: verticalScale(24),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: horizontalScale(16),
    },
    headerTitle: {
      fontSize: moderateScale(22),
      fontWeight: '700',
      color: CustomColors.textWhite,
    },
    headerSubtitle: {
      fontSize: moderateScale(16),
      color: CustomColors.textGray,
      opacity: 0.9,
    },
    sectionTitle: {
      fontSize: moderateScale(18),
      fontWeight: '700',
      color: CustomColors.darkGray,
      marginBottom: verticalScale(16),
      paddingHorizontal: horizontalScale(4),
    },
    card: {
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(12),
      padding: moderateScale(16),
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: CustomColors.textGray,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(8),
      gap: horizontalScale(4),
    },
    infoLabel: {
      fontSize: moderateScale(14),
      fontWeight: '600',
      color: CustomColors.textGray,
      minWidth: horizontalScale(90),
    },
    infoValue: {
      flex: 1,
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
      fontWeight: '500',
    },
    recordItem: {
      marginBottom: verticalScale(16),
      paddingBottom: verticalScale(8),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.textGray,
    },
    recordHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(4),
      gap: horizontalScale(4),
    },
    recordDates: {
      fontSize: moderateScale(14),
      fontWeight: '600',
      color: CustomColors.textDarkGray,
    },
    recordDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(4),
      gap: horizontalScale(4),
      flexWrap: 'wrap',
    },
    recordText: {
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
    },
    iconMarginLeft: {
      marginLeft: horizontalScale(16),
    },
    documentItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(8),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.textGray,
    },
    docInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: horizontalScale(4),
    },
    documentName: {
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
      flexShrink: 1,
    },
    docActions: {
      flexDirection: 'row',
      gap: horizontalScale(8),
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.textGray,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(6),
      paddingHorizontal: horizontalScale(8),
      borderColor: CustomColors.primaryBlue,
      borderWidth: 1,
    },
    actionButtonText: {
      marginLeft: horizontalScale(4),
      fontSize: moderateScale(12),
      color: CustomColors.textBlue,
      fontWeight: '600',
    },
    costCenterItem: {
      marginBottom: verticalScale(16),
    },
    itemDivider: {
      height: 1,
      backgroundColor: CustomColors.textGray,
      marginVertical: verticalScale(8),
      opacity: 0.7,
    },
    emptyStateText: {
      textAlign: 'center',
      fontSize: moderateScale(14),
      color: CustomColors.textDarkGray,
      fontStyle: 'italic',
      paddingVertical: verticalScale(16),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: CustomColors.textBlack,
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: CustomColors.backgroundWhite,
      padding: moderateScale(24),
      borderTopLeftRadius: moderateScale(20),
      borderTopRightRadius: moderateScale(20),
      borderTopWidth: 2,
      borderColor: CustomColors.primaryBlue,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
    input: {
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: moderateScale(8),
      padding: moderateScale(8),
      marginBottom: verticalScale(16),
      fontSize: moderateScale(14),
      color: CustomColors.darkGray,
      backgroundColor: CustomColors.backgroundGray,
    },
    openModalButton: {
      backgroundColor: CustomColors.primaryBlue,
      padding: moderateScale(16),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      marginTop: verticalScale(16),
    },
    openModalButtonText: {
      color: CustomColors.textGray,
      fontWeight: '600',
      fontSize: moderateScale(16),
    },
    modalActionButton: {
      backgroundColor: CustomColors.backgroundGray,
      paddingVertical: verticalScale(8),
      paddingHorizontal: horizontalScale(16),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      marginBottom: verticalScale(8),
      borderWidth: 1,
      borderColor: CustomColors.primaryBlue,
    },
    modalActionButtonText: {
      color: CustomColors.textBlue,
      fontSize: moderateScale(14),
      fontWeight: '600',
    },
    light: {
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    },
  });

  useEffect(() => {
    //console.log('Received tour_id:', tourId);
    // Fetch or use tour_id here...
  }, [tourId]);

  const handleDocumentAction = async (fileId, fileName, actionType) => {
    //console.log("1111->>>>>>>",actionType)
    const url = `http://3.108.200.134:8185/taserv/fuel_document_view?doc_option=${actionType}&id=${fileId}`;
    setIsDownloading(true);
    //console.log("2222->>>>>>>",url);

    try {
      if (Platform.OS === 'android') {
        const savedUri = await saveToNACFolder(url, fileName, userToken);
        if (!savedUri) {
          throw new Error('Failed to save file to designated folder.');
        }

        if (actionType === 'view') {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: savedUri,
            flags: IntentLauncher.FLAG_ACTIVITY_NEW_TASK, // Use correct flag constant
            type: getMimeType(fileName),
          });
        } else { // 'download'
          Alert.alert('Download Complete', `"${fileName}" saved to your NAC folder.`);
        }
      } else { // iOS
        const localFileUri = FileSystem.documentDirectory + fileName;
        const { uri: downloadedUri } = await FileSystem.downloadAsync(
          url,
          localFileUri,
          { headers: { Authorization: `Token ${userToken}` } }
        );

        if (actionType === 'view') {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(downloadedUri);
          } else {
            Alert.alert('Sharing Unavailable', 'No app can open this file. Please ensure you have a suitable viewer installed.');
          }
        } else { // 'download'
          // On iOS, files downloaded to documentDirectory are effectively "downloaded" to the app's sandbox.
          // We can't tell the user "saved to your Downloads folder".
          Alert.alert('Download Complete', `"${fileName}" is available within the app. You can share it to save elsewhere.`);
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            // Optionally, offer to share directly after download on iOS
            Alert.alert(
              'Share File?',
              'Would you like to open or share this file with another app?',
              [
                { text: 'No', style: 'cancel' },
                { text: 'Share', onPress: () => Sharing.shareAsync(downloadedUri) },
              ]
            );
          }
        }
      }
    } catch (err) {
      console.error('Document action error:', err);
      Alert.alert('Action Failed', `Could not ${actionType} "${fileName}". Please try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
        <Text allowFontScaling={false} style={styles.loadingText}>Fetching fuel allowance details...</Text>
      </View>
    );
  }





  return (
    <ScrollView style={styles.container}>


      <LinearGradient
        colors={[CustomColors.textBlue, CustomColors.lightBlue]} // Slightly lighter blue for gradient
        style={styles.headerCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Ionicons name="car-sport-outline" size={22 + 4} color={CustomColors.iconWhite} />
          <View>
            <Text allowFontScaling={false} style={styles.headerTitle}>Fuel Claim</Text>
            <Text allowFontScaling={false} style={styles.headerSubtitle}>Tour ID: {tourId}</Text>
          </View>
        </View>
      </LinearGradient>



      {/* Travel Records */}
      <Text allowFontScaling={false} style={styles.sectionTitle}>Travel Records</Text>
      <View style={[styles.card, styles.light]}>
        {details?.data?.length > 0 ? (
          details.data.map((item) => (
            <View key={item.id} style={styles.recordItem}>
              <View style={styles.recordHeader}>
                <Ionicons name="calendar" size={14} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.recordDates}>
                  {new Date(item.from_date).toLocaleDateString('en-GB')} {' '}
                  <Ionicons name="arrow-forward" size={12} color={CustomColors.iconGray} /> {' '}
                  {new Date(item.to_date).toLocaleDateString('en-GB')}
                </Text>
              </View>
              <View style={styles.recordDetailRow}>
                <Ionicons name="locate-outline" size={14} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.recordText}>{item.from_place || 'N/A'} <Ionicons name="arrow-forward" size={12} color={CustomColors.textGray} /> {item.to_place || 'N/A'}</Text>
              </View>
              <View style={styles.recordDetailRow}>
                <Ionicons name="speedometer-outline" size={14} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.recordText}>Total KM: {item.total_km || '0'}</Text>
                <Ionicons name="wallet-outline" size={14} color={CustomColors.textBlue} style={styles.iconMarginLeft} />
                <Text allowFontScaling={false} style={styles.recordText}>Claim: ₹{item.claim_amount || '0.00'}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text allowFontScaling={false} style={styles.emptyStateText}>No travel records found for this tour.</Text>
        )}
      </View>



      {/* Documents */}
      <Text allowFontScaling={false} style={styles.sectionTitle}>Supporting Documents</Text>
      <View style={[styles.card, styles.light]}>
        {docs?.data?.length > 0 ? (
          docs.data.map((doc) => (
            <View key={doc.file_id} style={styles.documentItem}>
              <View style={styles.docInfo}>
                <Ionicons name="document-text-outline" size={16} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.documentName}>{doc.file_name || 'Untitled Document'}</Text>
              </View>
              <View style={styles.docActions}>
                {/* <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDocumentAction(doc.id, doc.file_name, 'view')}
                  disabled={isDownloading}
                >
          
                    <Ionicons name="eye-outline" size={14} color={"#4B7BE5"} />
       
                  <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity> */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDocumentAction(doc.id, doc.file_name, 'download')}
                  disabled={isDownloading}
                >

                  <Ionicons name="download-outline" size={14} color={CustomColors.textBlue} />
                  <Text allowFontScaling={false} style={styles.actionButtonText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text allowFontScaling={false} style={styles.emptyStateText}>No supporting documents available.</Text>
        )}
      </View>



      {/* Cost Center Allocations */}
      <Text allowFontScaling={false} style={styles.sectionTitle}>Cost Center Allocations</Text>
      <View style={[styles.card, styles.light]}>
        {cbbs?.length > 0 ? (
          cbbs.map((item, index) => (
            <View key={item.id} style={styles.costCenterItem}>
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={14} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.infoLabel}>Cost Center:</Text>
                <Text allowFontScaling={false} style={styles.infoValue}>{item.cc_data?.name || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="pie-chart-outline" size={14} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.infoLabel}>Business Segment:</Text>
                <Text allowFontScaling={false} style={styles.infoValue}>{item.bs_data?.name || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="pricetag-outline" size={14} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.infoLabel}>Amount:</Text>
                <Text allowFontScaling={false} style={styles.infoValue}>₹{item.amount || '0.00'} ({item.percentage || '0'}%)</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color={item.status === 1 ? CustomColors.textGreen : CustomColors.textRed} />
                <Text allowFontScaling={false} style={styles.infoLabel}>Status:</Text>
                <Text allowFontScaling={false} style={[styles.infoValue, { color: item.status === 1 ? CustomColors.textGreen : CustomColors.textRed }]}>
                  {item.status === 1 ? 'Active' : 'Inactive'}
                </Text>
              </View>

              {index < cbbs.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))
        ) : (
          <Text allowFontScaling={false} style={styles.emptyStateText}>No cost center allocations found.</Text>
        )}
      </View>


    </ScrollView>
  )
}

export default FuelAllowanceSummaryAction
