let mealPlan = [];

/**
 * Loads meal plan data from localStorage and displays it
 */
function loadMealPlan() {
    mealPlan = JSON.parse(localStorage.getItem('mealPlan') || '[]');
    displayMealPlan();
}

/**
 * Renders the meal plan interface with recipes grouped by date
 * Shows empty state when no recipes are present
 */
function displayMealPlan() {
    const container = document.getElementById('meal-plan-items');
    const clearButton = document.getElementById('clear-meal-plan-btn');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (mealPlan.length === 0) {
        container.innerHTML = '<div class="card card-compact text-center text-muted">Your meal plan is empty. Add recipes from your shopping list!</div>';
        if (clearButton) clearButton.style.display = 'none';
        return;
    }
    
    if (clearButton) clearButton.style.display = 'block';
    
    // Group meals by date
    const mealsByDate = {};
    mealPlan.forEach(recipe => {
        const dateKey = new Date(recipe.dateAdded).toDateString();
        if (!mealsByDate[dateKey]) {
            mealsByDate[dateKey] = [];
        }
        mealsByDate[dateKey].push(recipe);
    });
    
    // Sort dates (most recent first)
    const sortedDates = Object.keys(mealsByDate).sort((a, b) => new Date(b) - new Date(a));
    
    sortedDates.forEach(dateKey => {
        // Create date header
        const dateHeaderDiv = document.createElement('div');
        dateHeaderDiv.className = 'meal-plan-date-header mb-md';
        
        const date = new Date(dateKey);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        let dateLabel;
        if (date.toDateString() === today.toDateString()) {
            dateLabel = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            dateLabel = 'Yesterday';
        } else {
            dateLabel = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
            });
        }
        
        dateHeaderDiv.innerHTML = `
            <h3 class="text-lg font-medium text-muted mb-sm">${dateLabel}</h3>
        `;
        
        container.appendChild(dateHeaderDiv);
        
        // Add meals for this date
        mealsByDate[dateKey].forEach((recipe, index) => {
            const recipeDiv = document.createElement('div');
            recipeDiv.className = 'meal-plan-item card card-compact mb-md';
            recipeDiv.style.cursor = 'pointer';
            
            // Setup swipe-to-delete functionality
            setupSwipeToDelete(recipeDiv, recipe.name, removeRecipeFromMealPlan);
            
            recipeDiv.addEventListener('click', (e) => {
                // Don't navigate if swiping
                if (recipeDiv.classList.contains('swiping')) {
                    return;
                }
                goToCookingSession(recipe.name, recipe.slug);
            });
            
            // Build additional info HTML
            let additionalInfo = '';
            if (recipe.totalTime || recipe.notes) {
                const infoParts = [];
                if (recipe.totalTime) {
                    infoParts.push(`⏱️ ${recipe.totalTime}`);
                }
                if (recipe.notes) {
                    infoParts.push(`📝 ${recipe.notes}`);
                }
                additionalInfo = `<div class="text-sm text-muted mt-xs">${infoParts.join(' • ')}</div>`;
            }
            
            recipeDiv.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-md">
                        <div>
                            <div class="recipe-name font-medium">${recipe.name}</div>
                            ${additionalInfo}
                        </div>
                    </div>
                    <div class="flex items-center gap-md">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); goToCookingSession('${recipe.name}', '${recipe.slug || ''}')">
                            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 12,2M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z"/>
                            </svg>
                            Cook
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(recipeDiv);
        });
    });
}

/**
 * Adds a recipe to the meal plan or updates existing recipe with new date
 * @param {string} recipeName - The name of the recipe to add
 * @param {string|null} recipeSlug - Optional URL slug for the recipe
 * @param {Object} metadata - Additional recipe metadata (prep time, notes, etc.)
 */
function addToMealPlan(recipeName, recipeSlug = null, metadata = {}) {
    // Reload meal plan from localStorage to ensure we have the latest data
    mealPlan = JSON.parse(localStorage.getItem('mealPlan') || '[]');
    
    // Check if recipe is already in meal plan
    const existingRecipeIndex = mealPlan.findIndex(recipe => recipe.name === recipeName);
    
    if (existingRecipeIndex >= 0) {
        // Move existing recipe to today by updating its dateAdded
        mealPlan[existingRecipeIndex].dateAdded = new Date().toISOString();
        // Update slug if provided
        if (recipeSlug) {
            mealPlan[existingRecipeIndex].slug = recipeSlug;
        }
        // Update metadata
        Object.assign(mealPlan[existingRecipeIndex], metadata);
    } else {
        // Add new recipe
        const newRecipe = {
            name: recipeName,
            dateAdded: new Date().toISOString(),
            ...metadata
        };
        if (recipeSlug) {
            newRecipe.slug = recipeSlug;
        }
        mealPlan.push(newRecipe);
    }
    
    // Save back to localStorage
    localStorage.setItem('mealPlan', JSON.stringify(mealPlan));
    
    // Update display if we're on the meal plan page
    if (document.getElementById('meal-plan-items')) {
        displayMealPlan();
    }
}

/**
 * Removes a recipe from the meal plan by index
 * @param {number} index - The index of the recipe to remove
 */
function removeFromMealPlan(index) {
    if (index >= 0 && index < mealPlan.length) {
        mealPlan.splice(index, 1);
        localStorage.setItem('mealPlan', JSON.stringify(mealPlan));
        displayMealPlan();
    }
}

/**
 * Removes a recipe from the meal plan by name
 * @param {string} recipeName - The name of the recipe to remove
 */
function removeRecipeFromMealPlan(recipeName) {
    const index = mealPlan.findIndex(recipe => recipe.name === recipeName);
    if (index >= 0) {
        removeFromMealPlan(index);
    }
}

/**
 * Clears all recipes from the meal plan after user confirmation
 */
function clearMealPlan() {
    showConfirmationModal(
        'Clear Meal Plan',
        'Remove all recipes from your meal plan?',
        () => {
            mealPlan = [];
            localStorage.setItem('mealPlan', JSON.stringify(mealPlan));
            displayMealPlan();
        }
    );
}

/**
 * Navigates to the cooking session for a specific recipe
 * @param {string} recipeName - The name of the recipe to cook
 * @param {string|null} recipeSlug - Optional URL slug for the recipe
 */
async function goToCookingSession(recipeName, recipeSlug = null) {
    try {
        // Use stored slug if available, otherwise generate from name
        let slug = recipeSlug;
        if (!slug) {
            // Find the recipe in the meal plan to get its slug
            const recipe = mealPlan.find(r => r.name === recipeName);
            slug = recipe?.slug;
        }
        
        // If still no slug, generate from recipe name as fallback
        if (!slug) {
            slug = recipeName.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        
        // Navigate directly to recipe page with ?cook parameter
        const recipeUrl = `/${slug}/?cook`;
        window.location.href = recipeUrl;
    } catch (error) {
        console.error('Error navigating to cooking session:', error);
        // Fallback: try with generated slug
        const slug = recipeName.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        window.location.href = `/${slug}/?cook`;
    }
}


// Load meal plan when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('meal-plan-items')) {
        loadMealPlan();
    }
});

// Update meal plan when localStorage changes (from other tabs)
window.addEventListener('storage', function(e) {
    if (e.key === 'mealPlan' && document.getElementById('meal-plan-items')) {
        loadMealPlan();
    }
});