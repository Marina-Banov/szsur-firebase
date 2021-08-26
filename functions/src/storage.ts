const { Storage } = require("@google-cloud/storage");
import { v4 as uuidv4 } from "uuid";

const bucket = new Storage().bucket(bucketName);

export const putFiles = async (data: any[]): Promise<string[]> => {
  try {
    return Promise.all(data.map(async (file) => await put(file)));
  } catch (error) {
    throw new Error("Error uploading files");
  }
};

export const put = async (image: {
  name: string;
  base64: string;
}): Promise<string> => {
  try {
    const uuid = uuidv4();
    // @ts-ignore
    const mimeType = image.base64.match(
      /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/
    )[1];
    const base64EncodedImageString = image.base64.replace(
      /^data:image\/\w+;base64,/,
      ""
    );
    const imageBuffer = Buffer.from(base64EncodedImageString, "base64");
    const file = await bucket.file(image.name);
    await file.save(imageBuffer, {
      destination: image.name,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: uuid,
          contentType: mimeType,
        },
      },
      public: true,
      validation: "md5",
    });
    return buildStorageUrl(image.name, uuid);
  } catch (error) {
    throw new Error("Error uploading file");
  }
};

const buildStorageUrl = (path: string, uuid: string) => {
  path = path.replace("/", "%2F");
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${path}?alt=media&token=${uuid}`;
};
