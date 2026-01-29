(function () {
    'use strict';

    /**
     * Link Checker Visualizer
     * Shows all links on the page with their destinations,
     * highlighting dead links and external links
     */
    const LinkCheckerVisualizer = {
        isActive: false,
        previewDoc: null,
        previewFrame: null,
        panelElement: null,
        currentDomain: '',

        colors: {
            internal: '#10b981',   // Green for internal links
            external: '#3b82f6',   // Blue for external links
            dead: '#ef4444',       // Red for dead links
            anchor: '#f59e0b'      // Amber for anchor-only links
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
                    // Get current domain from preview
                    try {
                        self.currentDomain = new URL(frame.contentWindow.location.href).hostname;
                    } catch (e) {
                        self.currentDomain = window.location.hostname;
                    }
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
         * Show link visualization
         */
        show: function () {
            // Refresh preview reference
            const frame = document.getElementById('elementor-preview-iframe');
            if (frame && frame.contentDocument) {
                this.previewDoc = frame.contentDocument;
                this.previewFrame = frame;
                try {
                    this.currentDomain = new URL(frame.contentWindow.location.href).hostname;
                } catch (e) {
                    this.currentDomain = window.location.hostname;
                }
            }

            if (!this.previewDoc) return;

            this.hide(); // Clear existing
            this.injectStyles();

            const links = this.scanLinks();
            this.createPanel(links);
            this.addLabelsToElements(links);
        },

        /**
         * Hide all labels and panel
         */
        hide: function () {
            if (this.previewDoc) {
                // Remove labels
                const labels = this.previewDoc.querySelectorAll('.efsp-link-label');
                labels.forEach(label => label.remove());

                // Remove highlights
                const highlighted = this.previewDoc.querySelectorAll('.efsp-has-link');
                highlighted.forEach(el => {
                    el.classList.remove('efsp-has-link', 'efsp-link--internal', 'efsp-link--external', 'efsp-link--dead', 'efsp-link--anchor');
                });

                // Remove panel
                if (window.FloatingPanel) {
                    window.FloatingPanel.remove(this.previewDoc, 'efsp-link-checker-panel');
                }

                // Remove styles
                const style = this.previewDoc.getElementById('efsp-link-checker-styles');
                if (style) style.remove();
            }

            this.panelElement = null;
        },

        /**
         * Inject styles
         */
        injectStyles: function () {
            if (!this.previewDoc) return;

            const existing = this.previewDoc.getElementById('efsp-link-checker-styles');
            if (existing) return;

            const style = this.previewDoc.createElement('style');
            style.id = 'efsp-link-checker-styles';
            style.textContent = `
                .efsp-link-label {
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
                    padding: 3px 6px !important;
                    border-radius: 3px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 4px !important;
                }

                .efsp-link-label--internal {
                    background: ${this.colors.internal} !important;
                    color: #fff !important;
                }

                .efsp-link-label--external {
                    background: ${this.colors.external} !important;
                    color: #fff !important;
                }

                .efsp-link-label--dead {
                    background: ${this.colors.dead} !important;
                    color: #fff !important;
                }

                .efsp-link-label--anchor {
                    background: ${this.colors.anchor} !important;
                    color: #000 !important;
                }

                .efsp-has-link {
                    outline: 2px dashed currentColor !important;
                    outline-offset: -1px !important;
                }

                .efsp-link--internal { outline-color: ${this.colors.internal} !important; }
                .efsp-link--external { outline-color: ${this.colors.external} !important; }
                .efsp-link--dead { outline-color: ${this.colors.dead} !important; }
                .efsp-link--anchor { outline-color: ${this.colors.anchor} !important; }

                .efsp-link-highlight {
                    animation: efsp-link-pulse 0.5s ease-in-out 3 !important;
                }

                @keyframes efsp-link-pulse {
                    0%, 100% { outline-offset: -1px; }
                    50% { outline-offset: 4px; }
                }

                /* Panel-specific Styles */
                .efsp-link-panel__item {
                    align-items: flex-start !important;
                }

                .efsp-link-panel__type {
                    flex-shrink: 0 !important;
                    font-size: 9px !important;
                    font-weight: 600 !important;
                    padding: 2px 5px !important;
                    border-radius: 3px !important;
                    color: #fff !important;
                    text-transform: uppercase !important;
                    min-width: 50px !important;
                    text-align: center !important;
                }

                .efsp-link-panel__type--internal { background: ${this.colors.internal} !important; }
                .efsp-link-panel__type--external { background: ${this.colors.external} !important; }
                .efsp-link-panel__type--dead { background: ${this.colors.dead} !important; }
                .efsp-link-panel__type--anchor { background: ${this.colors.anchor} !important; color: #000 !important; }

                .efsp-link-panel__content {
                    flex: 1 !important;
                    min-width: 0 !important;
                }

                .efsp-link-panel__text {
                    font-size: 12px !important;
                    color: #e0e1e3 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    margin-bottom: 3px !important;
                }

                .efsp-link-panel__url {
                    font-size: 10px !important;
                    color: #9da5ae !important;
                    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, monospace !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 4px !important;
                }

                .efsp-link-panel__url-icon {
                    flex-shrink: 0 !important;
                    font-size: 10px !important;
                }

                .efsp-link-panel__external-icon {
                    color: ${this.colors.external} !important;
                }

                .efsp-link-panel__empty {
                    padding: 20px 14px !important;
                    text-align: center !important;
                    color: #9da5ae !important;
                    font-size: 12px !important;
                }

                .efsp-link-panel__section {
                    padding: 8px 14px 4px !important;
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    color: #6b7280 !important;
                    letter-spacing: 0.5px !important;
                    border-top: 1px solid #2a2d31 !important;
                    margin-top: 4px !important;
                }

                .efsp-link-panel__section:first-child {
                    border-top: none !important;
                    margin-top: 0 !important;
                }

                .efsp-link-panel__open {
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

                .efsp-link-panel__open:hover {
                    background: rgba(59, 130, 246, 0.2) !important;
                    color: ${this.colors.external} !important;
                }
            `;
            this.previewDoc.head.appendChild(style);
        },

        /**
         * Scan all links in the preview
         */
        scanLinks: function () {
            if (!this.previewDoc) return [];

            const links = [];
            const allLinks = this.previewDoc.querySelectorAll('a[href]');

            allLinks.forEach((link, index) => {
                const href = link.getAttribute('href') || '';
                const text = link.textContent?.trim() || link.getAttribute('title') || '(no text)';
                const linkType = this.classifyLink(href);

                links.push({
                    id: `link-${index}`,
                    element: link,
                    href: href,
                    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                    fullText: text,
                    type: linkType,
                    displayUrl: this.getDisplayUrl(href, linkType)
                });
            });

            return links;
        },

        /**
         * Classify a link as internal, external, dead, or anchor
         */
        classifyLink: function (href) {
            if (!href || href === '#' || href === 'javascript:void(0)' || href === 'javascript:;') {
                return 'dead';
            }

            if (href.startsWith('#')) {
                return 'anchor';
            }

            try {
                const url = new URL(href, this.previewDoc.location.href);

                if (url.hostname === this.currentDomain || url.hostname === '') {
                    return 'internal';
                }

                return 'external';
            } catch (e) {
                // Relative URLs are internal
                if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
                    return 'internal';
                }
                return 'dead';
            }
        },

        /**
         * Get display-friendly URL
         */
        getDisplayUrl: function (href, linkType) {
            if (linkType === 'dead') {
                return href || '(empty)';
            }

            if (linkType === 'anchor') {
                return href;
            }

            try {
                const url = new URL(href, this.previewDoc.location.href);

                if (linkType === 'external') {
                    return url.hostname + url.pathname;
                }

                return url.pathname + url.search + url.hash;
            } catch (e) {
                return href;
            }
        },

        /**
         * Add labels to link elements
         */
        addLabelsToElements: function (links) {
            if (!this.previewDoc) return;

            links.forEach(link => {
                const element = link.element;
                if (!element) return;

                element.classList.add('efsp-has-link', `efsp-link--${link.type}`);

                // Ensure element has relative positioning
                const computedStyle = this.previewDoc.defaultView.getComputedStyle(element);
                if (computedStyle.position === 'static') {
                    element.style.position = 'relative';
                }

                // Create label
                const label = this.previewDoc.createElement('div');
                label.className = `efsp-link-label efsp-link-label--${link.type}`;

                const icon = link.type === 'external' ? '↗' : (link.type === 'dead' ? '⚠' : (link.type === 'anchor' ? '#' : '→'));
                label.innerHTML = `${icon} ${link.type}`;

                element.appendChild(label);
            });
        },

        /**
         * Create floating panel
         */
        createPanel: function (links) {
            if (!this.previewDoc) return;

            const self = this;

            // Use FloatingPanel utility
            const panel = window.FloatingPanel.create(this.previewDoc, {
                id: 'efsp-link-checker-panel',
                title: 'Link Checker',
                onClose: () => self.toggle(false),
                onRefresh: () => self.refresh()
            });

            panel.style.setProperty('width', '420px', 'important');

            // Categorize links
            const deadLinks = links.filter(l => l.type === 'dead');
            const anchorLinks = links.filter(l => l.type === 'anchor');
            const externalLinks = links.filter(l => l.type === 'external');
            const internalLinks = links.filter(l => l.type === 'internal');

            // Summary
            window.FloatingPanel.addSection(
                this.previewDoc,
                panel,
                'efsp-floating-panel__summary',
                `<span class="efsp-floating-panel__count" style="background: ${this.colors.dead} !important; color: #fff !important;">Dead: ${deadLinks.length}</span>
                 <span class="efsp-floating-panel__count" style="background: ${this.colors.anchor} !important; color: #000 !important;">Anchor: ${anchorLinks.length}</span>
                 <span class="efsp-floating-panel__count" style="background: ${this.colors.external} !important; color: #fff !important;">External: ${externalLinks.length}</span>
                 <span class="efsp-floating-panel__count" style="background: ${this.colors.internal} !important; color: #fff !important;">Internal: ${internalLinks.length}</span>`
            );

            // List
            const list = window.FloatingPanel.addSection(
                this.previewDoc,
                panel,
                'efsp-floating-panel__list',
                ''
            );

            if (links.length === 0) {
                list.innerHTML = '<div class="efsp-link-panel__empty">No links found on this page.</div>';
            } else {
                // Dead links first (warnings)
                if (deadLinks.length > 0) {
                    this.addSectionHeader(list, `Dead Links (${deadLinks.length})`);
                    deadLinks.forEach(link => this.addLinkItem(list, link));
                }

                // Anchor links
                if (anchorLinks.length > 0) {
                    this.addSectionHeader(list, `Anchor Links (${anchorLinks.length})`);
                    anchorLinks.forEach(link => this.addLinkItem(list, link));
                }

                // External links
                if (externalLinks.length > 0) {
                    this.addSectionHeader(list, `External Links (${externalLinks.length})`);
                    externalLinks.forEach(link => this.addLinkItem(list, link));
                }

                // Internal links
                if (internalLinks.length > 0) {
                    this.addSectionHeader(list, `Internal Links (${internalLinks.length})`);
                    internalLinks.forEach(link => this.addLinkItem(list, link));
                }
            }

            this.previewDoc.body.appendChild(panel);
            this.panelElement = panel;
        },

        /**
         * Add section header to list
         */
        addSectionHeader: function (list, title) {
            const header = this.previewDoc.createElement('div');
            header.className = 'efsp-link-panel__section';
            header.textContent = title;
            list.appendChild(header);
        },

        /**
         * Add a link item to the list
         */
        addLinkItem: function (list, link) {
            const item = this.previewDoc.createElement('div');
            item.className = 'efsp-floating-panel__item efsp-link-panel__item';
            item.dataset.linkId = link.id;

            const externalIcon = link.type === 'external'
                ? '<i class="eicon-editor-external-link efsp-link-panel__external-icon"></i>'
                : '';

            item.innerHTML = `
                <span class="efsp-link-panel__type efsp-link-panel__type--${link.type}">${link.type}</span>
                <div class="efsp-link-panel__content">
                    <div class="efsp-link-panel__text">${this.escapeHtml(link.text)}</div>
                    <div class="efsp-link-panel__url">
                        ${externalIcon}
                        <span>${this.escapeHtml(link.displayUrl)}</span>
                    </div>
                </div>
                ${link.type !== 'dead' ? `
                <div class="efsp-link-panel__open" title="Open link in new tab">
                    <i class="eicon-editor-external-link"></i>
                </div>
                ` : ''}
            `;

            // Click to scroll and highlight
            item.addEventListener('click', (e) => {
                if (e.target.closest('.efsp-link-panel__open')) {
                    // Open link in new tab
                    if (link.href && link.href !== '#') {
                        window.open(link.href, '_blank');
                    }
                    return;
                }

                const target = link.element;
                if (target) {
                    // Find parent Elementor widget
                    const widget = target.closest('[data-id]');
                    const scrollTarget = widget || target;

                    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('efsp-link-highlight');
                    setTimeout(() => {
                        target.classList.remove('efsp-link-highlight');
                    }, 2000);

                    // Select widget in Elementor if found
                    if (widget) {
                        const elementId = widget.dataset.id;
                        const container = window.elementor?.getContainer(elementId);
                        if (container) {
                            window.$e?.run('document/elements/select', { container });
                        }
                    }
                }
            });

            list.appendChild(item);
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
        refresh: function () {
            if (this.isActive) {
                this.show();
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LinkCheckerVisualizer.init());
    } else {
        LinkCheckerVisualizer.init();
    }

    // Expose to global scope
    window.LinkCheckerVisualizer = LinkCheckerVisualizer;

})();
