import type { IconName } from "./ServeBaseIcons";

export type FeatureId = "volunteers" | "donors" | "drives" | "reports";

export interface FeatureContent {
  id: FeatureId;
  number: string;
  icon: IconName;
  name: string;
  title: string;
  description: string;
  headline: string;
  detail: string;
  tags: string[];
  fields: [string, string, string][];
  steps: [string, string][];
}

export const modules: FeatureContent[] = [
  {
    id: "volunteers",
    number: "01",
    icon: "users",
    name: "Volunteers",
    title: "A directory built for coordination",
    description:
      "Find someone who can teach, manage a registration desk, or help on a weekend. Skills and availability sit beside each volunteer’s contact details.",
    headline: "Volunteer directory",
    detail:
      "Open a profile to review contact information, notes, past assignments, and service hours. Mark a volunteer inactive when they step away; their participation record stays connected.",
    tags: ["Skill search", "Availability filters", "Profile history"],
    fields: [
      [
        "Profile reference",
        "Volunteer ID",
        "A stable identifier connects the person to their drive assignments.",
      ],
      [
        "Contact information",
        "Name, email, phone",
        "The details a coordinator needs before confirming an assignment.",
      ],
      [
        "Skills",
        "Searchable tags",
        "Record useful experience such as teaching, first aid, or logistics.",
      ],
      [
        "Availability",
        "Weekdays / weekends / flexible",
        "Filter the directory around the schedule of an upcoming drive.",
      ],
      [
        "Profile status",
        "Active / inactive",
        "Retain previous service records when someone is no longer available.",
      ],
    ],
    steps: [
      [
        "Add the person",
        "Enter contact details, select availability, and list the skills they can offer.",
      ],
      [
        "Choose an assignment",
        "Register an active volunteer for a drive and specify their responsibility.",
      ],
      [
        "Return to the record",
        "See previous drives, attendance, and recorded hours from the volunteer’s profile.",
      ],
    ],
  },
  {
    id: "donors",
    number: "02",
    icon: "heart",
    name: "Donors",
    title: "A ledger of practical support",
    description:
      "An individual donation and a partner’s supply delivery need different details. Record both against the supporter who provided them.",
    headline: "Donors and contributions",
    detail:
      "The donor directory holds individual and institutional contacts. A linked contribution ledger records dates, categories, monetary amounts, and descriptions of goods received.",
    tags: [
      "Individual or institution",
      "Cash and in-kind records",
      "Contribution ledger",
    ],
    fields: [
      [
        "Supporter reference",
        "Donor ID",
        "Each contribution points back to an existing donor profile.",
      ],
      [
        "Donor category",
        "Individual / institutional",
        "Distinguish a personal contact from an organization or partner.",
      ],
      [
        "Follow-up details",
        "Email, phone, address",
        "Keep the information needed to contact the supporter again.",
      ],
      [
        "Contribution entry",
        "Date, type, amount",
        "Separate monetary donations from goods; an in-kind valuation is optional.",
      ],
      [
        "Purpose and notes",
        "Category and description",
        "Specify the intended use and describe any donated items.",
      ],
    ],
    steps: [
      [
        "Identify the supporter",
        "Create an individual or institutional contact before adding a contribution.",
      ],
      [
        "Enter what arrived",
        "Choose monetary or in-kind support, add its date, and describe the purpose.",
      ],
      [
        "Review the ledger",
        "Filter contributions by type or date, then open a donor’s full giving history.",
      ],
    ],
  },
  {
    id: "drives",
    number: "03",
    icon: "calendar",
    name: "Drives",
    title: "The plan and the turnout",
    description:
      "A drive starts with a place, a date, and a capacity. Build the roster, assign responsibilities, and record what happened after the event.",
    headline: "Drives and participation",
    detail:
      "The drive record brings scheduling and attendance together. Registration checks capacity and prevents duplicate assignments; completed participation records capture roles, notes, and service hours.",
    tags: ["Capacity checks", "Assigned roles", "Attendance and hours"],
    fields: [
      [
        "Drive outline",
        "Name, date, location",
        "Give each initiative a clear schedule and meeting place.",
      ],
      [
        "Capacity and status",
        "Places and progress",
        "Set a roster limit and track upcoming, ongoing, completed, or cancelled drives.",
      ],
      [
        "Volunteer assignment",
        "Person and drive",
        "Link one volunteer to one drive without duplicating their registration.",
      ],
      [
        "Assigned role",
        "Responsibility",
        "Specify the job, from registration support to distribution or teaching.",
      ],
      [
        "Participation outcome",
        "Attendance, hours, notes",
        "Record registered, attended, or absent status alongside actual service hours.",
      ],
    ],
    steps: [
      [
        "Set the brief",
        "Add the drive’s purpose, location, date, capacity, and SDG alignment.",
      ],
      [
        "Fill the roster",
        "Choose active volunteers and give each assignment a specific role.",
      ],
      [
        "Close the register",
        "Update attendance and hours so the drive and volunteer histories agree.",
      ],
    ],
  },
  {
    id: "reports",
    number: "04",
    icon: "download",
    name: "Reports",
    title: "Records ready for the review",
    description:
      "Choose a dataset, narrow the dates, and inspect the rows before downloading. Six CSV views cover the records used throughout the workspace.",
    headline: "Reports and backup",
    detail:
      "Export volunteer and donor directories, contributions, drives, participation, or the activity log. A separate JSON backup contains the full browser workspace and can be validated before restore.",
    tags: ["Six CSV datasets", "Date filters", "JSON backup and restore"],
    fields: [
      [
        "Report selection",
        "Six datasets",
        "Choose volunteers, donors, contributions, drives, participation, or activity.",
      ],
      [
        "Date range",
        "From and to",
        "Directory reports use joining dates; participation uses the linked drive date.",
      ],
      [
        "CSV download",
        "Matching rows",
        "Export all records within the selected filters, including rows beyond the preview.",
      ],
      [
        "Workspace backup",
        "JSON file",
        "Save linked records, organization settings, and activity in one portable file.",
      ],
      [
        "Restore checks",
        "Schema and relationships",
        "Validate field values, identifiers, and record links before replacing local data.",
      ],
    ],
    steps: [
      [
        "Select the register",
        "Pick the report that matches the directory, ledger, or history under review.",
      ],
      [
        "Check the rows",
        "Set a date range and inspect the preview to confirm the scope.",
      ],
      [
        "Download a working copy",
        "Use CSV for a report or save a complete JSON backup from workspace settings.",
      ],
    ],
  },
];

export const members = [
  { name: "Jyoti Sharma", initials: "JS", roll: "2501420052" },
  { name: "Shriyashi", initials: "SH", roll: "2501420023" },
  { name: "Himanchal", initials: "HI", roll: "2501420001" },
  { name: "Anay", initials: "AN", roll: "2501420012" },
  { name: "Sarthak", initials: "SA", roll: "2501420015" },
];

export const projectFacts = {
  university: "K.R. Mangalam University",
  credits: "Second Year Community Service Evaluation",
  teamline: "Jyoti Sharma · Shriyashi · Himanchal · Anay · Sarthak",
  notice: "Destination Success · Academic Software Prototype",
  storage: "This demo stores its workspace in the current browser.",
};
