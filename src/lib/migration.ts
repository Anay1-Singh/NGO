import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { requireFirebase, organizationId } from "./firebase";
import { organizationPath } from "./firebasePaths";
import type { WorkspaceData } from "../components/generated/ServeBaseStore";

const LOCAL_KEY = "servebase-workspace-v1";
const MAX_BATCH = 500;

export type MigrationPreview = {
  volunteers: number;
  donors: number;
  donations: number;
  drives: number;
  participation: number;
  activities: number;
  invalidRecords: string[];
  duplicateRelationships: string[];
  existingDocumentConflicts: string[];
  sourceContainsDemoData: boolean;
};

function readLocalWorkspace(): WorkspaceData {
  const raw = window.localStorage.getItem(LOCAL_KEY);
  if (!raw) throw new Error("No local workspace was found to preview.");
  return JSON.parse(raw) as WorkspaceData;
}

function validDate(value: unknown): value is string { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value); }

export async function previewLocalMigration(): Promise<MigrationPreview> {
  const { db } = requireFirebase();
  const workspace = readLocalWorkspace();
  const invalidRecords: string[] = [];
  const duplicateRelationships: string[] = [];
  const existingDocumentConflicts: string[] = [];
  const seen = new Set<string>();
  for (const volunteer of workspace.volunteers ?? []) if (!volunteer.id || !volunteer.name || !volunteer.email) invalidRecords.push(`volunteer:${volunteer.id || "missing-id"}`);
  for (const donor of workspace.donors ?? []) if (!donor.id || !donor.name) invalidRecords.push(`donor:${donor.id || "missing-id"}`);
  for (const drive of workspace.drives ?? []) if (!drive.id || !validDate(drive.date)) invalidRecords.push(`drive:${drive.id || "missing-id"}`);
  for (const record of workspace.participation ?? []) {
    const key = `${record.driveId}__${record.volunteerId}`;
    if (seen.has(key)) duplicateRelationships.push(key); else seen.add(key);
  }
  for (const [collectionName, records] of [["volunteers", workspace.volunteers], ["donors", workspace.donors], ["drives", workspace.drives]] as const) {
    for (const record of records ?? []) if (record?.id && (await getDoc(doc(db, `${organizationPath}/${collectionName}/${record.id}`))).exists()) existingDocumentConflicts.push(`${collectionName}/${record.id}`);
  }
  return {
    volunteers: workspace.volunteers?.length ?? 0,
    donors: workspace.donors?.length ?? 0,
    donations: workspace.donations?.length ?? 0,
    drives: workspace.drives?.length ?? 0,
    participation: workspace.participation?.length ?? 0,
    activities: workspace.activities?.length ?? 0,
    invalidRecords,
    duplicateRelationships,
    existingDocumentConflicts,
    sourceContainsDemoData: Boolean(workspace.volunteers?.some((item) => item.id === "vol-01" || item.email.endsWith("@example.org"))),
  };
}

export async function migrateLocalWorkspace(explicitAdminConfirmation: boolean): Promise<MigrationPreview> {
  if (!explicitAdminConfirmation) throw new Error("Migration requires explicit administrator confirmation.");
  const { db } = requireFirebase();
  const workspace = readLocalWorkspace();
  let batch = writeBatch(db);
  let operations = 0;
  const commitIfNeeded = async () => { if (operations >= MAX_BATCH) { await batch.commit(); batch = writeBatch(db); operations = 0; } };
  const set = async (path: string, data: Record<string, unknown>) => { batch.set(doc(db, path), data, { merge: true }); operations += 1; await commitIfNeeded(); };
  for (const volunteer of workspace.volunteers ?? []) {
    const volunteerPath = `${organizationPath}/volunteers/${volunteer.id}`;
    await set(volunteerPath, { id: volunteer.id, name: volunteer.name, email: volunteer.email.trim().toLowerCase(), phone: volunteer.phone, skills: volunteer.skills, availability: volunteer.availability, status: volunteer.status, joinedOn: volunteer.joinedOn, ...(volunteer.photo ? {} : {}), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await set(`${organizationPath}/volunteerPrivate/${volunteer.id}`, { volunteerId: volunteer.id, internalNotes: volunteer.notes, termsAcceptedAt: volunteer.termsAcceptedAt ? new Date(volunteer.termsAcceptedAt) : undefined, termsVersion: volunteer.termsVersion, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    if (volunteer.status === "Active") await set(`${organizationPath}/volunteerDirectory/${volunteer.id}`, { volunteerId: volunteer.id, name: volunteer.name, skills: volunteer.skills, availability: volunteer.availability, status: volunteer.status, updatedAt: serverTimestamp() });
  }
  for (const donor of workspace.donors ?? []) await set(`${organizationPath}/donors/${donor.id}`, { id: donor.id, name: donor.name, type: donor.type, email: donor.email, phone: donor.phone, address: donor.address, notes: donor.notes, joinedOn: donor.joinedOn, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  for (const donation of workspace.donations ?? []) await set(`${organizationPath}/donations/${donation.id}`, { id: donation.id, donorId: donation.donorId, type: donation.type === "In-kind" ? "inKind" : "monetary", ...(donation.type === "Monetary" ? { amountPaise: Math.round(donation.amount * 100) } : { estimatedValuePaise: Math.round(donation.amount * 100), itemDescription: donation.notes }), date: donation.date, category: donation.category, notes: donation.notes, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  for (const drive of workspace.drives ?? []) {
    const deadline = validDate(drive.date) ? new Date(`${drive.date}T00:00:00+05:30`) : null;
    const operationalStatus = drive.status.toLowerCase() as "upcoming" | "ongoing" | "completed" | "cancelled";
    await set(`${organizationPath}/drives/${drive.id}`, { id: drive.id, name: drive.name, date: drive.date, timezone: "Asia/Kolkata", location: drive.location, status: operationalStatus, description: drive.description, capacity: drive.capacity, registeredCount: 0, sdg: drive.sdg, registrationDeadlineAt: deadline, publicationStatus: "unpublished", publicRegistrationOpen: false, createdByUid: "migration", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await set(`${organizationPath}/driveDirectory/${drive.id}`, { driveId: drive.id, name: drive.name, date: drive.date, timezone: "Asia/Kolkata", location: drive.location, description: drive.description, operationalStatus, publicationStatus: "unpublished", publicRegistrationOpen: false, sdg: drive.sdg, capacity: drive.capacity, updatedAt: serverTimestamp() });
  }
  for (const record of workspace.participation ?? []) await set(`${organizationPath}/participation/${record.driveId}__${record.volunteerId}`, { id: `${record.driveId}__${record.volunteerId}`, volunteerId: record.volunteerId, driveId: record.driveId, role: record.role, status: record.status.toLowerCase(), hours: record.hours, notes: record.notes, registeredByUid: "migration", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  for (const activity of workspace.activities ?? []) await set(`${organizationPath}/activities/${activity.id}`, { id: activity.id, action: "migration.imported", kind: activity.kind, actorUid: "migration", title: activity.title, detail: activity.detail, at: new Date(activity.at), source: "clientActivity", trusted: false });
  await batch.commit();
  return previewLocalMigration();
}

export { organizationId };
