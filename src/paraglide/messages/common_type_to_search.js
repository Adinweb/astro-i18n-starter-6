/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Type_To_SearchInputs */

const en_common_type_to_search = /** @type {(inputs: Common_Type_To_SearchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Type to search...`)
};

const de_common_type_to_search = /** @type {(inputs: Common_Type_To_SearchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tippen zum Suchen...`)
};

const fa_common_type_to_search = /** @type {(inputs: Common_Type_To_SearchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`برای جستجو تایپ کنید...`)
};

/**
* | output |
* | --- |
* | "Type to search..." |
*
* @param {Common_Type_To_SearchInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" }} options
* @returns {LocalizedString}
*/
export const common_type_to_search = /** @type {((inputs?: Common_Type_To_SearchInputs, options?: { locale?: "en" | "de" | "fa" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Type_To_SearchInputs, { locale?: "en" | "de" | "fa" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_type_to_search(inputs)
	if (locale === "fa") return fa_common_type_to_search(inputs)
	return en_common_type_to_search(inputs)
});