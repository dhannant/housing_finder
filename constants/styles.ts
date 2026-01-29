import { StyleSheet } from 'react-native';
import { Colors } from './theme';

export const landingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.light.background,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 48,
    height: 48,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  logoSubtitle: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.tint,
  },
  loginButtonText: {
    color: Colors.light.tint,
    fontWeight: '600',
    fontSize: 14,
  },
  welcomeSection: {
    padding: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 44,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 3,
  },
  buyButton: {
    borderColor: Colors.light.tint,
  },
  sellButton: {
    borderColor: '#059669', // Keeping green for now, can theme later
  },
  preapprovalButton: {
    borderColor: '#7C3AED', // Keeping purple
  },
  geolocateButton: {
    borderColor: '#EA580C', // Keeping orange
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buyIconCircle: {
    backgroundColor: Colors.light.tint,
  },
  sellIconCircle: {
    backgroundColor: '#059669',
  },
  preapprovalIconCircle: {
    backgroundColor: '#7C3AED',
  },
  geolocateIconCircle: {
    backgroundColor: '#EA580C',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  arrow: {
    fontSize: 32,
    color: Colors.light.icon,
    marginLeft: 8,
  },
  infoSection: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: Colors.light.tabIconDefault,
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.light.icon,
    fontSize: 11,
  },
});

// Map styles
export const mapStyles = StyleSheet.create({
  // Container & Layout
  container: {
    flex: 1,
  },

  // Map
  map: {
    width: '100%',
    height: '100%',
  },
  webMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 18,
    color: Colors.light.icon,
  },

  // Loading
  loadingContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 50,
  },

  // Filters
  filterContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  filterButton: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterButtonActive: {
    backgroundColor: Colors.light.tint,
  },
  filterText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.light.background,
  },

  // Search Button
  searchButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Modal - Container
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  // Modal - Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.icon,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.light.tint,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },

  // Modal - Photos
  photoContainer: {
    flex: 1,
    backgroundColor: Colors.light.text,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
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
  navButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  navButtonText: {
    fontSize: 24,
    color: Colors.light.text,
  },
  photoCounter: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  noPhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.tabIconDefault,
  },
  noPhotoText: {
    fontSize: 18,
    color: Colors.light.icon,
  },

  // Modal - Details
  detailsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.icon,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 10,
  },
  details: {
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    color: Colors.light.icon,
    textTransform: 'capitalize',
  },
});