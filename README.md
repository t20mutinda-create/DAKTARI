# DAKTARI

Daktari is livestock disease surveillance and vet coordination. It measures visible signs in a photo, sets an urgency level, follows each case over several days and flags clusters for the county veterinary office. It gives no treatment advice and no human health advice.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Meta Model API

Add your Meta Model API key to `.env.local` as `MODEL_API_KEY`. The app uses Muse Spark
(`muse-spark-1.3`) for image triage and calls SAM 3.1 (`sam-3.1`) only when the triage
model indicates that visible skin lesions could benefit from segmentation. Both model
IDs can be overridden with the server-only `MODEL_TRIAGE_MODEL` and
`MODEL_SEGMENTATION_MODEL` environment variables. Restart the dev server after changing
environment variables.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Assets & Credits

- `public/samples/lsd.jpg` - [Zebu bull with Lumpy Skin Disease](https://wikimedia.org) by Monicacomma, used under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- `public/samples/mastitis.jpg` - [Gangrenous Teat](https://wikimedia.org) by Ariya shookh, used under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Evaluation photo credits

See [eval/CREDITS.md](eval/CREDITS.md) for attribution. Most public photos in this evaluation set are not from Kenya.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
