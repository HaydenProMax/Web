import type { WritingPostDetail, WritingPostSummary } from "@workspace/types/index";

const writingPosts: WritingPostDetail[] = [
  {
    id: "post-slow-living",
    slug: "the-art-of-slow-living-in-a-digital-age",
    title: "The Art of Slow Living in a Digital Age",
    summary:
      "Exploring the intersections of mindfulness and modern connectivity, and how we might find silence in a world that never stops talking.",
    coverImage:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "Sunlit room with calm desk and soft shadows.",
    category: "Personal Essay",
    readMinutes: 12,
    publishedAt: "2026-04-02T08:00:00.000Z",
    visibility: "PUBLIC",
    content: [
      {
        type: "paragraph",
        content:
          "In quiet spaces, we recover the ability to think in complete sentences. Slow living on the web is not withdrawal. It is choosing pace with intention."
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
        alt: "Minimal studio desk near a bright window.",
        caption: "A workspace that gives thought room to arrive."
      },
      {
        type: "heading",
        level: 2,
        content: "Designing for calmer attention"
      },
      {
        type: "paragraph",
        content:
          "The most humane tools do not demand constant response. They let drafts breathe, notes mature, and tasks reveal their true weight before we act on them."
      },
      {
        type: "videoEmbed",
        provider: "youtube",
        embedUrl: "https://www.youtube.com/embed/ScMzIvxBSi4",
        caption: "A placeholder embed proving the rich-media article model."
      },
      {
        type: "quote",
        content:
          "A writing space should feel less like a feed and more like a room you want to return to."
      }
    ]
  },
  {
    id: "post-architecture-silence",
    slug: "the-architecture-of-silence",
    title: "The Architecture of Silence",
    summary:
      "How we build spaces of quiet within our noisy schedules and the psychological impact of intentional downtime on the creative spirit.",
    coverImage:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "Misty mountain layers at sunrise.",
    category: "Essay",
    readMinutes: 5,
    publishedAt: "2026-03-21T08:00:00.000Z",
    visibility: "PUBLIC",
    content: [
      {
        type: "paragraph",
        content:
          "Silence is not the absence of signal. It is the presence of enough margin to understand what matters."
      }
    ]
  },
  {
    id: "post-pen-pulse",
    slug: "the-pen-and-the-pulse",
    title: "The Pen and the Pulse",
    summary:
      "Brief notes on the physical act of handwriting and how the friction of paper slows down thinking to a manageable, lyrical pace.",
    coverImage:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "Notebook, fountain pen, and tea on a table.",
    category: "Reflection",
    readMinutes: 3,
    publishedAt: "2026-03-12T08:00:00.000Z",
    visibility: "PUBLIC",
    content: [
      {
        type: "paragraph",
        content:
          "Some ideas only become visible after the hand has slowed the mind enough to notice them."
      }
    ]
  }
];

export function listWritingPosts(): WritingPostSummary[] {
  return writingPosts.map(({ content, ...post }) => post);
}

export function getWritingPostBySlug(slug: string): WritingPostDetail | undefined {
  return writingPosts.find((post) => post.slug === slug);
}

