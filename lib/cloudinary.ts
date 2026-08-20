import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const DEFAULT_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dirarq6it';
const DEFAULT_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

export interface PickAndUploadResult {
  url?: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Pick an image from the user's photo gallery.
 */
export async function pickProfileImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library in iOS Settings to choose a profile picture.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0];
  } catch (err: any) {
    console.error('[pickProfileImage] Error:', err);
    throw new Error(err?.message || 'Failed to open photo library');
  }
}

/**
 * Upload an image asset to Cloudinary REST API.
 */
export async function uploadImageToCloudinary(
  asset: ImagePicker.ImagePickerAsset,
  cloudName: string = DEFAULT_CLOUD_NAME,
  uploadPreset: string = DEFAULT_UPLOAD_PRESET
): Promise<string> {
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  
  if (asset.base64) {
    const mimeType = asset.mimeType || 'image/jpeg';
    formData.append('file', `data:${mimeType};base64,${asset.base64}`);
  } else {
    // @ts-ignore RN FormData file format
    formData.append('file', {
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || 'profile.jpg',
    });
  }

  formData.append('upload_preset', uploadPreset);

  const response = await fetch(cloudinaryUrl, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error?.message || 'Failed to upload image to Cloudinary';
    throw new Error(errorMessage);
  }

  return data.secure_url || data.url;
}

/**
 * Convenience method to pick a photo and upload it directly to Cloudinary.
 */
export async function pickAndUploadProfileImage(
  cloudName?: string,
  uploadPreset?: string
): Promise<PickAndUploadResult> {
  try {
    const asset = await pickProfileImage();
    if (!asset) {
      return { cancelled: true };
    }

    const url = await uploadImageToCloudinary(asset, cloudName, uploadPreset);
    return { url };
  } catch (err: any) {
    console.warn('[Cloudinary] Upload failed:', err?.message || err);
    return { error: err?.message || 'Image upload failed' };
  }
}
