# TODO Notes

1. Add SDKs for Firebase products that you want to use from the file components/firebaseConfig.ts. More details can be viewed [here](https://github.com/dhannant/housing_finder/blob/b4ca3557897d0a6d94309b16d2a6aebd2417a31b/components/firebaseConfig.ts).
2. Six-month inactivity check: Recent login should pop new lead. Original note sourced from general request input.
3. Review and clean up Firebase imports: Ensure only the firebase JS SDK is used (no @react-native-firebase). Confirm db and auth are imported from firebaseConfig.ts everywhere they're used.
4. Check Firestore rules for development: Set Firestore rules to allow read/write for development. Use: allow read, write: if true; and tighten for production.


7. Add min/max validation for map filters: Implement and test min/max validation for all map filters, especially for bedrooms and bathrooms, to prevent invalid ranges and provide user feedback.
8. Test min/max filter edge cases: Test the map filter UI for edge cases: min > max, equal values, empty values, and ensure warnings or corrections are shown for bedrooms and bathrooms.


11. Refactor agent-dashboard.tsx with React Native Paper: Replace TouchableOpacity buttons with Paper Button components, convert View cards to Paper Card, and simplify custom styles. Benefits: Material Design consistency, built-in ripple effects, better accessibility, and reduced boilerplate.
12. Roughly 15 days after closing (or move in date?  maybe which ever is later), we need to delete the users profile along with all related documents created (favorites, etc...)



## Web Platform
- [ ] Fix web map implementation - Create platform-specific files (map.native.tsx and map.web.tsx) to properly support web platform without react-native-maps dependency
  - Current issue: Web bundler fails when trying to import react-native-maps
  - Solution: Use .native.tsx and .web.tsx file extensions for platform-specific code
  - Priority: Low (mobile is primary use case)

- [ ] Limit property search to a 5 mile radius around the user's current location (remove default to Commerce, GA)
- [ ] Enforce search area limits when user zooms or uses 'Search This Area' (prevent excessive/irrelevant results)


# Todo List

- [x] Add Request Help button and function
- [ ] Store help request in Firestore
- [ ] Display confirmation after help request
- [ ] Switch email sending to Firebase function or business email
