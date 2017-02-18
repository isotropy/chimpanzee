import { match, captureIf } from "./chimpanzee";
import { ret, skip } from "./wrap";
import { waitFor } from "./utils";

export function number(name) {
  return checkType("number", name);
}

export function bool(name) {
  return checkType("boolean", name);
}

export function string(name) {
  return checkType("string", name);
}

export function object(name) {
  return checkType("object", name);
}

export function func(name) {
  return checkType("function", name);
}

function checkType(type, name) {
  return async function(obj, context, key) {
    return await waitFor(
      await captureIf(obj => typeof obj === type, name)(obj, context, key),
      result =>
        result.type === "skip"
          ? skip(`Expected ${type} but got ${typeof obj}.`)
          : result
    )
  }
}
