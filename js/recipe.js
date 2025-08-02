// Recipe page functionality
let currentRecipeTitle = '';
let currentRecipeSlug = '';
let cookingSession = {
    active: false,
    completedSteps: new Set(),
    currentRecipe: null
};

// Initialize recipe page on load
document.addEventListener('DOMContentLoaded', function() {
    // Get the recipe title from the page
    const titleElement = document.querySelector('h1');
    if (titleElement) {
        currentRecipeTitle = titleElement.textContent.trim();
    }
    
    // Extract slug from current URL path
    const path = window.location.pathname;
    currentRecipeSlug = path.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
    
    // Check if we're in cooking mode
    const urlParams = new URLSearchParams(window.location.search);
    const cookingMode = urlParams.has('cook');
    
    // Only run recipe functions if we're on a recipe page
    if (document.getElementById('shopping-button')) {
        populateIngredientsTab();
        updateShoppingButton();
        
        if (cookingMode) {
            enterCookingSession();
        }
    }
});

/**
 * Redirects to the same page with cooking mode enabled
 */
function startCookingSession() {
    // Redirect to same page with ?cook parameter
    const currentUrl = window.location.href.split('?')[0]; // Remove any existing params
    window.location.href = currentUrl + '?cook';
}

/**
 * Extracts ingredients from the recipe page DOM by finding H3 sections with known category names
 * @returns {Array} Array of ingredient objects with text and category properties
 */
function extractIngredients() {
    const ingredients = [];
    const ingredientSections = document.querySelectorAll('h3');
    
    console.log('Found', ingredientSections.length, 'h3 sections');
    
    ingredientSections.forEach(section => {
        const categoryName = section.textContent.trim();
        console.log('Processing category:', categoryName);
        
        if (categoryName.includes('Meat') || 
            categoryName.includes('Veg') || 
            categoryName.includes('Sauce') || 
            categoryName.includes('Bread')) {
            console.log('Category matches, extracting ingredients for:', categoryName);
            
            let nextElement = section.nextElementSibling;
            while (nextElement && nextElement.tagName !== 'H3' && nextElement.tagName !== 'H2') {
                if (nextElement.tagName === 'UL') {
                    const listItems = nextElement.querySelectorAll('li');
                    console.log('Found', listItems.length, 'list items in', categoryName);
                    listItems.forEach(item => {
                        ingredients.push({
                            text: item.textContent.trim(),
                            category: categoryName
                        });
                    });
                } else if (nextElement.tagName === 'P') {
                    const lines = nextElement.textContent.split('\n').filter(line => line.trim());
                    lines.forEach(line => {
                        ingredients.push({
                            text: line.trim(),
                            category: categoryName
                        });
                    });
                }
                nextElement = nextElement.nextElementSibling;
            }
        }
    });
    
    console.log('Total ingredients extracted:', ingredients);
    return ingredients;
}

/**
 * Extracts method steps from the recipe page DOM by finding the Method section
 * @returns {Array} Array of step strings
 */
function extractSteps() {
    const steps = [];
    const methodSections = document.querySelectorAll('h2');
    
    // Find the Method section specifically
    let methodSection = null;
    methodSections.forEach(section => {
        if (section.textContent.trim() === 'Method') {
            methodSection = section;
        }
    });
    
    if (methodSection) {
        let nextElement = methodSection.nextElementSibling;
        while (nextElement) {
            if (nextElement.tagName === 'UL') {
                const listItems = nextElement.querySelectorAll('li');
                listItems.forEach(item => steps.push(item.textContent.trim()));
                break;
            }
            nextElement = nextElement.nextElementSibling;
        }
    }
    
    return steps;
}

/**
 * Switches between recipe tabs (ingredients/method) in normal recipe view
 * @param {string} tabName - The name of the tab to show
 */
function showRecipeTab(tabName) {
    // Hide all tab panels
    document.querySelectorAll('.recipe-tab-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab panel
    const panel = document.getElementById(tabName + '-panel');
    if (panel) {
        panel.classList.add('active');
        panel.classList.remove('hidden');
    }
    
    // Add active class to clicked tab
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Populate content if needed
    if (tabName === 'ingredients') {
        populateIngredientsTab();
    } else if (tabName === 'method') {
        populateMethodTab();
    }
}

// Shopping List Functions

/**
 * Updates the shopping button text and styling based on whether recipe is in shopping list
 */
function updateShoppingButton() {
    const button = document.getElementById('shopping-button');
    const buttonText = document.getElementById('shopping-button-text');
    const icon = button.querySelector('svg');
    
    if (!button || !buttonText || !icon) return;
    
    if (isRecipeInShoppingList(currentRecipeTitle)) {
        button.className = 'btn btn-warning btn-lg';
        buttonText.textContent = 'Remove from Shop';
        icon.innerHTML = '<path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>';
    } else {
        button.className = 'btn btn-primary btn-lg';
        buttonText.textContent = 'Add to Shop';
        icon.innerHTML = '<path d="M7,18C7.56,18 8,17.56 8,17C8,16.44 7.56,16 7,16C6.44,16 6,16.44 6,17C6,17.56 6.44,18 7,18M1,2V4H3L6.6,11.59L5.24,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42C7.28,15 7.17,14.89 7.17,14.75L7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5H5.21L4.27,3H1M17,18C17.56,18 18,17.56 18,17C18,16.44 17.56,16 17,16C16.44,16 16,16.44 16,17C16,17.56 16.44,18 17,18Z"/>';
    }
}

/**
 * Toggles the current recipe in/out of the shopping list
 */
function toggleShoppingList() {
    if (isRecipeInShoppingList(currentRecipeTitle)) {
        removeRecipeFromShoppingList(currentRecipeTitle);
    } else {
        addCheckedIngredientsToShoppingList();
    }
}


/**
 * Toggles an ingredient checkbox and updates visual styling
 * @param {number} index - The index of the ingredient to toggle
 */
function toggleIngredientCheckbox(index) {
    const checkbox = document.getElementById(`ingredient-${index}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        
        // Update the visual state of the container
        const container = checkbox.closest('.ingredient-item');
        if (container) {
            if (checkbox.checked) {
                container.style.backgroundColor = 'var(--color-primary-light)';
                container.style.borderColor = 'var(--color-primary)';
                container.style.opacity = '1';
            } else {
                container.style.backgroundColor = 'var(--color-surface)';
                container.style.borderColor = 'var(--color-border)';
                container.style.opacity = '0.6';
            }
        }
    }
}

/**
 * Toggles ingredient selection in the recipe tab view
 * @param {number} index - The index of the ingredient to toggle
 */
function toggleIngredientInTab(index) {
    const checkbox = document.getElementById(`ingredient-${index}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        
        // Update the visual state of the container
        const container = checkbox.closest('.ingredient-item');
        if (container) {
            if (checkbox.checked) {
                container.style.backgroundColor = 'var(--color-primary-light)';
                container.style.borderColor = 'var(--color-primary)';
            } else {
                container.style.backgroundColor = '';
                container.style.borderColor = '';
            }
        }
    }
}

/**
 * Adds all checked ingredients from the current recipe to the shopping list
 */
function addCheckedIngredientsToShoppingList() {
    const ingredients = extractIngredients();
    const selectedIngredients = [];
    
    ingredients.forEach((ingredient, index) => {
        const checkbox = document.getElementById(`ingredient-${index}`);
        if (checkbox && checkbox.checked) {
            selectedIngredients.push(ingredient);
        }
    });
    
    if (selectedIngredients.length > 0) {
        // Extract recipe metadata and pass to shopping list function
        const recipeMetadata = extractRecipeMetadata();
        addIngredientsToShoppingList(currentRecipeTitle, currentRecipeSlug, selectedIngredients, recipeMetadata);
        
        // Update the button
        updateShoppingButton();
        
        // Show confirmation message
        const button = document.getElementById('shopping-button');
        const buttonText = document.getElementById('shopping-button-text');
        if (button && buttonText) {
            const originalText = buttonText.textContent;
            buttonText.textContent = 'Added!';
            setTimeout(() => {
                updateShoppingButton();
            }, 2000);
        }
    } else {
        // If no ingredients are selected, show a message or select all by default
        alert('Please select ingredients to add to your shopping list.');
    }
}




/**
 * Extracts recipe metadata (total time, notes) from the DOM
 * @returns {Object} Object containing available metadata
 */
function extractRecipeMetadata() {
    const metadata = {};
    
    // Extract using semantic IDs
    const totalTimeElement = document.getElementById('recipe-total-time');
    if (totalTimeElement) {
        metadata.totalTime = totalTimeElement.textContent.trim();
    }
    
    const notesElement = document.getElementById('recipe-notes');
    if (notesElement) {
        metadata.notes = notesElement.textContent.trim();
    }
    
    return metadata;
}

// Meal Plan Functions
/**
 * Adds the current recipe to the meal plan with metadata
 */
async function addRecipeToMealPlan() {
    // Always add/move recipe to meal plan (moves to today if already exists)
    if (typeof addToMealPlan === 'function') {
        const metadata = extractRecipeMetadata();
        await addToMealPlan(currentRecipeTitle, currentRecipeSlug, metadata);
        
        // Show brief success feedback
        const button = document.getElementById('meal-plan-button');
        const originalText = button.querySelector('span').textContent;
        button.querySelector('span').textContent = 'Added!';
        
        setTimeout(() => {
            button.querySelector('span').textContent = originalText;
        }, 1500);
    }
}

/**
 * Populates the ingredients tab with checkable ingredient items from the recipe content
 */
function populateIngredientsTab() {
    const ingredientsContent = document.getElementById('ingredients-content');
    if (!ingredientsContent || ingredientsContent.innerHTML.trim() !== '') return;
    
    const recipeContent = document.getElementById('recipe-content');
    if (!recipeContent) return;
    
    const ingredientsSection = recipeContent.querySelector('h2');
    
    if (ingredientsSection && ingredientsSection.textContent.includes('Ingredients')) {
        let content = '<h2 class="mb-lg">Ingredients</h2>';
        let nextElement = ingredientsSection.nextElementSibling;
        let currentCategoryContent = '';
        let currentCategoryTitle = '';
        let ingredientIndex = 0;
        
        while (nextElement && !nextElement.textContent.includes('Method')) {
            if (nextElement.tagName === 'H3') {
                // If we have previous category content, add it
                if (currentCategoryTitle && currentCategoryContent.trim()) {
                    content += `<h3 class="mb-md mt-lg">${currentCategoryTitle}</h3>`;
                    content += currentCategoryContent;
                }
                // Start new category
                currentCategoryTitle = nextElement.textContent;
                currentCategoryContent = '';
            } else if (nextElement.tagName === 'UL') {
                const listItems = nextElement.querySelectorAll('li');
                if (listItems.length > 0) {
                    listItems.forEach(item => {
                        currentCategoryContent += `<div class="ingredient-item checkable" onclick="toggleIngredientInTab(${ingredientIndex})" style="cursor: pointer; background-color: var(--color-primary-light); border-color: var(--color-primary);">
                            <input type="checkbox" id="ingredient-${ingredientIndex}" class="item-checkbox" checked onchange="event.stopPropagation();">
                            <span>${item.textContent.trim()}</span>
                        </div>`;
                        ingredientIndex++;
                    });
                }
            } else {
                currentCategoryContent += nextElement.outerHTML;
            }
            nextElement = nextElement.nextElementSibling;
        }
        
        // Add the last category if it has content
        if (currentCategoryTitle && currentCategoryContent.trim()) {
            content += `<h3 class="mb-md mt-lg">${currentCategoryTitle}</h3>`;
            content += currentCategoryContent;
        }
        
        ingredientsContent.innerHTML = content;
    }
}

/**
 * Populates the method tab with numbered steps from the recipe content
 */
function populateMethodTab() {
    const methodContent = document.getElementById('method-content');
    if (!methodContent || methodContent.innerHTML.trim() !== '') return;
    
    const recipeContent = document.getElementById('recipe-content');
    if (!recipeContent) return;
    
    const methodSection = Array.from(recipeContent.querySelectorAll('h2')).find(h2 => 
        h2.textContent.trim() === 'Method'
    );
    
    if (methodSection) {
        let content = '<h2 class="mb-lg">Method</h2>';
        let nextElement = methodSection.nextElementSibling;
        let stepNumber = 1;
        
        while (nextElement) {
            if (nextElement.tagName === 'UL') {
                const listItems = nextElement.querySelectorAll('li');
                listItems.forEach(item => {
                    content += `<div class="method-step">
                        <div class="step-number">${stepNumber}</div>
                        <div class="step-content">
                            <p>${item.textContent.trim()}</p>
                        </div>
                    </div>`;
                    stepNumber++;
                });
            } else {
                content += nextElement.outerHTML;
            }
            nextElement = nextElement.nextElementSibling;
        }
        
        methodContent.innerHTML = content;
    }
}


// Cooking Session Functions
/**
 * Enters cooking session mode by hiding recipe UI and showing cooking interface
 */
function enterCookingSession() {
    cookingSession.active = true;
    cookingSession.currentRecipe = {
        title: currentRecipeTitle,
        ingredients: extractIngredients(),
        steps: extractSteps()
    };
    
    // Load saved progress
    loadCookingProgress();
    
    // Hide recipe UI and show cooking UI
    hideRecipeUI();
    showCookingUI();
    
    // Initialize cooking session content
    loadCookingIngredients();
    loadCookingMethod();
    updateProgress();
    
    // Initialize tabs - make sure ingredients tab is active by default
    showCookingTab('cooking-ingredients');
}

/**
 * Exits cooking session and returns to normal recipe view
 */
function exitCookingSession() {
    // Save current progress
    saveCookingProgress();
    
    // Redirect back to recipe page without ?cook parameter
    const currentUrl = window.location.href.split('?')[0];
    window.location.href = currentUrl;
}

/**
 * Hides the normal recipe interface elements when entering cooking mode
 */
function hideRecipeUI() {
    // Hide main recipe elements
    const elementsToHide = [
        '#recipe-actions',      // Action buttons (Start Cooking, Add to Shop, Add to Plan)
        '#recipe-metadata',     // Metadata cards (prep time, total time, servings, notes)
        '#recipe-tabs',         // Recipe tabs (ingredients/method)
        '#recipe-content-card'  // Recipe content card
    ];
    
    elementsToHide.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('hidden');
        }
    });
}

/**
 * Shows the cooking session interface
 */
function showCookingUI() {
    const cookingSessionEl = document.getElementById('cooking-session');
    if (cookingSessionEl) {
        cookingSessionEl.classList.remove('hidden');
    }
}

/**
 * Loads and displays ingredients in the cooking session interface
 */
function loadCookingIngredients() {
    const ingredientsList = document.getElementById('cooking-ingredients-list');
    if (!ingredientsList || !cookingSession.currentRecipe.ingredients) return;
    
    ingredientsList.innerHTML = '';
    
    // Group ingredients by category
    const categorizedIngredients = {};
    cookingSession.currentRecipe.ingredients.forEach(ingredient => {
        const category = ingredient.category || 'Other';
        if (!categorizedIngredients[category]) {
            categorizedIngredients[category] = [];
        }
        categorizedIngredients[category].push(ingredient.text);
    });
    
    // Display ingredients by category
    Object.keys(categorizedIngredients).forEach(category => {
        if (categorizedIngredients[category].length > 0) {
            // Add category header
            const categoryHeader = document.createElement('h4');
            categoryHeader.className = 'text-lg font-medium mb-md mt-lg';
            categoryHeader.textContent = category;
            ingredientsList.appendChild(categoryHeader);
            
            // Add ingredients
            categorizedIngredients[category].forEach(ingredient => {
                const ingredientDiv = document.createElement('div');
                ingredientDiv.className = 'ingredient-item';
                ingredientDiv.innerHTML = `<span>${ingredient}</span>`;
                ingredientsList.appendChild(ingredientDiv);
            });
        }
    });
}

/**
 * Loads and displays method steps as checkable items in cooking session
 */
function loadCookingMethod() {
    const methodList = document.getElementById('cooking-method-list');
    if (!methodList || !cookingSession.currentRecipe.steps) return;
    
    methodList.innerHTML = '';
    
    cookingSession.currentRecipe.steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = `step-item${cookingSession.completedSteps.has(index) ? ' completed' : ''}`;
        stepDiv.onclick = () => toggleStep(index);
        
        stepDiv.innerHTML = `
            <div class="step-header">
                <div class="step-number">${index + 1}</div>
            </div>
            <div class="step-content">
                <div class="step-text">${step}</div>
            </div>
        `;
        
        methodList.appendChild(stepDiv);
    });
}

/**
 * Toggles completion status of a cooking step and updates progress
 * @param {number} stepIndex - The index of the step to toggle
 */
function toggleStep(stepIndex) {
    if (cookingSession.completedSteps.has(stepIndex)) {
        cookingSession.completedSteps.delete(stepIndex);
    } else {
        cookingSession.completedSteps.add(stepIndex);
    }
    
    // Update UI
    const stepElement = document.querySelector(`#cooking-method-list .step-item:nth-child(${stepIndex + 1})`);
    if (stepElement) {
        stepElement.classList.toggle('completed');
    }
    
    updateProgress();
    saveCookingProgress();
}

/**
 * Updates the cooking progress bar and text display
 */
function updateProgress() {
    const totalSteps = cookingSession.currentRecipe?.steps?.length || 0;
    const completedCount = cookingSession.completedSteps.size;
    const percentage = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
    
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
    
    if (progressText) {
        progressText.textContent = `${completedCount} of ${totalSteps} steps completed`;
    }
}

/**
 * Saves current cooking progress to localStorage
 */
function saveCookingProgress() {
    if (!cookingSession.active || !currentRecipeSlug) return;
    
    const progressKey = `cookingProgress_${currentRecipeSlug}`;
    const progressData = {
        completedSteps: Array.from(cookingSession.completedSteps),
        lastAccessed: new Date().toISOString()
    };
    
    localStorage.setItem(progressKey, JSON.stringify(progressData));
}

/**
 * Loads saved cooking progress from localStorage
 */
function loadCookingProgress() {
    if (!currentRecipeSlug) return;
    
    const progressKey = `cookingProgress_${currentRecipeSlug}`;
    const savedProgress = localStorage.getItem(progressKey);
    
    if (savedProgress) {
        const progressData = JSON.parse(savedProgress);
        cookingSession.completedSteps = new Set(progressData.completedSteps || []);
    } else {
        cookingSession.completedSteps = new Set();
    }
}

/**
 * Resets all cooking progress for the current recipe
 */
function resetCookingProgress() {
    if (!cookingSession.active || !currentRecipeSlug) return;
    
    // Clear completed steps
    cookingSession.completedSteps.clear();
    
    // Remove saved progress from localStorage
    const progressKey = `cookingProgress_${currentRecipeSlug}`;
    localStorage.removeItem(progressKey);
    
    // Reset UI
    const stepElements = document.querySelectorAll('#cooking-method-list .step-item');
    stepElements.forEach(stepElement => {
        stepElement.classList.remove('completed');
    });
    
    // Update progress display
    updateProgress();
}

/**
 * Switches between cooking session tabs (ingredients/method)
 * @param {string} tabName - The name of the cooking tab to show
 */
function showCookingTab(tabName) {
    // Hide all cooking tab panels
    document.querySelectorAll('#cooking-session .recipe-tab-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });
    
    // Remove active class from all cooking tab buttons
    document.querySelectorAll('#cooking-session .tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab panel
    const panel = document.getElementById(tabName + '-tab');
    if (panel) {
        panel.classList.add('active');
        panel.classList.remove('hidden');
    }
    
    // Add active class to clicked tab
    const activeTab = document.querySelector(`#cooking-session [data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}