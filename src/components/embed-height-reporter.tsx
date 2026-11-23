"use client";

import { useEffect } from "react";

const EMBED_HEIGHT_MESSAGE_TYPE = "custom-google-calendar:height";
const EMBEDDED_MODAL_SELECTOR = '.day-modal-backdrop[data-embedded-modal="true"] .day-modal';
const EMBEDDED_MODAL_BOTTOM_PADDING = 16;

function getContentHeight() {
  const contentRoot = document.querySelector<HTMLElement>("[data-embed-height-root]");

  if (!contentRoot) {
    return 0;
  }

  const contentRootHeight = Math.max(
    contentRoot.scrollHeight,
    contentRoot.offsetHeight,
    contentRoot.getBoundingClientRect().height,
  );
  const modal = contentRoot.querySelector<HTMLElement>(EMBEDDED_MODAL_SELECTOR);

  if (!modal) {
    return Math.ceil(contentRootHeight);
  }

  const modalBottom =
    modal.getBoundingClientRect().bottom + window.scrollY + EMBEDDED_MODAL_BOTTOM_PADDING;

  return Math.ceil(Math.max(contentRootHeight, modalBottom));
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

    let observedModal: HTMLElement | null = null;
    const updateObservedModal = () => {
      const modal = contentRoot.querySelector<HTMLElement>(EMBEDDED_MODAL_SELECTOR);

      if (modal === observedModal) {
        return;
      }

      if (observedModal) {
        resizeObserver.unobserve(observedModal);
      }

      observedModal = modal;

      if (observedModal) {
        resizeObserver.observe(observedModal);
      }
    };

    updateObservedModal();

    const mutationObserver = new MutationObserver(() => {
      updateObservedModal();
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