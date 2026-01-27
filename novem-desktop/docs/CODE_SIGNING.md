# Code Signing Guide for NOVEM

Code signing your Windows application builds trust with users and prevents security warnings.

## Prerequisites

1. **Obtain a Code Signing Certificate**
   - Purchase from: DigiCert, Sectigo, or GlobalSign
   - Cost: ~$200-500/year
   - Type: Standard Code Signing or EV Code Signing

2. **Install Certificate**
   - Import .pfx file to Windows Certificate Store
   - Note the certificate thumbprint

## Tauri Configuration

Update `tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT_HERE",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}