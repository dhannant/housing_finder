import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import PropertyFilters, { PropertyFilterOptions } from './PropertyFilters_Simple';

// This defines what a property object looks like
interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  lotSize: number;
  latitude: number;
  longitude: number;
}

// Main Map Screen Component
const MapScreen = () => {
  // State: Is the filter modal visible?
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  
  // State: What filters are currently active?
  const [activeFilters, setActiveFilters] = useState<PropertyFilterOptions>({});
  
  // State: List of all properties from the API
  const [properties, setProperties] = useState<Property[]>([]);
  
  // State: Is the app currently loading data?
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ----- FUNCTIONS -----

  /**
   * Fetch properties from the API based on current filters
   * This gets called when the app loads and when filters change
   */
  const fetchProperties = async (filters: PropertyFilterOptions) => {
    setIsLoading(true);  // Show loading indicator
    
    try {
      // Step 1: Convert our filters into URL parameters
      const queryParams = buildQueryParams(filters);
      
      // Step 2: Make the API request
      // IMPORTANT: Replace 'YOUR_API_ENDPOINT' with your actual API URL
      const apiUrl = `YOUR_API_ENDPOINT/properties?${queryParams}`;
      const response = await fetch(apiUrl);
      
      // Step 3: Check if the request was successful
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      // Step 4: Convert response to JSON
      const data = await response.json();
      
      // Step 5: Update our properties list
      // Assuming the API returns: { properties: [...] }
      setProperties(data.properties || []);
      
    } catch (error) {
      // If anything goes wrong, show an error message
      console.error('Error fetching properties:', error);
      Alert.alert(
        'Error',
        'Unable to load properties. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);  // Hide loading indicator
    }
  };

  /**
   * Convert our filter object into URL query parameters
   * Example: { minBedrooms: 3, maxPrice: 500000 } 
   * becomes: "min_beds=3&max_price=500000"
   */
  const buildQueryParams = (filters: PropertyFilterOptions): string => {
    const params = new URLSearchParams();

    // Add each filter to the URL if it has a value
    
    // Bedrooms
    if (filters.minBedrooms !== undefined) {
      params.append('min_beds', filters.minBedrooms.toString());
    }
    if (filters.maxBedrooms !== undefined) {
      params.append('max_beds', filters.maxBedrooms.toString());
    }
    
    // Bathrooms
    if (filters.minBathrooms !== undefined) {
      params.append('min_baths', filters.minBathrooms.toString());
    }
    if (filters.maxBathrooms !== undefined) {
      params.append('max_baths', filters.maxBathrooms.toString());
    }
    
    // Price
    if (filters.minPrice !== undefined) {
      params.append('min_price', filters.minPrice.toString());
    }
    if (filters.maxPrice !== undefined) {
      params.append('max_price', filters.maxPrice.toString());
    }
    
    // Square Footage
    if (filters.minSquareFeet !== undefined) {
      params.append('min_sqft', filters.minSquareFeet.toString());
    }
    if (filters.maxSquareFeet !== undefined) {
      params.append('max_sqft', filters.maxSquareFeet.toString());
    }
    
    // Lot Size
    if (filters.minLotSize !== undefined) {
      params.append('min_lot_size', filters.minLotSize.toString());
    }
    if (filters.maxLotSize !== undefined) {
      params.append('max_lot_size', filters.maxLotSize.toString());
    }

    // Convert to string: "min_beds=3&max_price=500000"
    return params.toString();
  };

  /**
   * When user clicks "Apply Filters" in the modal
   * Save the filters and fetch new properties
   */
  const handleApplyFilters = (filters: PropertyFilterOptions) => {
    setActiveFilters(filters);    // Save the filters
    fetchProperties(filters);     // Get new properties from API
  };

  /**
   * Count how many filters are currently active
   * Used to show the badge number on the filter button
   */
  const getActiveFilterCount = (): number => {
    let count = 0;
    
    // Loop through all filter keys
    const filterKeys = Object.keys(activeFilters) as Array<keyof PropertyFilterOptions>;
    
    filterKeys.forEach((key) => {
      const value = activeFilters[key];
      // If the filter has a value, count it
      if (value !== undefined && value !== null) {
        count++;
      }
    });
    
    return count;
  };

  /**
   * Clear all filters and show all properties
   */
  const clearAllFilters = () => {
    setActiveFilters({});         // Clear the filters
    fetchProperties({});          // Fetch all properties (no filters)
  };

  // ----- EFFECTS -----

  /**
   * When the component first loads, fetch all properties
   * The empty [] means this only runs once when the app starts
   */
  useEffect(() => {
    fetchProperties({});
  }, []);

  // ----- RENDER -----

  const activeFilterCount = getActiveFilterCount();

  return (
    <View style={styles.container}>
      
      {/* FILTER BUTTON - Floating at the top */}
      <View style={styles.filterButtonContainer}>
        
        {/* Button to open filter modal */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(true)}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          <Text style={styles.filterButtonText}>Filters</Text>
          
          {/* Badge showing number of active filters */}
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Show filter summary when filters are active */}
        {activeFilterCount > 0 && (
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              {properties.length} properties found
            </Text>
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* MAP - Shows all properties as pins */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 34.0736,      // Commerce, GA latitude
          longitude: -83.4627,    // Commerce, GA longitude
          latitudeDelta: 0.5,     // Zoom level (smaller = more zoomed in)
          longitudeDelta: 0.5,    // Zoom level (smaller = more zoomed in)
        }}
      >
        {/* Loop through each property and show a pin on the map */}
        {properties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{
              latitude: property.latitude,
              longitude: property.longitude,
            }}
            title={property.address}
            description={`$${property.price.toLocaleString()} • ${property.bedrooms} bed • ${property.bathrooms} bath`}
          />
        ))}
      </MapView>

      {/* FILTER MODAL - Pops up from bottom when user clicks filter button */}
      <PropertyFilters
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </View>
  );
};

// ----- STYLES -----

const styles = StyleSheet.create({
  // Main container - fills the whole screen
  container: {
    flex: 1,
  },
  
  // Container for filter button (positioned at top)
  filterButtonContainer: {
    position: 'absolute',      // Float on top of map
    top: 60,                   // Distance from top
    left: 20,                  // Distance from left
    right: 20,                 // Distance from right
    zIndex: 1,                 // Show above map
  },
  
  // The filter button itself
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Shadow for Android
    elevation: 5,
  },
  
  // Gear emoji in filter button
  filterIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  
  // "Filters" text in button
  filterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  // Blue circle with number showing active filters
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  
  // Number inside the badge
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Gray box showing result count and clear option
  filterSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  
  // Text showing number of results
  filterSummaryText: {
    fontSize: 14,
    color: '#333',
  },
  
  // "Clear all" text button
  clearFiltersText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // The map itself - fills remaining space
  map: {
    flex: 1,
  },
});

export default MapScreen;
