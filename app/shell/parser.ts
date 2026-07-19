export interface ParsedShellCommand {
  name: string;
  args: string[];
}

/** 将一行Shell输入解析为命令和参数，不执行任何命令扩展。 */
export function parseShellCommand(input: string): ParsedShellCommand | undefined {
  const tokens = tokenize(input);

  if (tokens.length === 0) {
    return undefined;
  }

  const [name, ...args] = tokens;
  return {
    name: name!.toLowerCase(),
    args,
  };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let token = '';
  let tokenStarted = false;
  let quote: "'" | '"' | undefined;
  let escaping = false;

  for (const character of input) {
    if (escaping) {
      token += character;
      tokenStarted = true;
      escaping = false;
      continue;
    }

    if (character === '\\') {
      escaping = true;
      tokenStarted = true;
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = undefined;
      } else {
        token += character;
      }
      tokenStarted = true;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      tokenStarted = true;
      continue;
    }

    if (/\s/u.test(character)) {
      if (tokenStarted) {
        tokens.push(token);
        token = '';
        tokenStarted = false;
      }
      continue;
    }

    token += character;
    tokenStarted = true;
  }

  if (escaping) {
    throw new Error('命令末尾不能是转义符。');
  }

  if (quote) {
    throw new Error('命令中存在未闭合的引号。');
  }

  if (tokenStarted) {
    tokens.push(token);
  }

  return tokens;
}
