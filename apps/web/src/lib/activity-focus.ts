export type ActivityFocusKey = "all" | "planner" | "knowledge" | "writing" | "archive";

export const ACTIVITY_FOCUS_COOKIE = "activity-focus";
export const ACTIVITY_FOCUS_DEFAULT_COOKIE = "activity-focus-default";
export const ACTIVITY_FOCUS_MAX_AGE = 60 * 60 * 24 * 180;

const activityFocusLabels: Record<ActivityFocusKey, string> = {
  all: "All Motion",
  planner: "Execution",
  knowledge: "Thinking",
  writing: "Publishing",
  archive: "History"
};

export function parseActivityFocus(value?: string | null): ActivityFocusKey | null {
  if (value === "all" || value === "planner" || value === "knowledge" || value === "writing" || value === "archive") {
    return value;
  }

  return null;
}

export function resolveActivityFocus(value?: string | null): ActivityFocusKey {
  return parseActivityFocus(value) ?? "all";
}

export function getActivityFocusLabel(focus: ActivityFocusKey) {
  return activityFocusLabels[focus];
}

export function buildActivityHref(focus: ActivityFocusKey, hash?: string) {
  const base = focus === "all" ? "/activity" : "/activity?focus=" + focus;
  return hash ? base + hash : base;
}

export function getActivityFocusCookieConfig(focus: ActivityFocusKey) {
  return {
    name: ACTIVITY_FOCUS_COOKIE,
    value: focus,
    options: {
      path: "/",
      sameSite: "lax" as const,
      maxAge: ACTIVITY_FOCUS_MAX_AGE
    }
  };
}

export function getActivityFocusDefaultCookieConfig(focus: ActivityFocusKey) {
  return {
    name: ACTIVITY_FOCUS_DEFAULT_COOKIE,
    value: focus,
    options: {
      path: "/",
      sameSite: "lax" as const,
      maxAge: ACTIVITY_FOCUS_MAX_AGE
    }
  };
}

export type ActivityFocusNextStep = {
  label: string;
  href: string;
  description: string;
};

export function getActivityFocusNextStep(focus: ActivityFocusKey): ActivityFocusNextStep {
  if (focus === "planner") {
    return {
      label: "Review execution flow",
      href: buildActivityHref(focus, "#recent-activity"),
      description: "Return to the execution-heavy replay stream and decide which task should move next."
    };
  }

  if (focus === "knowledge") {
    return {
      label: "Re-open thinking stream",
      href: buildActivityHref(focus, "#recent-activity"),
      description: "Step back into the note-driven activity lane and keep the latest thinking thread warm."
    };
  }

  if (focus === "writing") {
    return {
      label: "Resume publishing lane",
      href: buildActivityHref(focus, "#recent-activity"),
      description: "Jump back into drafts and published movement without manually re-finding the writing lens."
    };
  }

  if (focus === "archive") {
    return {
      label: "Open history timeline",
      href: buildActivityHref(focus, "#history-timeline"),
      description: "Land directly in the slower replay lane that matches your current history-oriented lens."
    };
  }

  return {
    label: "Open mixed replay",
    href: buildActivityHref(focus, "#recent-activity"),
    description: "Return to the full workstation replay and pick up whatever moved most recently."
  };
}

export type ActivityFocusSurface = "dashboard" | "settings" | "modules";

export type ActivityFocusPostureHint = {
  eyebrow: string;
  title: string;
  description: string;
};

export function getActivityFocusPostureHint(focus: ActivityFocusKey, surface: ActivityFocusSurface): ActivityFocusPostureHint {
  if (surface === "dashboard") {
    if (focus === "planner") {
      return {
        eyebrow: "Execution Bias",
        title: "Use the dashboard to narrow before you dive back into Planner.",
        description: "Your current posture favors execution, so the homepage should help you choose which live thread deserves attention before the task list fragments again."
      };
    }

    if (focus === "knowledge") {
      return {
        eyebrow: "Thinking Bias",
        title: "Use the dashboard to choose which fresh note should become action or writing.",
        description: "This posture favors reflection and synthesis, so the homepage works best as a bridge from note movement into the next concrete follow-through."
      };
    }

    if (focus === "writing") {
      return {
        eyebrow: "Publishing Bias",
        title: "Use the dashboard to protect writing momentum before it cools off.",
        description: "Your current posture leans toward drafts and published motion, so the dashboard should behave like a launch pad back into pieces that are still warm."
      };
    }

    if (focus === "archive") {
      return {
        eyebrow: "History Bias",
        title: "Use the dashboard to decide whether to replay or re-open.",
        description: "A history-oriented posture makes the homepage a checkpoint between durable records and the next active lane you want to bring back to life."
      };
    }

    return {
      eyebrow: "Mixed Bias",
      title: "Use the dashboard to decide which lane deserves the next unit of attention.",
      description: "When the workstation is in mixed replay mode, the homepage should stay broad enough to compare planning, thinking, publishing, and history without collapsing too early."
    };
  }

  if (surface === "settings") {
    if (focus === "planner") {
      return {
        eyebrow: "Execution Habit",
        title: "Your settings are currently tuning the shell around decisive task movement.",
        description: "Changes here will mostly influence how quickly the workstation returns you to active execution threads and task-shaped entry points."
      };
    }

    if (focus === "knowledge") {
      return {
        eyebrow: "Thinking Habit",
        title: "Your settings are shaping the shell around note-first re-entry.",
        description: "This posture makes the workstation more likely to bias discovery, note review, and idea-carrying transitions before pushing you into execution."
      };
    }

    if (focus === "writing") {
      return {
        eyebrow: "Publishing Habit",
        title: "Your settings are steering the shell toward draft and publication flow.",
        description: "This posture is best when you want commands, module emphasis, and replay entry to keep bringing you back to pieces that want to ship."
      };
    }

    if (focus === "archive") {
      return {
        eyebrow: "History Habit",
        title: "Your settings are steering the shell toward slower replay and durable context.",
        description: "This posture is useful when you want the workstation to help you revisit what already landed before choosing what to reopen."
      };
    }

    return {
      eyebrow: "Mixed Habit",
      title: "Your settings are keeping the workstation broad and flexible.",
      description: "This is the least opinionated posture, useful when you want system controls to keep every lane equally close at hand."
    };
  }

  if (focus === "planner") {
    return {
      eyebrow: "Execution Registry",
      title: "The registry should make Planner feel like the natural first stop.",
      description: "With an execution habit, module posture matters most when it shortens the path back to active tasks, linked work threads, and planner-driven commands."
    };
  }

  if (focus === "knowledge") {
    return {
      eyebrow: "Thinking Registry",
      title: "The registry should make Knowledge feel like the most natural re-entry point.",
      description: "A thinking habit means the module layer should keep notes, synthesis, and note-derived bridges especially easy to reopen."
    };
  }

  if (focus === "writing") {
    return {
      eyebrow: "Publishing Registry",
      title: "The registry should make Writing feel like the strongest launch surface.",
      description: "A publishing habit works best when module posture keeps drafts, published work, and writing replay one step closer than everything else."
    };
  }

  if (focus === "archive") {
    return {
      eyebrow: "History Registry",
      title: "The registry should keep Archive and replay surfaces especially easy to reach.",
      description: "A history habit means module posture should help you move from durable records back into the exact lane worth reopening."
    };
  }

  return {
    eyebrow: "Mixed Registry",
    title: "The registry should stay balanced because no single lane dominates the shell.",
    description: "With an all-motion habit, module posture is about preserving broad visibility rather than strongly preferring one launch path."
  };
}
