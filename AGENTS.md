# Copilot Workspace Instructions for housing-finder

## Overview
This project is an Expo React Native app for real estate, using Firebase (Firestore, Auth, Functions) as backend, RapidAPI for property data, and Google Maps for Android. It uses file-based routing and role-based access control.

## Key Conventions
- **File-based routing:** All screens are in the `app/` directory, organized by user role (admin, agent, client) and shared tabs.
- **Component structure:** Shared UI and modules are in `components/`, context in `contexts/`, utilities and interfaces in `utils/`.
- **Backend:** Firebase Functions (in `functions/`) handle API calls and data normalization. Only backend writes to `properties`.
- **Firestore security:** See `firestore.rules` for strict, role-based access. Only authenticated users can read/write; most collections are read-only for clients/agents except via approved flows.
- **API integration:** Property data is fetched server-side (see `documentation/API_RESPONSE_SAMPLE.md` for mapping) and stored in Firestore. Google Maps API key is injected via EAS secrets and `app.config.ts`.
- **Build/test:**
  - Install: `npm install`
  - Start: `npx expo start`
  - Android build: `eas build --profile preview --platform android`
  - iOS build: `eas build --profile preview --platform ios`
  - Reset: `npm run reset-project`
- **EAS profiles:** development, preview, production (see `eas.json`).
- **Testing:** Push notifications and Firestore access must be tested on custom EAS builds, not Expo Go.

## Documentation
- **Setup, build, and deployment:** See [README.md](README.md)
- **API response mapping:** See [documentation/API_RESPONSE_SAMPLE.md](documentation/API_RESPONSE_SAMPLE.md)
- **Firestore rules:** See [firestore.rules](firestore.rules)

## Agent Guidance
- **Link, don’t embed:** Reference the above docs for details; do not duplicate API or security rule content.
- **Role-based logic:** Always check user role before allowing sensitive actions (see `firestore.rules`).
- **Component boundaries:** Follow the directory structure for new screens, modules, or utilities.
- **Backend changes:** Use Firebase Functions for any data ingestion or API calls.
- **Frontend changes:** Use file-based routing and keep role-specific logic in the appropriate subfolder.

## Example Prompts
- “Add a new property filter to the map screen.”
- “Update Firestore rules to allow agents to approve client requests.”
- “Integrate a new API for property images via Firebase Functions.”

## Next Customizations
- `/create-instruction property-ingestion` — Add detailed agent instructions for normalizing and storing property data from external APIs.
- `/create-skill firestore-security` — Create a skill summarizing Firestore security patterns for this project.

---
For more, see the linked documentation files and follow the conventions above for all new code and agent instructions.
