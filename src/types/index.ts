export type MessageType = 'text' | 'image' | 'location' | 'system';

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  type: MessageType;
  text?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: number;
  timestamp?: number; // Tương thích ngược với BT5
  recalled?: boolean;
  reactions?: Record<string, string>; // { uid: "❤️" | "👍" | "😂" | "😮" | "😢" }
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
    type: MessageType;
  };
  // Dành cho hiển thị tạm thời lúc đang upload
  isUploading?: boolean;
  uploadFailed?: boolean;
  localUri?: string;
};

export type ConversationType = 'direct' | 'group';

export type ConversationItem = {
  chatId: string;
  convId: string;
  type: ConversationType;
  name: string;
  avatar: string;
  recipientId?: string; // Dành cho 1-1
  recipientName?: string; // Dành cho 1-1
  recipientAvatar?: string; // Dành cho 1-1
  recipientOnline?: boolean;
  lastSeen?: number;
  lastMessage: string;
  lastMessageTime: number;
  lastSenderId?: string;
  unreadCount: number;
  members?: Record<string, boolean>;
};

export type ConversationModel = {
  id: string;
  type: ConversationType;
  name?: string;
  avatar?: string;
  members: Record<string, boolean>;
  createdBy: string;
  createdAt: number;
  adminUids?: Record<string, boolean>;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: number;
};

export type NotificationType = 'message' | 'group_added' | 'reaction' | 'system';

export type Notification = {
  id: string;
  type: NotificationType;
  convId: string;
  fromUid: string;
  fromName: string;
  text: string;
  content?: string; // Tương thích ngược
  createdAt: number;
  time?: string; // Tương thích hiển thị
  read: boolean;
  isRead?: boolean; // Tương thích ngược
};
