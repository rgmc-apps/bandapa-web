export type TransitionBand = {
  id: string;
  name: string;
  image_url: string | null;
  genres: string[];
};

let _cached: TransitionBand | null = null;

export function setTransitionBand(band: TransitionBand | null): void {
  _cached = band;
}

export function getTransitionBand(): TransitionBand | null {
  return _cached;
}
