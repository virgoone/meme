import { Loader2, UploadCloud, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@bunship-ai/ui/components/button';
import { Input } from '@bunship-ai/ui/components/input';
import { Label } from '@bunship-ai/ui/components/label';

import { resolveUploadedFileUrl } from './upload/commons-upload';
import { PasteUploadArea, UploadButton, UploadDropzone, UploadProgress } from './upload/upload-components';
import { useUpload } from './upload/use-upload';

export function MainImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const { control: uploadControl } = useUpload({ scope: 'admin' });
  const uploading = uploadControl.isPending;

  const upload = useCallback(
    async (files: File[] | FileList) => {
      const file = Array.from(files)[0];
      if (!file) return;
      setError(null);
      try {
        const result = await uploadControl.uploadAsync([file]);
        const uploaded = result.files[0];
        const url = uploaded ? resolveUploadedFileUrl(uploaded) : null;
        if (!url) throw new Error('上传结果缺少文件 URL');
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [onChange, uploadControl],
  );

  return (
    <div className='grid gap-3'>
      <PasteUploadArea disabled={uploading} onSelectFiles={upload}>
        <UploadDropzone disabled={uploading} onSelectFiles={upload}>
          {value ? (
            <div className='relative w-full overflow-hidden rounded-md'>
              <img src={value} alt='' className='block aspect-video w-full object-cover' />
              <span className='absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-background/85 py-1.5 text-xs backdrop-blur'>
                <UploadCloud aria-hidden='true' className='size-3.5' />
                拖拽、点击或粘贴图片替换
              </span>
            </div>
          ) : (
            <div className='grid justify-items-center gap-1.5 px-4 py-6 text-center'>
              {uploading ? <Loader2 aria-hidden='true' className='size-5 animate-spin' /> : <UploadCloud aria-hidden='true' className='size-5' />}
              <span className='text-sm'>拖拽图片到这里</span>
              <small className='text-muted-foreground text-xs'>支持 JPEG、PNG、GIF，也可以直接粘贴截图</small>
            </div>
          )}
        </UploadDropzone>
        <UploadProgress files={uploadControl.progresses} />
      </PasteUploadArea>
      <div className='grid gap-1.5'>
        <Label htmlFor='main-image-url' className='text-muted-foreground text-xs'>图片地址</Label>
        <div className='flex gap-2'>
          <Input id='main-image-url' value={value} onChange={(event) => onChange(event.target.value)} placeholder='https://…' className='min-w-0 font-mono text-[12px]' />
          {value ? (
            <Button type='button' variant='outline' size='icon' className='size-[38px] shrink-0' aria-label='清除主图' onClick={() => onChange('')}>
              <X aria-hidden='true' />
            </Button>
          ) : null}
        </div>
      </div>
      <UploadButton disabled={uploading} label='选择图片' onSelectFiles={upload} />
      {error ? <p className='text-destructive text-xs'>{error}</p> : null}
    </div>
  );
}
