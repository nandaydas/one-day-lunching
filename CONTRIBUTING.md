# Contributing to Nimantro

Thank you for your interest in contributing to Nimantro! 🎉

## How to contribute

### Good first issues

Look for issues labelled [`good-first-issue`](https://github.com/nimantro/nimantro/labels/good-first-issue) to get started.

### Contribution categories

| Label | Purpose |
|---|---|
| `template` | New invitation designs |
| `bengali` | Bengali language improvements |
| `i18n` | Support for other languages |
| `editor` | Editor improvements |
| `guest-management` | RSVP and family features |
| `export` | PDF and image export |
| `animation` | Motion and animation effects |
| `security` | Security fixes (please follow the SECURITY.md process) |
| `documentation` | Documentation improvements |

### Development setup

1. Fork the repository.
2. Clone your fork locally.
3. Follow the README setup guide.
4. Create a feature branch: `git checkout -b feature/your-feature-name`.
5. Make your changes.
6. Run tests: `pnpm test`.
7. Run lint: `pnpm lint`.
8. Run type check: `pnpm type-check`.
9. Submit a pull request.

### Code standards

- TypeScript required for all new code.
- Follow the existing project structure.
- Do not import Next.js into framework-agnostic packages.
- Always add input validation using Zod schemas.
- Handle both Bengali and English in UI text.
- Write tests for critical business logic.
- Document exported functions and types.

### Template contributions

Every contributed template must include:

- Template JSON definition following the template schema.
- Supported language declarations.
- Thumbnail image (JPG, min 800×600, max 500 KB).
- Mobile preview screenshot.
- Licence information.
- Font licence information.
- Validated against the template schema (`validateTemplate()`).
- Responsive mobile design.
- Accessibility pass.

**Do not submit:**

- Templates using unlicensed commercial fonts.
- Templates containing copyrighted artwork without permission.
- Templates using stock imagery without appropriate licence.

### Bengali contributions

Before submitting Bengali language improvements:

- Test যুক্তাক্ষর (conjunct consonants) rendering.
- Verify কার and ফলা positioning.
- Check text wrapping on mobile viewports.
- Confirm PDF and JPG exports preserve glyph positioning.
- Ensure Bengali text uses LTR direction (not RTL).
- Use Unicode Standard Bengali, not romanised transliteration.

### Security

Please do not report security vulnerabilities in public issues. Follow the process in `SECURITY.md`.

## Licence

By submitting a pull request, you agree your contribution will be licensed under AGPL-3.0.
