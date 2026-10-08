/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Nav_PricingInputs */

const en_nav_pricing = /** @type {(inputs: Nav_PricingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pricing`)
};

const de_nav_pricing = /** @type {(inputs: Nav_PricingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Preise`)
};

const fr_nav_pricing = /** @type {(inputs: Nav_PricingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tarifs`)
};

const fa_nav_pricing = /** @type {(inputs: Nav_PricingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`قیمت‌گذاری`)
};

const ar_nav_pricing = /** @type {(inputs: Nav_PricingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`الأسعار`)
};

/**
* | output |
* | --- |
* | "Pricing" |
*
* @param {Nav_PricingInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const nav_pricing = /** @type {((inputs?: Nav_PricingInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_PricingInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_nav_pricing(inputs)
	if (locale === "fr") return fr_nav_pricing(inputs)
	if (locale === "fa") return fa_nav_pricing(inputs)
	if (locale === "ar") return ar_nav_pricing(inputs)
	return en_nav_pricing(inputs)
});