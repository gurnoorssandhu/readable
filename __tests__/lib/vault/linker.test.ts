import { extractWikiLinks } from '@/lib/vault/linker';

describe('extractWikiLinks', () => {
  it('extracts a single wiki link', () => {
    const result = extractWikiLinks('See [[Some Note]] for details');
    expect(result).toEqual(['Some Note']);
  });

  it('extracts multiple wiki links', () => {
    const result = extractWikiLinks(
      'Link to [[Note A]] and [[Note B]] and [[Note C]]'
    );
    expect(result).toEqual(['Note A', 'Note B', 'Note C']);
  });

  it('returns empty array when no links are present', () => {
    expect(extractWikiLinks('No links here')).toEqual([]);
    expect(extractWikiLinks('')).toEqual([]);
  });

  it('extracts links with special characters inside', () => {
    const result = extractWikiLinks('See [[Note with spaces & symbols!]]');
    expect(result).toEqual(['Note with spaces & symbols!']);
  });

  it('extracts links with slashes (paths)', () => {
    const result = extractWikiLinks('See [[PDFs/my-pdf/_index]]');
    expect(result).toEqual(['PDFs/my-pdf/_index']);
  });

  it('handles links at the start and end of content', () => {
    const result = extractWikiLinks('[[Start]] middle [[End]]');
    expect(result).toEqual(['Start', 'End']);
  });

  it('handles links on separate lines', () => {
    const content = `Line one [[Link1]]
Line two [[Link2]]
Line three`;
    const result = extractWikiLinks(content);
    expect(result).toEqual(['Link1', 'Link2']);
  });

  it('handles adjacent links with no space between', () => {
    const result = extractWikiLinks('[[A]][[B]]');
    expect(result).toEqual(['A', 'B']);
  });

  it('does not match single brackets', () => {
    const result = extractWikiLinks('[Not a link]');
    expect(result).toEqual([]);
  });

  it('does not match unclosed brackets', () => {
    const result = extractWikiLinks('[[unclosed');
    expect(result).toEqual([]);
  });

  it('does not match empty brackets', () => {
    // The regex [^\]]+ requires at least one character
    const result = extractWikiLinks('[[]]');
    expect(result).toEqual([]);
  });

  it('handles nested brackets by not matching inner closing brackets', () => {
    // [[outer [inner] rest]] - the regex stops at first ]]
    // The regex /\[\[([^\]]+)\]\]/ captures non-] characters, so [inner] would split it
    const result = extractWikiLinks('[[outer [inner] rest]]');
    // [^\]]+ stops at first ], so it captures "outer [inner" - but wait, [ is not ]
    // Actually [^\]]+ means "any char except ]", so [ is fine but ] is not.
    // "outer [inner" stops at first ], then ]] is checked but we only have ] rest]]
    // So it tries to match "outer [inner" followed by ]], but after "outer [inner" comes "] rest]]"
    // ] is the closing bracket, so it does not match.
    // Let's see: it tries [[outer [inner]] - no because [inner has a [ which is ok,
    // but ] is what terminates, so it matches "outer [inner" then needs ]]
    // The character after "outer [inner" is "]", then " rest]]"
    // So the regex: \[\[([^\]]+)\]\] would try to get the longest [^\]]+ before ]]
    // [^\]]+ captures "outer [inner" (stops at first ]) then checks for ]] but finds "] "
    // So it should NOT match.
    expect(result).toEqual([]);
  });

  it('extracts links with numbers', () => {
    const result = extractWikiLinks('See [[Chapter 12]] and [[Section 3.4]]');
    expect(result).toEqual(['Chapter 12', 'Section 3.4']);
  });

  it('handles wiki links with pipe aliases', () => {
    // Obsidian supports [[target|display text]], the regex captures everything
    const result = extractWikiLinks('See [[target|display text]]');
    expect(result).toEqual(['target|display text']);
  });

  it('handles content with only wiki links', () => {
    const result = extractWikiLinks('[[OnlyLink]]');
    expect(result).toEqual(['OnlyLink']);
  });
});
