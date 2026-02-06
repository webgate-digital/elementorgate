(function () {
    'use strict';

    /**
     * Elementor Element Tools
     *
     * Utilities for working with selected elements in Elementor
     * Usage: window.elementorTools.getSelected()
     */
    const ElementTools = {
        /**
         * Check if Elementor is ready
         */
        isReady: function () {
            return typeof window.elementor !== 'undefined' &&
                   typeof window.$e !== 'undefined' &&
                   !!window.$e.run;
        },

        /**
         * Get currently selected elements
         * @returns {Array} Array of selected element containers
         */
        getSelected: function () {
            if (!this.isReady()) {
                console.error('Elementor is not ready');
                return [];
            }

            const elements = window.elementor.selection.getElements();

            if (elements.length === 0) {
                console.log('No elements selected');
                return [];
            }

            console.log(`Found ${elements.length} selected element(s)`);

            // Return detailed info about each selected element
            return elements.map(container => this.getElementInfo(container));
        },

        /**
         * Get raw selected containers (for internal use)
         * @returns {Array} Array of ElementorContainer objects
         */
        getSelectedContainers: function () {
            if (!this.isReady()) {
                return [];
            }
            return window.elementor.selection.getElements();
        },

        /**
         * Get detailed info about an element container
         * @param {Object} container - Elementor container object
         * @returns {Object} Element information
         */
        getElementInfo: function (container) {
            if (!container || !container.model) {
                return null;
            }

            const model = container.model;
            const settings = container.settings?.attributes || {};

            const info = {
                id: model.id || container.id,
                elType: model.get('elType'),
                widgetType: model.get('widgetType') || null,
                label: this.getElementLabel(container),
                hasChildren: container.children && container.children.length > 0,
                childCount: container.children ? container.children.length : 0,
                parent: container.parent ? {
                    id: container.parent.model?.id || container.parent.id,
                    elType: container.parent.model?.get('elType')
                } : null,
                container: container // Keep reference to original container
            };

            // Add widget-specific info
            if (info.widgetType === 'heading') {
                info.headingText = settings.title || settings.editor;
                info.headingTag = settings.header_size || 'h2';
            } else if (info.widgetType === 'text-editor') {
                const content = settings.editor || '';
                info.textContent = content.replace(/<[^>]*>/g, '').trim().substring(0, 100);
            } else if (info.widgetType === 'button') {
                info.buttonText = settings.text;
            } else if (info.widgetType === 'image') {
                info.imageUrl = settings.image?.url;
            }

            return info;
        },

        /**
         * Get element label/name
         * @param {Object} container - Elementor container
         * @returns {string} Element label
         */
        getElementLabel: function (container) {
            const settings = container.settings?.attributes || {};

            return settings._title ||
                   settings.title ||
                   settings._element_name ||
                   settings._label ||
                   settings.label ||
                   settings._element_label ||
                   settings._element_custom_label ||
                   container.model?.get('widgetType') ||
                   container.model?.get('elType') ||
                   'Unknown';
        },

        /**
         * Get container by element ID
         * @param {string} elementId - Element ID
         * @returns {Object|null} Container object
         */
        getContainer: function (elementId) {
            if (!this.isReady()) {
                return null;
            }
            return window.elementor.getContainer(elementId);
        },

        /**
         * Get the preview/document container
         * @returns {Object|null} Preview container
         */
        getPreviewContainer: function () {
            if (!this.isReady()) {
                return null;
            }
            return window.elementor.getPreviewContainer();
        },

        /**
         * Execute an Elementor command
         * @param {string} command - Command name
         * @param {Object} options - Command options
         * @returns {Promise} Command result
         */
        runCommand: async function (command, options = {}) {
            if (!this.isReady()) {
                throw new Error('Elementor is not ready');
            }
            return window.$e.run(command, options);
        },

        /**
         * Print selected elements info to console in a nice format
         */
        logSelected: function () {
            const elements = this.getSelected();

            if (elements.length === 0) {
                return;
            }

            console.group('Selected Elements');
            elements.forEach((el, index) => {
                console.group(`Element ${index + 1}: ${el.label}`);
                console.log('ID:', el.id);
                console.log('Type:', el.elType);
                if (el.widgetType) console.log('Widget:', el.widgetType);
                console.log('Children:', el.childCount);
                if (el.parent) console.log('Parent:', el.parent.id, `(${el.parent.elType})`);
                if (el.headingText) console.log('Text:', el.headingText);
                if (el.textContent) console.log('Content:', el.textContent);
                if (el.buttonText) console.log('Button:', el.buttonText);
                console.groupEnd();
            });
            console.groupEnd();

            return elements;
        },

        /**
         * Select an element by ID
         * @param {string} elementId - Element ID to select
         */
        selectElement: async function (elementId) {
            if (!this.isReady()) {
                console.error('Elementor is not ready');
                return;
            }

            const container = this.getContainer(elementId);
            if (!container) {
                console.error('Element not found:', elementId);
                return;
            }

            await this.runCommand('document/elements/select', {
                container: container
            });

            console.log('Selected element:', elementId);
        },

        /**
         * Get all elements of a specific type
         * @param {string} type - Element type (e.g., 'widget', 'container', 'section')
         * @param {string} widgetType - Optional widget type filter
         * @returns {Array} Array of matching elements
         */
        findElements: function (type, widgetType = null) {
            if (!this.isReady()) {
                return [];
            }

            const preview = this.getPreviewContainer();
            if (!preview) {
                return [];
            }

            const results = [];

            const traverse = (container) => {
                if (!container) return;

                const elType = container.model?.get('elType');
                const wType = container.model?.get('widgetType');

                if (elType === type) {
                    if (!widgetType || wType === widgetType) {
                        results.push(this.getElementInfo(container));
                    }
                }

                if (container.children) {
                    container.children.forEach(child => traverse(child));
                }
            };

            traverse(preview);
            return results;
        },

        /**
         * Get the parent container of selected element(s)
         * @returns {Object|null} Parent container info
         */
        getSelectedParent: function () {
            const containers = this.getSelectedContainers();
            if (containers.length === 0) {
                console.log('No elements selected');
                return null;
            }

            const parent = containers[0].parent;
            if (!parent) {
                console.log('Selected element has no parent');
                return null;
            }

            return this.getElementInfo(parent);
        },

        /**
         * Get children of selected element
         * @returns {Array} Array of child elements
         */
        getSelectedChildren: function () {
            const containers = this.getSelectedContainers();
            if (containers.length === 0) {
                console.log('No elements selected');
                return [];
            }

            const container = containers[0];
            if (!container.children || container.children.length === 0) {
                console.log('Selected element has no children');
                return [];
            }

            return container.children.map(child => this.getElementInfo(child));
        },

        /**
         * Wrap selected elements in a new container
         * Similar to "Group" in Figma
         * @returns {Promise<Object|null>} The new container or null on failure
         */
        wrapInContainer: async function () {
            if (!this.isReady()) {
                console.error('Elementor is not ready');
                return null;
            }

            const containers = this.getSelectedContainers();
            if (containers.length === 0) {
                console.error('No elements selected. Please select at least one element.');
                return null;
            }

            // All selected elements must have the same parent
            const parent = containers[0].parent;
            if (!parent) {
                console.error('Selected element has no parent');
                return null;
            }

            // Verify all elements have the same parent
            const allSameParent = containers.every(c => c.parent && c.parent.id === parent.id);
            if (!allSameParent) {
                console.error('All selected elements must have the same parent to wrap them.');
                return null;
            }

            // Get indices of selected elements in parent
            const parentChildren = parent.children || [];
            const indices = containers.map(c => {
                return parentChildren.findIndex(child => child.id === c.id);
            }).filter(i => i !== -1).sort((a, b) => a - b);

            if (indices.length === 0) {
                console.error('Could not find selected elements in parent');
                return null;
            }

            const insertIndex = indices[0];

            console.log(`Wrapping ${containers.length} element(s) at index ${insertIndex}`);

            try {
                // Create a new container at the position of the first selected element
                const newContainer = await this.runCommand('document/elements/create', {
                    container: parent,
                    model: {
                        elType: 'container',
                        settings: {
                            _title: 'Wrapper'
                        }
                    },
                    options: {
                        at: insertIndex
                    }
                });

                if (!newContainer) {
                    console.error('Failed to create new container');
                    return null;
                }

                console.log('Created new container:', newContainer.id);

                // Move all selected elements into the new container
                // We need to move them in reverse order to maintain their relative positions
                for (let i = containers.length - 1; i >= 0; i--) {
                    const elementToMove = containers[i];

                    await this.runCommand('document/elements/move', {
                        container: elementToMove,
                        target: newContainer,
                        options: {
                            at: 0
                        }
                    });

                    console.log(`Moved element ${elementToMove.id} into container`);
                }

                // Select the new container
                await this.runCommand('document/elements/select', {
                    container: newContainer
                });

                console.log('Successfully wrapped elements in new container:', newContainer.id);
                return this.getElementInfo(newContainer);

            } catch (error) {
                console.error('Failed to wrap elements:', error);
                return null;
            }
        },

        /**
         * Copy element context for AI assistance
         * Copies HTML structure with rich context (styles, classes, IDs, hierarchy)
         * @returns {Promise<string|null>} Context string or null on failure
         */
        copyForAI: async function () {
            if (!this.isReady()) {
                console.error('Elementor is not ready');
                return null;
            }

            const containers = this.getSelectedContainers();
            if (containers.length === 0) {
                console.error('No elements selected');
                return null;
            }

            const container = containers[0];
            const elementId = container.model?.id || container.id;

            // Build context
            let context = '## Elementor Element Context\n\n';
            context += '### Structure & Settings\n\n';
            context += this.buildAIContext(container, 0);

            // Add raw HTML
            const domInfo = this.getDOMInfo(elementId);
            if (domInfo && domInfo.outerHTML) {
                context += '\n### Raw HTML\n\n```html\n';
                context += domInfo.outerHTML;
                context += '\n```\n';
            }

            // Copy to clipboard
            try {
                await navigator.clipboard.writeText(context);
                console.log('Element context copied to clipboard!');

                // Show notification
                this.showNotification('Element context copied for AI');

                return context;
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                console.log('Context output:\n', context);
                return context;
            }
        },

        /**
         * Build AI context recursively for an element and its children
         * @param {Object} container - Elementor container
         * @param {number} depth - Current depth for indentation
         * @returns {string} Formatted context string
         */
        buildAIContext: function (container, depth = 0) {
            if (!container || !container.model) {
                return '';
            }

            const indent = '  '.repeat(depth);
            const settings = container.settings?.attributes || {};
            const model = container.model;

            // Basic element info
            const elType = model.get('elType');
            const widgetType = model.get('widgetType');
            const elementId = model.id || container.id;

            // Get custom CSS class and ID
            const cssClasses = settings.css_classes || settings._css_classes || '';
            const cssId = settings._element_id || settings.css_id || '';
            const customCSS = settings.custom_css || '';

            // Get element label/title
            const label = this.getElementLabel(container);

            // Build element header
            let output = `${indent}┌─ ${elType}${widgetType ? ` (${widgetType})` : ''}: "${label}"\n`;
            output += `${indent}│  ID: ${elementId}\n`;

            // Add CSS classes if present
            if (cssClasses) {
                output += `${indent}│  CSS Classes: ${cssClasses}\n`;
            }

            // Add CSS ID if present
            if (cssId) {
                output += `${indent}│  CSS ID: #${cssId}\n`;
            }

            // Add custom CSS (full)
            if (customCSS && customCSS.trim()) {
                output += `${indent}│  ⚠️ Custom CSS:\n`;
                const cssLines = customCSS.trim().split('\n');
                cssLines.forEach(line => {
                    output += `${indent}│     ${line}\n`;
                });
            }

            // Add key settings based on element type
            const keySettings = this.extractKeySettings(container, elType, widgetType);
            if (keySettings.length > 0) {
                output += `${indent}│  Settings:\n`;
                keySettings.forEach(setting => {
                    output += `${indent}│    - ${setting}\n`;
                });
            }

            // Add global styles info
            const globals = container.globals?.attributes || {};
            const globalStyles = Object.entries(globals).filter(([key, value]) => value);
            if (globalStyles.length > 0) {
                output += `${indent}│  Global Styles:\n`;
                globalStyles.forEach(([key, value]) => {
                    output += `${indent}│    - ${key}: ${value}\n`;
                });
            }

            // Get DOM element info if available
            const domInfo = this.getDOMInfo(elementId);
            if (domInfo) {
                output += `${indent}│  DOM:\n`;
                output += `${indent}│    - Tag: ${domInfo.tagName}\n`;
                if (domInfo.computedClasses) {
                    output += `${indent}│    - Rendered Classes: ${domInfo.computedClasses}\n`;
                }
            }

            output += `${indent}└─\n`;

            // Process children
            if (container.children && container.children.length > 0) {
                container.children.forEach(child => {
                    output += this.buildAIContext(child, depth + 1);
                });
            }

            return output;
        },

        /**
         * Extract key settings based on element type
         * @param {Object} container - Elementor container
         * @param {string} elType - Element type
         * @param {string} widgetType - Widget type
         * @returns {Array} Array of key setting strings
         */
        extractKeySettings: function (container, elType, widgetType) {
            const settings = container.settings?.attributes || {};
            const keySettings = [];

            // Container-specific settings
            if (elType === 'container') {
                if (settings.flex_direction) keySettings.push(`Direction: ${settings.flex_direction}`);
                if (settings.flex_wrap) keySettings.push(`Wrap: ${settings.flex_wrap}`);
                if (settings.content_width) keySettings.push(`Content Width: ${settings.content_width}`);
                if (settings.flex_gap) keySettings.push(`Gap: ${JSON.stringify(settings.flex_gap)}`);
            }

            // Widget-specific settings
            if (widgetType === 'heading') {
                if (settings.title) keySettings.push(`Text: "${settings.title.substring(0, 50)}${settings.title.length > 50 ? '...' : ''}"`);
                if (settings.header_size) keySettings.push(`Tag: ${settings.header_size}`);
                if (settings.align) keySettings.push(`Align: ${settings.align}`);
            } else if (widgetType === 'text-editor') {
                const content = settings.editor || '';
                const plainText = content.replace(/<[^>]*>/g, '').trim();
                if (plainText) keySettings.push(`Content: "${plainText.substring(0, 80)}${plainText.length > 80 ? '...' : ''}"`);
            } else if (widgetType === 'button') {
                if (settings.text) keySettings.push(`Text: "${settings.text}"`);
                if (settings.link?.url) keySettings.push(`Link: ${settings.link.url}`);
                if (settings.button_type) keySettings.push(`Type: ${settings.button_type}`);
            } else if (widgetType === 'image') {
                if (settings.image?.url) keySettings.push(`Image: ${settings.image.url.split('/').pop()}`);
                if (settings.image_size) keySettings.push(`Size: ${settings.image_size}`);
            } else if (widgetType === 'icon') {
                if (settings.selected_icon?.value) keySettings.push(`Icon: ${settings.selected_icon.value}`);
            }

            // Common style settings
            if (settings.background_background) keySettings.push(`Background: ${settings.background_background}`);
            if (settings._margin) keySettings.push(`Margin: ${JSON.stringify(settings._margin)}`);
            if (settings._padding) keySettings.push(`Padding: ${JSON.stringify(settings._padding)}`);

            return keySettings;
        },

        /**
         * Get DOM information for an element
         * @param {string} elementId - Elementor element ID
         * @returns {Object|null} DOM info or null
         */
        getDOMInfo: function (elementId) {
            try {
                const iframe = document.getElementById('elementor-preview-iframe');
                if (!iframe || !iframe.contentDocument) return null;

                const element = iframe.contentDocument.querySelector(`[data-id="${elementId}"]`);
                if (!element) return null;

                return {
                    tagName: element.tagName.toLowerCase(),
                    computedClasses: element.className.split(' ').filter(c => !c.startsWith('elementor-')).join(' ') || null,
                    outerHTML: element.outerHTML
                };
            } catch (e) {
                return null;
            }
        },

        /**
         * Show a notification toast
         * @param {string} message - Message to display
         */
        showNotification: function (message) {
            // Use Elementor's notification if available
            if (window.elementor?.notifications?.showToast) {
                window.elementor.notifications.showToast({
                    message: message,
                    buttons: []
                });
                return;
            }

            // Fallback: create our own toast
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #0c0d0e;
                color: #fff;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 13px;
                z-index: 999999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: opacity 0.3s;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        },

        /**
         * Unwrap selected container - move children out and delete container
         * Similar to "Ungroup" in Figma
         * @returns {Promise<boolean>} Success status
         */
        unwrapContainer: async function () {
            if (!this.isReady()) {
                console.error('Elementor is not ready');
                return false;
            }

            const containers = this.getSelectedContainers();
            if (containers.length !== 1) {
                console.error('Please select exactly one container to unwrap');
                return false;
            }

            const container = containers[0];
            const elType = container.model?.get('elType');

            if (elType !== 'container') {
                console.error('Selected element is not a container');
                return false;
            }

            const parent = container.parent;
            if (!parent) {
                console.error('Container has no parent');
                return false;
            }

            const children = container.children || [];
            if (children.length === 0) {
                console.log('Container has no children, just deleting it');
                await this.runCommand('document/elements/delete', {
                    container: container
                });
                return true;
            }

            // Find index of container in parent
            const parentChildren = parent.children || [];
            const containerIndex = parentChildren.findIndex(c => c.id === container.id);

            try {
                // Move all children out to parent at container's position
                // Move in reverse to maintain order
                for (let i = children.length - 1; i >= 0; i--) {
                    const child = children[i];

                    await this.runCommand('document/elements/move', {
                        container: child,
                        target: parent,
                        options: {
                            at: containerIndex
                        }
                    });

                    console.log(`Moved element ${child.id} out of container`);
                }

                // Delete the now-empty container
                await this.runCommand('document/elements/delete', {
                    container: container
                });

                console.log('Successfully unwrapped container');
                return true;

            } catch (error) {
                console.error('Failed to unwrap container:', error);
                return false;
            }
        }
    };

    // Expose to global scope
    window.elementorTools = ElementTools;

    // Shorthand aliases
    window.getSelected = function () {
        return ElementTools.logSelected();
    };

    // Wrap selected elements in a container (like Figma's Group)
    window.wrapSelected = function () {
        return ElementTools.wrapInContainer();
    };

    // Unwrap/ungroup container
    window.unwrapSelected = function () {
        return ElementTools.unwrapContainer();
    };

    // Copy element context for AI
    window.copyForAI = function () {
        return ElementTools.copyForAI();
    };

    /**
     * Add items to Elementor's right-click context menu
     * Uses MutationObserver to inject items when menu appears
     */
    function initContextMenu() {
        // Create our menu items HTML
        function createMenuGroup() {
            const selected = window.elementor?.selection?.getElements() || [];
            const isContainer = selected.length === 1 && selected[0].model?.get('elType') === 'container';

            const group = document.createElement('div');
            group.className = 'elementor-context-menu-list__group elementor-context-menu-list__group-elementorgate';
            group.setAttribute('role', 'group');

            // Wrap in Container item
            const wrapItem = document.createElement('div');
            wrapItem.className = 'elementor-context-menu-list__item elementor-context-menu-list__item-wrap_container';
            wrapItem.setAttribute('role', 'menuitem');
            wrapItem.setAttribute('tabindex', '0');
            wrapItem.innerHTML = `
                <div class="elementor-context-menu-list__item__icon"><i class="eicon-frame-expand"></i></div>
                <div class="elementor-context-menu-list__item__title">Wrap in Container</div>
                <div class="elementor-context-menu-list__item__shortcut">⌘G</div>
            `;
            wrapItem.addEventListener('click', function() {
                ElementTools.wrapInContainer();
                closeContextMenu();
            });
            group.appendChild(wrapItem);

            // Unwrap Container item (only for containers)
            if (isContainer) {
                const unwrapItem = document.createElement('div');
                unwrapItem.className = 'elementor-context-menu-list__item elementor-context-menu-list__item-unwrap_container';
                unwrapItem.setAttribute('role', 'menuitem');
                unwrapItem.setAttribute('tabindex', '0');
                unwrapItem.innerHTML = `
                    <div class="elementor-context-menu-list__item__icon"><i class="eicon-frame-minimize"></i></div>
                    <div class="elementor-context-menu-list__item__title">Unwrap Container</div>
                    <div class="elementor-context-menu-list__item__shortcut">⌘⇧G</div>
                `;
                unwrapItem.addEventListener('click', function() {
                    ElementTools.unwrapContainer();
                    closeContextMenu();
                });
                group.appendChild(unwrapItem);
            }

            // Copy for AI item
            const copyAIItem = document.createElement('div');
            copyAIItem.className = 'elementor-context-menu-list__item elementor-context-menu-list__item-copy_ai';
            copyAIItem.setAttribute('role', 'menuitem');
            copyAIItem.setAttribute('tabindex', '0');
            copyAIItem.innerHTML = `
                <div class="elementor-context-menu-list__item__icon"><i class="eicon-ai"></i></div>
                <div class="elementor-context-menu-list__item__title">Copy for AI</div>
                <div class="elementor-context-menu-list__item__shortcut">⌘⇧A</div>
            `;
            copyAIItem.addEventListener('click', function() {
                ElementTools.copyForAI();
                closeContextMenu();
            });
            group.appendChild(copyAIItem);

            return group;
        }

        function closeContextMenu() {
            const menu = document.querySelector('.elementor-context-menu');
            if (menu) {
                menu.style.display = 'none';
            }
        }

        function injectMenuItems(menu) {
            // Check if already injected
            if (menu.querySelector('.elementor-context-menu-list__group-elementorgate')) {
                return;
            }

            const list = menu.querySelector('.elementor-context-menu-list');
            if (!list) return;

            // Find clipboard group to insert after
            const clipboardGroup = list.querySelector('.elementor-context-menu-list__group-clipboard');
            const menuGroup = createMenuGroup();

            if (clipboardGroup && clipboardGroup.nextSibling) {
                list.insertBefore(menuGroup, clipboardGroup.nextSibling);
            } else if (clipboardGroup) {
                clipboardGroup.parentNode.appendChild(menuGroup);
            } else {
                // Insert at the beginning if no clipboard group
                list.insertBefore(menuGroup, list.firstChild);
            }
        }

        // Watch for context menu appearing
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        // Check if this is the context menu
                        if (node.classList && node.classList.contains('elementor-context-menu')) {
                            injectMenuItems(node);
                        }
                        // Also check children
                        const contextMenu = node.querySelector?.('.elementor-context-menu');
                        if (contextMenu) {
                            injectMenuItems(contextMenu);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Also check for existing menu (in case it's reused)
        const existingMenu = document.querySelector('.elementor-context-menu');
        if (existingMenu) {
            // Re-inject when menu becomes visible
            const menuObserver = new MutationObserver(function() {
                if (existingMenu.style.display !== 'none' && existingMenu.offsetParent !== null) {
                    // Remove old group first
                    const oldGroup = existingMenu.querySelector('.elementor-context-menu-list__group-elementorgate');
                    if (oldGroup) oldGroup.remove();
                    injectMenuItems(existingMenu);
                }
            });
            menuObserver.observe(existingMenu, { attributes: true, attributeFilter: ['style'] });
        }
    }

    // Initialize context menu injection
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContextMenu);
    } else {
        initContextMenu();
    }

    /**
     * Add keyboard shortcut Cmd+G / Ctrl+G for wrap in container
     */
    function handleWrapShortcut(e) {
        // Cmd+G (Mac) or Ctrl+G (Windows)
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g' && !e.shiftKey && !e.altKey) {
            // Don't interfere when typing in inputs
            const activeElement = document.activeElement;
            const isTextInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );

            if (isTextInput) return;

            e.preventDefault();
            e.stopPropagation();
            ElementTools.wrapInContainer();
        }

        // Cmd+Shift+G for unwrap
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'g' && !e.altKey) {
            const activeElement = document.activeElement;
            const isTextInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );

            if (isTextInput) return;

            e.preventDefault();
            e.stopPropagation();
            ElementTools.unwrapContainer();
        }

        // Cmd+Shift+A for copy for AI
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a' && !e.altKey) {
            const activeElement = document.activeElement;
            const isTextInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );

            if (isTextInput) return;

            e.preventDefault();
            e.stopPropagation();
            ElementTools.copyForAI();
        }
    }

    // Attach keyboard shortcut to main document
    document.addEventListener('keydown', handleWrapShortcut, true);
    window.addEventListener('keydown', handleWrapShortcut, true);

    // Also attach to Elementor's preview iframe
    function attachShortcutToIframe() {
        const iframe = document.getElementById('elementor-preview-iframe');
        if (iframe && iframe.contentDocument) {
            iframe.contentDocument.addEventListener('keydown', handleWrapShortcut, true);
            iframe.contentWindow.addEventListener('keydown', handleWrapShortcut, true);
        } else {
            setTimeout(attachShortcutToIframe, 500);
        }
    }

    attachShortcutToIframe();

    if (window.elementor) {
        window.elementor.on('preview:loaded', attachShortcutToIframe);
    }

})();
