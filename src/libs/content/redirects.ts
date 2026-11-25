/**
 * Typed TypeScript bridge for config-driven URL redirects validation and output generation.
 */
import {
  buildHtaccessRedirects,
  buildNetlifyRedirects,
  buildNginxRedirects,
  isInternalRedirectTarget,
  isWildcardRedirectSource,
  normalizeRedirectKey,
  validateRedirects,
} from '../../../scripts/lib/redirects.mjs';

export interface RedirectRule {
  from: string;
  to: string;
  status: 301 | 302;
}

export {
  buildHtaccessRedirects,
  buildNetlifyRedirects,
  buildNginxRedirects,
  isInternalRedirectTarget,
  isWildcardRedirectSource,
  normalizeRedirectKey,
  validateRedirects,
};
