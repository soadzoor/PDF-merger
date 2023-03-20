import type {Rotation} from "pdf-lib";
import {StringUtils} from "../utils/StringUtils";
import {PopupWindow} from "./PopupWindow";

interface IBox
{
	x: number;
	y: number;
	width: number;
	height: number;
}

interface IVec2
{
	x: number;
	y: number;
}

interface ISize
{
	width: number;
	height: number;
}

export interface IPDFDetails
{
	artBox: IBox;
	bleedBox: IBox;
	cropBox: IBox;
	mediaBox: IBox;
	trimBox: IBox;
	size: ISize;
	position: IVec2;
	rotation: Rotation;
}

export class PDFDetailsWindow extends PopupWindow<IPDFDetails | null>
{
	protected _okValue;
	protected _cancelValue = null;

	constructor(message: string, pdfDetails: IPDFDetails)
	{
		super({
			message: message,
			config: {
				backdrop: false,
				ok: "Change",
				cancel: "Cancel",
			},
		});

		this._okValue = pdfDetails;

		this._additionalElements = document.createElement("div");
		this._additionalElements.classList.add("pdfDetails");

		for (const key in pdfDetails)
		{
			const wrapper = document.createElement("div");
			wrapper.classList.add("propInfo");
			const label = document.createElement("div");
			label.textContent = StringUtils.capitalize(key);
			this._additionalElements.appendChild(label);

			for (const prop in pdfDetails[key as keyof typeof pdfDetails])
			{
				const pdfPropDetails = pdfDetails[key as keyof typeof pdfDetails];
				const propWrapper = document.createElement("div");
				propWrapper.classList.add("hbox");
				const propLabel = document.createElement("div");
				propLabel.textContent = `${prop}: `;
				const propInput = document.createElement("input");
				if (key === "position" || (key === "rotation" && prop === "type"))
				{
					propInput.classList.add("disabled");
				}

				const originalPropValue = pdfPropDetails[prop as keyof typeof pdfPropDetails];
				propInput.value = `${originalPropValue}`;
				propInput.onchange = (event: Event) =>
				{
					const newValAsString = (event.target as HTMLInputElement).value;
					const newValAsNum = parseFloat(newValAsString);
					if (isNaN(newValAsNum) && typeof originalPropValue === "number")
					{
						// reset to last value
						propInput.value = `${originalPropValue}`;
					}
					else
					{
						(pdfPropDetails as IBox)[prop as keyof IBox] = newValAsNum;
					}
				};

				propWrapper.appendChild(propLabel);
				propWrapper.appendChild(propInput);

				wrapper.appendChild(propWrapper);
			}

			this._additionalElements.appendChild(wrapper);
		}
	}

	public static open(message: string, pdfDetails: IPDFDetails)
	{
		return new PDFDetailsWindow(message, pdfDetails).open();
	}
}
