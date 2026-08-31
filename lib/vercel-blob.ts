import { put } from "@vercel/blob";

export async function uploadToVercelBlob(file: File, path: string) {
  try {
    const response = await put(path, file, { access: "private" }); // 10MB max size

    return response.url; // Return the URL of the uploaded file
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}
