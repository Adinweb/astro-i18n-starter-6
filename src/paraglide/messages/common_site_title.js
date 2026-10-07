/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Site_TitleInputs */

const en_common_site_title = /** @type {(inputs: Common_Site_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Astro i18n`)
};

const de_common_site_title = /** @type {(inputs: Common_Site_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Astro i18n`)
};

const fa_common_site_title = /** @type {(inputs: Common_Site_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`استرو چندزبانه`)
};

/**
* | output |
* | --- |
* | "Astro i18n" |
*
* @param {Common_Site_TitleInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" }} options
* @returns {LocalizedString}
*/
export const common_site_title = /** @type {((inputs?: Common_Site_TitleInputs, options?: { locale?: "en" | "de" | "fa" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Site_TitleInputs, { locale?: "en" | "de" | "fa" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_site_title(inputs)
	if (locale === "fa") return fa_common_site_title(inputs)
	return en_common_site_title(inputs)
});