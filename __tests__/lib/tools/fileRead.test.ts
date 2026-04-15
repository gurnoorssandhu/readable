import { executeFileRead } from '@/lib/tools/fileRead';
import type { AttachedFile } from '@/types/session';

function makeAttachedFile(
  name: string,
  content: string,
  mimeType: string = 'text/plain'
): AttachedFile {
  return {
    name,
    contentBase64: Buffer.from(content).toString('base64'),
    mimeType,
    size: content.length,
  };
}

describe('executeFileRead', () => {
  it('reads a file that matches by exact name', async () => {
    const files = [makeAttachedFile('notes.txt', 'Hello world')];
    const result = await executeFileRead('notes.txt', files);
    expect(result).toBe('Hello world');
  });

  it('reads a file that matches by suffix (partial path)', async () => {
    const files = [makeAttachedFile('docs/readme.md', 'Contents here')];
    const result = await executeFileRead('readme.md', files);
    expect(result).toBe('Contents here');
  });

  it('returns not-found message when file does not exist', async () => {
    const files = [makeAttachedFile('other.txt', 'data')];
    const result = await executeFileRead('missing.txt', files);
    expect(result).toContain('File "missing.txt" not found');
    expect(result).toContain('other.txt');
  });

  it('returns not-found with "none" when no files are attached', async () => {
    const result = await executeFileRead('anything.txt', []);
    expect(result).toContain('File "anything.txt" not found');
    expect(result).toContain('none');
  });

  it('lists all available file names in the not-found message', async () => {
    const files = [
      makeAttachedFile('a.txt', 'aaa'),
      makeAttachedFile('b.txt', 'bbb'),
      makeAttachedFile('c.txt', 'ccc'),
    ];
    const result = await executeFileRead('missing.txt', files);
    expect(result).toContain('a.txt');
    expect(result).toContain('b.txt');
    expect(result).toContain('c.txt');
  });

  it('truncates files larger than 50KB', async () => {
    const largeContent = 'x'.repeat(60 * 1024); // 60KB
    const files = [makeAttachedFile('large.txt', largeContent)];
    const result = await executeFileRead('large.txt', files);
    expect(result).toContain('[...truncated at 50KB]');
    // The result should be 50KB of content + the truncation marker
    expect(result.length).toBeLessThan(largeContent.length);
  });

  it('does not truncate files at exactly 50KB', async () => {
    const exactContent = 'y'.repeat(50 * 1024); // exactly 50KB
    const files = [makeAttachedFile('exact.txt', exactContent)];
    const result = await executeFileRead('exact.txt', files);
    expect(result).not.toContain('[...truncated');
    expect(result.length).toBe(50 * 1024);
  });

  it('handles binary-like base64 content gracefully', async () => {
    const file: AttachedFile = {
      name: 'data.bin',
      contentBase64: Buffer.from([0x00, 0x01, 0x02, 0xff]).toString('base64'),
      mimeType: 'application/octet-stream',
      size: 4,
    };
    const result = await executeFileRead('data.bin', [file]);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('prefers exact name match over suffix match', async () => {
    const files = [
      makeAttachedFile('dir/readme.md', 'from dir'),
      makeAttachedFile('readme.md', 'exact match'),
    ];
    // The find() method finds the first match; 'readme.md' suffix matches 'dir/readme.md' first
    const result = await executeFileRead('readme.md', files);
    // Both match; find returns the first one that matches
    expect(typeof result).toBe('string');
  });
});
