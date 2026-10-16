"""Gộp các file IU0x.json trong thư mục nguồn thành data.js cho web app.

Dùng: python build_data.py <thư_mục_chứa_IU01.json..IU06.json>
Kiểm tra: đủ 4 lựa chọn, answer 0-3, không trùng câu hỏi, phân bố vị trí đáp án.
Tần suất đề thật: đọc src/de-thuc.json (danh sách đề) và field tuỳ chọn "de": [id đề]
của từng câu; id lạ hoặc lặp thì cảnh báo và bỏ field "de" của câu đó.
"""
import json
import sys
from collections import Counter
from pathlib import Path

src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "src"
out = Path(__file__).parent / "data.js"
modules, problems = {}, []

exam_file = src / "de-thuc.json"
exam_list = json.loads(exam_file.read_text(encoding="utf-8")).get("ds", []) if exam_file.exists() else []
exam_ids = [e.get("id") for e in exam_list]
if len(set(exam_ids)) != len(exam_ids) or not all(exam_ids):
    problems.append("de-thuc.json: id đề trống hoặc trùng")
exam_ids = set(exam_ids)
tagged = 0

for n in range(1, 7):
    m = f"IU0{n}"
    f = src / f"{m}.json"
    if not f.exists():
        problems.append(f"{m}: thiếu file")
        continue
    d = json.loads(f.read_text(encoding="utf-8"))
    seen, qs = set(), []
    for i, q in enumerate(d.get("questions", [])):
        key = q["q"].strip().lower()
        if key in seen:
            problems.append(f"{m} câu {i}: trùng")
            continue
        if len(q["options"]) != 4 or q["answer"] not in (0, 1, 2, 3):
            problems.append(f"{m} câu {i}: sai định dạng")
            continue
        if len(set(o.strip().lower() for o in q["options"])) != 4:
            problems.append(f"{m} câu {i}: đáp án trùng nhau")
            continue
        de = q.get("de")
        if de is not None:
            if not isinstance(de, list) or len(set(de)) != len(de) or not set(de) <= exam_ids:
                problems.append(f"{m} câu {i}: field de không hợp lệ (id lạ/lặp), đã bỏ")
                q = {k: v for k, v in q.items() if k != "de"}
            elif de:
                tagged += 1
        seen.add(key)
        qs.append(q)
    cards = [c for c in d.get("cards", []) if c.get("front") and c.get("back")]
    modules[m] = {"questions": qs, "cards": cards}
    dist = Counter(q["answer"] for q in qs)
    print(f"{m}: {len(qs)} câu, {len(cards)} thẻ, vị trí đáp án {dict(sorted(dist.items()))}")

bank = {"modules": modules, "exams": {"total": len(exam_list), "list": exam_list}}
out.write_text("window.BANK = " + json.dumps(bank, ensure_ascii=False) + ";\n", encoding="utf-8")
print(f"Đề thật: {len(exam_list)} đề, {tagged} câu có gắn nhãn tần suất")
print("Đã ghi", out)
for p in problems:
    print("CẢNH BÁO:", p)
