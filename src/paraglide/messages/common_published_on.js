/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Published_OnInputs */

const en_common_published_on = /** @type {(inputs: Common_Published_OnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Published on`)
};

const de_common_published_on = /** @type {(inputs: Common_Published_OnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Veröffentlicht am`)
};

const fr_common_published_on = /** @type {(inputs: Common_Published_OnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Publié le`)
};

const fa_common_published_on = /** @type {(inputs: Common_Published_OnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`منتشر شده در`)
};

const ar_common_published_on = /** @type {(inputs: Common_Published_OnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`نُشر في`)
};

/**
* | output |
* | --- |
* | "Published on" |
*
* @param {Common_Published_OnInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_published_on = /** @type {((inputs?: Common_Published_OnInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Published_OnInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_published_on(inputs)
	if (locale === "fr") return fr_common_published_on(inputs)
	if (locale === "fa") return fa_common_published_on(inputs)
	if (locale === "ar") return ar_common_published_on(inputs)
	return en_common_published_on(inputs)
});