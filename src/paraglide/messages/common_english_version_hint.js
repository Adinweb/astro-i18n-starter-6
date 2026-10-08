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

const fr_common_english_version_hint = /** @type {(inputs: Common_English_Version_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ou consulter cette page en anglais :`)
};

const fa_common_english_version_hint = /** @type {(inputs: Common_English_Version_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`یا این صفحه را به نسخه انگلیسی مشاهده کنید:`)
};

const ar_common_english_version_hint = /** @type {(inputs: Common_English_Version_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`أو تصفح هذه الصفحة بالإنجليزية:`)
};

/**
* | output |
* | --- |
* | "Or view this page in English:" |
*
* @param {Common_English_Version_HintInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_english_version_hint = /** @type {((inputs?: Common_English_Version_HintInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_English_Version_HintInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_english_version_hint(inputs)
	if (locale === "fr") return fr_common_english_version_hint(inputs)
	if (locale === "fa") return fa_common_english_version_hint(inputs)
	if (locale === "ar") return ar_common_english_version_hint(inputs)
	return en_common_english_version_hint(inputs)
});