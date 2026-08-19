/*
 * YouTube URL helpers. Exercise `video_url`s come in `watch?v=`, `youtu.be/`
 * and `youtube.com/shorts/` forms (see seed data); both the Moves library and
 * the workout logger embed them privacy-first via youtube-nocookie.
 */

/** Extract the 11-char YouTube id from a watch, youtu.be or shorts URL. */
export function youTubeId(url: string): string | null {
  const m = url.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Privacy-friendly embed URL for a video id, or null if the URL has no id. */
export function embedUrl(url: string, { autoplay = false } = {}): string | null {
  const id = youTubeId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}${autoplay ? '?autoplay=1' : ''}`;
}
