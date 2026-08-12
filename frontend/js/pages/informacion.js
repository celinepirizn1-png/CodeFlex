const featuresGrid = document.getElementById('featuresGrid');
const showMoreWrap = document.getElementById('showMoreWrap');
const showMoreBtn = document.getElementById('showMoreBtn');
const mobileQuery = window.matchMedia('(max-width: 580px)');

const INITIAL_VISIBLE = 2;
const STEP = 2;
let visibleCount = INITIAL_VISIBLE;

const renderCards = () => {
    if (!featuresGrid) return;
    const cards = Array.from(featuresGrid.querySelectorAll('.featureCard'));

    if (!mobileQuery.matches) {
        cards.forEach(card => { card.hidden = false; });
        if (showMoreWrap) showMoreWrap.hidden = true;
        return;
    }

    cards.forEach((card, index) => {
        card.hidden = index >= visibleCount;
    });
    if (showMoreWrap) showMoreWrap.hidden = visibleCount >= cards.length;
};

if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
        visibleCount += STEP;
        renderCards();
    });
}

mobileQuery.addEventListener('change', () => {
    visibleCount = INITIAL_VISIBLE;
    renderCards();
});

renderCards();
