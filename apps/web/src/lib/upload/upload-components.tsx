import type { FileUploadInfo, UploadStatus } from '@better-upload/client';
import { Clipboard, FileImage, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@bunship-ai/ui/components/button';

type UploadFileState = FileUploadInfo<UploadStatus>;

type UploadButtonProps = {
  accept?: string;
  disabled?: boolean;
  label?: string;
  multiple?: boolean;
  onSelectFiles: (files: File[]) => void | Promise<void>;
};

type UploadDropzoneProps = {
  accept?: Record<string, string[]>;
  children?: ReactNode;
  disabled?: boolean;
  multiple?: boolean;
  onSelectFiles: (files: File[]) => void | Promise<void>;
};

type PasteUploadAreaProps = {
  children: ReactNode;
  disabled?: boolean;
  onSelectFiles: (files: File[]) => void | Promise<void>;
};

type UploadProgressProps = {
  files: UploadFileState[];
};

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function uploadPercent(file: UploadFileState) {
  return Math.max(0, Math.min(100, Math.round((file.progress ?? 0) * 100)));
}

function filesFromClipboard(event: React.ClipboardEvent<HTMLElement>) {
  const files = Array.from(event.clipboardData.files).filter((file) =>
    file.type.startsWith('image/'),
  );
  if (files.length > 0) return files;

  return Array.from(event.clipboardData.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
}

export function UploadButton({
  accept = 'image/*',
  disabled,
  label = '选择图片',
  multiple = false,
  onSelectFiles,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='w-full'
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload aria-hidden='true' />
        {label}
      </Button>
      <input
        ref={inputRef}
        className='sr-only'
        type='file'
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) void onSelectFiles(files);
          event.currentTarget.value = '';
        }}
      />
    </>
  );
}

export function UploadDropzone({
  accept = { 'image/*': [] },
  children,
  disabled,
  multiple = false,
  onSelectFiles,
}: UploadDropzoneProps) {
  const [isKeyboardFocus, setKeyboardFocus] = useState(false);
  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0) void onSelectFiles(files);
    },
    [onSelectFiles],
  );
  const { getRootProps, getInputProps, isDragAccept, isDragReject } =
    useDropzone({
      accept,
      disabled,
      multiple,
      onDrop,
    });

  const rootProps = getRootProps({
    className: [
      'upload-dropzone',
      isDragAccept ? 'is-accepting' : '',
      isDragReject ? 'is-rejecting' : '',
      isKeyboardFocus ? 'is-focused' : '',
    ]
      .filter(Boolean)
      .join(' '),
    onBlur: () => setKeyboardFocus(false),
    onFocus: () => setKeyboardFocus(true),
  });

  return (
    <div {...rootProps}>
      <input {...getInputProps()} />
      {children ?? (
        <>
          <FileImage aria-hidden='true' />
          <span>拖拽图片到这里上传</span>
        </>
      )}
    </div>
  );
}

export function UploadProgress({ files }: UploadProgressProps) {
  const visibleFiles = useMemo(
    () =>
      files.filter((file) => file.status !== 'complete' || file.progress < 1),
    [files],
  );

  if (visibleFiles.length === 0) return null;

  return (
    <div className='upload-progress' aria-live='polite'>
      {visibleFiles.map((file) => {
        const percent = uploadPercent(file);
        return (
          <div className='upload-progress__item' key={file.objectInfo.key}>
            <div className='upload-progress__meta'>
              <span>{file.name}</span>
              <span>
                {formatBytes(file.size)} · {percent}%
              </span>
            </div>
            <div className='upload-progress__track'>
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PasteUploadArea({
  children,
  disabled,
  onSelectFiles,
}: PasteUploadAreaProps) {
  return (
    <div
      className='paste-upload-area'
      onPaste={(event) => {
        if (disabled) return;
        const files = filesFromClipboard(event);
        if (files.length === 0) return;
        event.preventDefault();
        void onSelectFiles(files);
      }}
    >
      {children}
      <div className='paste-upload-area__hint'>
        <Clipboard aria-hidden='true' />
        支持拖拽、点击选择或直接粘贴截图
      </div>
    </div>
  );
}
