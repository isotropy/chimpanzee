/* @flow */
import { Seq } from "lazily";
import { Result, Match, Empty, Skip, Fault } from "../results";
import parse from "../parse";
import { ObjectSchema, ArraySchema, PrimitiveSchema } from "../schemas";

function sortFn(schema1, schema2) {
  const schema1Order = schema1.params && schema1.params.order ? schema1.params.order : 0;
  const schema2Order = schema2.params && schema2.params.order ? schema2.params.order : 0;
  return schema1Order - schema2Order;
}

export default function(schema): Result {
  return (_obj, key, parents, parentKeys) => context => {
    const obj = schema.params && schema.params.modifiers && schema.params.modifiers.object
      ? schema.params.modifiers.object(_obj)
      : _obj;

    return typeof obj !== "undefined"
      ? (() => {
          const contextOrFail = Seq.of(Object.keys(schema.value))
            .sort((a, b) => sortFn(schema.value[a], schema.value[b]))
            .reduce(
              (context, childKey) => {
                console.log("CTX", context);
                const childSource = schema.value[childKey];

                const childUnmodified = (childSource.params &&
                  childSource.params.unmodified) || {
                  object: false,
                  property: false
                };

                const effectiveContainerObj = childUnmodified.object ? _obj : obj;
                const propModifier =
                  schema.params.modifiers && schema.params.modifiers.property;

                const childItem = !childUnmodified.property && propModifier
                  ? propModifier(effectiveContainerObj, childKey)
                  : effectiveContainerObj[childKey];

                // child is { ... }
                const isChildLiteralObject =
                  typeof childSource === "object" && childSource.constructor === Object;

                // Value and property modifiers pass through literal containers ({} and []).
                const modifiersForLiteralChildren = schema.params && schema.params.modifiers
                  ? {
                      modifiers: {
                        value: schema.params.modifiers.value,
                        property: schema.params.modifiers.property
                      }
                    }
                  : { modifiers: {} };

                const childSchema = isChildLiteralObject
                  ? new ObjectSchema(childSource, modifiersForLiteralChildren)
                  : Array.isArray(childSource)
                      ? new ArraySchema(childSource, modifiersForLiteralChildren)
                      : typeof childSource === "string" ||
                          typeof childSource === "number" ||
                          typeof childSource === "boolean" ||
                          typeof childSource === "symbol"
                          ? new PrimitiveSchema(childSource, modifiersForLiteralChildren)
                          : childSource;

                const result = parse(childSchema)(
                  childItem,
                  childKey,
                  parents.concat(obj),
                  parentKeys.concat(key)
                )(context);

                console.log("SCH", childSchema, result);

                return result instanceof Match
                  ? !(result instanceof Empty)
                      ? (childSchema.params && childSchema.params.replace) ||
                          isChildLiteralObject
                          ? {
                              ...context,
                              state: { ...(context.state || {}), ...result.value }
                            }
                          : {
                              ...context,
                              state: {
                                ...(context.state || {}),
                                [(childSchema.params && childSchema.params.key) ||
                                  childKey]: result.value
                              }
                            }
                      : context
                  : result;
              },
              context,
              (acc, item) => acc instanceof Skip || acc instanceof Fault
            );

          console.log("contextOrFail", contextOrFail);

          return contextOrFail instanceof Skip || contextOrFail instanceof Fault
            ? contextOrFail
            : typeof contextOrFail.state !== "undefined"
                ? new Match(contextOrFail.state, { obj, key, parents, parentKeys })
                : new Empty({ obj, key, parents, parentKeys });
        })()
      : new Skip(`Cannot parse undefined.`, { obj, key, parents, parentKeys });
  };
}
