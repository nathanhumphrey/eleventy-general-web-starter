import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import clean from "eleventy-plugin-clean";

import env from './src/_data/env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (eleventyConfig) {
  eleventyConfig.setTemplateFormats("md,njk");

  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(eleventyImageTransformPlugin);
  eleventyConfig.addPlugin(clean);

  eleventyConfig.addWatchTarget('src/assets/css/styles.css');

  eleventyConfig.addFilter("formatDate", (dateObj) => {
    return dateObj.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  });

  // A cache to store the hashed file names
  const hashCache = {};

  // A cache buster if a file changes
  const prefixLength = "./src".length;
  eleventyConfig.on('eleventy.beforeWatch', async (changedFiles) => {
    for (const file of changedFiles) {
      const relativePath = file.slice(prefixLength);
      delete hashCache[relativePath];
    }
  });

  // A filter to dynamically hash asset file contents
  eleventyConfig.addFilter("digest", async (filePath) => {
    // If we've already hashed this file, return the hash
    if (hashCache[filePath]) {
      return hashCache[filePath];
    }

    // Get the absolute path to the file inside of src/site
    const absolutePath = path.join(__dirname, 'src', filePath);

    // Digest the file
    const fileBuffer = fs.readFileSync(absolutePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const relativePath = filePath.slice(0, path.basename(filePath).length * -1);
    const digestFileName = `${relativePath}${hash}-${path.basename(filePath)}`;

    // See if the digest file exists in the output folder _site
    const digestFilePath = path.join(__dirname, '_site', digestFileName);
    hashCache[filePath] = digestFileName;
    if (!fs.existsSync(digestFilePath)) {
      if (!fs.existsSync(path.dirname(digestFilePath))) {
        fs.mkdirSync(path.dirname(digestFilePath), { recursive: true });
      }
      fs.copyFileSync(absolutePath, digestFilePath);
    }
    // Return the digest file name
    return digestFileName;
  });

  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");

  if (env.mode === "dev") {
    eleventyConfig.addPassthroughCopy({ "src/assets/css/styles.css": "assets/css/styles.css" });
    eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  }

  eleventyConfig.addPassthroughCopy({ "src/assets/img": "assets/img" });
  eleventyConfig.addPassthroughCopy("favicon.ico");

  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
}
