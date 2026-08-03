// Crow's Makings — quill-triggered artist statement panels.
// Each [data-quill] button opens the panel whose id matches its data-panel
// attribute. One panel open at a time; overlay click, close button, and
// Escape all dismiss it.

// Piece count, derived from the cards themselves. The hero blurb and the section
// note both used to state the number in prose, and on 2026-08-02 a fourth piece
// shipped while the hero still said "three" — the section note had been updated
// and the hero hadn't. Two hardcoded copies of one fact is the bug; a count that
// reads the DOM cannot go stale. The markup keeps a correct word as its fallback
// for no-JS, so this corrects rather than supplies.
(function () {
    const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
                   'eight', 'nine', 'ten', 'eleven', 'twelve'];
    const n = document.querySelectorAll('#algorithmic .card-grid .piece-card').length;
    if (!n) return;
    const word = WORDS[n] || String(n);
    document.querySelectorAll('[data-piece-count]').forEach((el) => {
        el.textContent = el.dataset.pieceCount === 'cap'
            ? word.charAt(0).toUpperCase() + word.slice(1)
            : word;
    });
})();

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

// Lightbox — click any still image to view it uncropped at full size.
// Cards are collected from the DOM rather than tagged by hand, so images added
// later by the sync task get this behaviour without further markup.

(function () {
    const images = Array.from(document.querySelectorAll('.image-card img, .milestone img'));
    if (!images.length) return;

    const titleOf = (img) => {
        const card = img.closest('.image-card, .milestone');
        const h3 = card && card.querySelector('h3');
        return h3 ? h3.textContent.trim() : '';
    };

    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `
        <img alt="">
        <div class="lightbox-caption">
            <h4></h4>
            <span class="dims"></span>
            <a target="_blank" rel="noopener">View full size &#8599;</a>
        </div>
        <button class="lightbox-btn lightbox-close" aria-label="Close">&times;</button>
        <button class="lightbox-btn lightbox-prev" aria-label="Previous image">&#8249;</button>
        <button class="lightbox-btn lightbox-next" aria-label="Next image">&#8250;</button>`;
    document.body.appendChild(box);

    const full = box.querySelector('img');
    const title = box.querySelector('.lightbox-caption h4');
    const dims = box.querySelector('.lightbox-caption .dims');
    const link = box.querySelector('.lightbox-caption a');
    let index = 0;

    function show(i) {
        index = (i + images.length) % images.length;
        const src = images[index];
        full.src = src.src;
        full.alt = src.alt;
        title.textContent = titleOf(src);
        link.href = src.src;
        dims.textContent = '';
        const report = () => {
            dims.textContent = full.naturalWidth
                ? `${full.naturalWidth} × ${full.naturalHeight}`
                : '';
        };
        if (full.complete) report();
        else full.addEventListener('load', report, { once: true });
    }

    function open(i) {
        show(i);
        box.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        box.classList.remove('open');
        document.body.style.overflow = '';
    }

    images.forEach((img, i) => {
        img.addEventListener('click', () => open(i));
    });

    box.querySelector('.lightbox-close').addEventListener('click', close);
    box.querySelector('.lightbox-prev').addEventListener('click', () => show(index - 1));
    box.querySelector('.lightbox-next').addEventListener('click', () => show(index + 1));

    box.addEventListener('click', (e) => {
        if (e.target === box) close();
    });

    document.addEventListener('keydown', (e) => {
        if (!box.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(index - 1);
        if (e.key === 'ArrowRight') show(index + 1);
    });
})();
