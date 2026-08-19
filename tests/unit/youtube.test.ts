import { describe, it, expect } from 'vitest';
import { youTubeId, embedUrl } from '@/domain/youtube';

describe('youTubeId', () => {
  const vectors: Array<[string, string | null]> = [
    ['https://www.youtube.com/watch?v=S0H0JxLAOAY', 'S0H0JxLAOAY'],
    ['https://www.youtube.com/shorts/PV6Em-k0xYs', 'PV6Em-k0xYs'], // farmer uses /shorts/
    ['https://youtu.be/uhghy9pFIPY', 'uhghy9pFIPY'],
    ['https://www.youtube.com/watch?v=Did01dFR3Lk&t=30s', 'Did01dFR3Lk'],
    ['not a url', null],
    ['', null],
  ];
  it.each(vectors)('%s → %s', (url, id) => {
    expect(youTubeId(url)).toBe(id);
  });
});

describe('embedUrl', () => {
  it('builds a privacy-friendly embed URL', () => {
    expect(embedUrl('https://www.youtube.com/watch?v=S0H0JxLAOAY')).toBe(
      'https://www.youtube-nocookie.com/embed/S0H0JxLAOAY',
    );
  });
  it('appends autoplay when requested', () => {
    expect(embedUrl('https://www.youtube.com/shorts/PV6Em-k0xYs', { autoplay: true })).toBe(
      'https://www.youtube-nocookie.com/embed/PV6Em-k0xYs?autoplay=1',
    );
  });
  it('returns null when no id can be parsed', () => {
    expect(embedUrl('nope')).toBeNull();
  });
});
