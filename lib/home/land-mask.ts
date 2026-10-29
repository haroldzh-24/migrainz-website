// Land/water mask of the world for the homepage signal globe: 144x72 cells (2.5 degrees each), row 0 at 90N, column 0 at
// 180W, one bit per cell (1 = land), most significant bit first, base64. Generated once from the public-domain NOAA GLOBE
// land mask (Python package global-land-mask): a cell is land when at least a third of nine samples inside it are land.
// Static data; nothing is fetched at runtime.
export const LAND_W = 144;
export const LAND_H = 72;
const LAND_B64 = [
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC/////AAAAAAAAAAAAAAAAA',
  'AT/P//8AB8AAAAAAAAAAAAAAaL8P//+AAAAAAAP4AAAAAAAD8L8Af/8AAAAGAD/4AAAAAEACfm/wP/4AAAAEG/////gAg////n54',
  'P/wAAf4F////////4/////4+H8BAB///////////A/////c8HwGAH3//////////A////8BwBgAAPn////////74AOB//+B+AAAA',
  'Pj///////4GAAAA///h/AAACHP///////gOAAAAf//7/gAAPH////////wMAAAAH////wAAD/////////8AAAAAD///+4AAB////',
  '/////wAAAAAD///8AAAB/////////gAAAAAD///wAAAB6/D//////MAAAAAD///gAAAPh/7/////8IAAAAAB///AAAAPAN//////',
  'IIAAAAAB///AAAAE8Bf/////kwAAAAAA//+AAAAH+AP/////BAAAAAAAf/8AAAAP/u//////iAAAAAAAP8EAAAAf////////gAAA',
  'AAAAD4EAAAA////x////AAAAAAAAB4AAAAA///3+H//+gAAAAAAAA4iAAAB///7/D+foAAAAAAAAA9gQAAB///7+B8fgAAAAAAAA',
  'APgAAAB///94B4PggAAAAAAAAA4AAAB////gAwHwgAAAAAAAAAY4AAB////QAwBwQAAAAAAAAAN/AAAf///wAIEAQAAAAAAAAAB/',
  'gAAP///wAICCIAAAAAAAAAB/8AAAH//gAAGGAAAAAAAAAAD/8AAAD//AAAGOAAAAAAAAAAD//AAAD/+AAADOhAAAAAAAAAD//4AA',
  'D/8AAABnh8AAAAAAAAD//8AAB/8AAAAwAeAAAAAAAAD//8AAB/8AAAAAALAAAAAAAAB//4AAB/8AAAAAAAAAAAAAAAB//4AAB/8Q',
  'AAAADkAAAAAAAAA//wAAB/8wAAAAfsAAAAAAAAAP/wAAB/4wAAAAf+AAAAAAAAAP/wAAB/xgAAAD//AAAAAAAAAP/AAAA/xgAAAH',
  '//gAAAAAAAAP+AAAA/gAAAAD//gAAAAAAAAf8AAAA/gAAAAD//gAAAAAAAAf8AAAAfAAAAAD//gAAAAAAAAf4AAAAeAAAAADw/gA',
  'AAAAAAAfgAAAAAAAAAAAAPAAAAAAAAAfgAAAAAAAAAAAAAACAAAAAAA+AAAAAAAAAAAAACAEAAAAAAA8AAAAAAAAAAAAAAAIAAAA',
  'AAA4AAAAAAAAAAAAAAAQAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAA',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAA',
  'AAAMAADsDgAAAAAAAAAGAAAAAAT/8f////wAAAAAAAAeAAAM///////////wAAAAAP//AAB////////////gAAf////4AAf/////',
  '//////+AAD/////ADD////////////+AAD/////4Hf////////////+AAP/////////////////////8////////////////////',
  '////////////////////////////',
].join('');

let bits: Uint8Array | null = null;
function decode(): Uint8Array {
  if (bits) return bits;
  const raw = atob(LAND_B64);
  const out = new Uint8Array(LAND_W * LAND_H);
  for (let i = 0; i < out.length; i++) out[i] = (raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
  bits = out;
  return out;
}

/** True when the 2.5-degree cell containing (lat, lon) is mostly land. Latitude -90..90, longitude any value (wraps). */
export function isLand(lat: number, lon: number): boolean {
  const row = Math.min(LAND_H - 1, Math.max(0, Math.floor((90 - lat) / (180 / LAND_H))));
  const wrapped = ((lon + 180) % 360 + 360) % 360;
  const col = Math.min(LAND_W - 1, Math.floor(wrapped / (360 / LAND_W)));
  return decode()[row * LAND_W + col] === 1;
}
