# Feature Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Housing Finder App                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase Authentication                       │
│                  (Email/Password Sign-in)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     User Role Detection                          │
│              (Query Firestore for user role)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │  Client Dashboard    │   │  Realtor Dashboard   │
    │                      │   │                      │
    │  - View Realtors     │   │  - View Requests     │
    │  - Select Realtor    │   │  - Contact Clients   │
    │  - Browse Properties │   │  - View Properties   │
    └──────────────────────┘   └──────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
            ┌─────────────────────────────────┐
            │    Firestore Collections:       │
            │                                 │
            │  1. users                       │
            │     - User profiles & roles     │
            │                                 │
            │  2. clientRequests              │
            │     - Client-Realtor requests   │
            └─────────────────────────────────┘
```

## User Flow Diagrams

### Client User Flow

```
┌─────────────┐
│  Landing    │
│   Screen    │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   Login     │──No─→│  Register    │
│   Screen    │      │   Screen     │
└──────┬──────┘      └──────┬───────┘
       │                    │
    Yes│                    │ Select "Client"
       │                    │
       └────────┬───────────┘
                ▼
       ┌─────────────────┐
       │     Client      │
       │   Dashboard     │
       │                 │
       │ ┌─────────────┐ │
       │ │  Realtors   │ │
       │ │   List      │ │
       │ └──────┬──────┘ │
       │        │        │
       │        ▼        │
       │ ┌─────────────┐ │
       │ │   Select    │ │
       │ │  Realtor    │ │
       │ └──────┬──────┘ │
       └────────┼────────┘
                │
                ▼
       ┌─────────────────┐
       │  Request Sent   │
       │  Confirmation   │
       └─────────────────┘
```

### Realtor User Flow

```
┌─────────────┐
│  Landing    │
│   Screen    │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   Login     │──No─→│  Register    │
│   Screen    │      │   Screen     │
└──────┬──────┘      └──────┬───────┘
       │                    │
    Yes│                    │ Select "Realtor"
       │                    │
       └────────┬───────────┘
                ▼
       ┌─────────────────┐
       │    Realtor      │
       │   Dashboard     │
       │                 │
       │ ┌─────────────┐ │
       │ │   Client    │ │
       │ │  Requests   │ │
       │ └──────┬──────┘ │
       │        │        │
       │        ▼        │
       │ ┌─────────────┐ │
       │ │  Contact    │ │
       │ │   Client    │ │
       │ └─────────────┘ │
       └─────────────────┘
```

## Data Flow Diagram

### Client Selects Realtor

```
┌─────────────┐
│   Client    │
│ (Logged in) │
└──────┬──────┘
       │
       │ 1. Fetch Realtors
       ▼
┌──────────────────┐
│   Firestore DB   │
│  users WHERE     │
│  role='Realtor'  │
└──────┬───────────┘
       │
       │ 2. Display List
       ▼
┌──────────────────┐
│  Client clicks   │
│ "Select Realtor" │
└──────┬───────────┘
       │
       │ 3. Create Request
       ▼
┌──────────────────┐
│   Firestore DB   │
│ clientRequests   │
│   collection     │
└──────────────────┘
```

### Realtor Views Requests

```
┌─────────────┐
│   Realtor   │
│ (Logged in) │
└──────┬──────┘
       │
       │ 1. Fetch Requests
       ▼
┌───────────────────┐
│   Firestore DB    │
│ clientRequests    │
│ WHERE realtorId   │
│ = current user    │
└──────┬────────────┘
       │
       │ 2. Display Requests
       ▼
┌───────────────────┐
│  Realtor clicks   │
│  "Email Client"   │
└──────┬────────────┘
       │
       │ 3. Open Email App
       ▼
┌───────────────────┐
│  Device Email     │
│  Client (mailto:) │
└───────────────────┘
```

## Database Schema

### users Collection

```
users/
  {userId}/
    ├── firstName: string
    ├── lastName: string
    ├── phoneNumber: string
    ├── email: string
    ├── role: "Client" | "Realtor"
    └── createdAt: Timestamp
```

### clientRequests Collection

```
clientRequests/
  {requestId}/
    ├── clientId: string (userId)
    ├── clientName: string
    ├── clientEmail: string
    ├── realtorId: string (userId)
    ├── status: "pending"
    └── createdAt: Timestamp
```

## Security Model

```
┌─────────────────────────────────────────────────────────┐
│              Firestore Security Rules                   │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ┌──────────┐  ┌──────────┐   ┌──────────┐
  │  users   │  │ requests │   │   Auth   │
  └──────────┘  └──────────┘   └──────────┘
        │               │               │
        │               │               │
        ▼               ▼               ▼
  Own profile    Own requests    Required for
  only (write)   + assigned      all operations
                 (read)

Rules:
1. Users can read/write their own profile
2. Anyone can read Realtor profiles (for selection)
3. Clients can create requests with their own clientId
4. Clients can read their own requests
5. Realtors can read requests assigned to them
6. Realtors can update status of assigned requests
```

## Navigation Structure

```
App Root
├── index (Landing Page)
│   ├── Login Button → /login
│   └── Action Buttons → /(tabs)/map
│
├── /login
│   ├── Success (Client) → /client-dashboard
│   ├── Success (Realtor) → /realtor-dashboard
│   └── Register Link → /register
│
├── /register
│   └── Success → /login
│
├── /client-dashboard
│   ├── Browse Properties → /(tabs)/map
│   └── Logout → /
│
├── /realtor-dashboard
│   ├── View Properties → /(tabs)/map
│   └── Logout → /
│
└── /(tabs)
    ├── map (Property Map)
    ├── explore (Information)
    └── team (Team Members)
```

## Component Hierarchy

```
App
├── _layout.tsx (Root Navigator)
│   ├── index.tsx (Landing)
│   ├── login.tsx (Login Screen)
│   ├── register.tsx (Registration)
│   │   └── components/registration_form.tsx
│   ├── client-dashboard.tsx
│   └── realtor-dashboard.tsx
│
└── (tabs)/_layout.tsx (Tab Navigator)
    ├── map.tsx
    ├── explore.tsx
    └── team.tsx
```

## Feature Interactions

```
┌──────────────────────────────────────────────────────────┐
│                    User Registration                      │
│  ┌────────────┐                      ┌────────────┐      │
│  │   Client   │                      │  Realtor   │      │
│  └─────┬──────┘                      └─────┬──────┘      │
│        │                                   │             │
│        └───────────────┬───────────────────┘             │
│                        │                                 │
│                        ▼                                 │
│              ┌──────────────────┐                        │
│              │  Firebase Auth   │                        │
│              │   + Firestore    │                        │
│              └──────────────────┘                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   Request Management                      │
│                                                           │
│  Client creates request → Firestore → Realtor views      │
│                                                           │
│  ┌────────┐         ┌──────────┐         ┌────────┐     │
│  │ Client │────────→│ Request  │────────→│Realtor │     │
│  │ Select │         │ Document │         │ Views  │     │
│  └────────┘         └──────────┘         └────────┘     │
│                                                           │
│  Status: "pending" (default)                             │
│  Future: "accepted", "declined", "completed"             │
└──────────────────────────────────────────────────────────┘
```

## Key Features Summary

1. **Role-based Authentication**: Different dashboards for Clients and Realtors
2. **Realtor Discovery**: Clients can browse and select realtors
3. **Request System**: Track client-realtor connections
4. **Secure Data**: Firestore security rules enforce access control
5. **Responsive UI**: Clean, modern design with proper navigation
6. **Contact Integration**: Direct email links for communication

## Technology Stack

- **Frontend**: React Native with Expo
- **Routing**: Expo Router (file-based routing)
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **UI Components**: 
  - react-native core components
  - @react-native-picker/picker
  - lucide-react-native (icons)
- **State Management**: React Hooks (useState, useEffect)
