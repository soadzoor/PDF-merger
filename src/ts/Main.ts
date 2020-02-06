import { FileProcessor } from 'FileProcessor';

export class Main
{
	public static instance: Main;
	public static getInstance(): Main
	{
		return Main.instance || new Main();
	}

	private _fileDropper: FileProcessor;

	constructor()
	{
		Main.instance = this;
		this._fileDropper = new FileProcessor();
	}
}

const main = Main.getInstance();