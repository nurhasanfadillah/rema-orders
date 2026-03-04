import { FileData } from '../types';
import { supabase } from '../supabase';
import { getStoragePathFromUrl } from '../utils';

export const uploadFiles = async (
    files: FileData[],
    bucket: string,
    mode: string,
    onProgress?: () => void
): Promise<FileData[]> => {
    const uploadPromises = files.map(async (fileData) => {
        // CASE 1: File is a remote reference (no raw file object)
        if (!fileData.file) {
            if (mode === 'create' && fileData.url) {
                try {
                    const oldPath = getStoragePathFromUrl(fileData.url);
                    if (oldPath) {
                        const fileExt = fileData.name.split('.').pop() || 'png';
                        const newFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

                        const { error: copyError } = await supabase.storage.from(bucket).copy(oldPath, newFileName);
                        if (!copyError) {
                            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(newFileName);
                            if (onProgress) onProgress();
                            return { name: fileData.name, type: fileData.type, size: fileData.size, url: publicUrl } as FileData;
                        }
                    }
                } catch (e) {
                    console.error("Copy internal error:", e);
                }
            }
            if (onProgress) onProgress();
            return fileData;
        }

        // CASE 2: New File Upload
        const fileExt = fileData.name.split('.').pop() || 'png';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, fileData.file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
        if (onProgress) onProgress();

        return { name: fileData.name, type: fileData.type, size: fileData.size, url: publicUrl } as FileData;
    });

    // Execute all uploads in parallel
    const results = await Promise.allSettled(uploadPromises);
    const uploadedFiles: FileData[] = [];
    let hasError = false;

    for (const result of results) {
        if (result.status === 'fulfilled') {
            uploadedFiles.push(result.value);
        } else {
            hasError = true;
            console.error("Upload failed for a file:", result.reason);
        }
    }

    // Rollback logic if any file failed to upload
    if (hasError) {
        // We only want to delete new files we just uploaded or copied
        // (Remote references that didn't change shouldn't be deleted)
        const pathsToDelete = uploadedFiles
            .filter(f => f && f.url && f.name) // valid
            // Note: we can't easily know if it's new or old just from FileData,
            // but if we failed in the middle of a batch, we'll try to delete what we can.
            // Wait, it's safer to delete by searching the newly generated URLs.
            .map(f => getStoragePathFromUrl(f.url))
            .filter(Boolean) as string[];

        if (pathsToDelete.length > 0) {
            await supabase.storage.from(bucket).remove(pathsToDelete).catch(e => console.error("Rollback failed:", e));
        }
        throw new Error('Sistem gagal mengunggah beberapa file. Operasi dibatalkan (Rollback). Pastikan koneksi stabil.');
    }

    return uploadedFiles;
};
