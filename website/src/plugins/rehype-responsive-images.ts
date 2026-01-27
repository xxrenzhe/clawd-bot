import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { visit } from 'unist-util-visit';
import type { Root, Element, Parent } from 'hast';

type SourceFormat = {
  ext: string;
  type: string;
};

type Options = {
  publicDir?: string;
  formats?: SourceFormat[];
  eagerCount?: number;
};

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const DEFAULT_FORMATS: SourceFormat[] = [
  { ext: 'avif', type: 'image/avif' },
  { ext: 'webp', type: 'image/webp' },
];

const dimensionCache = new Map<string, { width?: number; height?: number }>();
const existsCache = new Map<string, boolean>();

async function fileExists(filePath: string) {
  if (existsCache.has(filePath)) {
    return existsCache.get(filePath) ?? false;
  }
  try {
    await fs.access(filePath);
    existsCache.set(filePath, true);
    return true;
  } catch {
    existsCache.set(filePath, false);
    return false;
  }
}

async function getImageDimensions(filePath: string) {
  if (dimensionCache.has(filePath)) {
    return dimensionCache.get(filePath) ?? {};
  }

  try {
    const metadata = await sharp(filePath).metadata();
    const dimensions = {
      width: metadata.width,
      height: metadata.height,
    };
    dimensionCache.set(filePath, dimensions);
    return dimensions;
  } catch {
    dimensionCache.set(filePath, {});
    return {};
  }
}

export function rehypeResponsiveImages(options: Options = {}) {
  const publicDir = options.publicDir ?? path.join(process.cwd(), 'public');
  const formats = options.formats ?? DEFAULT_FORMATS;
  const eagerCount = options.eagerCount ?? 1;

  return async (tree: Root) => {
    const images: Array<{
      node: Element;
      parent: Parent;
      index: number;
      src: string;
      originalPath: string;
    }> = [];

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'img' || !parent || typeof index !== 'number') return;
      const src = node.properties?.src;
      if (typeof src !== 'string') return;

      const cleanSrc = src.split('?')[0];
      if (!cleanSrc.startsWith('/images/')) return;

      const ext = path.extname(cleanSrc).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) return;

      images.push({
        node,
        parent: parent as Parent,
        index,
        src: cleanSrc,
        originalPath: path.join(publicDir, cleanSrc.replace(/^\//, '')),
      });
    });

    let imageIndex = 0;
    for (const image of images) {
      const { node, parent, index, src, originalPath } = image;
      node.properties = node.properties || {};
      node.properties.src = src;

      const isEager = imageIndex < eagerCount;
      if (!node.properties.loading) {
        node.properties.loading = isEager ? 'eager' : 'lazy';
      }
      if (!node.properties.decoding) {
        node.properties.decoding = 'async';
      }
      if (isEager && !node.properties.fetchpriority) {
        node.properties.fetchpriority = 'high';
      }
      imageIndex += 1;

      if (!node.properties.width || !node.properties.height) {
        const dimensions = await getImageDimensions(originalPath);
        if (dimensions.width && dimensions.height) {
          node.properties.width = dimensions.width;
          node.properties.height = dimensions.height;
        }
      }

      const baseSrc = src.replace(/\.(jpe?g|png)$/i, '');
      const sources: Element[] = [];

      for (const format of formats) {
        const candidateSrc = `${baseSrc}.${format.ext}`;
        const candidatePath = path.join(publicDir, candidateSrc.replace(/^\//, ''));
        if (await fileExists(candidatePath)) {
          sources.push({
            type: 'element',
            tagName: 'source',
            properties: {
              srcset: candidateSrc,
              type: format.type,
            },
            children: [],
          });
        }
      }

      if (sources.length > 0) {
        const pictureNode: Element = {
          type: 'element',
          tagName: 'picture',
          properties: {},
          children: [...sources, node],
        };
        parent.children.splice(index, 1, pictureNode);
      }
    }
  };
}

export default rehypeResponsiveImages;
