(function () {
    'use strict';

    /**
     * Spacing Measure Tool - Figma-like spacing measurement
     * Toggle on/off via command palette
     */
    const SpacingMeasure = {
        isActive: false,
        overlayContainer: null,
        previewDoc: null,
        previewFrame: null,
        lastHoveredElement: null,

        // Colors matching Figma's style
        colors: {
            primary: '#f24822',
            text: '#ffffff'
        },

        /**
         * Initialize the spacing measure tool
         */
        init: function () {
            this.waitForPreview();
        },

        /**
         * Wait for preview iframe to be ready
         */
        waitForPreview: function () {
            const self = this;

            const check = () => {
                const frame = document.getElementById('elementor-preview-iframe');
                if (frame && frame.contentDocument && frame.contentDocument.body) {
                    self.previewFrame = frame;
                    self.previewDoc = frame.contentDocument;
                    self.bindPreviewEvents();
                } else {
                    setTimeout(check, 500);
                }
            };

            check();
        },

        /**
         * Bind events on preview iframe
         */
        bindPreviewEvents: function () {
            const self = this;

            this.previewDoc.addEventListener('mousemove', (e) => {
                if (self.isActive) {
                    self.onMouseMove(e);
                }
            });

            this.previewDoc.addEventListener('mouseleave', () => {
                if (self.isActive) {
                    self.clearMeasurements();
                }
            });
        },

        /**
         * Toggle the spacing measure tool
         */
        toggle: function (forceState) {
            if (typeof forceState === 'boolean') {
                this.isActive = forceState;
            } else {
                this.isActive = !this.isActive;
            }

            if (this.isActive) {
                this.activate();
            } else {
                this.deactivate();
            }

            return this.isActive;
        },

        /**
         * Activate spacing measure mode
         */
        activate: function () {
            const frame = document.getElementById('elementor-preview-iframe');
            if (frame && frame.contentDocument && frame.contentDocument.body) {
                if (this.previewDoc !== frame.contentDocument) {
                    this.previewDoc = frame.contentDocument;
                    this.previewFrame = frame;
                    this.bindPreviewEvents();
                }
            }

            if (!this.previewDoc) return;

            this.createOverlay();
            this.previewDoc.body.style.cursor = 'crosshair';
        },

        /**
         * Deactivate spacing measure mode
         */
        deactivate: function () {
            this.removeOverlay();
            this.lastHoveredElement = null;

            if (this.previewDoc?.body) {
                this.previewDoc.body.style.cursor = '';
            }
        },

        /**
         * Mouse move while active
         */
        onMouseMove: function (e) {
            const hoveredElement = this.findMeasurableElement(e.target);

            if (!hoveredElement) {
                this.clearMeasurements();
                this.lastHoveredElement = null;
                return;
            }

            const referenceElement = this.getSelectedElement();

            if (!referenceElement) {
                if (hoveredElement !== this.lastHoveredElement) {
                    this.lastHoveredElement = hoveredElement;
                    this.clearMeasurements();
                    this.highlightElement(hoveredElement);
                }
                return;
            }

            if (hoveredElement === referenceElement) {
                this.clearMeasurements();
                this.lastHoveredElement = null;
                return;
            }

            if (hoveredElement !== this.lastHoveredElement) {
                this.lastHoveredElement = hoveredElement;
                this.measureAndDisplay(referenceElement, hoveredElement);
            }
        },

        /**
         * Get currently selected Elementor element
         */
        getSelectedElement: function () {
            if (!window.elementor?.selection) return null;

            const selected = window.elementor.selection.getElements();
            if (selected.length === 0) return null;

            const container = selected[0];
            const elementId = container.id;

            if (!elementId || !this.previewDoc) return null;

            return this.previewDoc.querySelector(`[data-id="${elementId}"]`);
        },

        /**
         * Find the nearest measurable element
         */
        findMeasurableElement: function (target) {
            if (!target || !this.previewDoc) return null;

            let current = target;

            while (current && current !== this.previewDoc.body) {
                if (current.dataset && current.dataset.id) {
                    return current;
                }
                current = current.parentElement;
            }

            return null;
        },

        /**
         * Create overlay container
         */
        createOverlay: function () {
            if (!this.previewDoc) return;

            this.removeOverlay();

            this.overlayContainer = this.previewDoc.createElement('div');
            this.overlayContainer.id = 'efsp-spacing-overlay';
            this.overlayContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 999999;
            `;

            this.previewDoc.body.appendChild(this.overlayContainer);
        },

        /**
         * Remove overlay
         */
        removeOverlay: function () {
            if (this.overlayContainer) {
                this.overlayContainer.remove();
                this.overlayContainer = null;
            }
        },

        /**
         * Measure and display spacing
         */
        measureAndDisplay: function (refElement, hoverElement) {
            if (!this.overlayContainer) return;

            this.clearMeasurements();

            const refRect = refElement.getBoundingClientRect();
            const hoverRect = hoverElement.getBoundingClientRect();

            this.highlightElement(hoverElement);
            this.drawSpacingGuides(refRect, hoverRect);
        },

        /**
         * Highlight hovered element
         */
        highlightElement: function (element) {
            if (!this.overlayContainer) return;

            const rect = element.getBoundingClientRect();

            const highlight = this.previewDoc.createElement('div');
            highlight.style.cssText = `
                position: fixed;
                top: ${rect.top}px;
                left: ${rect.left}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                border: 1px dashed ${this.colors.primary};
                pointer-events: none;
                z-index: 999998;
            `;

            this.overlayContainer.appendChild(highlight);
        },

        /**
         * Draw spacing guides between two rectangles
         */
        drawSpacingGuides: function (refRect, hoverRect) {
            const gaps = {
                top: refRect.top - hoverRect.bottom,
                bottom: hoverRect.top - refRect.bottom,
                left: refRect.left - hoverRect.right,
                right: hoverRect.left - refRect.right
            };

            if (gaps.top > 0) {
                this.drawVerticalMeasure(refRect, hoverRect, 'top', gaps.top);
            } else if (gaps.bottom > 0) {
                this.drawVerticalMeasure(refRect, hoverRect, 'bottom', gaps.bottom);
            }

            if (gaps.left > 0) {
                this.drawHorizontalMeasure(refRect, hoverRect, 'left', gaps.left);
            } else if (gaps.right > 0) {
                this.drawHorizontalMeasure(refRect, hoverRect, 'right', gaps.right);
            }

            if (gaps.top <= 0 && gaps.bottom <= 0 && gaps.left <= 0 && gaps.right <= 0) {
                this.drawOverlapMeasures(refRect, hoverRect);
            }
        },

        /**
         * Draw vertical measurement
         */
        drawVerticalMeasure: function (refRect, hoverRect, position, distance) {
            const x = Math.max(refRect.left, hoverRect.left) +
                      Math.min(refRect.width, hoverRect.width) / 2;

            let y1, y2;
            if (position === 'top') {
                y1 = hoverRect.bottom;
                y2 = refRect.top;
            } else {
                y1 = refRect.bottom;
                y2 = hoverRect.top;
            }

            this.drawMeasureLine(x, y1, x, y2, Math.round(distance), 'vertical');
        },

        /**
         * Draw horizontal measurement
         */
        drawHorizontalMeasure: function (refRect, hoverRect, position, distance) {
            const y = Math.max(refRect.top, hoverRect.top) +
                      Math.min(refRect.height, hoverRect.height) / 2;

            let x1, x2;
            if (position === 'left') {
                x1 = hoverRect.right;
                x2 = refRect.left;
            } else {
                x1 = refRect.right;
                x2 = hoverRect.left;
            }

            this.drawMeasureLine(x1, y, x2, y, Math.round(distance), 'horizontal');
        },

        /**
         * Draw overlap measurements
         */
        drawOverlapMeasures: function (refRect, hoverRect) {
            const leftDiff = Math.abs(hoverRect.left - refRect.left);
            if (leftDiff > 1) {
                const minX = Math.min(refRect.left, hoverRect.left);
                const maxX = Math.max(refRect.left, hoverRect.left);
                const y = Math.min(refRect.top, hoverRect.top) - 15;
                this.drawMeasureLine(minX, y, maxX, y, Math.round(leftDiff), 'horizontal');
            }

            const topDiff = Math.abs(hoverRect.top - refRect.top);
            if (topDiff > 1) {
                const minY = Math.min(refRect.top, hoverRect.top);
                const maxY = Math.max(refRect.top, hoverRect.top);
                const x = Math.min(refRect.left, hoverRect.left) - 15;
                this.drawMeasureLine(x, minY, x, maxY, Math.round(topDiff), 'vertical');
            }
        },

        /**
         * Draw a measurement line with label
         */
        drawMeasureLine: function (x1, y1, x2, y2, distance, orientation) {
            if (distance <= 0) return;

            const isVertical = orientation === 'vertical';

            const line = this.previewDoc.createElement('div');
            if (isVertical) {
                const top = Math.min(y1, y2);
                const height = Math.abs(y2 - y1);
                line.style.cssText = `
                    position: fixed;
                    left: ${x1}px;
                    top: ${top}px;
                    width: 1px;
                    height: ${height}px;
                    background: ${this.colors.primary};
                    pointer-events: none;
                    z-index: 999999;
                `;
            } else {
                const left = Math.min(x1, x2);
                const width = Math.abs(x2 - x1);
                line.style.cssText = `
                    position: fixed;
                    left: ${left}px;
                    top: ${y1}px;
                    width: ${width}px;
                    height: 1px;
                    background: ${this.colors.primary};
                    pointer-events: none;
                    z-index: 999999;
                `;
            }
            this.overlayContainer.appendChild(line);

            if (isVertical) {
                this.drawCap(x1 - 4, Math.min(y1, y2), 9, 1);
                this.drawCap(x1 - 4, Math.max(y1, y2), 9, 1);
            } else {
                this.drawCap(Math.min(x1, x2), y1 - 4, 1, 9);
                this.drawCap(Math.max(x1, x2), y1 - 4, 1, 9);
            }

            const label = this.previewDoc.createElement('div');
            label.textContent = distance;
            label.style.cssText = `
                position: fixed;
                background: ${this.colors.primary};
                color: ${this.colors.text};
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 10px;
                font-weight: 600;
                padding: 2px 5px;
                border-radius: 3px;
                pointer-events: none;
                z-index: 1000000;
                white-space: nowrap;
            `;

            if (isVertical) {
                const midY = (Math.min(y1, y2) + Math.max(y1, y2)) / 2;
                label.style.left = `${x1 + 6}px`;
                label.style.top = `${midY - 9}px`;
            } else {
                const midX = (Math.min(x1, x2) + Math.max(x1, x2)) / 2;
                label.style.left = `${midX - 12}px`;
                label.style.top = `${y1 - 20}px`;
            }

            this.overlayContainer.appendChild(label);
        },

        /**
         * Draw end cap
         */
        drawCap: function (x, y, width, height) {
            const cap = this.previewDoc.createElement('div');
            cap.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
                background: ${this.colors.primary};
                pointer-events: none;
                z-index: 999999;
            `;
            this.overlayContainer.appendChild(cap);
        },

        /**
         * Clear measurements
         */
        clearMeasurements: function () {
            if (this.overlayContainer) {
                this.overlayContainer.innerHTML = '';
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SpacingMeasure.init());
    } else {
        SpacingMeasure.init();
    }

    // Expose to global scope
    window.SpacingMeasure = SpacingMeasure;

})();
