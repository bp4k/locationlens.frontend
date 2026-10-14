"""Create a seven-page, editable Word report with standard-library OOXML."""
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED
import re

ROOT = Path(__file__).resolve().parent
PAGES = [
('1. Introduction and Background', [
('p', 'LocationLens is a place-discovery application developed for CS 3300 Project 1. Its objective is to help users find nearby locations, compare geographic and text-based information, and contribute local knowledge. The application combines a React frontend with a Spring Boot backend, an identity provider, Google place/map services, and relational persistence. The project also examined how Codex supported software development and where human judgment remained necessary.'),
('h', 'Scope and implemented functionality'),
('p', 'The core minimum marketable features are a landing page and authentication, location-based search, exploration through an interactive map and text results, and location-type filtering. Users can search by location text or coordinates with a radius. A selected place is shared between list and map views, and its details provide entry points into additional workflows. The two additional features are reviews/ratings with review history, and business-ownership claims with administrator approval or rejection. Account information supports the authenticated experience.'),
('p', 'The frontend handles presentation, interaction, and response conversion. The backend validates access, coordinates external services, enforces business rules, and persists application records. Search uses Google Places through the backend; the browser separately uses Google Maps for rendering. Reviews and claims connect frontend views and API adapters to controller, service, and repository layers. This report covers both repositories rather than treating the interface as an independent product. [1–4]'),
('h', 'Role of AI and evaluation boundary'),
('p', 'The team identified Codex as its AI development tool. The recorded development interactions show AI-assisted repository exploration, implementation planning, component and API-client generation, tests, UI refinement, documentation, and troubleshooting. Humans supplied scope, existing conventions, feature ownership, service constraints, and review feedback. Generated changes were refined through inspection, testing, and integration. The report evaluates this human–AI process rather than assuming every committed line was AI-authored.'),
('p', 'Evidence consists of development conversation examples, current source code, test definitions and recorded results, and workflow configuration. There was no controlled non-AI baseline, measured development-time log, or comparison between AI models. Findings about productivity are therefore qualitative. Test results establish behavior under their test conditions; they do not measure coverage or prove all deployed integrations. Backend source inspection establishes implementation structure, but complete backend prompt transcripts and a fresh backend test result were not available for this report.'),
('p', 'Outcome claims also require qualification. The team reported core workflows working end to end, then subsequently reported deployed sign-out failing. The current frontend removes only the Sign out menu item and divider while retaining logout logic. This is a documented limitation and temporary scope adjustment, not evidence that identity-provider logout has been fixed. [5]'),
]),
('2. Software Technologies', [
('table', [('Layer', 'Technology and purpose'), ('Frontend', 'React 19, TypeScript 5.9, React Router 8 framework/SPA mode, Vite 8'), ('UI', 'Fluent UI 9, shared CSS, Tailwind CSS 4, responsive layouts'), ('Place services', 'Google Maps JavaScript loader 2.1; backend Google Places API (New) adapter'), ('Backend', 'Java 21, Spring Boot 4.1.1, Maven, Spring MVC and Security'), ('Persistence', 'Spring Data JPA/Hibernate; H2 development/testing; MySQL/Cloud SQL production configuration; Flyway'), ('Identity', 'Keycloak with OpenID Connect/OAuth 2.0 and JWT bearer validation'), ('Verification and delivery', 'Vitest, React Testing Library, Playwright; Java test suites; GitHub Actions and Google App Engine')]),
('h', 'Architecture and important choices'),
('p', 'React components split the interface into manageable views. SearchView owns results and selected-place state; PlaceListView and MapView receive controlled props and report selections through callbacks. This avoids independent selection state drifting between views. Typed API adapters isolate HTTP details from rendering. Runtime parsing complements TypeScript because a type annotation cannot guarantee the shape of JSON received from another process. Fluent UI supplies consistent controls, while shared CSS supports a map-oriented desktop workspace and a narrower single-column layout. [1, 2]'),
('p', 'The backend separates controllers, services, repositories, entities, and data-transfer objects. Services centralize business rules; repositories isolate persistence operations. GooglePlaceSearchClient hides provider-specific request/response formats behind the application contract. Server-side Places credentials remain separate from the browser-visible Maps key. Claim submission verifies the place, while an administrator still evaluates ownership. Transactional claim decisions protect state changes from conflicting updates. [3, 4]'),
('p', 'Keycloak externalizes credential management instead of implementing password handling in React. Spring Security validates bearer tokens for API calls. Administrator authority is derived from application database status. Session renewal uses an existing backend OIDC session while refresh tokens stay server-side; ordinary API requests continue to use bearer authentication. These responsibilities must remain distinct from frontend route visibility. [5]'),
('h', 'Development and operational environment'),
('p', 'Development used Windows, PowerShell, VS Code, Git branches and pull requests, Docker-hosted local Keycloak, npm, and the Maven wrapper. Local configuration requires matching frontend API URLs, backend identity-provider settings, and exact authentication callback origins. The inspected local setup uses frontend port 5174, backend port 8080, and Keycloak port 8084. Default H2/create-drop configuration is disposable; persistent deployment needs a deliberate database/migration configuration. Dependency versions here reflect repository manifests, not an independently verified compatibility benchmark. [1, 6]'),
]),
('3. AI Integration and Methodology', [
('h', 'Planning and design'),
('p', 'Codex was used to inspect the frontend structure, interpret the project plan and diagrams, identify unfinished responsibilities, and propose a sequence of work. The developer claimed the place-related tasks and progressed from a list view to details, API integration, search coordination, and map presentation. Existing teammate review and claim components provided reusable interfaces and architectural context. Human ownership decisions and assignment requirements remained the basis for accepting the plan.'),
('p', 'Design interactions emphasized matching the structure of existing views rather than introducing an unrelated framework. The developer explicitly corrected the map implementation to Google Maps and later constrained the redesign to UI/UX changes. The resulting design separated controlled presentation components, typed API adapters, shared models, and stateful coordination. Backend inspection shows comparable separation into HTTP, business, provider-adapter, and persistence layers. This supports analysis of the integrated design; it does not establish an exact AI-authorship percentage for backend code. [2–4]'),
('h', 'Implementation and prompting evidence'),
('p', 'Recorded prompts show increasingly specific scope. Examples include “Implement it following the same format/template,” “Do not implement the UI yet, just the functionlity of signing out,” and “And use the same structure/style that you have been using, with comments and the necessary files.” These are excerpts from the development conversation, with original wording preserved. Subsequent feedback asked that existing implementations remain intact during the UI redesign. A reviewer requested comments where behavior was difficult to read. [7]'),
('p', 'Codex contributed drafts and refinements for components, request serialization, wire-to-model conversion, loading/error states, integration tests, and explanatory comments. Humans checked whether the generated result matched the task, existing view conventions, and teammate APIs. When an agreed place contract was unavailable, the developer authorized a proposed contract based on existing patterns. This enabled parallel progress but created an assumption that later required backend coordination.'),
('h', 'Correction and verification loop'),
('p', 'The working method was: inspect relevant code → specify scope and constraints → generate a focused change → inspect the diff → run relevant tests/type checks/builds → review integration → submit a PR. Iterations were not consistently counted, so the report gives examples rather than an invented average prompt count. Local mocks enabled development before all services were available, but human end-to-end testing exposed configuration and contract issues that isolated tests did not cover.'),
('code', 'Earlier logout draft: logOut(); navigate("/welcome", { replace: true });\nRefinement: navigate("/welcome", { replace: true, flushSync: true }); logOut();'),
('p', 'The correction addressed a route-guard race in which clearing authentication could start login before public navigation committed. Router integration tests verified the local transition. Later Keycloak logout integration and deployed behavior introduced additional conditions; the reported deployed failure demonstrates why a corrected component test cannot substitute for validation of the real identity-provider round trip. The current UI hides sign-out while retaining its handler. [2, 5, 7]'),
]),
('4. Comparative Analysis and Research Findings', [
('h', 'Productivity and efficiency'),
('p', 'Codex reduced the manual effort of drafting repeated view structures, typed models, API adapters, tests, and documentation. Humans could review a concrete implementation instead of starting each file from an empty editor. However, this observation is not a measured time saving: no stopwatch records, comparable unassisted task, or randomized experiment were retained. It would be unsupported to claim a percentage improvement or that AI was faster for every task.'),
('p', 'Efficiency benefits were strongest for bounded tasks with existing examples. The same structure could be extended across list/details views and API helpers. Costs included providing context, refining instructions, validating assumptions, correcting routes, configuring identity services, and debugging asynchronous behavior. Generated code shifted some work from writing into review and verification. A quick first draft was useful only when the integration and acceptance criteria were also satisfied.'),
('table', [('Evidence', 'Interpretation and limit'), ('Current frontend suite: CURRENT_TEST_RESULT', 'Fresh local verification; not live-service coverage.'), ('Recent UI-removal checks: 7 passed, 2 skipped; TypeScript passed', 'Two retained menu-interaction tests cannot run without the removed action.'), ('Historical logout UI checkpoint: 336 tests plus typecheck/build passed', 'Earlier checkpoint; counts are not directly comparable across revisions.'), ('Backend has 21 Java test source files', 'Inventory, not 21 tests passed; no fresh backend execution claimed.')]),
('h', 'Output quality and negative evidence'),
('p', 'Quality gains included separation of concerns, validation at API boundaries, shared selection, explicit error states, cleanup of map listeners, and tests for stale responses and review drafts. These are inspectable properties, not evidence that AI alone caused the improvements. The current frontend result measures regression checks at one local revision. The backend includes controller, service, repository, authentication, provider-flow, and integration tests; their existence does not establish a current successful run. [2–5, 8]'),
('p', 'Negative examples were consequential. An assumed place endpoint caused a 404 and required contract reconciliation. An initial map-library choice needed a human correction to Google Maps. The logout ordering needed a router-aware test and refinement. Deployed sign-out subsequently failed despite local test success, and the team chose to remove its UI action. These examples show incorrect assumptions, incomplete environment validation, and the need to report remaining defects rather than equating generated code with finished functionality. [7]'),
('h', 'Comparison and limits of inference'),
('p', 'The supported comparison is between AI-assisted first drafts and reviewed/refined implementations. First drafts supplied useful structure; human constraints and verification improved project fit and exposed failures. Traditional implementation would require writing the same plumbing and tests manually, but this project provides no matched baseline for its cost. Only Codex was reported, so no cross-tool ranking is possible. Test counts, different task complexity, accumulated developer familiarity, and teammate changes confound a causal comparison. No separate extra-credit AI experiment was completed or claimed.'),
]),
('5. Challenges and Adaptations', [
('h', 'Frontend/backend contracts and external APIs'),
('p', 'Frontend development initially preceded a finalized place-search contract. The proposed client made route, parameter, and response-field assumptions. A 404 during real search exposed a mismatch that could not be resolved by styling or component tests. The adaptation was to compare actual requests with controller mappings and align typed models with response objects. Current PlaceController accepts location_text, coordinates, radius_meters, and place_type under /api/v1/places. Google provider data is translated by the backend and validated again at the frontend boundary. [2, 3]'),
('p', 'Google integration also required separating map rendering from place lookup. The browser loads map libraries and markers; backend adapters perform searches and verify claim targets. Current text search resolves a location before nearby search, uses a radius restriction, and limits nearby results to 20. Field masks request the provider fields needed by the application. This architecture keeps provider-specific transformations and server credentials out of the views. It still requires live API configuration and exposes cost, quota, and availability dependencies. [3]'),
('h', 'Authentication, configuration, and deployment'),
('p', 'Development encountered missing frontend environment configuration, mismatched identity-provider settings, and uncertainty about restarting services after changes. An undefined API base could produce a frontend navigation error, while incorrect Keycloak client credentials failed the authentication exchange. PowerShell also required a different environment-loading procedure from the Bash commands in the original backend instructions. The lesson was to verify each process’s configuration and distinguish frontend, backend, and identity-provider failures.'),
('p', 'Local logout, backend OIDC sessions, and Keycloak SSO are different mechanisms. The current UI had attempted Keycloak end-session navigation after public-route navigation and local clearing. The developer nevertheless reported deployed logout returning into authentication/exploration. Current code and tests did not establish a unique cause. An older serving version, deployment configuration, and redirect behavior were diagnostic possibilities, not confirmed findings. The requested adaptation removed only the menu item/divider, preserved the handler and authentication methods, and retained but skipped two UI-interaction tests. [5, 7]'),
('h', 'Asynchrony, testing, and maintainability'),
('p', 'Overlapping searches and place selections can finish out of order. Request sequence checks prevent stale responses from replacing current intent. Map effects clean up listeners and markers, and late SDK completion is ignored after disposal. Safe API reads and map loading have bounded deadlines and retry controls. Mutation timeout policy is intentionally different because an interrupted write may already have committed. These behaviors need explanatory comments and tests; their complexity should not be hidden behind generated code. [2]'),
('p', 'Review feedback encouraged comments on non-obvious decisions. The useful adaptation was to explain why ordering, cleanup, and state-reset choices exist, rather than narrating every line. The wider learning was to use AI for inspectable increments and keep humans responsible for contract agreement, defect triage, and release decisions.'),
]),
('6. Project Outcomes and Evaluation', [
('h', 'Outcome assessment'),
('p', 'LocationLens implements the core discovery experience and the two additional review and business-claim workflows across frontend and backend. Shared state links list, map, and details. Backend services connect Google lookup with application persistence and administrator authorization. The team reported these core workflows working end to end. This report separately records the later deployed logout defect and the current removal of its UI action; it does not claim that every optional interaction is complete or that the deployed site was independently retested for this report.'),
('p', 'CI configuration now exists for both repositories. Frontend CI installs locked dependencies, checks TypeScript, runs tests, builds, and uploads an artifact. Backend CI executes Maven tests with H2 configuration and excludes the identity-provider-dependent application context smoke test. A manual Playwright workflow exercises claim/review flows with paired repositories and fixtures. Both App Engine deployment workflows are manually triggered, verify/package their respective applications, and deploy versions with promote: false. Workflow files establish intended automation; successful run evidence and production traffic promotion are separate facts. [6, 8]'),
('h', 'Where AI provided value'),
('p', 'AI provided meaningful value in repetitive scaffolding, translating examples into related components, assembling initial tests, explaining unfamiliar code, and drafting comments/documentation. Existing team conventions gave generated changes a useful target. Human review improved correctness and consistency, particularly at contract and authentication boundaries. The strongest supported conclusion is that Codex served as an implementation and learning assistant within a review process, rather than an autonomous authority on system behavior.'),
('p', 'AI was less reliable when missing information had to be guessed: endpoint naming, external-service requirements, and deployed session behavior. Security-sensitive decisions and release readiness required human verification. Generating tests around the same incorrect assumption could make a local suite reassuring without confirming reality. Backend correctness must be evaluated from behavior and tests; incomplete AI-interaction records limit claims about how much of that correctness came from Codex.'),
('h', 'Software delivery and handoff readiness'),
('p', 'A usable delivery package needs paired frontend/backend setup instructions, configuration templates without credentials, Keycloak realm/client and redirect setup, Google API prerequisites, database/migration guidance, test commands, API contracts, deployment procedures, and troubleshooting. Frontend docs cover places, reviews, models, auth, and UI; the backend README supplies basic local Keycloak setup. These provide a foundation but should be reviewed against the final revision. In particular, older auth documentation contains descriptions of prior behavior, and workflow configuration must not be described as proof of a successful live release. [1, 5, 6]'),
('p', 'The report does not replace repository documentation or certify delivery completion. Handoff acceptance should involve another developer following the instructions from a clean checkout, running both services, completing a user/admin workflow, and recording the exact deployed revisions. The retained sign-out limitation and disposable local database defaults must be visible to that developer.'),
]),
('7. Future Directions and Evidence Sources', [
('h', 'Application improvements'),
('p', 'First, diagnose and restore sign-out using a real deployed browser trace, consistent serving versions, and approved post-logout return origins. Test the complete identity-provider round trip and concurrent token renewal before restoring the menu action. Second, expand deployed smoke tests to authentication, search/filter, map selection, reviews, and claim decisions. These should distinguish fixtures from live services and report the environment used.'),
('p', 'Third, formalize the API contract with versioned examples or OpenAPI documentation so paired changes do not depend on guessed paths. Improve pagination/result limits, provider quota handling, and user feedback for unavailable services. Review token-storage risks, production database migrations, and credential/origin configuration. Keep accessibility checks and narrow-screen browser validation alongside functional tests. These are proposed improvements, not features already delivered.'),
('h', 'Improving the AI methodology'),
('p', 'Provide Codex with an agreed contract, representative existing files, acceptance criteria, and explicit scope before implementation. Preserve prompt/output records and log review corrections and time spent generating, debugging, verifying, and integrating. Require independent acceptance tests for externally visible behavior instead of accepting tests that only mirror the generated implementation.'),
('p', 'A future controlled experiment could compare a generic prompt with a repository-context prompt on the same bounded task, using the same model/settings, equal budgets, and multiple independent trials. Measure completion time, failed acceptance checks, defects, and manual corrections. Report Research Question → Method → Evidence → Result → Interpretation, including uncertainty. No results from such an experiment are asserted here.'),
('h', 'Evidence register'),
('p', '[1] Frontend package.json, app/root.tsx, app/routes.ts, react-router.config.ts; backend pom.xml and README.md.\n[2] Frontend app/components/places/*, app/lib/place-api.ts, api-client.ts, google-maps.ts, request-timeout.ts, and corresponding tests; app/types/place.ts and search-criteria.ts.\n[3] Backend PlaceController, PlaceSearchService, GooglePlaceSearchClient, PlaceRepository, and GooglePlaceSearchFlowTest.\n[4] Backend ReviewController/Service/Repository and BusinessClaimController/Service/Repository, GoogleBusinessPlaceLookup, and integration tests.\n[5] Frontend auth/token-storage.ts, auth-context.tsx, lib/session-api.ts, account-menu.tsx, docs/auth.md; backend SecurityConfig, AdminAuthoritiesConverter, SessionController and IdpTokenRelaySuccessHandler.\n[6] Frontend .github/workflows/fe-ci.yml, fe-cd.yml, claim-e2e.yml; backend java-ci.yml, java-cd.yml and application.properties.\n[7] Recorded Project 1 development conversation: scope prompts, reviewer feedback, map/API corrections, logout defect, and UI-removal request.\n[8] Fresh frontend suite output dated October 14, 2026; recent focused tests/typecheck; historical 336-test checkpoint at frontend commit 2650cc3.'),
('p', 'Repository snapshot: frontend daf9df4 (sign-out UI hidden), backend 5859f71. Sources: github.com/bp4k/locationlens.frontend and github.com/bp4k/locationlens. Backend tests were inspected but not freshly executed; live deployment results and measured time savings are not invented.'),
]),
]

def run(value, bold=False):
    return '<w:r><w:rPr>' + ('<w:b/>' if bold else '') + '</w:rPr><w:t xml:space="preserve">' + escape(value) + '</w:t></w:r>'

def para(value, style='Normal'):
    lines = value.split('\n')
    body = '<w:r><w:br/></w:r>'.join(run(line) for line in lines)
    return f'<w:p><w:pPr><w:pStyle w:val="{style}"/></w:pPr>{body}</w:p>'

def table(rows):
    body = ''
    for i, row in enumerate(rows):
        cells = ''
        for j, value in enumerate(row):
            width = 2700 if j == 0 else 7380
            fill = '003057' if i == 0 else ('F0F3F6' if i % 2 else 'FFFFFF')
            color = '<w:color w:val="FFFFFF"/>' if i == 0 else ''
            cells += f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/><w:shd w:fill="{fill}"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="TableText"/></w:pPr><w:r><w:rPr>{color}' + ('<w:b/>' if i == 0 else '') + f'</w:rPr><w:t>{escape(value)}</w:t></w:r></w:p></w:tc>'
        body += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cells + '</w:tr>'
    return '<w:tbl><w:tblPr><w:tblW w:w="10080" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="2700"/><w:gridCol w:w="7380"/></w:tblGrid>' + body + '</w:tbl>'

NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

def build(test_result):
    body = ''
    md = ['# LocationLens: Final AI Integration Report', 'CS 3300 • Project 1 • October 14, 2026\nTeam: Advaith, Jake, James, Aaron, Albert\n']
    for i, (heading, contents) in enumerate(PAGES):
        if i:
            body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
        else:
            body += para('LOCATIONLENS', 'Title')
            body += para('Final AI Integration Report | CS 3300 • Project 1', 'Subtitle')
            body += para('Advaith • Jake • James • Aaron • Albert | October 14, 2026', 'Subtitle')
        body += para(heading, 'Heading1')
        md.append('\n## ' + heading)
        for kind, value in contents:
            if kind == 'table':
                rows = [(a.replace('CURRENT_TEST_RESULT', test_result), b.replace('CURRENT_TEST_RESULT', test_result)) for a, b in value]
                body += table(rows)
                md.extend(['| ' + a + ' | ' + b + ' |' for a, b in rows])
            else:
                body += para(value, {'p': 'Normal', 'h': 'Heading2', 'code': 'Code'}[kind])
                md.append(('### ' if kind == 'h' else '') + value)
    body += '<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="900" w:right="1080" w:bottom="900" w:left="1080" w:header="360" w:footer="360"/></w:sectPr>'
    styles = f'''<w:styles {NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="243447"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="250" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:widowControl/></w:pPr></w:style>
    <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="38"/><w:color w:val="003057"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:sz w:val="20"/><w:color w:val="687B8A"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="100" w:after="130"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="003057"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:pPr><w:keepNext/><w:spacing w:before="100" w:after="70"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="23"/><w:color w:val="003057"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:pPr><w:spacing w:after="0" w:line="220" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="19"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:pPr><w:shd w:fill="F0F3F6"/><w:spacing w:after="100" w:line="220" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/></w:rPr></w:style></w:styles>'''
    rel_ns = 'http://schemas.openxmlformats.org/package/2006/relationships'
    type_base = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
    entries = {
        '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
        '_rels/.rels': f'<Relationships xmlns="{rel_ns}"><Relationship Id="rId1" Type="{type_base}officeDocument" Target="word/document.xml"/></Relationships>',
        'word/document.xml': f'<w:document {NS}><w:body>{body}</w:body></w:document>',
        'word/styles.xml': styles,
        'word/_rels/document.xml.rels': f'<Relationships xmlns="{rel_ns}"><Relationship Id="rId1" Type="{type_base}styles" Target="styles.xml"/><Relationship Id="rId2" Type="{type_base}header" Target="header1.xml"/><Relationship Id="rId3" Type="{type_base}footer" Target="footer1.xml"/></Relationships>',
        'word/header1.xml': f'<w:hdr {NS}><w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:color="B3A369"/></w:pBdr></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="003057"/></w:rPr><w:t>LOCATIONLENS  |  PROJECT 1 AI INTEGRATION REPORT</w:t></w:r></w:p></w:hdr>',
        'word/footer1.xml': f'<w:ftr {NS}><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="687B8A"/></w:rPr><w:t>CS 3300 • October 14, 2026  |  </w:t></w:r><w:fldSimple w:instr="PAGE"/></w:p></w:ftr>',
    }
    output = ROOT / 'LocationLens_Final_Report.docx'
    with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
        for name, content in entries.items():
            archive.writestr(name, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + content)
    (ROOT / 'LocationLens_Final_Report.md').write_text('\n\n'.join(md), encoding='utf-8')
    print('Created', output)
    print('Approximate words:', len(re.findall(r'\S+', '\n'.join(md))))

if __name__ == '__main__':
    import sys
    build(sys.argv[1] if len(sys.argv) > 1 else 'pending fresh run')
