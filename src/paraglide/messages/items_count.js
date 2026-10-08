/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ count: NonNullable<unknown> }} Items_CountInputs */

const en_items_count = /** @type {(inputs: Items_CountInputs) => LocalizedString} */ (i) => {const countPlural = registry.plural("en", i?.count, {});
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} item`);
	return /** @type {LocalizedString} */ (`${i?.count} items`)
	
};

const de_items_count = /** @type {(inputs: Items_CountInputs) => LocalizedString} */ (i) => {const countPlural = registry.plural("de", i?.count, {});
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} Element`);
	return /** @type {LocalizedString} */ (`${i?.count} Elemente`)
	
};

const fr_items_count = /** @type {(inputs: Items_CountInputs) => LocalizedString} */ (i) => {const countPlural = registry.plural("fr", i?.count, {});
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} élément`);
	return /** @type {LocalizedString} */ (`${i?.count} éléments`)
	
};

const fa_items_count = /** @type {(inputs: Items_CountInputs) => LocalizedString} */ (i) => {const countPlural = registry.plural("fa", i?.count, {});
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} مورد`);
	return /** @type {LocalizedString} */ (`${i?.count} مورد`)
	
};

const ar_items_count = /** @type {(inputs: Items_CountInputs) => LocalizedString} */ (i) => {const countPlural = registry.plural("ar", i?.count, {});
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} عنصر`);
	if (countPlural === "two") return /** @type {LocalizedString} */ (`عنصران`);
	return /** @type {LocalizedString} */ (`${i?.count} عناصر`)
	
};

/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} item" |
* | * | "{count} items" |
*
* @param {Items_CountInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const items_count = /** @type {((inputs: Items_CountInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Items_CountInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_items_count(inputs)
	if (locale === "fr") return fr_items_count(inputs)
	if (locale === "fa") return fa_items_count(inputs)
	if (locale === "ar") return ar_items_count(inputs)
	return en_items_count(inputs)
});