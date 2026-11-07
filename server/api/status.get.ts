export default defineEventHandler(async (): Promise<Status> => {
  const dirs = useDirectories();
  const [lutgen, vips] = await Promise.all([lutgenVersion(), vipsVersion()]);

  return {
    lutgen,
    vips,
    sourceDir: dirs.source,
    outputDir: dirs.output,
  };
});
