import { traverse, capture } from "../../../chimpanzee";

export const input = {
  level1: {
    level2: ["one", "two"]
  }
};

export const schema = {
  level1: {
    level2: [capture(), "two"]
  }
};
