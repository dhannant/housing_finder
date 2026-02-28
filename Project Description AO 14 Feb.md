# Project Description AO 14 Feb

## Project Overview: Housing Finder App

### Purpose
A cross-platform real estate application for clients and realtors, built with React Native (Expo), using Firebase for authentication and data, Vercel for API hosting, and Expo Application Services (EAS) for cloud builds and deployment.

---

### Core Technologies

- **React Native (Expo):** UI and navigation for iOS/Android.
- **Expo Router:** File-based navigation and shared screens.
- **Firebase:** Authentication, Firestore database, and storage.
- **Vercel:** Hosting for backend APIs and environment variable management.
- **EAS (Expo Application Services):** Cloud builds for distributing .apk/.aab/.ipa files, OTA updates, and credential management.

---

### Key Environment Variables

- **EXPO_PUBLIC_API_BASE_URL:** Base URL for API requests (hosted on Vercel).
- **FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, etc.:** Firebase project credentials (stored in .env or Vercel environment).
- **VERCEL_OIDC_TOKEN:** Used for secure Vercel deployments and API access.

---

### Main App Pages & Components

#### 1. **Authentication**
- **login.tsx:** User login form, Firebase Auth integration.
- **register.tsx:** User registration, role selection (client/realtor), Firebase Auth and Firestore user creation.

#### 2. **Dashboards**
- **client-dashboard.tsx:** Client’s main page, property search, favorites, and profile access.
- **realtor-dashboard.tsx:** Realtor’s main page, property management, client list, and profile access.

#### 3. **Shared Screens**
- **(shared_screens)/profile.tsx:** Editable user profile, password change, role-aware extra fields.
- **(shared_screens)/favorites.tsx:** List of favorited properties, accessible by both roles.

#### 4. **Tabs & Navigation**
- **(tabs)/explore.tsx:** Property search and browsing.
- **(tabs)/map.tsx:** Map view of properties.
- **(tabs)/team.tsx:** Team/realtor list (for clients).

#### 5. **Components**
- **registration_form.tsx:** Handles registration logic and form validation.
- **firebaseConfig.ts:** Initializes and exports Firebase services.
- **ui/collapsible.tsx, icon-symbol.tsx:** UI helpers and icon mapping.

---

### Key Functions & Variables

- **firebaseConfig:** Exports initialized Firebase app, auth, and Firestore instances.
- **registerUser(email, password, role, extraFields):** Handles user registration and Firestore user document creation.
- **loginUser(email, password):** Authenticates user with Firebase.
- **updateUserProfile(updates):** Updates user profile in Firestore.
- **changePassword(oldPassword, newPassword):** Handles password change via Firebase Auth.
- **fetchProperties(filters):** Fetches property listings from Firestore or API.
- **addFavorite(propertyId):** Adds a property to the user’s favorites.
- **removeFavorite(propertyId):** Removes a property from favorites.

---

### Firebase Functions

- **Cloud Functions for Firebase** are used to run backend code in response to events in Firestore, HTTP requests, or other Firebase services.
- Example: Firestore-triggered function to log property updates:

```typescript
import {onDocumentWritten} from "firebase-functions/v2/firestore";

export const logPropertyUpdate = onDocumentWritten("properties/{propertyId}", (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  console.log(`Property ${event.params.propertyId} updated.`);
  console.log("Before:", before);
  console.log("After:", after);
});
```

- Functions are defined in the `functions/src/index.ts` file and deployed using the Firebase CLI.
- Common use cases: sending notifications, validating data, integrating with third-party APIs, and automating backend tasks.

---

### Workflow

1. **User Registration/Login**
   - User registers or logs in via Firebase Auth.
   - On registration, user selects a role (client or realtor) and fills extra fields.
   - User data is stored in Firestore under a users collection.

2. **Dashboard Navigation**
   - After login, user is routed to the appropriate dashboard based on role.
   - Tab navigation provides access to Explore, Favorites, Profile, etc.

3. **Property Search & Favorites**
   - Clients can search and filter properties, view details, and add to favorites.
   - Favorites are stored in Firestore and accessible from the Favorites tab.

4. **Profile Management**
   - Users can edit their profile and change their password from the Profile screen.
   - Role-specific fields are shown/hidden as needed.

5. **Realtor Features**
   - Realtors can manage property listings and view client interest.
   - Team and client management features are available via dedicated tabs.

6. **API & Hosting**
   - Backend APIs (if any) are hosted on Vercel, with EXPO_PUBLIC_API_BASE_URL pointing to the deployed endpoint.
   - Environment variables are managed via Vercel and .env files.

7. **Build & Deployment**
   - EAS is used to build production-ready binaries for Android/iOS.
   - Builds are distributed to testers/clients or uploaded to app stores.
   - OTA updates can be pushed using EAS Update if enabled.

---

### Security & Best Practices

- **Firestore Security Rules:** Enforced to restrict data access by user role.
- **Environment Variables:** Sensitive keys are never hardcoded; managed via .env and Vercel.
- **Authentication:** All user actions are authenticated via Firebase.

---

### Summary

This project provides a robust, scalable real estate platform with role-based access, modern navigation, and cloud-powered deployment. It leverages Firebase for real-time data and authentication, Vercel for API hosting, and EAS for seamless app distribution and updates.

