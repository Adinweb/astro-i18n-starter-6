/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_English_Version_HintInputs */

const en_common_english_version_hint = /** @type {(inputs: Common_English_Version_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Or view this page in English:`)
};

const de_common_english_version_hint = /** @type {(inputs: Common_English_Version_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Oder diese Seite auf Englisch ansehen:`)
};

const fa_common_english_version_hint = /** @type {(inputs: Common_English_Version_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`یا مشاهده این برگه به زبان انگلیسی:`)
};

const fr_common_english_version_hint = /** @type {(inputs: Common_English_Version_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ou consulter cette page en anglais :`)
};

/**
* | output |
* | --- |
* | "Or view this page in English:" |
*
* @param {Common_English_Version_HintInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" | "fr" }} options
* @returns {LocalizedString}
*/
export const common_english_version_hint = /** @type {((inputs?: Common_English_Version_HintInputs, options?: { locale?: "en" | "de" | "fa" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_English_Version_HintInputs, { locale?: "en" | "de" | "fa" | "fr" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_english_version_hint(inputs)
	if (locale === "fa") return fa_common_english_version_hint(inputs)
	if (locale === "fr") return fr_common_english_version_hint(inputs)
	return en_common_english_version_hint(inputs)
});