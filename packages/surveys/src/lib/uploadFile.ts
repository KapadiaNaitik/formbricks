export const uploadFile = async (
  file: File | Blob,
  allowedFileExtensions: string[] | undefined,
  surveyId: string | undefined,
  environmentId: string | undefined
) => {
  if (!(file instanceof Blob) || !(file instanceof File)) {
    throw new Error(`Invalid file type. Expected Blob or File, but received ${typeof file}`);
  }

  const payload = {
    fileName: file.name,
    fileType: file.type,
    allowedFileExtensions: allowedFileExtensions,
    surveyId: surveyId,
  };

  const response = await fetch(`/api/v1/client/${environmentId}/storage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status}`);
  }

  const json = await response.json();

  const { data } = json;
  const { signedUrl, fileUrl, signingData, presignedFields } = data;

  let requestHeaders: Record<string, string> = {};

  if (signingData) {
    const { signature, timestamp, uuid } = signingData;

    requestHeaders = {
      fileType: file.type,
      fileName: file.name,
      surveyId: surveyId ?? "",
      signature,
      timestamp,
      uuid,
    };
  }

  const formData = new FormData();

  if (presignedFields) {
    Object.keys(presignedFields).forEach((key) => {
      formData.append(key, presignedFields[key]);
    });
  }

  // Add the actual file to be uploaded
  formData.append("file", file);

  const uploadResponse = await fetch(signedUrl, {
    method: "POST",
    ...(signingData ? { headers: requestHeaders } : {}),
    body: formData,
  });

  if (!uploadResponse.ok) {
    const uploadJson = await uploadResponse.json();
    console.log(uploadJson);
    throw new Error(`${uploadJson.message}`);
  }

  return {
    uploaded: true,
    url: fileUrl,
  };
};
