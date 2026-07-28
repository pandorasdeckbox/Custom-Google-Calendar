"use client";

import { useEffect } from "react";

const EMBED_HEIGHT_MESSAGE_TYPE = "custom-google-calendar:height";

function getDocumentHeight() {
  const { body, documentElement } = document;

  return Math.max(
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    documentElement.scrollHeight,
    documentElement.offsetHeight,
    documentElement.clientHeight,
  );
}

export function EmbedHeightReporter() {
  useEffect(() => {
    let animationFrameId = 0;
    let lastReportedHeight = -1;

    const postHeight = () => {
      animationFrameId = 0;

      const nextHeight = getDocumentHeight();

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

    resizeObserver.observe(document.documentElement);

    if (document.body) {
      resizeObserver.observe(document.body);
    }

    const mutationObserver = new MutationObserver(() => {
      schedulePostHeight();
    });

    mutationObserver.observe(document.documentElement, {
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