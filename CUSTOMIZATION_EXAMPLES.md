# 🎨 Customization Examples

Quick copy-paste snippets for common customizations.

---

## 🎯 Skip Button Styles

### Minimal Skip Button
```css
/* In cubic-splash.css, replace .skip-button styles */
.skip-button {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  color: #fff;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Mona Sans", sans-serif;
}

.skip-button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #fff;
}
```

### Bold Green Skip Button (matches your theme)
```css
.skip-button {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: #04AA6D;
  border: 3px solid white;
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px #999;
  font-family: "Mona Sans", sans-serif;
}

.skip-button:hover {
  background: #3e8e41;
  transform: translateY(-2px);
  box-shadow: 0 8px #666;
}

.skip-button:active {
  transform: translateY(4px);
  box-shadow: 0 2px #999;
}
```

### Hidden Skip Button (appears on hover)
```css
.skip-button {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #fff;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.3;  /* Nearly invisible */
  font-family: "Mona Sans", sans-serif;
}

.skip-button:hover {
  opacity: 1;  /* Fully visible on hover */
  background: rgba(4, 170, 109, 0.3);
  border-color: #04AA6D;
}
```

### Bottom-Right Skip Button
```css
.skip-button {
  position: fixed;
  bottom: 2rem;  /* Changed from top */
  right: 2rem;
  z-index: 10;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50px;  /* Pill shape */
  color: #fff;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Mona Sans", sans-serif;
}

.skip-button:hover {
  background: #04AA6D;
  border-color: #04AA6D;
  transform: scale(1.05);
}
```

---

## 🌈 Color Schemes

### Dark Mode (Black & Orange)
```css
/* In cubic-splash.css */
body {
  --theme-clr: #1a1a1a;  /* Dark background */
}

.content h2 {
  color: #fff;
}

.content span {
  color: #ff6b35;  /* Orange accent */
}

.spinner {
  border-top-color: #ff6b35;
}
```

### Blue Theme (Professional)
```css
body {
  --theme-clr: #1e3a5f;  /* Navy blue */
}

.content {
  background: rgba(30, 58, 95, 0.3);
  border: 2px solid rgba(100, 150, 255, 0.3);
}

.content span {
  color: #4da6ff;  /* Light blue accent */
}

.spinner {
  border-top-color: #4da6ff;
}
```

### Purple Theme (Creative)
```css
body {
  --theme-clr: #2d1b4e;  /* Deep purple */
}

.content {
  background: rgba(45, 27, 78, 0.3);
  border: 2px solid rgba(138, 43, 226, 0.4);
}

.content span {
  color: #b794f6;  /* Light purple */
}

.spinner {
  border-top-color: #b794f6;
}
```

---

## 📝 Text Variations

### Formal
```html
<h2>UDOT<span>Traffic Cameras</span></h2>
<p>Initializing camera <span>monitoring system</span>...</p>
```

### Friendly
```html
<h2>Hey<span>There!</span></h2>
<p>Getting your <span>cameras</span> ready...</p>
```

### Technical
```html
<h2>UDOT<span>Cameras</span></h2>
<p>Loading <span>live feeds</span> from <span id="cameraCount">500+</span> locations</p>
```

### Minimal
```html
<h2>Loading<span>...</span></h2>
<p>Please <span>wait</span></p>
```

---

## ⚡ Performance Presets

### Super Fast (2-3 seconds)
```javascript
// In cubic-splash.js
let density = 3;
let speed = 80;
let imageCount = 25;
let revealDuration = 800;
let pauseBeforeTransition = 200;
```

### Balanced (5-7 seconds) - DEFAULT
```javascript
let density = 5;
let speed = 150;
let imageCount = 50;
let revealDuration = 1500;
let pauseBeforeTransition = 500;
```

### Cinematic (10-12 seconds)
```javascript
let density = 7;
let speed = 220;
let imageCount = 80;
let revealDuration = 2500;
let pauseBeforeTransition = 1000;
```

---

## 🎭 Animation Variations

### Faster Tiles, Slower Reveal
```javascript
let speed = 80;        // Fast tile loading
let revealDuration = 3000;  // Slow, dramatic reveal
```

### Instant Tiles, No Reveal
```javascript
let speed = 10;        // Nearly instant tiles
let revealDuration = 0;     // Skip reveal animation
```

### Progressive Slow Down
```javascript
// In startImageInterval(), modify:
speed = Math.min(speed + (loadedCount * 2), 400);  // Speeds up as it loads
```

---

## 🖼️ Loading Indicator Styles

### Simple Percentage
```html
<!-- In cubic-splash.html -->
<div class="loading-indicator">
  <span id="loadProgress">0%</span>
</div>
```
```css
/* In cubic-splash.css, hide spinner */
.spinner {
  display: none;
}

#loadProgress {
  font-size: 3em;
  font-weight: bold;
}
```

### Progress Bar
```html
<div class="loading-indicator">
  <div class="progress-bar-container">
    <div class="progress-bar" id="progressBar"></div>
  </div>
  <span id="loadProgress">0%</span>
</div>
```
```css
.progress-bar-container {
  width: 200px;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar {
  height: 100%;
  background: #04AA6D;
  width: 0%;
  transition: width 0.3s ease;
}
```
```javascript
// In updateProgress() function
document.getElementById('progressBar').style.width = percent + '%';
```

### Dots Animation
```html
<div class="loading-indicator">
  <span>Loading</span><span class="dots"></span>
</div>
```
```css
.dots::after {
  content: '';
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
```

---

## 📱 Mobile-Specific Adjustments

### Smaller Content Box on Mobile
```css
@media (max-width: 480px) {
  .content {
    width: 90%;
    padding: 1rem;
  }
  
  .content h2 {
    font-size: 1.8em;
  }
  
  .content p {
    font-size: 0.85em;
  }
  
  .skip-button {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
}
```

### Hide Skip Button on Mobile
```css
@media (max-width: 768px) {
  .skip-button {
    display: none;  /* No skip button on mobile */
  }
}
```

---

## 🎨 Grid Customization

### Larger Grid Gaps
```css
/* In cubic-splash.css */
.inf-grid-hero-container > div {
  gap: 12px;  /* Changed from 6px */
}
```

### Rounded Tile Corners
```css
.inf-grid-hero-container > div > div {
  border-radius: 12px;  /* Changed from 4px */
}
```

### Add Tile Borders
```css
.inf-grid-hero-container > div > div.loaded {
  border: 2px solid rgba(255, 255, 255, 0.3);
}
```

### Add Glow Effect to Tiles
```css
.inf-grid-hero-container > div > div.loaded {
  box-shadow: 0 0 20px rgba(4, 170, 109, 0.3);
}
```

---

## 🔊 Add Sound (Optional)

### Load Sound on Complete
```javascript
// In onAllTilesLoaded()
const audio = new Audio('complete-sound.mp3');
audio.volume = 0.3;
audio.play().catch(e => console.log('Audio blocked:', e));
```

### Tick Sound on Each Tile
```javascript
// In startImageInterval(), after randomElement.classList.add('loaded')
const tick = new Audio('tick.mp3');
tick.volume = 0.1;
tick.play().catch(e => {});
```

---

## 🌟 Advanced: Add Focus Effect

### Zoom on Center
```javascript
// Add to cubic-splash.js
document.querySelector('.button').addEventListener('click', () => {
  const container = document.querySelector('.inf-grid-hero-container');
  container.style.transform = 'scale(1.2)';
  container.style.transition = 'transform 1s ease';
});
```

---

## 🎯 Usage Tips

1. **Copy the code** for the style you want
2. **Paste into the appropriate file** (HTML, CSS, or JS)
3. **Test immediately** to see the change
4. **Use cubic-splash-tester.html** to preview changes
5. **Combine multiple customizations** for unique effects

---

## 💡 Pro Tips

- **Keep it fast:** Don't make density > 7 or speed > 400
- **Match your brand:** Use your app's existing colors
- **Test on mobile:** Always check mobile experience
- **Accessibility:** Ensure sufficient contrast for text
- **Performance:** More tiles = slower loading

---

## 🚀 Quick Copy-Paste Workflow

1. Open file in editor (VS Code, etc.)
2. Find the section to customize
3. Copy example code from above
4. Paste and replace
5. Save file
6. Refresh browser to see changes
7. Iterate until perfect!

Enjoy customizing your cubic splash screen! 🎨
