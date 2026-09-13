/**
 * The card renderer can't measure text, so a value that might not fit its
 * space is fitted up front: the largest of `sizes` at which it should fit in
 * `lines` lines of `width` design pixels, and only if even the smallest size
 * won't do, a shortened value ending in "…".
 *
 * `widthFactor` is the typeface's average character width as a fraction of
 * its size (about 0.6 for Inter in mixed case, 0.72 for bold capitals). The
 * 0.9 leaves room for word wrapping, which never fills a line exactly.
 */
export function fitText(
  text: string,
  options: { sizes: number[]; lines: number; widthFactor: number; width: number },
): { size: number; text: string } {
  const capacity = (size: number) =>
    Math.floor((options.width / (size * options.widthFactor)) * options.lines * 0.9);

  for (const size of options.sizes) {
    if (text.length <= capacity(size)) return { size, text };
  }
  const size = options.sizes[options.sizes.length - 1];
  const max = Math.max(1, capacity(size) - 1);
  return { size, text: `${text.slice(0, max).trimEnd()}…` };
}
