export class FileSelector
{
	private _uploadDiv: HTMLElement = document.getElementById("uploadDiv");
	private _inputElement: HTMLInputElement = document.createElement("input");

	private processFiles: (files: FileList) => void;

	constructor(processFilesCallback: (files: FileList) => void)
	{
		this._inputElement.type = "file";
		this._inputElement.accept = "application/pdf";
		this._inputElement.multiple = true;

		this.processFiles = processFilesCallback;
	}

	public addEventListeners()
	{
		this._inputElement.addEventListener("change", (event: Event) =>
		{
			const files = this._inputElement.files;
			this.processFiles(files);
		});

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
			this._uploadDiv.classList.remove("active");

			const files = event.dataTransfer.files;
			this.processFiles(files);
		});
	}

	public newFilesAdded()
	{
		this._uploadDiv.classList.add("small");
	}
}