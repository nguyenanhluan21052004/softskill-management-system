# Soft Skill Dashboard Frontend

## Backend Connection

The dashboard is configured to call these backend APIs:

- GET /api/SoftSkill/results
- GET /api/SoftSkill/top?limit=5
- GET /api/SoftSkill/statistics

Base URL is read from environment variable:

- REACT_APP_API_BASE_URL

Example for your current Swagger host:

```env
REACT_APP_API_BASE_URL=https://localhost:7069
```

## Run Locally

1. Create a `.env` file (or copy from `.env.example`) and set `REACT_APP_API_BASE_URL`.
2. Install dependencies:

```bash
npm install
```

3. Start frontend:

```bash
npm start
```

The app runs at http://localhost:3000.

## Notes

- If your backend uses HTTPS dev certificate, make sure certificate is trusted on your machine.
- If browser shows CORS error, enable CORS on backend for frontend origin http://localhost:3000.
