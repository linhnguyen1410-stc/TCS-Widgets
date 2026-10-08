import type { FC, MouseEvent } from "react";

import {
  ROTATION_HANDLE_TOP,
  ROTATION_HANDLE_SIZE,
  ROTATION_HANDLE_COLOR,
  ROTATION_HANDLE_FONT_SIZE,
  ROTATION_HANDLE_FONT_WEIGHT,
  ROTATION_HANDLE_BORDER,
  ROTATION_HANDLE_BORDER_RADIUS,
  ROTATION_HANDLE_Z_INDEX,
} from "../../core/constants/rotationHandle";

interface RotationHandleProps {
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
}

export const RotationHandle: FC<RotationHandleProps> = ({ onMouseDown }) => {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        top: ROTATION_HANDLE_TOP,
        left: "50%",
        transform: "translateX(-50%)",
        width: ROTATION_HANDLE_SIZE,
        height: ROTATION_HANDLE_SIZE,
        backgroundColor: "transparent",
        borderRadius: ROTATION_HANDLE_BORDER_RADIUS,
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: ROTATION_HANDLE_COLOR,
        fontSize: ROTATION_HANDLE_FONT_SIZE,
        fontWeight: ROTATION_HANDLE_FONT_WEIGHT,
        border: ROTATION_HANDLE_BORDER,
        boxShadow: "none",
        zIndex: ROTATION_HANDLE_Z_INDEX,
      }}
      title="Rotate">
      ↻
    </div>
  );
};
