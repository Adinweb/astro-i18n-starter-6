/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Back_To_BlogInputs */

const en_common_back_to_blog = /** @type {(inputs: Common_Back_To_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Back to Blog`)
};

const de_common_back_to_blog = /** @type {(inputs: Common_Back_To_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zurück zum Blog`)
};

const fa_common_back_to_blog = /** @type {(inputs: Common_Back_To_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`بازگشت به وبلاگ`)
};

const fr_common_back_to_blog = /** @type {(inputs: Common_Back_To_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Retour au blog`)
};

/**
* | output |
* | --- |
* | "Back to Blog" |
*
* @param {Common_Back_To_BlogInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" | "fr" }} options
* @returns {LocalizedString}
*/
export const common_back_to_blog = /** @type {((inputs?: Common_Back_To_BlogInputs, options?: { locale?: "en" | "de" | "fa" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Back_To_BlogInputs, { locale?: "en" | "de" | "fa" | "fr" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_back_to_blog(inputs)
	if (locale === "fa") return fa_common_back_to_blog(inputs)
	if (locale === "fr") return fr_common_back_to_blog(inputs)
	return en_common_back_to_blog(inputs)
});