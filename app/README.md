# Web app ôn thi Tin học cơ bản

Chạy offline: bấm đúp `index.html` (mở bằng Chrome hoặc Edge). Không cần cài gì, không gửi dữ liệu ra ngoài.

## Tính năng

| Tab | Chức năng |
|---|---|
| Tổng quan | Việc hôm nay, số câu/thẻ đến hạn ôn, độ chính xác theo mô đun, xuất/nhập tiến độ |
| Lộ trình | 21 ngày (20 ngày ôn + ngày thi) có tick hoàn thành. Đổi ngày thi thì cả lộ trình dịch theo |
| Trắc nghiệm | 279 câu IU01–IU06. Chế độ thông minh (câu đến hạn rồi câu mới), chỉ câu từng sai, hoặc ngẫu nhiên. Có giải thích ngay sau mỗi câu |
| Thẻ nhớ | 210 thẻ (hàm Excel, phím tắt, thao tác). "Chưa nhớ" quay lại ngay, "Nhớ" lặp lại sau 1, 3, 7, 14 ngày |
| Thi thử | Lý thuyết 30 câu/30 phút, chấm điểm /10. Thực hành: đồng hồ 120 phút chia 5 chặng, ghi điểm tự chấm |
| Sổ lỗi | Ghi lỗi thực hành đã mắc và cách làm đúng, tick khi đã khắc phục |

Tiến độ lưu trong trình duyệt (localStorage). Xoá dữ liệu trình duyệt sẽ mất tiến độ, nên thỉnh thoảng bấm "Xuất tiến độ" ở tab Tổng quan để sao lưu.

## Giới hạn cần biết

- Câu hỏi và thẻ do Claude soạn từ giáo trình `giao-trinh/IU01–IU06.pdf` (tác giả Ths. Lê Thanh Phúc, Học viện Ngân hàng). **Không phải câu hỏi thi thật của IUH.**
- Phần slide thiếu nội dung (giáo trình mất ký hiệu phím, ảnh), nên một số câu dựa trên kiến thức phổ thông về Windows/Office và có ghi trong phần giải thích. Câu về Windows theo giao diện Vista/7, câu về Office theo bản 2010. Nếu phòng thi dùng bản khác, tên menu có thể khác.
- 49 câu Excel đã được tính lại từng câu. Các mô đun còn lại chưa kiểm tra độc lập từng câu. Thấy câu nghi sai thì ghi vào Sổ lỗi hoặc báo lại để sửa.
- App không thay được việc luyện trên Word/Excel/PowerPoint thật. Phần thực hành vẫn phải làm bằng các đề trong `de-thuc-hanh/`.

## Cập nhật câu hỏi

Sửa file trong `src/IU0x.json`, rồi chạy `python build_data.py src` để tạo lại `data.js`. Script cảnh báo câu trùng, đáp án trùng nhau và sai định dạng.
