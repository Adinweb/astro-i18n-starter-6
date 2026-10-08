/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Nav_FeaturesInputs */

const en_nav_features = /** @type {(inputs: Nav_FeaturesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Features`)
};

const de_nav_features = /** @type {(inputs: Nav_FeaturesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Funktionen`)
};

const fr_nav_features = /** @type {(inputs: Nav_FeaturesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Fonctionnalités`)
};

const fa_nav_features = /** @type {(inputs: Nav_FeaturesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`ویژگی‌ها`)
};

const ar_nav_features = /** @type {(inputs: Nav_FeaturesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`المميزات`)
};

/**
* | output |
* | --- |
* | "Features" |
*
* @param {Nav_FeaturesInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const nav_features = /** @type {((inputs?: Nav_FeaturesInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_FeaturesInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_nav_features(inputs)
	if (locale === "fr") return fr_nav_features(inputs)
	if (locale === "fa") return fa_nav_features(inputs)
	if (locale === "ar") return ar_nav_features(inputs)
	return en_nav_features(inputs)
});