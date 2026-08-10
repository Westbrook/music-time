# Changelog

## Version 1.5.4 - Button Height Normalization (2026-08-10)

### 📏 **Consistent Button Heights**

Fixed button height inconsistencies that caused UI shifts when switching between button states.

**Problem**:
- `.btn-primary`, `.btn-success`: `border: none` (implicit 0px)
- `.btn-secondary`: `border: 1px solid`
- `.btn-danger`: `border: 1.5px solid`

**Result**: Different total heights caused layout shift when buttons changed.

**Solution**:
```css
/* All buttons now use consistent border */
.btn {
  border: 1px solid transparent;  /* Base */
  box-sizing: border-box;
}

.btn-primary { /* Inherits 1px transparent */ }
.btn-secondary { border-color: rgba(...); }  /* Changes color only */
.btn-danger { border-color: var(--danger-color); }  /* Changes color only */
.btn-success { /* Inherits 1px transparent */ }
```

**Benefits**:
- ✅ All buttons now exactly same height
- ✅ No UI shift when switching states
- ✅ Consistent box model with `box-sizing: border-box`
- ✅ Cleaner CSS (use `border-color` instead of redefining `border`)

**Box Model**:
```
Total Height = padding + border + content
             = 0.875rem + 1px + font-size + 0.875rem
             = Same for all buttons ✅
```

---

## Version 1.5.3 - Border Radius Consistency (2026-08-10)

### 🔄 **Systematic Border Radius Application**

Fixed inconsistent border radii by ensuring all elements use the defined CSS variables according to the concentric hierarchy.

**Issues Fixed**:
```css
/* Before (inconsistent) */
.btn { border-radius: 20px; }          /* Hardcoded */
input { border-radius: 12px; }         /* Hardcoded */
input[type="range"] { border-radius: 3px; } /* Hardcoded */

/* After (systematic) */
.btn { border-radius: var(--radius-md); }   /* 12px */
input { border-radius: var(--radius-md); }  /* 12px */
input[type="range"] { border-radius: var(--radius-xs); } /* 6px */
```

**Complete Hierarchy Applied**:

**Level 1 - Card Containers** (20px):
- `.card` → `var(--radius-xl)`

**Level 2 - Focal Displays** (16px):
- `.timer-container` → `var(--radius-lg)`
- `.stats-grid` → `var(--radius-lg)`
- `.bpm-container` → `var(--radius-lg)`
- `.tone-display` → `var(--radius-lg)`

**Level 3 - Secondary Elements** (12px):
- `.stat-item` → `var(--radius-md)`
- `.btn` → `var(--radius-md)` ← Fixed
- `input[type="number"]` → `var(--radius-md)` ← Fixed
- `select` → `var(--radius-md)` ← Fixed

**Level 4 - Small Elements** (8px):
- `.timer-hint` → `var(--radius-sm)`
- `.beat-indicator` → `var(--radius-sm)`

**Level 5 - Tiny Elements** (6px):
- `.daily-item` → `var(--radius-xs)`
- `input[type="range"]` → `var(--radius-xs)` ← Fixed

**Rational Relationships**:
```
Card (20px)
  ├─ Focal Display (16px)
  │   ├─ Secondary Element (12px)
  │   │   ├─ Small Element (8px)
  │   │   │   └─ Tiny Element (6px)
```

**Benefits**:
- ✅ No more hardcoded border radii
- ✅ Consistent visual hierarchy
- ✅ Easy to maintain/update
- ✅ Predictable scaling
- ✅ Concentric harmony

---

## Version 1.5.2 - Stats Grid Padding Adjustment (2026-08-10)

### 📦 **Stats Card Compaction**

Reduced internal padding in the stats grid to match the compact height of other focal displays.

**Stats Grid Changes**:
```css
/* Before */
.stats-grid {
  padding: 0.5rem;
  gap: 0.5rem;
}

.stat-item {
  padding: 1.5rem 1rem;
  gap: 0.75rem;
}

/* After */
.stats-grid {
  padding: 0.375rem;  /* Tighter outer padding */
  gap: 0.375rem;      /* Tighter gap between items */
}

.stat-item {
  padding: 1rem 0.75rem;  /* More compact padding */
  gap: 0.5rem;            /* Tighter gap between ring and text */
  box-sizing: border-box;
}
```

**Problem**: The stats grid had extra padding layers (grid padding + item padding + gap) that made it visually taller than the other focal displays, even with the same `min-height: 200px`.

**Solution**: Reduced padding at both the grid and item level to create a more compact, visually balanced display that truly matches the other focal heights.

**Benefits**:
- ✅ Stats grid now visually matches other displays
- ✅ Better vertical rhythm across all cards
- ✅ More efficient use of space
- ✅ Still maintains readability
- ✅ True height normalization achieved

---

## Version 1.5.1 - Compact Normalized Focal Display Heights (2026-08-10)

### 📏 **Compact Height Normalization**

All four focal displays now share a compact, consistent height that maximizes information density while maintaining visual harmony.

**Unified Compact Height**:
```css
/* Desktop/Tablet */
min-height: 200px;

/* Mobile */
min-height: 180px;
```

**All Four Displays**:
- ✅ Timer container: `200px`
- ✅ Stats grid: `200px`
- ✅ BPM container: `200px`
- ✅ Tone display: `200px`

**Design Philosophy**: Match the original stats card height (~200px) for a more compact, information-dense layout.

**Implementation**:
```css
.timer-container,
.stats-grid,
.bpm-container,
.tone-display {
  min-height: 200px;
  box-sizing: border-box; /* Includes padding/border in height */
  display: flex;
  justify-content: center;
  align-items: center;
}
```

**Timer Ring Sizing**:
```css
.timer-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
  width: calc(100% - 4rem);  /* Accounts for padding */
  height: calc(100% - 4rem);
  max-width: 160px;
  max-height: 160px;
}
```

**Key Fix**: Added `box-sizing: border-box` to all focal displays so that `min-height: 200px` includes padding and border, ensuring true height normalization.

**Benefits**:
- ✅ Compact, scannable layout
- ✅ More content visible without scrolling
- ✅ Equal visual weight across displays
- ✅ Professional consistency
- ✅ Optimal information density

**Height Evolution**:
```
Original (variable):
Timer:  ~280px
Stats:  ~200px ← Target height
BPM:    ~160px
Tone:   ~180px

After v1.5.1:
Timer:  200px ✅
Stats:  200px ✅
BPM:    200px ✅
Tone:   200px ✅
```

**Visual Result**: Compact, perfectly aligned focal displays with content vertically centered. More content fits on screen while maintaining visual consistency.

---

## Version 1.5.0 - Multi-Ring Progress System & Visual Cohesion (2026-08-10)

### ⏱️ **Concentric Multi-Ring Timer**

The practice timer now visualizes progress across four time scales simultaneously with nested, color-coded rings.

**Four-Ring System**:
```
Days Ring (Orange, outermost)  ← 24 hours to fill
Hours Ring (Green)             ← 60 minutes to fill
Minutes Ring (Teal)            ← 60 seconds to fill
Seconds Ring (Blue, innermost) ← Real-time progress
```

**Visual Architecture**:
```
        Seconds (71px radius)
      Minutes (78px radius)
    Hours (85px radius)
  Days (92px radius)
```

**Color Coding**:
- 🔵 **Blue** (Seconds) — iOS System Blue (#007aff)
- 🟦 **Teal** (Minutes) — SF Teal (#5ac8fa)
- 🟢 **Green** (Hours) — SF Green (#34c759)
- 🟠 **Orange** (Days) — SF Orange (#ff9500)

**How It Works**:
- **Seconds ring**: Fills smoothly every 60 seconds, then resets
- **Minutes ring**: Advances 1/60th with each minute, fills at 60 minutes
- **Hours ring**: Advances 1/24th with each hour, fills at 24 hours
- **Days ring**: Advances with each day completed

**Result**: At a glance, see exactly where you are in your practice session across all time scales.

---

### 📊 **Stat Card Progress Rings**

Added visual progress indicators to the Practice History card, creating cohesion with the timer design.

**Today Ring** (Blue):
- Goal: 1 hour of practice
- Fills as you practice
- Live updates with active session

**7-Day Total Ring** (Blue):
- Goal: 7 hours over the week
- Shows weekly progress
- Fills proportionally to goal

**Visual Structure**:
```
┌──────────────────┐  ┌──────────────────┐
│    ⭕ 90px       │  │    ⭕ 90px       │
│                  │  │                  │
│     Today        │  │   7-Day Total    │
│    0h 45m        │  │     3h 12m       │
└──────────────────┘  └──────────────────┘
```

**Benefits**:
- Visual feedback on daily goals
- Quick progress assessment
- Matches timer aesthetic
- Creates visual unity across cards

---

### 🎨 **Technical Implementation**

**Timer Rings** (script.js):
```javascript
updateRing() {
  // Seconds: elapsed % 60 / 60
  // Minutes: (elapsed / 60) % 60 / 60
  // Hours: (elapsed / 3600) % 24 / 24
  // Days: elapsed / 86400 (accumulates)
}
```

**Stat Rings** (script.js):
```javascript
updateStatRings(todaySeconds, weekSeconds) {
  // Today: progress against 3600 second goal
  // Week: progress against 25200 second goal
}
```

**Ring Styling** (styles.css):
```css
/* Thinner rings for nested display */
stroke-width: 4px;

/* Color-specific classes */
.ring-seconds { stroke: var(--primary-color); }
.ring-minutes { stroke: #5ac8fa; }
.ring-hours { stroke: var(--success-color); }
.ring-days { stroke: #ff9500; }
```

**Dark Mode Enhancement**:
```css
.timer-ring-progress {
  filter: drop-shadow(0 0 6px currentColor);
}
```
Each ring glows with its own color.

---

### ✨ **Visual Cohesion Benefits**

**Before v1.5.0**:
```
Timer:  [Single blue ring, seconds only]
Stats:  [Text-only display, no visual progress]
```

**After v1.5.0**:
```
Timer:  [Four nested rings, all time scales] ⭕🔵🟦🟢🟠
Stats:  [Progress rings matching timer style] ⭕🔵
```

**Creates Unity**:
1. Both cards use circular progress visualization
2. Same stroke width and styling
3. Shared color language (blue primary)
4. Consistent glowing effects in dark mode
5. User recognizes "progress ring = time tracking"

**Information Density**:
- Timer shows: seconds, minutes, hours, days (4 dimensions)
- Stats show: today vs goal, week vs goal (2 dimensions)
- All at a glance, no numbers needed

---

### 🔍 **User Experience**

**Timer Insights**:
- "I've been practicing for 2 minutes 30 seconds" (blue/teal rings)
- "I'm halfway through my first hour" (green ring half-full)
- "This is day 3 of my streak" (orange ring progress)

**Stats Insights**:
- "Almost at my daily goal!" (today ring nearly complete)
- "Halfway through my weekly target" (week ring 50% filled)

**Progressive Disclosure**:
- Quick glance: color-coded ring progress
- Focused look: precise time in center display
- Detail view: daily breakdown below

---

### 📐 ### 📱 **Responsive Layout**

**Desktop/Tablet** (>768px):
- Stats displayed side-by-side
- `grid-template-columns: repeat(2, 1fr)`
- Equal width columns
- Optimal use of horizontal space

**Mobile** (≤768px):
- Stats stack vertically
- `grid-template-columns: 1fr`
- Full-width rings
- Easy thumb access

---

### 📐 **Ring Specifications**

**Timer Rings**:
| Ring | Radius | Circumference | Color | Period |
|------|--------|---------------|-------|--------|
| Seconds | 71px | 446 | Blue | 60s |
| Minutes | 78px | 490 | Teal | 60m |
| Hours | 85px | 534 | Green | 24h |
| Days | 92px | 578 | Orange | ∞ |

**Stat Rings**:
| Ring | Radius | Circumference | Color | Goal |
|------|--------|---------------|-------|------|
| Today | 52px | 327 | Blue | 1h |
| Week | 52px | 327 | Blue | 7h |

**Spacing**: 7px gap between timer rings creates clear visual separation.

---

## Version 1.4.4 - Concentric Border Radius System & Focal Display Normalization (2026-08-10)

### 🎯 **Complete Focal Display Normalization**

All four primary content displays now share identical visual treatment:

**Timer Container** = **Stats Grid** = **BPM Container** = **Tone Display**

**Unified Specifications**:
```css
padding: 2rem 1.5rem;
margin-bottom: 1.5rem;
border-radius: var(--radius-lg); /* 16px */
border: 1px solid var(--border-color);
```

**Light Mode**:
```css
background: white;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
```

**Dark Mode**:
```css
background: rgba(255, 255, 255, 0.03);
border-color: rgba(255, 255, 255, 0.08);
```

**BPM Container Exception**: Retains gradient background while matching all other properties (padding, margin, radius, border structure).

---

### 🔄 **Concentric Border Radius System**

Implemented a hierarchical radius system where nested elements have progressively smaller radii, creating natural visual harmony.

**The System**:
```css
--radius-xl: 20px;  /* Card outer containers */
--radius-lg: 16px;  /* Focal displays (primary content) */
--radius-md: 12px;  /* Secondary containers, inputs */
--radius-sm: 8px;   /* Nested items, small elements */
--radius-xs: 6px;   /* Inner-most elements */
```

**Visual Hierarchy**:
```
┌─────────────────────────────────┐ 20px (Card)
│                                 │
│  ┌───────────────────────────┐  │ 16px (Focal Display)
│  │                           │  │
│  │  ┌─────────────────────┐  │  │ 12px (Stat Item)
│  │  │                     │  │  │
│  │  │  ┌───────────────┐  │  │  │ 8px (Input)
│  │  │  │               │  │  │  │
│  │  │  │  ┌─────────┐  │  │  │  │ 6px (Daily Item)
│  │  │  │  │         │  │  │  │  │
│  │  │  │  └─────────┘  │  │  │  │
│  │  │  └───────────────┘  │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Concentric Principle**: Each nested level steps down 4px, creating smooth visual flow.

---

### 📐 **Applied Across All Elements**

**Level 1 - Card Containers** (20px):
- `.card` → `var(--radius-xl)`

**Level 2 - Focal Displays** (16px):
- `.timer-container` → `var(--radius-lg)`
- `.stats-grid` → `var(--radius-lg)`
- `.bpm-container` → `var(--radius-lg)`
- `.tone-display` → `var(--radius-lg)`
- `.focal-display` → `var(--radius-lg)`

**Level 3 - Secondary Elements** (12px):
- `.stat-item` → `var(--radius-md)`
- Input controls → `var(--radius-md)`
- Select dropdowns → `var(--radius-md)`

**Level 4 - Small Elements** (8px):
- `.timer-hint` → `var(--radius-sm)`
- `.beat-indicator` → `var(--radius-sm)`
- Buttons → `var(--radius-sm)` (pillshape override)

**Level 5 - Inner Elements** (6px):
- `.daily-item` → `var(--radius-xs)`

---

### ✨ **Visual Benefits**

**Before v1.4.4**:
```
Timer:    [custom size, no border, floating]
Stats:    [12px radius, 0.25rem padding]
BPM:      [16px radius, 2rem padding, max-width 200px]
Tone:     [12px radius, 2rem padding]

Mixed radii: 8px, 10px, 12px, 16px (inconsistent)
```

**After v1.4.4**:
```
Timer:    [16px radius, 2rem/1.5rem padding, border, shadow] ✅
Stats:    [16px radius, 2rem/1.5rem padding, border, shadow] ✅
BPM:      [16px radius, 2rem/1.5rem padding, border, shadow] ✅
Tone:     [16px radius, 2rem/1.5rem padding, border, shadow] ✅

Systematic radii: 20px → 16px → 12px → 8px → 6px ✅
```

---

### 🎨 **Detailed Changes**

**Timer Container**:
- Added padding: `2rem 1.5rem`
- Added background/border/shadow (matches other focal displays)
- Changed radius: `var(--radius-lg)` (16px)
- Now visually consistent with stats/BPM/tone

**Stats Grid**:
- Changed radius: `var(--radius-md)` → `var(--radius-lg)` (12px → 16px)
- Changed padding: `0.25rem` → `0.5rem` (more breathing room)
- Stat items use `var(--radius-md)` (12px, one step smaller)

**BPM Container**:
- Changed max-width: `200px` → `280px` (matches timer)
- Changed padding: `2rem` → `2rem 1.5rem` (matches pattern)
- Changed margin: `2rem` → `1.5rem` (matches pattern)
- Added border: `1px solid transparent` (structure consistency)
- Changed radius: Already `var(--radius-lg)` ✅

**Tone Display**:
- Changed radius: `var(--radius-md)` → `var(--radius-lg)` (12px → 16px)
- Padding/margin already matched ✅

---

### 🏗️ **System Architecture**

**Design Principle**: "Concentric scaling creates natural visual harmony"

```
Outer → Inner
20px → 16px → 12px → 8px → 6px
 ↓      ↓      ↓      ↓      ↓
Card   Focus  Second Small  Tiny
```

**No More Arbitrary Radii**:
- ❌ `calc(var(--radius-md) - 2px)` (10px, not in system)
- ✅ `var(--radius-md)` (12px, defined in system)

**Predictable Nesting**:
- Container at one level? Contents are one step smaller.
- Visual relationships clear at a glance.
- Easier to maintain and extend.

---

### 📏 **Spacing Normalization**

All focal displays now share:
- **Vertical padding**: `2rem`
- **Horizontal padding**: `1.5rem`
- **Bottom margin**: `1.5rem`
- **Max width**: `280px` (timer/BPM) or full-width (stats/tone)

**Result**: Perfectly aligned visual rhythm across all primary content areas.

---

## Version 1.4.3 - Layout Refinement & Justified Controls (2026-08-10)

### 🎯 **Focal Display Normalization**

Created a unified visual language for primary content displays across all cards.

**Unified Focal Displays**:
- `.timer-container` (Stopwatch)
- `.stats-grid` (History)
- `.bpm-container` (Metronome)
- `.tone-display` (Tuner)

**Shared Characteristics**:
- ✅ Consistent padding and margins
- ✅ Unified background treatment
- ✅ Same border styling
- ✅ Matching shadows (light mode)
- ✅ Glass effect (dark mode)

**Light Mode**:
```css
background: white;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
border: 1px solid var(--border-color);
```

**Dark Mode**:
```css
background: rgba(255, 255, 255, 0.03);
border-color: rgba(255, 255, 255, 0.08);
```

### 🔘 **Justified Button Layout**

Buttons now fill their container width for a more polished, professional appearance.

**Before**:
```
[  Start  ] [  Pause  ] [  Done  ]  (centered, gaps)
```

**After**:
```
[    Start    ][    Pause    ][    Done    ]  (justified, proportional)
```

**Implementation**:
- Buttons use `flex: 1` to share available space
- Maintain min-width for touch targets
- Wrap gracefully on mobile
- More intentional, purposeful feel

### 📌 **Footer Positioning**

Card footers now always stick to the bottom using flexbox.

**Card Structure**:
```css
.card {
  display: flex;
  flex-direction: column;
}

.card-body {
  flex: 1; /* Takes available space */
}

.card-footer {
  margin-top: auto; /* Pushes to bottom */
}
```

**Benefit**: Even with varying content heights, action buttons are always consistently positioned at the card bottom.

### 📱 **Mobile Responsive Refinement**

Fixed the incorrect mobile padding rule and properly scoped responsive changes:

**Before** (incorrect):
```css
@media (max-width: 768px) {
  .card {
    padding: 1.5rem; /* Wrong - conflicts with new structure */
  }
}
```

**After** (correct):
```css
@media (max-width: 768px) {
  .card h2 {
    padding: 1.25rem 1.5rem 0.875rem;
  }

  .card-body {
    padding: 1.5rem;
  }

  .card-footer {
    padding: 1.25rem 1.5rem 1.5rem;
  }
}
```

### 🎨 **Visual Consistency**

**Focal Display Pattern** - All primary displays share:
1. 2rem vertical padding, 1.5rem horizontal
2. 1.5rem bottom margin
3. Rounded corners (var(--radius-md))
4. Subtle elevation (shadow/glass)
5. Consistent border treatment

**Stats Grid** now matches:
- Timer container styling
- BPM container styling
- Tone display styling

**Result**: User can instantly recognize "this is the main thing" in each card.

### ✨ **Key Improvements**

1. **Normalized Focal Displays** - Consistent visual weight across all primary content
2. **Justified Buttons** - Professional, intentional layout
3. **Sticky Footers** - Actions always at the bottom
4. **Fixed Mobile Padding** - Proper responsive structure
5. **Unified Visual Language** - Same patterns throughout

---

## Version 1.4.2 - Unified Card Layout Rhythm (2026-08-10)

### 🏗️ **Structural Consistency**

Standardized the internal architecture of all cards to create a predictable, professional layout rhythm throughout the app.

### Card Structure System

**New Three-Part Architecture**:
```
┌─────────────────────────┐
│ .card                   │ ← Container (no padding, overflow hidden)
│ ┌─────────────────────┐ │
│ │ h2 (Header)         │ │ ← Section label with accent line
│ ├─────────────────────┤ │
│ │ .card-body          │ │ ← Main content (2rem padding)
│ │                     │ │
│ │ Content...          │ │
│ │                     │ │
│ ├─────────────────────┤ │
│ │ .card-footer        │ │ ← Button controls (1.5rem + 2rem padding)
│ │ [Buttons]           │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Header Standardization

**All Card Headers** (`h2`):
- ✅ Uppercase micro-typography (0.75rem, 700 weight)
- ✅ Letter spacing: 1.5px
- ✅ Padding: 1.5rem top/sides, 1rem bottom
- ✅ Background panel with bottom border
- ✅ Blue accent line (40px × 2px)
- ✅ Consistent positioning across all cards

### Body Content Standardization

**All Card Bodies** (`.card-body`):
- ✅ Consistent padding: 2rem all sides
- ✅ Standard vertical rhythm with 1.5rem gaps
- ✅ `.control-group` wrapper for input sections
- ✅ Predictable spacing for all content types

### Footer Standardization

**All Card Footers** (`.card-footer`):
- ✅ Subtle top border separation
- ✅ Background panel (matches header)
- ✅ Padding: 1.5rem top, 2rem bottom/sides
- ✅ Houses primary action buttons
- ✅ Glass effect in dark mode

### Layout Improvements

**Stopwatch Card**:
- Timer container centered in body
- Hint text within body section
- Buttons isolated in footer
- Reduced top margin on timer

**History Card**:
- Stats grid in body
- Daily breakdown with 1.5rem top margin
- Consistent spacing throughout
- No footer (all content in body)

**Metronome Card**:
- BPM display in body
- `.control-group` wraps all inputs
- 1.5rem gap between controls
- Buttons in dedicated footer

**Tuner Card**:
- Tone display in body (1.5rem bottom margin)
- `.control-group` wraps inputs
- Consistent with metronome structure
- Buttons in footer

### Visual Benefits

**Before v1.4.2**:
- Inconsistent padding across cards
- Headers mixed with content
- Buttons floating in different locations
- Unpredictable spacing

**After v1.4.2**:
- ✅ Every card follows same structure
- ✅ Headers visually separated
- ✅ Content in dedicated body section
- ✅ Actions in dedicated footer
- ✅ Predictable visual rhythm
- ✅ Professional segmentation

### Design Principles

**Predictable Structure**:
```
User Expectation: "Where are the buttons?"
Answer: Always in the footer ✅

User Expectation: "Where does content start?"
Answer: Always after the header, in the body ✅
```

**Professional Segmentation**:
- Headers announce the section
- Bodies contain the working area
- Footers hold primary actions
- Borders create clear visual breaks

**Consistent Rhythm**:
- 2rem body padding (ample breathing room)
- 1.5rem vertical spacing (predictable gaps)
- 1.5rem + 2rem footer padding (balanced)
- Same structure, different content

### Technical Implementation

**HTML Changes**:
```html
<!-- Before -->
<section class="card">
  <h2>Section</h2>
  <div>Content...</div>
  <div class="controls">Buttons</div>
</section>

<!-- After -->
<section class="card">
  <h2>Section</h2>
  <div class="card-body">
    <div>Content...</div>
  </div>
  <div class="card-footer">
    <div class="controls">Buttons</div>
  </div>
</section>
```

**CSS Classes**:
- `.card` - Padding removed, overflow hidden
- `.card h2` - Header with border and accent
- `.card-body` - 2rem padding for content
- `.card-footer` - 1.5rem/2rem padding for actions
- `.control-group` - 1.5rem gap wrapper

### Mobile Responsive

All structural changes maintain mobile responsiveness:
- Cards stack vertically
- Padding scales appropriately
- Headers remain consistent
- Footers adapt to button wrapping

---

## Version 1.4.1 - Premium Button & Control Refinement (2026-08-10)

### ✨ Professional Button Design System

Elevated all interactive controls to match premium music app aesthetics.

### Button Transformations

**Primary Buttons** (Start, Metronome, Tone):
- ✅ Gradient fills (#007aff → #0051d5)
- ✅ Pill-shaped radius (20px)
- ✅ Enhanced shadows with dual layers
- ✅ Lift on hover (translateY -1px)
- ✅ Gradient shimmer overlay

**Secondary Buttons** (Pause):
- ✅ Glass morphism effect (frosted glass)
- ✅ Semi-transparent background with blur
- ✅ Subtle border with alpha channel
- ✅ Adapts to light/dark mode

**Success Buttons** (Done):
- ✅ Green gradient (#34c759 → #30b350)
- ✅ Animated checkmark appears on hover
- ✅ Lift animation on hover
- ✅ Enhanced glow shadows

**Danger Buttons** (formerly Reset):
- ✅ Minimal outline style
- ✅ Transparent with red border
- ✅ Fills red on hover (dramatic transition)
- ✅ Professional restraint

### Enhanced Form Controls

**Range Sliders**:
- ✅ Larger thumb (24px with 3px colored border)
- ✅ White thumb with primary color ring
- ✅ Smooth scale animation on hover (1.15x)
- ✅ Focus glow ring (4px blur)
- ✅ Progressive fill track (light mode)

**Number Inputs & Selects**:
- ✅ Pill-shaped borders (12px radius)
- ✅ Thicker borders (1.5px)
- ✅ Lift on focus (translateY -1px)
- ✅ Enhanced shadows (dual layer)
- ✅ Glass effect in dark mode
- ✅ Hover state transitions

### Beat Indicator Enhancements

**Container**:
- ✅ Subtle background panel
- ✅ Increased padding and height
- ✅ Glass effect in dark mode

**Beat Dots**:
- ✅ Ring glow when active (3-4px spread)
- ✅ Border transitions
- ✅ Bounce easing (cubic-bezier)
- ✅ Larger scale transforms (1.5x/1.7x)
- ✅ Enhanced shadow layers

### Timer Hint Refinement

- ✅ Contained in rounded panel
- ✅ Background with border
- ✅ Max-width constraint (320px)
- ✅ Glass effect in dark mode

### Design Principles

**Fashionable & Professional**:
```
❌ Flat, basic buttons
❌ Generic form controls
❌ Simple hover states

✅ Gradient-filled primaries
✅ Glass morphism effects
✅ Micro-interactions
✅ Multi-layer shadows
✅ Sophisticated animations
```

**Consistency with Impulse Pro Aesthetic**:
- Premium tactile feel
- Sophisticated color treatments
- Professional restraint
- Delightful micro-interactions

### Technical Details

**Button Gradients**:
```css
/* Primary */
background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);

/* Success */
background: linear-gradient(135deg, #34c759 0%, #30b350 100%);

/* Secondary Glass */
background: rgba(142, 142, 147, 0.18);
backdrop-filter: blur(10px);
```

**Multi-Layer Shadows**:
```css
/* Light mode primary */
box-shadow:
  0 2px 8px rgba(0, 122, 255, 0.25),
  0 1px 2px rgba(0, 0, 0, 0.05);

/* Hover */
box-shadow:
  0 6px 20px rgba(0, 122, 255, 0.35),
  0 2px 4px rgba(0, 0, 0, 0.08);
```

**Animations**:
- Bounce easing for beat dots
- Cubic-bezier for all transitions
- Scale + translate combinations
- Gradient shimmer overlays

### Visual Comparison

**Before v1.4.1**:
- Basic rounded buttons
- Single shadows
- Simple hover states

**After v1.4.1**:
- Gradient-filled buttons
- Glass morphism effects
- Multi-layer shadows
- Sophisticated interactions
- Professional polish

---

## Version 1.4.0 - Premium Design Enhancements (2026-08-10)

### ✨ Distinctive Design Elements

Added unique, sophisticated design touches inspired by professional music apps while maintaining original identity.

### New Visual Features

**Custom App Icon**:
- ✅ Hand-crafted SVG trombone icon with gradient
- ✅ Subtle drop shadow and hover animation
- ✅ 72×72px professional sizing
- ✅ Unique identity (not generic)

**Branded Header**:
- ✅ Icon + Title + Subtitle layout
- ✅ "Professional Practice Companion" tagline
- ✅ Refined typography hierarchy
- ✅ Premium first impression

**Circular Progress Ring** (Timer):
- ✅ Animated SVG ring around stopwatch
- ✅ Fills clockwise every 60 seconds
- ✅ Smooth stroke animation
- ✅ Glowing effect in dark mode
- ✅ Professional music app aesthetic

**Featured BPM Display**:
- ✅ Gradient-filled container (blue gradient)
- ✅ Elevated card with colored shadow
- ✅ White text on blue in light mode
- ✅ Glowing blue in dark mode
- ✅ Premium focal point

**Segmented Stats Grid**:
- ✅ Unified container (iOS segmented control style)
- ✅ Gradient border on hover
- ✅ Tighter gaps, cleaner look
- ✅ Enhanced visual cohesion

**Section Headers**:
- ✅ Uppercase micro-typography
- ✅ Accent line decoration (gradient)
- ✅ Professional music software style
- ✅ Clear visual hierarchy

### Design Principles Applied

**Unique Identity**:
- 🎺 Custom trombone icon (not emoji)
- 🎨 Branded blue gradients
- ✨ Signature visual elements
- 🎵 Music-focused details

**Professional Polish**:
- Circular progress visualization
- Gradient-enhanced components
- Micro-animations and hover states
- Premium shadows and glows

**Sophisticated UI**:
- Not generic Bootstrap/Material
- Distinctive visual language
- Cohesive design system
- Memorable brand presence

### Technical Implementation

**SVG Graphics**:
- Custom app icon with gradient
- Animated progress ring
- Scalable and crisp

**CSS Gradients**:
```css
/* BPM Container */
background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);

/* Stat Item Borders */
background: linear-gradient(135deg, primary-color, success-color);
```

**Animations**:
- Ring animates based on elapsed seconds (0-60)
- Icon hover scale with bounce easing
- Smooth gradient transitions

### What Makes It Unique

**vs Generic Apps**:
- ❌ No stock icons or emoji
- ❌ No flat, lifeless layouts
- ❌ No basic card grids
- ✅ Custom branded elements
- ✅ Thoughtful visual hierarchy
- ✅ Memorable design touches

**vs Impulse Pro** (respectful distance):
- Different icon design (trombone vs metronome)
- Different color scheme (blue vs their colors)
- Different layout structure
- Similar level of polish and sophistication

**Our Unique Position**:
- Trombone-focused branding
- Approachable yet professional
- Colorful yet refined
- Distinctive visual identity

### Files Modified

- `index.html` - App icon SVG, timer ring SVG, BPM container
- `styles.css` - Premium styling, gradients, animations
- `script.js` - Timer ring animation logic

---

## Version 1.3.1 - Automatic Dark Mode Support (2026-08-10)

### 🌓 Dark Mode Implementation

**Added automatic dark mode** that respects the user's system preference with no manual toggle required.

**How It Works**:
- Uses CSS `@media (prefers-color-scheme: dark)` to detect system preference
- Automatically switches colors, shadows, and borders
- Updates browser theme color meta tag based on mode
- Zero JavaScript - pure CSS solution

### Dark Mode Color Palette

**iOS Dark Mode Colors**:
```css
--primary-color: #0a84ff      /* Brighter blue for dark backgrounds */
--success-color: #32d74b      /* Brighter green */
--danger-color: #ff453a       /* Brighter red */
--bg-color: #000000           /* Pure black background */
--card-bg: #1c1c1e            /* Dark gray cards */
--text-color: #ffffff         /* White text */
--text-secondary: #98989d     /* Light gray secondary */
--border-color: #38383a       /* Dark borders */
```

**Enhanced Shadows**:
- Stronger opacity (0.3/0.5/0.7 vs 0.05/0.08/0.12)
- More pronounced depth in dark environments

### Component Adjustments

**Buttons**:
- ✅ Brighter shadow glows in dark mode
- ✅ Primary blue: #0a84ff (more visible on dark)
- ✅ Success green: #32d74b (brighter)

**Cards**:
- ✅ White border overlay (rgba(255,255,255,0.1))
- ✅ Stronger shadows for depth

**Inputs & Selects**:
- ✅ Dark background with light text
- ✅ Brighter focus rings
- ✅ Enhanced contrast

**Beat Indicators**:
- ✅ Stronger colored glows when active
- ✅ Better visibility on dark background

**Daily Items**:
- ✅ Subtle white border in dark mode
- ✅ Lighter hover state (white overlay)

### Meta Tags

**Dynamic Theme Color**:
```html
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
```

**Benefits**:
- iOS status bar matches app background
- System UI integrates seamlessly
- Proper contrast in both modes

### Technical Implementation

**No Toggle Required**:
- Respects OS/browser preference automatically
- Users already have dark mode settings in their OS
- Reduces UI complexity

**Performance**:
- Pure CSS solution (no JavaScript)
- Instant switching on preference change
- No flash of wrong theme

**Accessibility**:
- WCAG AA contrast maintained in both modes
- Better eye comfort in low-light environments
- Reduced eye strain during night practice

### Testing Dark Mode

**On macOS**:
- System Settings → Appearance → Dark

**On iOS**:
- Settings → Display & Brightness → Dark

**On Windows**:
- Settings → Personalization → Colors → Dark

**Browser DevTools**:
- Chrome: DevTools → Rendering → Emulate CSS media feature `prefers-color-scheme`
- Firefox: DevTools → Settings → Enable dark mode

**Instant Update**: No page refresh needed when switching modes!

---

## Version 1.3.0 - iOS-Inspired Design Refinement (2026-08-10)

### 🎨 Complete Aesthetic Overhaul

Inspired by **Impulse Pro Metronome** and modern iOS design language, this update creates a refined, professional aesthetic while maintaining approachability.

**Design Philosophy**: Find the middle ground between our original colorful gradient design and the polished minimalism of professional iOS apps.

### Visual Changes

**Color Palette**:
- ✅ iOS system colors (#007aff blue, #34c759 green, #ff3b30 red)
- ✅ Neutral light gray background (#f2f2f7) replacing purple gradient
- ✅ Professional black text on white cards
- ✅ Refined secondary text colors

**Typography**:
- ✅ Lighter font weights (300) for display numbers - elegant, refined
- ✅ Improved letter spacing (-2px on large numbers)
- ✅ Better font hierarchy (300/500/600 weight system)
- ✅ Uppercase labels with increased letter-spacing

**Cards & Shadows**:
- ✅ Subtle shadow system (0.05/0.08/0.12 opacity)
- ✅ Refined border radius (8px/12px/16px system)
- ✅ Thin 1px borders for definition
- ✅ Hover elevation effects

**Buttons**:
- ✅ Refined padding and touch targets
- ✅ Color-matched shadows (blue/green tint)
- ✅ Smooth hover overlays with pseudo-elements
- ✅ Scale-down on press (0.98x) for tactile feedback
- ✅ Cubic-bezier easing for professional motion

**Form Controls**:
- ✅ Custom range slider thumbs (20px, shadowed)
- ✅ Refined input borders and focus states
- ✅ Focus glow effects (colored shadow rings)
- ✅ Better touch targets

**Micro-interactions**:
- ✅ Beat dots with colored shadows when active
- ✅ Card hover effects
- ✅ Smooth transitions throughout
- ✅ Professional cubic-bezier easing

### Benefits

**User Experience**:
- 📱 More iOS-native feel (especially on iPhone/iPad)
- 👁️ Easier on eyes during long practice sessions
- 🎯 Better focus on content vs. decoration
- ✨ Professional, polished appearance

**Accessibility**:
- ✅ Maintained WCAG AA contrast ratios
- ✅ Larger, clearer touch targets
- ✅ Better visual hierarchy
- ✅ Improved readability

**Performance**:
- ⚡ Removed gradient rendering overhead
- ⚡ Simpler CSS = faster paint times
- ⚡ Smoother animations

### Technical Details

**Files Modified**:
- `styles.css` - ~450 lines updated
- No HTML changes
- No JavaScript changes
- 100% backward compatible

**Design System**:
```css
/* Color Tokens */
--primary-color: #007aff (iOS Blue)
--success-color: #34c759 (iOS Green)
--danger-color: #ff3b30 (iOS Red)

/* Typography Scale */
Font weights: 300, 500, 600
Letter spacing: -2px to +1px

/* Shadow Scale */
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 2px 8px rgba(0,0,0,0.08)
lg: 0 8px 24px rgba(0,0,0,0.12)

/* Radius Scale */
sm: 8px, md: 12px, lg: 16px
```

**Inspiration**: Impulse Pro Metronome aesthetic - clean, professional, musician-focused
**Position**: Middle ground - professional yet approachable

See `DESIGN_UPDATES.md` for full design rationale and comparison matrix.

---

## Version 1.2.2 - "Done" Button UX Fix (2026-08-10)

### 🐛 Bug Fix

**Fixed: "Done" Button Not Enabling While Timer Runs**
- **Problem**: After clicking "Start", the "Done" button remained disabled even though time was accumulating
- **Expected**: "Done" button should become enabled as soon as `elapsed > 0`, regardless of running/paused state
- **Root Cause**: `updateButtons()` was only called on Start/Pause/Done actions, not during the running interval
- **Solution**: Added `updateButtons()` call inside the 100ms timer interval

**Technical Details**:
```javascript
// Now updates button states every 100ms while running
this.intervalId = setInterval(() => {
    this.elapsed = (Date.now() - this.startTime) / 1000;
    this.updateDisplay();
    this.updateButtons(); // NEW: Enable "Done" as soon as elapsed > 0
    PracticeHistory.refresh();
}, 100);
```

**Benefits**:
- ✅ "Done" button becomes clickable within 100ms of starting
- ✅ Can click "Done" directly from running state (no need to pause first)
- ✅ More intuitive workflow: Start → Practice → Done (skip pause step)
- ✅ Button state always reflects actual timer state

---

## Version 1.2.1 - iOS Safe Area Support (2026-08-10)

### 📱 Mobile Improvements

**Added iOS Dynamic Island & Notch Protection**
- **Problem**: On iPhone 14 Pro and newer, content was hidden behind the Dynamic Island at page load
- **Solution**: Implemented proper safe area insets using CSS environment variables

**Technical Implementation**:
```html
<!-- viewport-fit=cover allows full-screen layout -->
<meta name="viewport" content="... viewport-fit=cover">
```

```css
/* Respects iOS safe areas (notch, Dynamic Island, home indicator) */
@supports (padding: max(0px)) {
    body {
        padding-top: max(1rem, env(safe-area-inset-top));
        padding-right: max(1rem, env(safe-area-inset-right));
        padding-bottom: max(1rem, env(safe-area-inset-bottom));
        padding-left: max(1rem, env(safe-area-inset-left));
    }
}
```

**Additional iOS Meta Tags**:
- `apple-mobile-web-app-capable` - Enables full-screen mode when added to home screen
- `apple-mobile-web-app-status-bar-style` - Black translucent status bar for immersive experience
- `theme-color` - Matches app gradient color for better integration

**Benefits**:
- ✅ Header never hidden behind Dynamic Island or notch
- ✅ Content properly inset on all iOS devices (iPhone X and newer)
- ✅ Works seamlessly on non-iOS devices (safe area = 0)
- ✅ Better experience when saved to home screen
- ✅ Proper spacing around rounded corners and home indicator

---

## Version 1.2.0 - Bug Fixes & UX Improvements (2026-08-10)

### 🐛 Bug Fixes

**Fixed: 7-Day View Corruption on Page Refresh**
- **Problem**: When refreshing the page with timer running, the 7-day history would show incorrect values
- **Root Cause**: Initialization order issue - `PracticeHistory` tried to access `Stopwatch.getCurrentElapsed()` before Stopwatch was fully initialized
- **Solution**: Added defensive check and improved session restoration logic

**Fixed: Paused Sessions Not Restored**
- **Problem**: Only running sessions were restored on page refresh; paused sessions lost their time
- **Root Cause**: Storage only saved sessions when `running === true`, discarded paused state
- **Solution**: Modified storage to save both running and paused sessions with a `running` flag

### ✨ UX Improvements

**Replaced "Reset" Button with "Done" Button**
- **Rationale**: "Reset" was confusing - users weren't sure if it saved their practice time
- **New Flow**:
  - **Start** → Begin practice session
  - **Pause** → Temporarily stop (can resume with Start)
  - **Done** → Save session to history and reset timer to 00:00:00
- **Benefits**:
  - Clear intent: "Done" means "I'm finished, save my practice"
  - Pause/Resume flow is more intuitive
  - No ambiguity about whether time is saved

**Added Helpful Hint**
- New tip under timer controls: _"Tip: Click 'Done' to save your practice session"_
- Subtle, italic styling in secondary color
- Guides users to the correct workflow

### 🔧 Technical Improvements

**Enhanced Session Storage**
```javascript
activeSession: {
  elapsed: 1234,
  timestamp: 1723301234000,
  running: true  // NEW: Track whether session was running or paused
}
```

**Improved Restoration Logic**
- Running sessions: Restore time + add elapsed time since last save, auto-resume
- Paused sessions: Restore time, stay paused
- No session: Start fresh at 00:00:00

**Button State Logic**
- **Start**: Disabled when running
- **Pause**: Disabled when not running
- **Done**: Disabled when elapsed === 0 (nothing to save)

---

## Version 1.1.0 - Enhanced Features (2026-08-10)

### 🎯 Active Timer Resilience
**Problem Solved**: Active practice time was only saved on page unload, making it vulnerable to unexpected crashes or force-closes.

**Solution Implemented**:
- **Periodic auto-save**: Active session now saves every 5 seconds while running
- **Seamless recovery**: Page refresh instantly resumes your practice session with accurate time
- **No data loss**: Even if browser crashes, you lose at most 5 seconds of practice time

**Technical Details**:
- Added `setInterval` in `Stopwatch.init()` with 5-second interval
- Calls `StorageManager.saveActiveSession()` with current elapsed time
- Session restoration on page load now uses most recent saved state

---

### 📊 Live Practice History Updates
**Problem Solved**: "Today" totals only updated after stopping the timer, making it hard to track progress during long practice sessions.

**Solution Implemented**:
- **Real-time updates**: Today's total updates every 100ms while timer runs
- **Active session included**: Running timer time is automatically added to daily/weekly totals
- **Live daily breakdown**: The 7-day list shows today's active time as it accumulates

**Technical Details**:
- Added `getCurrentElapsed()` method to `Stopwatch` module
- Modified `PracticeHistory.refresh()` to query active timer state
- Active time added to `todaySeconds` and `weekTotal` calculations
- `PracticeHistory.refresh()` now called on every stopwatch update interval

**User Benefits**:
- See your progress in real-time as you practice
- Weekly goals visible during practice, not just after
- No need to stop timer to check how much you've practiced today

---

### 🎵 Metronome Volume Control
**Problem Solved**: Metronome volume was fixed, potentially too loud or too quiet depending on practice environment.

**Solution Implemented**:
- **Volume slider**: 0-100% adjustable volume control
- **Live adjustment**: Change volume while metronome is running
- **Visual feedback**: Percentage display shows current volume level
- **Sensible default**: 70% default volume (not too loud, not too quiet)

**Technical Details**:
- Added `volume` property to `Metronome` module (default: 0.7)
- New HTML input: `<input id="metronomeVolume">` with percentage display
- Modified `scheduleNote()` to scale gain by `this.volume`
- Volume event listener updates `this.volume` in real-time

---

### 🔊 Crisp Metronome Tones
**Problem Solved**: Original sine wave tones at 440Hz/880Hz were soft and lacked percussive clarity for precise timing.

**Solution Implemented**:
- **Square wave oscillator**: Sharp-edged waveform for percussive attack
- **Higher frequencies**: 800Hz (beat) / 1200Hz (accent) for brighter sound
- **Ultra-fast attack**: 0.5ms rise time creates crisp, click-like onset
- **Quick decay**: 40ms total duration prevents muddiness

**Technical Details**:
- Changed `oscillator.type` from `'sine'` to `'square'`
- Increased frequencies: 440→800Hz, 880→1200Hz
- Attack time: 1ms → 0.5ms
- Gain curve: instant → peak (0.5ms) → decay (40ms)
- Volume-aware: accent = 50% of volume, regular = 35% of volume

**User Benefits**:
- Clearer, more professional metronome sound
- Easier to hear precise beat placement
- Less fatigue during long practice sessions
- Better cut-through when practicing with instrument

---

## Code Quality Improvements

### Better Module Coupling
- `Stopwatch` and `PracticeHistory` now communicate bidirectionally
- `Stopwatch.getCurrentElapsed()` provides clean API for active time queries
- Practice history updates automatically without tight coupling

### Performance Optimization
- `PracticeHistory.refresh()` called efficiently (only when needed)
- No performance impact from live updates (100ms interval is low overhead)
- Metronome volume calculation adds negligible CPU load

### Maintainability
- Volume control pattern consistent between Metronome and TuningTone
- Active time logic centralized in `PracticeHistory.refresh()`
- Clear separation of concerns (storage, display, timing)

---

## Files Modified

### HTML
- `index.html`: Added metronome volume slider and percentage display

### JavaScript
- `script.js`:
  - `Stopwatch` module: Added periodic save, `getCurrentElapsed()` method
  - `PracticeHistory` module: Active time integration in `refresh()`
  - `Metronome` module: Volume control, crisp tone generation

### Documentation
- `README.md`: Updated feature descriptions
- `QUICK_START.md`: Added tips about live updates and crisp tones
- `IMPLEMENTATION_SUMMARY.md`: Documented new features and technical details
- `CHANGELOG.md`: This file

---

## Upgrade Notes

### For Existing Users
- **No action required**: Changes are backward compatible
- **Active sessions**: Will automatically benefit from new 5-second save interval
- **Practice history**: Will show live updates immediately
- **Metronome**: Default volume is 70% (adjust to preference)

### For Developers
- `Stopwatch.getCurrentElapsed()` is now the public API for active time
- `PracticeHistory.refresh()` is safe to call frequently (optimized)
- Metronome volume range: 0.0-1.0 (internally), 0-100 (UI)

---

## Testing Recommendations

1. **Timer Resilience**: Start timer, refresh page multiple times, verify time continues accurately
2. **Live Updates**: Start timer, watch "Today" total increment in real-time
3. **Volume Control**: Adjust metronome volume while running, verify smooth transitions
4. **Crisp Tones**: Compare old vs new metronome sound (if you have backup)
5. **Edge Cases**: Test midnight rollover with active timer

---

## Future Enhancements Enabled

These improvements lay groundwork for:
- **Practice streaks**: Live data makes streak detection more accurate
- **Session analytics**: Real-time statistics during practice
- **Practice goals**: Visual progress bars that update live
- **Multiple metronome sounds**: Volume control infrastructure supports sound switching
- **Metronome presets**: Save BPM + volume + beats-per-measure combinations

---

**Version 1.1.0 represents a significant UX improvement while maintaining the app's lightweight, dependency-free architecture.**

