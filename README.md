# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.


## Backend & API Integrations

### Vercel (Serverless Backend API)
- The `/api` directory contains serverless functions deployed to [Vercel](https://vercel.com/).
- Used for securely proxying third-party API requests and caching results.
- Deploy manually with the Vercel CLI or connect a repo for automatic deployments.
- Set environment variables (API keys, Firebase credentials) in the Vercel dashboard.

### Firebase & Firestore
- Firebase Authentication is used for user registration and login.
- Firestore is used for storing user data, app settings, and caching property search results.
- Firebase Admin SDK is used in Vercel serverless functions for secure backend access.
- Store your Firebase credentials as environment variables (never in client code).

### RapidAPI (Realtor API)
- Property data is fetched from a Realtor API via [RapidAPI](https://rapidapi.com/).
- API requests are proxied through Vercel serverless functions to keep your RapidAPI key secret.
- Results can be cached in Firestore to reduce API calls and improve performance.

#### Example API Flow
1. App requests property data from `/api/proxy` endpoint (hosted on Vercel).
2. The function checks Firestore for cached results.
3. If not cached, it fetches from RapidAPI, stores the result in Firestore, and returns it to the app.

---