import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, afterEach, describe, expect, it } from "vitest";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";

const organization = "servebase-main";
const projectId = "demo-servebase-rules";
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
});

afterEach(async () => testEnv.clearFirestore());
afterAll(async () => testEnv.cleanup());

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `organizations/${organization}`), { status: "active", name: "ServeBase" });
    await setDoc(doc(db, `organizations/${organization}/publicProfile/default`), { profileId: "default", displayName: "ServeBase", status: "published" });
    await setDoc(doc(db, `organizations/${organization}/members/admin-1`), { uid: "admin-1", role: "admin", status: "active", volunteerId: "vol-1" });
    await setDoc(doc(db, `organizations/${organization}/members/vol-1`), { uid: "vol-1", role: "volunteer", status: "active", volunteerId: "vol-1" });
    await setDoc(doc(db, `organizations/${organization}/volunteers/vol-1`), { id: "vol-1", authUid: "vol-1", name: "Volunteer", email: "vol@example.org", status: "Active" });
    await setDoc(doc(db, `organizations/${organization}/volunteerPrivate/vol-1`), { volunteerId: "vol-1", internalNotes: "private" });
  });
}

describe("ServeBase Firestore Rules", () => {
  it("allows published public profile reads but not full organization reads", async () => {
    await seed();
    const unauthenticated = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(unauthenticated, `organizations/${organization}/publicProfile/default`)));
    await assertFails(getDoc(doc(unauthenticated, `organizations/${organization}`)));
  });

  it("allows a volunteer to read only their own restricted profile", async () => {
    await seed();
    const volunteer = testEnv.authenticatedContext("vol-1").firestore();
    await assertSucceeds(getDoc(doc(volunteer, `organizations/${organization}/volunteers/vol-1`)));
    await assertFails(getDoc(doc(volunteer, `organizations/${organization}/volunteerPrivate/vol-1`)));
  });

  it("does not allow a volunteer to assign an administrative role", async () => {
    await seed();
    const volunteer = testEnv.authenticatedContext("vol-1").firestore();
    await assertFails(setDoc(doc(volunteer, `organizations/${organization}/members/vol-1`), { role: "admin" }, { merge: true }));
  });

  it("allows a pending volunteer registration batch to create all three required documents", async () => {
    await seed();
    const volunteer = testEnv.authenticatedContext("new-volunteer").firestore();
    const batch = writeBatch(volunteer);
    batch.set(doc(volunteer, `organizations/${organization}/members/new-volunteer`), {
      uid: "new-volunteer", role: "volunteer", status: "pending", volunteerId: "vol-new-volunteer",
    });
    batch.set(doc(volunteer, `organizations/${organization}/volunteers/vol-new-volunteer`), {
      id: "vol-new-volunteer", authUid: "new-volunteer", name: "New Volunteer", status: "Inactive",
    });
    batch.set(doc(volunteer, `organizations/${organization}/volunteerPrivate/vol-new-volunteer`), {
      volunteerId: "vol-new-volunteer", authUid: "new-volunteer",
    });
    await assertSucceeds(batch.commit());
  });

  it("denies the registration batch when the member status is not pending", async () => {
    await seed();
    const volunteer = testEnv.authenticatedContext("active-attempt").firestore();
    const batch = writeBatch(volunteer);
    batch.set(doc(volunteer, `organizations/${organization}/members/active-attempt`), {
      uid: "active-attempt", role: "volunteer", status: "active", volunteerId: "vol-active-attempt",
    });
    batch.set(doc(volunteer, `organizations/${organization}/volunteers/vol-active-attempt`), {
      id: "vol-active-attempt", authUid: "active-attempt", name: "Active Attempt", status: "Active",
    });
    batch.set(doc(volunteer, `organizations/${organization}/volunteerPrivate/vol-active-attempt`), {
      volunteerId: "vol-active-attempt", authUid: "active-attempt",
    });
    await assertFails(batch.commit());
  });

  it("allows a pending volunteer registration with all required and optional form fields mapped correctly", async () => {
    await seed();
    const uid = "full-profile-vol";
    const volunteerId = `vol-${uid}`;
    const volunteer = testEnv.authenticatedContext(uid).firestore();
    const batch = writeBatch(volunteer);
    batch.set(doc(volunteer, `organizations/${organization}/members/${uid}`), {
      uid,
      email: "volunteer@example.org",
      displayName: "Full Profile Volunteer",
      role: "volunteer",
      status: "pending",
      volunteerId,
      providerIds: ["password"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    batch.set(doc(volunteer, `organizations/${organization}/volunteers/${volunteerId}`), {
      id: volunteerId,
      authUid: uid,
      name: "Full Profile Volunteer",
      email: "volunteer@example.org",
      phone: "+91 98765 43210",
      skills: ["Teaching", "Logistics"],
      availability: "Weekends",
      status: "Inactive",
      joinedOn: "2026-11-18",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    batch.set(doc(volunteer, `organizations/${organization}/volunteerPrivate/${volunteerId}`), {
      volunteerId,
      authUid: uid,
      termsAcceptedAt: new Date(),
      termsVersion: "2026-10-26",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assertSucceeds(batch.commit());

    // Verify fields stored and that no sensitive fields (password, photo base64) exist
    const readContext = testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const memberDoc = await getDoc(doc(db, `organizations/${organization}/members/${uid}`));
      const volDoc = await getDoc(doc(db, `organizations/${organization}/volunteers/${volunteerId}`));
      const privDoc = await getDoc(doc(db, `organizations/${organization}/volunteerPrivate/${volunteerId}`));
      
      expect(memberDoc.data()).not.toHaveProperty("password");
      expect(memberDoc.data()).not.toHaveProperty("confirmPassword");
      expect(memberDoc.data()).not.toHaveProperty("photo");
      expect(volDoc.data()).not.toHaveProperty("password");
      expect(volDoc.data()).not.toHaveProperty("photo");
      expect(privDoc.data()).not.toHaveProperty("password");
      
      expect(memberDoc.data()?.status).toBe("pending");
      expect(volDoc.data()?.status).toBe("Inactive");
      expect(volDoc.data()?.phone).toBe("+91 98765 43210");
      expect(volDoc.data()?.skills).toEqual(["Teaching", "Logistics"]);
      expect(volDoc.data()?.availability).toBe("Weekends");
      expect(privDoc.data()?.termsVersion).toBe("2026-10-26");
    });
    await readContext;
  });

  it("denies access to dashboard data for pending volunteers", async () => {
    await seed();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `organizations/${organization}/members/pending-user`), {
        uid: "pending-user", role: "volunteer", status: "pending", volunteerId: "vol-pending-user",
      });
      await setDoc(doc(db, `organizations/${organization}/volunteers/vol-pending-user`), {
        id: "vol-pending-user", authUid: "pending-user", name: "Pending User", email: "pending@example.org", status: "Inactive",
      });
      await setDoc(doc(db, `organizations/${organization}/donors/donor-1`), {
        id: "donor-1", name: "Donor One",
      });
      await setDoc(doc(db, `organizations/${organization}/donations/donation-1`), {
        id: "donation-1", amountPaise: 50000,
      });
    });
    const pendingVolunteer = testEnv.authenticatedContext("pending-user").firestore();
    // Cannot read full organization
    await assertFails(getDoc(doc(pendingVolunteer, `organizations/${organization}`)));
    // Cannot read other volunteers
    await assertFails(getDoc(doc(pendingVolunteer, `organizations/${organization}/volunteers/vol-1`)));
    // Cannot read volunteer directory while pending
    await assertFails(getDoc(doc(pendingVolunteer, `organizations/${organization}/volunteerDirectory/vol-1`)));
    // Cannot read donors
    await assertFails(getDoc(doc(pendingVolunteer, `organizations/${organization}/donors/donor-1`)));
    // Cannot read donations
    await assertFails(getDoc(doc(pendingVolunteer, `organizations/${organization}/donations/donation-1`)));
  });

  it("denies unauthenticated users from registering a volunteer profile", async () => {
    await seed();
    const unauthenticated = testEnv.unauthenticatedContext().firestore();
    const batch = writeBatch(unauthenticated);
    batch.set(doc(unauthenticated, `organizations/${organization}/members/unauth-user`), {
      uid: "unauth-user", role: "volunteer", status: "pending", volunteerId: "vol-unauth-user",
    });
    batch.set(doc(unauthenticated, `organizations/${organization}/volunteers/vol-unauth-user`), {
      id: "vol-unauth-user", authUid: "unauth-user", name: "Unauth User", status: "Inactive",
    });
    batch.set(doc(unauthenticated, `organizations/${organization}/volunteerPrivate/vol-unauth-user`), {
      volunteerId: "vol-unauth-user", authUid: "unauth-user",
    });
    await assertFails(batch.commit());
  });

  it("allows approved volunteer to sign in and read their profile and directory, but not private notes or admin collections", async () => {
    await seed();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `organizations/${organization}/volunteerDirectory/vol-1`), {
        volunteerId: "vol-1", name: "Volunteer", skills: ["Teaching"], availability: "Weekends", status: "Active", updatedAt: new Date(),
      });
      await setDoc(doc(db, `organizations/${organization}/donors/donor-1`), {
        id: "donor-1", name: "Donor One",
      });
    });
    const approvedVolunteer = testEnv.authenticatedContext("vol-1").firestore();
    // Can read own volunteer profile
    await assertSucceeds(getDoc(doc(approvedVolunteer, `organizations/${organization}/volunteers/vol-1`)));
    // Can read volunteer directory
    await assertSucceeds(getDoc(doc(approvedVolunteer, `organizations/${organization}/volunteerDirectory/vol-1`)));
    // Cannot read volunteerPrivate
    await assertFails(getDoc(doc(approvedVolunteer, `organizations/${organization}/volunteerPrivate/vol-1`)));
    // Cannot read donors
    await assertFails(getDoc(doc(approvedVolunteer, `organizations/${organization}/donors/donor-1`)));
    // Cannot change status to admin
    await assertFails(setDoc(doc(approvedVolunteer, `organizations/${organization}/members/vol-1`), { role: "admin" }, { merge: true }));
  });

  it("denies the registration batch when the organization has not been bootstrapped", async () => {
    const volunteer = testEnv.authenticatedContext("unbootstrapped-volunteer").firestore();
    const batch = writeBatch(volunteer);
    batch.set(doc(volunteer, `organizations/${organization}/members/unbootstrapped-volunteer`), {
      uid: "unbootstrapped-volunteer", role: "volunteer", status: "pending", volunteerId: "vol-unbootstrapped-volunteer",
    });
    batch.set(doc(volunteer, `organizations/${organization}/volunteers/vol-unbootstrapped-volunteer`), {
      id: "vol-unbootstrapped-volunteer", authUid: "unbootstrapped-volunteer", name: "New Volunteer", status: "Inactive",
    });
    batch.set(doc(volunteer, `organizations/${organization}/volunteerPrivate/vol-unbootstrapped-volunteer`), {
      volunteerId: "vol-unbootstrapped-volunteer", authUid: "unbootstrapped-volunteer",
    });
    await assertFails(batch.commit());
  });

  it("allows a pending owner to complete profile fields without changing role or status", async () => {
    await seed();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `organizations/${organization}/members/pending-owner`), {
        uid: "pending-owner", role: "volunteer", status: "pending", volunteerId: "vol-pending-owner",
      });
    });
    const volunteer = testEnv.authenticatedContext("pending-owner").firestore();
    await assertSucceeds(setDoc(doc(volunteer, `organizations/${organization}/members/pending-owner`), {
      email: "pending@example.org", displayName: "Pending Owner", providerIds: ["password"],
    }, { merge: true }));
    await assertFails(setDoc(doc(volunteer, `organizations/${organization}/members/pending-owner`), { status: "active" }, { merge: true }));
  });
});
