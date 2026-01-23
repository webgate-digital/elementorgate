(function () {
    'use strict';

    /**
     * Floating Panel Utility
     * Creates draggable, styled panels for visualizer tools
     */
    const FloatingPanel = {
        /**
         * Create a floating panel
         * @param {Document} doc - The document to append the panel to
         * @param {Object} options - Panel options
         * @param {string} options.id - Panel ID
         * @param {string} options.title - Panel title
         * @param {Function} options.onClose - Close callback
         * @param {Function} options.onRefresh - Refresh callback (optional)
         * @returns {HTMLElement} The panel element
         */
        create: function (doc, options) {
            const { id, title, onClose, onRefresh } = options;

            // Inject styles if not present
            this.injectStyles(doc);

            const panel = doc.createElement('div');
            panel.id = id;
            panel.className = 'efsp-floating-panel';

            // Header
            const header = doc.createElement('div');
            header.className = 'efsp-floating-panel__header';

            const titleEl = doc.createElement('span');
            titleEl.textContent = title;
            header.appendChild(titleEl);

            const actions = doc.createElement('div');
            actions.className = 'efsp-floating-panel__actions';

            // Refresh button (optional)
            if (onRefresh) {
                const refreshBtn = doc.createElement('span');
                refreshBtn.className = 'efsp-floating-panel__btn efsp-floating-panel__refresh';
                refreshBtn.title = 'Refresh';
                refreshBtn.textContent = '↻';
                refreshBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onRefresh();
                });
                actions.appendChild(refreshBtn);
            }

            // Close button
            const closeBtn = doc.createElement('span');
            closeBtn.className = 'efsp-floating-panel__btn efsp-floating-panel__close';
            closeBtn.title = 'Close';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onClose();
            });
            actions.appendChild(closeBtn);

            header.appendChild(actions);
            panel.appendChild(header);

            // Make draggable
            this.makeDraggable(panel, header, doc);

            return panel;
        },

        /**
         * Add content section to panel
         * @param {Document} doc - The document
         * @param {HTMLElement} panel - The panel element
         * @param {string} className - CSS class for the section
         * @param {string} html - HTML content
         * @returns {HTMLElement} The section element
         */
        addSection: function (doc, panel, className, html) {
            const section = doc.createElement('div');
            section.className = className;
            if (html) {
                section.innerHTML = html;
            }
            panel.appendChild(section);
            return section;
        },

        /**
         * Clear content sections (keep header)
         * @param {HTMLElement} panel - The panel element
         * @param {Array<string>} classNames - CSS classes of sections to remove
         */
        clearSections: function (panel, classNames) {
            classNames.forEach(className => {
                const section = panel.querySelector('.' + className);
                if (section) section.remove();
            });
        },

        /**
         * Make an element draggable by a handle
         */
        makeDraggable: function (element, handle, doc) {
            let isDragging = false;
            let offsetX = 0;
            let offsetY = 0;

            handle.addEventListener('mousedown', (e) => {
                // Don't drag if clicking on buttons
                if (e.target.closest('.efsp-floating-panel__actions')) {
                    return;
                }

                isDragging = true;
                const rect = element.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;

                // Reset right/bottom positioning to use left/top (override !important)
                element.style.setProperty('right', 'auto', 'important');
                element.style.setProperty('bottom', 'auto', 'important');
                element.style.setProperty('left', rect.left + 'px', 'important');
                element.style.setProperty('top', rect.top + 'px', 'important');

                handle.classList.add('efsp-floating-panel__header--dragging');
                e.preventDefault();
            });

            doc.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                let newX = e.clientX - offsetX;
                let newY = e.clientY - offsetY;

                // Keep within viewport bounds
                const maxX = doc.documentElement.clientWidth - element.offsetWidth;
                const maxY = doc.documentElement.clientHeight - element.offsetHeight;

                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(0, Math.min(newY, maxY));

                element.style.setProperty('left', newX + 'px', 'important');
                element.style.setProperty('top', newY + 'px', 'important');
            });

            doc.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    handle.classList.remove('efsp-floating-panel__header--dragging');
                }
            });
        },

        /**
         * Inject shared panel styles
         */
        injectStyles: function (doc) {
            if (doc.getElementById('efsp-floating-panel-styles')) return;

            const style = doc.createElement('style');
            style.id = 'efsp-floating-panel-styles';
            style.textContent = `
                .efsp-floating-panel {
                    position: fixed !important;
                    top: 20px !important;
                    right: 20px !important;
                    width: 300px !important;
                    max-height: 80vh !important;
                    background: #1e1f21 !important;
                    border: 1px solid #404349 !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    z-index: 1000000 !important;
                    display: flex !important;
                    flex-direction: column !important;
                }

                .efsp-floating-panel__header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 12px 14px !important;
                    border-bottom: 1px solid #404349 !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: #e0e1e3 !important;
                    cursor: grab !important;
                    user-select: none !important;
                }

                .efsp-floating-panel__header--dragging {
                    cursor: grabbing !important;
                }

                .efsp-floating-panel__actions {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                }

                .efsp-floating-panel__btn {
                    cursor: pointer !important;
                    font-size: 18px !important;
                    color: #9da5ae !important;
                    line-height: 1 !important;
                }

                .efsp-floating-panel__btn:hover {
                    color: #e0e1e3 !important;
                }

                .efsp-floating-panel__summary {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 6px !important;
                    padding: 10px 14px !important;
                    border-bottom: 1px solid #404349 !important;
                    background: #26292c !important;
                }

                .efsp-floating-panel__tips {
                    padding: 10px 14px !important;
                    border-bottom: 1px solid #404349 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 6px !important;
                }

                .efsp-floating-panel__tip {
                    display: flex !important;
                    align-items: flex-start !important;
                    gap: 8px !important;
                    font-size: 11px !important;
                    line-height: 1.4 !important;
                    padding: 8px 10px !important;
                    border-radius: 4px !important;
                }

                .efsp-floating-panel__tip--error {
                    background: rgba(231, 76, 60, 0.15) !important;
                    color: #e74c3c !important;
                }

                .efsp-floating-panel__tip--warning {
                    background: rgba(241, 196, 15, 0.15) !important;
                    color: #f1c40f !important;
                }

                .efsp-floating-panel__tip-icon {
                    font-weight: 700 !important;
                    flex-shrink: 0 !important;
                }

                .efsp-floating-panel__list {
                    flex: 1 !important;
                    overflow-y: auto !important;
                    padding: 8px 0 !important;
                }

                .efsp-floating-panel__list::-webkit-scrollbar {
                    width: 8px !important;
                }

                .efsp-floating-panel__list::-webkit-scrollbar-track {
                    background: transparent !important;
                }

                .efsp-floating-panel__list::-webkit-scrollbar-thumb {
                    background: #404349 !important;
                    border-radius: 4px !important;
                }

                .efsp-floating-panel__item {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    padding: 6px 14px !important;
                    cursor: pointer !important;
                    transition: background 0.15s !important;
                }

                .efsp-floating-panel__item:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                }

                .efsp-floating-panel__empty {
                    padding: 20px 14px !important;
                    text-align: center !important;
                    color: #9da5ae !important;
                    font-size: 12px !important;
                }

                .efsp-floating-panel__count {
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    padding: 3px 8px !important;
                    border-radius: 3px !important;
                    background: rgba(255, 255, 255, 0.1) !important;
                }
            `;
            doc.head.appendChild(style);
        },

        /**
         * Remove panel from document
         */
        remove: function (doc, id) {
            const panel = doc.getElementById(id);
            if (panel) panel.remove();
        }
    };

    // Expose to global scope
    window.FloatingPanel = FloatingPanel;

})();
