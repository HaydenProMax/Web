export type ModuleKey =
  | "dashboard"
  | "activity"
  | "planner"
  | "checkin"
  | "knowledge"
  | "writing"
  | "archive"
  | "modules"
  | "settings";

export type ModuleManifest = {
  key: ModuleKey;
  name: string;
  description: string;
  href: string;
  icon: string;
  enabledByDefault: boolean;
};

export type RichTextNode = {
  type: "paragraph" | "heading" | "image" | "videoEmbed" | "quote" | "markdown";
  content?: string;
  level?: 1 | 2 | 3;
  src?: string;
  alt?: string;
  caption?: string;
  embedUrl?: string;
  provider?: "youtube" | "bilibili" | "vimeo" | "custom";
};

export type WritingVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
export type PlannerTaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
export type PlannerTaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type CheckInScheduleType = "DAILY" | "WEEKDAYS" | "CUSTOM";
export type CheckInEntryStatus = "DONE" | "SKIPPED";
export type CheckInSkipReasonTag = "SICK" | "BUSY" | "OUT" | "REST" | "FORGOT" | "OTHER";

export type WritingDraftInput = {
  title: string;
  summary?: string;
  coverImageUrl?: string;
  sourceNoteSlug?: string;
  visibility: WritingVisibility;
  content: RichTextNode[];
};

export type RelatedWritingLink = {
  id: string;
  title: string;
  href: string;
  kind: "draft" | "post";
  updatedAt?: string;
  publishedAt?: string;
};

export type WritingDraftSummary = {
  id: string;
  title: string;
  summary: string;
  isArchived: boolean;
  visibility: WritingVisibility;
  createdAt: string;
  updatedAt: string;
  contentBlockCount: number;
  coverImageUrl?: string;
  sourceNoteSlug?: string;
  sourceNoteTitle?: string;
  publishedPostSlug?: string;
  publishedPostTitle?: string;
  publishedAt?: string;
};

export type WritingDraftDetail = WritingDraftSummary & {
  coverImageUrl?: string;
  content: RichTextNode[];
};

export type WritingPostSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImage?: string;
  coverAlt: string;
  category: string;
  readMinutes: number;
  publishedAt: string;
  visibility: WritingVisibility;
  updatedAt?: string;
  versionCount?: number;
  sourceDraftId?: string;
  sourceDraftTitle?: string;
  sourceNoteSlug?: string;
  sourceNoteTitle?: string;
};

export type WritingPostDetail = WritingPostSummary & {
  content: RichTextNode[];
};

export type PlannerTaskInput = {
  title: string;
  description?: string;
  priority?: PlannerTaskPriority;
  status?: PlannerTaskStatus;
  scheduledFor?: string;
  dueAt?: string;
  relatedNoteSlug?: string;
  relatedDraftId?: string;
};

export type PlannerTaskSummary = {
  id: string;
  title: string;
  description: string;
  status: PlannerTaskStatus;
  priority: PlannerTaskPriority;
  scheduledFor?: string;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  relatedNoteSlug?: string;
  relatedNoteTitle?: string;
  relatedDraftId?: string;
  relatedDraftTitle?: string;
};

export type PlannerOverview = {
  totalCount: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  archivedCount: number;
};

export type PlannerTaskLinkOption = {
  value: string;
  title: string;
  meta: string;
};

export type PlannerTaskLinkOptions = {
  notes: PlannerTaskLinkOption[];
  drafts: PlannerTaskLinkOption[];
};

export type CheckInHabitSummary = {
  id: string;
  title: string;
  description: string;
  scheduleType: CheckInScheduleType;
  scheduleDays: number[];
  isArchived: boolean;
  monthlyDoneCount: number;
  yearlyDoneCount: number;
  totalDoneCount: number;
  currentStreak: number;
  longestStreak: number;
  todayStatus?: CheckInEntryStatus;
  updatedAt: string;
};

export type CheckInHistoryItem = {
  id: string;
  date: string;
  habitId: string;
  habitTitle: string;
  status: CheckInEntryStatus;
  reasonTag?: CheckInSkipReasonTag;
  note?: string;
};

export type CheckInOverview = {
  habitCount: number;
  todayDoneCount: number;
  todayPendingCount: number;
  totalDoneCount: number;
  currentStreak: number;
  longestStreak: number;
  monthlyCompletionRate: number;
};

export type CheckInTodayStatus = {
  date: string;
  timeZone: string;
  summary: string;
  habits: CheckInHabitSummary[];
  scheduled: CheckInHabitSummary[];
  done: CheckInHabitSummary[];
  pending: CheckInHabitSummary[];
  skipped: CheckInHabitSummary[];
  unfinished: CheckInHabitSummary[];
  counts: {
    scheduledCount: number;
    doneCount: number;
    pendingCount: number;
    skippedCount: number;
    unfinishedCount: number;
  };
};

export type CheckInTodayUpdateItemStatus = "DONE" | "SKIPPED";

export type CheckInTodayUpdateItem = {
  habitId: string;
  status: CheckInTodayUpdateItemStatus;
  reasonTag?: CheckInSkipReasonTag;
  note?: string;
};

export type CheckInTodayUpdateResultItem = {
  index: number;
  habitId: string;
  status: CheckInTodayUpdateItemStatus;
  applied: boolean;
  reasonTag?: CheckInSkipReasonTag;
  note?: string;
  error?: string;
};

export type CheckInTodayUpdateResult = {
  updatedCount: number;
  failedCount: number;
  ok: boolean;
  results: CheckInTodayUpdateResultItem[];
  today: CheckInTodayStatus;
};

export type KnowledgeNoteInput = {
  title: string;
  summary?: string;
  domainName?: string;
  tags?: string[];
  content: RichTextNode[];
};

export type KnowledgeNoteSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  domainName?: string;
  domainSlug?: string;
  tags: string[];
  tagLinks: Array<{
    label: string;
    slug: string;
  }>;
  createdAt: string;
  updatedAt: string;
  contentBlockCount: number;
  isArchived?: boolean;
};

export type KnowledgeNoteDetail = KnowledgeNoteSummary & {
  content: RichTextNode[];
  relatedWriting: RelatedWritingLink[];
};

export type KnowledgeOverview = {
  noteCount: number;
  domainCount: number;
  tagCount: number;
  archivedCount: number;
};

export type KnowledgeFilterOption = {
  label: string;
  slug: string;
  count: number;
};

export type KnowledgeLibrarySummary = {
  overview: KnowledgeOverview;
  domains: KnowledgeFilterOption[];
  tags: KnowledgeFilterOption[];
};

export type ArchiveFilterKey = "all" | "favorites" | "resources";

export type ArchiveCollectionSummary = {
  key: ArchiveFilterKey;
  title: string;
  description: string;
  count: number;
  href: string;
  eyebrow: string;
};

export type ArchiveItemSummary = {
  id: string;
  title: string;
  summary: string;
  sourceType: "NOTE" | "POST" | "MEDIA" | "RESOURCE";
  createdAt: string;
  updatedAt: string;
  href?: string;
  badge: string;
  isFavorite: boolean;
};

export type ArchiveTimelineGroup = {
  key: string;
  label: string;
  itemCount: number;
  items: ArchiveItemSummary[];
};

export type MediaAssetSummary = {
  id: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "EMBED";
  status: "PENDING" | "READY" | "FAILED" | "ARCHIVED";
  mimeType: string;
  originalFileName: string;
  size: number;
  altText?: string;
  embedUrl?: string;
  url?: string;
  createdAt: string;
};

export type SearchModuleKey = "command" | "planner" | "knowledge" | "writing" | "archive";

export type SearchResultItem = {
  id: string;
  module: SearchModuleKey;
  title: string;
  summary: string;
  href: string;
  meta: string;
};

export type SearchResultGroup = {
  module: SearchModuleKey;
  title: string;
  count: number;
  items: SearchResultItem[];
};

export type SearchResults = {
  query: string;
  totalCount: number;
  groups: SearchResultGroup[];
};

export type UserPreferenceSummary = {
  displayName: string;
  workspaceMotto: string;
  avatarMediaId?: string;
  avatarUrl?: string;
  theme: string;
  accentColor: string;
  typographyMode: string;
  locale: string;
  timezone: string;
  defaultActivityFocus: "all" | "planner" | "knowledge" | "writing" | "archive";
};

export type UserModuleSummary = {
  key: ModuleKey;
  name: string;
  description: string;
  href: string;
  icon: string;
  status: "ACTIVE" | "DISABLED" | "HIDDEN";
  enabledByDefault: boolean;
  enabled: boolean;
  pinned: boolean;
  locked: boolean;
  visibleInNavigation: boolean;
  replayAligned: boolean;
};

export type SettingsSnapshot = {
  preferences: UserPreferenceSummary;
  modules: UserModuleSummary[];
};
export type SystemPostureSnapshot = {
  currentLens: "all" | "planner" | "knowledge" | "writing" | "archive";
  currentLensLabel: string;
  defaultLens: "all" | "planner" | "knowledge" | "writing" | "archive";
  defaultLensLabel: string;
  alignedModuleKey: ModuleKey;
  alignedModuleName: string;
  alignedModuleHref: string;
  visibleModuleCount: number;
  hiddenModuleCount: number;
  lockedModuleCount: number;
};

