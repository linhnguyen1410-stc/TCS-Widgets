// Facade kept for stable imports (mendixDataAdapter + specs). Implementation is
// split per DEBT D-2: load in planLoader, save in planSaver.
export { loadPackingPlan } from "./planLoader";
export { savePackingPlan } from "./planSaver";
