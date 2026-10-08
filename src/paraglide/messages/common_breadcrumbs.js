/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_BreadcrumbsInputs */

const en_common_breadcrumbs = /** @type {(inputs: Common_BreadcrumbsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Breadcrumbs`)
};

const de_common_breadcrumbs = /** @type {(inputs: Common_BreadcrumbsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Brotkrümelnavigation`)
};

const fr_common_breadcrumbs = /** @type {(inputs: Common_BreadcrumbsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Fil d'Ariane`)
};

const fa_common_breadcrumbs = /** @type {(inputs: Common_BreadcrumbsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`مسیر راهنما`)
};

const ar_common_breadcrumbs = /** @type {(inputs: Common_BreadcrumbsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`مسار التنقل`)
};

/**
* | output |
* | --- |
* | "Breadcrumbs" |
*
* @param {Common_BreadcrumbsInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_breadcrumbs = /** @type {((inputs?: Common_BreadcrumbsInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_BreadcrumbsInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_breadcrumbs(inputs)
	if (locale === "fr") return fr_common_breadcrumbs(inputs)
	if (locale === "fa") return fa_common_breadcrumbs(inputs)
	if (locale === "ar") return ar_common_breadcrumbs(inputs)
	return en_common_breadcrumbs(inputs)
});