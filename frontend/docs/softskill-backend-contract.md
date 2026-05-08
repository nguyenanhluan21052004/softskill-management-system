# SoftSkill Backend Contract (Frontend Alignment)

## 1) Endpoints frontend dang su dung

- `GET /api/SoftSkill/results`
- `GET /api/SoftSkill/top?limit=5` (hoac khong can query param, frontend se cat top 5)
- `GET /api/SoftSkill/statistics`

Frontend co fallback, nhung de du lieu chinh xac theo tieu chi ky nang mem, nen tra ve theo format ben duoi.

## 2) Response de xuat cho `/api/SoftSkill/results`

```json
[
  {
    "id": "SV001",
    "studentName": "Tran Van H",
    "score": 8.55,
    "level": "Good",
    "skills": {
      "communication": 8.4,
      "teamwork": 8.8,
      "criticalThinking": 8.2,
      "timeManagement": 8.1
    },
    "participationRate": 82,
    "contributionRate": 86,
    "onTimeRate": 90
  }
]
```

## 3) Response de xuat cho `/api/SoftSkill/top`

```json
[
  {
    "id": "SV001",
    "studentName": "Tran Van H",
    "score": 8.55,
    "level": "Good",
    "skills": {
      "communication": 8.4,
      "teamwork": 8.8,
      "criticalThinking": 8.2,
      "timeManagement": 8.1
    }
  }
]
```

## 4) Response de xuat cho `/api/SoftSkill/statistics`

```json
{
  "totalStudents": 120,
  "averageScore": 7.35,
  "good": 36,
  "average": 64,
  "weak": 20
}
```

## 5) Quy uoc diem va xep loai

- Diem tung ky nang: `0 -> 10`.
- Diem tong hop frontend dang hien thi:
  - `communication * 0.25`
  - `teamwork * 0.30`
  - `criticalThinking * 0.25`
  - `timeManagement * 0.20`
- Frontend quy doi chi so tong hop ra thang `0 -> 100`.

## 6) Mapping field backend duoc frontend chap nhan

Frontend se doc du lieu ky nang tu cac field sau (uu tien tu tren xuong):

- `skills.communication` hoac `communication` hoac `communicationScore`
- `skills.teamwork` hoac `teamwork` hoac `teamworkScore`
- `skills.criticalThinking` hoac `criticalThinking` hoac `criticalThinkingScore`
- `skills.timeManagement` hoac `timeManagement` hoac `timeManagementScore`

Neu backend chua tra ve bo ky nang chi tiet, frontend se uoc tinh tam tu `score` + muc do tham gia.
