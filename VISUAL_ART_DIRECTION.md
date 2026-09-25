# VISUAL_ART_DIRECTION.md
# FORGE//SHIFT — VISUAL & UI ART DIRECTION
Version: 1.0 — Production Source of Truth

---

## 1. OVERALL VISUAL TARGET

FORGE//SHIFT should look like a premium futuristic game, not a generic AI-generated WebGL demo.

The reference direction established during development is:

- futuristic but believable
- highly detailed
- cinematic
- premium
- technologically advanced
- dark but readable
- realistic/stylized-realistic rather than cartoonish
- strong architectural design
- controlled lighting
- strong depth
- deliberate material response
- restrained emissive accents
- clean professional presentation

The scene should create the immediate impression: "This is a real game world with an intentional art direction."

It should NOT look like:

- default Three.js geometry
- random sci-fi assets
- generic cyberpunk wallpaper
- excessive rainbow neon
- glowing cubes everywhere
- flat-color placeholder geometry
- an unfinished technical prototype

---

## 2. COLOR LANGUAGE

The dominant palette is dark, cool, industrial, and controlled.

### Base environment

- Near-black: `#070A10`
- Deep charcoal: `#10161D`
- Graphite: `#171F27`
- Cool structural steel: `#29343E`
- Dark metal: `#343F49`

### Light materials

- Soft cold white: `#E7EDF3`
- Bright UI white: `#F5F7FA`
- Muted silver: `#AAB5C0`

### Signature energy color

- Primary energy cyan: `#00D7FF`
- Deep cyan: `#006D89`

The cyan is the visual signature of the Shift system.

Use it deliberately. Do NOT cover the entire environment in cyan.

### Warning/accent color

- Warm amber: `#FFB14A`

Use only for:

- danger
- timing pressure
- warnings
- critical route communication

Amber should be subordinate to the cyan identity.

---

## 3. COLOR RATIO

A typical frame should visually feel approximately:

- 70% dark environmental values
- 20% steel/neutral structural values
- 8% white/light values
- 2% energetic accent

The exact numerical ratio can vary. The important principle is: **dark world + controlled light + selective energy**

---

## 4. ENVIRONMENT DESIGN

The environment is a futuristic industrial/technological facility. It should feel physically built.

Use:

- structural beams
- platforms
- walkways
- modular walls
- machinery
- energy conduits
- vents
- rails
- panels
- towers
- barriers
- maintenance details
- distant silhouettes
- architectural framing

Avoid:

- random object scattering
- impossible scale
- floating objects without purpose
- excessive symmetry
- identical repeated walls
- giant empty floors
- visual noise everywhere

---

## 5. ARCHITECTURAL SILHOUETTES

Every major area should have a clear visual composition.

Use:

- large foreground framing
- mid-ground traversal structures
- distant architectural silhouettes
- vertical elements
- horizontal route lines
- strong perspective corridors

The player should be able to understand the world spatially from the camera. The architecture should help communicate where the player can and cannot go.

---

## 6. MATERIAL LANGUAGE

Materials must communicate what things are.

### Structural metal
- dark
- semi-matte
- moderate roughness
- controlled reflections
- subtle edge highlights

### Polished metal (use sparingly)
- stronger reflection
- clean highlights
- darker base
- used for premium focal structures

### Concrete / composite
- matte
- subtle micro variation
- cool grey
- slightly rough

### Glass (use sparingly)
- transmit/refraction or controlled transparency
- create depth
- never obscure gameplay

### Energy surfaces
- dark base
- emissive cyan core
- soft controlled bloom-like response where available
- edge definition

Energy surfaces should feel like technology, not magical decoration.

---

## 7. MATERIAL CONSISTENCY

Do not mix photorealistic surfaces, cartoon textures, low-resolution textures, and flat primitive materials in the same visual area.

The art direction must remain internally consistent.

---

## 8. SHIFT NODE VISUAL IDENTITY

Shift Nodes are one of the most important objects in the game. They must be readable immediately.

A node should have:

- strong central silhouette
- dark physical housing
- cyan energy core
- subtle energy rings/lines
- animation indicating state
- proximity response
- activation response

**Inactive state:** low energy, restrained light, visually present but not dominant

**Player approaching:** energy gradually intensifies, subtle pulse, interaction readability increases

**Activating:** charge sequence, internal energy movement, controlled expansion, strong but short visual event

**Completed:** stable active state, clear visual indication of its current environment state

---

## 9. SHIFT TRANSFORMATION VISUALS

When a Shift changes the environment, the transformation must feel like an actual state transition.

Preferred techniques:

- synchronized material transitions
- geometry movement where appropriate
- emissive energy propagation
- opacity transitions only where visually appropriate
- controlled particle bursts
- environmental light response
- subtle camera response

Avoid:

- giant full-screen flashes
- random explosion effects
- excessive particles
- permanent glow everywhere

The player must still be able to see the route during the transformation.

---

## 10. LIGHTING

Lighting should feel cinematic.

Primary hierarchy:

1. environment readability
2. player readability
3. Shift Node readability
4. route readability
5. atmospheric depth
6. cinematic accents

Use: key light, cool fill, selective rim lighting, practical environmental lights, restrained emissive illumination.

Do not use huge numbers of realtime lights.

---

## 11. SHADOWS

Shadows should provide grounding, scale, direction, and spatial separation.

Avoid shadow-map excess. Use high-quality shadows only for important lights and important objects.

---

## 12. ATMOSPHERE

Use atmospheric depth carefully.

The goal is: foreground → readable gameplay space → distant structure → subtle atmospheric fade

Fog should never make the player lose route visibility.

The environment should feel deep without becoming visually washed out.

---

## 13. EMISSIVE DESIGN

Emissive lighting is a special effect. It is not a base material for everything.

**Good:** Shift Nodes, energy routes, warning strips, selected technological elements, critical interactables

**Bad:** every wall, every floor, every prop, every object glowing cyan

---

## 14. PLAYER VISUAL

The initial cyan capsule is a development placeholder. It MUST NOT be treated as the final player art direction.

The final player representation should be:

- immediately readable
- distinct from environment materials
- visually integrated
- capable of subtle movement animation
- recognizable at a distance
- visually premium

The exact silhouette may evolve during implementation, but it must not resemble an untouched Three.js primitive.

---

## 15. CAMERA COMPOSITION

Default gameplay camera: third-person, slightly elevated, slightly offset, enough player visibility to understand direction, enough environment visibility to plan.

The player should occupy a useful portion of the frame without dominating it.

**During movement:** maintain forward readability, allow route anticipation, avoid excessive camera sway

**During important Shift events:** subtly reposition attention, widen view if environmental transformation needs context

---

## 16. UI ART DIRECTION

UI is minimal, premium, and functional. The UI should visually belong to the same world.

Design language:

- dark translucent panels
- thin separators
- high-contrast white text
- restrained cyan highlights
- subtle blur/transparency if affordable
- clean geometry
- minimal decoration

Avoid: giant arcade buttons, rainbow UI, game-show styling, excessive borders, excessive glow, cluttered dashboards

---

## 17. UI COLOR USE

- Primary text: soft white
- Secondary text: cool silver
- Active: cyan
- Danger: amber
- Disabled: dark grey/cool muted grey

Cyan should signal: interaction, energy, active state, progress, player-relevant technology

Amber should signal: warning, danger, timing

---

## 18. UI TYPOGRAPHY

Typography should feel: modern, geometric, technical, premium, highly legible

Prefer a clean sans-serif with strong numerals, clear uppercase labels, good small-size readability, moderate letter spacing.

Do not use decorative sci-fi fonts, excessive condensed typography, or futuristic fonts that hurt readability.

Large gameplay numbers should have strong visual weight.

---

## 19. HUD

Keep the HUD visually quiet.

- Top-left: score / combo
- Top-center: timer
- Contextual: Shift interaction indicator

The environment is the primary visual. The HUD should never cover the play route.

---

## 20. BUTTONS

Buttons should communicate action immediately.

Preferred: compact rounded-rectangular geometry, strong contrast, clear label, subtle hover/press state, restrained cyan active state

Examples: `RUN AGAIN`, `CONTINUE`, `RESUME`, `RESTART`

Avoid fake urgency. Ads must never be visually disguised as ordinary gameplay buttons.

---

## 21. ONBOARDING UI

Onboarding should use visual movement indicators, key icons, minimal copy, animated highlighting.

Example:

```text
W A S D
MOVE
```

Then:

```text
W / ↑
A / ←
S / ↓
D / →
```

The game must support both WASD and arrows. Do not explain every future feature during onboarding.

---

## 22. MOBILE UI

Touch controls should be large enough, transparent enough to preserve visibility, visually integrated, separated from critical route visibility.

The controls should appear only when appropriate. Do not force desktop controls into a mobile layout.

---

## 23. VISUAL MOTION

Motion should have hierarchy.

**Micro motion:** lights, small energy pulses, subtle machinery movement

**Gameplay motion:** player, moving platforms, hazards

**Major motion:** Shift transformations, route changes

Not everything should move. Static areas create contrast and make meaningful movement more noticeable.

---

## 24. PARTICLE EFFECTS

Particles should be sparse and purposeful.

Use for: Shift activation, energy traces, impact, reward, critical environmental response

Avoid: permanent particle storms, confetti everywhere, particle spam around every prop

---

## 25. DEPTH OF FIELD / POST-PROCESSING

Post-processing is optional. Only use effects that provide measurable visual benefit.

Preferred restrained effects: subtle bloom-like response, atmospheric treatment, mild color response, vignette only if genuinely beneficial

Never allow post-processing to obscure gameplay, drastically increase GPU cost, or turn the world into a blurry neon scene.

---

## 26. FIRST-SCREEN STANDARD

The first gameplay screenshot should immediately communicate: futuristic environment, player, route, Shift technology, depth, lighting, premium presentation.

A screenshot showing only a grey plane, a cyan capsule, and a few boxes is considered prototype quality, not final quality.

---

## 27. VISUAL QA QUESTIONS

After every major visual milestone ask:

1. Does this look authored?
2. Does the architecture have believable scale?
3. Is the player readable?
4. Is the route readable?
5. Is the Shift mechanic visually obvious?
6. Is the lighting helping rather than hiding?
7. Are materials coherent?
8. Is the palette controlled?
9. Does anything look like an untouched placeholder?
10. Does the screenshot look like a real game rather than an engineering test?

If the answer to several is no, continue polishing.

---

## 28. FINAL VISUAL NORTH STAR

The target feeling is:

**BLACK / GRAPHITE WORLD** with **STEEL ARCHITECTURE** and **SELECTIVE WHITE LIGHT**, punctuated by **ELECTRIC CYAN SHIFT ENERGY** with occasional **AMBER WARNING STATES**

The scene should feel expensive because of: composition, material response, lighting, scale, depth, interaction, restraint — not because every object is glowing.