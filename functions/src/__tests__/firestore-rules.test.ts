// Increase Jest timeout to 20 seconds for long beforeAll delays
// Firestore security rules tests using Firebase Emulator Suite
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'fs';
import path from 'path';
jest.setTimeout(20000);

const PROJECT_ID = 'demo-housing-finder';
const RULES_PATH = '../../../firestore.rules';
// console.log('Loaded Firestore rules from:', require('path').resolve(__dirname, RULES_PATH));
// console.log('Rules content:\n', readFileSync(require('path').resolve(__dirname, RULES_PATH), 'utf8'));

let testEnv: any;


beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(__dirname, RULES_PATH), 'utf8'),
    },
  });
  setLogLevel('error');

  // Create all users once for all tests
  const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
  await agent.firestore().collection('users').doc('agent_uid').set({ id: 'agent_uid', role: 'Agent', firstName: 'Agent', lastName: 'Smith', email: 'agent@example.com' });
  const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
  await client.firestore().collection('users').doc('client_uid').set({ id: 'client_uid', role: 'Client', firstName: 'Client', lastName: 'Jones', email: 'client@example.com' });
  const admin = testEnv.authenticatedContext('admin_uid', { role: 'Admin' });
  await admin.firestore().collection('users').doc('admin_uid').set({ id: 'admin_uid', role: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@example.com' });
  const otherAgent = testEnv.authenticatedContext('other_agent_uid', { role: 'Agent' });
  await otherAgent.firestore().collection('users').doc('other_agent_uid').set({ id: 'other_agent_uid', role: 'Agent', firstName: 'Other', lastName: 'Agent', email: 'otheragent@example.com' });
  // Add a delay to ensure all user docs are indexed
  await new Promise((resolve) => setTimeout(resolve, 3000));
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore Security Rules', () => {
  // Test: Authenticated user can read their own user document
  it('should allow authenticated user to read their own document', async () => {
    const alice = testEnv.authenticatedContext('alice_uid', { role: 'Client' });
    const doc = alice.firestore().collection('users').doc('alice_uid');
    await assertSucceeds(doc.get());
  });

  // Test: Unauthenticated user cannot read any user document
  it('should deny unauthenticated user from reading user documents', async () => {
    const anon = testEnv.unauthenticatedContext();
    const doc = anon.firestore().collection('users').doc('alice_uid');
    await assertFails(doc.get());
  });

  // Test: User cannot write to another user's document
  it('should deny user from writing to another user document', async () => {
    const bob = testEnv.authenticatedContext('bob_uid', { role: 'Client' });
    const doc = bob.firestore().collection('users').doc('alice_uid');
    await assertFails(doc.set({ name: 'Bob' }));
  });
});

describe('Users Collection', () => {
  // User can create their own document
  // Test: User can create their own user document
  it('should allow user to create their own document', async () => {
    const alice = testEnv.authenticatedContext('alice_uid', { role: 'Client' });
    const doc = alice.firestore().collection('users').doc('alice_uid');
    await assertSucceeds(doc.set({ id: 'alice_uid', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', role: 'Client' }));
  });
  // User cannot create another user's document
  // Test: User cannot create another user's document
  it('should deny user from creating another user document', async () => {
    const bob = testEnv.authenticatedContext('bob_uid', { role: 'Client' });
    const doc = bob.firestore().collection('users').doc('alice_uid');
    await assertFails(doc.set({ id: 'alice_uid', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', role: 'Client' }));
  });
  // No one can delete a user document
  // Test: No user can delete a user document
  it('should deny delete for any user', async () => {
    const alice = testEnv.authenticatedContext('alice_uid', { role: 'Client' });
    const doc = alice.firestore().collection('users').doc('alice_uid');
    await assertFails(doc.delete());
  });
});

describe('Minimal Auth Test', () => {
  // Test: Authenticated user can read their own user document (minimal setup)
  it('should allow authenticated user to read their own user document', async () => {
    const user = testEnv.authenticatedContext('testuser', { role: 'Client' });
    await user.firestore().collection('users').doc('testuser').set({ id: 'testuser', role: 'Client', firstName: 'Test', lastName: 'User', email: 'test@example.com' });
    const doc = user.firestore().collection('users').doc('testuser');
    // const snap = await doc.get(); // Removed unused variable
    await assertSucceeds(doc.get());
  });
});

describe('clientRequests Collection', () => {
  // Client can create a request with status Pending
  // Test: Client can create a clientRequest with status Pending
  it('should allow client to create request with status Pending', async () => {
    const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
    const doc = client.firestore().collection('clientRequests').doc('req1');
    const requestData = {
      clientId: 'client_uid',
      realtorId: 'agent_uid',
      status: 'Pending',
      createdAt: Date.now(),
    };
    await assertSucceeds(doc.set(requestData));
  });
  // Client cannot create a request with status Approved
  // Test: Client cannot create a clientRequest with status Approved
  it('should deny client from creating request with status Approved', async () => {
    const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
    const doc = client.firestore().collection('clientRequests').doc('req2');
    await assertFails(doc.set({
      clientId: 'client_uid',
      realtorId: 'agent_uid',
      status: 'Approved',
      createdAt: Date.now(),
    }));
  });
  // Agent can create a request with status Approved
  // Test: Agent can create a clientRequest with status Approved
  it('should allow agent to create request with status Approved', async () => {
    const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
    const doc = agent.firestore().collection('clientRequests').doc('req3');
    await assertSucceeds(doc.set({
      clientId: 'client_uid',
      realtorId: 'agent_uid',
      status: 'Approved',
      createdAt: Date.now(),
    }));
  });
});

describe('clientFavorites Collection', () => {
  // User can create their own favorite
  // Test: User can create their own favorite in clientFavorites
  it('should allow user to create their own favorite', async () => {
    const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
    const doc = client.firestore().collection('clientFavorites').doc('fav1');
    await assertSucceeds(doc.set({ userId: 'client_uid', propertyId: 'property1', savedAt: new Date('2026-03-01T23:08:51.000Z') }));
  });
  // User cannot delete another user's favorite
  // Test: User cannot delete another user's favorite in clientFavorites
  it('should deny user from deleting another user favorite', async () => {
    const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
    const doc = client.firestore().collection('clientFavorites').doc('fav2');
    // Simulate favorite owned by someone else
    await assertFails(doc.delete());
  });
});

describe('clientFavorites Agent Role Access', () => {
	beforeAll(async () => {
	  // Use correct context for user doc creation
	  const admin = testEnv.authenticatedContext('admin_uid', { role: 'Admin' });
	  await admin.firestore().collection('users').doc('admin_uid').set({ id: 'admin_uid', role: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@example.com' });
	  const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
	  await agent.firestore().collection('users').doc('agent_uid').set({ id: 'agent_uid', role: 'Agent', firstName: 'Agent', lastName: 'Smith', email: 'agent@example.com' });
	  const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
	  await client.firestore().collection('users').doc('client_uid').set({ id: 'client_uid', role: 'Client', firstName: 'Client', lastName: 'Jones', email: 'client@example.com' });
	  const otherAgent = testEnv.authenticatedContext('other_agent_uid', { role: 'Agent' });
	  await otherAgent.firestore().collection('users').doc('other_agent_uid').set({ id: 'other_agent_uid', role: 'Agent', firstName: 'Other', lastName: 'Agent', email: 'otheragent@example.com' });
	  // Create a favorite for the client
	  await client.firestore().collection('clientFavorites').doc('fav3').set({ userId: 'client_uid', propertyId: 'property1', savedAt: new Date('2026-03-01T23:08:51.000Z') });
	});
 
	beforeEach(async () => {
	  // Ensure all test users have user docs before each test
	  const admin = testEnv.authenticatedContext('admin_uid', { role: 'Admin' });
	  await admin.firestore().collection('users').doc('admin_uid').set({ id: 'admin_uid', role: 'Admin', firstName: 'Admin', lastName: 'User', email: 'admin@example.com' });
	  const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
	  await agent.firestore().collection('users').doc('agent_uid').set({ id: 'agent_uid', role: 'Agent', firstName: 'Agent', lastName: 'Smith', email: 'agent@example.com' });
	  const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
	  await client.firestore().collection('users').doc('client_uid').set({ id: 'client_uid', role: 'Client', firstName: 'Client', lastName: 'Jones', email: 'client@example.com' });
	  const otherAgent = testEnv.authenticatedContext('other_agent_uid', { role: 'Agent' });
	  await otherAgent.firestore().collection('users').doc('other_agent_uid').set({ id: 'other_agent_uid', role: 'Agent', firstName: 'Other', lastName: 'Agent', email: 'otheragent@example.com' });
	});
 
  // Test: Agent can read a client's favorite in clientFavorites
  it('should allow agent to read client favorite', async () => {
	  const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
	  const doc = agent.firestore().collection('clientFavorites').doc('fav3');
	  await assertSucceeds(doc.get());
	});
 
  // Test: Other agent can read a client's favorite if rules allow all agents
  it('should allow other agent to read client favorite (if rules allow all agents)', async () => {
	  const otherAgent = testEnv.authenticatedContext('other_agent_uid', { role: 'Agent' });
	  const doc = otherAgent.firestore().collection('clientFavorites').doc('fav3');
	  await assertSucceeds(doc.get());
	});
	// If you want to restrict to only assigned agents, update rules and this test to expect assertFails
 });

describe('clientOffers Collection', () => {
	beforeAll(async () => {
	  // Ensure agent and client user docs exist with correct roles
	  const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
	  await agent.firestore().collection('users').doc('agent_uid').set({ id: 'agent_uid', role: 'Agent', firstName: 'Agent', lastName: 'Smith', email: 'agent@example.com' });
	  const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
	  await client.firestore().collection('users').doc('client_uid').set({ id: 'client_uid', role: 'Client', firstName: 'Client', lastName: 'Jones', email: 'client@example.com' });
	});
	beforeEach(async () => {
	  // Ensure the test user always has a user doc before each test
	  const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
	  await agent.firestore().collection('users').doc('agent_uid').set({ id: 'agent_uid', role: 'Agent', firstName: 'Agent', lastName: 'Smith', email: 'agent@example.com' });
	  const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
	  await client.firestore().collection('users').doc('client_uid').set({ id: 'client_uid', role: 'Client', firstName: 'Client', lastName: 'Jones', email: 'client@example.com' });
	});
 
  // Test: Agent can create an offer in clientOffers
  it('should allow agent to create offer', async () => {
	  const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
	  const doc = agent.firestore().collection('clientOffers').doc('offer1');
	  await assertSucceeds(doc.set({
		 clientId: 'A0f8DnJWsrUmBMBIbfGlgJaUPpz2',
		 agentId: 'kmEIaAWw4mhNuPrPMdCC0L4i8823',
		 propertyId: '6658141389',
		 status: 'Offer Accepted',
		 createdAt: new Date('2026-03-04T01:20:33.000Z'),
		 updatedAt: new Date('2026-03-05T17:00:51.000Z'),
		 dueDiligenceStart: new Date('2026-03-05T17:00:00.000Z'),
		 dueDiligenceEnd: new Date('2026-03-19T16:00:00.000Z'),
		 closingDate: new Date('2026-03-20T16:00:00.000Z'),
	  }));
	});
 
  // Test: Client cannot create an offer in clientOffers
  it('should deny client from creating offer', async () => {
	  const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
	  const doc = client.firestore().collection('clientOffers').doc('offer2');
	  await assertFails(doc.set({
		 clientId: 'client_uid',
		 propertyId: 'property1',
		 status: 'Offer Made',
	  }));
	});
 });

describe('helpRequests Collection', () => {
  // Client can create a help request with status Pending
  // Test: Client can create a helpRequest with status Pending
  it('should allow client to create help request with status Pending', async () => {
    const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
    const doc = client.firestore().collection('helpRequests').doc('help1');
    await assertSucceeds(doc.set({ clientId: 'client_uid', realtorId: 'agent_uid', status: 'Pending' }));
  });
  // Client cannot create a help request with status Approved
  // Test: Client cannot create a helpRequest with status Approved
  it('should deny client to create help request with status Approved', async () => {
    const client = testEnv.authenticatedContext('client_uid', { role: 'Client' });
    const doc = client.firestore().collection('helpRequests').doc('help2');
    await assertFails(doc.set({ clientId: 'client_uid', realtorId: 'agent_uid', status: 'Approved' }));
  });
});

describe('properties Collection', () => {
  // Anyone can read a property
  // Test: Anyone (including unauthenticated) can read a property
  it('should allow anyone to read property', async () => {
    const anon = testEnv.unauthenticatedContext();
    const doc = anon.firestore().collection('properties').doc('property1');
    await assertSucceeds(doc.get());
  });
  // No one can create a property
  // Test: No one can create a property
  it('should deny anyone from creating property', async () => {
    const agent = testEnv.authenticatedContext('agent_uid', { role: 'Agent' });
    const doc = agent.firestore().collection('properties').doc('property2');
    await assertFails(doc.set({ id: 'property2' }));
  });
});
