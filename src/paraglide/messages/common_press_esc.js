/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Press_EscInputs */

const en_common_press_esc = /** @type {(inputs: Common_Press_EscInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`to close`)
};

const de_common_press_esc = /** @type {(inputs: Common_Press_EscInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`zum Schließen`)
};

const fr_common_press_esc = /** @type {(inputs: Common_Press_EscInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`pour fermer`)
};

const fa_common_press_esc = /** @type {(inputs: Common_Press_EscInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`برای بستن`)
};

const ar_common_press_esc = /** @type {(inputs: Common_Press_EscInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`للإغلاق`)
};

/**
* | output |
* | --- |
* | "to close" |
*
* @param {Common_Press_EscInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_press_esc = /** @type {((inputs?: Common_Press_EscInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Press_EscInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_press_esc(inputs)
	if (locale === "fr") return fr_common_press_esc(inputs)
	if (locale === "fa") return fa_common_press_esc(inputs)
	if (locale === "ar") return ar_common_press_esc(inputs)
	return en_common_press_esc(inputs)
});