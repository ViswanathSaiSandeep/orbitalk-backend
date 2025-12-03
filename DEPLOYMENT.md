# OrbiTalk Backend - Render.com Deployment Guide

## 🚀 Quick Deploy

### Prerequisites
- GitHub account
- Render.com account (free tier works!)
- Azure Speech & Translator API keys

---

## Step 1: Push Backend to GitHub

```bash
cd d:\OrbiTalk\backend

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial backend deployment"

# Create a new GitHub repo (orbitalk-backend) and push
git remote add origin https://github.com/YOUR_USERNAME/orbitalk-backend.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy on Render.com

1. **Go to:** https://dashboard.render.com/
2. **Click:** "New +" → "Web Service"
3. **Connect GitHub repo:** `orbitalk-backend`
4. **Configure:**
   - **Name:** `orbitalk-backend`
   - **Region:** Singapore (or closest to users)
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. **Add Environment Variables:**
   - `SPEECH_KEY`: Your Azure Speech API key
   - `SPEECH_REGION`: `centralindia`
   - `TRANSLATOR_KEY`: Your Azure Translator API key
   - `TRANSLATOR_REGION`: `centralindia`

6. **Click:** "Create Web Service"

---

## Step 3: Get Your WebSocket URL

After deployment completes (2-3 minutes):

Your WebSocket server will be at:
```
wss://orbitalk-backend.onrender.com
```

**Note:** Render uses `wss://` (secure WebSocket), not `ws://`

---

## Step 4: Update Flutter App

### Update `translation_config.dart`:

```dart
class TranslationConfig {
  // OLD (local testing):
  // static const String websocketUrl = 'ws://192.168.1.28:8080';
  
  // NEW (production):
  static const String websocketUrl = 'wss://orbitalk-backend.onrender.com';
  
  // ... rest of file
}
```

**File:** `d:\OrbiTalk\orbitalk backup\orbitalk backup\lib\config\translation_config.dart`

---

## Step 5: Test Production Deployment

1. **Rebuild Flutter app** (Hot reload won't work for config changes):
   ```bash
   flutter run
   ```

2. **Make a test call** between two devices

3. **Check Render logs** for backend activity:
   - Go to Render dashboard → Your service → "Logs"
   - Should see: "WebSocket server started on port 10000"

---

## 🔍 Monitoring

### Check Backend Logs (Real-time)
```bash
# In Render dashboard → Logs tab
```

Expected logs:
```
WebSocket server started on port 10000
New WebSocket client connected: <clientId>
(SpeechService) RECOGNIZED event
[clientId] Translated: <text>
(SpeechService) Synthesized WAV audio: <bytes> bytes
```

### Check Flutter Logs
```bash
flutter logs
```

Expected logs:
```
WebSocketService: Connected successfully
WebSocketService: Received audio data - <bytes> bytes
ZegoTranslationService: Audio playback started
```

---

## ⚠️ Important Notes

### Free Tier Limitations
- **Sleep after 15min inactivity** → First request may take 30s to wake up
- **750 hours/month** (shared across all services)
- For always-on service, upgrade to paid tier ($7/month)

### WebSocket Keep-Alive
The server already has ping/pong implemented to prevent connection drops.

### CORS & Security
WebSocket doesn't need CORS, so no additional configuration needed.

---

## 🐛 Troubleshooting

### Issue: "Connection refused"
**Cause:** Server is sleeping (free tier)  
**Solution:** Wait 30s for server to wake up, or upgrade to paid tier

### Issue: "WebSocket connection failed"
**Check:**
1. URL uses `wss://` not `ws://`
2. Render service is deployed (green checkmark)
3. Environment variables are set correctly

### Issue: "No audio translation"
**Check Render logs for:**
```
Error: SPEECH_KEY is invalid
Error: TRANSLATOR_KEY is invalid
```
**Solution:** Verify environment variables in Render dashboard

---

## 🔄 Updates & Redeployment

When you make code changes:

```bash
cd d:\OrbiTalk\backend
git add .
git commit -m "Your update message"
git push origin main
```

Render automatically redeploys on git push! 🎉

---

## 📊 Performance Testing

After deployment, test real-world latency:

1. **Use different networks:**
   - Device A: WiFi
   - Device B: Mobile data

2. **Measure latency:**
   - Time from speaking to hearing translated audio
   - Check Render logs for processing time

3. **Expected latency:**
   - Local: 1-2 seconds
   - Production: 2-4 seconds (includes network roundtrip)

---

## 💰 Cost Estimates

**Free Tier:**
- ✅ Perfect for testing
- ✅ 750 hours/month
- ❌ Sleeps after 15min inactivity

**Starter Plan ($7/month):**
- ✅ Always running (no sleep)
- ✅ Better performance
- ✅ Recommended for production

**Azure Costs:**
- Speech STT: Free 5 hours/month, then $1/hour
- Translation: Free 2M chars/month
- Speech TTS: Free 0.5M chars/month

---

## 🔒 Security Recommendations

Before production release:

1. **Never commit .env file** ✅ (already in .gitignore)
2. **Use environment variables** ✅ (already configured)
3. **Add rate limiting** (future enhancement)
4. **Add authentication** (future enhancement)

---

## ✅ Deployment Checklist

- [ ] Backend pushed to GitHub
- [ ] Render service created
- [ ] Environment variables configured
- [ ] Service deployed successfully (green)
- [ ] Flutter app updated with production URL
- [ ] Test call completed
- [ ] Logs verified in Render dashboard
- [ ] Real-world latency measured

---

## 📞 Support

If you encounter issues:
1. Check Render logs first
2. Check Flutter console logs
3. Verify environment variables
4. Test with local server to isolate issue
