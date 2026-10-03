# Current Task: F094 — Public documentation

**Status**: COMPLETE

## Description
Publish architecture documentation for external readers viewable without an account (Phase 12 — Documentation):
- Static site generation and public publishing engine:
  - Documentation publication configuration:
    - Custom slugs, vanity URLs, custom domains, branding (logo, primary color, company name).
    - Access visibility modes: `'public'` (open to all), `'unlisted'` (secret token link), `'password_protected'` (passkey required, no account needed).
    - Content selection: select architecture overview, component doc pages, ADRs, views, and flows to include.
    - Publication lifecycle: publish, update/republish with versioning (e.g. v1.0.0 -> v1.0.1), unpublish/archive.
  - External reader experience:
    - Fully standalone, accessible without user account or login authentication.
    - Responsive documentation layout: sidebar tree navigation, breadcrumbs, search index for instant client-side full-text search.
    - Interactive architecture embed cards (diagram views, components, ADRs, flows).
    - Passkey unlock modal for password-protected publications without requiring account registration.
    - Dark / light theme toggle, reading time, and print/export readiness.
- Acceptance criteria:
  - Publish documentation for external readers.
  - Test: published docs are viewable without an account.

- Feature ID: F094
- Phase: 12 — Documentation
- Dependencies: Phase 03, Phase 04

## Next Feature
- **F095 — Architecture portal**
