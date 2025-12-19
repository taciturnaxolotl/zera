#!/usr/bin/env bun

import fs from "fs";
import path from "path";
import { glob } from "glob";
import cliProgress from "cli-progress";
import sharp from "sharp";

const UPLOAD_URL = "https://l4.dunkirk.sh/upload";
const AUTH_TOKEN = "crumpets";
const contentDir = process.argv[2] || "content";
const CONCURRENCY = 15; // Number of parallel uploads
const MAX_DIMENSION = 1920; // Max dimension for either width or height

interface ImageMatch {
  filePath: string;
  originalUrl: string;
  line: number;
}

interface UploadResult {
  url: string;
  newUrl: string | null;
  error?: string;
}

async function uploadImage(
  url: string,
  progressBar?: cliProgress.SingleBar,
): Promise<{ newUrl: string | null; error?: string }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      progressBar?.increment();
      return {
        newUrl: null,
        error: `Download failed: ${response.status} ${response.statusText}`,
      };
    }

    const blob = await response.blob();
    let buffer = Buffer.from(await blob.arrayBuffer());

    // Get file extension from URL or content type
    const urlExt = url.split(".").pop()?.split("?")[0];
    const contentType = response.headers.get("content-type") || "";
    let ext = urlExt || "jpg";

    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("jpeg") || contentType.includes("jpg"))
      ext = "jpg";
    else if (contentType.includes("gif")) ext = "gif";
    else if (contentType.includes("webp")) ext = "webp";

    // Resize image if it's too large
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      if (metadata.width && metadata.height) {
        const maxDimension = Math.max(metadata.width, metadata.height);
        
        if (maxDimension > MAX_DIMENSION) {
          // Resize so the longest side is MAX_DIMENSION
          const isLandscape = metadata.width > metadata.height;
          buffer = await image
            .resize(
              isLandscape ? MAX_DIMENSION : undefined,
              isLandscape ? undefined : MAX_DIMENSION,
              {
                fit: 'inside',
                withoutEnlargement: true,
              }
            )
            .toBuffer();
        }
      }
    } catch (resizeError) {
      // If resize fails, continue with original buffer
      console.error(`\nWarning: Failed to resize ${url}:`, resizeError);
    }

    const filename = `image_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // Create form data
    const formData = new FormData();
    const file = new File([buffer], filename, { type: contentType });
    formData.append("file", file);

    const uploadResponse = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      progressBar?.increment();
      return {
        newUrl: null,
        error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`,
      };
    }

    const result = await uploadResponse.json();
    progressBar?.increment();
    return { newUrl: result.url };
  } catch (error) {
    progressBar?.increment();
    return {
      newUrl: null,
      error: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

function findImages(filePath: string): ImageMatch[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const images: ImageMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find all image URLs in standard markdown: ![alt](url) or ![alt](url){attrs}
    const singleImageRegex = /!\[([^\]]*)\]\(([^)]+)\)(?:\{[^}]+\})?/g;
    let match;

    while ((match = singleImageRegex.exec(line)) !== null) {
      const url = match[2];
      // Only process hel1 cdn URLs, skip gifs
      if (
        url.includes("hc-cdn.hel1.your-objectstorage.com") &&
        !url.toLowerCase().endsWith(".gif")
      ) {
        images.push({
          filePath,
          originalUrl: url,
          line: i + 1,
        });
      }
    }

    // Find all image URLs in multi-image format: !![alt1](url1)[alt2](url2){attrs}
    const multiImageRegex = /!!(\[([^\]]*)\]\(([^)]+)\))+(?:\{[^}]+\})?/g;
    while ((match = multiImageRegex.exec(line)) !== null) {
      const urlMatches = [...match[0].matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)];
      for (const urlMatch of urlMatches) {
        const url = urlMatch[2];
        // Only process hel1 cdn URLs, skip gifs
        if (
          url.includes("hc-cdn.hel1.your-objectstorage.com") &&
          !url.toLowerCase().endsWith(".gif")
        ) {
          images.push({
            filePath,
            originalUrl: url,
            line: i + 1,
          });
        }
      }
    }
  }

  return images;
}

function replaceImageUrl(
  filePath: string,
  oldUrl: string,
  newUrl: string,
): void {
  let content = fs.readFileSync(filePath, "utf8");

  // Replace all occurrences of the old URL with the new one
  // This handles both single and multi-image formats
  content = content.replaceAll(oldUrl, newUrl);

  fs.writeFileSync(filePath, content);
}

async function main() {
  const files = glob.sync(`${contentDir}/**/*.md`);
  const allImages: ImageMatch[] = [];

  // Find all images across all files
  for (const file of files) {
    const images = findImages(file);
    allImages.push(...images);
  }

  if (allImages.length === 0) {
    console.log("No external images found to rehost.");
    return;
  }

  const uniqueUrls = [...new Set(allImages.map((img) => img.originalUrl))];
  console.log(
    `Found ${uniqueUrls.length} unique images to rehost (${allImages.length} total references)\n`,
  );

  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format:
      "Uploading |{bar}| {percentage}% | {value}/{total} images | ETA: {eta}s",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  progressBar.start(uniqueUrls.length, 0);

  // Process URLs in parallel with concurrency limit
  const urlMap = new Map<string, string>();
  const failedUploads: { url: string; error: string }[] = [];

  const results = await processInBatches(
    uniqueUrls,
    CONCURRENCY,
    async (url) => {
      const result = await uploadImage(url, progressBar);
      return { url, ...result };
    },
  );

  progressBar.stop();

  // Build URL map and collect errors
  for (const { url, newUrl, error } of results) {
    if (newUrl) {
      urlMap.set(url, newUrl);
    } else if (error) {
      failedUploads.push({ url, error });
    }
  }

  const successCount = urlMap.size;
  const failCount = uniqueUrls.length - successCount;

  if (failCount > 0) {
    console.log(
      `\n⚠️  Failed to upload ${failCount} image${failCount === 1 ? "" : "s"}`,
    );

    // Group errors by type
    const errorGroups = new Map<string, string[]>();
    for (const { url, error } of failedUploads) {
      const errorType = error.split(":")[0];
      if (!errorGroups.has(errorType)) {
        errorGroups.set(errorType, []);
      }
      errorGroups.get(errorType)!.push(url);
    }

    console.log("\nError summary:");
    for (const [errorType, urls] of errorGroups.entries()) {
      console.log(
        `  ${errorType}: ${urls.length} image${urls.length === 1 ? "" : "s"}`,
      );
      if (urls.length <= 3) {
        urls.forEach((url) => console.log(`    - ${url}`));
      } else {
        urls.slice(0, 2).forEach((url) => console.log(`    - ${url}`));
        console.log(`    ... and ${urls.length - 2} more`);
      }
    }
  }

  if (urlMap.size === 0) {
    console.log("\n❌ No images were successfully uploaded.");
    return;
  }

  // Replace URLs in files
  console.log(
    `\n✓ Successfully uploaded ${successCount} image${successCount === 1 ? "" : "s"}`,
  );
  console.log("\nUpdating markdown files...");

  let filesUpdated = 0;
  const updatedFiles = new Set<string>();

  for (const [oldUrl, newUrl] of urlMap.entries()) {
    const affectedImages = allImages.filter(
      (img) => img.originalUrl === oldUrl,
    );
    for (const img of affectedImages) {
      replaceImageUrl(img.filePath, oldUrl, newUrl);
      updatedFiles.add(img.filePath);
    }
  }

  console.log(
    `✓ Updated ${updatedFiles.size} file${updatedFiles.size === 1 ? "" : "s"}\n`,
  );
}

main();
