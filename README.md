# HOTHY

Local-first astronaut wellbeing and mission triage prototype for the IEEE Lumen 2.0 "Beyond 2030" concept.

## Run locally

Requires Node.js 22.6 or newer.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm run build` for a strict TypeScript check and production bundle, or `npm test` for focused triage-engine tests.

## Live demo

- Switch between Portal A (astronaut companion) and Portal B (commander dashboard) in the header.
- Choose **Fragmented sleep** in the simulation bar to load the demonstration telemetry. The CRI recalculates in both portals; submitting the check-in speaks the triage summary when browser speech synthesis is available and opens the local comfort vault.
- Expand **Personal signals** to adjust sleep, HRV, acoustic jitter, and habitat noise. Use the microphone control for browser speech recognition where supported.
- Portal B displays the computed crew scores, burnout projection, pairing restriction, mission changes, and a generated predictive JSON packet.

## Edge triage

All score calculations are deterministic and run in `src/engine/triageEngine.ts`. CRI uses the requested weighted formula, and the days-to-threshold estimate uses the current CRI and telemetry-derived daily degradation rate. The check-in sentiment scorer is a transparent local keyword heuristic, not a clinical language model.

This is a simulated product prototype, not a medical device. Telemetry, family media, mission synchronization, and encryption are demo representations; no backend or actual Earth transmission is implemented. The comfort-vault image is loaded from Unsplash, while triage and check-in processing remain in the browser.

