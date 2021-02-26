/**
 * You should use one of the descendants of this class: WarningWindow, ConfirmWindow, or PromptWindow
 * Example: const confirmed = await ConfirmWindow.open("Are you sure you want to delete this item?");
 */

import {ObjectUtils} from "utils/ObjectUtils";
import {HTMLUtils} from "utils/HTMLUtils";

export interface IPopupWindowConfig
{
	backdrop?: boolean;
	ok?: string; // The label of the OK button
	cancel?: string; // The label of the Cancel button
	parentElement?: HTMLElement;
}

interface IPopupWindowProps
{
	message: string;
	config?: IPopupWindowConfig;
}

export abstract class PopupWindow<T>
{
	private _isOkButtonEnabled: boolean = true;
	private _container: HTMLDivElement = document.createElement("div");
	private _okButton: HTMLDivElement = document.createElement("div");
	private readonly _props: IPopupWindowProps;
	private readonly _config: IPopupWindowConfig;
	protected static readonly _defaultConfig: IPopupWindowConfig = {
		backdrop: true,
		ok: "Yes",
		cancel: "No",
		parentElement: document.body
	};
	protected abstract _okValue: T; // the return value when the user clicks "ok"
	protected abstract _cancelValue: T; // the return value when the user clicks "cancel"
	protected _additionalElements: HTMLElement;
	protected resolve: (isOk?: T) => void;

	constructor(props: IPopupWindowProps)
	{
		this._props = props;
		this._config = ObjectUtils.mergeConfig(PopupWindow._defaultConfig, props.config || {});
	}

	private onKeyDown = (event: KeyboardEvent) =>
	{
		switch(event.key)
		{
			case "Enter":
				if (this._isOkButtonEnabled)
				{
					this.onOkClick();
				}
				break;
			case "Escape":
				this.onCancelClick();
				break;
		}
	};

	protected close()
	{
		window.removeEventListener("keydown", this.onKeyDown);
		HTMLUtils.detach(this._container);
	}

	private onCancelClick = () =>
	{
		this.close();
		this.resolve(this._cancelValue);
	};

	private onOkClick = () =>
	{
		if (this._isOkButtonEnabled)
		{
			this.close();
			this.resolve(this._okValue);
		}
	};

	protected enableOkButton()
	{
		this._isOkButtonEnabled = true;
		this._okButton.classList.remove("disabled");
	}

	protected disableOkButton()
	{
		this._isOkButtonEnabled = false;
		this._okButton.classList.add("disabled");
	}

	protected open()
	{
		window.addEventListener("keydown", this.onKeyDown);

		this.draw();

		return new Promise<T>((resolve, reject) =>
		{
			this.resolve = resolve;
		});
	}

	private draw()
	{
		this._container.className = "popupBackdrop flexCenter";
		if (this._config.backdrop)
		{
			this._container.onclick = this.onCancelClick;
		}

		const popupWindow = document.createElement("div");
		popupWindow.className = "popupWindow";

		const message = document.createElement("div");
		message.className = "message";
		message.innerHTML = this._props.message;
		popupWindow.appendChild(message);
		
		if (this._additionalElements)
		{
			popupWindow.appendChild(this._additionalElements);
		}

		const buttonContainer = document.createElement("div");
		buttonContainer.className = "buttonContainer hbox flexCenter";

		this._okButton.className = "ok btn";
		this._okButton.textContent = this._config.ok;
		this._okButton.onclick = this.onOkClick;

		if (!this._isOkButtonEnabled)
		{
			this._okButton.classList.add("disabled");
		}

		buttonContainer.appendChild(this._okButton);

		if (this._config.cancel)
		{
			const cancelButton = document.createElement("div");
			cancelButton.className = "cancel btn";
			cancelButton.textContent = this._config.cancel;
			cancelButton.onclick = this.onCancelClick;
			buttonContainer.appendChild(cancelButton);
		}

		popupWindow.appendChild(buttonContainer);

		this._container.appendChild(popupWindow);

		this._config.parentElement.appendChild(this._container);
	}
}