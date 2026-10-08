/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Change_LanguageInputs */

const en_common_change_language = /** @type {(inputs: Common_Change_LanguageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Change language`)
};

const de_common_change_language = /** @type {(inputs: Common_Change_LanguageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sprache ändern`)
};

const fr_common_change_language = /** @type {(inputs: Common_Change_LanguageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Changer de langue`)
};

/**
* | output |
* | --- |
* | "Change language" |
*
* @param {Common_Change_LanguageInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" }} options
* @returns {LocalizedString}
*/
export const common_change_language = /** @type {((inputs?: Common_Change_LanguageInputs, options?: { locale?: "en" | "de" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Change_LanguageInputs, { locale?: "en" | "de" | "fr" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_change_language(inputs)
	if (locale === "fr") return fr_common_change_language(inputs)
	return en_common_change_language(inputs)
});