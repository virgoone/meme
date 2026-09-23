import { ImageOff, RotateCcw } from 'lucide-react';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

type LoadingImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  loading?: 'lazy' | 'eager';
};

export function imageDimensions(src: string) {
  const match = /-(\d+)x(\d+)\.[a-z0-9]+(?:[?#]|$)/i.exec(src);
  if (!match) return undefined;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? { width, height } : undefined;
}

export function LoadingImage(props: LoadingImageProps) {
  // Remount on source changes so the previous image's loaded state cannot leak.
  return <ImageState key={props.src} {...props} />;
}

function ImageState({ src, alt, width, height, className = '', fill, loading = 'lazy' }: LoadingImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const dimensions = width && height ? { width, height } : imageDimensions(src);
  const style: CSSProperties = fill ? {} : {
    aspectRatio: dimensions ? `${dimensions.width} / ${dimensions.height}` : '16 / 9',
  };

  const finishLoading = useCallback(async (image: HTMLImageElement) => {
    if (imageRef.current !== image) return;
    if (!image.naturalWidth) {
      setState('error');
      return;
    }
    try { await image.decode(); } catch { /* onLoad still proves the image is available. */ }
    if (imageRef.current === image) setState('loaded');
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) void finishLoading(image);
  }, [attempt, finishLoading]);

  return (
    <span
      className={`loading-image${fill ? ' loading-image--fill' : ''} ${className}`}
      data-state={state}
      aria-busy={state === 'loading'}
      style={style}
    >
      <img
        key={attempt}
        ref={imageRef}
        src={src}
        alt={alt}
        width={dimensions?.width}
        height={dimensions?.height}
        loading={loading}
        decoding='async'
        onLoad={(event) => { void finishLoading(event.currentTarget); }}
        onError={() => setState('error')}
      />
      {state === 'loading' && <span className='image-skeleton' aria-hidden='true' />}
      {state === 'error' && (
        <span className='loading-image__error' role='status'>
          <ImageOff aria-hidden='true' />
          <span>图片加载失败</span>
          <button type='button' aria-label='重新加载图片' title='重新加载图片' onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setState('loading');
            setAttempt((value) => value + 1);
          }}><RotateCcw aria-hidden='true' /></button>
        </span>
      )}
    </span>
  );
}
