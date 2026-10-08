/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Common_All_Rights_ReservedInputs */

const en_common_all_rights_reserved = /** @type {(inputs: Common_All_Rights_ReservedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`All rights reserved.`)
};

const de_common_all_rights_reserved = /** @type {(inputs: Common_All_Rights_ReservedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alle Rechte vorbehalten.`)
};

const fr_common_all_rights_reserved = /** @type {(inputs: Common_All_Rights_ReservedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tous droits réservés.`)
};

const fa_common_all_rights_reserved = /** @type {(inputs: Common_All_Rights_ReservedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`تمامی حقوق محفوظ است.`)
};

const ar_common_all_rights_reserved = /** @type {(inputs: Common_All_Rights_ReservedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`جميع الحقوق محفوظة.`)
};

/**
* | output |
* | --- |
* | "All rights reserved." |
*
* @param {Common_All_Rights_ReservedInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const common_all_rights_reserved = /** @type {((inputs?: Common_All_Rights_ReservedInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Common_All_Rights_ReservedInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_common_all_rights_reserved(inputs)
	if (locale === "fr") return fr_common_all_rights_reserved(inputs)
	if (locale === "fa") return fa_common_all_rights_reserved(inputs)
	if (locale === "ar") return ar_common_all_rights_reserved(inputs)
	return en_common_all_rights_reserved(inputs)
});