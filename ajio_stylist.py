# ajio_stylist.py – AI Fashion Stylist & Catalog Recommendation Engine
# -------------------------------------------------------------------------------------------------
# Feeds the AI with Ajio Fashion Clothing data and determines:
# 1. Person Skin Undertone (Warm, Cool, Neutral) & Hair-Skin Contrast Ratio
# 2. Expert Fashion Color Harmony (Which clothes look best on this individual)
# 3. Direct Curated Ajio Outfits matched to the person's profile
# 4. Instant Try-On Prompt Synthesizer for Diffusion Virtual Try-On
# -------------------------------------------------------------------------------------------------

import json
import os
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CATALOG_PATH = os.path.join(BASE_DIR, "ajio_curated_catalog.json")

# Load Curated Ajio Fashion Catalog
AJIO_CATALOG: List[Dict[str, Any]] = []
if os.path.exists(CATALOG_PATH):
    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            AJIO_CATALOG = json.load(f)
        print(f"[AjioStylist] Loaded {len(AJIO_CATALOG)} curated Ajio fashion products.")
    except Exception as e:
        print(f"[AjioStylist] Error loading catalog: {e}")


def analyze_person_colorimetry(arr_rgb: np.ndarray, face_bbox: Optional[Tuple[int, int, int, int]] = None) -> Dict[str, Any]:
    """
    Analyzes skin undertone, luminance, and contrast from user portrait.
    Returns fashion diagnostic and best color palettes.
    """
    h, w, _ = arr_rgb.shape
    
    if face_bbox:
        fx, fy, fw, fh = face_bbox
        # Cheek/forehead sample region (center of face)
        cx, cy = fx + fw // 2, fy + fh // 2
        rw, rh = max(10, int(fw * 0.25)), max(10, int(fh * 0.20))
        skin_roi = arr_rgb[max(0, cy - rh):min(h, cy + rh), max(0, cx - rw):min(w, cx + rw)]
        # Hair sample (above forehead)
        hair_roi = arr_rgb[max(0, fy - int(fh * 0.15)):max(0, fy + int(fh * 0.10)), max(0, cx - rw):min(w, cx + rw)]
    else:
        # Heuristic center-upper sample
        skin_roi = arr_rgb[int(h * 0.15):int(h * 0.35), int(w * 0.35):int(w * 0.65)]
        hair_roi = arr_rgb[int(h * 0.05):int(h * 0.15), int(w * 0.35):int(w * 0.65)]

    if skin_roi.size > 0:
        mean_skin = np.mean(skin_roi.reshape(-1, 3), axis=0)
    else:
        mean_skin = np.array([160.0, 130.0, 110.0])

    if hair_roi.size > 0:
        mean_hair = np.mean(hair_roi.reshape(-1, 3), axis=0)
    else:
        mean_hair = np.array([50.0, 45.0, 40.0])

    r, g, b = float(mean_skin[0]), float(mean_skin[1]), float(mean_skin[2])
    skin_lum = 0.299 * r + 0.587 * g + 0.114 * b
    hair_lum = 0.299 * mean_hair[0] + 0.587 * mean_hair[1] + 0.114 * mean_hair[2]
    
    contrast_ratio = max(1.0, skin_lum / max(10.0, hair_lum))
    
    # Undertone determination:
    # Warm: Strong yellow/red dominance (R - B > 30 and G - B > 12)
    # Cool: Blue component closer to Green/Red, pinkish or pale porcelain
    # Neutral: Balanced olive
    diff_rb = r - b
    diff_gb = g - b
    
    if diff_rb > 35 and diff_gb > 12:
        undertone = "Warm"
        undertone_desc = "Warm Golden / Honey Undertone"
        best_palettes = ["Olive Green", "Deep Navy", "Camel & Tan", "Warm Burgundy", "Beige", "Terracotta"]
        avoid_colors = ["Icy Neon", "Pale Lilac", "Washed-Out Pastels"]
        style_tip = "Rich earth tones and deep warm neutrals make your complexion look radiant and healthy."
    elif diff_rb < 25 or b > 140:
        undertone = "Cool"
        undertone_desc = "Cool Rosy / Jewel Undertone"
        best_palettes = ["Royal Blue", "Crisp White", "Jet Black", "Charcoal Grey", "Emerald Green", "Wine"]
        avoid_colors = ["Mustard Yellow", "Muddy Orange", "Warm Tan"]
        style_tip = "High-contrast crisp whites, royal blues, and rich jewel tones create a striking, sharp appearance."
    else:
        undertone = "Neutral"
        undertone_desc = "Neutral / Olive Undertone"
        best_palettes = ["Sage Green", "Slate Grey", "Midnight Blue", "Soft White", "Dusty Rose", "Khaki"]
        avoid_colors = ["Overly saturated neon tones"]
        style_tip = "You have versatile coloring that suits both muted earth tones and modern monochromatic styling."

    contrast_desc = "High Contrast" if contrast_ratio > 2.2 else ("Medium Contrast" if contrast_ratio > 1.6 else "Soft Harmonious Contrast")

    return {
        "undertone": undertone,
        "undertone_desc": undertone_desc,
        "contrast_ratio": round(contrast_ratio, 2),
        "contrast_desc": contrast_desc,
        "skin_hex": f"#{int(r):02x}{int(g):02x}{int(b):02x}",
        "best_palettes": best_palettes,
        "avoid_colors": avoid_colors,
        "style_tip": style_tip
    }


def recommend_ajio_outfits(
    person_analysis: Dict[str, Any],
    selected_category: Optional[str] = None,
    limit: int = 12
) -> List[Dict[str, Any]]:
    """
    Ranks and selects top Ajio catalog items matching the person's colorimetry and style profile.
    """
    undertone = person_analysis.get("undertone", "Neutral").lower()
    best_palettes = [p.lower() for p in person_analysis.get("best_palettes", [])]
    
    scored_items = []
    
    for item in AJIO_CATALOG:
        if selected_category and selected_category != "All":
            if selected_category.lower() not in item["category"].lower():
                continue
                
        score = 50.0  # Base score
        item_color = item["color"].lower()
        
        # Color match boost
        if any(bp in item_color or item_color in bp for bp in best_palettes):
            score += 35.0
            
        if item.get("color_profile") == undertone:
            score += 20.0
            
        # Category balance
        if item["category"] in ["Button-Down Shirt", "Blazer & Suiting", "T-Shirt"]:
            score += 10.0
            
        scored_items.append((score, item))
        
    scored_items.sort(key=lambda x: -x[0])
    
    results = []
    for score, it in scored_items[:limit]:
        item_copy = it.copy()
        item_copy["styling_match_reason"] = (
            f"Flattering {it['color']} tone complements your {person_analysis['undertone']} undertone."
        )
        results.append(item_copy)
        
    return results

