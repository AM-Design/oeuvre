/*
 * Theme variables from Theme → Custom settings → Look (https://getpublii.com/dev/theme-variables/).
 * Publii writes this output into style.css before main.css, so main.css must not redefine these variables.
 */

var SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
var MONTSERRAT = 'Montserrat, ' + SANS;

var headingFonts = {
   montserrat: MONTSERRAT,
   book: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
   classic: 'Georgia, "Times New Roman", Times, serif',
   sans: SANS
};

var bodyFonts = {
   montserrat: MONTSERRAT,
   sans: SANS
};

// --- colour helpers: links use the accent, darkened until it reads at 4.5:1 on white (WCAG AA) ---
function parseHex (hex) {
   var h = String(hex || '').trim().replace('#', '');
   if (h.length === 3) {
      h = h.split('').map(function (c) { return c + c; }).join('');
   }
   if (!/^[0-9a-f]{6}$/i.test(h)) {
      return null;
   }
   return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
}

function luminance (rgb) {
   var c = rgb.map(function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
   });
   return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrastOnWhite (rgb) {
   return 1.05 / (luminance(rgb) + 0.05);
}

function toHex (rgb) {
   return '#' + rgb.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join('');
}

function readableOnWhite (hex) {
   var rgb = parseHex(hex);
   if (!rgb) {
      return hex;
   }
   var step = 0;
   while (contrastOnWhite(rgb) < 4.5 && step < 40) {
      rgb = rgb.map(function (v) { return v * 0.95; });
      step++;
   }
   return toHex(rgb);
}

var generateThemeVariables = function (params) {
   var width = params.mainWidth || '1200px';
   var accent = params.accentColor || '#ed5448';
   var headingKey = headingFonts[params.headingFont] ? params.headingFont : 'montserrat';
   var bodyKey = bodyFonts[params.bodyFont] ? params.bodyFont : 'montserrat';
   var uppercase = params.uppercase === undefined ? true : !!params.uppercase;

   // the uploaded signature emblem, shown small under each wall label (url relative to assets/css/style.css)
   var mark = params.signatureMark ? String(params.signatureMark) : '';
   if (mark && !/^(https?:)?\/\//.test(mark) && mark.charAt(0) !== '/') {
      mark = '../../' + mark;
   }
   var markVar = mark ? `--artist-mark: url("${mark.replace(/"/g, '%22')}");` : '--artist-mark: none;';

   return `
      :root {
         --main-width: ${width};
         --color-accent: ${accent};
         --color-link: ${readableOnWhite(accent)};
         --font-heading: ${headingFonts[headingKey]};
         --font-body: ${bodyFonts[bodyKey]};
         --heading-weight: ${headingKey === 'montserrat' || headingKey === 'sans' ? 700 : 400};
         --heading-transform: ${uppercase ? 'uppercase' : 'none'};
         --heading-tracking: ${uppercase ? '0.03em' : 'normal'};
         ${markVar}
      }`;
};

module.exports = generateThemeVariables;
