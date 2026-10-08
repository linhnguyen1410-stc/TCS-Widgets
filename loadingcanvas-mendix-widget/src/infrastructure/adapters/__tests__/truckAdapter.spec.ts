import { describe, it, expect } from "@jest/globals";
import { truckSelectionToTruckItem, truckToTruckItem, computeScale } from "../truckAdapter";
import { Truck } from "../../../core/types/Truck";
import { getRotatedScreenSize } from "../../../domain/rules/rotationRules";
import {
  DEFAULT_CANVAS_WIDTH,
  TRUCK_CANVAS_WIDTH,
  TRUCK_CANVAS_LEFT,
  TRUCK_FRAME_HEIGHT_PX,
  TRUCK_DRAWING_MIDLINE_Y,
  TRUCK_BACKGROUND_IMAGE_WIDTH,
  TRUCK_BACKGROUND_LOAD_Y,
  TRUCK_BACKGROUND_LOAD_HEIGHT,
} from "../../../core/constants/canvas";

describe("truckAdapter", () => {
  const scale = { widthScale: 50, heightScale: 50 };

  describe("truckSelectionToTruckItem", () => {
    it("should convert TruckSelectionData to TruckItem", () => {
      const truck = {
        id: "truck-1",
        code: "TRUCK-001",
        truckType: "DryVan" as const,
        maxPayloadKg: 20000,
        axleCount: 2,
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
        maxLoadMeters: 12,
      };
      const result = truckSelectionToTruckItem(truck, scale);
      // Measurement: synthetic fixture at a fixed scale of 50 px/m —
      // 12x2.5m -> frame 600 x 125 px, frameY = 191.29 - 125/2 = 128.79.
      expect(result.id).toBe("truck-1");
      expect(result.code).toBe("TRUCK-001");
      expect(result.truckType).toBe("DryVan");
      expect(result.maxPayloadKg).toBe(20000);
      expect(result.axleCount).toBe(2);
      expect(result.maxLoadMeters).toBe(12);
      expect(result.length).toBe(600);
      expect(result.width).toBe(125);
      expect(result.x).toBe(TRUCK_CANVAS_LEFT);
      expect(result.y).toBe(TRUCK_DRAWING_MIDLINE_Y - 125 / 2);
      expect(result.rotation).toBe(0);
    });

    it("should use default values when optional fields are missing", () => {
      const truck = {
        id: "truck-2",
        internalLengthMeter: 10,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
      };
      const result = truckSelectionToTruckItem(truck, scale);
      expect(result.code).toBe("TRUCK");
      expect(result.truckType).toBe("Tauliner");
      expect(result.maxPayloadKg).toBe(0);
      expect(result.axleCount).toBe(2);
      expect(result.maxLoadMeters).toBe(10);
    });

    it("should use custom position when provided", () => {
      const truck = {
        id: "truck-1",
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
      };
      const result = truckSelectionToTruckItem(truck, scale, { x: 50, y: 50 });
      expect(result.x).toBe(50);
      expect(result.y).toBe(50 - 125 / 2);
    });

    it("should clamp an oversized frame to the canvas band height", () => {
      const truck = {
        id: "truck-3",
        internalLengthMeter: 12,
        internalWidthMeter: 10,
        internalHeightMeter: 2.5,
      };
      const result = truckSelectionToTruckItem(truck, scale);
      // Measurement: 10m tall at 50 px/m would be 500px -> clamps to 297;
      // frameY = 191.29 - 297/2 = 42.79.
      expect(result.width).toBe(TRUCK_FRAME_HEIGHT_PX);
      expect(result.y).toBe(TRUCK_DRAWING_MIDLINE_Y - TRUCK_FRAME_HEIGHT_PX / 2);
    });
  });

  describe("truckToTruckItem", () => {
    it("should convert Truck business model to TruckItem", () => {
      const truck: Truck = {
        id: "truck-1",
        code: "TRUCK-001",
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
        maxPayloadKg: 20000,
        axleCount: 2,
        truckType: "DryVan",
        maxLoadMeters: 12,
      };
      const result = truckToTruckItem(truck, scale);
      expect(result.id).toBe("truck-1");
      expect(result.code).toBe("TRUCK-001");
      expect(result.length).toBe(600);
      expect(result.width).toBe(125);
    });
  });

  describe("computeScale", () => {
    // Fixture 12x2.5m: scale = 297/2.5 = 118.8 px/m -> 12x118.8 = 1425.6 <= 1453, so it fits.
    const truck = {
      id: "truck-1",
      internalLengthMeter: 12,
      internalWidthMeter: 2.5,
      internalHeightMeter: 2.5,
    };

    it("should compute a single uniform scale that fits both dimensions", () => {
      const scale = computeScale(truck);
      expect(scale.widthScale).toBeCloseTo(TRUCK_FRAME_HEIGHT_PX / 2.5);
      expect(scale.heightScale).toBeCloseTo(TRUCK_FRAME_HEIGHT_PX / 2.5);
      expect(scale.widthScale).toBe(scale.heightScale);
    });

    it("should subtract padding before dividing", () => {
      const scale = computeScale(truck, 100);
      expect(scale.widthScale).toBeCloseTo((TRUCK_FRAME_HEIGHT_PX - 100) / 2.5);
      expect(scale.heightScale).toBeCloseTo((TRUCK_FRAME_HEIGHT_PX - 100) / 2.5);
    });

    it("should clamp available pixels to the 100px floor before dividing", () => {
      const scale = computeScale(truck, 250);
      expect(scale.widthScale).toBeCloseTo(100 / 2.5);
      expect(scale.heightScale).toBeCloseTo(100 / 2.5);
    });

    it("should fall back to default truck dimensions when values are not positive", () => {
      const scale = computeScale({
        id: "truck-2",
        internalLengthMeter: 0,
        internalWidthMeter: -3,
        internalHeightMeter: 2.5,
      });
      expect(scale.widthScale).toBeCloseTo(TRUCK_CANVAS_WIDTH / 13.6);
      expect(scale.heightScale).toBeCloseTo(TRUCK_CANVAS_WIDTH / 13.6);
    });

    it("should keep a rotated item's rendered shape consistent (regression)", () => {
      const scale = computeScale({
        id: "truck-1",
        internalLengthMeter: 13.6,
        internalWidthMeter: 2.45,
        internalHeightMeter: 2.5,
      });
      const pallet = { length: 1 * scale.widthScale, width: 1.2 * scale.heightScale };

      const rotated = getRotatedScreenSize(pallet, 90, scale);

      expect(rotated.length).toBeCloseTo(pallet.width);
      expect(rotated.width).toBeCloseTo(pallet.length);
      expect(rotated.length / scale.widthScale).toBeCloseTo(1.2);
      expect(rotated.width / scale.heightScale).toBeCloseTo(1);
    });
  });

  describe("truck fleet measurements (DB-verified TechnicalDetails dimensions)", () => {
    // Drawn truck bed in canvas px: image 1275x271 rendered at 100% of the 1800px
    // canvas width, pinned to the top; raw bed rect (234,30) 1030x212 -> scale 1.41176.
    const imgScale = DEFAULT_CANVAS_WIDTH / TRUCK_BACKGROUND_IMAGE_WIDTH;
    const bedTop = TRUCK_BACKGROUND_LOAD_Y * imgScale; // ~42.35
    const bedBottom = (TRUCK_BACKGROUND_LOAD_Y + TRUCK_BACKGROUND_LOAD_HEIGHT) * imgScale; // ~341.65

    // Full measurement derivation for one truck, asserted end to end:
    // case -> uniform scale -> frame length/width -> x/frameY -> midline -> bed containment.
    const assertMeasurements = (
      name: string,
      lengthM: number,
      widthM: number,
      expected: { caseFits: boolean; scale: number; frameLength: number; frameWidth: number }
    ) => {
      const data = { id: name, internalLengthMeter: lengthM, internalWidthMeter: widthM, internalHeightMeter: 2.5 };
      const s = computeScale(data);
      expect(s.widthScale).toBeCloseTo(expected.scale);
      expect(s.heightScale).toBeCloseTo(expected.scale);
      const item = truckSelectionToTruckItem(data, s);
      expect(item.length).toBeCloseTo(expected.frameLength);
      expect(item.width).toBeCloseTo(expected.frameWidth);
      expect(item.x).toBe(TRUCK_CANVAS_LEFT);
      expect(item.y).toBeCloseTo(TRUCK_DRAWING_MIDLINE_Y - expected.frameWidth / 2);
      expect(item.y + item.width / 2).toBeCloseTo(TRUCK_DRAWING_MIDLINE_Y, 0);
      expect(item.y).toBeGreaterThanOrEqual(bedTop - 0.5);
      expect(item.y + item.width).toBeLessThanOrEqual(bedBottom + 0.5);
      if (expected.caseFits) {
        expect(item.width).toBeCloseTo(TRUCK_FRAME_HEIGHT_PX);
        expect(item.length).toBeLessThanOrEqual(TRUCK_CANVAS_WIDTH);
      } else {
        expect(item.length).toBe(TRUCK_CANVAS_WIDTH);
        expect(item.width).toBeLessThan(TRUCK_FRAME_HEIGHT_PX);
      }
    };

    it("drawing midline derives from the image geometry (1275x271 @ 100% of 1800): ~191.29", () => {
      expect(TRUCK_DRAWING_MIDLINE_Y).toBeCloseTo(191.29);
    });

    // Car / Car ADR 2 axels / Car Coole Freeze — 0.60 x 0.90 m.
    // Fits: scale = 297/0.9 = 330 px/m; frame 198 x 297 @ (333, 42.79).
    it("Car group (0.60x0.90m): fits — 198 x 297 @ (333, 42.79)", () => {
      assertMeasurements("car", 0.6, 0.9, { caseFits: true, scale: 330, frameLength: 198, frameWidth: 297 });
    });

    // Van / Van ADR / Van Coole Freeze — 3.00 x 1.60 m.
    // Fits: scale = 297/1.6 = 185.625 px/m; frame 556.88 x 297 @ (333, 42.79).
    it("Van group (3.00x1.60m): fits — 556.88 x 297 @ (333, 42.79)", () => {
      assertMeasurements("van", 3, 1.6, { caseFits: true, scale: 185.625, frameLength: 556.875, frameWidth: 297 });
    });

    // Truck 20FT — 6.06 x 2.44 m. Fits: scale = 297/2.44 = 121.72 px/m;
    // frame 737.63 x 297 @ (333, 42.79).
    it("20FT (6.06x2.44m): fits — 737.63 x 297 @ (333, 42.79)", () => {
      assertMeasurements("t20ft", 6.06, 2.44, {
        caseFits: true,
        scale: 121.721,
        frameLength: 737.631,
        frameWidth: 297,
      });
    });

    // Truck 12T / 12T ADR / 12T Coole Freeze / 20FT Coole Freeze — 10.00 x 2.40 m.
    // Fits: scale = 297/2.4 = 123.75 px/m; frame 1237.50 x 297 @ (333, 42.79)
    // — fills the drawn bed (42.35 -> 341.65), the classic look.
    it("12T group (10.00x2.40m): fits — 1237.50 x 297 @ (333, 42.79)", () => {
      assertMeasurements("t12", 10, 2.4, { caseFits: true, scale: 123.75, frameLength: 1237.5, frameWidth: 297 });
    });

    // Truck 40T / 40T ADR / 40T Coole Freeze /  40T / 40FT ADR — 12.192 x 2.350 m.
    // Capped: scale = 1453/12.192 = 119.18 px/m; frame 1453 x 280.06 @ (333, 51.26).
    it("40T group (12.192x2.350m): capped — 1453 x 280.06 @ (333, 51.26)", () => {
      assertMeasurements("t40t", 12.192, 2.35, {
        caseFits: false,
        scale: 119.177,
        frameLength: TRUCK_CANVAS_WIDTH,
        frameWidth: 280.065,
      });
    });

    // Truck 40FT / 40FT Cool Freeze — 12.192 x 2.352 m.
    // Capped: scale = 119.18 px/m; frame 1453 x 280.30 @ (333, 51.14).
    it("40FT group (12.192x2.352m): capped — 1453 x 280.30 @ (333, 51.14)", () => {
      assertMeasurements("t40ft", 12.192, 2.352, {
        caseFits: false,
        scale: 119.177,
        frameLength: TRUCK_CANVAS_WIDTH,
        frameWidth: 280.303,
      });
    });

    // Truck Tautliner (NL-NG-05 / NL-QZ-06 / NL-MS-07) — 13.60 x 2.45 m.
    // Capped: scale = 1453/13.6 = 106.84 px/m; frame 1453 x 261.75 @ (333, 60.42).
    it("Tautliner (13.60x2.45m): capped — 1453 x 261.75 @ (333, 60.42)", () => {
      assertMeasurements("tlin", 13.6, 2.45, {
        caseFits: false,
        scale: 106.838,
        frameLength: TRUCK_CANVAS_WIDTH,
        frameWidth: 261.754,
      });
    });

    // Truck and Hanger 40 T / 40FT — 17.93 x 2.352 m.
    // Capped: scale = 1453/17.93 = 81.04 px/m; frame 1453 x 190.60 @ (333, 95.99).
    it("Truck+Hanger group (17.93x2.352m): capped — 1453 x 190.60 @ (333, 95.99)", () => {
      assertMeasurements("th", 17.93, 2.352, {
        caseFits: false,
        scale: 81.037,
        frameLength: TRUCK_CANVAS_WIDTH,
        frameWidth: 190.6,
      });
    });

    // Truck 20FT ADR / 20T ADR / 20T Coole Freeze — 20.00 x 2.352 m.
    // Capped: scale = 1453/20 = 72.65 px/m; frame 1453 x 170.87 @ (333, 105.86).
    it("20m group (20.00x2.352m): capped — 1453 x 170.87 @ (333, 105.86)", () => {
      assertMeasurements("t20", 20, 2.352, {
        caseFits: false,
        scale: 72.65,
        frameLength: TRUCK_CANVAS_WIDTH,
        frameWidth: 170.873,
      });
    });

    it("default fallback (13.6x2.45m) measures identically to the Tautliner", () => {
      const s = computeScale({ id: "def", internalLengthMeter: 0, internalWidthMeter: 0, internalHeightMeter: 2.5 });
      // Defaults 13.6 x 2.45 -> case 2, scale = 1453/13.6 = 106.84 px/m.
      expect(s.widthScale).toBeCloseTo(TRUCK_CANVAS_WIDTH / 13.6);
      expect(s.heightScale).toBeCloseTo(TRUCK_CANVAS_WIDTH / 13.6);
    });
  });
});
