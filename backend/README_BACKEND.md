# AquaLeaks AI backend

This backend analyzes the existing NDWI JPG image pairs from:

```text
satelite/data1/
satelite/data2/
```

It exposes API endpoints compatible with the current React frontend:

```text
GET /api/detect
GET /api/historical
```

It also exposes extra inspection endpoints:

```text
GET /api/health
GET /api/cases
GET /api/analyze?case=data1
GET /api/analyze?case=data2
POST /api/refresh
```

## Run

From the project root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then keep the backend running and start the frontend separately:

```bash
cd frontend
npm install
npm start
```

## Important limitation

This is visual analysis of exported NDWI JPG colors, not scientific NDWI computation from raw Sentinel-2 bands.

The simplified model is:

- blue/purple pixels = water;
- white-ish pixels inside expected water = suspected pollution/degraded water;
- expected water = union of blue water from the before and after images;
- river = elongated water components;
- other water bodies = non-river water components;
- surrounding area = a buffer around water bodies.
