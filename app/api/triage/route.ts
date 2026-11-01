import { NextResponse } from "next/server";
import { runTriage } from "@/lib/triage";

export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const image = form.get("image");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "Please upload a photo." }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: "That photo is too large. Please use one under 8 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const triage = await runTriage(
      buffer,
      image.type || "image/jpeg",
      String(form.get("description") ?? ""),
      String(form.get("previous") ?? "")
    );
    return NextResponse.json(triage);
  } catch (err) {
    console.error("triage failed:", err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
