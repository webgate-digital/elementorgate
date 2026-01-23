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
- Wrap in Container — Wrap selected element(s) in a new container (also: `Cmd+G` or right-click menu)
- Unwrap Container — Remove container and keep inner elements (also: `Cmd+Shift+G` or right-click menu)
- Duplicate / Delete / Copy / Paste — Standard element operations

**View**
- Toggle Navigator — Show/hide the element tree panel
- Desktop/Tablet/Mobile View — Switch responsive preview mode
- Preview Changes — Open frontend preview

**Tools**
- Heading Structure — Visualize H1-H6 hierarchy on the page
- Spacing Measure — Display margin/padding values on elements
- Keyboard Navigation — Enable arrow key navigation between elements
- CSS Classes & IDs — Show custom CSS classes and IDs on elements
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

---

### CSS Classes & IDs Visualizer

Display custom CSS classes and IDs added to elements directly in the editor.

**Toggle:** Via command palette (Cmd+K) → "CSS Classes & IDs"

**What it shows:**
- Purple label: Custom CSS ID (`#my-element`)
- Cyan label: Custom CSS classes (`.my-class .another-class`)
- Dashed outline on elements with custom CSS

**Where to set CSS ID/Class:** Elementor Editor → Select element → Advanced tab → CSS ID / CSS Classes

---

### Wrap / Unwrap Container

Quickly group elements into a container or ungroup them (like Figma's Group/Ungroup).

**Access methods:**
- **Keyboard:** `Cmd+G` (wrap) / `Cmd+Shift+G` (unwrap)
- **Right-click menu:** Select element(s) → Right-click → "Wrap in Container" or "Unwrap Container"
- **Command palette:** `Cmd+K` → search "wrap" or "unwrap"

**Wrap in Container:**
- Select one or more elements (must have the same parent)
- Creates a new container and moves selected elements inside

**Unwrap Container:**
- Select a container
- Moves all children out to parent level and deletes the empty container
