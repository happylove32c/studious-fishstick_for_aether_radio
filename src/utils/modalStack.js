const modalStack = [];

/**
 * Registers a modal close function onto the stack.
 * @param {() => void} closeFn
 * @returns {() => void} unregister function
 */
export function registerModal(closeFn) {
  modalStack.push(closeFn);
  let unregistered = false;

  return () => {
    if (unregistered) return;
    unregistered = true;
    const idx = modalStack.lastIndexOf(closeFn);
    if (idx !== -1) {
      modalStack.splice(idx, 1);
    }
  };
}

/**
 * Closes the top-most modal on the stack.
 * @returns {boolean} true if a modal was closed, false if the stack was empty
 */
export function closeTopModal() {
  if (modalStack.length === 0) return false;
  const closeFn = modalStack.pop();
  if (typeof closeFn === "function") {
    closeFn();
  }
  return true;
}
