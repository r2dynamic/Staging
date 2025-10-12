# 🎬 Quick Start Guide: 3D Cubic Splash Screen

## ✅ What's Been Done

I've created a modern 3D cubic splash screen for your UDOT Cameras app that:

✨ **Features:**
- Loads 4 walls (top, bottom, left, right) in a 3D perspective
- Progressively fills with random UDOT camera images
- Shows loading progress (0-100%)
- Smooth reveal animation when complete
- Auto-transitions to your main app
- Fully responsive (mobile + desktop)
- Uses your actual camera data from `cameras.geojson`

📁 **Files Created:**
1. `cubic-splash.html` - Main splash screen
2. `cubic-splash.css` - Styling and animations
3. `cubic-splash.js` - Logic and image loading
4. `cubic-splash-tester.html` - Interactive configuration tool
5. `CUBIC_SPLASH_README.md` - Detailed documentation

📝 **Files Modified:**
1. `manifest.json` - Changed start_url to use new splash
2. `sw.js` - Added new files to cache (v44)

---

## 🚀 How to Test

### Option 1: Test the Splash Directly
```
1. Open: cubic-splash.html in your browser
2. Watch the 3D animation load
3. After ~5-8 seconds, it will redirect to index.html
```

### Option 2: Test Configuration Tool
```
1. Open: cubic-splash-tester.html
2. Adjust sliders for density, speed, timing
3. Click "Apply & Reload Preview"
4. See changes instantly in the preview frame
5. Click "Copy Configuration Code" when happy
6. Paste code into cubic-splash.js
```

### Option 3: Test as Full PWA
```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Open your app normally
3. Service worker will update to v44
4. Reload page
5. Splash screen appears first, then your main app
```

---

## ⚙️ Quick Customization

### Change Loading Speed
Open `cubic-splash.js` and modify line 8:
```javascript
let speed = 150;  // Lower = faster (try 100), Higher = slower (try 300)
```

### Change Grid Size
Open `cubic-splash.js` and modify line 6:
```javascript
let density = 5;  // 3 = fast/fewer tiles, 7 = slow/more tiles
```

### Change Text
Open `cubic-splash.html` lines 11-13:
```html
<h2>UDOT<span>Cameras</span></h2>
<p>Loading <span>traffic cameras</span> across Utah...</p>
```

### Change Colors
Open `cubic-splash.css`:
- Line 19: Background color `--theme-clr: #4C4E52;`
- Line 114: Accent color `color: #04AA6D;`
- Line 126: Spinner color `border-top-color: #04AA6D;`

---

## 🎨 Recommended Settings

### Fast & Snappy
```javascript
density = 3;
speed = 100;
imageCount = 30;
revealDuration = 1000;
pauseBeforeTransition = 250;
```
⏱️ Total time: ~3-4 seconds

### Balanced (Default)
```javascript
density = 5;
speed = 150;
imageCount = 50;
revealDuration = 1500;
pauseBeforeTransition = 500;
```
⏱️ Total time: ~5-7 seconds

### Dramatic & Impressive
```javascript
density = 6;
speed = 200;
imageCount = 80;
revealDuration = 2000;
pauseBeforeTransition = 1000;
```
⏱️ Total time: ~10-12 seconds

---

## 🐛 Troubleshooting

**Problem: Splash doesn't appear**
- Clear browser cache completely
- Check service worker updated to v44 (DevTools → Application → Service Workers)
- Try opening `cubic-splash.html` directly

**Problem: Images don't load**
- Check `cameras.geojson` exists and is accessible
- Open browser console (F12) and check for errors
- Fallback to sample images if camera data unavailable

**Problem: Takes too long**
- Reduce `density` to 3 or 4
- Reduce `speed` to 100ms
- Reduce `imageCount` to 30

**Problem: Want to skip temporarily**
- Go directly to `index.html`
- Or temporarily change manifest.json start_url back to `./`

---

## 📱 Mobile vs Desktop

The splash is optimized for both:

**Desktop:**
- Larger grid looks great
- Smooth 3D perspective
- Faster loading (better connection)

**Mobile:**
- Automatically adapts layout
- Smaller font sizes
- Touch-optimized
- Works great on slow connections

---

## 🔄 Reverting to Old Splash

If you want to go back to your original video/image splash:

1. Edit `manifest.json`:
   ```json
   "start_url": "./"
   ```

2. Update service worker version in `sw.js`:
   ```javascript
   const CACHE_VERSION = 'v45';
   ```

3. Clear browser cache

---

## 💡 Pro Tips

1. **Use the Tester:** `cubic-splash-tester.html` is your friend for finding perfect settings

2. **Monitor Performance:** Open DevTools → Network to see image loading

3. **Cache is King:** After first load, splash loads instantly from cache

4. **Mix It Up:** Images are randomized each time for variety

5. **Preload Strategy:** The splash preloads images before showing the grid, ensuring smooth animation

---

## 📊 Performance Estimates

**Grid Density Impact:**
- 3x3 = 36 tiles (4 walls × 9)
- 4x4 = 64 tiles
- 5x5 = 100 tiles (default)
- 6x6 = 144 tiles
- 7x7 = 196 tiles

**Time Calculation:**
```
Total Time = (Total Tiles × Speed) + Reveal Duration + Pause
Example: (100 × 150ms) + 1500ms + 500ms = 17,000ms = 17 seconds
```

---

## 🎯 Next Steps

1. ✅ Test the splash screen (`cubic-splash.html`)
2. ⚙️ Customize using the tester (`cubic-splash-tester.html`)
3. 🎨 Adjust colors/text to your preference
4. 🚀 Deploy and enjoy!

---

## 📞 Need Help?

Check the detailed documentation in `CUBIC_SPLASH_README.md` for more advanced customization options and technical details.

Happy coding! 🎉
