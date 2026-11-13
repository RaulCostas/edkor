import api from "./api";

const ENDPOINT = "/files";

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`${ENDPOINT}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.filename;
};
