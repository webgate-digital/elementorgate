(function () {
    'use strict';

    /**
     * Custom CSS Visualizer
     * Shows which elements have custom CSS with badges and a hierarchical panel
     * displaying line counts for each element
     */
    const CustomCssVisualizer = {
        isActive: false,
        previewDoc: null,
        previewFrame: null,
        panelElement: null,

        colors: {
            css: '#f59e0b',      // Amber for custom CSS
            empty: '#6b7280'    // Gray for elements without CSS
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
         * Show custom CSS visualization
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
                const labels = this.previewDoc.querySelectorAll('.efsp-custom-css-label');
                labels.forEach(label => label.remove());

                // Remove highlights
                const highlighted = this.previewDoc.querySelectorAll('.efsp-has-custom-css');
                highlighted.forEach(el => {
                    el.classList.remove('efsp-has-custom-css');
                });

                // Remove panel using FloatingPanel utility
                if (window.FloatingPanel) {
                    window.FloatingPanel.remove(this.previewDoc, 'efsp-custom-css-panel');
                }

                // Remove styles
                const style = this.previewDoc.getElementById('efsp-custom-css-visualizer-styles');
                if (style) style.remove();
            }

            this.panelElement = null;
        },

        /**
         * Inject styles into preview
         */
        injectStyles: function () {
            if (!this.previewDoc) return;

            const existing = this.previewDoc.getElementById('efsp-custom-css-visualizer-styles');
            if (existing) return;

            const style = this.previewDoc.createElement('style');
            style.id = 'efsp-custom-css-visualizer-styles';
            style.textContent = `
                .efsp-custom-css-label {
                    position: absolute !important;
                    z-index: 10000 !important;
                    top: 0 !important;
                    left: 0 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    line-height: 1 !important;
                    white-space: nowrap !important;
                    pointer-events: none !important;
                    background: ${this.colors.css} !important;
                    color: #000 !important;
                    padding: 3px 6px !important;
                    border-radius: 3px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 4px !important;
                }

                .efsp-custom-css-label__icon {
                    font-size: 10px !important;
                }

                .efsp-has-custom-css {
                    outline: 2px dashed ${this.colors.css} !important;
                    outline-offset: -1px !important;
                }

                .efsp-custom-css-highlight {
                    animation: efsp-custom-css-pulse 0.5s ease-in-out 3 !important;
                }

                @keyframes efsp-custom-css-pulse {
                    0%, 100% { outline-offset: -1px; }
                    50% { outline-offset: 4px; }
                }

                /* Panel-specific Styles (extends FloatingPanel) */
                .efsp-custom-css-panel__item {
                    align-items: flex-start !important;
                }
                .efsp-custom-css-panel__item--depth-1 { padding-left: 28px !important; }
                .efsp-custom-css-panel__item--depth-2 { padding-left: 42px !important; }
                .efsp-custom-css-panel__item--depth-3 { padding-left: 56px !important; }
                .efsp-custom-css-panel__item--depth-4 { padding-left: 70px !important; }
                .efsp-custom-css-panel__item--depth-5 { padding-left: 84px !important; }

                .efsp-custom-css-panel__type {
                    flex-shrink: 0 !important;
                    font-size: 9px !important;
                    font-weight: 600 !important;
                    padding: 2px 5px !important;
                    border-radius: 3px !important;
                    color: #fff !important;
                    background: #404349 !important;
                    text-transform: uppercase !important;
                }

                .efsp-custom-css-panel__content {
                    flex: 1 !important;
                    min-width: 0 !important;
                }

                .efsp-custom-css-panel__name {
                    font-size: 12px !important;
                    color: #e0e1e3 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                }

                .efsp-custom-css-panel__lines {
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    padding: 2px 6px !important;
                    border-radius: 10px !important;
                    background: ${this.colors.css} !important;
                    color: #000 !important;
                    flex-shrink: 0 !important;
                }

                .efsp-custom-css-panel__preview {
                    font-size: 10px !important;
                    color: #9da5ae !important;
                    margin-top: 4px !important;
                    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, monospace !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    max-width: 280px !important;
                }

                .efsp-custom-css-panel__empty {
                    padding: 20px 14px !important;
                    text-align: center !important;
                    color: #9da5ae !important;
                    font-size: 12px !important;
                }

                .efsp-custom-css-panel__actions {
                    display: flex !important;
                    align-items: center !important;
                    gap: 4px !important;
                    margin-left: auto !important;
                    flex-shrink: 0 !important;
                }

                .efsp-custom-css-panel__eye,
                .efsp-custom-css-panel__gear {
                    width: 24px !important;
                    height: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    cursor: pointer !important;
                    border-radius: 4px !important;
                    color: #6b7280 !important;
                    font-size: 12px !important;
                    transition: all 0.15s !important;
                    flex-shrink: 0 !important;
                }

                .efsp-custom-css-panel__eye:hover,
                .efsp-custom-css-panel__gear:hover {
                    background: rgba(245, 158, 11, 0.2) !important;
                    color: ${this.colors.css} !important;
                }

                .efsp-custom-css-panel__eye i,
                .efsp-custom-css-panel__gear i {
                    font-size: 12px !important;
                }

                /* Code Preview Modal */
                .efsp-code-preview-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.6) !important;
                    z-index: 100000 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                .efsp-code-preview-modal {
                    background: #1e2124 !important;
                    border-radius: 8px !important;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
                    width: 600px !important;
                    max-width: 90vw !important;
                    max-height: 80vh !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                }

                .efsp-code-preview-header {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 12px 16px !important;
                    border-bottom: 1px solid #2a2d31 !important;
                    background: #26292d !important;
                }

                .efsp-code-preview-title {
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: #e0e1e3 !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                }

                .efsp-code-preview-title span {
                    background: ${this.colors.css} !important;
                    color: #000 !important;
                    padding: 2px 6px !important;
                    border-radius: 4px !important;
                    font-size: 10px !important;
                }

                .efsp-code-preview-close {
                    width: 28px !important;
                    height: 28px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    cursor: pointer !important;
                    border-radius: 4px !important;
                    color: #9da5ae !important;
                    font-size: 14px !important;
                    transition: all 0.15s !important;
                }

                .efsp-code-preview-close:hover {
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: #e0e1e3 !important;
                }

                .efsp-code-preview-content {
                    flex: 1 !important;
                    overflow: auto !important;
                    padding: 16px !important;
                }

                .efsp-code-preview-code {
                    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace !important;
                    font-size: 12px !important;
                    line-height: 1.6 !important;
                    color: #e0e1e3 !important;
                    white-space: pre-wrap !important;
                    word-break: break-word !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: transparent !important;
                }

                .efsp-code-preview-footer {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 10px 16px !important;
                    border-top: 1px solid #2a2d31 !important;
                    background: #26292d !important;
                    font-size: 11px !important;
                    color: #9da5ae !important;
                }

                .efsp-code-preview-copy {
                    padding: 6px 12px !important;
                    background: ${this.colors.css} !important;
                    color: #000 !important;
                    border: none !important;
                    border-radius: 4px !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: all 0.15s !important;
                }

                .efsp-code-preview-copy:hover {
                    filter: brightness(1.1) !important;
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
            const customCss = settings.custom_css || '';
            const elType = container.model?.get('elType') || 'element';
            const widgetType = container.model?.get('widgetType');
            const label = settings._title || widgetType || elType;

            // Count non-empty lines
            const lines = customCss.split('\n').filter(line => line.trim().length > 0);
            const lineCount = lines.length;

            // Get first line as preview (truncated)
            const preview = lines.length > 0 ? lines[0].trim().substring(0, 50) : '';

            if (customCss && customCss.trim()) {
                items.push({
                    id: container.id,
                    customCss: customCss,
                    lineCount: lineCount,
                    preview: preview,
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

                element.classList.add('efsp-has-custom-css');

                // Ensure element has relative positioning
                const computedStyle = this.previewDoc.defaultView.getComputedStyle(element);
                if (computedStyle.position === 'static') {
                    element.style.position = 'relative';
                }

                // Create label
                const label = this.previewDoc.createElement('div');
                label.className = 'efsp-custom-css-label';
                label.innerHTML = `<span class="efsp-custom-css-label__icon">{}</span> CSS: ${item.lineCount} line${item.lineCount !== 1 ? 's' : ''}`;

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
                id: 'efsp-custom-css-panel',
                title: 'Custom CSS',
                onClose: () => self.toggle(false),
                onRefresh: () => self.refresh()
            });

            // Add custom width
            panel.style.setProperty('width', '400px', 'important');

            // Summary
            const totalLines = items.reduce((sum, item) => sum + item.lineCount, 0);
            const elementCount = items.length;

            window.FloatingPanel.addSection(
                this.previewDoc,
                panel,
                'efsp-floating-panel__summary',
                `<span class="efsp-floating-panel__count" style="background: ${this.colors.css} !important; color: #000 !important;">Elements: ${elementCount}</span>
                 <span class="efsp-floating-panel__count" style="background: ${this.colors.css} !important; color: #000 !important;">Total Lines: ${totalLines}</span>`
            );

            // List
            const list = window.FloatingPanel.addSection(
                this.previewDoc,
                panel,
                'efsp-floating-panel__list efsp-custom-css-panel__list',
                ''
            );

            if (items.length === 0) {
                list.innerHTML = '<div class="efsp-custom-css-panel__empty">No custom CSS found.<br>Add custom CSS in Advanced tab → Custom CSS</div>';
            } else {
                items.forEach(item => {
                    const itemEl = this.previewDoc.createElement('div');
                    const depthClass = item.depth > 0 ? ` efsp-custom-css-panel__item--depth-${Math.min(item.depth, 5)}` : '';
                    itemEl.className = `efsp-floating-panel__item efsp-custom-css-panel__item${depthClass}`;
                    itemEl.dataset.targetId = item.id;

                    itemEl.innerHTML = `
                        <span class="efsp-custom-css-panel__type">${this.escapeHtml(item.type)}</span>
                        <div class="efsp-custom-css-panel__content">
                            <div class="efsp-custom-css-panel__name">
                                <span>${this.escapeHtml(item.label)}</span>
                                <span class="efsp-custom-css-panel__lines">${item.lineCount} line${item.lineCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="efsp-custom-css-panel__preview">${this.escapeHtml(item.preview)}${item.preview.length >= 50 ? '...' : ''}</div>
                        </div>
                        <div class="efsp-custom-css-panel__actions">
                            <div class="efsp-custom-css-panel__eye" title="Preview CSS Code">
                                <i class="eicon-preview-medium"></i>
                            </div>
                            <div class="efsp-custom-css-panel__gear" title="Edit Custom CSS">
                                <i class="eicon-cog"></i>
                            </div>
                        </div>
                    `;

                    const eyeBtn = itemEl.querySelector('.efsp-custom-css-panel__eye');
                    const gearBtn = itemEl.querySelector('.efsp-custom-css-panel__gear');

                    // Click on eye to preview code
                    eyeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showCodePreview(item);
                    });

                    // Click on gear to select and open Custom CSS settings
                    gearBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openCustomCssSettings(item.id);
                    });

                    // Click on row to scroll and highlight
                    itemEl.addEventListener('click', (e) => {
                        if (e.target.closest('.efsp-custom-css-panel__actions')) return;

                        const target = this.previewDoc.querySelector(`[data-id="${item.id}"]`);
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            target.classList.add('efsp-custom-css-highlight');
                            setTimeout(() => {
                                target.classList.remove('efsp-custom-css-highlight');
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
         * Open Custom CSS settings for an element
         */
        openCustomCssSettings: function (elementId) {
            const container = window.elementor?.getContainer(elementId);
            if (!container) return;

            // Select the element
            window.$e?.run('document/elements/select', { container });

            // Small delay to ensure element is selected, then open Advanced tab
            setTimeout(() => {
                // Route to the element's editor panel
                window.$e?.route('panel/editor/advanced');

                // After routing, try to expand the Custom CSS section
                setTimeout(() => {
                    // Find and click the Custom CSS section to expand it
                    const customCssSection = document.querySelector('.elementor-control-section-custom_css');
                    if (customCssSection) {
                        // Check if it's collapsed
                        if (customCssSection.classList.contains('elementor-tab-close')) {
                            const sectionTitle = customCssSection.querySelector('.elementor-panel-heading-title');
                            if (sectionTitle) {
                                sectionTitle.click();
                            }
                        }

                        // Scroll section into view in the panel
                        customCssSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }, 50);
        },

        /**
         * Show code preview modal
         */
        showCodePreview: function (item) {
            // Remove existing modal if any
            this.closeCodePreview();

            const overlay = this.previewDoc.createElement('div');
            overlay.className = 'efsp-code-preview-overlay';
            overlay.id = 'efsp-code-preview-overlay';

            const modal = this.previewDoc.createElement('div');
            modal.className = 'efsp-code-preview-modal';

            modal.innerHTML = `
                <div class="efsp-code-preview-header">
                    <div class="efsp-code-preview-title">
                        ${this.escapeHtml(item.label)}
                        <span>${item.lineCount} line${item.lineCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="efsp-code-preview-close" title="Close (Esc)">
                        <i class="eicon-close"></i>
                    </div>
                </div>
                <div class="efsp-code-preview-content">
                    <pre class="efsp-code-preview-code">${this.escapeHtml(item.customCss)}</pre>
                </div>
                <div class="efsp-code-preview-footer">
                    <span>${this.escapeHtml(item.type)} element</span>
                    <button class="efsp-code-preview-copy">Copy to Clipboard</button>
                </div>
            `;

            overlay.appendChild(modal);
            this.previewDoc.body.appendChild(overlay);

            // Close button
            const closeBtn = modal.querySelector('.efsp-code-preview-close');
            closeBtn.addEventListener('click', () => this.closeCodePreview());

            // Click overlay to close
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeCodePreview();
                }
            });

            // Copy button
            const copyBtn = modal.querySelector('.efsp-code-preview-copy');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(item.customCss).then(() => {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy to Clipboard';
                    }, 2000);
                });
            });

            // ESC key to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeCodePreview();
                    this.previewDoc.removeEventListener('keydown', escHandler);
                }
            };
            this.previewDoc.addEventListener('keydown', escHandler);
        },

        /**
         * Close code preview modal
         */
        closeCodePreview: function () {
            const overlay = this.previewDoc?.getElementById('efsp-code-preview-overlay');
            if (overlay) {
                overlay.remove();
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
        document.addEventListener('DOMContentLoaded', () => CustomCssVisualizer.init());
    } else {
        CustomCssVisualizer.init();
    }

    // Expose to global scope
    window.CustomCssVisualizer = CustomCssVisualizer;

})();
