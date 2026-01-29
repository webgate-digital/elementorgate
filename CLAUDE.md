# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ElementorGate is a WordPress plugin that extends the Elementor page builder with developer productivity tools. It adds features like a command palette (Cmd+K), typography previews, template thumbnails, CSS/ID visualization, keyboard navigation, and Figma-style wrap/unwrap container functionality.

## Development Environment

```bash
# Start local WordPress development environment
docker-compose up -d

# Access WordPress at http://localhost:8009
# MySQL available at localhost:3315 (user: wordpress, pass: wordpress)
```

The plugin is mounted at `/wp-content/plugins/elementorgate` in the container for live development.

## Architecture

### Entry Point
- `wp-content/plugins/elementorgate/elementorgate.php` - Main plugin file using singleton pattern, handles asset enqueueing and module loading

### Settings System
- `includes/class-settings.php` - Feature toggles stored in `elementorgate_settings` WordPress option
- Features can be enabled/disabled from WordPress admin → ElementorGate menu

### JavaScript Modules (assets/js/)
| Module | Purpose |
|--------|---------|
| `element-tools.js` | Core utilities: wrap/unwrap containers (Cmd+G, Cmd+Shift+G), context menus, element inspection |
| `command-palette.js` | Raycast-style command palette (Cmd+K), 25+ commands organized by category |
| `keyboard-navigation.js` | Arrow-key navigation between elements with Option modifier |
| `css-id-visualizer.js` | Displays custom CSS classes/IDs as visual labels |
| `typography-preview.js` | Hover tooltips showing global typography settings |
| `spacing-measure.js` | Visual margin/padding display |
| `global-styles-visualizer.js` | Shows where global colors/fonts are used with toggleable visibility |
| `global-typography-creator.js` | POC: Creates global typography styles from JSON config via Kit document |

### Template Preview Module (modules/template-previews/)
Standalone module with custom WordPress rewrite endpoint (`/template-preview/[id]`) for rendering Elementor templates with thumbnails.

## Plugin Requirements
- WordPress 6.0+
- PHP 7.4+
- Elementor (required dependency, shows admin notice if missing)

## Code Conventions
- No build system - pure vanilla JavaScript (ES6) and PHP
- Scripts enqueued via `elementor/editor/after_enqueue_scripts` hook
- Feature modules loaded conditionally based on settings
- JSDoc comments used throughout JavaScript

## Elementor API Patterns

### Accessing Global Styles
```javascript
// Fetch all globals (colors, typography)
const globals = await $e.data.get('globals/index');
const typography = globals?.data?.typography || {};
const colors = globals?.data?.colors || {};
```

### Kit Document (Site Settings)
```javascript
// Get kit document for modifying site-wide settings
const docs = elementor.documents.getAll();
for (const [id, doc] of Object.entries(docs)) {
    if (doc?.config?.type === 'kit') {
        const settings = doc.model.get('settings');
        const systemTypography = settings.get('system_typography');
    }
}
```

### Applying Kit Settings
```javascript
// Apply changes to kit settings
await $e.run('document/elements/settings', {
    container: kitDocument.container,
    settings: { system_typography: newTypographyArray },
    options: { external: true }
});
```

### Element Selection & Container Access
```javascript
// Get selected element
const container = elementor.selection.getElements()[0];
// Get element by ID from preview
const container = elementor.getContainer(elementId);
// Access element settings
const settings = container.settings.attributes;
const globals = container.globals?.attributes || {};
```
