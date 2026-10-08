/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Nav_PricingInputs */

const en_nav_pricing = /** @type {(inputs: Nav_PricingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`pricing`)
};

const de_nav_pricing = /** @type {(inputs: Nav_PricingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`[TODO: de] pricing`)
};

const fr_nav_pricing = /** @type {(inputs: Nav_PricingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`[TODO: fr] pricing`)
};

/**
* | output |
* | --- |
* | "pricing" |
*
* @param {Nav_PricingInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" }} options
* @returns {LocalizedString}
*/
export const nav_pricing = /** @type {((inputs?: Nav_PricingInputs, options?: { locale?: "en" | "de" | "fr" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_PricingInputs, { locale?: "en" | "de" | "fr" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_nav_pricing(inputs)
	if (locale === "fr") return fr_nav_pricing(inputs)
	return en_nav_pricing(inputs)
});