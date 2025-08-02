// Base functionality for all pages

/**
 * Updates the shopping list count badge in the navigation
 * Shows recipe count and ingredient count, hides if empty
 */
function updateShoppingListCount() {
    const shoppingList = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    const countElement = document.getElementById('shopping-count');
    
    if (countElement && shoppingList.length > 0) {
        // Count unique recipes
        const recipes = new Set();
        shoppingList.forEach(item => {
            item.recipes.forEach(recipe => {
                recipes.add(recipe.name);
            });
        });
        
        const recipeCount = recipes.size;
        const itemCount = shoppingList.length;
        
        countElement.textContent = `${recipeCount}/${itemCount}`;
        countElement.title = `${recipeCount} recipe${recipeCount !== 1 ? 's' : ''}, ${itemCount} ingredient${itemCount !== 1 ? 's' : ''}`;
        countElement.style.display = 'inline';
    } else if (countElement) {
        countElement.style.display = 'none';
    }
}

/**
 * Sets the active navigation state based on current page URL
 * Highlights the appropriate navigation link
 */
function setActiveNavigation() {
    const currentPath = window.location.pathname;
    const currentParams = window.location.search;
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Remove active class from all nav links
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Determine which link should be active
    if (currentPath === '/') {
        const planLink = document.querySelector('a[href="/"]');
        if (planLink) planLink.classList.add('active');
    } else if (currentPath.includes('shop')) {
        const shopLink = document.querySelector('a[href="/shop/"]');
        if (shopLink) shopLink.classList.add('active');
    } else if (currentPath.includes('meals')) {
        const cookLink = document.querySelector('a[href="/meals/"]');
        if (cookLink) cookLink.classList.add('active');
    } else if (currentParams.includes('cook')) {
        // Recipe pages with ?cook parameter should highlight Cook nav
        const cookLink = document.querySelector('a[href="/meals/"]');
        if (cookLink) cookLink.classList.add('active');
    } else {
        // For individual recipe pages without cook parameter, activate Plan
        const planLink = document.querySelector('a[href="/"]');
        if (planLink) planLink.classList.add('active');
    }
}

// Update count and set active nav on page load
document.addEventListener('DOMContentLoaded', function() {
    updateShoppingListCount();
    setActiveNavigation();
});

// Update count when storage changes (from other tabs)
window.addEventListener('storage', function(e) {
    if (e.key === 'shoppingList') {
        updateShoppingListCount();
    }
});