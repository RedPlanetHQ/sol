/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Editor } from '@tiptap/core';

import axios from 'axios';
import { type ImageUploadOptions } from 'novel';

interface ImageUploadOptionsExtend extends ImageUploadOptions {
  onUpload: (
    file: File,
    callback?: (progress: number) => void,
  ) => Promise<unknown>;
}

export const onUploadFile = async (
  file: File,
  callback?: (progress: number) => void,
) => {
  const {
    data: { url, attachment },
  } = await axios.post('/api/v1/attachment/get-signed-url', {
    fileName: file.name,
    contentType: file.type,
    mimetype: file.type,
    size: file.size,
    originalName: file.name,
  });

  await axios.put(url, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total,
      );
      callback && callback(percentCompleted);
    },
  });

  // This should return a src of the uploaded image
  return attachment;
};

export const createImageUpload =
  ({ validateFn, onUpload }: ImageUploadOptionsExtend): UploadFileFn =>
  (file, editor, pos) => {
    // check if the file is an image
    const validated = validateFn?.(file) as unknown as boolean;
    if (!validated) {
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    const tempFileURL = URL.createObjectURL(file);

    editor
      .chain()
      .insertContentAt(pos, [
        {
          type: 'img',
          attrs: {
            src: tempFileURL,
            alt: file.name,
            uploading: true,
            openViewer: false,
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '\n',
            },
          ],
        },
      ])
      .exitCode()
      .focus()
      .run();

    onUpload(file, (progress) => {
      updateNodeAttrs(editor, tempFileURL, {
        src: tempFileURL,
        uploading: true,
        progress,
        openViewer: false,
        alt: file.name,
      });
    }).then((response: any) => {
      updateNodeAttrs(editor, tempFileURL, {
        src: response.publicURL,
        alt: response.originalName,
        openViewer: false,
        attachmentId: response.id,
      });
    });
  };

export const uploadFn = createImageUpload({
  onUpload: onUploadFile,
  validateFn: () => {
    return true;
  },
});

export const handleMarkAndImagePaste = (
  editor: Editor,
  event: ClipboardEvent,
  uploadFn: UploadFileFn,
) => {
  if (event.clipboardData?.files.length) {
    return handleImagePaste(editor, event, uploadFn);
  }

  return false;
};

export const handleImagePaste = (
  editor: Editor,
  event: ClipboardEvent,
  uploadFn: UploadFileFn,
) => {
  event.preventDefault();
  const [file] = Array.from(event.clipboardData.files);
  const pos = editor.view.state.selection.from;

  if (file) {
    uploadFn(file, editor, pos);
  }

  return true;
};

type UploadFileFn = (file: File, view: Editor, pos: number) => void;

export const createFileUpload =
  ({ validateFn, onUpload }: ImageUploadOptionsExtend): UploadFileFn =>
  (file, editor, pos) => {
    // check if the file is an image
    const validated = validateFn?.(file) as unknown as boolean;
    if (!validated) {
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    const tempFileURL = URL.createObjectURL(file);

    editor
      .chain()
      .insertContentAt(pos, [
        {
          type: 'file',
          attrs: {
            src: tempFileURL,
            alt: file.name,
            uploading: true,
            progress: 0,
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '\n',
            },
          ],
        },
      ])
      .exitCode()
      .focus()
      .run();

    onUpload(file, (progress) => {
      updateNodeAttrs(editor, tempFileURL, {
        src: tempFileURL,
        uploading: true,
        progress,
        openViewer: false,
        alt: file.name,
      });
    }).then((response: any) => {
      updateNodeAttrs(editor, tempFileURL, {
        src: response.publicURL,
        alt: response.originalName,
        size: response.size,
        type: response.fileType,
        attachmentId: response.id,
      });
    });
  };

export const uploadFileFn = createFileUpload({
  onUpload: onUploadFile,
  validateFn: () => {
    return true;
  },
});

function updateNodeAttrs(editor: any, url: string, updatedAttrs: any) {
  editor.view.state.doc.descendants((node: any, pos: number) => {
    if (node.attrs?.src === url) {
      const transaction = editor.view.state.tr.setNodeMarkup(
        pos,
        undefined, // Keep the same node type
        updatedAttrs, // Merge new attributes with existing ones
      );
      editor.view.dispatch(transaction); // Apply the transaction
    }
  });
}

export const handleDrop = (
  editor: Editor,
  event: DragEvent,
  moved: boolean,
) => {
  if (!moved && event.dataTransfer?.files.length) {
    event.preventDefault();
    const [file] = Array.from(event.dataTransfer.files);
    const coordinates = editor.view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });
    // here we deduct 1 from the pos or else the image will create an extra node

    if (file) {
      // Check if the file is an image
      if (file.type.startsWith('image/')) {
        uploadFn(file, editor, coordinates?.pos ?? 0 - 1);
      } else {
        uploadFileFn(file, editor, coordinates?.pos ?? 0 - 1);
      }
    }
    return true;
  }
  return false;
};
