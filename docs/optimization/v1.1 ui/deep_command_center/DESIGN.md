# Design System Strategy: Deep Command Center

## 1. Overview & Creative North Star
### Creative North Star: "The Obsidian Observatory"
This design system is not a collection of boxes; it is a high-fidelity instrument for deep-space data navigation. We reject the "SaaS-standard" look of heavy borders and flat grey surfaces. Instead, we embrace **The Obsidian Observatory**—an aesthetic defined by infinite depth, luminous accents, and high-information density that feels light rather than cluttered.

To break the "template" look, we utilize **Intentional Asymmetry**. Dashboards should not be perfectly mirrored; use the 8px grid to create offset content blocks that guide the eye through a hierarchy of importance. Overlapping glass surfaces and "glowing" data points create a sense of a living, breathing command center where AI and collaboration aren't just features—they are environmental lighting.

---

## 2. Color & Tonal Architecture
The palette is rooted in the "Deep Command" ethos: dark, vast, and punctuated by high-energy pulses.

### Surface Hierarchy & Nesting
We do not use lines to separate ideas. We use **Tonal Layering**.
*   **Base Layer (`surface_dim` / `#10131c`):** The foundation of the viewport.
*   **Section Layer (`surface_container_low` / `#181c24`):** Large structural groupings.
*   **Component Layer (`surface_container` / `#1c2028`):** Individual cards or modules.
*   **Active/Elevated Layer (`surface_container_high` / `#262a33`):** Modals or focused states.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background shifts. If you need to separate two modules, shift the inner container to a higher tier (e.g., a `surface_container_highest` card sitting on a `surface_container_low` section).

### The "Glass & Gradient" Rule
For headers and floating navigation, use **Glassmorphism**.
*   **Tokens:** `surface_variant` at 60% opacity with a `backdrop-filter: blur(12px)`.
*   **Signature Textures:** Main CTAs should never be a flat hex. Use a subtle linear gradient from `primary` (`#c0c1ff`) to `primary_container` (`#8083ff`) at a 135-degree angle to provide "visual soul."

---

## 3. Typography: Editorial Precision
The system pairs the humanist geometry of **Plus Jakarta Sans** with the technical rigor of **JetBrains Mono**.

*   **Display & Headline (Plus Jakarta Sans):** Used for high-level summaries and navigation. Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) to create an authoritative, editorial feel.
*   **Data & Code (JetBrains Mono):** All technical metrics, timestamps, and terminal outputs must use JetBrains Mono. This signals to the user that they are looking at "raw truth."
*   **Body & Labels:** Use `body-md` (0.875rem) for the majority of UI text to maintain high information density without sacrificing legibility.

---

## 4. Elevation & Depth
Depth is a functional tool, not a decoration.

*   **The Layering Principle:** Stack surfaces to create "natural lift." Place a `surface_container_lowest` item inside a `surface_container_low` parent to create a "recessed" well for data entry.
*   **Ambient Shadows:** For floating elements (modals/dropdowns), use a shadow with a 40px blur and 6% opacity. The shadow color should be a tinted `on_surface` (`#e0e2ee`) rather than black, mimicking the soft glow of a screen in a dark room.
*   **The Ghost Border:** If a boundary is strictly required for accessibility, use `outline_variant` at **15% opacity**. Never use 100% opaque borders.
*   **Accent Glows:** Elements associated with AI (`secondary` / `#4cd7f6`) or Collaboration (`tertiary` / `#d0bcff`) should emit a subtle "outer glow" (4px-8px spread) to signify their active, intelligent status.

---

## 5. Components & Primitive Logic

### Buttons & Inputs
*   **Primary Action:** Gradient-filled (`primary` to `primary_container`) with a `xl` (1.5rem) radius for a "pill" look that stands out against the angular grid.
*   **Input Fields:** Use `surface_container_lowest` as the fill. No border. On focus, the bottom edge gains a 2px `secondary` (Cyan) glow.
*   **Checkboxes & Radios:** Avoid the standard "box." Use a custom "Micro-Orb" approach—small, high-contrast circles that pulse when selected.

### Cards & Lists
*   **No Dividers:** Forbid the use of horizontal rules (`<hr>`). Use **Spacing Scale 4** (0.9rem) or a subtle shift from `surface_container` to `surface_container_low` to denote a new list item.
*   **Glass headers:** Persistent list headers should use the Glassmorphism rule to maintain context of the scroll position beneath.

### Command Chips
*   **AI Suggestion Chips:** Use `secondary_container` with a `secondary` text color. Apply a 1px `secondary` glow to indicate the "intelligence" of the chip.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. A 2/3 and 1/3 split is more "editorial" than a 50/50 split.
*   **Do** lean into high information density. Professionals prefer seeing more data at once if the hierarchy is clear.
*   **Do** use JetBrains Mono for any number-heavy table to ensure tabular lining and readability.

### Don't:
*   **Don't** use pure black (#000000) or pure white (#FFFFFF). Use our `surface` and `on_surface` tokens to maintain the "Deep Command" atmosphere.
*   **Don't** use standard "drop shadows." If it doesn't look like an ambient glow, it's too heavy.
*   **Don't** use 1px borders. If you feel the need to "box" something, your background tonal contrast isn't strong enough. Increase the step between `surface_container` levels instead.