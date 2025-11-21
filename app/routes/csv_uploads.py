from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.core.security import require_user
from app.config.database import db
import csv
from io import StringIO
from datetime import datetime
from bson import ObjectId
import pandas as pd
import openpyxl
from typing import Dict, Any, List

router = APIRouter(prefix="/csv", tags=["CSV Uploads"])


def _norm(s: str) -> str:
    return (s or '').strip()


def _normalize_excel_headers(headers: List[str]) -> Dict[str, str]:
    """Normalize Excel headers to match expected format"""
    header_mapping = {}

    for i, header in enumerate(headers):
        if not header:
            continue

        header_lower = header.lower().strip()

        # Map various header formats to standardized keys
        if any(x in header_lower for x in ['group no', 'group']):
            header_mapping[str(i)] = 'group_no'
        elif any(x in header_lower for x in ['name of student', 'student name', 'student']):
            header_mapping[str(i)] = 'student_name'
        elif any(x in header_lower for x in ['enrollment no', 'enrollment', 'roll', 'enrollment no']):
            header_mapping[str(i)] = 'enrollment_no'
        elif any(x in header_lower for x in ['guide name', 'guide', 'faculty', 'mentor']):
            header_mapping[str(i)] = 'guide_name'
        elif any(x in header_lower for x in ['proposed title - 01', 'title - 01', 'title1', 'proposed title-1']):
            header_mapping[str(i)] = 'title_1'
        elif any(x in header_lower for x in ['proposed title - 02', 'title - 02', 'title2', 'proposed title-2']):
            header_mapping[str(i)] = 'title_2'
        elif any(x in header_lower for x in ['proposed title - 03', 'title - 03', 'title3', 'proposed title-3']):
            header_mapping[str(i)] = 'title_3'
        elif any(x in header_lower for x in ['name of team leader', 'team leader']):
            header_mapping[str(i)] = 'team_leader'
        elif any(x in header_lower for x in ['enrollment no. of team leader', 'team leader enrollment']):
            header_mapping[str(i)] = 'leader_enrollment'
        elif any(x in header_lower for x in ['section', 'class section']):
            header_mapping[str(i)] = 'section'
        elif any(x in header_lower for x in ['name of team member-1', 'team member-1']):
            header_mapping[str(i)] = 'member_1'
        elif any(x in header_lower for x in ['enrollment no. of team member-1', 'member-1 enrollment']):
            header_mapping[str(i)] = 'member_1_enrollment'
        elif any(x in header_lower for x in ['name of team member-2', 'team member-2']):
            header_mapping[str(i)] = 'member_2'
        elif any(x in header_lower for x in ['enrollment no. of team member-2', 'member-2 enrollment']):
            header_mapping[str(i)] = 'member_2_enrollment'
        elif any(x in header_lower for x in ['name of team member-3', 'team member-3']):
            header_mapping[str(i)] = 'member_3'
        elif any(x in header_lower for x in ['enrollment no. of team member-3', 'member-3 enrollment']):
            header_mapping[str(i)] = 'member_3_enrollment'
        elif any(x in header_lower for x in ['proposed title-1 of project', 'title-1']):
            header_mapping[str(i)] = 'title_1'
        elif any(x in header_lower for x in ['proposed title-2 of project', 'title-2']):
            header_mapping[str(i)] = 'title_2'
        elif any(x in header_lower for x in ['proposed title-3 of project', 'title-3']):
            header_mapping[str(i)] = 'title_3'

    return header_mapping


def _process_excel_sheet(df: pd.DataFrame, sheet_name: str = "") -> List[Dict[str, Any]]:
    """Process an Excel sheet and extract student allocation data"""
    processed_data = []

    # Skip header rows that contain institute info
    data_start_row = 0
    headers_found = False

    for i, row in df.iterrows():
        # Look for header row containing key fields
        row_text = [str(cell).lower().strip() for cell in row if pd.notna(cell)]
        if any('sr. no' in text or 'group no' in text or 'name of student' in text for text in row_text):
            data_start_row = i
            headers_found = True
            break

    if not headers_found:
        # If no proper headers found, return empty
        return []

    # Skip to data start row
    if data_start_row > 0:
        df = df.iloc[data_start_row:].reset_index(drop=True)

    # Get headers from first row
    if len(df) == 0:
        return []

    headers = [str(cell) if pd.notna(cell) else "" for cell in df.iloc[0]]
    header_mapping = _normalize_excel_headers(headers)

    # Process data rows (skip the header row)
    for idx in range(1, len(df)):
        row = df.iloc[idx]

        # Skip completely empty rows
        if all(pd.isna(cell) or str(cell).strip() == '' for cell in row):
            continue

        student_data = {
            "batch_id": "",
            "uploaded_by": "",
            "uploaded_at": "",
            "group_no": "",
            "student_name": "",
            "enrollment_no": "",
            "guide_name": "",
            "title_1": "",
            "title_2": "",
            "title_3": "",
            "sheet_name": sheet_name
        }

        for col_idx, cell in enumerate(row):
            col_key = str(col_idx)
            if col_key in header_mapping:
                field_name = header_mapping[col_key]
                cell_value = str(cell) if pd.notna(cell) else ""

                if field_name == 'group_no':
                    student_data['group_no'] = _norm(cell_value)
                elif field_name == 'student_name':
                    student_data['student_name'] = _norm(cell_value)
                elif field_name == 'enrollment_no':
                    student_data['enrollment_no'] = _norm(cell_value)
                elif field_name == 'guide_name':
                    student_data['guide_name'] = _norm(cell_value)
                elif field_name == 'title_1':
                    student_data['title_1'] = _norm(cell_value)
                elif field_name == 'title_2':
                    student_data['title_2'] = _norm(cell_value)
                elif field_name == 'title_3':
                    student_data['title_3'] = _norm(cell_value)

        # Only add if we have at least a student name or group number
        if student_data['student_name'] or student_data['group_no']:
            processed_data.append(student_data)

    return processed_data


def _process_form_responses_sheet(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Process the Form Responses 1 sheet which has a different format"""
    processed_data = []

    # Skip empty rows and process form data
    for idx, row in df.iterrows():
        # Skip rows with no meaningful data
        if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() in ['', 'NaT']:
            continue

        # Skip header row
        if 'Email' in str(row.iloc[1]) or pd.isna(row.iloc[1]):
            continue

        student_data = {
            "batch_id": "",
            "uploaded_by": "",
            "uploaded_at": "",
            "group_no": "",
            "student_name": _norm(str(row.iloc[2]) if pd.notna(row.iloc[2]) else ""),  # Name of Team Leader
            "enrollment_no": _norm(str(row.iloc[3]) if pd.notna(row.iloc[3]) else ""),  # Enrollment No. of Team Leader
            "guide_name": "",
            "title_1": _norm(str(row.iloc[13]) if pd.notna(row.iloc[13]) else ""),  # Proposed Title-1 of Project
            "title_2": _norm(str(row.iloc[15]) if pd.notna(row.iloc[15]) else ""),  # Proposed Title-2 of Project
            "title_3": _norm(str(row.iloc[17]) if pd.notna(row.iloc[17]) else ""),  # Proposed Title-3 of Project
            "sheet_name": "Form Responses 1",
            "team_leader": _norm(str(row.iloc[2]) if pd.notna(row.iloc[2]) else ""),
            "leader_enrollment": _norm(str(row.iloc[3]) if pd.notna(row.iloc[3]) else ""),
            "section": _norm(str(row.iloc[4]) if pd.notna(row.iloc[4]) else ""),
            "member_1": _norm(str(row.iloc[7]) if pd.notna(row.iloc[7]) else ""),
            "member_1_enrollment": _norm(str(row.iloc[8]) if pd.notna(row.iloc[8]) else ""),
            "member_2": _norm(str(row.iloc[9]) if pd.notna(row.iloc[9]) else ""),
            "member_2_enrollment": _norm(str(row.iloc[10]) if pd.notna(row.iloc[10]) else ""),
            "member_3": _norm(str(row.iloc[11]) if pd.notna(row.iloc[11]) else ""),
            "member_3_enrollment": _norm(str(row.iloc[12]) if pd.notna(row.iloc[12]) else ""),
        }

        # Generate group number if not available
        if not student_data['group_no'] and student_data['student_name']:
            section = student_data['section'][:3] if student_data['section'] else "GRP"
            student_data['group_no'] = f"{section}-G{idx + 1}"

        if student_data['student_name']:
            processed_data.append(student_data)

    return processed_data


@router.post("/upload")
async def upload_allocation_csv(file: UploadFile = File(...), user=Depends(require_user)):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Determine file type based on extension and content
    file_extension = file.filename.lower().split('.')[-1] if '.' in file.filename else ""
    batch_id = datetime.utcnow().isoformat()

    docs = []

    if file_extension in ['xlsx', 'xls']:
        # Handle Excel files
        try:
            # Read Excel file using pandas
            excel_file = pd.ExcelFile(raw)

            # Process each sheet
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)

                if sheet_name == "Form Responses 1":
                    # Special processing for form responses sheet
                    sheet_docs = _process_form_responses_sheet(df)
                else:
                    # Standard processing for section sheets (CSE-A, CSE-B, etc.)
                    sheet_docs = _process_excel_sheet(df, sheet_name)

                # Add metadata to each document
                for doc in sheet_docs:
                    doc["batch_id"] = batch_id
                    doc["uploaded_by"] = user["_id"]
                    doc["uploaded_at"] = batch_id

                docs.extend(sheet_docs)

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing Excel file: {str(e)}")

    else:
        # Handle CSV files (existing logic)
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
                "sheet_name": "CSV"
            }
            docs.append(doc)

    if not docs:
        raise HTTPException(status_code=400, detail="File contains no data rows")

    await db.allocations.insert_many(docs)

    # Build quick summary for response
    groups = len({d["group_no"] for d in docs if d.get("group_no")})
    guides = len({d["guide_name"] for d in docs if d.get("guide_name")})
    students = len([d for d in docs if d.get("student_name")])
    sheets = len(set(d.get("sheet_name", "CSV") for d in docs)) if file_extension in ['xlsx', 'xls'] else 1

    return {
        "inserted": len(docs),
        "batch_id": batch_id,
        "groups": groups,
        "guides": guides,
        "students": students,
        "sheets_processed": sheets,
        "file_type": "Excel" if file_extension in ['xlsx', 'xls'] else "CSV"
    }


@router.get("/excel-info")
async def get_excel_file_info(file: UploadFile = File(...), user=Depends(require_user)):
    """Preview Excel file structure before uploading"""
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        excel_file = pd.ExcelFile(raw)
        info = {
            "file_name": file.filename,
            "total_sheets": len(excel_file.sheet_names),
            "sheet_names": excel_file.sheet_names,
            "sheets": []
        }

        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(excel_file, sheet_name=sheet_name)
            sheet_info = {
                "name": sheet_name,
                "shape": [len(df), len(df.columns)],
                "headers": [str(cell) if pd.notna(cell) else "" for cell in df.iloc[0]] if len(df) > 0 else [],
                "data_rows": len(df) - 1 if len(df) > 1 else 0
            }
            info["sheets"].append(sheet_info)

        return info

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")


@router.get("/summary")
async def csv_summary(user=Depends(require_user)):
    # Compute overall summary from all uploaded batches
    groups: set[str] = set()
    guides: set[str] = set()
    students = 0
    file_types = {"CSV": 0, "Excel": 0}
    sheets = set()

    async for d in db.allocations.find({}):
        if d.get("group_no"):
            groups.add(d["group_no"])
        if d.get("guide_name"):
            guides.add(d["guide_name"])
        if d.get("student_name"):
            students += 1

        # Count file types
        sheet_name = d.get("sheet_name", "CSV")
        if sheet_name == "CSV":
            file_types["CSV"] += 1
        else:
            file_types["Excel"] += 1
            sheets.add(sheet_name)

    return {
        "total_students_from_csv": students,
        "total_guides_from_csv": len(guides),
        "total_teams_from_csv": len(groups),
        "file_type_breakdown": file_types,
        "excel_sheets_processed": len(sheets),
        "unique_sheets": list(sheets)
    }


@router.delete("/batch/{batch_id}")
async def delete_allocation_batch(batch_id: str, user=Depends(require_user)):
    """Delete all records from a specific upload batch"""
    try:
        # Verify the batch exists and get some info for the response
        batch_records = []
        async for record in db.allocations.find({"batch_id": batch_id}):
            batch_records.append(record)

        if not batch_records:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Delete all records from this batch
        result = await db.allocations.delete_many({"batch_id": batch_id})

        # Count by categories for response
        groups = len({r.get("group_no") for r in batch_records if r.get("group_no")})
        guides = len({r.get("guide_name") for r in batch_records if r.get("guide_name")})
        students = len([r for r in batch_records if r.get("student_name")])
        sheets = len({r.get("sheet_name", "CSV") for r in batch_records})

        return {
            "deleted": result.deleted_count,
            "batch_id": batch_id,
            "groups": groups,
            "guides": guides,
            "students": students,
            "sheets": sheets,
            "message": f"Successfully deleted {result.deleted_count} records from batch"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete batch: {str(e)}")


@router.get("/batches")
async def list_batches(user=Depends(require_user)):
    """List all upload batches with summary information"""
    try:
        batches = {}
        async for record in db.allocations.find({}):
            batch_id = record.get("batch_id")
            if batch_id not in batches:
                batches[batch_id] = {
                    "batch_id": batch_id,
                    "uploaded_at": record.get("uploaded_at", ""),
                    "uploaded_by": record.get("uploaded_by", ""),
                    "file_type": "Excel" if record.get("sheet_name", "CSV") != "CSV" else "CSV",
                    "records": 0,
                    "groups": set(),
                    "guides": set(),
                    "students": 0,
                    "sheets": set()
                }

            batches[batch_id]["records"] += 1
            if record.get("group_no"):
                batches[batch_id]["groups"].add(record.get("group_no"))
            if record.get("guide_name"):
                batches[batch_id]["guides"].add(record.get("guide_name"))
            if record.get("student_name"):
                batches[batch_id]["students"] += 1
            batches[batch_id]["sheets"].add(record.get("sheet_name", "CSV"))

        # Convert sets to counts and sort by upload date
        batch_list = []
        for batch in batches.values():
            batch["groups"] = len(batch["groups"])
            batch["guides"] = len(batch["guides"])
            batch["sheets"] = len(batch["sheets"])
            batch_list.append(batch)

        batch_list.sort(key=lambda x: x["uploaded_at"], reverse=True)
        return batch_list

    except Exception:
        return []


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

