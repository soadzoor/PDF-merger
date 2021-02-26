import {PopupWindow} from "./PopupWindow";

/**
 * Can be used as an alternative for `confirm("confirmMessage");`
 */
export class ConfirmWindow extends PopupWindow<boolean>
{
	protected _okValue = true;
	protected _cancelValue = false;

	constructor(message: string)
	{
		super({
			message: message,
			config: {
				backdrop: false
			}
		});
	}

	public static open(message: string)
	{
		return new ConfirmWindow(message).open();
	}
}