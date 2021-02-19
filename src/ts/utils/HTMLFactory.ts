import {Functions} from "./Functions";

type ButtonFunction = () => void;

interface IButtonParams
{
	onArrowUpClick: ButtonFunction;
	onRotateCCWClick: ButtonFunction;
	onRemoveClick: ButtonFunction;
	onRotateCWClick: ButtonFunction;
	onArrowDownClick: ButtonFunction;
}

export class HTMLFactory
{
	public static createButtonsForPDF(params: IButtonParams)
	{
		const buttons = document.createElement("div");
		buttons.classList.add("buttons");
		buttons.classList.add("vbox");

		//
		// Arrow up
		//
		const arrowUp = document.createElement("div");
		arrowUp.classList.add("btn");
		arrowUp.classList.add("arrow");
		arrowUp.classList.add("up");
		arrowUp.title = "Move page up";
		arrowUp.onclick = params.onArrowUpClick;
		if (arrowUp.onclick === Functions.empty)
		{
			arrowUp.classList.add("disabled");
		}

		//
		// Horizontal row
		//
		const horizontal = document.createElement("div");
		horizontal.classList.add("hbox");

		//
		// Rotate CCW
		//
		const rotateCCW = document.createElement("div");
		rotateCCW.classList.add("btn");
		rotateCCW.classList.add("rotation");
		rotateCCW.classList.add("ccw");
		rotateCCW.title = "Rotate page by 90°";
		rotateCCW.onclick = params.onRotateCCWClick;

		//
		// Remove
		//
		const remove = document.createElement("div");
		remove.classList.add("btn");
		remove.classList.add("remove");
		remove.title = "Remove page";
		remove.onclick = params.onRemoveClick;

		//
		// Rotate CW
		//
		const rotateCW = document.createElement("div");
		rotateCW.classList.add("btn");
		rotateCW.classList.add("rotation");
		rotateCW.title = "Rotate page by 90°";
		rotateCW.onclick = params.onRotateCWClick;

		horizontal.appendChild(rotateCCW);
		horizontal.appendChild(remove);
		horizontal.appendChild(rotateCW);

		//
		// Arrow down
		//
		const arrowDown = document.createElement("div");
		arrowDown.classList.add("btn");
		arrowDown.classList.add("arrow");
		arrowDown.title = "Move page down";
		arrowDown.onclick = params.onArrowDownClick;
		if (arrowDown.onclick === Functions.empty)
		{
			arrowDown.classList.add("disabled");
		}

		buttons.appendChild(arrowUp);
		buttons.appendChild(horizontal);
		buttons.appendChild(arrowDown);

		return buttons;
	}
}