/** Touch navigation between main tabs. */
export function initSwipeTabs({ main, getCurrentView, switchView, modalAbierto }) {
    // Swipe between the three main tabs, without stealing vertical scrolling,
    // horizontal carousels, inputs, overlays or the Android edge-back gesture.
    const swipeViews = ['homeView', 'libraryView', 'playlistsView'];
    let swipeStart = null;
    const isHorizontalScroller = (target) => {
        for (let el = target; el && el !== main; el = el.parentElement) {
            const overflow = getComputedStyle(el).overflowX;
            if (/(auto|scroll)/.test(overflow) && el.scrollWidth > el.clientWidth + 2) return true;
        }
        return false;
    };
    main?.addEventListener('touchstart', (event) => {
        swipeStart = null;
        if (event.touches.length !== 1 || !swipeViews.includes(getCurrentView())) return;
        const touch = event.touches[0];
        if (touch.clientX < 24 || touch.clientX > innerWidth - 24) return;
        const target = event.target;
        if (!(target instanceof Element) || target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="slider"]')) return;
        if (isHorizontalScroller(target) || modalAbierto()) return;
        const player = document.getElementById('fullPlayer');
        if (player && !player.classList.contains('fp-hidden')) return;
        swipeStart = { x: touch.clientX, y: touch.clientY, view: getCurrentView() };
    }, { passive: true });
    main?.addEventListener('touchend', (event) => {
        if (!swipeStart || event.changedTouches.length !== 1 || swipeStart.view !== getCurrentView()) {
            swipeStart = null;
            return;
        }
        const dx = event.changedTouches[0].clientX - swipeStart.x;
        const dy = event.changedTouches[0].clientY - swipeStart.y;
        swipeStart = null;
        if (Math.abs(dx) < 75 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const index = swipeViews.indexOf(getCurrentView()) + (dx < 0 ? 1 : -1);
        if (index >= 0 && index < swipeViews.length) switchView(swipeViews[index]);
    }, { passive: true });
    main?.addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });

}
