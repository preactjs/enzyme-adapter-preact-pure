import { Component } from 'preact';

export default class RootFinder extends Component<{ context: any }> {
  // I'm not sure if this is needed… It might help with legacy context 🤷
  getChildContext() {
    return this.props.context;
  }

  render() {
    return this.props.children;
  }
}
