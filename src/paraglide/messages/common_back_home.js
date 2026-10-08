/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Back_HomeInputs */

const en_common_back_home = /** @type {(inputs: Common_Back_HomeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Back to Home`)
};

const de_common_back_home = /** @type {(inputs: Common_Back_HomeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zurück zur Startseite`)
};

const fa_common_back_home = /** @type {(inputs: Common_Back_HomeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`بازگشت به خانه`)
};

const fr_common_back_home = /** @type {(inputs: Common_Back_HomeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Retour à l’accueil`)
};

/**
* | output |
* | --- |
* | "Back to Home" |
*
* @param {Common_Back_HomeInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" | "fr" }} options
* @returns {LocalizedString}
*/
export const common_back_home = /** @type {((inputs?: Common_Back_HomeInputs, options?: { locale?: "en" | "de" | "fa" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Back_HomeInputs, { locale?: "en" | "de" | "fa" | "fr" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_back_home(inputs)
	if (locale === "fa") return fa_common_back_home(inputs)
	if (locale === "fr") return fr_common_back_home(inputs)
	return en_common_back_home(inputs)
});