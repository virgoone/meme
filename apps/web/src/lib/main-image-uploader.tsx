import { Loader2, UploadCloud, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { resolveUploadedFileUrl } from './upload/commons-upload';
import {
  PasteUploadArea,
  UploadButton,
  UploadDropzone,
  UploadProgress,
} from './upload/upload-components';
import { useUpload } from './upload/use-upload';

export function MainImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
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
    <div className='main-image-uploader'>
      <PasteUploadArea disabled={uploading} onSelectFiles={upload}>
        <UploadDropzone disabled={uploading} onSelectFiles={upload}>
          {value ? (
            <div className='main-image-uploader__preview-shell'>
              <div className='admin-editor-cover-preview'>
                <img src={value} alt='' />
              </div>
              <div className='main-image-uploader__preview-meta'>
                <UploadCloud aria-hidden='true' />
                <span>拖拽、点击或粘贴图片替换主图</span>
              </div>
            </div>
          ) : (
            <div className='main-image-uploader__drop-content'>
              {uploading ? (
                <Loader2 aria-hidden='true' />
              ) : (
                <UploadCloud aria-hidden='true' />
              )}
              <span>Drag and drop image here</span>
              <small>支持 JPEG、PNG、GIF，也可以直接粘贴截图</small>
            </div>
          )}
        </UploadDropzone>
        <UploadProgress files={uploadControl.progresses} />
      </PasteUploadArea>
      <div className='main-image-uploader__controls'>
        <label className='main-image-uploader__url'>
          <span>图片地址</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder='https://...'
          />
        </label>
        <UploadButton
          disabled={uploading}
          label='选择图片'
          onSelectFiles={upload}
        />
        {value ? (
          <button
            type='button'
            className='admin-button secondary icon-only'
            aria-label='清除主图'
            onClick={() => onChange('')}
          >
            <X aria-hidden='true' />
          </button>
        ) : null}
      </div>
      {error ? <p className='admin-error'>{error}</p> : null}
    </div>
  );
}
