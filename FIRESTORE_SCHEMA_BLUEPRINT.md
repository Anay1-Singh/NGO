# ServeBase Firestore Schema Blueprint

Status: design documentation only  
Prepared: 2026-11-01  
Source basis: DATABASE_FIELD_AUDIT.md, src/components/generated/ServeBaseStore.tsx, and the current frontend implementation.

This document defines the proposed Firestore model. It does not initialize Firebase, create collections, deploy rules, install packages, or modify application code.

## 1. Design principles

- Every operational document is scoped under organizations/{organizationId}.
- Firebase Authentication owns identity and credentials. Firestore stores authorization and application profiles.
- A Firebase Auth UID is the stable member identity. Email is a mutable login/contact attribute, not a document ID.
- Roles are admin, coordinator, and volunteer.
- Account statuses are pending, active, and suspended.
- Firestore reads return complete documents; volunteer profiles and directory-safe data therefore use separate collections.
- The volunteers collection is readable only by admin, coordinator and the profile owner. The volunteerDirectory collection contains only safe team-directory fields.
- volunteerPrivate is readable only by admin and coordinator.
- Public users read only explicit publicProfile and driveDirectory projections; they never read the full organization or drives documents.
- Participation uses a deterministic document ID derived from drive ID and volunteer ID.
- Registration, duplicate prevention, and capacity changes use Firestore transactions.
- Monetary values are integer paise. INR is the only supported currency initially.
- Business dates are date-only strings in Asia/Kolkata. Event timestamps use Firestore Timestamp.
- Profile images are stored in Firebase Storage; Firestore stores a Storage path and optional download URL, never base64 image data.
- Google sign-in may be added later through Firebase Auth provider linking without changing the UID/member model.

## 2. Complete collection hierarchy

~~~text
organizations/{organizationId}
  members/{uid}
  publicProfile/{profileId}
  volunteers/{volunteerId}
  volunteerDirectory/{volunteerId}
  volunteerPrivate/{volunteerId}
  donors/{donorId}
  donations/{donationId}
  drives/{driveId}
  participation/{participationId}
  activities/{activityId}
  volunteerEmailIndex/{emailHash}
  donorEmailIndex/{emailHash} (optional future uniqueness)
  participation/{participationId}/withdrawals/{withdrawalId}
  reportSnapshots/{snapshotId}                 optional
~~~

The organization document contains organization profile/settings. The subcollections contain organization-scoped records. There is no global collection that grants access to organization data. Unauthenticated users never read the complete organization document or complete drives collection.

Recommended Storage hierarchy:

~~~text
organizations/{organizationId}/volunteers/{volunteerId}/profile.jpg
~~~

Cloud photo uploads are deferred while the project remains on Spark. The Storage path must eventually be checked against both the authenticated UID and the member's organization/role in Storage Rules.

## 3. Organization document

Path: organizations/{organizationId}

| Field | Firestore type | Required | Constraints/meaning |
|---|---|---:|---|
| name | string | yes | 1–120 characters; current UI organizationName |
| slug | string | yes | Unique application slug if public URLs are added; normalized lowercase |
| timezone | string | yes | Fixed initially to Asia/Kolkata |
| currency | string | yes | Fixed initially to INR |
| adminName | string | yes initially | Transitional field matching current settings; long-term administrator identity belongs to members |
| adminEmail | string | yes initially | Valid email; transitional contact field |
| phone | string | no | Max 24 characters under current settings UI |
| address | string | no | Max 240 characters under current settings UI |
| status | string | yes | active or suspended |
| createdAt | timestamp | yes | Server timestamp |
| updatedAt | timestamp | yes | Server timestamp |

The current WorkspaceSettings interface has no organization ID, slug, timezone or currency. Those are required backend additions.

### Product requirements versus implementation limitations

Product requirements are the intended behavior: public users see only explicitly approved safe projections; volunteers see only their own restricted data plus safe directory/drive data; registrations are deadline- and capacity-eligible; withdrawal is auditable; and security-sensitive audit records are trusted.

Current implementation limitations are facts about the existing prototype/platform: the React app uses one LocalStorage workspace, searches arrays in memory, generates random participation IDs, deletes registrations on withdrawal, stores photos as data URLs, has no Firebase Auth, and has no Firestore queries or Security Rules. These limitations must not be mistaken for approved product behavior.

### Initial organization and admin bootstrap

For the first version, configure exactly one organizationId in trusted application configuration. Keep every collection and rule organization-scoped so future multi-organization support does not require a data-model rewrite.

Provisioning must occur through a trusted setup process:

1. Create the first organization document with its fixed organizationId, active status, Asia/Kolkata timezone and INR currency.
2. Create the first Firebase Authentication user through the trusted setup process.
3. Provision organizations/{organizationId}/members/{firstUid} with role admin and status active through that same trusted process.
4. Create or link the first administrator contact fields.
5. Only after the member document exists, allow normal client access for that organization.

No client rule may let an unauthenticated or ordinary authenticated user assign admin or coordinator to themselves. The bootstrap path must be out-of-band and finite, not a permanent insecure rules exception. Use a one-time controlled operator workflow or pre-created Auth UID, then remove or disable the bootstrap mechanism.

Volunteers may create restricted pending accounts or submit pending applications. An admin approves volunteer access and creates/links the active member document. Coordinators are invited or created by an admin; they cannot self-assign coordinator.

## 4. Public-safe projections

### 4.1 publicProfile

Path: organizations/{organizationId}/publicProfile/{profileId}

This collection is the only organization information available to unauthenticated users. It must contain only approved public copy; it must not mirror the organization document.

| Field | Type | Required | Constraints |
|---|---|---:|---|
| profileId | string | yes | Use default for the first public profile |
| displayName | string | yes | Public organization name; max 120 |
| publicDescription | string | no | Public-safe description; max 5,000 |
| publicContactEmail | string | no | Only if the organization explicitly approves publication |
| publicWebsite | string | no | Valid HTTPS URL if used |
| publicPhone | string | no | Only if explicitly approved; never copy admin-only phone automatically |
| publicAddress | string | no | Only if explicitly approved |
| status | string | yes | published or unpublished |
| updatedAt | timestamp | yes | Server timestamp |

Unauthenticated reads are limited to documents with status=published. Security Rules must not grant unauthenticated read access to organizations/{organizationId} itself.

### 4.2 driveDirectory

Path: organizations/{organizationId}/driveDirectory/{driveId}

This is the public-safe projection of a drive. It is not the full drives document.

| Field | Type | Required | Constraints |
|---|---|---:|---|
| driveId | string | yes | Must equal document ID |
| name | string | yes | Public-safe drive name; max 200 |
| date | string date-only | yes | YYYY-MM-DD |
| startAt | timestamp | no | Only if public |
| timezone | string | yes | Asia/Kolkata initially |
| location | string | yes | Public-safe location; max 500 |
| description | string | no | Public-safe description; max 10,000 |
| operationalStatus | string enum | yes | upcoming, ongoing, completed or cancelled; copied from the operational drive status |
| publicationStatus | string enum | yes | published or unpublished; independent of operationalStatus |
| sdg | string enum | yes | SDG 1, SDG 11 or SDG 17 |
| capacity | integer | no | Only if the product chooses to publish availability |
| publicRegistrationOpen | boolean | yes | Explicit public visibility flag |
| updatedAt | timestamp | yes | Server timestamp |

Unauthenticated users may read only driveDirectory documents where publicationStatus=published, operationalStatus is upcoming or ongoing, and publicRegistrationOpen=true. Cancelled or unpublished drives are not publicly visible. They must not read drives, participation, capacity counters, coordinator notes, internal location details or full organization documents.

### 4.3 Public projection synchronization

The operational drives/{driveId} document is authoritative. driveDirectory/{driveId} is a deliberately selected public projection and must never contain private drive fields such as coordinatorUid, registeredCount, internal meeting details, private notes, attendance or member references.

The following lifecycle operations must synchronize both documents:

- drive creation: create the operational drive and its projection in one atomic batch;
- drive editing: update only the approved projection fields in the same batch as the operational edit;
- publication: set driveDirectory.publicationStatus=published and publicRegistrationOpen according to the approved product state;
- unpublication: set publicationStatus=unpublished and publicRegistrationOpen=false;
- cancellation: set drives.status=cancelled and driveDirectory.operationalStatus=cancelled, publicationStatus=unpublished and publicRegistrationOpen=false.

For the Spark-based client implementation, use an atomic Firestore batch write with Security Rules validating the actor role, organization/member status, document IDs, allowed projection fields and the required cancellation/unpublication relationship. A client batch is atomic but is not inherently trusted; Rules must reject partial or private-field projection writes. A future trusted backend may own projection synchronization, but v1 must keep the client batch and rules consistent.

## 5. Members and roles

Path: organizations/{organizationId}/members/{uid}

The document ID is the Firebase Authentication UID.

| Field | Type | Required | Constraints |
|---|---|---:|---|
| uid | string | yes | Must equal document ID and request.auth.uid when self-managed |
| email | string | yes | Auth email snapshot; lowercase comparison copy |
| displayName | string | yes | 1–200 characters |
| role | string enum | yes | admin, coordinator, volunteer |
| status | string enum | yes | pending, active, suspended |
| volunteerId | string | no | Required for volunteer role after profile creation |
| photoPath | string | no | Storage path only |
| providerIds | string array | yes | auth provider IDs, for example password and google.com |
| lastLoginAt | timestamp | no | Auth-trigger/application-maintained |
| createdAt | timestamp | yes | Server timestamp |
| updatedAt | timestamp | yes | Server timestamp |

### Role semantics

- admin: organization owner/administrator; manages members, settings, all operational records and security-sensitive actions.
- coordinator: manages volunteers, drives and attendance/participation. Donor and donation access is read-only by default and requires explicit product approval for edits. Coordinators cannot manage membership, roles, account status or organization settings.
- volunteer: reads permitted drive information, manages only approved fields in their own profile, registers/withdraws only their own eligible participation, and reads only their own service records.

Difference from the previous proposal: coordinator donor/donation management is narrowed to read-only, and volunteer access to other profiles is narrowed from proposed limited profile reads to volunteerDirectory-only reads.

### Account lifecycle

- pending: Auth account exists or invitation is issued, but access is not active.
- active: permitted operations for the assigned role.
- suspended: no operational reads/writes except a narrowly scoped account/status response if needed.

## 6. Volunteer and volunteerPrivate

### 6.1 Restricted volunteer profile

Path: organizations/{organizationId}/volunteers/{volunteerId}

Firestore returns the complete document on a read. This collection must therefore not be used as the team directory. It is readable only by admin, coordinator and the profile owner. Internal notes, email and phone are not exposed to other volunteers.

| Field | Type | Required | Constraints |
|---|---|---:|---|
| id | string | yes | Transitional copy of document ID; must equal document ID |
| authUid | string | no | Present when linked to a Firebase account; immutable after linking |
| name | string | yes | 2–200 characters |
| email | string | yes | Valid email; normalized lookup copy may also be stored |
| phone | string | no | 7–15 digits after stripping formatting; max 60 |
| skills | string array | yes | At most 30 unique skills; each max 100 characters |
| availability | string enum | yes | Weekdays, Weekends, Flexible |
| status | string enum | yes | Active, Inactive; backend account status remains in members |
| joinedOn | string date-only | yes | YYYY-MM-DD, Asia/Kolkata |
| photoPath | string | no | Firebase Storage path; replaces current photo data URL |
| photoUpdatedAt | timestamp | no | Server timestamp |
| createdAt | timestamp | yes | Server timestamp |
| updatedAt | timestamp | yes | Server timestamp |

The frontend currently has optional photo, termsAcceptedAt and termsVersion on Volunteer. Terms metadata belongs in volunteerPrivate or a dedicated consent record, not in the public/team-readable profile.

### 6.2 Volunteer directory

Path: organizations/{organizationId}/volunteerDirectory/{volunteerId}

This is the only collection intended for a safe team directory. It contains no email, phone, internal notes, authentication identifiers or private consent data.

| Field | Type | Required | Constraints |
|---|---|---:|---|
| volunteerId | string | yes | Must equal document ID |
| name | string | yes | 2–200 characters |
| skills | string array | yes | At most 30 unique skills; each max 100 characters |
| availability | string enum | yes | Weekdays, Weekends, Flexible |
| photoPath | string | no | Storage path only if/when Storage is enabled |
| status | string enum | yes | Active or Inactive |
| updatedAt | timestamp | yes | Server timestamp |

Other volunteers may read only directory documents and only while their member status is active. The current frontend uses skills/availability in role suggestions; those values can be sourced from this safe collection.

### 6.3 Private volunteer document

Path: organizations/{organizationId}/volunteerPrivate/{volunteerId}

| Field | Type | Required | Constraints |
|---|---|---:|---|
| volunteerId | string | yes | Must equal document ID and volunteers reference |
| authUid | string | no | Must match members.volunteerId linkage when present |
| internalNotes | string | no | Coordinator/admin only; max 10,000 to match current notes validation |
| termsAcceptedAt | timestamp | no | Server timestamp captured at acceptance |
| termsVersion | string | no | Version such as 2026-10-26 |
| emergencyContact | map | no | Future addition; not collected by current UI |
| coordinatorNotes | string | no | Future addition; private operational notes |
| createdAt | timestamp | yes | Server timestamp |
| updatedAt | timestamp | yes | Server timestamp |

The current interface uses Volunteer.notes for internal notes. That field must be removed from the volunteer-readable interface and mapped only into volunteerPrivate. Email and phone remain restricted fields in volunteers and are not copied to volunteerDirectory.

## 7. Donors

Path: organizations/{organizationId}/donors/{donorId}

| Field | Type | Required | Constraints |
|---|---|---:|---|
| id | string | yes | Transitional copy of document ID |
| name | string | yes | 2–200 characters; organization name for Institutional |
| type | string enum | yes | Individual or Institutional |
| email | string | yes | Valid email; donor-contact field only; uniqueness is separate from volunteer/Auth email uniqueness |
| phone | string | yes in current admin form | 7–15 digits after stripping formatting; current UI requires it |
| address | string | no | Max 1,000 characters |
| notes | string | no | Coordinator/admin-only; max 10,000 |
| joinedOn | string date-only | yes | Valid date not in the future; Asia/Kolkata |
| createdAt | timestamp | yes | Server timestamp |
| updatedAt | timestamp | yes | Server timestamp |

The current frontend searches donor name, email, phone and address in memory. Firestore does not provide arbitrary contains search; see the search limitation in the index section.

### Email normalization and uniqueness

Normalize email for comparisons with trim, Unicode-safe lowercase and a documented normalization policy. Preserve the display email separately if original casing is important.

- Volunteer email uniqueness: Firebase Auth guarantees uniqueness for authenticated email accounts. For pre-account volunteer records, reserve organizations/{organizationId}/volunteerEmailIndex/{emailHash} transactionally with ownerId=volunteerId. Release or update the reservation transactionally when the email changes or the volunteer record is removed.
- Donor email uniqueness: donor contact emails are not Auth identities and are non-enforced in v1. Multiple donors may share the same contact email. Keep donorEmailIndex optional and reserved for a future uniqueness requirement; it is not part of v1 donor writes. A donor reservation and volunteer reservation may coexist even when normalized emails are identical.
- Each email-index reservation must include organizationId, normalizedEmail or a protected comparison value, ownerId, status, createdAt and updatedAt. No client may overwrite another owner’s reservation.

Both email-index collections are restricted to authorized administrative or trusted operations. Ordinary volunteers must not read, enumerate or write either index. A hash or safe encoding protects the document path from containing the raw email, but it does not make an email anonymous: low-entropy email values can be guessed and hashed offline. Minimize access, avoid exposing normalizedEmail to clients, and use a trusted operation for reservation release or repair.

The frontend currently checks volunteer email uniqueness in memory and does not enforce donor email uniqueness. V1 volunteer account email uniqueness is governed by Firebase Authentication, with volunteerEmailIndex for pre-account volunteer records. Donor email uniqueness is explicitly not enforced in v1.

## 8. Donations and contributions

Path: organizations/{organizationId}/donations/{donationId}

### Common fields

| Field | Type | Required | Constraints |
|---|---|---:|---|
| id | string | yes | Transitional copy of document ID |
| donorId | string | yes | Must reference organizations/{organizationId}/donors/{donorId} |
| type | string enum | yes | monetary or inKind; current UI values Monetary/In-kind require normalization |
| date | string date-only | yes | YYYY-MM-DD, not after current Asia/Kolkata date |
| category | string | yes | 1–200 characters |
| notes | string | no | Max 10,000; required for in-kind item description |
| createdByUid | string | yes | Member UID |
| createdAt | timestamp | yes | Server timestamp |
| updatedAt | timestamp | yes | Server timestamp |

### Monetary contribution fields

| Field | Type | Required | Constraints |
|---|---|---:|---|
| amountPaise | integer | yes | Positive; INR paise; current maximum is ₹1 trillion, represented as 100000000000000 paise |
| currency | string | yes | INR |
| receiptNumber | string | no | Future addition; unique within organization if introduced |
| paymentMethod | string enum | no | Future addition; not currently collected |
| transactionReference | string | no | Future addition |

### In-kind contribution fields

| Field | Type | Required | Constraints |
|---|---|---:|---|
| estimatedValuePaise | integer | no | Zero or positive; current UI allows an optional estimated value |
| currency | string | yes when estimated value exists | INR |
| itemsDescription | string | yes | Current frontend maps this to notes and requires it for in-kind |
| quantity | number/string | no | Future structured field; current UI captures quantity as free text inside notes |
| unit | string | no | Future structured field |

Actual frontend behavior in ServeBasePeople.tsx:548-557 and 1580-1635 is: amount is required only for Monetary; Monetary must be greater than zero and may have up to two decimal places; In-kind amount is optional and may be zero or greater up to one trillion, with up to two decimal places; In-kind notes/items are required. Do not incorrectly make an in-kind amount mandatory.

Do not use one ambiguous floating-point amount field in the Firestore model. The existing Donation.amount:number must be replaced or adapted to amountPaise for monetary contributions and estimatedValuePaise for in-kind contributions.

## 9. Drives

Path: organizations/{organizationId}/drives/{driveId}

| Field | Type | Required | Constraints |
|---|---|---:|---|
| id | string | yes | Transitional copy of document ID |
| name | string | yes | 1–200 characters |
| date | string date-only | yes | YYYY-MM-DD, Asia/Kolkata |
| registrationDeadlineAt | timestamp | yes for backend registration | Server-verifiable deadline; registration is eligible only while server time is before this value |
| startAt | timestamp | no | Future addition; current UI does not collect time |
| endAt | timestamp | no | Future addition; must be after startAt |
| timezone | string | yes | Asia/Kolkata initially |
| location | string | yes | Max 500 characters |
| meetingPoint | string | no | Future addition; current UI explicitly lacks it |
| status | string enum | yes | upcoming, ongoing, completed, cancelled; normalize current title-case values |
| description | string | no | Max 10,000 |
| capacity | integer | yes | 1–100,000 |
| registeredCount | integer | yes | Non-negative; maintained transactionally; count of participation records with status != withdrawn |
| sdg | string enum | yes | SDG 1, SDG 11, SDG 17 |
| coordinatorUid | string | no | Future assignment field |
| createdByUid | string | yes | Member UID |
| createdAt | timestamp | yes | Server timestamp |
| updatedAt | timestamp | yes | Server timestamp |

The current frontend calculates roster size from participation records. registeredCount is a backend counter for capacity enforcement and must never be trusted from an unauthenticated client. The current frontend does not collect registrationDeadlineAt; the backend must derive or provision it under an approved product policy before enabling registration. A date-only drive.date is not itself a server-verifiable deadline timestamp.

### V1 registration deadline

For v1, drive.date is interpreted in Asia/Kolkata. When no event start time is supplied, registrationDeadlineAt is the Firestore Timestamp representing 00:00:00 Asia/Kolkata on drive.date. Registration is eligible only when server-verifiable time is strictly before registrationDeadlineAt. Firestore Rules use request.time, and the registration transaction independently validates the same deadline against server-backed transaction state; client clocks are never authoritative.

Future event scheduling may provide a custom registration deadline timestamp, which must be before the event start time and must be stored as Firestore Timestamp. The custom deadline replaces the midnight default but does not change the drive's date-only display convention.

During migration, every legacy drive with a valid YYYY-MM-DD date receives an initial registrationDeadlineAt equal to midnight Asia/Kolkata on that date. Legacy drives with invalid/missing dates are quarantined from registration until corrected by an admin; they must not receive a guessed deadline. Completed or cancelled legacy drives remain non-public regardless of their migrated deadline.

## 10. Participation

Path: organizations/{organizationId}/participation/{participationId}

### Deterministic ID

Use a normalized deterministic ID:

~~~text
{driveId}__{volunteerId}
~~~

If IDs may contain characters unsuitable for the chosen encoding, use a documented reversible-safe encoding or a stable hash with the original IDs retained in fields. The same volunteer/drive pair must always resolve to the same participation document.

This replaces the current random IDs generated by newId("par") and newId("participation"). The change is required for race-safe duplicate prevention.

### Fields

| Field | Type | Required | Constraints |
|---|---|---:|---|
| id | string | yes | Must equal document ID |
| volunteerId | string | yes | Reference to volunteers/{volunteerId} |
| driveId | string | yes | Reference to drives/{driveId} |
| role | string | yes | 2–200 characters for coordinator entry; 2–120 for volunteer reservation |
| status | string enum | yes | registered, attended, absent, withdrawn; normalize current title-case values |
| hours | number | yes | Zero unless attended; 0–100000; backend validation required |
| notes | string | no | Max 10,000 for coordinator records; volunteer reservation input currently max 500 |
| registeredAt | timestamp | yes | Server timestamp |
| registeredByUid | string | yes | Member UID |
| attendanceUpdatedAt | timestamp | no | Server timestamp |
| attendanceUpdatedByUid | string | no | Coordinator/admin UID |
| withdrawnAt | timestamp | no | Required when status=withdrawn; server timestamp |
| createdAt | timestamp | yes | Server timestamp |
| updatedAt | timestamp | yes | Server timestamp |

The current UI deletes a volunteer’s Registered reservation. The backend policy is soft withdrawal: set status=withdrawn and withdrawnAt rather than deleting the record. Attended and Absent records continue occupying reserved capacity. registeredCount is the count of participation records whose status is not withdrawn, including registered, attended and absent records.

### Withdrawal history subcollection

Path: organizations/{organizationId}/participation/{participationId}/withdrawals/{withdrawalId}

Each withdrawal is append-only and preserves the history needed when the same deterministic participation document is later re-registered.

Exactly one withdrawal history document is created by each successful withdrawal transaction. Re-registration does not create a withdrawal history entry; it preserves every existing entry and changes the parent participation document from withdrawn back to registered. A later successful withdrawal creates exactly one new entry. The withdrawal transaction must atomically create the history entry, update the parent and adjust the drive counter. The re-registration transaction must atomically conditionally read and update the parent and adjust the drive counter without writing a history entry. Retries or concurrent attempts must not create duplicate history entries or double-adjust registeredCount.

| Field | Type | Required | Constraints |
|---|---|---:|---|
| withdrawalId | string | yes | Unique generated ID for the withdrawal event |
| participationId | string | yes | Parent participation document ID |
| previousStatus | string | yes | Normally registered |
| withdrawnAt | timestamp | yes | Server timestamp |
| withdrawnByUid | string | yes | Authenticated volunteer/admin UID |
| reason | string | no | Future product field; not currently collected |

## 11. Activities

Path: organizations/{organizationId}/activities/{activityId}

| Field | Type | Required | Constraints |
|---|---|---:|---|
| id | string | yes | Document ID |
| action | string | yes | Stable action code, for example volunteer.created or report.exported |
| kind | string enum | yes | volunteer, donor, donation, drive, participation, report, settings, auth |
| actorUid | string | yes | Auth UID; system actor may use a documented service identity |
| targetCollection | string | no | volunteers, donors, donations, drives, participation, settings |
| targetId | string | no | Target document ID |
| title | string | yes | Current UI title equivalent |
| detail | string | no | Current UI detail equivalent; max 10,000 |
| at | timestamp | yes | Server timestamp |
| source | string enum | yes | clientActivity or trustedAudit |
| trusted | boolean | yes | true only for trusted backend-generated records |

Client activity entries are UX/history records such as a user exporting a report. They may be created by an authenticated client only with actorUid equal to request.auth.uid, and they are not tamper-proof. A client can be compromised or can write a misleading description.

Security-sensitive audit records—role changes, account suspension, organization settings changes, payment/financial corrections, attendance corrections, bootstrap actions and rule-relevant security events—must be generated by a trusted backend process. The trusted process sets source=trustedAudit, trusted=true, actorUid from verified auth context or a documented system actor, and server timestamps. Security Rules must reject client attempts to create trustedAudit records or set trusted=true. The current Spark project may not have the trusted server automation needed for these records; client-generated activities must not be represented as equivalent.

The current Activity interface lacks actorUid, action, targetCollection, targetId and provenance fields. These are required additions for a useful activity feed and a separate trusted audit trail.

## 12. Authentication and account linking

1. Create/sign in users through Firebase Authentication; never store passwords in Firestore.
2. After Auth sign-in, resolve the UID in organizations/{organizationId}/members/{uid}.
3. Permit application access only when the member status is active and the organization is active.
4. A volunteer account links to volunteers/{volunteerId} through members.volunteerId and volunteers.authUid.
5. Admin/coordinator accounts need a member document but do not need a volunteer profile.
6. Email/password can be the first provider. Google sign-in can later be enabled through the google.com provider and linkWithCredential/linkWithPopup to the same Auth UID.
7. Do not identify users by email. Email can change and Google may return a different verified address.
8. If an existing local volunteer record is claimed by a new account, require an explicit verified-email claim flow or admin approval; never auto-link solely on an unverified client-entered email.
9. Account statuses pending, active and suspended are enforced in Firestore Rules and in all transaction code.
10. Password recovery belongs to Firebase Auth; no reset tokens or passwords are Firestore fields.

### Organization ID and membership lookup

For version one, organizationId is the one configured organization identifier. Every client operation obtains it from trusted configuration, then reads organizations/{organizationId}/members/{request.auth.uid}. The member document must exist, have status=active, and have a role permitted for the operation. The organization document must also have status=active. A client-supplied organizationId must never select an organization outside the configured scope; future multi-organization support may replace the single configured value with an approved organization picker backed by membership.

## 13. Access permission matrix

| Resource/action | Public | Pending | Volunteer | Coordinator | Admin |
|---|---:|---:|---:|---:|---:|
| Read published publicProfile | published only | no | yes | yes | yes |
| Read published driveDirectory | published/registration-open only | no | yes | yes | yes |
| Read full organization document | no | no | no | yes | yes |
| Read full drives documents | no | no | no | yes | yes |
| Read own member document | no | own limited | own | own | yes |
| Read own volunteer profile | no | no | yes | yes | yes |
| Read volunteerDirectory | no | no | yes, active member only | yes | yes |
| Read other volunteer profile | no | no | no | yes | yes |
| Read volunteerPrivate | no | no | no | yes | yes |
| Create own volunteer profile | no | pending flow only | controlled | no | yes |
| Edit own volunteer-readable profile | no | no | own allowed fields | yes | yes |
| Create/edit volunteers | no | no | no | yes | yes |
| Read donors | no | no | no | yes | yes |
| Create/edit donors | no | no | no | no | yes |
| Read donations | no | no | no | yes | yes |
| Create/edit donations | no | no | no | no | yes |
| Read restricted drives documents | no | no | no | yes | yes |
| Create/edit/delete drives | no | no | no | yes | yes |
| Create own registration | no | no | own only, upcoming eligible drive | no | yes |
| Withdraw own registration | no | no | own registered future record | no | yes |
| Create/manage participation records for volunteers | no | no | no | yes | yes |
| Edit attendance/hours | no | no | no | yes | yes |
| Read own participation | no | no | yes | yes | yes |
| Read all participation | no | no | no | yes | yes |
| Read/create client activities | no | no | own-relevant read only if needed | yes | yes |
| Create trusted audit records | no | no | no | no | trusted backend only |
| Manage members/roles/status | no | no | no | no | yes |
| Edit organization settings | no | no | no | no | yes |
| Restore/delete whole workspace | no | no | no | no | admin-only, preferably server-mediated |

Previous proposal: volunteers could read limited fields from other volunteer profiles. Revised policy: volunteers read only volunteerDirectory, which contains name, skills, availability, status and optional future photoPath; email, phone, internal notes, authUid and private consent remain unavailable.

Coordinators may create and manage participation records for volunteers, including registration records, withdrawals, re-registration, attendance and service hours. Every such action must use the same transaction invariants that apply to volunteer self-service. Coordinators may not directly write or increment/decrement drives.registeredCount; that field changes only as part of an authorized registration, withdrawal or re-registration transaction.

## 14. Firestore Security Rules design requirements

Rules must:

1. Require request.auth != null for all non-public organization data.
2. Allow unauthenticated reads only to published publicProfile and published/open driveDirectory documents; never allow unauthenticated reads of organization, drives, volunteers or participation.
3. Validate both organization.status == active and membership by reading organizations/{organizationId}/members/{request.auth.uid}.
4. Require member.status == active for operational reads/writes. Pending and suspended members must not pass operational rules.
5. Restrict role checks to a small reusable rules function.
6. Enforce document ID equality for member UID, volunteer ID copies and deterministic participation IDs.
7. Prevent clients from changing authUid, createdAt, createdByUid, registeredByUid, actorUid, organizationId or historical audit fields after creation.
8. Protect all administrative fields: internal notes, member roles/status, organization settings, capacity, attendance, hours, financial fields and audit fields.
9. Allow volunteers to update only approved fields in their own restricted profile; prohibit changing status, joinedOn, notes/private data, IDs and service history.
10. Keep volunteers unreadable to other volunteers and keep volunteerPrivate unreadable by volunteers. Allow volunteerDirectory only to active members.
11. Validate enums, lengths, non-negative amounts, date formats and integer paise ranges in rules where practical.
12. Require donation donorId and participation volunteerId/driveId to be organization-scoped references.
13. Prevent volunteer clients from writing attendance, hours, capacity, roles, member status or any coordinator/admin field.
14. Protect member role/status changes and organization settings as admin-only.
15. Make activities append-only: clientActivity writes require actorUid == request.auth.uid, source=clientActivity and trusted=false; clients cannot write source=trustedAudit or trusted=true and cannot update/delete activities.
16. For participation writes, use getAfter() validation in the transaction/batch rules so the resulting drive document changes registeredCount by exactly +1 for a new or re-registered non-withdrawn registration, 0 for attendance/status edits that remain non-withdrawn, and -1 for the single registered-to-withdrawn transition. Rules must reject a result where registeredCount is negative, exceeds capacity, or changes without the corresponding participation status transition. Rules cannot count an entire collection; the transaction maintains the counter and a trusted reconciliation job/process must detect drift.
17. Treat delete as a separate permission; participation withdrawal should be a status transition, not client deletion.
18. Account for Rules document-access limits when checking multiple related documents. The Firestore rules limits include 10 access calls for a single query/request and 20 for multi-document reads, transactions and batched writes.
19. Avoid using rules as the only mechanism for complex uniqueness or counter logic; use deterministic IDs and transactions.
20. Restrict volunteerEmailIndex and optional donorEmailIndex reads/writes to admin/coordinator or a trusted backend operation; volunteers must not enumerate or mutate them.
21. For drive projection batches, allow only admin/coordinator lifecycle writes, require driveDirectory ID == drive ID, allow only the approved public-safe field set, and require cancelled or unpublished operational drives to produce an unpublished/non-open projection.
22. Permit coordinator participation writes and attendance/hour updates, but reject any direct drive registeredCount-only update. Require the corresponding participation and drive getAfter() invariants for every counter change.

The initial bootstrap exception must not be a permanent allow-if-no-members rule. Provision the first organization and admin member through a trusted setup process, then deploy rules that require the normal organization and member checks. Rules must be tested with the Firebase Emulator Suite before deployment. No rule file is created by this blueprint.

## 15. Duplicate registration prevention

The current frontend checks duplicates by scanning LocalStorage participation records. That is not safe under concurrent users.

Required backend approach:

1. Compute participationId deterministically from driveId and volunteerId.
2. Run a Firestore transaction.
3. Read the member/volunteer, drive and participation document.
4. Reject if volunteer/member is not active, drive is cancelled/closed, the server time is at or after registrationDeadlineAt, or the participation document is currently non-withdrawn.
5. Verify registeredCount < capacity, where registeredCount counts registered, attended and absent records but excludes withdrawn records.
6. Create the participation document and update drive.registeredCount atomically.
7. Treat transaction retry as expected behavior.
8. Use a transaction for withdrawal that verifies the same volunteer owns the record, changes status from registered to withdrawn, appends a withdrawal history record, sets withdrawnAt, and decrements registeredCount exactly once.
9. Permit re-registration after withdrawal while the volunteer remains active, the drive remains eligible, the server time is before registrationDeadlineAt, and capacity is available.
10. Re-registration reuses the same deterministic participation document ID, preserves the existing withdrawal history without creating another withdrawal history entry, changes status back to registered, clears the current withdrawnAt, updates registeredAt/registeredByUid, and increments registeredCount exactly once.

Email uniqueness for volunteer profiles should be delegated primarily to Firebase Auth for accounts. For pre-account volunteer records, use volunteerEmailIndex/{emailHash}; for donor contact records, use donorEmailIndex/{emailHash}. These namespaces intentionally allow a donor and a volunteer to have the same contact email. Do not use a shared emailIndex collection.

Normalize by trim plus documented lowercase/Unicode normalization, then compute a stable cryptographic hash or safe encoding of normalized email for the document ID. Never place the raw email in a document ID. Each index document contains normalizedEmail only if its access policy permits it, ownerId, status, createdAt and updatedAt. Creation, change, release and reassignment of an index reservation must be transactional and owner-checked.

## 16. Capacity and transaction requirements

For registration, whether initiated by a volunteer or coordinator:

~~~text
transaction:
  get drive
  get volunteer/member
  get participation/{driveId}__{volunteerId}
  if participation exists with status != withdrawn: reject as duplicate
  if participation exists with status == withdrawn: continue through the approved re-registration path using the same document ID
  reject if drive status is cancelled or not joinable
  reject if volunteer/member is not active
  reject if server time >= drive.registrationDeadlineAt
  reject if registeredCount >= capacity
  create participation if absent, otherwise update the withdrawn participation to registered without creating a withdrawal history entry
  update drive registeredCount = registeredCount + 1
  rules getAfter() verifies the resulting drive counter is exactly one higher and the participation result is registered
~~~

For withdrawal:

~~~text
transaction:
  get participation
  get drive
  verify request user owns the volunteer record
  verify status == registered and drive is upcoming/future
  update participation status = withdrawn and withdrawnAt = server timestamp
  create participation/{participationId}/withdrawals/{withdrawalId} with the prior status, withdrawnAt and actor UID
  decrement registeredCount exactly once
  rules getAfter() verifies the resulting drive counter is exactly one lower and the participation result is withdrawn
~~~

For changing capacity, reject values below registeredCount. Attended and Absent records continue occupying capacity; only withdrawn records stop occupying capacity. Do not trust a client-supplied roster count.

The Firebase Emulator Suite test plan must include: two concurrent registrations for the last available place, concurrent duplicate registrations for the same deterministic ID, concurrent re-registration after withdrawal, duplicate re-registration attempts, preservation of withdrawal history, repeated withdrawal attempts, deadline-expired registration, coordinator registration, coordinator attendance/hour updates, direct counter manipulation by a coordinator, capacity reduction below registeredCount, cancelled-drive registration, suspended volunteer registration, and forged counter/attendance updates. Assert both transaction results and Security Rules allow/deny outcomes.

## 17. Date, timestamp and INR conventions

### Dates

- Organization timezone: Asia/Kolkata.
- Date-only business fields: string YYYY-MM-DD, including joinedOn, donation date and drive date. This matches the current UI and avoids accidental timezone shifts.
- Validate dates against the Asia/Kolkata current date on the server/application boundary.
- If scheduling times are added, store startAt/endAt as Firestore Timestamp and store timezone explicitly.

### Timestamps

- createdAt, updatedAt, registeredAt, attendanceUpdatedAt, termsAcceptedAt, activity at and auth activity use Firestore Timestamp/serverTimestamp().
- Never use client clock values as authoritative audit timestamps.

### Currency

- Currency code: INR.
- Store monetary values as integer paise: ₹1.00 = 100.
- Monetary contribution amountPaise must be positive.
- In-kind estimatedValuePaise is optional and non-negative.
- Format INR only at the UI boundary.
- Never store floating-point rupee values as the source of truth.

## 18. LocalStorage-to-Firestore migration mapping

Current source: ServeBaseStore.tsx, LocalStorage key servebase-workspace-v1.

| LocalStorage data | Firestore destination | Mapping |
|---|---|---|
| WorkspaceSettings | organizations/{organizationId} | organizationName -> name; admin fields -> contact fields; add timezone/currency/status/timestamps |
| Volunteer.id | volunteers/{volunteerId} plus volunteerDirectory/{volunteerId} | Keep ID; project only safe name/skills/availability/status to directory |
| Volunteer.notes | volunteerPrivate/{volunteerId}.internalNotes | Move out of public volunteer profile |
| Volunteer.photo | Deferred Storage migration + volunteers.photoPath | Preserve the LocalStorage data URL during migration; do not upload on Spark and do not silently discard it. When Storage becomes available, decode/upload to the approved path, record photoPath, then remove the embedded value only after successful verification |
| Volunteer.termsAcceptedAt | volunteerPrivate.termsAcceptedAt | Convert ISO string to Timestamp |
| Volunteer.termsVersion | volunteerPrivate.termsVersion | Preserve literal version |
| Donor | donors/{donorId} | Preserve ID and normalize enum casing |
| Donation | donations/{donationId} | donorId reference; convert amount rupees to paise; split monetary/in-kind value |
| Drive | drives/{driveId} plus driveDirectory/{driveId} | Preserve ID; normalize operational status; derive registrationDeadlineAt at midnight Asia/Kolkata on the legacy date; publish only explicitly approved safe fields |
| Participation | participation/{driveId}__{volunteerId} | Preserve relationship fields; resolve random legacy ID to deterministic ID; preserve any available withdrawal evidence |
| Activity | activities/{activityId} | Preserve ID/title/detail/kind; add migration actor/target metadata where unavailable |
| sessionStorage demo flag | Firebase Auth/member session | Do not migrate as authorization |
| sessionStorage volunteer ID | Auth UID and members.volunteerId | Re-authenticate and resolve through member document |
| theme/dock keys | Local browser preferences | Do not migrate to Firestore |

Migration validation must reject orphaned donor, volunteer or drive references, duplicate volunteer/drive pairs, invalid dates, invalid enums, negative monetary values and unsupported photos.

### Spark photo limitation

While the project is on Spark, profile-photo cloud uploads are deferred. The application must not attempt Firebase Storage uploads and must not replace an existing LocalStorage photo with an empty value merely because Storage is unavailable. Preserve the existing photo data in the migration source or a recoverable migration artifact. When the project moves to a plan with Storage access, perform an explicit photo migration, verify each uploaded object, then update photoPath. Any failed upload must leave the source photo recoverable.

## 19. Required composite indexes

The current frontend performs no Firestore queries. It loads the whole LocalStorage workspace and uses JavaScript filter/sort/find operations. Therefore, there are currently zero required Firestore indexes for the existing implementation.

Firestore automatically maintains single-field indexes unless disabled. Do not manually create individual indexes for email, date, joinedOn or at. The following are only proposed composite-index candidates for the first Firestore repository translation, based on actual frontend filter/sort behavior. Verify each candidate against the real query after repository implementation; create only when the query or Firebase console requires it.

| Collection | Fields/order | Purpose from current UI |
|---|---|---|
| volunteers | status ASC, availability ASC, joinedOn DESC | Volunteer status/availability filters with recent sorting |
| volunteers | status ASC, joinedOn DESC | Active volunteer list and recent directory |
| donors | type ASC, joinedOn DESC | Donor type filter and recent sorting |
| donations | type ASC, date DESC | Contribution type and date-range filtering |
| donations | donorId ASC, date DESC | Donor contribution history |
| drives | status ASC, date ASC | Upcoming/ongoing/completed drive lists |
| drives | sdg ASC, status ASC, date ASC | Volunteer goal/status filters ordered by date |
| participation | volunteerId ASC, status ASC, updatedAt DESC | Volunteer service history/status filters |
| participation | driveId ASC, status ASC, createdAt ASC | Drive roster and attendance views |
| participation | status ASC, driveId ASC | Coordinator attendance/status views |

### Search limitation

Current searches are arbitrary case-insensitive substring searches across multiple fields. Firestore prefix/range queries do not reproduce that behavior. Options are:

- load a bounded, authorized result set and filter client-side;
- add normalized search tokens/prefix fields;
- use a dedicated search service later.

Do not add a composite index expecting it to implement arbitrary contains search.

## 20. Spark plan limitations

Plan limits and billing behavior are time-sensitive. At the time of this blueprint, Firebase documentation describes Spark/Firestore free quota as 1 GiB stored data, 50,000 document reads/day, 20,000 document writes/day, 20,000 deletes/day and 10 GiB/month outbound transfer. Quotas reset daily, and the free tier applies to one Firestore database per project. See the official [Firestore usage and limits documentation](https://firebase.google.com/docs/firestore/quotas) and [Firebase pricing page](https://firebase.google.com/pricing).

Important implications:

- If a Spark project's quota for a paid-tier product is exceeded, Firebase documentation says that product can be shut off for the remainder of the billing period rather than generating overage charges; this is unsuitable for unbounded production traffic.
- Firestore reads are billed per document read, so replacing the current single LocalStorage read with broad realtime listeners can consume the daily allowance quickly.
- Firestore transactions have request/time and Rules document-access limits. Keep registration transactions small and avoid rules that perform excessive cross-document reads.
- Backups, restore, point-in-time recovery and TTL deletes require billing according to the Firestore quota documentation.
- Cloud Storage for Firebase currently requires the Blaze plan; on Spark, Storage bucket access/API calls can fail. This directly affects the requested profile-photo design. See the official [Cloud Storage billing FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
- Authentication social providers such as Google are available without storing passwords in Firestore, but phone verification has separate billing/limits.
- Server-side enforcement through Cloud Functions or other paid Google Cloud services may require Blaze. Do not rely on client-only code for security-sensitive uniqueness, counters or privileged workflows.
- Set budgets and alerts before enabling Blaze; budgets alert but do not cap usage.

The project can prototype Firestore on Spark within quotas, but profile images and any server-side automation plan should be treated as a Blaze decision.

## 21. Required TypeScript interface changes

The current interfaces in ServeBaseStore.tsx are a browser-local shape, not yet a production Firestore shape. Before implementation, approve these changes:

1. Add Organization and Member interfaces with organizationId, UID, role and account status.
2. Split Volunteer into a readable VolunteerProfile and private VolunteerPrivate interface.
3. Remove internal notes from the volunteer-readable Volunteer interface.
4. Replace photo?: string data URL with photoPath?: string and optional photoUrl.
5. Add authUid to linked volunteer profiles.
6. Replace Donation.amount with amountPaise for monetary contributions and estimatedValuePaise for in-kind contributions; add currency.
7. Normalize type/status enum values to stable backend casing or introduce explicit serialization adapters.
8. Add Drive registeredCount, timezone and future time/location fields.
9. Add Drive registrationDeadlineAt and define its product default/derivation because the current UI does not collect it.
10. Change participation IDs from random IDs to deterministic drive/volunteer IDs, add withdrawn status, withdrawal history and registration/audit timestamps.
11. Add publicProfile and driveDirectory projection interfaces.
12. Add the volunteerDirectory interface and keep restricted/private volunteer interfaces separate.
13. Add Activity actorUid, action, targetCollection, targetId, source and trusted fields.
14. Add createdAt/updatedAt and actor fields to mutable records.
15. Add organizationId only at repository/document context if the UI remains organization-scoped; do not duplicate it inconsistently.
16. Add a repository adapter so the current components do not need to know Firestore Timestamp, Storage paths or transaction mechanics.

## APPROVAL_CHECKLIST

The architecture decisions in this blueprint are treated as finalized recommendations. The remaining decisions are implementation/product details that cannot be resolved from the current frontend alone:

- Confirm the exact safe field allowlist for publicProfile and driveDirectory before enabling unauthenticated reads.
- Select the trusted setup mechanism for the first organization and first admin, and the trusted backend mechanism for security-sensitive audit records.
- Select the stable email-index encoding/hash algorithm and the protected comparison strategy; donorEmailIndex remains optional and donor email uniqueness is explicitly non-enforced in v1.
- Confirm the future custom registration-deadline UX and the operational treatment of legacy drives with missing or invalid dates.
- Approve the TypeScript interface/repository adapter changes required to introduce Firestore timestamps, deterministic participation IDs and split volunteer documents without changing the UI.
- Verify candidate composite indexes only after the Firestore repository queries are implemented; automatic single-field indexes remain sufficient for individual fields.
- Confirm the timing and budget for moving to Blaze before Storage uploads or trusted server-side automation are enabled.
