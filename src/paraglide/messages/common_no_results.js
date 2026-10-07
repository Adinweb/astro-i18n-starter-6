/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_No_ResultsInputs */

const en_common_no_results = /** @type {(inputs: Common_No_ResultsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No results found.`)
};

const de_common_no_results = /** @type {(inputs: Common_No_ResultsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Keine Ergebnisse gefunden.`)
};

const fa_common_no_results = /** @type {(inputs: Common_No_ResultsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`نتیجه‌ای یافت نشد.`)
};

/**
* | output |
* | --- |
* | "No results found." |
*
* @param {Common_No_ResultsInputs} inputs
* @param {{ locale?: "en" | "de" | "fa" }} options
* @returns {LocalizedString}
*/
export const common_no_results = /** @type {((inputs?: Common_No_ResultsInputs, options?: { locale?: "en" | "de" | "fa" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_No_ResultsInputs, { locale?: "en" | "de" | "fa" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_no_results(inputs)
	if (locale === "fa") return fa_common_no_results(inputs)
	return en_common_no_results(inputs)
});