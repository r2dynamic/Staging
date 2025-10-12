# 3D Cubic Splash Screen for UDOT Cameras

## Overview
A modern, 3D cubic gallery splash screen that loads your UDOT camera images in a stunning visual effect while your main app initializes.

## How It Works

### Flow
1. User opens the app → `cubic-splash.html` loads (set in `manifest.json`)
2. Splash fetches camera data from `cameras.geojson`
3. Extracts up to 50 random camera image URLs
4. Creates a 3D cubic grid (4 walls: top, bottom, left, right)
5. Progressively fills grid tiles with camera images (random order)
6. Shows loading progress (0-100%)
7. When complete, animates the "reveal" effect
8. Automatically transitions to `index.html` (your main app)

### Files Created
- **cubic-splash.html** - Main splash screen HTML
- **cubic-splash.css** - 3D styling and animations
- **cubic-splash.js** - Logic for loading images and 3D grid

### Files Modified
- **manifest.json** - Changed `start_url` to `./cubic-splash.html`
- **sw.js** - Added new files to cache (v44)

## Customization Options

### In `cubic-splash.js`:

```javascript
// Line 6-8: Adjust grid density and loading speed
let density = 5;      // Grid size (5x5 = 25 tiles per wall)
let speed = 150;      // Time between tile loads (ms) - lower = faster
```

**Recommended values:**
- **density**: 3-7 (3=fast, 7=slower but more tiles)
- **speed**: 100-300ms (100=fast loading, 300=slower, more dramatic)

### Visual Customization

**Change colors (in `cubic-splash.css`):**
```css
--theme-clr: #4C4E52;  /* Background color (line 19) */
color: #04AA6D;         /* Accent color for "Cameras" text (line 114) */
border-top-color: #04AA6D; /* Spinner color (line 126) */
```

**Change text:**
In `cubic-splash.html` (lines 11-13):
```html
<h2>UDOT<span>Cameras</span></h2>
<p>Loading <span>traffic cameras</span> across Utah...</p>
```

**Timing adjustments:**
In `cubic-splash.js`:
```javascript
// Line 98: Time to reveal after loading completes
animateDistance(100, 1500, () => {  // 1500ms = 1.5 seconds
  
  // Line 100: Pause before transitioning to main app
  setTimeout(() => {
    transitionToMainApp();
  }, 500);  // 500ms = 0.5 seconds
});
```

## Testing

1. **Test standalone splash:**
   - Open `cubic-splash.html` directly in browser
   - Should load, animate, then redirect to `index.html`

2. **Test as PWA:**
   - Clear browser cache
   - Open your app
   - Service worker will cache new splash files
   - Reload to see splash screen

3. **Verify transitions:**
   - Splash should auto-close after ~5-8 seconds (depending on settings)
   - Should smoothly fade to main app

## Performance Tips

1. **Faster loading:**
   - Reduce `density` to 3 or 4
   - Reduce `speed` to 100ms
   - Use fewer images (change line 136 in cubic-splash.js: `.slice(0, 50)` → `.slice(0, 30)`)

2. **More dramatic effect:**
   - Increase `density` to 6 or 7
   - Increase `speed` to 200-300ms
   - More images for variety

## Troubleshooting

**Splash doesn't appear:**
- Check service worker is updated (cache v44)
- Clear browser cache and reload
- Check browser console for errors

**Images don't load:**
- Verify `cameras.geojson` is accessible
- Check image URLs in GeoJSON (should be valid HTTP URLs)
- Falls back to sample images if camera data fails

**Splash takes too long:**
- Reduce density or speed values
- Reduce number of images loaded

**Want to skip splash temporarily:**
- Navigate directly to `index.html`
- Or comment out the transition code temporarily

## Reverting to Original Splash

If you want to go back to your video/image splash:

1. Change `manifest.json` start_url back to `./`
2. Update service worker version in `sw.js`
3. Clear browser cache

## Browser Compatibility

- ✅ Chrome/Edge (best performance)
- ✅ Safari (good)
- ✅ Firefox (good)
- ⚠️ Older browsers may not support 3D transforms

## Notes

- The splash uses actual UDOT camera images from your GeoJSON data
- If camera data fails to load, it falls back to sample images
- Images are shuffled randomly each time
- Optimized for both desktop and mobile devices
- Fully responsive design
