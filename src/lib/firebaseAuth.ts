import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { firebaseConfigStatus, requireFirebase, organizationId } from "./firebase";
import { collectionRef, documentRef, organizationRef } from "./firebasePaths";
import { normalizeEmail, type Member } from "./firebaseModels";

export function subscribeToAuth(listener: (user: User | null) => void) {
  const { auth } = requireFirebase();
  return onAuthStateChanged(auth, listener);
}

export async function signIn(email: string, password: string): Promise<User> {
  const { auth } = requireFirebase();
  const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return result.user;
}

export async function signOutCurrentUser(): Promise<void> {
  const { auth } = requireFirebase();
  await signOut(auth);
}

export async function sendReset(email: string): Promise<void> {
  const { auth } = requireFirebase();
  await sendPasswordResetEmail(auth, normalizeEmail(email));
}

export async function getMember(uid: string): Promise<Member | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(documentRef(db, "members", uid));
  return snapshot.exists() ? (snapshot.data() as Member) : null;
}

export type VolunteerRegistrationInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  volunteerCode?: string;
  skills: string[];
  availability: "Weekdays" | "Weekends" | "Flexible";
  termsVersion: string;
};

export type RegistrationDraft = Omit<VolunteerRegistrationInput, "password">;

const registrationDraftKey = (email: string) => `servebase-volunteer-registration-${normalizeEmail(email)}`;

export function saveRegistrationDraft(input: RegistrationDraft): void {
  try { sessionStorage.setItem(registrationDraftKey(input.email), JSON.stringify(input)); } catch { /* A retry can still be attempted manually. */ }
}

export function readRegistrationDraft(email: string): RegistrationDraft | null {
  try {
    const raw = sessionStorage.getItem(registrationDraftKey(email));
    return raw ? JSON.parse(raw) as RegistrationDraft : null;
  } catch { return null; }
}

export function clearRegistrationDraft(email: string): void {
  try { sessionStorage.removeItem(registrationDraftKey(email)); } catch { /* best effort */ }
}

export function firebaseErrorDetails(error: unknown): { code: string; message: string } {
  if (error instanceof FirebaseError) return { code: error.code, message: error.message };
  if (error instanceof Error) return { code: "unknown", message: error.message };
  return { code: "unknown", message: "Unknown Firebase error." };
}

export class VolunteerProfileSetupError extends Error {
  readonly code: string;
  readonly firebaseMessage: string;
  readonly uid: string;
  readonly volunteerId: string;
  readonly originalError: unknown;
  constructor(error: unknown, uid: string, volunteerId: string) {
    const details = firebaseErrorDetails(error);
    super(`Firestore profile setup failed (${details.code}): ${details.message}`);
    this.name = "VolunteerProfileSetupError";
    this.code = details.code;
    this.firebaseMessage = details.message;
    this.uid = uid;
    this.volunteerId = volunteerId;
    this.originalError = error;
  }
}

async function writeVolunteerProfileDocuments(input: RegistrationDraft, uid: string, volunteerId: string): Promise<void> {
  const { db } = requireFirebase();
  const email = normalizeEmail(input.email);
  const memberRef = documentRef(db, "members", uid);
  const volunteerRef = documentRef(db, "volunteers", volunteerId);
  const privateRef = documentRef(db, "volunteerPrivate", volunteerId);
  const existingMember = await getDoc(memberRef);
  if (existingMember.exists()) {
    const existing = existingMember.data() as Partial<Member>;
    if (existing.role !== "volunteer" || (existing.status !== "pending" && existing.status !== undefined)) {
      throw new Error("This Firebase account already has a non-pending member profile. Contact an administrator.");
    }
  }
  const batch = writeBatch(db);
  batch.set(memberRef, {
    uid,
    email,
    displayName: input.name.trim(),
    role: "volunteer",
    status: "pending",
    volunteerId,
    providerIds: ["password"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(volunteerRef, {
    id: volunteerId,
    authUid: uid,
    name: input.name.trim(),
    email,
    phone: input.phone?.trim() || "",
    volunteerCode: input.volunteerCode?.trim() || "",
    skills: input.skills,
    availability: input.availability,
    status: "Inactive",
    joinedOn: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(privateRef, {
    volunteerId,
    authUid: uid,
    termsAcceptedAt: serverTimestamp(),
    termsVersion: input.termsVersion,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  try { await batch.commit(); } catch (error) { throw new VolunteerProfileSetupError(error, uid, volunteerId); }
}

export async function completeVolunteerProfile(uid: string, input: RegistrationDraft) {
  const volunteerId = `vol-${uid}`;
  await writeVolunteerProfileDocuments(input, uid, volunteerId);
  clearRegistrationDraft(input.email);
  return { uid, volunteerId };
}

export async function registerVolunteer(input: VolunteerRegistrationInput) {
  const { auth } = requireFirebase();
  const email = normalizeEmail(input.email);
  saveRegistrationDraft({ ...input, email });
  const credential = await createUserWithEmailAndPassword(auth, email, input.password);
  const uid = credential.user.uid;
  const volunteerId = `vol-${uid}`;
  await writeVolunteerProfileDocuments({ ...input, email }, uid, volunteerId);
  clearRegistrationDraft(email);
  await signOut(auth);
  return { user: credential.user, uid, volunteerId };
}

export async function approveVolunteer(volunteerId: string, uid: string) {
  const { db } = requireFirebase();
  const memberRef = documentRef(db, "members", uid);
  const volunteerRef = documentRef(db, "volunteers", volunteerId);
  const directoryRef = documentRef(db, "volunteerDirectory", volunteerId);
  const batch = writeBatch(db);
  batch.update(memberRef, { status: "active", updatedAt: serverTimestamp() });
  batch.update(volunteerRef, { status: "Active", updatedAt: serverTimestamp() });
  const volunteer = await getDoc(volunteerRef);
  if (!volunteer.exists()) throw new Error("Volunteer profile was not found.");
  const data = volunteer.data();
  batch.set(directoryRef, {
    volunteerId,
    name: data.name,
    skills: data.skills,
    availability: data.availability,
    status: "Active",
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function approveVolunteerByEmailOrId(volunteerId: string, email: string) {
  if (!firebaseConfigStatus.configured) return;
  const { db } = requireFirebase();
  const normalized = normalizeEmail(email);
  const membersQuery = query(collectionRef(db, "members"), where("email", "==", normalized));
  const snapshot = await getDocs(membersQuery);
  const batch = writeBatch(db);
  const volunteerRef = documentRef(db, "volunteers", volunteerId);
  const directoryRef = documentRef(db, "volunteerDirectory", volunteerId);

  batch.update(volunteerRef, { status: "Active", updatedAt: serverTimestamp() });

  if (!snapshot.empty) {
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { status: "active", updatedAt: serverTimestamp() });
    });
  }

  const volSnap = await getDoc(volunteerRef);
  if (volSnap.exists()) {
    const data = volSnap.data();
    batch.set(directoryRef, {
      volunteerId,
      name: data.name || "",
      skills: data.skills || [],
      availability: data.availability || "Flexible",
      status: "Active",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
}

export { organizationId, organizationRef };
