// Shopping List Categories Configuration
const SHOPPING_CATEGORIES = [
    {
        name: "Other",
        order: 1
    },
    {
        name: "Meat / Fish",
        order: 2
    },
    {
        name: "Fresh Veg",
        order: 3
    },
    {
        name: "Dairy",
        order: 4
    },
    {
        name: "Bread / Pasta / Rice",
        order: 5
    },
    {
        name: "Tinned",
        order: 6
    },
    {
        name: "Frozen",
        order: 7
    },
    {
        name: "Sauce / Spice / Sundries",
        order: 8
    }
];

/**
 * Gets category object by name, returns default category if not found
 * @param {string} name - Category name to search for
 * @returns {Object} Category object with name and order properties
 */
function getCategoryByName(name) {
    return SHOPPING_CATEGORIES.find(cat => cat.name === name) || SHOPPING_CATEGORIES[0];
}

/**
 * Gets array of all category names
 * @returns {Array} Array of category name strings
 */
function getAllCategoryNames() {
    return SHOPPING_CATEGORIES.map(cat => cat.name);
}

/**
 * Gets display order for a category
 * @param {string} categoryName - Name of the category
 * @returns {number} Order number for sorting (999 for unknown categories)
 */
function getCategoryOrder(categoryName) {
    const category = getCategoryByName(categoryName);
    return category.order || 999; // Default high order for unknown categories
}