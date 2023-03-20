import {createServer} from "vite";

(async () =>
{
	const server = await createServer({
		// any valid user config options, plus `mode` and `configFile`
		configFile: "./vite.config.ts",
		root: "./src",
		css: {
			devSourcemap: true
		},
		server: {
			port: 3000
		}
	})
	await server.listen()

	server.printUrls()
})()
