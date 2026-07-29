import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const THUMB_WIDTH = 360;
const THUMB_QUALITY = 72;
const EAGER_IMAGE_COUNT = 6;
const PROJECT_IMAGE_PATTERN = /<img\b[^>]*\bsrc\s*=\s*(["'])(\.?\/?images\/projects\/(?!thumbs\/)[^"']+\.(?:png|jpe?g|gif))\1[^>]*>/gi;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.resolve(repoRoot, process.argv[2] || '_site');
const publicationsPath = path.join(siteRoot, 'publications.html');
const thumbsDir = path.join(siteRoot, 'images', 'projects', 'thumbs');

function commandHasImageMagick(command) {
    const result = spawnSync(command, ['-version'], { encoding: 'utf8', shell: false });
    return result.status === 0 && /ImageMagick/i.test(`${result.stdout}${result.stderr}`);
}

function getImageMagickMode() {
    if (commandHasImageMagick('magick')) return 'magick';
    if (commandHasImageMagick('convert') && commandHasImageMagick('identify')) return 'legacy';
    throw new Error('ImageMagick was not found. Install ImageMagick before optimizing publication thumbnails.');
}

const imageMagickMode = getImageMagickMode();

function runImageMagick(subcommand, args) {
    const command = imageMagickMode === 'magick' ? 'magick' : subcommand;
    const finalArgs = imageMagickMode === 'magick' ? [subcommand, ...args] : args;
    const result = spawnSync(command, finalArgs, { encoding: 'utf8', shell: false });

    if (result.status !== 0) {
        throw new Error(`${command} ${finalArgs.join(' ')} failed:\n${result.stderr || result.stdout}`);
    }

    return result.stdout.trim();
}

function normalizeSourcePath(src) {
    return src.replace(/^\.\//, '').replace(/\\/g, '/');
}

function makeThumbName(src) {
    const relativeProjectPath = normalizeSourcePath(src).replace(/^images\/projects\//, '');
    const parsed = path.posix.parse(relativeProjectPath);
    const directoryPrefix = parsed.dir ? `${parsed.dir.replace(/[\\/]+/g, '-')}-` : '';
    const sourceExtension = parsed.ext.replace(/^\./, '').toLowerCase();
    const safeName = `${directoryPrefix}${parsed.name}-${sourceExtension}`.replace(/[^a-zA-Z0-9._-]+/g, '-');
    return `${safeName}.webp`;
}

function toFilePath(relativePath) {
    return path.join(siteRoot, ...normalizeSourcePath(relativePath).split('/'));
}

function generateThumbnail(src) {
    const sourceFile = toFilePath(src);
    const thumbName = makeThumbName(src);
    const thumbFile = path.join(thumbsDir, thumbName);

    statSync(sourceFile);
    mkdirSync(thumbsDir, { recursive: true });

    runImageMagick('convert', [
        `${sourceFile}[0]`,
        '-auto-orient',
        '-resize',
        `${THUMB_WIDTH}x`,
        '-strip',
        '-quality',
        String(THUMB_QUALITY),
        '-define',
        'webp:method=6',
        thumbFile
    ]);

    const [width, height] = runImageMagick('identify', ['-format', '%w %h', thumbFile])
        .split(/\s+/)
        .map(Number);

    return {
        src: `./images/projects/thumbs/${thumbName}`,
        width,
        height,
        bytes: statSync(thumbFile).size
    };
}

function stripAttribute(tagBody, attributeName) {
    return tagBody.replace(
        new RegExp(`\\s+${attributeName}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s"'>/]+))?`, 'gi'),
        ''
    );
}

function setSrcAttribute(tagBody, newSrc) {
    return tagBody.replace(/\bsrc\s*=\s*(["'])[^"']*\1/i, `src="${newSrc}"`);
}

function rewriteImageTag(tag, image, index) {
    const selfClosing = /\/\s*>$/.test(tag);
    let body = tag.replace(/^<img\b/i, '').replace(/\/?\s*>$/i, '');

    ['loading', 'decoding', 'width', 'height', 'fetchpriority'].forEach((attributeName) => {
        body = stripAttribute(body, attributeName);
    });

    body = setSrcAttribute(body, image.src).trim();

    const loadingAttributes = index < EAGER_IMAGE_COUNT
        ? 'loading="eager" fetchpriority="high"'
        : 'loading="lazy"';
    const appendedAttributes = `${loadingAttributes} decoding="async" width="${image.width}" height="${image.height}"`;

    return `<img ${body} ${appendedAttributes}${selfClosing ? ' />' : '>'}`;
}

const originalHtml = readFileSync(publicationsPath, 'utf8');
const thumbnailCache = new Map();
let imageIndex = 0;
let optimizedCount = 0;
let optimizedBytes = 0;

const optimizedHtml = originalHtml.replace(PROJECT_IMAGE_PATTERN, (tag, _quote, src) => {
    const cacheKey = normalizeSourcePath(src);
    if (!thumbnailCache.has(cacheKey)) {
        thumbnailCache.set(cacheKey, generateThumbnail(src));
    }

    const image = thumbnailCache.get(cacheKey);
    optimizedCount += 1;
    optimizedBytes += image.bytes;

    return rewriteImageTag(tag, image, imageIndex++);
});

writeFileSync(publicationsPath, optimizedHtml);

console.log(
    `Optimized ${optimizedCount} publication images into ${thumbnailCache.size} thumbnails ` +
    `(${(optimizedBytes / 1024 / 1024).toFixed(2)} MB referenced total).`
);
