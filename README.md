# LocationLens frontend

React/TypeScript interface for nearby place discovery. The application provides
Keycloak sign-in, search and type filtering, synchronized Google map/text results,
place details, reviews/history, and business claims/admin review.

## Customer/developer handoff

- [Release notes and known limitations](RELEASE_NOTES.md)
- [Installation, configuration, build/run, testing, deployment and troubleshooting](docs/install.md)
- [Frontend environment template](.env.example)
- [Place components and API integration](docs/places.md)
- [Authentication/session behavior](docs/auth.md)
- [Reviews](docs/reviews.md) and [UI](docs/ui.md)
- [Paired backend repository](https://github.com/bp4k/locationlens)

Start with the installation guide. It covers **both services and Keycloak**, not
only npm commands. The local frontend address is `http://127.0.0.1:5174/welcome`.
The Sign out menu item is currently removed; its implementation remains.

## Developer checks

```text
npm ci
npm run typecheck
npm test -- --maxWorkers=2 --testTimeout=15000
npm run build
```

SPA build output: `build/client/`. CI and manually triggered deployment are in
`.github/workflows`. Deployment does not automatically promote App Engine traffic.
See the guide for GitHub assessor access and the final handoff acceptance checklist.
