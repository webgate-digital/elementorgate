(function ($) {
    'use strict';

    /**
     * Elementor Typography Preview Enhancement
     *
     * Adds font size and weight values to the global typography popover items
     */
    const TypographyPreview = {
        // Cache for typography data
        typographyCache: null,
        // Active tooltip element
        activeTooltip: null,

        init: function () {
            this.bindEvents();
            this.bindKeyboardShortcuts();
            this.interceptWithJQuery();
            this.loadTypographyData();
        },

        /**
         * Load typography data from Elementor's data API
         */
        loadTypographyData: async function () {
            try {
                if (typeof window.$e === 'undefined' || !window.$e.data) {
                    setTimeout(() => this.loadTypographyData(), 500);
                    return;
                }

                const globalData = await window.$e.data.get('globals/index');
                const data = globalData?.data || {};

                this.typographyCache = data.typography || {};
            } catch (err) {
                console.error('Failed to load global typography:', err);
            }
        },

        /**
         * Bind click events to typography global buttons using event delegation
         */
        bindEvents: function () {
            // Use event delegation - listen for clicks on global typography buttons
            $(document).on('click', '.e-global__popover-toggle', this.onPopoverToggle.bind(this));

            // Also handle the typography control's globe icon
            $(document).on('click', '.elementor-control-popover-toggle-toggle', this.onPopoverToggle.bind(this));

            // Tooltip hover events - on the entire row in dropdown
            $(document).on('mouseenter', '.e-global__preview-item.e-global__typography', this.onValueHover.bind(this));
            $(document).on('mouseleave', '.e-global__preview-item.e-global__typography', this.onValueLeave.bind(this));

            // Tooltip hover events - on typography control toggle buttons (globe icon and edit icon)
            // Target the control wrapper that contains "typography" in its class
            const self = this;
            $(document).on('mouseenter', '.e-global__popover-toggle', function(e) {
                const $control = $(this).closest('.elementor-control');
                // Check if this is a typography control
                if ($control.hasClass('elementor-control-typography_typography') ||
                    $control.attr('class')?.includes('typography')) {
                    self.onTypographyControlHover.call(self, e);
                }
            });
            $(document).on('mouseleave', '.e-global__popover-toggle', function(e) {
                const $control = $(this).closest('.elementor-control');
                if ($control.hasClass('elementor-control-typography_typography') ||
                    $control.attr('class')?.includes('typography')) {
                    self.onValueLeave.call(self, e);
                }
            });
            $(document).on('mouseenter', '.elementor-control-popover-toggle-toggle-label', function(e) {
                const $control = $(this).closest('.elementor-control');
                if ($control.hasClass('elementor-control-typography_typography') ||
                    $control.attr('class')?.includes('typography')) {
                    self.onTypographyControlHover.call(self, e);
                }
            });
            $(document).on('mouseleave', '.elementor-control-popover-toggle-toggle-label', function(e) {
                const $control = $(this).closest('.elementor-control');
                if ($control.hasClass('elementor-control-typography_typography') ||
                    $control.attr('class')?.includes('typography')) {
                    self.onValueLeave.call(self, e);
                }
            });
        },

        /**
         * Handle hover on typography control toggle buttons (globe/edit icons)
         */
        onTypographyControlHover: function (e) {
            const target = e.currentTarget;
            const $control = $(target).closest('.elementor-control');

            if (!$control.length) {
                return;
            }

            // Extract the typography setting name from the control class
            // e.g., "elementor-control-typography_typography" -> "typography_typography"
            // e.g., "elementor-control-button_typography_typography" -> "button_typography_typography"
            const controlClass = $control.attr('class') || '';
            const settingMatch = controlClass.match(/elementor-control-([a-z_]+typography_typography)/i);
            const settingName = settingMatch ? settingMatch[1] : 'typography_typography';

            // Try to get the global typography ID from the selected element
            const globalId = this.getActiveGlobalTypography(settingName);

            if (globalId && this.typographyCache && this.typographyCache[globalId]) {
                const entry = this.typographyCache[globalId];
                this.showTooltip(target, entry);
            } else {
                // Show tooltip with current element's typography values (non-global)
                this.showCurrentTypographyTooltip(target, settingName);
            }
        },

        /**
         * Try to get the active global typography ID from the selected element
         * @param {string} settingName - The typography setting name (e.g., 'typography_typography', 'button_typography_typography')
         */
        getActiveGlobalTypography: function (settingName) {
            try {
                const container = window.elementor?.selection?.getElements()?.[0];
                if (!container) return null;

                // Try to get globals from container
                const globals = container.globals;
                if (globals) {
                    const typographyGlobal = globals.get ? globals.get(settingName) : globals.attributes?.[settingName];
                    if (typographyGlobal) {
                        const match = typographyGlobal.match(/id=([a-z0-9]+)/i);
                        if (match) {
                            return match[1];
                        }
                    }
                }

                // Try alternate way via model
                const model = container.model;
                if (model) {
                    const modelGlobals = model.get('globals');
                    if (modelGlobals && modelGlobals[settingName]) {
                        const match = modelGlobals[settingName].match(/id=([a-z0-9]+)/i);
                        if (match) {
                            return match[1];
                        }
                    }
                }

                // Try settings globals
                const settings = container.settings;
                if (settings) {
                    const settingsGlobals = settings.get ? settings.get('globals') : settings.attributes?.globals;
                    if (settingsGlobals && settingsGlobals[settingName]) {
                        const match = settingsGlobals[settingName].match(/id=([a-z0-9]+)/i);
                        if (match) {
                            return match[1];
                        }
                    }
                }
            } catch (err) {
                // Silent fail
            }
            return null;
        },

        /**
         * Show tooltip with current (non-global) typography values
         * @param {Element} target - The element to position tooltip near
         * @param {string} settingName - The typography setting name (e.g., 'typography_typography', 'button_typography_typography')
         */
        showCurrentTypographyTooltip: function (target, settingName) {
            this.hideTooltip();

            try {
                // Try to get current typography values from Elementor
                const container = window.elementor?.selection?.getElements()?.[0];
                if (!container) return;

                const settings = container.settings?.attributes || {};

                // Determine the prefix for typography settings
                // e.g., 'typography_typography' -> 'typography_'
                // e.g., 'button_typography_typography' -> 'button_typography_'
                const prefix = settingName ? settingName.replace(/_typography$/, '_') : 'typography_';

                // Look for typography settings with the correct prefix
                const fontSize = settings[prefix + 'font_size'];
                const fontWeight = settings[prefix + 'font_weight'];
                const lineHeight = settings[prefix + 'line_height'];
                const letterSpacing = settings[prefix + 'letter_spacing'];
                const fontSizeTablet = settings[prefix + 'font_size_tablet'];
                const fontSizeMobile = settings[prefix + 'font_size_mobile'];

                // Only show if we have some values
                if (!fontSize && !fontWeight) return;

                const tooltip = document.createElement('div');
                tooltip.className = 'efsp-tooltip';

                let html = '<div class="efsp-tooltip__header">Current Typography</div>';

                // Typography Properties Section
                html += '<div class="efsp-tooltip__section">';
                html += '<div class="efsp-tooltip__section-title"><i class="eicon-typography"></i> Properties</div>';
                html += this.buildRow('Weight', fontWeight || null);
                html += this.buildRow('Line Height', this.formatSizeValue(lineHeight));
                html += this.buildRow('Letter Spacing', this.formatSizeValue(letterSpacing));
                html += '</div>';

                // Responsive Font Sizes Section
                html += '<div class="efsp-tooltip__section">';
                html += '<div class="efsp-tooltip__section-title"><i class="eicon-device-responsive"></i> Font Size</div>';
                html += '<div class="efsp-tooltip__responsive">';
                html += this.buildDeviceBox('eicon-device-desktop', this.formatSizeValue(fontSize), 'Desktop');
                html += this.buildDeviceBox('eicon-device-tablet', this.formatSizeValue(fontSizeTablet), 'Tablet');
                html += this.buildDeviceBox('eicon-device-mobile', this.formatSizeValue(fontSizeMobile), 'Mobile');
                html += '</div>';
                html += '</div>';

                tooltip.innerHTML = html;
                document.body.appendChild(tooltip);

                // Position tooltip
                const rect = target.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();

                let left = rect.left - tooltipRect.width - 10;
                let top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);

                if (left < 10) {
                    left = rect.right + 10;
                }
                if (top < 10) {
                    top = 10;
                }
                if (top + tooltipRect.height > window.innerHeight - 10) {
                    top = window.innerHeight - tooltipRect.height - 10;
                }

                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';

                this.activeTooltip = tooltip;
            } catch (err) {
                // Silent fail
            }
        },

        /**
         * Bind keyboard shortcuts to bypass Elementor defaults
         */
        bindKeyboardShortcuts: function () {
            const self = this;

            const handleKeydown = (e) => {
                // CMD/Ctrl + K - bypass Elementor default
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    self.onCommandK();
                    return false;
                }

                // CMD/Ctrl + G - Wrap selected elements in container
                if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    if (window.elementorTools && window.elementorTools.wrapInContainer) {
                        window.elementorTools.wrapInContainer();
                    }
                    return false;
                }
            };

            // Bind to main document (capture phase)
            document.addEventListener('keydown', handleKeydown, true);

            // Also bind to preview iframe when it's ready
            const bindToPreview = () => {
                const previewFrame = document.getElementById('elementor-preview-iframe');
                if (previewFrame && previewFrame.contentDocument) {
                    previewFrame.contentDocument.addEventListener('keydown', handleKeydown, true);
                }
            };

            // Try immediately and also after a delay (iframe might not be ready)
            bindToPreview();
            setTimeout(bindToPreview, 1000);
            setTimeout(bindToPreview, 3000);

            // Also listen for Elementor's shortcuts at the window level
            window.addEventListener('keydown', handleKeydown, true);

            // Try to unregister Elementor's CMD+K shortcut
            this.disableElementorShortcut('ctrl+k');
            this.disableElementorShortcut('cmd+k');
        },

        /**
         * Try to disable an Elementor shortcut
         */
        disableElementorShortcut: function (shortcut) {
            const tryDisable = () => {
                try {
                    // Try via $e.shortcuts
                    if (window.$e && window.$e.shortcuts) {
                        const shortcuts = window.$e.shortcuts;
                        if (shortcuts.handlers && shortcuts.handlers[shortcut]) {
                            delete shortcuts.handlers[shortcut];
                        }
                        if (typeof shortcuts.unregister === 'function') {
                            shortcuts.unregister(shortcut);
                        }
                    }

                    // Try via elementor.hotKeys
                    if (window.elementor && window.elementor.hotKeys) {
                        const hotKeys = window.elementor.hotKeys;
                        if (hotKeys.handlers && hotKeys.handlers[shortcut]) {
                            delete hotKeys.handlers[shortcut];
                        }
                    }
                } catch (e) {
                    // Silent fail
                }
            };

            tryDisable();
            setTimeout(tryDisable, 1000);
            setTimeout(tryDisable, 2000);
        },

        /**
         * Handler for CMD+K shortcut - Open Command Palette
         */
        onCommandK: function () {
            if (window.commandPalette) {
                window.commandPalette.toggle();
            }
        },

        /**
         * Aggressively intercept shortcuts using jQuery
         */
        interceptWithJQuery: function () {
            const self = this;

            const setupJQueryIntercept = () => {
                if (!window.jQuery) return;

                // Remove any previous handler
                jQuery(document).off('keydown.efsp');

                // Add our handler
                jQuery(document).on('keydown.efsp', function (e) {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        self.onCommandK();
                        return false;
                    }
                });

                // Try to move our handler to the front
                try {
                    const events = jQuery._data(document, 'events');
                    if (events && events.keydown && events.keydown.length > 1) {
                        // Find and move our handler to the front
                        const idx = events.keydown.findIndex(h => h.namespace === 'efsp');
                        if (idx > 0) {
                            const ourHandler = events.keydown.splice(idx, 1)[0];
                            events.keydown.unshift(ourHandler);
                        }
                    }
                } catch (e) {}
            };

            // Run immediately and with delays to catch late-binding handlers
            setupJQueryIntercept();
            setTimeout(setupJQueryIntercept, 500);
            setTimeout(setupJQueryIntercept, 1500);
            setTimeout(setupJQueryIntercept, 3000);
        },

        /**
         * Handle hover on typography row - show tooltip
         */
        onValueHover: function (e) {
            const target = e.currentTarget;
            const globalId = target.dataset.globalId;

            if (!globalId || !this.typographyCache) {
                return;
            }

            const entry = this.typographyCache[globalId];
            if (!entry) {
                return;
            }

            this.showTooltip(target, entry);
        },

        /**
         * Handle mouse leave - hide tooltip
         */
        onValueLeave: function () {
            this.hideTooltip();
        },

        /**
         * Show tooltip with typography details
         */
        showTooltip: function (target, entry) {
            this.hideTooltip();

            const tooltip = document.createElement('div');
            tooltip.className = 'efsp-tooltip';

            const data = entry.value || {};
            const title = entry.title || 'Typography';

            // Build tooltip content
            let html = `<div class="efsp-tooltip__header">${this.escapeHtml(title)}</div>`;

            // Typography Properties Section
            html += '<div class="efsp-tooltip__section">';
            html += '<div class="efsp-tooltip__section-title"><i class="eicon-typography"></i> Properties</div>';

            // Font Weight
            const fontWeight = data.typography_font_weight || null;
            html += this.buildRow('Weight', fontWeight);

            // Line Height
            const lineHeight = this.formatSizeValue(data.typography_line_height);
            html += this.buildRow('Line Height', lineHeight);

            // Letter Spacing
            const letterSpacing = this.formatSizeValue(data.typography_letter_spacing);
            html += this.buildRow('Letter Spacing', letterSpacing);

            html += '</div>';

            // Responsive Font Sizes Section
            html += '<div class="efsp-tooltip__section">';
            html += '<div class="efsp-tooltip__section-title"><i class="eicon-device-responsive"></i> Font Size</div>';
            html += '<div class="efsp-tooltip__responsive">';

            // Desktop
            const desktopSize = this.formatSizeValue(data.typography_font_size);
            html += this.buildDeviceBox('eicon-device-desktop', desktopSize, 'Desktop');

            // Tablet
            const tabletSize = this.formatSizeValue(data.typography_font_size_tablet);
            html += this.buildDeviceBox('eicon-device-tablet', tabletSize, 'Tablet');

            // Mobile
            const mobileSize = this.formatSizeValue(data.typography_font_size_mobile);
            html += this.buildDeviceBox('eicon-device-mobile', mobileSize, 'Mobile');

            html += '</div>';
            html += '</div>';

            tooltip.innerHTML = html;
            document.body.appendChild(tooltip);

            // Position tooltip
            const rect = target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            let left = rect.left - tooltipRect.width - 10;
            let top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);

            // Keep tooltip in viewport
            if (left < 10) {
                left = rect.right + 10;
            }
            if (top < 10) {
                top = 10;
            }
            if (top + tooltipRect.height > window.innerHeight - 10) {
                top = window.innerHeight - tooltipRect.height - 10;
            }

            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';

            this.activeTooltip = tooltip;
        },

        /**
         * Hide the active tooltip
         */
        hideTooltip: function () {
            if (this.activeTooltip) {
                this.activeTooltip.remove();
                this.activeTooltip = null;
            }
        },

        /**
         * Build a row for the tooltip
         */
        buildRow: function (label, value) {
            const displayValue = value
                ? `<span class="efsp-tooltip__value">${this.escapeHtml(value)}</span>`
                : '<span class="efsp-tooltip__value efsp-tooltip__value--empty">—</span>';

            return `<div class="efsp-tooltip__row">
                <span class="efsp-tooltip__label">${label}</span>
                ${displayValue}
            </div>`;
        },

        /**
         * Build a device box for responsive sizes
         */
        buildDeviceBox: function (iconClass, value, title) {
            const displayValue = value
                ? `<span class="efsp-tooltip__device-value">${this.escapeHtml(value)}</span>`
                : '<span class="efsp-tooltip__device-value efsp-tooltip__device-value--empty">—</span>';

            return `<div class="efsp-tooltip__device" title="${title}">
                <i class="${iconClass}"></i>
                ${displayValue}
            </div>`;
        },

        /**
         * Format a size value object to string
         */
        formatSizeValue: function (sizeObj) {
            if (!sizeObj || sizeObj.size === '' || sizeObj.size === undefined || sizeObj.size === null) {
                return null;
            }
            return sizeObj.size + (sizeObj.unit || 'px');
        },

        /**
         * Escape HTML to prevent XSS
         */
        escapeHtml: function (text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Handle popover toggle click - wait for popover to render then enhance
         */
        onPopoverToggle: function () {
            // Small delay to let the popover render
            setTimeout(() => {
                this.enhanceVisiblePopovers();
            }, 100);
        },

        /**
         * Find and enhance any visible typography popovers
         */
        enhanceVisiblePopovers: function () {
            const popovers = document.querySelectorAll('.e-global__popover');
            popovers.forEach((popover) => this.enhancePopover(popover));
        },

        /**
         * Enhance the typography popover with font values
         */
        enhancePopover: function (popover) {
            const typographyItems = popover.querySelectorAll('.e-global__preview-item.e-global__typography');

            typographyItems.forEach((item) => {
                // Skip if already enhanced
                if (item.querySelector('.efsp-typography-values')) {
                    return;
                }

                const globalId = item.dataset.globalId;
                const values = this.extractTypographyValues(item);

                if (values) {
                    this.appendValuesDisplay(item, values, globalId);
                }
            });
        },

        /**
         * Extract typography values from cached data
         */
        extractTypographyValues: function (item) {
            const globalId = item.dataset.globalId;

            if (!globalId) {
                return null;
            }

            // Get typography data from cache
            if (!this.typographyCache) {
                return null;
            }

            const typographyEntry = this.typographyCache[globalId];
            if (!typographyEntry || !typographyEntry.value) {
                return null;
            }

            const typographyData = typographyEntry.value;
            const values = {};

            // Extract font size (with unit)
            if (typographyData.typography_font_size) {
                const size = typographyData.typography_font_size;
                if (size.size !== '' && size.size !== undefined && size.size !== null) {
                    values.fontSize = size.size + (size.unit || 'px');
                }
            }

            // Extract font weight
            if (typographyData.typography_font_weight) {
                values.fontWeight = typographyData.typography_font_weight;
            }

            return Object.keys(values).length > 0 ? values : null;
        },

        /**
         * Append values display to the typography item
         */
        appendValuesDisplay: function (item, values, globalId) {
            const valuesContainer = document.createElement('span');
            valuesContainer.className = 'efsp-typography-values';
            valuesContainer.dataset.globalId = globalId;

            const parts = [];

            if (values.fontSize) {
                parts.push(values.fontSize);
            }

            if (values.fontWeight) {
                parts.push(values.fontWeight);
            }

            valuesContainer.textContent = parts.join(' / ');
            item.appendChild(valuesContainer);
        }
    };

    /**
     * Heading Visualizer
     *
     * Shows all headings on page with colored borders and TOC
     * Usage: window.showHeadings(true) or window.showHeadings(false)
     */
    const HeadingVisualizer = {
        isActive: false,
        tocElement: null,

        // Colors for each heading level
        colors: {
            h1: '#e74c3c', // Red
            h2: '#e67e22', // Orange
            h3: '#f1c40f', // Yellow
            h4: '#2ecc71', // Green
            h5: '#3498db', // Blue
            h6: '#9b59b6'  // Purple
        },

        /**
         * Toggle heading visualization
         */
        toggle: function (show) {
            const previewFrame = document.getElementById('elementor-preview-iframe');
            if (!previewFrame) {
                console.error('Elementor preview iframe not found');
                return;
            }

            const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
            if (!previewDoc) {
                console.error('Cannot access preview document');
                return;
            }

            if (show) {
                this.show(previewDoc);
            } else {
                this.hide(previewDoc);
            }

            this.isActive = show;
        },

        /**
         * Show heading visualization
         */
        show: function (doc) {
            // Inject styles if not already present
            if (!doc.getElementById('efsp-heading-styles')) {
                const styles = doc.createElement('style');
                styles.id = 'efsp-heading-styles';
                styles.textContent = this.getStyles();
                doc.head.appendChild(styles);
            }

            // Scan headings and create TOC
            const tocItems = this.scanHeadings(doc);
            this.createTOC(doc, tocItems);
        },

        /**
         * Scan all headings and add visualization
         * @returns {Array} Array of TOC items
         */
        scanHeadings: function (doc) {
            const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const tocItems = [];

            headings.forEach((heading, index) => {
                const level = heading.tagName.toLowerCase();
                const color = this.colors[level];

                // Add visualization class
                heading.classList.add('efsp-heading-visualized');
                heading.dataset.efspLevel = level;
                heading.style.setProperty('--efsp-heading-color', color);

                // Add ID if not present (for scrolling)
                if (!heading.id) {
                    heading.id = `efsp-heading-${index}`;
                }

                // Create tag label
                if (!heading.querySelector('.efsp-heading-tag')) {
                    const tag = doc.createElement('span');
                    tag.className = 'efsp-heading-tag';
                    tag.textContent = level.toUpperCase();
                    tag.style.backgroundColor = color;
                    heading.insertBefore(tag, heading.firstChild);
                }

                // Collect for TOC
                tocItems.push({
                    id: heading.id,
                    level: level,
                    text: heading.textContent.replace(level.toUpperCase(), '').trim(),
                    color: color
                });
            });

            return tocItems;
        },

        /**
         * Clear heading visualizations from the document
         */
        clearHeadingVisualizations: function (doc) {
            const headings = doc.querySelectorAll('.efsp-heading-visualized');
            headings.forEach((heading) => {
                heading.classList.remove('efsp-heading-visualized');
                heading.style.removeProperty('--efsp-heading-color');
                const tag = heading.querySelector('.efsp-heading-tag');
                if (tag) tag.remove();
                if (heading.id && heading.id.startsWith('efsp-heading-')) {
                    heading.removeAttribute('id');
                }
            });
        },

        /**
         * Build TOC content (tips, summary, list)
         */
        buildTOCContent: function (doc, toc, items) {
            // Analyze headings and show tips
            const tips = this.analyzeHeadings(items);
            if (tips.length > 0) {
                const tipsContainer = doc.createElement('div');
                tipsContainer.className = 'efsp-floating-panel__tips';
                tips.forEach(tip => {
                    const tipEl = doc.createElement('div');
                    tipEl.className = `efsp-floating-panel__tip efsp-floating-panel__tip--${tip.type}`;
                    tipEl.innerHTML = `<span class="efsp-floating-panel__tip-icon">${tip.type === 'error' ? '✕' : '!'}</span><span>${tip.message}</span>`;
                    tipsContainer.appendChild(tipEl);
                });
                toc.appendChild(tipsContainer);
            }

            // Summary
            const summary = doc.createElement('div');
            summary.className = 'efsp-floating-panel__summary';
            const counts = {};
            items.forEach(item => {
                counts[item.level] = (counts[item.level] || 0) + 1;
            });
            summary.innerHTML = Object.entries(counts)
                .map(([level, count]) => {
                    const isWarning = level === 'h1' && count > 1;
                    return `<span class="efsp-floating-panel__count efsp-heading-toc__count ${isWarning ? 'efsp-heading-toc__count--warning' : ''}" style="color: ${this.colors[level]} !important; border: 1px solid ${this.colors[level]} !important;">${level.toUpperCase()}: ${count}</span>`;
                })
                .join('');
            toc.appendChild(summary);

            // Items list
            const list = doc.createElement('div');
            list.className = 'efsp-floating-panel__list';

            items.forEach((item) => {
                const tocItem = doc.createElement('div');
                tocItem.className = `efsp-floating-panel__item efsp-heading-toc__item--${item.level}`;
                tocItem.dataset.targetId = item.id;

                const indicator = doc.createElement('span');
                indicator.className = 'efsp-heading-toc__indicator';
                indicator.style.backgroundColor = item.color;
                indicator.textContent = item.level.toUpperCase();

                const text = doc.createElement('span');
                text.className = 'efsp-heading-toc__text';
                text.textContent = item.text || '(empty)';

                tocItem.appendChild(indicator);
                tocItem.appendChild(text);

                // Click to scroll
                tocItem.addEventListener('click', () => {
                    const target = doc.getElementById(item.id);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.classList.add('efsp-heading-highlight');
                        setTimeout(() => {
                            target.classList.remove('efsp-heading-highlight');
                        }, 2000);
                    }
                });

                list.appendChild(tocItem);
            });

            toc.appendChild(list);
        },

        /**
         * Hide heading visualization
         */
        hide: function (doc) {
            // Remove visualization from headings
            this.clearHeadingVisualizations(doc);

            // Remove TOC
            this.removeTOC(doc);

            // Remove styles
            const styles = doc.getElementById('efsp-heading-styles');
            if (styles) {
                styles.remove();
            }
        },

        /**
         * Refresh only the content inside the TOC (not the box itself)
         */
        refreshContent: function (doc) {
            const toc = doc.getElementById('efsp-heading-toc');
            if (!toc) return;

            // Clear old visualizations and re-scan
            this.clearHeadingVisualizations(doc);
            const tocItems = this.scanHeadings(doc);

            // Remove old content (tips, summary, list) but keep header
            const oldTips = toc.querySelector('.efsp-floating-panel__tips');
            const oldSummary = toc.querySelector('.efsp-floating-panel__summary');
            const oldList = toc.querySelector('.efsp-floating-panel__list');
            if (oldTips) oldTips.remove();
            if (oldSummary) oldSummary.remove();
            if (oldList) oldList.remove();

            // Build new content
            this.buildTOCContent(doc, toc, tocItems);
        },

        /**
         * Analyze heading structure and return tips
         */
        analyzeHeadings: function (items) {
            const tips = [];
            const counts = {};
            const levels = [];

            items.forEach(item => {
                const levelNum = parseInt(item.level.charAt(1));
                counts[item.level] = (counts[item.level] || 0) + 1;
                levels.push(levelNum);
            });

            // Check for missing H1
            if (!counts.h1 || counts.h1 === 0) {
                tips.push({
                    type: 'error',
                    message: 'Missing H1 heading. Every page should have exactly one H1.'
                });
            }

            // Check for multiple H1s
            if (counts.h1 > 1) {
                tips.push({
                    type: 'error',
                    message: `Multiple H1 headings (${counts.h1}). Use only one H1 per page.`
                });
            }

            // Check for skipped levels
            for (let i = 1; i < levels.length; i++) {
                const diff = levels[i] - levels[i - 1];
                if (diff > 1) {
                    tips.push({
                        type: 'warning',
                        message: `Skipped heading level: H${levels[i - 1]} → H${levels[i]}. Don't skip levels.`
                    });
                    break; // Only show one skipped level warning
                }
            }

            // Check if first heading is not H1
            if (levels.length > 0 && levels[0] !== 1) {
                tips.push({
                    type: 'warning',
                    message: `Page starts with H${levels[0]}. Consider starting with H1.`
                });
            }

            return tips;
        },

        /**
         * Create Table of Contents
         */
        createTOC: function (doc, items) {
            this.removeTOC(doc);

            const self = this;

            // Use FloatingPanel utility
            const toc = window.FloatingPanel.create(doc, {
                id: 'efsp-heading-toc',
                title: 'Heading Structure',
                onClose: () => self.toggle(false),
                onRefresh: () => self.refreshContent(doc)
            });

            // Build TOC content (tips, summary, list)
            this.buildTOCContent(doc, toc, items);

            doc.body.appendChild(toc);
            this.tocElement = toc;
        },

        /**
         * Remove TOC
         */
        removeTOC: function (doc) {
            const toc = doc.getElementById('efsp-heading-toc');
            if (toc) {
                toc.remove();
            }
            this.tocElement = null;
        },

        /**
         * Get CSS styles for heading visualization
         */
        getStyles: function () {
            return `
                .efsp-heading-visualized {
                    position: relative !important;
                    outline: 2px solid var(--efsp-heading-color) !important;
                    outline-offset: 2px !important;
                }

                .efsp-heading-tag {
                    position: absolute !important;
                    top: -10px !important;
                    left: -2px !important;
                    padding: 2px 6px !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    color: #fff !important;
                    border-radius: 3px !important;
                    line-height: 1 !important;
                    z-index: 10000 !important;
                }

                .efsp-heading-highlight {
                    animation: efsp-heading-pulse 0.5s ease-in-out 3 !important;
                }

                @keyframes efsp-heading-pulse {
                    0%, 100% { outline-offset: 2px; }
                    50% { outline-offset: 6px; }
                }

                /* Heading-specific panel styles (extends FloatingPanel) */
                .efsp-heading-toc__count--warning {
                    animation: efsp-warning-pulse 1s ease-in-out infinite !important;
                }

                @keyframes efsp-warning-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .efsp-floating-panel__item.efsp-heading-toc__item--h2 { padding-left: 28px !important; }
                .efsp-floating-panel__item.efsp-heading-toc__item--h3 { padding-left: 42px !important; }
                .efsp-floating-panel__item.efsp-heading-toc__item--h4 { padding-left: 56px !important; }
                .efsp-floating-panel__item.efsp-heading-toc__item--h5 { padding-left: 70px !important; }
                .efsp-floating-panel__item.efsp-heading-toc__item--h6 { padding-left: 84px !important; }

                .efsp-heading-toc__indicator {
                    flex-shrink: 0 !important;
                    font-size: 9px !important;
                    font-weight: 700 !important;
                    padding: 2px 5px !important;
                    border-radius: 3px !important;
                    color: #fff !important;
                }

                .efsp-heading-toc__text {
                    font-size: 12px !important;
                    color: #c0c5ca !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }

                .efsp-floating-panel__item:hover .efsp-heading-toc__text {
                    color: #e0e1e3 !important;
                }
            `;
        }
    };

    // Expose to global scope for console access
    window.HeadingVisualizer = HeadingVisualizer;
    window.showHeadings = function (show) {
        HeadingVisualizer.toggle(show);
    };

    // Initialize when document is ready
    $(document).ready(function () {
        TypographyPreview.init();
    });

})(jQuery);
