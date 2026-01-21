(function () {
    'use strict';

    /**
     * Keyboard Navigation for Elementor Elements
     *
     * Shortcuts (Alt on Windows/Linux, Option on Mac):
     * - Option/Alt + ↑ : Previous sibling (move up in list)
     * - Option/Alt + ↓ : Next sibling (move down in list)
     * - Option/Alt + ← : Go to parent (move out of container)
     * - Option/Alt + → : Go to first child (move into container)
     */
    const KeyboardNavigation = {
        isEnabled: true,
        indicatorElement: null,
        toastElement: null,
        toastTimeout: null,

        /**
         * Initialize keyboard navigation
         */
        init: function () {
            console.log('[KeyNav] Initializing keyboard navigation...');
            this.createIndicator();
            this.createToast();
            this.bindEvents();
            this.setupSelectionListener();
            console.log('[KeyNav] Keyboard Navigation initialized');
            console.log('[KeyNav] Shortcuts: Option/Alt + ↑↓ (siblings), Option/Alt + ←→ (hierarchy)');
            console.log('[KeyNav] isEnabled:', this.isEnabled);
            console.log('[KeyNav] isReady:', this.isReady());
        },

        /**
         * Check if Elementor is ready
         */
        isReady: function () {
            return typeof window.elementor !== 'undefined' &&
                   typeof window.$e !== 'undefined' &&
                   !!window.$e.run;
        },

        /**
         * Create position indicator element
         */
        createIndicator: function () {
            this.indicatorElement = document.createElement('div');
            this.indicatorElement.className = 'efsp-nav-indicator';
            this.indicatorElement.innerHTML = `
                <div class="efsp-nav-indicator__content">
                    <span class="efsp-nav-indicator__position"></span>
                    <span class="efsp-nav-indicator__depth"></span>
                </div>
            `;
            document.body.appendChild(this.indicatorElement);
        },

        /**
         * Create toast notification element
         */
        createToast: function () {
            this.toastElement = document.createElement('div');
            this.toastElement.className = 'efsp-nav-toast';
            document.body.appendChild(this.toastElement);
        },

        /**
         * Bind keyboard events
         */
        bindEvents: function () {
            const self = this;

            // Attach to main document
            this.attachKeyListener(document);

            // Also attach to Elementor's iframe when it's ready
            this.waitForIframe();
        },

        /**
         * Wait for Elementor iframe and attach listener
         */
        waitForIframe: function () {
            const self = this;
            const checkInterval = setInterval(() => {
                const iframe = document.getElementById('elementor-preview-iframe');
                if (iframe && iframe.contentDocument) {
                    console.log('[KeyNav] Found iframe, attaching listener');
                    self.attachKeyListener(iframe.contentDocument);
                    clearInterval(checkInterval);
                }
            }, 500);
        },

        /**
         * Attach keydown listener to a document
         */
        attachKeyListener: function (doc) {
            const self = this;
            console.log('[KeyNav] Attaching listener to:', doc === document ? 'main document' : 'iframe document');

            doc.addEventListener('keydown', function (e) {
                // Log all keydowns with modifiers for debugging
                if (e.altKey || e.shiftKey || e.metaKey || e.ctrlKey) {
                    console.log('[KeyNav] Keydown:', {
                        key: e.key,
                        altKey: e.altKey,
                        shiftKey: e.shiftKey,
                        metaKey: e.metaKey,
                        ctrlKey: e.ctrlKey,
                        isEnabled: self.isEnabled,
                        isReady: self.isReady()
                    });
                }

                if (!self.isEnabled) {
                    console.log('[KeyNav] Navigation disabled');
                    return;
                }

                if (!self.isReady()) {
                    console.log('[KeyNav] Elementor not ready');
                    return;
                }

                // Only handle Option/Alt + Arrow combinations (no other modifiers)
                if (!e.altKey || e.shiftKey || e.metaKey || e.ctrlKey) return;

                console.log('[KeyNav] Alt/Option detected, key:', e.key);

                // Don't interfere when typing in inputs
                const activeElement = document.activeElement;
                const isTextInput = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable
                );

                if (isTextInput) {
                    console.log('[KeyNav] In text input, skipping');
                    return;
                }

                switch (e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[KeyNav] Navigating to previous sibling');
                        self.navigateSibling(-1);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[KeyNav] Navigating to next sibling');
                        self.navigateSibling(1);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[KeyNav] Navigating to parent');
                        self.navigateToParent();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[KeyNav] Navigating to first child');
                        self.navigateToChild();
                        break;
                }
            }, true); // Use capture phase
        },

        /**
         * Setup Elementor selection listener
         */
        setupSelectionListener: function () {
            // Update indicator when selection changes
            if (typeof window.elementor !== 'undefined') {
                this.waitForElementor();
            } else {
                window.addEventListener('elementor/init', () => this.waitForElementor());
            }
        },

        /**
         * Wait for Elementor to be fully ready and bind selection listener
         */
        waitForElementor: function () {
            const self = this;

            // Poll until elementor.selection is available
            const checkInterval = setInterval(() => {
                if (window.elementor?.selection) {
                    clearInterval(checkInterval);

                    // Listen for selection changes
                    window.elementor.selection.on('change', () => {
                        self.updateIndicator();
                    });
                }
            }, 500);
        },

        /**
         * Get currently selected container
         */
        getSelectedContainer: function () {
            const elements = window.elementor?.selection?.getElements() || [];
            return elements.length > 0 ? elements[0] : null;
        },

        /**
         * Navigate to sibling element
         * @param {number} direction - -1 for previous, 1 for next
         */
        navigateSibling: function (direction) {
            const container = this.getSelectedContainer();

            if (!container) {
                this.showToast('No element selected', 'warning');
                return;
            }

            const parent = container.parent;
            if (!parent || !parent.children) {
                this.showToast('No siblings available', 'warning');
                return;
            }

            const siblings = parent.children;
            const currentIndex = siblings.findIndex(c => c.id === container.id);

            if (currentIndex === -1) {
                this.showToast('Could not find element', 'error');
                return;
            }

            // Calculate new index with wrap-around
            let newIndex = currentIndex + direction;
            if (newIndex < 0) {
                newIndex = siblings.length - 1;
            } else if (newIndex >= siblings.length) {
                newIndex = 0;
            }

            // Select the sibling
            const targetContainer = siblings[newIndex];
            this.selectElement(targetContainer);

            const dirLabel = direction < 0 ? 'Previous' : 'Next';
            this.showToast(`${dirLabel} sibling (${newIndex + 1}/${siblings.length})`, 'info');
        },

        /**
         * Navigate to parent element
         */
        navigateToParent: function () {
            const container = this.getSelectedContainer();

            if (!container) {
                this.showToast('No element selected', 'warning');
                return;
            }

            const parent = container.parent;

            if (!parent) {
                this.showToast('No parent element', 'warning');
                return;
            }

            // Check if parent is the document root
            const parentType = parent.model?.get('elType');
            if (parentType === 'document' || !parentType) {
                this.showToast('Already at top level', 'warning');
                return;
            }

            this.selectElement(parent);
            this.showToast('Parent element', 'info');
        },

        /**
         * Navigate to first child element
         */
        navigateToChild: function () {
            const container = this.getSelectedContainer();

            if (!container) {
                this.showToast('No element selected', 'warning');
                return;
            }

            const children = container.children;

            if (!children || children.length === 0) {
                this.showToast('No child elements', 'warning');
                return;
            }

            const firstChild = children[0];
            this.selectElement(firstChild);
            this.showToast(`First child (1/${children.length})`, 'info');
        },

        /**
         * Select an element container
         */
        selectElement: async function (container) {
            if (!container) return;

            try {
                await window.$e.run('document/elements/select', {
                    container: container
                });
                this.updateIndicator();
            } catch (error) {
                console.error('Failed to select element:', error);
            }
        },

        /**
         * Update the position indicator
         */
        updateIndicator: function () {
            const container = this.getSelectedContainer();

            if (!container) {
                this.hideIndicator();
                return;
            }

            const parent = container.parent;
            const siblings = parent?.children || [];
            const currentIndex = siblings.findIndex(c => c.id === container.id);
            const depth = this.getDepth(container);
            const elType = container.model?.get('elType') || 'element';
            const widgetType = container.model?.get('widgetType');
            const label = widgetType || elType;

            // Update indicator content
            const positionEl = this.indicatorElement.querySelector('.efsp-nav-indicator__position');
            const depthEl = this.indicatorElement.querySelector('.efsp-nav-indicator__depth');

            if (siblings.length > 1) {
                positionEl.textContent = `${currentIndex + 1} of ${siblings.length}`;
            } else {
                positionEl.textContent = 'Only child';
            }

            depthEl.textContent = `${label} · Depth ${depth}`;

            this.showIndicator();
        },

        /**
         * Get depth of an element in the tree
         */
        getDepth: function (container) {
            let depth = 0;
            let current = container;

            while (current?.parent) {
                const parentType = current.parent.model?.get('elType');
                if (parentType === 'document' || !parentType) break;
                depth++;
                current = current.parent;
            }

            return depth;
        },

        /**
         * Show the position indicator
         */
        showIndicator: function () {
            this.indicatorElement.classList.add('efsp-nav-indicator--visible');
        },

        /**
         * Hide the position indicator
         */
        hideIndicator: function () {
            this.indicatorElement.classList.remove('efsp-nav-indicator--visible');
        },

        /**
         * Show toast notification
         */
        showToast: function (message, type = 'info') {
            if (this.toastTimeout) {
                clearTimeout(this.toastTimeout);
            }

            this.toastElement.textContent = message;
            this.toastElement.className = `efsp-nav-toast efsp-nav-toast--${type} efsp-nav-toast--visible`;

            this.toastTimeout = setTimeout(() => {
                this.toastElement.classList.remove('efsp-nav-toast--visible');
            }, 1500);
        },

        /**
         * Enable keyboard navigation
         */
        enable: function () {
            this.isEnabled = true;
            console.log('Keyboard navigation enabled');
        },

        /**
         * Disable keyboard navigation
         */
        disable: function () {
            this.isEnabled = false;
            this.hideIndicator();
            console.log('Keyboard navigation disabled');
        },

        /**
         * Toggle keyboard navigation
         */
        toggle: function () {
            if (this.isEnabled) {
                this.disable();
            } else {
                this.enable();
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => KeyboardNavigation.init());
    } else {
        KeyboardNavigation.init();
    }

    // Expose to global scope
    window.KeyboardNavigation = KeyboardNavigation;

})();
