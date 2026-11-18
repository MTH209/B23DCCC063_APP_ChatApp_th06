/**
 * Định dạng thời gian cho tin nhắn trong phòng chat (vd: 14:30)
 */
export const formatMessageTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Định dạng thời gian cho danh sách cuộc hội thoại:
 * - Nếu trong ngày: hiển thị giờ (vd: 14:30)
 * - Nếu khác ngày: hiển thị ngày/tháng (vd: 04/11)
 */
export const formatConversationTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
};

/**
 * Định dạng trạng thái "Hoạt động X phút trước" khi người dùng offline
 */
export const formatLastSeen = (timestamp?: number): string => {
  if (!timestamp) return 'Ngoại tuyến';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'Vừa mới hoạt động';

  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return 'Hoạt động vừa xong';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `Hoạt động ${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hoạt động ${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Hoạt động ${diffDays} ngày trước`;
  }

  return 'Hoạt động từ lâu';
};
