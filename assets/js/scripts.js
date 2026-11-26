// Gallery wall: turn each caption "Title — medium — size — Sold" into a museum-style label
// (title, one line per detail, status). Captions are written in the Gallery block; without JS they show as written.
(function () {
   var captions = document.querySelectorAll('.series--wall .gallery__item figcaption');
   var STATUS = /^(sold|not for sale|nfs|available|on loan|private collection)$/i;

   Array.prototype.forEach.call(captions, function (caption) {
      var parts = caption.textContent.split(/\s+[—–]\s+/).map(function (part) { return part.trim(); }).filter(Boolean);
      if (parts.length < 2 && !STATUS.test(parts[0] || '')) {
         return;
      }
      caption.textContent = '';
      parts.forEach(function (part, index) {
         var span = document.createElement('span');
         span.textContent = part;
         if (index === parts.length - 1 && STATUS.test(part)) {
            span.className = 'wall-label__status' + (/^sold$/i.test(part) ? ' wall-label__status--sold' : '');
         } else if (index === 0) {
            span.className = 'wall-label__title';
         } else {
            span.className = 'wall-label__line';
         }
         caption.appendChild(span);
      });
   });
})();

// Small-screen menu toggle. Without JavaScript the menu simply stays visible.
(function () {
   var toggle = document.querySelector('.nav-toggle');
   var nav = document.getElementById('site-nav');

   if (!toggle || !nav) {
      return;
   }

   document.documentElement.classList.add('js');
   toggle.hidden = false;

   toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
   });

   document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
         nav.classList.remove('is-open');
         toggle.setAttribute('aria-expanded', 'false');
         toggle.focus();
      }
   });
})();
