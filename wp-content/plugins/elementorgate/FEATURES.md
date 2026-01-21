# ElementorGate

Power tools for Elementor Editor.

## Plugin Settings

**Location:** WordPress Admin → ElementorGate

- Enable/disable individual features
- Simple toggle switches for each feature

---

## Features

### Global Fonts Preview

Preview global typography settings before selecting them.

**Where:** Elementor Editor → Any element → Style tab → Typography control → Hover over the globe icon

**Benefits:**
- See font size, weight, and family without clicking through each option
- Responsive values (Desktop/Tablet/Mobile) visible at a glance
- Faster workflow when choosing the right typography preset

---

### Template Previews

See template thumbnails in the template selection modal.

**Where:** Elementor Editor → Add Template → My Templates

**Setup:** Add a Featured Image to your template via WordPress Admin → Templates → Edit Template → Featured Image

---

### Editor Toolbar (Cmd+K)

Quick command palette for common actions.

**Shortcut:** `Cmd+K` (Mac) / `Ctrl+K` (Windows)

**Available commands:**

**Actions**
- Wrap in Container — Wrap selected element(s) in a new container
- Unwrap Container — Remove container and keep inner elements
- Duplicate / Delete / Copy / Paste — Standard element operations

**View**
- Toggle Navigator — Show/hide the element tree panel
- Desktop/Tablet/Mobile View — Switch responsive preview mode
- Preview Changes — Open frontend preview

**Tools**
- Heading Structure — Visualize H1-H6 hierarchy on the page
- Spacing Measure — Display margin/padding values on elements
- Keyboard Navigation — Enable arrow key navigation between elements
- Log Selected Element — Output selected element data to console (debug)

**Document**
- Save / Save as Draft — Save current changes
- Undo / Redo — History navigation

**Settings**
- Page Settings — Current page layout and style options
- Site Settings — Global site configuration
- Global Colors / Global Fonts — Design system presets

---

### Keyboard Navigation

Navigate between elements using keyboard shortcuts.

**Shortcuts** (Option/Alt + Arrow keys):
- `Option + ↑` — Previous sibling
- `Option + ↓` — Next sibling
- `Option + ←` — Go to parent
- `Option + →` — Go to first child

**Toggle:** Via command palette (Cmd+K) → "Keyboard Navigation"
