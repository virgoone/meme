import { Check, ImagePlus, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@bunship-ai/ui/components/button';
import { Label } from '@bunship-ai/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@bunship-ai/ui/components/select';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';
import { Textarea } from '@bunship-ai/ui/components/textarea';

import { type GeneratedCover, useCoverConfig, useGenerateCover } from './admin-queries';
import { ErrorText } from './admin-ui';

const ratioLabels: Record<string, string> = { '16:9': '16:9 横幅', '3:2': '3:2 照片', '4:3': '4:3 标准', '1:1': '1:1 方形', '21:9': '21:9 宽幅' };

function newRequestId() {
  return `c${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

/**
 * Generates a cover through Sluice (the Worker holds the key). The result is a
 * candidate: the article's cover changes only when it is adopted and the
 * article is saved, so a failed or discarded generation leaves it as it was.
 */
export function CoverGenerator({ title, description, currentCover, onAdopt }: {
  title: string;
  description: string;
  currentCover: string;
  onAdopt: (url: string) => void;
}) {
  const config = useCoverConfig();
  const generate = useGenerateCover();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<GeneratedCover | null>(null);
  const [adoptedUrl, setAdoptedUrl] = useState<string | null>(null);

  if (config.isPending) {
    return <div className='grid gap-2' role='status' aria-label='加载封面生成设置'><Skeleton className='h-20 w-full' /><Skeleton className='h-8 w-1/2' /></div>;
  }
  if (config.isError) return <ErrorText error={config.error} className='text-xs' />;
  if (!config.data.configured) {
    return (
      <div className='admin-note grid gap-1.5 text-xs'>
        <strong className='font-medium text-foreground text-sm'>Sluice 未配置</strong>
        <span>在 Worker 配置 <code>SLUICE_API_BASE_URL</code>、<code>SLUICE_IMAGE_MODEL</code> 与密钥 <code>SLUICE_API_KEY</code> 后即可在这里生成封面。</span>
      </div>
    );
  }

  const ratio = aspectRatio ?? config.data.defaultAspectRatio;
  const suggestion = [title.trim(), description.trim()].filter(Boolean).join('。');
  const run = () => {
    const text = prompt.trim();
    if (!text) return;
    generate.mutate({ prompt: text, aspectRatio: ratio, requestId: newRequestId() }, {
      onSuccess: (cover) => { setCandidate(cover); setAdoptedUrl(null); },
    });
  };
  const pending = generate.isPending;

  return (
    <div className='grid gap-3'>
      <div className='grid gap-1.5'>
        <div className='flex items-center justify-between gap-2'>
          <Label htmlFor='cover-prompt' className='text-muted-foreground text-xs'>画面描述</Label>
          {suggestion && !prompt ? (
            <button type='button' className='text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline' onClick={() => setPrompt(`为文章《${title.trim() || '未命名'}》绘制封面：${description.trim() || title.trim()}`)}>
              用标题和摘要填入
            </button>
          ) : null}
        </div>
        <Textarea
          id='cover-prompt'
          value={prompt}
          rows={3}
          maxLength={4000}
          placeholder='例如：清晨的海边小屋，薄雾，极简扁平插画，留白充足'
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') run(); }}
        />
      </div>
      <div className='flex flex-wrap items-end gap-2'>
        <div className='grid min-w-[8.5rem] flex-1 gap-1.5'>
          <Label htmlFor='cover-ratio' className='text-muted-foreground text-xs'>画幅</Label>
          <Select value={ratio} onValueChange={setAspectRatio}>
            <SelectTrigger id='cover-ratio'><SelectValue /></SelectTrigger>
            <SelectContent>
              {config.data.aspectRatios.map((value) => <SelectItem key={value} value={value}>{ratioLabels[value] ?? value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type='button' className='shrink-0' disabled={pending || !prompt.trim()} onClick={run}>
          {pending ? <Loader2 aria-hidden='true' className='animate-spin' /> : <Sparkles aria-hidden='true' />}
          {pending ? '生成中…' : candidate ? '重新生成' : '生成'}
        </Button>
      </div>

      {pending ? (
        <div className='admin-cover-frame grid place-items-center text-muted-foreground text-xs' style={{ aspectRatio: ratio.replace(':', ' / ') }} role='status'>
          <span className='flex items-center gap-1.5'><Loader2 aria-hidden='true' className='size-3.5 animate-spin' />Sluice 正在生成，通常需要几十秒</span>
        </div>
      ) : null}

      {generate.isError && !pending ? (
        <div className='admin-note admin-note--danger grid gap-1 text-xs' role='alert'>
          <span className='font-medium'>{generate.error instanceof Error ? generate.error.message : String(generate.error)}</span>
          <span>原封面未改变。</span>
        </div>
      ) : null}

      {candidate && !pending ? (
        <figure className='grid gap-2'>
          <div className='admin-cover-frame'>
            <img src={candidate.url} alt='生成的封面预览' className='block w-full' style={{ aspectRatio: candidate.aspectRatio.replace(':', ' / '), objectFit: 'cover' }} />
          </div>
          <figcaption className='flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs'>
            <span className='min-w-0 truncate'>{candidate.model} · {candidate.size ?? candidate.aspectRatio} · {Math.round(candidate.bytes / 1024)} KB</span>
            {adoptedUrl === candidate.url ? (
              <span className='status-dot' data-tone='success'>已采用</span>
            ) : (
              <span className='flex gap-1.5'>
                <Button type='button' variant='ghost' size='sm' onClick={() => setCandidate(null)}><X aria-hidden='true' />放弃</Button>
                <Button type='button' size='sm' onClick={() => { onAdopt(candidate.url); setAdoptedUrl(candidate.url); }}><Check aria-hidden='true' />采用</Button>
              </span>
            )}
          </figcaption>
        </figure>
      ) : null}

      {!candidate && !pending && !generate.isError ? (
        <p className='flex items-center gap-1.5 text-muted-foreground text-xs'>
          <ImagePlus aria-hidden='true' className='size-3.5' />
          通过 Sluice 生成（{config.data.model}），采用后保存文章才会替换封面。
        </p>
      ) : null}
      {adoptedUrl && currentCover !== adoptedUrl ? (
        <button type='button' className='flex items-center gap-1 justify-self-start text-muted-foreground text-xs hover:text-foreground' onClick={() => onAdopt(adoptedUrl)}>
          <RotateCcw aria-hidden='true' className='size-3' />重新使用刚才采用的封面
        </button>
      ) : null}
    </div>
  );
}
