import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { requireFirebase } from "./firebase";
import { collectionRef, documentRef } from "./firebasePaths";
import { normalizeEmail, participationId, type Activity, type Donation, type Donor, type Drive, type DriveDirectory, type Participation, type PublicProfile, type VolunteerDirectory, type VolunteerPrivate, type VolunteerProfile } from "./firebaseModels";

function withId<T>(snapshot: { id: string; data(): DocumentData }): T { return { id: snapshot.id, ...snapshot.data() } as T; }
async function list<T>(name: string, constraints: QueryConstraint[] = []): Promise<T[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collectionRef(db, name), ...constraints));
  return snapshot.docs.map((item) => withId<T>(item));
}
async function save<T extends Record<string, unknown>>(name: string, id: string, value: T) {
  const { db } = requireFirebase();
  await setDoc(documentRef(db, name, id), { ...value, updatedAt: serverTimestamp() }, { merge: true });
}

export const organizationRepository = {
  async get() { const { db } = requireFirebase(); const snapshot = await getDoc(doc(db, "organizations", import.meta.env.VITE_ORGANIZATION_ID || "servebase-main")); return snapshot.exists() ? snapshot.data() : null; },
  async update(value: Record<string, unknown>) { const { db } = requireFirebase(); await updateDoc(doc(db, "organizations", import.meta.env.VITE_ORGANIZATION_ID || "servebase-main"), { ...value, updatedAt: serverTimestamp() }); },
};

export const volunteerRepository = {
  list: () => list<VolunteerProfile>("volunteers", [orderBy("updatedAt", "desc"), limit(100)]),
  get: async (id: string) => { const snapshot = await getDoc(documentRef(requireFirebase().db, "volunteers", id)); return snapshot.exists() ? withId<VolunteerProfile>(snapshot) : null; },
  directory: () => list<VolunteerDirectory>("volunteerDirectory", [orderBy("updatedAt", "desc"), limit(100)]),
  private: (id: string) => getDoc(documentRef(requireFirebase().db, "volunteerPrivate", id)).then((snapshot) => snapshot.exists() ? snapshot.data() as VolunteerPrivate : null),
  async create(id: string, value: Omit<VolunteerProfile, "createdAt" | "updatedAt">, notes?: string) {
    const { db } = requireFirebase();
    const batch = writeBatch(db);
    const volunteerRef = documentRef(db, "volunteers", id);
    const privateRef = documentRef(db, "volunteerPrivate", id);
    const directoryRef = documentRef(db, "volunteerDirectory", id);

    batch.set(volunteerRef, { ...value, updatedAt: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true });
    if (notes) {
      batch.set(privateRef, { volunteerId: id, internalNotes: notes, updatedAt: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true });
    }
    if (value.status === "Active") {
      batch.set(directoryRef, { volunteerId: id, name: value.name, skills: value.skills, availability: value.availability, status: "Active", updatedAt: serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  },
  async update(id: string, value: Partial<VolunteerProfile>, notes?: string) {
    const { db } = requireFirebase();
    const batch = writeBatch(db);
    const volunteerRef = documentRef(db, "volunteers", id);
    batch.set(volunteerRef, { ...value, updatedAt: serverTimestamp() }, { merge: true });
    if (notes !== undefined) {
      const privateRef = documentRef(db, "volunteerPrivate", id);
      batch.set(privateRef, { volunteerId: id, internalNotes: notes, updatedAt: serverTimestamp() }, { merge: true });
    }
    if (value.status === "Active" || value.name || value.skills || value.availability) {
      const directoryRef = documentRef(db, "volunteerDirectory", id);
      batch.set(directoryRef, {
        volunteerId: id,
        ...(value.name ? { name: value.name } : {}),
        ...(value.skills ? { skills: value.skills } : {}),
        ...(value.availability ? { availability: value.availability } : {}),
        ...(value.status ? { status: value.status } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
  },
};

export const donorRepository = {
  list: () => list<Donor>("donors", [orderBy("updatedAt", "desc"), limit(100)]),
  create: (id: string, value: Omit<Donor, "createdAt" | "updatedAt">) => save("donors", id, value as Record<string, unknown>),
  update: (id: string, value: Partial<Donor>) => save("donors", id, value as Record<string, unknown>),
  remove: async (id: string) => { await deleteDoc(documentRef(requireFirebase().db, "donors", id)); },
};

export const donationRepository = {
  list: () => list<Donation>("donations", [orderBy("date", "desc"), limit(100)]),
  create: (id: string, value: Omit<Donation, "createdAt" | "updatedAt">) => save("donations", id, value as Record<string, unknown>),
  update: (id: string, value: Partial<Donation>) => save("donations", id, value as Record<string, unknown>),
  remove: async (id: string) => { await deleteDoc(documentRef(requireFirebase().db, "donations", id)); },
};

export const driveRepository = {
  list: () => list<Drive>("drives", [orderBy("date", "asc"), limit(100)]),
  publicList: () => list<DriveDirectory>("driveDirectory", [where("publicationStatus", "==", "published"), where("publicRegistrationOpen", "==", true), limit(100)]),
  async save(id: string, drive: Record<string, unknown>, directory: Record<string, unknown>) {
    const { db } = requireFirebase();
    const batch = writeBatch(db);
    batch.set(documentRef(db, "drives", id), { ...drive, id, updatedAt: serverTimestamp() }, { merge: true });
    batch.set(documentRef(db, "driveDirectory", id), { ...directory, driveId: id, updatedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
  },
  remove: async (id: string) => { const { db } = requireFirebase(); const batch = writeBatch(db); batch.delete(documentRef(db, "drives", id)); batch.delete(documentRef(db, "driveDirectory", id)); await batch.commit(); },
};

export const participationRepository = {
  listForVolunteer: (volunteerId: string) => list<Participation>("participation", [where("volunteerId", "==", volunteerId), orderBy("updatedAt", "desc"), limit(100)]),
  listForDrive: (driveId: string) => list<Participation>("participation", [where("driveId", "==", driveId), orderBy("createdAt", "asc"), limit(100)]),
  id: participationId,
  async register(value: Omit<Participation, "id" | "createdAt" | "updatedAt" | "registeredAt">) { const { db } = requireFirebase(); const id = participationId(value.driveId, value.volunteerId); await setDoc(documentRef(db, "participation", id), { ...value, id, registeredAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return id; },
};

export const activityRepository = {
  async create(value: Omit<Activity, "id" | "at">) { const { db } = requireFirebase(); const ref = await addDoc(collectionRef(db, "activities"), { ...value, at: serverTimestamp() }); return ref.id; },
};

export { normalizeEmail };
