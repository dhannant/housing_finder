# 🚀 Quick Start - Property Filter Setup

## What You Have (5 Files Total)

### 📝 Files You'll Use in Your App:
1. **PropertyFilters_WithSliders.tsx** - The filter modal component
2. **MapScreen_Simple.tsx** - Your map screen with filter integration

### 📚 Reference Guides:
3. **SLIDER_INSTALLATION_GUIDE.md** - Installation steps
4. **BEGINNERS_GUIDE.md** - How everything works
5. **FILES_OVERVIEW.md** - This overview (updated)

---

## ⚡ 3-Step Setup

### Step 1: Install the Slider Package
```bash
npm install @react-native-community/slider
```

### Step 2: Add Files to Your Project
Copy these files into your project:
- `PropertyFilters_WithSliders.tsx` → Put in your `components/` folder
- `MapScreen_Simple.tsx` → Rename to `MapScreen.tsx` and put in your `screens/` folder

### Step 3: Update Your API Endpoint
Open `MapScreen_Simple.tsx` and find line ~50:
```typescript
const apiUrl = `YOUR_API_ENDPOINT/properties?${queryParams}`;
```

Change to your actual API:
```typescript
const apiUrl = `https://api.yoursite.com/properties?${queryParams}`;
```

**That's it!** 🎉

---

## 🔧 What You Need to Customize

### 1. API Endpoint (Required)
**File:** `MapScreen_Simple.tsx`
**Line:** ~50
**Change:** `YOUR_API_ENDPOINT` to your actual API URL

### 2. API Parameter Names (If Needed)
**File:** `MapScreen_Simple.tsx`
**Function:** `buildQueryParams` (starts around line 65)

Your API might use different parameter names. For example:

**If your API uses `minBedrooms` instead of `min_beds`:**
```typescript
// Change this:
params.append('min_beds', filters.minBedrooms.toString());

// To this:
params.append('minBedrooms', filters.minBedrooms.toString());
```

### 3. API Response Format (If Needed)
**File:** `MapScreen_Simple.tsx`
**Line:** ~95

If your API returns data differently, adjust this:
```typescript
// Current (expects: { properties: [...] })
setProperties(data.properties || []);

// If API returns array directly:
setProperties(data || []);

// If API uses different key:
setProperties(data.results || []);
```

### 4. Map Initial Location (Optional)
**File:** `MapScreen_Simple.tsx`
**Line:** ~160

Currently set to Commerce, GA:
```typescript
initialRegion={{
  latitude: 34.0736,      // Change to your location
  longitude: -83.4627,    // Change to your location
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
}}
```

### 5. Slider Ranges (Optional)
**File:** `PropertyFilters_WithSliders.tsx`

**Price Range** (line ~200):
```typescript
maximumValue={2000000}  // Change to increase max price
step={25000}            // Change increment size
```

**Square Footage** (line ~260):
```typescript
maximumValue={10000}    // Change to increase max sqft
step={100}              // Change increment size
```

**Lot Size** (line ~320):
```typescript
maximumValue={10}       // Change to increase max acres
step={0.25}             // Change increment size
```

---

## 📱 File Structure in Your Project

```
your-app/
├── components/
│   └── PropertyFilters_WithSliders.tsx  ← Put here
│
├── screens/
│   └── MapScreen.tsx                    ← Rename MapScreen_Simple.tsx
│
└── package.json
```

---

## ✅ Testing Checklist

### Basic Functionality:
- [ ] App runs without errors
- [ ] Filter button appears on map
- [ ] Clicking filter button opens modal
- [ ] Can close modal with X button
- [ ] Sliders move smoothly
- [ ] Can type in number inputs
- [ ] "Reset All" clears all filters
- [ ] "Apply Filters" closes modal

### API Integration:
- [ ] Check browser console/debugger for API call
- [ ] Verify URL has correct parameters
- [ ] Properties appear as pins on map
- [ ] Filtering shows fewer properties
- [ ] Badge shows correct number of active filters

---

## 🐛 Common Issues & Fixes

### Issue: Slider package not found
**Fix:** Run `npm install @react-native-community/slider`

### Issue: TypeScript errors about types
**Fix:** Make sure you have `@types/react-native` installed:
```bash
npm install --save-dev @types/react-native
```

### Issue: No properties showing on map
**Fix:** 
1. Check API URL is correct
2. Check API is returning data (use console.log)
3. Verify latitude/longitude fields exist in API response

### Issue: Filters not working
**Fix:**
1. Check parameter names match your API
2. Open network tab in debugger
3. Look at the actual API request being made
4. Test API directly in browser/Postman

---

## 📖 Next Steps

1. **Get it working first** - Don't customize until basic setup works
2. **Test with one filter** - Start simple (just bedrooms)
3. **Add more filters gradually** - Don't rush
4. **Read the guides** if you get stuck:
   - SLIDER_INSTALLATION_GUIDE.md - More details on sliders
   - BEGINNERS_GUIDE.md - Understanding the code

---

## 🎯 What These Files Do

### PropertyFilters_WithSliders.tsx
- Creates the filter modal that slides up from bottom
- Has inputs for bedrooms, bathrooms
- Has sliders for price, square feet, lot size
- Entry-level code with tons of comments
- Uses TypeScript for safety

### MapScreen_Simple.tsx
- Shows a map with property pins
- Has filter button at top
- Calls your API with filter parameters
- Updates map when filters change
- Entry-level code with tons of comments
- Uses TypeScript for safety

---

## 🆘 Need Help?

1. **Read error messages carefully** - They usually tell you what's wrong
2. **Use console.log** - Add them everywhere to see what's happening
3. **Check one thing at a time** - Don't change multiple things at once
4. **Test your API separately** - Make sure it works outside the app first

Good luck! 🎉
