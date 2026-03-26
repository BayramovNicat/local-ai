import type { Attachment } from "@/app/types";

function readFileAsAttachment(file: File, idSuffix: string): Promise<Attachment> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `${Date.now()}-${idSuffix}`,
        type: "image",
        url: reader.result as string,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  });
}

export async function processFiles(files: FileList | File[]): Promise<Attachment[]> {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  return Promise.all(imageFiles.map((f) => readFileAsAttachment(f, f.name)));
}

export async function processPasteItems(items: DataTransferItemList): Promise<Attachment[]> {
  const attachments: Attachment[] = [];
  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        const att = await readFileAsAttachment(file, "paste");
        attachments.push(att);
      }
    }
  }
  return attachments;
}
