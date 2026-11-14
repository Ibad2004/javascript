import { config } from "./config.js";
import {
  addExpense,
  computeTotals,
  deleteExpense,
  describeExpense,
  editExpense,
  filterByMonth,
  formatList,
  formatTotals,
  parseMonth,
  type Result,
  type Store,
} from "./expenses.js";
import { parseCsvPath, toCsv } from "./export.js";
import { loadStore, saveStore, withLock, writeExport } from "./storage.js";

const helpText = `Usage: npm start -- <command>

Commands:
  add <amount> <description> [category]   Add an expense (category defaults to "${config.defaultCategory}")
  edit <id> [--amount X] [--description "text"] [--category name]
                                          Change only the given fields of an expense
  list [category]                         Show expenses, optionally for one category
  total [--month YYYY-MM]                 Show the overall total and the total per category,
                                          optionally for one month (local time)
  delete <id>                             Delete an expense by id
  export <file.csv> [--force]             Save all expenses as CSV (--force overwrites the file)
  help, --help, -h                        Show this help

Example: npm start -- add 450 "Lunch with team" food`;

type OptionKind = "value" | "switch";

interface ParsedArgs {
  positional: string[];
  values: Map<string, string>;
  switches: Set<string>;
}

function parseArgs(args: string[], options: Record<string, OptionKind>): Result<ParsedArgs> {
  const kinds = new Map(Object.entries(options));
  const parsed: ParsedArgs = { positional: [], values: new Map(), switches: new Set() };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (!arg.startsWith("--")) {
      parsed.positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const kind = kinds.get(name);
    if (kind === undefined) {
      const allowed = [...kinds.keys()].map((key) => `--${key}`).join(", ");
      return { ok: false, error: `Unknown option "${arg}". Allowed: ${allowed}.` };
    }
    if (parsed.values.has(name) || parsed.switches.has(name)) {
      return { ok: false, error: `Option "${arg}" was given twice.` };
    }
    if (kind === "switch") {
      parsed.switches.add(name);
      continue;
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return { ok: false, error: `Option "${arg}" needs a value.` };
    }
    parsed.values.set(name, value);
    index += 1;
  }
  return { ok: true, value: parsed };
}

type Handler = (rest: string[]) => Promise<number>;

async function readStore(): Promise<Result<Store>> {
  const loaded = await loadStore(config.dataFile);
  if (!loaded.ok) {
    console.error(loaded.error);
  }
  return loaded;
}

interface Change {
  store: Store;
  message: string;
}

// Load, change and save under the lock, so two commands at the same time cannot lose an expense.
function mutate(build: (store: Store) => Result<Change>): Promise<number> {
  return withLock(config.dataFile, async () => {
    const loaded = await readStore();
    if (!loaded.ok) {
      return 1;
    }
    const change = build(loaded.value);
    if (!change.ok) {
      console.error(change.error);
      return 1;
    }
    await saveStore(config.dataFile, change.value.store);
    console.log(change.value.message);
    return 0;
  });
}

const handleAdd: Handler = (rest) => {
  if (rest.length > 3) {
    console.error(
      'Too many arguments. Put a description with spaces in quotes: add 450 "Lunch with team" food',
    );
    return Promise.resolve(1);
  }
  return mutate((store) => {
    const result = addExpense(store, rest[0], rest[1], rest[2], new Date());
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      value: { store: result.value.store, message: `Added ${describeExpense(result.value.expense)}` },
    };
  });
};

const handleEdit: Handler = (rest) => {
  const parsed = parseArgs(rest, { amount: "value", description: "value", category: "value" });
  if (!parsed.ok) {
    console.error(parsed.error);
    return Promise.resolve(1);
  }
  const { positional, values } = parsed.value;
  if (positional.length > 1) {
    console.error(`Unexpected argument "${positional[1] ?? ""}". Put a description with spaces in quotes.`);
    return Promise.resolve(1);
  }
  return mutate((store) => {
    const result = editExpense(store, positional[0], {
      amount: values.get("amount"),
      description: values.get("description"),
      category: values.get("category"),
    });
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      value: { store: result.value.store, message: `Edited ${describeExpense(result.value.expense)}` },
    };
  });
};

const handleDelete: Handler = (rest) =>
  mutate((store) => {
    const result = deleteExpense(store, rest[0]);
    if (!result.ok) {
      return result;
    }
    const { removed } = result.value;
    return {
      ok: true,
      value: { store: result.value.store, message: `Deleted #${removed.id}: ${removed.description}` },
    };
  });

const handleList: Handler = async (rest) => {
  const loaded = await readStore();
  if (!loaded.ok) {
    return 1;
  }
  console.log(formatList(loaded.value.expenses, rest[0]));
  return 0;
};

const handleTotal: Handler = async (rest) => {
  const loaded = await readStore();
  if (!loaded.ok) {
    return 1;
  }
  const parsed = parseArgs(rest, { month: "value" });
  if (!parsed.ok) {
    console.error(parsed.error);
    return 1;
  }
  if (parsed.value.positional.length > 0) {
    console.error(`Unexpected argument "${parsed.value.positional[0] ?? ""}". Use: total --month 2026-11`);
    return 1;
  }
  const monthInput = parsed.value.values.get("month");
  if (monthInput === undefined) {
    console.log(formatTotals(computeTotals(loaded.value.expenses)));
    return 0;
  }
  const month = parseMonth(monthInput);
  if (!month.ok) {
    console.error(month.error);
    return 1;
  }
  const inMonth = filterByMonth(loaded.value.expenses, month.value);
  console.log(formatTotals(computeTotals(inMonth), `No expenses in ${month.value}`));
  return 0;
};

const handleExport: Handler = async (rest) => {
  const loaded = await readStore();
  if (!loaded.ok) {
    return 1;
  }
  const parsed = parseArgs(rest, { force: "switch" });
  if (!parsed.ok) {
    console.error(parsed.error);
    return 1;
  }
  const { positional, switches } = parsed.value;
  if (positional.length > 1) {
    console.error(`Unexpected argument "${positional[1] ?? ""}". Use: export expenses.csv [--force]`);
    return 1;
  }
  const file = parseCsvPath(positional[0]);
  if (!file.ok) {
    console.error(file.error);
    return 1;
  }
  const expenses = loaded.value.expenses;
  const written = await writeExport(file.value, toCsv(expenses), switches.has("force"));
  if (!written.ok) {
    console.error(written.error);
    return 1;
  }
  const count = expenses.length;
  if (count === 0) {
    console.log(`${config.emptyMessage}. Exported the header row only to ${file.value}`);
  } else {
    console.log(`Exported ${count} expense${count === 1 ? "" : "s"} to ${file.value}`);
  }
  return 0;
};

const commands = new Map<string, Handler>([
  ["add", handleAdd],
  ["edit", handleEdit],
  ["list", handleList],
  ["total", handleTotal],
  ["delete", handleDelete],
  ["export", handleExport],
]);

const helpWords = ["help", "--help", "-h"];

async function run(args: string[]): Promise<number> {
  const [command, ...rest] = args;
  if (command === undefined || helpWords.includes(command)) {
    console.log(helpText);
    return 0;
  }
  const handler = commands.get(command);
  if (handler === undefined) {
    console.error(`Unknown command "${command}".\n`);
    console.error(helpText);
    return 1;
  }
  return handler(rest);
}

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
