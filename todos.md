# TODO Notes

## Product & App Tasks

- [X] Add SDKs for Firebase products needed in `components/firebaseConfig.ts`.
  - Reference: [firebaseConfig.ts](https://github.com/dhannant/housing_finder/blob/b4ca3557897d0a6d94309b16d2a6aebd2417a31b/components/firebaseConfig.ts)
- [X] Implement six-month inactivity check (recent login should surface new lead behavior).
- [X] Review and clean Firebase imports (use Firebase JS SDK only; avoid `@react-native-firebase` where not required).
- [X] Confirm `db` and `auth` are imported from `firebaseConfig.ts` everywhere used.
- [X] Set permissive Firestore rules for development (`allow read, write: if true;`) and tighten for production.
- [ ] Refactor `styles.ts` to combine duplicate style patterns (for example `actionButton`, `helpButton`).
- [ ] Add Privacy Policy and Terms of Service.
- [ ] Add min/max validation for map filters (especially bedrooms and bathrooms).
- [ ] Test min/max filter edge cases (`min > max`, equal values, empty values) and show correction/warning UX.
- [ ] Update code paths for user role = Admin.
- [ ] Refactor `app/agent/(tabs)/agent-dashboard.tsx` with React Native Paper components.
- [ ] Add account cleanup workflow: around 15 days after closing (or move-in date, whichever is later), delete user profile and related data.

## Push Notification Milestones

- [x] Client requests an agent (`clientRequests` create with `status: Pending`) → notify selected agent.
  - Source: `handleSelectRealtor` in `app/client/(tabs)/client-dashboard.tsx`
- [x] Agent approves client request (`clientRequests` update/create with `status: Approved`) → notify client.
  - Source: `handleAssignClient` in `app/agent/(tabs)/agent-dashboard.tsx`
- [x] Agent declines client request (`clientRequests` update with `status: Declined` + `reason`) → notify client with decline reason.
  - Source: `handleDeclineRequest` in `app/agent/(tabs)/agent-dashboard.tsx`
- [x] Agent releases client (delete `clientRequests` assignment) → notify client they are unassigned.
  - Source: `handleReleaseClient` in `app/agent/(tabs)/agent-dashboard.tsx`
- [x] Agent creates offer (`clientOffers` create with `status: Offer Made`) → notify client.
  - Source: `createClientOffer` call in `components/modules/ClientFavoritesListModule.tsx`
- [x] Offer status changed (`clientOffers.status`) → notify assigned agent + client.
  - Source: `handleSave` in `app/(shared_screens)/client_offer_details.tsx`
- [x] Offer milestone dates changed (`dueDiligence*`, `inspectionDate`, `closingDate`, `earnestMoney*`) → notify both sides.
  - Source: `handleSave` in `app/(shared_screens)/client_offer_details.tsx`
- [x] Agent assigns a property as favorite to client (`clientFavorites` create for another user) → notify client.
  - Source: `toggleFavorite(selectedClientId, selectedHouse)` in `app/(tabs)/map.tsx`
- [ ] Optional: client Request Help action (once stored in Firestore) → notify assigned agent.
  - Source: `handleRequestHelp` in `app/(tabs)/map.tsx`
- [ ] Optional: account deactivation warning (24h before scheduled inactive deactivation) → notify impacted user.
  - Source: `runDeactivateInactiveUsers` / `deactivateUsersAfterCloseDate` in `functions/src/index.ts`



## Web Platform
- [ ] Fix web map implementation - Create platform-specific files (map.native.tsx and map.web.tsx) to properly support web platform without react-native-maps dependency
  - Current issue: Web bundler fails when trying to import react-native-maps
  - Solution: Use .native.tsx and .web.tsx file extensions for platform-specific code
  - Priority: Low (mobile is primary use case)

- [ ] Limit property search to a 5 mile radius around the user's current location (remove default to Commerce, GA)
- [ ] Enforce search area limits when user zooms or uses 'Search This Area' (prevent excessive/irrelevant results)


## Ingestion Hardening

- [x] Add retry/backoff and timeout handling to RapidAPI ingestion calls
- [x] Persist ingestion telemetry with batch/page failure detail in `apiPullRuns`
- [x] Add on-demand ingestion test endpoint with expected vs received summary stats
- [ ] Create a post-run function to mark unseen properties inactive (`apiActive: false` when not seen in the current ingest run)


## Misc Todo List

- [x] Add Request Help button and function
- [ ] Store help request in Firestore
- [ ] Display confirmation after help request
- [ ] Switch email sending to Firebase function or business email
