import { setAutoApprove, getAutoApprove } from "../src/lib/threads/store";

(async () => {
  for (const cat of ["web-design", "ui-ux", "landing-page"]) {
    await setAutoApprove(cat, true);
    console.log("set", cat);
  }
  console.log("now set:", JSON.stringify(await getAutoApprove()));
})();
