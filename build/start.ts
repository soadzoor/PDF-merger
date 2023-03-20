import {createServer} from "vite";
import fs from "fs";

(async () =>
{
	fs.cpSync("node_modules/pdfjs-dist/build/pdf.worker.min.js", "src/temp/libs/pdfjs/pdf.worker.min.js", {recursive: true});
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
