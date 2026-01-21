(function () {
    'use strict';

    /**
     * Command Palette - Raycast-like quick action bar
     */
    const CommandPalette = {
        isOpen: false,
        element: null,
        inputElement: null,
        listElement: null,
        selectedIndex: 0,
        filteredCommands: [],
        initialized: false,

        // Command definitions
        commands: [
            // Actions
            { id: 'wrap', label: 'Wrap in Container', category: 'Actions', icon: 'eicon-frame-expand', action: () => window.elementorTools?.wrapInContainer() },
            { id: 'unwrap', label: 'Unwrap Container', category: 'Actions', icon: 'eicon-frame-minimize', action: () => window.elementorTools?.unwrapContainer() },
            { id: 'duplicate', label: 'Duplicate Element', category: 'Actions', icon: 'eicon-clone', action: () => window.$e?.run('document/elements/duplicate', { container: window.elementor?.selection?.getElements()[0] }) },
            { id: 'delete', label: 'Delete Element', category: 'Actions', icon: 'eicon-trash', action: () => window.$e?.run('document/elements/delete', { container: window.elementor?.selection?.getElements()[0] }) },
            { id: 'copy', label: 'Copy Element', category: 'Actions', icon: 'eicon-copy', action: () => window.$e?.run('document/elements/copy', { container: window.elementor?.selection?.getElements()[0] }) },
            { id: 'paste', label: 'Paste Element', category: 'Actions', icon: 'eicon-clipboard', action: () => window.$e?.run('document/elements/paste', { container: window.elementor?.selection?.getElements()[0]?.parent }) },

            // View
            { id: 'navigator', label: 'Toggle Navigator', category: 'View', icon: 'eicon-navigator', action: () => window.$e?.run('navigator/toggle') },
            { id: 'responsive-desktop', label: 'Desktop View', category: 'View', icon: 'eicon-device-desktop', action: () => window.elementor?.changeDeviceMode('desktop') },
            { id: 'responsive-tablet', label: 'Tablet View', category: 'View', icon: 'eicon-device-tablet', action: () => window.elementor?.changeDeviceMode('tablet') },
            { id: 'responsive-mobile', label: 'Mobile View', category: 'View', icon: 'eicon-device-mobile', action: () => window.elementor?.changeDeviceMode('mobile') },
            { id: 'preview', label: 'Preview Changes', category: 'View', icon: 'eicon-preview-medium', action: () => window.$e?.run('document/preview') },

            // Tools (Toggles)
            {
                id: 'toggle-headings',
                label: 'Heading Structure',
                category: 'Tools',
                icon: 'eicon-heading',
                toggle: true,
                isActive: () => window.HeadingVisualizer?.isActive || false,
                action: function() {
                    const newState = !window.HeadingVisualizer?.isActive;
                    window.showHeadings?.(newState);
                }
            },
            {
                id: 'toggle-spacing',
                label: 'Spacing Measure',
                category: 'Tools',
                icon: 'eicon-spacer',
                toggle: true,
                isActive: () => window.SpacingMeasure?.isActive || false,
                action: function() {
                    window.SpacingMeasure?.toggle();
                }
            },
            {
                id: 'toggle-keyboard-nav',
                label: 'Keyboard Navigation',
                category: 'Tools',
                icon: 'eicon-navigator',
                toggle: true,
                isActive: () => window.KeyboardNavigation?.isEnabled || false,
                action: function() {
                    window.KeyboardNavigation?.toggle();
                }
            },
            { id: 'log-selected', label: 'Log Selected Element', category: 'Tools', icon: 'eicon-info-circle', action: () => window.getSelected?.() },

            // Document
            { id: 'save', label: 'Save', category: 'Document', icon: 'eicon-save', action: () => window.$e?.run('document/save/default') },
            { id: 'save-draft', label: 'Save as Draft', category: 'Document', icon: 'eicon-save', action: () => window.$e?.run('document/save/draft') },
            { id: 'undo', label: 'Undo', category: 'Document', icon: 'eicon-undo', action: () => window.$e?.run('document/history/undo') },
            { id: 'redo', label: 'Redo', category: 'Document', icon: 'eicon-redo', action: () => window.$e?.run('document/history/redo') },

            // Settings
            { id: 'page-settings', label: 'Page Settings', category: 'Settings', icon: 'eicon-cog', action: () => window.$e?.route('panel/page-settings/settings') },
            { id: 'site-settings', label: 'Site Settings', category: 'Settings', icon: 'eicon-site-identity', action: () => window.$e?.route('panel/global/menu') },
            { id: 'global-colors', label: 'Global Colors', category: 'Settings', icon: 'eicon-paint-brush', action: () => window.$e?.route('panel/global/global-colors') },
            { id: 'global-fonts', label: 'Global Fonts', category: 'Settings', icon: 'eicon-typography', action: () => window.$e?.route('panel/global/global-typography') },
        ],

        /**
         * Initialize the command palette
         */
        init: function () {
            if (this.initialized) return;
            this.initialized = true;

            this.createElements();
            this.bindEvents();
        },

        /**
         * Create DOM elements
         */
        createElements: function () {
            // Create main container
            this.element = document.createElement('div');
            this.element.className = 'efsp-command-palette';
            this.element.innerHTML = `
                <div class="efsp-command-palette__overlay"></div>
                <div class="efsp-command-palette__modal">
                    <div class="efsp-command-palette__search">
                        <i class="eicon-search"></i>
                        <input type="text" placeholder="Type a command or search..." autocomplete="off" spellcheck="false">
                        <div class="efsp-command-palette__shortcut">ESC</div>
                    </div>
                    <div class="efsp-command-palette__list"></div>
                    <div class="efsp-command-palette__footer">
                        <span><kbd>↑↓</kbd> Navigate</span>
                        <span><kbd>↵</kbd> Select</span>
                        <span><kbd>ESC</kbd> Close</span>
                    </div>
                </div>
            `;

            this.inputElement = this.element.querySelector('input');
            this.listElement = this.element.querySelector('.efsp-command-palette__list');

            document.body.appendChild(this.element);
        },

        /**
         * Bind event listeners
         */
        bindEvents: function () {
            const self = this;

            // Keyboard shortcut handler
            function handleShortcut(e) {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    self.toggle();
                    return false;
                }
            }

            // Listen on main document (capture phase)
            window.addEventListener('keydown', handleShortcut, true);
            document.addEventListener('keydown', handleShortcut, true);

            // Also listen on Elementor's preview iframe when it loads
            this.attachToIframe();

            // Input events
            this.inputElement.addEventListener('input', () => {
                self.filterCommands(self.inputElement.value);
            });

            this.inputElement.addEventListener('keydown', (e) => {
                self.handleKeydown(e);
            });

            // Click on overlay to close
            this.element.querySelector('.efsp-command-palette__overlay').addEventListener('click', () => {
                self.close();
            });

            // Click on command
            this.listElement.addEventListener('click', (e) => {
                const item = e.target.closest('.efsp-command-palette__item');
                if (item) {
                    const commandId = item.dataset.commandId;
                    self.executeCommand(commandId);
                }
            });

            // Hover to select
            this.listElement.addEventListener('mousemove', (e) => {
                const item = e.target.closest('.efsp-command-palette__item');
                if (item) {
                    const index = parseInt(item.dataset.index, 10);
                    if (!isNaN(index)) {
                        self.setSelectedIndex(index);
                    }
                }
            });
        },

        /**
         * Handle keyboard navigation
         */
        handleKeydown: function (e) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.setSelectedIndex(this.selectedIndex + 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.setSelectedIndex(this.selectedIndex - 1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.filteredCommands[this.selectedIndex]) {
                        this.executeCommand(this.filteredCommands[this.selectedIndex].id);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
            }
        },

        /**
         * Filter commands based on search query
         */
        filterCommands: function (query) {
            const lowerQuery = query.toLowerCase().trim();

            if (!lowerQuery) {
                this.filteredCommands = [...this.commands];
            } else {
                this.filteredCommands = this.commands.filter(cmd => {
                    return cmd.label.toLowerCase().includes(lowerQuery) ||
                           cmd.category.toLowerCase().includes(lowerQuery) ||
                           cmd.id.toLowerCase().includes(lowerQuery);
                });
            }

            this.selectedIndex = 0;
            this.renderCommands();
        },

        /**
         * Render command list
         */
        renderCommands: function () {
            if (this.filteredCommands.length === 0) {
                this.listElement.innerHTML = `
                    <div class="efsp-command-palette__empty">
                        <i class="eicon-search-results"></i>
                        <span>No commands found</span>
                    </div>
                `;
                return;
            }

            // Group by category
            const grouped = {};
            this.filteredCommands.forEach((cmd, index) => {
                if (!grouped[cmd.category]) {
                    grouped[cmd.category] = [];
                }
                grouped[cmd.category].push({ ...cmd, index });
            });

            let html = '';
            for (const [category, commands] of Object.entries(grouped)) {
                html += `<div class="efsp-command-palette__category">${category}</div>`;
                commands.forEach(cmd => {
                    const isSelected = cmd.index === this.selectedIndex;
                    const isToggle = cmd.toggle === true;
                    const isActive = isToggle && typeof cmd.isActive === 'function' && cmd.isActive();

                    let toggleHtml = '';
                    if (isToggle) {
                        toggleHtml = `<span class="efsp-command-palette__toggle ${isActive ? 'efsp-command-palette__toggle--active' : ''}">
                            <span class="efsp-command-palette__toggle-check">${isActive ? '✓' : ''}</span>
                        </span>`;
                    }

                    html += `
                        <div class="efsp-command-palette__item ${isSelected ? 'efsp-command-palette__item--selected' : ''} ${isToggle ? 'efsp-command-palette__item--toggle' : ''}"
                             data-command-id="${cmd.id}"
                             data-index="${cmd.index}">
                            <i class="${cmd.icon}"></i>
                            <span class="efsp-command-palette__item-label">${this.highlightMatch(cmd.label)}</span>
                            ${toggleHtml}
                            <span class="efsp-command-palette__item-category">${cmd.category}</span>
                        </div>
                    `;
                });
            }

            this.listElement.innerHTML = html;
            this.scrollToSelected();
        },

        /**
         * Highlight matching text
         */
        highlightMatch: function (text) {
            const query = this.inputElement.value.trim();
            if (!query) return text;

            const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        },

        /**
         * Escape regex special characters
         */
        escapeRegex: function (string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        },

        /**
         * Set selected index with bounds checking
         */
        setSelectedIndex: function (index) {
            if (this.filteredCommands.length === 0) return;

            if (index < 0) {
                index = this.filteredCommands.length - 1;
            } else if (index >= this.filteredCommands.length) {
                index = 0;
            }

            this.selectedIndex = index;
            this.renderCommands();
        },

        /**
         * Scroll to keep selected item visible
         */
        scrollToSelected: function () {
            const selectedItem = this.listElement.querySelector('.efsp-command-palette__item--selected');
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        },

        /**
         * Execute a command by ID
         */
        executeCommand: function (commandId) {
            const command = this.commands.find(cmd => cmd.id === commandId);
            if (command && command.action) {
                this.close();
                try {
                    command.action();
                } catch (error) {
                    console.error('Command execution failed:', error);
                }
            }
        },

        /**
         * Open the command palette
         */
        open: function () {
            if (this.isOpen) return;

            this.isOpen = true;
            this.element.classList.add('efsp-command-palette--open');
            this.inputElement.value = '';
            this.filterCommands('');

            // Focus with a small delay to ensure element is visible
            setTimeout(() => {
                this.inputElement.focus();
            }, 10);
        },

        /**
         * Close the command palette
         */
        close: function () {
            if (!this.isOpen) return;

            this.isOpen = false;
            this.element.classList.remove('efsp-command-palette--open');
        },

        /**
         * Toggle the command palette
         */
        toggle: function () {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        /**
         * Add a custom command
         */
        addCommand: function (command) {
            if (!command.id || !command.label || !command.action) {
                console.error('Command must have id, label, and action');
                return;
            }
            command.category = command.category || 'Custom';
            command.icon = command.icon || 'eicon-star';
            this.commands.push(command);
        },

        /**
         * Remove a command by ID
         */
        removeCommand: function (commandId) {
            this.commands = this.commands.filter(cmd => cmd.id !== commandId);
        },

        /**
         * Attach keyboard listener to Elementor's preview iframe
         */
        attachToIframe: function () {
            const self = this;

            function handleShortcut(e) {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    self.toggle();
                    return false;
                }
            }

            function tryAttach() {
                const iframe = document.getElementById('elementor-preview-iframe');
                if (iframe && iframe.contentDocument) {
                    iframe.contentDocument.addEventListener('keydown', handleShortcut, true);
                    iframe.contentWindow.addEventListener('keydown', handleShortcut, true);
                }
            }

            // Try immediately
            tryAttach();

            // Also try when Elementor signals preview is loaded
            if (window.elementor) {
                window.elementor.on('preview:loaded', tryAttach);
            }

            // Fallback: observe for iframe
            const observer = new MutationObserver(function(mutations) {
                tryAttach();
            });
            observer.observe(document.body, { childList: true, subtree: true });

            // Also try after a delay
            setTimeout(tryAttach, 1000);
            setTimeout(tryAttach, 3000);
        }
    };

    // Initialize immediately - the script is loaded in the editor context
    CommandPalette.init();

    // Expose to global scope
    window.commandPalette = CommandPalette;

})();
