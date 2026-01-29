/**
 * Global Typography Creator
 *
 * Creates global typography styles in Elementor by manipulating the UI.
 * Simulates clicking buttons and filling form fields.
 *
 * POC - Run in browser console while in Elementor editor.
 *
 * IMPORTANT: Must have Site Settings > Global Fonts panel open!
 *
 * Usage:
 *   GlobalTypographyCreator.createHeadingStyles() // Creates H1-H4 demo styles
 *   GlobalTypographyCreator.createFromConfig(config)
 */
(function() {
    'use strict';

    const GlobalTypographyCreator = {

        // Delay between UI operations (ms)
        uiDelay: 300,

        /**
         * Sleep helper
         */
        sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Trigger input change event (works with Elementor's Backbone models)
         */
        triggerChange: function(element, value) {
            // Set the value
            element.value = value;

            // Create and dispatch events
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));

            // If jQuery is available, trigger jQuery events too
            if (window.jQuery) {
                jQuery(element).val(value).trigger('input').trigger('change');
            }
        },

        /**
         * Click an element
         */
        clickElement: function(element) {
            element.click();
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        },

        /**
         * Find the "Add Item" button in the typography repeater
         */
        findAddButton: function() {
            // Look for the add button in system_typography repeater
            const panel = document.querySelector('#elementor-panel');
            if (!panel) return null;

            // Find by the repeater field name
            const repeaterControl = panel.querySelector('.elementor-control-system_typography');
            if (repeaterControl) {
                const addBtn = repeaterControl.querySelector('.elementor-repeater-add');
                if (addBtn) return addBtn;
            }

            // Fallback: find any "Add Item" button in the global fonts section
            const addButtons = panel.querySelectorAll('.elementor-repeater-add');
            for (const btn of addButtons) {
                const controlWrapper = btn.closest('.elementor-control');
                if (controlWrapper?.classList.contains('elementor-control-system_typography')) {
                    return btn;
                }
            }

            return addButtons[0] || null;
        },

        /**
         * Find the last repeater item (the one we just added)
         */
        findLastRepeaterItem: function() {
            const panel = document.querySelector('#elementor-panel');
            if (!panel) return null;

            const repeaterControl = panel.querySelector('.elementor-control-system_typography');
            if (!repeaterControl) return null;

            const items = repeaterControl.querySelectorAll('.elementor-repeater-fields');
            return items[items.length - 1] || null;
        },

        /**
         * Open a repeater item if it's collapsed
         */
        openRepeaterItem: function(item) {
            const toggle = item.querySelector('.elementor-repeater-row-tool-toggle, .elementor-repeater-row-controls');
            if (toggle && !item.classList.contains('editable')) {
                const itemTitle = item.querySelector('.elementor-repeater-row-item-title');
                if (itemTitle) {
                    this.clickElement(itemTitle);
                }
            }
        },

        /**
         * Fill a single typography item with values
         */
        fillTypographyItem: async function(item, config) {
            // Open the item first
            this.openRepeaterItem(item);
            await this.sleep(this.uiDelay);

            // Find and fill the title field
            const titleInput = item.querySelector('input[data-setting="title"]');
            if (titleInput && config.name) {
                this.triggerChange(titleInput, config.name);
                await this.sleep(100);
            }

            // Font size (desktop)
            if (config.fontSize !== undefined) {
                const fontSizeInput = item.querySelector('input[data-setting="typography_font_size"]');
                if (fontSizeInput) {
                    this.triggerChange(fontSizeInput, config.fontSize);
                    await this.sleep(100);
                }
            }

            // Font weight - it's a select
            if (config.fontWeight !== undefined) {
                const fontWeightSelect = item.querySelector('select[data-setting="typography_font_weight"]');
                if (fontWeightSelect) {
                    this.triggerChange(fontWeightSelect, String(config.fontWeight));
                    await this.sleep(100);
                }
            }

            // Line height
            if (config.lineHeight !== undefined) {
                const lineHeightInput = item.querySelector('input[data-setting="typography_line_height"]');
                if (lineHeightInput) {
                    this.triggerChange(lineHeightInput, config.lineHeight);
                    await this.sleep(100);
                }
            }

            // Letter spacing
            if (config.letterSpacing !== undefined) {
                const letterSpacingInput = item.querySelector('input[data-setting="typography_letter_spacing"]');
                if (letterSpacingInput) {
                    this.triggerChange(letterSpacingInput, config.letterSpacing);
                    await this.sleep(100);
                }
            }

            return true;
        },

        /**
         * Create a single typography style via UI
         */
        createSingleStyleViaUI: async function(config) {
            // Find and click the Add button
            const addButton = this.findAddButton();
            if (!addButton) {
                throw new Error('Add button not found. Make sure Global Fonts panel is open.');
            }

            // Click to add new item
            this.clickElement(addButton);
            await this.sleep(this.uiDelay);

            // Find the newly added item (last one)
            const newItem = this.findLastRepeaterItem();
            if (!newItem) {
                throw new Error('Could not find the new repeater item');
            }

            // Fill in the values
            await this.fillTypographyItem(newItem, config);

            return { success: true, name: config.name };
        },

        /**
         * Create global typography styles from a JSON config
         */
        createFromConfig: async function(config) {
            if (!Array.isArray(config) || config.length === 0) {
                console.error('GlobalTypographyCreator: Config must be a non-empty array');
                return { success: false, error: 'Invalid config' };
            }

            // Check if panel is open
            const panel = document.querySelector('#elementor-panel');
            if (!panel) {
                console.error('GlobalTypographyCreator: Elementor panel not found');
                return { success: false, error: 'Panel not found' };
            }

            // Check if we're in the right section
            const addButton = this.findAddButton();
            if (!addButton) {
                console.error('GlobalTypographyCreator: Global Fonts panel not found.');
                console.error('Please navigate to: Site Settings > Global Fonts');
                return { success: false, error: 'Global Fonts panel not open' };
            }

            console.log('GlobalTypographyCreator: Creating', config.length, 'typography styles via UI...');

            const results = {
                success: true,
                created: [],
                errors: []
            };

            for (const item of config) {
                try {
                    const result = await this.createSingleStyleViaUI(item);
                    results.created.push(result);
                    console.log(`  Created: "${item.name}"`);
                } catch (err) {
                    results.errors.push({ name: item.name, error: err.message });
                    console.error(`  Failed: "${item.name}" -`, err.message);
                }

                // Delay between items
                await this.sleep(this.uiDelay);
            }

            if (results.errors.length > 0) {
                results.success = false;
            }

            console.log('GlobalTypographyCreator: Done.',
                `Created: ${results.created.length}, Errors: ${results.errors.length}`);

            if (results.created.length > 0) {
                console.log('GlobalTypographyCreator: Don\'t forget to save!');
            }

            return results;
        },

        /**
         * Demo: Create heading styles H1-H4
         */
        createHeadingStyles: async function() {
            const headingConfig = [
                {
                    name: 'Heading 1',
                    fontSize: 48,
                    fontWeight: 700,
                    lineHeight: 1.2
                },
                {
                    name: 'Heading 2',
                    fontSize: 36,
                    fontWeight: 700,
                    lineHeight: 1.3
                },
                {
                    name: 'Heading 3',
                    fontSize: 28,
                    fontWeight: 600,
                    lineHeight: 1.4
                },
                {
                    name: 'Heading 4',
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.4
                }
            ];

            console.log('GlobalTypographyCreator: Creating H1-H4 styles...');
            console.log('Make sure you are in: Site Settings > Global Fonts');
            return await this.createFromConfig(headingConfig);
        },

        /**
         * Debug: Show what UI elements we can find
         */
        debug: function() {
            console.group('GlobalTypographyCreator Debug');

            const panel = document.querySelector('#elementor-panel');
            console.log('Panel found:', !!panel);

            const addButton = this.findAddButton();
            console.log('Add button found:', addButton);

            const repeaterControl = document.querySelector('.elementor-control-system_typography');
            console.log('Typography repeater control:', repeaterControl);

            if (repeaterControl) {
                const items = repeaterControl.querySelectorAll('.elementor-repeater-fields');
                console.log('Current repeater items:', items.length);
            }

            console.groupEnd();
        },

        /**
         * Help
         */
        help: function() {
            console.log(`
GlobalTypographyCreator - Create Elementor global typography via UI

SETUP:
------
1. Open Elementor editor
2. Click hamburger menu (top left)
3. Click "Site Settings"
4. Click "Global Fonts" in the left menu
5. Now run the commands below

USAGE:
------
// Create demo heading styles (H1-H4):
GlobalTypographyCreator.createHeadingStyles();

// Create custom styles:
GlobalTypographyCreator.createFromConfig([
    { name: 'Body Text', fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
    { name: 'Caption', fontSize: 14, fontWeight: 500 }
]);

// Debug (see what UI elements are found):
GlobalTypographyCreator.debug();

CONFIG OPTIONS:
---------------
{
    name: 'Style Name',        // Required - Display name
    fontSize: 24,              // Desktop font size (px)
    fontWeight: 700,           // Font weight (400, 500, 600, 700...)
    lineHeight: 1.4,           // Line height (em)
    letterSpacing: 0.5         // Letter spacing (px)
}
            `);
        }
    };

    // Expose to global scope
    window.GlobalTypographyCreator = GlobalTypographyCreator;

    console.log('GlobalTypographyCreator loaded. Run GlobalTypographyCreator.help() for usage.');

})();
