// Builds a throwaway Publii site from fixtures, using Publii's own back-end classes (Page, Post, Image),
// so rows, featured images, tags and resized images are written exactly as the app writes them.
// Called by scripts/seed.sh (which checks that Publii is closed); run with Publii's Electron binary in Node mode:
//   ELECTRON_RUN_AS_NODE=1 /Applications/Publii.app/Contents/MacOS/Publii seed.js <appDir> <sitesDir> <fixtureFile> <themeDir> <publiiApp>
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const [appDir, sitesDir, fixtureFile, themeDir, publiiApp, modeArg] = process.argv.slice(2);
// --into-existing=<site>: add the content to an existing, still EMPTY Publii site (no pages, posts or tags)
// instead of creating a throwaway oeuvre-dev site. Nothing is deleted; the site keeps its name, ID and author.
const intoExisting = modeArg && modeArg.startsWith('--into-existing=') ? modeArg.split('=')[1] : null;
const ASAR = path.join(publiiApp || '/Applications/Publii.app', 'Contents/Resources/app.asar');
const req = rel => require(path.join(ASAR, rel));

// Publii models report progress to the app when they run as workers; there is no app here.
if (typeof process.send !== 'function') {
    process.send = () => {};
}

const Page = req('back-end/page.js');
const Post = req('back-end/post.js');
const Image = req('back-end/image.js');
const DBUtils = req('back-end/helpers/db.utils.js');
const openDatabase = req('back-end/helpers/db.connection.js');
const slug = req('back-end/helpers/slug.js');
const sizeOf = require(path.join(ASAR, 'node_modules/image-size'));

const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
const themeOptions = JSON.parse(fs.readFileSync(path.join(themeDir, 'config.json'), 'utf8'));
const fixtureImages = path.join(path.dirname(fixtureFile), 'images');
const siteName = intoExisting || fixture.site.name;
const MARKER = '.oeuvre-fixture-site';
const siteDir = path.join(sitesDir, siteName);

// ---------- safety ----------
if (intoExisting) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(siteName) || !fs.existsSync(path.join(siteDir, 'input', 'db.sqlite'))) {
        fail(`No existing Publii site "${siteName}" in ${sitesDir}.`);
    }
    const { DatabaseSync } = require('node:sqlite');
    const check = new DatabaseSync(path.join(siteDir, 'input', 'db.sqlite'), { readOnly: true });
    const counts = ['posts', 'tags'].map(table => check.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
    check.close();
    if (counts.some(n => n > 0)) {
        fail(`Refusing: "${siteName}" already has content (${counts[0]} pages/posts, ${counts[1]} tags). This mode only fills an empty site.`);
    }
} else {
    if (!/^oeuvre-dev[a-z0-9-]*$/.test(siteName)) {
        fail(`Refusing to seed "${siteName}": fixture sites must be named oeuvre-dev…`);
    }
    if (fs.existsSync(siteDir)) {
        if (!fs.existsSync(path.join(siteDir, MARKER))) {
            fail(`${siteDir} exists but was not made by this script (no ${MARKER} file). Not touching it.`);
        }
        fs.rmSync(siteDir, { recursive: true, force: true });
    }
}

// ---------- site skeleton (mirrors back-end/site.js → create) ----------
let db;
const app = {
    appDir,
    sitesDir,
    basedir: ASAR,
    appConfig: {},
    getDbForSite: () => db
};

if (intoExisting) {
    prepareExistingSite();
} else {
    createSite();
}
db = new DBUtils(openDatabase(path.join(siteDir, 'input', 'db.sqlite')));

// The app keeps each loaded site's config merged with its defaults in app.sites; the models read slug/URL rules from it.
const defaultSiteConfig = JSON.parse(JSON.stringify(req('config/AST.currentSite.config')));
const siteConfigOnDisk = JSON.parse(fs.readFileSync(path.join(siteDir, 'input', 'config', 'site.config.json'), 'utf8'));
const mergeObjects = req('back-end/helpers/utils.js').mergeObjects;
// fixture.siteSettings: Site settings values, e.g. { "advanced": { "urls": { "postsPrefix": "news" } } }
app.sites = { [siteName]: mergeObjects(mergeObjects(defaultSiteConfig, siteConfigOnDisk), fixture.siteSettings || {}) };
// Store the complete config, as the app does after its first save of the site settings.
fs.writeFileSync(path.join(siteDir, 'input', 'config', 'site.config.json'), JSON.stringify(app.sites[siteName], null, 4));

const ids = { page: {}, post: {} };
const now = Date.now();

(async () => {
    for (const [index, item] of fixture.pages.entries()) {
        ids.page[item.key] = await saveItem('page', item, now - (fixture.pages.length - index) * 60000);
    }

    for (const item of fixture.posts || []) {
        await saveItem('post', item, Date.parse(item.date));
    }

    writePagesStructure();
    writeMenus();
    writeThemeSettings();

    db.close();
    console.log(`Seeded ${siteName}: ${fixture.pages.length} pages, ${(fixture.posts || []).length} posts → ${siteDir}`);
    process.exit(0);
})().catch(error => fail(error && error.stack ? error.stack : String(error)));

// ---------- helpers ----------
function fail (message) {
    console.error(message);
    process.exit(1);
}

function copyTheme () {
    const target = path.join(siteDir, 'input', 'themes', 'oeuvre');
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(themeDir, target, {
        recursive: true,
        filter: src => !/\/(\.git|docs|dist|scripts|fixtures)(\/|$)|\.DS_Store$|\.gitignore$/.test(src)
    });
}

function writePlugins (configDir) {
    const pluginsPath = path.join(configDir, 'site.plugins.json');
    let plugins = {};
    try { plugins = JSON.parse(fs.readFileSync(pluginsPath, 'utf8')) || {}; } catch (e) { plugins = {}; }
    (fixture.site.plugins || []).forEach(name => { plugins[name] = true; });
    fs.writeFileSync(pluginsPath, JSON.stringify(plugins, null, 4));
    fs.mkdirSync(path.join(configDir, 'plugins'), { recursive: true });
    Object.entries(fixture.pluginSettings || {}).forEach(([name, values]) => {
        fs.writeFileSync(path.join(configDir, 'plugins', name + '.json'), JSON.stringify(values, null, 4));
    });
}

// Existing site: install the theme, switch the site to it, enable plugins. The site's name, ID and author stay as they are.
function prepareExistingSite () {
    copyTheme();
    const configDir = path.join(siteDir, 'input', 'config');
    const configPath = path.join(configDir, 'site.config.json');
    const siteConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    siteConfig.theme = 'oeuvre';
    fs.writeFileSync(configPath, JSON.stringify(siteConfig, null, 4));
    writePlugins(configDir);
    ['input/media/posts', 'input/media/website', 'input/config/plugins'].forEach(dir => fs.mkdirSync(path.join(siteDir, dir), { recursive: true }));
}

function createSite () {
    const dirs = [
        '', 'input', 'input/config', 'input/config/plugins', 'input/root-files', 'input/media',
        'input/media/temp', 'input/media/website', 'input/media/posts', 'input/media/files',
        'input/media/tags', 'input/media/authors', 'input/media/plugins', 'input/themes',
        'input/languages', 'output', 'preview'
    ];
    dirs.forEach(dir => fs.mkdirSync(path.join(siteDir, dir), { recursive: true }));
    fs.writeFileSync(path.join(siteDir, MARKER), 'Throwaway test site built by oeuvre/scripts/seed.sh. Safe to delete.\n');

    // the theme under development
    fs.cpSync(themeDir, path.join(siteDir, 'input', 'themes', 'oeuvre'), {
        recursive: true,
        filter: src => !/\/(\.git|docs|dist|scripts|fixtures)(\/|$)|\.DS_Store$|\.gitignore$/.test(src)
    });

    const configDir = path.join(siteDir, 'input', 'config');
    const siteConfig = {
        uuid: 'uuid-' + Date.now() + '-' + crypto.randomInt(100000000, 999999999),
        name: siteName,
        description: '',
        displayName: fixture.site.displayName || siteName,
        logo: { icon: 'web-power' },
        theme: 'oeuvre',
        language: 'en-gb',
        advanced: { urls: { cleanUrls: true }, responsiveImages: 1, mediaLazyLoad: 1 }
    };
    fs.writeFileSync(path.join(configDir, 'site.config.json'), JSON.stringify(siteConfig, null, 4));
    fs.writeFileSync(path.join(configDir, 'menu.config.json'), '[]');
    fs.writeFileSync(path.join(configDir, 'theme.config.json'), '{}');
    fs.writeFileSync(path.join(configDir, 'pages.config.json'), '[]');

    const plugins = {};
    (fixture.site.plugins || []).forEach(name => { plugins[name] = true; });
    fs.writeFileSync(path.join(configDir, 'site.plugins.json'), JSON.stringify(plugins, null, 4));

    // fixture.pluginSettings: { pluginName: { option: value } }, stored flat like Plugins → <plugin> → Save
    Object.entries(fixture.pluginSettings || {}).forEach(([name, values]) => {
        fs.writeFileSync(path.join(configDir, 'plugins', name + '.json'), JSON.stringify(values, null, 4));
    });

    const dbHandle = new DBUtils(openDatabase(path.join(siteDir, 'input', 'db.sqlite')));
    dbHandle.exec(fs.readFileSync(path.join(ASAR, 'back-end', 'sql', '1.0.0.sql'), 'utf8'));
    const author = fixture.site.author || 'Test Author';
    dbHandle.prepare(`INSERT INTO authors VALUES(1, @name, @slug, '', '{}', '{}')`).run({ name: author, slug: slug(author).toLowerCase() });
    dbHandle.close();
}

// Copies an image into the item's media folder and makes Publii's resized versions.
async function storeImage (itemId, file, imageType) {
    const source = path.join(fixtureImages, file);
    if (!fs.existsSync(source)) {
        throw new Error('Missing fixture image: ' + source);
    }
    const itemDir = path.join(siteDir, 'input', 'media', 'posts', String(itemId));
    const dir = imageType === 'galleryImages' ? path.join(itemDir, 'gallery') : itemDir;
    fs.mkdirSync(path.join(itemDir, 'responsive'), { recursive: true });
    fs.mkdirSync(dir, { recursive: true });
    const destination = path.join(dir, file);

    if (!fs.existsSync(destination)) {
        fs.copyFileSync(source, destination);
    }

    const image = new Image(app, { site: siteName, id: itemId, path: destination, imageType });
    const jobs = image.createResponsiveImages(destination, imageType);
    if (Array.isArray(jobs)) {
        const results = await Promise.all(jobs.filter(job => job && typeof job.then === 'function'));
        const failed = results.filter(result => result && result.error);
        if (failed.length) {
            throw new Error('Image processing failed for ' + file + ': ' + JSON.stringify(failed));
        }
    }

    return { destination, size: sizeOf(destination) };
}

const advanced = (extra = {}) => Object.assign({ cssClasses: '', id: '' }, extra);
const noLink = () => ({ url: '', noFollow: false, targetBlank: false, sponsored: false, ugc: false });

// Expands the fixture shorthand into Publii Block Editor JSON (defaults copied from each block's block.vue).
async function buildBlocks (itemId, blocks) {
    const out = [];
    for (const block of blocks || []) {
        const id = crypto.randomUUID();
        const heading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].find(key => key in block);

        if ('p' in block) {
            out.push({ id, type: 'publii-paragraph', content: block.p, config: { textAlign: 'left', advanced: advanced({ style: '' }) } });
        } else if (heading) {
            out.push({ id, type: 'publii-header', content: block[heading], config: {
                headingLevel: Number(heading.slice(1)), textAlign: 'left', link: noLink(), advanced: advanced({ customId: '' })
            } });
        } else if ('ul' in block || 'ol' in block) {
            const listType = 'ul' in block ? 'ul' : 'ol';
            out.push({ id, type: 'publii-list', content: block[listType].map(text => '<li>' + text + '</li>').join(''), config: { listType, advanced: advanced() } });
        } else if ('quote' in block) {
            out.push({ id, type: 'publii-quote', content: { text: block.quote, author: block.author || '' }, config: { advanced: advanced() } });
        } else if ('image' in block) {
            const stored = await storeImage(itemId, block.image.file, 'contentImages');
            out.push({ id, type: 'publii-image', content: {
                image: '#DOMAIN_NAME#' + path.basename(stored.destination),
                imageHeight: stored.size.height,
                imageWidth: stored.size.width,
                alt: block.image.alt || '',
                caption: block.image.caption || ''
            }, config: { imageAlign: block.image.align || 'center', link: noLink(), advanced: advanced() } });
        } else if ('gallery' in block) {
            const images = [];
            for (const entry of block.gallery) {
                const stored = await storeImage(itemId, entry.file, 'galleryImages');
                const parsed = path.parse(stored.destination);
                const thumbnail = path.join(parsed.dir, parsed.name + '-thumbnail' + parsed.ext);
                const thumbSize = fs.existsSync(thumbnail) ? sizeOf(thumbnail) : stored.size;
                images.push({
                    src: '#DOMAIN_NAME#gallery/' + parsed.base,
                    thumbnailSrc: '#DOMAIN_NAME#gallery/' + path.basename(thumbnail),
                    height: thumbSize.height,
                    width: thumbSize.width,
                    dimensions: stored.size.width + 'x' + stored.size.height,
                    alt: entry.alt || '',
                    caption: entry.caption || ''
                });
            }
            out.push({ id, type: 'publii-gallery', content: { images }, config: { imageAlign: 'center', columns: block.columns || 3, advanced: advanced() } });
        } else {
            throw new Error('Unknown block shorthand: ' + JSON.stringify(block));
        }
    }
    return JSON.stringify(out);
}

// Creates the item with Publii's own model, adds its images, then saves it again with text and featured image.
async function saveItem (kind, item, timestamp) {
    const Model = kind === 'page' ? Page : Post;
    const draft = item.status === 'draft';
    const status = kind === 'page' ? (draft ? 'draft,is-page' : 'published,is-page') : (draft ? 'draft' : 'published');
    const viewSettingsKey = kind === 'page' ? 'pageViewSettings' : 'postViewSettings';
    // Like the editor: one entry per theme option, with a value only where the fixture overrides the global setting.
    const viewSettings = {};
    (themeOptions[kind === 'page' ? 'pageConfig' : 'postConfig'] || []).forEach(option => {
        viewSettings[option.name] = { type: option.type };
    });
    Object.entries(item.pageSettings || item.postSettings || {}).forEach(([key, value]) => {
        viewSettings[key] = { type: (viewSettings[key] && viewSettings[key].type) || 'select', value };
    });

    const base = {
        site: siteName,
        title: item.title,
        slug: item.slug || slug(item.title),
        author: 1,
        status,
        tags: item.tags || [],
        creationDate: timestamp,
        modificationDate: timestamp,
        template: item.template || '',
        additionalData: { metaTitle: '', metaDesc: '', metaRobots: 'index, follow', canonicalUrl: '', editor: 'blockeditor' },
        [viewSettingsKey]: viewSettings,
        text: '',
        featuredImage: '',
        featuredImageFilename: '',
        featuredImageData: false
    };

    const created = new Model(app, Object.assign({}, base, { id: 0 })).save();
    const id = kind === 'page' ? created.pageID : created.postID;
    const update = Object.assign({}, base, { id, text: await buildBlocks(id, item.blocks) });

    if (item.featured) {
        const stored = await storeImage(id, item.featured.file, 'featuredImages');
        Object.assign(update, {
            featuredImage: stored.destination,
            featuredImageFilename: path.basename(stored.destination),
            featuredImageData: { alt: item.featured.alt || '', caption: item.featured.caption || '', credits: item.featured.credits || '' }
        });
    }

    new Model(app, update).save();
    return id;
}

function writePagesStructure () {
    const node = page => ({
        id: ids.page[page.key],
        subpages: fixture.pages.filter(child => child.parent === page.key).map(node)
    });
    const tree = fixture.pages.filter(page => !page.parent).map(node);
    fs.writeFileSync(path.join(siteDir, 'input', 'config', 'pages.config.json'), JSON.stringify(tree, null, 4));
}

function writeMenus () {
    let nextId = Date.now();
    // entry.page → Page link; otherwise entry.type: "blogpage" (Post index link, the News page),
    // "frontpage", "tags", or "external" / "internal" with entry.url
    const link = entry => {
        if (entry.page) {
            return resolveRef('@page:' + entry.page);
        }
        if (['external', 'internal'].includes(entry.type)) {
            return entry.url;
        }
        // the app stores "empty" for blogpage / frontpage / tags items (menu.hbs only links items with a link value)
        return 'empty';
    };
    const item = entry => ({
        id: nextId++,
        label: entry.label,
        title: '',
        type: entry.page ? 'page' : entry.type,
        target: entry.type === 'external' ? '_blank' : '_self',
        rel: '',
        link: link(entry),
        cssClass: '',
        isHidden: false,
        items: (entry.items || []).map(item)
    });
    const menus = (fixture.menus || []).map(menu => ({
        name: menu.name,
        position: menu.position || '',
        items: menu.items.map(item),
        maxLevels: '-1'
    }));
    fs.writeFileSync(path.join(siteDir, 'input', 'config', 'menu.config.json'), JSON.stringify(menus, null, 4));
}

function resolveRef (value) {
    // "@upload:file.png": an upload-type theme setting (logo, emblem); copied to media/website like the app does
    if (typeof value === 'string' && value.startsWith('@upload:')) {
        const file = value.slice(8);
        const websiteDir = path.join(siteDir, 'input', 'media', 'website');
        fs.mkdirSync(websiteDir, { recursive: true });
        fs.copyFileSync(path.join(fixtureImages, file), path.join(websiteDir, file));
        return 'media/website/' + file;
    }
    if (typeof value === 'string' && value.startsWith('@page:')) {
        const id = ids.page[value.slice(6)];
        if (!id) {
            throw new Error('Unknown page reference ' + value);
        }
        return id;
    }
    return value;
}

// theme.config.json holds Theme settings values; start from the theme's defaults, then apply the fixture.
function writeThemeSettings () {
    const themeConfig = JSON.parse(fs.readFileSync(path.join(themeDir, 'config.json'), 'utf8'));
    const defaults = list => Object.fromEntries((list || []).filter(o => o.name && o.type !== 'separator').map(o => [o.name, o.value]));
    const settings = {
        config: defaults(themeConfig.config),
        customConfig: defaults(themeConfig.customConfig),
        postConfig: defaults(themeConfig.postConfig),
        pageConfig: defaults(themeConfig.pageConfig),
        tagConfig: defaults(themeConfig.tagConfig),
        authorConfig: defaults(themeConfig.authorConfig),
        defaultTemplates: { post: '', page: '' }
    };
    Object.entries(fixture.themeSettings || {}).forEach(([key, value]) => {
        const group = key in settings.config ? 'config' : 'customConfig';
        settings[group][key] = resolveRef(value);
    });
    const json = JSON.stringify(settings, null, 4);
    fs.writeFileSync(path.join(siteDir, 'input', 'config', 'theme.config.json'), json);
    fs.writeFileSync(path.join(siteDir, 'input', 'config', 'theme.oeuvre.config.json'), json);
}
