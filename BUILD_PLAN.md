# BUILD_PLAN.md
# FORGE//SHIFT — ARENA BUILD PLAN
Version: 1.0

---

## 1. PURPOSE

This plan replaces the previous 60+ micro-task approach.

The project is now developed through a small number of large, coherent production milestones.

The purpose is to exploit Arena Agent Mode's ability to: inspect a repository, plan multi-step work, modify many related files, run commands, test builds, preview the application, iterate on problems, commit, push, and maintain context through long-running sessions.

Arena officially describes Agent Mode as intended for complex, multi-step workflows and states that long-running sessions can span hundreds of turns. However, Arena does not publish a fixed maximum session duration, so milestone sizing below is an engineering target rather than a platform guarantee.

Official source: Arena Help Center — help.arena.ai/articles/5432423882-how-to-use-agent-mode

---

## 2. EXECUTION UNIT

The unit of work is: **ONE COHESIVE PRODUCTION MILESTONE**

Not: one function, one file, one tiny task, one commit per tiny change.

Inside a milestone the agent may internally use as many implementation steps as required. The agent should not stop for user approval between those internal steps.

---

## 3. CHECKPOINT RULE

Every approximately 15–20 minutes of meaningful work:

```text
reach stable checkpoint
→ build/type-check
→ inspect diff
→ commit
→ push
→ continue
```

The checkpoint is a recovery mechanism, not a stopping point.

Because Arena's public documentation does not guarantee that uncommitted work survives a crash, important progress must be pushed to GitHub.

Arena also documents that a GitHub Agent Mode session can create one PR and that, after that PR is merged/closed, the session can no longer push. Therefore the PR must remain open until the active development session is intentionally finished.

---

## 4. MILESTONE 0 — FOUNDATION REALITY + RECOVERY

**Objective:** Turn the current prototype into a trustworthy technical baseline.

**Work:**
- inspect existing implementation
- preserve useful work
- remove obsolete prototype wiring where necessary
- establish clean architecture boundaries
- verify actual WebGL rendering
- verify player visibility
- verify WASD
- verify ArrowUp / ArrowDown / ArrowLeft / ArrowRight
- verify camera follow
- verify player movement feel
- verify browser/preview path
- repair dev-server/preview problems
- eliminate runtime errors
- remove false verification assumptions
- establish clean Git checkpoint

**Critical known requirement:**

```text
W / ArrowUp      Forward
S / ArrowDown    Backward
A / ArrowLeft    Left
D / ArrowRight   Right
```

**Done means:** A real player can be moved around the actual running scene using both keyboard layouts and the camera follows correctly.

**Non-coder visual checklist:**

Open the game. You should be able to:
1. see the player
2. press W and see forward movement
3. press S and see backward movement
4. press A and see left movement
5. press D and see right movement
6. press each arrow key and see the corresponding movement
7. move around while the camera follows
8. see no visible runtime failure
9. see the actual scene rather than a blank canvas

---

## 5. MILESTONE 1 — COMPLETE PLAYABLE RUN

**Objective:** Create the complete gameplay spine.

**Work:**
- GameState machine
- run start
- gameplay state
- timer
- finish state
- failure state
- rapid respawn
- restart
- core route
- first finish point
- gameplay lifecycle hooks
- clean transition between runs

**Done means:** The game can be played from start to finish or failure, then immediately restarted.

**Non-coder visual checklist:** start a run → move through the environment → see a timer → reach a finish → receive completion feedback → intentionally fail → see failure feedback → press retry → immediately return to another run.

---

## 6. MILESTONE 2 — SHIFT SYSTEM

**Objective:** Turn Shift from a visual object into the central gameplay mechanic.

**Work:**
- Shift Node interaction
- proximity detection
- interaction prompt
- activation
- visual charge
- activation feedback
- cooldown/state
- environment state A/B
- actual traversal consequence
- multiple nodes
- route changes
- first fully designed Shift route

**Done means:** The player must use Shift to solve/progress through the environment.

**Non-coder visual checklist:** approach a node → see that it is interactable → activate it → see a meaningful transformation → see the route/environment change → use the changed environment → reach the next section because of the Shift.

A node that only changes color does NOT pass.

---

## 7. MILESTONE 3 — CHALLENGE + ONE-MORE-RUN LOOP

**Objective:** Make the game enjoyable beyond the first completion.

**Work:**
- hazards
- controlled route choices
- time pressure
- scoring
- combo
- collectibles
- reward events
- challenge variation
- improved retry flow

**Done means:** A skilled player can improve a run through better execution.

**Non-coder visual checklist:** play twice — on the second run you should understand the route better, move faster, make cleaner Shift decisions, improve the score/time, and see a meaningful reward for better execution.

---

## 8. MILESTONE 4 — PROGRESSION + PERSISTENCE

**Objective:** Create a meaningful long-term reason to return.

**Work:**
- progression data
- unlock state
- collection state
- local persistence
- safe data versioning
- reward screen
- personal bests
- cosmetic/visual unlocks

When CrazyGames Data becomes available, integrate it through the platform adapter without breaking local fallback.

**Done means:** Progress survives reload.

**Non-coder visual checklist:** finish a run → receive a reward → unlock something or improve progression → refresh/reload → return to the game → confirm the progress is still present.

---

## 9. MILESTONE 5 — PREMIUM VISUAL TRANSFORMATION

**Objective:** Move from a functional prototype to the established premium visual target.

**Work:**
- authored architecture
- environment composition
- material library
- realistic scale cues
- cinematic lighting
- atmospheric depth
- player visual upgrade
- Shift Node visual identity
- Shift transformation effects
- camera composition
- controlled camera shake
- environmental detail
- performance-safe visual polish

**Done means:** The game no longer looks like a Three.js prototype.

**Non-coder visual checklist:** Open the game at normal desktop size. Look for believable futuristic architecture, strong depth, dark industrial world, selective cyan energy, coherent materials, readable player, cinematic lighting, clearly designed Shift Nodes, polished visual transitions.

A frame dominated by plain boxes and the old cyan capsule means this milestone is not complete.

---

## 10. MILESTONE 6 — UI + AUDIO + ONBOARDING

**Objective:** Make the entire game feel professionally packaged.

**Work:**
- onboarding
- HUD
- start experience
- results screen
- pause
- retry
- mobile controls
- responsive UI
- audio manager
- movement SFX
- Shift SFX
- ambience
- completion/failure feedback

**Done means:** A new player can understand and play the game without reading external instructions.

**Non-coder visual checklist:** clear movement guidance, clean score/timer HUD, readable Shift prompt, polished results screen, obvious retry action, appropriate sound feedback, functional touch controls on mobile.

---

## 11. MILESTONE 7 — CRAZYGAMES INTEGRATION

**Objective:** Make the game structurally ready for CrazyGames.

**Work:**
- SDK v3 script
- awaited SDK initialization
- Game module integration
- Gameplay Start
- Gameplay Stop
- loading lifecycle where appropriate
- Data adapter
- rewarded-ad adapter
- graceful local fallback
- no external ads
- AdBlock-safe behavior
- platform-safe user experience

**Done means:** The CrazyGames integration does not damage local gameplay and satisfies the relevant launch requirements.

**Non-coder visual checklist:** Run locally. The game still works when CrazyGames services are unavailable. The player can enter gameplay normally. No broken ad button appears. No giant platform-specific UI blocks gameplay.

---

## 12. MILESTONE 8 — PERFORMANCE + MOBILE + BUNDLE

**Objective:** Make the game lightweight enough for browser publishing.

**Work:**
- production bundle inspection
- asset compression
- lazy loading
- texture audit
- geometry audit
- draw-call audit
- instancing where useful
- renderer quality tiers
- DPR limits
- resource disposal
- mobile rendering quality
- startup optimization
- dependency audit

**Done means:** The game remains visually strong while respecting CrazyGames constraints.

**Hard checks:**

```text
TOTAL FILES       <= 250 MB
FILE COUNT        <= 1500
INITIAL DOWNLOAD  <= 50 MB
MOBILE TARGET     <= 20 MB
```

Internal targets should remain substantially below hard limits.

**Non-coder checklist:** starts quickly, doesn't freeze, no giant loading delays, remains responsive, usable on a lower-end device, preserves the established art direction.

---

## 13. MILESTONE 9 — FINAL QA + REJECTION DEFENSE

**Objective:** Treat the game like a publisher submission candidate.

Because the project has been rejected approximately ten times previously, this milestone must assume that technical functionality alone is insufficient.

Historical rejection causes are NOT known from verified evidence. Therefore test every official risk category.

**QA matrix:**

- **Technical:** production build, file size, file count, relative paths, startup, asset loading, browser errors
- **Gameplay:** movement, Arrow keys, camera, Shift, hazards, completion, failure, restart, scoring, progression
- **UX:** onboarding, controls, clear goals, readable UI, fast gameplay entry, responsive controls
- **Visual:** environment quality, player quality, lighting, atmosphere, materials, VFX, visual consistency
- **Audio:** movement, Shift, hazards, completion, failure, ambience, balanced loudness
- **Mobile:** touch, responsive UI, readability, landscape behavior, performance
- **Platform:** CrazyGames initialization, Gameplay Start, Gameplay Stop, loading lifecycle, Data, rewarded ads, AdBlock behavior

---

## 14. FINAL RELEASE GATE

The game is not considered complete because all code exists.

It is complete only when the integrated game can be:

```text
LOADED → PLAYED → SHIFTED → COMPLETED/FAILED → SCORED → REWARDED → RETRIED → RELOADED
```

without major defects, and the final visual impression must meet the project's premium direction.

---

## 15. ARENA SESSION STRATEGY

Each Agent Mode session should normally target ONE substantial milestone.

Within the milestone:

```text
inspect → implement → integrate → build → checkpoint → continue
→ runtime verify → polish → final milestone QA → checkpoint → push
```

Do not spend the session creating elaborate management documents. Do not ask the user to choose the next small task. Do not generate dozens of tiny commits.

Use commits primarily for: recovery, milestone boundaries, substantial stable states.

---

## 16. SESSION RECOVERY

If Arena reports a session/token/context/tool failure:

1. do not assume uncommitted changes survived
2. use the latest pushed commit as the recovery baseline
3. open a new Agent Mode session if required
4. reconnect/read the repository
5. read these documents again
6. inspect Git history
7. continue from the last pushed checkpoint

Arena officially states that Agent Mode has conversation compaction, but does not provide a public guarantee that arbitrary uncommitted code survives a crashed session.

Therefore: **PUSHED COMMITS ARE THE RECOVERY CONTRACT.**

---

## 17. FINAL NON-CODER ACCEPTANCE STANDARD

The owner of this project is not a programmer. Therefore acceptance must be observable without reading source code.

A milestone passes only when the owner could reasonably understand that it works simply by: opening the game, looking at it, pressing the controls, clicking/interacting, completing a run, restarting, observing the result.

Source code should support the judgment, not replace it.

---

## 18. FINAL PRODUCT STANDARD

FORGE//SHIFT must finish as: a premium, fast-loading, responsive, replayable futuristic browser game with a distinctive Shift mechanic and a polished presentation suitable for serious CrazyGames submission.

The product should feel: **FAST, CLEAR, CINEMATIC, TECHNICAL, PREMIUM, REPLAYABLE, AUTHORED**

and never: **FRAGILE, GENERIC, BLOATED, UNVERIFIED, PROTOTYPE-LOOKING**