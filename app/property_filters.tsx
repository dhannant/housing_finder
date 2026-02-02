import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';

// This defines what our filter options look like
// The ? means "optional" - you don't have to include every filter
interface PropertyFilterOptions {
  minBedrooms?: number;        // Minimum number of bedrooms
  maxBedrooms?: number;        // Maximum number of bedrooms
  minBathrooms?: number;       // Minimum number of bathrooms
  maxBathrooms?: number;       // Maximum number of bathrooms
  minPrice?: number;           // Minimum price in dollars
  maxPrice?: number;           // Maximum price in dollars
  minSquareFeet?: number;      // Minimum square footage
  maxSquareFeet?: number;      // Maximum square footage
  minLotSize?: number;         // Minimum lot size (in acres)
  maxLotSize?: number;         // Maximum lot size (in acres)
}

// This defines what props our component needs
interface PropertyFiltersProps {
  visible: boolean;                                    // Is the filter modal open?
  onClose: () => void;                                 // Function to close the modal
  onApply: (filters: PropertyFilterOptions) => void;   // Function to apply filters
  initialFilters?: PropertyFilterOptions;              // Starting filter values (optional)
}

// Main component for the property filters
const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},  // Default to empty object if none provided
}) => {
  // This holds all our current filter values
  // useState is a React hook that lets us store and update data
  const [filters, setFilters] = useState<PropertyFilterOptions>(initialFilters);

  // Warning state for min/max validation...
  const [minMaxWarning, setMinMaxWarning] = useState<{ name: string; message: string }>({ name: '', message: '' });

  // Helper function to update a single filter value with validation rules
  const updateFilter = (filterName: keyof PropertyFilterOptions, value: any) => {
    setFilters((currentFilters) => {
      let newFilters = Object.assign({}, currentFilters);  // Create a copy of current filters
      // Price validation
      if (filterName === 'minPrice') {
        if (currentFilters.maxPrice !== undefined && value > currentFilters.maxPrice) {
          setMinMaxWarning({ name: 'minPrice', message: 'Minimum price cannot be above maximum price' });
          return currentFilters;
        } else {
          setMinMaxWarning({ name: '', message: '' });
          newFilters.minPrice = value;
        }
      } else if (filterName === 'maxPrice') {
        if (currentFilters.minPrice !== undefined && value < currentFilters.minPrice) {
          setMinMaxWarning({ name: 'maxPrice', message: 'Maximum price cannot be below minimum price' });
          return currentFilters;
        } else {
          setMinMaxWarning({ name: '', message: '' });
          newFilters.maxPrice = value;
        }
      }
      // Square Feet validation
      else if (filterName === 'minSquareFeet') {
        if (currentFilters.maxSquareFeet !== undefined && value > currentFilters.maxSquareFeet) {
          setMinMaxWarning({ name: 'minSquareFeet', message: 'Minimum square feet cannot be above maximum square feet' });
          return currentFilters;
        } else {
          setMinMaxWarning({ name: '', message: '' });
          newFilters.minSquareFeet = value;
        }
      } else if (filterName === 'maxSquareFeet') {
        if (currentFilters.minSquareFeet !== undefined && value < currentFilters.minSquareFeet) {
          setMinMaxWarning({ name: 'maxSquareFeet', message: 'Maximum square feet cannot be below minimum square feet' });
          return currentFilters;
        } else {
          setMinMaxWarning({ name: '', message: '' });
          newFilters.maxSquareFeet = value;
        }
      }
      // Lot Size validation
      else if (filterName === 'minLotSize') {
        if (currentFilters.maxLotSize !== undefined && value > currentFilters.maxLotSize) {
          setMinMaxWarning({ name: 'minLotSize', message: 'Minimum lot size cannot be above maximum lot size' });
          return currentFilters;
        } else {
          setMinMaxWarning({ name: '', message: '' });
          newFilters.minLotSize = value;
        }
      } else if (filterName === 'maxLotSize') {
        if (currentFilters.minLotSize !== undefined && value < currentFilters.minLotSize) {
          setMinMaxWarning({ name: 'maxLotSize', message: 'Maximum lot size cannot be below minimum lot size' });
          return currentFilters;
        } else {
          setMinMaxWarning({ name: '', message: '' });
          newFilters.maxLotSize = value;
        }
      } else if (filterName === 'minBedrooms') {
        newFilters.minBedrooms = value;
      } else if (filterName === 'maxBedrooms') {
        newFilters.maxBedrooms = value;
      } else if (filterName === 'minBathrooms') {
        newFilters.minBathrooms = value;
      } else if (filterName === 'maxBathrooms') {
        newFilters.maxBathrooms = value;
      }
      return newFilters;
    });
  };

  // When user clicks "Apply Filters" button
  const handleApply = () => {
    onApply(filters);  // Send filters back to parent component
    onClose();         // Close the modal
  };

  // When user clicks "Reset All" button
  const handleReset = () => {
    setFilters({});  // Clear all filters (empty object)
  };

  // Helper function to format price for display (adds commas and dollar sign)
  const formatPrice = (price: number): string => {
    return `$${price.toLocaleString()}`;
  };

  // Helper function to format square feet for display (adds commas)
  const formatSquareFeet = (sqft: number): string => {
    return `${sqft.toLocaleString()} sqft`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Dark overlay behind the modal */}
      <View style={styles.modalContainer}>
        
        {/* White box with all the filters */}
        <View style={styles.modalContent}>
          
          {/* Header with title and close button */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filter Properties</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable area with all filter options */}
          <ScrollView style={styles.scrollView}>
            
            {/* BEDROOMS FILTER - Simple number inputs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bedrooms</Text>
              <View style={styles.rangeContainer}>
                
                {/* Minimum bedrooms input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Min</Text>
                  <Picker selectedValue={filters.minBedrooms}
                    style={styles.input}
                    onValueChange={value => updateFilter('minBedrooms', value)}>
                    <Picker.Item label="Any" value={undefined} />
                    <Picker.Item label="1" value={1} />
                    <Picker.Item label="2" value={2} />
                    <Picker.Item label="3" value={3} />
                    <Picker.Item label="4" value={4} />
                    <Picker.Item label="5" value={5} />
                  </Picker>
                  {/* <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={filters.minBedrooms?.toString() || ''}
                    onChangeText={(text) => {
                      // Convert text to number, or undefined if empty
                      const value = text ? parseInt(text) : undefined;
                      updateFilter('minBedrooms', value);
                    }}
                    placeholder="0"
                  /> */}
                </View>

                <Text style={styles.rangeSeparator}>to</Text>

                {/* Maximum bedrooms input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Max</Text>
                  <Picker selectedValue={filters.maxBedrooms}
                    style={styles.input}
                    onValueChange={value => updateFilter('maxBedrooms', value)}>
                    <Picker.Item label="Any" value={undefined} />
                    <Picker.Item label="1" value={1} />
                    <Picker.Item label="2" value={2} />
                    <Picker.Item label="3" value={3} />
                    <Picker.Item label="4" value={4} />
                    <Picker.Item label="5+" value={5} />
                  </Picker>
                  {/* <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={filters.maxBedrooms?.toString() || ''}
                    onChangeText={(text) => {
                      const value = text ? parseInt(text) : undefined;
                      updateFilter('maxBedrooms', value);
                    }}
                    placeholder="Any"
                  /> */}
                </View>
              </View>
            </View>

            {/* BATHROOMS FILTER - Simple number inputs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bathrooms</Text>
              <View style={styles.rangeContainer}>
                
                {/* Minimum bathrooms input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Min</Text>

                  {/* <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={filters.minBathrooms?.toString() || ''}
                    onChangeText={(text) => {
                      // parseFloat allows decimals like 1.5, 2.5
                      const value = text ? parseFloat(text) : undefined;
                      updateFilter('minBathrooms', value);
                    }}
                    placeholder="0"
                  /> */}
                </View>

                <Text style={styles.rangeSeparator}>to</Text>

                {/* Maximum bathrooms input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Max</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={filters.maxBathrooms?.toString() || ''}
                    onChangeText={(text) => {
                      const value = text ? parseFloat(text) : undefined;
                      updateFilter('maxBathrooms', value);
                    }}
                    placeholder="Any"
                  />
                </View>
              </View>
            </View>

            {/* PRICE RANGE FILTER - Slider + Number Inputs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              
              {/* Display current price range */}
              <View style={styles.sliderValueContainer}>
                <Text style={styles.sliderValueText}>
                  {filters.minPrice ? formatPrice(filters.minPrice) : 'Any'}
                </Text>
                <Text style={styles.sliderValueSeparator}>to</Text>
                <Text style={styles.sliderValueText}>
                  {filters.maxPrice ? formatPrice(filters.maxPrice) : 'Any'}
                </Text>
              </View>

              {/* Minimum Price Slider */}
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabel}>Minimum Price</Text>
                {minMaxWarning.name === 'minPrice' && minMaxWarning.message ? (
                  <View style={{ backgroundColor: '#FFF9C4', padding: 8, borderRadius: 4, marginBottom: 4 }}>
                    <Text style={{ color: '#B8860B' }}>{minMaxWarning.message}</Text>
                  </View>
                ) : null}
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={2000000}
                  step={25000}
                  value={filters.minPrice || 0}
                  onValueChange={(value) => updateFilter('minPrice', value)}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#D1D1D6"
                  thumbTintColor="#007AFF"
                />
                {/* Number input for exact value */}
                <TextInput
                  style={styles.sliderInput}
                  keyboardType="numeric"
                  value={filters.minPrice?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text ? parseInt(text) : undefined;
                    updateFilter('minPrice', value);
                  }}
                  placeholder="$0"
                />
              </View>

              {/* Maximum Price Slider */}
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabel}>Maximum Price</Text>
                {minMaxWarning.name === 'maxPrice' && minMaxWarning.message ? (
                  <View style={{ backgroundColor: '#FFF9C4', padding: 8, borderRadius: 4, marginBottom: 4 }}>
                    <Text style={{ color: '#B8860B' }}>{minMaxWarning.message}</Text>
                  </View>
                ) : null}
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={2000000}
                  step={25000}
                  value={filters.maxPrice || 2000000}
                  onValueChange={(value) => updateFilter('maxPrice', value)}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#D1D1D6"
                  thumbTintColor="#007AFF"
                />
                {/* Number input for exact value */}
                <TextInput
                  style={styles.sliderInput}
                  keyboardType="numeric"
                  value={filters.maxPrice?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text ? parseInt(text) : undefined;
                    updateFilter('maxPrice', value);
                  }}
                  placeholder="$2,000,000"
                />
              </View>
            </View>

            {/* SQUARE FOOTAGE FILTER - Slider + Number Inputs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Square Footage</Text>
              
              {/* Display current sqft range */}
              <View style={styles.sliderValueContainer}>
                <Text style={styles.sliderValueText}>
                  {filters.minSquareFeet ? formatSquareFeet(filters.minSquareFeet) : 'Any'}
                </Text>
                <Text style={styles.sliderValueSeparator}>to</Text>
                <Text style={styles.sliderValueText}>
                  {filters.maxSquareFeet ? formatSquareFeet(filters.maxSquareFeet) : 'Any'}
                </Text>
              </View>

              {/* Minimum Square Feet Slider */}
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabel}>Minimum Square Feet</Text>
                {minMaxWarning.name === 'minSquareFeet' && minMaxWarning.message ? (
                  <View style={{ backgroundColor: '#FFF9C4', padding: 8, borderRadius: 4, marginBottom: 4 }}>
                    <Text style={{ color: '#B8860B' }}>{minMaxWarning.message}</Text>
                  </View>
                ) : null}
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10000}
                  step={250}
                  value={filters.minSquareFeet || 0}
                  onValueChange={(value) => updateFilter('minSquareFeet', value)}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#D1D1D6"
                  thumbTintColor="#007AFF"
                />
                {/* Number input for exact value */}
                <TextInput
                  style={styles.sliderInput}
                  keyboardType="numeric"
                  value={filters.minSquareFeet?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text ? parseInt(text) : undefined;
                    updateFilter('minSquareFeet', value);
                  }}
                  placeholder="0 sqft"
                />
              </View>

              {/* Maximum Square Feet Slider */}
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabel}>Maximum Square Feet</Text>
                {minMaxWarning.name === 'maxSquareFeet' && minMaxWarning.message ? (
                  <View style={{ backgroundColor: '#FFF9C4', padding: 8, borderRadius: 4, marginBottom: 4 }}>
                    <Text style={{ color: '#B8860B' }}>{minMaxWarning.message}</Text>
                  </View>
                ) : null}
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10000}
                  step={250}
                  value={filters.maxSquareFeet || 10000}
                  onValueChange={(value) => updateFilter('maxSquareFeet', value)}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#D1D1D6"
                  thumbTintColor="#007AFF"
                />
                {/* Number input for exact value */}
                <TextInput
                  style={styles.sliderInput}
                  keyboardType="numeric"
                  value={filters.maxSquareFeet?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text ? parseInt(text) : undefined;
                    updateFilter('maxSquareFeet', value);
                  }}
                  placeholder="10,000 sqft"
                />
              </View>
            </View>

            {/* LOT SIZE FILTER - Slider + Number Inputs (in acres) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lot Size (acres)</Text>
              
              {/* Display current lot size range */}
              <View style={styles.sliderValueContainer}>
                <Text style={styles.sliderValueText}>
                  {filters.minLotSize ? `${filters.minLotSize} acres` : 'Any'}
                </Text>
                <Text style={styles.sliderValueSeparator}>to</Text>
                <Text style={styles.sliderValueText}>
                  {filters.maxLotSize ? `${filters.maxLotSize} acres` : 'Any'}
                </Text>
              </View>

              {/* Minimum Lot Size Slider */}
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabel}>Minimum Lot Size</Text>
                {minMaxWarning.name === 'minLotSize' && minMaxWarning.message ? (
                  <View style={{ backgroundColor: '#FFF9C4', padding: 8, borderRadius: 4, marginBottom: 4 }}>
                    <Text style={{ color: '#B8860B' }}>{minMaxWarning.message}</Text>
                  </View>
                ) : null}
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={0.25}
                  value={filters.minLotSize || 0}
                  onValueChange={(value) => updateFilter('minLotSize', value)}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#D1D1D6"
                  thumbTintColor="#007AFF"
                />
                {/* Number input for exact value */}
                <TextInput
                  style={styles.sliderInput}
                  keyboardType="numeric"
                  value={filters.minLotSize?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text ? parseFloat(text) : undefined;
                    updateFilter('minLotSize', value);
                  }}
                  placeholder="0 acres"
                />
              </View>

              {/* Maximum Lot Size Slider */}
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabel}>Maximum Lot Size</Text>
                {minMaxWarning.name === 'maxLotSize' && minMaxWarning.message ? (
                  <View style={{ backgroundColor: '#FFF9C4', padding: 8, borderRadius: 4, marginBottom: 4 }}>
                    <Text style={{ color: '#B8860B' }}>{minMaxWarning.message}</Text>
                  </View>
                ) : null}
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={0.25}
                  value={filters.maxLotSize || 10}
                  onValueChange={(value) => updateFilter('maxLotSize', value)}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#D1D1D6"
                  thumbTintColor="#007AFF"
                />
                {/* Number input for exact value */}
                <TextInput
                  style={styles.sliderInput}
                  keyboardType="numeric"
                  value={filters.maxLotSize?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text ? parseFloat(text) : undefined;
                    updateFilter('maxLotSize', value);
                  }}
                  placeholder="10 acres"
                />
              </View>
            </View>

          </ScrollView>

          {/* Footer with Reset and Apply buttons */}
          <View style={styles.footer}>
            
            {/* Reset All button - clears all filters */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>

            {/* Apply Filters button - saves and closes */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles for all the components
const styles = StyleSheet.create({
  // Dark semi-transparent overlay behind modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  // White box containing the filters
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  
  // Header section with title and X button
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  
  // Scrollable content area
  scrollView: {
    padding: 20,
  },
  
  // Each filter section (bedrooms, bathrooms, etc.)
  section: {
    marginBottom: 30,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  
  // Container for min/max inputs side by side (bedrooms, bathrooms)
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Container for a single input field
  inputContainer: {
    flex: 1,
  },
  
  // Label above input (Min, Max, etc.)
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  
  // Text input field
  input: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  
  // "to" text between min and max
  rangeSeparator: {
    marginHorizontal: 12,
    color: '#666',
  },
  
  // Container for displaying current slider values at top
  sliderValueContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  
  sliderValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  
  sliderValueSeparator: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#666',
  },
  
  // Container for each slider + input combo
  sliderSection: {
    marginBottom: 20,
  },
  
  sliderLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  
  // The slider itself
  slider: {
    width: '100%',
    height: 40,
  },
  
  // Input field next to slider for exact numbers
  sliderInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  
  // Footer with buttons
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  
  // Reset button (outlined)
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  
  resetButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Apply button (filled)
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PropertyFilters;
