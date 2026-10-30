let lastLogAt = Date.now();

const roundTo100 = (ms) => Math.round(ms / 100) * 100;

const log = (message) => {
  const now = Date.now();
  console.log(`[+${roundTo100(now - lastLogAt)} ms] ${message}`);
  lastLogAt = now;
};

function blockingDemo() {
  const scheduledAt = Date.now();
  log("setTimeout(..., 0) scheduled, then a 500 ms blocking loop starts");

  setTimeout(() => {
    log(`setTimeout(..., 0) finally ran ${roundTo100(Date.now() - scheduledAt)} ms after it was scheduled`);
  }, 0);

  const blockUntil = Date.now() + 500;
  while (Date.now() < blockUntil) {}
  log("Blocking loop finished");
}

function startOtpCountdown() {
  let secondsLeft = 3;
  log(`OTP sent. Resend OTP in ${secondsLeft}s`);

  const intervalId = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      log(`Resend OTP in ${secondsLeft}s`);
      return;
    }
    clearInterval(intervalId);
    log("You can resend the OTP now");
    blockingDemo();
  }, 1000);
}

log("Page loaded");

setTimeout(() => log("Welcome back, Ibad!"), 200);

const toastTimer = setTimeout(() => log("This toast was cancelled, so this never prints"), 300);
clearTimeout(toastTimer);
log("Toast timer cancelled with clearTimeout");

setTimeout(startOtpCountdown, 500);
