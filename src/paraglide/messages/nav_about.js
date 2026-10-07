/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Nav_AboutInputs */

const en_nav_about = /** @type {(inputs: Nav_AboutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`About`)
};

const de_nav_about = /** @type {(inputs: Nav_AboutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Über uns`)
};

const fa_nav_about = /** @type {(inputs: Nav_AboutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`درباره ما`)
};

/**
* | output |
* | --- |
* | "About" |
*
* @param {Nav_AboutInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" }} options
* @returns {LocalizedString}
*/
export const nav_about = /** @type {((inputs?: Nav_AboutInputs, options?: { locale?: "en" | "de" | "fa" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_AboutInputs, { locale?: "en" | "de" | "fa" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_nav_about(inputs)
	if (locale === "fa") return fa_nav_about(inputs)
	return en_nav_about(inputs)
});