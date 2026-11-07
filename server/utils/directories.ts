import { join } from "node:path";
import { type Directories, expandPath } from "./paths";

/** The configured directories, see runtimeConfig in nuxt.config.ts. */
export function useDirectories(): Directories {
  const config = useRuntimeConfig();
  const source = expandPath(config.sourceDir);

  return {
    source,
    output: config.outputDir
      ? expandPath(config.outputDir)
      : join(source, "output"),
    cache: expandPath(config.cacheDir),
  };
}
