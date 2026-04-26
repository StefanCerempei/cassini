from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent

# The project folder is currently named "satelite", so this intentionally keeps
# that spelling instead of "satellite".
SATELLITE_DIR = PROJECT_ROOT / "satelite"

# The Sentinel-2 source resolution is commonly 10 m for the bands used in NDWI.
# These files are JPG screenshots/export images, not georeferenced GeoTIFFs, so
# this area is an approximation used only for dashboard/demo values.
PIXEL_AREA_M2 = 100

# The top/bottom of the downloaded JPGs contain Copernicus UI text / scale bar.
# Excluding these rows prevents white UI text from being detected as pollution.
CROP_TOP_PX = 45
CROP_BOTTOM_PX = 20

# Morphological / component thresholds. These values are deliberately small
# because rivers in screenshots can be thin and broken into multiple fragments.
MIN_WATER_COMPONENT_PX = 50
MIN_RIVER_COMPONENT_PX = 150
MIN_LEAK_COMPONENT_PX = 8
SURROUNDING_BUFFER_PX = 18


@dataclass(frozen=True)
class ImagePair:
    case_id: str
    label: str
    before_path: Path
    after_path: Path
    before_label: str
    after_label: str


def default_cases() -> dict[str, ImagePair]:
    """Returns the two known image pairs from the current project."""
    data1 = SATELLITE_DIR / "data1"
    data2 = SATELLITE_DIR / "data2"

    return {
        "data1": ImagePair(
            case_id="data1",
            label="Case 1 - 2020 image pair",
            before_path=data1 / "2020-04-05-00_00_2020-04-05-23_59_Sentinel-2_L2A_NDWI.jpg",
            after_path=data1 / "2020-04-23-00_00_2020-04-23-23_59_Sentinel-2_L2A_NDWI.jpg",
            before_label="2020-04-05",
            after_label="2020-04-23",
        ),
        "data2": ImagePair(
            case_id="data2",
            label="Case 2 - 2026 image pair",
            before_path=data2 / "2026-03-05-00_00_2026-03-05-23_59_Sentinel-2_L2A_NDWI.jpg",
            after_path=data2 / "2026-03-15-00_00_2026-03-15-23_59_Sentinel-2_L2A_NDWI.jpg",
            before_label="2026-03-05",
            after_label="2026-03-15",
        ),
    }


def load_rgb(path: Path) -> np.ndarray:
    """Loads an image as RGB uint8."""
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")

    return np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)


def align_pair(before: np.ndarray, after: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Makes both images the same size by cropping to the shared top-left extent.

    The project images are already aligned visually, but one pair is 1151 px tall
    and another is 1150 px tall. This prevents shape errors.
    """
    height = min(before.shape[0], after.shape[0])
    width = min(before.shape[1], after.shape[1])
    return before[:height, :width], after[:height, :width]


def valid_analysis_mask(height: int, width: int) -> np.ndarray:
    """Mask of pixels that should be considered for analysis."""
    mask = np.ones((height, width), dtype=bool)

    if CROP_TOP_PX > 0:
        mask[:CROP_TOP_PX, :] = False

    if CROP_BOTTOM_PX > 0:
        mask[max(0, height - CROP_BOTTOM_PX):, :] = False

    return mask


def blue_water_mask(rgb: np.ndarray) -> np.ndarray:
    """
    Detects blue/purple NDWI water pixels.

    The Copernicus NDWI color ramp in this project is approximately:
    - green: land / vegetation
    - white: neutral / suspected degraded water in this simplified model
    - blue/purple: water

    This is not a scientific NDWI calculation from raw bands. It is image-color
    analysis of the existing exported NDWI JPGs.
    """
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hue, sat, val = cv2.split(hsv)

    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)

    strong_blue = (
        (hue >= 90)
        & (hue <= 145)
        & (sat >= 35)
        & (val >= 50)
        & (blue > red + 10)
        & (blue > green)
    )

    pale_purple_blue = (
        (hue >= 105)
        & (hue <= 160)
        & (sat >= 25)
        & (val >= 120)
        & (blue > red + 5)
        & (blue > green + 5)
    )

    return strong_blue | pale_purple_blue


def white_pollution_mask(rgb: np.ndarray) -> np.ndarray:
    """
    Detects white-ish pixels.

    In this project model, pollution is represented as pixels that are white
    inside a water body where clean NDWI water should appear blue.
    """
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    _, sat, val = cv2.split(hsv)

    channel_spread = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)

    return (sat <= 65) & (val >= 178) & (channel_spread <= 80)


def remove_small_components(mask: np.ndarray, min_area_px: int) -> np.ndarray:
    """Removes connected components smaller than min_area_px."""
    labels_count, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    cleaned = np.zeros(mask.shape, dtype=bool)

    for label in range(1, labels_count):
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area >= min_area_px:
            cleaned |= labels == label

    return cleaned


def make_expected_water_mask(before_rgb: np.ndarray, after_rgb: np.ndarray) -> np.ndarray:
    """
    Builds the expected-water mask from both images.

    Important idea:
    - A polluted river section can become white in the second image.
    - Therefore, detecting water only in the second image would miss the
      polluted part.
    - We use the union of blue water from before and after, then clean it.
    """
    height, width = before_rgb.shape[:2]
    valid_mask = valid_analysis_mask(height, width)

    before_blue = blue_water_mask(before_rgb) & valid_mask
    after_blue = blue_water_mask(after_rgb) & valid_mask

    expected_water = before_blue | after_blue

    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    expected_water = cv2.morphologyEx(
        expected_water.astype(np.uint8),
        cv2.MORPH_CLOSE,
        close_kernel,
        iterations=1,
    ).astype(bool)

    # Small dilation compensates for JPEG anti-aliasing and slight visual
    # misalignment between screenshots.
    dilate_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    expected_water = cv2.dilate(
        expected_water.astype(np.uint8),
        dilate_kernel,
        iterations=1,
    ).astype(bool)

    expected_water = remove_small_components(expected_water, MIN_WATER_COMPONENT_PX)
    return expected_water & valid_mask


def component_elongation(mask: np.ndarray) -> float:
    """
    Returns a PCA-based elongation value for one connected component.

    A long thin river has a larger value; a lake/blob tends to be closer to 1.
    """
    y_coords, x_coords = np.where(mask)

    if len(x_coords) < 3:
        return 1.0

    points = np.column_stack([x_coords, y_coords]).astype(float)
    covariance = np.cov(points, rowvar=False)
    eigenvalues = np.linalg.eigvalsh(covariance)
    return float(np.sqrt((eigenvalues[-1] + 1e-6) / (eigenvalues[0] + 1e-6)))


def split_river_and_other_water(expected_water_mask: np.ndarray) -> tuple[np.ndarray, np.ndarray, list[dict[str, Any]]]:
    """
    Splits expected water into:
    - river-like components: elongated components
    - other water bodies: remaining components

    Because the screenshots are not georeferenced vector maps, this is a
    shape-based approximation.
    """
    labels_count, labels, stats, centroids = cv2.connectedComponentsWithStats(
        expected_water_mask.astype(np.uint8),
        8,
    )

    river_mask = np.zeros(expected_water_mask.shape, dtype=bool)
    components: list[dict[str, Any]] = []

    for label in range(1, labels_count):
        area_px = int(stats[label, cv2.CC_STAT_AREA])
        if area_px < MIN_WATER_COMPONENT_PX:
            continue

        x = int(stats[label, cv2.CC_STAT_LEFT])
        y = int(stats[label, cv2.CC_STAT_TOP])
        width = int(stats[label, cv2.CC_STAT_WIDTH])
        height = int(stats[label, cv2.CC_STAT_HEIGHT])
        centroid_x = float(centroids[label][0])
        centroid_y = float(centroids[label][1])

        component_mask = labels == label
        elongation = component_elongation(component_mask)
        bbox_aspect = float(max(width / max(height, 1), height / max(width, 1)))

        # River heuristic:
        # - large enough to be meaningful
        # - elongated by PCA or by bounding box
        is_river_like = (
            area_px >= MIN_RIVER_COMPONENT_PX
            and (elongation >= 3.0 or bbox_aspect >= 3.0)
        )

        if is_river_like:
            river_mask |= component_mask

        components.append({
            "label": int(label),
            "area_px": area_px,
            "area_m2_est": int(area_px * PIXEL_AREA_M2),
            "bbox": {
                "x": x,
                "y": y,
                "width": width,
                "height": height,
            },
            "centroid_px": {
                "x": round(centroid_x, 2),
                "y": round(centroid_y, 2),
            },
            "elongation": round(elongation, 3),
            "bbox_aspect": round(bbox_aspect, 3),
            "classified_as": "river" if is_river_like else "other_water_body",
        })

    # Fallback: if no river-like component was found, call the largest water
    # component the river so the frontend always receives a river metric.
    if not river_mask.any() and components:
        largest = max(components, key=lambda item: item["area_px"])
        river_mask = labels == largest["label"]
        for item in components:
            if item["label"] == largest["label"]:
                item["classified_as"] = "river_fallback_largest_component"

    other_water_mask = expected_water_mask & ~river_mask
    return river_mask, other_water_mask, components


def pollution_stats(region_mask: np.ndarray, pollution_mask: np.ndarray) -> dict[str, Any]:
    """Calculates pollution statistics for a region."""
    region_px = int(region_mask.sum())
    polluted_px = int((region_mask & pollution_mask).sum())

    if region_px == 0:
        percent = 0.0
    else:
        percent = 100.0 * polluted_px / region_px

    return {
        "area_px": region_px,
        "area_m2_est": int(region_px * PIXEL_AREA_M2),
        "polluted_px": polluted_px,
        "polluted_m2_est": int(polluted_px * PIXEL_AREA_M2),
        "pollution_percent": round(percent, 2),
        "pollution_score_0_1": round(percent / 100.0, 4),
    }


def pollution_increase_stats(
    region_mask: np.ndarray,
    before_pollution_mask: np.ndarray,
    after_pollution_mask: np.ndarray,
) -> dict[str, Any]:
    """Calculates how much pollution increased between before and after."""
    before = pollution_stats(region_mask, before_pollution_mask)
    after = pollution_stats(region_mask, after_pollution_mask)

    delta = after["pollution_percent"] - before["pollution_percent"]
    return {
        "before_pollution_percent": before["pollution_percent"],
        "after_pollution_percent": after["pollution_percent"],
        "delta_pollution_percent": round(delta, 2),
        "before_pollution_score_0_1": before["pollution_score_0_1"],
        "after_pollution_score_0_1": after["pollution_score_0_1"],
        "delta_pollution_score_0_1": round(delta / 100.0, 4),
    }


def centroid_to_approx_lat_lon(
    x_px: float,
    y_px: float,
    image_width: int,
    image_height: int,
) -> dict[str, float]:
    """
    Converts pixel coordinates to approximate lat/lon for the existing dashboard.

    The JPGs do not contain georeferencing metadata. These values are only for
    placing demo points around the project's known monitored location.
    """
    center_lat = 48.29002
    center_lon = 28.07590

    # Approximate display extent around center. Tune this if you later use a
    # known real bounding box.
    lat_span = 0.120
    lon_span = 0.180

    lon = center_lon + ((x_px / max(image_width, 1)) - 0.5) * lon_span
    lat = center_lat - ((y_px / max(image_height, 1)) - 0.5) * lat_span

    return {
        "lat": round(float(lat), 6),
        "lon": round(float(lon), 6),
    }


def severity_from_score(score_0_1: float, area_px: int) -> str:
    """Maps pollution score and component size to dashboard severity."""
    if score_0_1 >= 0.65 or area_px >= 350:
        return "high"

    if score_0_1 >= 0.30 or area_px >= 120:
        return "medium"

    return "low"


def leak_components(
    case_id: str,
    after_pollution_mask: np.ndarray,
    region_mask: np.ndarray,
    region_type: str,
    image_width: int,
    image_height: int,
    start_id: int,
) -> list[dict[str, Any]]:
    """
    Converts polluted connected components into frontend-friendly leak records.
    """
    candidate_mask = after_pollution_mask & region_mask
    candidate_mask = remove_small_components(candidate_mask, MIN_LEAK_COMPONENT_PX)

    labels_count, labels, stats, centroids = cv2.connectedComponentsWithStats(
        candidate_mask.astype(np.uint8),
        8,
    )

    leaks: list[dict[str, Any]] = []
    next_id = start_id

    for label in range(1, labels_count):
        area_px = int(stats[label, cv2.CC_STAT_AREA])
        if area_px < MIN_LEAK_COMPONENT_PX:
            continue

        centroid_x = float(centroids[label][0])
        centroid_y = float(centroids[label][1])
        approx_location = centroid_to_approx_lat_lon(
            centroid_x,
            centroid_y,
            image_width,
            image_height,
        )

        # Component confidence is currently a visual heuristic. Larger white
        # components inside expected water are treated as more confident.
        score = min(0.99, max(0.15, area_px / 600.0))
        severity = severity_from_score(score, area_px)

        leaks.append({
            "id": next_id,
            "case_id": case_id,
            "lat": approx_location["lat"],
            "lon": approx_location["lon"],
            "severity": severity,
            "score": round(score, 3),
            "area_m2": int(area_px * PIXEL_AREA_M2),
            "area_px": area_px,
            "type": "visual_white_pollution",
            "region_type": region_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": f"White-pixel pollution detected in {region_type}",
            "centroid_px": {
                "x": round(centroid_x, 2),
                "y": round(centroid_y, 2),
            },
        })

        next_id += 1

    return leaks


def analyze_pair(pair: ImagePair) -> dict[str, Any]:
    """Runs the complete image-pair analysis."""
    before_rgb = load_rgb(pair.before_path)
    after_rgb = load_rgb(pair.after_path)
    before_rgb, after_rgb = align_pair(before_rgb, after_rgb)

    height, width = before_rgb.shape[:2]
    valid_mask = valid_analysis_mask(height, width)

    expected_water = make_expected_water_mask(before_rgb, after_rgb)
    river_mask, other_water_mask, components = split_river_and_other_water(expected_water)

    surrounding_mask = cv2.dilate(
        expected_water.astype(np.uint8),
        cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE,
            (SURROUNDING_BUFFER_PX * 2 + 1, SURROUNDING_BUFFER_PX * 2 + 1),
        ),
        iterations=1,
    ).astype(bool)
    surrounding_mask = surrounding_mask & ~expected_water & valid_mask

    before_white = white_pollution_mask(before_rgb) & valid_mask
    after_white = white_pollution_mask(after_rgb) & valid_mask

    all_water_mask = river_mask | other_water_mask

    metrics = {
        "river": {
            "before": pollution_stats(river_mask, before_white),
            "after": pollution_stats(river_mask, after_white),
            "change": pollution_increase_stats(river_mask, before_white, after_white),
        },
        "other_water_bodies": {
            "before": pollution_stats(other_water_mask, before_white),
            "after": pollution_stats(other_water_mask, after_white),
            "change": pollution_increase_stats(other_water_mask, before_white, after_white),
        },
        "all_water": {
            "before": pollution_stats(all_water_mask, before_white),
            "after": pollution_stats(all_water_mask, after_white),
            "change": pollution_increase_stats(all_water_mask, before_white, after_white),
        },
        "surrounding_area": {
            "before": pollution_stats(surrounding_mask, before_white),
            "after": pollution_stats(surrounding_mask, after_white),
            "change": pollution_increase_stats(surrounding_mask, before_white, after_white),
        },
    }

    leaks = []
    leaks.extend(
        leak_components(
            pair.case_id,
            after_white,
            river_mask,
            "river",
            width,
            height,
            start_id=1,
        )
    )
    leaks.extend(
        leak_components(
            pair.case_id,
            after_white,
            other_water_mask,
            "other_water_body",
            width,
            height,
            start_id=len(leaks) + 1,
        )
    )

    # Keep the frontend sane: return the largest/highest-confidence leak entries
    # first, not hundreds of tiny JPEG artifacts.
    leaks.sort(key=lambda item: (item["severity"] == "high", item["score"], item["area_px"]), reverse=True)
    leaks = leaks[:20]

    summary = {
        # "before" is the cleaner/less polluted image in the pair.
        # "after" is the more polluted image in the pair.
        "river_before_pollution_number": metrics["river"]["before"]["pollution_percent"],
        "river_after_pollution_number": metrics["river"]["after"]["pollution_percent"],
        "river_pollution_delta": metrics["river"]["change"]["delta_pollution_percent"],

        "other_water_bodies_before_pollution_number": metrics["other_water_bodies"]["before"]["pollution_percent"],
        "other_water_bodies_after_pollution_number": metrics["other_water_bodies"]["after"]["pollution_percent"],
        "other_water_bodies_pollution_delta": metrics["other_water_bodies"]["change"]["delta_pollution_percent"],

        "surrounding_area_before_pollution_number": metrics["surrounding_area"]["before"]["pollution_percent"],
        "surrounding_area_after_pollution_number": metrics["surrounding_area"]["after"]["pollution_percent"],
        "surrounding_area_pollution_delta": metrics["surrounding_area"]["change"]["delta_pollution_percent"],

        "all_water_before_pollution_number": metrics["all_water"]["before"]["pollution_percent"],
        "all_water_after_pollution_number": metrics["all_water"]["after"]["pollution_percent"],
        "all_water_pollution_delta": metrics["all_water"]["change"]["delta_pollution_percent"],

        # Backward-friendly aliases if you want one "average" number.
        # These use the after/more-polluted image.
        "average_pollution_number_river": metrics["river"]["after"]["pollution_percent"],
        "average_pollution_number_other_water_bodies": metrics["other_water_bodies"]["after"]["pollution_percent"],
        "average_pollution_number_surrounding_area": metrics["surrounding_area"]["after"]["pollution_percent"],
    }

    return {
        "case_id": pair.case_id,
        "label": pair.label,
        "before_label": pair.before_label,
        "after_label": pair.after_label,
        "before_image": str(pair.before_path),
        "after_image": str(pair.after_path),
        "image_size": {
            "width": width,
            "height": height,
        },
        "model": {
            "type": "visual_ndwi_jpg_color_analysis",
            "important_note": (
                "This backend analyzes already-rendered NDWI JPG colors. "
                "It does not compute NDWI from raw Sentinel-2 bands."
            ),
            "pollution_definition": (
                "White-ish pixels inside expected water areas where clean water "
                "should be blue in the NDWI visualization."
            ),
            "pixel_area_m2_estimate": PIXEL_AREA_M2,
        },
        "summary": summary,
        "metrics": metrics,
        "water_components": components,
        "leaks": leaks,
    }


def analyze_all_cases() -> dict[str, Any]:
    """Analyzes every configured image pair."""
    cases = default_cases()
    analyzed_cases = [analyze_pair(pair) for pair in cases.values()]

    all_leaks: list[dict[str, Any]] = []
    next_id = 1

    for analyzed_case in analyzed_cases:
        for leak in analyzed_case["leaks"]:
            copied = dict(leak)
            copied["id"] = next_id
            all_leaks.append(copied)
            next_id += 1

    all_leaks.sort(
        key=lambda item: (
            item["severity"] == "high",
            item["score"],
            item["area_m2"],
        ),
        reverse=True,
    )

    if analyzed_cases:
        avg_confidence = sum(item["score"] for item in all_leaks) / max(len(all_leaks), 1)
        total_area_m2 = sum(item["area_m2"] for item in all_leaks)
    else:
        avg_confidence = 0.0
        total_area_m2 = 0

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cases": analyzed_cases,
        "leaks": all_leaks,
        "stats": {
            "total": len(all_leaks),
            "high": sum(1 for item in all_leaks if item["severity"] == "high"),
            "medium": sum(1 for item in all_leaks if item["severity"] == "medium"),
            "low": sum(1 for item in all_leaks if item["severity"] == "low"),
            "totalArea": total_area_m2,
            "avgConfidence": round(avg_confidence * 100.0, 2),
        },
    }


def historical_from_cases(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Builds a simple chart-friendly historical response from before/after case data.
    """
    rows: list[dict[str, Any]] = []

    for case in analysis["cases"]:
        all_water = case["metrics"]["all_water"]
        rows.append({
            "date": case["before_label"],
            "case_id": case["case_id"],
            "spills": 0,
            "area": all_water["before"]["polluted_m2_est"],
            "pollution_percent": all_water["before"]["pollution_percent"],
        })
        rows.append({
            "date": case["after_label"],
            "case_id": case["case_id"],
            "spills": len(case["leaks"]),
            "area": all_water["after"]["polluted_m2_est"],
            "pollution_percent": all_water["after"]["pollution_percent"],
        })

    return rows
