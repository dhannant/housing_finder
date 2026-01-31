# Property Filters with Range Sliders - Installation Guide

## What's New

This version includes **range sliders** for:
- **Price Range** (0 to $2,000,000 in $25k increments)
- **Square Footage** (0 to 10,000 sqft in 100 sqft increments)
- **Lot Size** (0 to 10 acres in 0.25 acre increments)

Each slider has a **number input** next to it so users can either:
1. **Drag the slider** for quick approximate values
2. **Type exact numbers** for precision

## Installation Steps

### Step 1: Install the Slider Package

In your project directory, run:

```bash
npm install @react-native-community/slider
```

Or if you use yarn:

```bash
yarn add @react-native-community/slider
```

### Step 2: Link the Package (if needed)

For React Native 0.60+, it should auto-link. If not:

```bash
npx react-native link @react-native-community/slider
```

### Step 3: iOS Setup (if on iOS)

```bash
cd ios && pod install && cd ..
```

### Step 4: Replace Your Filter File

Replace your `PropertyFilters_Simple.tsx` with `PropertyFilters_WithSliders.tsx`

Or rename it:
```bash
mv PropertyFilters_WithSliders.tsx PropertyFilters.tsx
```

## How It Works

### User Experience

**For Price:**
1. User sees current range at the top: "Any to Any" or "$200,000 to $500,000"
2. User can drag "Minimum Price" slider to set lower bound
3. OR user can type exact number in the input field below slider
4. Same for "Maximum Price" slider

**For Square Footage:**
- Works exactly like price
- Shows values like "1,500 sqft to 3,000 sqft"
- Slider steps by 100 sqft increments

**For Lot Size:**
- Works exactly like price
- Shows values like "0.5 acres to 2 acres"
- Slider steps by 0.25 acre increments

### Code Example

```typescript
// Minimum Price Slider
<Slider
  minimumValue={0}           // Start at $0
  maximumValue={2000000}     // Go up to $2M
  step={25000}               // Move in $25k increments
  value={filters.minPrice || 0}
  onValueChange={(value) => updateFilter('minPrice', value)}
/>

// Number input below slider
<TextInput
  keyboardType="numeric"
  value={filters.minPrice?.toString() || ''}
  onChangeText={(text) => {
    const value = text ? parseInt(text) : undefined;
    updateFilter('minPrice', value);
  }}
/>
```

## Customization Options

### Adjust Price Range

To change the maximum price (currently $2M):

```typescript
// Find these lines and change maximumValue
<Slider
  minimumValue={0}
  maximumValue={2000000}     // Change this to 5000000 for $5M
  step={25000}
  ...
/>
```

### Adjust Price Increment

To change how much the slider moves each step (currently $25k):

```typescript
<Slider
  minimumValue={0}
  maximumValue={2000000}
  step={25000}               // Change to 10000 for $10k steps
  ...                        // or 50000 for $50k steps
/>
```

### Adjust Square Footage Range

Currently goes to 10,000 sqft. To increase:

```typescript
<Slider
  minimumValue={0}
  maximumValue={10000}       // Change to 20000 for 20k sqft max
  step={100}
  ...
/>
```

### Adjust Lot Size Range

Currently goes to 10 acres. To increase:

```typescript
<Slider
  minimumValue={0}
  maximumValue={10}          // Change to 50 for 50 acres max
  step={0.25}
  ...
/>
```

## Filter Structure Comparison

### Bedrooms & Bathrooms
- Still use **simple number inputs** (no sliders)
- Best for small ranges (0-10)

### Price, Square Footage, Lot Size
- Now use **sliders + number inputs**
- Better for large ranges
- More intuitive for users

## Visual Layout

```
┌─────────────────────────────────────┐
│  Price Range                        │
│  ┌─────────────────────────────┐   │
│  │  $200,000  to  $500,000     │   │
│  └─────────────────────────────┘   │
│                                     │
│  Minimum Price                      │
│  ━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━   │
│  ┌─────────────────────────────┐   │
│  │  200000                      │   │ <- Can type here
│  └─────────────────────────────┘   │
│                                     │
│  Maximum Price                      │
│  ━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━   │
│  ┌─────────────────────────────┐   │
│  │  500000                      │   │ <- Can type here
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Slider Colors

The sliders use iOS blue by default:
- Active track: `#007AFF` (blue)
- Inactive track: `#D1D1D6` (gray)
- Thumb: `#007AFF` (blue)

To change colors:

```typescript
<Slider
  minimumTrackTintColor="#FF6B6B"  // Change to red
  maximumTrackTintColor="#E0E0E0"  // Change to light gray
  thumbTintColor="#FF6B6B"         // Change thumb to red
/>
```

## Best Practices

### 1. Sync Slider and Input
Both the slider and input update the same filter value, so they stay in sync automatically.

### 2. Validation
You might want to add validation to prevent min > max:

```typescript
const updateFilter = (filterName: keyof PropertyFilterOptions, value: any) => {
  // If updating minPrice, make sure it's not greater than maxPrice
  if (filterName === 'minPrice' && filters.maxPrice && value > filters.maxPrice) {
    Alert.alert('Invalid Range', 'Minimum price cannot be greater than maximum price');
    return;
  }
  
  setFilters((currentFilters) => ({
    ...currentFilters,
    [filterName]: value,
  }));
};
```

### 3. Format Display Values
The component includes helper functions to format values nicely:

```typescript
formatPrice(350000)        // Returns "$350,000"
formatSquareFeet(1500)     // Returns "1,500 sqft"
```

## Troubleshooting

### Slider not showing up?

1. Make sure you installed the package: `npm install @react-native-community/slider`
2. Rebuild your app: `npx react-native run-ios` or `npx react-native run-android`
3. Clear cache: `npx react-native start --reset-cache`

### Slider not moving smoothly?

Check the `step` value - smaller steps = smoother movement:
```typescript
step={1000}    // Moves in $1k increments (smoother)
step={25000}   // Moves in $25k increments (chunkier)
```

### Can't type decimals in lot size?

Make sure you're using `parseFloat` not `parseInt`:
```typescript
const value = text ? parseFloat(text) : undefined;  // ✓ Correct
const value = text ? parseInt(text) : undefined;    // ✗ Wrong for decimals
```

### Values resetting when I type?

Make sure the input value uses optional chaining:
```typescript
value={filters.minPrice?.toString() || ''}  // ✓ Correct
value={filters.minPrice.toString()}         // ✗ Will crash if undefined
```

## Next Steps

1. **Install the slider package** using npm or yarn
2. **Replace your filter file** with this new version
3. **Test the sliders** - they should work immediately
4. **Customize ranges** if needed for your market
5. **Add validation** if you want to prevent min > max

## Optional Enhancements

### Add Preset Buttons

Add quick preset buttons above sliders:

```typescript
<View style={styles.presetContainer}>
  <TouchableOpacity onPress={() => {
    updateFilter('minPrice', 0);
    updateFilter('maxPrice', 250000);
  }}>
    <Text>Under $250k</Text>
  </TouchableOpacity>
  
  <TouchableOpacity onPress={() => {
    updateFilter('minPrice', 250000);
    updateFilter('maxPrice', 500000);
  }}>
    <Text>$250k - $500k</Text>
  </TouchableOpacity>
</View>
```

### Add Live Preview Count

Show how many properties match as user adjusts sliders:

```typescript
<Text>
  {matchingPropertiesCount} properties match your filters
</Text>
```

### Add Haptic Feedback

Make slider feel more tactile:

```typescript
import { Haptics } from 'expo-haptics';

<Slider
  onValueChange={(value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateFilter('minPrice', value);
  }}
/>
```

Enjoy your new slider filters! 🎚️
