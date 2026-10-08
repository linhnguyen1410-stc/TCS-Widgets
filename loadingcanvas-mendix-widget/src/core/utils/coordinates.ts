export const meterToPixel = (meter: number, scale: number): number => {
  return meter * scale;
};

export const pixelToMeter = (pixel: number, scale: number): number => {
  return pixel / scale;
};
