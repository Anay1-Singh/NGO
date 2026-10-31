import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isProfilePhoto } from "./ServeBaseProfileImage";

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  availability: "Weekdays" | "Weekends" | "Flexible";
  status: "Active" | "Inactive";
  joinedOn: string;
  notes: string;
  photo?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export interface Donor {
  id: string;
  name: string;
  type: "Individual" | "Institutional";
  email: string;
  phone: string;
  address: string;
  notes: string;
  joinedOn: string;
}

export interface Donation {
  id: string;
  donorId: string;
  amount: number;
  date: string;
  type: "Monetary" | "In-kind";
  category: string;
  notes: string;
}

export interface Drive {
  id: string;
  name: string;
  date: string;
  location: string;
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
  description: string;
  capacity: number;
  sdg: "SDG 1" | "SDG 11" | "SDG 17";
}

export interface Participation {
  id: string;
  volunteerId: string;
  driveId: string;
  role: string;
  status: "Registered" | "Attended" | "Absent";
  hours: number;
  notes: string;
}

export interface Activity {
  id: string;
  at: string;
  title: string;
  detail: string;
  kind: string;
}

export interface WorkspaceSettings {
  organizationName: string;
  adminName: string;
  adminEmail: string;
  phone: string;
  address: string;
}

export interface WorkspaceData {
  version: 1;
  volunteers: Volunteer[];
  donors: Donor[];
  donations: Donation[];
  drives: Drive[];
  participation: Participation[];
  activities: Activity[];
  settings: WorkspaceSettings;
}

interface ActivityInput {
  title: string;
  detail: string;
  kind: string;
}

interface WorkspaceContextValue {
  db: WorkspaceData;
  update: (
    recipe: (db: WorkspaceData) => WorkspaceData,
    activity?: ActivityInput,
  ) => boolean;
  resetDemo: () => void;
  importBackup: (raw: string) => { ok: boolean; error?: string };
  storageError: string | null;
}

const STORAGE_KEY = "servebase-workspace-v1";
const MAX_BACKUP_BYTES = 2_000_000;
const MAX_RECORDS = 5_000;
const MAX_ACTIVITY = 80;
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** This workspace is a browser-local demonstration, with no authentication credentials. */
export function createDemoWorkspace(): WorkspaceData {
  const volunteers: Volunteer[] = [
    {
      id: "vol-01",
      name: "Aarav Mehta",
      email: "aarav.mehta@example.org",
      phone: "+91 90000 01001",
      skills: ["Event coordination", "Teaching"],
      availability: "Weekends",
      status: "Active",
      joinedOn: "2026-07-12",
      notes: "Available for Gurgaon community drives. Prefers morning shifts.",
    },
    {
      id: "vol-02",
      name: "Ishita Rao",
      email: "ishita.rao@example.org",
      phone: "+91 90000 01002",
      skills: ["First aid", "Community outreach"],
      availability: "Flexible",
      status: "Active",
      joinedOn: "2026-07-18",
      notes: "Completed the volunteer orientation and first-aid workshop.",
    },
    {
      id: "vol-03",
      name: "Kabir Sethi",
      email: "kabir.sethi@example.org",
      phone: "+91 90000 01003",
      skills: ["Logistics", "Driving"],
      availability: "Weekdays",
      status: "Active",
      joinedOn: "2026-07-23",
      notes: "Supports material pickup and distribution coordination.",
    },
    {
      id: "vol-04",
      name: "Ananya Nair",
      email: "ananya.nair@example.org",
      phone: "+91 90000 01004",
      skills: ["Teaching", "Hindi translation"],
      availability: "Weekends",
      status: "Active",
      joinedOn: "2026-08-02",
      notes: "Interested in literacy and after-school learning sessions.",
    },
    {
      id: "vol-05",
      name: "Rohan Bansal",
      email: "rohan.bansal@example.org",
      phone: "+91 90000 01005",
      skills: ["Photography", "Documentation"],
      availability: "Flexible",
      status: "Active",
      joinedOn: "2026-08-05",
      notes: "Documents activities with participant consent.",
    },
    {
      id: "vol-06",
      name: "Meera Kapoor",
      email: "meera.kapoor@example.org",
      phone: "+91 90000 01006",
      skills: ["Community outreach", "Registration"],
      availability: "Weekdays",
      status: "Active",
      joinedOn: "2026-08-11",
      notes: "Supports beneficiary registration and follow-up.",
    },
    {
      id: "vol-07",
      name: "Dev Malhotra",
      email: "dev.malhotra@example.org",
      phone: "+91 90000 01007",
      skills: ["Data entry", "Reporting"],
      availability: "Weekends",
      status: "Active",
      joinedOn: "2026-08-16",
      notes: "Maintains event attendance records.",
    },
    {
      id: "vol-08",
      name: "Sara Khan",
      email: "sara.khan@example.org",
      phone: "+91 90000 01008",
      skills: ["First aid", "Registration"],
      availability: "Flexible",
      status: "Active",
      joinedOn: "2026-08-20",
      notes: "Comfortable managing help desks at health camps.",
    },
    {
      id: "vol-09",
      name: "Aditya Verma",
      email: "aditya.verma@example.org",
      phone: "+91 90000 01009",
      skills: ["Logistics", "Event coordination"],
      availability: "Weekends",
      status: "Active",
      joinedOn: "2026-08-25",
      notes: "Can coordinate setup and packing teams.",
    },
    {
      id: "vol-10",
      name: "Nisha Iyer",
      email: "nisha.iyer@example.org",
      phone: "+91 90000 01010",
      skills: ["Teaching", "Art facilitation"],
      availability: "Weekdays",
      status: "Active",
      joinedOn: "2026-09-01",
      notes: "Runs creative learning activities for children.",
    },
    {
      id: "vol-11",
      name: "Arjun Das",
      email: "arjun.das@example.org",
      phone: "+91 90000 01011",
      skills: ["Community outreach", "Waste segregation"],
      availability: "Weekends",
      status: "Active",
      joinedOn: "2026-09-07",
      notes: "Interested in neighbourhood cleanups and sustainability.",
    },
    {
      id: "vol-12",
      name: "Tanya Joshi",
      email: "tanya.joshi@example.org",
      phone: "+91 90000 01012",
      skills: ["Social media", "Documentation"],
      availability: "Flexible",
      status: "Active",
      joinedOn: "2026-09-12",
      notes: "Drafts event summaries and community updates.",
    },
    {
      id: "vol-13",
      name: "Vihaan Sen",
      email: "vihaan.sen@example.org",
      phone: "+91 90000 01013",
      skills: ["Logistics", "Data entry"],
      availability: "Weekdays",
      status: "Active",
      joinedOn: "2026-09-19",
      notes: "Available after 2 pm on weekdays.",
    },
    {
      id: "vol-14",
      name: "Pooja Desai",
      email: "pooja.desai@example.org",
      phone: "+91 90000 01014",
      skills: ["First aid", "Nutrition awareness"],
      availability: "Weekends",
      status: "Active",
      joinedOn: "2026-10-02",
      notes: "Supports nutrition awareness workshops.",
    },
    {
      id: "vol-15",
      name: "Kunal Arora",
      email: "kunal.arora@example.org",
      phone: "+91 90000 01015",
      skills: ["Teaching", "Registration"],
      availability: "Weekends",
      status: "Inactive",
      joinedOn: "2026-08-09",
      notes:
        "On an academic break until December. Retain participation history.",
    },
    {
      id: "vol-16",
      name: "Riya Menon",
      email: "riya.menon@example.org",
      phone: "+91 90000 01016",
      skills: ["Photography", "Community outreach"],
      availability: "Flexible",
      status: "Inactive",
      joinedOn: "2026-09-04",
      notes: "Temporarily unavailable. Contact before assigning a new drive.",
    },
  ];

  const donors: Donor[] = [
    {
      id: "don-01",
      name: "Neha Suri",
      type: "Individual",
      email: "neha.suri@example.org",
      phone: "+91 90000 02001",
      address: "Gurugram, Haryana",
      notes: "Supports education and local community outreach.",
      joinedOn: "2026-05-01",
    },
    {
      id: "don-02",
      name: "Asha Community Trust",
      type: "Institutional",
      email: "asha.trust@example.org",
      phone: "+91 90000 02002",
      address: "New Delhi",
      notes: "Fictional partner organisation. Quarterly contribution cycle.",
      joinedOn: "2026-06-01",
    },
    {
      id: "don-03",
      name: "Vikram Khanna",
      type: "Individual",
      email: "vikram.khanna@example.org",
      phone: "+91 90000 02003",
      address: "Faridabad, Haryana",
      notes: "Prefers contributing to health and nutrition drives.",
      joinedOn: "2026-06-04",
    },
    {
      id: "don-04",
      name: "BrightPath Foundation",
      type: "Institutional",
      email: "brightpath@example.org",
      phone: "+91 90000 02004",
      address: "Gurugram, Haryana",
      notes: "Fictional foundation supporting learning materials.",
      joinedOn: "2026-07-01",
    },
    {
      id: "don-05",
      name: "Priya Nanda",
      type: "Individual",
      email: "priya.nanda@example.org",
      phone: "+91 90000 02005",
      address: "Noida, Uttar Pradesh",
      notes: "Supports general community operations.",
      joinedOn: "2026-07-12",
    },
    {
      id: "don-06",
      name: "GreenStep Collective",
      type: "Institutional",
      email: "greenstep@example.org",
      phone: "+91 90000 02006",
      address: "New Delhi",
      notes: "Fictional community partner for sustainability initiatives.",
      joinedOn: "2026-08-01",
    },
    {
      id: "don-07",
      name: "Sanjay Mathur",
      type: "Individual",
      email: "sanjay.mathur@example.org",
      phone: "+91 90000 02007",
      address: "Gurugram, Haryana",
      notes: "Donates stationery and learning supplies.",
      joinedOn: "2026-08-08",
    },
    {
      id: "don-08",
      name: "CareBridge Partners",
      type: "Institutional",
      email: "carebridge@example.org",
      phone: "+91 90000 02008",
      address: "Faridabad, Haryana",
      notes: "Fictional donor for essential supplies and relief work.",
      joinedOn: "2026-09-14",
    },
    {
      id: "don-09",
      name: "Aditi Bhatia",
      type: "Individual",
      email: "aditi.bhatia@example.org",
      phone: "+91 90000 02009",
      address: "New Delhi",
      notes: "Interested in recurring food-support contributions.",
      joinedOn: "2026-09-28",
    },
    {
      id: "don-10",
      name: "Learning Circle Initiative",
      type: "Institutional",
      email: "learning.circle@example.org",
      phone: "+91 90000 02010",
      address: "Gurugram, Haryana",
      notes: "Fictional partner coordinating educational resources.",
      joinedOn: "2026-10-06",
    },
  ];

  const donations: Donation[] = [
    {
      id: "txn-01",
      donorId: "don-01",
      amount: 5000,
      date: "2026-05-05",
      type: "Monetary",
      category: "Education",
      notes: "Learning materials fund.",
    },
    {
      id: "txn-02",
      donorId: "don-02",
      amount: 25000,
      date: "2026-06-12",
      type: "Monetary",
      category: "General support",
      notes: "Community operations contribution.",
    },
    {
      id: "txn-03",
      donorId: "don-03",
      amount: 7500,
      date: "2026-06-22",
      type: "Monetary",
      category: "Health & wellbeing",
      notes: "Health camp supplies.",
    },
    {
      id: "txn-04",
      donorId: "don-04",
      amount: 15000,
      date: "2026-07-02",
      type: "Monetary",
      category: "Education",
      notes: "After-school learning programme.",
    },
    {
      id: "txn-05",
      donorId: "don-05",
      amount: 3000,
      date: "2026-07-16",
      type: "Monetary",
      category: "General support",
      notes: "Unrestricted contribution.",
    },
    {
      id: "txn-06",
      donorId: "don-06",
      amount: 10000,
      date: "2026-08-10",
      type: "Monetary",
      category: "Environment",
      notes: "Cleanup materials and waste sorting.",
    },
    {
      id: "txn-07",
      donorId: "don-07",
      amount: 0,
      date: "2026-08-15",
      type: "In-kind",
      category: "Education",
      notes:
        "60 notebooks and 30 stationery kits. No monetary valuation recorded.",
    },
    {
      id: "txn-08",
      donorId: "don-08",
      amount: 20000,
      date: "2026-09-18",
      type: "Monetary",
      category: "Relief & essentials",
      notes: "Essential supplies for community distribution.",
    },
    {
      id: "txn-09",
      donorId: "don-09",
      amount: 2500,
      date: "2026-09-29",
      type: "Monetary",
      category: "Food & nutrition",
      notes: "Community kitchen contribution.",
    },
    {
      id: "txn-10",
      donorId: "don-01",
      amount: 4000,
      date: "2026-08-26",
      type: "Monetary",
      category: "Education",
      notes: "Learning sessions contribution.",
    },
    {
      id: "txn-11",
      donorId: "don-02",
      amount: 18000,
      date: "2026-09-03",
      type: "Monetary",
      category: "General support",
      notes: "Community operations contribution.",
    },
    {
      id: "txn-12",
      donorId: "don-03",
      amount: 5000,
      date: "2026-09-07",
      type: "Monetary",
      category: "Health & wellbeing",
      notes: "Neighbourhood health camp.",
    },
    {
      id: "txn-13",
      donorId: "don-10",
      amount: 12000,
      date: "2026-10-08",
      type: "Monetary",
      category: "Education",
      notes: "Learning programme contribution.",
    },
    {
      id: "txn-14",
      donorId: "don-06",
      amount: 0,
      date: "2026-10-10",
      type: "In-kind",
      category: "Environment",
      notes:
        "40 reusable gloves and 20 waste-segregation sacks. No monetary valuation recorded.",
    },
    {
      id: "txn-15",
      donorId: "don-05",
      amount: 3500,
      date: "2026-10-12",
      type: "Monetary",
      category: "Food & nutrition",
      notes: "Community kitchen supplies.",
    },
    {
      id: "txn-16",
      donorId: "don-08",
      amount: 0,
      date: "2026-10-16",
      type: "In-kind",
      category: "Relief & essentials",
      notes: "40 essential care kits. No monetary valuation recorded.",
    },
    {
      id: "txn-17",
      donorId: "don-09",
      amount: 3000,
      date: "2026-10-18",
      type: "Monetary",
      category: "Food & nutrition",
      notes: "Food distribution contribution.",
    },
    {
      id: "txn-18",
      donorId: "don-04",
      amount: 8500,
      date: "2026-10-20",
      type: "Monetary",
      category: "Education",
      notes: "Winter learning materials.",
    },
  ];

  const drives: Drive[] = [
    {
      id: "drv-01",
      name: "Neighbourhood Cleanup",
      date: "2026-10-03",
      location: "Sector 56 Community Park, Gurugram",
      status: "Completed",
      description:
        "Community park cleanup, waste segregation awareness, and responsible disposal of collected materials.",
      capacity: 20,
      sdg: "SDG 11",
    },
    {
      id: "drv-02",
      name: "Learning Together Workshop",
      date: "2026-10-08",
      location: "Community Learning Centre, Sohna",
      status: "Completed",
      description:
        "Reading practice and creative learning sessions for children, with distribution of learning materials.",
      capacity: 15,
      sdg: "SDG 1",
    },
    {
      id: "drv-03",
      name: "Community Health Camp",
      date: "2026-10-12",
      location: "Sector 49 Community Hall, Gurugram",
      status: "Completed",
      description:
        "Help-desk support, registration, first-aid awareness, and queue coordination for a community health camp.",
      capacity: 18,
      sdg: "SDG 17",
    },
    {
      id: "drv-04",
      name: "Essentials Distribution",
      date: "2026-10-17",
      location: "Sohna Community Centre, Haryana",
      status: "Completed",
      description:
        "Organised distribution of essential care kits with stock checks and beneficiary registration.",
      capacity: 16,
      sdg: "SDG 1",
    },
    {
      id: "drv-05",
      name: "Community Kitchen Support",
      date: "2026-10-21",
      location: "Sector 10 Community Kitchen, Gurugram",
      status: "Ongoing",
      description:
        "Meal preparation support, safe packaging, distribution coordination, and cleanup.",
      capacity: 12,
      sdg: "SDG 1",
    },
    {
      id: "drv-06",
      name: "Green Neighbourhood Initiative",
      date: "2026-10-28",
      location: "Sector 57 Green Belt, Gurugram",
      status: "Upcoming",
      description:
        "Neighbourhood cleanup and community awareness activities with local partner groups.",
      capacity: 24,
      sdg: "SDG 11",
    },
    {
      id: "drv-07",
      name: "Winter Learning Drive",
      date: "2026-11-07",
      location: "Community Learning Centre, Sohna",
      status: "Upcoming",
      description:
        "Volunteer-led literacy sessions and distribution of winter learning materials with partner support.",
      capacity: 20,
      sdg: "SDG 17",
    },
  ];

  const attendance: Array<
    [string, string, string, Participation["status"], number]
  > = [
    ["vol-01", "drv-01", "Drive coordinator", "Attended", 4],
    ["vol-03", "drv-01", "Logistics support", "Attended", 4],
    ["vol-05", "drv-01", "Documentation", "Attended", 3],
    ["vol-11", "drv-01", "Waste segregation lead", "Attended", 4],
    ["vol-15", "drv-01", "Registration desk", "Absent", 0],
    ["vol-04", "drv-02", "Learning facilitator", "Attended", 3],
    ["vol-10", "drv-02", "Creative activities", "Attended", 3],
    ["vol-07", "drv-02", "Attendance coordinator", "Attended", 3],
    ["vol-12", "drv-02", "Documentation", "Attended", 2],
    ["vol-02", "drv-03", "First-aid support", "Attended", 5],
    ["vol-06", "drv-03", "Registration desk", "Attended", 5],
    ["vol-08", "drv-03", "Help-desk coordinator", "Attended", 5],
    ["vol-09", "drv-03", "Logistics support", "Attended", 4],
    ["vol-14", "drv-03", "Nutrition awareness", "Absent", 0],
    ["vol-01", "drv-04", "Drive coordinator", "Attended", 4],
    ["vol-03", "drv-04", "Distribution support", "Attended", 4],
    ["vol-06", "drv-04", "Beneficiary registration", "Attended", 4],
    ["vol-13", "drv-04", "Stock verification", "Attended", 4],
    ["vol-16", "drv-04", "Documentation", "Attended", 3],
    ["vol-02", "drv-05", "Safety desk", "Registered", 0],
    ["vol-08", "drv-05", "Distribution support", "Registered", 0],
    ["vol-09", "drv-05", "Logistics support", "Registered", 0],
    ["vol-14", "drv-05", "Nutrition awareness", "Registered", 0],
    ["vol-01", "drv-06", "Drive coordinator", "Registered", 0],
    ["vol-11", "drv-06", "Waste segregation lead", "Registered", 0],
    ["vol-12", "drv-06", "Documentation", "Registered", 0],
    ["vol-04", "drv-07", "Learning facilitator", "Registered", 0],
    ["vol-10", "drv-07", "Creative activities", "Registered", 0],
  ];

  return {
    version: 1,
    volunteers,
    donors,
    donations,
    drives,
    participation: attendance.map(
      ([volunteerId, driveId, role, status, hours], index) => ({
        id: `par-${String(index + 1).padStart(2, "0")}`,
        volunteerId,
        driveId,
        role,
        status,
        hours,
        notes:
          status === "Absent"
            ? "Did not attend; no service hours recorded."
            : "",
      }),
    ),
    activities: [
      {
        id: "act-seed-01",
        at: "2026-10-21T04:00:00.000Z",
        title: "Community kitchen is underway",
        detail:
          "Four volunteers registered for today’s community kitchen support drive.",
        kind: "drive",
      },
      {
        id: "act-seed-02",
        at: "2026-10-20T09:30:00.000Z",
        title: "Contribution recorded",
        detail:
          "BrightPath Foundation contributed ₹8,500 to education initiatives.",
        kind: "donation",
      },
      {
        id: "act-seed-03",
        at: "2026-10-18T08:15:00.000Z",
        title: "Food support contribution",
        detail: "Aditi Bhatia contributed ₹3,000 to food and nutrition.",
        kind: "donation",
      },
      {
        id: "act-seed-04",
        at: "2026-10-17T11:00:00.000Z",
        title: "Drive completed",
        detail:
          "Essentials Distribution completed with five attending volunteers and 19 recorded service hours.",
        kind: "participation",
      },
      {
        id: "act-seed-05",
        at: "2026-10-16T07:45:00.000Z",
        title: "In-kind contribution recorded",
        detail: "CareBridge Partners provided 40 essential care kits.",
        kind: "donation",
      },
      {
        id: "act-seed-06",
        at: "2026-10-12T12:00:00.000Z",
        title: "Health camp attendance updated",
        detail:
          "Four volunteers attended the Community Health Camp; one absence was recorded.",
        kind: "participation",
      },
    ],
    settings: {
      organizationName: "ServeBase Community Foundation",
      adminName: "Anay",
      adminEmail: "admin@servebase.example",
      phone: "+91 90000 00000",
      address: "K.R. Mangalam University, Sohna Road, Gurugram, Haryana",
    },
  };
}

type JsonRecord = Record<string, unknown>;

function fail(message: string): never {
  throw new Error(message);
}

function record(value: unknown, keys: string[], label: string, optionalKeys: string[] = []): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${label} must be an object.`);
  const candidate = value as JsonRecord;
  const actual = Object.keys(candidate);
  if (
    keys.some((key) => !Object.hasOwn(candidate, key)) ||
    actual.some((key) => !keys.includes(key) && !optionalKeys.includes(key))
  )
    fail(`${label} has missing or unsupported fields.`);
  return candidate;
}

function string(
  value: unknown,
  label: string,
  max = 200,
  optional = false,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!optional && !value.trim())
  )
    fail(
      `${label} must be ${optional ? "a" : "a non-empty"} string of at most ${max} characters.`,
    );
  if (/[\u0000\u0008\u000b\u000c]/.test(value))
    fail(`${label} contains unsupported control characters.`);
}

function id(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value)
  )
    fail(`${label} must be a valid record identifier.`);
}

function oneOf(value: unknown, values: string[], label: string): void {
  if (typeof value !== "string" || !values.includes(value))
    fail(`${label} has an unsupported value.`);
}

function date(value: unknown, label: string): void {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(`${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    fail(`${label} must be a real calendar date.`);
}

function amount(
  value: unknown,
  label: string,
  max = Number.MAX_SAFE_INTEGER,
): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    fail(`${label} must be a finite, non-negative number.`);
}

function collection(
  value: unknown,
  label: string,
  validate: (item: unknown, index: number) => void,
  max = MAX_RECORDS,
): Set<string> {
  if (!Array.isArray(value) || value.length > max)
    fail(`${label} must be a list containing at most ${max} records.`);
  const ids = new Set<string>();
  value.forEach((item, index) => {
    validate(item, index);
    const key = (item as JsonRecord).id;
    id(key, `${label} record ID`);
    if (ids.has(key)) fail(`${label} contains a duplicate record ID: ${key}.`);
    ids.add(key);
  });
  return ids;
}

/** Validates the complete backup, including relational references, before any state is changed. */
export function validateWorkspace(
  value: unknown,
): asserts value is WorkspaceData {
  const root = record(
    value,
    [
      "version",
      "volunteers",
      "donors",
      "donations",
      "drives",
      "participation",
      "activities",
      "settings",
    ],
    "Backup",
  );
  if (root.version !== 1)
    fail("This backup version is not supported. Expected version 1.");
  const volunteerIds = collection(
    root.volunteers,
    "Volunteers",
    (item, index) => {
      const v = record(
        item,
        [
          "id",
          "name",
          "email",
          "phone",
          "skills",
          "availability",
          "status",
          "joinedOn",
          "notes",
        ],
        `Volunteer ${index + 1}`,
        ["photo", "termsAcceptedAt", "termsVersion"],
      );
      string(v.name, "Volunteer name");
      string(v.email, "Volunteer email", 254, true);
      string(v.phone, "Volunteer phone", 60, true);
      if (!Array.isArray(v.skills) || v.skills.length > 30)
        fail("Volunteer skills must be a list of at most 30 entries.");
      v.skills.forEach((skill) => string(skill, "Volunteer skill", 100));
      oneOf(
        v.availability,
        ["Weekdays", "Weekends", "Flexible"],
        "Volunteer availability",
      );
      oneOf(v.status, ["Active", "Inactive"], "Volunteer status");
      date(v.joinedOn, "Volunteer joining date");
      string(v.notes, "Volunteer notes", 10_000, true);
      if (v.photo !== undefined && !isProfilePhoto(v.photo))
        fail("Volunteer photo must be an embedded JPG, PNG, or WebP image smaller than 96 KB.");
      if (v.termsAcceptedAt !== undefined || v.termsVersion !== undefined) {
        if (typeof v.termsAcceptedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.termsAcceptedAt)
          || !Number.isFinite(Date.parse(v.termsAcceptedAt))
          || new Date(v.termsAcceptedAt).toISOString() !== v.termsAcceptedAt)
          fail("Terms acceptance must include a valid UTC timestamp.");
        date(v.termsVersion, "Terms version");
      }
    },
  );
  const donorIds = collection(root.donors, "Donors", (item, index) => {
    const d = record(
      item,
      ["id", "name", "type", "email", "phone", "address", "notes", "joinedOn"],
      `Donor ${index + 1}`,
    );
    string(d.name, "Donor name");
    oneOf(d.type, ["Individual", "Institutional"], "Donor type");
    string(d.email, "Donor email", 254, true);
    string(d.phone, "Donor phone", 60, true);
    string(d.address, "Donor address", 1000, true);
    string(d.notes, "Donor notes", 10_000, true);
    date(d.joinedOn, "Donor joining date");
  });
  collection(root.donations, "Contributions", (item, index) => {
    const d = record(
      item,
      ["id", "donorId", "amount", "date", "type", "category", "notes"],
      `Contribution ${index + 1}`,
    );
    id(d.donorId, "Contribution donor ID");
    if (!donorIds.has(d.donorId))
      fail(`Contribution ${index + 1} refers to a donor that does not exist.`);
    amount(d.amount, "Contribution amount");
    date(d.date, "Contribution date");
    oneOf(d.type, ["Monetary", "In-kind"], "Contribution type");
    string(d.category, "Contribution category");
    string(d.notes, "Contribution notes", 10_000, true);
  });
  const driveIds = collection(root.drives, "Drives", (item, index) => {
    const d = record(
      item,
      [
        "id",
        "name",
        "date",
        "location",
        "status",
        "description",
        "capacity",
        "sdg",
      ],
      `Drive ${index + 1}`,
    );
    string(d.name, "Drive name");
    date(d.date, "Drive date");
    string(d.location, "Drive location", 500);
    oneOf(
      d.status,
      ["Upcoming", "Ongoing", "Completed", "Cancelled"],
      "Drive status",
    );
    string(d.description, "Drive description", 10_000, true);
    amount(d.capacity, "Drive capacity", 100_000);
    if (!Number.isInteger(d.capacity))
      fail("Drive capacity must be a whole number.");
    oneOf(d.sdg, ["SDG 1", "SDG 11", "SDG 17"], "Drive SDG");
  });
  const assignments = new Set<string>();
  collection(root.participation, "Participation", (item, index) => {
    const p = record(
      item,
      ["id", "volunteerId", "driveId", "role", "status", "hours", "notes"],
      `Participation ${index + 1}`,
    );
    id(p.volunteerId, "Participation volunteer ID");
    id(p.driveId, "Participation drive ID");
    if (!volunteerIds.has(p.volunteerId))
      fail(
        `Participation ${index + 1} refers to a volunteer that does not exist.`,
      );
    if (!driveIds.has(p.driveId))
      fail(`Participation ${index + 1} refers to a drive that does not exist.`);
    const pair = `${p.volunteerId}:${p.driveId}`;
    if (assignments.has(pair))
      fail(
        "A volunteer cannot have duplicate participation records for the same drive.",
      );
    assignments.add(pair);
    string(p.role, "Assigned role");
    oneOf(
      p.status,
      ["Registered", "Attended", "Absent"],
      "Participation status",
    );
    amount(p.hours, "Participation hours", 100_000);
    string(p.notes, "Participation notes", 10_000, true);
  });
  collection(
    root.activities,
    "Activity history",
    (item, index) => {
      const a = record(
        item,
        ["id", "at", "title", "detail", "kind"],
        `Activity ${index + 1}`,
      );
      string(a.at, "Activity timestamp", 50);
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(a.at) ||
        !Number.isFinite(Date.parse(a.at))
      )
        fail("Activity timestamp must be a valid UTC timestamp.");
      date(a.at.slice(0, 10), "Activity date");
      string(a.title, "Activity title", 300);
      string(a.detail, "Activity detail", 2000, true);
      string(a.kind, "Activity category", 80);
    },
    MAX_ACTIVITY,
  );
  const settings = record(
    root.settings,
    ["organizationName", "adminName", "adminEmail", "phone", "address"],
    "Workspace settings",
  );
  string(settings.organizationName, "Organisation name");
  string(settings.adminName, "Administrator name");
  string(settings.adminEmail, "Administrator email", 254, true);
  string(settings.phone, "Organisation phone", 60, true);
  string(settings.address, "Organisation address", 1000, true);
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_BACKUP_BYTES || new TextEncoder().encode(serialized).byteLength > MAX_BACKUP_BYTES)
    fail("This workspace has reached its 2 MB local data limit. Remove an unused photo or record before adding more data.");
}

export function parseWorkspaceBackup(raw: string): WorkspaceData {
  if (
    typeof raw !== "string" ||
    raw.length > MAX_BACKUP_BYTES ||
    new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES
  )
    fail("Choose a ServeBase JSON backup smaller than 2 MB.");
  const parsed: unknown = JSON.parse(raw);
  validateWorkspace(parsed);
  return parsed;
}

function cloneWorkspace(db: WorkspaceData): WorkspaceData {
  return JSON.parse(JSON.stringify(db)) as WorkspaceData;
}

function readInitialState(): {
  db: WorkspaceData;
  storageError: string | null;
} {
  if (typeof window === "undefined")
    return { db: createDemoWorkspace(), storageError: null };
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { db: createDemoWorkspace(), storageError: null };
    const parsed = parseWorkspaceBackup(saved);
    return { db: parsed, storageError: null };
  } catch {
    return {
      db: createDemoWorkspace(),
      storageError:
        "The saved workspace could not be read. Demo data is loaded; you can restore a valid backup from Settings.",
    };
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readInitialState);
  const current = useRef(state.db);

  const commit = useCallback((db: WorkspaceData) => {
    let storageError: string | null = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      storageError =
        "This browser could not save your latest changes. They remain in this tab; export a backup before closing it.";
    }
    current.current = db;
    setState({ db, storageError });
  }, []);

  const update = useCallback(
    (
      recipe: (db: WorkspaceData) => WorkspaceData,
      activity?: ActivityInput,
    ) => {
      try {
        const next = recipe(cloneWorkspace(current.current));
        if (activity) {
          next.activities = [
            { id: newId("act"), at: new Date().toISOString(), ...activity },
            ...next.activities,
          ].slice(0, MAX_ACTIVITY);
        } else {
          next.activities = next.activities.slice(0, MAX_ACTIVITY);
        }
        validateWorkspace(next);
        commit(next);
        return true;
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message
            : "The requested change was invalid.";
        setState((previous) => ({
          ...previous,
          storageError: `Changes were not saved. ${reason}`,
        }));
        return false;
      }
    },
    [commit],
  );

  const resetDemo = useCallback(() => commit(createDemoWorkspace()), [commit]);

  const importBackup = useCallback(
    (raw: string): { ok: boolean; error?: string } => {
      try {
        const parsed = parseWorkspaceBackup(raw);
        commit(parsed);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof SyntaxError
              ? "The file is not valid JSON. Choose an exported ServeBase backup."
              : error instanceof Error
                ? error.message
                : "The backup could not be imported.",
        };
      }
    },
    [commit],
  );

  return (
    <WorkspaceContext.Provider
      value={{
        db: state.db,
        update,
        resetDemo,
        importBackup,
        storageError: state.storageError,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context)
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  return context;
}

export function newId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${suffix}`;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function formatDate(value: string): string {
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value,
  );
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(parsed)
    : "—";
}

/** Quote every field and neutralise spreadsheet formulas, including whitespace-prefixed ones. */
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))
    text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const csv =
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".csv")
    ? filename
    : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
