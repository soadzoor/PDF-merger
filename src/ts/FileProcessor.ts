import { PDFDocument } from "pdf-lib";
import { FileUtils } from "FileUtils";

export class FileProcessor
{
	private _uploadDiv: HTMLElement = document.getElementById("uploadDiv");
	private _inputElement: HTMLInputElement = document.createElement("input");
	private _info: HTMLElement = document.getElementById("info");
	private _downloadBtn: HTMLElement = document.getElementById("downloadBtn");
	private _files: File[] = []; // PDF files
	private _newPDF: PDFDocument;

	constructor()
	{
		this._inputElement.type = "file";
		this._inputElement.accept = "application/pdf";
		this._inputElement.multiple = true;

		this.addEventListeners();
	}

	private addEventListeners()
	{
		this._inputElement.addEventListener("change", (event: Event) =>
		{
			const files = this._inputElement.files;
			this.processFiles(files);
		});

		this._downloadBtn.addEventListener("click", this.onDownloadClick);

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
		const fileNames = this._files.map((file: File) => file.name);

		for (let i = 0; i < files.length; ++i)
		{
			const file = files[i];

			if (!fileNames.includes(file.name))
			{
				this._files.push(file);
			}
		}

		if (this._files.length > 0)
		{
			this._downloadBtn.classList.add("hidden");
			await this.createPDF();
			const info = this.getInfo();
			this._info.textContent = `${info.fileCount} PDFs selected with a total pagenumber of ${info.pageCount}`;
			this._downloadBtn.classList.remove("hidden");
		}
	}

	private setPDFHeaders(pdfDoc: PDFDocument)
	{
		pdfDoc.setTitle("Merged PDF");
		pdfDoc.setAuthor("https://github.com/soadzoor/PDF-merger");
		pdfDoc.setKeywords(["eggs", "wall", "fall", "king", "horses", "men"]);
		pdfDoc.setProducer("https://github.com/soadzoor/PDF-merger");
		pdfDoc.setCreator("PDF merger (https://github.com/soadzoor/PDF-merger)");
		pdfDoc.setCreationDate(new Date());
		pdfDoc.setModificationDate(new Date());
	}

	private async createPDF()
	{
		if (this._files.length > 0)
		{
			this._newPDF = await PDFDocument.create();
			this.setPDFHeaders(this._newPDF);

			for (const file of this._files)
			{
				const originalPDFBytes = await FileUtils.readAsArrayBuffer(file);
				const originalPDFDoc = await PDFDocument.load(originalPDFBytes);
		
				const pageCount = originalPDFDoc.getPageCount();
	
				const pages = await this._newPDF.copyPages(originalPDFDoc, this.getIndicesFromZeroToN(pageCount - 1));

				for (const page of pages)
				{
					this._newPDF.addPage(page);
				}
			}

			return this._newPDF;
		}
	}

	private getInfo()
	{
		return {
			fileCount: this._files.length,
			pageCount: this._newPDF.getPageCount()
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
		if (this._files.length > 0)
		{
			const byteArray = await this._newPDF.save();
			FileUtils.downloadFileGivenByData(byteArray, "mergedPDF.pdf", "application/pdf");
		}
	};
}