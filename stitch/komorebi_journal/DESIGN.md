# Design System: The Tactile Digital Sanctuary

## 1. Overview & Creative North Star: "The Digital Curator"
This design system is a departure from the cold, hyper-efficient "productivity" tools of the enterprise world. Instead, it leans into the **Zakka** philosophy—finding beauty in the mundane and creating a space that feels curated, personal, and physically present.

**Creative North Star: The Digital Curator.**
The UI should feel less like a software interface and more like a high-end, bespoke paper planner or a quiet afternoon in a sun-drenched atelier. We achieve this through **intentional asymmetry**, avoiding the rigid 12-column grid in favor of "editorial" layouts. Elements should overlap slightly, white space should be treated as a functional material rather than "empty" space, and typography should dominate the visual hierarchy.

## 2. Color & Surface Philosophy
The palette is rooted in nature and tactile materials: washi paper, almond milk, moss, and morning mist. 

### The "No-Line" Rule
To maintain the "healing" aesthetic, **1px solid borders are strictly prohibited** for sectioning. We define boundaries through tonal shifts. A `surface-container-low` block sitting on a `surface` background provides all the definition a user needs without the visual "noise" of a stroke.

### Surface Hierarchy & Nesting
Treat the interface as a physical desk. Layers are created by stacking different surface tiers:
- **Base Layer:** `surface` (#fbf9f5) or `surface-container-lowest` (#ffffff).
- **Secondary Areas:** `surface-container` (#eeeee8) for sidebars or navigation.
- **Interactive Cards:** `surface-container-low` (#f5f4ef) to create a subtle "lift."
- **Nesting:** When placing a card inside a sidebar, use the contrast between `surface-container` and `surface-container-low` to define the object.

### The "Glass & Texture" Rule
To avoid a flat "Bootstrap" feel, use **Glassmorphism** for floating elements (like modals or navigation bars).
- **Token:** `surface` at 80% opacity with a `20px` backdrop-blur.
- **CTAs:** Use subtle gradients for primary actions, transitioning from `primary` (#536441) to `primary-container` (#d6e9bd) at a 135-degree angle. This provides a "glow" that feels organic rather than digital.

## 3. Typography: The Editorial Journal
We use a "High-Low" typographic pairing to create a sophisticated, journal-like rhythm.

- **The Serif (Noto Serif):** Used for `display` and `headline` tiers. It conveys the "healing" and "planner" aesthetic. Use `display-lg` for moments of reflection and `headline-md` for section titles.
- **The Sans (Plus Jakarta Sans):** Used for `title`, `body`, and `labels`. It provides modern clarity and ensures the interface remains functional.
- **Hierarchy Tip:** Use `letter-spacing: -0.02em` on serifs to make them feel tighter and more premium. For labels, use `label-md` in all caps with `+0.05em` tracking to create a "tab" or "index" feel.

## 4. Elevation & Depth
In this system, depth is felt, not seen.

- **Tonal Layering:** 90% of your hierarchy should be achieved by moving between `surface-container-low` and `surface-bright`.
- **Ambient Shadows:** When a component must float (e.g., a "New Entry" button), use a shadow that mimics natural light:
  - **Values:** `0px 12px 32px`
  - **Color:** `on-surface` (#30332e) at **4% opacity**.
- **The Ghost Border:** If accessibility requires a container outline, use `outline-variant` (#b1b3ab) at **15% opacity**. Never use a 100% opaque stroke.

## 5. Components

### Cards & Containers
- **Styling:** No borders. `border-radius: xl` (3rem) for hero containers, `lg` (2rem) for standard cards.
- **Spacing:** Use `spacing-8` (2.75rem) for internal padding to give content room to "breathe."

### Buttons
- **Primary:** Rounded-full. Gradient of `primary` to `primary-dim`. High contrast text using `on_primary`.
- **Secondary:** `secondary-container` background. No border. Text in `on_secondary_container`.
- **Tertiary:** Text-only using `primary` color. Interaction state is a subtle `primary-container` background at 20% opacity.

### Inputs & Text Areas
- **Style:** Use `surface-container-highest` for the background. 
- **Focus State:** Instead of a heavy border, use a `2px` underline of `primary` or a soft "glow" using the `primary-fixed-dim` token.

### Digital Garden Specials
- **The "Plant" Iconography:** Use organic, hand-drawn style icons for status indicators (e.g., a sprouting seed for a "draft," a full leaf for "published").
- **The "Washi" Chip:** Selection chips should use the `tertiary-container` (#f3e4c8) to mimic the look of masking tape or vintage paper tabs.

## 6. Do’s and Don’ts

### Do
- **Do** use intentional asymmetry. Place a heading slightly off-center or let an image bleed off the edge of a container.
- **Do** use `spacing-20` (7rem) between major sections. If it feels like "too much" white space, it’s probably just right.
- **Do** use "soft charcoal" (`on-background`: #30332e) for all body text. Pure black is too aggressive for this palette.

### Don't
- **Don't** use dividers (`<hr>`). Separate content using the `spacing` scale or a background color shift.
- **Don't** use "Standard" icons (Material/FontAwesome) without rounding the corners or reducing the weight. They will feel too "techy."
- **Don't** use traditional "Admin" grids. Avoid dense tables; use a series of cards or a list with generous `body-lg` typography.

### Director's Closing Note
This design system is about **quietude**. Every time you add a component, ask: "Does this make the space feel more crowded or more intentional?" If an element doesn't serve the "healing" vibe, simplify it until only the essence remains.