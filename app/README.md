# Web app ôn thi Tin học cơ bản

**Website:** https://spacecadetvux.github.io/ccth-final/app/ (tự deploy khi push lên nhánh `main`, xem mục Triển khai).

Chạy offline: bấm đúp `index.html` (mở bằng Chrome hoặc Edge). Không cần cài gì, không gửi dữ liệu ra ngoài.

## Tính năng

| Tab | Chức năng |
|---|---|
| Tổng quan | Việc hôm nay, số câu/thẻ đến hạn ôn, độ chính xác theo mô đun, xuất/nhập tiến độ |
| Lộ trình | 21 ngày (20 ngày ôn + ngày thi) có tick hoàn thành. Đổi ngày thi thì cả lộ trình dịch theo |
| Trắc nghiệm | 280 câu IU01–IU06. Chế độ thông minh (câu đến hạn rồi câu mới), chỉ câu từng sai, ngẫu nhiên, hoặc "hay gặp trong đề thật" (chỉ bật khi đã có dữ liệu đề thật). Có giải thích ngay sau mỗi câu |
| Đề trắc nghiệm | 280 câu chia cố định thành 14 đề × 20 câu (Đề 1–14, câu 1–20, mỗi đề trộn các mô đun, thứ tự câu và đáp án không đổi giữa các lần mở). Làm → nộp → chấm thang 10 (kèm điểm theo mô đun), xem lại đáp án và giải thích, lọc câu sai. Có đồng hồ bấm giờ (không giới hạn thời gian), lưu lịch sử mọi lượt làm, bài làm dở tự lưu và tiếp tục được. Câu sai tự vào lịch ôn của tab Trắc nghiệm và Sổ lỗi |
| Thẻ nhớ | 210 thẻ (hàm Excel, phím tắt, thao tác). "Chưa nhớ" quay lại ngay, "Nhớ" lặp lại sau 1, 3, 7, 14 ngày |
| Đề thực hành | **Đề mẫu IUH chính thức** ở đầu tab (từ `../de-mau-iuh/`): quy định của đề, tải trọn bộ zip hoặc từng file dữ liệu, đồng hồ 90 phút, checklist 25 ý chấm theo thang điểm của đề (có hình trong đề, cách làm, và kết quả đúng của phần Excel) tự tính điểm /10. Bên dưới là 30 đề PDF của trường khác quét tự động từ `../de-thuc-hanh/` (6 đề trọn bộ KHTN 120 phút, 4 Word, 10 Excel, 10 PowerPoint). Mỗi đề có nút Mở, Tải và "Làm đề này" (mở đề, chạy đồng hồ 120 phút cho đề trọn bộ hoặc 30 phút cho đề mô đun, ghi điểm tự chấm). Hiện số lần đã làm và điểm cao nhất theo từng đề |
| Thi thử | Lý thuyết 30 câu/30 phút, chấm điểm /10. Thực hành: đồng hồ 120 phút chia 5 chặng, ghi điểm tự chấm |
| Sổ lỗi | Ghi lỗi thực hành đã mắc và cách làm đúng, tick khi đã khắc phục |

Tiến độ, kết quả các đề trắc nghiệm và bài làm dở lưu trong trình duyệt (localStorage, theo từng trình duyệt và từng thư mục mở file; mở bằng Chrome và Edge sẽ là hai bộ dữ liệu riêng).

Cách chia đề: câu hỏi được chia lần lượt theo thứ tự ngân hàng (`src/IU01…IU06`), nên thêm hoặc xoá câu sẽ làm thành phần các đề thay đổi. Lịch sử cũ vẫn xem lại được vì mỗi lượt lưu danh sách câu đã làm, nhưng câu bị sửa chữ hoặc xoá sẽ không hiện lại. Số câu không chia hết cho 20 thì một số đề có 21 câu. Xoá dữ liệu trình duyệt sẽ mất tiến độ, nên thỉnh thoảng bấm "Xuất tiến độ" ở tab Tổng quan để sao lưu.

## Giao diện

- **Responsive 3 mốc:** điện thoại (< 600px: thanh dưới 5 mục + bảng "Khác"), tablet (600–959px), desktop (≥ 960px: thanh bên có nhóm mục). Đã kiểm tra bằng ảnh chụp ở 390, 768 và 1280px.
- **Sáng/tối:** nút ở góc trên phải đổi Tự động, Sáng, Tối (lưu lại). Mọi cặp màu chữ đều đạt tỉ lệ tương phản WCAG AA (≥ 4,5:1) ở cả hai chế độ.
- **Dễ dùng:** vùng chạm ≥ 44px, hộp thoại xác nhận riêng thay cho `alert/confirm`, thông báo toast, màn làm bài tập trung (ẩn thanh điều hướng, có thanh thao tác cố định phía dưới), trạng thái đúng/sai có biểu tượng và chữ chứ không chỉ màu.
- **Phím tắt:** `A–D` hoặc `1–4` chọn đáp án, `←` `→` chuyển câu, `Enter` câu tiếp (trắc nghiệm tự do), `Space` lật thẻ, `Esc` đóng hộp thoại.
- **Địa chỉ từng mục:** `#home`, `#plan`, `#quiz`, `#tn`, `#cards`, `#prac`, `#mock`, `#errors`. Nút Back của trình duyệt quay lại mục trước.
- **An toàn dữ liệu:** chip "Đã lưu hh:mm" ở đầu trang, cảnh báo đỏ nếu trình duyệt không cho ghi, nút tải file sao lưu `.json` và khôi phục từ file ở mục Tổng quan. Dữ liệu cũ bị hỏng không làm app chết: bản gốc được giữ lại trong trình duyệt và có thông báo.
- File: `index.html` (khung), `style.css` (design tokens và thành phần), `ui.js` (icon SVG nội tuyến, toast, hộp thoại), `app.js` (logic và các trang), `data.js` (do `build_data.py` sinh ra).

## Triển khai

Workflow `.github/workflows/pages.yml` chạy mỗi khi push lên `main` và đưa `app/`, `de-mau-iuh/`, `de-thuc-hanh/`, `giao-trinh/` lên GitHub Pages (giữ nguyên cấu trúc thư mục vì `data.js` dùng đường dẫn `../de-...`). Site không chạy `build_data.py`, nên sau khi sửa câu hỏi hoặc đề hãy chạy `cd app && python build_data.py src` rồi commit cả `data.js` lẫn `de-mau-iuh/DeMau_IUH_tron-bo.zip`.

## Giới hạn cần biết

- Câu hỏi và thẻ do Claude soạn từ giáo trình `giao-trinh/IU01–IU06.pdf` (tác giả Ths. Lê Thanh Phúc, Học viện Ngân hàng). **Không phải câu hỏi thi thật của IUH.**
- Phần slide thiếu nội dung (giáo trình mất ký hiệu phím, ảnh), nên một số câu dựa trên kiến thức phổ thông về Windows/Office và có ghi trong phần giải thích. Câu về Windows theo giao diện Vista/7, câu về Office theo bản 2010. Nếu phòng thi dùng bản khác, tên menu có thể khác.
- Rà soát 17/10/2026: cả 280 câu đã được đối chiếu từng câu với giáo trình (hoặc tính lại với câu Excel và hệ đếm), không phát hiện đáp án sai. Một mẫu 20 câu ngẫu nhiên được kiểm lại độc lập. Hạn chế: slide giáo trình chỉ có tiêu đề ở nhiều mục, nên phần lớn câu IU01 (30/45), IU06 (23/40), IU03 (14/50) và nhiều câu phím tắt IU02/IU05 dựa vào kiến thức chuẩn ngoài giáo trình, không phải nội dung giáo trình. Đúng về kiến thức, nhưng đừng coi là "giáo trình có ghi".
- Đáp án đúng là option dài nhất ở 119/280 câu (42%, ngẫu nhiên kỳ vọng ~25%; IU06 60%, IU02 56%, IU05 53%). Đề thật không nhất thiết có thiên lệch này, nên điểm thi thử có thể cao hơn thực lực nếu bạn đoán theo độ dài. Hãy chọn theo kiến thức.
- App không thay được việc luyện trên Word/Excel/PowerPoint thật. Phần thực hành vẫn phải làm bằng các đề trong `de-thuc-hanh/`.

## Đề thực hành

- Đề mẫu IUH: nội dung checklist nằm ở `src/de-mau-iuh.json`. Phần `t` (yêu cầu), `p` (điểm), hình lấy từ đề; `hint` và `check` do Claude soạn, không phải đáp án chính thức. `check` của Excel tính bằng python từ dữ liệu trong đề. Đã trích 3 hình PNG nhúng (cây thư mục, bảng thống kê, giấy giới thiệu), khớp 3 chỗ đề ghi "như hình"; chưa xác nhận được là không còn hình dạng khác vì chưa xuất được bản PDF từ Word. Phép tính ở câu Windows số 3 bị mất chỉ số trên khi trích chữ, nên đã ghi chú "xem file .doc". Đề .doc không mở được trong trình duyệt, hãy tải zip rồi mở bằng Word.
- Thêm đề mới: bỏ PDF vào `de-thuc-hanh/` đúng tên mẫu (`DETHI_TINHOC_A_<WORD|EXCEL|POWERPOINT>_de<N>.pdf` hoặc `KHTN-<yyyy>-<mm>-<dd>_mau<N>.pdf`) rồi chạy `python build_data.py src`. File tên lạ bị bỏ qua và có cảnh báo.
- Link PDF là đường dẫn tương đối `../de-thuc-hanh/...`, nên giữ nguyên vị trí thư mục `app` và `de-thuc-hanh` cạnh nhau. Nếu nút Tải chỉ mở PDF trong tab mới thì bấm Ctrl+S ở tab đó.
- Đây là đề của trường khác (ĐH KHTN, CĐKT Cao Thắng). Chưa có đề thực hành IUH thật. Đề mô đun ghi 30 phút ở đầu đề Excel/PowerPoint số 1, chưa kiểm từng đề.
- Đề của trường khác không kèm file dữ liệu: bảng số liệu và "nội dung cho sẵn" phải gõ lại từ hình trong đề. Riêng đề mẫu IUH có đủ dữ liệu làm bài. Phần Windows cần file `.TXT`/`.LOG` có dung lượng nhỏ, tìm trong `C:\Windows`.
- Sách bài giải, đáp án chuẩn: chưa có. Phần thực hành tự chấm theo yêu cầu của đề.

## Tần suất xuất hiện trong đề thật

Hiện **chưa có dữ liệu**: Trung tâm Tin học IUH không công bố đề, nên app không hiển thị xác suất nào. Khi có đề IUH thật (bạn bè từng thi nhớ lại, ảnh chụp đề, bộ 800 câu nếu mở được và có nhãn đề), nhập như sau:

1. Thêm đề vào `src/de-thuc.json`, ví dụ `{"id": "2025-09-lan1", "nam": 2025, "mo_ta": "Thi lần 1 tháng 9", "nguon": "bạn A nhớ lại"}`. Chỉ thêm đề đã xác nhận là đề IUH thật.
2. Với mỗi câu trong `src/IU0x.json` đã gặp trong đề đó, thêm field `"de": ["2025-09-lan1"]` (một câu gặp ở nhiều đề thì liệt kê đủ id). Câu thi thật không giống hệt câu trong app thì gắn vào câu tương đương gần nhất.
3. Chạy `python build_data.py src`. Script cảnh báo id đề lạ hoặc lặp.

App sẽ hiện: nhãn "Gặp X/N đề (P%)" trên câu hỏi, bảng chủ đề xuất hiện nhiều nhất và 10 câu hay gặp nhất ở tab Tổng quan, và chế độ trắc nghiệm "Hay gặp trong đề thật". Tần suất = số đề có câu đó / tổng số đề đã ghi nhận. Với N < 5 đề, đây chỉ là gợi ý ưu tiên, không phải xác suất đáng tin. Đề ghi lại từ trí nhớ thường thiếu câu, nên tần suất thật có thể cao hơn.

## Cập nhật câu hỏi

Sửa file trong `src/IU0x.json`, rồi chạy `python build_data.py src` để tạo lại `data.js`. Script cảnh báo câu trùng, đáp án trùng nhau (phân biệt hoa/thường), sai định dạng và id đề không hợp lệ. Sửa chữ của câu hỏi sẽ đổi id câu trong app, nên tiến độ của câu đó bị tính lại từ đầu.
