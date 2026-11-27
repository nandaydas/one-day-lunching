import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAdminAuth, getAdminFirestore, getAdminStorage } from "./admin";

describe("firebase admin emulator environment sync", () => {
  const prevEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    process.env.FIREBASE_PROJECT_ID = "nimantro-19df2";
  });

  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it("does not inject emulator hosts when NEXT_PUBLIC_USE_EMULATORS is not true", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_USE_EMULATORS = "false";

    getAdminAuth();
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBeUndefined();
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeUndefined();
    expect(process.env.FIREBASE_STORAGE_EMULATOR_HOST).toBeUndefined();
  });

  it("populates auth, firestore, and storage emulator hosts in dev when NEXT_PUBLIC_USE_EMULATORS=true", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_USE_EMULATORS = "true";

    const auth = getAdminAuth();
    const db = getAdminFirestore();
    const storage = getAdminStorage();

    expect(auth).toBeDefined();
    expect(db).toBeDefined();
    expect(storage).toBeDefined();
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBe("127.0.0.1:9099");
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe("127.0.0.1:8080");
    expect(process.env.FIREBASE_STORAGE_EMULATOR_HOST).toBe("127.0.0.1:9199");
  });
});
