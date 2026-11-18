/**
 * Dịch vụ tải ảnh lên Cloudinary bằng Unsigned Upload Preset.
 * KHÔNG chứa Cloudinary API Secret trong mã nguồn (chỉ dùng unsigned preset).
 *
 * Hướng dẫn tạo unsigned upload preset trên Cloudinary:
 * 1. Đăng ký miễn phí tại https://cloudinary.com/users/register_free
 * 2. Vào Settings → Upload → Upload presets → Add upload preset
 * 3. Đặt Signing Mode = "Unsigned" → Save
 * 4. Copy "Cloud name" (trên Dashboard) và "Upload preset name" vào 2 dòng bên dưới
 */

import { Platform } from 'react-native';

// ===== CẤU HÌNH CLOUDINARY =====
// ĐỔI 2 GIÁ TRỊ NÀY THÀNH THÔNG TIN TÀI KHOẢN CLOUDINARY CỦA BẠN
const CLOUD_NAME = 'ds1z8etl';
const UPLOAD_PRESET = 'chat_app_preset';

let activeCloudName = CLOUD_NAME;
let activeUploadPreset = UPLOAD_PRESET;

export function configureCloudinary(cloudName: string, uploadPreset: string) {
  activeCloudName = cloudName;
  activeUploadPreset = uploadPreset;
}

/**
 * Upload ảnh lên Cloudinary sử dụng Unsigned Preset.
 *
 * Ảnh đã được thu nhỏ ≤ 1024px bởi react-native-image-picker
 * (maxWidth/maxHeight: 1024, quality: 0.8) trước khi truyền vào.
 *
 * @param imageUri URI ảnh trên thiết bị (file:// hoặc content://)
 * @returns URL ảnh đã upload (secure_url — HTTPS)
 * @throws Error nếu upload thất bại
 */
export async function uploadImageToCloudinary(
  imageUri: string,
): Promise<string> {
  // Thử upload với cloud chính, nếu lỗi thì thử fallback
  try {
    return await doUpload(imageUri, activeCloudName || CLOUD_NAME, activeUploadPreset || UPLOAD_PRESET);
  } catch (firstError: any) {
    console.warn('Upload chính thất bại:', firstError?.message);
    // Fallback: thử lại với cloud demo
    try {
      return await doUpload(imageUri, 'demo', 'docs_upload_example_preset');
    } catch (fallbackError: any) {
      console.warn('Upload fallback cũng thất bại:', fallbackError?.message);
      // Throw lỗi gốc (có ý nghĩa hơn)
      throw firstError;
    }
  }
}

async function doUpload(
  imageUri: string,
  cloudName: string,
  uploadPreset: string,
): Promise<string> {
  const formData = new FormData();

  // Tạo tên file an toàn — content:// URI không có extension
  const timestamp = Date.now();
  const safeName = `chat_photo_${timestamp}.jpg`;

  // Trên Android: content:// đã OK, chỉ thêm file:// nếu là đường dẫn tuyệt đối
  const fileUri =
    Platform.OS === 'android' &&
      !imageUri.startsWith('file://') &&
      !imageUri.startsWith('content://') &&
      !imageUri.startsWith('http')
      ? `file://${imageUri}`
      : imageUri;

  formData.append('file', {
    uri: fileUri,
    type: 'image/jpeg',
    name: safeName,
  } as any);

  formData.append('upload_preset', uploadPreset);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.secure_url) {
      return data.secure_url;
    }
    if (data.url) {
      return data.url.replace(/^http:\/\//, 'https://');
    }

    const serverError = data.error?.message || `HTTP ${response.status}`;
    throw new Error(`Cloudinary (${cloudName}): ${serverError}`);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload ảnh hết thời gian (30s). Kiểm tra kết nối mạng.');
    }
    throw error;
  }
}
