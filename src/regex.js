import { match, captureIf } from "./chimpanzee";
import { ret, skip } from "./wrap";
import { waitFor } from "./utils";

export function regex(regex, name) {
  return async function run(obj, context, key) {
    return await waitFor(
      await captureIf(obj =>
        typeof regex === "string"
          ? typeof obj === "string" && new RegExp(regex).test(obj)
          : typeof obj === "string" && regex.test(obj),
        name
      )(obj, context, key),
      result =>
        result.type === "skip"
          ? skip(`Did not match regex.`)
          : result
    );
  }
}
