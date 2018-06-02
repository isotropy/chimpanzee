import { Result, Match, Empty, Skip, Fault } from "../results";
import { Schema, FunctionSchema } from "../schemas";
import parse from "../parse";
import exception from "../exception";
import { getParams } from "./utils";
import { toNeedledSchema, ArrayOperator, Wrapped } from "../parsers/array";

/*
  Unordered does not change the needle.
  Searching for "1" in
  [1, 4, 4, 4, 4, 5, 6, 67]
            ^needle
  returns [4, 4], with needle moved to 5.
*/

export function repeating(_schema, opts = {}) {
  const meta = { type: "repeating", schema: _schema };

  const min = opts.min || 0;
  const max = opts.max;
  const recursive = opts.recursive || false;

  const schema = toNeedledSchema(_schema);

  return new ArrayOperator(
    needle =>
      new FunctionSchema(
        (obj, key, parents, parentKeys) => context => {
          function completed(results, needle) {
            return results.length >= min && (!max || results.length <= max)
              ? new Wrapped(
                  new Match(results, { obj, key, parents, parentKeys }, meta),
                  needle
                )
              : new Wrapped(
                  new Skip(
                    "Incorrect number of matches.",
                    { obj, key, parents, parentKeys },
                    meta
                  ),
                  needle
                );
          }

          return (function loop(results, needle) {
            const { result, needle: updatedNeedle } = parse(schema(needle))(
              obj,
              key,
              parents,
              parentKeys
            )(context);

            return result instanceof Match || result instanceof Empty
              ? obj.length > needle
                ? (() => {
                    const { items, effectiveNeedle } = recursive
                      ? { items: obj.slice(needle), effectiveNeedle: 0 }
                      : { items: obj, effectiveNeedle: needle };
                    return loop(
                      result instanceof Match
                        ? results.concat([result.value])
                        : results,
                      updatedNeedle
                    );
                  })()
                : completed(
                    result instanceof Match
                      ? results.concat([result.value])
                      : results,
                    needle
                  )
              : result instanceof Skip
                ? completed(results, needle)
                : new Wrapped(result, needle); // Fault
          })([], needle);
        },
        {},
        meta
      )
  );
}

/*
  Unordered does not change the needle.
  Searching for "1" in
  [1, 2, 4, 5, 6, 67]
         ^needle
  returns 1, with needle still pointing at 4.
  We don't care about the needle.
*/
export function unordered(_schema, opts = {}) {
  const useNeedle = opts.searchPrevious === false ? true : false;

  const meta = { type: "unordered", schema: _schema };

  const schema = toNeedledSchema(_schema);
  return new ArrayOperator(
    needle =>
      new FunctionSchema(
        (obj, key, parents, parentKeys) => context =>
          (function loop(i) {
            const { result } = parse(schema(i))(obj, key, parents, parentKeys)(
              context
            );

            return result instanceof Match ||
              result instanceof Empty ||
              result instanceof Fault
              ? new Wrapped(result, needle)
              : obj.length > i
                ? loop(i + 1)
                : new Wrapped(
                    new Skip(
                      `Unordered item was not found.`,
                      { obj, key, parents, parentKeys },
                      meta
                    ),
                    needle
                  );
          })(useNeedle ? needle : 0),
        {},
        meta
      )
  );
}

/*  
  A slice is schema that represents a part of an array.
  If found the needle moves by the length of the slice.
  A Skip() is issued when the slice is not found.
*/
export function slice(schemas) {
  const meta = { type: "slice", schemas };

  return new ArrayOperator(
    needle =>
      new FunctionSchema(
        (obj, key, parents, parentKeys) => context =>
          (function loop(items, results, sliceNeedle, schemaIndex) {
            return schemas.length > schemaIndex
              ? (() => {
                  const schema = toNeedledSchema(schemas[schemaIndex]);

                  const { result, needle: updatedNeedle } = parse(
                    schema(sliceNeedle)
                  )(items, key, parents, parentKeys)(context);

                  return result instanceof Match || result instanceof Empty
                    ? loop(
                        items,
                        result instanceof Match
                          ? results.concat([result.value])
                          : results,
                        updatedNeedle,
                        schemaIndex++
                      )
                    : new Wrapped(result, needle + sliceNeedle);
                })()
              : new Wrapped(
                  new Match(results, { obj, key, parents, parentKeys }, meta),
                  needle + sliceNeedle
                );
          })(obj.slice(needle), [], 0, 0),
        {},
        meta
      )
  );
}

/*
  Optional items may or may not exist.
  A Skip() is not issued when an item is not found.
  The needle is incremented by 1 if found, otherwise it remains the same.
*/
export function optionalItem(_schema) {
  const meta = { type: "optionalItem", schema: _schema };
  const schema = toNeedledSchema(_schema);

  return new ArrayOperator(needle => {
    return new FunctionSchema(
      (obj, key, parents, parentKeys) => context => {
        const { result } = parse(schema(needle))(obj, key, parents, parentKeys)(
          context
        );

        return result instanceof Match || result instanceof Empty
          ? new Wrapped(result, needle + 1)
          : result instanceof Skip
            ? new Wrapped(
                new Empty({ obj, key, parents, parentKeys }, meta),
                needle
              )
            : new Wrapped(result, needle);
      },
      {},
      meta
    );
  });
}
