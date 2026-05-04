// ========================================
// AGENT DASHBOARD STYLES
// ========================================
import { StyleSheet } from 'react-native';
export const agentDashboardStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 50,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerTextContainer: { marginLeft: 16 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
  headerSubtitle: { fontSize: 14, color: "#666666", marginTop: 4 },
  logoutButton: { backgroundColor: "#FF4444", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  logoutButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 10 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666666" },
  statsCard: { backgroundColor: "#2C5F2D", marginHorizontal: 16, marginTop: 16, marginBottom: 16, padding: 24, borderRadius: 12, alignItems: "center" },
  statsTitle: { fontSize: 16, color: "#FFFFFF", fontWeight: "600", marginBottom: 8 },
  statsNumber: { fontSize: 48, color: "#FFFFFF", fontWeight: "bold", marginBottom: 4 },
  statsSubtitle: { fontSize: 14, color: "#FFFFFF", opacity: 0.8 },
  section: { backgroundColor: "#FFFFFF", padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A", marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: "#666666", lineHeight: 20 },
  emptyState: { backgroundColor: "#FFFFFF", padding: 40, marginHorizontal: 16, borderRadius: 12, alignItems: "center" },
  emptyStateText: { fontSize: 16, color: "#666666", textAlign: "center", marginTop: 16, fontWeight: "600" },
  emptyStateSubtext: { fontSize: 14, color: "#999999", textAlign: "center", marginTop: 8 },
  requestsContainer: { paddingHorizontal: 16 },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  clientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#2C5F2D", justifyContent: "center", alignItems: "center" },
  requestInfo: { flex: 1, marginLeft: 12 },
  clientName: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A", marginBottom: 4 },
  requestDate: { fontSize: 12, color: "#999999" },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  pendingBadge: { backgroundColor: "#FFA500" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  requestDetails: { borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 12, marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  detailText: { fontSize: 14, color: "#666666", marginLeft: 8 },
  requestActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#F0F7F0" },
  actionButtonText: { fontSize: 14, fontWeight: "600", color: "#2C5F2D", marginLeft: 6 },
  pieChartContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  chartLegend: {
    width: "100%",
    maxWidth: 360,
    marginTop: 10,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: "#4E4E4E",
  },
  viewFavoritesButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#FF9800" },
  viewFavoritesButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  navigateButton: {
    backgroundColor: "#007AFF",
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
  },
  navigateButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});

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

  //Dashboard Button
  dashboardButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2c3e5f',
    backgroundColor: '#2b3b83'
  },

  dashboardButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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

  starButton: {
      padding: 10,
      marginLeft: 10,
  },

  starButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C5F2D',
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

// ========================================
// CLIENT DASHBOARD STYLES
// ========================================
export const clientDashboard_styles = StyleSheet.create({
	bottomButtonsContainer: {
		backgroundColor: '#F8F9FA',
    paddingBottom: 8,
		paddingTop: 8,
		alignItems: 'center',
    marginTop: 12,
	},
	container: { flex: 1, backgroundColor: "#F8F9FA" },
	header: {
		backgroundColor: "#FFFFFF",
		paddingVertical: 20,
		paddingHorizontal: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E5E5",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerContent: { flexDirection: "row", alignItems: "center", flex: 1 },
	headerTextContainer: { marginLeft: 16 },
	headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
	headerSubtitle: { fontSize: 14, color: "#666666", marginTop: 4 },
	logoutButton: { backgroundColor: "#FF4444", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
	logoutButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
	scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
	loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
	loadingText: { marginTop: 10, fontSize: 16, color: "#666666" },
	section: { backgroundColor: "#FFFFFF", padding: 20, marginBottom: 16 },
	sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A", marginBottom: 8 },
	sectionDescription: { fontSize: 14, color: "#666666", lineHeight: 20 },
	emptyState: { backgroundColor: "#FFFFFF", padding: 40, marginHorizontal: 16, borderRadius: 12, alignItems: "center" },
	emptyStateText: { fontSize: 16, color: "#666666", textAlign: "center" },
	realtorsContainer: { paddingHorizontal: 16 },
	realtorCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	realtorInfo: { flexDirection: "row", marginBottom: 16 },
	realtorAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#2C5F2D", justifyContent: "center", alignItems: "center" },
	realtorInitials: { color: "#FFFFFF", fontSize: 20, fontWeight: "bold" },
	realtorDetails: { flex: 1, marginLeft: 16, justifyContent: "center" },
	realtorName: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A", marginBottom: 4 },
	realtorEmail: { fontSize: 14, color: "#666666", marginBottom: 2 },
	realtorPhone: { fontSize: 14, color: "#666666" },
	selectButton: { backgroundColor: "#2C5F2D", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: "center" },
	disabledButton: { opacity: 0.6 },
	selectButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
	requestSentBadge: { backgroundColor: "#4CAF50", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: "center" },
	requestSentText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
	navigateButton: {
		backgroundColor: "#007AFF",
		marginHorizontal: 16,
		marginTop: 8,
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 10,
		alignItems: "center",
	},
	navigateButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});

// ========================================
// PROFILE STYLES
// ========================================
 export const profileModule_styles = StyleSheet.create({
	container: {
		padding: 20,
		backgroundColor: '#F8F9FA',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8F9FA',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1A1A1A',
		marginBottom: 8,
	},
	roleText: {
		fontSize: 14,
		color: '#666666',
		marginBottom: 16,
	},
	fieldGroup: {
		marginBottom: 14,
	},
	label: {
		fontSize: 14,
		color: '#555555',
		marginBottom: 6,
	},
	input: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		color: '#1A1A1A',
	},
	primaryButton: {
		backgroundColor: '#2C5F2D',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 8,
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '600',
	},
	secondaryButton: {
		borderWidth: 1,
		borderColor: '#2C5F2D',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 10,
	},
	secondaryButtonText: {
		color: '#2C5F2D',
		fontSize: 15,
		fontWeight: '600',
	},
	disabledButton: {
		opacity: 0.6,
	},
	extraSection: {
		marginTop: 20,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#E0E0E0',
	},
	fieldRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	fieldLabel: {
		fontSize: 14,
		color: '#555555',
	},
	fieldValue: {
		fontSize: 14,
		color: '#1A1A1A',
	},
});

// ========================================
// PROPERTY FILTERS STYLES
// ========================================
export const propertyFilter_styles = StyleSheet.create({
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
    marginBottom: 2,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Label inline with input (Min:, Max:, Status:)
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    minWidth: 44,
  },
  
  // Text input field
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#0b0b0b',
    borderRadius: 8,
    height: 36,
    minHeight: 36,
    paddingHorizontal: 1,
    paddingVertical: 0,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#eeeeee',
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

  // Row layout for slider with value textbox on the right
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  sliderLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  
  // The slider itself
  slider: {
    flex: 1,
    height: 40,
  },
  
  // Input field next to slider for exact numbers
  sliderInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },

  // Compact fixed-width textbox to the right of slider
  sliderInputInline: {
    width: 126,
    minWidth: 126,
    maxWidth: 126,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
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

// ========================================
// LOGIN STYLES
// ========================================
export const login_styles = StyleSheet.create({
	container: {
		padding: 20,
		backgroundColor: '#fff',
		borderRadius: 8,
		margin: 20,
		elevation: 2,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 16,
		textAlign: 'center',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 4,
		padding: 10,
		marginBottom: 12,
	},
	message: {
		marginTop: 10,
		textAlign: 'center',
		color: '#007AFF',
	},
});

// ========================================
// TEAM STYLES
// ========================================
export const team_styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  introSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444444',
    marginBottom: 16,
  },
  awardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F2D',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#F0F7F0',
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  memberImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E5E5E5',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#2C5F2D',
    fontWeight: '600',
    marginBottom: 8,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  expandText: {
    fontSize: 13,
    color: '#2C5F2D',
    fontWeight: '600',
    marginRight: 4,
  },
  bioContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#444444',
  },
  contactActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F0F7F0',
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F2D',
    marginLeft: 6,
  },
  contactSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C5F2D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    marginBottom: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emailButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2C5F2D',
  },
  emailButtonText: {
    color: '#2C5F2D',
  },
});



// ========================================
// DEFAULT PAGE STYLES
// ========================================
export const defaultPage_styles = StyleSheet.create({
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

  // ===== BODY =====
  section: { backgroundColor: "#FFFFFF", padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A", marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: "#666666", lineHeight: 20 },

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

  // ===== BUTTONS =====
  
  // Base style for all action buttons
  defaultButton: {
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
});