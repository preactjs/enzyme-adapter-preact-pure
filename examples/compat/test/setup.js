import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-preact-pure';
import { CompatShallowRenderer } from 'enzyme-adapter-preact-pure/compat';
import renderToString from 'preact-render-to-string';

// Setup Enzyme
configure({
  adapter: new Adapter({
    renderToString,
    ShallowRenderer: CompatShallowRenderer,
  }),
});
