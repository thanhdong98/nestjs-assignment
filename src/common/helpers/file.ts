import { readFile, unlink } from 'fs/promises';

const getAvatarBase64 = async (fileName: string): Promise<string> => {
  const bitmap = await readFile(`assets/avatars/${fileName}.png`);
  return bitmap.toString('base64');
};

const deleteFile = async (filePath: string): Promise<void> => {
  await unlink(filePath);
};

export { getAvatarBase64, deleteFile };
