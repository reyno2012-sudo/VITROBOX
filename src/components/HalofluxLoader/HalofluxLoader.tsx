import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createHalofluxArtwork } from './halofluxArtwork';
import loaderHtml from './HalofluxLoader.html?raw';
import './HalofluxLoader.css';

export interface HalofluxLoaderController {
  onEnterCallback: (() => void) | null;
  enterExperience: () => void;
  resetLoader: () => void;
}

declare global {
  interface Window { VitroboxHaloLoader?: HalofluxLoaderController; }
}

const markup = { __html: loaderHtml };

export function HalofluxLoader({ onEnter, onVisibilityChange }: {
  onEnter: () => void;
  onVisibilityChange: (visible: boolean) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onEnter, onVisibilityChange });
  useLayoutEffect(() => { callbacks.current = { onEnter, onVisibilityChange }; });

  useLayoutEffect(() => {
    const root = mount.current!.querySelector<HTMLElement>('#halofluxLoader')!;
    const artwork = createHalofluxArtwork(root);
    const button = root.querySelector<HTMLButtonElement>('.ignite-cta-pill');
    const previousBodyOverflow = document.body.style.overflow;
    const previousPageOverflow = document.documentElement.style.overflow;
    let visible = true;
    let collapsing = false;
    let exitTimer = 0;
    let pointer: { id: number; startX: number; startY: number; lastX: number } | null = null;
    let dragged = false;

    function lockPage() {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    function unlockPage() {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousPageOverflow;
    }
    function finish() {
      if (!visible || !collapsing) return;
      visible = false;
      window.clearTimeout(exitTimer);
      artwork.stop();
      root.style.display = 'none';
      root.setAttribute('aria-hidden', 'true');
      unlockPage();
      callbacks.current.onVisibilityChange(false);
    }

    const controller: HalofluxLoaderController = {
      // Invoke synchronously from the click: awaiting the animation loses audio permission.
      onEnterCallback: () => callbacks.current.onEnter(),
      enterExperience() {
        if (!visible || collapsing) return;
        collapsing = true;
        artwork.collapse();
        try {
          controller.onEnterCallback?.();
        } finally {
          root.classList.add('loader-collapsing');
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          exitTimer = window.setTimeout(finish, reducedMotion ? 180 : 940);
        }
      },
      resetLoader() {
        window.clearTimeout(exitTimer);
        visible = true;
        collapsing = false;
        dragged = false;
        root.style.removeProperty('display');
        root.removeAttribute('aria-hidden');
        root.classList.remove('loader-collapsing');
        lockPage();
        callbacks.current.onVisibilityChange(true);
        artwork.reset();
        button?.focus({ preventScroll: true });
      },
    };

    function handleClick() {
      if (!dragged) controller.enterExperience();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        controller.enterExperience();
      }
    }
    function handlePointerDown(event: PointerEvent) {
      if (collapsing || event.button !== 0) return;
      dragged = false;
      pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX };
      root.setPointerCapture(event.pointerId);
    }
    function handlePointerMove(event: PointerEvent) {
      if (collapsing) return;
      artwork.move(event.clientX, event.clientY);
      if (!pointer || pointer.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 6) dragged = true;
      if (dragged) artwork.drag(event.clientX - pointer.lastX);
      pointer.lastX = event.clientX;
    }
    function handlePointerUp(event: PointerEvent) {
      if (pointer?.id === event.pointerId) pointer = null;
    }
    function handlePointerCancel() { pointer = null; dragged = true; }
    function handleTransitionEnd(event: TransitionEvent) {
      if (event.target === root && event.propertyName === 'transform') finish();
    }

    window.VitroboxHaloLoader = controller;
    root.addEventListener('click', handleClick);
    root.addEventListener('keydown', handleKey);
    root.addEventListener('pointerdown', handlePointerDown);
    root.addEventListener('pointermove', handlePointerMove);
    root.addEventListener('pointerup', handlePointerUp);
    root.addEventListener('pointercancel', handlePointerCancel);
    root.addEventListener('transitionend', handleTransitionEnd);
    lockPage();
    button?.focus({ preventScroll: true });
    return () => {
      window.clearTimeout(exitTimer);
      artwork.dispose();
      unlockPage();
      root.removeEventListener('click', handleClick);
      root.removeEventListener('keydown', handleKey);
      root.removeEventListener('pointerdown', handlePointerDown);
      root.removeEventListener('pointermove', handlePointerMove);
      root.removeEventListener('pointerup', handlePointerUp);
      root.removeEventListener('pointercancel', handlePointerCancel);
      root.removeEventListener('transitionend', handleTransitionEnd);
      if (window.VitroboxHaloLoader === controller) delete window.VitroboxHaloLoader;
    };
  }, []);

  return createPortal(<div ref={mount} style={{ display: 'contents' }} dangerouslySetInnerHTML={markup} />, document.body);
}
