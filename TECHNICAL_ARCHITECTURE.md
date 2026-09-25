# TECHNICAL_ARCHITECTURE.md
# FORGE//SHIFT — TECHNICAL ARCHITECTURE
Version: 1.0 — Arena Agent Production Architecture

---

## 1. VERIFIED PLATFORM FACTS

This document incorporates live verification performed on 2026-09-25.

### CrazyGames

Current official CrazyGames technical requirements state:

- maximum total file size: 250 MB
- maximum file count: 1500
- initial download: <= 50 MB
- initial download for mobile homepage eligibility: <= 20 MB
- externally loaded resources are evaluated by time to gameplay, with a <=20 second expectation
- relative paths must be used for bundled resources
- Chrome and Edge are expected
- games need to work smoothly on lower-end Chromium/Chromebook hardware
- if mobile is supported, mouse/keyboard/touch expectations apply
- full implementation requires the CrazyGames SDK and Gameplay Start event
- Basic Launch does not permit monetization
- Full Launch ads must use the CrazyGames SDK
- external advertising networks are not allowed
- Full Launch requires stronger integration and QA

Official source: CrazyGames Documentation — docs.crazygames.com/requirements/technical

### CrazyGames SDK

The current HTML5 SDK documentation specifies SDK v3.

The SDK is loaded before game code:

`https://sdk.crazygames.com/crazygames-sdk-v3.js`

and requires asynchronous initialization:

`await window.CrazyGames.SDK.init();`

The Game module provides gameplay lifecycle functionality.

Official source: CrazyGames Documentation — docs.crazygames.com/sdk/intro

### CrazyGames rejection-risk categories

No official record in this repository establishes the exact reason for the project's approximately ten previous rejections.

Therefore the historical reasons are UNKNOWN. Do not invent a reason.

The current official CrazyGames documentation identifies rejection/QA risk categories including:

- bugs or broken mechanics
- missing English-language support
- unoriginal/cloned content
- inappropriate content
- PEGI/content issues
- poor onboarding
- unclear goals
- inconsistent controls
- poor responsiveness
- poor audio
- low visual quality
- graphical defects
- visual inconsistency
- unclear game identity
- inadequate mobile/device behavior
- poor performance
- problematic advertisements
- failure to meet technical requirements
- failure to land directly into gameplay for the applicable launch stage

Official source: CrazyGames Documentation — docs.crazygames.com/faq

FORGE//SHIFT therefore treats these as release-risk categories, not assumptions about the historical rejection causes.

---

## 2. VERIFIED ARENA AGENT MODE FACTS

Arena Agent Mode currently supports:

- connected GitHub repositories
- a sandbox copy of the repository
- file editing
- bash/sandbox execution
- web search
- coding assistance
- application preview
- Git commits
- pushing changes
- pull-request creation
- diff review
- checks visibility

An Agent Mode GitHub session currently supports ONE pull request.

Once that PR is merged or closed, that session can no longer push further changes to GitHub.

Arena explicitly recommends that work be pushed before merging/closing or that a new session be used.

Official source: Arena Help Center — help.arena.ai/articles/1655691990-how-to-use-coding-in-agent-mode

### Context

Arena Agent Mode has built-in conversation compaction. Arena states that Agent Mode sessions may be long-running and can contain hundreds of turns.

However:

**UNCONFIRMED:** Arena's public documentation does not establish a fixed maximum wall-clock duration for an individual Agent Mode session.

**UNCONFIRMED:** The current official documentation does not guarantee that uncommitted filesystem changes will survive a crash/session failure.

Therefore FORGE//SHIFT must treat uncommitted changes as disposable. Important work must be committed and pushed regularly.

Arena provides `/download-workspace` as a workaround if a session becomes unusable, but pushed GitHub checkpoints are the primary recovery mechanism.

Official source: Arena Help Center — help.arena.ai/articles/3975292349-arena-troubleshooting-session-token-limits

### Model selection

Agent Mode currently uses a dedicated orchestrator model. Arena does not currently expose the specific orchestrator model after submission.

Arena states that the orchestrator remains the same throughout a conversation in normal operation, but the system may automatically switch models if a response is likely to fail and leave the session broken.

Therefore: do not waste time attempting to force a named model inside Agent Mode. Optimize the task/environment/instructions for whichever high-capability orchestrator Arena assigns.

Official source: Arena Help Center — help.arena.ai/articles/5432423882-how-to-use-agent-mode

---

## 3. THREE.JS / VITE PERFORMANCE FACTS

Three.js explicitly requires application-level disposal of GPU-related resources. Important resources include: geometries, materials, textures, render targets, skeletons where appropriate.

Three.js also exposes `renderer.info` for observing memory/render statistics.

Official source: threejs.org/manual/pages/how-to-dispose-of-objects.html

Three.js `InstancedMesh` can reduce draw calls for many objects sharing geometry/materials.

Official source: threejs.org/docs/pages/InstancedMesh.html

Vite's production build generates optimized static output. Imported static assets are included in the build asset graph and receive processed/hashed URLs. Vite supports a relative base such as `base: './'` when relative generated URLs are required.

Official source: vite.dev/guide/static-deploy

---

## 4. ARCHITECTURE PRINCIPLE

FORGE//SHIFT uses a deliberately small number of modules.

The architecture must be:

- modular
- strongly typed
- understandable
- easy for an AI agent to inspect
- easy to debug
- difficult to accidentally break
- small enough that the whole architecture can remain in context

Do NOT create hundreds of micro-files. Do NOT create one gigantic `GameManager`. Use cohesive systems.

---

## 5. TARGET REPOSITORY STRUCTURE

The intended architecture is approximately:

```text
/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
│
├── public/
│   └── ...only truly static non-game resources if unavoidable
│
├── src/
│   ├── main.ts
│   ├── Game.ts
│   │
│   ├── core/
│   │   ├── GameState.ts
│   │   ├── Input.ts
│   │   └── Camera.ts
│   │
│   ├── gameplay/
│   │   ├── Player.ts
│   │   ├── ShiftSystem.ts
│   │   ├── RunSystem.ts
│   │   ├── LevelSystem.ts
│   │   └── Progression.ts
│   │
│   ├── presentation/
│   │   ├── SceneBuilder.ts
│   │   ├── VisualFX.ts
│   │   ├── UI.ts
│   │   └── Audio.ts
│   │
│   ├── platform/
│   │   └── CrazyGames.ts
│   │
│   └── infrastructure/
│       ├── AssetLoader.ts
│       └── Disposal.ts
│
└── src/assets/
    └── ...game assets imported through Vite
```

This is a target structure, not a demand to create every file immediately.

The final project should remain roughly in this order of magnitude, not hundreds of files.

---

## 6. RESPONSIBILITY OF EACH CORE FILE

**main.ts** — Only bootstraps the application. Responsibilities: obtain DOM/canvas, create Game, start Game. Do not put gameplay logic here.

**Game.ts** — Composition root. Responsibilities: construct systems, connect dependencies, own main update loop, coordinate lifecycle. It must NOT become a giant feature class.

**core/GameState.ts** — Typed finite-state machine. States: boot, loading, onboarding, gameplay, paused, results. State transitions are explicit.

**core/Input.ts** — Single input abstraction. Maps:

```text
W / ArrowUp → forward
S / ArrowDown → backward
A / ArrowLeft → left
D / ArrowRight → right
```

Also handles: interaction, restart, pause, touch when enabled. All event listeners must have cleanup.

**core/Camera.ts** — Owns all camera behavior. Provides: traversal follow, look-ahead, interaction focus, cinematic transition, controlled shake.

**gameplay/Player.ts** — Owns: player representation, movement, velocity, movement constraints, collision-facing integration, movement state.

**gameplay/ShiftSystem.ts** — Owns: Shift Nodes, interaction range, activation, cooldown, state transitions, environment-state consequences.

**gameplay/RunSystem.ts** — Owns: run lifecycle, timer, completion, failure, restart.

**gameplay/LevelSystem.ts** — Owns: level composition, route configuration, hazard configuration, Shift Node placement, finish/extraction.

**gameplay/Progression.ts** — Owns: score, combo, rewards, unlock state, collection state. Persistence should be abstracted sufficiently that local and CrazyGames storage can coexist.

**presentation/SceneBuilder.ts** — Owns: architectural composition, environment construction, materials, lighting setup where appropriate.

**presentation/VisualFX.ts** — Owns: Shift effects, feedback effects, camera-impact visual coordination, lightweight particles.

**presentation/UI.ts** — Owns all DOM/UI presentation. It must not own game logic.

**presentation/Audio.ts** — Owns: audio buffers, SFX, ambience, volume, pause/resume, browser audio lifecycle.

**platform/CrazyGames.ts** — Sole platform adapter. Gameplay code should not directly scatter `window.CrazyGames...` throughout the project.

**infrastructure/AssetLoader.ts** — Owns: lazy asset loading, asset caching, ownership, unloading.

**infrastructure/Disposal.ts** — Provides resource cleanup utilities.

---

## 7. STATE MANAGEMENT

Use an explicit typed state machine.

Concept:

```text
BOOT
 ↓
LOADING
 ↓
ONBOARDING
 ↓
GAMEPLAY
 ↙       ↘
FAIL     COMPLETE
 ↓          ↓
RESULTS ← RESULTS
   ↓
RESTART
   ↓
GAMEPLAY
```

Pause is orthogonal to gameplay: `GAMEPLAY ↔ PAUSED`

Do not represent game state as dozens of unrelated booleans. Avoid: `isPlaying && !isPaused && !isDead && !isLoading && ...` — prefer an explicit state.

---

## 8. SYSTEM COMMUNICATION

Prefer direct typed APIs.

Example conceptual relationships:

```text
Input → Player → RunSystem
Input → ShiftSystem → LevelSystem
RunSystem → Progression → UI
```

Avoid a universal event bus unless a genuine problem requires one. The architecture should remain inspectable.

---

## 9. MAIN LOOP

The main loop should roughly do:

```text
calculate delta
→ update game state
→ update input
→ update player
→ update shift
→ update hazards
→ update run
→ update camera
→ update presentation
→ render
```

Do not put complete implementation logic into the render loop.

---

## 10. MEMORY RULES

Do not allocate unnecessary objects inside the per-frame loop.

Avoid repeated: `new Vector3()`, `new Quaternion()`, arrays, DOM objects, materials, geometries, textures.

Cache reusable temporary objects.

When scene/level resources are replaced: dispose resources that are no longer used.

Use `renderer.info` during development/performance auditing. Three.js resources are not automatically freed just because JavaScript references disappear.

---

## 11. INSTANCING AND DRAW CALLS

Use `InstancedMesh` or geometry merging where appropriate for repeated static structures.

Good candidates: repeated beams, repeated lights, repeated wall panels, repeated environmental details, repeated decorative props.

Do not blindly instance everything. Choose based on actual bottlenecks.

---

## 12. ASSET STRATEGY

Critical startup assets: player, first route, first Shift Node, essential materials, essential UI.

Noncritical assets should be loaded later. Large optional assets must not block the first playable state.

Prefer imported assets through Vite's asset graph. Do not create fragile runtime path concatenation. Vite can process imported assets and rewrite their production URLs.

---

## 13. VITE PATH STRATEGY

The CrazyGames requirement is relative paths. The production build should therefore be designed around relative asset output.

Preferred Vite strategy: `base: './'`

Do not manually reference assets using fragile root-absolute paths. Avoid depending on development-only paths such as `/src/...` in production gameplay.

---

## 14. BUNDLE BUDGET

Hard CrazyGames limits:

```text
TOTAL FILE SIZE       <= 250 MB
FILE COUNT            <= 1500
INITIAL DOWNLOAD      <= 50 MB
MOBILE TARGET         <= 20 MB
```

Internal targets should be substantially below the hard limits.

Recommended internal goals:

- Initial playable payload: aggressively minimize
- Total downloadable game: preferably far below 250 MB
- Asset count: comfortably below 1500
- Startup requests: minimize

Do not treat the hard ceiling as the target.

---

## 15. STARTUP STRATEGY

The player should reach gameplay quickly.

Recommended startup order:

```text
HTML
 ↓
SDK initialization
 ↓
minimal engine boot
 ↓
critical assets
 ↓
first playable route
 ↓
GAMEPLAY START
 ↓
lazy-load noncritical resources
```

Do not: load everything → long animated loading screen → large menu → instructions → finally gameplay

CrazyGames uses Gameplay Start in assessing initial download behavior when the SDK is integrated.

---

## 16. CRAZYGAMES SDK ARCHITECTURE

**index.html** — Loads SDK v3 before the application.

**CrazyGames.ts** — Provides:

```text
initialize()
isAvailable()
gameplayStart()
gameplayStop()
loadingStart()
loadingStop()
requestRewardedAd()
saveData()
loadData()
happyTime()
```

Only expose operations actually needed by the game. All calls must tolerate SDK absence during localhost development.

---

## 17. GAMEPLAY START

For applicable CrazyGames integration: Gameplay Start must occur when the game genuinely enters a playable state.

Do NOT trigger it merely because HTML loaded, Three.js initialized, or a menu loaded.

Do NOT artificially delay or accelerate it to manipulate measurement. The actual playable state is the boundary.

---

## 18. GAMEPLAY STOP

Use Gameplay Stop for genuine gameplay interruptions where the platform lifecycle requires it.

Examples may include: leaving active gameplay, pause, platform-supported interruption, returning to non-gameplay state.

Exact usage must match current SDK documentation.

---

## 19. ADS

Ads are NOT part of the core gameplay architecture. The core game must work perfectly with ads disabled.

For Full Launch:

- only CrazyGames SDK ads may be used
- rewarded ads must provide a genuine reward
- ads must not interrupt core control unfairly
- ad buttons must not silently fail when ads are unavailable
- AdBlock must not break the game

For Basic Launch: advertisements are disabled.

---

## 20. PERSISTENCE

Use a layered persistence model:

```text
Progression
   ↓
Save abstraction
   ↓
Local storage fallback
   ↓
CrazyGames Data adapter when available
```

Local persistence must remain safe during development. Data must be versioned. Corrupted data should reset safely rather than crash the game.

---

## 21. MOBILE

Mobile support must be deliberate.

When mobile is supported: use touch controls, use responsive UI, maintain gameplay readability, avoid tiny interaction targets, support landscape where configured, adapt rendering quality.

Do not simply shrink desktop UI onto a phone.

CrazyGames documentation specifies mouse, keyboard, and touch expectations when mobile is supported.

---

## 22. CRAZYGAMES REJECTION DEFENSE

Because the project has reportedly been rejected approximately ten times previously, the build must assume that "technically playable" is insufficient.

We do NOT know the historical rejection reasons. Therefore every known official risk category becomes a release gate.

**Technical risk** — Defense: bundle audit, file-count audit, relative paths, fast initial gameplay, browser compatibility, memory management, mobile testing

**Broken gameplay risk** — Defense: real browser testing, physical input testing, complete run testing, repeated restart testing, failure testing, Shift interaction testing

**Weak onboarding risk** — Defense: gameplay-first onboarding, minimal instructions, visual controls, immediate interaction

**Visual-quality risk** — Defense: authored environment, consistent material language, strong lighting, coherent UI, no prototype-only player, no generic primitive final scene

**Control risk** — Defense: WASD, Arrow keys, mobile controls, responsive movement, consistent interaction

**Performance risk** — Defense: 4GB-class Chromium mindset, controlled draw calls, compressed/lazy assets, adaptive quality, disposal, runtime profiling

**Advertising risk** — Defense: SDK-only ads, optional rewarded flow, no external ad networks, no required ad progression

**Content risk** — Defense: English UI, PEGI-appropriate content, original game identity, no copied game-specific content

---

## 23. TESTING ARCHITECTURE

The agent must use three layers.

**Layer 1 — Automated code checks:** TypeScript, production build, static validation, dependency check

**Layer 2 — Runtime checks:** dev server, browser/preview, console, network/resource failures, WebGL availability

**Layer 3 — Human-visible behavior checks:** The agent must physically observe: rendered scene, player, controls, camera, Shift, route, UI, failure, restart, mobile controls when applicable

---

## 24. VISUAL VERIFICATION RULE

A screenshot proving "a canvas exists" is insufficient. The screenshot must show the intended feature.

- For movement: physically move the player.
- For camera: move the player and observe camera response.
- For Shift: activate the node and observe actual environment/state change.
- For UI: interact with the UI.
- For mobile: use a mobile viewport/touch input when supported.

---

## 25. ARENA CHECKPOINT STRATEGY

Because the official Arena documentation confirms GitHub commits/pushes but does not guarantee survival of uncommitted work after a crash:

Every approximately 15–20 minutes of substantial real work:

1. reach a coherent checkpoint
2. run at least a build/type-check
3. inspect git diff
4. commit
5. push

This does NOT mean stop the milestone. Checkpoint and continue.

Do NOT merge the PR during active development. The same Agent Mode session can continue working against its open PR. Once the PR is merged/closed, that session cannot push further work.

---

## 26. ARCHITECTURAL ANTI-BLOAT RULES

Do not create: one manager per tiny feature, one file per function, dozens of event classes, unnecessary service abstractions, generic utility libraries, redundant state managers.

Combine closely related responsibilities. Split only when a module has become genuinely difficult to understand.

---

## 27. FINAL ARCHITECTURE TEST

Before release, the agent must be able to answer:

```text
Where does movement live?           → Player/Input
Where does camera behavior live?    → Camera
Where does Shift live?              → ShiftSystem
Where does run lifecycle live?      → RunSystem/GameState
Where does progression live?        → Progression
Where does presentation live?       → SceneBuilder/VisualFX/UI/Audio
Where does CrazyGames integration?  → CrazyGames adapter
Where does resource cleanup live?   → owning system + Disposal infrastructure
```

If the answer becomes ambiguous, refactor before release.

---

## 28. TECHNICAL NORTH STAR

The finished source should feel like a small professional game codebase: not a prototype pile, not a giant monolith, not 100 tiny files, not an AI-generated code dump.

The architecture should let a future engineer understand the entire game quickly.