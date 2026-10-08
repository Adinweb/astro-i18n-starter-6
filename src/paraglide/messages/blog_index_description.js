/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Blog_Index_DescriptionInputs */

const en_blog_index_description = /** @type {(inputs: Blog_Index_DescriptionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Our latest articles, thoughts, and updates.`)
};

const de_blog_index_description = /** @type {(inputs: Blog_Index_DescriptionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Unsere neuesten Artikel, Gedanken und Updates.`)
};

const fr_blog_index_description = /** @type {(inputs: Blog_Index_DescriptionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nos derniers articles, réflexions et actualités.`)
};

const fa_blog_index_description = /** @type {(inputs: Blog_Index_DescriptionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`جدیدترین مقالات، دیدگاه‌ها و به‌روزرسانی‌های ما.`)
};

const ar_blog_index_description = /** @type {(inputs: Blog_Index_DescriptionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`أحدث المقالات والأفكار والتحديثات لدينا.`)
};

/**
* | output |
* | --- |
* | "Our latest articles, thoughts, and updates." |
*
* @param {Blog_Index_DescriptionInputs} inputs
* @param {{ locale?: "en" | "de" | "fr" | "fa" | "ar" }} options
* @returns {LocalizedString}
*/
export const blog_index_description = /** @type {((inputs?: Blog_Index_DescriptionInputs, options?: { locale?: "en" | "de" | "fr" | "fa" | "ar" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Blog_Index_DescriptionInputs, { locale?: "en" | "de" | "fr" | "fa" | "ar" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "de") return de_blog_index_description(inputs)
	if (locale === "fr") return fr_blog_index_description(inputs)
	if (locale === "fa") return fa_blog_index_description(inputs)
	if (locale === "ar") return ar_blog_index_description(inputs)
	return en_blog_index_description(inputs)
});