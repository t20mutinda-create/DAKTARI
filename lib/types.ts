export type Urgency = "monitor" | "vet_visit" | "isolate_and_report";

export type Region = { x1: number; y1: number; x2: number; y2: number };

export type Triage = {
  urgency: Urgency;
  headline: string;
  possible_conditions: string[];
  recommended_action: string;
  vet_handoff_note: string;
  nodule_count: number | null;
  affected_percent: number | null;
  segmented_lesion_regions: number | null;
  segmented_lesion_boxes: Region[] | null;
  segmentation_frame_width: number | null;
  segmentation_frame_height: number | null;
};

export type Visit = {
  day: number;
  urgency: Urgency;
  headline: string;
  thumb: string;
  noduleCount: number | null;
  affectedPercent: number | null;
};

export type Case = {
  id: string;
  animal: string;
  county: string;
  day: number;
  condition: string;
  triage: Triage;
  visits: Visit[];
};

export type MapCase = {
  county: string;
  condition: string;
  source: "you" | "demo";
};

export const URGENCY: Record<Urgency, { label: string; badge: string }> = {
  monitor: {
    label: "Monitor",
    badge: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  vet_visit: {
    label: "Vet visit",
    badge: "border-amber-300 bg-amber-50 text-amber-900",
  },
  isolate_and_report: {
    label: "Isolate and report",
    badge: "border-red-300 bg-red-50 text-red-800",
  },
};
