(function () {
    'use strict';

    /**
     * Global Styles Visualizer
     * Shows where global colors and fonts are used across the page
     * with toggleable visibility and click-to-scroll functionality
     */
    const GlobalStylesVisualizer = {
        isActive: false,
        previewDoc: null,
        previewFrame: null,
        panelElement: null,
        globalsData: null, // Cached globals from $e.data.get('globals/index')
        styleData: {
            colors: [],
            fonts: []
        },
        visibilityState: {},
        focusedStyleId: null, // Track which style is "focused" (eye icon active)

        /**
         * Initialize
         */
        init: function () {
            this.waitForPreview();
        },

        /**
         * Wait for preview iframe
         */
        waitForPreview: function () {
            const self = this;

            const check = () => {
                const frame = document.getElementById('elementor-preview-iframe');
                if (frame && frame.contentDocument && frame.contentDocument.body) {
                    self.previewFrame = frame;
                    self.previewDoc = frame.contentDocument;
                } else {
                    setTimeout(check, 500);
                }
            };

            check();
        },

        /**
         * Toggle visibility
         */
        toggle: function (forceState) {
            if (typeof forceState === 'boolean') {
                this.isActive = forceState;
            } else {
                this.isActive = !this.isActive;
            }

            if (this.isActive) {
                this.show();
            } else {
                this.hide();
            }

            return this.isActive;
        },

        /**
         * Show global styles visualization
         */
        show: async function () {
            // Refresh preview reference
            const frame = document.getElementById('elementor-preview-iframe');
            if (frame && frame.contentDocument) {
                this.previewDoc = frame.contentDocument;
                this.previewFrame = frame;
            }

            if (!this.previewDoc) {
                console.error('GlobalStylesVisualizer: No preview document found');
                return;
            }

            this.hide(); // Clear existing
            this.injectStyles();

            // Fetch globals from Elementor's data API
            await this.fetchGlobals();

            // Scan for global styles usage
            this.styleData = this.scanGlobalStyles();

            // Initialize visibility state (all visible by default)
            this.initVisibilityState();

            // Create panel
            this.createPanel();

            // Add labels to elements
            this.addLabelsToElements();
        },

        /**
         * Fetch globals from Elementor's $e.data API
         */
        fetchGlobals: async function () {
            try {
                if (!window.$e?.data?.get) {
                    console.warn('GlobalStylesVisualizer: $e.data.get not available');
                    return;
                }

                const result = await window.$e.data.get('globals/index');
                this.globalsData = result?.data || result || {};
                console.log('GlobalStylesVisualizer: Fetched globals:', this.globalsData);
            } catch (e) {
                console.error('GlobalStylesVisualizer: Failed to fetch globals', e);
                this.globalsData = { colors: {}, typography: {} };
            }
        },

        /**
         * Hide all labels and panel
         */
        hide: function () {
            if (this.previewDoc) {
                // Remove labels
                const labels = this.previewDoc.querySelectorAll('.efsp-global-label');
                labels.forEach(label => label.remove());

                // Remove highlights
                const highlighted = this.previewDoc.querySelectorAll('.efsp-has-global-style');
                highlighted.forEach(el => {
                    el.classList.remove('efsp-has-global-style', 'efsp-global-highlight', 'efsp-global-hidden');
                });

                // Remove panel
                if (window.FloatingPanel) {
                    window.FloatingPanel.remove(this.previewDoc, 'efsp-global-styles-panel');
                }

                // Remove styles
                const style = this.previewDoc.getElementById('efsp-global-styles-visualizer-styles');
                if (style) style.remove();
            }

            this.panelElement = null;
        },

        /**
         * Initialize visibility state for all styles
         */
        initVisibilityState: function () {
            this.visibilityState = {};
            this.focusedStyleId = null;

            // Colors hidden by default
            this.styleData.colors.forEach(color => {
                this.visibilityState[color.id] = false;
            });

            // Fonts visible by default
            this.styleData.fonts.forEach(font => {
                this.visibilityState[font.id] = true;
            });
        },

        /**
         * Scan for global styles usage on all elements
         */
        scanGlobalStyles: function () {
            const colors = [];
            const fonts = [];

            if (!this.globalsData) {
                console.warn('GlobalStylesVisualizer: No globals data available');
                return { colors, fonts };
            }

            const globalColors = this.globalsData.colors || {};
            const globalTypography = this.globalsData.typography || {};

            // Build lookup maps: globalId -> { data, elements[] }
            const colorUsage = {};
            const fontUsage = {};

            // Initialize with all available globals
            Object.entries(globalColors).forEach(([id, data]) => {
                colorUsage[id] = {
                    id: `color-${id}`,
                    globalId: id,
                    name: data.title || id,
                    value: data.value,
                    type: 'color',
                    elements: []
                };
            });

            Object.entries(globalTypography).forEach(([id, data]) => {
                fontUsage[id] = {
                    id: `font-${id}`,
                    globalId: id,
                    name: data.title || id,
                    value: data.value?.typography_font_family || 'System Font',
                    type: 'font',
                    elements: []
                };
            });

            // Scan all Elementor elements for global references
            const allElements = this.previewDoc.querySelectorAll('[data-id]');

            allElements.forEach(el => {
                const elementId = el.dataset.id;
                const container = window.elementor?.getContainer?.(elementId);

                if (!container) return;

                // Check for global references in container.globals
                const globals = container.globals;
                if (globals) {
                    // Get all global references from the globals model
                    const globalsAttrs = globals.attributes || {};

                    Object.entries(globalsAttrs).forEach(([settingKey, globalRef]) => {
                        if (!globalRef) return;

                        // Parse the global reference: "globals/colors?id=xxx" or "globals/typography?id=xxx"
                        const colorMatch = globalRef.match(/globals\/colors\?id=([a-z0-9]+)/i);
                        const typoMatch = globalRef.match(/globals\/typography\?id=([a-z0-9]+)/i);

                        if (colorMatch) {
                            const colorId = colorMatch[1];
                            if (colorUsage[colorId]) {
                                colorUsage[colorId].elements.push({
                                    element: el,
                                    id: elementId,
                                    type: this.getElementType(el),
                                    setting: settingKey
                                });
                            }
                        }

                        if (typoMatch) {
                            const typoId = typoMatch[1];
                            if (fontUsage[typoId]) {
                                fontUsage[typoId].elements.push({
                                    element: el,
                                    id: elementId,
                                    type: this.getElementType(el),
                                    setting: settingKey
                                });
                            }
                        }
                    });
                }

                // Also check __globals__ in settings.attributes
                const settings = container.settings?.attributes;
                if (settings?.__globals__) {
                    Object.entries(settings.__globals__).forEach(([settingKey, globalRef]) => {
                        if (!globalRef) return;

                        const colorMatch = globalRef.match(/globals\/colors\?id=([a-z0-9]+)/i);
                        const typoMatch = globalRef.match(/globals\/typography\?id=([a-z0-9]+)/i);

                        if (colorMatch) {
                            const colorId = colorMatch[1];
                            if (colorUsage[colorId]) {
                                // Avoid duplicates
                                const existing = colorUsage[colorId].elements.find(e => e.id === elementId && e.setting === settingKey);
                                if (!existing) {
                                    colorUsage[colorId].elements.push({
                                        element: el,
                                        id: elementId,
                                        type: this.getElementType(el),
                                        setting: settingKey
                                    });
                                }
                            }
                        }

                        if (typoMatch) {
                            const typoId = typoMatch[1];
                            if (fontUsage[typoId]) {
                                const existing = fontUsage[typoId].elements.find(e => e.id === elementId && e.setting === settingKey);
                                if (!existing) {
                                    fontUsage[typoId].elements.push({
                                        element: el,
                                        id: elementId,
                                        type: this.getElementType(el),
                                        setting: settingKey
                                    });
                                }
                            }
                        }
                    });
                }
            });

            // Filter to only include globals that are actually used
            Object.values(colorUsage).forEach(usage => {
                if (usage.elements.length > 0) {
                    colors.push(usage);
                }
            });

            Object.values(fontUsage).forEach(usage => {
                if (usage.elements.length > 0) {
                    fonts.push(usage);
                }
            });

            console.log('GlobalStylesVisualizer: Scan complete', { colors, fonts });
            return { colors, fonts };
        },

        /**
         * Get element type label
         */
        getElementType: function (el) {
            const container = window.elementor?.getContainer?.(el.dataset.id);
            if (container) {
                const widgetType = container.model?.get('widgetType');
                const elType = container.model?.get('elType');
                return widgetType || elType || 'element';
            }
            return 'element';
        },

        /**
         * Inject styles
         */
        injectStyles: function () {
            if (!this.previewDoc) return;

            const existing = this.previewDoc.getElementById('efsp-global-styles-visualizer-styles');
            if (existing) return;

            const style = this.previewDoc.createElement('style');
            style.id = 'efsp-global-styles-visualizer-styles';
            style.textContent = `
                .efsp-global-label {
                    position: absolute !important;
                    z-index: 10000 !important;
                    top: 0 !important;
                    right: 0 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    line-height: 1 !important;
                    white-space: nowrap !important;
                    pointer-events: none !important;
                    display: flex !important;
                    gap: 3px !important;
                }

                .efsp-global-label__color {
                    padding: 4px 8px !important;
                    border-radius: 3px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 5px !important;
                    background: rgba(0, 0, 0, 0.8) !important;
                    color: #fff !important;
                }

                .efsp-global-label__swatch {
                    width: 12px !important;
                    height: 12px !important;
                    border-radius: 2px !important;
                    border: 1px solid rgba(255,255,255,0.3) !important;
                }

                .efsp-global-label__font {
                    padding: 4px 8px !important;
                    border-radius: 3px !important;
                    background: #7c3aed !important;
                    color: #fff !important;
                }

                .efsp-has-global-style {
                    outline: 1px dashed #0891b2 !important;
                    outline-offset: -1px !important;
                }

                .efsp-global-highlight {
                    animation: efsp-global-pulse 0.5s ease-in-out 3 !important;
                    outline-color: #f59e0b !important;
                    outline-width: 2px !important;
                }

                .efsp-global-hidden {
                    opacity: 0.2 !important;
                    outline: 2px dashed #ef4444 !important;
                }

                @keyframes efsp-global-pulse {
                    0%, 100% { outline-offset: -1px; }
                    50% { outline-offset: 4px; }
                }

                /* Panel-specific styles */
                .efsp-global-panel__section-header {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    padding: 10px 14px 6px !important;
                    cursor: pointer !important;
                }

                .efsp-global-panel__section-header:hover {
                    background: rgba(255, 255, 255, 0.03) !important;
                }

                .efsp-global-panel__section-checkbox {
                    width: 14px !important;
                    height: 14px !important;
                    cursor: pointer !important;
                    accent-color: #7c3aed !important;
                    background-color: #2a2d31 !important;
                    border: 1px solid #404349 !important;
                    border-radius: 3px !important;
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    position: relative !important;
                }

                .efsp-global-panel__section-checkbox:checked {
                    background-color: #7c3aed !important;
                    border-color: #7c3aed !important;
                }

                .efsp-global-panel__section-checkbox:checked::after {
                    content: '✓' !important;
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    color: #fff !important;
                    font-size: 10px !important;
                    font-weight: 600 !important;
                }

                .efsp-global-panel__section-title {
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    color: #9da5ae !important;
                    letter-spacing: 0.5px !important;
                    flex: 1 !important;
                }

                .efsp-global-panel__item {
                    display: flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                    padding: 8px 14px !important;
                    cursor: pointer !important;
                    transition: background 0.15s !important;
                }

                .efsp-global-panel__item:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                }

                .efsp-global-panel__checkbox {
                    width: 16px !important;
                    height: 16px !important;
                    cursor: pointer !important;
                    background-color: #2a2d31 !important;
                    border: 1px solid #404349 !important;
                    border-radius: 3px !important;
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    position: relative !important;
                    flex-shrink: 0 !important;
                }

                .efsp-global-panel__checkbox:checked {
                    background-color: #7c3aed !important;
                    border-color: #7c3aed !important;
                }

                .efsp-global-panel__checkbox:checked::after {
                    content: '✓' !important;
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    color: #fff !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                }

                .efsp-global-panel__checkbox:hover {
                    border-color: #7c3aed !important;
                }

                .efsp-global-panel__eye {
                    width: 24px !important;
                    height: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    cursor: pointer !important;
                    border-radius: 4px !important;
                    color: #6b7280 !important;
                    font-size: 14px !important;
                    transition: all 0.15s !important;
                    flex-shrink: 0 !important;
                }

                .efsp-global-panel__eye:hover {
                    background: rgba(124, 58, 237, 0.2) !important;
                    color: #a78bfa !important;
                }

                .efsp-global-panel__eye--active {
                    background: #7c3aed !important;
                    color: #fff !important;
                }

                .efsp-global-panel__eye--active:hover {
                    background: #6d28d9 !important;
                    color: #fff !important;
                }

                .efsp-global-panel__item--dimmed {
                    opacity: 0.4 !important;
                }

                .efsp-global-panel__item--dimmed .efsp-global-panel__checkbox {
                    pointer-events: none !important;
                }

                .efsp-global-panel__swatch {
                    width: 20px !important;
                    height: 20px !important;
                    border-radius: 4px !important;
                    border: 1px solid rgba(255,255,255,0.2) !important;
                    flex-shrink: 0 !important;
                }

                .efsp-global-panel__font-icon {
                    width: 20px !important;
                    height: 20px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: #7c3aed !important;
                    border-radius: 4px !important;
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    color: #fff !important;
                    flex-shrink: 0 !important;
                }

                .efsp-global-panel__info {
                    flex: 1 !important;
                    min-width: 0 !important;
                }

                .efsp-global-panel__name {
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    color: #e0e1e3 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }

                .efsp-global-panel__meta {
                    font-size: 10px !important;
                    color: #9da5ae !important;
                    margin-top: 2px !important;
                }

                .efsp-global-panel__count {
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    padding: 2px 6px !important;
                    border-radius: 10px !important;
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: #9da5ae !important;
                    flex-shrink: 0 !important;
                }

                .efsp-global-panel__empty {
                    padding: 20px 14px !important;
                    text-align: center !important;
                    color: #9da5ae !important;
                    font-size: 12px !important;
                }
            `;
            this.previewDoc.head.appendChild(style);
        },

        /**
         * Add labels to elements in preview
         */
        addLabelsToElements: function () {
            if (!this.previewDoc) return;

            // Group elements by their DOM element to combine labels
            const elementStyles = new Map();

            // Collect color styles
            this.styleData.colors.forEach(color => {
                color.elements.forEach(elData => {
                    if (!elementStyles.has(elData.id)) {
                        elementStyles.set(elData.id, { colors: [], fonts: [], element: elData.element });
                    }
                    // Avoid duplicate color entries for same element
                    const existing = elementStyles.get(elData.id).colors.find(c => c.id === color.id);
                    if (!existing) {
                        elementStyles.get(elData.id).colors.push(color);
                    }
                });
            });

            // Collect font styles
            this.styleData.fonts.forEach(font => {
                font.elements.forEach(elData => {
                    if (!elementStyles.has(elData.id)) {
                        elementStyles.set(elData.id, { colors: [], fonts: [], element: elData.element });
                    }
                    const existing = elementStyles.get(elData.id).fonts.find(f => f.id === font.id);
                    if (!existing) {
                        elementStyles.get(elData.id).fonts.push(font);
                    }
                });
            });

            // Add labels to elements
            elementStyles.forEach((styles, elementId) => {
                const element = styles.element;
                if (!element) return;

                // Check if element has any visible styles
                let hasVisibleColors = styles.colors.some(c => this.visibilityState[c.id]);
                let hasVisibleFonts = styles.fonts.some(f => this.visibilityState[f.id]);

                // If focus mode is active, only show elements that have the focused style
                if (this.focusedStyleId) {
                    const hasFocusedColor = styles.colors.some(c => c.id === this.focusedStyleId);
                    const hasFocusedFont = styles.fonts.some(f => f.id === this.focusedStyleId);

                    if (!hasFocusedColor && !hasFocusedFont) {
                        // This element doesn't have the focused style - hide it
                        element.classList.remove('efsp-has-global-style');
                        return;
                    }

                    // Only show the focused style's label
                    hasVisibleColors = hasFocusedColor;
                    hasVisibleFonts = hasFocusedFont;
                }

                const hasAnyVisible = hasVisibleColors || hasVisibleFonts;

                // Only show outline and label if element has visible styles
                if (!hasAnyVisible) {
                    element.classList.remove('efsp-has-global-style');
                    return;
                }

                element.classList.add('efsp-has-global-style');

                // Ensure element has relative positioning
                const computedStyle = this.previewDoc.defaultView.getComputedStyle(element);
                if (computedStyle.position === 'static') {
                    element.style.position = 'relative';
                }

                // Create label
                const label = this.previewDoc.createElement('div');
                label.className = 'efsp-global-label';
                label.dataset.elementId = elementId;

                let html = '';

                // Add font labels first (Typography section is first)
                styles.fonts.forEach(font => {
                    // In focus mode, only show the focused style
                    if (this.focusedStyleId && font.id !== this.focusedStyleId) return;
                    if (this.visibilityState[font.id]) {
                        html += `<span class="efsp-global-label__font" data-style-id="${font.id}">
                            Aa ${this.escapeHtml(font.name)}
                        </span>`;
                    }
                });

                // Add color labels
                styles.colors.forEach(color => {
                    // In focus mode, only show the focused style
                    if (this.focusedStyleId && color.id !== this.focusedStyleId) return;
                    if (this.visibilityState[color.id]) {
                        html += `<span class="efsp-global-label__color" data-style-id="${color.id}">
                            <span class="efsp-global-label__swatch" style="background: ${color.value}"></span>
                            ${this.escapeHtml(color.name)}
                        </span>`;
                    }
                });

                if (html) {
                    label.innerHTML = html;
                    element.appendChild(label);
                }
            });
        },


        /**
         * Create floating panel
         */
        createPanel: function () {
            if (!this.previewDoc) return;

            const self = this;

            // Use FloatingPanel utility
            const panel = window.FloatingPanel.create(this.previewDoc, {
                id: 'efsp-global-styles-panel',
                title: 'Global Styles',
                onClose: () => self.toggle(false),
                onRefresh: () => self.refresh()
            });

            // Add custom width
            panel.style.setProperty('width', '320px', 'important');

            // Summary
            const colorCount = this.styleData.colors.length;
            const fontCount = this.styleData.fonts.length;
            const totalElements = new Set([
                ...this.styleData.colors.flatMap(c => c.elements.map(e => e.id)),
                ...this.styleData.fonts.flatMap(f => f.elements.map(e => e.id))
            ]).size;

            window.FloatingPanel.addSection(
                this.previewDoc,
                panel,
                'efsp-floating-panel__summary',
                `<span class="efsp-floating-panel__count" style="background: #7c3aed !important; color: #fff !important;">Fonts: ${fontCount}</span>
                 <span class="efsp-floating-panel__count" style="background: #0891b2 !important; color: #fff !important;">Colors: ${colorCount}</span>
                 <span class="efsp-floating-panel__count">Elements: ${totalElements}</span>`
            );

            // List section
            const list = window.FloatingPanel.addSection(
                this.previewDoc,
                panel,
                'efsp-floating-panel__list',
                ''
            );

            if (colorCount === 0 && fontCount === 0) {
                list.innerHTML = '<div class="efsp-global-panel__empty">No global styles in use on this page.<br>Apply global colors or fonts to elements.</div>';
            } else {
                // Typography section (shown first)
                if (fontCount > 0) {
                    list.appendChild(this.createSectionHeader('Typography', 'font', this.styleData.fonts));

                    this.styleData.fonts.forEach(font => {
                        list.appendChild(this.createStyleItem(font));
                    });
                }

                // Colors section
                if (colorCount > 0) {
                    list.appendChild(this.createSectionHeader('Colors', 'color', this.styleData.colors));

                    this.styleData.colors.forEach(color => {
                        list.appendChild(this.createStyleItem(color));
                    });
                }
            }

            this.previewDoc.body.appendChild(panel);
            this.panelElement = panel;
        },

        /**
         * Create a section header with toggle checkbox
         */
        createSectionHeader: function (title, type, items) {
            const self = this;
            const header = this.previewDoc.createElement('div');
            header.className = 'efsp-global-panel__section-header';
            header.dataset.sectionType = type;

            // Checkbox to toggle all items in section
            const checkbox = this.previewDoc.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'efsp-global-panel__section-checkbox';
            checkbox.checked = items.every(item => this.visibilityState[item.id]);

            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const checked = checkbox.checked;

                // Update visibility state for all items in this section
                items.forEach(item => {
                    self.visibilityState[item.id] = checked;
                });

                // Update individual checkboxes in the panel
                const panelItems = self.panelElement.querySelectorAll(`.efsp-global-panel__item[data-style-id^="${type}-"]`);
                panelItems.forEach(panelItem => {
                    const itemCheckbox = panelItem.querySelector('.efsp-global-panel__checkbox');
                    if (itemCheckbox) {
                        itemCheckbox.checked = checked;
                    }
                });

                // Update element visibility
                self.updateAllElementsVisibility();
            });

            // Title
            const titleEl = this.previewDoc.createElement('span');
            titleEl.className = 'efsp-global-panel__section-title';
            titleEl.textContent = title;

            header.appendChild(checkbox);
            header.appendChild(titleEl);

            // Clicking header also toggles checkbox
            header.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });

            return header;
        },

        /**
         * Create a style item for the panel
         */
        createStyleItem: function (styleData) {
            const self = this;
            const item = this.previewDoc.createElement('div');
            item.className = 'efsp-global-panel__item';
            item.dataset.styleId = styleData.id;

            // Checkbox
            const checkbox = this.previewDoc.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'efsp-global-panel__checkbox';
            checkbox.checked = this.visibilityState[styleData.id];
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                self.visibilityState[styleData.id] = checkbox.checked;
                self.updateAllElementsVisibility();
                self.updateSectionHeaderCheckbox(styleData.type);
            });

            // Icon/swatch
            let icon;
            if (styleData.type === 'color') {
                icon = this.previewDoc.createElement('div');
                icon.className = 'efsp-global-panel__swatch';
                icon.style.background = styleData.value;
            } else {
                icon = this.previewDoc.createElement('div');
                icon.className = 'efsp-global-panel__font-icon';
                icon.textContent = 'Aa';
            }

            // Info
            const info = this.previewDoc.createElement('div');
            info.className = 'efsp-global-panel__info';

            const name = this.previewDoc.createElement('div');
            name.className = 'efsp-global-panel__name';
            name.textContent = styleData.name;

            const meta = this.previewDoc.createElement('div');
            meta.className = 'efsp-global-panel__meta';
            meta.textContent = styleData.value;

            info.appendChild(name);
            info.appendChild(meta);

            // Eye button for focus/isolate mode
            const eye = this.previewDoc.createElement('div');
            eye.className = 'efsp-global-panel__eye';
            eye.innerHTML = '👁';
            eye.title = 'Focus on this style (isolate)';
            if (this.focusedStyleId === styleData.id) {
                eye.classList.add('efsp-global-panel__eye--active');
            }
            eye.addEventListener('click', (e) => {
                e.stopPropagation();
                self.toggleFocusMode(styleData.id);
            });

            // Count badge
            const count = this.previewDoc.createElement('span');
            count.className = 'efsp-global-panel__count';
            count.textContent = styleData.elements.length;

            item.appendChild(checkbox);
            item.appendChild(icon);
            item.appendChild(info);
            item.appendChild(eye);
            item.appendChild(count);

            // Apply dimmed state if another style is focused
            if (this.focusedStyleId && this.focusedStyleId !== styleData.id) {
                item.classList.add('efsp-global-panel__item--dimmed');
            }

            // Click to highlight elements (not on checkbox or eye)
            item.addEventListener('click', (e) => {
                if (e.target === checkbox || e.target === eye || eye.contains(e.target)) return;
                self.highlightStyleElements(styleData);
            });

            return item;
        },

        /**
         * Update section header checkbox based on items' state
         */
        updateSectionHeaderCheckbox: function (type) {
            if (!this.panelElement) return;

            const sectionHeader = this.panelElement.querySelector(`.efsp-global-panel__section-header[data-section-type="${type}"]`);
            if (!sectionHeader) return;

            const sectionCheckbox = sectionHeader.querySelector('.efsp-global-panel__section-checkbox');
            if (!sectionCheckbox) return;

            // Check if all items of this type are checked
            const items = type === 'font' ? this.styleData.fonts : this.styleData.colors;
            const allChecked = items.every(item => this.visibilityState[item.id]);

            sectionCheckbox.checked = allChecked;
        },

        /**
         * Toggle focus mode for a specific style
         * When focused, only that style's elements are shown
         */
        toggleFocusMode: function (styleId) {
            if (!this.panelElement) return;

            // Toggle focus: if already focused on this style, unfocus
            if (this.focusedStyleId === styleId) {
                this.focusedStyleId = null;
            } else {
                this.focusedStyleId = styleId;
            }

            // Update all panel items' visual state
            const allItems = this.panelElement.querySelectorAll('.efsp-global-panel__item');
            allItems.forEach(item => {
                const itemStyleId = item.dataset.styleId;
                const eyeBtn = item.querySelector('.efsp-global-panel__eye');

                if (this.focusedStyleId === null) {
                    // No focus - remove dimmed state and active eye
                    item.classList.remove('efsp-global-panel__item--dimmed');
                    if (eyeBtn) eyeBtn.classList.remove('efsp-global-panel__eye--active');
                } else if (itemStyleId === this.focusedStyleId) {
                    // This is the focused item
                    item.classList.remove('efsp-global-panel__item--dimmed');
                    if (eyeBtn) eyeBtn.classList.add('efsp-global-panel__eye--active');
                } else {
                    // Not focused item - dim it
                    item.classList.add('efsp-global-panel__item--dimmed');
                    if (eyeBtn) eyeBtn.classList.remove('efsp-global-panel__eye--active');
                }
            });

            // Update element visibility
            this.updateAllElementsVisibility();
        },

        /**
         * Update visibility of all elements
         */
        updateAllElementsVisibility: function () {
            if (!this.previewDoc) return;

            // Remove existing labels
            const labels = this.previewDoc.querySelectorAll('.efsp-global-label');
            labels.forEach(label => label.remove());

            // Remove style class from all elements (will be re-added as needed)
            const elements = this.previewDoc.querySelectorAll('.efsp-has-global-style');
            elements.forEach(el => el.classList.remove('efsp-has-global-style'));

            // Re-add labels with updated visibility
            this.addLabelsToElements();
        },

        /**
         * Highlight all elements using a specific style
         */
        highlightStyleElements: function (styleData) {
            if (!this.previewDoc) return;

            // Remove existing highlights
            const highlighted = this.previewDoc.querySelectorAll('.efsp-global-highlight');
            highlighted.forEach(el => el.classList.remove('efsp-global-highlight'));

            // Scroll to first element and highlight all
            if (styleData.elements.length > 0) {
                const firstEl = styleData.elements[0].element;
                if (firstEl) {
                    firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                styleData.elements.forEach(elData => {
                    if (elData.element) {
                        elData.element.classList.add('efsp-global-highlight');
                        setTimeout(() => {
                            elData.element.classList.remove('efsp-global-highlight');
                        }, 2000);
                    }
                });

                // Also select first element in Elementor
                const container = window.elementor?.getContainer?.(styleData.elements[0].id);
                if (container) {
                    window.$e?.run('document/elements/select', { container });
                }
            }
        },

        /**
         * Escape HTML
         */
        escapeHtml: function (text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },

        /**
         * Refresh
         */
        refresh: async function () {
            if (this.isActive) {
                await this.show();
            }
        },

        /**
         * Debug function - logs all global style references found
         * Run from console: GlobalStylesVisualizer.debug()
         */
        debug: async function () {
            console.group('GlobalStylesVisualizer Debug');

            // Fetch globals
            if (window.$e?.data?.get) {
                try {
                    const globals = await window.$e.data.get('globals/index');
                    console.log('Globals from $e.data.get("globals/index"):', globals);
                } catch (e) {
                    console.error('Failed to fetch globals:', e);
                }
            }

            // Scan elements
            const frame = document.getElementById('elementor-preview-iframe');
            if (frame?.contentDocument) {
                const allElements = frame.contentDocument.querySelectorAll('[data-id]');
                console.log(`Found ${allElements.length} Elementor elements`);

                const elementsWithGlobals = [];
                allElements.forEach(el => {
                    const container = window.elementor?.getContainer?.(el.dataset.id);
                    if (container) {
                        const globalsAttrs = container.globals?.attributes || {};
                        const settingsGlobals = container.settings?.attributes?.__globals__ || {};

                        if (Object.keys(globalsAttrs).length > 0 || Object.keys(settingsGlobals).length > 0) {
                            elementsWithGlobals.push({
                                id: el.dataset.id,
                                type: container.model?.get('widgetType') || container.model?.get('elType'),
                                'container.globals.attributes': globalsAttrs,
                                'settings.__globals__': settingsGlobals
                            });
                        }
                    }
                });

                console.log('Elements with global references:', elementsWithGlobals);
            }

            console.groupEnd();
            return 'Debug info logged to console';
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => GlobalStylesVisualizer.init());
    } else {
        GlobalStylesVisualizer.init();
    }

    // Expose to global scope
    window.GlobalStylesVisualizer = GlobalStylesVisualizer;

})();
