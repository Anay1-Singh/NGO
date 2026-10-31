# ServeBase

A professional NGO volunteer and donor management prototype based on the supplied K.R. Mangalam University Community Service presentation. Includes the institutional landing page, a complete local admin workspace, and a separate personal volunteer fieldbook.

## Run

### Requirements

- Node.js 20 or newer (Node.js 22 LTS is recommended)
- npm 10 or newer
- A current Chrome, Edge, Firefox, or Safari browser

Clone the repository and enter the project directory:

```sh
git clone https://github.com/Anay1-Singh/NGO.git
cd NGO/servebase
```

If the repository is checked out with `servebase` as its root, simply run the
commands below from that directory. The application is a Vite React prototype;
it does not need a database, API key, or environment file.

```sh
npm install
npm run dev
```

```sh
npm run build
npm run preview
```

Open **Admin Login**, then click **Sign in to ServeBase**. Credentials are optional in this evaluation demo. The browser tab remembers demo entry; **Exit demo workspace** clears it. This is a demo entry mechanism, not production authentication.

To create a volunteer account, open **Volunteer access → Create a volunteer
account**. Registration requires accepting the Terms & Conditions and supports
an optional JPG, PNG, or WebP profile photo. Account data, photos, and terms
acceptance are stored in this browser's local workspace only. There is no
server-side authentication in this prototype.

## Public pages

| Page | Route |
| --- | --- |
| Home | `#/` |
| Features | `#/features` |
| Volunteer management | `#/features/volunteers` |
| Donors & contributions | `#/features/donors` |
| Drives & participation | `#/features/drives` |
| Reports & portability | `#/features/reports` |
| SDG Impact | `#/impact` |
| System Architecture | `#/architecture` |
| Team | `#/team` |
| Documentation | `#/documentation` |
| Terms & Conditions | `#/terms` |

The local interface uses an offset identity rail, a movable navigation dock, and a native dialog index in the upper-right. Admin navigation occupies a floating right rail. Pure black remains the default backdrop, with neutral charcoal surfaces, sky-blue public actions, lavender details, peach accents, and a persistent light option. The admin console has its own restrained violet, mint, amber, and blue palette. Smaller display headings and tighter section spacing make the directories and technical information visible earlier.

`ServeBaseMotion.tsx` adds actual pointer-driven light passes, click ripples, press compression, and once-only scroll transitions without replacing native links, forms, or dialogs. The home page scrubs a real three-card stack through profile, assignment, and attendance stages. Each full card slides out, tilts, and returns behind the next sheet as the story scrolls; reversing the scroll retraces the same motion. The stack stays visible while its story is read on mobile. Reduced-motion users get settled card changes without the shuffle. Primary actions morph their corner radius and slide their labels on hover. Discrete mouse-wheel steps use short, time-based smoothing; precision trackpads, touch, keyboard scrolling, and nested scroll containers retain native behavior. Section jumps and Back to top share an interruptible eased timeline. Opening a dialog stops background motion. Reduced-motion preferences disable those effects and keep all content visible. Menus preserve keyboard focus and Escape behavior. Ctrl/Command+K opens a searchable index; arrow-down and Enter navigate directly to a result, including individual modules. Mobile feature pages show module shortcuts and the directory before the sample preview, with an explicit return control. The admin drawer locks background scrolling, traps focus, and dismisses even when the current route is selected.

Feature samples, SDG selection, contributor records, and current/planned architecture views are interactive. The copy is specific to each page and the underlying NGO workflow. Architecture descriptions continue to distinguish the local evaluation build from future server integrations. This revision was implemented locally; no MagicPath tools or publishing were used.

## Movable navigation

Drag the dotted grip to place the public-page dock anywhere. Release near an edge to snap: left and right use a vertical layout, while top and bottom use a horizontal layout. The shape and item positions animate together, with a landing guide during dragging. Wide layouts leave room beside a side dock; a top dock has a separate lane above page utilities.

The position menu provides each edge, a floating option, and reset. When the grip is focused, arrow keys nudge the dock, Shift moves farther, Alt plus an arrow snaps to that edge, and Home resets it. Escape cancels an active move. Position persists across public pages and reloads in `servebase-dock-v1`; invalid or unavailable storage falls back safely. Touch dragging and reduced-motion preferences are supported.

## Workspace

| Page | Route | Capabilities |
| --- | --- | --- |
| Overview | `#/admin/overview` | Live totals, dynamic periods, selectable contribution/service-hour chart, record-based follow-ups, searchable drive board, configurable columns, pagination, roster links, contribution ledger, guided procedures, activity journal, operations CSV brief |
| Volunteers | `#/admin/volunteers` | Create, edit, view, search, sort, availability/status filters, skills, contact details, participation histories, archive, protected deletion, CSV |
| Donors | `#/admin/donors` | Individual/institutional profiles, contact details, contribution histories, search, sorting, protected deletion, CSV |
| Contributions | `#/admin/donations` | Donor-linked monetary and in-kind entries, INR values, dates, categories, notes, filters, details, editing, deletion, CSV |
| Community drives | `#/admin/drives` | Dates, locations, capacity, SDG alignment, statuses, table/card views, roster details, editing, protected deletion, CSV |
| Participation | `#/admin/participation` | Volunteer/drive links, assigned roles, attendance, service hours, duplicate and capacity checks, filters, pagination, CSV |
| Reports | `#/admin/reports` | Six datasets, date ranges, actual row preview, full matching CSV exports, JSON backup |
| Settings | `#/admin/settings` | Organization/profile details, validated backup restore, sample reset, project scope and future integrations |

Global search finds volunteers, donors, and drives. Pure black (`#000000`) is the default theme; the light/dark preference persists. Keyboard navigation, native modal focus management, responsive layouts, and reduced-motion settings are supported.

The admin overview is organized as an operations desk: four scoped summary signals, a command tray for new records, an interactive six-month chart, and follow-ups calculated from actual roster and attendance records. The drive board includes dates, locations, capacity, attended hours, SDG alignment, statuses, and direct roster actions. Its search, view filters, column choices, and pagination are local to the overview. The contribution ledger follows the reporting period; directory totals and the follow-up queue are explicitly marked as workspace-wide.

The Guide control in every admin header opens a keyboard-accessible handbook with chapters for people, drives, contributions, and reporting. Each chapter contains practical instructions, record-integrity notes, and links to the actual next action. The overview also has compact procedures for before a drive, after a drive, and institutional review. Export brief downloads a CSV containing the selected period's summary, drives, and contributions, and records the export in the activity journal. Export activity opens Reports with the activity dataset selected.

## Volunteer fieldbook

The volunteer experience has a separate sign-in and a different visual system: warm paper, forest green, rust, and ochre; serif display type; chapter tabs; ticket-shaped drive cards; a personal member pass; and mobile navigation along the bottom. The admin palette and right rail are not reused.

| Page | Route | What a volunteer can do |
| --- | --- | --- |
| Volunteer entry | `#/volunteer/login` | Select an active demo profile, or find one by its unique email |
| Volunteer registration | `#/volunteer/register` | Create a local volunteer account, accept terms, and optionally add a profile photo |
| My fieldbook | `#/volunteer/home` | See personal attended hours, current reservations, next assignment, preparation notes, and recent service |
| Find a drive | `#/volunteer/drives` | Search and filter organizer-listed drives, read practical details, choose a role, and reserve an available place |
| My service | `#/volunteer/history` | Review personal attendance and service hours, filter the record, and download an own-record CSV |
| My details | `#/volunteer/profile` | Update contact details, skills, and availability while preserving member identity and service history |

Volunteer entry is an explicit local demonstration, not production authentication. It uses `sessionStorage` key `servebase-volunteer-session-v1` and stores a volunteer ID independently of the admin entry flag. Missing or inactive identities are returned to volunteer entry. Signing out of one area does not sign out of the other. Volunteer pages use their own light paper surface without changing the saved admin/public theme preference.

The two experiences share one workspace provider, so profile edits and reservations are visible in the admin UI in the same tab. Registration checks the current active identity, drive status/date, duplicate volunteer–drive pair, capacity, and record limit before adding a Registered entry with zero hours. A volunteer can confirm withdrawal of only their own Registered reservation for a current/future Upcoming drive. Attendance, hours, directory status, membership dates, and internal coordinator notes cannot be edited from the volunteer pages. Internal notes are excluded from the personal record view and CSV.

Profile updates whitelist name, email, phone, skills, and availability. Identity, joining date, status, and internal notes stay intact. The browser stores the shared data locally; separate tabs do not receive live server synchronization. The volunteer bundle loads on entry to keep the public/admin bundle small.

## Data and integrity

The starter dataset is fictional: 16 volunteers, 10 donors, 18 contributions, 7 drives, and 28 participation records. The snapshot represents 21 October 2026. Monetary contributions total ₹1,42,000; attended participation totals 64 hours. Overview figures and reports are calculated from the current workspace records, not independent mock totals.

Workspace data is saved in `localStorage` under `servebase-workspace-v1`. The demo-entry flag uses `sessionStorage`; passwords are never checked, sent, or persisted. Browser storage errors are surfaced, with in-memory work kept available for export. Backups validate schema, field bounds, unique identifiers, and linked records before replacing data. CSV cells are quoted and spreadsheet-formula prefixes are neutralized.

Profile photos are resized to a 256 × 256 JPEG and kept under the local
workspace limit. JSON backups include photos and terms metadata; CSV exports
contain record fields and do not embed image data. Use the Terms & Conditions
page in the app for the complete local-demo data and usage terms.

Download a JSON backup before clearing browser data or switching devices. Restoring sample records replaces the current local workspace and requires confirmation. Linked profiles/drives are protected from deletion; volunteer archiving preserves their participation history.

## Scope

The core presentation scope is functional as a browser-based demo. Real authentication, multi-user permissions, a shared Node/Express + MySQL/Firebase backend, email/SMS delivery, a connected donor portal, payments, and mobile distribution remain planned integrations. A separate volunteer fieldbook is available against the local demo records. The settings page identifies these explicitly. Browser storage is not a production database or access-control boundary.

Project team: Jyoti Sharma, Shriyashi, Himanchal, Anay, Sarthak.

Submitted for Second Year Community Service Evaluation at K.R. Mangalam University. Destination Success · Academic Software Prototype.



