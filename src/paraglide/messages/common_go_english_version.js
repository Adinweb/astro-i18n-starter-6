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

const fr_common_go_english_version = /** @type {(inputs: Common_Go_English_VersionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Aller à la version anglaise`)
};

const fa_common_go_english_version = /** @type {(inputs: Common_Go_English_VersionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`مشاهده نسخه انگلیسی`)
};

const ar_common_go_english_version = /** @type {(inputs: Common_Go_English_VersionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`الانتقال إلى النسخة الإنجليزية`)
};

/**
* | output |
* | --- |
* | "Go to English version" |
*
* @param {Common_Go_English_VersionInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_go_english_version = /** @type {((inputs?: Common_Go_English_VersionInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Go_English_VersionInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_go_english_version(inputs)
	if (locale === "fr") return fr_common_go_english_version(inputs)
	if (locale === "fa") return fa_common_go_english_version(inputs)
	if (locale === "ar") return ar_common_go_english_version(inputs)
	return en_common_go_english_version(inputs)
});