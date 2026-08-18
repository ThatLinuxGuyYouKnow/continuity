export type Patient = {
  id: string;
  name: string;
  mrn: string;
  dob: string;
  gender: string;
  bloodType: string;
  avatar: string;
};

export type MemoryEvent = {
  id: string;
  date: string;
  category: "diagnosis" | "medication" | "allergy" | "evidence" | "note";
  title: string;
  source: string;
  confidence: number;
};

export type AccessEvent = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  resource: string;
  allowed: boolean;
  region: string;
  reason?: string;
};

export const currentPatient: Patient = {
  id: "p-001",
  name: "Lucas Bennett",
  mrn: "MRN-2024-8812",
  dob: "1989-03-14",
  gender: "Male",
  bloodType: "O+",
  avatar: "LB",
};

export const emergencySummary = {
  allergies: ["Penicillin — severe rash", "Sulfa drugs — hives"],
  medications: ["Lisinopril 10mg daily", "Metformin 500mg BID", "Atorvastatin 20mg daily"],
  conditions: ["Type 2 diabetes", "Hypertension", "Seasonal asthma"],
  contacts: [
    { name: "Maya Bennett", relation: "Spouse", phone: "+1-555-0199" },
    { name: "Dr. Amara Osei", relation: "Cardiology", phone: "+1-555-0142" },
  ],
};

export const memoryStats = {
  facts: 127,
  sources: { conversations: 34, documents: 12, evidence: 8 },
  confidence: 0.91,
  regions: ["us-east-1", "us-west-2", "eu-central-1"],
};

export const memoryTimeline: MemoryEvent[] = [
  { id: "m1", date: "2024-12-10", category: "evidence", title: "Agent added literature evidence: SGLT2 inhibitors in T2D", source: "PubMed", confidence: 0.94 },
  { id: "m2", date: "2024-11-03", category: "medication", title: "Metformin dose increased to 500mg BID", source: "Dr. Chen — Primary Care", confidence: 0.99 },
  { id: "m3", date: "2024-08-22", category: "diagnosis", title: "Hypertension diagnosed; Lisinopril started", source: "St. Helios General", confidence: 0.98 },
  { id: "m4", date: "2023-05-17", category: "allergy", title: "Penicillin allergy confirmed — severe rash", source: "Emergency Note", confidence: 0.97 },
  { id: "m5", date: "2022-09-04", category: "diagnosis", title: "Type 2 diabetes diagnosed", source: "Cedarbrook Clinic", confidence: 0.99 },
];

export const accessEvents: AccessEvent[] = [
  { id: "a1", ts: "2 min ago", actor: "Dr. Sofia Marques", action: "break_glass_open", resource: "emergency_summary", allowed: true, region: "eu-central-1", reason: "unconscious patient" },
  { id: "a2", ts: "18 min ago", actor: "Dr. Jonas Weber", action: "read", resource: "memory_entries", allowed: true, region: "us-west-2" },
  { id: "a3", ts: "1 hr ago", actor: "Unknown clinician", action: "read", resource: "memory_entries", allowed: false, region: "us-east-1" },
];

export const recentConversations = [
  { id: "c1", title: "Travel consult — Tokyo trip", clinician: "Dr. Liam Chen", date: "Today", messages: 12 },
  { id: "c2", title: "Cardiology follow-up", clinician: "Dr. Amara Osei", date: "Yesterday", messages: 8 },
  { id: "c3", title: "Medication reconciliation", clinician: "PharmD. Raj Patel", date: "3 days ago", messages: 15 },
];
