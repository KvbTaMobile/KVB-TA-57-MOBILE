import * as FileSystem from 'expo-file-system/legacy';

// ---------- Safe JSON Parser ----------
const parseJsonSafe = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log('RAW SERVER RESPONSE:', text);

    // Backend returned Apache/Django HTML error page
    if (text?.startsWith('<')) {
      throw new Error('Server returned HTML instead of JSON');
    }

    throw new Error('Invalid JSON response from server');
  }
};

// ---------- Validate file ----------
const validateFile = async (file) => {
  if (!file?.uri) {
    throw new Error('File URI is missing');
  }

  const info = await FileSystem.getInfoAsync(file.uri);

  if (!info.exists) {
    throw new Error(`File not found: ${file.uri}`);
  }

  return true;
};

// ---------- Upload single file ----------
const uploadSingleFile = async ({
  url,
  data,
  file,
  headers,
}) => {
  await validateFile(file);

  console.log('========================');
  console.log('Uploading file:', file.uri);
  console.log('FORMDATA:');
  console.log('  data:', JSON.stringify(data));
  console.log('  file:', file.name);
  console.log('========================');

  const response = await FileSystem.uploadAsync(url, file.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,

    // Backend field name
    fieldName: 'file',

    mimeType: file.type || 'application/octet-stream',

    // Additional multipart fields
    parameters: {
      // Backend expects this exact field
      data: JSON.stringify(data),
    },

    headers,
  });

  // console.log('Upload status:', response.status);

  if (response.status < 200 || response.status >= 300) {
    console.log('===== SERVER ERROR =====');
    console.log('Status:', response.status);
    console.log('Body:', response.body);
    console.log('========================');

    throw new Error(`HTTP ${response.status}`);
  }

  return parseJsonSafe(response.body);
};

// ---------- Main reusable uploader ----------
export const uploadMultipart = async ({
  url,
  data,
  files = [],
  headers = {},
}) => {
  try {
    // =================================================
    // CASE 1: No file
    // Backend expects multipart with data field
    // =================================================
    if (!files.length) {
      const formData = new FormData();

      // REQUIRED
      formData.append('data', JSON.stringify(data));

      console.log('========================');
      console.log('FORMDATA (NO FILE):');
      console.log('  data:', JSON.stringify(data));
      console.log('========================');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url, {
        method: 'POST',
        headers, // DO NOT set Content-Type manually
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await response.text();

      console.log('No-file response status:', response.status);
      console.log('No-file response body:', text);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return parseJsonSafe(text);
    }

    // =================================================
    // CASE 2: One file
    // =================================================
    if (files.length === 1) {
      return await uploadSingleFile({
        url,
        data,
        file: files[0],
        headers,
      });
    }

    // =================================================
    // CASE 3: Multiple files
    // Sequential upload (stable on Android)
    // =================================================
    let finalResponse = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      console.log(`Uploading ${i + 1}/${files.length}:`, file.name);

      finalResponse = await uploadSingleFile({
        url,
        data,
        file,
        headers,
      });
    }

    return finalResponse;

  } catch (error) {
    console.log('========================');
    console.log('UPLOAD MULTIPART ERROR:', error);
    console.log('ERROR MESSAGE:', error?.message);
    console.log('========================');

    if (error.name === 'AbortError') {
      throw new Error('Upload timeout');
    }

    throw error;
  }
};