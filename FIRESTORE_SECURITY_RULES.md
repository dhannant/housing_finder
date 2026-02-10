# Firestore Security Rules

This document provides the recommended Firestore security rules for the housing_finder application to ensure secure data storage and access control.

## Overview

The application uses Firebase Firestore to store user data and client-realtor relationship information. The security rules below ensure that:

1. Users can only read/write their own user data
2. Clients can view realtor profiles but cannot modify them
3. Realtors can view client requests assigned to them
4. Proper authentication is enforced for all operations

## Security Rules

To implement these security rules in your Firebase project:

1. Go to the Firebase Console (https://console.firebase.google.com/)
2. Select your project: `leading-edge-realty-app`
3. Navigate to Firestore Database → Rules
4. Replace the existing rules with the following:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Helper function to get user role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Users collection rules
    match /users/{userId} {
      // Allow users to read their own data
      allow read: if isAuthenticated() && isOwner(userId);
      
      // Allow users to create their own profile during registration
      allow create: if isAuthenticated() && isOwner(userId);
      
      // Allow users to update their own profile
      allow update: if isAuthenticated() && isOwner(userId);
      
      // Don't allow deletion of user profiles
      allow delete: if false;
      
      // Allow authenticated users to read realtor profiles
      // This is needed for clients to browse and select realtors
      allow read: if isAuthenticated() && resource.data.role == 'Realtor';
    }
    
    // Client requests collection rules
    match /clientRequests/{requestId} {
      // Allow authenticated users to create requests
      allow create: if isAuthenticated() 
        && request.resource.data.clientId == request.auth.uid;
      
      // Allow clients to read their own requests
      allow read: if isAuthenticated() 
        && resource.data.clientId == request.auth.uid;
      
      // Allow realtors to read requests assigned to them
      allow read: if isAuthenticated() 
        && resource.data.realtorId == request.auth.uid;
      
      // Allow realtors to update the status of requests assigned to them
      allow update: if isAuthenticated() 
        && resource.data.realtorId == request.auth.uid
        && request.resource.data.realtorId == resource.data.realtorId
        && request.resource.data.clientId == resource.data.clientId;
      
      // Don't allow deletion of requests
      allow delete: if false;
    }
    
    // Default deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Rule Explanations

### Users Collection
- **Read**: Users can read their own profile. All authenticated users can read realtor profiles (needed for selection).
- **Create**: Users can create their own profile during registration.
- **Update**: Users can only update their own profile.
- **Delete**: Disabled for data integrity.

### Client Requests Collection
- **Create**: Authenticated users can create requests with their own clientId.
- **Read**: Clients can read their own requests; realtors can read requests assigned to them.
- **Update**: Realtors can update the status of requests assigned to them (prevents changing assignment).
- **Delete**: Disabled for audit trail purposes.

## Testing Security Rules

Before deploying to production, test the security rules using the Firebase Console's Rules Playground or the Firebase Emulator Suite.

### Test Cases

1. **Client can create a request**:
   - Authenticate as a client
   - Try to create a request with their own clientId
   - Should succeed

2. **Client cannot modify other user's data**:
   - Authenticate as a client
   - Try to read/update another user's profile
   - Should fail

3. **Realtor can view assigned requests**:
   - Authenticate as a realtor
   - Try to read requests where realtorId matches their uid
   - Should succeed

4. **Realtor cannot view other realtor's requests**:
   - Authenticate as a realtor
   - Try to read requests assigned to another realtor
   - Should fail

## Best Practices

1. **Authentication First**: Always ensure users are authenticated before granting access.
2. **Principle of Least Privilege**: Grant only the minimum necessary permissions.
3. **Validate Input**: Use security rules to validate data structure and required fields.
4. **Regular Audits**: Periodically review and update security rules as the application evolves.
5. **Use Emulators**: Test security rules locally using Firebase Emulators before deploying.

## Deployment

To deploy these security rules:

1. Save the rules in a file named `firestore.rules`
2. Deploy using Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```

Or update them directly in the Firebase Console as described above.

## Additional Security Considerations

1. **API Keys**: The Firebase API key in `firebaseConfig.ts` is safe to commit (it identifies your Firebase project but doesn't grant access without authentication).

2. **Environment Variables**: For production deployments, consider using environment variables for sensitive configuration.

3. **Rate Limiting**: Implement rate limiting on the client side to prevent abuse.

4. **Data Validation**: Add validation rules to ensure data integrity (e.g., email format, required fields).

5. **Audit Logging**: Consider implementing audit logs for sensitive operations.

## Monitoring

Monitor your Firestore security rules effectiveness by:

1. Checking Firebase Console → Firestore Database → Usage tab
2. Reviewing denied requests in the Firebase Console
3. Setting up alerts for unusual access patterns

## Support

For questions about Firebase security rules, refer to:
- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Security Rules Reference](https://firebase.google.com/docs/rules/rules-language)
