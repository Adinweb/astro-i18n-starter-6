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

const fr_common_site_title = /** @type {(inputs: Common_Site_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Astro i18n`)
};

const fa_common_site_title = /** @type {(inputs: Common_Site_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`استارتر آسترو`)
};

const ar_common_site_title = /** @type {(inputs: Common_Site_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`أسترو i18n`)
};

/**
* | output |
* | --- |
* | "Astro i18n" |
*
* @param {Common_Site_TitleInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_site_title = /** @type {((inputs?: Common_Site_TitleInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Site_TitleInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_site_title(inputs)
	if (locale === "fr") return fr_common_site_title(inputs)
	if (locale === "fa") return fa_common_site_title(inputs)
	if (locale === "ar") return ar_common_site_title(inputs)
	return en_common_site_title(inputs)
});