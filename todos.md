# TODO Notes
1. Add SDKs for Firebase products that you want to use from the file components/firebaseConfig.ts. More details can be viewed [here](https://github.com/dhannant/housing_finder/blob/b4ca3557897d0a6d94309b16d2a6aebd2417a31b/components/firebaseConfig.ts).
2. Six-month inactivity check: Recent login should pop new lead. Original note sourced from general request input.
3. Review and clean up Firebase imports: Ensure only the firebase JS SDK is used (no @react-native-firebase). Confirm db and auth are imported from firebaseConfig.ts everywhere they're used.
4. Check Firestore rules for development: Set Firestore rules to allow read/write for development. Use: allow read, write: if true; and tighten for production.
5. Add error logging for Firestore writes: Add console.log or alert in catch blocks for setDoc and other Firestore operations to catch and debug errors.
6. Test registration and Firestore writes: Register a user and confirm extra details are written to Firestore. Check the users collection in the Firebase Console.
7. Add min/max validation for map filters: Implement and test min/max validation for all map filters, especially for bedrooms and bathrooms, to prevent invalid ranges and provide user feedback.
8. Test min/max filter edge cases: Test the map filter UI for edge cases: min > max, equal values, empty values, and ensure warnings or corrections are shown for bedrooms and bathrooms.
9. Create universal stylesheet for app: Make a universal stylesheet (e.g., styles/global.ts) with shared styles for containers, titles, input boxes, buttons, etc. Refactor components to use these shared styles to reduce repetition and ensure consistency.
10. Implement caching of property search results (including image URLs) in Firestore. On each search, check Firestore for cached results before calling RapidAPI. If not cached or stale, fetch from RapidAPI, store in Firestore, and return to app.




