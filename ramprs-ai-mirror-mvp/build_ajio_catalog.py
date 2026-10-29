import csv
import json
import os
import re

CSV_PATH = r"c:\Users\ROHIT SAGAR PATRA\OneDrive\Desktop\RAMPRS-AI-Mirror-MVP\Ajio Fasion Clothing.csv"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(BASE_DIR, "ajio_curated_catalog.json")

def clean_brand(brand):
    return brand.replace("-", " ").strip().title()

def categorize_item(desc, color):
    d = desc.lower()
    
    if "blazer" in d or "suit" in d:
        return "Blazer & Suiting", "top", "formal", "Sharp formal tailored silhouette, premium worsted wool feel"
    elif "jacket" in d or "bomber" in d or "denim jacket" in d:
        return "Jacket & Outerwear", "outerwear", "streetwear", "Layered contemporary outerwear with structured shoulders"
    elif "kurta" in d or "ethnic" in d:
        return "Ethnic & Fusion", "all", "editorial", "Refined Indian ethnic wear with elegant drape"
    elif "polo" in d:
        return "Polo T-Shirt", "top", "realistic", "Classic smart-casual ribbed collar polo"
    elif "t-shirt" in d or "tee" in d:
        style = "streetwear" if ("oversized" in d or "relaxed" in d) else "realistic"
        return "T-Shirt", "top", style, "Heavyweight cotton knit with clean modern drape"
    elif "shirt" in d:
        return "Button-Down Shirt", "top", "editorial", "Crisp tailored button-down shirt with structured collar"
    elif "trouser" in d or "chinos" in d:
        return "Trousers & Chinos", "bottom", "editorial", "Tailored flat-front trousers with crisp creases"
    elif "jean" in d or "denim" in d:
        return "Denim Jeans", "bottom", "realistic", "Authentic washed denim with subtle whiskers and clean hem"
    elif "hoodie" in d or "sweatshirt" in d:
        return "Hoodie & Sweatshirt", "top", "streetwear", "Cozy premium fleece with modern streetwear proportions"
    return "Apparel", "all", "realistic", "Modern stylish garment"

def detect_fit(desc):
    d = desc.lower()
    if "slim" in d:
        return "Slim"
    elif "relaxed" in d:
        return "Relaxed"
    elif "oversized" in d:
        return "Oversized"
    return "Regular"

print("Reading Ajio Fashion Clothing CSV dataset...")
catalog = []
seen = set()

# Color harmony map: Which skin undertone / contrast does each color complement?
COLOR_RULES = {
    "warm": ["olive", "navy", "camel", "beige", "maroon", "burgundy", "brown", "tan", "mustard", "green", "rust"],
    "cool": ["white", "black", "royal blue", "charcoal", "grey", "silver", "emerald", "wine", "dark navy"],
    "neutral": ["slate", "khaki", "cream", "powder blue", "sage", "off-white", "indigo"]
}

with open(CSV_PATH, "r", encoding="utf-8", errors="ignore") as f:
    reader = csv.DictReader(f)
    for r in reader:
        brand = r.get("Brand", "").strip()
        desc = r.get("Description", "").strip()
        color = (r.get("Color") or "").strip().lower()
        img = r.get("URL_image", "").strip()
        price = r.get("Discount Price (in Rs.)", "").strip()
        orig_price = r.get("Original Price (in Rs.)", "").strip()
        prod_url = r.get("Product_URL", "").strip()
        
        if not desc or not img or not color or len(desc) < 8:
            continue
            
        key = (desc.lower(), color)
        if key in seen:
            continue
        seen.add(key)
        
        category, region, style_mode, fabric_physics = categorize_item(desc, color)
        fit = detect_fit(desc)
        
        # Color match profile
        color_profile = "versatile"
        for undertone, c_list in COLOR_RULES.items():
            if any(c in color for c in c_list):
                color_profile = undertone
                break
                
        prompt = (
            f"A masterwork editorial photograph of a person wearing an Ajio {clean_brand(brand)} {color.title()} {desc}. "
            f"{fabric_physics}. Clean stitching, natural fabric creases, realistic drape, 8k uhd."
        )
        
        catalog.append({
            "id": f"ajio-{len(catalog)+1:04d}",
            "brand": clean_brand(brand),
            "title": desc,
            "color": color.title(),
            "category": category,
            "region": region,
            "fit": fit,
            "style_mode": style_mode,
            "price": f"Rs. {price}" if price else "",
            "orig_price": f"Rs. {orig_price}" if orig_price else "",
            "image_url": img,
            "product_url": prod_url,
            "color_profile": color_profile,
            "fabric_physics": fabric_physics,
            "tryon_prompt": prompt
        })
        
        if len(catalog) >= 150:
            break

print(f"Processed {len(catalog)} diverse Ajio catalog entries.")
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(catalog, f, indent=2)

print(f"Curated catalog successfully saved to: {OUT_PATH}")

