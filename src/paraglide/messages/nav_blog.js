/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Nav_BlogInputs */

const en_nav_blog = /** @type {(inputs: Nav_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Blog`)
};

const de_nav_blog = /** @type {(inputs: Nav_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Blog`)
};

const fr_nav_blog = /** @type {(inputs: Nav_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Blog`)
};

const fa_nav_blog = /** @type {(inputs: Nav_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`وبلاگ`)
};

const ar_nav_blog = /** @type {(inputs: Nav_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`المدونة`)
};

/**
* | output |
* | --- |
* | "Blog" |
*
* @param {Nav_BlogInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const nav_blog = /** @type {((inputs?: Nav_BlogInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_BlogInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_nav_blog(inputs)
	if (locale === "fr") return fr_nav_blog(inputs)
	if (locale === "fa") return fa_nav_blog(inputs)
	if (locale === "ar") return ar_nav_blog(inputs)
	return en_nav_blog(inputs)
});