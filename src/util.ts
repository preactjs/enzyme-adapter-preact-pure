import type { RSTNode } from 'enzyme';
import type { VNode } from 'preact';

export function getType(obj: Object) {
  if (obj == null) {
    return String(obj);
  }
  return obj.constructor.name;
}

/**
 * Return the type of a vnode as a string.
 */
export function nodeType(vnode: VNode) {
  if (!vnode.type) {
    return 'null';
  }
  return typeof vnode.type === 'string' ? vnode.type : vnode.type.name;
}

export function getDisplayName(node: RSTNode): string {
  if (node.nodeType === 'host') {
    return node.type as string;
  } else {
    const type = node.type as any;
    return type.displayName || type.name;
  }
}

/**
 * Call `fn` with a method on an object temporarily replaced with `methodImpl`.
 */
export function withReplacedMethod(
  obj: any,
  method: string,
  methodImpl: Function,
  fn: Function
) {
  const hadOwnMethod = obj.hasOwnProperty(method);
  const origMethod = obj[method] as Function;
  if (typeof origMethod !== 'function') {
    throw new Error(`Expected '${method}' property to be a function`);
  }
  obj[method] = methodImpl;
  try {
    fn();
  } finally {
    if (hadOwnMethod) {
      obj[method] = origMethod;
    } else {
      delete obj[method];
    }
  }
}

export function toArray(obj: any) {
  return Array.isArray(obj) ? obj : [obj];
}

/**
 * @param node The node to start searching for a host node
 * @returns The first host node in the children of the passed in node. Will
 * return the passed in node if it is a host node
 */
export function nodeToHostNode(node: RSTNode | string | null): Node | null {
  if (node == null || typeof node == 'string') {
    // Returning `null` here causes `wrapper.text()` to return nothing for a
    // wrapper around a `Text` node. That's not intuitive perhaps, but it
    // matches the React adapters' behaviour.
    return null;
  } else if (node.nodeType === 'host') {
    return node.instance;
  } else if (node.rendered.length > 0) {
    for (let child of node.rendered) {
      let childHostNode = nodeToHostNode(child);
      if (childHostNode) {
        return childHostNode;
      }
    }
  }

  return null;
}

// Copied from enzyme-adapter-utils. We don't include that package because it depends on React
const nativeToReactEventMap: Record<string, string> = {
  compositionend: 'compositionEnd',
  compositionstart: 'compositionStart',
  compositionupdate: 'compositionUpdate',
  keydown: 'keyDown',
  keyup: 'keyUp',
  keypress: 'keyPress',
  contextmenu: 'contextMenu',
  dblclick: 'doubleClick',
  doubleclick: 'doubleClick', // kept for legacy. TODO: remove with next major.
  dragend: 'dragEnd',
  dragenter: 'dragEnter',
  dragexist: 'dragExit',
  dragleave: 'dragLeave',
  dragover: 'dragOver',
  dragstart: 'dragStart',
  mousedown: 'mouseDown',
  mousemove: 'mouseMove',
  mouseout: 'mouseOut',
  mouseover: 'mouseOver',
  mouseup: 'mouseUp',
  touchcancel: 'touchCancel',
  touchend: 'touchEnd',
  touchmove: 'touchMove',
  touchstart: 'touchStart',
  canplay: 'canPlay',
  canplaythrough: 'canPlayThrough',
  durationchange: 'durationChange',
  loadeddata: 'loadedData',
  loadedmetadata: 'loadedMetadata',
  loadstart: 'loadStart',
  ratechange: 'rateChange',
  timeupdate: 'timeUpdate',
  volumechange: 'volumeChange',
  beforeinput: 'beforeInput',
  mouseenter: 'mouseEnter',
  mouseleave: 'mouseLeave',
  transitionend: 'transitionEnd',
  animationstart: 'animationStart',
  animationiteration: 'animationIteration',
  animationend: 'animationEnd',
  pointerdown: 'pointerDown',
  pointermove: 'pointerMove',
  pointerup: 'pointerUp',
  pointercancel: 'pointerCancel',
  gotpointercapture: 'gotPointerCapture',
  lostpointercapture: 'lostPointerCapture',
  pointerenter: 'pointerEnter',
  pointerleave: 'pointerLeave',
  pointerover: 'pointerOver',
  pointerout: 'pointerOut',
  auxclick: 'auxClick',
};

export function mapNativeEventNames(event: string): string {
  return nativeToReactEventMap[event] || event;
}

// 'click' => 'onClick'
// 'mouseEnter' => 'onMouseEnter'
export function propFromEvent(event: string): string {
  const nativeEvent = mapNativeEventNames(event);
  return `on${nativeEvent[0].toUpperCase()}${nativeEvent.slice(1)}`;
}
