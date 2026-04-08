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
  const normalizedInput = isLikelyHeic(file)
    ? await convertHeicToJpeg(file)
    : file;

  const source = await decodeImage(normalizedInput);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    releaseDecodedImage(source);
    throw new Error("Image processing is unavailable.");
  }

  context.drawImage(source.image, 0, 0, width, height);
  releaseDecodedImage(source);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
  });

  if (!blob) {
    throw new Error("Image processing failed.");
  }

  const preparedFile = new File(
    [blob],
    replaceFileExtension(normalizedInput.name || "menu-photo.jpg", "jpg"),
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

interface DecodedImage {
  image: CanvasImageSource;
  width: number;
  height: number;
  cleanup?: () => void;
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

async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    }
  } catch {
    // Fall through to HTMLImageElement decode below.
  }

  return loadImageElement(file);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: OUTPUT_TYPE,
      quality: OUTPUT_QUALITY,
    });

    const outputBlob = Array.isArray(converted) ? converted[0] : converted;
    if (!(outputBlob instanceof Blob)) {
      throw new Error("HEIC conversion did not return an image.");
    }

    return new File([outputBlob], replaceFileExtension(file.name, "jpg"), {
      type: OUTPUT_TYPE,
      lastModified: Date.now(),
    });
  } catch {
    throw new Error("This HEIC photo could not be prepared on this device.");
  }
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          isLikelyHeic(file)
            ? "This HEIC photo could not be prepared on this device."
            : "Could not load image.",
        ),
      );
    };
    image.src = objectUrl;
  }).then((image) => ({
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => {
      if (image.src.startsWith("blob:")) {
        URL.revokeObjectURL(image.src);
      }
    },
  }));
}

function releaseDecodedImage(decoded: DecodedImage) {
  decoded.cleanup?.();
}

function isLikelyHeic(file: File) {
  const normalizedType = file.type.toLowerCase();
  const normalizedName = file.name.toLowerCase();

  return (
    normalizedType === "image/heic" ||
    normalizedType === "image/heif" ||
    normalizedName.endsWith(".heic") ||
    normalizedName.endsWith(".heif")
  );
}
