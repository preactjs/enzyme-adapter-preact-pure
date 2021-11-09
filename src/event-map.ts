export interface EventData {
  EventType: string;
  defaultInit: EventInit;
}

/**
 * Metadata for events which have different flags set by default than the
 * `Event` constructor defaults or which use a subclass of `Event`.
 *
 * Adapted from `event-map.js` in https://github.com/testing-library/dom-testing-library,
 * but changed to lower-case event names to match the actual values that would
 * be seen in the `Event.type` field.
 */
export const eventMap: Record<string, EventData> = {
  // Clipboard Events
  copy: {
    EventType: 'ClipboardEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  cut: {
    EventType: 'ClipboardEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  paste: {
    EventType: 'ClipboardEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },

  // Composition Events
  compositionend: {
    EventType: 'CompositionEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  compositionstart: {
    EventType: 'CompositionEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  compositionupdate: {
    EventType: 'CompositionEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },

  // Keyboard Events
  keydown: {
    EventType: 'KeyboardEvent',
    defaultInit: {
      bubbles: true,
      cancelable: true,
      composed: true,
    },
  },
  keypress: {
    EventType: 'KeyboardEvent',
    defaultInit: {
      bubbles: true,
      cancelable: true,
      composed: true,
    },
  },
  keyup: {
    EventType: 'KeyboardEvent',
    defaultInit: {
      bubbles: true,
      cancelable: true,
      composed: true,
    },
  },

  // Focus Events
  focus: {
    EventType: 'FocusEvent',
    defaultInit: { bubbles: false, cancelable: false, composed: true },
  },
  blur: {
    EventType: 'FocusEvent',
    defaultInit: { bubbles: false, cancelable: false, composed: true },
  },
  focusin: {
    EventType: 'FocusEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },
  focusout: {
    EventType: 'FocusEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },

  // Form Events
  change: {
    EventType: 'Event',
    defaultInit: { bubbles: true, cancelable: false },
  },
  input: {
    EventType: 'InputEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },
  invalid: {
    EventType: 'Event',
    defaultInit: { bubbles: false, cancelable: true },
  },
  submit: {
    EventType: 'Event',
    defaultInit: { bubbles: true, cancelable: true },
  },
  reset: {
    EventType: 'Event',
    defaultInit: { bubbles: true, cancelable: true },
  },

  // Mouse Events
  click: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  contextmenu: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  dblclick: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  drag: {
    EventType: 'DragEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  dragend: {
    EventType: 'DragEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },
  dragenter: {
    EventType: 'DragEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  dragexit: {
    EventType: 'DragEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },
  dragleave: {
    EventType: 'DragEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },
  dragover: {
    EventType: 'DragEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  dragstart: {
    EventType: 'DragEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  drop: {
    EventType: 'DragEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  mousedown: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  mouseenter: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: false, cancelable: false, composed: true },
  },
  mouseleave: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: false, cancelable: false, composed: true },
  },
  mousemove: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  mouseout: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  mouseover: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  mouseup: {
    EventType: 'MouseEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },

  // Selection Events
  select: {
    EventType: 'Event',
    defaultInit: { bubbles: true, cancelable: false },
  },

  // Touch Events
  touchcancel: {
    EventType: 'TouchEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },
  touchend: {
    EventType: 'TouchEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  touchmove: {
    EventType: 'TouchEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  touchstart: {
    EventType: 'TouchEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },

  // UI Events
  resize: {
    EventType: 'UIEvent',
    defaultInit: { bubbles: false, cancelable: false },
  },
  scroll: {
    EventType: 'UIEvent',
    defaultInit: { bubbles: false, cancelable: false },
  },

  // Wheel Events
  wheel: {
    EventType: 'WheelEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },

  // Media Events
  // (nb. These are currently incomplete)
  loadstart: {
    EventType: 'ProgressEvent',
    defaultInit: { bubbles: false, cancelable: false },
  },
  progress: {
    EventType: 'ProgressEvent',
    defaultInit: { bubbles: false, cancelable: false },
  },

  // Image Events
  load: {
    EventType: 'UIEvent',
    defaultInit: { bubbles: false, cancelable: false },
  },
  error: {
    EventType: 'Event',
    defaultInit: { bubbles: false, cancelable: false },
  },

  // Animation Events
  animationstart: {
    EventType: 'AnimationEvent',
    defaultInit: { bubbles: true, cancelable: false },
  },
  animationend: {
    EventType: 'AnimationEvent',
    defaultInit: { bubbles: true, cancelable: false },
  },
  animationiteration: {
    EventType: 'AnimationEvent',
    defaultInit: { bubbles: true, cancelable: false },
  },

  // Transition Events
  transitioncancel: {
    EventType: 'TransitionEvent',
    defaultInit: { bubbles: true, cancelable: false },
  },
  transitionend: {
    EventType: 'TransitionEvent',
    defaultInit: { bubbles: true, cancelable: true },
  },
  transitionrun: {
    EventType: 'TransitionEvent',
    defaultInit: { bubbles: true, cancelable: false },
  },
  transitionstart: {
    EventType: 'TransitionEvent',
    defaultInit: { bubbles: true, cancelable: false },
  },

  // Pointer events
  pointerover: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  pointerenter: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: false, cancelable: false },
  },
  pointerdown: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  pointermove: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  pointerup: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  pointercancel: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },
  pointerout: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: true, cancelable: true, composed: true },
  },
  pointerleave: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: false, cancelable: false },
  },
  gotpointercapture: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },
  lostpointercapture: {
    EventType: 'PointerEvent',
    defaultInit: { bubbles: true, cancelable: false, composed: true },
  },

  // History events
  popstate: {
    EventType: 'PopStateEvent',
    defaultInit: { bubbles: true, cancelable: false },
  },
};
