import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export const pickDocuments = async (multiple = true) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple,
      copyToCacheDirectory: false, // we copy manually
    });

    if (result.canceled) return [];

    const files = await Promise.all(
      result.assets.map(async (asset) => {
        let finalUri = asset.uri;

        // Get extension safely
        const ext = asset.name?.split('.').pop() || 'jpg';

        // Create clean filename (VERY IMPORTANT)
        const cleanName = `upload_${Date.now()}.${ext}`.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

        // Android content:// -> file://
        if (asset.uri.startsWith('content://')) {
          const destination =
            FileSystem.cacheDirectory + cleanName;

          await FileSystem.copyAsync({
            from: asset.uri,
            to: destination,
          });

          finalUri = destination;
        }

        const fileObj = {
          uri: finalUri, // file:// path
          name: cleanName, // sanitized name
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        };

        console.log('FINAL FILE OBJECT:', fileObj);

        return fileObj;
      })
    );

    console.log('FILES READY FOR UPLOAD:', files);

    return files;
  } catch (error) {
    console.log('DocumentPicker Error:', error);
    return [];
  }
};