/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_MenuInputs */

const en_common_menu = /** @type {(inputs: Common_MenuInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Menu`)
};

const de_common_menu = /** @type {(inputs: Common_MenuInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Menü`)
};

const fr_common_menu = /** @type {(inputs: Common_MenuInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Menu`)
};

const fa_common_menu = /** @type {(inputs: Common_MenuInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`منو`)
};

const ar_common_menu = /** @type {(inputs: Common_MenuInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`القائمة`)
};

/**
* | output |
* | --- |
* | "Menu" |
*
* @param {Common_MenuInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_menu = /** @type {((inputs?: Common_MenuInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_MenuInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_menu(inputs)
	if (locale === "fr") return fr_common_menu(inputs)
	if (locale === "fa") return fa_common_menu(inputs)
	if (locale === "ar") return ar_common_menu(inputs)
	return en_common_menu(inputs)
});