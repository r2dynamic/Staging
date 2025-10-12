# 🎯 Quick Reference - Integrated Cubic Splash

## ✅ What You Have Now

```
📦 ONE HTML FILE:  index.html (splash inside)
📦 ONE CSS FILE:   stylev11.css (cubic styles inside)
📦 ONE JS MODULE:  js/cubicSplash.js
```

---

## 📍 Where Everything Lives

### Cubic Splash HTML
**File:** `index.html`  
**Location:** Lines after `<body>` tag  
**Element:** `<div id="cubicSplash" class="cubic-splash-overlay">`

### Cubic Splash CSS
**File:** `stylev11.css`  
**Location:** Top of file (after base styles)  
**Section:** Between `/* 3D CUBIC SPLASH */` comments

### Cubic Splash JavaScript
**File:** `js/cubicSplash.js`  
**Auto-runs:** Yes (on DOM ready)  
**Exports:** `initCubicSplash()` function

---

## 🎨 Customization

### Change Colors
**Edit:** `stylev11.css`
```css
/* Line ~200 - Content text color */
.cubic-splash-overlay .content span { 
  color: #04AA6D;  /* ← Change this */
}

/* Line ~70 - Background */
.cubic-splash-overlay {
  background: #4C4E52;  /* ← Change this */
}
```

### Change Text
**Edit:** `index.html`
```html
<!-- Around line 45 -->
<h2>UDOT<span>Cameras</span></h2>
<p>Loading <span>traffic cameras</span> across Utah...</p>
```

### Change Timing
**Edit:** `js/cubicSplash.js`
```javascript
// Lines 6-11
let density = 5;              // Grid size
let speed = 150;              // Speed (ms)
let imageCount = 50;          // Number of images
let revealDuration = 1500;    // Reveal animation (ms)
let pauseBeforeTransition = 500; // Pause (ms)
```

---

## 🔧 Key Functions

### In `js/cubicSplash.js`:

```javascript
initCubicSplash()           // Main initialization
loadCameraImages()          // Fetch from cameras.geojson
renderWalls()               // Create 3D grid
startImageInterval()        // Populate tiles
updateProgress(percent)     // Update progress display
onAllTilesLoaded()          // Trigger when complete
hideSplashAndRevealApp()    // Fade out & show app
```

---

## 🚦 Lifecycle

```
1. Page loads → index.html
2. js/cubicSplash.js auto-runs
3. Splash overlay appears (z-index: 10000)
4. Fetch cameras.geojson
5. Preload images
6. Render 3D walls (4 walls × density²)
7. Populate tiles randomly (every 150ms)
8. Update progress (0% → 100%)
9. All tiles loaded → reveal animation
10. Fade out splash (1s)
11. Remove splash from DOM
12. Main app visible
```

---

## 🎮 User Controls

- **Skip Button:** Top-right corner, always visible
- **Progress:** Shows percentage loaded
- **Auto-complete:** Loads all tiles, then reveals app
- **Mobile-friendly:** Touch-optimized skip button

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Initial load | ~19 KB (splash HTML/CSS/JS) |
| Camera images | ~50 images (~2-3 MB) |
| Splash duration | ~5-7 seconds (adaptive) |
| Fade out | 1 second |
| Total to app | ~6-8 seconds |

---

## 🐛 Debug

### Check if splash is running:
```javascript
// Browser console:
document.getElementById('cubicSplash')  // Should exist
```

### Check progress:
```javascript
// Browser console:
document.getElementById('loadProgress').textContent  // "45%"
```

### Force skip:
```javascript
// Browser console:
document.getElementById('skipButton').click()
```

### Check service worker:
```
DevTools → Application → Service Workers
Should show: v46 (activated and running)
```

---

## 🔄 Update Process

### If you make changes:

1. **Edit files**
   - `index.html` for HTML
   - `stylev11.css` for styles
   - `js/cubicSplash.js` for logic

2. **Bump service worker**
   ```javascript
   // sw.js line 3:
   const CACHE_VERSION = 'v47';  // Increment
   ```

3. **Clear cache & test**
   ```
   DevTools → Application → Clear storage
   Hard refresh: Ctrl + Shift + R
   ```

---

## 📱 Mobile Considerations

### Automatic adjustments (already included):

```css
@media (max-width: 768px) {
  .cubic-splash-overlay .content {
    width: 85%;
    padding: 1.5rem;
  }
  .cubic-splash-overlay .content h2 {
    font-size: 2em;  /* Smaller on mobile */
  }
}

@media (max-width: 480px) {
  .cubic-splash-overlay .content h2 {
    font-size: 1.5em;  /* Even smaller */
  }
}
```

---

## ⚙️ Advanced Config

### Use localStorage for testing:

```javascript
// Browser console:
localStorage.setItem('cubicSplashConfig', JSON.stringify({
  density: 7,        // More tiles (7x7 = 49 per wall)
  speed: 100,        // Faster loading
  imageCount: 100,   // More images
  revealDuration: 3000,  // Slower reveal
  pause: 1000        // Longer pause
}));

// Then refresh page
location.reload();
```

### Clear test config:
```javascript
localStorage.removeItem('cubicSplashConfig');
location.reload();
```

---

## 📂 File Locations

```
c:\Users\Ryan Romney\Documents\GitHub\Staging\
│
├── index.html              ← Splash HTML here
├── stylev11.css            ← Splash CSS here
├── manifest.json           ← start_url: "./"
├── sw.js                   ← version: v46
│
└── js\
    ├── cubicSplash.js     ← Splash logic here
    ├── main.js
    └── ...
```

---

## ✅ Checklist

- [x] Cubic splash integrated into index.html
- [x] Cubic CSS integrated into stylev11.css
- [x] Cubic JS modular in js/cubicSplash.js
- [x] Old standalone files deleted
- [x] Service worker updated (v46)
- [x] Manifest updated (start_url)
- [x] One HTML file only ✅
- [x] One CSS file only ✅

---

## 🆘 If Something Breaks

### Splash doesn't appear:
1. Check console for errors
2. Verify `js/cubicSplash.js` loads
3. Check `#cubicSplash` element exists

### Splash doesn't disappear:
1. Check for JavaScript errors
2. Verify `hideSplashAndRevealApp()` is called
3. Check `.splash-complete` class is added

### Images don't load:
1. Check `cameras.geojson` is accessible
2. Verify image URLs in camera data
3. Check network tab for failed requests
4. Should fallback to sample images

### Service worker issues:
1. Unregister old worker
2. Clear all cache
3. Hard refresh
4. Should install v46

---

## 💡 Tips

✅ **Keep it simple:** Default settings work great  
✅ **Test locally first:** Before deploying  
✅ **Clear cache:** When testing changes  
✅ **Check console:** For helpful debug messages  
✅ **Mobile test:** On real device  
✅ **Service worker:** Must update for changes  

---

## 📞 Quick Links

- **Main App:** `index.html`
- **Styles:** `stylev11.css`
- **Logic:** `js/cubicSplash.js`
- **Config:** Lines 6-11 in `js/cubicSplash.js`
- **Service Worker:** `sw.js`

---

**Everything in one place. Clean. Simple. Done.** ✨

*Last updated: October 11, 2025*
