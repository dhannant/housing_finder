// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Use dynamic import for node-fetch to support CommonJS (Vercel default)
// const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
const fetch: any = (...args) => import('node-fetch').then(mod => mod.default(...args));
// const fetch: typeof import('node-fetch') = (...args: [RequestInfo, RequestInit?]) =>
//   import('node-fetch').then(mod => mod.default(...args));

// Initialize Firebase Admin SDK (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { search } = req.query;
  if (!search) {
    return res.status(400).json({ error: 'Missing search parameter' });
  }

  // 1. Check Firestore cache
  const cacheRef = db.collection('properties_cache').doc(String(search));
  const cacheDoc = await cacheRef.get();
  if (cacheDoc.exists) {
    console.log('Returning data from Firestore cache');
  }

  console.log('Firestore cache is empty');
  // 2. Fetch from RapidAPI (currently hardcoded for Commerce, GA)
  // In production, update to use search/location parameter dynamically
  const rapidApiUrl = 'https://realtor16.p.rapidapi.com/search/forsale?location=commerce%2C%20ga&search_radius=0';
  console.log('RapidAPI request URL:', rapidApiUrl);
  console.log('RapidAPI request headers:', {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'realtor16.p.rapidapi.com',
  });
  const rapidApiRes = await fetch(rapidApiUrl, {
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
      'X-RapidAPI-Host': 'realtor16.p.rapidapi.com',
    },
  });

  if (!rapidApiRes.ok) {
    const errorText = await rapidApiRes.text();
    console.error('RapidAPI request failed:', errorText);
    return res.status(rapidApiRes.status).json({ error: 'RapidAPI request failed', details: errorText });
  }

  const apiData = await rapidApiRes.json();
  console.log('Raw RapidAPI response:', JSON.stringify(apiData, null, 2));

  // Try to parse both properties[] and agents[] for debugging
  let properties: any[] = [];
  if (apiData.properties && Array.isArray(apiData.properties)) {
    properties = apiData.properties.map((property: any) => ({
      id: property.property_id,
      price: property.list_price,
      address: property.location?.address?.line || 'Address not available',
      beds: property.description?.beds,
      baths: property.description?.baths,
      latitude: property.location?.address?.coordinate?.lat,
      longitude: property.location?.address?.coordinate?.lon,
      status: property.status,
      type: property.description?.type,
      photos: property.photos || [],
      primaryPhoto: property.primary_photo?.href || null,
    }));
    console.log('Parsed properties:', properties.length);
  } else if (apiData.data?.search_agents?.agents && Array.isArray(apiData.data.search_agents.agents)) {
    // If the response is for agents, log the count and a sample
    console.log('Parsed agents:', apiData.data.search_agents.agents.length);
    console.log('Sample agent:', JSON.stringify(apiData.data.search_agents.agents[0], null, 2));
  } else {
    console.warn('No properties or agents found in API response.');
  }

  // Store the formatted data in Firestore
  await cacheRef.set({ properties });

  return res.status(200).json({ source: 'api', data: { properties } });
}