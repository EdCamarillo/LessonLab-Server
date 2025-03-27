"use strict";
// spacesStorage.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpacesStorage = void 0;
const fs_1 = __importDefault(require("fs"));
const lib_storage_1 = require("@aws-sdk/lib-storage");
const client_s3_1 = require("@aws-sdk/client-s3");
const spacesEndpoint = `https://nyc3.digitaloceanspaces.com`;
const s3 = new client_s3_1.S3({
    endpoint: spacesEndpoint,
    region: "nyc3",
    credentials: {
        accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY || "",
    },
});
class SpacesStorage {
    async saveFile(file, fileKey) {
        const fileStream = fs_1.default.createReadStream(file.path, { autoClose: true });
        const params = {
            Bucket: process.env.DO_SPACES_BUCKET_NAME,
            Key: fileKey,
            Body: fileStream,
            ACL: client_s3_1.ObjectCannedACL.public_read,
            ContentType: file.mimetype,
            ContentDisposition: "inline",
        };
        try {
            await new lib_storage_1.Upload({
                client: s3,
                params: {
                    ...params,
                    ACL: client_s3_1.ObjectCannedACL.public_read,
                },
            }).done();
        }
        catch (error) {
            console.error("Failed to upload file to Spaces:", error);
            throw error;
        }
        finally {
            try {
                await fs_1.default.promises.unlink(file.path);
            }
            catch (error) {
                console.error("Failed to delete local file:", error);
            }
        }
    }
    async deleteFileFromWorkspace(namespaceId, documentId) {
        const filePrefix = `${namespaceId}/${documentId}/`;
        const listParams = {
            Bucket: process.env.DO_SPACES_BUCKET_NAME,
            Prefix: filePrefix,
        };
        const listedObjects = await s3.listObjectsV2(listParams);
        if (listedObjects.Contents) {
            const objectsToDelete = listedObjects.Contents.map((content) => content.Key)
                .filter((key) => key !== undefined)
                .map((key) => ({ Key: key }));
            if (objectsToDelete.length > 0) {
                const deleteParams = {
                    Bucket: process.env.DO_SPACES_BUCKET_NAME,
                    Delete: { Objects: objectsToDelete },
                };
                await s3.deleteObjects(deleteParams, { requestTimeout: 60000 });
            }
        }
    }
    async getFilePath(fileKey) {
        throw new Error("Not necessary for Spaces storage");
    }
    constructFileUrl(fileKey) {
        return `https://${process.env.DO_SPACES_BUCKET_NAME}.nyc3.digitaloceanspaces.com/${fileKey}`;
    }
    async deleteWorkspaceFiles(namespaceId) {
        const filePrefix = `${namespaceId}/`;
        const listParams = {
            Bucket: process.env.DO_SPACES_BUCKET_NAME,
            Prefix: filePrefix,
        };
        const listedObjects = await s3.listObjectsV2(listParams);
        if (listedObjects.Contents) {
            const objectsToDelete = listedObjects.Contents.map((content) => content.Key)
                .filter((key) => key !== undefined)
                .map((key) => ({ Key: key }));
            if (objectsToDelete.length > 0) {
                const deleteParams = {
                    Bucket: process.env.DO_SPACES_BUCKET_NAME,
                    Delete: { Objects: objectsToDelete },
                };
                const maxRetries = 3;
                let retries = 0;
                while (retries < maxRetries) {
                    try {
                        await s3.deleteObjects(deleteParams, { requestTimeout: 60000 });
                        return; // Deletion successful, exit the method
                    }
                    catch (error) {
                        console.error(`Failed to delete objects (attempt ${retries + 1}):`, error);
                        retries++;
                    }
                }
                throw new Error(`Failed to delete objects after ${maxRetries} attempts`);
            }
        }
    }
    async listFilesInNamespace(namespaceId) {
        const bucket = process.env.DO_SPACES_BUCKET_NAME;
        const prefix = `${namespaceId}/`;
        return this.listFilesRecursive(prefix, bucket);
    }
    async listFilesRecursive(currentPrefix, bucket) {
        const params = {
            Bucket: bucket,
            Prefix: currentPrefix,
            Delimiter: "/",
        };
        try {
            const data = await s3.listObjectsV2(params);
            let files = (data.Contents ?? []).map((item) => ({
                documentId: item.Key ? item.Key.split("/")[1] : "",
                name: item.Key ? item.Key.replace(currentPrefix, "") : "",
                url: item.Key ? this.constructFileUrl(item.Key) : "",
            }));
            // If there are subdirectories, recursively list their files
            if (data.CommonPrefixes && data.CommonPrefixes.length > 0) {
                const recursiveFiles = await Promise.all(data.CommonPrefixes.map((cp) => this.listFilesRecursive(cp.Prefix, bucket)));
                // Flatten the array of arrays
                files = files.concat(recursiveFiles.flat());
            }
            return files;
        }
        catch (error) {
            console.error("Failed to list files from Spaces:", error);
            throw error;
        }
    }
}
exports.SpacesStorage = SpacesStorage;
//# sourceMappingURL=spacesStorage.js.map