(function () {
    'use strict';

    /**
     * CSS ID/Class Visualizer
     * Shows custom CSS classes and IDs added to Elementor elements
     * with a floating panel showing hierarchy
     */
    const CssIdVisualizer = {
        isActive: false,
        previewDoc: null,
        previewFrame: null,
        panelElement: null,

        colors: {
            id: '#7c3aed',      // Purple for IDs
            class: '#0891b2'    // Cyan for classes
        },

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
         * Show CSS IDs and classes
         */
        show: function () {
            // Refresh preview reference
            const frame = document.getElementById('elementor-preview-iframe');
            if (frame && frame.contentDocument) {
                this.previewDoc = frame.contentDocument;
                this.previewFrame = frame;
            }

            if (!this.previewDoc) return;

            this.hide(); // Clear existing
            this.injectStyles();

            const items = this.scanElements();
            this.createPanel(items);
            this.addLabelsToElements(items);
        },

        /**
         * Hide all labels and panel
         */
        hide: function () {
            if (this.previewDoc) {
                // Remove labels
                const labels = this.previewDoc.querySelectorAll('.efsp-css-label');
                labels.forEach(label => label.remove());

                // Remove highlights
                const highlighted = this.previewDoc.querySelectorAll('.efsp-has-css-info');
                highlighted.forEach(el => {
                    el.classList.remove('efsp-has-css-info');
                });

                // Remove panel
                const panel = this.previewDoc.getElementById('efsp-css-panel');
                if (panel) panel.remove();

                // Remove styles
                const style = this.previewDoc.getElementById('efsp-css-visualizer-styles');
                if (style) style.remove();
            }

            this.panelElement = null;
        },

        /**
         * Inject styles into preview
         */
        injectStyles: function () {
            if (!this.previewDoc) return;

            const existing = this.previewDoc.getElementById('efsp-css-visualizer-styles');
            if (existing) return;

            const style = this.previewDoc.createElement('style');
            style.id = 'efsp-css-visualizer-styles';
            style.textContent = `
                .efsp-css-label {
                    position: absolute !important;
                    z-index: 10000 !important;
                    top: 0 !important;
                    left: 0 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    font-size: 10px !important;
                    font-weight: 500 !important;
                    line-height: 1 !important;
                    white-space: nowrap !important;
                    pointer-events: none !important;
                }
                .efsp-css-label__id {
                    background: ${this.colors.id} !important;
                    color: #fff !important;
                    padding: 3px 6px !important;
                    border-radius: 3px 0 0 3px !important;
                    display: inline-block !important;
                }
                .efsp-css-label__class {
                    background: ${this.colors.class} !important;
                    color: #fff !important;
                    padding: 3px 6px !important;
                    border-radius: 0 3px 3px 0 !important;
                    display: inline-block !important;
                }
                .efsp-css-label__id:only-child {
                    border-radius: 3px !important;
                }
                .efsp-css-label__class:first-child {
                    border-radius: 3px !important;
                }
                .efsp-has-css-info {
                    outline: 1px dashed ${this.colors.class} !important;
                    outline-offset: -1px !important;
                }
                .efsp-css-highlight {
                    animation: efsp-css-pulse 0.5s ease-in-out 3 !important;
                }
                @keyframes efsp-css-pulse {
                    0%, 100% { outline-offset: -1px; }
                    50% { outline-offset: 4px; }
                }

                /* Panel-specific Styles (extends FloatingPanel) */
                .efsp-css-panel__item {
                    align-items: flex-start !important;
                }
                .efsp-css-panel__item--depth-1 { padding-left: 28px !important; }
                .efsp-css-panel__item--depth-2 { padding-left: 42px !important; }
                .efsp-css-panel__item--depth-3 { padding-left: 56px !important; }
                .efsp-css-panel__item--depth-4 { padding-left: 70px !important; }
                .efsp-css-panel__item--depth-5 { padding-left: 84px !important; }
                .efsp-css-panel__type {
                    flex-shrink: 0 !important;
                    font-size: 9px !important;
                    font-weight: 600 !important;
                    padding: 2px 5px !important;
                    border-radius: 3px !important;
                    color: #fff !important;
                    background: #404349 !important;
                    text-transform: uppercase !important;
                }
                .efsp-css-panel__content {
                    flex: 1 !important;
                    min-width: 0 !important;
                }
                .efsp-css-panel__values {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 4px !important;
                    margin-top: 4px !important;
                }
                .efsp-css-panel__id {
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    color: ${this.colors.id} !important;
                }
                .efsp-css-panel__class {
                    font-size: 11px !important;
                    color: ${this.colors.class} !important;
                }
                .efsp-css-panel__name {
                    font-size: 11px !important;
                    color: #9da5ae !important;
                }
            `;
            this.previewDoc.head.appendChild(style);
        },

        /**
         * Scan all Elementor elements for custom CSS
         */
        scanElements: function () {
            if (!this.previewDoc || !window.elementor) return [];

            const preview = window.elementor.getPreviewContainer();
            if (!preview) return [];

            const items = [];
            this.traverseContainer(preview, items, 0);
            return items;
        },

        /**
         * Traverse container tree
         */
        traverseContainer: function (container, items, depth) {
            if (!container) return;

            const settings = container.settings?.attributes || {};
            const cssId = settings.css_id || settings._element_id || '';
            const cssClasses = settings.css_classes || settings._css_classes || '';
            const elType = container.model?.get('elType') || 'element';
            const widgetType = container.model?.get('widgetType');
            const label = settings._title || widgetType || elType;

            if (cssId || cssClasses) {
                items.push({
                    id: container.id,
                    cssId: cssId,
                    cssClasses: cssClasses,
                    depth: depth,
                    type: widgetType || elType,
                    label: label
                });
            }

            if (container.children) {
                container.children.forEach(child => {
                    this.traverseContainer(child, items, depth + 1);
                });
            }
        },

        /**
         * Add labels to elements in preview
         */
        addLabelsToElements: function (items) {
            if (!this.previewDoc) return;

            items.forEach(item => {
                const element = this.previewDoc.querySelector(`[data-id="${item.id}"]`);
                if (!element) return;

                element.classList.add('efsp-has-css-info');

                // Ensure element has relative positioning
                const computedStyle = this.previewDoc.defaultView.getComputedStyle(element);
                if (computedStyle.position === 'static') {
                    element.style.position = 'relative';
                }

                // Create label
                const label = this.previewDoc.createElement('div');
                label.className = 'efsp-css-label';

                let html = '';
                if (item.cssId) {
                    html += `<span class="efsp-css-label__id">#${this.escapeHtml(item.cssId)}</span>`;
                }
                if (item.cssClasses) {
                    html += `<span class="efsp-css-label__class">.${this.escapeHtml(item.cssClasses.replace(/\s+/g, ' .'))}</span>`;
                }
                label.innerHTML = html;

                element.appendChild(label);
            });
        },

        /**
         * Create floating panel
         */
        createPanel: function (items) {
            if (!this.previewDoc) return;

            const self = this;

            // Use FloatingPanel utility
            const panel = window.FloatingPanel.create(this.previewDoc, {
                id: 'efsp-css-panel',
                title: 'CSS Classes & IDs',
                onClose: () => self.toggle(false),
                onRefresh: () => self.refresh()
            });

            // Add custom width
            panel.style.setProperty('width', '320px', 'important');

            // Summary
            const idCount = items.filter(i => i.cssId).length;
            const classCount = items.filter(i => i.cssClasses).length;

            const summary = window.FloatingPanel.addSection(
                this.previewDoc,
                panel,
                'efsp-floating-panel__summary efsp-css-panel__summary',
                `<span class="efsp-floating-panel__count efsp-css-panel__count--id" style="background: ${this.colors.id} !important; color: #fff !important;">IDs: ${idCount}</span>
                 <span class="efsp-floating-panel__count efsp-css-panel__count--class" style="background: ${this.colors.class} !important; color: #fff !important;">Classes: ${classCount}</span>`
            );

            // List
            const list = window.FloatingPanel.addSection(
                this.previewDoc,
                panel,
                'efsp-floating-panel__list efsp-css-panel__list',
                ''
            );

            if (items.length === 0) {
                list.innerHTML = '<div class="efsp-floating-panel__empty">No custom CSS IDs or classes found.<br>Add them in Advanced tab → CSS ID / CSS Classes</div>';
            } else {
                items.forEach(item => {
                    const itemEl = this.previewDoc.createElement('div');
                    const depthClass = item.depth > 0 ? ` efsp-css-panel__item--depth-${Math.min(item.depth, 5)}` : '';
                    itemEl.className = `efsp-floating-panel__item efsp-css-panel__item${depthClass}`;
                    itemEl.dataset.targetId = item.id;

                    let valuesHtml = '';
                    if (item.cssId) {
                        valuesHtml += `<span class="efsp-css-panel__id">#${this.escapeHtml(item.cssId)}</span>`;
                    }
                    if (item.cssClasses) {
                        const classes = item.cssClasses.split(/\s+/).filter(c => c);
                        classes.forEach(c => {
                            valuesHtml += `<span class="efsp-css-panel__class">.${this.escapeHtml(c)}</span>`;
                        });
                    }

                    itemEl.innerHTML = `
                        <span class="efsp-css-panel__type">${this.escapeHtml(item.type)}</span>
                        <div class="efsp-css-panel__content">
                            <div class="efsp-css-panel__name">${this.escapeHtml(item.label)}</div>
                            <div class="efsp-css-panel__values">${valuesHtml}</div>
                        </div>
                    `;

                    // Click to scroll and select
                    itemEl.addEventListener('click', () => {
                        const target = this.previewDoc.querySelector(`[data-id="${item.id}"]`);
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            target.classList.add('efsp-css-highlight');
                            setTimeout(() => {
                                target.classList.remove('efsp-css-highlight');
                            }, 2000);

                            // Also select in Elementor
                            const container = window.elementor?.getContainer(item.id);
                            if (container) {
                                window.$e?.run('document/elements/select', { container });
                            }
                        }
                    });

                    list.appendChild(itemEl);
                });
            }

            this.previewDoc.body.appendChild(panel);
            this.panelElement = panel;
        },

        /**
         * Escape HTML
         */
        escapeHtml: function (text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Refresh (call after DOM changes)
         */
        refresh: function () {
            if (this.isActive) {
                this.show();
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CssIdVisualizer.init());
    } else {
        CssIdVisualizer.init();
    }

    // Expose to global scope
    window.CssIdVisualizer = CssIdVisualizer;

})();
