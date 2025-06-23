/* eslint-disable @next/next/no-img-element */
import { AddLine, Button, Close, cn } from '@redplanethq/ui';
import { useCallback, useState, type ReactNode } from 'react';
import React from 'react';
import { useDropzone } from 'react-dropzone';

import { onUploadFile } from 'common/editor/utils';

export interface Resource {
  type: 'image' | 'pdf';
  name: string;
  data: string;
  size: number;
  publicURL?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

interface ResourceUploaderProps {
  children: React.ReactNode;
  onResourcesChange?: (resources: Resource[]) => void;
  className?: string;
  actionComponent?: ReactNode;

  // remove later
  inHome?: boolean;
}

// Resource uploader HOC component
export function ResourceUploader({
  children,
  onResourcesChange,
  className,
  actionComponent,
  inHome,
}: ResourceUploaderProps) {
  const [resources, setResources] = useState<Resource[]>([]);

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        if (!isImage && !isPdf) {
          continue;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const resource: Resource = {
            type: isImage ? 'image' : 'pdf',
            name: file.name,
            data: base64,
            size: file.size,
            isUploading: true,
            uploadProgress: 0,
          };

          const newResources = [...resources, resource];
          setResources(newResources);
          onResourcesChange?.(newResources);

          const publicURL = await onUploadFile(file, (progress) => {
            setResources((prev) => {
              const updated = prev.map((r) =>
                r.data === base64 ? { ...r, uploadProgress: progress } : r,
              );
              onResourcesChange?.(updated);
              return updated;
            });
          });

          setResources((prev) => {
            const updated = prev.map((r) =>
              r.data === base64
                ? { ...r, publicURL, isUploading: false, uploadProgress: 100 }
                : r,
            );
            onResourcesChange?.(updated);
            return updated;
          });
        };
        reader.readAsDataURL(file);
      }
    },
    [resources, onResourcesChange],
  );

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': [],
      'application/pdf': ['.pdf'],
    },
    noClick: true,
  });

  const removeResource = (index: number) => {
    setResources((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onResourcesChange?.(updated);
      return updated;
    });
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col rounded-md bg-transparent',
        className,
        isDragActive && 'border-2 border-dashed border-primary',
      )}
    >
      <ResourceList
        resources={resources}
        onRemove={removeResource}
        inHome={inHome}
      />

      {children}
      <div className={cn('flex justify-between px-3 pt-0 pb-2 items-center')}>
        <Button
          variant="link"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="gap-1 text-muted-foreground hover:text-foreground px-0 text-sm"
        >
          <AddLine className="h-4 w-4" />
          <input
            {...getInputProps()}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
          />
        </Button>

        {actionComponent}
      </div>
    </div>
  );
}

// Resource list component
interface ResourceListProps {
  resources: Resource[];
  onRemove: (index: number) => void;
  inHome?: boolean;
}

function ResourceList({ resources, onRemove, inHome }: ResourceListProps) {
  return (
    <div
      className={cn(
        'p-2 py-0 pt-2',
        resources.length > 0 && 'pb-2',
        inHome && resources.length === 0 && 'pt-0',
      )}
    >
      <div className="flex flex-wrap gap-2">
        {resources.map((resource, index) => (
          <div
            key={index}
            className="relative flex items-center gap-2 bg-grayAlpha-100 rounded-md text-sm relative group"
          >
            {(resource.type === 'image' || resource.type === 'pdf') && (
              <ResourcePreview resource={resource} />
            )}
            <button
              onClick={() => onRemove(index)}
              className="text-foreground bg-background absolute top-1 right-1 hidden group-hover:block rounded-md p-[1px]"
            >
              <Close size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Resource preview component
interface ResourcePreviewProps {
  resource: Resource;
}

function ResourcePreview({ resource }: ResourcePreviewProps) {
  return (
    <div className="relative w-10 h-10">
      {resource.type === 'image' ? (
        <img
          src={resource.data}
          alt={resource.name}
          className="w-10 h-10 object-cover rounded"
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-grayAlpha-100 rounded">
          <span className="text-xs">PDF</span>
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-grayAlpha-100 rounded w-10 h-10"></div>
      {resource.isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-grayAlpha-100 rounded">
          <div className="relative">
            <svg className="w-8 h-8">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted-foreground opacity-25"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={88}
                strokeDashoffset={
                  88 - (88 * (resource.uploadProgress || 0)) / 100
                }
                className="text-primary rotate-[-90deg] origin-center transition-all duration-300"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
