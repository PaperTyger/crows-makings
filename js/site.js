// Crow's Makings — quill-triggered artist statement panels.
// Each [data-quill] button opens the panel whose id matches its data-panel
// attribute. One panel open at a time; overlay click, close button, and
// Escape all dismiss it.

(function () {
    const overlay = document.querySelector('.panel-overlay');
    let openPanel = null;

    function closePanel() {
        if (!openPanel) return;
        openPanel.classList.remove('open');
        overlay.classList.remove('open');
        openPanel = null;
    }

    function openPanelById(id) {
        const panel = document.getElementById(id);
        if (!panel) return;
        if (openPanel && openPanel !== panel) closePanel();
        panel.classList.add('open');
        overlay.classList.add('open');
        openPanel = panel;
    }

    document.querySelectorAll('[data-quill]').forEach((btn) => {
        btn.addEventListener('click', () => openPanelById(btn.dataset.panel));
    });

    document.querySelectorAll('.panel .close-btn').forEach((btn) => {
        btn.addEventListener('click', closePanel);
    });

    overlay.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });
})();
