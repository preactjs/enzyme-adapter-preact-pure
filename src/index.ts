import Adapter from './Adapter.js';
import type { PreactAdapterOptions } from './Adapter.js';

export {
  // Non-default exports for backwards compatibility with earlier v1.x releases.
  Adapter,
  Adapter as PreactAdapter,
};

export type { PreactAdapterOptions };

export default Adapter;
