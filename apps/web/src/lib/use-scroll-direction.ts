import { useEffect, useState } from 'react';

/**
 * `true` while the reader scrolls down past the threshold, `false` again as soon
 * as they scroll up, reach the top, or hit the end of the page.
 */
export function useScrollHidden(threshold = 12) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    function update() {
      frame = 0;
      const current = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const delta = current - last;
      if (current <= 8 || current >= max - 8) {
        setHidden(false);
      } else if (delta > threshold) {
        setHidden(true);
      } else if (delta < -threshold) {
        setHidden(false);
      } else {
        return;
      }
      last = current;
    }

    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return hidden;
}
