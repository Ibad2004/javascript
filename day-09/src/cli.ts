import { config } from "./config.js";
import {
  addExpense,
  computeTotals,
  deleteExpense,
  filterByCategory,
  formatPaisa,
  formatTable,
  formatTotals,
  toPaisa,
} from "./expenses.js";
import { loadStore, saveStore } from "./storage.js";

const helpText = `Usage: npm start -- <command>

Commands:
  add <amount> <description> [category]   Add an expense (category defaults to "${config.defaultCategory}")
  list [category]                         Show expenses, optionally for one category
  total                                   Show the overall total and the total per category
  delete <id>                             Delete an expense by id
  help                                    Show this help

Example: npm start -- add 450 "Lunch with team" food`;

async function run(args: string[]): Promise<number> {
  const [command, ...rest] = args;

  if (command === undefined || command === "help") {
    console.log(helpText);
    return 0;
  }
  if (!["add", "list", "total", "delete"].includes(command)) {
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
    const { expense } = result.value;
    console.log(
      `Added #${expense.id}: ${formatPaisa(toPaisa(expense.amount))} ${expense.description} (${expense.category})`,
    );
    return 0;
  }

  if (command === "list") {
    console.log(formatTable(filterByCategory(store.expenses, rest[0])));
    return 0;
  }

  if (command === "total") {
    console.log(formatTotals(computeTotals(store.expenses)));
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
