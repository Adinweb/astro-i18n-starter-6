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

/**
* | output |
* | --- |
* | "to close" |
*
* @param {Common_Press_EscInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" }} options
* @returns {LocalizedString}
*/
export const common_press_esc = /** @type {((inputs?: Common_Press_EscInputs, options?: { locale?: "en" | "de" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Press_EscInputs, { locale?: "en" | "de" | "fr" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_press_esc(inputs)
	if (locale === "fr") return fr_common_press_esc(inputs)
	return en_common_press_esc(inputs)
});