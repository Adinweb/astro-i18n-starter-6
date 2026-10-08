/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Nav_HomeInputs */

const en_nav_home = /** @type {(inputs: Nav_HomeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Home`)
};

const de_nav_home = /** @type {(inputs: Nav_HomeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Startseite`)
};

const fr_nav_home = /** @type {(inputs: Nav_HomeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Accueil`)
};

/**
* | output |
* | --- |
* | "Home" |
*
* @param {Nav_HomeInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" }} options
* @returns {LocalizedString}
*/
export const nav_home = /** @type {((inputs?: Nav_HomeInputs, options?: { locale?: "en" | "de" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_HomeInputs, { locale?: "en" | "de" | "fr" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_nav_home(inputs)
	if (locale === "fr") return fr_nav_home(inputs)
	return en_nav_home(inputs)
});