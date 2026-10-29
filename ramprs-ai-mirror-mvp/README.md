# RAMPRS AI Mirror MVP — Hackathon Build

A local-first web prototype for the revised RAMPRS flow: capture/upload a customer photo, collect styling preferences, and rank a 15-look sample outfit inspiration catalog.

## Run on Windows
1. Install Node.js 18 or newer if needed.
2. Extract this ZIP to a normal folder.
3. Open PowerShell in that folder.
4. Run `npm.cmd install`
5. Run `npm.cmd start`
6. Open `http://localhost:3000`
7. Press **Enable camera**, allow camera permission, then **Capture photo**. Or upload a JPG/PNG/WebP.
8. Choose preferences and press **Build my 15-look catalog**.

## Mobile camera
For a phone, localhost on your laptop is not the same as localhost on the phone. Deploy to an HTTPS host or use a trusted HTTPS tunnel; do not expose the development server to an untrusted network. Camera access requires a secure context in modern browsers.

## Current scope and honest limitations
- Camera capture and upload are functional; the photo is held in browser memory and is not sent to the server.
- Outfit ranking uses transparent JavaScript rules and a sample catalog. It does not currently infer height, weight, exact measurements, or skin tone from the image.
- Catalog photos are illustrative fashion inspiration loaded from Unsplash and require internet access. Prices are illustrative budget cues, not RAMPRS inventory or purchasable offers.
- This version does not yet generate images of the customer wearing each outfit. That requires integrating a suitable image-editing/virtual-try-on model. Review privacy and retention terms and get explicit consent before sending any customer photo to an external service.
- This is a prototype, not a production checkout or inventory system.
