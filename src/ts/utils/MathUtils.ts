export class MathUtils
{
	public static DEG2RAD = Math.PI / 180.0;
	public static RAD2DEG = 180.0 / Math.PI;

	public static clampDegreesBetweenFullCircle(value: number)
	{
		let ret = value % 360;
		if (value < 0)
		{
			ret += 360;
		}

		return ret;
	}
}