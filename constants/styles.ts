import { StyleSheet } from 'react-native';

// ========================================
// LANDING PAGE STYLES
// ========================================
export const landingStyles = StyleSheet.create({
  // Main container for the entire landing page
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Makes the scroll view fill available space
  scrollContent: {
    flexGrow: 1,
  },

  // ===== HEADER SECTION =====
  // Top bar with logo and login button
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Logo section (icon + text)
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Green square icon with house
  logoIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#2C5F2D',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  // "Leading Edge" text
  logoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },

  // "Real Estate" text
  logoSubtitle: {
    fontSize: 12,
    color: '#666666',
  },

  // Login button in top right
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2C5F2D',
  },

  loginButtonText: {
    color: '#2C5F2D',
    fontWeight: '600',
    fontSize: 14,
  },

  // ===== WELCOME SECTION =====
  // Area with "Welcome to" and logo image
  welcomeSection: {
    padding: 32,
    alignItems: 'center',
  },

  // "Welcome to" heading
  welcomeTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 44,
  },

  // "North Georgia's trusted..." text
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },

  // ===== ACTION BUTTONS SECTION =====
  // Container for all 4 main buttons
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Base style for all action buttons
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 3,
  },

  // Green border for "Buy" button
  buyButton: {
    borderColor: '#2C5F2D',
  },

  // Different green for "Sell" button
  sellButton: {
    borderColor: '#059669',
  },

  // Purple border for "Pre-approval" button
  preapprovalButton: {
    borderColor: '#7C3AED',
  },

  // Orange border for "Geolocate" button
  geolocateButton: {
    borderColor: '#EA580C',
  },

  // Left side of button (icon + text)
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  // Circle that holds the icon
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  // Green circle for Buy button
  buyIconCircle: {
    backgroundColor: '#2C5F2D',
  },

  // Different green for Sell button
  sellIconCircle: {
    backgroundColor: '#059669',
  },

  // Purple circle for Pre-approval button
  preapprovalIconCircle: {
    backgroundColor: '#7C3AED',
  },

  // Orange circle for Geolocate button
  geolocateIconCircle: {
    backgroundColor: '#EA580C',
  },

  // Container for button title and subtitle text
  buttonTextContainer: {
    flex: 1,
  },

  // Main button text (e.g., "I'm looking to buy...")
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },

  // Smaller text under button title
  buttonSubtitle: {
    fontSize: 13,
    color: '#666666',
  },

  // Arrow on right side of button
  arrow: {
    fontSize: 32,
    color: '#666666',
    marginLeft: 8,
  },

  // ===== INFO SECTION =====
  // Section with help text and team button
  infoSection: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    alignItems: 'center',
  },

  // "Not sure where to start..." text
  infoText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },

  // "Meet Our Team" button
  teamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7F0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#2C5F2D',
  },

  // "Meet Our Team" button text
  teamButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5F2D',
    marginLeft: 8,
  },

  // ===== FOOTER =====
  // Bottom section with copyright
  footer: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    alignItems: 'center',
  },

  // Copyright text
  footerText: {
    color: '#666666',
    fontSize: 11,
  },
});

// ========================================
// MAP PAGE STYLES
// ========================================
export const mapStyles = StyleSheet.create({
  // Main container for map screen
  container: {
    flex: 1,
  },

  // The actual map component
  map: {
    width: '100%',
    height: '100%',
  },

  // Message shown on web (maps don't work on web)
  webMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 18,
    color: '#666666',
  },

  // ===== LOADING INDICATOR =====
  // Shows while map is loading
  loadingContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 50,
  },

  // ===== FILTER BUTTONS =====
  // Container for status filter buttons at top
  filterContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },

  // Individual filter button (All, For Sale, Under Contract)
  filterButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Filter button when it's selected
  filterButtonActive: {
    backgroundColor: '#2C5F2D',
  },

  // Text on filter button (not selected)
  filterText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },

  // Text on filter button (selected)
  filterTextActive: {
    color: '#FFFFFF',
  },

  // ===== SEARCH BUTTON =====
  // "Search this area" button at bottom of map
  searchButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#2C5F2D',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // ===== PROPERTY MODAL =====
  // Full screen modal showing property details
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Top bar in modal with close button
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },

  // X button to close modal
  closeButton: {
    padding: 10,
  },

  closeButtonText: {
    fontSize: 24,
    color: '#2C5F2D',
  },

  // "Property Details" text in header
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },

  // ===== PHOTO VIEWER =====
  // Container for property photos
  photoContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Individual photo
  photo: {
    width: '100%',
    height: '100%',
  },

  // Navigation buttons below photo (prev/next)
  photoNavigation: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },

  // Previous/Next buttons
  navButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Previous/Next button when disabled
  navButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  navButtonText: {
    fontSize: 24,
    color: '#1A1A1A',
  },

  // "1 / 5" photo counter
  photoCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // Shows when property has no photos
  noPhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },

  noPhotoText: {
    fontSize: 18,
    color: '#666666',
  },

  // ===== PROPERTY DETAILS =====
  // Bottom section with price, address, etc.
  detailsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },

  // Price text (e.g., "$450,000")
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C5F2D',
    marginBottom: 10,
  },

  // Address and other details
  details: {
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 5,
  },

  // Status text (e.g., "For Sale", "Under Contract")
  status: {
    fontSize: 16,
    color: '#666666',
    textTransform: 'capitalize',
  },
});