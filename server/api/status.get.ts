export default defineEventHandler(async (event): Promise<Status> => {
  const dirs = useDirectories(event);
  const [lutgen, vips, unwritable] = await Promise.all([
    lutgenVersion(),
    vipsVersion(),
    unwritableDirectories(dirs),
  ]);

  return {
    lutgen,
    vips,
    sourceDir: dirs.source,
    outputDir: dirs.output,
    unwritable,
    user: process.getuid ? `${process.getuid()}:${process.getgid!()}` : null,
  };
});
