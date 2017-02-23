import { captureIf } from "./capture";
import { ret, skip, wrap } from "./wrap";
import { waitForSchema } from "./utils";

export function regex(regex, name) {
  function fn(obj, context) {
    return waitForSchema(
      captureIf(obj =>
        typeof regex === "string"
          ? typeof obj === "string" && new RegExp(regex).test(obj)
          : typeof obj === "string" && regex.test(obj),
        name
      ),
      obj,
      context,
      result =>
        result.type === "skip"
          ? skip(`Did not match regex.`)
          : result
    );
  }

  return wrap(fn)
}
