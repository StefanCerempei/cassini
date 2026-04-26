from __future__ import annotations

from functools import lru_cache

from flask import Flask, jsonify, request
from flask_cors import CORS

from image_analysis import (
    analyze_all_cases,
    analyze_pair,
    default_cases,
    historical_from_cases,
)


app = Flask(__name__)
CORS(app)


@lru_cache(maxsize=1)
def cached_analysis() -> dict:
    """
    Cache image analysis so repeated frontend requests are fast.

    Restart Flask to force recomputation after changing the satellite images.
    """
    return analyze_all_cases()


@app.get("/")
def root():
    return jsonify({
        "name": "AquaLeaks AI backend",
        "status": "running",
        "api": {
            "health": "/api/health",
            "detect": "/api/detect",
            "cases": "/api/cases",
            "analyze_one_case": "/api/analyze?case=data1",
            "historical": "/api/historical",
        },
    })


@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "message": "AquaLeaks AI backend is running",
    })


@app.get("/api/detect")
def detect():
    """
    Frontend-compatible endpoint.

    Existing frontend service expects:
        GET http://localhost:5000/api/detect
    and reads response.data.leaks.

    This response keeps `leaks`, but also includes richer `cases` and `stats`.
    """
    # `city` is accepted for compatibility with the current frontend service.
    _city = request.args.get("city", default=None, type=str)

    return jsonify(cached_analysis())


@app.get("/api/cases")
def cases():
    """Returns all available case-pair analysis results."""
    analysis = cached_analysis()
    return jsonify({
        "generated_at": analysis["generated_at"],
        "cases": analysis["cases"],
    })


@app.get("/api/analyze")
def analyze_case():
    """
    Analyzes a single case.

    Usage:
        /api/analyze?case=data1
        /api/analyze?case=data2
    """
    case_id = request.args.get("case", default="data2", type=str)
    configured_cases = default_cases()

    if case_id not in configured_cases:
        return jsonify({
            "error": f"Unknown case: {case_id}",
            "available_cases": list(configured_cases.keys()),
        }), 404

    return jsonify(analyze_pair(configured_cases[case_id]))


@app.get("/api/historical")
def historical():
    """
    Frontend-compatible endpoint.

    Existing frontend service expects:
        GET http://localhost:5000/api/historical
    and returns chart-friendly rows.
    """
    _city = request.args.get("city", default=None, type=str)
    _days = request.args.get("days", default=30, type=int)

    analysis = cached_analysis()
    return jsonify(historical_from_cases(analysis))


@app.post("/api/refresh")
def refresh():
    """
    Clears the in-memory cache and recomputes analysis.

    Useful while tuning thresholds without restarting the frontend.
    """
    cached_analysis.cache_clear()
    return jsonify(cached_analysis())


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
    )
