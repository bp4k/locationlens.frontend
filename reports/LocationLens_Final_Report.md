# LocationLens: Final AI Integration Report

CS 3300 • Project 1 • October 14, 2026
Team: Advaith, Jake, James, Aaron, Albert



## 1. Introduction and Background

LocationLens is a place-discovery application developed for CS 3300 Project 1. Its objective is to help users find nearby locations, compare geographic and text-based information, and contribute local knowledge. The application combines a React frontend with a Spring Boot backend, an identity provider, Google place/map services, and relational persistence. The project also examined how Codex supported software development and where human judgment remained necessary.

### Scope and implemented functionality

The core minimum marketable features are a landing page and authentication, location-based search, exploration through an interactive map and text results, and location-type filtering. Users can search by location text or coordinates with a radius. A selected place is shared between list and map views, and its details provide entry points into additional workflows. The two additional features are reviews/ratings with review history, and business-ownership claims with administrator approval or rejection. Account information supports the authenticated experience.

The frontend handles presentation, interaction, and response conversion. The backend validates access, coordinates external services, enforces business rules, and persists application records. Search uses Google Places through the backend; the browser separately uses Google Maps for rendering. Reviews and claims connect frontend views and API adapters to controller, service, and repository layers. This report covers both repositories rather than treating the interface as an independent product. [1–4]

### Role of AI and evaluation boundary

The team identified Codex as its AI development tool. The recorded development interactions show AI-assisted repository exploration, implementation planning, component and API-client generation, tests, UI refinement, documentation, and troubleshooting. Humans supplied scope, existing conventions, feature ownership, service constraints, and review feedback. Generated changes were refined through inspection, testing, and integration. The report evaluates this human–AI process rather than assuming every committed line was AI-authored.

Evidence consists of development conversation examples, current source code, test definitions and recorded results, and workflow configuration. There was no controlled non-AI baseline, measured development-time log, or comparison between AI models. Findings about productivity are therefore qualitative. Test results establish behavior under their test conditions; they do not measure coverage or prove all deployed integrations. Backend source inspection establishes implementation structure, but complete backend prompt transcripts and a fresh backend test result were not available for this report.

Outcome claims also require qualification. The team reported core workflows working end to end, then subsequently reported deployed sign-out failing. The current frontend removes only the Sign out menu item and divider while retaining logout logic. This is a documented limitation and temporary scope adjustment, not evidence that identity-provider logout has been fixed. [5]


## 2. Software Technologies

| Layer | Technology and purpose |

| Frontend | React 19, TypeScript 5.9, React Router 8 framework/SPA mode, Vite 8 |

| UI | Fluent UI 9, shared CSS, Tailwind CSS 4, responsive layouts |

| Place services | Google Maps JavaScript loader 2.1; backend Google Places API (New) adapter |

| Backend | Java 21, Spring Boot 4.1.1, Maven, Spring MVC and Security |

| Persistence | Spring Data JPA/Hibernate; H2 development/testing; MySQL/Cloud SQL production configuration; Flyway |

| Identity | Keycloak with OpenID Connect/OAuth 2.0 and JWT bearer validation |

| Verification and delivery | Vitest, React Testing Library, Playwright; Java test suites; GitHub Actions and Google App Engine |

### Architecture and important choices

React components split the interface into manageable views. SearchView owns results and selected-place state; PlaceListView and MapView receive controlled props and report selections through callbacks. This avoids independent selection state drifting between views. Typed API adapters isolate HTTP details from rendering. Runtime parsing complements TypeScript because a type annotation cannot guarantee the shape of JSON received from another process. Fluent UI supplies consistent controls, while shared CSS supports a map-oriented desktop workspace and a narrower single-column layout. [1, 2]

The backend separates controllers, services, repositories, entities, and data-transfer objects. Services centralize business rules; repositories isolate persistence operations. GooglePlaceSearchClient hides provider-specific request/response formats behind the application contract. Server-side Places credentials remain separate from the browser-visible Maps key. Claim submission verifies the place, while an administrator still evaluates ownership. Transactional claim decisions protect state changes from conflicting updates. [3, 4]

Keycloak externalizes credential management instead of implementing password handling in React. Spring Security validates bearer tokens for API calls. Administrator authority is derived from application database status. Session renewal uses an existing backend OIDC session while refresh tokens stay server-side; ordinary API requests continue to use bearer authentication. These responsibilities must remain distinct from frontend route visibility. [5]

### Development and operational environment

Development used Windows, PowerShell, VS Code, Git branches and pull requests, Docker-hosted local Keycloak, npm, and the Maven wrapper. Local configuration requires matching frontend API URLs, backend identity-provider settings, and exact authentication callback origins. The inspected local setup uses frontend port 5174, backend port 8080, and Keycloak port 8084. Default H2/create-drop configuration is disposable; persistent deployment needs a deliberate database/migration configuration. Dependency versions here reflect repository manifests, not an independently verified compatibility benchmark. [1, 6]


## 3. AI Integration and Methodology

### Planning and design

Codex was used to inspect the frontend structure, interpret the project plan and diagrams, identify unfinished responsibilities, and propose a sequence of work. The developer claimed the place-related tasks and progressed from a list view to details, API integration, search coordination, and map presentation. Existing teammate review and claim components provided reusable interfaces and architectural context. Human ownership decisions and assignment requirements remained the basis for accepting the plan.

Design interactions emphasized matching the structure of existing views rather than introducing an unrelated framework. The developer explicitly corrected the map implementation to Google Maps and later constrained the redesign to UI/UX changes. The resulting design separated controlled presentation components, typed API adapters, shared models, and stateful coordination. Backend inspection shows comparable separation into HTTP, business, provider-adapter, and persistence layers. This supports analysis of the integrated design; it does not establish an exact AI-authorship percentage for backend code. [2–4]

### Implementation and prompting evidence

Recorded prompts show increasingly specific scope. Examples include “Implement it following the same format/template,” “Do not implement the UI yet, just the functionlity of signing out,” and “And use the same structure/style that you have been using, with comments and the necessary files.” These are excerpts from the development conversation, with original wording preserved. Subsequent feedback asked that existing implementations remain intact during the UI redesign. A reviewer requested comments where behavior was difficult to read. [7]

Codex contributed drafts and refinements for components, request serialization, wire-to-model conversion, loading/error states, integration tests, and explanatory comments. Humans checked whether the generated result matched the task, existing view conventions, and teammate APIs. When an agreed place contract was unavailable, the developer authorized a proposed contract based on existing patterns. This enabled parallel progress but created an assumption that later required backend coordination.

### Correction and verification loop

The working method was: inspect relevant code → specify scope and constraints → generate a focused change → inspect the diff → run relevant tests/type checks/builds → review integration → submit a PR. Iterations were not consistently counted, so the report gives examples rather than an invented average prompt count. Local mocks enabled development before all services were available, but human end-to-end testing exposed configuration and contract issues that isolated tests did not cover.

Earlier logout draft: logOut(); navigate("/welcome", { replace: true });
Refinement: navigate("/welcome", { replace: true, flushSync: true }); logOut();

The correction addressed a route-guard race in which clearing authentication could start login before public navigation committed. Router integration tests verified the local transition. Later Keycloak logout integration and deployed behavior introduced additional conditions; the reported deployed failure demonstrates why a corrected component test cannot substitute for validation of the real identity-provider round trip. The current UI hides sign-out while retaining its handler. [2, 5, 7]


## 4. Comparative Analysis and Research Findings

### Productivity and efficiency

Codex reduced the manual effort of drafting repeated view structures, typed models, API adapters, tests, and documentation. Humans could review a concrete implementation instead of starting each file from an empty editor. However, this observation is not a measured time saving: no stopwatch records, comparable unassisted task, or randomized experiment were retained. It would be unsupported to claim a percentage improvement or that AI was faster for every task.

Efficiency benefits were strongest for bounded tasks with existing examples. The same structure could be extended across list/details views and API helpers. Costs included providing context, refining instructions, validating assumptions, correcting routes, configuring identity services, and debugging asynchronous behavior. Generated code shifted some work from writing into review and verification. A quick first draft was useful only when the integration and acceptance criteria were also satisfied.

| Evidence | Interpretation and limit |

| Current frontend suite: 386 passed, 2 skipped across 30 test files | Fresh local verification; not live-service coverage. |

| Recent UI-removal checks: 7 passed, 2 skipped; TypeScript passed | Two retained menu-interaction tests cannot run without the removed action. |

| Historical logout UI checkpoint: 336 tests plus typecheck/build passed | Earlier checkpoint; counts are not directly comparable across revisions. |

| Backend has 21 Java test source files | Inventory, not 21 tests passed; no fresh backend execution claimed. |

### Output quality and negative evidence

Quality gains included separation of concerns, validation at API boundaries, shared selection, explicit error states, cleanup of map listeners, and tests for stale responses and review drafts. These are inspectable properties, not evidence that AI alone caused the improvements. The current frontend result measures regression checks at one local revision. The backend includes controller, service, repository, authentication, provider-flow, and integration tests; their existence does not establish a current successful run. [2–5, 8]

Negative examples were consequential. An assumed place endpoint caused a 404 and required contract reconciliation. An initial map-library choice needed a human correction to Google Maps. The logout ordering needed a router-aware test and refinement. Deployed sign-out subsequently failed despite local test success, and the team chose to remove its UI action. These examples show incorrect assumptions, incomplete environment validation, and the need to report remaining defects rather than equating generated code with finished functionality. [7]

### Comparison and limits of inference

The supported comparison is between AI-assisted first drafts and reviewed/refined implementations. First drafts supplied useful structure; human constraints and verification improved project fit and exposed failures. Traditional implementation would require writing the same plumbing and tests manually, but this project provides no matched baseline for its cost. Only Codex was reported, so no cross-tool ranking is possible. Test counts, different task complexity, accumulated developer familiarity, and teammate changes confound a causal comparison. No separate extra-credit AI experiment was completed or claimed.


## 5. Challenges and Adaptations

### Frontend/backend contracts and external APIs

Frontend development initially preceded a finalized place-search contract. The proposed client made route, parameter, and response-field assumptions. A 404 during real search exposed a mismatch that could not be resolved by styling or component tests. The adaptation was to compare actual requests with controller mappings and align typed models with response objects. Current PlaceController accepts location_text, coordinates, radius_meters, and place_type under /api/v1/places. Google provider data is translated by the backend and validated again at the frontend boundary. [2, 3]

Google integration also required separating map rendering from place lookup. The browser loads map libraries and markers; backend adapters perform searches and verify claim targets. Current text search resolves a location before nearby search, uses a radius restriction, and limits nearby results to 20. Field masks request the provider fields needed by the application. This architecture keeps provider-specific transformations and server credentials out of the views. It still requires live API configuration and exposes cost, quota, and availability dependencies. [3]

### Authentication, configuration, and deployment

Development encountered missing frontend environment configuration, mismatched identity-provider settings, and uncertainty about restarting services after changes. An undefined API base could produce a frontend navigation error, while incorrect Keycloak client credentials failed the authentication exchange. PowerShell also required a different environment-loading procedure from the Bash commands in the original backend instructions. The lesson was to verify each process’s configuration and distinguish frontend, backend, and identity-provider failures.

Local logout, backend OIDC sessions, and Keycloak SSO are different mechanisms. The current UI had attempted Keycloak end-session navigation after public-route navigation and local clearing. The developer nevertheless reported deployed logout returning into authentication/exploration. Current code and tests did not establish a unique cause. An older serving version, deployment configuration, and redirect behavior were diagnostic possibilities, not confirmed findings. The requested adaptation removed only the menu item/divider, preserved the handler and authentication methods, and retained but skipped two UI-interaction tests. [5, 7]

### Asynchrony, testing, and maintainability

Overlapping searches and place selections can finish out of order. Request sequence checks prevent stale responses from replacing current intent. Map effects clean up listeners and markers, and late SDK completion is ignored after disposal. Safe API reads and map loading have bounded deadlines and retry controls. Mutation timeout policy is intentionally different because an interrupted write may already have committed. These behaviors need explanatory comments and tests; their complexity should not be hidden behind generated code. [2]

Review feedback encouraged comments on non-obvious decisions. The useful adaptation was to explain why ordering, cleanup, and state-reset choices exist, rather than narrating every line. The wider learning was to use AI for inspectable increments and keep humans responsible for contract agreement, defect triage, and release decisions.


## 6. Project Outcomes and Evaluation

### Outcome assessment

LocationLens implements the core discovery experience and the two additional review and business-claim workflows across frontend and backend. Shared state links list, map, and details. Backend services connect Google lookup with application persistence and administrator authorization. The team reported these core workflows working end to end. This report separately records the later deployed logout defect and the current removal of its UI action; it does not claim that every optional interaction is complete or that the deployed site was independently retested for this report.

CI configuration now exists for both repositories. Frontend CI installs locked dependencies, checks TypeScript, runs tests, builds, and uploads an artifact. Backend CI executes Maven tests with H2 configuration and excludes the identity-provider-dependent application context smoke test. A manual Playwright workflow exercises claim/review flows with paired repositories and fixtures. Both App Engine deployment workflows are manually triggered, verify/package their respective applications, and deploy versions with promote: false. Workflow files establish intended automation; successful run evidence and production traffic promotion are separate facts. [6, 8]

### Where AI provided value

AI provided meaningful value in repetitive scaffolding, translating examples into related components, assembling initial tests, explaining unfamiliar code, and drafting comments/documentation. Existing team conventions gave generated changes a useful target. Human review improved correctness and consistency, particularly at contract and authentication boundaries. The strongest supported conclusion is that Codex served as an implementation and learning assistant within a review process, rather than an autonomous authority on system behavior.

AI was less reliable when missing information had to be guessed: endpoint naming, external-service requirements, and deployed session behavior. Security-sensitive decisions and release readiness required human verification. Generating tests around the same incorrect assumption could make a local suite reassuring without confirming reality. Backend correctness must be evaluated from behavior and tests; incomplete AI-interaction records limit claims about how much of that correctness came from Codex.

### Software delivery and handoff readiness

A usable delivery package needs paired frontend/backend setup instructions, configuration templates without credentials, Keycloak realm/client and redirect setup, Google API prerequisites, database/migration guidance, test commands, API contracts, deployment procedures, and troubleshooting. Frontend docs cover places, reviews, models, auth, and UI; the backend README supplies basic local Keycloak setup. These provide a foundation but should be reviewed against the final revision. In particular, older auth documentation contains descriptions of prior behavior, and workflow configuration must not be described as proof of a successful live release. [1, 5, 6]

The report does not replace repository documentation or certify delivery completion. Handoff acceptance should involve another developer following the instructions from a clean checkout, running both services, completing a user/admin workflow, and recording the exact deployed revisions. The retained sign-out limitation and disposable local database defaults must be visible to that developer.


## 7. Future Directions and Evidence Sources

### Application improvements

First, diagnose and restore sign-out using a real deployed browser trace, consistent serving versions, and approved post-logout return origins. Test the complete identity-provider round trip and concurrent token renewal before restoring the menu action. Second, expand deployed smoke tests to authentication, search/filter, map selection, reviews, and claim decisions. These should distinguish fixtures from live services and report the environment used.

Third, formalize the API contract with versioned examples or OpenAPI documentation so paired changes do not depend on guessed paths. Improve pagination/result limits, provider quota handling, and user feedback for unavailable services. Review token-storage risks, production database migrations, and credential/origin configuration. Keep accessibility checks and narrow-screen browser validation alongside functional tests. These are proposed improvements, not features already delivered.

### Improving the AI methodology

Provide Codex with an agreed contract, representative existing files, acceptance criteria, and explicit scope before implementation. Preserve prompt/output records and log review corrections and time spent generating, debugging, verifying, and integrating. Require independent acceptance tests for externally visible behavior instead of accepting tests that only mirror the generated implementation.

A future controlled experiment could compare a generic prompt with a repository-context prompt on the same bounded task, using the same model/settings, equal budgets, and multiple independent trials. Measure completion time, failed acceptance checks, defects, and manual corrections. Report Research Question → Method → Evidence → Result → Interpretation, including uncertainty. No results from such an experiment are asserted here.

### Evidence register

[1] Frontend package.json, app/root.tsx, app/routes.ts, react-router.config.ts; backend pom.xml and README.md.
[2] Frontend app/components/places/*, app/lib/place-api.ts, api-client.ts, google-maps.ts, request-timeout.ts, and corresponding tests; app/types/place.ts and search-criteria.ts.
[3] Backend PlaceController, PlaceSearchService, GooglePlaceSearchClient, PlaceRepository, and GooglePlaceSearchFlowTest.
[4] Backend ReviewController/Service/Repository and BusinessClaimController/Service/Repository, GoogleBusinessPlaceLookup, and integration tests.
[5] Frontend auth/token-storage.ts, auth-context.tsx, lib/session-api.ts, account-menu.tsx, docs/auth.md; backend SecurityConfig, AdminAuthoritiesConverter, SessionController and IdpTokenRelaySuccessHandler.
[6] Frontend .github/workflows/fe-ci.yml, fe-cd.yml, claim-e2e.yml; backend java-ci.yml, java-cd.yml and application.properties.
[7] Recorded Project 1 development conversation: scope prompts, reviewer feedback, map/API corrections, logout defect, and UI-removal request.
[8] Fresh frontend suite output dated October 14, 2026; recent focused tests/typecheck; historical 336-test checkpoint at frontend commit 2650cc3.

Repository snapshot: frontend daf9df4 (sign-out UI hidden), backend 5859f71. Sources: github.com/bp4k/locationlens.frontend and github.com/bp4k/locationlens. Backend tests were inspected but not freshly executed; live deployment results and measured time savings are not invented.