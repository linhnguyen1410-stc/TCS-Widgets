// card

export const CARD_BORDER_WIDTH = 1;

export const CARD_SELECTED_BORDER_WIDTH = 3;

export const CARD_ACTIVE_BORDER_WIDTH = 3;

export const CARD_BORDER_COLOR = "gray";

export const CARD_SELECTED_BORDER_COLOR = "blue";

export const CARD_ACTIVE_BORDER_COLOR = "red";

export const CARD_ERROR_BORDER_COLOR = "#ff4444";

// Lift the pressed/dragged card above settled cargo: all cards are z-index
// auto, so DOM order alone lets later cards paint over the active one.
export const CARD_ACTIVE_Z_INDEX = 20;
export const CARD_DEFAULT_Z_INDEX = 10;
