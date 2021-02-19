import {PDFDocument} from "pdf-lib";
import {FileUtils} from "utils/FileUtils";
import {HTMLUtils} from "utils/HTMLUtils";
import {ImageUtils} from "utils/ImageUtils";
import {PDFRenderer} from "utils/PDFRenderer";
import {PDFSplitter} from "utils/PDFSplitter";

export interface IOnePagePDFDoc
{
	doc: PDFDocument;
	thumbnail: string;
	rotation: number; // 0 | 90 | 180 | 270
	originalFileName: string;
	originalPageNumber: number; // its pagenumber in the original pdf document
}

export class FileProcessor
{
	private _uploadDiv: HTMLElement = document.getElementById("uploadDiv");
	private _inputElement: HTMLInputElement = document.createElement("input");
	private _thumbnails: HTMLElement = document.getElementById("thumbnails");
	private _info: HTMLElement = document.getElementById("info");
	private _downloadBtn: HTMLElement = document.getElementById("downloadBtn");
	private _originalFiles: File[] = []; // PDF files
	private _newOnePagePDFObjects: IOnePagePDFDoc[] = []; // one paged pdfs

	constructor()
	{
		this._inputElement.type = "file";
		this._inputElement.accept = "application/pdf";
		this._inputElement.multiple = true;

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
		this._inputElement.addEventListener("change", (event: Event) =>
		{
			const files = this._inputElement.files;
			this.processFiles(files);
		});

		this._downloadBtn.onclick = this.onDownloadClick;

		this._uploadDiv.addEventListener("click", () =>
		{
			this._inputElement.click();
		});

		document.addEventListener("dragover", (event: Event) =>
		{
			event.preventDefault();
			this._uploadDiv.classList.add("active");
		});

		document.addEventListener("dragover", (event: Event) =>
		{
			event.preventDefault();
			this._uploadDiv.classList.add("active");
		});

		document.addEventListener("dragleave", (event: Event) =>
		{
			this._uploadDiv.classList.remove("active");
		});

		document.addEventListener("drop", (event: DragEvent) =>
		{
			event.preventDefault();

			const files = event.dataTransfer.files;
			this.processFiles(files);
		});
	}

	private async processFiles(files: FileList)
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
			this._uploadDiv.classList.add("small");
			this._downloadBtn.classList.remove("hidden");
			this.disableDownloadButton();
			await this.createListOfPDFs();
			
			this.enableDownloadButton();
		}
	}

	private async createListOfPDFs()
	{
		this._newOnePagePDFObjects.length = 0;
		for (const file of this._originalFiles)
		{
			const newPDFs = await PDFSplitter.split(file);

			for (let j = 0; j < newPDFs.length; ++j)
			{
				const newPDF = newPDFs[j];

				const firstPage = newPDF.getPages()[0];
				let originalRotation = firstPage.getRotation().angle % 360;
				if (originalRotation < 0)
				{
					originalRotation += 360;
				}

				this._newOnePagePDFObjects.push({
					doc: newPDF,
					rotation: originalRotation,
					originalFileName: file.name,
					originalPageNumber: j,
					thumbnail: null
				});
			}
		}

		await this.refreshThumbnails();
	}

	private async refreshThumbnails()
	{
		HTMLUtils.clearElement(this._thumbnails);

		for (let i = 0; i < this._newOnePagePDFObjects.length; ++i)
		{
			const pdfObject = this._newOnePagePDFObjects[i];
			const thumbnailContainer = document.createElement("div");
			thumbnailContainer.classList.add("hbox");
			thumbnailContainer.classList.add("thumbnailContainer");

			const labelContent = `${pdfObject.originalFileName}: page ${pdfObject.originalPageNumber + 1}`;

			const thumbnail = await ImageUtils.loadImage(await PDFRenderer.getThumbnailAndViewBox(400, pdfObject.doc, labelContent));
			thumbnail.classList.add("thumbnail");

			const label = document.createElement("div");
			label.classList.add("label");

			label.textContent = labelContent;

			thumbnailContainer.appendChild(thumbnail);
			thumbnailContainer.appendChild(label);

			this._thumbnails.appendChild(thumbnailContainer);

			this._thumbnails.scrollTop = this._thumbnails.scrollHeight;

			this._info.textContent = `Merged PDF will be generated with ${i + 1} pages`;
		}
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

	private getInfo()
	{
		return {
			fileCount: this._originalFiles.length,
			pageCount: this._newOnePagePDFObjects.length
		};
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