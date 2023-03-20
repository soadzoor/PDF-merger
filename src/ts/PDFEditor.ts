import {degrees, PDFDocument, type PDFPage} from "pdf-lib";
import {ConfirmWindow} from "./popup/ConfirmWindow";
import type {IPDFDetails} from "./popup/PDFDetailsWindow";
import {PDFDetailsWindow} from "./popup/PDFDetailsWindow";
import {FileSelector} from "./utils/FileSelector";
import {FileUtils} from "./utils/FileUtils";
import {Functions} from "./utils/Functions";
import {HTMLFactory} from "./utils/HTMLFactory";
import {HTMLUtils} from "./utils/HTMLUtils";
import {ImageUtils} from "./utils/ImageUtils";
import {MathUtils} from "./utils/MathUtils";
import {PDFRenderer} from "./utils/PDFRenderer";
import {PDFSplitter} from "./utils/PDFSplitter";

interface IOnePagePDFDoc
{
	doc: PDFDocument;
	thumbnail: string;
	originalFileName: string;
	originalFileSize: number; // for caching the thumbnail
	originalFileLastModified: number;
	originalPageNumber: number; // its pagenumber in the original pdf document
}

export class PDFEditor
{
	private _fileSelector: FileSelector;
	private _thumbnails: HTMLElement = document.getElementById("thumbnails")!;
	private _info: HTMLElement = document.getElementById("info")!;
	private _downloadBtn: HTMLElement = document.getElementById("downloadBtn")!;
	private _newOnePagePDFObjects: IOnePagePDFDoc[] = []; // one paged pdfs
	private _savedScrollValue: number = 0;
	private readonly _thumbnailSize: number = 400;

	constructor()
	{
		this._fileSelector = new FileSelector(this.processFiles);
		this.addEventListeners();
	}

	private disableDownloadButton()
	{
		this._downloadBtn.textContent = "Loading...";
		this._downloadBtn.classList.add("disabled");
	}

	private enableDownloadButton()
	{
		this._downloadBtn.textContent = "Download merged PDF";
		this._downloadBtn.classList.remove("disabled");
	}

	private addEventListeners()
	{
		this._fileSelector.addEventListeners();
		this._downloadBtn.onclick = this.onDownloadClick;
	}

	private processFiles = async (files: FileList) =>
	{
		const listOfNewFiles: File[] = [];
		for (let i = 0; i < files.length; ++i)
		{
			const file = files[i];
			listOfNewFiles.push(file);
		}

		if (listOfNewFiles.length > 0 && files.length > 0)
		{
			this._fileSelector.newFilesAdded();
			this._downloadBtn.classList.remove("hidden");
			this.disableDownloadButton();
			await this.addPDFsToList(listOfNewFiles);

			this.enableDownloadButton();
		}
	};

	private async addPDFsToList(originalFiles: File[])
	{
		for (const file of originalFiles)
		{
			const newPDFs = await PDFSplitter.split(file);

			for (let j = 0; j < newPDFs.length; ++j)
			{
				const newPDF = newPDFs[j];

				this._newOnePagePDFObjects.push({
					doc: newPDF,
					originalFileName: file.name,
					originalFileSize: file.size,
					originalFileLastModified: file.lastModified,
					originalPageNumber: j,
					thumbnail: "",
				});
			}
		}

		return this.refreshThumbnails();
	}

	private getPageDetails(page: PDFPage): IPDFDetails
	{
		return {
			artBox: page.getArtBox(),
			bleedBox: page.getBleedBox(),
			cropBox: page.getCropBox(),
			mediaBox: page.getMediaBox(),
			trimBox: page.getTrimBox(),
			size: page.getSize(),
			position: page.getPosition(),
			rotation: page.getRotation(),
		};
	}

	private createInfoButton = (page: PDFPage, thumbnailId: string, pdfDoc: PDFDocument, ) =>
	{
		const infoButton = document.createElement("div");
		infoButton.classList.add("btn");
		infoButton.classList.add("infoButton");
		infoButton.textContent = "More information...";

		infoButton.onclick = async () =>
		{
			const pageDetails: IPDFDetails = this.getPageDetails(page);
			const result = await PDFDetailsWindow.open("PDF Details", pageDetails);

			if (result)
			{
				page.setArtBox(result.artBox.x, result.artBox.y, result.artBox.width, result.artBox.height);
				page.setBleedBox(result.bleedBox.x, result.bleedBox.y, result.bleedBox.width, result.bleedBox.height);
				page.setCropBox(result.cropBox.x, result.cropBox.y, result.cropBox.width, result.cropBox.height);
				page.setMediaBox(result.mediaBox.x, result.mediaBox.y, result.mediaBox.width, result.mediaBox.height);
				page.setTrimBox(result.trimBox.x, result.trimBox.y, result.trimBox.width, result.trimBox.height);
				page.setSize(result.size.width, result.size.height);
				page.translateContent(result.position.x, result.position.y);
				page.setRotation({type: result.rotation.type, angle: MathUtils.clampDegreesBetweenFullCircle(result.rotation.angle)});

				const thumbnail = document.getElementById(thumbnailId) as HTMLImageElement;
				const cacheKey = this.getCacheKey(thumbnailId, page);
				thumbnail.src = await PDFRenderer.getThumbnailAndViewBox(this._thumbnailSize, pdfDoc, cacheKey, page.getRotation().angle);
			}
		};

		return infoButton;
	};

	private getThumbnailId(pdfObject: IOnePagePDFDoc): string
	{
		return `${pdfObject.originalFileName}_${pdfObject.originalPageNumber}_${pdfObject.originalFileSize}_${pdfObject.originalFileLastModified}`;
	}

	private getCacheKey(thumbnailId: string, firstPage: PDFPage): string
	{
		const pageDetails: Partial<IPDFDetails> = this.getPageDetails(firstPage);
		delete pageDetails.rotation; // we don't want to rerender the whole PDF just because the rotation has changed. We rotate the existing image instead

		return `${thumbnailId}_${JSON.stringify(pageDetails)}`;
	}

	private async refreshThumbnails(scrollType: "toBottom" | "toLastPosition" = "toBottom")
	{
		HTMLUtils.clearElement(this._thumbnails);

		const promisesToWaitFor = [];

		for (let i = 0; i < this._newOnePagePDFObjects.length; ++i)
		{
			const pdfObject = this._newOnePagePDFObjects[i];
			const thumbnailContainer = document.createElement("div");
			thumbnailContainer.classList.add("hbox");
			thumbnailContainer.classList.add("thumbnailContainer");

			const labelContent = `${pdfObject.originalFileName}: page ${pdfObject.originalPageNumber + 1}`;

			const firstPage = pdfObject.doc.getPage(0);
			const rotationValue = MathUtils.clampDegreesBetweenFullCircle(firstPage.getRotation().angle - firstPage.getRotation().angle);

			const thumbnailId = this.getThumbnailId(pdfObject);

			const thumbnailSrcPromise = PDFRenderer.getThumbnailAndViewBox(this._thumbnailSize, pdfObject.doc, this.getCacheKey(thumbnailId, firstPage), rotationValue);
			const thumbnail = scrollType === "toBottom" ? await ImageUtils.loadImage(await thumbnailSrcPromise) : document.createElement("img");

			if (!thumbnail.src)
			{
				promisesToWaitFor.push(
					new Promise<void>((resolve, reject) =>
					{
						thumbnail.onload = () =>
						{
							resolve();
						};
					})
				);
				thumbnail.src = await thumbnailSrcPromise;
			}

			thumbnail.classList.add("thumbnail");
			thumbnail.id = thumbnailId;

			const label = document.createElement("div");
			label.classList.add("label");

			label.textContent = labelContent;


			const onArrowUpClick = i > 0 ? () =>
			{
				[this._newOnePagePDFObjects[i], this._newOnePagePDFObjects[i - 1]] = [this._newOnePagePDFObjects[i - 1], this._newOnePagePDFObjects[i]];
				this.thumbnailsReorderedCallback();
			} : Functions.empty;

			const onRotateCCWClick = async () =>
			{
				const currentRotationValue = MathUtils.clampDegreesBetweenFullCircle(firstPage.getRotation().angle - 90);
				firstPage.setRotation(degrees(currentRotationValue));
				thumbnail.src = await PDFRenderer.getThumbnailAndViewBox(this._thumbnailSize, pdfObject.doc, this.getCacheKey(thumbnailId, firstPage), currentRotationValue);
			};

			const onRemoveClick = async () =>
			{
				const confirmed = await ConfirmWindow.open("Are you sure you want to delete this page?");
				if (confirmed)
				{
					this._newOnePagePDFObjects.splice(i, 1);
					this.thumbnailsReorderedCallback();
				}
			};

			const onRotateCWClick = async () =>
			{
				const currentRotationValue = MathUtils.clampDegreesBetweenFullCircle(firstPage.getRotation().angle + 90);

				firstPage.setRotation(degrees(currentRotationValue));
				thumbnail.src = await PDFRenderer.getThumbnailAndViewBox(this._thumbnailSize, pdfObject.doc, this.getCacheKey(thumbnailId, firstPage), currentRotationValue);
			};

			const onArrowDownClick = i < this._newOnePagePDFObjects.length - 1 ? () =>
			{
				[this._newOnePagePDFObjects[i + 1], this._newOnePagePDFObjects[i]] = [this._newOnePagePDFObjects[i], this._newOnePagePDFObjects[i + 1]];
				this.thumbnailsReorderedCallback();
			} : Functions.empty;

			const buttons = HTMLFactory.createButtonsForPDF({
				onArrowUpClick,
				onRotateCCWClick,
				onRemoveClick,
				onRotateCWClick,
				onArrowDownClick
			});

			thumbnailContainer.appendChild(buttons);
			thumbnailContainer.appendChild(thumbnail);

			const infoSection = document.createElement("div");
			infoSection.classList.add("infoSection");
			infoSection.classList.add("vbox");
			infoSection.classList.add("flexCenter");
			infoSection.appendChild(label);
			infoSection.appendChild(this.createInfoButton(firstPage, thumbnailId, pdfObject.doc));

			thumbnailContainer.appendChild(infoSection);

			this._thumbnails.appendChild(thumbnailContainer);

			if (scrollType === "toBottom")
			{
				this._thumbnails.scrollTop = this._thumbnails.scrollHeight;
			}

			this.updateInfoText(i + 1);
		}

		await Promise.all(promisesToWaitFor);

		if (scrollType === "toLastPosition")
		{
			this._thumbnails.scrollTop = this._savedScrollValue;
		}
		else
		{
			this._thumbnails.scrollTop = this._thumbnails.scrollHeight;
		}

		if (this._newOnePagePDFObjects.length === 0)
		{
			this.disableDownloadButton();
			this._fileSelector.allPagesDeleted();
			this._info.textContent = "";
			this._downloadBtn.classList.add("hidden");
		}
		else
		{
			this.updateInfoText(this._newOnePagePDFObjects.length);
		}
	}

	private updateInfoText(numberOfPages: number)
	{
		this._info.textContent = `Merged PDF will be generated with ${numberOfPages} pages`;
	}

	private thumbnailsReorderedCallback()
	{
		this._savedScrollValue = this._thumbnails.scrollTop;
		this.refreshThumbnails("toLastPosition");
	}

	private setPDFHeaders(pdfDoc: PDFDocument)
	{
		pdfDoc.setTitle("Merged PDF");
		pdfDoc.setAuthor("https://github.com/soadzoor/PDF-merger");
		//pdfDoc.setKeywords(["eggs", "wall", "fall", "king", "horses", "men"]);
		pdfDoc.setProducer("https://github.com/soadzoor/PDF-merger");
		pdfDoc.setCreator("PDF merger (https://github.com/soadzoor/PDF-merger)");
		pdfDoc.setCreationDate(new Date());
		pdfDoc.setModificationDate(new Date());
	}

	private async createMergedPDF()
	{
		if (this._newOnePagePDFObjects.length > 0)
		{
			const mergedPDF = await PDFDocument.create();
			this.setPDFHeaders(mergedPDF);

			for (const onePagedPDFObject of this._newOnePagePDFObjects)
			{
				const onePagedDoc = onePagedPDFObject.doc;

				// All these pdf documents contain only one page, but it doesn't hurt to leave it like this for extra safety
				const pageCount = onePagedDoc.getPageCount();
				const pages = await mergedPDF.copyPages(onePagedDoc, this.getIndicesFromZeroToN(pageCount - 1));

				for (const page of pages)
				{
					mergedPDF.addPage(page);
				}
			}

			return mergedPDF;
		}
	}

	private getIndicesFromZeroToN(n: number)
	{
		const indices = [];

		for (let i = 0; i <= n; ++i)
		{
			indices.push(i);
		}

		return indices;
	}

	private onDownloadClick = async () =>
	{
		const mergedPDF = await this.createMergedPDF();
		if (mergedPDF)
		{
			const byteArray = await mergedPDF.save();
			FileUtils.downloadFileGivenByData(byteArray, "mergedPDF.pdf", "application/pdf");
		}
	};
}
