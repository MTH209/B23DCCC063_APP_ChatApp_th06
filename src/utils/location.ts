import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

/**
 * Yêu cầu quyền truy cập vị trí trên Android
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Quyền truy cập vị trí',
          message: 'Ứng dụng cần quyền vị trí để gửi tọa độ của bạn',
          buttonPositive: 'Đồng ý',
          buttonNegative: 'Từ chối',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  return true;
};

/**
 * Mở tọa độ vị trí trên ứng dụng Google Maps hoặc trình duyệt
 */
export const openGoogleMaps = (
  latitude?: number | string,
  longitude?: number | string,
): void => {
  if (
    latitude === undefined ||
    latitude === null ||
    longitude === undefined ||
    longitude === null
  ) {
    Alert.alert('Thông báo', 'Không tìm thấy tọa độ vị trí trong tin nhắn này.');
    return;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    Alert.alert('Thông báo', 'Tọa độ vị trí không hợp lệ.');
    return;
  }

  // URL mở Google Maps chuẩn hỗ trợ cả app native lẫn trình duyệt
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}`;

  if (Platform.OS === 'android') {
    Linking.openURL(geoUrl).catch(() => {
      // Nếu máy ảo hoặc thiết bị không có app Google Maps, fallback mở link Web
      Linking.openURL(webUrl).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở ứng dụng bản đồ hoặc trình duyệt.');
      });
    });
  } else {
    const appleMapsUrl = `maps:0,0?q=${lat},${lng}`;
    Linking.openURL(appleMapsUrl).catch(() => {
      Linking.openURL(webUrl).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở ứng dụng bản đồ.');
      });
    });
  }
};
