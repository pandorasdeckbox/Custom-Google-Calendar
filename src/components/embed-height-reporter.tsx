"use client";

import { useEffect } from "react";

const EMBED_HEIGHT_MESSAGE_TYPE = "custom-google-calendar:height";

function getContentHeight() {
  const contentRoot = document.querySelector<HTMLElement>("[data-embed-height-root]");

  if (!contentRoot) {
    return 0;
  }

  return Math.ceil(
    Math.max(
      contentRoot.scrollHeight,
      contentRoot.offsetHeight,
      contentRoot.getBoundingClientRect().height,
    ),
  );
}

export function EmbedHeightReporter() {
  useEffect(() => {
    if (window.parent === window) {
      return;
    }

    document.documentElement.dataset.embeddedIframe = "true";

    let animationFrameId = 0;
    let lastReportedHeight = -1;
    const contentRoot = document.querySelector<HTMLElement>("[data-embed-height-root]");

    if (!contentRoot) {
      return;
    }

    const postHeight = () => {
      animationFrameId = 0;

      const nextHeight = getContentHeight();

      if (nextHeight === lastReportedHeight) {
        return;
      }

      lastReportedHeight = nextHeight;

      window.parent.postMessage(
        {
          type: EMBED_HEIGHT_MESSAGE_TYPE,
          height: nextHeight,
        },
        "*",
      );
    };

    const schedulePostHeight = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(postHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      schedulePostHeight();
    });

    resizeObserver.observe(contentRoot);

    const mutationObserver = new MutationObserver(() => {
      schedulePostHeight();
    });

    mutationObserver.observe(contentRoot, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("load", schedulePostHeight);
    window.addEventListener("resize", schedulePostHeight);
    window.addEventListener("orientationchange", schedulePostHeight);

    schedulePostHeight();

    void document.fonts?.ready.then(() => {
      schedulePostHeight();
    });

    return () => {
      delete document.documentElement.dataset.embeddedIframe;

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("load", schedulePostHeight);
      window.removeEventListener("resize", schedulePostHeight);
      window.removeEventListener("orientationchange", schedulePostHeight);
    };
  }, []);

  return null;
}

export { EMBED_HEIGHT_MESSAGE_TYPE };