import type { MediaAssetSummary, RichTextNode } from "@workspace/types/index";

export type WritingEditorBlock = {
  id: string;
  type: RichTextNode["type"];
  content: string;
  level: 1 | 2 | 3;
  src: string;
  alt: string;
  caption: string;
  embedUrl: string;
  provider: "youtube" | "bilibili" | "vimeo" | "custom";
};

const VIDEO_PROVIDERS = new Set<WritingEditorBlock["provider"]>(["youtube", "bilibili", "vimeo", "custom"]);

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isRichTextNodeShape(value: unknown): value is RichTextNode {
  if (!value || typeof value !== "object") {
    return false;
  }

  const node = value as Record<string, unknown>;

  switch (node.type) {
    case "paragraph":
    case "quote":
    case "markdown":
      return typeof node.content === "string";
    case "heading":
      return typeof node.content === "string" && (node.level === 1 || node.level === 2 || node.level === 3);
    case "image":
      return typeof node.src === "string" && isOptionalString(node.alt) && isOptionalString(node.caption);
    case "videoEmbed":
      return typeof node.embedUrl === "string" && isOptionalString(node.caption) && (node.provider === undefined || VIDEO_PROVIDERS.has(node.provider as WritingEditorBlock["provider"]));
    default:
      return false;
  }
}

export function areRichTextNodes(value: unknown): value is RichTextNode[] {
  return Array.isArray(value) && value.every((node) => isRichTextNodeShape(node));
}

function createBlockId() {
  return `block-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEditorBlock(
  type: RichTextNode["type"] = "paragraph",
  overrides: Partial<WritingEditorBlock> = {}
): WritingEditorBlock {
  return {
    id: overrides.id ?? createBlockId(),
    type,
    content: overrides.content ?? "",
    level: overrides.level ?? 2,
    src: overrides.src ?? "",
    alt: overrides.alt ?? "",
    caption: overrides.caption ?? "",
    embedUrl: overrides.embedUrl ?? "",
    provider: overrides.provider ?? "custom"
  };
}

export function richTextNodesToEditorBlocks(nodes: RichTextNode[]) {
  if (nodes.length === 0) {
    return [createEditorBlock("paragraph")];
  }

  return nodes.map((node) =>
    createEditorBlock(node.type, {
      content: node.content ?? "",
      level: node.level ?? 2,
      src: node.src ?? "",
      alt: node.alt ?? "",
      caption: node.caption ?? "",
      embedUrl: node.embedUrl ?? "",
      provider: node.provider ?? "custom"
    })
  );
}

export function editorBlocksToRichTextNodes(blocks: WritingEditorBlock[]): RichTextNode[] {
  const nodes: RichTextNode[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      if (block.content.trim()) {
        nodes.push({ type: "heading", content: block.content, level: block.level });
      }
      continue;
    }

    if (block.type === "image") {
      if (block.src.trim()) {
        nodes.push({
          type: "image",
          src: block.src.trim(),
          alt: block.alt.trim() || undefined,
          caption: block.caption.trim() || undefined
        });
      }
      continue;
    }

    if (block.type === "videoEmbed") {
      if (block.embedUrl.trim()) {
        nodes.push({
          type: "videoEmbed",
          embedUrl: block.embedUrl.trim(),
          provider: block.provider,
          caption: block.caption.trim() || undefined
        });
      }
      continue;
    }

    if (block.type === "quote") {
      if (block.content.trim()) {
        nodes.push({ type: "quote", content: block.content });
      }
      continue;
    }

    if (block.type === "markdown") {
      if (block.content.trim()) {
        nodes.push({ type: "markdown", content: block.content });
      }
      continue;
    }

    if (block.content.trim()) {
      nodes.push({ type: "paragraph", content: block.content });
    }
  }

  return nodes;
}

export function appendImageBlock(blocks: WritingEditorBlock[], asset: MediaAssetSummary) {
  if (!asset.url) {
    return blocks;
  }

  return [
    ...blocks,
    createEditorBlock("image", {
      src: asset.url,
      alt: asset.altText || asset.originalFileName,
      caption: asset.originalFileName
    })
  ];
}

export function appendVideoBlock(
  blocks: WritingEditorBlock[],
  asset: MediaAssetSummary,
  provider: WritingEditorBlock["provider"],
  caption: string
) {
  if (!asset.embedUrl) {
    return blocks;
  }

  return [
    ...blocks,
    createEditorBlock("videoEmbed", {
      embedUrl: asset.embedUrl,
      provider,
      caption
    })
  ];
}
