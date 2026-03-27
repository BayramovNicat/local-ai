import type { Attachment } from '@/app/types';

async function readFileAsAttachment(file: File, idSuffix: string): Promise<Attachment> {
  return {
    id: `${Date.now()}-${idSuffix}`,
    type: 'image',
    url: URL.createObjectURL(file), // Memory efficient ObjectURL for session
    name: file.name,
    blob: file, // Store the blob for persistence in IndexedDB
  };
}

export async function processFiles(files: FileList | File[]): Promise<Attachment[]> {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
  return Promise.all(imageFiles.map((f) => readFileAsAttachment(f, f.name)));
}

export async function processPasteItems(items: DataTransferItemList): Promise<Attachment[]> {
  const attachments: Attachment[] = [];
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const att = await readFileAsAttachment(file, 'paste');
        attachments.push(att);
      }
    }
  }
  return attachments;
}
