import {PDFDocument} from "pdf-lib";
import {FileUtils} from "utils/FileUtils";
import * as pdfjs from "pdfjs-dist";
import {ImageUtils} from "./ImageUtils";
pdfjs.GlobalWorkerOptions.workerSrc = "libs/pdfjs/pdf.worker.min.js";

interface ISnapShotConfig
{
	scale: number;
	offsetX: number;
	offsetY: number;
	maxSize: number;
	isBackground: boolean;
	isTransparent: boolean;
}

export class PDFRenderer
{
	private static _url: string;
	private static _pdf: pdfjs.PDFProxy;
	private static _page: pdfjs.PDFPageProxy;
	private static _pdfViewBox: number[];
	private static _cropLeft: number;
	private static _cropBottom: number;
	private static _pdfPageWidth: number;
	private static _pdfPageHeight: number;
	private static _canvas: HTMLCanvasElement = document.createElement("canvas");
	private static _context: CanvasRenderingContext2D = PDFRenderer._canvas.getContext("2d");

	private static _queueToProcess: {
		snapShotConfig: ISnapShotConfig;
		pdf?: PDFDocument;
		tileID?: string;
		resolve: (url: string) => void
	}[] = [];
	private static _isProcessing: boolean = false;

	private static _thumbnailCache: {
		[key: string]: Promise<string>;
	} = {};

	private static _processOrder: "LIFO" | "FIFO" = "FIFO";

	public static setProcessOrder(order: "LIFO" | "FIFO")
	{
		PDFRenderer._processOrder = order;
	}

	private static _background: "transparent" | "white" = "white";

	public static setBackground(value: "transparent" | "white")
	{
		PDFRenderer._background = value;
	}

	public static async savePDFValues(pdf: string | PDFDocument)
	{
		let url: string = null;
		if (pdf instanceof PDFDocument)
		{
			const byteArray = await pdf.save();
			url = FileUtils.createURLFromData(byteArray);
		}
		else
		{
			url = pdf;
		}
		PDFRenderer._url = url;

		PDFRenderer._pdf = await pdfjs.getDocument(PDFRenderer._url).promise;

		console.log("PDF Loaded");

		PDFRenderer._page = await PDFRenderer._pdf.getPage(1);

		PDFRenderer._pdfViewBox = PDFRenderer._page.view;

		if ((PDFRenderer._page.rotate / 90) % 2 === 0)
		{
			PDFRenderer._cropLeft = PDFRenderer._pdfViewBox[0];
			PDFRenderer._cropBottom = PDFRenderer._pdfViewBox[1];
			PDFRenderer._pdfPageWidth = PDFRenderer._pdfViewBox[2] - PDFRenderer._cropLeft;
			PDFRenderer._pdfPageHeight = PDFRenderer._pdfViewBox[3] - PDFRenderer._cropBottom;
		}
		else
		{
			PDFRenderer._cropLeft = PDFRenderer._pdfViewBox[1];
			PDFRenderer._cropBottom = PDFRenderer._pdfViewBox[0];
			PDFRenderer._pdfPageWidth = PDFRenderer._pdfViewBox[3] - PDFRenderer._cropLeft;
			PDFRenderer._pdfPageHeight = PDFRenderer._pdfViewBox[2] - PDFRenderer._cropBottom;
		}
	}

	public static async init(pdf: string | PDFDocument)
	{
		await PDFRenderer.savePDFValues(pdf);
	}

	private static async getSnapShot(config: ISnapShotConfig)
	{
		if (PDFRenderer._page)
		{
			const viewport: pdfjs.PDFPageViewport = PDFRenderer._page.getViewport({
				viewBox: PDFRenderer._pdfViewBox,
				scale: config.scale,
				rotation: PDFRenderer._page.rotate,
				offsetX: -config.offsetX,
				offsetY: -config.offsetY,
				dontFlip: false
			});

			if (config.isBackground)
			{
				const aspect = PDFRenderer._pdfPageWidth / PDFRenderer._pdfPageHeight;

				if (aspect >= 1)
				{
					PDFRenderer._canvas.width = config.maxSize;
					PDFRenderer._canvas.height = PDFRenderer._canvas.width / aspect;
				}
				else
				{
					PDFRenderer._canvas.height = config.maxSize;
					PDFRenderer._canvas.width = PDFRenderer._canvas.height * aspect;
				}
			}
			else
			{
				// Tile
				PDFRenderer._canvas.width = config.maxSize;
				PDFRenderer._canvas.height = config.maxSize;
			}

			// Render PDF page into canvas context
			const renderContext = {
				canvasContext: PDFRenderer._context,
				background: config.isTransparent ? "rgb(255, 255, 255, 0)" : null,
				viewport: viewport
			};

			await PDFRenderer._page.render(renderContext).promise;

			return PDFRenderer._context;
		}
		else
		{
			return null;
		}
	}

	public static clearQueue()
	{
		PDFRenderer._queueToProcess.length = 0;
	}

	public static async processQueue()
	{
		if (!PDFRenderer._isProcessing)
		{
			if (PDFRenderer._queueToProcess.length > 0)
			{
				PDFRenderer._isProcessing = true;
				const queueElement = PDFRenderer._processOrder === "LIFO" ? PDFRenderer._queueToProcess.pop() : PDFRenderer._queueToProcess.shift();
				const resolve = queueElement.resolve;
				const snapShotConfig = queueElement.snapShotConfig;

				const pdf = queueElement.pdf;

				if (pdf)
				{
					await PDFRenderer.init(pdf);

					const aspect = PDFRenderer._pdfPageWidth / PDFRenderer._pdfPageHeight;
					snapShotConfig.scale = snapShotConfig.maxSize / (aspect >= 1 ? PDFRenderer._pdfPageWidth : PDFRenderer._pdfPageHeight);
				}

				const context = await PDFRenderer.getSnapShot(snapShotConfig);

				console.log("tile rasterized");

				const url = URL.createObjectURL(await FileUtils.canvasToBlob(context.canvas));

				resolve(url);

				PDFRenderer._isProcessing = false;

				if (PDFRenderer._queueToProcess.length > 0)
				{
					PDFRenderer.processQueue();
				}
			}
		}
	}

	/**
	 * 
	 * @param maxSize 
	 * @param pdf If omitted, the last initialized PDF will be used
	 */
	private static getFullImageURLFromPDF(maxSize: number, pdf: PDFDocument)
	{
		return new Promise<string>((resolve, reject) =>
		{
			PDFRenderer._queueToProcess.push({
				snapShotConfig: {
					scale: null, // will be calculated on the fly
					maxSize: maxSize,
					offsetX: 0,
					offsetY: 0,
					isBackground: true,
					isTransparent: true
				},
				pdf: pdf,
				resolve: resolve
			});

			if (!PDFRenderer._isProcessing)
			{

				PDFRenderer.processQueue();
			}
		});
	}

	/**
	 * 
	 * @param maxSize max(width, height)
	 * @param pdf 
	 * @param cacheKey If you'd like to cache the thumbnail, you should give a unique name. It will be saved at _cache[cacheKey]
	 */
	public static async getThumbnailAndViewBox(maxSize: number, pdf: PDFDocument, cacheKey: string, rotation: number)
	{
		if (cacheKey)
		{
			if (!this._thumbnailCache[cacheKey])
			{
				this._thumbnailCache[cacheKey] = PDFRenderer.getFullImageURLFromPDF(maxSize, pdf);
			}

			if (!this._thumbnailCache[`${cacheKey}_${rotation}`])
			{
				const imgSrcWithoutRotation = await this._thumbnailCache[cacheKey];
				const img = await ImageUtils.loadImage(imgSrcWithoutRotation);
				this._thumbnailCache[`${cacheKey}_${rotation}`] = new Promise<string>((resolve, reject) =>
				{
					resolve(ImageUtils.rotateImage(img, rotation));
				});
			}

			return this._thumbnailCache[`${cacheKey}_${rotation}`];
		}
		else
		{
			return PDFRenderer.getFullImageURLFromPDF(maxSize, pdf);
		}
	}

	public static get isPending()
	{
		return PDFRenderer._isProcessing || PDFRenderer._queueToProcess.length > 0;
	}
}