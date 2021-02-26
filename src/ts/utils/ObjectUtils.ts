export class ObjectUtils
{
	private static keys(object: any)
	{
		// NOT WORKING FOR File type!
		// const keys = Object.keys(object);
		const keys = [];
		for (let key in object)
		{
			keys.push(key);
		}

		return keys;
	}

	public static mergeConfig<T extends Object>(defaultConfig: T, config: T): T
	{
		// Object.create makes a shallow copy
		const resultConfig = Object.create(defaultConfig);

		for (const key in config)
		{
			const value = config[key];
			resultConfig[key] = value;
		}

		return resultConfig;
	}

	/**
	 * Checks if 2 objects equal each other, ie. they have the same
	 * fields and values (recursively).
	 */
	public static compare(object1: any, object2: any): boolean
	{
		if (object1 === object2)
		{
			// same instance or same value for primitive types
			// -> no need to check further
			return true;
		}

		const type1 = typeof object1;
		const type2 = typeof object2;

		if (type1 !== type2)
		{
			// types don't match
			return false;
		}

		if (type1 !== "object")
		{
			// they're both primitive types but don't have the same value (first if in this function)
			return false;
		}

		// at this point types match, they're not primitives, but they're not the same instance
		// -> check if all the properties have the same value

		// first check if they have the same keys
		// (note: objects can be either object or array)

		const keys1 = ObjectUtils.keys(object1);
		const keys2 = ObjectUtils.keys(object2);


		if (keys1.length !== keys2.length)
		{
			return false;
		}

		keys1.sort();
		keys2.sort();

		for (let i = 0, ln = keys1.length; i < ln; ++i)
		{
			if (keys1[i] !== keys2[i])
			{
				// key names don't match
				return false;
			}
		}

		// they have the same keys
		// check if they have the same values for each key
		for (let i = 0, ln = keys1.length; i < ln; ++i)
		{
			const key = keys1[i];

			if (!ObjectUtils.compare(object1[key], object2[key]))
			{
				// values don't match
				return false;
			}
		}

		// match

		return true;
	}
}