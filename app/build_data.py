"""Gộp các file IU0x.json trong thư mục nguồn thành data.js cho web app.

Dùng: python build_data.py <thư_mục_chứa_IU01.json..IU06.json>
Kiểm tra: đủ 4 lựa chọn, answer 0-3, không trùng câu hỏi, phân bố vị trí đáp án.
Tần suất đề thật: đọc src/de-thuc.json (danh sách đề) và field tuỳ chọn "de": [id đề]
của từng câu; id lạ hoặc lặp thì cảnh báo và bỏ field "de" của câu đó.
"""
import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # console Windows mặc định cp1252, vỡ khi in tiếng Việt

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
        if len(set(o.strip() for o in q["options"])) != 4:  # phân biệt hoa/thường: câu hàm UPPER/LOWER cần "KNXStore" ≠ "KNXstore"
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


def scan_practice():
    """Quét de-thuc-hanh/**/*.pdf (nằm cạnh thư mục app) thành danh sách đề cho tab Đề thực hành."""
    root = Path(__file__).parent.parent / "de-thuc-hanh"
    items = []
    if not root.exists():
        problems.append("thiếu thư mục de-thuc-hanh cạnh app: tab Đề thực hành sẽ trống")
        return items
    mod_names = {"WORD": "Word", "EXCEL": "Excel", "POWERPOINT": "PowerPoint"}
    mod_src = "Bộ đề trình độ A theo mô-đun (đề mẫu ghi Trung tâm Tin học CĐKT Cao Thắng), không phải đề IUH"
    for f in sorted(root.rglob("*.pdf")):
        base = {"file": "../de-thuc-hanh/" + f.relative_to(root).as_posix(), "name": f.name, "kb": round(f.stat().st_size / 1024)}
        m = re.fullmatch(r"DETHI_TINHOC_A_(WORD|EXCEL|POWERPOINT)_de(\d+)\.pdf", f.name)
        k = re.fullmatch(r"KHTN-(\d{4})-(\d{2})-(\d{2})_mau(\d+)\.pdf", f.name)
        if m:
            mod, no = mod_names[m.group(1)], int(m.group(2))
            items.append({**base, "id": f"{mod.lower()}-{no}", "mod": mod, "no": no, "title": f"{mod} · Đề {no}", "min": 30, "src": mod_src})
        elif k or f.name.startswith("mau1_"):
            # mau1: PDF dạng ảnh, đã xem trang 1: đề KHTN thi 13/08/2017
            y, mo, d, no = (k.groups() if k else ("2017", "08", "13", "1"))
            items.append({**base, "id": f"khtn-{y}-{mo}-{d}-mau{no}", "mod": "Trọn bộ", "no": int(no), "min": 120,
                          "title": f"Trọn bộ KHTN {d}/{mo}/{y} · mẫu {no}",
                          "src": f"Trung tâm Tin học ĐH KHTN TP.HCM, thi {d}/{mo}/{y}: Windows + Word + PowerPoint + Excel, không phải đề IUH"})
        else:
            problems.append(f"đề thực hành tên lạ, bỏ qua: {f.name}")
    order = {"Trọn bộ": 0, "Word": 1, "Excel": 2, "PowerPoint": 3}
    return sorted(items, key=lambda x: (order[x["mod"]], x["no"]))


def load_official():
    """Đề mẫu IUH chính thức: src/de-mau-iuh.json + thư mục de-mau-iuh (cạnh app). Kiểm tra file tồn tại, tổng điểm = 10, tạo zip trọn bộ."""
    f = src / "de-mau-iuh.json"
    if not f.exists():
        return None
    o = json.loads(f.read_text(encoding="utf-8"))
    root = Path(__file__).parent.parent / o.get("dir", "de-mau-iuh")
    if not root.exists():
        problems.append(f"thiếu thư mục {root.name} cạnh app: bỏ qua đề mẫu IUH")
        return None
    for fl in o["files"]:
        if not (root / fl["path"]).exists():
            problems.append(f"đề mẫu IUH: thiếu file {fl['path']}")
        fl["file"] = f"../{root.name}/{fl['path']}"
    total, ids = 0.0, set()
    for s in o["sections"]:
        sp = round(sum(i["p"] for i in s["items"]), 4)
        if sp != s["points"]:
            problems.append(f"đề mẫu IUH: phần {s['name']} cộng điểm {sp} ≠ {s['points']}")
        total += sp
        for i in s["items"]:
            if i["id"] in ids:
                problems.append(f"đề mẫu IUH: id trùng {i['id']}")
            ids.add(i["id"])
            if i.get("img"):
                if not (root / "hinh-trong-de" / i["img"]).exists():
                    problems.append(f"đề mẫu IUH: thiếu hình {i['img']}")
                i["img"] = f"../{root.name}/hinh-trong-de/{i['img']}"
    if round(total, 4) != 10.0:
        problems.append(f"đề mẫu IUH: tổng điểm {total} ≠ 10")
    zip_path = root / "DeMau_IUH_tron-bo.zip"   # gói tải một lần: đề + toàn bộ dữ liệu làm bài
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(root.rglob("*")):
            if p.is_file() and p != zip_path and "hinh-trong-de" not in p.parts:
                z.write(p, p.relative_to(root).as_posix())
    o["zip"] = f"../{root.name}/{zip_path.name}"
    return o


practice = scan_practice()
official = load_official()
bank = {"modules": modules, "exams": {"total": len(exam_list), "list": exam_list}, "practice": practice, "official": official}
out.write_text("window.BANK = " + json.dumps(bank, ensure_ascii=False) + ";\n", encoding="utf-8")
print(f"Đề thật: {len(exam_list)} đề, {tagged} câu có gắn nhãn tần suất")
print(f"Đề thực hành: {len(practice)} đề PDF " + str(dict(Counter(p['mod'] for p in practice))))
print("Đề mẫu IUH: " + (f"{sum(len(s['items']) for s in official['sections'])} ý chấm, {len(official['files'])} file" if official else "không có"))
print("Đã ghi", out)
for p in problems:
    print("CẢNH BÁO:", p)
