# GAME_DESIGN.md
# FORGE//SHIFT — GAME DESIGN DOCUMENT
Version: 1.0 — Production Source of Truth

---

## 1. GAME IDENTITY

**Title:** FORGE//SHIFT

**Genre:** Third-person futuristic traversal / action-puzzle / arcade run game

**Platform:** Browser / HTML5 WebGL

**Primary publisher target:** CrazyGames

**Core player promise:**

> Enter a dangerous futuristic facility, move through it at speed, manipulate the world with Shift Nodes, survive the route, finish the run, improve the score, unlock progression, and immediately want to try again.

FORGE//SHIFT is designed around a strong **"one more run"** loop rather than a long story campaign.

The game must be understandable very quickly.

The player should not need a long tutorial, lore dump, inventory explanation, or complicated control scheme before having fun.

The first playable experience should communicate:

**MOVE → SHIFT → ADAPT → COMPLETE → REPEAT**

---

## 2. CORE EXPERIENCE

The player controls a fast-moving futuristic character inside a highly designed technological environment.

The environment contains **Shift Nodes**.

A Shift Node is not merely a collectible or button.

It is the central game mechanic.

When activated, a Shift Node changes a localized part of reality between two compatible environmental states.

Examples of what a shift may change:

- a bridge exists / does not exist
- a platform is safe / dangerous
- a route is open / closed
- a barrier is physical / phase-permeable
- an obstacle moves / disappears
- a traversal surface changes configuration
- one route becomes faster while another becomes safer
- hazards activate or deactivate
- visual/environmental elements transform between two states

The exact implementation may vary by level, but every meaningful Shift must have a gameplay consequence.

A Shift that only changes a color or cosmetic effect is not sufficient.

---

## 3. CORE RUN LOOP

The fundamental loop is:

1. Spawn into a compact environment.
2. Understand the immediate objective.
3. Move through the route.
4. Encounter the next Shift Node.
5. Read the environment.
6. Activate the node.
7. React to the resulting environment state.
8. Navigate the new route.
9. Avoid hazards.
10. Reach the finish/extraction point.
11. Receive score and rewards.
12. See progression/unlock feedback.
13. Immediately start another run.

Failure should be fast.

Retry should be fast.

The player should spend most of the experience moving and making decisions rather than navigating menus.

---

## 4. MOVEMENT

### Desktop

Primary movement:

- W = forward
- S = backward
- A = left
- D = right

Alternative movement:

- ArrowUp = forward
- ArrowDown = backward
- ArrowLeft = left
- ArrowRight = right

WASD and Arrow keys must behave identically.

The game must not require players to discover a special keyboard layout.

The movement system should feel:

- responsive
- smooth
- predictable
- slightly accelerated
- slightly eased when stopping
- precise enough for route decisions
- fast enough to create urgency

Movement should never feel like a tank controller.

The player should feel directly connected to the input.

---

## 5. CAMERA

The camera is third-person and dynamically follows the player.

It should not behave like a permanently fixed chase camera.

Camera behavior changes according to context.

### Traversal

The camera sits far enough behind the player to communicate:

- route direction
- upcoming obstacles
- surrounding architecture
- possible Shift Nodes

### High-speed movement

The camera may widen slightly and increase look-ahead.

### Important interaction

When approaching a Shift Node, the camera can subtly tighten and orient attention toward the interaction.

### Major environment change

When a Shift transforms a meaningful route, the camera may briefly widen or reposition enough to communicate the changed geometry.

### Impact

Strong events may create subtle camera shake.

Camera shake must remain controlled.

It must never make precision movement difficult.

### Camera rules

The camera must:

- never clip into major geometry during normal play
- avoid abrupt snapping
- avoid excessive motion
- preserve gameplay readability
- communicate important information without becoming cinematic noise

---

## 6. SHIFT NODES

Shift Nodes are the signature visual and gameplay object of FORGE//SHIFT.

A node should be immediately recognizable.

Each node has:

- a physical location
- an interaction radius
- an inactive state
- an active state
- an activation sequence
- a cooldown/state condition
- a visual identity
- an audio identity
- a gameplay consequence

### Player interaction

The player approaches the node.

A lightweight interaction indicator becomes visible.

The node becomes active when the player triggers the interaction.

The interaction should require minimal friction.

The player should not need to open an inventory or navigate a menu.

### Activation sequence

A typical activation:

1. proximity recognition
2. visual charge
3. interaction confirmation
4. short transformation
5. environment state change
6. feedback burst
7. return to traversal

The transformation must feel physical and intentional.

---

## 7. ENVIRONMENT STATES

Each meaningful Shift changes some part of the world between two designed configurations.

Conceptually:

```text
STATE A
   ↓
SHIFT NODE
   ↓
TRANSITION
   ↓
STATE B
```

The two states must be gameplay-readable.

The player should be able to learn:

"When I Shift this area, THIS route changes."

The game should avoid arbitrary transformations that the player cannot understand.

---

## 8. LEVEL STRUCTURE

A level is a compact route rather than a large open-world map.

A typical run contains:

```text
START
  ↓
TRAVERSAL
  ↓
SHIFT NODE 1
  ↓
ROUTE CHANGE
  ↓
TRAVERSAL / HAZARD
  ↓
SHIFT NODE 2
  ↓
ROUTE CHANGE
  ↓
ESCALATING CHALLENGE
  ↓
FINAL SHIFT
  ↓
FINISH / EXTRACTION
```

Each route must have a clear beginning and destination.

The player should almost always understand approximately where they are trying to go.

---

## 9. RELEASE LEVEL PROGRESSION

The initial release should use a compact number of highly authored stages rather than dozens of shallow levels.

Target: 6 core stages, with replay variation.

Each stage introduces or combines mechanics.

**Stage 1 — Foundation**

Introduces:
- movement
- camera
- first Shift
- basic route change
- finish

Purpose: Teach the game without an excessive tutorial.

**Stage 2 — Split Route**

Introduces:
- multiple routes
- faster versus safer choices
- two or more Shift Nodes
- simple hazards

**Stage 3 — Timing**

Introduces:
- timed environmental changes
- moving hazards
- sequential Shift decisions

**Stage 4 — Verticality**

Introduces:
- elevation
- ramps
- vertical traversal
- more complex environmental state changes

**Stage 5 — Pressure**

Combines:
- higher movement speed
- tighter routing
- multiple hazards
- chained Shift decisions
- score optimization

**Stage 6 — Apex**

Combines the complete learned system:
- advanced route reading
- multiple Shift Nodes
- meaningful state changes
- hazards
- time pressure
- high scoring opportunities

This stage should feel like the player's learned mastery being tested rather than a completely new ruleset.

---

## 10. REPLAYABILITY

FORGE//SHIFT is not finished when a player reaches the end once.

Replay value comes from:

- score optimization
- faster runs
- cleaner traversal
- better route choices
- combo preservation
- collectibles
- progression
- visual unlocks
- challenge variation
- mastery of Shift timing

Variation should remain controlled.

The game must never randomly create an impossible route.

Randomization must operate inside authored constraints.

---

## 11. HAZARDS

Hazards exist to create pressure, not frustration.

Examples:

- moving barriers
- timed gates
- unstable platforms
- energy fields
- collapsing route sections
- rotating obstacles
- temporary danger zones

Hazards must be readable.

The player should generally understand:

- what is dangerous
- why it is dangerous
- how to avoid it

Deaths should feel like: "I understand what I did wrong." — not: "The game randomly killed me."

---

## 12. FAILURE

A run fails when a defined failure condition occurs.

Examples:

- falling out of the playable route
- being hit by a lethal hazard
- missing a critical timing sequence
- reaching a fail-state condition

Failure should trigger:

1. clear visual feedback
2. short feedback audio
3. run result
4. reward/score summary where appropriate
5. immediate retry option

The retry path must be fast.

Do not force the player through unnecessary menus after every failure.

---

## 13. WIN / COMPLETION

Completion occurs when the player reaches the stage's final extraction/finish point.

The completion sequence should show:

- successful completion feedback
- final time
- score
- combo
- rewards
- progression changes
- next-stage/unlock information

Then provide a strong immediate path to: RUN AGAIN

The game should preserve momentum instead of forcing excessive UI navigation.

---

## 14. SCORING

Score should reward skill rather than simply surviving.

Primary score inputs:

- completion
- traversal efficiency
- speed
- successful Shift interactions
- collectibles
- hazard avoidance
- maintained combo
- optional challenge objectives

Avoid arbitrary score inflation.

A player should understand why one run scored higher than another.

---

## 15. COMBO SYSTEM

A combo rewards consistent, clean performance.

Combo increases through meaningful actions such as:

- successful node activation
- efficient traversal
- clean hazard avoidance
- collecting optional objectives
- completing chained actions

Combo can fall or reset after:

- severe mistakes
- damage/failure
- excessive idle time where appropriate

The combo system should create the feeling: "I can do that run cleaner." It should not create frustration from tiny mistakes.

---

## 16. TIME

Each run has a visible timer.

The timer serves two roles:

1. immediate run pressure
2. long-term mastery metric

Players should be able to improve their best time.

Time should not make the game feel rushed during the introductory stage.

---

## 17. COLLECTIONS AND REWARDS

A run can provide collectible rewards.

Collections are primarily used for:

- progression
- visual unlocks
- long-term goals
- replay motivation

Potential unlock categories:

- player appearance variants
- visual energy/trail variants
- Shift Node visual variants
- environmental cosmetic variants
- other non-pay-to-win presentation rewards

Core movement and essential gameplay should not depend on grinding.

---

## 18. PROGRESSION

Progression should answer: "Why should I run again?"

Progression includes:

- personal bests
- stage completion
- score milestones
- collection milestones
- cosmetic unlocks
- challenge completion

Progress should persist locally.

When CrazyGames account/data functionality is available and appropriate, the platform data layer can be used in addition to local fallback storage.

---

## 19. ONBOARDING

The onboarding philosophy is: teach through play.

The player should see the world immediately.

The first interaction should teach movement.

The first Shift Node should teach the signature mechanic.

The onboarding should not explain every system.

Use:

- visual prompts
- minimal text
- controller/key icons
- contextual indicators

The onboarding should be skippable after the player understands the mechanic.

---

## 20. UI STRUCTURE

The UI is deliberately minimal.

During gameplay:

**Top-left:**
- current run score
- combo

**Top-center or subtle upper area:**
- timer

**Contextual center/lower area:**
- Shift interaction prompt when relevant

**Optional:**
- small objective indicator

Avoid permanent large menus covering the scene.

---

## 21. PAUSE

Pause should:

- clearly stop gameplay simulation
- pause relevant audio
- present minimal options
- allow resume
- allow restart

Do not use Escape as the only critical interaction because browser/platform behavior must be respected.

---

## 22. RESULTS

Results should be quickly readable.

Example:

```text
RUN COMPLETE
TIME        01:42.38
SCORE       18,420
BEST        20,110
COMBO       x6
REWARDS
+ 3 CORE
+ 1 UNLOCK
[ RUN AGAIN ]
[ CONTINUE ]
```

Visual hierarchy matters more than large amounts of text.

---

## 23. AUDIO DESIGN

Audio exists to reinforce player understanding.

Important sound categories:

- movement/traversal
- environmental ambience
- node proximity
- node charging
- node activation
- Shift transformation
- hazard warning
- failure
- completion
- reward/unlock

Audio should be:

- polished
- controlled
- readable
- consistent

No sound should be so loud that it becomes uncomfortable.

---

## 24. VISUAL GAMEPLAY FEEDBACK

Every important action needs feedback.

**Movement:**
- responsive animation
- subtle sound
- readable motion

**Shift:**
- node charge
- energy response
- environmental transformation
- audio transition
- optional controlled camera response

**Success:**
- visual confirmation
- sound
- score/reward feedback

**Failure:**
- immediate readable state change

---

## 25. GAME FEEL

The game should have:

- immediate input response
- short interaction latency
- readable acceleration
- satisfying node activation
- satisfying environment transformation
- strong sense of movement
- strong sense of space
- quick restart

Avoid:

- floaty controls
- menus between every action
- slow transitions
- unnecessary confirmation dialogs
- hidden objectives
- excessive tutorials

---

## 26. CORE DESIGN PRINCIPLES

Every feature must answer at least one of:

1. Does it improve movement?
2. Does it strengthen the Shift mechanic?
3. Does it improve route decisions?
4. Does it improve replayability?
5. Does it improve mastery?
6. Does it improve presentation?
7. Does it improve retention without harming the experience?

If a system answers none of these, it should probably not exist.

---

## 27. FINAL EXPERIENCE TEST

A new player should be able to:

- see the game
- understand movement
- move
- find a Shift Node
- activate it
- understand that the environment changed
- continue through the route
- complete or fail the run
- immediately retry
- understand how to improve

without reading a long manual.

The desired emotional sequence is:

**CURIOUS → MOVING → DISCOVERING → ADAPTING → MASTERING → "ONE MORE RUN"**