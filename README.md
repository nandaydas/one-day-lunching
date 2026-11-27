# Nimantro

**নিমন্ত্রণ — Create. Invite. Celebrate.**

An open-source digital invitation and event management platform with multilingual invitations, interactive websites, family guest management and RSVP tracking.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com/)

---

## ✨ What is Nimantro?

Nimantro is a web-first, open-source platform for creating, personalising, publishing and managing digital invitations.

| Feature | Status |
|---|---|
| Bengali + English invitations | ✅ MVP |
| Section-based visual editor | ✅ MVP |
| Public invitation websites | ✅ MVP |
| PDF / JPG / PNG export | ✅ MVP |
| Household guest management | ✅ MVP |
| RSVP with family tracking | ✅ MVP |
| Event analytics dashboard | ✅ MVP |
| QR code check-in | 🔜 Future |
| Custom domains | 🔜 Future |
| WhatsApp automation | 🔜 Future |

---

## 🏗️ Architecture

```
nimantro/
├── apps/
│   ├── web/          → Next.js App Router (UI)
│   ├── functions/    → Firebase Cloud Functions v2
│   └── worker/       → Cloud Run export worker
├── packages/
│   ├── ui/           → Shared component library
│   ├── types/        → TypeScript domain types
│   ├── validation/   → Zod schemas
│   ├── firebase/     → Firebase client & admin setup
│   ├── invitation-engine/ → Core renderer (framework-agnostic)
│   ├── template-schema/   → Template JSON schema & validation
│   ├── editor/       → Editor state management (Zustand)
│   ├── guest-management/  → Guest & RSVP domain logic
│   ├── i18n/         → Bengali + English translations
│   └── animations/   → Motion presets
├── templates/        → Invitation template definitions
├── firebase/         → Firestore rules & indexes
└── docs/             → Architecture & API docs
```

**Stack:** Next.js · TypeScript · Firebase · Tailwind CSS · shadcn/ui · Zustand · Zod · Motion

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore, Auth and Storage enabled

### Local development

```bash
# Clone the repository
git clone https://github.com/your-org/nimantro.git
cd nimantro

# Install dependencies
pnpm install

# Copy environment template
cp apps/web/.env.example apps/web/.env.local

# Fill in your Firebase credentials in .env.local
# Then start the Firebase emulators
pnpm emulators

# In another terminal, start the web app
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).  
The Firebase Emulator UI will be at [http://localhost:4000](http://localhost:4000).

### Environment variables

See [`apps/web/.env.example`](apps/web/.env.example) for all required variables.

---

## 🛠️ Development

```bash
pnpm build        # Build all packages and apps
pnpm dev          # Start all dev servers
pnpm lint         # Lint all packages
pnpm type-check   # TypeScript check
pnpm test         # Run all tests
pnpm test:unit    # Run unit tests (Vitest)
pnpm test:e2e     # Run E2E tests (Playwright)
```

### Firebase Emulator

```bash
pnpm emulators            # Start emulators
pnpm emulators:export     # Export emulator state
pnpm emulators:import     # Start with saved state
```

---

## 📦 Packages

| Package | Description |
|---|---|
| `@nimantro/ui` | Shared React component library |
| `@nimantro/types` | TypeScript domain interfaces |
| `@nimantro/validation` | Zod validation schemas |
| `@nimantro/firebase` | Firebase client & admin configuration |
| `@nimantro/invitation-engine` | Framework-agnostic invitation renderer |
| `@nimantro/template-schema` | Template JSON schema definitions |
| `@nimantro/editor` | Zustand-based editor state |
| `@nimantro/guest-management` | Guest & RSVP domain logic |
| `@nimantro/i18n` | Bengali + English translations |
| `@nimantro/animations` | Framer Motion animation presets |

---

## 🌏 Bengali Support

Nimantro treats Bengali as a first-class language:

- Noto Serif Bengali, Noto Sans Bengali, Hind Siliguri, Anek Bangla fonts bundled
- যুক্তাক্ষর (conjunct consonants) correctly rendered
- Bengali numerals and Bengali calendar support
- Mixed Bengali + English headings
- Bengali text preserved in PDF/JPG/PNG exports

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

| Label | Purpose |
|---|---|
| `good-first-issue` | Great for new contributors |
| `template` | New invitation designs |
| `bengali` | Bengali language improvements |
| `editor` | Editor improvements |
| `guest-management` | RSVP and family features |
| `export` | PDF and image export |

---

## 📄 Licence

Nimantro is licensed under the [GNU Affero General Public License v3.0](LICENSE).

The core platform is free and open source. A managed hosted service may be available separately.

---

## 🙏 Acknowledgements

Built with love for Bengali families and celebration culture everywhere. 💐
# one-day-lunching
