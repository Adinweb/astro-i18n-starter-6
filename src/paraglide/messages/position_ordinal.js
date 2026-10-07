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

const fa_position_ordinal = /** @type {(inputs: Position_OrdinalInputs) => LocalizedString} */ (i) => {
	const posOrdinal = registry.plural("fa", i?.pos, { type: "ordinal" });return /** @type {LocalizedString} */ (`${i?.pos}م`)
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
* @param {{ locale?: "en" | "de" | "fa" }} options
* @returns {LocalizedString}
*/
export const position_ordinal = /** @type {((inputs: Position_OrdinalInputs, options?: { locale?: "en" | "de" | "fa" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Position_OrdinalInputs, { locale?: "en" | "de" | "fa" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_position_ordinal(inputs)
	if (locale === "fa") return fa_position_ordinal(inputs)
	return en_position_ordinal(inputs)
});