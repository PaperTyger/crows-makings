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

// Rooms — each section peeks at its first row until opened, and a sticky floor
// plan walks between them. Built from the DOM like the piece count, so a card or
// section added later by the sync task is counted and handled without new markup.
// Open rooms last for the visit; a fresh visit starts at the top with rooms shut.

(function () {
    const rooms = Array.from(document.querySelectorAll('section.block'));
    if (!rooms.length) return;

    // Cards are appended oldest to newest. Rooms marked data-newest-first show them
    // the other way round; a study that's a sequence simply isn't marked.
    document.querySelectorAll('[data-newest-first] :is(.image-grid, .card-grid)').forEach((grid) => {
        Array.from(grid.children).reverse().forEach((card) => grid.appendChild(card));
    });

    const KEY = 'crows-makings-open';
    const load = () => {
        try { return JSON.parse(sessionStorage.getItem(KEY)) || []; }
        catch (e) { return []; }
    };
    const save = () => {
        const open = rooms.filter((r) => r.classList.contains('open')).map((r) => r.id);
        try { sessionStorage.setItem(KEY, JSON.stringify(open)); }
        catch (e) { /* private window: rooms just won't be remembered */ }
    };

    const cardsIn = (room) => room.querySelectorAll('.image-card, .piece-card').length;
    const nameOf = (room) => room.querySelector('h2').textContent.trim();
    // Anything a closed room hides: cards past the first row, or anything else
    // the closed rules take away. Rooms that hide nothing get no controls.
    const hasMore = (room) => {
        const was = room.classList.contains('open');
        room.classList.remove('open');
        const hidden = Array.from(room.querySelectorAll('.wrap > *, .wrap > * > *'))
            .some((el) => getComputedStyle(el).display === 'none');
        room.classList.toggle('open', was);
        return hidden;
    };

    function setOpen(room, open) {
        room.classList.toggle('open', open);
        const n = cardsIn(room);
        const label = open ? 'Close' : (n ? `See all ${n}` : 'Read on');
        room.querySelectorAll('.room-toggle, .room-more').forEach((btn) => {
            btn.textContent = label;
            btn.setAttribute('aria-expanded', String(open));
        });
    }

    const nav = document.createElement('nav');
    nav.className = 'floor-plan';
    nav.setAttribute('aria-label', 'Rooms');
    nav.innerHTML = '<div class="wrap"><ul></ul></div>';
    const list = nav.querySelector('ul');
    const links = new Map();

    rooms.forEach((room) => {
        const n = cardsIn(room);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${room.id}`;
        a.textContent = nameOf(room);
        if (n) {
            const count = document.createElement('span');
            count.className = 'n';
            count.textContent = n;
            a.appendChild(count);
        }
        li.appendChild(a);
        list.appendChild(li);
        links.set(room, a);
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (room.querySelector('.room-toggle')) setOpen(room, true);
            save();
            history.pushState(null, '', a.hash);
            room.scrollIntoView({ behavior: 'instant' });
        });

        if (!hasMore(room)) {
            room.classList.add('open');
            return;
        }

        const toggle = document.createElement('button');
        toggle.className = 'room-toggle';
        room.querySelector('.section-head').appendChild(toggle);

        const more = document.createElement('button');
        more.className = 'room-more';
        room.querySelector('.wrap').appendChild(more);

        [toggle, more].forEach((btn) => btn.addEventListener('click', () => {
            const opening = !room.classList.contains('open');
            setOpen(room, opening);
            save();
            // Shutting a long room from its far end would otherwise leave you
            // stranded a long way below where the page now is.
            if (!opening) room.scrollIntoView({ behavior: 'instant' });
        }));

        setOpen(room, false);
    });

    document.querySelector('.hero').after(nav);
    load().forEach((id) => {
        const room = document.getElementById(id);
        if (room && room.querySelector('.room-toggle')) setOpen(room, true);
    });

    // Where a load should land. A link to a room opens it; coming back from a
    // piece returns to that piece's card; back/forward keeps the browser's own
    // position; anything else starts at the top rather than at wherever the
    // last visit happened to end.
    const type = (performance.getEntriesByType('navigation')[0] || {}).type;
    const fromPiece = (document.referrer.match(/\/pieces\/([^/]+)\//) || [])[1];
    const target = location.hash && document.querySelector(location.hash);
    const card = fromPiece && document.querySelector(`a[href^="pieces/${fromPiece}/"]`);
    const home = target || (card && card.closest('.piece-card'));

    if (type !== 'back_forward') history.scrollRestoration = 'manual';
    if (home) {
        const room = home.closest('section.block');
        if (room && room.querySelector('.room-toggle')) setOpen(room, true);
        save();
        home.scrollIntoView({ behavior: 'instant', block: home === room ? 'start' : 'center' });
    } else if (type !== 'back_forward') {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Light the room you're standing in on the floor plan.
    if ('IntersectionObserver' in window) {
        const seen = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                links.forEach((a) => a.classList.remove('here'));
                const a = links.get(e.target);
                a.classList.add('here');
                list.scrollLeft = a.offsetLeft - 8;
            });
        }, { rootMargin: '-20% 0px -75% 0px' });
        rooms.forEach((r) => seen.observe(r));
    }
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
