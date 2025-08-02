// Gesture utilities using Hammer.js for swipe-to-delete and long press functionality

/**
 * Sets up swipe-to-delete functionality on an element using Hammer.js
 * @param {HTMLElement} element - The element to enable swipe-to-delete on
 * @param {string|number} itemId - The ID of the item to delete
 * @param {Function} onDeleteCallback - Callback function called with itemId when item is deleted
 */
function setupSwipeToDelete(element, itemId, onDeleteCallback) {
    if (typeof Hammer === 'undefined') {
        console.warn('Hammer.js not loaded, skipping swipe setup');
        return;
    }
    
    const hammer = new Hammer(element);
    const threshold = 100; // Minimum swipe distance in pixels
    let isDeleting = false;
    
    // Configure swipe gesture
    hammer.get('swipe').set({
        direction: Hammer.DIRECTION_HORIZONTAL,
        threshold: 15, // Increased threshold to reduce conflict with long press
        velocity: 0.2  // Increased velocity requirement
    });
    
    // Enable pan gesture for smooth dragging
    hammer.get('pan').set({
        direction: Hammer.DIRECTION_HORIZONTAL,
        threshold: 15 // Increased from 0 to give long press priority
    });
    
    hammer.on('panstart', function(ev) {
        element.classList.add('swiping');
        element.style.transition = 'none';
        element.style.zIndex = '10';
    });
    
    hammer.on('panmove', function(ev) {
        if (isDeleting) return;
        
        const deltaX = ev.deltaX;
        const maxTranslate = 200;
        const translateX = Math.max(-maxTranslate, Math.min(maxTranslate, deltaX));
        
        element.style.transform = `translateX(${translateX}px)`;
        
        // Visual feedback when past threshold
        if (Math.abs(translateX) > threshold) {
            element.classList.add('delete-ready');
        } else {
            element.classList.remove('delete-ready');
        }
    });
    
    hammer.on('panend', function(ev) {
        if (isDeleting) return;
        
        const deltaX = ev.deltaX;
        element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        
        if (Math.abs(deltaX) > threshold) {
            // Delete the item
            isDeleting = true;
            const slideDirection = deltaX > 0 ? '100%' : '-100%';
            element.style.transform = `translateX(${slideDirection})`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                onDeleteCallback(itemId);
            }, 300);
        } else {
            // Snap back to original position
            element.style.transform = 'translateX(0)';
            element.classList.remove('delete-ready', 'swiping');
            element.style.zIndex = '';
        }
    });
    
    // Handle swipe gestures for quick swipes
    hammer.on('swipeleft swiperight', function(ev) {
        if (isDeleting) return;
        
        isDeleting = true;
        element.classList.add('delete-ready');
        element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        
        const slideDirection = ev.type === 'swiperight' ? '100%' : '-100%';
        element.style.transform = `translateX(${slideDirection})`;
        element.style.opacity = '0';
        
        setTimeout(() => {
            onDeleteCallback(itemId);
        }, 300);
    });
}

/**
 * Sets up long press functionality on an element using Hammer.js
 * @param {HTMLElement} element - The element to enable long press on
 * @param {string|number} itemId - The ID of the item for the long press action
 * @param {Function} onLongPressCallback - Callback function called with itemId on long press
 */
function setupLongPress(element, itemId, onLongPressCallback) {
    if (typeof Hammer === 'undefined') {
        console.warn('Hammer.js not loaded, skipping long press setup');
        return;
    }
    
    const hammer = new Hammer(element);
    let isLongPressed = false;
    let isPressInProgress = false;
    
    // Configure press gesture
    hammer.get('press').set({
        time: 400, // Reduced to 400ms for faster response
        threshold: 25 // Increased movement tolerance to 25px
    });
    
    // Track when press gesture starts to prevent pan conflicts
    hammer.on('pressup', function(ev) {
        isPressInProgress = false;
    });
    
    hammer.on('press', function(ev) {
        // Don't trigger long press if already swiping
        if (element.classList.contains('swiping')) {
            return;
        }
        
        isPressInProgress = true;
        isLongPressed = true;
        element.classList.add('long-pressed');
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Call the long press callback
        onLongPressCallback(itemId);
        
        // Remove long-pressed class after a short delay
        setTimeout(() => {
            element.classList.remove('long-pressed');
            isLongPressed = false;
            isPressInProgress = false;
        }, 200);
    });
    
    // Cancel long press if user starts swiping, but only if press isn't in progress
    hammer.on('panstart', function(ev) {
        if (isPressInProgress) {
            // Don't allow pan to start if press is happening
            ev.preventDefault();
            return false;
        }
        
        if (isLongPressed) {
            element.classList.remove('long-pressed');
            isLongPressed = false;
        }
    });
}