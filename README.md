# Ứng Dụng ChatApp Realtime (React Native CLI + Firebase)

Dự án phát triển ứng dụng trò chuyện thời gian thực (Bài thực hành số 6) nâng cấp từ Bài thực hành số 5, xây dựng bằng **React Native CLI**, **Firebase Realtime Database** và dịch vụ lưu trữ đám mây **Cloudinary**.

---

## 📑 Mục lục
1. [Tính năng chính](#-tính-năng-chính)
2. [Yêu cầu môi trường](#-yêu-cầu-môi-trường)
3. [Hướng dẫn cấu hình Firebase](#-hướng-dẫn-cấu-hình-firebase)
4. [Hướng dẫn cấu hình Cloudinary (Tải ảnh)](#-hướng-dẫn-cấu-hình-cloudinary-tải-ảnh)
5. [Cài đặt & Khởi chạy ứng dụng](#-cài-đặt--khởi-chạy-ứng-dụng)
6. [Hướng dẫn kiểm thử các tính năng](#-hướng-dẫn-kiểm-thử-các-tính-năng)
7. [Khắc phục sự cố thường gặp (Troubleshooting)](#-khắc-phục-sự-cố-thường-gặp-troubleshooting)

---

## 🚀 Tính năng chính

### Phần A — Bắt buộc (8.0 điểm)
- **Trạng thái cuộc trò chuyện (1.5đ)**:
  - Hiển thị `"đang soạn tin…"` theo thời gian thực; tự tắt sau 3 giây không gõ, khi gửi tin hoặc khi rời màn hình.
  - Hiển thị trạng thái tin cuối: `"Đã gửi"` hoặc `"Đã xem (kèm thời gian xem)"`.
  - Hiển thị `"Hoạt động X phút trước"` khi đối phương offline.
  - Tích hợp `onDisconnect()` để trạng thái typing và online không bị kẹt khi ngắt kết nối đột ngột.
- **Thu hồi và tương tác tin nhắn (1.5đ)**:
  - Nhấn giữ tin nhắn để mở menu: Sao chép, Thu hồi (chỉ tin của mình), Thả cảm xúc (`👍`, `❤️`, `😂`, `😮`, `😢`).
  - Đánh dấu `recalled: true` (không xóa node), hiển thị `"🚫 Tin nhắn đã được thu hồi"`.
  - Tin cuối bị thu hồi tự động cập nhật dòng tin tóm tắt ở màn hình Home.
  - Hiển thị danh sách cảm xúc và đếm số lượng người thả dưới bong bóng tin.
- **Gửi ảnh (2.0đ)**:
  - Nút 📷 chụp ảnh hoặc chọn từ thư viện (`react-native-image-picker`). Có kiểm tra và xin quyền Camera.
  - Tự động thu nhỏ ảnh (cạnh dài ≤ 1024px) và tải lên Cloudinary bằng **Unsigned Upload Preset**.
  - Hiển thị bong bóng tạm kèm vòng xoay loading; nút "Thử lại" khi tải lỗi.
  - Nhấn vào ảnh để xem toàn màn hình.
  - Màn hình Home hiển thị `"📷 Hình ảnh"` hoặc `"📍 Vị trí"`.
- **Chat nhóm (2.0đ)**:
  - Màn hình Tạo nhóm: đặt tên nhóm và chọn tối thiểu 2 thành viên từ Danh bạ.
  - Tin nhắn hiển thị tên người gửi phía trên bong bóng. Tiêu đề hiển thị tên nhóm và số thành viên đang online.
  - Home hiển thị cả 1-1 và nhóm, sắp xếp theo tin mới nhất, số tin chưa đọc riêng biệt cho từng người.
  - Hỗ trợ đầy đủ tin văn bản, vị trí GPS và hình ảnh trong nhóm.
- **Màn hình Thông báo thật (1.0đ)**:
  - Ghi nhận thông báo thật vào `notifications/{uid}` khi có tin mới (lúc không ở phòng chat), khi được thêm vào nhóm, hoặc khi có người thả cảm xúc vào tin của mình.
  - Tab Thông báo có Badge đếm số thông báo chưa đọc.
  - Nhấn vào thông báo sẽ mở đúng cuộc trò chuyện và đánh dấu đã đọc.
  - Nút "Đánh dấu tất cả đã đọc".

### Phần B & C — Kỹ thuật & Nâng cao (+2.0 điểm)
- **Multi-path update**: Ghi tin nhắn, lastMessage, và `unreadCount` trong 1 lệnh `update()` duy nhất sử dụng `increment(1)`.
- **Phân trang (Pagination)**: Lần đầu tải 20 tin mới nhất (`limitToLast(20)`), cuộn lên đầu danh sách tải thêm 20 tin cũ mà không bị giật/nhảy vị trí.
- **Security Rules**: Kiểm soát chặt chẽ quyền đọc/ghi theo từng vai trò (chỉ thành viên mới xem/gửi tin, chỉ người gửi mới được thu hồi, chỉ ghi typing/reaction của chính mình).
- **Quản trị nhóm**: Đổi tên nhóm, thêm thành viên mới, rời nhóm (kèm tin nhắn hệ thống thông báo).
- **Hồ sơ cá nhân**: Đổi ảnh đại diện (upload Cloudinary) và đổi họ tên hiển thị trực tiếp trong Cài đặt.
- **Trả lời tin nhắn (Reply/Quote)**: Trích dẫn tin nhắn cụ thể, nhấn vào trích dẫn sẽ tự động cuộn tới tin gốc.
- **Tìm kiếm nội dung**: Tìm kiếm văn bản tin nhắn ngay trong cuộc trò chuyện.

---

## 💻 Yêu cầu môi trường

- **Node.js**: `>= 18.x`
- **React Native CLI**: 0.88.x
- **JDK**: Java 17 (khuyên dùng Azul Zulu 17)
- **Android SDK**: Android API 34+
- Thiết bị thật Android hoặc máy ảo Android Emulator đã bật Google Play Services.

---

## 🔥 Hướng dẫn cấu hình Firebase

Ứng dụng sử dụng **Firebase Realtime Database** và **Firebase Authentication**.

### Bước 1: Kiểm tra thông tin kết nối trong ứng dụng
File cấu hình kết nối nằm tại: `src/services/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyBrcRR7UZEZf-7R0QNqukBwzdfbviWoz0Y",
  authDomain: "chat-app-d2a23.firebaseapp.com",
  databaseURL: "https://chat-app-d2a23-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-app-d2a23",
  storageBucket: "chat-app-d2a23.firebasestorage.app",
  messagingSenderId: "666358934473",
  appId: "1:666358934473:web:c02a3cec0302a1b18cd618",
};
```
*(Nếu bạn dùng project Firebase cá nhân khác, hãy thay thế toàn bộ object trên bằng config của bạn).*

### Bước 2: Kích hoạt Authentication
1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Chọn dự án của bạn (ví dụ `chat-app-d2a23`).
3. Vào menu **Build** > **Authentication** > chọn tab **Sign-in method**.
4. Bật provider **Email/Password** (chỉ cần bật Email/Password, không cần bật Email link).

### Bước 3: Cấu hình và Publish Security Rules (BẮT BUỘC)
> [!IMPORTANT]
> File `database.rules.json` chỉ nằm ở mã nguồn local. Để Firebase cho phép đọc/ghi dữ liệu, bạn **bắt buộc phải copy nội dung này và Publish trên Firebase Console**.

1. Mở [Firebase Console](https://console.firebase.google.com/) > chọn dự án.
2. Menu trái chọn **Build** > **Realtime Database** > chọn tab **Rules**.
3. Xóa toàn bộ nội dung cũ trong khung soạn thảo, copy toàn bộ nội dung file `database.rules.json` và dán vào:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    },

    "conversations": {
      ".read": "auth != null",
      ".write": "auth != null"
    },

    "messages": {
      "$convId": {
        ".read": "auth != null && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || $convId.contains(auth.uid))",
        ".write": "auth != null && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || $convId.contains(auth.uid) || !root.child('conversations/' + $convId).exists())",
        "$msgId": {
          "recalled": {
            ".validate": "newData.parent().child('senderId').val() === auth.uid"
          },
          "reactions": {
            "$uid": {
              ".validate": "auth.uid === $uid"
            }
          }
        }
      }
    },

    "userChats": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null"
      }
    },

    "readStatus": {
      "$convId": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    },

    "typing": {
      "$convId": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    },

    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null"
      }
    },

    "chats": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

4. Nhấn nút **Publish** ở góc trên bên phải để áp dụng luật bảo mật mới.

---

## ☁️ Hướng dẫn cấu hình Cloudinary (Tải ảnh)

Để gửi ảnh trong đoạn chat và cập nhật ảnh đại diện cá nhân, bạn cần một tài khoản Cloudinary miễn phí với **Unsigned Upload Preset**.

> [!WARNING]
> Theo yêu cầu đề bài, **tuyệt đối không đưa Cloudinary API Secret vào mã nguồn**. Ta chỉ sử dụng `cloudName` và `uploadPreset` (Unsigned).

### Bước 1: Đăng ký tài khoản Cloudinary
1. Truy cập [cloudinary.com/users/register_free](https://cloudinary.com/users/register_free) và đăng ký tài khoản miễn phí.
2. Sau khi đăng nhập, tại trang **Dashboard**, bạn sẽ thấy trường **Cloud name** (ví dụ: `dxxxxxxxx`). Hãy lưu lại tên này.

### Bước 2: Tạo Unsigned Upload Preset
1. Bấm vào biểu tượng **Cài đặt (bánh răng)** ở góc dưới bên trái màn hình Cloudinary.
2. Chọn mục **Upload** ở menu bên trái.
3. Cuộn xuống phần **Upload presets** > bấm **Add upload preset**.
4. Cấu hình các thông số sau:
   - **Upload preset name**: Đặt tên (ví dụ: `chat_app_preset`).
   - **Signing Mode**: Chuyển từ *Signed* sang **Unsigned** *(bước này quan trọng nhất)*.
   - **Folder**: Nhập `chat_images` (tùy chọn).
5. *(Tùy chọn - Tự động thu nhỏ ảnh cạnh dài ≤ 1024px)*:
   - Ở cột bên trái của trang preset, bấm vào **Incoming Transformation**.
   - Bấm **Edit**, cấu hình:
     - **Mode**: `Limit` (`c_limit`)
     - **Width**: `1024`
     - **Height**: `1024`
   - Bấm **OK**.
6. Bấm nút **Save** ở góc trên cùng bên phải để lưu Preset.

### Bước 3: Cập nhật thông tin vào source code
Mở file `src/services/uploadService.ts`, tìm dòng 17-18 và điền đúng thông tin của bạn:

```typescript
// src/services/uploadService.ts

// Thay thế 2 giá trị này bằng Cloudinary của bạn:
const CLOUD_NAME = 'TÊN_CLOUD_CỦA_BẠN';         // Ví dụ: 'dhyoqjtwq'
const UPLOAD_PRESET = 'chat_app_preset';        // Tên preset unsigned vừa tạo
```

---

## 🛠️ Cài đặt & Khởi chạy ứng dụng

### 1. Cài đặt các thư viện phụ thuộc
Mở terminal tại thư mục gốc của dự án (`ChatApp`):

```bash
npm install
```

### 2. Cấp quyền ứng dụng trên Android
File `android/app/src/main/AndroidManifest.xml` đã được bổ sung đầy đủ các quyền:
- `android.permission.CAMERA`: Chụp ảnh gửi tin
- `android.permission.READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES`: Chọn ảnh từ thư viện
- `android.permission.ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`: Gửi vị trí GPS

### 3. Build và chạy trên thiết bị / máy ảo
Vì dự án có thêm các thư viện native mới (`react-native-image-picker`, `@react-native-clipboard/clipboard`), bạn cần build lại ứng dụng native:

**Cửa sổ terminal 1 — Chạy Metro Bundler:**
```bash
npm start -- --reset-cache
```

**Cửa sổ terminal 2 — Build & Run ứng dụng:**
```bash
npx react-native run-android
```

---

## 🧪 Hướng dẫn kiểm thử các tính năng

Để kiểm tra đầy đủ các tính năng Realtime, bạn nên chuẩn bị **2 tài khoản đăng nhập trên 2 máy** (hoặc 1 máy thật + 1 máy ảo Android):

### 1. Trạng thái "Đang soạn tin..." & "Đã xem"
- Mở cuộc trò chuyện giữa Tài khoản A và Tài khoản B.
- **Đang gõ**: Tài khoản A bắt đầu nhập chữ vào ô chat ➔ Tài khoản B nhìn thấy thanh tiêu đề chuyển thành `"đang soạn tin…"`. Khi Tài khoản A ngừng gõ 3 giây hoặc gửi tin, trạng thái lập tức biến mất.
- **Đã gửi / Đã xem**:
  - Tài khoản A gửi tin nhắn ➔ dưới bong bóng tin hiện `"Đã gửi"`.
  - Tài khoản B mở vào phòng chat đọc tin ➔ dòng trạng thái trên máy Tài khoản A lập tức chuyển thành `"Đã xem (HH:mm)"`.
- **Trạng thái offline**: Tắt kết nối mạng hoặc đóng ứng dụng ở Tài khoản B ➔ Tài khoản A thấy tiêu đề chuyển thành `"Hoạt động X phút trước"`.

### 2. Thu hồi tin nhắn & Thả cảm xúc
- **Thả cảm xúc**: Nhấn giữ một tin nhắn bất kỳ ➔ bảng emoji hiện lên (`👍`, `❤️`, `😂`, `😮`, `😢`) ➔ chọn một cảm xúc ➔ biểu tượng cảm xúc xuất hiện dưới bong bóng kèm số lượng người thả.
- **Thu hồi**: Nhấn giữ tin nhắn **do chính bạn gửi** ➔ chọn `"Thu hồi tin nhắn"` ➔ tin nhắn chuyển thành `"🚫 Tin nhắn đã được thu hồi"` trên màn hình cả hai máy, đồng thời ở màn hình Home tin nhắn cuối cũng hiển thị nội dung thu hồi.

### 3. Gửi hình ảnh qua Cloudinary
- Bấm vào icon 📷 cạnh ô nhập tin nhắn ➔ chọn **📸 Chụp ảnh mới** hoặc **🖼️ Chọn từ thư viện**.
- Màn hình chat hiển thị bong bóng tạm có hiệu ứng xoay tròn `"Đang tải lên..."`.
- Sau khi upload lên Cloudinary thành công, ảnh hiển thị rõ nét.
- Nhấn trực tiếp vào bức ảnh để phóng to toàn màn hình, bấm ✕ để đóng lại.

### 4. Chat nhóm (Group Chat)
- Vào màn hình Home hoặc Danh bạ ➔ bấm nút **➕ Tạo nhóm**.
- Nhập tên nhóm và tích chọn ít nhất 2 người bạn ➔ bấm **Tạo**.
- Trong nhóm: tin nhắn của người khác hiển thị tên người gửi; tiêu đề nhóm hiển thị tổng số thành viên và số người đang online.
- Bấm vào tiêu đề nhóm (hoặc icon ℹ️) để mở bảng **Quản trị nhóm**: đổi tên nhóm, thêm thành viên mới, hoặc rời khỏi nhóm.

### 5. Thông báo thật (Notifications)
- Khi Tài khoản A gửi tin nhắn cho Tài khoản B (khi Tài khoản B đang ở ngoài màn hình chính hoặc tab khác) ➔ Tab **Thông báo** của Tài khoản B xuất hiện Badge đếm số lượng chưa đọc.
- Chuyển sang tab Thông báo ➔ nhấn vào thông báo ➔ ứng dụng tự động mở đúng cuộc trò chuyện tương ứng và đánh dấu đã đọc.

---

## ❓ Khắc phục sự cố thường gặp (Troubleshooting)

### 1. Bị lỗi "Error: Permission denied"
- **Nguyên nhân**: Bạn chưa Publish Security Rules trên Firebase Console, hoặc Rules bị lỗi cú pháp.
- **Cách khắc phục**: Làm theo đúng [Bước 3 trong Hướng dẫn Firebase](#bước-3-cấu-hình-và-publish-security-rules-bắt-buộc), paste nội dung `database.rules.json` và nhấn nút **Publish**. Sau đó thoát hẳn ứng dụng và mở lại.

### 2. Bị lỗi "Tải lỗi. Thử lại" khi gửi ảnh
- **Nguyên nhân**:
  1. Chưa tạo Upload Preset dạng **Unsigned** trên Cloudinary.
  2. Điền sai `CLOUD_NAME` hoặc `UPLOAD_PRESET` trong `src/services/uploadService.ts`.
- **Cách khắc phục**:
  - Đăng nhập Cloudinary kiểm tra lại tên Cloud name và chắc chắn Signing Mode của preset là **Unsigned**.
  - Kiểm tra thông báo Alert chi tiết trên màn hình điện thoại khi bấm gửi ảnh để biết chính xác mã lỗi trả về từ máy chủ.

### 3. Không thấy chữ "đang soạn tin..."
- **Nguyên nhân**:
  1. Bạn đang kiểm tra trên cùng 1 tài khoản (ứng dụng tự động ẩn trạng thái typing của chính bản thân người gõ).
  2. Chưa cập nhật Security Rules cho node `typing` trên Firebase Console.
- **Cách khắc phục**: Đăng nhập 2 tài khoản khác nhau trên 2 thiết bị và đảm bảo Rules đã được Publish.

### 4. Ứng dụng bị văng khi bấm chụp ảnh hoặc chọn ảnh
- **Nguyên nhân**: Thiết bị chưa được cấp quyền Camera hoặc bạn chưa rebuild lại ứng dụng Android sau khi cài `react-native-image-picker`.
- **Cách khắc phục**:
  - Chạy lại lệnh: `npx react-native run-android`.
  - Vào Cài đặt máy > Ứng dụng > ChatApp > Quyền (Permissions) > Bật quyền Máy ảnh (Camera) và Bộ nhớ (Photos/Media).
