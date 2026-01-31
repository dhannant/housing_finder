# Beginner's Guide to Property Filters

## What You've Got

You now have two main files that work together:

1. **PropertyFilters_Simple.tsx** - The filter popup modal
2. **MapScreen_Simple.tsx** - Your map screen that uses the filters

## How It Works (Simple Explanation)

Think of it like a restaurant menu:
- The **Map Screen** is like the dining room where you see all the food (properties)
- The **Filter Modal** is like telling the waiter what you want (filters)
- When you click "Apply Filters", the kitchen (your API) gets only what you asked for

## Step-by-Step: What Happens When You Filter

1. User clicks the "Filters" button
2. Filter modal slides up from bottom
3. User enters what they want (3+ bedrooms, under $500k, etc.)
4. User clicks "Apply Filters"
5. Your app sends these filters to your API
6. API sends back only matching properties
7. Map shows just those properties as pins

## Understanding the Code Structure

### PropertyFilters_Simple.tsx

```typescript
// At the top - what data looks like
interface PropertyFilterOptions {
  minBedrooms?: number;  // The ? means optional
  maxBedrooms?: number;
  // ... more filters
}

// The main component
const PropertyFilters = ({ visible, onClose, onApply }) => {
  // Store filter values here
  const [filters, setFilters] = useState({});
  
  // When user types in an input
  const updateFilter = (name, value) => {
    // Update just that one filter
  }
  
  // When user clicks Apply
  const handleApply = () => {
    onApply(filters);  // Send filters to parent
    onClose();         // Close the modal
  }
  
  // The UI (what user sees)
  return (
    <Modal>
      {/* Input fields for each filter */}
      <TextInput ... />
      <TouchableOpacity onPress={handleApply}>
        Apply Filters
      </TouchableOpacity>
    </Modal>
  );
}
```

### MapScreen_Simple.tsx

```typescript
const MapScreen = () => {
  // Keep track of current filters
  const [activeFilters, setActiveFilters] = useState({});
  
  // Keep track of properties to show
  const [properties, setProperties] = useState([]);
  
  // Get properties from API
  const fetchProperties = async (filters) => {
    // 1. Turn filters into URL: "min_beds=3&max_price=500000"
    const queryParams = buildQueryParams(filters);
    
    // 2. Call your API
    const response = await fetch(`YOUR_API/properties?${queryParams}`);
    
    // 3. Get the data
    const data = await response.json();
    
    // 4. Update the map
    setProperties(data.properties);
  }
  
  // When user applies filters
  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);    // Remember them
    fetchProperties(filters);     // Get new data
  }
  
  return (
    <View>
      {/* Filter button */}
      <TouchableOpacity onPress={() => setFilterVisible(true)}>
        Filters
      </TouchableOpacity>
      
      {/* Map with pins */}
      <MapView>
        {properties.map(property => (
          <Marker ... />
        ))}
      </MapView>
      
      {/* Filter modal */}
      <PropertyFilters
        onApply={handleApplyFilters}
      />
    </View>
  );
}
```

## What You Need to Change

### 1. Your API Endpoint

Find this line in **MapScreen_Simple.tsx**:
```typescript
const apiUrl = `YOUR_API_ENDPOINT/properties?${queryParams}`;
```

Change `YOUR_API_ENDPOINT` to your actual API URL, like:
```typescript
const apiUrl = `https://api.yoursite.com/properties?${queryParams}`;
```

### 2. API Parameter Names

Your API might use different names for filters. Check your API documentation.

For example, if your API uses `minBedrooms` instead of `min_beds`, change this:

**Current:**
```typescript
params.append('min_beds', filters.minBedrooms.toString());
```

**Change to:**
```typescript
params.append('minBedrooms', filters.minBedrooms.toString());
```

### 3. API Response Format

The code expects your API to return data like this:
```json
{
  "properties": [
    {
      "id": "123",
      "address": "123 Main St",
      "price": 350000,
      "bedrooms": 3,
      "bathrooms": 2,
      "squareFeet": 1800,
      "lotSize": 0.25,
      "latitude": 34.0736,
      "longitude": -83.4627
    }
  ]
}
```

If your API returns something different, adjust this line:
```typescript
setProperties(data.properties || []);
```

## How to Test

### Test 1: Does the filter button work?
1. Run your app
2. Look for the "Filters" button at the top
3. Click it
4. Filter modal should slide up from bottom
5. Click the X - it should close

### Test 2: Do the inputs work?
1. Open filters
2. Type "3" in Min Bedrooms
3. Type "500000" in Max Price
4. Click "Reset All" - inputs should clear
5. Type values again
6. Click "Apply Filters" - modal should close

### Test 3: Does it call your API?
1. Open browser developer tools / React Native debugger
2. Apply filters
3. Look for network request to your API
4. Check if the URL has the right parameters

## Common Mistakes (and How to Fix Them)

### Mistake 1: API not being called
**Problem:** You click Apply but nothing happens

**Check:**
- Is `YOUR_API_ENDPOINT` set correctly?
- Open network tab in debugger - do you see the request?
- Look for error messages in console

### Mistake 2: Filters not showing on map
**Problem:** Filters apply but map still shows all properties

**Check:**
- Does your API actually filter the results?
- Test your API directly in a browser or Postman
- Check if parameter names match what your API expects

### Mistake 3: TypeScript errors
**Problem:** Red squiggly lines under code

**Common fixes:**
```typescript
// If you see: "Property 'properties' does not exist"
// Your API might return different structure
// Add console.log to see what you actually get:
const data = await response.json();
console.log('API Response:', data);

// Then adjust accordingly
setProperties(data.results || []);  // if API uses 'results'
setProperties(data || []);          // if API returns array directly
```

### Mistake 4: Empty results
**Problem:** No properties show up after filtering

**Check:**
- Open filter modal again - are your filters still there?
- Are the filters too restrictive? (Try just one filter at a time)
- Check API response in network tab - is it returning empty array?

## Understanding TypeScript in This Code

### The `?` symbol (optional)
```typescript
minBedrooms?: number;
// means: minBedrooms can be a number OR undefined
// You don't HAVE to provide it
```

### The `interface` keyword
```typescript
interface Property {
  id: string;
  price: number;
}
// This is like a blueprint saying "a Property must have an id (string) and price (number)"
```

### Type annotations (the `: type` after variables)
```typescript
const [isLoading, setIsLoading] = useState<boolean>(false);
//                                         ^^^^^^^
//                                    This means: only true/false allowed

const count: number = 5;
//          ^^^^^^
//     This means: count must be a number
```

### What `void` means
```typescript
onClose: () => void
// This means: a function that doesn't return anything
// It does something (like close a modal) but doesn't give you back a value
```

## Next Steps

1. **Replace the API endpoint** with your real API URL
2. **Test with just one filter** (like bedrooms) to make sure it works
3. **Check your API parameter names** and update if needed
4. **Test each filter one by one** to ensure they all work
5. **Add error handling** if something goes wrong

## Want to Add More Features?

### Add a loading spinner
```typescript
{isLoading && (
  <ActivityIndicator size="large" color="#007AFF" />
)}
```

### Add property type filter (Single Family, Condo, etc.)
Look at the complex version for examples - I removed it to keep things simple, but you can add it back!

### Save filters between sessions
Use AsyncStorage to remember user's last filters:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save filters
await AsyncStorage.setItem('filters', JSON.stringify(filters));

// Load filters
const saved = await AsyncStorage.getItem('filters');
const filters = saved ? JSON.parse(saved) : {};
```

## Need Help?

If you're stuck:
1. Read the error message carefully
2. Add `console.log()` to see what's happening
3. Test your API directly (not through the app) to make sure it works
4. Start simple - get one filter working first, then add more

Good luck! 🚀
