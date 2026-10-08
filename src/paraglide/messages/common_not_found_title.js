/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Not_Found_TitleInputs */

const en_common_not_found_title = /** @type {(inputs: Common_Not_Found_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Page Not Found`)
};

const de_common_not_found_title = /** @type {(inputs: Common_Not_Found_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Seite nicht gefunden`)
};

const fr_common_not_found_title = /** @type {(inputs: Common_Not_Found_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Page non trouvée`)
};

const fa_common_not_found_title = /** @type {(inputs: Common_Not_Found_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`صفحه پیدا نشد`)
};

const ar_common_not_found_title = /** @type {(inputs: Common_Not_Found_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`الصفحة غير موجودة`)
};

/**
* | output |
* | --- |
* | "Page Not Found" |
*
* @param {Common_Not_Found_TitleInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_not_found_title = /** @type {((inputs?: Common_Not_Found_TitleInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Not_Found_TitleInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_not_found_title(inputs)
	if (locale === "fr") return fr_common_not_found_title(inputs)
	if (locale === "fa") return fa_common_not_found_title(inputs)
	if (locale === "ar") return ar_common_not_found_title(inputs)
	return en_common_not_found_title(inputs)
});