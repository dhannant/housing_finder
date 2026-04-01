# TODO Notes

## Product & App Tasks

- [X] Add SDKs for Firebase products needed in `components/firebaseConfig.ts`.
  - Reference: [firebaseConfig.ts](https://github.com/dhannant/housing_finder/blob/b4ca3557897d0a6d94309b16d2a6aebd2417a31b/components/firebaseConfig.ts)
- [X] Implement six-month inactivity check (recent login should surface new lead behavior).
- [X] Review and clean Firebase imports (use Firebase JS SDK only; avoid `@react-native-firebase` where not required).
- [X] Confirm `db` and `auth` are imported from `firebaseConfig.ts` everywhere used.
- [X] Set permissive Firestore rules for development (`allow read, write: if true;`) and tighten for production.
- [ ] Refactor `styles.ts` to combine duplicate style patterns (for example `actionButton`, `helpButton`).
- [X] Add Privacy Policy and Terms of Service.
- [X] Add min/max validation for map filters (especially bedrooms and bathrooms).
- [X] Test min/max filter edge cases (`min > max`, equal values, empty values) and show correction/warning UX.
- [X] Update code paths for user role = Admin.
- [X] Add account cleanup workflow: around 15 days after closing (or move-in date, whichever is later), delete user profile and related data.

## Push Notification Milestones

- [X] Client requests an agent (`clientRequests` create with `status: Pending`) → notify selected agent.
  - Source: `handleSelectRealtor` in `app/client/(tabs)/client-dashboard.tsx`
- [X] Agent approves client request (`clientRequests` update/create with `status: Approved`) → notify client.
  - Source: `handleAssignClient` in `app/agent/(tabs)/agent-dashboard.tsx`
- [X] Agent declines client request (`clientRequests` update with `status: Declined` + `reason`) → notify client with decline reason.
  - Source: `handleDeclineRequest` in `app/agent/(tabs)/agent-dashboard.tsx`
- [X] Agent releases client (delete `clientRequests` assignment) → notify client they are unassigned.
  - Source: `handleReleaseClient` in `app/agent/(tabs)/agent-dashboard.tsx`
- [X] Agent creates offer (`clientOffers` create with `status: Offer Made`) → notify client.
  - Source: `createClientOffer` call in `components/modules/ClientFavoritesListModule.tsx`
- [X] Offer status changed (`clientOffers.status`) → notify assigned agent + client.
  - Source: `handleSave` in `app/(shared_screens)/client_offer_details.tsx`
- [X] Offer milestone dates changed (`dueDiligence*`, `inspectionDate`, `closingDate`, `earnestMoney*`) → notify both sides.
  - Source: `handleSave` in `app/(shared_screens)/client_offer_details.tsx`
- [X] Agent assigns a property as favorite to client (`clientFavorites` create for another user) → notify client.
  - Source: `toggleFavorite(selectedClientId, selectedHouse)` in `app/(tabs)/map.tsx`
- [ ] Optional: client Request Help action (once stored in Firestore) → notify assigned agent.
  - Source: `handleRequestHelp` in `app/(tabs)/map.tsx`
- [ ] Optional: account deactivation warning (24h before scheduled inactive deactivation) → notify impacted user.
  - Source: `runDeactivateInactiveUsers` / `deactivateUsersAfterCloseDate` in `functions/src/index.ts`
- [X] Limit property search to a 5 mile radius around the user's current location (remove default to Commerce, GA)
- [X] Enforce search area limits when user zooms or uses 'Search This Area' (prevent excessive/irrelevant results)


## Ingestion Hardening

- [X] Add retry/backoff and timeout handling to RapidAPI ingestion calls
- [X] Persist ingestion telemetry with batch/page failure detail in `apiPullRuns`
- [X] Add on-demand ingestion test endpoint with expected vs received summary stats
- [ ] Create a post-run function to mark unseen properties inactive (`apiActive: false` when not seen in the current ingest run)


## Misc Todo List

- [X] Add Request Help button and function
- [ ] Store help request in Firestore
- [ ] Display confirmation after help request
- [X] Switch email sending to Firebase function or business email

- [ ] Enforce: Users should only be able to have 1 active offer at a time (throttle in backend, ideally via Cloud Function)
- [ ] Enforce: Limit user favorites to a max of 20 total and/or max 5 per minute (combine total and rate cap; block and log if exceeded)
- [ ] Consider: Add client-side check for rapid favorite/unfavorite toggling. If a user favorites, unfavorites, then re-favorites the same property within a short window (e.g., 10 minutes), show a message to wait 24 hours before favoriting again. Refine logic to avoid penalizing honest mistakes.
