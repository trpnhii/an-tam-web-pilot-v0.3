# An Tâm Web Prototype

Prototype tĩnh cho **An Tâm** — trợ lý an toàn số voice-first giúp người lớn tuổi dừng lại, kiểm tra, xác minh và hỏi người tin cậy trước khi hành động trước một yêu cầu đáng ngờ.

## Chức năng

- nhập tình huống bằng giọng nói hoặc văn bản;
- bổ sung ảnh chụp màn hình, đường link và số điện thoại;
- nhận diện cục bộ các dấu hiệu như thúc ép, mạo danh, giữ bí mật, yêu cầu tiền/OTP và link lạ;
- giải thích bằng chữ lớn và đọc kết quả thành tiếng;
- đề xuất một hành động an toàn tiếp theo;
- soạn tin nhắn cho người thân sau khi người dùng đồng ý;
- chế độ chữ lớn, tương phản cao và tốc độ đọc chậm;
- lưu phản hồi pilot trong trình duyệt và xuất CSV.

> Đây là prototype hỗ trợ quyết định, không phải công cụ xác nhận chắc chắn một tình huống là an toàn. Ảnh chỉ được xem trước; phiên bản tĩnh hiện chưa có OCR hoặc kết nối threat-intelligence theo thời gian thực.

## Chạy trên máy

Có thể mở trực tiếp `index.html`, hoặc chạy một static server:

```bash
python -m http.server 8000
```

Sau đó mở `http://localhost:8000`.

## Kiểm tra

```bash
node --check app.js
```

## Deploy GitHub Pages

Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) tự kiểm tra JavaScript, đóng gói các file tĩnh và deploy khi có thay đổi trên nhánh `main`.

Lần đầu sử dụng:

1. Push code lên GitHub.
2. Vào **Settings → Pages**.
3. Ở **Build and deployment → Source**, chọn **GitHub Actions**.
4. Mở tab **Actions** để theo dõi workflow `Deploy static site to GitHub Pages`.

Website dự kiến: `https://trpnhii.github.io/an-tam-web-pilot-v0.3/`

## Quyền riêng tư của prototype

Phân tích và phản hồi chạy trong trình duyệt. Nội dung kiểm tra không được gửi tới máy chủ của nhóm. Speech Recognition có thể được trình duyệt hoặc nhà cung cấp thiết bị xử lý theo chính sách của họ.
