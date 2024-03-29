import {ObjectUtils} from "../utils/ObjectUtils";
import {PopupWindow} from "./PopupWindow";

/**
 * Can be used as an alternative for `alert("alertMessage");`
 */
// eslint-disable-next-line import/no-unused-modules
export class WarningWindow extends PopupWindow<boolean>
{
	protected static override readonly _defaultConfig = {
		ok: "Ok",
		cancel: null,
		backdrop: true
	};
	protected _okValue = true;
	protected _cancelValue = false;

	constructor(message: string, config: {ok?: string; backdrop?: boolean} = {})
	{
		super({
			message: message,
			config: ObjectUtils.mergeConfig(WarningWindow._defaultConfig, config as any)
		});
	}

	public static open(message: string, config?: {ok: string; backdrop: boolean})
	{
		return new WarningWindow(message, config).open();
	}
}
