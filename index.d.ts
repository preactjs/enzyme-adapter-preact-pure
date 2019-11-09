// Extensions to the "preact" module types required for compatibility with the
// "react" module types used by `@types/enzyme`.
declare module "preact" {
  interface Component {
    // Preact doesn't support string refs, but add this as a dummy field to
    // make this compatible.
    refs: {
      [key: string]: any;
    };
  }
}

// The Public API of the module. The reason we don't just generate declarations
// from the TypeScript sources is to avoid referencing the internal Preact +
// Enzyme types in the output.
export default class Adapter {
  constructor();
}
