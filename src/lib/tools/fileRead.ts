import type { AttachedFile } from '@/types/session';

const MAX_TEXT_BYTES = 50 * 1024; // 50KB

export async function executeFileRead(
  filePath: string,
  attachedFiles: AttachedFile[]
): Promise<string> {
  const file = attachedFiles.find(
    (f) => f.name === filePath || f.name.endsWith(filePath)
  );

  if (!file) {
    const available = attachedFiles.map((f) => f.name).join(', ');
    return `File "${filePath}" not found. Available files: ${available || 'none'}`;
  }

  try {
    const buffer = Buffer.from(file.contentBase64, 'base64');
    let text = buffer.toString('utf-8');

    if (text.length > MAX_TEXT_BYTES) {
      text = text.slice(0, MAX_TEXT_BYTES) + '\n\n[...truncated at 50KB]';
    }

    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return `Failed to read file "${filePath}": ${message}`;
  }
}
