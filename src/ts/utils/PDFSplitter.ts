import {PDFDocument} from "pdf-lib";
import {FileUtils} from "./FileUtils";

/**
 * Reads a PDF file, and splits it by pages. A PDF with 76 pages will result in an array of 76 PDF files
 */

export class PDFSplitter
{
	public static async split(file: File)
	{
		const originalPDFBytes = await FileUtils.readAsArrayBuffer(file);
		const originalPDFDoc = await PDFDocument.load(originalPDFBytes);

		const pageCount = originalPDFDoc.getPageCount();

		const newPDFs: PDFDocument[] = [];
		for (let i = 0; i < pageCount; ++i)
		{
			const newPDF = await PDFDocument.create();
			const [page] = await newPDF.copyPages(originalPDFDoc, [i]);
			newPDF.addPage(page);
			newPDFs.push(newPDF);
		}

		return newPDFs;
	}
}