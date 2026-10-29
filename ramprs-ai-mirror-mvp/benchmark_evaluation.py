import base64
import json
import os
import time
import urllib.request
import numpy as np
import cv2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
OUTPUT_DIR = os.path.join(BASE_DIR, "benchmark_results")
os.makedirs(OUTPUT_DIR, exist_ok=True)

USER_PHOTO_PATH = os.path.join(ASSETS_DIR, "user_portrait_sample.jpg")
GARMENT_PHOTO_PATH = os.path.join(ASSETS_DIR, "card_1.jpg")

def to_base64(path):
    with open(path, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")

def save_b64(b64_str, out_path):
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64_str))

test_cases = [
    {
        "id": "TC-01-top-oversized-black-tee",
        "name": "Text-Only: Oversized Black T-Shirt (Top Only)",
        "payload": {
            "prompt": "Replace the T-shirt with a black oversized cotton T-shirt",
            "target_region": "top",
            "style_mode": "streetwear",
            "fit": "Oversized"
        }
    },
    {
        "id": "TC-02-all-oxford-beige-chinos",
        "name": "Text-Only: White Oxford + Beige Trousers (Full Outfit)",
        "payload": {
            "prompt": "Change the outfit to a white Oxford shirt and beige trousers",
            "target_region": "all",
            "style_mode": "editorial",
            "fit": "Regular"
        }
    },
    {
        "id": "TC-03-outerwear-denim-jacket",
        "name": "Text-Only: Distressed Denim Jacket (Outerwear Only)",
        "payload": {
            "prompt": "Change only the jacket to a distressed blue denim jacket with brass buttons",
            "target_region": "outerwear",
            "style_mode": "realistic",
            "fit": "Regular"
        }
    },
    {
        "id": "TC-04-reference-card1-transfer",
        "name": "Reference Garment: Card 1 Capsule Outfit Transfer",
        "payload": {
            "garment_photo": to_base64(GARMENT_PHOTO_PATH),
            "target_region": "all",
            "style_mode": "realistic",
            "fit": "Regular"
        }
    },
    {
        "id": "TC-05-hybrid-navy-blazer",
        "name": "Hybrid: Reference Garment + Gold Button Blazer Prompt",
        "payload": {
            "prompt": "Dark navy blue blazer with golden crest buttons and crisp white dress shirt",
            "garment_photo": to_base64(GARMENT_PHOTO_PATH),
            "target_region": "top",
            "style_mode": "formal",
            "fit": "Slim"
        }
    }
]

print("=== Starting Ramprs AI Virtual Try-On Benchmark Suite ===")
user_b64 = to_base64(USER_PHOTO_PATH)

results = []

for idx, tc in enumerate(test_cases, 1):
    print(f"\n[{idx}/{len(test_cases)}] Running: {tc['name']}...")
    payload = tc["payload"].copy()
    payload["photo"] = user_b64
    
    t0 = time.time()
    req = urllib.request.Request(
        "http://127.0.0.1:8000/edit_clothing",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            elapsed = time.time() - t0
            data = json.loads(resp.read().decode("utf-8"))
            
            # Save images
            out_img_path = os.path.join(OUTPUT_DIR, f"{tc['id']}_edited.jpg")
            orig_img_path = os.path.join(OUTPUT_DIR, f"{tc['id']}_orig.jpg")
            mask_img_path = os.path.join(OUTPUT_DIR, f"{tc['id']}_mask.jpg")
            
            save_b64(data["edited_image"], out_img_path)
            save_b64(data["original_image"], orig_img_path)
            save_b64(data["mask_preview"], mask_img_path)
            
            # Quantitative image metrics
            orig_arr = cv2.imread(orig_img_path)
            edit_arr = cv2.imread(out_img_path)
            
            # Head/face region MAE (top 20% of image height)
            h, w, _ = orig_arr.shape
            head_orig = orig_arr[:int(h*0.22), :]
            head_edit = edit_arr[:int(h*0.22), :]
            head_mae = float(np.mean(np.abs(head_orig.astype(float) - head_edit.astype(float))))
            
            # Garment modification difference in clothing area
            clothing_orig = orig_arr[int(h*0.35):int(h*0.75), :]
            clothing_edit = edit_arr[int(h*0.35):int(h*0.75), :]
            clothing_diff = float(np.mean(np.abs(clothing_orig.astype(float) - clothing_edit.astype(float))))
            
            res_summary = {
                "id": tc["id"],
                "name": tc["name"],
                "target_region": payload.get("target_region"),
                "elapsed_sec": round(elapsed, 2),
                "head_preservation_mae": round(head_mae, 4), # Should be ~0 (exact identity preserved)
                "clothing_edit_intensity": round(clothing_diff, 2),
                "mask_stats": data.get("mask_stats"),
                "status": "PASS"
            }
            results.append(res_summary)
            print(f"   -> Result: PASS ({elapsed:.1f}s) | Head MAE: {head_mae:.4f} | Clothing Diff: {clothing_diff:.2f}")
    except Exception as e:
        print(f"   -> Result: FAIL ({e})")
        results.append({
            "id": tc["id"],
            "name": tc["name"],
            "status": "FAIL",
            "error": str(e)
        })

summary_path = os.path.join(OUTPUT_DIR, "benchmark_summary.json")
with open(summary_path, "w") as f:
    json.dump(results, f, indent=2)

print("\n=== Benchmark Completed! Summary written to benchmark_results/benchmark_summary.json ===")

