import { Timestamp } from "firebase/firestore";

export type Role = "admin" | "coordinator" | "volunteer";
export type AccountStatus = "pending" | "active" | "suspended";
export type OrganizationStatus = "active" | "suspended";
export type VolunteerStatus = "Active" | "Inactive";
export type Availability = "Weekdays" | "Weekends" | "Flexible";
export type DriveStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type PublicationStatus = "published" | "unpublished";
export type ParticipationStatus = "registered" | "attended" | "absent" | "withdrawn";

export interface Organization { name: string; slug: string; timezone: "Asia/Kolkata"; currency: "INR"; adminName: string; adminEmail: string; phone?: string; address?: string; status: OrganizationStatus; createdAt: Timestamp; updatedAt: Timestamp; }
export interface Member { uid: string; email: string; displayName: string; role: Role; status: AccountStatus; volunteerId?: string; photoPath?: string; providerIds: string[]; lastLoginAt?: Timestamp; createdAt: Timestamp; updatedAt: Timestamp; }
export interface VolunteerProfile { id: string; authUid?: string; name: string; email: string; phone?: string; volunteerCode?: string; skills: string[]; availability: Availability; status: VolunteerStatus; joinedOn: string; photoPath?: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface VolunteerPrivate { volunteerId: string; authUid?: string; internalNotes?: string; termsAcceptedAt?: Timestamp; termsVersion?: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface VolunteerDirectory { volunteerId: string; name: string; volunteerCode?: string; skills: string[]; availability: Availability; photoPath?: string; status: VolunteerStatus; updatedAt: Timestamp; }
export interface PublicProfile { profileId: string; displayName: string; publicDescription?: string; publicContactEmail?: string; publicWebsite?: string; publicPhone?: string; publicAddress?: string; status: PublicationStatus; updatedAt: Timestamp; }
export interface DriveDirectory { driveId: string; name: string; date: string; startAt?: Timestamp; timezone: "Asia/Kolkata"; location: string; description?: string; operationalStatus: DriveStatus; publicationStatus: PublicationStatus; sdg: "SDG 1" | "SDG 11" | "SDG 17"; capacity?: number; publicRegistrationOpen: boolean; updatedAt: Timestamp; }
export interface Donor { id: string; name: string; type: "Individual" | "Institutional"; email: string; phone: string; address?: string; notes?: string; joinedOn: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface Donation { id: string; donorId: string; type: "monetary" | "inKind"; amountPaise?: number; estimatedValuePaise?: number; date: string; category: string; itemDescription?: string; notes?: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface Drive { id: string; name: string; date: string; startAt?: Timestamp; endAt?: Timestamp; timezone: "Asia/Kolkata"; location: string; description?: string; status: DriveStatus; capacity: number; registeredCount: number; sdg: "SDG 1" | "SDG 11" | "SDG 17"; registrationDeadlineAt: Timestamp; publicationStatus: PublicationStatus; publicRegistrationOpen: boolean; createdByUid: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface Participation { id: string; volunteerId: string; driveId: string; role: string; status: ParticipationStatus; hours: number; notes?: string; registeredAt: Timestamp; registeredByUid: string; attendanceUpdatedAt?: Timestamp; attendanceUpdatedByUid?: string; withdrawnAt?: Timestamp; createdAt: Timestamp; updatedAt: Timestamp; }
export interface WithdrawalHistory { withdrawalId: string; participationId: string; previousStatus: ParticipationStatus; withdrawnAt: Timestamp; withdrawnByUid: string; reason?: string; }
export interface Activity { id: string; action: string; kind: string; actorUid: string; targetCollection?: string; targetId?: string; title: string; detail?: string; at: Timestamp; source: "clientActivity" | "trustedAudit"; trusted: boolean; }

export function normalizeEmail(email: string): string { return email.trim().toLocaleLowerCase("en-US").normalize("NFKC"); }
export function participationId(driveId: string, volunteerId: string): string { return `${driveId}__${volunteerId}`; }
