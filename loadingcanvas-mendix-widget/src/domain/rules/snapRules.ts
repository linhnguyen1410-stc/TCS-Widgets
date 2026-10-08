export const snapToGrid = (value: number, gridSize: number): number => {
  if (gridSize <= 0) {
    return value;
  }

  return Math.round(value / gridSize) * gridSize;
};

export const snapPosition = (x: number, y: number, gridSize: number): { x: number; y: number } => {
  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  };
};
