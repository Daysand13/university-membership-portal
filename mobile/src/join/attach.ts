import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File, UploadType } from "expo-file-system";
import { api, ApiError } from "../api/client";
import { COMPRESS_STEPS, fitWithin, formatBytes, isImage, mimeFromName } from "./shrink";

/**
 * Attaching a passport photo or a medical report to an application.
 *
 * The same three steps as the website's form, so the server cannot tell
 * them apart: ask /join/upload for a signed address, send the file straight
 * to storage at that address, and keep the ticket to send with the
 * application. The file never passes through the website's server, which is
 * what lets a 5MB report through at all, and the server reads the stored
 * file back and checks it before the application is saved.
 *
 * Photos are made smaller first (shrink.ts). A PDF or Word document is sent
 * as it is — it cannot be re-encoded — and refused here, with a reason,
 * if it is over the limit, rather than after a long upload.
 */

export type AttachKind = "passport" | "medical";

export interface Attached {
  /** Empty when the server has storage switched off (local development). */
  token: string;
  name: string;
  bytes: number;
  mimeType: string;
  /** Shown back to the person, for a photo. */
  previewUri: string | null;
}

export class AttachProblem extends Error {}

interface Picked {
  uri: string;
  name: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
}

const LIMITS: Record<AttachKind, { bytes: number; maxSide: number; target: number }> = {
  // A passport photo has no business being 4000 pixels across.
  passport: { bytes: 2 * 1024 * 1024, maxSide: 1000, target: 1024 * 1024 },
  // A photo of a printed report has to stay legible, so it is kept larger.
  medical: { bytes: 5 * 1024 * 1024, maxSide: 2000, target: 2.5 * 1024 * 1024 },
};

const MEDICAL_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

function sizeOf(uri: string, reported?: number | null): number {
  if (reported && reported > 0) return reported;
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

/** Scales and re-encodes a photo until it is under the target, or as close as it will go. */
async function shrinkImage(picked: Picked, kind: AttachKind): Promise<Picked> {
  const limit = LIMITS[kind];
  const rendered = await ImageManipulator.manipulate(picked.uri).renderAsync();
  const size = fitWithin(rendered.width, rendered.height, limit.maxSide);

  let best: Picked | null = null;
  for (const compress of COMPRESS_STEPS) {
    const context = ImageManipulator.manipulate(picked.uri);
    if (size.width !== rendered.width) context.resize({ width: size.width, height: size.height });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress, format: SaveFormat.JPEG });
    const bytes = sizeOf(saved.uri);
    const baseName = picked.name.replace(/\.[^.]+$/, "") || "photo";
    best = { uri: saved.uri, name: `${baseName}.jpg`, mimeType: "image/jpeg", bytes };
    if (bytes > 0 && bytes <= limit.target) break;
  }
  return best ?? picked;
}

async function send(kind: AttachKind, file: Picked, onProgress?: (fraction: number) => void): Promise<string> {
  const ticket = await api.post<{ mode: "upload"; uploadUrl: string; token: string } | { mode: "skip" }>(
    "/join/upload",
    { kind, filename: file.name, mimeType: file.mimeType, fileSize: file.bytes },
    { open: true },
  );
  if (ticket.mode === "skip") return "";

  const task = new File(file.uri).createUploadTask(ticket.uploadUrl, {
    httpMethod: "PUT",
    uploadType: UploadType.BINARY_CONTENT,
    // Must match what the address was signed for, or storage refuses it.
    headers: { "Content-Type": file.mimeType },
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(bytesSent / totalBytes);
    },
  });
  const result = await task.uploadAsync();
  if (result.status < 200 || result.status >= 300) {
    throw new AttachProblem("Your file didn't finish uploading. Check your connection and try again.");
  }
  return ticket.token;
}

async function attach(kind: AttachKind, picked: Picked, onProgress?: (fraction: number) => void): Promise<Attached> {
  const limit = LIMITS[kind];
  let file = picked;

  if (kind === "medical" && !MEDICAL_TYPES.includes(file.mimeType) && !isImage(file.mimeType)) {
    throw new AttachProblem("Your medical report must be a PDF or Word document, or a JPG or PNG photo of the report.");
  }

  // Every photo is re-encoded as JPEG — which also turns an iPhone's HEIC,
  // or a WebP, into something the server accepts.
  if (isImage(file.mimeType)) file = await shrinkImage(file, kind);

  if (file.bytes > limit.bytes) {
    throw new AttachProblem(
      `This file is ${formatBytes(file.bytes)}, over the ${formatBytes(limit.bytes)} limit. Please choose a smaller one.`,
    );
  }

  try {
    const token = await send(kind, file, onProgress);
    return { token, name: file.name, bytes: file.bytes, mimeType: file.mimeType, previewUri: isImage(file.mimeType) ? file.uri : null };
  } catch (err) {
    if (err instanceof AttachProblem) throw err;
    if (err instanceof ApiError) throw new AttachProblem(err.message);
    throw new AttachProblem("Your file couldn't be uploaded. Check your connection and try again.");
  }
}

function fromPickerAsset(asset: ImagePicker.ImagePickerAsset): Picked {
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name,
    mimeType: asset.mimeType ?? mimeFromName(name) ?? "image/jpeg",
    bytes: sizeOf(asset.uri, asset.fileSize),
    width: asset.width,
    height: asset.height,
  };
}

/** A new photo from the camera. Null if they backed out. */
export async function attachFromCamera(kind: AttachKind, onProgress?: (fraction: number) => void): Promise<Attached | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new AttachProblem(
      "The camera isn't allowed for ASSN. You can choose a photo you already have instead, or allow the camera in your phone's settings.",
    );
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    // A square crop for a passport photo, as the ID card uses it.
    allowsEditing: kind === "passport",
    aspect: kind === "passport" ? [1, 1] : undefined,
    quality: 0.9,
  });
  if (result.canceled || !result.assets[0]) return null;
  return attach(kind, fromPickerAsset(result.assets[0]), onProgress);
}

/** A photo already on the phone. No permission needed: Android's photo picker asks nothing. */
export async function attachFromPhotos(kind: AttachKind, onProgress?: (fraction: number) => void): Promise<Attached | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: kind === "passport",
    aspect: kind === "passport" ? [1, 1] : undefined,
    quality: 0.9,
  });
  if (result.canceled || !result.assets[0]) return null;
  return attach(kind, fromPickerAsset(result.assets[0]), onProgress);
}

/** A saved document — a PDF or Word file, or a scan. */
export async function attachDocument(kind: AttachKind, onProgress?: (fraction: number) => void): Promise<Attached | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: MEDICAL_TYPES, copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return attach(
    kind,
    {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? mimeFromName(asset.name) ?? "application/octet-stream",
      bytes: sizeOf(asset.uri, asset.size),
    },
    onProgress,
  );
}
