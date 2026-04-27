import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions";
setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin SDK once at the top level before any module imports.
initializeApp();

export * from "./auth";
export * from "./properties";
export * from "./propertiesByLatitude";
export * from "./propertiesByState";
export * from "./notifications";
export * from "./users";
export * from "./clientActions";
export * from "./accountActions";
export * from "./calendar";
