// Renders a Publii site with Publii's own renderer, without opening the app.
// Called by scripts/preview.sh; run with Publii's Electron binary in Node mode:
//   ELECTRON_RUN_AS_NODE=1 /Applications/Publii.app/Contents/MacOS/Publii render.js <appDir> <sitesDir> <siteName> <previewUrl>
// Only ever point <sitesDir> at a COPY of a site: the renderer empties and rewrites the site's preview folder.
const path = require('path');
const fs = require('fs');

const [appDir, sitesDir, siteName, previewUrl, publiiApp] = process.argv.slice(2);
const rendererPath = path.join(publiiApp || '/Applications/Publii.app', 'Contents/Resources/app.asar/back-end/modules/render-html/renderer.js');
const Renderer = require(rendererPath);

// The renderer normally runs as a forked worker and reports progress to the app; swallow those messages.
if (typeof process.send !== 'function') {
    process.send = () => {};
}

(async () => {
    const configPath = path.join(sitesDir, siteName, 'input', 'config', 'site.config.json');
    // Merge with Publii's defaults, as the app does when it loads a site.
    const asar = path.join(publiiApp || '/Applications/Publii.app', 'Contents/Resources/app.asar');
    const defaults = JSON.parse(JSON.stringify(require(path.join(asar, 'config/AST.currentSite.config'))));
    const mergeObjects = require(path.join(asar, 'back-end/helpers/utils.js')).mergeObjects;
    const siteConfig = mergeObjects(defaults, JSON.parse(fs.readFileSync(configPath, 'utf8')));
    const renderer = new Renderer(appDir, sitesDir, siteConfig, false, false, previewUrl || false);
    const result = await renderer.render(true, 'full', false);

    if (result !== true) {
        console.error(JSON.stringify(result, null, 2));
        process.exit(1);
    }

    console.log('Rendered ' + siteName + ' to ' + path.join(sitesDir, siteName, 'preview'));
    process.exit(0);
})().catch(error => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(2);
});
