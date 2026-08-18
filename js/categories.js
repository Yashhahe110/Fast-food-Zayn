/* =========================================================
   categories.js — Category chip navigation
   ========================================================= */
const Categories = (() => {
  function render() {
    const scroller = document.getElementById('categoryScroller');
    const cats = Products.getCategories();
    const chips = cats.map(c => `<button class="cat-chip" data-cat="${c.slug}">${toTitle(c.name)}</button>`).join('');
    scroller.innerHTML = `<button class="cat-chip active" data-cat="all">Tout</button>` + chips;
  }

  function toTitle(str) {
    return str.charAt(0) + str.slice(1).toLowerCase();
  }

  function bindEvents() {
    const scroller = document.getElementById('categoryScroller');
    scroller.addEventListener('click', (e) => {
      const chip = e.target.closest('.cat-chip');
      if (!chip) return;
      scroller.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      Products.setCategory(chip.dataset.cat);
      Products.renderGrid();
    });
  }

  return { render, bindEvents };
})();
