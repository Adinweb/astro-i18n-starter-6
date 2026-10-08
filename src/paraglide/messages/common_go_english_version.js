/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Go_English_VersionInputs */

const en_common_go_english_version = /** @type {(inputs: Common_Go_English_VersionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Go to English version`)
};

const de_common_go_english_version = /** @type {(inputs: Common_Go_English_VersionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zur englischen Version wechseln`)
};

const fa_common_go_english_version = /** @type {(inputs: Common_Go_English_VersionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`رفتن به نسخه انگلیسی`)
};

const fr_common_go_english_version = /** @type {(inputs: Common_Go_English_VersionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Aller à la version anglaise`)
};

/**
* | output |
* | --- |
* | "Go to English version" |
*
* @param {Common_Go_English_VersionInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" | "fr" }} options
* @returns {LocalizedString}
*/
export const common_go_english_version = /** @type {((inputs?: Common_Go_English_VersionInputs, options?: { locale?: "en" | "de" | "fa" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Go_English_VersionInputs, { locale?: "en" | "de" | "fa" | "fr" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_go_english_version(inputs)
	if (locale === "fa") return fa_common_go_english_version(inputs)
	if (locale === "fr") return fr_common_go_english_version(inputs)
	return en_common_go_english_version(inputs)
});