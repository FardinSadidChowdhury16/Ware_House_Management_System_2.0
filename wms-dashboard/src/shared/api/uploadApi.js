import { httpClient } from "../../core/api/httpClient.js";

export const uploadApi = {
  /**
   * Upload an optional image or document to AWS S3.
   * @param {File} file - The file to upload
   * @param {string} folder - The S3 subfolder (e.g. "stock-in", "stock-out", "deliveries")
   * @returns {Promise<{file_url: string, file_name: string, file_size: number, content_type: string, s3_key: string}>}
   */
  async uploadFile(file, folder = "attachments") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const { data } = await httpClient.post("/uploads", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },
};

