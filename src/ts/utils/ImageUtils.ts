import {MathUtils} from "./MathUtils";

export class ImageUtils
{
	public static readonly clearFillStyle = "rgba(255, 255, 255, 0.004)"; // 1 / 255 ~ 0.004

	private static _canvas: HTMLCanvasElement;
	private static _ctx: CanvasRenderingContext2D;

	public static get canvas()
	{
		if (!ImageUtils._canvas)
		{
			ImageUtils._canvas = document.createElement("canvas");
		}

		return ImageUtils._canvas;
	}

	public static get ctx()
	{
		if (!ImageUtils._ctx)
		{
			ImageUtils._ctx = ImageUtils.canvas.getContext("2d")!;
		}

		return ImageUtils._ctx;
	}

	public static loadImage(url: string, imgElement: HTMLImageElement = document.createElement("img"))
	{
		return new Promise<HTMLImageElement>((resolve, reject) =>
		{
			imgElement;
			imgElement.crossOrigin = "anonymous";
			imgElement.onload = () =>
			{
				resolve(imgElement);
			};

			imgElement.src = url;
		});
	}

	private static calcProjectedRectSizeOfRotatedRect(size: {width: number; height: number}, rad: number)
	{
		const {width, height} = size;

		const rectProjectedWidth = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
		const rectProjectedHeight = Math.abs(width * Math.sin(rad)) + Math.abs(height * Math.cos(rad));

		return {
			width: rectProjectedWidth,
			height: rectProjectedHeight
		};
	}

	/**
	 * By default, we have a strange, thin, black border around the texture's non-transparent parts (probably it's due to the canvas' premultiplied-alpha).
	 * There are some workarounds to solve this, one of the simplest is this.
	 */
	private static removeBlackBorders(ctx: CanvasRenderingContext2D)
	{
		ctx.fillStyle = ImageUtils.clearFillStyle;
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	}

	/**
	 * https://stackoverflow.com/questions/17411991/html5-canvas-rotate-image
	 * https://jsfiddle.net/casamia743/xqh48gno/
	 * angle in degrees (ClockWise (CW) is the positive direction)
	 * returns base64 png
	 */
	public static rotateImage(image: HTMLImageElement, angle: number, filter: string = "")
	{
		if (angle === 0)
		{
			return image.src;
		}

		const boundaryRad = Math.atan(image.width / image.height);
		let degree = angle % 360;
		if (degree < 0)
		{
			degree += 360;
		}

		const rad = MathUtils.DEG2RAD * degree;

		const {width, height} = ImageUtils.calcProjectedRectSizeOfRotatedRect(
			{
				width: image.width,
				height: image.height
			},
			rad
		);

		ImageUtils.canvas.width = width;
		ImageUtils.canvas.height = height;

		const ctx = ImageUtils.ctx;
		ctx.save();

		const sinHeight = image.height * Math.abs(Math.sin(rad));
		const cosHeight = image.height * Math.abs(Math.cos(rad));
		const cosWidth = image.width * Math.abs(Math.cos(rad));
		const sinWidth = image.width * Math.abs(Math.sin(rad));

		// Workaround no longer needed (yOrigin can stay 0 instead of 1), once this PR gets merged: https://github.com/Hopding/pdf-lib/pull/502
		let xOrigin: number = 0;
		let yOrigin: number = 0;

		if (rad < boundaryRad)
		{
			xOrigin = Math.min(sinHeight, cosWidth);
		}
		else if (rad < Math.PI / 2)
		{
			xOrigin = Math.max(sinHeight, cosWidth);
		}
		else if (rad < Math.PI / 2 + boundaryRad)
		{
			xOrigin = width;
			yOrigin = Math.min(cosHeight, sinWidth);
		}
		else if (rad < Math.PI)
		{
			xOrigin = width;
			yOrigin = Math.max(cosHeight, sinWidth);
		}
		else if (rad < Math.PI + boundaryRad)
		{
			xOrigin = Math.max(sinHeight, cosWidth);
			yOrigin = height;
		}
		else if (rad < Math.PI / 2 * 3)
		{
			xOrigin = Math.min(sinHeight, cosWidth);
			yOrigin = height;
		}
		else if (rad < Math.PI / 2 * 3 + boundaryRad)
		{
			yOrigin = Math.max(cosHeight, sinWidth);
		}
		else if (rad < Math.PI * 2)
		{
			yOrigin = Math.min(cosHeight, sinWidth);
		}

		ctx.translate(xOrigin, yOrigin);
		ctx.rotate(rad);
		ImageUtils.removeBlackBorders(ctx);
		const savedFilter = ctx.filter;
		ctx.filter = filter;
		ctx.drawImage(image, 0, 0, image.width, image.height);
		ctx.restore();
		ctx.filter = savedFilter;

		return ImageUtils.canvas.toDataURL();
	}
}
