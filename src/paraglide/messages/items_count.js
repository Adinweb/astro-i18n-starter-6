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

const fa_items_count = /** @type {(inputs: Items_CountInputs) => LocalizedString} */ (i) => {const countPlural = registry.plural("fa", i?.count, {});
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} مورد`);
	return /** @type {LocalizedString} */ (`${i?.count} مورد`)
	
};

const fr_items_count = /** @type {(inputs: Items_CountInputs) => LocalizedString} */ (i) => {const countPlural = registry.plural("fr", i?.count, {});
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} élément`);
	return /** @type {LocalizedString} */ (`${i?.count} éléments`)
	
};

/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} item" |
* | * | "{count} items" |
*
* @param {Items_CountInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" | "fr" }} options
* @returns {LocalizedString}
*/
export const items_count = /** @type {((inputs: Items_CountInputs, options?: { locale?: "en" | "de" | "fa" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Items_CountInputs, { locale?: "en" | "de" | "fa" | "fr" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_items_count(inputs)
	if (locale === "fa") return fa_items_count(inputs)
	if (locale === "fr") return fr_items_count(inputs)
	return en_items_count(inputs)
});