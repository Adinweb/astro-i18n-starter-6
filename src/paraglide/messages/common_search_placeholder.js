/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Search_PlaceholderInputs */

const en_common_search_placeholder = /** @type {(inputs: Common_Search_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Search articles and pages...`)
};

const de_common_search_placeholder = /** @type {(inputs: Common_Search_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Artikel und Seiten durchsuchen...`)
};

const fr_common_search_placeholder = /** @type {(inputs: Common_Search_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rechercher des articles et des pages...`)
};

const fa_common_search_placeholder = /** @type {(inputs: Common_Search_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`جستجوی مقالات و صفحات...`)
};

const ar_common_search_placeholder = /** @type {(inputs: Common_Search_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`ابحث في المقالات والصفحات...`)
};

/**
* | output |
* | --- |
* | "Search articles and pages..." |
*
* @param {Common_Search_PlaceholderInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_search_placeholder = /** @type {((inputs?: Common_Search_PlaceholderInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Search_PlaceholderInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_search_placeholder(inputs)
	if (locale === "fr") return fr_common_search_placeholder(inputs)
	if (locale === "fa") return fa_common_search_placeholder(inputs)
	if (locale === "ar") return ar_common_search_placeholder(inputs)
	return en_common_search_placeholder(inputs)
});