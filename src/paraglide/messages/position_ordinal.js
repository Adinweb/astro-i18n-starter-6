/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ pos: NonNullable<unknown> }} Position_OrdinalInputs */

const en_position_ordinal = /** @type {(inputs: Position_OrdinalInputs) => LocalizedString} */ (i) => {const posOrdinal = registry.plural("en", i?.pos, { type: "ordinal" });
	if (posOrdinal === "one") return /** @type {LocalizedString} */ (`${i?.pos}st`);
	if (posOrdinal === "two") return /** @type {LocalizedString} */ (`${i?.pos}nd`);
	if (posOrdinal === "few") return /** @type {LocalizedString} */ (`${i?.pos}rd`);
	return /** @type {LocalizedString} */ (`${i?.pos}th`)
	
};

const de_position_ordinal = /** @type {(inputs: Position_OrdinalInputs) => LocalizedString} */ (i) => {
	const posOrdinal = registry.plural("de", i?.pos, { type: "ordinal" });return /** @type {LocalizedString} */ (`${i?.pos}.`)
};

const fr_position_ordinal = /** @type {(inputs: Position_OrdinalInputs) => LocalizedString} */ (i) => {const posOrdinal = registry.plural("fr", i?.pos, { type: "ordinal" });
	if (posOrdinal === "one") return /** @type {LocalizedString} */ (`${i?.pos}er`);
	return /** @type {LocalizedString} */ (`${i?.pos}e`)
	
};

const fa_position_ordinal = /** @type {(inputs: Position_OrdinalInputs) => LocalizedString} */ (i) => {
	const posOrdinal = registry.plural("fa", i?.pos, { type: "ordinal" });return /** @type {LocalizedString} */ (`${i?.pos}م`)
};

const ar_position_ordinal = /** @type {(inputs: Position_OrdinalInputs) => LocalizedString} */ (i) => {
	const posOrdinal = registry.plural("ar", i?.pos, { type: "ordinal" });return /** @type {LocalizedString} */ (`المركز ${i?.pos}`)
};

/**
* | posOrdinal | output |
* | --- | --- |
* | "one" | "{pos}st" |
* | "two" | "{pos}nd" |
* | "few" | "{pos}rd" |
* | * | "{pos}th" |
*
* @param {Position_OrdinalInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const position_ordinal = /** @type {((inputs: Position_OrdinalInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Position_OrdinalInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_position_ordinal(inputs)
	if (locale === "fr") return fr_position_ordinal(inputs)
	if (locale === "fa") return fa_position_ordinal(inputs)
	if (locale === "ar") return ar_position_ordinal(inputs)
	return en_position_ordinal(inputs)
});