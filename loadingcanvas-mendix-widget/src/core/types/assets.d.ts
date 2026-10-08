// Ambient declarations for static asset imports bundled by rollup.
// Replaces the wildcard asset module declarations previously provided by "vite/client" types.
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.css";
