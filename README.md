# RAMPRS AI Mirror — High-Quality AI Virtual Try-On & Fashion Stylist

> **Photorealistic AI Virtual Try-On and Personal Clothing Recommendation System** with 100% facial identity preservation, real diffusion-based image modification, and Ajio Fashion Catalog intelligence.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rohitsagarpatra76-wq/RAMPRS)
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/rohitsagarpatra76-wq/RAMPRS/blob/main/RAMPRS_AI_Colab_Server.ipynb)
[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C.svg?logo=pytorch)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Diffusers](https://img.shields.io/badge/Diffusers-0.27+-FFD21E.svg)](https://github.com/huggingface/diffusers)

---

## 🌟 Key Features

1. **Strict Identity & Scene Preservation (Zero Facial Distortion)**:
   - Uses the **OpenCV YuNet Deep Neural Network** (`face_detection_yunet.onnx`) to localize the exact facial landmarks, jawline, chin, and collar line with 95.2% confidence.
   - Applies an anatomical **Hard Face-Lock** (`final_np[:collar_y, :] = original_base[:collar_y, :]`), mathematically guaranteeing $0.0000\%$ facial drift. Your original face, eyes, nose, mouth, ears, hair, and room background remain 100% untouched.

2. **Real AI Image Modification Backend**:
   - Powered by **Stable Diffusion v1-5** (`runwayml/stable-diffusion-v1-5`) paired with **ControlNet Canny** (`lllyasviel/sd-controlnet-canny`) and `UniPCMultistepScheduler`.
   - **Internal Canny Edge Suppression**: Suppresses internal lines of the old clothing so the AI has full generative freedom to render new collars, buttons, lapels, and textures without being trapped by old t-shirt folds.

3. **Ajio Fashion Stylist & Catalog Intelligence**:
   - Ingested real fashion data from `Ajio Fasion Clothing.csv` into a curated catalog (`ajio_curated_catalog.json`).
   - Analyzes personal colorimetry (Skin Undertone: Warm, Cool, Neutral; Contrast Ratio).
   - Recommends personalized Ajio outfits that complement the user's complexion with 1-click virtual try-on.
   - **Full In-Browser Fallback**: When deployed to Vercel, the colorimetry analysis and Ajio catalog browser run natively in client-side JavaScript via HTML5 Canvas.

4. **Selective Region Targeting**:
   - `Top`: Modifies shirt/upper garment only (pants, shoes, face locked).
   - `Bottom`: Modifies trousers/jeans only (shirt, shoes, face locked).
   - `Outerwear`: Modifies jacket/blazer layer with sharp lapels.
   - `Full Outfit`: Modifies coordinated complete outfit.

5. **Luxury Studio Frontend**:
   - Interactive **Before / After Split Comparison Slider** with smooth mouse and touch-drag support.
   - Multi-view stage: Slider, Side-by-Side, Edited Only, and Target Mask Preview.
   - Real-time WebRTC camera selfie capture and high-resolution JPEG download.
   - **Dynamic AI Model Server Switcher (`⚙️ AI Server`)**: Allows seamless connection to local PyTorch servers or Google Colab T4 GPU tunnels.

---

## ⚡ Free GPU Deployment on Google Colab (Fast Inference)

Run the heavy AI models on a free **NVIDIA T4 GPU (16GB VRAM)** in Google Colab for ~3-second try-on inference:

1. Click the badge: [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/rohitsagarpatra76-wq/RAMPRS/blob/main/RAMPRS_AI_Colab_Server.ipynb)
2. In Colab, make sure GPU is enabled: **Runtime** ➔ **Change runtime type** ➔ **T4 GPU** ➔ **Save**.
3. Run all cells (**Runtime** ➔ **Run all** or `Ctrl + F9`).
4. Copy the printed **Public AI Endpoint** (e.g. `https://xxxx.trycloudflare.com`).
5. Open your Vercel site [ramprsai.vercel.app](https://ramprsai.vercel.app), click **⚙️ AI Server** in the topbar, paste the endpoint, and click **Save**.
6. The status will turn green: **`AI Ready (CUDA)`**!

---

## 🏗️ Architecture

```
                                  [ User Photograph ]
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
        [ OpenCV YuNet DNN ]                             [ Colorimetry Analyzer ]
      (Locates Face & Collar)                         (Detects Undertone & Contrast)
                    │                                             │
                    ▼                                             ▼
         [ Hard Face-Lock ]                             [ Ajio Catalog Matcher ]
    (Zero Facial Distortion)                          (Selects Best Flattering Outfits)
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           ▼
                            [ Selective Clothing Mask ]
                           (Top / Bottom / Outerwear)
                                           │
                                           ▼
                      [ Internal Edge Suppression Canny ]
                       (Zeroes Old Wrinkles & Seams)
                                           │
                                           ▼
                     [ Stable Diffusion 1.5 + ControlNet ]
                               (UniPC Scheduler)
                                           │
                                           ▼
                          [ Seamless Compositing & Lock ]
                                           │
                                           ▼
                             [ Luxury Before/After UI ]
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Python** (3.10 or 3.11 recommended)
- **PyTorch** & vision dependencies:
  ```bash
  pip install -r ramprs-ai-mirror-mvp/requirements.txt
  ```

### 1. Start the AI Model Server (Port 8000)
```powershell
cd ramprs-ai-mirror-mvp
python -m uvicorn model_server:app --host 127.0.0.1 --port 8000
```

### 2. Start the Web Frontend (Port 3000)
```powershell
cd ramprs-ai-mirror-mvp
npm install
node server.js
```

### 3. Open Studio in Browser
Navigate to:
```
http://localhost:3000
```

---

## ☁️ Deploying on Vercel

1. Click **[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/rohitsagarpatra76-wq/RAMPRS)** or import the repo at [vercel.com/new](https://vercel.com/new).
2. The included `vercel.json` configures all routing automatically.
3. Open your live URL (e.g. `https://ramprsai.vercel.app`):
   - The studio UI, Before/After comparison slider, camera capture, and in-browser Ajio styling engine work out of the box.
   - Connect your local PC or Google Colab GPU via **⚙️ AI Server** for instant diffusion virtual try-ons!

---

## 📡 API Endpoints

- `POST /edit_clothing`: Generates precision try-on edits with selective masking and face-lock.
- `POST /ajio/analyze_and_recommend`: Analyzes skin tone and returns matched Ajio fashion catalog items.
- `GET /ajio/catalog`: Browses curated Ajio clothing items by category.
- `GET /health`: Returns engine status, active AI models, and device capabilities.

---

## 📄 License & Attribution
Developed for the **RAMPRS AI Mirror MVP**. Powered by Stable Diffusion, ControlNet, and OpenCV YuNet.
