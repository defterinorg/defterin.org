/* Notes from the Spree: progressive enhancement only. Every feature works without JS.
   - theme toggle (the choice is stored in localStorage)
   - sidenotes on wide screens, built from the Markdown footnotes
   - footnote popover on narrow screens; the anchors still jump to #notes without JS
   - TOC collapsed on narrow screens
   All copy comes from data-* attributes set by the templates. */
(function () {
  var root = document.documentElement;
  var KEY = 'spree-theme';
  var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var wideMQ = window.matchMedia('(min-width: 1100px)');

  /* ---- theme toggle ---- */
  var btn = document.querySelector('.theme-toggle');
  function current() {
    var t = root.getAttribute('data-theme');
    return t || (darkMQ.matches ? 'dark' : 'light');
  }
  function syncToggle() {
    if (!btn) return;
    var dark = current() === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? btn.dataset.labelLight : btn.dataset.labelDark);
    btn.firstElementChild.textContent = dark ? btn.dataset.iconDark : btn.dataset.iconLight;
  }
  if (btn) {
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      syncToggle();
    });
    darkMQ.addEventListener && darkMQ.addEventListener('change', syncToggle);
    syncToggle();
  }

  /* ---- TOC ---- */
  var toc = document.querySelector('details.toc');
  function syncToc() { if (toc) toc.open = wideMQ.matches; }
  syncToc();

  /* ---- footnotes ---- */
  var host = document.querySelector('[data-notes]');
  if (!host) return;
  var refs = Array.prototype.slice.call(host.querySelectorAll('a.footnote-ref'));
  if (!refs.length) return;
  var total = refs.length;

  function noteFor(ref) {
    var id = decodeURIComponent((ref.getAttribute('href') || '').slice(1));
    return id ? document.getElementById(id) : null;
  }
  function noteHTML(li) {
    var c = li.cloneNode(true);
    c.querySelectorAll('.footnote-backref').forEach(function (b) { b.remove(); });
    var parts = [];
    c.querySelectorAll('p').forEach(function (p) { parts.push(p.innerHTML.trim()); });
    return parts.length ? parts.join(' ') : c.innerHTML.trim();
  }
  function fmt(tpl, n) { return (tpl || '').replace('{n}', n).replace('{total}', total); }
  function blockOf(el) {
    while (el && el !== host && !/^(P|LI|BLOCKQUOTE|DD|TD|H[1-6])$/.test(el.tagName)) el = el.parentNode;
    return el && el !== host ? el : null;
  }

  // sidenotes: a span after each ref's <sup>, floated into the margin by CSS on wide screens
  refs.forEach(function (ref, i) {
    var li = noteFor(ref);
    if (!li) return;
    var sn = document.createElement('span');
    sn.className = 'sidenote';
    sn.innerHTML = '<span class="sn-num">' + (i + 1) + '</span>' + noteHTML(li);
    var sup = ref.parentNode.tagName === 'SUP' ? ref.parentNode : ref;
    sup.parentNode.insertBefore(sn, sup.nextSibling);
    ref.setAttribute('aria-expanded', 'false');
  });
  function syncSidenotes() { root.classList.toggle('has-sidenotes', wideMQ.matches); if (wideMQ.matches) closePop(); syncToc(); }

  // popover
  var pop = null, popRef = null;
  function closePop(returnFocus) {
    if (!pop) return;
    pop.remove(); pop = null;
    if (popRef) { popRef.setAttribute('aria-expanded', 'false'); if (returnFocus) popRef.focus(); }
    popRef = null;
  }
  function openPop(ref, i) {
    closePop();
    var li = noteFor(ref); if (!li) return;
    var block = blockOf(ref); if (!block) return;
    pop = document.createElement('div');
    pop.className = 'note-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', fmt(host.dataset.labelNote, i + 1));
    pop.tabIndex = -1;
    pop.innerHTML =
      '<div class="note-pop-head"><span class="label accent"></span>' +
      '<button type="button" class="note-pop-close" aria-label=""><span aria-hidden="true"></span></button></div>' +
      '<div class="note-pop-text"></div>' +
      '<a class="note-pop-all label" href="#notes"></a>';
    pop.querySelector('.label').textContent = fmt(host.dataset.labelNote, i + 1);
    pop.querySelector('.note-pop-close').setAttribute('aria-label', host.dataset.labelClose || '');
    pop.querySelector('.note-pop-close span').textContent = host.dataset.labelCloseIcon || '';
    pop.querySelector('.note-pop-text').innerHTML = noteHTML(li);
    pop.querySelector('.note-pop-all').textContent = host.dataset.labelAllNotes || '';
    block.parentNode.insertBefore(pop, block.nextSibling);
    var x = ref.getBoundingClientRect().left - pop.getBoundingClientRect().left + ref.offsetWidth / 2 - 5;
    pop.style.setProperty('--arrow-x', Math.max(12, x) + 'px');
    pop.querySelector('.note-pop-close').addEventListener('click', function () { closePop(true); });
    pop.querySelector('.note-pop-all').addEventListener('click', function () { closePop(); });
    ref.setAttribute('aria-expanded', 'true');
    popRef = ref;
    pop.focus({ preventScroll: true });
  }
  refs.forEach(function (ref, i) {
    ref.addEventListener('click', function (e) {
      if (wideMQ.matches) return;          // wide: the sidenote is visible; let the anchor work
      e.preventDefault();
      if (popRef === ref) closePop(); else openPop(ref, i);
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(true); });

  wideMQ.addEventListener ? wideMQ.addEventListener('change', syncSidenotes) : wideMQ.addListener(syncSidenotes);
  syncSidenotes();
})();
