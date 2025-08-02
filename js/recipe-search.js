/**
 * Filters recipe cards based on search input
 * Shows/hides recipe cards that match the search term and displays no results message when appropriate
 */
function filterRecipes() {
    const searchTerm = document.getElementById('recipe-search').value.toLowerCase().trim();
    const recipeCards = document.querySelectorAll('.recipe-card');
    const noResults = document.getElementById('no-results');
    let visibleCount = 0;
    
    recipeCards.forEach(card => {
        const title = card.dataset.title;
        const matches = title.includes(searchTerm);
        
        if (matches) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide no results message
    if (visibleCount === 0 && searchTerm !== '') {
        noResults.classList.remove('hidden');
    } else {
        noResults.classList.add('hidden');
    }
}