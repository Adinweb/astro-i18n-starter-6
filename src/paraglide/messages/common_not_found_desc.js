/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Not_Found_DescInputs */

const en_common_not_found_desc = /** @type {(inputs: Common_Not_Found_DescInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The page you are looking for does not exist or has been moved.`)
};

const de_common_not_found_desc = /** @type {(inputs: Common_Not_Found_DescInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Die gesuchte Seite existiert nicht oder wurde verschoben.`)
};

const fr_common_not_found_desc = /** @type {(inputs: Common_Not_Found_DescInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`La page que vous recherchez n’existe pas ou a été déplacée.`)
};

const fa_common_not_found_desc = /** @type {(inputs: Common_Not_Found_DescInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.`)
};

const ar_common_not_found_desc = /** @type {(inputs: Common_Not_Found_DescInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`الصفحة التي تبحث عنها غير موجودة أو تم نقلها.`)
};

/**
* | output |
* | --- |
* | "The page you are looking for does not exist or has been moved." |
*
* @param {Common_Not_Found_DescInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_not_found_desc = /** @type {((inputs?: Common_Not_Found_DescInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Not_Found_DescInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_not_found_desc(inputs)
	if (locale === "fr") return fr_common_not_found_desc(inputs)
	if (locale === "fa") return fa_common_not_found_desc(inputs)
	if (locale === "ar") return ar_common_not_found_desc(inputs)
	return en_common_not_found_desc(inputs)
});