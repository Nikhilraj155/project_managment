from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.core.security import require_user
from app.config.database import db
import csv
from io import StringIO
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/csv", tags=["CSV Uploads"])


def _norm(s: str) -> str:
    return (s or '').strip()


@router.post("/upload")
async def upload_allocation_csv(file: UploadFile = File(...), user=Depends(require_user)):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Decode with BOM handling
    try:
        text = raw.decode('utf-8-sig')
    except Exception:
        text = raw.decode('utf-8', errors='ignore')

    # Auto-detect delimiter if possible
    sio = StringIO(text)
    try:
        sample = sio.read(2048)
        sio.seek(0)
        dialect = csv.Sniffer().sniff(sample)
        has_header = csv.Sniffer().has_header(sample)
    except Exception:
        dialect = csv.excel
        has_header = True

    reader = csv.DictReader(sio, dialect=dialect)
    if not reader.fieldnames or not has_header:
        raise HTTPException(status_code=400, detail="CSV header not detected. Ensure the first row contains column names.")

    # Expected common header names (case-insensitive contains match)
    # We'll try to map by fuzzy header names
    headers = {h.lower().strip(): h for h in reader.fieldnames}

    def find_header(candidates: list[str]) -> str | None:
        for key_lower, original in headers.items():
            for c in candidates:
                if c in key_lower:
                    return original
        return None

    h_group = find_header(["group", "grp"])  # Group No.
    h_student = find_header(["name of student", "student", "name"])  # Name of Student
    h_enroll = find_header(["enrollment", "enrol", "roll"])  # Enrollment No
    h_guide = find_header(["guide", "mentor", "faculty"])  # Guide Name
    h_title1 = find_header(["proposed title - 01", "title 1", "title-01", "title1"])  # Title 1
    h_title2 = find_header(["proposed title - 02", "title 2", "title-02", "title2"])  # Title 2
    h_title3 = find_header(["proposed title - 03", "title 3", "title-03", "title3"])  # Title 3

    # Clean previous snapshot and insert fresh (simple approach)
    # You may want to version these uploads; here we keep all rows and mark a batch_id
    batch_id = datetime.utcnow().isoformat()

    docs = []
    for row in reader:
        doc = {
            "batch_id": batch_id,
            "uploaded_by": user["_id"],
            "uploaded_at": batch_id,
            "group_no": _norm(row.get(h_group, "")) if h_group else "",
            "student_name": _norm(row.get(h_student, "")) if h_student else "",
            "enrollment_no": _norm(row.get(h_enroll, "")) if h_enroll else "",
            "guide_name": _norm(row.get(h_guide, "")) if h_guide else "",
            "title_1": _norm(row.get(h_title1, "")) if h_title1 else "",
            "title_2": _norm(row.get(h_title2, "")) if h_title2 else "",
            "title_3": _norm(row.get(h_title3, "")) if h_title3 else "",
        }
        docs.append(doc)

    if not docs:
        raise HTTPException(status_code=400, detail="CSV contains no data rows below the header")

    await db.allocations.insert_many(docs)

    # Build quick summary for response
    groups = len({d["group_no"] for d in docs if d.get("group_no")})
    guides = len({d["guide_name"] for d in docs if d.get("guide_name")})
    students = len([d for d in docs if d.get("student_name")])

    return {"inserted": len(docs), "batch_id": batch_id, "groups": groups, "guides": guides, "students": students}


@router.get("/summary")
async def csv_summary(user=Depends(require_user)):
    # Compute overall summary from all uploaded batches
    groups: set[str] = set()
    guides: set[str] = set()
    students = 0
    async for d in db.allocations.find({}):
        if d.get("group_no"):
            groups.add(d["group_no"])
        if d.get("guide_name"):
            guides.add(d["guide_name"])
        if d.get("student_name"):
            students += 1
    return {
        "total_students_from_csv": students,
        "total_guides_from_csv": len(guides),
        "total_teams_from_csv": len(groups)
    }


@router.get("/records")
async def list_records(limit: int = 100, user=Depends(require_user)):
    try:
        items = []
        cursor = db.allocations.find({}).sort("uploaded_at", -1).limit(int(limit))
        async for d in cursor:
            d["id"] = str(d.get("_id"))
            d.pop("_id", None)
            # Serialize any ObjectId fields to strings for JSON
            if isinstance(d.get("uploaded_by"), ObjectId):
                d["uploaded_by"] = str(d["uploaded_by"])
            items.append(d)
        return items
    except Exception:
        # Return an empty list rather than raising 500, to keep UI functional
        return []


@router.patch("/{record_id}")
async def update_record(record_id: str, payload: dict, user=Depends(require_user)):
    # Allow editing of team_name, project_title (maps to title_1), and guide_name
    allowed_keys = {"team_name", "project_title", "guide_name", "title_1", "student_name", "group_no", "enrollment_no"}
    update_doc = {}
    for k, v in (payload or {}).items():
        if k in allowed_keys:
            if k == "project_title":
                update_doc["title_1"] = v
            else:
                update_doc[k] = v

    if not update_doc:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = await db.allocations.update_one({"_id": ObjectId(record_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    doc = await db.allocations.find_one({"_id": ObjectId(record_id)})
    doc_out = dict(doc)
    doc_out["id"] = str(doc_out.pop("_id"))
    if isinstance(doc_out.get("uploaded_by"), ObjectId):
        doc_out["uploaded_by"] = str(doc_out["uploaded_by"])
    return doc_out


# ------- Create a new allocation group with up to 4 students -------
@router.post("/groups")
async def create_group(payload: dict, user=Depends(require_user)):
    """
    Body example:
    {
        "group_no": "G65",
        "team_name": "Team Phoenix",
        "project_title": "Awesome Project",
        "guide_name": "Dr. Mentor",
        "students": [
            {"student_name": "Alice", "enrollment_no": "ENR1"},
            {"student_name": "Bob", "enrollment_no": "ENR2"}
        ]
    }
    """
    group_no = _norm(payload.get("group_no", ""))
    if not group_no:
        raise HTTPException(status_code=400, detail="group_no is required")

    team_name = _norm(payload.get("team_name", ""))
    guide_name = _norm(payload.get("guide_name", ""))
    project_title = _norm(payload.get("project_title", ""))
    students = payload.get("students") or []
    if not isinstance(students, list):
        raise HTTPException(status_code=400, detail="students must be a list")
    if len(students) == 0:
        raise HTTPException(status_code=400, detail="at least one student is required")
    if len(students) > 4:
        raise HTTPException(status_code=400, detail="maximum 4 students per group")

    batch_id = datetime.utcnow().isoformat()
    docs = []
    for s in students:
        doc = {
            "batch_id": batch_id,
            "uploaded_by": user["_id"],
            "uploaded_at": batch_id,
            "group_no": group_no,
            "student_name": _norm((s or {}).get("student_name", "")),
            "enrollment_no": _norm((s or {}).get("enrollment_no", "")),
            "guide_name": guide_name,
            "title_1": project_title,
            "team_name": team_name,
        }
        docs.append(doc)

    result = await db.allocations.insert_many(docs)
    created_ids = [str(i) for i in result.inserted_ids]
    return {
        "created": len(created_ids),
        "ids": created_ids,
        "group_no": group_no,
    }

