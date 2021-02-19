import {degrees, PDFDocument} from "pdf-lib";
import {FileSelector} from "utils/FileSelector";
import {FileUtils} from "utils/FileUtils";
import {Functions} from "utils/Functions";
import {HTMLFactory} from "utils/HTMLFactory";
import {HTMLUtils} from "utils/HTMLUtils";
import {ImageUtils} from "utils/ImageUtils";
import {MathUtils} from "utils/MathUtils";
import {PDFRenderer} from "utils/PDFRenderer";
import {PDFSplitter} from "utils/PDFSplitter";

export interface IOnePagePDFDoc
{
	doc: PDFDocument;
	thumbnail: string;
	originalRotation: number; // 0 | 90 | 180 | 270
	originalFileName: string;
	originalPageNumber: number; // its pagenumber in the original pdf document
}

export class PDFEditor
{
	private _fileSelector: FileSelector;
	private _thumbnails: HTMLElement = document.getElementById("thumbnails");
	private _info: HTMLElement = document.getElementById("info");
	private _downloadBtn: HTMLElement = document.getElementById("downloadBtn");
	private _originalFiles: File[] = []; // PDF files
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
		const fileNames = this._originalFiles.map((file: File) => file.name);

		let newFilesAdded = false;

		for (let i = 0; i < files.length; ++i)
		{
			const file = files[i];

			if (!fileNames.includes(file.name))
			{
				this._originalFiles.push(file);
				newFilesAdded = true;
			}
		}

		if (this._originalFiles.length > 0 && newFilesAdded)
		{
			this._fileSelector.newFilesAdded();
			this._downloadBtn.classList.remove("hidden");
			this.disableDownloadButton();
			await this.createListOfPDFs();

			this.enableDownloadButton();
		}
	};

	private async createListOfPDFs()
	{
		this._newOnePagePDFObjects.length = 0;
		for (const file of this._originalFiles)
		{
			const newPDFs = await PDFSplitter.split(file);

			for (let j = 0; j < newPDFs.length; ++j)
			{
				const newPDF = newPDFs[j];

				const firstPage = newPDF.getPage(0);
				let originalRotation = MathUtils.clampDegreesBetweenFullCircle(firstPage.getRotation().angle);

				this._newOnePagePDFObjects.push({
					doc: newPDF,
					originalRotation: originalRotation,
					originalFileName: file.name,
					originalPageNumber: j,
					thumbnail: null
				});
			}
		}

		await this.refreshThumbnails();
	}

	private async refreshThumbnails(scrollType: "toBottom" | "toLastPosition" = "toBottom")
	{
		HTMLUtils.clearElement(this._thumbnails);

		for (let i = 0; i < this._newOnePagePDFObjects.length; ++i)
		{
			const pdfObject = this._newOnePagePDFObjects[i];
			const thumbnailContainer = document.createElement("div");
			thumbnailContainer.classList.add("hbox");
			thumbnailContainer.classList.add("thumbnailContainer");

			const labelContent = `${pdfObject.originalFileName}: page ${pdfObject.originalPageNumber + 1}`;

			const firstPage = pdfObject.doc.getPage(0);
			let currentRotationValue = firstPage.getRotation().angle;

			const thumbnailSrcPromise = PDFRenderer.getThumbnailAndViewBox(this._thumbnailSize, pdfObject.doc, labelContent, currentRotationValue);
			const thumbnail = scrollType === "toBottom" ? await ImageUtils.loadImage(await thumbnailSrcPromise) : document.createElement("img");
	
			if (!thumbnail.src)
			{
				thumbnail.src = await thumbnailSrcPromise;
			}
			
			thumbnail.classList.add("thumbnail");

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
				currentRotationValue = MathUtils.clampDegreesBetweenFullCircle(currentRotationValue - 90);
				firstPage.setRotation(degrees(currentRotationValue));
				thumbnail.src = await PDFRenderer.getThumbnailAndViewBox(this._thumbnailSize, pdfObject.doc, labelContent, currentRotationValue);
			};

			const onRemoveClick = () =>
			{
				this._newOnePagePDFObjects.splice(i, 1);
				this.thumbnailsReorderedCallback();
			};

			const onRotateCWClick = async () =>
			{
				currentRotationValue = MathUtils.clampDegreesBetweenFullCircle(currentRotationValue + 90);
				firstPage.setRotation(degrees(currentRotationValue));
				thumbnail.src = await PDFRenderer.getThumbnailAndViewBox(this._thumbnailSize, pdfObject.doc, labelContent, currentRotationValue);
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
			thumbnailContainer.appendChild(label);

			this._thumbnails.appendChild(thumbnailContainer);

			this._thumbnails.scrollTop = scrollType === "toBottom" ? this._thumbnails.scrollHeight : this._savedScrollValue;

			this._info.textContent = `Merged PDF will be generated with ${i + 1} pages`;
		}
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
		const byteArray = await mergedPDF.save();
		FileUtils.downloadFileGivenByData(byteArray, "mergedPDF.pdf", "application/pdf");
	};
}