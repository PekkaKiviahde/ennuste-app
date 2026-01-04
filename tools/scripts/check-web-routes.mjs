const baseUrl = process.env.BASE_URL ?? "https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev";

const check = async (path, expectations) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { redirect: "manual" });
  const status = response.status;
  const location = response.headers.get("location");

  const statusOk = expectations.status.includes(status);
  const locationOk = expectations.location ? location === expectations.location : true;

  if (!statusOk || !locationOk) {
    const statusList = expectations.status.join(", ");
    console.error(`FAIL ${url}`);
    console.error(`  status: ${status} (expected ${statusList})`);
    if (expectations.location) {
      console.error(`  location: ${location ?? "-"} (expected ${expectations.location})`);
    }
    return false;
  }

  const locationNote = location ? ` location=${location}` : "";
  console.log(`OK ${url} status=${status}${locationNote}`);
  return true;
};

const main = async () => {
  const results = await Promise.all([
    check("/login", { status: [200] }),
    check("/", { status: [307, 308], location: "/ylataso" }),
    check("/ylataso", { status: [307, 308], location: "/login" })
  ]);

  if (results.some((ok) => !ok)) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("FAIL unexpected error");
  console.error(error);
  process.exit(1);
});
