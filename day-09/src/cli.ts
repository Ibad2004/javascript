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
} from "./expenses.js";
import { loadStore, saveStore } from "./storage.js";

const helpText = `Usage: npm start -- <command>

Commands:
  add <amount> <description> [category]   Add an expense (category defaults to "${config.defaultCategory}")
  edit <id> [--amount X] [--description "text"] [--category name]
                                          Change only the given fields of an expense
  list [category]                         Show expenses, optionally for one category
  total [--month YYYY-MM]                 Show the overall total and the total per category,
                                          optionally for one month (UTC)
  delete <id>                             Delete an expense by id
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

async function run(args: string[]): Promise<number> {
  const [command, ...rest] = args;

  if (command === undefined || ["help", "--help", "-h"].includes(command)) {
    console.log(helpText);
    return 0;
  }
  if (!["add", "edit", "list", "total", "delete"].includes(command)) {
    console.error(`Unknown command "${command}".\n`);
    console.error(helpText);
    return 1;
  }

  const loaded = await loadStore(config.dataFile);
  if (!loaded.ok) {
    console.error(loaded.error);
    return 1;
  }
  const store = loaded.value;

  if (command === "add") {
    if (rest.length > 3) {
      console.error(
        'Too many arguments. Put a description with spaces in quotes: add 450 "Lunch with team" food',
      );
      return 1;
    }
    const result = addExpense(store, rest[0], rest[1], rest[2], new Date());
    if (!result.ok) {
      console.error(result.error);
      return 1;
    }
    await saveStore(config.dataFile, result.value.store);
    console.log(`Added ${describeExpense(result.value.expense)}`);
    return 0;
  }

  if (command === "edit") {
    const parsed = parseArgs(rest, { amount: "value", description: "value", category: "value" });
    if (!parsed.ok) {
      console.error(parsed.error);
      return 1;
    }
    const { positional, values } = parsed.value;
    if (positional.length > 1) {
      console.error(`Unexpected argument "${positional[1] ?? ""}". Put a description with spaces in quotes.`);
      return 1;
    }
    const result = editExpense(store, positional[0], {
      amount: values.get("amount"),
      description: values.get("description"),
      category: values.get("category"),
    });
    if (!result.ok) {
      console.error(result.error);
      return 1;
    }
    await saveStore(config.dataFile, result.value.store);
    console.log(`Edited ${describeExpense(result.value.expense)}`);
    return 0;
  }

  if (command === "list") {
    console.log(formatList(store.expenses, rest[0]));
    return 0;
  }

  if (command === "total") {
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
      console.log(formatTotals(computeTotals(store.expenses)));
      return 0;
    }
    const month = parseMonth(monthInput);
    if (!month.ok) {
      console.error(month.error);
      return 1;
    }
    const inMonth = filterByMonth(store.expenses, month.value);
    console.log(formatTotals(computeTotals(inMonth), `No expenses in ${month.value}`));
    return 0;
  }

  const result = deleteExpense(store, rest[0]);
  if (!result.ok) {
    console.error(result.error);
    return 1;
  }
  await saveStore(config.dataFile, result.value.store);
  console.log(`Deleted #${result.value.removed.id}: ${result.value.removed.description}`);
  return 0;
}

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
