import type { ModuleManifest } from "@workspace/types/index";

export const moduleRegistry: ModuleManifest[] = [
  {
    key: "dashboard",
    name: "总览",
    description: "查看当前节奏、关键状态与最近活动的共享入口。",
    href: "/",
    icon: "dashboard",
    enabledByDefault: true
  },
  {
    key: "activity",
    name: "活动中心",
    description: "从近期动态、工作线程和归档时间线回放整个工作站。",
    href: "/activity",
    icon: "timeline",
    enabledByDefault: true
  },
  {
    key: "planner",
    name: "日程规划",
    description: "任务、计划视图、提醒位与日常推进流程。",
    href: "/planner",
    icon: "calendar_today",
    enabledByDefault: true
  },
  {
    key: "knowledge",
    name: "知识库",
    description: "笔记、领域、标签与可连接的知识结构。",
    href: "/knowledge",
    icon: "auto_stories",
    enabledByDefault: true
  },
  {
    key: "writing",
    name: "写作",
    description: "支持图片与视频的富媒体草稿和已发布文章。",
    href: "/writing",
    icon: "edit_note",
    enabledByDefault: true
  },
  {
    key: "archive",
    name: "归档",
    description: "收藏、历史记录与跨模块沉淀内容。",
    href: "/archive",
    icon: "inventory_2",
    enabledByDefault: true
  },
  {
    key: "modules",
    name: "模块中心",
    description: "管理工作站能力、模块状态与系统入口。",
    href: "/modules",
    icon: "widgets",
    enabledByDefault: true
  },
  {
    key: "settings",
    name: "设置",
    description: "管理个人资料、界面风格、隐私与模块偏好。",
    href: "/settings",
    icon: "settings",
    enabledByDefault: true
  }
];
