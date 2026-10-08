/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_Read_MoreInputs */

const en_common_read_more = /** @type {(inputs: Common_Read_MoreInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Read more`)
};

const de_common_read_more = /** @type {(inputs: Common_Read_MoreInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Weiterlesen`)
};

const fr_common_read_more = /** @type {(inputs: Common_Read_MoreInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`En savoir plus`)
};

const fa_common_read_more = /** @type {(inputs: Common_Read_MoreInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`ادامه مطلب`)
};

const ar_common_read_more = /** @type {(inputs: Common_Read_MoreInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`اقرأ المزيد`)
};

/**
* | output |
* | --- |
* | "Read more" |
*
* @param {Common_Read_MoreInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_read_more = /** @type {((inputs?: Common_Read_MoreInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_Read_MoreInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_read_more(inputs)
	if (locale === "fr") return fr_common_read_more(inputs)
	if (locale === "fa") return fa_common_read_more(inputs)
	if (locale === "ar") return ar_common_read_more(inputs)
	return en_common_read_more(inputs)
});