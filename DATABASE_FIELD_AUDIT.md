# ServeBase Database Field Audit

Inspection date: 2026-11-01  
Scope: source-code inspection only. No Firebase packages, configuration, or application files were changed.

This report is based on the TypeScript/TSX implementation under src/components/generated. The line references identify the current implementation.

## 1. Summary

The application is a React/Vite browser-local prototype. Its persisted workspace model is defined in ServeBaseStore.tsx and contains:

- volunteers
- donors
- donations
- drives
- participation
- activities
- settings

There is no production authentication. Admin entry is a session flag; volunteer entry selects an active local profile or matches an email. Passwords are not checked or persisted.

| Measure | Total |
|---|---:|
| Functional modules | 9 |
| Input-bearing forms/control areas | 15 |
| Logical user-entered or selected controls, including filters | 88 |
| Persisted operational entities | 6 |
| Persisted settings groups | 1 |
| Temporary UI-only state groups | 30+ |

The 88-control count is logical: a shared control is counted once per form/control area, not once per repeated JSX instance.

## 2. Source architecture

| Area | Source | Responsibility |
|---|---|---|
| App entry | src/main.tsx, src/App.tsx | React mount and root component |
| Routing/shell | ServeBaseInstitutionalLanding.tsx, ServeBaseNavigation.ts | Hash routing, session gate, lazy volunteer bundle |
| Store/model | ServeBaseStore.tsx | Interfaces, seed data, validation, LocalStorage, backups, IDs, activity records |
| Admin auth | ServeBaseAuth.tsx | Demo login and recovery validation |
| Admin shell | ServeBaseDashboard.tsx | Navigation and global search |
| People | ServeBasePeople.tsx | Volunteer, donor, contribution filters and CRUD |
| Drives | ServeBaseDrives.tsx | Drive CRUD and participation/attendance CRUD |
| Overview | ServeBaseOverview.tsx | Period summaries, charts, drive board and follow-ups |
| Reports/settings | ServeBaseWorkspacePages.tsx | Reports, CSV/JSON backup, restore and organization settings |
| Volunteer | ServeBaseVolunteer.tsx, ServeBaseVolunteerAuth.tsx, ServeBaseVolunteerSignup.tsx, ServeBaseVolunteerPages.tsx | Entry, signup, profile, reservations and service history |
| Public demo | ServeBasePublic.tsx, ServeBaseInteractions.tsx | Public index and hardcoded sample tools |
| Photos | ServeBaseProfilePhoto.tsx, ServeBaseProfileImage.ts | Image validation, resizing and data URLs |

## 3. Current entities and fields

Defined in src/components/generated/ServeBaseStore.tsx:11-93.

### Volunteer

id: string; name: string; email: string; phone: string; skills: string[]; availability: Weekdays | Weekends | Flexible; status: Active | Inactive; joinedOn: YYYY-MM-DD; notes: string; optional photo: string; optional termsAcceptedAt: ISO string; optional termsVersion: string.

### Donor

id; name; type: Individual | Institutional; email; phone; address; notes; joinedOn.

### Donation/contribution

id; donorId; amount: number; date: YYYY-MM-DD; type: Monetary | In-kind; category; notes.

### Drive

id; name; date: YYYY-MM-DD; location; status: Upcoming | Ongoing | Completed | Cancelled; description; capacity: number; sdg: SDG 1 | SDG 11 | SDG 17.

### Participation

id; volunteerId; driveId; role; status: Registered | Attended | Absent; hours: number; notes.

### Activity

id; at: ISO timestamp; title; detail; kind. Activities are automatically generated and are not directly editable.

### Workspace settings

organizationName; adminName; adminEmail; phone; address.

## 4. Complete field inventory

Required means required by UI or submit validation. “Persisted” means it belongs in a durable backend document. Search, filters and display controls are explicitly temporary.

### A. Admin/authentication

Source: ServeBaseAuth.tsx:15-270; ServeBaseDashboard.tsx:300-350.

| Form | Label | Variable | Type | Required/validation/default/example | Database need |
|---|---|---|---|---|---|
| Admin login/recovery | Work email | email | email string | Optional for demo login, required for recovery; regex in recovery; max 254; default empty; admin@ngo.org | Future Auth identifier; not currently stored |
| Admin login | Password | password | password string | Optional in demo; no checking/persistence; default empty | Firebase Auth credential only; never Firestore |
| Admin shell | Search workspace | query | search string | Matches volunteers, donors and drives; default empty | Temporary |

### B. Public/demo controls

Sources: ServeBasePublic.tsx:480-520; ServeBaseInteractions.tsx:285-355.

| Form | Label | Variable | Type | Required/validation/default/example | Database need |
|---|---|---|---|---|---|
| Public index | Find a page | indexQuery | search string | Page/module filtering; default empty | Temporary |
| Feature sample export | Dataset | exportModule | enum select | volunteers, donors, drives; default module state | No; hardcoded demo |
| Feature sample | Search sample | query | search string | Filters hardcoded illustrative records; default empty | No; hardcoded demo |

### C. Volunteer entry and registration

Sources: ServeBaseVolunteerAuth.tsx:20-220; ServeBaseVolunteerSignup.tsx:20-220.

| Form | Label | Variable/property | Type | Required/validation/default/example | Database need |
|---|---|---|---|---|---|
| Volunteer login | Profile email | email | email string | Required in email mode; case-insensitive match to active profile; default selected email; name@example.org | Future Auth/profile lookup |
| Volunteer login | Choose a volunteer profile | selectedId | ID select | Active profiles only; default first active ID | Session reference, not a business field |
| Registration | Profile photo | photo | image data URL string | Optional JPG/PNG/WebP; resized 256x256 | Storage path/URL |
| Registration | Full name | form.name | string | Required; 2–200 chars; default empty; Aditi Sharma | volunteers.name |
| Registration | Email address | form.email | email string | Required; regex; max 254; unique; default empty | Auth email plus profile email |
| Registration | Phone number | form.phone | phone string | Optional; 7–15 digits; max 60; default empty | volunteers.phone |
| Registration | Skills/interests | form.skills | comma string to array | Optional; 30 skills max, 100 chars each; default empty | Canonical string array |
| Registration | Usual availability | form.availability | enum radio | Required; Weekdays/Weekends/Flexible; default Flexible | volunteers.availability |
| Registration | Terms agreement | accepted | boolean checkbox | Required checked; default false | Persist timestamp/version, not transient boolean |

Registration automatically sets id, status Active, joinedOn, notes empty, termsAcceptedAt, and termsVersion 2026-10-26.

### D. Volunteer profile editing

Source: ServeBaseVolunteer.tsx:380-820.

| Form | Label | Variable/property | Type | Required/validation/default | Database need |
|---|---|---|---|---|---|
| My details | Profile photo | form.photo | image data URL string | Optional; existing photo or empty; same picker rules | Storage path/URL |
| My details | Full name | form.name | string | Required; 2–200; current name default | Yes |
| My details | Email address | form.email | email string | Required; regex; max 254; unique; current email default | Yes and future Auth |
| My details | Phone number | form.phone | phone string | Optional; 7–15 digits; current phone default | Yes |
| My details | Skills, separated by commas | form.skills | comma string to array | Optional; 30 entries, 100 chars each | Yes as array |
| My details | My availability | form.availability | enum radio | Required; Weekdays/Weekends/Flexible | Yes |

This form intentionally cannot edit volunteer ID, joined date, status, internal notes or history.

### E. Participation and attendance

Sources: ServeBaseVolunteerPages.tsx:100-470; ServeBaseDrives.tsx:360-470 and 1400-1570.

#### Volunteer reservation dialog

| Form | Label | Variable/property | Type | Required/validation/default | Database need |
|---|---|---|---|---|---|
| Reservation | How would you like to help? | role | string | Required; 2–120 chars; e.g. registration desk | participation.role |
| Reservation | Note for coordinator | note | textarea string | Optional; max 500; plain text; default empty | participation.notes |
| Reservation | Confirm date/location checked | confirmed | boolean checkbox | Required checked; default false | UI acknowledgement only |

The reservation creates a record with generated ID, volunteer/drive IDs, Registered, hours 0, and the entered role/note.

#### Admin participation modal

| Form | Label | Variable/property | Type | Required/validation/default | Database need |
|---|---|---|---|---|---|
| Participation | Volunteer | participationForm.volunteerId | ID select | Required; must reference volunteer; new records require Active | Foreign reference |
| Participation | Community drive | participationForm.driveId | ID select | Required; must reference drive; cancelled new drives rejected | Foreign reference |
| Participation | Assigned role | participationForm.role | string | Required; max 200; e.g. Distribution coordinator | Yes |
| Participation | Attendance | participationForm.status | enum select | Registered/Attended/Absent | Yes |
| Participation | Service hours | participationForm.hours | number | Required when Attended; 0–100000; default 0 | Yes |
| Participation | Participation notes | participationForm.notes | textarea string | Optional; max 10000; plain text | Yes |

Business validation prevents duplicate volunteer/drive pairs, enforces capacity, and resets hours to zero unless status is Attended.

#### Participation filters

Source: ServeBaseDrives.tsx:785-825.

| Label | Variable | Type | Default/options | Database need |
|---|---|---|---|---|
| Search participation records | search | search string | Empty | Temporary |
| Filter by drive | driveFilter | ID select | All drives or drive IDs | Temporary |
| Filter by status | status | enum select | All or Registered/Attended/Absent | Temporary |
| Rows per page | pageSize | number select | 10 by default | Temporary |

### F. Volunteer drive discovery/history

Source: ServeBaseVolunteerPages.tsx:870-1290.

| Page | Label | Variable | Type | Default/options | Database need |
|---|---|---|---|---|---|
| Find a drive | Search drives | search | search string | Empty | Temporary |
| Find a drive | Community goal | sdg | enum select | all, SDG 1, SDG 11, SDG 17 | Temporary |
| Find a drive | Opportunity status | filter | button enum | all, Upcoming, Ongoing, mine | Temporary |
| My service | Service status | filter | button enum | all, Registered, Attended, Absent | Temporary |
| My service | Search service record | search | search string | Empty | Temporary |

### G. Volunteer/donor/contribution management

Sources: ServeBasePeople.tsx:250-650 and 940-1650.

#### Shared directory filters

| Label | Variable | Type | Default/options | Database need |
|---|---|---|---|---|
| Search records | query | search string | Empty | Temporary |
| Status/type | filter | enum select | all; volunteer Active/Inactive; donor Individual/Institutional; contribution Monetary/In-kind | Temporary |
| Availability | availability | enum select | all, Weekdays, Weekends, Flexible | Temporary |
| Sort records | sort | enum select | recent, oldest, name, name-desc, amount | Temporary |
| Contributions from date | dateFrom | date string | Empty | Temporary |
| Contributions to date | dateTo | date string | Empty | Temporary |
| Rows per page | pageSize | number select | 8, 15, 30; default 8 | Temporary |

#### Volunteer CRUD modal

| Label | Variable/property | Type | Required/validation/default/example | Database need |
|---|---|---|---|---|
| Profile photo | form.photo | image data URL | Optional; picker rules | Storage |
| Full name | form.name | string | Required; 2+; max 200 | Yes |
| Email address | form.email | email string | Required; regex; unique; max 254 | Yes |
| Phone number | form.phone | phone string | Required in admin CRUD; 7–15 digits; max 60 | Yes |
| Joined on | form.joinedOn | date string | Required; valid and not future | Yes |
| Availability | form.availability | enum select | Required; three availability values | Yes |
| Profile status | form.status | enum select | Required; Active/Inactive | Yes |
| Skills and specialisms | form.skills | comma string to array | Optional; 30 skills/100 chars each | Yes |
| Internal notes | form.notes | textarea string | Optional; max 10000 | Yes; coordinator-only |

#### Donor CRUD modal

| Label | Variable/property | Type | Required/validation/default/example | Database need |
|---|---|---|---|---|
| Organization name / Full name | form.name | string | Required; 2+; max 200 | Yes |
| Donor type | form.type | enum select | Required; Individual/Institutional; default Individual | Yes |
| Email address | form.email | email string | Required; regex; unique; max 254 | Yes |
| Phone number | form.phone | phone string | Required; 7–15 digits; max 60 | Yes |
| Joined on | form.joinedOn | date string | Required; valid and not future | Yes |
| Address | form.address | string | Optional; max 1000 | Yes |
| Internal notes | form.notes | textarea string | Optional; max 10000 | Yes |

#### Contribution CRUD modal

| Label | Variable/property | Type | Required/validation/default/example | Database need |
|---|---|---|---|---|
| Donor | form.donorId | ID select | Required; existing donor only | Foreign reference |
| Contribution type | form.type | enum select | Required; Monetary/In-kind; default Monetary | Yes |
| Amount received/estimated value | form.amount | number | Monetary required; 0–1 trillion; max 2 decimals; monetary > 0 | Yes |
| Date received | form.date | date string | Required; valid and not future | Yes |
| Purpose/category | form.category | string | Required; non-empty; max 200 | Yes |
| Contribution notes/items and quantity | form.notes | textarea string | In-kind required; max 10000 | Yes |

amount represents either money or an in-kind estimate depending on type; in-kind values are excluded from monetary totals.

### H. Community drive management

Source: ServeBaseDrives.tsx:1220-1600.

#### Drive CRUD modal

| Label | Variable/property | Type | Required/validation/default/example | Database need |
|---|---|---|---|---|
| Drive name | driveForm.name | string | Required; max 200; e.g. Community food distribution | Yes |
| Drive date | driveForm.date | date string | Required; valid calendar date | Yes |
| Status | driveForm.status | enum select | Upcoming/Ongoing/Completed/Cancelled | Yes |
| Location | driveForm.location | string | Required; max 500 | Yes |
| Volunteer capacity | driveForm.capacity | integer number | Required; 1–100000 | Yes |
| SDG alignment | driveForm.sdg | enum select | SDG 1/11/17 | Yes |
| Description | driveForm.description | textarea string | Optional; max 10000 | Yes |

The form does not collect start time, end time, timezone, meeting point, organizer, budget or coordinator assignment.

#### Drive filters

| Label | Variable | Type | Default/options | Database need |
|---|---|---|---|---|
| Search drives/locations | search | search string | Empty | Temporary |
| Filter by status | status | enum select | All statuses plus drive statuses | Temporary |
| Directory view | view | button enum | table/cards; default table | Temporary |
| Rows per page | pageSize | number select | Default 10 | Temporary |

### I. Dashboard and reports

Sources: ServeBaseOverview.tsx:235-270 and 425-850; ServeBaseWorkspacePages.tsx:210-380.

| Page | Label | Variable | Type | Required/default | Database need |
|---|---|---|---|---|---|
| Overview | Reporting period | period | month select | Latest derived month or all | Temporary query |
| Overview | Chart metric | chart | button enum | money/hours; default money | Temporary |
| Overview | Drive view | driveView | button enum | all/scheduled/completed | Temporary |
| Overview | Filter drives | driveQuery | search string | Empty | Temporary |
| Overview | Location column | columns.location | boolean checkbox | Default true | Temporary |
| Overview | SDG alignment column | columns.impact | boolean checkbox | Default true | Temporary |
| Overview | Service hours column | columns.hours | boolean checkbox | Default true | Temporary |
| Reports | Dataset | dataset | button selection | volunteers default; six datasets | Temporary |
| Reports | From date | from | date string | Optional; empty default | Temporary |
| Reports | To date | to | date string | Optional; empty default | Temporary |

Reports expose volunteers, donors, donations, drives, participation and activity. Export rows include calculated joined names, not separate authoritative fields.

### J. Settings and backup

Source: ServeBaseWorkspacePages.tsx:480-820.

| Label | Variable/property | Type | Required/validation/default/example | Database need |
|---|---|---|---|---|
| Organization name | form.organizationName | string | Required; max 120 | Settings |
| Administrator name | form.adminName | string | Required; max 100 | Settings |
| Administrator email | form.adminEmail | email string | Required; regex; max 254 | Settings and future account contact |
| Organization phone | form.phone | phone string | Optional; max 24 | Settings |
| Office address | form.address | string | Optional; max 240 | Settings |
| Choose ServeBase backup | fileInput/File | JSON file | Optional action; JSON/.json; max 2 MB; schema validation | Import workflow, not a business field |

Restore confirmation has no additional field; the selected file is held temporarily in pending.text and pending.name.

## 5. Generated and calculated data

### Automatically generated

- newId(prefix) in ServeBaseStore.tsx:1175-1181 uses crypto.randomUUID() or a time/random fallback.
- IDs are generated for volunteers, donors, contributions, drives, participation and activities. Prefixes currently vary: vol, VOL, DNR, CON, drive, participation, par, act.
- Registration sets joinedOn from the India-local current date.
- Registration sets termsAcceptedAt to an ISO timestamp and termsVersion to 2026-10-26.
- Activities set at to an ISO timestamp and are capped at 80.
- New volunteers default to Active with empty notes.
- New volunteer reservations default to Registered and zero hours.

### Calculated; do not store redundantly

- Donor contribution totals.
- Drive roster count and remaining capacity.
- Attendance rate and total attended service hours.
- Overview charts and period totals.
- Follow-up queues and “no contribution” donors.
- Joined donor/volunteer/drive names in report previews.
- Filtered row counts and pagination.

## 6. Temporary UI-only state

These are not business fields: all search strings; all directory/report filters; pagination; chart/view/column toggles; open tabs, modal IDs and selected IDs; errors/notices/success messages; photo busy/submitting/withdrawing flags; password visibility/Caps Lock; reservation confirmed; restore pending file buffer; and theme/dock preferences.

Local session/preferences keys are also not operational documents:

- servebase-workspace-v1 — current workspace JSON, the only LocalStorage business-data container.
- servebase-demo-session — admin demo session flag in sessionStorage.
- servebase-volunteer-session-v1 — volunteer ID in sessionStorage.
- servebase-theme and servebase-volunteer-theme — theme preferences.
- servebase-dock-v1 — public dock placement.

## 7. Hardcoded/demo data

createDemoWorkspace() in ServeBaseStore.tsx:116-755 contains fictional starter records. The README documents 16 volunteers, 10 donors, 18 contributions, 7 drives and 28 participation records. Seed activities and default settings are in ServeBaseStore.tsx:703-758.

Other hardcoded/demo values:

- Public sample records in ServeBaseInteractions.tsx.
- Skill suggestions in ServeBaseVolunteerSignup.tsx:10-16 and ServeBaseVolunteer.tsx:400-410.
- Availability options: Weekdays, Weekends, Flexible.
- Drive statuses: Upcoming, Ongoing, Completed, Cancelled.
- SDG options: SDG 1, SDG 11, SDG 17.
- Participation statuses: Registered, Attended, Absent.
- Terms version 2026-10-26.

Demo values must not be confused with production seed data or authorization.

## 8. Relationships and references

1. One volunteer has many participation records: participation.volunteerId -> volunteers.id.
2. One drive has many participation records: participation.driveId -> drives.id.
3. One donor has many donations: donations.donorId -> donors.id.
4. A volunteer can participate in many drives through participation records.
5. A drive can contain many volunteers through participation records.
6. Activities currently use free-text detail and kind; they do not store a strict target foreign key.
7. Volunteer photos belong to volunteers but are currently embedded as data URLs.

Use stable Firestore document IDs for volunteers, donors and drives. Keep volunteerId, donorId and driveId as validated references/IDs in relationship documents. Names in reports should be denormalized display values only.

## 9. Missing fields and recommendations

No fields were added.

### Missing capability fields

- Identity, authUid, organization membership, role and authorization scope.
- organizationId on every operational document.
- Drive start/end time, timezone, meeting point, organizer/coordinator and contact details.
- Volunteer emergency contact, accessibility needs, eligibility/verification and communication preferences.
- Donor receipt/tax details, organization registration information and contact preferences.
- Donation receipt number, payment method, transaction reference, currency, receipt status and acknowledgement state.
- Attendance check-in/out, attendance timestamp, correction reason and marked-by user.
- Structured activity actor, target collection, target ID and action code.
- Explicit archive/soft-delete metadata.

### Inconsistencies to standardize

- Date properties vary between joinedOn, date, drive.date and activity.at.
- Admin CRUD requires volunteer/donor phone numbers, while volunteer signup/profile makes phone optional.
- Participation IDs use different prefixes by creation path.
- Donation.amount represents both money and in-kind estimate.
- Activity.kind is an unconstrained string while most status/type values are enums.
- Skills are entered as comma text then normalized to an array.

### Collected but not persisted as business data

- Admin email/password in demo login.
- Volunteer login email and selected profile are session/lookup inputs.
- Reservation confirmation checkbox.
- All report/filter/search/display controls.
- Public sample searches and export selection.
- Restore file selection after import completes.

## 10. Proposed Firestore structure

    organizations/{organizationId}
      name
      contact: { adminName, adminEmail, phone, address }
      createdAt
      updatedAt

    organizations/{organizationId}/members/{uid}
      role: admin | coordinator | volunteer
      volunteerId?
      status
      createdAt

    organizations/{organizationId}/volunteers/{volunteerId}
      name, email, phone, skills[], availability, status, joinedOn, notes
      photoPath?, termsAcceptedAt?, termsVersion?
      createdAt, updatedAt

    organizations/{organizationId}/donors/{donorId}
      name, type, email, phone, address, notes, joinedOn
      createdAt, updatedAt

    organizations/{organizationId}/donations/{donationId}
      donorId, amount, currency, date, type, category, notes
      createdAt, updatedAt

    organizations/{organizationId}/drives/{driveId}
      name, date, location, status, description, capacity, sdg
      createdAt, updatedAt

    organizations/{organizationId}/participation/{participationId}
      volunteerId, driveId, role, status, hours, notes
      registeredAt, attendanceUpdatedAt?, attendanceUpdatedBy?
      createdAt, updatedAt

    organizations/{organizationId}/activities/{activityId}
      action, kind, actorUid, targetCollection, targetId, detail, at

Firebase Storage path:

    organizations/{organizationId}/volunteers/{volunteerId}/profile.jpg

## 11. Migration implications

1. Preserve the current TypeScript entity shapes as the UI contract.
2. Add LocalStorage and Firestore repository adapters rather than rewriting pages.
3. Add organization and audit metadata at the repository boundary.
4. Move profile photos from embedded data URLs to Storage paths/URLs.
5. Keep existing relationship property names initially while converting values to Firestore IDs/references.
6. Continue deriving totals and report joins from source collections.
7. Import existing JSON backups only after validating IDs and links.
8. Add Firestore security rules before enabling shared access.
9. Replace demo session behavior with Firebase Auth only after role/organization authorization is defined.

## 12. Final findings

The frontend already exposes a coherent relational domain model, but it is currently stored as one LocalStorage workspace document. The core future database entities are volunteers, donors, donations, drives, participation, activities and organization settings. The highest-priority design decisions are organization scoping, authentication/roles, audit metadata, event timing/location, donation receipt/payment data, attendance auditability and profile-photo storage.

No Firebase implementation should begin until those decisions and the reference strategy are approved.
