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

const fa_nav_blog = /** @type {(inputs: Nav_BlogInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`وبلاگ`)
};

/**
* | output |
* | --- |
* | "Blog" |
*
* @param {Nav_BlogInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" }} options
* @returns {LocalizedString}
*/
export const nav_blog = /** @type {((inputs?: Nav_BlogInputs, options?: { locale?: "en" | "de" | "fa" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_BlogInputs, { locale?: "en" | "de" | "fa" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_nav_blog(inputs)
	if (locale === "fa") return fa_nav_blog(inputs)
	return en_nav_blog(inputs)
});