---
name: AegisRx UI Redesign
description: Full UI/UX redesign of the RxGuard clinical decision support app, rebranded to AegisRx
type: project
---

Project was formerly "RxGuard" — now rebranded to "AegisRx" with tagline "Safer Prescribing, Smarter Care".

**Why:** Premium healthcare SaaS UI/UX redesign requested to improve clinician UX, readability, and workflow continuity while preserving all existing clinical logic and backend API behavior.

**How to apply:** All future UI work on this project should use the AegisRx brand, follow the Inter font + clinical-navy/teal color system, and maintain dark mode support via `darkMode: 'class'` in tailwind.config.js + `ThemeProvider` in main.jsx.

Key files changed:
- `src/contexts/ThemeContext.jsx` — new, provides dark/light mode toggle
- `tailwind.config.js` — added darkMode:'class', Inter font, new tokens
- `src/index.css` — dark mode base styles, Inter import, utility CSS classes
- `src/main.jsx` — wrapped with ThemeProvider
- `src/App.jsx` — global activePatient state, patient context bar, AegisRx footer
- `src/components/Navbar.jsx` — AegisRx brand, sun/moon toggle (top-right), patient pill
- `src/components/PrescribingDashboard.jsx` — hero section, premium cards, CTA buttons
- All 13 other components — dark mode, better typography, consistent card/button system

What was NOT changed:
- All API calls, backend routes, clinical logic
- Data structures (patient schemas, antibiogram, discharge patients)
- Safety engine, recommendation engine, scoring engine
- FHIR integration, database schema, server-side code
