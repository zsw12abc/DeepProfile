export interface InjectionSchedulerOptions {
  injectButtons: (root?: ParentNode) => void;
  shouldProcess: () => boolean;
  debounceMs?: number;
}

export interface InjectionScheduler {
  start: (root: ParentNode) => void;
  stop: () => void;
  schedule: (roots?: ParentNode[]) => void;
}

export const createInjectionScheduler = (
  options: InjectionSchedulerOptions,
): InjectionScheduler => {
  const debounceMs = options.debounceMs ?? 200;
  let observer: MutationObserver | null = null;
  let injectionTimer: number | null = null;
  const pendingRoots = new Set<ParentNode>();
  let observedRoot: ParentNode | null = null;
  let visibilityHandler: (() => void) | null = null;

  const flush = () => {
    if (!options.shouldProcess()) {
      pendingRoots.clear();
      return;
    }

    const rootsToProcess = Array.from(pendingRoots);
    pendingRoots.clear();

    if (rootsToProcess.length === 0) {
      options.injectButtons();
      return;
    }

    rootsToProcess.forEach((root) => options.injectButtons(root));
  };

  const schedule = (roots?: ParentNode[]) => {
    if (!options.shouldProcess()) {
      return;
    }

    if (document.hidden) {
      return;
    }

    if (roots && roots.length > 0) {
      roots.forEach((root) => pendingRoots.add(root));
    }

    if (injectionTimer !== null) return;
    injectionTimer = window.setTimeout(() => {
      injectionTimer = null;
      flush();
    }, debounceMs);
  };

  const attachObserver = (root: ParentNode) => {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!options.shouldProcess()) return;
      if (document.hidden) return;
      const roots: ParentNode[] = [];
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            roots.push(node as ParentNode);
          }
        });
      });
      schedule(roots);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });
  };

  const start = (root: ParentNode) => {
    observedRoot = root;
    if (!visibilityHandler) {
      visibilityHandler = () => {
        if (document.hidden) {
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          if (injectionTimer !== null) {
            window.clearTimeout(injectionTimer);
            injectionTimer = null;
          }
          pendingRoots.clear();
          return;
        }

        if (observedRoot) {
          attachObserver(observedRoot);
          schedule();
        }
      };
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    if (document.hidden) {
      return;
    }

    schedule();
    attachObserver(root);
  };

  const stop = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (injectionTimer !== null) {
      window.clearTimeout(injectionTimer);
      injectionTimer = null;
    }
    pendingRoots.clear();
    observedRoot = null;
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  };

  return { start, stop, schedule };
};
