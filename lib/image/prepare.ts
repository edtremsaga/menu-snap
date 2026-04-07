export interface PreparedImage {
  file: File;
  previewDataUrl: string;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1600;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.82;

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const sourceImage = await loadImage(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight),
  );
  const width = Math.round(sourceImage.naturalWidth * scale);
  const height = Math.round(sourceImage.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is unavailable.");
  }

  context.drawImage(sourceImage, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
  });

  if (!blob) {
    throw new Error("Image processing failed.");
  }

  const preparedFile = new File(
    [blob],
    replaceFileExtension(file.name || "menu-photo.jpg", "jpg"),
    {
      type: OUTPUT_TYPE,
      lastModified: Date.now(),
    },
  );

  const previewDataUrl = await blobToDataUrl(blob);

  return {
    file: preparedFile,
    previewDataUrl,
    width,
    height,
  };
}

function replaceFileExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName}.${extension}`;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read image preview."));
    };
    reader.onerror = () => reject(new Error("Could not read image preview."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image."));
    };
    image.src = objectUrl;
  });
}
