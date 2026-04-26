/**
 * File upload helpers (Ad images)
 */
import { storage } from './appwrite';
import { ID } from 'react-native-appwrite';
import { BUCKET_ADS, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '../constants/appwrite';

/**
 * Upload an image to the ads bucket
 * @param fileUri - Local file URI
 * @param mimeType - e.g. 'image/jpeg', 'image/png'
 * @returns file ID
 */
export const uploadAdImage = async (fileUri: string, mimeType: string): Promise<string> => {
  const fileName = `ad_${ID.unique()}.jpg`;

  // Create file object from URI
  const fileStats = await getFileSize(fileUri);

  const file = {
    uri: fileUri,
    name: fileName,
    type: mimeType,
    size: fileStats.size,
  };

  const uploaded = await storage.createFile(BUCKET_ADS, ID.unique(), file as any);
  return uploaded.$id;
};

/**
 * Build public URL from file ID
 */
export const getAdImageUrl = (fileId: string): string => {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ADS}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
};

/**
 * Get file size from URI (React Native)
 */
const getFileSize = async (uri: string): Promise<{ size: number }> => {
  // For React Native, we use Image.getSize or fetch
  return new Promise((resolve, reject) => {
    const { getSize } = require('react-native').Image;
    getSize(uri, (width: number, height: number, size: number) => {
      resolve({ size });
    }, reject);
  });
};
