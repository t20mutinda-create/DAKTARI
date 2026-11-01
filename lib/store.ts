import { useSyncExternalStore } from "react";
import type { Case, Triage, Visit, MapCase } from "@/lib/types";

export const COUNTIES: Record<string, { lat: number; lon: number }> = {
  Baringo: { lat: 0.47, lon: 35.97 },
  Kiambu: { lat: -1.17, lon: 36.83 },
  Laikipia: { lat: 0.36, lon: 36.78 },
  Nakuru: { lat: -0.3, lon: 36.08 },
  Nairobi: { lat: -1.29, lon: 36.82 },
  Nyandarua: { lat: -0.18, lon: 36.52 },
  Nyeri: { lat: -0.42, lon: 36.95 },
  "Uasin Gishu": { lat: 0.52, lon: 35.27 },
};

export const DEMO_CASES: MapCase[] = [
  { county: "Nakuru", condition: "Lumpy skin disease", source: "demo" },
  { county: "Nakuru", condition: "Lumpy skin disease", source: "demo" },
  { county: "Nakuru", condition: "Mastitis", source: "demo" },
  { county: "Kiambu", condition: "Mastitis", source: "demo" },
  { county: "Nyeri", condition: "Tick-borne disease", source: "demo" },
];

const CASES_KEY = "daktari.cases";
const DAY_KEY = "daktari.day";
const EMPTY_CASES: Case[] = [];
const caseSubscribers = new Set<() => void>();
const daySubscribers = new Set<() => void>();
let cachedCasesValue: string | null | undefined;
let cachedCases: Case[] = EMPTY_CASES;

function isVisit(value: unknown): value is Visit {
  if (typeof value !== "object" || value === null) return false;
  const visit = value as Record<string, unknown>;
  return (
    typeof visit.day === "number" &&
    (visit.urgency === "monitor" || visit.urgency === "vet_visit" || visit.urgency === "isolate_and_report") &&
    typeof visit.headline === "string" &&
    typeof visit.thumb === "string" &&
    (visit.noduleCount === null || typeof visit.noduleCount === "number") &&
    (visit.affectedPercent === null || typeof visit.affectedPercent === "number")
  );
}

function isCase(value: unknown): value is Case {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.animal === "string" &&
    typeof item.county === "string" &&
    typeof item.day === "number" &&
    typeof item.condition === "string" &&
    typeof item.triage === "object" &&
    item.triage !== null &&
    Array.isArray(item.visits) &&
    item.visits.every(isVisit)
  );
}

export function loadCases(): Case[] {
  const saved = window.localStorage.getItem(CASES_KEY);
  if (saved === null) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isCase)) {
    throw new Error("Saved cases are invalid. Reset the demo data and try again.");
  }
  return parsed;
}

function getCasesSnapshot(): Case[] {
  const saved = window.localStorage.getItem(CASES_KEY);
  if (saved === cachedCasesValue) return cachedCases;
  cachedCasesValue = saved;
  cachedCases = saved === null ? EMPTY_CASES : parseCases(saved);
  return cachedCases;
}

function parseCases(saved: string): Case[] {
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isCase)) {
    throw new Error("Saved cases are invalid. Reset the demo data and try again.");
  }
  return parsed;
}

function subscribeToCases(callback: () => void) {
  caseSubscribers.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CASES_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    caseSubscribers.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeToDay(callback: () => void) {
  daySubscribers.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === DAY_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    daySubscribers.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerCasesSnapshot(): Case[] {
  return EMPTY_CASES;
}

function getServerDaySnapshot(): number {
  return 1;
}

export function useCases(): Case[] {
  return useSyncExternalStore(subscribeToCases, getCasesSnapshot, getServerCasesSnapshot);
}

export function useDemoDay(): number {
  return useSyncExternalStore(subscribeToDay, getDay, getServerDaySnapshot);
}

export function saveCases(cases: Case[]) {
  window.localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  for (const notify of caseSubscribers) notify();
}

export function getDay(): number {
  const saved = window.localStorage.getItem(DAY_KEY);
  if (saved === null) return 1;
  const day = Number(saved);
  if (!Number.isInteger(day) || day < 1) throw new Error("Saved demo day is invalid. Reset the demo data and try again.");
  return day;
}

export function setDay(day: number) {
  if (!Number.isInteger(day) || day < 1) throw new Error("Demo day must be a positive whole number.");
  window.localStorage.setItem(DAY_KEY, String(day));
  for (const notify of daySubscribers) notify();
}

export function resetDemo() {
  window.localStorage.removeItem(CASES_KEY);
  window.localStorage.removeItem(DAY_KEY);
  cachedCasesValue = null;
  cachedCases = EMPTY_CASES;
  for (const notify of caseSubscribers) notify();
  for (const notify of daySubscribers) notify();
}

export function newCase(animal: string, county: string, day: number, triage: Triage, thumb: string): Case {
  return {
    id: crypto.randomUUID(),
    animal: animal.trim() || "Unnamed animal",
    county,
    day,
    condition: triage.possible_conditions[0] ?? "Unspecified condition",
    triage,
    visits: [makeVisit(day, triage, thumb)],
  };
}

export function makeVisit(day: number, triage: Triage, thumb: string): Visit {
  return {
    day,
    urgency: triage.urgency,
    headline: triage.headline,
    thumb,
    noduleCount: triage.nodule_count,
    affectedPercent: triage.affected_percent,
  };
}

export function nextCheckInDay(item: Case): number {
  const last = item.visits[item.visits.length - 1];
  return last.urgency === "monitor" ? last.day + 3 : last.day + 1;
}

export function summarizeVisit(visit: Visit): string {
  return `Day ${visit.day}: ${visit.headline} (urgency: ${visit.urgency}).`;
}

export function assessTrend(previous: Visit, current: Visit): { message: string; escalate: boolean } {
  const rank = { monitor: 0, vet_visit: 1, isolate_and_report: 2 };
  if (rank[current.urgency] > rank[previous.urgency]) {
    return { message: "The urgency has increased. Contact a veterinarian promptly.", escalate: true };
  }
  if (rank[current.urgency] < rank[previous.urgency]) {
    return { message: "The urgency has decreased, but continue monitoring and follow veterinary advice.", escalate: false };
  }
  return { message: "No change in urgency was identified. Continue monitoring and follow veterinary advice.", escalate: false };
}

export function isLumpy(condition: string): boolean {
  return /lumpy skin/i.test(condition);
}

export type { MapCase };

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected photo."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read the selected photo."));
    reader.readAsDataURL(blob);
  });
}

export function resizeImage(file: Blob, maxDimension = 1280, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Your browser could not process this photo."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not resize the selected photo."))),
        "image/jpeg",
        quality
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected file is not a supported image."));
    };
    image.src = url;
  });
}

export async function postTriage(image: Blob, description: string, previous = ""): Promise<Triage> {
  const form = new FormData();
  form.append("image", image, "animal.jpg");
  form.append("description", description);
  form.append("previous", previous);
  const response = await fetch("/api/triage", { method: "POST", body: form });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : "The photo could not be checked.";
    throw new Error(message);
  }
  if (typeof body !== "object" || body === null || !("urgency" in body)) {
    throw new Error("The triage service returned an invalid response.");
  }
  return body as Triage;
}
