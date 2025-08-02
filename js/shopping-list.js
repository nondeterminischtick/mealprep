/**
 * Shopping list domain functions
 */

let shoppingList = [];
let hideCompleted = false;
let collapsedCategories = new Set();
let selectedItemId = null;

/**
 * Loads shopping list data from localStorage and initializes the interface
 */
function loadShoppingList() {
    shoppingList = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    hideCompleted = localStorage.getItem('hideCompleted') === 'true';
    const savedCollapsed = localStorage.getItem('collapsedCategories');
    if (savedCollapsed) {
        collapsedCategories = new Set(JSON.parse(savedCollapsed));
    }
    updateHideToggleButton();
    updateShoppingListCount();
    displayRecipeList();
    displayShoppingList();
}

/**
 * Renders the shopping list grouped by categories with collapse/expand functionality
 */
function displayShoppingList() {
    const container = document.getElementById('shopping-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (shoppingList.length === 0) {
        container.innerHTML = '<div class="card card-compact text-center text-muted">Your shopping list is empty</div>';
        return;
    }
    
    // Group by category
    const categoryGroups = {};
    shoppingList.forEach(item => {
        const category = item.category || 'Other';
        if (!categoryGroups[category]) {
            categoryGroups[category] = [];
        }
        categoryGroups[category].push(item);
    });
    
    // Sort categories by configured order and items within each category
    const sortedCategories = Object.keys(categoryGroups).sort((a, b) => {
        const orderA = getCategoryOrder(a);
        const orderB = getCategoryOrder(b);
        return orderA - orderB;
    });
    
    sortedCategories.forEach(categoryName => {
        // Sort items within category alphabetically by name
        categoryGroups[categoryName].sort((a, b) => a.name.localeCompare(b.name));
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'shopping-category';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'category-header';
        headerDiv.onclick = () => toggleCategory(categoryName);
        headerDiv.innerHTML = `
            <svg class="category-chevron" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
            </svg>
            <span>${categoryName}</span>
        `;
        categoryDiv.appendChild(headerDiv);
        
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'category-items';
        itemsDiv.id = `category-${categoryName.replace(/\s+/g, '-').toLowerCase()}`;
        categoryDiv.appendChild(itemsDiv);
        
        categoryGroups[categoryName].forEach(item => {
            // Skip completed items if hide toggle is enabled
            if (hideCompleted && item.completed) {
                return;
            }
            
            const itemDiv = document.createElement('div');
            itemDiv.className = `shopping-item ${item.completed ? 'completed' : ''}`;
            itemDiv.dataset.itemId = item.id;
            
            // Setup swipe-to-delete with Hammer.js
            setupSwipeToDelete(itemDiv, item.id, removeItem);
            
            // Setup long press for category modal - only for custom items (no recipes)
            if (item.recipes.length === 0) {
                setupLongPress(itemDiv, item.id, showCategoryModal);
            }
            
            itemDiv.addEventListener('click', (e) => {
                // Don't toggle if clicking on the remove button, if item is being swiped, or during long press
                if (e.target.classList.contains('btn') || 
                    itemDiv.classList.contains('swiping') ||
                    itemDiv.classList.contains('long-pressed')) {
                    return;
                }
                toggleItemCompleted(item.id);
            });
            
            const displayText = item.amount !== null && item.unit 
                ? `${item.amount}${item.unit} ${item.name}`
                : item.amount !== null 
                ? `${item.amount} ${item.name}`
                : item.name;
            
            const recipeNames = item.recipes.map(recipe => recipe.name);
            const recipeText = recipeNames.length > 1 
                ? `Used in: ${recipeNames.join(', ')}`
                : recipeNames.length === 1 
                ? `From: ${recipeNames[0]}`
                : 'Custom item';
            
            itemDiv.innerHTML = `
                <div class="item-content">
                    <input type="checkbox" class="item-checkbox" ${item.completed ? 'checked' : ''} 
                            onchange="toggleItemCompleted('${item.id}')">
                    <div class="item-details">
                        <div class="item-text">${displayText}</div>
                        <div class="item-recipes">${recipeText}</div>
                    </div>
                </div>
            `;
            
            itemsDiv.appendChild(itemDiv);
        });
        
        // Only add category if it has visible items
        if (itemsDiv.children.length > 0) {
            // Set initial collapsed state
            const isCollapsed = collapsedCategories.has(categoryName);
            if (isCollapsed) {
                itemsDiv.style.display = 'none';
                headerDiv.classList.add('collapsed');
            }
            container.appendChild(categoryDiv);
        }
    });
}

/**
 * Toggles the completed status of a shopping list item
 * @param {string|number} itemId - The ID of the item to toggle
 */
function toggleItemCompleted(itemId) {
    const item = shoppingList.find(item => item.id == itemId);
    if (item) {
        item.completed = !item.completed;
        localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
        displayShoppingList();
    }
}

/**
 * Removes an item from the shopping list
 * @param {string|number} itemId - The ID of the item to remove
 */
function removeItem(itemId) {
    shoppingList = shoppingList.filter(item => item.id != itemId);
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    updateShoppingListCount();
    displayRecipeList();
    displayShoppingList();
}

/**
 * Displays the list of recipes and their ingredient counts with management controls
 */
function displayRecipeList() {
    const recipeContainer = document.getElementById('recipe-list');
    const recipeManagement = document.getElementById('recipe-management');
    const moveToMealPlanBtn = document.getElementById('move-to-meal-plan-btn');
    const moveToMealPlanBtnBottom = document.getElementById('move-to-meal-plan-btn-bottom');
    
    if (!recipeContainer || !recipeManagement) return;
    
    // Get unique recipes and count their ingredients
    const recipeCount = {};
    shoppingList.forEach(item => {
        if (item.recipes && item.recipes.length > 0) {
            item.recipes.forEach(recipe => {
                if (!recipeCount[recipe.name]) {
                    recipeCount[recipe.name] = { count: 0, slug: recipe.slug };
                }
                recipeCount[recipe.name].count++;
            });
        }
    });
    
    const recipeNames = Object.keys(recipeCount);
    
    // Show/hide the "I've shopped this list" buttons based on whether there are recipes
    const hasRecipes = recipeNames.length > 0;
    if (moveToMealPlanBtn) {
        moveToMealPlanBtn.style.display = hasRecipes ? 'block' : 'none';
    }
    if (moveToMealPlanBtnBottom) {
        moveToMealPlanBtnBottom.style.display = hasRecipes ? 'block' : 'none';
    }
    
    if (recipeNames.length === 0) {
        recipeManagement.style.display = 'none';
        return;
    }
    
    recipeManagement.style.display = 'block';
    recipeContainer.innerHTML = '';
    
    recipeNames.sort().forEach(recipeName => {
        const recipeDiv = document.createElement('div');
        recipeDiv.className = 'recipe-item';
        
        const count = recipeCount[recipeName].count;
        const itemText = count === 1 ? 'ingredient' : 'ingredients';
        
        const slug = recipeCount[recipeName].slug;
        recipeDiv.innerHTML = `
            <div class="recipe-info">
                <a href="/${slug}/" class="recipe-name-link">${recipeName}</a>
                <div class="recipe-count">${count} ${itemText}</div>
            </div>
            <button class="btn btn-error btn-sm" onclick="removeRecipe('${recipeName.replace(/'/g, "\\'")}')">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                </svg>
                Remove
            </button>
        `;
        
        recipeContainer.appendChild(recipeDiv);
    });
}

/**
 * Removes all ingredients for a specific recipe from the shopping list
 * @param {string} recipeName - The name of the recipe to remove
 */
function removeRecipe(recipeName) {
    showConfirmationModal(
        'Remove Recipe',
        `Remove all ingredients for "${recipeName}"?`,
        () => {
            shoppingList = shoppingList.filter(item => {
                if (hasRecipe(item.recipes, recipeName)) {
                    // Initialize recipe contributions if not present
                    if (!item.recipeContributions) {
                        item.recipeContributions = {};
                        const amountPerRecipe = item.amount / item.recipes.length;
                        item.recipes.forEach(recipe => {
                            item.recipeContributions[recipe.name] = amountPerRecipe;
                        });
                    }
                    
                    // Subtract this recipe's contribution from the total amount
                    if (item.recipeContributions[recipeName] && item.amount !== null) {
                        item.amount -= item.recipeContributions[recipeName];
                        // Ensure amount doesn't go below 0
                        if (item.amount < 0) item.amount = 0;
                    }
                    
                    // Remove this recipe's contribution
                    delete item.recipeContributions[recipeName];
                    
                    // Remove this recipe from the item's recipe list
                    item.recipes = item.recipes.filter(recipe => recipe.name !== recipeName);
                    
                    // If this was the only recipe for this item, remove the item completely
                    return item.recipes.length > 0;
                }
                return true;
            });
            
            localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
            updateShoppingListCount();
            displayRecipeList();
            displayShoppingList();
        }
    );
}

/**
 * Adds ingredients to the shopping list, combining with existing items where possible
 * @param {string} recipeName - The name of the recipe
 * @param {string} recipeSlug - The URL slug of the recipe
 * @param {Array} ingredients - Array of ingredient objects to add
 * @param {Object} recipeMetadata - Recipe metadata to store for later meal plan transfer
 */
function addIngredientsToShoppingList(recipeName, recipeSlug, ingredients, recipeMetadata = {}) {
    let shoppingList = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    
    ingredients.forEach(ingredient => {
        const parsed = parseIngredientInput(ingredient.text);
        parsed.category = ingredient.category;
        
        console.log('Adding ingredient:', ingredient.text, 'with category:', ingredient.category);
        
        // Find existing ingredient with same name and unit
        const existingIndex = shoppingList.findIndex(item => 
            item.name.toLowerCase() === parsed.name.toLowerCase() && 
            item.unit === parsed.unit
        );
        
        if (existingIndex >= 0) {
            const existingItem = shoppingList[existingIndex];
            
            // Initialize recipe contributions if not present
            if (!existingItem.recipeContributions) {
                existingItem.recipeContributions = {};
                // Assume all current amount came from existing recipes equally
                const amountPerRecipe = existingItem.amount / existingItem.recipes.length;
                existingItem.recipes.forEach(recipe => {
                    existingItem.recipeContributions[recipe] = amountPerRecipe;
                });
            }
            
            // Add this recipe's contribution
            if (parsed.amount !== null) {
                existingItem.recipeContributions[recipeName] = parsed.amount;
                existingItem.amount += parsed.amount;
            }
            
            // Check if recipe already exists in the list
            const hasRecipe = existingItem.recipes.some(recipe => recipe.name === recipeName);
            
            if (!hasRecipe) {
                existingItem.recipes.push({ name: recipeName, slug: recipeSlug, ...recipeMetadata });
            }
            
            // Update category if it was missing
            if (!existingItem.category) {
                existingItem.category = parsed.category;
            }
        } else {
            // Add new ingredient
            const newItem = {
                id: Date.now() + Math.random(),
                name: parsed.name,
                amount: parsed.amount,
                unit: parsed.unit,
                category: parsed.category,
                original: parsed.original,
                recipes: [{ name: recipeName, slug: recipeSlug, ...recipeMetadata }],
                completed: false,
                recipeContributions: {}
            };
            
            if (parsed.amount !== null) {
                newItem.recipeContributions[recipeName] = parsed.amount;
            }
            
            shoppingList.push(newItem);
        }
    });
    
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    
    // Update shopping list count if function exists
    if (typeof updateShoppingListCount === 'function') {
        updateShoppingListCount();
    }
}

/**
 * Removes the current recipe from the shopping list and adjusts ingredient quantities
 */
function removeRecipeFromShoppingList(currentRecipeTitle) {
    let shoppingList = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    
    // Filter out items that contain this recipe
    shoppingList = shoppingList.filter(item => {
        const hasRecipe = item.recipes.some(recipe => recipe.name === currentRecipeTitle);
        
        if (hasRecipe) {
            // Initialize recipe contributions if not present
            if (!item.recipeContributions) {
                item.recipeContributions = {};
                const amountPerRecipe = item.amount / item.recipes.length;
                item.recipes.forEach(recipe => {
                    item.recipeContributions[recipe.name] = amountPerRecipe;
                });
            }
            
            // Subtract this recipe's contribution from the total amount
            if (item.recipeContributions[currentRecipeTitle] && item.amount !== null) {
                item.amount -= item.recipeContributions[currentRecipeTitle];
                // Ensure amount doesn't go below 0
                if (item.amount < 0) item.amount = 0;
            }
            
            // Remove this recipe's contribution
            delete item.recipeContributions[currentRecipeTitle];
            
            // Remove this recipe from the item's recipe list
            item.recipes = item.recipes.filter(recipe => recipe.name !== currentRecipeTitle);
            
            // If this was the only recipe for this item, remove the item completely
            return item.recipes.length > 0;
        }
        return true;
    });
    
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    
    // Update shopping list count if function exists
    if (typeof updateShoppingListCount === 'function') {
        updateShoppingListCount();
    }
}

/**
 * Checks if the current recipe is already in the shopping list
 * @returns {boolean} True if recipe is in shopping list
 */
function isRecipeInShoppingList(currentRecipeTitle) {
    const shoppingList = JSON.parse(localStorage.getItem('shoppingList') || '[]');
    return shoppingList.some(item => 
        item.recipes.some(recipe => recipe.name === currentRecipeTitle)
    );
}

/**
 * Toggles the collapse/expand state of a category section
 * @param {string} categoryName - The name of the category to toggle
 */
function toggleCategory(categoryName) {
    const categoryId = `category-${categoryName.replace(/\s+/g, '-').toLowerCase()}`;
    const itemsDiv = document.getElementById(categoryId);
    const headerDiv = itemsDiv.previousElementSibling;
    
    if (collapsedCategories.has(categoryName)) {
        // Expand category
        collapsedCategories.delete(categoryName);
        itemsDiv.style.display = 'block';
        headerDiv.classList.remove('collapsed');
    } else {
        // Collapse category
        collapsedCategories.add(categoryName);
        itemsDiv.style.display = 'none';
        headerDiv.classList.add('collapsed');
    }
    
    // Save collapsed state
    localStorage.setItem('collapsedCategories', JSON.stringify([...collapsedCategories]));
}

/**
 * Clears the entire shopping list after user confirmation
 */
function clearAll() {
    showConfirmationModal(
        'Clear Shopping List',
        'Clear entire shopping list?',
        () => {
            shoppingList = [];
            localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
            updateShoppingListCount();
            displayRecipeList();
            displayShoppingList();
        }
    );
}

/**
 * Toggles the visibility of completed items in the shopping list
 */
function toggleHideCompleted() {
    hideCompleted = !hideCompleted;
    localStorage.setItem('hideCompleted', hideCompleted.toString());
    updateHideToggleButton();
    displayShoppingList();
}

/**
 * Updates the hide/show completed button text and icon based on current state
 */
function updateHideToggleButton() {
    const hideToggle = document.getElementById('hide-completed-toggle');
    const hideToggleText = document.getElementById('hide-toggle-text');
    
    if (hideToggle && hideToggleText) {
        if (hideCompleted) {
            hideToggle.className = 'btn btn-primary btn-lg';
            hideToggleText.textContent = 'Show Completed';
            // Update icon to "show" icon
            hideToggle.querySelector('svg').innerHTML = '<path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>';
        } else {
            hideToggle.className = 'btn btn-secondary btn-lg';
            hideToggleText.textContent = 'Hide Completed';
            // Update icon to "hide" icon
            hideToggle.querySelector('svg').innerHTML = '<path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z"/>';
        }
    }
}

/**
 * Adds a custom item to the shopping list from the quick add input
 */
function addQuickItem() {
    const input = document.getElementById('add-item-input');
    const inputText = input.value.trim();
    
    if (!inputText) {
        return;
    }
    
    // Parse input for amount, unit, and name
    const parsed = parseIngredientInput(inputText);
    
    // Check if item already exists (same name and unit in any category, prioritizing Other)
    let existingIndex = shoppingList.findIndex(item => 
        item.name.toLowerCase() === parsed.name.toLowerCase() && 
        item.unit === parsed.unit &&
        item.category === 'Other' &&
        item.recipes.length === 0 // Only merge with other custom items
    );
    
    // If not found in Other category, check all categories
    if (existingIndex === -1) {
        existingIndex = shoppingList.findIndex(item => 
            item.name.toLowerCase() === parsed.name.toLowerCase() && 
            item.unit === parsed.unit &&
            item.recipes.length === 0 // Only merge with other custom items
        );
    }
    
    if (existingIndex >= 0) {
        // Merge with existing item
        const existingItem = shoppingList[existingIndex];
        if (existingItem.amount !== null && parsed.amount !== null) {
            existingItem.amount += parsed.amount;
            existingItem.original = parsed.amount > 1 || parsed.unit ? 
                `${existingItem.amount}${parsed.unit ? ' ' + parsed.unit : ''} ${parsed.name}` : 
                `${existingItem.amount} ${parsed.name}`;
        } else if (parsed.amount !== null) {
            // Existing item has no amount, new item does
            existingItem.amount = (existingItem.amount || 1) + parsed.amount;
            existingItem.original = `${existingItem.amount}${parsed.unit ? ' ' + parsed.unit : ''} ${parsed.name}`;
        } else {
            // Both have no explicit amount, increment by 1
            existingItem.amount = (existingItem.amount || 1) + 1;
            existingItem.original = existingItem.amount > 1 ? 
                `${existingItem.amount} ${parsed.name}` : 
                parsed.name;
        }
        existingItem.unit = parsed.unit; // Update unit if provided
    } else {
        // Create new item
        const newItem = {
            id: Date.now() + Math.random(),
            name: parsed.name,
            amount: parsed.amount,
            unit: parsed.unit,
            category: 'Other',
            original: parsed.original,
            recipes: [], // No recipes for custom items
            completed: false,
            recipeContributions: {}
        };
        
        shoppingList.push(newItem);
    }
    
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    
    updateShoppingListCount();
    displayRecipeList();
    displayShoppingList();
    
    // Clear the input
    input.value = '';
    input.focus();
}

/**
 * Handles keypress events in the add item input (Enter to add)
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleAddItemKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addQuickItem();
    }
}

/**
 * Shows the category selection modal for moving an item
 * @param {string|number} itemId - The ID of the item to move
 */
function showCategoryModal(itemId) {
    selectedItemId = itemId;
    const categoryModal = document.getElementById('category-modal');
    const categoryList = document.getElementById('category-list');
    
    // Get all existing categories
    const categories = new Set();
    shoppingList.forEach(item => {
        if (item.category) {
            categories.add(item.category);
        }
    });
    
    // Always include all configured categories
    getAllCategoryNames().forEach(cat => categories.add(cat));
    
    // Get the current item to exclude its current category
    const currentItem = shoppingList.find(item => item.id === itemId);
    const currentCategory = currentItem?.category || 'Other';
    
    // Clear and populate category list
    categoryList.innerHTML = '';
    
    // Convert to array and sort by configured order
    const sortedCategories = [...categories]
        .filter(cat => cat !== currentCategory)
        .sort((a, b) => {
            const orderA = getCategoryOrder(a);
            const orderB = getCategoryOrder(b);
            return orderA - orderB;
        });
    
    sortedCategories.forEach(categoryName => {
        // Count items in this category
        const itemCount = shoppingList.filter(item => item.category === categoryName).length;
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-option';
        categoryDiv.onclick = () => moveItemToCategory(itemId, categoryName);
        
        categoryDiv.innerHTML = `
            <span class="category-name">${categoryName}</span>
            <span class="category-count">${itemCount} items</span>
        `;
        
        categoryList.appendChild(categoryDiv);
    });
    
    categoryModal.classList.add('is-active');
}

/**
 * Closes the category selection modal and cleans up state
 */
function closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('is-active');
    selectedItemId = null;
    // Remove long-pressed styling from all items
    document.querySelectorAll('.shopping-item.long-pressed').forEach(item => {
        item.classList.remove('long-pressed');
    });
}

/**
 * Moves an item to a different category, merging with existing items if possible
 * @param {string|number} itemId - The ID of the item to move
 * @param {string} newCategory - The target category name
 */
function moveItemToCategory(itemId, newCategory) {
    const item = shoppingList.find(item => item.id === itemId);
    if (!item) return;
    
    // Check if there's an existing item with the same name and unit in the new category
    const existingItem = shoppingList.find(existingItem => 
        existingItem.id !== itemId &&
        existingItem.name.toLowerCase() === item.name.toLowerCase() &&
        existingItem.unit === item.unit &&
        existingItem.category === newCategory &&
        existingItem.recipes.length === 0 // Only merge with custom items
    );
    
    if (existingItem) {
        // Merge with existing item
        if (existingItem.amount !== null && item.amount !== null) {
            existingItem.amount += item.amount;
        } else if (item.amount !== null) {
            existingItem.amount = (existingItem.amount || 1) + item.amount;
        } else {
            existingItem.amount = (existingItem.amount || 1) + 1;
        }
        
        // Update the original property
        const displayAmount = existingItem.amount > 1 || existingItem.unit ? 
            `${existingItem.amount}${existingItem.unit ? ' ' + existingItem.unit : ''} ${existingItem.name}` : 
            `${existingItem.amount} ${existingItem.name}`;
        existingItem.original = displayAmount;
        
        // Remove the moved item
        shoppingList = shoppingList.filter(i => i.id !== itemId);
    } else {
        // Just change the category
        item.category = newCategory;
    }
    
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    updateShoppingListCount();
    displayRecipeList();
    displayShoppingList();
    closeCategoryModal();
}

/**
 * Checks if a recipe name exists in an array of recipe objects
 * @param {Array} recipes - Array of recipe objects
 * @param {string} recipeName - Name to search for
 * @returns {boolean} True if recipe is found
 */
function hasRecipe(recipes, recipeName) {
    return recipes.some(recipe => recipe.name === recipeName);
}

/**
 * Moves all recipes from the shopping list to the meal plan and clears the shopping list
 */
function moveToMealPlan() {
    // Get unique recipes from shopping list
    const recipes = [];
    shoppingList.forEach(item => {
        if (item.recipes && item.recipes.length > 0) {
            item.recipes.forEach(recipe => {
                // Check if we already have this recipe
                const existingRecipe = recipes.find(r => r.name === recipe.name);
                if (!existingRecipe) {
                    // Include all metadata from the recipe object
                    const { name, slug, ...metadata } = recipe;
                    recipes.push({ name, slug, metadata });
                }
            });
        }
    });
    
    if (recipes.length === 0) {
        return;
    }
    
    showConfirmationModal(
        'Move to Meal Plan',
        `Add ${recipes.length} recipe${recipes.length > 1 ? 's' : ''} to your meal plan and clear the shopping list?`,
        () => {
            // Add recipes to meal plan using the core meal plan function
            recipes.forEach(recipe => {
                addToMealPlan(recipe.name, recipe.slug, recipe.metadata);
            });
            
            // Clear shopping list (shopping list UI concern)
            shoppingList = [];
            localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
            
            // Update shopping list UI
            updateShoppingListCount();
            displayRecipeList();
            displayShoppingList();
            
            // Show success message and redirect to meal plan
            setTimeout(() => {
                window.location.href = '/meals/';
            }, 500);
        }
    );
}

/**
 * Parses ingredient/item input to extract amount, unit, and name
 * Handles multiple formats: "2.5kg Flour", "3 Pizza", "Pizza"
 * @param {string} input - The input string to parse
 * @returns {Object} Object with amount, unit, name, and original properties
 */
function parseIngredientInput(input) {
    // Parse input: try "number+unit name" first, then "number name", then just "name"
    
    // Format 1: "number+unit name" (e.g., "2.5kg Flour") - number immediately followed by letters, then space, then name
    let match = input.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)\s+(.+)$/);
    if (match) {
        return {
            amount: parseFloat(match[1]),
            unit: match[2],
            name: match[3].trim(),
            original: input
        };
    }
    
    // Format 2: "number name" (e.g., "3 Pizza" or "3 Bin Bags") - number, space, then name
    match = input.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    if (match) {
        return {
            amount: parseFloat(match[1]),
            unit: '',
            name: match[2].trim(),
            original: input
        };
    }
    
    // Format 3: just "name" (e.g., "Pizza" or "Bin Bags")
    return {
        amount: 1,
        unit: '',
        name: input.trim(),
        original: input
    };
}


// Global keyboard handler for category modal
document.addEventListener('keydown', function(event) {
    const categoryModal = document.getElementById('category-modal');
    
    if (categoryModal && categoryModal.classList.contains('is-active')) {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeCategoryModal();
        }
    }
});

// Load shopping list when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('shopping-items')) {
        loadShoppingList();
    }
});

// Update shopping list when localStorage changes (from other tabs)
window.addEventListener('storage', function(e) {
    if (e.key === 'shoppingList' && document.getElementById('shopping-items')) {
        loadShoppingList();
    }
});