export function jakartaDayRange(now = new Date()) {
  const jakartaOffset = 7 * 60 * 60 * 1000;
  const localDay = new Date(now.getTime() + jakartaOffset);
  const start = Date.UTC(
    localDay.getUTCFullYear(),
    localDay.getUTCMonth(),
    localDay.getUTCDate(),
  );
  return {
    start: new Date(start - jakartaOffset),
    end: new Date(start - jakartaOffset + 24 * 60 * 60 * 1000),
  };
}
