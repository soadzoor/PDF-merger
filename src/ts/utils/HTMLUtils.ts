export class HTMLUtils
{
	/**
	 * Removes every child of the element
	 * @param element HTMLElement
	 */
	public static clearElement(element: Element, alsoRemoveFromDom: boolean = false)
	{
		while (element.lastChild)
		{
			element.removeChild(element.lastChild);
		}

		if (alsoRemoveFromDom)
		{
			HTMLUtils.detach(element);
		}
	}

	/**
	 * Removes element from DOM
	 * @param element HTMLelement
	 */
	public static detach(element: Element)
	{
		element?.parentElement?.removeChild(element);
	}
}
