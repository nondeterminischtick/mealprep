/**
 * Shared UI utilities and modal functions
 */

let confirmationAction = null;

/**
 * Shows a confirmation modal with custom title, message, and action
 * @param {string} title - The modal title
 * @param {string} message - The confirmation message
 * @param {Function} action - The function to execute on confirmation
 */
function showConfirmationModal(title, message, action) {
    document.getElementById('confirmation-title').textContent = title;
    document.getElementById('confirmation-message').textContent = message;
    confirmationAction = action;
    document.getElementById('confirmation-modal').classList.add('is-active');
}

/**
 * Closes the confirmation modal and clears the pending action
 */
function closeConfirmationModal() {
    document.getElementById('confirmation-modal').classList.remove('is-active');
    confirmationAction = null;
}

/**
 * Executes the pending confirmation action and closes the modal
 */
function confirmAction() {
    if (confirmationAction) {
        confirmationAction();
    }
    closeConfirmationModal();
}

// Global keyboard handler for modals
document.addEventListener('keydown', function(event) {
    const confirmationModal = document.getElementById('confirmation-modal');
    
    if (confirmationModal && confirmationModal.classList.contains('is-active')) {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmAction();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeConfirmationModal();
        }
    }
});