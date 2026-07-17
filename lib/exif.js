const APERTURES = ["f/1.4", "f/1.8", "f/2.0", "f/2.8", "f/4", "f/5.6"];
const SHUTTERS = ["1/60s", "1/125s", "1/250s", "1/500s", "1/1000s", "1/30s"];
const ISOS = [100, 200, 400, 800, 1600];

export function generateExif() {
  return {
    aperture: APERTURES[Math.floor(Math.random() * APERTURES.length)],
    shutter: SHUTTERS[Math.floor(Math.random() * SHUTTERS.length)],
    iso: ISOS[Math.floor(Math.random() * ISOS.length)],
  };
}
