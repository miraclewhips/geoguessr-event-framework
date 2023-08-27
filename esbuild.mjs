import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['./geoguessr-event-framework.js'],
  outfile: './geoguessr-event-framework.min.js',
	minify: true,
});

await esbuild.build({
  entryPoints: ['./geoguessr-streak-framework.js'],
  outfile: './geoguessr-streak-framework.min.js',
	minify: true,
});