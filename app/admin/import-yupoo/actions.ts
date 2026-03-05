"use server";

import { ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import type { ImportYupooActionState } from "./state";

const FETCH_TIMEOUT_MS = 15000;
const MAX_IMAGE_COUNT = 120;
const ALBUM_FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 CatalogSiteYupooImporter/1.0";

type CandidateImageUrl = {
  value: string;
  trusted: boolean;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown Yupoo import error.";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, decimal: string) => {
      const code = Number.parseInt(decimal, 10);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeUrlCandidate(rawValue: string, baseUrl: URL): string | null {
  let value = decodeHtmlEntities(rawValue)
    .replace(/\\u002f/gi, "/")
    .replace(/\\u003a/gi, ":")
    .replace(/\\\//g, "/")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");

  if (!value) {
    return null;
  }

  if (value.startsWith("data:") || value.startsWith("javascript:")) {
    return null;
  }

  if (value.startsWith("//")) {
    value = `https:${value}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    try {
      parsed = new URL(value, baseUrl);
    } catch {
      return null;
    }
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return parsed.toString();
}

function looksLikeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const lowerPath = parsed.pathname.toLowerCase();
    const lowerSearch = parsed.search.toLowerCase();

    if (/\.(avif|bmp|gif|jpe?g|png|webp)(?:$|\?)/i.test(`${lowerPath}${lowerSearch}`)) {
      return true;
    }

    return (
      lowerPath.includes("/photo/") ||
      lowerPath.includes("/photos/") ||
      lowerPath.includes("/uploads/") ||
      lowerSearch.includes("image")
    );
  } catch {
    return false;
  }
}

function extractAlbumTitle(html: string, fallbackUrl: string): string {
  const ogTitle =
    html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] ??
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["'][^>]*>/i)?.[1];

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const rawTitle = (ogTitle ?? titleTag).trim();
  const decodedTitle = decodeHtmlEntities(rawTitle).replace(/\s+/g, " ").trim();
  const cleanedTitle = decodedTitle.replace(/\s*([|\-])\s*yupoo.*$/i, "").trim();

  if (cleanedTitle) {
    return cleanedTitle;
  }

  try {
    const parsed = new URL(fallbackUrl);
    const lastSegment = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .at(-1);

    if (lastSegment) {
      return decodeHtmlEntities(lastSegment.replace(/[-_]+/g, " "));
    }
  } catch {
    return "Imported Yupoo Album";
  }

  return "Imported Yupoo Album";
}

function collectImageCandidates(html: string): CandidateImageUrl[] {
  const candidates: CandidateImageUrl[] = [];

  const imgTagRegex = /<img\b[^>]*>/gi;
  while (true) {
    const imgTag = imgTagRegex.exec(html);
    if (!imgTag) {
      break;
    }

    const tag = imgTag[0];
    const attrRegex = /\b(?:data-origin-src|data-src|data-lazy-src|src)\s*=\s*["']([^"']+)["']/gi;

    while (true) {
      const attr = attrRegex.exec(tag);
      if (!attr) {
        break;
      }

      candidates.push({ value: attr[1], trusted: true });
    }
  }

  const scriptUrlRegex =
    /"(origin(?:_src|_url|url)?|image(?:_url|url)?|img(?:_url|url)?|photo(?:_url|url)?|url|src)"\s*:\s*"([^"]+)"/gi;
  while (true) {
    const match = scriptUrlRegex.exec(html);
    if (!match) {
      break;
    }

    const key = match[1].toLowerCase();
    const trusted = key.includes("origin") || key.includes("image") || key.includes("img") || key.includes("photo");
    candidates.push({ value: match[2], trusted });
  }

  const plainUrlRegex = /https?:\/\/[^"'\s<>\\]+/gi;
  while (true) {
    const match = plainUrlRegex.exec(html);
    if (!match) {
      break;
    }

    candidates.push({ value: match[0], trusted: false });
  }

  return candidates;
}

function extractAlbumImageUrls(html: string, albumUrl: string): string[] {
  const baseUrl = new URL(albumUrl);
  const candidates = collectImageCandidates(html);
  const imageUrls: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeUrlCandidate(candidate.value, baseUrl);

    if (!normalized) {
      continue;
    }

    if (!candidate.trusted && !looksLikeImageUrl(normalized)) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    imageUrls.push(normalized);

    if (imageUrls.length >= MAX_IMAGE_COUNT) {
      break;
    }
  }

  return imageUrls;
}

function parseYupooAlbumUrl(rawValue: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error("Yupoo album URL is invalid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Yupoo album URL must start with http:// or https://.");
  }

  if (!parsed.hostname.toLowerCase().includes("yupoo")) {
    throw new Error("Please provide a valid Yupoo album URL.");
  }

  return parsed;
}

async function fetchAlbumHtml(url: string): Promise<string> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: abortController.signal,
      headers: {
        "user-agent": ALBUM_FETCH_USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch album page (${response.status} ${response.statusText}).`);
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("text/html")) {
      throw new Error("Yupoo album URL did not return an HTML page.");
    }

    return response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Album request timed out after ${Math.floor(FETCH_TIMEOUT_MS / 1000)} seconds.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function importYupooAlbumAction(
  _prevState: ImportYupooActionState,
  formData: FormData,
): Promise<ImportYupooActionState> {
  try {
    const yupooUrlRaw = String(formData.get("yupooUrl") ?? "").trim();
    const supplierId = String(formData.get("supplierId") ?? "").trim();
    const brandIdRaw = String(formData.get("brandId") ?? "").trim();
    const brandId = brandIdRaw || null;
    const categoryIds = [...new Set(formData.getAll("categoryIds").map(String).map((value) => value.trim()).filter(Boolean))];

    if (!yupooUrlRaw) {
      return {
        status: "error",
        message: "Yupoo album URL is required.",
        result: null,
      };
    }

    if (!supplierId) {
      return {
        status: "error",
        message: "Supplier is required.",
        result: null,
      };
    }

    const albumUrl = parseYupooAlbumUrl(yupooUrlRaw).toString();

    const [supplier, brand, categories] = await Promise.all([
      prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true },
      }),
      brandId
        ? prisma.brand.findUnique({
            where: { id: brandId },
            select: { id: true },
          })
        : Promise.resolve(null),
      categoryIds.length > 0
        ? prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true },
          })
        : Promise.resolve([] as { id: string }[]),
    ]);

    if (!supplier) {
      return {
        status: "error",
        message: "Selected supplier does not exist.",
        result: null,
      };
    }

    if (brandId && !brand) {
      return {
        status: "error",
        message: "Selected brand does not exist.",
        result: null,
      };
    }

    if (categories.length !== categoryIds.length) {
      return {
        status: "error",
        message: "One or more selected categories no longer exist.",
        result: null,
      };
    }

    const albumHtml = await fetchAlbumHtml(albumUrl);
    const albumTitle = extractAlbumTitle(albumHtml, albumUrl);
    const imageUrls = extractAlbumImageUrls(albumHtml, albumUrl);

    if (imageUrls.length === 0) {
      return {
        status: "error",
        message:
          "No images found on the album page. The album might be private, blocked, or changed format.",
        result: null,
      };
    }

    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title: albumTitle,
          yupooUrl: albumUrl,
          supplier: {
            connect: { id: supplier.id },
          },
          ...(brand
            ? {
                brand: {
                  connect: { id: brand.id },
                },
              }
            : {}),
          ...(categories.length > 0
            ? {
                categories: {
                  create: categories.map((category) => ({
                    categoryId: category.id,
                  })),
                },
              }
            : {}),
        },
        select: {
          id: true,
          title: true,
        },
      });

      await tx.productImage.createMany({
        data: imageUrls.map((url, index) => ({
          productId: product.id,
          type: ImageType.SUPPLIER,
          url,
          sortOrder: index + 1,
        })),
      });

      return product;
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/import-yupoo");
    revalidatePath("/admin/products/new");
    revalidatePath(`/p/${createdProduct.id}`);

    return {
      status: "success",
      message: `Imported "${createdProduct.title}" with ${imageUrls.length} supplier photos.`,
      result: {
        productId: createdProduct.id,
        productTitle: createdProduct.title,
        imageCount: imageUrls.length,
        yupooUrl: albumUrl,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message: toErrorMessage(error),
      result: null,
    };
  }
}
