# Daktari

**Livestock disease early warning and vet coordination for Kenyan dairy farmers.**
Built for the Meta Global AI Developer Hackathon (Indie Developer track, *Build for Your World*).

Hosted demo: https://daktari-nine.vercel.app/ (see "Using the hosted demo" below)

A farmer uploads a photo of a cow. Daktari reads the photo with Muse Spark 1.3, segments visible skin lesions with SAM 3.1, sets an urgency level (`monitor`, `vet_visit` or `isolate_and_report`), writes a short note for the vet, follows the case over the next days, and shows suspected clusters of notifiable disease by county.

**Scope and limits.** Animals only. Daktari gives **no treatment, drug or dosing advice** and no human health advice. It is triage support: a vet must always examine the animal.

## What existed before the event, and what was built during it

Before the event this repository did not exist. It started on the `create-next-app` template. Everything else in this repository was written during the hackathon (Oct 26 to Nov 4, 2026):

- the photo check flow and result card with SAM region boxes (`app/page.tsx`, `components/`)
- the triage pipeline with Muse Spark and SAM, and the urgency safety net (`lib/triage.ts`, `app/api/triage/route.ts`)
- the case follow-up agent with a simulated demo clock (`app/cases/page.tsx`, `lib/store.ts`)
- the outbreak map with cluster alerts (`app/map/page.tsx`)
- the evaluation script and results (`scripts/eval.mjs`, `eval-results.md`)

Third-party pieces: Next.js, React, Tailwind CSS, the `openai` SDK (used as the client for Meta's OpenAI-compatible API), `@meta-sam/parser`, and the public photos credited below.

## How Meta's models are used

| Step | Meta model | Where |
|---|---|---|
| Read the photo and the farmer's note, set the urgency, write the vet note (JSON output) | `muse-spark-1.3` (Chat Completions, image input) | `lib/triage.ts` |
| Segment skin lumps and bumps, return boxes and masks that are drawn on the photo and counted | `sam-3.1` (Responses API, streamed, parsed with `@meta-sam/parser`) | `lib/triage.ts` |

Both calls print a `[Meta API]` line in the server terminal so the live calls are visible.

## How the pipeline works

1. The browser resizes the photo (max 1280 px) and sends it to `POST /api/triage`.
2. Muse Spark returns urgency, headline, possible conditions to rule out, containment steps, a vet handoff note, and an estimated lesion count.
3. If Spark reports or suspects skin lesions, SAM 3.1 segments them. Its boxes are drawn on the photo and its region count is stored.
4. **Safety net:** if the region count (the larger of Spark's estimate and SAM's count) is 3 or more, the urgency is raised to `isolate_and_report`. The rule can only raise urgency, never lower it.
5. Each check opens a case. The Cases page schedules a check-in, compares a follow-up photo with the last visit, and escalates if the urgency went up.
6. The Outbreak map groups cases by county and flags clusters of suspected lumpy skin disease.

## Run it locally

Requirements: Node.js 20.9 or newer (developed on Node 24) and a Meta Model API key from https://dev.meta.ai

```bash
git clone https://github.com/t20mutinda-create/daktari.git
cd daktari
npm install
```

Create a file named `.env.local` in the project root:

```
MODEL_API_KEY=your_meta_model_api_key
```

Optional overrides: `MODEL_TRIAGE_MODEL` (default `muse-spark-1.3`) and `MODEL_SEGMENTATION_MODEL` (default `sam-3.1`).

```bash
npm run dev
```

Open http://localhost:3000. Restart the server after editing `.env.local`. `npm run build` makes a production build.

Each check makes one Muse Spark call and, when skin lesions are suspected, one SAM 3.1 call.

### Try it (about 2 minutes)

1. **Check an animal:** click **Sample: skin nodules** (or upload a clear daylight JPG or PNG) and press **Check this animal**. You get an urgency, SAM's boxes on the photo, possible conditions to rule out, what to do now, and a note for the vet.
2. **Cases:** open **Cases**. Press **Fast-forward 1 day** to simulate time passing, then upload a follow-up photo when the check-in box appears. Daktari compares it with the last visit.
3. **Outbreak map:** open **Outbreak map** to see cases by county.

The demo clock and the grey demo cases on the map are **simulated**. The photo analysis is real.

## Using the hosted demo

https://daktari-nine.vercel.app/ runs the same app on the author's own API credits. Use the sample buttons or upload a photo and follow the steps in "Try it". Cases are stored only in your browser. The hosted demo may be switched off after judging; the repository always runs locally with your own key.

## Evaluation

I labeled 20 public photos (lumpy skin disease, mastitis and healthy animals) with the urgency a vet would advise. I am the only labeler. Full table: [`eval-results.md`](eval-results.md).

- Exact match with my label: 11 of 20 (55%). Same or safer: 13 of 20 (65%)
- Emergencies (`isolate_and_report`) caught: 3 of 10. Missed: 7 of 10
- Photos wrongly flagged `isolate_and_report`: 0

Daktari under-calls emergencies: the 7 misses were rated lower than my label. SAM found regions in few photos and many public photos are small, so Muse Spark does most of the work today. Results vary slightly between runs and a few requests timed out, so treat these numbers as a first check, not validation.

In my tests, the first run missed 8 of 10 emergencies, the next missed 4 of 11, and a later run missed 7 of 10 with no false isolate-and-report alarms. Labels and the pipeline changed between runs, so they are not exactly comparable.

Next steps come from vet-written protocols per urgency level, so the AI never improvises medical advice.

## Field feedback from a veterinarian

Dr. Maina, a practising veterinarian and my former internship supervisor, tried Daktari with a photo from a real case and told me: "I've tried it out, it's top notch." He agreed that I could quote him. This is one vet's feedback about using the app, not a clinical validation. He said what he'd want changed or included is more skin related diseases.

## What's next

- Test on real Kenyan field photos with vets, and have a second vet review the labels
- Add look-alike conditions such as ringworm (dermatophytosis) to the prompt
- WhatsApp channel, Swahili voice notes (Swahili is not among Muse Voice Transcribe's verified languages, so it needs testing) and a database for cases
- Free weather data beside cluster alerts, since lumpy skin disease spreads through biting insects

## Honest limits

- Small test set, tuned on the same photos, mostly non-Kenyan public photos. This is a first check, not clinical validation.
- SAM often finds no regions. Possible causes include small dataset images (the Mendeley set is 256 px) and the prompt wording. The affected-percent figures are Spark's estimates, not SAM measurements.
- Cases are stored in the browser (localStorage). A real deployment needs a database.
- Map demo cases are simulated.
- Only lumpy skin disease and mastitis are in focus. Anything else returns a vet visit.
- Photos are sent to Meta's Model API. While free credits are in use, Meta may use content for product improvement. Do not upload private photos.

## Built with AI assistance

This project was built with GitHub Copilot. The veterinary framing, the photo selection, the labels and the evaluation review are the author's own work.

## Credits and licences

- `public/samples/lsd.jpg`: Zebu bull with Lumpy Skin Disease by Monicacomma, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), via Wikimedia Commons.
- `public/samples/mastitis.jpg`: Gangrenous Teat by Ariya shookh, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), via Wikimedia Commons.
- Evaluation photos: Lumpy Skin Images Dataset by Sachin Kumar and Sourabh Shastri (Mendeley Data, 2022, DOI 10.17632/w36hpf86j2.1, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), plus Wikimedia Commons images. Per-photo credits are in [`eval/CREDITS.md`](eval/CREDITS.md).

## Project structure

```
app/page.tsx           Check page
app/cases/page.tsx     Case follow-up and demo clock
app/map/page.tsx       Outbreak map
app/api/triage/        Server route that calls the Meta models
lib/triage.ts          Muse Spark + SAM 3.1 pipeline and safety net
lib/store.ts           Browser storage, case logic, demo data
scripts/eval.mjs       Evaluation runner
eval-results.md        Latest evaluation table
```
