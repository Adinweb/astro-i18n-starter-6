export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Builds a Schema.org `FAQPage` JSON-LD block from a list of Q&A items.
 */
export function buildFaqSchema(items: readonly FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
