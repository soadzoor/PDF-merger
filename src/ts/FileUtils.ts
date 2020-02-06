export class FileUtils
{
	public static readAsArrayBuffer(file: File)
	{
		return new Promise<ArrayBuffer>((resolve, reject) =>
		{
			const fileReader = new FileReader();
			fileReader.onload = () =>
			{
				resolve(fileReader.result as ArrayBuffer);
			};
			fileReader.onerror = () =>
			{
				reject("Error");
			};
			fileReader.readAsArrayBuffer(file);
		});
	}

	public static downloadFileGivenByData(content: string | Uint8Array, defaultFileName: string, type: string = "text/plain")
	{
		const url = FileUtils.createURLFromData(content, type);

		FileUtils.downloadFileFromUrl(url, defaultFileName);
	}

	private static createURLFromData(content: string | Uint8Array, type: string = "text/plain")
	{
		// This is slow for big text -> we use Blob instead.
		//var url = "data:text/plain;charset=utf-8," + encodeURIComponent(content);

		const blob = new Blob([content], {type: type});
		const url = window.URL.createObjectURL(blob);

		return url;
	}

	private static downloadFileFromUrl(url: string, defaultFileName: string)
	{
		const a = document.createElement("a");
		a.href = url;

		// This doesn't seem to be working, filename is always render.png
		a.setAttribute("download", defaultFileName);
		a["download"] = defaultFileName;

		a.style.display = "none";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
}